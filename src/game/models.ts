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
  // Low Skill
  { id: 'low_low', name: 'Timid Novice', skill: 0.1, riskyness: 0.1, description: 'Only looks at face value. Terrified of taking cards.' },
  { id: 'low_med', name: 'Average Joe', skill: 0.2, riskyness: 0.5, description: 'Basic plays. Doesn\'t count cards but sometimes takes a chance.' },
  { id: 'low_high', name: 'Blind Gambler', skill: 0.1, riskyness: 0.9, description: 'Has no idea what\'s going on, but loves collecting chips.' },
  
  // Medium Skill
  { id: 'med_low', name: 'Safe Regular', skill: 0.5, riskyness: 0.2, description: 'Understands EV a bit, but plays it extremely safe.' },
  { id: 'med_med', name: 'Balanced Player', skill: 0.5, riskyness: 0.5, description: 'A solid all-rounder. Makes mathematically sound choices.' },
  { id: 'med_high', name: 'Greedy Pro', skill: 0.6, riskyness: 0.8, description: 'Calculates odds, but pushes their luck to hoard chips.' },

  // High Skill
  { id: 'high_low', name: 'The Calculator', skill: 0.9, riskyness: 0.1, description: 'Counts exactly what\'s left. Takes perfect cards instantly without risking them.' },
  { id: 'high_med', name: 'Grandmaster', skill: 0.9, riskyness: 0.5, description: 'Tracks opponent chips flawlessly. Plays the optimal strategy.' },
  { id: 'high_high', name: 'Arrogant Shark', skill: 0.9, riskyness: 0.9, description: 'Calculates perfectly, then purposefully lets great cards circle to milk you.' },
];

export type BotArchetypeId = 
  | 'low_low' | 'low_med' | 'low_high' 
  | 'med_low' | 'med_med' | 'med_high' 
  | 'high_low' | 'high_med' | 'high_high';
