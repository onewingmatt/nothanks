# RULES-AUDIT — No Thanks! web port (`/home/onewing/nothanks-deploy`)

**Audit type:** Deep real-rules audit (independent; second-pass cross-check vs. rulebook)
**Audit date:** 2026-08-27
**Auditor:** Hermes subagent
**Game audited:** No Thanks! (Geschenkt!), Thorsten Gimmler, Amigo Spiele 2004; EN editions Z-Man / Mayfair (© 2004–2015), 33 cards 3–35, 55 pass tokens, 3–7 players, ~20 min.
**Rules sources:** Mayfair/Amigo EN rules sheet (2011 v1.0) — quoted in `references/rulebook-extract.md`; cross-checked against Wikipedia, BGG #12942, UltraBoardGames (Z-Man EN), 64 Ounce Games (Z-Man EN). No first-party Amigo PDF was reachable (amigo.games product page 404s); the Mayfair-licensed EN sheet is the canonical text used.

## Verdict on real-game identity

The port is unambiguously a real-rules implementation of **No Thanks!** (Geschenkt!) by Thorsten Gimmler / Amigo:

- Deck 33 cards numbered 3–35, 9 cards removed unseen, 24 in play — matches rulebook exactly.
- 11 starting chips, pass/take decision on a single active card, chip payment to decline, taker collects card + pot and reveals the next card while keeping the turn — matches rulebook exactly.
- 0 chips ⇒ must take — matches rulebook exactly.
- Scoring: singles at face value, runs count once at the lowest value, minus 1 per chip; lowest score wins — matches rulebook exactly (all rulebook worked examples replay cleanly — see below).
- The published real game is **3–7 players**; the port runs **1 human + up to 5 bots locally** and **up to 6 participants per online room** (server `MAX_PLAYERS = 6`). The 3-player minimum of the physical game is relaxed by design for solo play — documented divergence (solo mode is an intentional extension; the underlying rules engine is player-count agnostic).

## How the audit was performed

1. **Rules located:** searched for first-party Amigo/Z-Man rulebook PDFs (amigo.games 404; no first-party PDF linkable), then captured the full Mayfair/Amigo EN rules sheet (Scribd mirror) plus Z-Man EN transcriptions (UltraBoardGames, 64 Ounce) and Wikipedia/BGG. Full extract in `references/rulebook-extract.md`.
2. **Engine read:** `src/game/engine.ts`, `src/game/ai.ts`, `src/game/models.ts`, `src/game/cryptoUtils.ts`, `src/components/*`, `src/App.tsx`, `src/network/multiplayerClient.ts`, `server/multiplayer-server.js` (858 lines).
3. **Rulebook worked examples replayed against the engine** in `scripts/independent-rules-check.ts` — the rulebook's own numbers are asserted against `calculateScore` and `processAction`, not self-consistent unit tests.
4. **Verdicts recorded** in the divergence table below; audit command wired as `npm run audit`.

## Divergence table (engine vs rulebook)

| # | Rule | Rulebook (Mayfair EN sheet) | Port engine | Verdict |
|---|------|------------------------------|-------------|---------|
| D1 | Deck composition | 33 cards, numbered 3–35 | `DECK_SIZE=33`, `MIN_CARD=3` → 3..35 | ✅ MATCH |
| D2 | Removed cards | 9 cards, random, unseen | shuffle then `deck.slice(9)` (server: `createDeck()` same) | ✅ MATCH |
| D3 | Cards in play per round | 24 | 33−9 = 24 | ✅ MATCH |
| D4 | Starting chips | 11 (3–5p) / 9 (6p) / 7 (7p) | `STARTING_CHIPS=11` hard-coded client AND server | ⚠️ PARTIAL — 11 is correct for 3–5p; 6p/7p scaling not implemented (server caps rooms at 6 and still starts 11) |
| D5 | Chip secrecy | hidden in hand | `hideChips` default ON; but game-state broadcast carries exact chip counts to all clients (trusted server; no per-player view partitioning) | ⚠️ PARTIAL — UI hides, wire/state exposes (acceptable for a casual web port; bots emulate uncertainty via awareness noise) |
| D6 | Turn order | clockwise; pass moves to left neighbor | `currentPlayerIndex = (i+1) % n` | ✅ MATCH |
| D7 | Pass | pay 1 chip, place on card, turn passes | pass: `chips−1`, `chipsOnCurrentCard+1`, advance index | ✅ MATCH |
| D8 | 0 chips ⇒ must take | "You may not pass if you have no Pass tokens" | `processAction` rejects pass at 0 chips; server `handleAction` rejects; UI disables PASS | ✅ MATCH |
| D9 | Take | take card + all chips on it | `cards.push(currentCard)`, `chips += chipsOnCurrentCard`, reset pot 0 | ✅ MATCH |
| D10 | After take | taker reveals next card, same turn continues | `currentCard = deck.pop()`, index unchanged | ✅ MATCH |
| D11 | Game end | last card taken, deck empty | `deck.pop() === null ⇒ status='finished'` | ✅ MATCH |
| D12 | Scoring | singles face value; runs scored once at lowest value; −1 per chip; lowest wins | `calculateScore`: sort, sum run heads (`sorted[i] !== sorted[i−1]+1` ⇒ add), subtract chips | ✅ MATCH — all worked examples replay (see audit script) |
| D13 | Winner on ties | "player(s) with the lowest number of points win" — ties share | UI crowns a single `finalResults[0]` "Winner"; standings list both at rank 1 | ⚠️ COSMETIC — scoring ties are handled correctly in standings; single-winner label is a UI simplification |
| D14 | Multi-round play | "we recommend four rounds", cumulative score | single round only; no cumulative scoring | ❌ DIVERGENCE (documented out of scope) |
| D15 | 6/7-player chip scaling | 9 / 7 chips | not implemented; always 11 | ❌ DIVERGENCE (documented out of scope; server max 6 players) |
| D16 | 3-player minimum | physical game is 3–7 | solo 1 human + bots; rooms allow 2+ participants | ⚠️ INTENTIONAL EXTENSION (solo mode) |
| D17 | Amigo tactical variant | optional (10 chips; remove 10/20/30) | not implemented | ℹ️ VARIANT — OK to omit |
| D18 | Hidden Tiger variant | optional (deal a set-aside card) | not implemented | ℹ️ VARIANT — OK to omit |
| D19 | First player | random / "most recently received a gift" | random (`getRandomInt(players.length)`) | ✅ MATCH (random method sanctioned by Z-Man EN: "Randomly determine which player begins") |

- **Engine-internal correctness notes (non-rule, audited anyway)**
  - **Server/client engine duplication:** `server/multiplayer-server.js` re-implements `engine.ts` in plain JS. Both copies agree on every rule constant and transition checked above (verified by reading both; the audit script tests the TS copy, the server copy is a line-for-line port). No shared versioned wire contract — divergence risk between the two copies is a real maintainability hazard (standard pillar 3).
  - **RNG/determinism:** engine takes an optional injected `RandomSource`; `createSeededRandom` exists and is used for the daily challenge. No seeded replay harness, no full-game seeded sims. `Math.random` is used directly in the server and for bot thinking delays.
  - **`src/utils/colors.test.ts` — FIXED during this audit:** the test asserted stale `hsl(…, 85%, 25%)` values while `colors.ts` returns `hsl(…, 82%, 32%)`. Cosmetic-only (card color gradient, no rules impact). Expected values updated to match the implementation; `npm run test` now passes 17/17 (8 color + 9 AI) — was 8/8 color FAIL.

- **Rulebook worked-example replay (the audit gate)**

  Run: `npm run audit` → `scripts/independent-rules-check.ts`. Independent script (imports only the public engine functions; encodes rulebook numbers, not engine numbers).

  | Rulebook example | Rulebook value | Engine result | Verdict |
  |---|---|---|---|
  | Brad: cards {8,13,14,15,17}, 13 tokens | 38 − 13 = **25** | 25 | ✅ PASS |
  | Brad's "if he had the 16" | 21 − 13 = **8** | 8 | ✅ PASS |
  | Sabrina singles {4,6,10,21} | **41** | 41 | ✅ PASS |
  | Peter: 13 + run 15–16 | **28** | 28 | ✅ PASS |
  | Peter with 14 → run 13–16 | **13** | 13 | ✅ PASS |
  | Lisa end-game: cards 3+7+10+14+25, 8 chips | 59 − 8 = **51** | 51 | ✅ PASS |
  | Empty-hand edge (chips only) | −chips | −chips | ✅ PASS |
  | Deal: 33 cards → 24 remain, 9 removed | 24 / 9 | 24 / 9 | ✅ PASS |
  | Start: 11 chips each | 11 | 11 | ✅ PASS |
  | Pass legality at 0 chips | must take | pass rejected | ✅ PASS |
  | Pass/take transitions (chip flow, turn order, pot reset, next card) | — | verified | ✅ PASS |
  | End: last card taken, deck empty | finished | finished | ✅ PASS |

  **6/6 rulebook examples replay; 27/27 structural & transition checks pass. Audit gate: PASS (33/33).**

## Audit counts

- Rules checks in `scripts/independent-rules-check.ts`: **33** (6 rulebook scoring examples + 27 structural/deal/legality/transition checks) — **all PASS** (`npm run audit` exits 0).
- Divergences documented: **3 real** (D14 multi-round cumulative, D15 6/7p chip scaling, D4-partial 6p chips) + **2 cosmetic/partial** (D5 chip secrecy on the wire, D13 tie label) + **2 intentional extensions** (D16 solo/2-player, D19 random start is fine) + **2 optional variants omitted** (D17, D18).
- Pre-existing failing test **fixed during this audit**: `src/utils/colors.test.ts` asserted stale color constants; updated to match implementation. `npm run test` now **PASS 17/17** (was 8 color FAILs + 9 AI PASS).

## Missing done-gate features (game-build-standard probes)

1. **Rules audit** (`npm run audit`): ✅ **PRESENT** (this audit).
2. **Socket E2E** (full game over live WebSocket to GAME_OVER, winner): ❌ **MISSING** — no socket-level test harness; server engine is untested by automation.
3. **Bot-move probe** (bot takes its own turn without human input): ⚠️ **PARTIAL** — bot loop exists in `App.tsx` (useEffect) and in the server (`scheduleBotTurnIfNeeded`), and `ai.test.ts` asserts bot decisions, but there is no automated probe that plays a bot turn inside a live game/room.
4. **Headless-browser zero-pageerror play-through**: ❌ **MISSING**.
5. **Deploy verification**: ⚠️ **PARTIAL** — `/health` exists on the unified server; no cache-busting (`client.js?v=N`) and no running-image md5 verification.
6. **Seeded replay harness / full-game seeded sims**: ❌ **MISSING** (seeded RNG exists but no replay tooling).
7. **Shared versioned wire contract** between server and client: ❌ **MISSING** (two hand-synced engine copies).
8. **Stuck-player/stall healing & disconnect policy**: ⚠️ **PARTIAL** — a disconnected player keeps the seat; a human-vs-human room can stall on a disconnected human's turn (no auto-pass/bot-takeover). Bots never stall (scheduled after every action path).
9. **Leave control**: ✅ present in-app (Exit Match / Back to home, `confirm()` not observed but exit path exists; online leave clears invite).
10. **Pan/zoom**: ℹ️ N/A — no map/board; card table layout only.
11. **How-to-play modal with REAL rules**: ⚠️ **PARTIAL** — TutorialOverlay teaches the correct core loop (goal, pass/take, 0-chip rule, runs, chips) but omits the 6/7-player chip scaling and multi-round cumulative scoring (which the engine doesn't implement anyway); "hide chips" tip omitted. No invented rules found.
12. **Action log / round recap**: ✅ present (ActionLog entries, end-game insights + standings).
13. **CVD-safe palette with redundant cues**: ⚠️ **PARTIAL** — numbers on cards are the redundant cue (good); no explicit protan/deutan/tritan verification found.

## Recommendation summary

The engine is a faithful, minimal rules implementation of No Thanks! for its chosen scope (single round, 3–5 player-equivalent chip counts, solo+online). The three real divergences are **scope decisions, not mistakes**: multi-round cumulative scoring, 6/7-player chip scaling, and the physical 3-player minimum. For a done-gate bar, the priority gaps are: socket E2E, automated bot-move probe in a live room, headless zero-pageerror play-through, seeded replay harness, and reconciling the duplicated server engine with a shared wire contract.

## Bot-decision determinism and the test tier, 2026-10-25

### The flake

`src/game/ai.test.ts` failed about 1 run in 5 — always the same case, `[Tunnel-Vision Pro]
Calculator (Low Risk -> Take instantly) -> Expected 'take', got 'pass'`. Measured at HEAD:
**4/20 runs red**, and the identical case every time.

Root cause was a boundary in `evaluateBeneficialCard`:

```ts
if (riskyness < 0.4) return 'take';   // "no risk appetite"
```

The calculator archetype's `riskyness` is exactly `0.4`, so `<` excluded it. It fell through to the
milk-for-chips path, where its `awareness` of 0.2 (below the 0.4 needed to assess opponents) takes
the `else` branch: `safeToPass = random() > 0.5`, then `random() < riskyness` → `pass`. That is
P(pass) = 0.5 × 0.4 = **20%**, which is exactly the observed failure rate. Nothing was modelling
anything there — a bot with no opponent information was flipping a coin.

### The fix

`<` → `<=` in **both** copies of the AI (`src/game/ai.ts` and the hand-copied block in
`server/multiplayer-server.js` — see gap 7 above; the server copy is the one that actually plays
online, so a fix to only one of them would have changed the tests and not the game). Blast radius is
one archetype: the calculator is the only one sitting at exactly 0.4 (novice 0.2, average 0.5,
gambler 0.9, empath 0.3, bully 0.8, grandmaster 0.5, shark 0.9).

### Measured effect

- Flakiness: `npm test` 20/20 green (was 4/20 red).
- Strength, via a new seeded self-play harness (`scripts/archetype-eval.ts`, 400 tables of 4 →
  200 games per archetype, identical seeds before and after):

  | archetype | win% before → after | avg score before → after (lower is better) |
  |---|---|---|
  | Arrogant Shark | 41.5 → 41.5 | 46.01 → 46.01 |
  | Tunnel-Vision Pro | 38.0 → **40.0** | 48.75 → **46.86** |
  | The Grandmaster | 29.5 → 32.5 | 45.62 → 45.24 |
  | Average Joe | 31.0 → 27.5 | 54.06 → 54.17 |
  | The Bully | 21.0 → 21.0 | 52.45 → 52.17 |
  | The Watcher | 15.0 → 18.0 | 59.42 → 57.04 |
  | Blind Gambler | 18.5 → 16.5 | 62.35 → 59.85 |
  | Clueless Novice | 11.0 → 10.5 | 68.84 → 68.75 |

  The calculator — the only archetype whose rule changed — gained ~2 points of win rate and ~1.9
  points of score. It is stronger, because it now takes a card it has already priced as beneficial
  instead of gambling it back to the table. The other archetypes' numbers move only by the RNG stream
  shift plus table noise (200 games each, ~3.5 points of standard error on a 25%-par win rate).

### A second, older defect this exposed

`npm test` was red **at HEAD regardless of the flake**, and the gate note had blamed it on
"uncommitted palette WIP". `41363ee` ("UI refresh: white cards…") changed `getCardColor`'s
saturation/lightness from 85%/25% to 82%/32% and did not update `colors.test.ts`, which had been
asserting the old values ever since. The uncommitted `colors.test.ts` in the tree was the missing
half of that commit, not WIP. It is committed here, which is what makes `test` safe to gate.

`test` therefore joins the FLOOR (was `audit` + `deploy:verify`), and the counters are read from a
clean checkout rather than a dirty tree — a tier that only passes with uncommitted files next to it
is not a gate.
