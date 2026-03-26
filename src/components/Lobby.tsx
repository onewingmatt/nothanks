import React, { useEffect, useMemo, useState } from 'react';
import { BOT_ARCHETYPES } from '../game/models';
import type { BotArchetypeId } from '../game/models';
import type { OnlineRole } from '../network/multiplayerClient';

type LobbyMode = 'online' | 'local';

interface LobbyProps {
  onStartLocalGame: (playerName: string, roomCode: string, bots: BotArchetypeId[]) => void;
  onJoinOnlineGame: (playerName: string, roomCode: string, rolePreference: OnlineRole, botIds: BotArchetypeId[]) => void;
  onlineStatus?: string;
  onlineError?: string;
  isOnlineConnecting?: boolean;
}

const canUseWindow = typeof window !== 'undefined';
const PLAYER_NAME_KEY = 'nt_lobby_player_name';
const ROOM_CODE_KEY = 'nt_lobby_room_code';
const SELECTED_BOTS_KEY = 'nt_lobby_selected_bots';
const ONLINE_SELECTED_BOTS_KEY = 'nt_lobby_online_selected_bots';
const LOBBY_MODE_KEY = 'nt_lobby_mode';

function sanitizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

function createRoomCode(): string {
  return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(2, 8);
}

function loadStoredBots(storageKey: string): BotArchetypeId[] {
  if (!canUseWindow) return ['average', 'calculator', 'empath'];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return ['average', 'calculator', 'empath'];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ['average', 'calculator', 'empath'];

    const validBotIds = new Set(BOT_ARCHETYPES.map(bot => bot.id));
    return parsed
      .filter((id): id is BotArchetypeId => typeof id === 'string' && validBotIds.has(id))
      .slice(0, 5);
  } catch {
    return ['average', 'calculator', 'empath'];
  }
}

function loadMode(): LobbyMode {
  if (!canUseWindow) return 'online';
  const stored = window.localStorage.getItem(LOBBY_MODE_KEY);
  return stored === 'local' ? 'local' : 'online';
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartLocalGame,
  onJoinOnlineGame,
  onlineStatus,
  onlineError,
  isOnlineConnecting = false,
}) => {
  const [mode, setMode] = useState<LobbyMode>(() => loadMode());
  const [playerName, setPlayerName] = useState<string>(() => {
    if (!canUseWindow) return 'Player One';
    return window.localStorage.getItem(PLAYER_NAME_KEY) || 'Player One';
  });
  const [roomCode, setRoomCode] = useState<string>(() => {
    if (!canUseWindow) return createRoomCode();
    return sanitizeRoomCode(window.localStorage.getItem(ROOM_CODE_KEY) || createRoomCode());
  });
  const [selectedBots, setSelectedBots] = useState<BotArchetypeId[]>(() => loadStoredBots(SELECTED_BOTS_KEY));
  const [selectedOnlineBots, setSelectedOnlineBots] = useState<BotArchetypeId[]>(() => loadStoredBots(ONLINE_SELECTED_BOTS_KEY));
  const [copied, setCopied] = useState<boolean>(false);
  const [joinAsSpectator, setJoinAsSpectator] = useState<boolean>(false);

  const playerCountLabel = useMemo(() => `${selectedBots.length + 1} total players`, [selectedBots.length]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem(PLAYER_NAME_KEY, playerName);
  }, [playerName]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem(ROOM_CODE_KEY, roomCode);
  }, [roomCode]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem(SELECTED_BOTS_KEY, JSON.stringify(selectedBots));
  }, [selectedBots]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem(ONLINE_SELECTED_BOTS_KEY, JSON.stringify(selectedOnlineBots));
  }, [selectedOnlineBots]);

  useEffect(() => {
    if (!canUseWindow) return;
    window.localStorage.setItem(LOBBY_MODE_KEY, mode);
  }, [mode]);

  const handleAddBot = (botId: BotArchetypeId) => {
    if (selectedBots.length >= 5) return;
    setSelectedBots(prev => [...prev, botId]);
  };

  const handleRemoveBot = (index: number) => {
    setSelectedBots(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddOnlineBot = (botId: BotArchetypeId) => {
    if (selectedOnlineBots.length >= 5) return;
    setSelectedOnlineBots(prev => [...prev, botId]);
  };

  const handleRemoveOnlineBot = (index: number) => {
    setSelectedOnlineBots(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateCode = () => {
    const next = createRoomCode();
    setRoomCode(next);
    setCopied(false);
  };

  const handleCopyCode = async () => {
    if (!canUseWindow || !roomCode.trim()) return;
    try {
      await window.navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const handleJoinOnline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim()) return;
    onJoinOnlineGame(
      playerName.trim(),
      roomCode.trim().toUpperCase(),
      joinAsSpectator ? 'spectator' : 'player',
      joinAsSpectator ? [] : selectedOnlineBots,
    );
  };

  const handleCreateOnline = () => {
    if (!playerName.trim()) return;
    const nextCode = roomCode.trim() || createRoomCode();
    setRoomCode(nextCode);
    onJoinOnlineGame(playerName.trim(), nextCode.toUpperCase(), 'player', selectedOnlineBots);
  };

  const handleStartLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    const localCode = roomCode.trim() || createRoomCode();
    setRoomCode(localCode);
    onStartLocalGame(playerName.trim(), localCode.toUpperCase(), selectedBots);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-700">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-6 tracking-tight">
          NO <span className="text-[#ffb4a8]">THANKS!</span>
        </h1>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1 border border-slate-700">
          <button
            type="button"
            onClick={() => setMode('online')}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${mode === 'online' ? 'bg-[#400000] text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            Online Multiplayer
          </button>
          <button
            type="button"
            onClick={() => setMode('local')}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${mode === 'local' ? 'bg-[#400000] text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            Local vs AI
          </button>
        </div>

        <form onSubmit={mode === 'online' ? handleJoinOnline : handleStartLocal} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={24}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ffb4a8] focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="roomCode" className="block text-sm font-medium text-slate-300 mb-2">
                Room Code
              </label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={e => {
                  setRoomCode(sanitizeRoomCode(e.target.value));
                  setCopied(false);
                }}
                maxLength={8}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white uppercase focus:outline-none focus:ring-2 focus:ring-[#ffb4a8] focus:border-transparent transition-all tracking-wider"
                required={mode === 'online'}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  New Code
                </button>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
              </div>
            </div>
          </div>

          {mode === 'online' ? (
            <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
              <div className="font-bold mb-1">Cross-platform online lobby enabled</div>
              <div className="text-cyan-100/90">
                Any web, Android, or iOS client can join if it connects to the same WebSocket room server.
              </div>
              {!joinAsSpectator && (
                <div className="mt-3 rounded-lg border border-cyan-300/30 bg-cyan-950/30 p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">Bots For This Online Room</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedOnlineBots.length === 0 && (
                      <span className="text-[11px] text-cyan-200/90">No bots selected.</span>
                    )}
                    {selectedOnlineBots.map((botId, index) => {
                      const bot = BOT_ARCHETYPES.find(value => value.id === botId);
                      if (!bot) return null;

                      return (
                        <button
                          key={`${botId}-online-${index}`}
                          type="button"
                          onClick={() => handleRemoveOnlineBot(index)}
                          className="rounded-full border border-cyan-200/40 bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-100 hover:bg-cyan-900/60"
                          title="Remove bot"
                        >
                          {bot.name} x
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    {BOT_ARCHETYPES.map(bot => (
                      <button
                        key={`online-${bot.id}`}
                        type="button"
                        disabled={selectedOnlineBots.length >= 5}
                        onClick={() => handleAddOnlineBot(bot.id as BotArchetypeId)}
                        className="rounded-md border border-cyan-200/35 bg-cyan-950/50 px-2 py-1 text-[10px] font-bold text-cyan-100 hover:bg-cyan-900/50 disabled:opacity-40"
                      >
                        {bot.name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] text-cyan-200/90">Applied when creating an online room.</div>
                </div>
              )}
              <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-cyan-100">
                <input
                  type="checkbox"
                  checked={joinAsSpectator}
                  onChange={e => setJoinAsSpectator(e.target.checked)}
                  className="h-4 w-4 rounded border-cyan-300 bg-cyan-900/40"
                />
                Join as spectator (late joins become spectators automatically while a game is active)
              </label>
              {onlineStatus && <div className="mt-2 text-xs text-cyan-200">Status: {onlineStatus}</div>}
              {onlineError && <div className="mt-2 text-xs text-red-300">Error: {onlineError}</div>}
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-400 -mt-3">
                {playerCountLabel}. You + selected AI bots.
              </div>

              <div className="border-t border-slate-700 pt-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="w-full lg:w-1/3 flex flex-col border-r-0 lg:border-r border-slate-700 lg:pr-6">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-bold text-slate-200">
                        Selected AI ({selectedBots.length}/5)
                      </label>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                      {selectedBots.length === 0 && (
                        <div className="text-center text-slate-500 text-sm py-4 italic border border-dashed border-slate-700 rounded-lg">
                          No bots selected. You will play solo.
                        </div>
                      )}
                      {selectedBots.map((botId, index) => {
                        const bot = BOT_ARCHETYPES.find(b => b.id === botId);
                        if (!bot) return null;

                        return (
                          <div key={`${botId}-${index}`} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-white">{bot.name}</span>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">S:{bot.skill} | A:{bot.awareness} | R:{bot.riskyness}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBot(index)}
                              className="text-slate-400 hover:text-[#ffb4a8] text-xs font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                            >
                              X
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full lg:w-2/3">
                    <label className="block text-sm font-bold text-slate-200 mb-3">
                      Bot Archetypes (Skill, Awareness, Risk)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {BOT_ARCHETYPES.map(bot => (
                        <button
                          key={bot.id}
                          type="button"
                          disabled={selectedBots.length >= 5}
                          onClick={() => handleAddBot(bot.id as BotArchetypeId)}
                          className="flex flex-col items-start bg-slate-900 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-left group h-full"
                        >
                          <div className="flex justify-between w-full items-start mb-1">
                            <span className="text-[13px] font-bold text-white group-hover:text-[#ffb4a8] transition-colors leading-tight">
                              {bot.name}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-wrap mb-1.5 mt-auto">
                            <span className="text-[9px] font-bold px-1.5 rounded-full bg-blue-900/50 text-blue-200 border border-blue-800">S:{bot.skill}</span>
                            <span className="text-[9px] font-bold px-1.5 rounded-full bg-emerald-900/50 text-emerald-200 border border-emerald-800">A:{bot.awareness}</span>
                            <span className="text-[9px] font-bold px-1.5 rounded-full bg-red-900/50 text-red-200 border border-red-800">R:{bot.riskyness}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 leading-snug">
                            {bot.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'online' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
              <button
                type="submit"
                disabled={isOnlineConnecting}
                className="w-full bg-[#400000] hover:bg-[#680000] disabled:opacity-60 text-white font-black tracking-wide py-4 rounded-xl text-lg transition-colors shadow-[0_4px_12px_rgba(64,0,0,0.5)] border border-[#680000]"
              >
                {isOnlineConnecting ? 'CONNECTING...' : 'JOIN ROOM'}
              </button>
              <button
                type="button"
                disabled={isOnlineConnecting}
                onClick={handleCreateOnline}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white font-bold tracking-wide py-4 rounded-xl text-lg transition-colors border border-slate-600"
              >
                CREATE + JOIN
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full bg-[#400000] hover:bg-[#680000] text-white font-black tracking-wide py-4 rounded-xl text-lg transition-colors shadow-[0_4px_12px_rgba(64,0,0,0.5)] mt-6 border border-[#680000]"
            >
              START LOCAL GAME
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
