export interface Card {
  value: number;
}

export interface Player {
  id: string;
  name: string;
  chips: number; // The actual chip count, hidden from other players usually
  cards: Card[];
  isBot: boolean;
  botConfig?: BotConfig;
}

// Stats range from 0.0 (lowest) to 1.0 (highest)
export interface BotConfig {
  skill: number;
  riskyness: number;
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  currentCard: Card | null;
  chipsOnCurrentCard: number;
  status: 'waiting' | 'playing' | 'finished';
}

export type BotAction = 'pass' | 'take';

export const BOT_ARCHETYPES = [
  { id: 'rookie', name: 'The Rookie', skill: 0.1, riskyness: 0.2, description: 'Only cares about the face value of the card. Plays it extremely safe.' },
  { id: 'gambler', name: 'The Gambler', skill: 0.5, riskyness: 0.9, description: 'Loves chips. Will let a great card circle the table hoping for a bigger payout.' },
  { id: 'grandmaster', name: 'The Grandmaster', skill: 0.9, riskyness: 0.5, description: 'Counts missing cards, accurately estimates opponents\' chips, and plays the long EV game.' },
  { id: 'chaotic', name: 'The Wildcard', skill: 0.3, riskyness: 0.7, description: 'Unpredictable. Might pass on a great card or take a terrible one if pressured.' },
];

export type BotArchetypeId = 'rookie' | 'gambler' | 'grandmaster' | 'chaotic';
