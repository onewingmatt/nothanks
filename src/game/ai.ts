import type { GameState, Player, Card, BotAction } from './models';

// Constants for the game
const DECK_SIZE = 33; // Cards 3-35
const MIN_CARD = 3;
const MAX_CARD = 35;
const CARDS_REMOVED = 9;

/**
 * Calculates if taking a card will actually cost points, or if it bridges a gap or is lower than the chips.
 */
function calculateActualCost(cardValue: number, playerCards: Card[], chipsOnCard: number): number {
  const cardValues = playerCards.map(c => c.value);
  
  if (cardValues.includes(cardValue - 1) && cardValues.includes(cardValue + 1)) {
    // If it bridges a gap perfectly, it actually REDUCES our score by the higher number!
    // Example: Have 19, 21. Score = 40. Add 20 -> Score = 19. Reduction = 21 points.
    // Plus the chips.
    return -(cardValue + 1) - chipsOnCard;
  }
  
  // If we already have the card exactly one below this, taking it adds 0 points to our score!
  if (cardValues.includes(cardValue - 1)) {
    return -chipsOnCard; // We strictly GAIN points (lose negative points) by taking this + chips
  }

  // If we have the card *above* it (e.g. we have 25, card is 24), our sequence score drops from 25 to 24.
  if (cardValues.includes(cardValue + 1)) {
     return -1 - chipsOnCard; // Taking it strictly improves our score by 1, AND we get chips
  }

  // If it doesn't attach to anything, it simply adds `cardValue` to our score.
  return cardValue - chipsOnCard;
}

/**
 * Estimates the probability that a specific card is still in the deck vs removed.
 */
function getProbabilityCardInDeck(targetValue: number, gameState: GameState): number {
  if (targetValue < MIN_CARD || targetValue > MAX_CARD) return 0;
  
  // See what cards are visible
  const visibleCards = new Set<number>();
  if (gameState.currentCard) visibleCards.add(gameState.currentCard.value);
  gameState.players.forEach(p => p.cards.forEach(c => visibleCards.add(c.value)));

  if (visibleCards.has(targetValue)) return 0; // It's already out

  const cardsUnseen = DECK_SIZE - visibleCards.size;
  if (cardsUnseen === 0) return 0;
  return Math.max(0, (cardsUnseen - CARDS_REMOVED) / cardsUnseen);
}

/**
 * A bot evaluates whether to take the current card or pass.
 * Skill: 0.0 (Blind) to 1.0 (Calculates perfect EV, opponent states, and hidden probabilities).
 * Risk: 0.0 (Extremely safe, takes cards to avoid zero chips, never passes good cards) to 1.0 (Will risk zero chips, will pass perfectly good cards to milk them).
 */
export function evaluateBotDecision(gameState: GameState, botPlayer: Player): BotAction {
  if (!gameState.currentCard) return 'pass'; // Should not happen during active turn
  if (botPlayer.chips === 0) return 'take'; // Forced to take

  const cardValue = gameState.currentCard.value;
  const chipsOnCard = gameState.chipsOnCurrentCard;
  const skill = botPlayer.botConfig?.skill ?? 0.5;
  const riskyness = botPlayer.botConfig?.riskyness ?? 0.5;

  // BASELINE EVALUATION (What a low-skill bot sees)
  let perceivedCost = cardValue - chipsOnCard;
  
  // SKILL UPGRADE: Look at own hand
  if (skill >= 0.4) {
     perceivedCost = calculateActualCost(cardValue, botPlayer.cards, chipsOnCard);
  }
  
  // SKILL UPGRADE: Consider Expected Value (EV) of drawing connecting cards
  if (skill >= 0.8 && perceivedCost > 0) {
      const chanceToLower = getProbabilityCardInDeck(cardValue - 1, gameState);
      const chanceToHigher = getProbabilityCardInDeck(cardValue + 1, gameState);
      
      const rawDiscount = (chanceToLower + chanceToHigher) * 4; // Max ~8 points discount
      
      if (botPlayer.chips > 3) {
          perceivedCost -= rawDiscount;
      }
  }

  // --- DECISION PHASE ---

  // Scenario A: The card is actually beneficial to take RIGHT NOW (Cost <= 0)
  if (perceivedCost <= 0) {
      
      // If the bot has no risk appetite, take it immediately.
      if (riskyness < 0.4) return 'take';

      // If the card is an absolutely massive benefit (e.g. bridging a gap where cost is -21), NEVER risk passing it.
      // This fixes the Grandmaster passing a bridge card.
      if (perceivedCost <= -10) return 'take';

      // SKILL + RISK: Will it come back to us if we pass?
      let safeToPass = true;
      
      // High skill bots look at opponents to see if they will steal it
      if (skill >= 0.6) {
        for (const opp of gameState.players) {
            if (opp.id === botPlayer.id) continue;
            
            // True chips +/- random error based on inverse skill. Grandmaster (1.0) has 0 error. Greedy Pro (0.6) has +/- 2 error.
            const errorMargin = Math.max(0, Math.round((1 - skill) * 5)); 
            const estimatedChips = Math.max(0, opp.chips + (Math.random() * errorMargin * 2 - errorMargin));
            
            if (estimatedChips <= 0) safeToPass = false;

            const oppCost = calculateActualCost(cardValue, opp.cards, chipsOnCard);
            if (oppCost <= 0) safeToPass = false;
        }
      } else {
        // Low skill, high risk bots just randomly guess if it's safe
        safeToPass = Math.random() > 0.5;
      }

      if (!safeToPass) return 'take'; // Someone will steal it, grab it now.

      const riskRoll = Math.random();
      
      if (botPlayer.chips <= 2 && riskyness < 0.9) return 'take';
      
      if (riskRoll < riskyness) {
          return 'pass'; // Milk it!
      }
      
      return 'take';
  }

  // Scenario B: The card is BAD for us (Cost > 0)
  // We want to pass, but when do we give up and take it?

  // 1. Chip Pressure: How desperate are we?
  // A risk-averse bot panics when chips < 8. A reckless bot panics when chips < 2.
  const panicThreshold = Math.round(8 - (riskyness * 6)); 
  
  let chipDesperation = 0;
  if (botPlayer.chips <= panicThreshold) {
     // Desperation multiplier: the lower the chips, the more willing we are to take bad points.
     // Example: Panic threshold 7. Chips = 1. (7 - 1 + 1) * 8 = 56 desperation points added. We will basically take anything up to 35!
     // We drastically increased the multiplier (from 4 to 8) so low-risk bots actually take 35s when at 1 chip.
     chipDesperation = (panicThreshold - botPlayer.chips + 1) * 8; 
  } else if (botPlayer.chips >= 8) {
     // If we have plenty of chips, we actively want to pass.
     chipDesperation = -8; // Negative desperation makes us less likely to take it
  }

  // 2. Value Threshold: How bad is "too bad" to pass?
  const riskAdjustment = (0.5 - riskyness) * 8; // Ranges from +4 (safe, takes earlier) to -4 (risky, holds out)
  
  const takeThreshold = chipsOnCard + chipDesperation + riskAdjustment;

  if (takeThreshold >= perceivedCost) {
      return 'take';
  }

  return 'pass';
}
