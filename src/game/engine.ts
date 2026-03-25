import type { GameState, Player, Card, BotAction, BotArchetypeId } from './models';
import { BOT_ARCHETYPES } from './models';

const DECK_SIZE = 33; // Cards 3-35
const MIN_CARD = 3;
const CARDS_REMOVED = 9;
const STARTING_CHIPS = 11;

export function createInitialGameState(playerNames: string[], botIds: BotArchetypeId[]): GameState {
  // 1. Create Deck
  let deck: Card[] = [];
  for (let i = 0; i < DECK_SIZE; i++) {
    deck.push({ value: i + MIN_CARD });
  }

  // Shuffle Deck (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Remove 9 cards
  deck = deck.slice(CARDS_REMOVED);

  // 2. Create Players
  const players: Player[] = [];
  let idCounter = 1;

  playerNames.forEach(name => {
    players.push({
      id: `p_${idCounter++}`,
      name,
      chips: STARTING_CHIPS,
      cards: [],
      isBot: false,
    });
  });

  botIds.forEach((botId) => {
    const archetype = BOT_ARCHETYPES.find(b => b.id === botId);
    
    // Default fallback in case of missing bot definition
    const skill = archetype ? archetype.skill : 0.5;
    const riskyness = archetype ? archetype.riskyness : 0.5;
    const name = archetype ? archetype.name : 'Unknown Bot';
    
    players.push({
      id: `b_${idCounter++}_${botId}`,
      name,
      chips: STARTING_CHIPS,
      cards: [],
      isBot: true,
      botConfig: { skill, riskyness }
    });
  });

  return {
    id: `game_${Date.now()}`,
    players,
    currentPlayerIndex: 0, // Starts at 0, but game hasn't started yet
    deck,
    currentCard: null, // Revealed when game actually starts
    chipsOnCurrentCard: 0,
    status: 'waiting' // NEW DEFAULT STATE
  };
}

export function startGame(gameState: GameState): GameState {
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  
  if (newState.status !== 'waiting') return newState;

  newState.status = 'playing';
  newState.currentPlayerIndex = Math.floor(Math.random() * newState.players.length); // Random start
  newState.currentCard = newState.deck.pop() || null;

  return newState;
}

export function processAction(gameState: GameState, playerId: string, action: BotAction): GameState {
  // Deep copy state for pure function behavior
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  
  if (newState.status !== 'playing' || !newState.currentCard) {
    return newState;
  }

  const currentPlayer = newState.players[newState.currentPlayerIndex];
  
  if (currentPlayer.id !== playerId) {
    console.warn("Not this player's turn!");
    return newState;
  }

  if (action === 'pass') {
    if (currentPlayer.chips <= 0) {
      console.warn("Player has 0 chips, must take!");
      return newState; // Action invalid, state unchanged
    }

    // Pay a chip
    currentPlayer.chips--;
    newState.chipsOnCurrentCard++;
    
    // Move to next player (left)
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;

  } else if (action === 'take') {
    // Take card and chips
    currentPlayer.cards.push(newState.currentCard);
    currentPlayer.chips += newState.chipsOnCurrentCard;
    
    // Reset center
    newState.currentCard = newState.deck.pop() || null;
    newState.chipsOnCurrentCard = 0;

    if (!newState.currentCard) {
      newState.status = 'finished';
    }
    // Note: The player who took the card starts the next turn.
    // So currentPlayerIndex does NOT change.
  }

  return newState;
}

export function calculateScore(player: Player): number {
  if (player.cards.length === 0) return -player.chips;

  // Sort ascending
  const sorted = [...player.cards].map(c => c.value).sort((a, b) => a - b);
  
  let score = sorted[0]; // Always score the first card
  
  for (let i = 1; i < sorted.length; i++) {
    // If it's NOT in sequence with the previous card, add its value to score
    if (sorted[i] !== sorted[i - 1] + 1) {
      score += sorted[i];
    }
  }

  return score - player.chips;
}
