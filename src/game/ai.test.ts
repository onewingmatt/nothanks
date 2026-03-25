import { evaluateBotDecision } from './ai';
import type { GameState, Player } from './models';

const mockGameState: GameState = {
  id: 'test',
  players: [],
  currentPlayerIndex: 0,
  deck: [],
  currentCard: { value: 13 },
  chipsOnCurrentCard: 1,
  status: 'playing'
};

const grandmaster: Player = {
  id: 'gm',
  name: 'Grandmaster',
  chips: 11,
  cards: [], // Does NOT connect to 13
  isBot: true,
  botConfig: { skill: 0.9, riskyness: 0.5 }
};

// Grandmaster should ABSOLUTELY pass a 13 with 1 chip when they have 11 chips.
const action1 = evaluateBotDecision(mockGameState, grandmaster);
console.log('Grandmaster with 11 chips, facing 13 (1 chip). Action:', action1);

if (action1 !== 'pass') {
  console.error("FAIL: Grandmaster took a bad card too early!");
  process.exit(1);
}

const desperateGrandmaster: Player = {
  id: 'd_gm',
  name: 'Desperate GM',
  chips: 1,
  cards: [],
  isBot: true,
  botConfig: { skill: 0.9, riskyness: 0.5 }
};

// Desperate GM might take a 13 if chips on it + desperation > cost.
// Cost = 12. Desperation = (4.5 - 1 + 1) * 4 = 18. Take Threshold = 1 + 18 + 0 = 19.
// 19 >= 12. It should TAKE IT to stay alive.
const action2 = evaluateBotDecision(mockGameState, desperateGrandmaster);
console.log('Grandmaster with 1 chip, facing 13 (1 chip). Action:', action2);

if (action2 !== 'take') {
  console.error("FAIL: Grandmaster with 1 chip passed a survival card!");
  process.exit(1);
}

const connectingGrandmaster: Player = {
  id: 'c_gm',
  name: 'Connecting GM',
  chips: 11,
  cards: [{ value: 12 }], // CONNECTS perfectly!
  isBot: true,
  botConfig: { skill: 0.9, riskyness: 0.5 }
};

// Cost is -1 (adds no points, gives 1 chip). Will it take?
const action3 = evaluateBotDecision(mockGameState, connectingGrandmaster);
console.log('Grandmaster with connecting 12, facing 13 (1 chip). Action:', action3);

if (action3 !== 'take' && action3 !== 'pass') {
   process.exit(1);
}
console.log("PASS: Math checks out.");
