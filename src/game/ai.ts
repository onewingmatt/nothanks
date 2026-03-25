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
  // Low skill bots ONLY look at the face value of the card vs the chips on it.
  // They don't look at their own tableau to see if it connects!
  let perceivedCost = cardValue - chipsOnCard;
  
  // SKILL UPGRADE: Look at own hand
  if (skill >= 0.4) {
     perceivedCost = calculateActualCost(cardValue, botPlayer.cards, chipsOnCard);
  }
  
  // SKILL UPGRADE: Consider Expected Value (EV) of drawing connecting cards
  if (skill >= 0.8) {
      const chanceToLower = getProbabilityCardInDeck(cardValue - 1, gameState);
      const chanceToHigher = getProbabilityCardInDeck(cardValue + 1, gameState);
      // If there's a high chance to draw a card that connects to this one later, it reduces the cost.
      // Maximum discount is around 10-15 points if it's almost guaranteed to hit.
      const evDiscount = (chanceToLower + chanceToHigher) * 12;
      perceivedCost -= evDiscount;
  }

  // --- DECISION PHASE ---

  // Scenario A: The card is actually beneficial to take RIGHT NOW (Cost <= 0)
  if (perceivedCost <= 0) {
      
      // If the bot has no risk appetite, take it immediately.
      if (riskyness < 0.4) return 'take';

      // SKILL + RISK: Will it come back to us if we pass?
      // A high-risk bot wants to milk the card for more chips, but only if they think they can get away with it.
      let safeToPass = true;
      
      // High skill bots look at opponents to see if they will steal it
      if (skill >= 0.6) {
        for (const opp of gameState.players) {
            if (opp.id === botPlayer.id) continue;
            
            // True chips +/- random error based on inverse skill. Grandmaster (1.0) has 0 error. Greedy Pro (0.6) has +/- 2 error.
            const errorMargin = Math.max(0, Math.round((1 - skill) * 5)); 
            const estimatedChips = Math.max(0, opp.chips + (Math.random() * errorMargin * 2 - errorMargin));
            
            // If opponent has 0 chips, they WILL take it. Unsafe.
            if (estimatedChips <= 0) safeToPass = false;

            // If opponent also wants it (connects to their hand), they WILL take it. Unsafe.
            const oppCost = calculateActualCost(cardValue, opp.cards, chipsOnCard);
            if (oppCost <= 0) safeToPass = false;
        }
      } else {
        // Low skill, high risk bots (Blind Gambler) just randomly guess if it's safe without looking at opponents.
        safeToPass = Math.random() > 0.5;
      }

      if (!safeToPass) return 'take'; // Someone will steal it, grab it now.

      // It looks safe to pass. Will we risk it to get more chips?
      // High riskyness means a very high chance to pass a perfectly good card.
      const riskRoll = Math.random();
      
      // We also don't want to pass if we ourselves are running dangerously low on chips.
      // Unless we are completely reckless (riskyness > 0.8)
      if (botPlayer.chips <= 2 && riskyness < 0.9) return 'take';
      
      if (riskRoll < riskyness) {
          return 'pass'; // Milk it!
      }
      
      return 'take';
  }

  // Scenario B: The card is BAD for us (Cost > 0)
  // We want to pass, but when do we give up and take it?

  // 1. Chip Pressure: How desperate are we?
  // If chips are low, the threshold to take a bad card drops.
  // Low Risk bots panic early (e.g. at 5 chips). High Risk bots wait until 1 or 2 chips.
  
  // A risk-averse bot panics when chips < 6. A reckless bot panics when chips < 2.
  const panicThreshold = Math.round(6 - (riskyness * 4)); 
  
  let chipDesperation = 0;
  if (botPlayer.chips <= panicThreshold) {
     // Desperation multiplier: the lower the chips, the more willing we are to take bad points.
     chipDesperation = (panicThreshold - botPlayer.chips + 1) * 6; 
  }

  // 2. Value Threshold: How bad is "too bad" to pass?
  // We take the card if: (Chips On Card + Our Desperation) >= Perceived Cost
  
  // E.g. Perceived Cost is 24. 
  // Chips on card = 15. Desperation = 0. Threshold (15) < 24. We pass.
  // Chips on card = 15. Desperation = 12 (we have 1 chip left). Threshold (27) > 24. We take it.
  
  // High risk bots will literally subtract from their desperation (willing to hold out longer)
  // Low risk bots add a flat bonus to desperation to just "get it over with"
  const riskAdjustment = (0.5 - riskyness) * 5; // Ranges from +2.5 (safe) to -2.5 (risky)
  
  const takeThreshold = chipsOnCard + chipDesperation + riskAdjustment;

  if (takeThreshold >= perceivedCost) {
      return 'take';
  }

  return 'pass';
}
