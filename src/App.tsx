import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { TutorialOverlay } from './components/TutorialOverlay';
import type { GameState, BotAction, BotArchetypeId } from './game/models';
import { createInitialGameState, startGame, processAction, calculateScore } from './game/engine';
import { evaluateBotDecision } from './game/ai';
import { feedbackEngine } from './utils/feedback';

const canUseWindow = typeof window !== 'undefined';
const PROFILE_STATS_KEY = 'nt_profile_stats';
const SEEN_HINTS_KEY = 'nt_seen_mistake_hints';

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

function createTodaySeed(): string {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
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
  const [localPlayerId] = useState<string>('p_1'); // Default to Player 1
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
  const [roomInfo, setRoomInfo] = useState<{name: string, room: string, bots: BotArchetypeId[]} | null>(null);
  const previousStateRef = useRef<GameState | null>(null);
  const hapticsStatusTimeoutRef = useRef<number | null>(null);
  const mistakeHintTimeoutRef = useRef<number | null>(null);
  const recordedGameIdRef = useRef<string | null>(null);

  // Manage Document Title
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
        setTurnPulseKey(value => value + 1);
      }

      if (gameState.status === 'finished' && previousState.status !== 'finished') {
        feedbackEngine.play('game-over', soundEnabled);
        feedbackEngine.vibrate('game-over', hapticsEnabled);
      }

      if (gameState.status === 'playing' && previousTurnPlayerId !== nextTurnPlayerId) {
        feedbackEngine.play('turn-change', soundEnabled);
        feedbackEngine.vibrate('turn-change', hapticsEnabled);
        setTurnPulseKey(value => value + 1);
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

  // Initialize Game when Lobby submits
  const handleJoinGame = (playerName: string, roomCode: string, bots: BotArchetypeId[]) => {
    // Create the room in a "waiting" state
    const initial = createInitialGameState([playerName], bots);
    setGameState(initial);
    setRoomInfo({ name: playerName, room: roomCode, bots });
    setActionLog([]);
    setMistakeHint('');
    recordedGameIdRef.current = null;
  };

  const handleStartGame = useCallback(() => {
    feedbackEngine.vibrate('game-start', hapticsEnabled && hapticsSupported);

    setGameState(prev => {
      if (!prev) return prev;
      return startGame(prev);
    });
  }, [hapticsEnabled, hapticsSupported]);

  // Handle Player/Bot Actions
  const handleAction = useCallback((action: BotAction) => {
    setGameState(prev => {
      if (!prev) return prev;
      return processAction(prev, prev.players[prev.currentPlayerIndex].id, action);
    });
  }, []);

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

    setProfileStats(previous => {
      const daily = previous.daily.seed === todaySeed
        ? previous.daily
        : { seed: todaySeed, attempts: 0, bestScore: null as number | null };

      return {
        gamesPlayed: previous.gamesPlayed + 1,
        wins: previous.wins + (didWin ? 1 : 0),
        streak: didWin ? previous.streak + 1 : 0,
        bestScore: previous.bestScore == null ? localResult.score : Math.min(previous.bestScore, localResult.score),
        daily: {
          seed: todaySeed,
          attempts: daily.attempts + 1,
          bestScore: daily.bestScore == null ? localResult.score : Math.min(daily.bestScore, localResult.score),
        },
      };
    });

    recordedGameIdRef.current = gameState.id;
  }, [gameState, localPlayerId]);

  // Bot Turn Loop
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Is it a bot's turn?
    if (currentPlayer.isBot) {
      setIsBotThinking(true);

      // Simulate thinking time (500ms - 1500ms)
      const thinkingTime = 500 + Math.random() * 1000;
      
      const timeout = setTimeout(() => {
        const action = evaluateBotDecision(gameState, currentPlayer);
        setIsBotThinking(false);
        handleAction(action);
      }, thinkingTime);

      return () => {
        setIsBotThinking(false);
        clearTimeout(timeout);
      };
    }

    setIsBotThinking(false);
  }, [gameState, handleAction]);

  if (!gameState) {
    return <Lobby onJoinGame={handleJoinGame} />;
  }

  const endGameInsights = buildInsights(actionLog, localPlayerId);

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
      />

      <TutorialOverlay
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
        onComplete={handleCompleteTutorial}
      />
      
      {/* Game Over Screen Overlay */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-3xl font-bold text-center mb-6 text-slate-800">Game Over!</h2>
            
            <div className="space-y-4 mb-8">
              {gameState.players
                .map(p => ({ player: p, score: calculateScore(p) }))
                .sort((a, b) => a.score - b.score) // Lowest score wins
                .map((result, index) => (
                  <div key={result.player.id} className={`
                    flex justify-between items-center p-4 rounded-xl border-2
                    ${index === 0 ? 'border-[#8E0000] bg-red-50/50' : 'border-slate-200'}
                  `}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{index === 0 ? '🏆' : `${index + 1}.`}</span>
                      <span className="font-bold text-lg text-slate-800">{result.player.name} {result.player.isBot && '🤖'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-800">{result.score} pts</div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chips: {result.player.chips}</div>
                    </div>
                  </div>
                ))
              }
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {endGameInsights.map(insight => (
                <div key={insight.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{insight.label}</div>
                  <div className="text-sm md:text-base font-extrabold text-slate-800 mt-1">{insight.value}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{insight.detail}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Career Stats</div>
                <div className="mt-2 text-sm text-slate-700 font-semibold">Games: <span className="font-black text-slate-900">{profileStats.gamesPlayed}</span></div>
                <div className="text-sm text-slate-700 font-semibold">Wins: <span className="font-black text-slate-900">{profileStats.wins}</span></div>
                <div className="text-sm text-slate-700 font-semibold">Streak: <span className="font-black text-slate-900">{profileStats.streak}</span></div>
                <div className="text-sm text-slate-700 font-semibold">Best Score: <span className="font-black text-slate-900">{profileStats.bestScore ?? 'N/A'}</span></div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Daily Challenge</div>
                <div className="mt-2 text-sm text-slate-700 font-semibold">Seed: <span className="font-black text-slate-900">{profileStats.daily.seed}</span></div>
                <div className="text-sm text-slate-700 font-semibold">Attempts Today: <span className="font-black text-slate-900">{profileStats.daily.attempts}</span></div>
                <div className="text-sm text-slate-700 font-semibold">Best Today: <span className="font-black text-slate-900">{profileStats.daily.bestScore ?? 'N/A'}</span></div>
                <div className="text-[11px] text-slate-500 mt-1">Beat your daily best with fewer risky takes.</div>
              </div>
            </div>

            <button 
              onClick={() => {
                if (roomInfo) {
                   handleJoinGame(roomInfo.name, roomInfo.room, roomInfo.bots);
                }
              }}
              className="w-full bg-[#400000] hover:bg-[#680000] text-white font-black tracking-wide py-4 rounded-xl text-xl transition-colors mb-3 shadow-lg"
            >
              PLAY AGAIN
            </button>
            
            <button 
              onClick={() => setGameState(null)}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl text-lg transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
