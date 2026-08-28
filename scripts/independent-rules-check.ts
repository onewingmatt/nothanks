/**
 * INDEPENDENT RULES CHECK — No Thanks! (Thorsten Gimmler / Amigo)
 *
 * Purpose: replay the RULEBOOK's own worked examples and structural rules
 * against the engine. This script is deliberately independent of the engine's
 * internal constants — every expected value below is quoted from the rulebook
 * (Mayfair/Amigo EN rules sheet, 2011 v1.0; cross-checked against Z-Man EN
 * transcriptions and Wikipedia). If the rulebook and the engine disagree, the
 * rulebook wins and this script must FAIL.
 *
 * Sources of the expected values (see references/rulebook-extract.md):
 *  - Brad {8,13,14,15,17}, 13 tokens: card points 38, total 25; with 16: 21, total 8.
 *  - Sabrina singles {4,6,10,21}: 41.
 *  - Peter 13 + run 15-16: 28; with 14 (run 13-16): 13.
 *  - Lisa end-game cards {3,7,10,14,25}, 8 chips: 59 - 8 = 51.
 *  - Components: 33 cards numbered 3-35; 9 removed; 24 in play; 11 chips each.
 *  - "You may not pass if you have no Pass tokens." (0 chips => must take)
 *
 * Run with: npm run audit  (tsx scripts/independent-rules-check.ts)
 */

import { createInitialGameState, startGame, processAction, calculateScore } from '../src/game/engine';
import type { GameState, Player } from '../src/game/models';

let failures = 0;
let passes = 0;

function check(desc: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (ok) {
    passes += 1;
    console.log(`  PASS  ${desc} -> ${String(actual)}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${desc} -> expected ${String(expected)}, got ${String(actual)}`);
  }
}

function playerWithCards(name: string, cards: number[], chips: number): Player {
  return {
    id: `p_${name.toLowerCase().replace(/\W+/g, '')}`,
    name,
    chips,
    cards: cards.map(value => ({ value })),
    isBot: false,
  };
}

console.log('No Thanks! — independent rules check vs rulebook\n');
console.log('1) Rulebook worked examples (scoring, rulebook section "Scoring"):');

// Brad: {8,13,14,15,17} -> 8 + 13 + 17 = 38; 38 - 13 tokens = 25
check('Brad {8,13,14,15,17}, 13 tokens -> 25', calculateScore(playerWithCards('Brad', [8, 13, 14, 15, 17], 13)), 25);
// Brad "if he had the 16 as well": cards {8,13,14,15,16,17} -> 8+13 = 21; 21 - 13 = 8
check('Brad with 16 -> 21 card pts, total 8', calculateScore(playerWithCards('Brad', [8, 13, 14, 15, 16, 17], 13)), 8);
// Sabrina singles {4,6,10,21}, 0 chips -> 41
check('Sabrina singles {4,6,10,21} -> 41', calculateScore(playerWithCards('Sabrina', [4, 6, 10, 21], 0)), 41);
// Peter: 13 (single) + run 15-16 -> 28
check('Peter 13 + run 15-16 -> 28', calculateScore(playerWithCards('Peter', [13, 15, 16], 0)), 28);
// Peter with 14 -> run 13-16 -> 13
check('Peter with 14 (run 13-16) -> 13', calculateScore(playerWithCards('Peter', [13, 14, 15, 16], 0)), 13);
// Lisa end-game: {3,7,10,14,25}, 8 chips -> 59 - 8 = 51
check('Lisa {3,7,10,14,25}, 8 chips -> 51', calculateScore(playerWithCards('Lisa', [3, 7, 10, 14, 25], 8)), 51);
// Edge: empty hand, chips only -> -chips (rulebook: chips subtract from total)
check('Empty hand, 5 chips -> -5', calculateScore(playerWithCards('Empty', [], 5)), -5);

console.log('\n2) Structural rules (components/setup, rulebook "Setup"):');

// Deck: 33 cards numbered 3..35; 9 removed; 24 in play.
{
  const state = createInitialGameState(['Player'], []);
  const deck = state.deck;
  const values = deck.map(c => c.value).sort((a, b) => a - b);
  check('Deck has 24 cards in play (33 - 9 removed)', deck.length, 24);
  // The 9 removed cards are RANDOM and unseen (rulebook: "Count out 9 cards and set them aside... do not look at these cards"), so the play deck need not span the full 3..35 range; every card must be in 3..35 (checked below).
  check('Every card in play is a valid 3..35 value', values.every(v => v >= 3 && v <= 35), true);
  const allDistinct = new Set(values).size === values.length;
  check('No duplicate cards in deck', allDistinct, true);
  const fullRange = Array.from({ length: 33 }, (_, i) => i + 3);
  const removed = fullRange.filter(v => !values.includes(v));
  check('9 cards removed, all in 3..35', removed.length, 9);
  check('Every card value in 3..35', values.every(v => v >= 3 && v <= 35), true);
}

// Starting chips: 11 each (3-5 players).
{
  const state = createInitialGameState(['Player'], []);
  check('Player starts with 11 chips', state.players[0].chips, 11);
}

// Bots start with 11 chips too.
{
  const state = createInitialGameState(['Player'], ['average']);
  check('Bot starts with 11 chips', state.players[1].chips, 11);
}

console.log('\n3) Turn rules (rulebook "Gameplay"):');

// Start: 1 active card revealed, deck 23, playing status.
{
  const initial = createInitialGameState(['Player'], []);
  const started = startGame(initial);
  check('Game starts with one active card', started.currentCard !== null, true);
  check('Deck has 23 cards after reveal', started.deck.length, 23);
  check('Status becomes playing', started.status, 'playing');
}

// Pass: pay 1 chip onto card, turn passes to next player.
{
  const initial = createInitialGameState(['P1', 'P2'], []);
  const started = startGame(initial);
  const actorId = started.players[started.currentPlayerIndex].id;
  const chipsBefore = started.players[started.currentPlayerIndex].chips;
  const potBefore = started.chipsOnCurrentCard;
  const after = processAction(started, actorId, 'pass');
  check('Pass spends 1 chip', after.players[started.currentPlayerIndex].chips, chipsBefore - 1);
  check('Pass adds 1 chip to pot', after.chipsOnCurrentCard, potBefore + 1);
  const nextIdx = (started.currentPlayerIndex + 1) % started.players.length;
  check('Turn passes to next player', after.currentPlayerIndex, nextIdx);
  check('Active card unchanged on pass', after.currentCard?.value, started.currentCard?.value);
}

// Pass with 0 chips is illegal (rulebook: "You may not pass if you have no Pass tokens").
{
  const initial = createInitialGameState(['P1', 'P2'], []);
  const started = startGame(initial);
  const actorId = started.players[started.currentPlayerIndex].id;
  // Drain the actor's chips
  const broke = { ...started, players: started.players.map(p => (p.id === actorId ? { ...p, chips: 0 } : p)) };
  const after = processAction(broke, actorId, 'pass');
  check('Pass rejected at 0 chips (state unchanged)', after.currentPlayerIndex === broke.currentPlayerIndex && after.players.find(p => p.id === actorId)?.chips === 0, true);
}

// Take: taker keeps turn, collects card + pot, reveals next card, resets pot.
{
  const initial = createInitialGameState(['P1', 'P2'], []);
  const started = startGame(initial);
  const actorIdx = started.currentPlayerIndex;
  const actorId = started.players[actorIdx].id;
  const chipsBefore = started.players[actorIdx].chips;
  const cardBefore = started.currentCard!.value;
  // Actor passes (pays 1), then the other player passes (pays 1).
  // The card comes back to the actor with a 2-chip pot; the actor then takes it.
  const p1 = processAction(started, actorId, 'pass'); // actor pays 1: pot=1
  const otherId = p1.players[p1.currentPlayerIndex].id; // now the other player
  const p2 = processAction(p1, otherId, 'pass'); // other pays 1: pot=2
  check('Setup: same card still active after two passes', p2.currentCard?.value === cardBefore, true);
  check('Setup: pot holds 2 chips after two passes', p2.chipsOnCurrentCard, 2);
  // Actor's chip count after paying one pass chip:
  const chipsAfterPass = chipsBefore - 1;
  const after = processAction(p2, actorId, 'take');
  const actor = after.players[actorIdx];
  check('Taker keeps the turn', after.currentPlayerIndex, actorIdx);
  check('Taker collects the card', actor.cards.some(c => c.value === cardBefore), true);
  // Net: spent 1 chip on the pass, then collected 2-chip pot => +1 vs start.
  check('Taker collects the pot chips (net +1 vs start)', actor.chips, chipsBefore + 1);
  check('Taker collected both pot chips (11 - 1 + 2)', actor.chips, chipsAfterPass + 2);
  check('Pot resets to 0', after.chipsOnCurrentCard, 0);
  check('New active card revealed', after.currentCard !== null && after.currentCard.value !== cardBefore, true);
}

// Game end: when the deck is exhausted after a take.
{
  // Construct a state with an active card, a deck of exactly 1 card, and a fresh pot.
  let state: GameState = createInitialGameState(['P1', 'P2'], []);
  state = startGame(state);
  const actorIdx = state.currentPlayerIndex;
  const actorId = state.players[actorIdx].id;
  const oneLeft: GameState = {
    ...state,
    deck: [{ value: 5 }],
    currentCard: { value: 9 },
    chipsOnCurrentCard: 0,
    status: 'playing',
  };
  // Actor takes 9: deck.pop() -> 5, still playing.
  const afterTake = processAction(oneLeft, actorId, 'take');
  check('Taking with one card left reveals it (still playing)', afterTake.status === 'playing' && afterTake.currentCard?.value === 5, true);
  // Actor takes 5 (the last card): deck empty -> game over.
  const afterLast = processAction(afterTake, actorId, 'take');
  check('Game finishes when last card taken', afterLast.status, 'finished');
  check('No active card after game over', afterLast.currentCard, null);
}

console.log(`\n----------------------------------------`);
console.log(`Audit gate: ${failures === 0 ? 'PASS' : 'FAIL'} — ${passes} checks passed, ${failures} failed`);
if (failures > 0) process.exit(1);
