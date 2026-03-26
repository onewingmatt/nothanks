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
  if (!canUseWindow) return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validBotIds = new Set(BOT_ARCHETYPES.map(bot => bot.id));
    return parsed
      .filter((id): id is BotArchetypeId => typeof id === 'string' && validBotIds.has(id))
      .slice(0, 5);
  } catch {
    return [];
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
  const [selectedOnlineBots, setSelectedOnlineBots] = useState<BotArchetypeId[]>([]);
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

  const surfaceTitle = mode === 'online' ? 'Bring friends to the table' : 'Set up a premium solo session';

  const surfaceCopy = mode === 'online'
    ? 'Create or join a shared room with reconnect-ready seats, spectator support, and optional AI fillers.'
    : 'Choose your bot lineup and start a focused local match with the same tactile presentation as online play.';

  return (
    <div className="native-shell min-h-screen overflow-hidden px-4 py-5 text-white md:px-6 md:py-6">
      <div className="native-orb left-[-4rem] top-[6rem] h-40 w-40 bg-orange-300/25 md:h-64 md:w-64" />
      <div className="native-orb right-[-3rem] top-[2rem] h-36 w-36 bg-cyan-300/25 md:h-56 md:w-56" />
      <div className="native-orb bottom-[-5rem] left-[28%] h-44 w-44 bg-rose-400/20 md:h-72 md:w-72" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="native-panel-strong native-grid rounded-[28px] p-6 md:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/90">
              <span className="native-chip-dot" />
              Premium tabletop mobile feel
            </div>

            <h1 className="max-w-xl text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
              NO <span className="text-[#ffb487]">THANKS!</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200/88 md:text-base">
              Fast, tactile score-chasing with bold card design, reconnect-ready online rooms, and AI personalities that feel closer to a premium Android board game than a browser prototype.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <div className="native-chip"><span className="native-chip-dot" />2-6 seats</div>
              <div className="native-chip"><span className="native-chip-dot" />Reconnect enabled</div>
              <div className="native-chip"><span className="native-chip-dot" />Spectator support</div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="native-panel native-mini-stat rounded-[24px] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/85">Quick Match</div>
              <div className="mt-2 text-lg font-black text-white">Fast setup</div>
              <p className="mt-2 text-sm leading-5 text-slate-300/85">Create a room, share a short code, and fill empty seats with bots only when you want them.</p>
            </div>
            <div className="native-panel native-mini-stat rounded-[24px] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/85">Cross-platform</div>
              <div className="mt-2 text-lg font-black text-white">One shared table</div>
              <p className="mt-2 text-sm leading-5 text-slate-300/85">Web, Android, and iOS clients can join the same room code flow with the same live game state.</p>
            </div>
            <div className="native-panel native-mini-stat rounded-[24px] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-200/85">Confidence</div>
              <div className="mt-2 text-lg font-black text-white">Reconnect-safe</div>
              <p className="mt-2 text-sm leading-5 text-slate-300/85">Persistent guest identity reclaims your seat automatically instead of treating reconnect like a fresh session.</p>
            </div>
          </section>
        </div>

        <section className="native-panel rounded-[30px] p-4 shadow-2xl md:p-6 lg:p-8">
          <form onSubmit={mode === 'online' ? handleJoinOnline : handleStartLocal} className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
            <div className="space-y-5">
              <div>
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300/80">Play style</div>
                <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-black/20 p-1.5">
                  <button type="button" onClick={() => setMode('online')} className={`native-tab text-left ${mode === 'online' ? 'native-tab-active' : ''}`}>
                    <div className="text-sm font-black">Online Multiplayer</div>
                    <div className="mt-1 text-[11px] text-slate-300/75">Shared rooms, spectators, reconnect</div>
                  </button>
                  <button type="button" onClick={() => setMode('local')} className={`native-tab text-left ${mode === 'local' ? 'native-tab-active' : ''}`}>
                    <div className="text-sm font-black">Local vs AI</div>
                    <div className="mt-1 text-[11px] text-slate-300/75">Solo session with a custom roster</div>
                  </button>
                </div>
              </div>

              <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300/80">Session setup</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">{surfaceTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/86">{surfaceCopy}</p>

                <div className="mt-5 grid gap-4">
                  <div>
                    <label htmlFor="playerName" className="native-label">Display name</label>
                    <input type="text" id="playerName" value={playerName} onChange={e => setPlayerName(e.target.value)} maxLength={24} className="native-input" required />
                  </div>

                  <div>
                    <label htmlFor="roomCode" className="native-label">Room code</label>
                    <input
                      type="text"
                      id="roomCode"
                      value={roomCode}
                      onChange={e => {
                        setRoomCode(sanitizeRoomCode(e.target.value));
                        setCopied(false);
                      }}
                      maxLength={8}
                      className="native-input uppercase tracking-[0.35em]"
                      required={mode === 'online'}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={handleGenerateCode} className="native-button-ghost text-xs font-bold uppercase tracking-[0.14em]">New code</button>
                      <button type="button" onClick={handleCopyCode} className="native-button-ghost text-xs font-bold uppercase tracking-[0.14em]">{copied ? 'Copied' : 'Copy room code'}</button>
                    </div>
                  </div>
                </div>
              </div>

              {mode === 'online' ? (
                <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Online readiness</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300/88">Live room sync is available across supported clients. Hosts can add bots deliberately, while spectators can join active games without taking a seat.</div>

                  <label className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-300/18 bg-cyan-500/8 px-4 py-3 text-sm text-cyan-100/92">
                    <input type="checkbox" checked={joinAsSpectator} onChange={e => setJoinAsSpectator(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-cyan-200/50 bg-transparent" />
                    <span>
                      <span className="block font-bold">Join as spectator</span>
                      <span className="mt-1 block text-xs leading-5 text-cyan-100/78">Useful for watching an active room or reserving yourself for the next match.</span>
                    </span>
                  </label>

                  {onlineStatus && <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-500/8 px-4 py-3 text-sm font-semibold text-cyan-100">Status: {onlineStatus}</div>}
                  {onlineError && <div className="mt-3 rounded-2xl border border-rose-300/22 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">{onlineError}</div>}
                </div>
              ) : (
                <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Solo session summary</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300/88">{playerCountLabel}. Local mode keeps your preferred AI lineup and drops you straight into a polished table view.</div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {mode === 'online' ? (
                <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Optional room bots</div>
                      <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-white">Seat fillers you control</h3>
                    </div>
                    <div className="rounded-full border border-cyan-300/18 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">{selectedOnlineBots.length}/5</div>
                  </div>

                  <div className="mt-4 flex min-h-[52px] flex-wrap gap-2">
                    {selectedOnlineBots.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-cyan-200/22 bg-black/15 px-4 py-3 text-sm text-cyan-100/78">No bots added yet. Add them only if you want the host room pre-filled.</div>
                    ) : (
                      selectedOnlineBots.map((botId, index) => {
                        const bot = BOT_ARCHETYPES.find(value => value.id === botId);
                        if (!bot) return null;

                        return (
                          <button key={`${botId}-online-${index}`} type="button" onClick={() => handleRemoveOnlineBot(index)} className="native-online-bot-pill px-3 py-1.5 text-[11px] font-bold" title="Remove bot">
                            {bot.name} ×
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
                    {BOT_ARCHETYPES.map(bot => (
                      <button key={`online-${bot.id}`} type="button" disabled={selectedOnlineBots.length >= 5} onClick={() => handleAddOnlineBot(bot.id as BotArchetypeId)} className="native-bot-card p-3 text-left disabled:opacity-40 disabled:cursor-not-allowed">
                        <div className="text-sm font-black text-white">{bot.name}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-blue-400/22 bg-blue-500/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-blue-100">Skill {bot.skill}</span>
                          <span className="rounded-full border border-emerald-400/22 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-100">Aware {bot.awareness}</span>
                          <span className="rounded-full border border-rose-400/22 bg-rose-500/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-rose-100">Risk {bot.riskyness}</span>
                        </div>
                        <div className="mt-2 text-xs leading-5 text-slate-400">{bot.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
                  <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Selected AI</div>
                        <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-white">Your roster</h3>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">{selectedBots.length}/5</div>
                    </div>

                    <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {selectedBots.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/14 bg-black/15 px-4 py-5 text-center text-sm italic text-slate-400">No bots selected. Start a tight solo session if you want pure one-player play.</div>
                      )}
                      {selectedBots.map((botId, index) => {
                        const bot = BOT_ARCHETYPES.find(b => b.id === botId);
                        if (!bot) return null;

                        return (
                          <div key={`${botId}-${index}`} className="native-bot-card flex items-start justify-between gap-3 p-3">
                            <div>
                              <div className="text-sm font-black text-white">{bot.name}</div>
                              <div className="mt-1 text-[11px] text-slate-400">S:{bot.skill} · A:{bot.awareness} · R:{bot.riskyness}</div>
                            </div>
                            <button type="button" onClick={() => handleRemoveBot(index)} className="native-button-ghost px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em]">Remove</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Bot archetypes</div>
                    <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-white">Build your table</h3>
                    <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-2">
                      {BOT_ARCHETYPES.map(bot => (
                        <button key={bot.id} type="button" disabled={selectedBots.length >= 5} onClick={() => handleAddBot(bot.id as BotArchetypeId)} className="native-bot-card p-3 text-left disabled:opacity-40 disabled:cursor-not-allowed">
                          <div className="text-sm font-black text-white">{bot.name}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-blue-400/22 bg-blue-500/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-blue-100">Skill {bot.skill}</span>
                            <span className="rounded-full border border-emerald-400/22 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-100">Aware {bot.awareness}</span>
                            <span className="rounded-full border border-rose-400/22 bg-rose-500/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-rose-100">Risk {bot.riskyness}</span>
                          </div>
                          <div className="mt-2 text-xs leading-5 text-slate-400">{bot.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mode === 'online' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <button type="submit" disabled={isOnlineConnecting} className="native-button-primary w-full text-base font-black uppercase tracking-[0.16em]">{isOnlineConnecting ? 'Connecting...' : 'Join room'}</button>
                  <button type="button" disabled={isOnlineConnecting} onClick={handleCreateOnline} className="native-button-secondary w-full text-base font-black uppercase tracking-[0.16em]">Create + join</button>
                </div>
              ) : (
                <button type="submit" className="native-button-primary w-full text-base font-black uppercase tracking-[0.16em]">Start local game</button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
