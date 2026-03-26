import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.MULTIPLAYER_PORT || process.env.PORT || 8787);
const MAX_PLAYERS = 6;
const STARTING_CHIPS = 11;
const MIN_CARD = 3;
const DECK_SIZE = 33;
const CARDS_REMOVED = 9;
const BOT_THINK_MIN_MS = 450;
const BOT_THINK_MAX_MS = 1200;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const rooms = new Map();

const BOT_ARCHETYPES = [
  { id: 'novice', name: 'Clueless Novice', skill: 0.1, awareness: 0.1, riskyness: 0.2 },
  { id: 'average', name: 'Average Joe', skill: 0.5, awareness: 0.3, riskyness: 0.5 },
  { id: 'gambler', name: 'Blind Gambler', skill: 0.2, awareness: 0.1, riskyness: 0.9 },
  { id: 'calculator', name: 'Tunnel-Vision Pro', skill: 0.9, awareness: 0.2, riskyness: 0.4 },
  { id: 'empath', name: 'The Watcher', skill: 0.3, awareness: 0.9, riskyness: 0.3 },
  { id: 'bully', name: 'The Bully', skill: 0.6, awareness: 0.8, riskyness: 0.8 },
  { id: 'grandmaster', name: 'The Grandmaster', skill: 0.9, awareness: 0.9, riskyness: 0.5 },
  { id: 'shark', name: 'Arrogant Shark', skill: 0.9, awareness: 0.9, riskyness: 0.9 },
];

const BOT_ARCHETYPE_BY_ID = new Map(BOT_ARCHETYPES.map(bot => [bot.id, bot]));

function sanitizeRoomCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

function sanitizeName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
}

function sanitizeAuthToken(raw) {
  return String(raw || '').trim().slice(0, 128);
}

function normalizeRolePreference(raw) {
  return raw === 'spectator' ? 'spectator' : 'player';
}

function sanitizeBotIds(raw) {
  if (!Array.isArray(raw)) return [];

  const seen = new Set();
  const valid = [];

  for (const value of raw) {
    if (typeof value !== 'string') continue;
    if (!BOT_ARCHETYPE_BY_ID.has(value)) continue;
    if (seen.has(value)) continue;
    if (valid.length >= MAX_PLAYERS - 1) break;

    seen.add(value);
    valid.push(value);
  }

  return valid;
}

function buildBotPlayer(botId, index) {
  const bot = BOT_ARCHETYPE_BY_ID.get(botId);
  if (!bot) return null;

  return {
    id: `b_${index + 1}_${bot.id}`,
    name: bot.name,
    chips: STARTING_CHIPS,
    cards: [],
    isBot: true,
    botConfig: {
      skill: bot.skill,
      awareness: bot.awareness,
      riskyness: bot.riskyness,
    },
  };
}

function calculateActualCost(cardValue, playerCards, chipsOnCard) {
  const cardValues = playerCards.map(card => card.value);

  if (cardValues.includes(cardValue - 1) && cardValues.includes(cardValue + 1)) {
    return -(cardValue + 1) - chipsOnCard;
  }

  if (cardValues.includes(cardValue - 1)) {
    return -chipsOnCard;
  }

  if (cardValues.includes(cardValue + 1)) {
    return -1 - chipsOnCard;
  }

  return cardValue - chipsOnCard;
}

function getProbabilityCardInDeck(targetValue, gameState) {
  const maxCard = MIN_CARD + DECK_SIZE - 1;
  if (targetValue < MIN_CARD || targetValue > maxCard) return 0;

  const visibleCards = new Set();
  if (gameState.currentCard) visibleCards.add(gameState.currentCard.value);
  gameState.players.forEach(player => player.cards.forEach(card => visibleCards.add(card.value)));

  if (visibleCards.has(targetValue)) return 0;

  const cardsUnseen = DECK_SIZE - visibleCards.size;
  if (cardsUnseen <= 0) return 0;

  return Math.max(0, (cardsUnseen - CARDS_REMOVED) / cardsUnseen);
}

function evaluateBotDecision(gameState, botPlayer) {
  if (!gameState.currentCard) return 'pass';
  if (botPlayer.chips <= 0) return 'take';

  const cardValue = gameState.currentCard.value;
  const chipsOnCard = gameState.chipsOnCurrentCard;
  const skill = botPlayer.botConfig?.skill ?? 0.5;
  const awareness = botPlayer.botConfig?.awareness ?? 0.5;
  const riskyness = botPlayer.botConfig?.riskyness ?? 0.5;

  let perceivedCost = cardValue - chipsOnCard;

  if (skill >= 0.4) {
    perceivedCost = calculateActualCost(cardValue, botPlayer.cards, chipsOnCard);
  }

  if (skill >= 0.8 && perceivedCost > 0) {
    const chanceToLower = getProbabilityCardInDeck(cardValue - 1, gameState);
    const chanceToHigher = getProbabilityCardInDeck(cardValue + 1, gameState);
    const rawDiscount = (chanceToLower + chanceToHigher) * 4;
    if (botPlayer.chips > 3) perceivedCost -= rawDiscount;
  }

  if (perceivedCost <= 0) {
    if (riskyness < 0.4 || perceivedCost <= -10) return 'take';

    let safeToPass = true;
    if (awareness >= 0.4) {
      for (const opponent of gameState.players) {
        if (opponent.id === botPlayer.id) continue;

        const errorMargin = Math.max(0, Math.round((1 - awareness) * 5));
        const estimatedChips = Math.max(0, opponent.chips + (Math.random() * errorMargin * 2 - errorMargin));

        if (estimatedChips <= 0) safeToPass = false;

        if (awareness >= 0.7) {
          const opponentCost = calculateActualCost(cardValue, opponent.cards, chipsOnCard);
          if (opponentCost <= 0) safeToPass = false;
          if (estimatedChips <= 2 && opponentCost < 10) safeToPass = false;
        }
      }
    } else {
      safeToPass = Math.random() > 0.5;
    }

    if (!safeToPass) return 'take';
    if (botPlayer.chips <= 2 && riskyness < 0.9) return 'take';
    return Math.random() < riskyness ? 'pass' : 'take';
  }

  const panicThreshold = Math.round(8 - (riskyness * 6));
  let chipDesperation = 0;

  if (botPlayer.chips <= panicThreshold) {
    chipDesperation = (panicThreshold - botPlayer.chips + 1) * 8;
  } else if (botPlayer.chips >= 8) {
    chipDesperation = -8;
  }

  const riskAdjustment = (0.5 - riskyness) * 8;
  let takeThreshold = chipsOnCard + chipDesperation + riskAdjustment;

  if (awareness >= 0.8) {
    let opponentWillProbablyTake = false;
    for (const opponent of gameState.players) {
      if (opponent.id === botPlayer.id) continue;

      const errorMargin = Math.max(0, Math.round((1 - awareness) * 5));
      const estimatedChips = Math.max(0, opponent.chips + (Math.random() * errorMargin * 2 - errorMargin));
      if (estimatedChips <= 0) opponentWillProbablyTake = true;

      const opponentCost = calculateActualCost(cardValue, opponent.cards, chipsOnCard);
      if (opponentCost <= 0) opponentWillProbablyTake = true;
    }

    if (opponentWillProbablyTake) {
      takeThreshold -= 15;
    }
  }

  return takeThreshold >= perceivedCost ? 'take' : 'pass';
}

function sendJSON(ws, payload) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function createDeck() {
  const deck = [];
  for (let value = MIN_CARD; value < MIN_CARD + DECK_SIZE; value += 1) {
    deck.push({ value });
  }

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck.slice(CARDS_REMOVED);
}

function buildWaitingState(room) {
  const botPlayers = room.botIds
    .map((botId, index) => buildBotPlayer(botId, index))
    .filter(Boolean);

  return {
    id: `room_${room.code}`,
    players: [
      ...room.players.map((player, index) => ({
        id: `p_${index + 1}`,
        name: player.name,
        chips: STARTING_CHIPS,
        cards: [],
        isBot: false,
      })),
      ...botPlayers,
    ],
    currentPlayerIndex: 0,
    deck: [],
    currentCard: null,
    chipsOnCurrentCard: 0,
    status: 'waiting',
  };
}

function createInitialGameState(room) {
  const botPlayers = room.botIds
    .map((botId, index) => buildBotPlayer(botId, index))
    .filter(Boolean);

  return {
    id: `game_${Date.now()}_${room.code}`,
    players: [
      ...room.players.map((player, index) => ({
        id: `p_${index + 1}`,
        name: player.name,
        chips: STARTING_CHIPS,
        cards: [],
        isBot: false,
      })),
      ...botPlayers,
    ],
    currentPlayerIndex: 0,
    deck: createDeck(),
    currentCard: null,
    chipsOnCurrentCard: 0,
    status: 'waiting',
  };
}

function startGame(gameState) {
  const next = JSON.parse(JSON.stringify(gameState));
  if (next.status !== 'waiting') return next;

  next.status = 'playing';
  next.currentPlayerIndex = Math.floor(Math.random() * next.players.length);
  next.currentCard = next.deck.pop() || null;
  if (!next.currentCard) {
    next.status = 'finished';
  }

  return next;
}

function processAction(gameState, playerId, action) {
  const next = JSON.parse(JSON.stringify(gameState));

  if (next.status !== 'playing' || !next.currentCard) return next;

  const currentPlayer = next.players[next.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) return next;

  if (action === 'pass') {
    if (currentPlayer.chips <= 0) return next;
    currentPlayer.chips -= 1;
    next.chipsOnCurrentCard += 1;
    next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
    return next;
  }

  if (action === 'take') {
    currentPlayer.cards.push(next.currentCard);
    currentPlayer.chips += next.chipsOnCurrentCard;
    next.currentCard = next.deck.pop() || null;
    next.chipsOnCurrentCard = 0;
    if (!next.currentCard) {
      next.status = 'finished';
    }
    return next;
  }

  return next;
}

function clampBotIdsForRoom(room, requestedBotIds) {
  const availableBotSlots = Math.max(0, MAX_PLAYERS - room.players.length);
  return requestedBotIds.slice(0, availableBotSlots);
}

function clearBotTurnTimeout(room) {
  if (room.botTurnTimeout) {
    clearTimeout(room.botTurnTimeout);
    room.botTurnTimeout = null;
  }
}

function scheduleBotTurnIfNeeded(room) {
  clearBotTurnTimeout(room);

  if (!room.gameState || room.gameState.status !== 'playing') return;

  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isBot) return;

  const delay = BOT_THINK_MIN_MS + Math.floor(Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS + 1));
  room.botTurnTimeout = setTimeout(() => {
    room.botTurnTimeout = null;

    if (!room.gameState || room.gameState.status !== 'playing') return;

    const actor = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!actor || !actor.isBot) return;

    const action = evaluateBotDecision(room.gameState, actor);
    room.gameState = processAction(room.gameState, actor.id, action);
    broadcastRoomState(room);
    scheduleBotTurnIfNeeded(room);
  }, delay);
}

function getRoomMembershipBySession(sessionId) {
  for (const room of rooms.values()) {
    const playerIndex = room.players.findIndex(player => player.sessionId === sessionId);
    if (playerIndex >= 0) {
      return { room, role: 'player', index: playerIndex };
    }

    const spectatorIndex = room.spectators.findIndex(spectator => spectator.sessionId === sessionId);
    if (spectatorIndex >= 0) {
      return { room, role: 'spectator', index: spectatorIndex };
    }
  }

  return null;
}

function getPlayerIdByAuthToken(room, authToken) {
  const index = room.players.findIndex(player => player.authToken === authToken);
  return index >= 0 ? `p_${index + 1}` : null;
}

function getPlayerIdBySession(room, sessionId) {
  const index = room.players.findIndex(player => player.sessionId === sessionId);
  return index >= 0 ? `p_${index + 1}` : null;
}

function getHostPlayerId(room) {
  if (!room.hostAuthToken) return null;
  return getPlayerIdByAuthToken(room, room.hostAuthToken);
}

function createJoinedMessage(room, role, playerId) {
  return {
    type: 'joined',
    roomCode: room.code,
    role,
    playerId,
    hostPlayerId: getHostPlayerId(room),
    botIds: room.botIds,
  };
}

function broadcastRoomState(room) {
  const gameState = room.gameState ?? buildWaitingState(room);
  const hostPlayerId = getHostPlayerId(room);
  const spectators = room.spectators.map(spectator => ({
    name: spectator.name,
    connected: Boolean(spectator.ws),
  }));

  room.players.forEach(player => {
    if (!player.ws || player.ws.readyState !== player.ws.OPEN) return;
    sendJSON(player.ws, {
      type: 'room_state',
      roomCode: room.code,
      gameState,
      yourRole: 'player',
      yourPlayerId: getPlayerIdBySession(room, player.sessionId),
      hostPlayerId,
      spectators,
      botIds: room.botIds,
    });
  });

  room.spectators.forEach(spectator => {
    if (!spectator.ws || spectator.ws.readyState !== spectator.ws.OPEN) return;
    sendJSON(spectator.ws, {
      type: 'room_state',
      roomCode: room.code,
      gameState,
      yourRole: 'spectator',
      yourPlayerId: null,
      hostPlayerId,
      spectators,
      botIds: room.botIds,
    });
  });
}

function roomHasNoParticipants(room) {
  return room.players.length === 0 && room.spectators.length === 0;
}

function removeSession(sessionId) {
  const membership = getRoomMembershipBySession(sessionId);
  if (!membership) return;

  const { room, role, index } = membership;

  if (role === 'spectator') {
    room.spectators.splice(index, 1);
    if (roomHasNoParticipants(room)) {
      clearBotTurnTimeout(room);
      rooms.delete(room.code);
      return;
    }
    broadcastRoomState(room);
    return;
  }

  const player = room.players[index];
  const isWaiting = !room.gameState || room.gameState.status === 'waiting';

  if (!isWaiting) {
    player.ws = null;
    player.sessionId = null;
    broadcastRoomState(room);
    return;
  }

  room.players.splice(index, 1);

  if (room.hostAuthToken === player.authToken) {
    room.hostAuthToken = room.players[0]?.authToken ?? null;
  }

  if (roomHasNoParticipants(room)) {
    clearBotTurnTimeout(room);
    rooms.delete(room.code);
    return;
  }

  broadcastRoomState(room);
}

function ensureUniqueName(room, playerName, authToken) {
  const lower = playerName.toLowerCase();
  const takenByPlayer = room.players.some(player => player.name.toLowerCase() === lower && player.authToken !== authToken);
  const takenBySpectator = room.spectators.some(spectator => spectator.name.toLowerCase() === lower && spectator.authToken !== authToken);
  return !(takenByPlayer || takenBySpectator);
}

function handleJoinRoom(ws, sessionId, payload) {
  const roomCode = sanitizeRoomCode(payload?.roomCode);
  const playerName = sanitizeName(payload?.playerName);
  const authToken = sanitizeAuthToken(payload?.authToken);
  const rolePreference = normalizeRolePreference(payload?.rolePreference);
  const requestedBotIds = sanitizeBotIds(payload?.botIds);

  if (!roomCode) {
    sendJSON(ws, { type: 'error', message: 'Room code is required.' });
    return;
  }

  if (!playerName) {
    sendJSON(ws, { type: 'error', message: 'Player name is required.' });
    return;
  }

  if (!authToken) {
    sendJSON(ws, { type: 'error', message: 'Missing auth token.' });
    return;
  }

  const existingMembership = getRoomMembershipBySession(sessionId);
  if (existingMembership) {
    sendJSON(ws, { type: 'error', message: 'Already joined to a room in this session.' });
    return;
  }

  let room = rooms.get(roomCode);
  if (!room) {
    if (rolePreference === 'spectator') {
      sendJSON(ws, { type: 'error', message: 'Cannot create a spectator-only room. Create or join as a player first.' });
      return;
    }

    room = {
      code: roomCode,
      hostAuthToken: null,
      players: [],
      spectators: [],
      botIds: [],
      gameState: null,
      botTurnTimeout: null,
    };
    room.botIds = clampBotIdsForRoom(room, requestedBotIds);
    rooms.set(roomCode, room);
  }

  const existingPlayer = room.players.find(player => player.authToken === authToken);
  if (existingPlayer) {
    existingPlayer.name = playerName;
    existingPlayer.sessionId = sessionId;
    existingPlayer.ws = ws;
    if (!room.hostAuthToken) {
      room.hostAuthToken = existingPlayer.authToken;
    }

    const waiting = !room.gameState || room.gameState.status === 'waiting';
    if (room.hostAuthToken === existingPlayer.authToken && waiting) {
      room.botIds = clampBotIdsForRoom(room, requestedBotIds);
    }

    sendJSON(ws, createJoinedMessage(room, 'player', getPlayerIdBySession(room, sessionId)));
    broadcastRoomState(room);
    scheduleBotTurnIfNeeded(room);
    return;
  }

  const existingSpectator = room.spectators.find(spectator => spectator.authToken === authToken);
  if (existingSpectator) {
    const waiting = !room.gameState || room.gameState.status === 'waiting';

    if (waiting && rolePreference === 'player' && (room.players.length + room.botIds.length) < MAX_PLAYERS) {
      room.spectators = room.spectators.filter(spectator => spectator.authToken !== authToken);
      room.players.push({
        sessionId,
        name: playerName,
        authToken,
        ws,
      });

      if (!room.hostAuthToken) {
        room.hostAuthToken = authToken;
      }

      sendJSON(ws, createJoinedMessage(room, 'player', getPlayerIdBySession(room, sessionId)));
      broadcastRoomState(room);
      scheduleBotTurnIfNeeded(room);
      return;
    }

    existingSpectator.name = playerName;
    existingSpectator.sessionId = sessionId;
    existingSpectator.ws = ws;
    sendJSON(ws, createJoinedMessage(room, 'spectator', null));
    broadcastRoomState(room);
    scheduleBotTurnIfNeeded(room);
    return;
  }

  if (!ensureUniqueName(room, playerName, authToken)) {
    sendJSON(ws, { type: 'error', message: 'That player name is already in use in this room.' });
    return;
  }

  const gameStarted = room.gameState && room.gameState.status !== 'waiting';
  if (gameStarted) {
    // Late joins become spectators while a match is active.
    room.spectators.push({ sessionId, name: playerName, authToken, ws });
    sendJSON(ws, createJoinedMessage(room, 'spectator', null));
    broadcastRoomState(room);
    scheduleBotTurnIfNeeded(room);
    return;
  }

  if (rolePreference === 'spectator') {
    room.spectators.push({ sessionId, name: playerName, authToken, ws });
    sendJSON(ws, createJoinedMessage(room, 'spectator', null));
    broadcastRoomState(room);
    scheduleBotTurnIfNeeded(room);
    return;
  }

  if (room.players.length + room.botIds.length >= MAX_PLAYERS) {
    sendJSON(ws, { type: 'error', message: 'Room is full when including bots. Join as spectator or reduce bots.' });
    return;
  }

  room.players.push({
    sessionId,
    name: playerName,
    authToken,
    ws,
  });

  if (!room.hostAuthToken) {
    room.hostAuthToken = authToken;
  }

  const isHost = room.hostAuthToken === authToken;
  const isWaiting = !room.gameState || room.gameState.status === 'waiting';
  if (isHost && isWaiting) {
    room.botIds = clampBotIdsForRoom(room, requestedBotIds);
  }

  sendJSON(ws, createJoinedMessage(room, 'player', getPlayerIdBySession(room, sessionId)));
  broadcastRoomState(room);
  scheduleBotTurnIfNeeded(room);
}

function handleStartGame(ws, sessionId) {
  const membership = getRoomMembershipBySession(sessionId);
  if (!membership) {
    sendJSON(ws, { type: 'error', message: 'Join a room first.' });
    return;
  }

  if (membership.role !== 'player') {
    sendJSON(ws, { type: 'error', message: 'Spectators cannot start the game.' });
    return;
  }

  const { room, index } = membership;
  const actor = room.players[index];

  if (room.hostAuthToken !== actor.authToken) {
    sendJSON(ws, { type: 'error', message: 'Only the host can start the game.' });
    return;
  }

  if ((room.players.length + room.botIds.length) < 2) {
    sendJSON(ws, { type: 'error', message: 'At least 2 participants (players and/or bots) are required to start.' });
    return;
  }

  if (room.gameState && room.gameState.status === 'playing') {
    sendJSON(ws, { type: 'error', message: 'Game is already in progress.' });
    return;
  }

  room.gameState = startGame(createInitialGameState(room));
  broadcastRoomState(room);
  scheduleBotTurnIfNeeded(room);
}

function handleAction(ws, sessionId, payload) {
  const action = payload?.action;
  if (action !== 'pass' && action !== 'take') {
    sendJSON(ws, { type: 'error', message: 'Invalid action.' });
    return;
  }

  const membership = getRoomMembershipBySession(sessionId);
  if (!membership) {
    sendJSON(ws, { type: 'error', message: 'Join a room first.' });
    return;
  }

  if (membership.role !== 'player') {
    sendJSON(ws, { type: 'error', message: 'Spectators cannot play actions.' });
    return;
  }

  const { room, index } = membership;
  if (!room.gameState) {
    sendJSON(ws, { type: 'error', message: 'No active game in this room.' });
    return;
  }

  if (room.gameState.status !== 'playing') {
    sendJSON(ws, { type: 'error', message: 'Game is not currently running.' });
    return;
  }

  const actorId = `p_${index + 1}`;
  const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];

  if (!currentPlayer || currentPlayer.id !== actorId) {
    sendJSON(ws, { type: 'error', message: 'It is not your turn.' });
    return;
  }

  if (action === 'pass' && currentPlayer.chips <= 0) {
    sendJSON(ws, { type: 'error', message: 'You have 0 chips and must take.' });
    return;
  }

  room.gameState = processAction(room.gameState, actorId, action);
  broadcastRoomState(room);
  scheduleBotTurnIfNeeded(room);
}

function sendFile(res, filePath, statusCode = 200) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(fileBuffer);
}

function handleHttpRequest(req, res) {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }));
    return;
  }

  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const pathname = requestUrl.pathname;

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }

  if (pathname.startsWith('/ws')) {
    res.writeHead(426, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, message: 'Upgrade Required' }));
    return;
  }

  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Multiplayer server is running. Build frontend to serve static files.');
    return;
  }

  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const safeResolvedPath = path.resolve(DIST_DIR, `.${relativePath}`);

  if (!safeResolvedPath.startsWith(DIST_DIR)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, message: 'Bad request path.' }));
    return;
  }

  if (fs.existsSync(safeResolvedPath) && fs.statSync(safeResolvedPath).isFile()) {
    sendFile(res, safeResolvedPath);
    return;
  }

  const fallbackPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(fallbackPath)) {
    sendFile(res, fallbackPath);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, message: 'Not found' }));
}

const httpServer = createServer(handleHttpRequest);
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
  if (!req.url || !req.url.startsWith('/ws')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws);
  });
});

wss.on('connection', ws => {
  const sessionId = randomUUID();

  ws.on('message', raw => {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      sendJSON(ws, { type: 'error', message: 'Invalid JSON payload.' });
      return;
    }

    const { type } = payload || {};
    if (type === 'join_room') {
      handleJoinRoom(ws, sessionId, payload);
      return;
    }
    if (type === 'start_game') {
      handleStartGame(ws, sessionId);
      return;
    }
    if (type === 'player_action') {
      handleAction(ws, sessionId, payload);
      return;
    }
    if (type === 'ping') {
      sendJSON(ws, { type: 'pong' });
      return;
    }

    sendJSON(ws, { type: 'error', message: 'Unknown message type.' });
  });

  ws.on('close', () => {
    removeSession(sessionId);
  });

  ws.on('error', () => {
    removeSession(sessionId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Unified web + multiplayer server listening on port ${PORT}`);
});
