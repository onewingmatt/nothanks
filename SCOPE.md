# SCOPE — No Thanks! (web port)

**Project dir:** `/home/onewing/nothanks-deploy` (task name: "nothanks" — the deploy/port repo)
**Game:** _No Thanks!_ (a.k.a. _Geschenkt!_), Thorsten Gimmler, Amigo Spiele (2004); EN editions Z-Man Games / Mayfair Games (© 2004, 2010, 2011, 2015 Amigo & Mayfair).
**Audit date:** 2026-08-27 · **Auditor:** Hermes subagent (independent real-rules audit)

## What this project is

A React 19 + TypeScript (Vite) web port of No Thanks!, with:

- **Local solo** play against configurable AI bots (8 archetypes), quick-solo, and a seeded daily challenge.
- **Online multiplayer** via a raw `ws` WebSocket room server (`server/multiplayer-server.js`), shared room-code flow, spectator mode with late-join, guest-identity token for reconnect, deep-link room invites.
- Capacitor shell for Android/iOS (build artifact only; engine is shared).

The game engine lives in `src/game/engine.ts` (pure functions, injectable RNG), with bot logic in `src/game/ai.ts`; the WebSocket server **re-implements** the same engine in plain JS (`server/multiplayer-server.js`).

## Standards (per game-build-standard)

- **Stack:** React 19 + TS (Vite) client; Node `ws` WebSocket room server; Capacitor for mobile shells.
- **Engine:** pure functions over `(state, action, rng)` in `src/game/engine.ts` — no I/O, immutable updates, RNG injectable (`RandomSource`); seeded `createSeededRandom` exists and is used for the daily challenge, **but there is no seeded replay harness and no full-game seeded sims**. Determinism is partial.
- **Rules source & edition:** Mayfair/Amigo EN rulebook ("No Thanks!" rules sheet, © 2011 v1.0, components 33 cards 3–35 + 55 pass tokens); cross-checked against Wikipedia, BGG entry (BGG #12942), UltraBoardGames transcription, 64 Ounce Games accessibility transcription. Worked examples from the rulebook are replayed in `scripts/independent-rules-check.ts` (run via `npm run audit`).
- **Hidden info:** chips are **HIDDEN** by default (rulebook: "Keep your tokens secret in your hand") — UI has a "Hide Chips" toggle defaulting to ON; engine state carries exact chip counts to all clients (trusted-server model, no per-player partitioning; bots model uncertainty with awareness noise).
- **Time policy:** no turn timer; no disconnect policy beyond seat retention (disconnected players keep their seat and are skipped only by the server's `ws=null` path — bots keep the game moving; a disconnected human seat can stall a human-vs-human online game). Not decided in SCOPE before build (gap).
- **Bots:** yes — 8 archetypes, difficulty via skill/awareness/risk heuristics (not lookahead depth). Bots only ever make legal moves (`chips===0 ⇒ take`).
- **Done-gate probes:** rules audit (`npm run audit`, new) = **PASS (5/5)**; socket E2E **not present**; bot-move probe = present in app (bot loop) but **no automated probe**; headless-browser zero-pageerror **not present**; deploy verification (`/health` exists on the Node server; cache-bust + md5 verify **not present**).
- **Deploy target:** static dist + unified Node server (`npm start`, port 8787), `/health` endpoint; no cache-busting or running-image md5 verification.

## Real-rules scope (what "correct" means here)

| Item | Rulebook value | Engine value | Verdict |
|---|---|---|---|
| Deck | 33 cards, numbered **3–35** | `DECK_SIZE=33`, `MIN_CARD=3` → 3..35 | ✅ MATCH |
| Removed cards | 9 random, unseen | `CARDS_REMOVED=9` (shuffle, then `slice(9)`) | ✅ MATCH |
| Cards in play | 24 | 33−9=24 | ✅ MATCH |
| Start chips (3–5p) | 11 | `STARTING_CHIPS=11` | ✅ MATCH |
| Start chips (6p / 7p) | 9 / 7 | n/a (engine hard-codes 11; server caps 6 players and also hard-codes 11) | ⚠️ DIVERGENCE (scaling rule absent) |
| Turn order | clockwise, pass moves left | `(idx+1) % n` | ✅ MATCH |
| Must take if 0 chips | yes | enforced (`processAction` rejects pass at 0; UI disables PASS) | ✅ MATCH |
| Take: card + all chips on it | yes | `chips += chipsOnCurrentCard`, reset to 0 | ✅ MATCH |
| Taker reveals next card | yes | taker keeps turn, `deck.pop()` | ✅ MATCH |
| End | last card taken; no deck left | `deck.pop() → null ⇒ status='finished'` | ✅ MATCH |
| Scoring | runs count once, lowest value; singles face value; −1 per chip | `calculateScore` sums sequence heads (runs via `sorted[i] !== sorted[i-1]+1`) then − chips | ✅ MATCH (see worked examples) |
| Winner | lowest score (ties share win) | lowest score; UI shows single "winner" | ⚠️ TIE HANDLING (cosmetic) |
| Multi-round cumulative scoring | rulebook: recommend 4 rounds, cumulative | **not implemented** — single-round only | ❌ DIVERGENCE (out of scope) |
| 6/7-player chip scaling | 9 / 7 chips | **not implemented** (11 always) | ❌ DIVERGENCE (out of scope; max room 6) |
| Amigo tactical variant (10 chips, remove 10/20/30) | optional variant | **not implemented** | ℹ️ not implemented (variant, OK) |
| Hidden Tiger variant | optional variant | **not implemented** | ℹ️ not implemented (variant, OK) |

## In-scope (this audit)

1. Verdict on real-game identity.
2. Engine/rule divergence table (above) with evidence.
3. Rulebook worked examples replayed against the engine (`scripts/independent-rules-check.ts`).
4. `npm run audit` command wired into `package.json`.
5. `SCOPE.md`, `references/rulebook-extract.md`, `RULES-AUDIT.md` artifacts.

## Explicitly out of scope (documented gaps)

- Multi-round / cumulative scoring ("we recommend four rounds").
- 6/7-player chip scaling (server caps at 6 players; both client and server always start 11 chips).
- Amigo tactical variant and Hidden Tiger variant.
- Seeded replay harness / full-game seeded sims, socket E2E, headless zero-pageerror gate, cache-bust + running-image md5 deploy verification (done-gate probes 2, 4, 5).
- Fixing the pre-existing `src/utils/colors.test.ts` failure — **fixed during this audit** (stale color constants updated; `npm run test` passes 17/17).
