import { evaluateBotDecision } from './ai.ts';
import { BOT_ARCHETYPES } from './models.ts';
import type { GameState, Player, BotArchetypeId } from './models.ts';

// Helper to quickly build a player with a specific archetype
function buildBot(id: BotArchetypeId, chips: number, cards: number[] = []): Player {
  const archetype = BOT_ARCHETYPES.find(b => b.id === id)!;
  return {
    id: `bot_${id}`,
    name: archetype.name,
    chips,
    cards: cards.map(c => ({ value: c })),
    isBot: true,
    botConfig: { skill: archetype.skill, awareness: archetype.awareness, riskyness: archetype.riskyness }
  };
}

// Helper to quickly build a game state
function buildState(currentCardValue: number, chipsOnCard: number, opponents: Player[] = []): GameState {
  const allCards = opponents.flatMap(p => p.cards);
  allCards.push({ value: currentCardValue });
  return {
    id: 'test',
    players: opponents,
    currentPlayerIndex: 0,
    deck: [],
    currentCard: { value: currentCardValue },
    chipsOnCurrentCard: chipsOnCard,
    status: 'playing'
  };
}

const errors: string[] = [];

function assertAction(desc: string, bot: Player, state: GameState, expected: 'take' | 'pass') {
  const action = evaluateBotDecision(state, bot);
  if (action !== expected) {
    errors.push(`FAIL: [${bot.name}] ${desc} -> Expected '${expected}', got '${action}'`);
  } else {
    console.log(`PASS: [${bot.name}] ${desc} -> '${action}'`);
  }
}

// --- TEST SCENARIO A: A Terrible Card (35) with 0 chips. Everyone with chips should pass.
console.log("\n--- SCENARIO A: Terrible Card (35), 0 chips, 11 chips in hand ---");
const stateA = buildState(35, 0);
assertAction("Rich Novice", buildBot('novice', 11), stateA, 'pass');
assertAction("Rich Gambler", buildBot('gambler', 11), stateA, 'pass');
assertAction("Rich Grandmaster", buildBot('grandmaster', 11), stateA, 'pass');
assertAction("Rich Shark", buildBot('shark', 11), stateA, 'pass');

// --- TEST SCENARIO B: Terrible Card (35), 0 chips, BUT 1 chip in hand.
console.log("\n--- SCENARIO B: Terrible Card (35), 0 chips, 1 chip in hand ---");
const stateB = buildState(35, 0);
assertAction("Desperate Novice (Panic)", buildBot('novice', 1), stateB, 'take');
assertAction("Desperate Calculator (Panic)", buildBot('calculator', 1), stateB, 'take');
assertAction("Desperate Shark (Holds out)", buildBot('shark', 1), stateB, 'pass');

// --- TEST SCENARIO C: A Perfect Card (24, bot has 25) with 2 chips. Cost = -3.
console.log("\n--- SCENARIO C: Perfect Card (24 -> 25), 2 chips, 11 chips in hand ---");
// Opponents have plenty of chips
const opp1 = buildBot('average', 11, [10]);
const stateC = buildState(24, 2, [opp1]);

// Low Skill bots (Novice) do NOT look at their own hand. Perceived cost = 22.
assertAction("Novice (Blind to own hand)", buildBot('novice', 11, [25]), stateC, 'pass');

// High Skill bots see it costs -3. Low risk takes it instantly.
assertAction("Calculator (Low Risk -> Take instantly)", buildBot('calculator', 11, [25]), stateC, 'take');

// --- TEST SCENARIO C2: Perfect Card, but an opponent has 0 chips.
console.log("\n--- SCENARIO C2: Perfect Card (24 -> 25), Opponent has 0 chips ---");
const oppZero = buildBot('average', 0, [10]); // This opponent WILL take it next turn
const stateC2 = buildState(24, 2, [oppZero]);

// Shark (High Awareness) sees opponent has 0 chips. Should NOT milk it, MUST take it now!
assertAction("Shark (Spots 0-chip opp, snatches card)", buildBot('shark', 11, [25]), stateC2, 'take');

// Blind Gambler (Low Awareness) doesn't look at opponents. Thinks 24 is bad, 2 chips is nice. Might pass.
console.log(`Blind Gambler Decision (Random): ${evaluateBotDecision(stateC2, buildBot('gambler', 11, [25]))}`);

// --- TEST SCENARIO D: Bridging a gap (Bot has 19 and 21, Card is 20). 0 chips.
console.log("\n--- SCENARIO D: Bridging Gap (19_21 + 20), 0 chips ---");
const stateD = buildState(20, 0);

// Novice: Perceived cost = 20 - 0 = 20. PASS.
assertAction("Novice (Blind)", buildBot('novice', 11, [19, 21]), stateD, 'pass');

// Grandmaster: Perceived cost = -21. Take!
assertAction("Grandmaster (Calculates bridge)", buildBot('grandmaster', 11, [19, 21]), stateD, 'take');


if (errors.length > 0) {
  console.error("\n--- FAILURES ---");
  errors.forEach(e => console.error(e));
  throw new Error("Test Failed");
} else {
  console.log("\nALL TESTS PASSED SUCCESSFULLY!");
}
