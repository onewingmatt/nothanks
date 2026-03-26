import type { GameState, Player, Card, BotAction } from './models';
import type { RandomSource } from './cryptoUtils';

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
 * Calculates what the bot thinks the card costs them, based on skill and hand.
 */
function calculatePerceivedCost(
  gameState: GameState,
  botPlayer: Player,
  cardValue: number,
  chipsOnCard: number,
  skill: number
): number {
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
      if (botPlayer.chips > 3) perceivedCost -= rawDiscount;
  }

  return perceivedCost;
}

/**
 * Logic for when a card is beneficial (Cost <= 0).
 */
function evaluateBeneficialCard(
  gameState: GameState,
  botPlayer: Player,
  perceivedCost: number,
  chipsOnCard: number,
  awareness: number,
  riskyness: number,
  random: RandomSource
): BotAction {
  // If the bot has no risk appetite, take it immediately to be safe.
  if (riskyness < 0.4) return 'take';

  // If the card is an absolutely massive benefit (e.g. bridging a gap where cost is -21), NEVER risk passing it.
  if (perceivedCost <= -10) return 'take';

  // WILL IT COME BACK TO US?
  // A high-risk bot wants to milk the card for more chips, but only if they think they can get away with it.
  let safeToPass = true;

  // AWARENESS: Look at opponents to see if they will steal it
  if (awareness >= 0.4) {
    const cardValue = gameState.currentCard!.value;
    for (const opp of gameState.players) {
        if (opp.id === botPlayer.id) continue;

        // AWARENESS UPGRADE: Track opponent chips
        // True chips +/- random error based on inverse awareness. Awareness 1.0 has 0 error. Awareness 0.4 has +/- 3 error.
        const errorMargin = Math.max(0, Math.round((1 - awareness) * 5));
        const estimatedChips = Math.max(0, opp.chips + (random() * errorMargin * 2 - errorMargin));

        if (estimatedChips <= 0) safeToPass = false;

        // AWARENESS UPGRADE: Track opponent hands
        // If awareness is high enough, we literally calculate if the opponent *wants* this card.
        if (awareness >= 0.7) {
            const oppCost = calculateActualCost(cardValue, opp.cards, chipsOnCard);
            // If it connects for them perfectly, or if it's generally cheap enough for their stack, they will take it.
            if (oppCost <= 0) safeToPass = false;

            // If they are desperate for chips (estimated chips <= 2), they might snap up any low value card.
            if (estimatedChips <= 2 && oppCost < 10) safeToPass = false;
        }
    }
  } else {
    // Low awareness, high risk bots just randomly guess if it's safe because they aren't paying attention.
    safeToPass = random() > 0.5;
  }

  if (!safeToPass) return 'take'; // Someone will steal it, grab it now.

  // It looks safe to pass. Will we risk it to get more chips?
  const riskRoll = random();
  if (botPlayer.chips <= 2 && riskyness < 0.9) return 'take'; // Unless we are crazy risky, don't pass if we're low on chips

  if (riskRoll < riskyness) return 'pass'; // Milk it!

  return 'take';
}

/**
 * Logic for when a card is bad (Cost > 0).
 */
function evaluateBadCard(
  gameState: GameState,
  botPlayer: Player,
  perceivedCost: number,
  chipsOnCard: number,
  awareness: number,
  riskyness: number,
  random: RandomSource
): BotAction {
  const cardValue = gameState.currentCard!.value;

  // 1. Chip Pressure: How desperate are we?
  const panicThreshold = Math.round(8 - (riskyness * 6)); 
  
  let chipDesperation = 0;
  if (botPlayer.chips <= panicThreshold) {
     chipDesperation = (panicThreshold - botPlayer.chips + 1) * 8; 
  } else if (botPlayer.chips >= 8) {
     chipDesperation = -8; 
  }

  // 2. Value Threshold: How bad is "too bad" to pass?
  const riskAdjustment = (0.5 - riskyness) * 8; // Ranges from +4 (safe, takes earlier) to -4 (risky, holds out)
  
  let takeThreshold = chipsOnCard + chipDesperation + riskAdjustment;

  // AWARENESS: "Pushing" an opponent
  // If we know an opponent HAS to take this card (they have 0 chips, or it connects perfectly for them), 
  // we can drastically lower our threshold to take it, effectively forcing them to eat the bad card!
  if (awareness >= 0.8) {
      let opponentWillProbablyTakeIt = false;
      for (const opp of gameState.players) {
          if (opp.id === botPlayer.id) continue;
          
          const errorMargin = Math.max(0, Math.round((1 - awareness) * 5)); 
          const estimatedChips = Math.max(0, opp.chips + (random() * errorMargin * 2 - errorMargin));
          
          if (estimatedChips <= 0) opponentWillProbablyTakeIt = true;
          
          const oppCost = calculateActualCost(cardValue, opp.cards, chipsOnCard);
          if (oppCost <= 0) opponentWillProbablyTakeIt = true;
      }
      
      // If we are extremely aware that an opponent is going to take it, we can comfortably pass
      // even if we are getting somewhat low on chips, because we know the buck stops with them.
      if (opponentWillProbablyTakeIt) {
          takeThreshold -= 15; // Massively lower our willingness to take it. Let them have it.
      }
  }

  if (takeThreshold >= perceivedCost) {
      return 'take';
  }

  return 'pass';
}

/**
 * A bot evaluates whether to take the current card or pass.
 * Skill: 0.0 to 1.0 (Calculates own EV and gap-bridging math perfectly).
 * Awareness: 0.0 to 1.0 (Tracks opponents' chips and predicts opponents' hands perfectly).
 * Risk: 0.0 to 1.0 (Will risk zero chips, will pass perfectly good cards to milk them).
 */
export function evaluateBotDecision(gameState: GameState, botPlayer: Player, random: RandomSource = Math.random): BotAction {
  if (!gameState.currentCard) return 'pass'; // Should not happen during active turn
  if (botPlayer.chips === 0) return 'take'; // Forced to take

  const cardValue = gameState.currentCard.value;
  const chipsOnCard = gameState.chipsOnCurrentCard;

  // Default to 0.5 if not explicitly configured
  const skill = botPlayer.botConfig?.skill ?? 0.5;
  const awareness = botPlayer.botConfig?.awareness ?? 0.5;
  const riskyness = botPlayer.botConfig?.riskyness ?? 0.5;

  const perceivedCost = calculatePerceivedCost(gameState, botPlayer, cardValue, chipsOnCard, skill);

  if (perceivedCost <= 0) {
    return evaluateBeneficialCard(gameState, botPlayer, perceivedCost, chipsOnCard, awareness, riskyness, random);
  } else {
    return evaluateBadCard(gameState, botPlayer, perceivedCost, chipsOnCard, awareness, riskyness, random);
  }
}
