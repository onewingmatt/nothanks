import { evaluateBotDecision } from './ai';
import { BOT_ARCHETYPES } from './models';
import type { GameState, Player, BotArchetypeId } from './models';

// Helper to quickly build a player with a specific archetype
function buildBot(id: BotArchetypeId, chips: number, cards: number[] = []): Player {
  const archetype = BOT_ARCHETYPES.find(b => b.id === id)!;
  return {
    id: `bot_${id}`,
    name: archetype.name,
    chips,
    cards: cards.map(c => ({ value: c })),
    isBot: true,
    botConfig: { skill: archetype.skill, riskyness: archetype.riskyness }
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
assertAction("Rich Novice", buildBot('low_low', 11), stateA, 'pass');
assertAction("Rich Gambler", buildBot('low_high', 11), stateA, 'pass');
assertAction("Rich Grandmaster", buildBot('high_med', 11), stateA, 'pass');
assertAction("Rich Shark", buildBot('high_high', 11), stateA, 'pass');

// --- TEST SCENARIO B: Terrible Card (35), 0 chips, BUT 1 chip in hand.
// Low risk MUST panic and TAKE IT. High risk MIGHT hold out and PASS, risking 0.
console.log("\n--- SCENARIO B: Terrible Card (35), 0 chips, 1 chip in hand ---");
const stateB = buildState(35, 0);
assertAction("Desperate Novice (Panic)", buildBot('low_low', 1), stateB, 'take');
assertAction("Desperate Calculator (Panic)", buildBot('high_low', 1), stateB, 'take');
// High risk bots (Gambler, Shark) hold out longer. With 1 chip, they might pass once to force someone else, or take.
// Let's test the math. A 35 cost is 35. 
// Shark (Risk 0.9): PanicThreshold = 7 - 4.5 = 2.5. Chips = 1. Desperation = (2.5 - 1 + 1) * 4 = 10. RiskAdj = -3.2. Threshold = 10 - 3.2 = 6.8. 
// 6.8 < 35. Shark PASSES a 35 even at 1 chip! (Will die next turn).
assertAction("Desperate Shark (Holds out)", buildBot('high_high', 1), stateB, 'pass');

// --- TEST SCENARIO C: A Perfect Card (24, bot has 25) with 2 chips. Cost = -3.
// Low risk MUST take. High risk MIGHT pass to milk it, unless an opponent has 0 chips.
console.log("\n--- SCENARIO C: Perfect Card (24 -> 25), 2 chips, 11 chips in hand ---");
// Opponents have plenty of chips
const opp1 = buildBot('low_med', 11, [10]);
const stateC = buildState(24, 2, [opp1]);

// Low Skill bots (Novice) do NOT look at their own hand. 
// Card is 24, chips is 2. Perceived cost = 22. They think it's bad! They should PASS.
assertAction("Novice (Blind to own hand)", buildBot('low_low', 11, [25]), stateC, 'pass');

// High Skill bots see it costs -3.
assertAction("Calculator (Low Risk -> Take instantly)", buildBot('high_low', 11, [25]), stateC, 'take');

// High Skill + High Risk (Shark) sees cost is -3. Checks opponents. Opp1 has 11 chips, and doesn't connect. Opp1 won't take.
// Shark has 90% chance to pass. We can't strictly assert this due to random(), but we can test the logic path if we mocked random.
// Let's just run it to see.
const sharkDecision = evaluateBotDecision(stateC, buildBot('high_high', 11, [25]));
console.log(`Shark Decision (Random): ${sharkDecision}`);

// --- TEST SCENARIO C2: Perfect Card, but an opponent has 0 chips.
console.log("\n--- SCENARIO C2: Perfect Card (24 -> 25), Opponent has 0 chips ---");
const oppZero = buildBot('low_med', 0, [10]); // This opponent WILL take it next turn
const stateC2 = buildState(24, 2, [oppZero]);

// Shark (High Skill, High Risk) sees opponent has 0 chips. Should NOT milk it, MUST take it now!
assertAction("Shark (Spots 0-chip opp, snatches card)", buildBot('high_high', 11, [25]), stateC2, 'take');

// Blind Gambler (Low Skill, High Risk) doesn't look at opponents. Thinks 24 is bad, 2 chips is nice. Might pass.
// They won't definitively take it just because opp has 0 chips.
console.log(`Blind Gambler Decision (Random): ${evaluateBotDecision(stateC2, buildBot('low_high', 11, [25]))}`);

// --- TEST SCENARIO D: Bridging a gap (Bot has 19 and 21, Card is 20). 0 chips.
// Bot has 19, 21. Score = 19 + 21 = 40.
// Add 20 -> Score = 19, 20, 21 = 19.
// Cost = 19 - 40 = -21 points! Extremely good.
console.log("\n--- SCENARIO D: Bridging Gap (19_21 + 20), 0 chips ---");
const stateD = buildState(20, 0);

// Novice: Perceived cost = 20 - 0 = 20. PASS.
assertAction("Novice (Blind)", buildBot('low_low', 11, [19, 21]), stateD, 'pass');

// Grandmaster: Perceived cost = -21. Take!
assertAction("Grandmaster (Calculates bridge)", buildBot('high_med', 11, [19, 21]), stateD, 'take');


if (errors.length > 0) {
  console.error("\n--- FAILURES ---");
  errors.forEach(e => console.error(e));
  throw new Error("Test Failed");
} else {
  console.log("\nALL TESTS PASSED SUCCESSFULLY!");
}
