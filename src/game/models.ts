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
  skill: number;     // Ability to calculate their own hand's EV and gap-bridging math
  awareness: number; // Ability to track opponents' chips and predict opponents' hands
  riskyness: number; // Willingness to milk good cards or pass bad cards when desperate
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
  // The Basics
  { id: 'novice', name: 'Clueless Novice', skill: 0.1, awareness: 0.1, riskyness: 0.2, description: 'Only looks at face value. Blind to opponents. Terrified of taking cards.' },
  { id: 'average', name: 'Average Joe', skill: 0.5, awareness: 0.3, riskyness: 0.5, description: 'Basic plays. Understands their own hand, but rarely watches others.' },
  { id: 'gambler', name: 'Blind Gambler', skill: 0.2, awareness: 0.1, riskyness: 0.9, description: 'Doesn\'t count cards or opponents, just loves pushing their luck for chips.' },
  
  // The Specialists
  { id: 'calculator', name: 'Tunnel-Vision Pro', skill: 0.9, awareness: 0.2, riskyness: 0.4, description: 'Mathematically perfect for their own hand (EV/Gaps), but ignores opponents.' },
  { id: 'empath', name: 'The Watcher', skill: 0.3, awareness: 0.9, riskyness: 0.3, description: 'Terrible at math, but flawlessly tracks who has zero chips and what cards they need.' },
  { id: 'bully', name: 'The Bully', skill: 0.6, awareness: 0.8, riskyness: 0.8, description: 'Sees what you need and steals it, or pushes their luck aggressively if they know you can\'t afford it.' },

  // The Masters
  { id: 'grandmaster', name: 'The Grandmaster', skill: 0.9, awareness: 0.9, riskyness: 0.5, description: 'Tracks everything perfectly. Makes the optimal mathematical play based on the whole board.' },
  { id: 'shark', name: 'Arrogant Shark', skill: 0.9, awareness: 0.9, riskyness: 0.9, description: 'Calculates perfectly, reads your hand, and purposefully milks you for maximum chips.' },
];

export type BotArchetypeId = 
  | 'novice' | 'average' | 'gambler' 
  | 'calculator' | 'empath' | 'bully' 
  | 'grandmaster' | 'shark';
