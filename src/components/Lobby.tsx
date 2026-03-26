import React, { useEffect, useMemo, useState } from 'react';
import {
  buildRoomInvite,
  readRoomInviteFromLocation,
} from '../config/runtime';
import { BOT_ARCHETYPES } from '../game/models';
import type { BotArchetypeId } from '../game/models';
import type { OnlineRole } from '../network/multiplayerClient';

type LobbyMode = 'online' | 'local';

interface LobbyProps {
  onStartLocalGame: (playerName: string, roomCode: string, bots: BotArchetypeId[]) => void;
  onJoinOnlineGame: (playerName: string, roomCode: string, rolePreference: OnlineRole, botIds: BotArchetypeId[]) => void;
  onBackToHome?: () => void;
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
  const invite = readRoomInviteFromLocation();
  if (invite) return 'online';
  const stored = window.localStorage.getItem(LOBBY_MODE_KEY);
  return stored === 'local' ? 'local' : 'online';
}

function loadRoomCode(): string {
  if (!canUseWindow) return createRoomCode();

  const invite = readRoomInviteFromLocation();
  if (invite?.roomCode) return invite.roomCode;

  return sanitizeRoomCode(window.localStorage.getItem(ROOM_CODE_KEY) || createRoomCode());
}

function loadJoinAsSpectator(): boolean {
  if (!canUseWindow) return false;
  return readRoomInviteFromLocation()?.rolePreference === 'spectator';
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartLocalGame,
  onJoinOnlineGame,
  onBackToHome,
  onlineStatus,
  onlineError,
  isOnlineConnecting = false,
}) => {
  const [mode, setMode] = useState<LobbyMode>(() => loadMode());
  const [playerName, setPlayerName] = useState<string>(() => {
    if (!canUseWindow) return 'Player One';
    return window.localStorage.getItem(PLAYER_NAME_KEY) || 'Player One';
  });
  const [roomCode, setRoomCode] = useState<string>(() => loadRoomCode());
  const [selectedBots, setSelectedBots] = useState<BotArchetypeId[]>(() => loadStoredBots(SELECTED_BOTS_KEY));
  const [selectedOnlineBots, setSelectedOnlineBots] = useState<BotArchetypeId[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<'code' | 'invite' | null>(null);
  const [joinAsSpectator, setJoinAsSpectator] = useState<boolean>(() => loadJoinAsSpectator());

  const playerCountLabel = useMemo(() => `${selectedBots.length + 1} total players`, [selectedBots.length]);
  const launchInvite = useMemo(() => readRoomInviteFromLocation(), []);
  const roomInviteUrl = useMemo(
    () => roomCode.trim() ? buildRoomInvite(roomCode, joinAsSpectator ? 'spectator' : 'player') : '',
    [joinAsSpectator, roomCode],
  );

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
    setCopyFeedback(null);
  };

  const flashCopyFeedback = (value: 'code' | 'invite') => {
    setCopyFeedback(value);

    if (!canUseWindow) return;
    window.setTimeout(() => {
      setCopyFeedback(current => (current === value ? null : current));
    }, 1400);
  };

  const handleCopyCode = async () => {
    if (!canUseWindow || !roomCode.trim()) return;

    try {
      await window.navigator.clipboard.writeText(roomCode.trim().toUpperCase());
      flashCopyFeedback('code');
    } catch {
      setCopyFeedback(null);
    }
  };

  const handleShareInvite = async () => {
    if (!canUseWindow || !roomInviteUrl) return;

    try {
      if (typeof window.navigator.share === 'function') {
        await window.navigator.share({
          title: 'No Thanks! room invite',
          text: `Join my No Thanks! room ${roomCode.toUpperCase()}`,
          url: roomInviteUrl,
        });
        flashCopyFeedback('invite');
        return;
      }

      await window.navigator.clipboard.writeText(roomInviteUrl);
      flashCopyFeedback('invite');
    } catch {
      setCopyFeedback(null);
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

  const surfaceTitle = mode === 'online' ? 'Online room' : 'Solo session';

  const surfaceCopy = mode === 'online'
    ? 'Share code, join, and play.'
    : 'Pick bots and start fast.';

  return (
    <div className="native-shell min-h-screen overflow-hidden px-4 py-5 text-white md:px-6 md:py-6">
      <div className="native-orb left-[-4rem] top-[6rem] h-40 w-40 bg-orange-300/25 md:h-64 md:w-64" />
      <div className="native-orb right-[-3rem] top-[2rem] h-36 w-36 bg-cyan-300/25 md:h-56 md:w-56" />
      <div className="native-orb bottom-[-5rem] left-[28%] h-44 w-44 bg-rose-400/20 md:h-72 md:w-72" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {onBackToHome && (
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={onBackToHome} className="native-button-ghost px-4 py-2 text-xs font-black uppercase tracking-[0.16em]">
              Back to home
            </button>
          </div>
        )}

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
              Start an online room or launch a local bot session.
            </p>
          </section>
        </div>

        <section className="native-panel rounded-[30px] p-4 shadow-2xl md:p-6 lg:p-8">
          <form onSubmit={mode === 'online' ? handleJoinOnline : handleStartLocal} className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
            <div className="space-y-5">
              <div>
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300/80">Mode</div>
                <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-black/20 p-1.5">
                  <button type="button" onClick={() => setMode('online')} className={`native-tab text-left ${mode === 'online' ? 'native-tab-active' : ''}`}>
                    <div className="text-sm font-black">Online</div>
                  </button>
                  <button type="button" onClick={() => setMode('local')} className={`native-tab text-left ${mode === 'local' ? 'native-tab-active' : ''}`}>
                    <div className="text-sm font-black">Local</div>
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
                        setCopyFeedback(null);
                      }}
                      maxLength={8}
                      className="native-input uppercase tracking-[0.35em]"
                      required={mode === 'online'}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={handleGenerateCode} className="native-button-ghost text-xs font-bold uppercase tracking-[0.14em]">New code</button>
                      <button type="button" onClick={handleCopyCode} className="native-button-ghost text-xs font-bold uppercase tracking-[0.14em]">{copyFeedback === 'code' ? 'Copied' : 'Copy room code'}</button>
                      {mode === 'online' && (
                        <button type="button" onClick={handleShareInvite} disabled={!roomInviteUrl} className="native-button-ghost text-xs font-bold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50">{copyFeedback === 'invite' ? 'Invite ready' : 'Share invite'}</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {mode === 'online' ? (
                <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Online room</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300/88">Sync code, join players, play live.</div>

                  {launchInvite && (
                    <div className="mt-3 rounded-2xl border border-amber-300/22 bg-amber-500/10 px-3 py-2 text-sm text-amber-50">
                      <strong>Invite:</strong> {launchInvite.roomCode} ({launchInvite.rolePreference === 'spectator' ? 'spectator' : 'player'})
                    </div>
                  )}

                  <label className="mt-4 flex items-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-500/8 px-3 py-2 text-sm font-bold text-cyan-100">
                    <input type="checkbox" checked={joinAsSpectator} onChange={e => setJoinAsSpectator(e.target.checked)} className="h-4 w-4 rounded border-cyan-200/50 bg-transparent" />
                    Spectator mode
                  </label>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-slate-300">
                    Share this room code or invite link with others.
                  </div>

                  {onlineStatus && <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-500/8 px-3 py-2 text-sm font-semibold text-cyan-100">Status: {onlineStatus}</div>}
                  {onlineError && <div className="mt-3 rounded-lg border border-rose-300/22 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">{onlineError}</div>}
                </div>
              ) : (
                <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Solo session</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300/88">{playerCountLabel}. Start fast with selected AI bots.</div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {mode === 'online' ? (
                <div className="native-panel-soft rounded-[24px] p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Room bots</div>
                      <div className="mt-1 text-sm text-slate-300">Add bots for empty seats, up to 5.</div>
                    </div>
                    <div className="rounded-full border border-cyan-300/18 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{selectedOnlineBots.length}/5</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedOnlineBots.length === 0 ? (
                      <span className="text-xs text-slate-400">No bots yet.</span>
                    ) : (
                      selectedOnlineBots.map((botId, index) => {
                        const bot = BOT_ARCHETYPES.find(value => value.id === botId);
                        if (!bot) return null;
                        return (
                          <button key={`${botId}-online-${index}`} type="button" onClick={() => handleRemoveOnlineBot(index)} className="rounded-full border border-white/20 bg-slate-900/80 px-3 py-1 text-xs font-bold text-white">
                            {bot.name} ×
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {BOT_ARCHETYPES.map(bot => (
                      <button key={`online-${bot.id}`} type="button" disabled={selectedOnlineBots.length >= 5} onClick={() => handleAddOnlineBot(bot.id as BotArchetypeId)} className="rounded-lg border border-white/10 bg-slate-900/70 p-2 text-left text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed">
                        <div className="font-bold">{bot.name}</div>
                        <div className="mt-1 flex gap-1 text-[10px] text-slate-300">
                          <span>S{bot.skill}</span>
                          <span>A{bot.awareness}</span>
                          <span>R{bot.riskyness}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="native-panel-soft rounded-[24px] p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Selected bots</span>
                      <span className="text-xs font-black text-slate-300">{selectedBots.length}/5</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedBots.length === 0 ? (
                        <span className="text-xs text-slate-400">No bots yet.</span>
                      ) : (
                        selectedBots.map((botId, index) => {
                          const bot = BOT_ARCHETYPES.find(b => b.id === botId);
                          if (!bot) return null;
                          return (
                            <button key={`${botId}-${index}`} type="button" onClick={() => handleRemoveBot(index)} className="rounded-full border border-white/15 bg-slate-900/80 px-3 py-1 text-xs font-bold">
                              {bot.name} ×
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="native-panel-soft rounded-[24px] p-3 md:p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Add bots</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {BOT_ARCHETYPES.map(bot => (
                        <button key={bot.id} type="button" disabled={selectedBots.length >= 5} onClick={() => handleAddBot(bot.id as BotArchetypeId)} className="rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1 text-xs font-black text-white disabled:opacity-40 disabled:cursor-not-allowed">
                          <div>{bot.name}</div>
                          <div className="text-[10px] text-slate-300">{bot.skill}/{bot.awareness}/{bot.riskyness}</div>
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
