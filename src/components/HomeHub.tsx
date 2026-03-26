import React, { useState } from 'react';

interface HomeHubProps {
  dailyLineupLabels: string[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  hapticsSupported: boolean;
  profileStats: {
    gamesPlayed: number;
    wins: number;
    streak: number;
    bestScore: number | null;
    daily: {
      attempts: number;
      bestScore: number | null;
    };
  };
  onOpenLobby: () => void;
  onQuickSolo: () => void;
  onStartDaily: () => void;
  onOpenTutorial: () => void;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
}

type HomePanel = 'play' | 'daily' | 'profile' | 'settings';

export const HomeHub: React.FC<HomeHubProps> = ({
  dailyLineupLabels,
  soundEnabled,
  hapticsEnabled,
  hapticsSupported,
  profileStats,
  onOpenLobby,
  onQuickSolo,
  onStartDaily,
  onOpenTutorial,
  onToggleSound,
  onToggleHaptics,
}) => {
  const [panel, setPanel] = useState<HomePanel>('play');
  const winRate = profileStats.gamesPlayed > 0 ? Math.round((profileStats.wins / profileStats.gamesPlayed) * 100) : 0;

  return (
    <div className="native-shell min-h-screen overflow-hidden px-4 py-5 text-white md:px-6 md:py-6">
      <div className="native-orb left-[-4rem] top-[6rem] h-40 w-40 bg-orange-300/25 md:h-64 md:w-64" />
      <div className="native-orb right-[-3rem] top-[2rem] h-36 w-36 bg-cyan-300/25 md:h-56 md:w-56" />
      <div className="native-orb bottom-[-5rem] left-[28%] h-44 w-44 bg-rose-400/20 md:h-72 md:w-72" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-4">
        {/* Hero */}
        <section className="native-panel-strong native-grid rounded-[30px] p-6 md:p-8">
          <h1 className="max-w-xl text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
            NO <span className="text-[#ffb487]">THANKS!</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300/90 md:text-base">
            Quick turns, easy rules, competitive scoring.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <button type="button" onClick={onOpenLobby} className="native-button-primary text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/80">Multiplayer</div>
              <div className="mt-2 text-lg font-black">Join room</div>
            </button>
            <button type="button" onClick={onQuickSolo} className="native-button-secondary text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-200/80">Solo</div>
              <div className="mt-2 text-lg font-black">Quick game</div>
            </button>
            <button type="button" onClick={onStartDaily} className="native-button-secondary text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-200/80">Daily</div>
              <div className="mt-2 text-lg font-black">Today</div>
            </button>
            <button type="button" onClick={onOpenTutorial} className="native-button-ghost text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-200/80">Rules</div>
              <div className="mt-2 text-lg font-black">Quick guide</div>
            </button>
          </div>
        </section>

        {/* Tabs */}
        <section className="native-panel rounded-[30px] p-4 md:p-6">
          <div className="mb-4 grid grid-cols-4 gap-2 rounded-[22px] border border-white/10 bg-black/20 p-1.5 text-xs font-black uppercase tracking-[0.14em]">
            {(['play', 'daily', 'profile', 'settings'] as HomePanel[]).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setPanel(item)}
                className={`native-tab ${panel === item ? 'native-tab-active' : ''}`}
              >
                {item}
              </button>
            ))}
          </div>

          {panel === 'play' && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button type="button" onClick={onOpenLobby} className="native-bot-card p-4 text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Multiplayer</div>
                <div className="mt-2 text-xl font-black text-white">Play with friends</div>
                <div className="mt-2 text-sm leading-6 text-slate-300/82">Create a room, share a code, and play live with up to 6 people.</div>
              </button>
              <button type="button" onClick={onQuickSolo} className="native-bot-card p-4 text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Solo</div>
                <div className="mt-2 text-xl font-black text-white">Quick game</div>
                <div className="mt-2 text-sm leading-6 text-slate-300/82">Play immediately against a table of AI opponents.</div>
              </button>
              <button type="button" onClick={onStartDaily} className="native-bot-card p-4 text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-200/80">Daily</div>
                <div className="mt-2 text-xl font-black text-white">Today&apos;s challenge</div>
                <div className="mt-2 text-sm leading-6 text-slate-300/82">Same table for everyone today — compare scores with friends.</div>
              </button>
              <button type="button" onClick={onOpenTutorial} className="native-bot-card p-4 text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-200/80">Learn</div>
                <div className="mt-2 text-xl font-black text-white">How to play</div>
                <div className="mt-2 text-sm leading-6 text-slate-300/82">Quick rules overview.</div>
              </button>
            </div>
          )}

          {panel === 'daily' && (
            <div className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
              <div className="native-panel-soft rounded-[24px] p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Daily challenge</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Today&apos;s table</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/86">
                  Every day a new AI lineup awaits. Beat your best score — lower is better in No Thanks!
                </p>
                <div className="mt-5 rounded-2xl border border-amber-300/16 bg-black/18 px-4 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/78">Today&apos;s opponents</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dailyLineupLabels.map(label => (
                      <div key={label} className="native-chip">{label}</div>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={onStartDaily} className="native-button-primary mt-5 w-full text-base font-black uppercase tracking-[0.16em]">Start Daily Challenge</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="native-panel-soft rounded-[22px] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Attempts today</div>
                  <div className="mt-2 text-3xl font-black text-white">{profileStats.daily.attempts}</div>
                </div>
                <div className="native-panel-soft rounded-[22px] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Best today</div>
                  <div className="mt-2 text-3xl font-black text-white">{profileStats.daily.bestScore ?? '—'}</div>
                </div>
                <div className="native-panel-soft rounded-[22px] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Tip</div>
                  <div className="mt-2 text-sm font-bold leading-6 text-white">Avoid high cards and use your chips wisely to keep your score low.</div>
                </div>
              </div>
            </div>
          )}

          {panel === 'profile' && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="native-panel-soft rounded-[22px] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Games played</div>
                <div className="mt-2 text-3xl font-black text-white">{profileStats.gamesPlayed}</div>
              </div>
              <div className="native-panel-soft rounded-[22px] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Win rate</div>
                <div className="mt-2 text-3xl font-black text-white">{winRate}%</div>
              </div>
              <div className="native-panel-soft rounded-[22px] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Streak</div>
                <div className="mt-2 text-3xl font-black text-white">{profileStats.streak}</div>
              </div>
              <div className="native-panel-soft rounded-[22px] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Best score</div>
                <div className="mt-2 text-3xl font-black text-white">{profileStats.bestScore ?? '—'}</div>
              </div>
            </div>
          )}

          {panel === 'settings' && (
            <div className="max-w-sm">
              <div className="native-panel-soft rounded-[24px] p-5">
                <h2 className="text-lg font-black tracking-tight text-white">Preferences</h2>
                <div className="mt-4 grid gap-3">
                  <button type="button" onClick={onToggleSound} className={`native-toggle flex items-center justify-between px-4 py-3 text-sm font-black uppercase tracking-[0.14em] ${soundEnabled ? 'native-toggle-active' : ''}`}>
                    <span>Sound effects</span>
                    <span>{soundEnabled ? 'On' : 'Off'}</span>
                  </button>
                  <button type="button" onClick={onToggleHaptics} disabled={!hapticsSupported} className={`native-toggle flex items-center justify-between px-4 py-3 text-sm font-black uppercase tracking-[0.14em] ${hapticsEnabled && hapticsSupported ? 'native-toggle-active' : ''} ${!hapticsSupported ? 'cursor-not-allowed opacity-45' : ''}`}>
                    <span>Vibration</span>
                    <span>{hapticsSupported ? (hapticsEnabled ? 'On' : 'Off') : 'Not available'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
