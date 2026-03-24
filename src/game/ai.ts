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

  // Otherwise, taking this card adds `cardValue` to our score, minus the chips we get.
  // Note: If we have the card *above* it (e.g. we have 25, card is 24), our sequence score drops from 25 to 24.
  // So taking 24 saves us 1 point (25-24) overall from the sequence start, but it still sets the sequence start to 24.
  // The actual net change in score if we have `cardValue + 1` but NOT `cardValue - 1` is exactly:
  // Old Score included `cardValue + 1`. New score includes `cardValue` instead.
  // Net difference to score is -1 (score decreases by 1).
  // Thus, taking it effectively gives us -1 points (good) AND we get the chips.
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

  // Cards total = 33. Removed = 9.
  const cardsUnseen = DECK_SIZE - visibleCards.size;
  // If there are N unseen cards and 9 of them are removed, the chance it's in the deck is:
  // (unseen - 9) / unseen
  if (cardsUnseen === 0) return 0;
  return Math.max(0, (cardsUnseen - CARDS_REMOVED) / cardsUnseen);
}

/**
 * A bot evaluates whether to take the current card or pass.
 */
export function evaluateBotDecision(gameState: GameState, botPlayer: Player): BotAction {
  if (!gameState.currentCard) return 'pass'; // Should not happen during active turn
  if (botPlayer.chips === 0) return 'take'; // Forced to take

  const cardValue = gameState.currentCard.value;
  const chipsOnCard = gameState.chipsOnCurrentCard;
  const skill = botPlayer.botConfig?.skill ?? 0.5;
  const riskyness = botPlayer.botConfig?.riskyness ?? 0.5;

  // 1. Calculate the immediate cost of taking the card
  const immediateCost = calculateActualCost(cardValue, botPlayer.cards, chipsOnCard);

  // If taking it actively IMPROVES our score (cost < 0) or is exactly 0
  if (immediateCost <= 0) {
    // We definitely want this card. BUT, if we are risky, maybe we pass to let it get more chips!
    
    // Will it come back to us?
    // We need to guess if ANY opponent will take it before it gets back to us.
    // An opponent will take it if they also want it (it connects for them, or they have 0 chips).
    let someoneElseWantsIt = false;
    let someoneHasZeroChips = false;

    // High skill bots track opponents closely
    for (const opp of gameState.players) {
      if (opp.id === botPlayer.id) continue;
      
      // Estimate opponent chips (imperfectly based on skill)
      // True chips +/- random error based on inverse skill
      const errorMargin = Math.round((1 - skill) * 5); 
      const estimatedChips = Math.max(0, opp.chips + (Math.random() * errorMargin * 2 - errorMargin));
      
      if (estimatedChips < 1) someoneHasZeroChips = true;

      // Do they want it?
      const oppCost = calculateActualCost(cardValue, opp.cards, chipsOnCard);
      if (oppCost <= 0 || oppCost < estimatedChips * 0.5) { // they might take it if it's cheap relative to their chips
        someoneElseWantsIt = true;
      }
    }

    if (someoneElseWantsIt || someoneHasZeroChips) {
      return 'take'; // Don't risk it, someone will steal it
    }

    // Nobody obviously wants it. Should we risk passing?
    // High risk bots will pass if they think it'll come back.
    const riskRoll = Math.random();
    // E.g., if riskyness is 0.9, we have a 90% chance to pass even if it's good for us, hoping it circles.
    // BUT we shouldn't do this if we are low on chips ourselves!
    if (botPlayer.chips > 2 && riskRoll < riskyness * 0.8) { // Max 80% chance to pass a wanted card
      return 'pass';
    }

    return 'take';
  }

  // 2. We don't WANT the card immediately (it costs points).
  // How bad is the cost?
  
  // If we have a lot of chips, we can easily pass.
  // If cost is extremely high (e.g. card is 35, chips on it is 2), we definitely pass.
  
  // High skill bots consider EV (Expected Value)
  // If we take it, what's the chance we draw a connecting card later?
  let chanceToConnect = 0;
  if (skill > 0.4) {
    chanceToConnect += getProbabilityCardInDeck(cardValue - 1, gameState);
    chanceToConnect += getProbabilityCardInDeck(cardValue + 1, gameState);
  }

  // Adjusted cost taking into account potential future connections
  // A high chance to connect reduces the perceived cost of the card.
  // Skill determines how heavily they weight this.
  const perceivedCost = immediateCost - (chanceToConnect * 15 * skill); 

  // Tolerance is how much "badness" we are willing to accept before taking the card
  // just to grab the chips, or because we are low on chips.
  // Higher riskyness = more willing to pass even when low on chips (risking hitting 0)
  // Lower chips = more willing to take bad cards to restock
  
  const chipPressure = Math.max(0, 10 - botPlayer.chips) * 2; // High pressure if chips < 10
  const riskToleranceModifier = (riskyness - 0.5) * 10; // -5 to +5
  
  // Basically, we take it if the perceived cost is lower than our threshold
  const threshold = chipsOnCard + chipPressure - riskToleranceModifier;

  if (perceivedCost < threshold) {
    return 'take';
  }

  return 'pass';
}
