// Headless archetype strength eval — seeded self-play, no server, no browser.
//
// Why this exists: the bot AI lives in TWO places (src/game/ai.ts, which the
// test suite drives, and a hand-copied block in server/multiplayer-server.js,
// which is what actually plays online), and nothing measured whether an
// archetype was any good. Any change to a decision rule is a change to bot
// strength, so it needs numbers rather than an opinion.
//
// Scoring is No Thanks!: fewest points wins (calculateScore = non-consecutive
// card values - chips). So LOWER is better and "win" = lowest score at table.
//
// Usage: tsx scripts/archetype-eval.ts [gamesPerTable] [seed0]
import { createInitialGameState, startGame, processAction, calculateScore } from '../src/game/engine.ts';
import { evaluateBotDecision } from '../src/game/ai.ts';
import { BOT_ARCHETYPES } from '../src/game/models.ts';
import type { BotArchetypeId, GameState, Player } from '../src/game/models.ts';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TABLE = 4; // players per table
const argv: string[] = (globalThis as unknown as { process: { argv: string[] } }).process.argv;
const GAMES = Number(argv[2] ?? 400);
const SEED0 = Number(argv[3] ?? 1);
const IDS = BOT_ARCHETYPES.map((b) => b.id) as BotArchetypeId[];

type Tally = { games: number; wins: number; score: number; best: number };
const tally: Record<string, Tally> = Object.fromEntries(
  IDS.map((id) => [id, { games: 0, wins: 0, score: 0, best: 0 }]),
);

// Each game seats TABLE archetypes, rotating through the list so every
// archetype plays the same number of games, with the seat ORDER shuffled by
// the game's own seed so no archetype gets a fixed positional advantage.
for (let g = 0; g < GAMES; g++) {
  const rng = mulberry32(SEED0 + g * 7919);
  const seated = Array.from({ length: TABLE }, (_, i) => IDS[(g + i) % IDS.length]);
  for (let i = seated.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [seated[i], seated[j]] = [seated[j], seated[i]];
  }

  // All-bot table: the engine makes one player per NAME plus one per botId, so
  // the bot list alone is the table (names would double it).
  let state: GameState = createInitialGameState([], seated, { random: rng });
  state = startGame(state, { random: rng });

  let guard = 0;
  while (state.status === 'playing' && guard++ < 20000) {
    const p: Player = state.players[state.currentPlayerIndex];
    const action = evaluateBotDecision(state, p, rng);
    state = processAction(state, p.id, action);
  }
  if (guard >= 20000) throw new Error(`game ${g} did not finish`);

  const scores = state.players.map((p) => calculateScore(p));
  const low = Math.min(...scores);
  state.players.forEach((p, i) => {
    const id = seated[i];
    const t = tally[id];
    t.games++;
    t.score += scores[i];
    t.best += low;
    if (scores[i] === low) t.wins++;
  });
}

console.log(`\n◈ archetype eval — ${GAMES} tables of ${TABLE}, seeds ${SEED0}..${SEED0 + GAMES * 7919}\n`);
console.log('  archetype              games   win%   avg score   avg table-best');
const rows = IDS.map((id) => {
  const t = tally[id];
  return {
    id,
    name: BOT_ARCHETYPES.find((b) => b.id === id)!.name,
    games: t.games,
    winPct: (100 * t.wins) / t.games,
    avg: t.score / t.games,
    avgBest: t.best / t.games,
  };
});
for (const r of rows.sort((a, b) => b.winPct - a.winPct)) {
  console.log(
    `  ${r.name.padEnd(20)} ${String(r.games).padStart(6)}  ${r.winPct.toFixed(1).padStart(5)}   ${r.avg.toFixed(2).padStart(9)}   ${r.avgBest.toFixed(2).padStart(14)}`,
  );
}
console.log('');
