/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  buildRoomInvite,
  getMultiplayerEndpointLabel,
  isStandaloneDisplayMode,
  readRoomInviteFromLocation,
  syncRoomInviteInLocation,
} from './config/runtime';
import { GameBoard } from './components/GameBoard';
import { HomeHub } from './components/HomeHub';
import { Lobby } from './components/Lobby';
import { TutorialOverlay } from './components/TutorialOverlay';
import { BOT_ARCHETYPES, type GameState, type BotAction, type BotArchetypeId } from './game/models';
import { createInitialGameState, startGame, processAction, calculateScore } from './game/engine';
import { evaluateBotDecision } from './game/ai';
import { createSeededRandom, type RandomSource } from './game/cryptoUtils';
import { feedbackEngine } from './utils/feedback';
import { MultiplayerClient } from './network/multiplayerClient';
import type { MultiplayerMessage, OnlineRole, SpectatorInfo } from './network/multiplayerClient';

const canUseWindow = typeof window !== 'undefined';
const PROFILE_STATS_KEY = 'nt_profile_stats';
const SEEN_HINTS_KEY = 'nt_seen_mistake_hints';
const GUEST_AUTH_TOKEN_KEY = 'nt_guest_auth_token';
const PLAYER_NAME_KEY = 'nt_lobby_player_name';
const QUICK_MATCH_BOTS: BotArchetypeId[] = ['average', 'calculator', 'empath'];

function getStoredToggle(key: string, fallback: boolean): boolean {
  if (!canUseWindow) return fallback;

  const value = window.localStorage.getItem(key);
  if (value == null) return fallback;
  return value === '1';
}

interface ActionLogEntry {
  playerId: string;
  playerName: string;
  isBot: boolean;
  action: BotAction;
  cardValue: number;
  chipsOnCard: number;
  rawCost: number;
}

interface InsightCard {
  label: string;
  value: string;
  detail: string;
}

interface MistakeHint {
  id: string;
  message: string;
}

interface ProfileStats {
  gamesPlayed: number;
  wins: number;
  streak: number;
  bestScore: number | null;
  daily: {
    seed: string;
    attempts: number;
    bestScore: number | null;
  };
}

type RoomMode = 'local' | 'online';
type AppShellScreen = 'home' | 'play';
type SessionPreset = 'standard' | 'quick' | 'daily';

interface RoomInfo {
  name: string;
  room: string;
  bots: BotArchetypeId[];
  mode: RoomMode;
}

function createGuestAuthToken(): string {
  if (!canUseWindow) return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateGuestAuthToken(): string {
  if (!canUseWindow) return createGuestAuthToken();

  const existing = window.localStorage.getItem(GUEST_AUTH_TOKEN_KEY);
  if (existing) return existing;

  const next = createGuestAuthToken();
  window.localStorage.setItem(GUEST_AUTH_TOKEN_KEY, next);
  return next;
}

function isBotArchetypeId(value: string): value is BotArchetypeId {
  return value === 'novice'
    || value === 'average'
    || value === 'gambler'
    || value === 'calculator'
    || value === 'empath'
    || value === 'bully'
    || value === 'grandmaster'
    || value === 'shark';
}

function createTodaySeed(): string {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getPreferredPlayerName(): string {
  if (!canUseWindow) return 'Player One';
  return window.localStorage.getItem(PLAYER_NAME_KEY) || 'Player One';
}

function createLocalRoomCode(prefix: string): string {
  const compact = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `${compact}${suffix}`.slice(0, 8);
}

function createDailyRoomCode(seed: string): string {
  return `D${seed.slice(2, 8)}`;
}

function buildDailyBotLineup(seed: string): BotArchetypeId[] {
  const random = createSeededRandom(`daily-lineup:${seed}`);
  const pool = BOT_ARCHETYPES.map(bot => bot.id as BotArchetypeId);
  const lineup: BotArchetypeId[] = [];

  while (pool.length > 0 && lineup.length < 3) {
    const index = Math.floor(random() * pool.length);
    const [botId] = pool.splice(index, 1);
    lineup.push(botId);
  }

  return lineup;
}

function formatOrdinal(value: number): string {
  const ten = value % 10;
  const hundred = value % 100;

  if (hundred >= 11 && hundred <= 13) return `${value}th`;
  if (ten === 1) return `${value}st`;
  if (ten === 2) return `${value}nd`;
  if (ten === 3) return `${value}rd`;
  return `${value}th`;
}

function defaultProfileStats(seed: string): ProfileStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    streak: 0,
    bestScore: null,
    daily: {
      seed,
      attempts: 0,
      bestScore: null,
    },
  };
}

function loadProfileStats(): ProfileStats {
  const seed = createTodaySeed();
  const fallback = defaultProfileStats(seed);
  if (!canUseWindow) return fallback;

  try {
    const raw = window.localStorage.getItem(PROFILE_STATS_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<ProfileStats>;
    const parsedDaily = parsed.daily;

    return {
      gamesPlayed: typeof parsed.gamesPlayed === 'number' ? parsed.gamesPlayed : fallback.gamesPlayed,
      wins: typeof parsed.wins === 'number' ? parsed.wins : fallback.wins,
      streak: typeof parsed.streak === 'number' ? parsed.streak : fallback.streak,
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : fallback.bestScore,
      daily: parsedDaily && parsedDaily.seed === seed
        ? {
            seed,
            attempts: typeof parsedDaily.attempts === 'number' ? parsedDaily.attempts : 0,
            bestScore: typeof parsedDaily.bestScore === 'number' ? parsedDaily.bestScore : null,
          }
        : fallback.daily,
    };
  } catch {
    return fallback;
  }
}

function loadSeenHints(): string[] {
  if (!canUseWindow) return [];

  try {
    const raw = window.localStorage.getItem(SEEN_HINTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function buildLocalMistakeHint(gameState: GameState, localPlayerId: string, action: BotAction): MistakeHint | null {
  if (!gameState.currentCard) return null;

  const localPlayer = gameState.players.find(player => player.id === localPlayerId);
  if (!localPlayer) return null;

  const cardValue = gameState.currentCard.value;
  const chipsOnCard = gameState.chipsOnCurrentCard;
  const localValues = localPlayer.cards.map(card => card.value);
  const hasLower = localValues.includes(cardValue - 1);
  const hasUpper = localValues.includes(cardValue + 1);

  if (action === 'pass') {
    if (hasLower && hasUpper) {
      return {
        id: 'bridge-opportunity-missed',
        message: 'Bridge opportunity missed: that card would have stitched your run immediately.',
      };
    }
    if ((hasLower || hasUpper) && chipsOnCard >= 1) {
      return {
        id: 'connected-card-value-missed',
        message: 'Possible value missed: connected cards are usually better than face value suggests.',
      };
    }
    if (chipsOnCard >= 5) {
      return {
        id: 'large-pot-left-behind',
        message: 'Large pot left behind: high chip stacks can justify taking rough cards.',
      };
    }
  }

  if (action === 'take') {
    if (!hasLower && !hasUpper && cardValue >= 30 && chipsOnCard <= 1 && localPlayer.chips >= 4) {
      return {
        id: 'costly-high-card-grab',
        message: 'That was a costly grab: huge card, tiny pot, and no sequence connection.',
      };
    }
    if (!hasLower && !hasUpper && cardValue >= 26 && chipsOnCard === 0 && localPlayer.chips >= 6) {
      return {
        id: 'expensive-empty-pot-take',
        message: 'Expensive take: consider passing when the card is high and the pot is empty.',
      };
    }
  }

  return null;
}

function buildInsights(actionLog: ActionLogEntry[], localPlayerId: string): InsightCard[] {
  const takes = actionLog.filter(entry => entry.action === 'take');

  const biggestSteal = takes.reduce<ActionLogEntry | null>((best, current) => {
    if (!best) return current;
    return current.chipsOnCard > best.chipsOnCard ? current : best;
  }, null);

  const priciestTake = takes.reduce<ActionLogEntry | null>((best, current) => {
    if (!best) return current;
    return current.rawCost > best.rawCost ? current : best;
  }, null);

  const localPasses = actionLog.filter(entry => entry.playerId === localPlayerId && entry.action === 'pass').length;
  const localPotWins = actionLog
    .filter(entry => entry.playerId === localPlayerId && entry.action === 'take')
    .reduce((total, entry) => total + entry.chipsOnCard, 0);
  const localNet = localPotWins - localPasses;

  return [
    biggestSteal
      ? {
          label: 'Biggest Steal',
          value: `${biggestSteal.playerName} +${biggestSteal.chipsOnCard}`,
          detail: `Snapped card ${biggestSteal.cardValue}`,
        }
      : {
          label: 'Biggest Steal',
          value: 'No major pot',
          detail: 'Few chips stacked this round',
        },
    priciestTake
      ? {
          label: 'Priciest Take',
          value: `${priciestTake.playerName} ${priciestTake.rawCost >= 0 ? '+' : ''}${priciestTake.rawCost}`,
          detail: `Card ${priciestTake.cardValue} with ${priciestTake.chipsOnCard} chips`,
        }
      : {
          label: 'Priciest Take',
          value: 'No take data',
          detail: 'Round ended before key swings',
        },
    {
      label: 'Your Chip Flow',
      value: `${localNet >= 0 ? '+' : ''}${localNet}`,
      detail: `${localPotWins} won in pots - ${localPasses} paid on passes`,
    },
  ];
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>('p_1');
  const [shellScreen, setShellScreen] = useState<AppShellScreen>(() => (readRoomInviteFromLocation() ? 'play' : 'home'));
  const [sessionPreset, setSessionPreset] = useState<SessionPreset>('standard');
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    if (!canUseWindow) return true;
    return window.localStorage.getItem('nt_tutorial_seen') !== '1';
  });
  const [hideChips, setHideChips] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => getStoredToggle('nt_sound_enabled', true));
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => getStoredToggle('nt_haptics_enabled', true));
  const [hapticsSupported, setHapticsSupported] = useState<boolean>(() => feedbackEngine.supportsHaptics());
  const [hapticsStatus, setHapticsStatus] = useState<string>('');
  const [mistakeHint, setMistakeHint] = useState<string>('');
  const [seenHintIds, setSeenHintIds] = useState<string[]>(() => loadSeenHints());
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [profileStats, setProfileStats] = useState<ProfileStats>(() => loadProfileStats());
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [turnPulseKey, setTurnPulseKey] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<string>('Idle');
  const [onlineError, setOnlineError] = useState<string>('');
  const [isOnlineConnecting, setIsOnlineConnecting] = useState<boolean>(false);
  const [isOnlineHost, setIsOnlineHost] = useState<boolean>(false);
  const [onlineRole, setOnlineRole] = useState<OnlineRole>('player');
  const [spectators, setSpectators] = useState<SpectatorInfo[]>([]);
  const previousStateRef = useRef<GameState | null>(null);
  const hapticsStatusTimeoutRef = useRef<number | null>(null);
  const mistakeHintTimeoutRef = useRef<number | null>(null);
  const recordedGameIdRef = useRef<string | null>(null);
  const multiplayerClientRef = useRef<MultiplayerClient | null>(null);
  const guestAuthTokenRef = useRef<string>(getOrCreateGuestAuthToken());
  const sessionRandomRef = useRef<RandomSource | null>(null);
  const dailySeed = profileStats.daily.seed;
  const dailyLineup = useMemo(() => buildDailyBotLineup(dailySeed), [dailySeed]);
  const dailyLineupLabels = useMemo(() => dailyLineup.map(botId => BOT_ARCHETYPES.find(bot => bot.id === botId)?.name || botId), [dailyLineup]);
  const installReady = isStandaloneDisplayMode();

  // Manage Document Title
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (gameState && roomInfo?.room) {
      document.title = `No Thanks! [${roomInfo.room}]`;
    } else {
      document.title = "No Thanks!";
    }
  }, [gameState, roomInfo]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem('nt_sound_enabled', soundEnabled ? '1' : '0');
  }, [soundEnabled]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem('nt_haptics_enabled', hapticsEnabled ? '1' : '0');
  }, [hapticsEnabled]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem(PROFILE_STATS_KEY, JSON.stringify(profileStats));
  }, [profileStats]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem(SEEN_HINTS_KEY, JSON.stringify(seenHintIds));
  }, [seenHintIds]);

  useEffect(() => {
    if (!canUseWindow || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();

    mediaQuery.addEventListener('change', syncPreference);
    return () => mediaQuery.removeEventListener('change', syncPreference);
  }, []);

  const showHapticsStatus = useCallback((message: string) => {
    setHapticsStatus(message);
    if (!canUseWindow) return;

    if (hapticsStatusTimeoutRef.current != null) {
      window.clearTimeout(hapticsStatusTimeoutRef.current);
    }

    hapticsStatusTimeoutRef.current = window.setTimeout(() => {
      setHapticsStatus('');
    }, 2400);
  }, []);

  const showMistakeHint = useCallback((message: string) => {
    setMistakeHint(message);
    if (!canUseWindow) return;

    if (mistakeHintTimeoutRef.current != null) {
      window.clearTimeout(mistakeHintTimeoutRef.current);
    }

    mistakeHintTimeoutRef.current = window.setTimeout(() => {
      setMistakeHint('');
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (!canUseWindow || hapticsStatusTimeoutRef.current == null) return;
      window.clearTimeout(hapticsStatusTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!canUseWindow || mistakeHintTimeoutRef.current == null) return;
      window.clearTimeout(mistakeHintTimeoutRef.current);
    };
  }, []);

  const disconnectMultiplayer = useCallback((nextStatus?: string) => {
    if (multiplayerClientRef.current) {
      multiplayerClientRef.current.disconnect();
      multiplayerClientRef.current = null;
    }

    if (nextStatus) {
      setOnlineStatus(nextStatus);
    }

    setIsOnlineConnecting(false);
    setIsOnlineHost(false);
    setOnlineRole('player');
    setSpectators([]);
  }, []);

  useEffect(() => {
    return () => {
      if (multiplayerClientRef.current) {
        multiplayerClientRef.current.disconnect();
      }
    };
  }, []);

  const handleMultiplayerMessage = useCallback((message: MultiplayerMessage) => {
    if (message.type === 'error') {
      setOnlineError(message.message);
      return;
    }

    if (message.type === 'joined') {
      setOnlineStatus(`Connected to room ${message.roomCode}.`);
      setOnlineError('');
      setIsOnlineConnecting(false);
      setOnlineRole(message.role);
      setLocalPlayerId(message.playerId || '');
      setIsOnlineHost(message.hostPlayerId === message.playerId);
      setRoomInfo(previous => {
        if (!previous || previous.mode !== 'online') return previous;
        return {
          ...previous,
          bots: message.botIds.filter(isBotArchetypeId),
        };
      });
      return;
    }

    if (message.type === 'room_state') {
      setGameState(message.gameState);
      setOnlineRole(message.yourRole);
      setLocalPlayerId(message.yourPlayerId || '');
      setIsOnlineHost(message.hostPlayerId === message.yourPlayerId);
      setSpectators(message.spectators || []);
      setRoomInfo(previous => {
        if (!previous || previous.mode !== 'online') return previous;
        return {
          ...previous,
          bots: message.botIds.filter(isBotArchetypeId),
        };
      });
      setOnlineError('');
      setOnlineStatus(
        message.gameState.status === 'waiting'
          ? 'Waiting for players to join.'
          : message.gameState.status === 'playing'
            ? `Match in progress. Spectators: ${message.spectators?.length ?? 0}`
            : 'Match complete.'
      );
      return;
    }
  }, []);

  useEffect(() => {
    const syncHapticsSupport = () => {
      const supported = feedbackEngine.supportsHaptics();
      setHapticsSupported(supported);
      if (!supported) {
        setHapticsEnabled(false);
        showHapticsStatus('Phone browser does not expose vibration API.');
      }
    };

    syncHapticsSupport();
    if (!canUseWindow) return;

    window.addEventListener('focus', syncHapticsSupport);
    window.addEventListener('visibilitychange', syncHapticsSupport);

    return () => {
      window.removeEventListener('focus', syncHapticsSupport);
      window.removeEventListener('visibilitychange', syncHapticsSupport);
    };
  }, [showHapticsStatus]);

  useEffect(() => {
    if (!gameState) {
      previousStateRef.current = null;
      return;
    }

    const previousState = previousStateRef.current;
    if (previousState) {
      const previousTurnPlayerId = previousState.players[previousState.currentPlayerIndex]?.id;
      const nextTurnPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;

      if (previousState.status === 'waiting' && gameState.status === 'playing') {
        feedbackEngine.play('game-start', soundEnabled);
        queueMicrotask(() => {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTurnPulseKey(value => value + 1);
        });
      }

      if (gameState.status === 'finished' && previousState.status !== 'finished') {
        feedbackEngine.play('game-over', soundEnabled);
        feedbackEngine.vibrate('game-over', hapticsEnabled);
      }

      if (gameState.status === 'playing' && previousTurnPlayerId !== nextTurnPlayerId) {
        feedbackEngine.play('turn-change', soundEnabled);
        feedbackEngine.vibrate('turn-change', hapticsEnabled);
        queueMicrotask(() => {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTurnPulseKey(value => value + 1);
        });
      }

      if (previousState.status === 'playing' && gameState.status === 'playing') {
        const previousCardValue = previousState.currentCard?.value ?? null;
        const nextCardValue = gameState.currentCard?.value ?? null;
        const cardChanged = previousCardValue !== nextCardValue;
        const chipDelta = gameState.chipsOnCurrentCard - previousState.chipsOnCurrentCard;
        const actingPlayer = previousState.players[previousState.currentPlayerIndex];

        if (!cardChanged && chipDelta === 1) {
          feedbackEngine.play('pass', soundEnabled);
          if (actingPlayer && previousCardValue != null) {
            setActionLog(log => [
              ...log,
              {
                playerId: actingPlayer.id,
                playerName: actingPlayer.name,
                isBot: actingPlayer.isBot,
                action: 'pass',
                cardValue: previousCardValue,
                chipsOnCard: previousState.chipsOnCurrentCard,
                rawCost: previousCardValue - previousState.chipsOnCurrentCard,
              },
            ]);
          }
        } else if (cardChanged) {
          feedbackEngine.play('take', soundEnabled);
          if (actingPlayer && previousCardValue != null) {
            setActionLog(log => [
              ...log,
              {
                playerId: actingPlayer.id,
                playerName: actingPlayer.name,
                isBot: actingPlayer.isBot,
                action: 'take',
                cardValue: previousCardValue,
                chipsOnCard: previousState.chipsOnCurrentCard,
                rawCost: previousCardValue - previousState.chipsOnCurrentCard,
              },
            ]);
          }
        }
      }
    }

    previousStateRef.current = gameState;
  }, [gameState, hapticsEnabled, soundEnabled]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const startLocalSession = useCallback((playerName: string, roomCode: string, bots: BotArchetypeId[], options?: { autoStart?: boolean; preset?: SessionPreset; seed?: string }) => {
    disconnectMultiplayer('Offline mode');
    syncRoomInviteInLocation(null);

    sessionRandomRef.current = options?.seed ? createSeededRandom(options.seed) : null;
    setSessionPreset(options?.preset ?? 'standard');

    const random = sessionRandomRef.current ?? undefined;
    const initial = createInitialGameState([playerName], bots, { random });
    const nextState = options?.autoStart ? startGame(initial, { random }) : initial;

    setGameState(nextState);
    setRoomInfo({ name: playerName, room: roomCode, bots, mode: 'local' });
    setLocalPlayerId('p_1');
    setOnlineRole('player');
    setSpectators([]);
    setActionLog([]);
    setMistakeHint('');
    setOnlineError('');
    setIsBotThinking(false);
    setShellScreen('play');
    recordedGameIdRef.current = null;
  }, [disconnectMultiplayer]);

  const handleStartLocalGame = useCallback((playerName: string, roomCode: string, bots: BotArchetypeId[]) => {
    startLocalSession(playerName, roomCode, bots, { preset: 'standard' });
  }, [startLocalSession]);

  const handleQuickSolo = useCallback(() => {
    startLocalSession(getPreferredPlayerName(), createLocalRoomCode('QK'), QUICK_MATCH_BOTS, {
      autoStart: true,
      preset: 'quick',
    });
  }, [startLocalSession]);

  const handleStartDailyChallenge = useCallback(() => {
    startLocalSession(getPreferredPlayerName(), createDailyRoomCode(dailySeed), dailyLineup, {
      autoStart: true,
      preset: 'daily',
      seed: `daily:${dailySeed}`,
    });
  }, [dailyLineup, dailySeed, startLocalSession]);

  const handleJoinOnlineGame = useCallback((playerName: string, roomCode: string, rolePreference: OnlineRole, botIds: BotArchetypeId[]) => {
    disconnectMultiplayer();
    syncRoomInviteInLocation({ mode: 'online', roomCode, rolePreference });
    sessionRandomRef.current = null;
    setSessionPreset('standard');
    setShellScreen('play');
    setOnlineError('');
    setIsOnlineConnecting(true);
    setOnlineStatus('Connecting to room server...');
    setIsBotThinking(false);
    setOnlineRole(rolePreference);
    setSpectators([]);
    setGameState(null);
    setActionLog([]);
    setMistakeHint('');
    setRoomInfo({ name: playerName, room: roomCode, bots: botIds, mode: 'online' });
    recordedGameIdRef.current = null;

    const client = new MultiplayerClient();
    multiplayerClientRef.current = client;

    client.connect({
      playerName,
      roomCode,
      authToken: guestAuthTokenRef.current,
      rolePreference,
      botIds,
      onOpen: () => {
        setOnlineStatus('Connected. Joining room...');
      },
      onMessage: handleMultiplayerMessage,
      onClose: () => {
        setIsOnlineConnecting(false);
        setOnlineStatus('Disconnected from room server.');
      },
      onError: () => {
        setIsOnlineConnecting(false);
        setOnlineStatus('Unable to reach room server.');
        setOnlineError('Connection failed. Make sure multiplayer server is running and reachable.');
      },
    });
  }, [disconnectMultiplayer, handleMultiplayerMessage]);

  const handleStartGame = useCallback(() => {
    if (roomInfo?.mode === 'online') {
      multiplayerClientRef.current?.startGame();
      return;
    }

    feedbackEngine.vibrate('game-start', hapticsEnabled && hapticsSupported);

    setGameState(prev => {
      if (!prev) return prev;
      return startGame(prev, { random: sessionRandomRef.current ?? undefined });
    });
  }, [hapticsEnabled, hapticsSupported, roomInfo?.mode]);

  // Handle Player/Bot Actions
  const handleAction = useCallback((action: BotAction) => {
    if (roomInfo?.mode === 'online') {
      if (onlineRole === 'spectator') {
        setOnlineError('You are spectating this match. Join as player before start to play.');
        return;
      }
      multiplayerClientRef.current?.sendAction(action);
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;
      return processAction(prev, prev.players[prev.currentPlayerIndex].id, action);
    });
  }, [onlineRole, roomInfo?.mode]);

  const handleLocalAction = useCallback((action: BotAction) => {
    if (gameState) {
      const hint = buildLocalMistakeHint(gameState, localPlayerId, action);
      if (hint && !seenHintIds.includes(hint.id)) {
        setSeenHintIds(ids => [...ids, hint.id]);
        showMistakeHint(hint.message);
      }
    }

    feedbackEngine.vibrate(action === 'pass' ? 'pass' : 'take', hapticsEnabled && hapticsSupported);
    handleAction(action);
  }, [gameState, handleAction, hapticsEnabled, hapticsSupported, localPlayerId, seenHintIds, showMistakeHint]);

  const handleToggleHaptics = useCallback(() => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);

    if (!next) {
      showHapticsStatus('Haptics disabled.');
      return;
    }

    const didBuzz = feedbackEngine.testHaptics(hapticsSupported);
    showHapticsStatus(didBuzz ? 'Buzz sent to device.' : 'Buzz blocked by browser/device policy.');
  }, [hapticsEnabled, hapticsSupported, showHapticsStatus]);

  const handleOpenTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const handleCompleteTutorial = useCallback(() => {
    setShowTutorial(false);
    if (!canUseWindow) return;
    window.localStorage.setItem('nt_tutorial_seen', '1');
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!gameState || gameState.status !== 'finished') return;
    if (recordedGameIdRef.current === gameState.id) return;

    const scoredPlayers = gameState.players
      .map(player => ({ playerId: player.id, score: calculateScore(player) }))
      .sort((a, b) => a.score - b.score);

    const localResult = scoredPlayers.find(result => result.playerId === localPlayerId);
    if (!localResult) return;

    const didWin = scoredPlayers[0]?.playerId === localPlayerId;
    const todaySeed = createTodaySeed();

    queueMicrotask(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileStats(previous => {
        const daily = previous.daily.seed === todaySeed
          ? previous.daily
          : { seed: todaySeed, attempts: 0, bestScore: null as number | null };

        return {
          gamesPlayed: previous.gamesPlayed + 1,
          wins: previous.wins + (didWin ? 1 : 0),
          streak: didWin ? previous.streak + 1 : 0,
          bestScore: previous.bestScore == null ? localResult.score : Math.min(previous.bestScore, localResult.score),
          daily: sessionPreset === 'daily'
            ? {
                seed: todaySeed,
                attempts: daily.attempts + 1,
                bestScore: daily.bestScore == null ? localResult.score : Math.min(daily.bestScore, localResult.score),
              }
            : daily,
        };
      });
    });

    recordedGameIdRef.current = gameState.id;
  }, [gameState, localPlayerId, sessionPreset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Bot Turn Loop
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (roomInfo?.mode === 'online') return;

    if (!gameState || gameState.status !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Is it a bot's turn?
    if (currentPlayer.isBot) {
      queueMicrotask(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsBotThinking(true);
      });

      const random = sessionRandomRef.current ?? Math.random;
      const thinkingTime = 500 + random() * 1000;
      
      const timeout = setTimeout(() => {
        const action = evaluateBotDecision(gameState, currentPlayer, random);
        setIsBotThinking(false);
        handleAction(action);
      }, thinkingTime);

      return () => {
        setIsBotThinking(false);
        clearTimeout(timeout);
      };
    }

    queueMicrotask(() => {
      setIsBotThinking(false);
    });
  }, [gameState, handleAction, roomInfo?.mode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleReturnToLobby = useCallback(() => {
    if (roomInfo?.mode === 'online') {
      disconnectMultiplayer('Disconnected');
    } else {
      syncRoomInviteInLocation(null);
    }

    setGameState(null);
    setMistakeHint('');
    setShellScreen('play');
  }, [disconnectMultiplayer, roomInfo?.mode]);

  const handleBackToHome = useCallback(() => {
    disconnectMultiplayer('Idle');
    syncRoomInviteInLocation(null);
    sessionRandomRef.current = null;
    setSessionPreset('standard');
    setGameState(null);
    setRoomInfo(null);
    setMistakeHint('');
    setOnlineError('');
    setIsBotThinking(false);
    setShellScreen('home');
  }, [disconnectMultiplayer]);

  if (!gameState) {
    return (
      <>
        {shellScreen === 'home' ? (
          <HomeHub
            dailySeed={dailySeed}
            dailyLineupLabels={dailyLineupLabels}
            endpointLabel={getMultiplayerEndpointLabel()}
            installReady={installReady}
            soundEnabled={soundEnabled}
            hapticsEnabled={hapticsEnabled}
            hapticsSupported={hapticsSupported}
            profileStats={profileStats}
            onOpenLobby={() => setShellScreen('play')}
            onQuickSolo={handleQuickSolo}
            onStartDaily={handleStartDailyChallenge}
            onOpenTutorial={handleOpenTutorial}
            onToggleSound={() => setSoundEnabled(prev => !prev)}
            onToggleHaptics={handleToggleHaptics}
          />
        ) : (
          <Lobby
            onStartLocalGame={handleStartLocalGame}
            onJoinOnlineGame={handleJoinOnlineGame}
            onBackToHome={handleBackToHome}
            onlineStatus={onlineStatus}
            onlineError={onlineError}
            isOnlineConnecting={isOnlineConnecting}
          />
        )}

        {showTutorial && (
          <TutorialOverlay
            isOpen={showTutorial}
            onClose={handleCloseTutorial}
            onComplete={handleCompleteTutorial}
          />
        )}
      </>
    );
  }

  const endGameInsights = buildInsights(actionLog, localPlayerId);
  const finalResults = gameState.players
    .map(player => ({ player, score: calculateScore(player) }))
    .sort((a, b) => a.score - b.score);
  const winner = finalResults[0]?.player;
  const localPlacement = finalResults.findIndex(result => result.player.id === localPlayerId);
  const localPlacementLabel = localPlacement >= 0 ? formatOrdinal(localPlacement + 1) : null;
  const roomInviteUrl = roomInfo?.mode === 'online' && roomInfo.room ? buildRoomInvite(roomInfo.room) : undefined;
  const multiplayerEndpointLabel = roomInfo?.mode === 'online' ? getMultiplayerEndpointLabel() : undefined;

  return (
    <div className="min-h-screen bg-slate-900">
      <GameBoard 
        gameState={gameState} 
        localPlayerId={localPlayerId} 
        onAction={handleLocalAction} 
        onStartGame={handleStartGame}
        hideChips={hideChips}
        onToggleHideChips={() => setHideChips(prev => !prev)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        hapticsEnabled={hapticsEnabled}
        onToggleHaptics={handleToggleHaptics}
        onOpenTutorial={handleOpenTutorial}
        mistakeHint={mistakeHint}
        hapticsSupported={hapticsSupported}
        hapticsStatus={hapticsStatus}
        isBotThinking={isBotThinking}
        turnPulseKey={turnPulseKey}
        prefersReducedMotion={prefersReducedMotion}
        roomCode={roomInfo?.room}
        isOnlineRoom={roomInfo?.mode === 'online'}
        isOnlineHost={isOnlineHost}
        onlineStatus={onlineStatus}
        isSpectator={roomInfo?.mode === 'online' && onlineRole === 'spectator'}
        spectators={spectators}
        roomInviteUrl={roomInviteUrl}
        multiplayerEndpointLabel={multiplayerEndpointLabel}
      />

      {showTutorial && (
        <TutorialOverlay
          isOpen={showTutorial}
          onClose={handleCloseTutorial}
          onComplete={handleCompleteTutorial}
        />
      )}
      
      {/* Game Over Screen Overlay */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 z-50 bg-[#050c15]/78 p-3 md:p-6 backdrop-blur-sm">
          <div className="native-panel mx-auto flex h-full max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-300/28 md:max-h-[calc(100dvh-3rem)]">
            <div className="native-panel-strong border-b border-amber-200/25 px-5 py-5 md:px-7 md:py-6">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/85">{sessionPreset === 'daily' ? 'Daily Run Complete' : 'Match Complete'}</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-white md:text-5xl">Game Over</h2>
              <div className="mt-4 grid gap-2 text-sm text-slate-200/90 md:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-black/16 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/80">Winner</div>
                  <div className="mt-1 text-base font-black text-white">{winner ? winner.name : 'Unknown'}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/16 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/80">Your Finish</div>
                  <div className="mt-1 text-base font-black text-white">{localPlacementLabel ?? 'Spectating'}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/16 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/80">Players</div>
                  <div className="mt-1 text-base font-black text-white">{finalResults.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/16 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/80">Mode</div>
                  <div className="mt-1 text-base font-black text-white">{sessionPreset === 'daily' ? `Daily ${dailySeed}` : sessionPreset === 'quick' ? 'Quick Solo' : roomInfo?.mode === 'online' ? 'Online Room' : 'Local Match'}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
              <section className="native-panel-soft rounded-2xl border border-slate-400/24 p-3 md:p-4">
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300/80">Final Standings (lowest score wins)</div>
                <div className="space-y-2">
                  {finalResults.map((result, index) => (
                    <div
                      key={result.player.id}
                      className={`grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2.5 md:px-4 ${index === 0 ? 'border-amber-300/40 bg-amber-400/12' : 'border-slate-500/30 bg-black/12'}`}
                    >
                      <div className={`text-sm font-black uppercase tracking-[0.12em] ${index === 0 ? 'text-amber-100' : 'text-slate-300'}`}>
                        {formatOrdinal(index + 1)}
                      </div>
                      <div>
                        <div className="text-base font-black text-white">{result.player.name} {result.player.isBot ? '(AI)' : ''}</div>
                        <div className="text-[11px] text-slate-300/75">Cards: {result.player.cards.length} | Chips: {result.player.chips}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white leading-none">{result.score}</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300/70">Points</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {endGameInsights.map(insight => (
                  <div key={insight.label} className="native-panel-soft rounded-xl border border-slate-400/20 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300/75">{insight.label}</div>
                    <div className="mt-1 text-sm md:text-base font-extrabold text-white">{insight.value}</div>
                    <div className="mt-1 text-[11px] text-slate-300/75">{insight.detail}</div>
                  </div>
                ))}
              </section>

              <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="native-panel-soft rounded-xl border border-slate-400/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300/75">Career Stats</div>
                  <div className="mt-2 text-sm text-slate-200 font-semibold">Games: <span className="font-black text-white">{profileStats.gamesPlayed}</span></div>
                  <div className="text-sm text-slate-200 font-semibold">Wins: <span className="font-black text-white">{profileStats.wins}</span></div>
                  <div className="text-sm text-slate-200 font-semibold">Streak: <span className="font-black text-white">{profileStats.streak}</span></div>
                  <div className="text-sm text-slate-200 font-semibold">Best Score: <span className="font-black text-white">{profileStats.bestScore ?? 'N/A'}</span></div>
                </div>

                <div className="native-panel-soft rounded-xl border border-slate-400/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300/75">Daily Challenge</div>
                  <div className="mt-2 text-sm text-slate-200 font-semibold">Seed: <span className="font-black text-white">{profileStats.daily.seed}</span></div>
                  <div className="text-sm text-slate-200 font-semibold">Attempts Today: <span className="font-black text-white">{profileStats.daily.attempts}</span></div>
                  <div className="text-sm text-slate-200 font-semibold">Best Today: <span className="font-black text-white">{profileStats.daily.bestScore ?? 'N/A'}</span></div>
                  <div className="text-[11px] text-slate-300/75 mt-1">Beat your daily best with fewer risky takes.</div>
                </div>
              </section>
            </div>

            <div className="border-t border-slate-500/30 p-4 md:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  onClick={() => {
                    if (roomInfo?.mode === 'local') {
                      if (sessionPreset === 'daily') {
                        handleStartDailyChallenge();
                      } else if (sessionPreset === 'quick') {
                        handleQuickSolo();
                      } else {
                        handleStartLocalGame(roomInfo.name, roomInfo.room, roomInfo.bots);
                      }
                    } else {
                      handleReturnToLobby();
                    }
                  }}
                  className="native-button-primary w-full py-3.5 text-base md:text-lg font-black uppercase tracking-[0.14em]"
                >
                  {roomInfo?.mode === 'local'
                    ? sessionPreset === 'daily'
                      ? 'Replay Daily Run'
                      : sessionPreset === 'quick'
                        ? 'Play Quick Solo Again'
                        : 'Play Again'
                    : 'Return To Lobby'}
                </button>

                <button
                  onClick={handleReturnToLobby}
                  className="native-button-secondary w-full py-3.5 text-base md:text-lg font-black uppercase tracking-[0.14em]"
                >
                  Exit Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
