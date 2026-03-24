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
  // Helper for bots/players to estimate opponents chips without seeing exact numbers
  // Represented as ranges or buckets: "low" (0-3), "medium" (4-8), "high" (9+)
  // Or calculated dynamically by the bot based on their "skill"
}

export interface OpponentEstimate {
  id: string;
  cards: Card[];
  estimatedChips: number; // A fuzzy estimate based on bot skill
}

export type BotAction = 'pass' | 'take';
