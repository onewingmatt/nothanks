# No Thanks! Online + Local

A React + TypeScript implementation of No Thanks with:

- Online multiplayer rooms via WebSocket server
- Local solo mode against AI bots
- Shared room-code flow for web, Android, and iOS clients
- Persistent guest identity token for reconnecting the same seat
- Spectator mode with late-join behavior during active games

## Scripts

- `npm run dev` - run frontend (Vite)
- `npm run dev:server` - run multiplayer room server on port `8787`
- `npm run build` - build frontend
- `npm run start` - run unified production server (static app + WebSocket on one port)
- `npm run start:static` - serve static-only build (no websocket)

## Run Online Multiplayer Locally

1. Install dependencies:
   - `npm install`
2. Start multiplayer server:
   - `npm run dev:server`
3. Start frontend in another terminal:
   - `npm run dev`
4. Open app in two browsers/devices.
5. Select **Online Multiplayer**, enter the same room code, and join.

## Cross-Platform (Web + Android + iOS)

The transport protocol is plain WebSocket JSON, so native clients can join the same rooms if they connect to the same server endpoint.

- Default local endpoint used by web app: `ws://localhost:8787/ws`
- Override endpoint with env var: `VITE_WS_URL`

Example:

- `VITE_WS_URL=wss://your-domain.com/ws`

For mobile app builds (React Native, Capacitor, Flutter, native iOS/Android), point each client to the same `wss://.../ws` endpoint and reuse the room code join flow.

## Identity and Reconnect

- Each client gets a persisted guest auth token (`localStorage` on web).
- Reconnecting with the same token reclaims the same player seat.
- This allows mobile app/web continuity without manual account creation.

## Spectator and Late Join Rules

- Join as **player** or **spectator** from the lobby.
- New joins during an active match are assigned spectator role.
- Spectators receive live room state but cannot play actions.
- Spectators can become players while the room is still waiting (if a seat is free).

## Room Model

- First player in a room is host.
- Host starts match.
- Minimum 2 players required.
- Max 6 players per room.
- Spectators are unlimited.

## Production Deployment (Single Domain + TLS)

The unified Node server serves both frontend files and WebSocket upgrades from the same origin:

- HTTP(S): `/`
- WebSocket: `/ws`
- Health: `/health`

### Option A: PaaS (Render/Fly/Heroku-like)

1. Build step: `npm ci && npm run build`
2. Start command: `npm run start`
3. Ensure platform terminates TLS and forwards traffic to `$PORT`.
4. Set `VITE_WS_URL` only if websocket host differs from app host.

### Option B: Docker

Build and run:

1. `docker build -t no-thanks-online .`
2. `docker run -p 8787:8787 -e PORT=8787 no-thanks-online`

Put TLS in front via reverse proxy or load balancer and expose `wss://your-domain/ws`.

## Notes

- Online mode is server-authoritative for turn order and actions.
- Local mode keeps full AI roster customization.
- `Procfile` points web process to `npm run start` for unified serving.
