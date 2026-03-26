import React, { useState } from 'react';

interface HomeHubProps {
  dailySeed: string;
  dailyLineupLabels: string[];
  endpointLabel: string;
  installReady: boolean;
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
  dailySeed,
  dailyLineupLabels,
  endpointLabel,
  installReady,
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
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="native-panel-strong native-grid rounded-[30px] p-6 md:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/90">
              <span className="native-chip-dot" />
              Native-ready cross-platform board game
            </div>
            <h1 className="max-w-xl text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
              NO <span className="text-[#ffb487]">THANKS!</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200/88 md:text-base">
              A premium room-code card game built for one shared live backend across browser, Android, and iOS clients. Jump into a live lobby, launch a quick solo table, or start today&apos;s seeded run.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button type="button" onClick={onOpenLobby} className="native-button-primary text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/76">Live rooms</div>
                <div className="mt-2 text-lg font-black">Open lobby</div>
                <div className="mt-1 text-xs leading-5 text-white/78">Shared room code flow for all clients.</div>
              </button>
              <button type="button" onClick={onQuickSolo} className="native-button-secondary text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200/76">Instant play</div>
                <div className="mt-2 text-lg font-black">Quick solo</div>
                <div className="mt-1 text-xs leading-5 text-slate-200/78">Launch straight into a curated offline table.</div>
              </button>
              <button type="button" onClick={onStartDaily} className="native-button-secondary text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200/76">Daily run</div>
                <div className="mt-2 text-lg font-black">Play today&apos;s table</div>
                <div className="mt-1 text-xs leading-5 text-slate-200/78">Deterministic lineup and seeded local session.</div>
              </button>
              <button type="button" onClick={onOpenTutorial} className="native-button-ghost text-left">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200/76">Rules</div>
                <div className="mt-2 text-lg font-black">Open guide</div>
                <div className="mt-1 text-xs leading-5 text-slate-200/78">Quick refresher before joining a live room.</div>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="native-panel native-mini-stat rounded-[24px] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/85">Server mesh</div>
              <div className="mt-2 text-lg font-black text-white">One endpoint</div>
              <p className="mt-2 break-all text-sm leading-5 text-slate-300/85">{endpointLabel}</p>
            </div>
            <div className="native-panel native-mini-stat rounded-[24px] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/85">Daily seed</div>
              <div className="mt-2 text-lg font-black text-white">{dailySeed}</div>
              <p className="mt-2 text-sm leading-5 text-slate-300/85">Lineup: {dailyLineupLabels.join(' • ')}</p>
            </div>
            <div className="native-panel native-mini-stat rounded-[24px] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-200/85">Packaging</div>
              <div className="mt-2 text-lg font-black text-white">{installReady ? 'Standalone-ready' : 'Browser mode'}</div>
              <p className="mt-2 text-sm leading-5 text-slate-300/85">Manifest, icons, and native shell metadata are now wired in.</p>
            </div>
          </div>
        </section>

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
            <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="native-panel-soft rounded-[24px] p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Commercial app flow</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Choose how you enter the table</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/86">
                  The home shell now acts like a real product front door instead of dropping every user directly into setup. Live rooms stay available for cross-platform play, while quick solo and daily runs give the app stronger mobile cadence.
                </p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-slate-200">Open the lobby when you want hosted multiplayer, spectators, and room invites.</div>
                  <div className="rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-slate-200">Use quick solo for instant tactile play without room setup.</div>
                  <div className="rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-slate-200">Use daily run for a seeded local challenge that can later be mirrored across native clients.</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={onOpenLobby} className="native-bot-card p-4 text-left">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Multiplayer</div>
                  <div className="mt-2 text-xl font-black text-white">Open Lobby</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300/82">Create or join a live room, then share a deep link that opens the same room across web and mobile shells.</div>
                </button>
                <button type="button" onClick={onQuickSolo} className="native-bot-card p-4 text-left">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Offline</div>
                  <div className="mt-2 text-xl font-black text-white">Quick Solo</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300/82">Spin up a curated AI table immediately for the feel of a native card-game quick match.</div>
                </button>
                <button type="button" onClick={onStartDaily} className="native-bot-card p-4 text-left">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-200/80">Progression</div>
                  <div className="mt-2 text-xl font-black text-white">Daily Challenge</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300/82">Seed {dailySeed} with today&apos;s lineup already prepared for local challenge cadence.</div>
                </button>
                <button type="button" onClick={onOpenTutorial} className="native-bot-card p-4 text-left">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-200/80">Learn</div>
                  <div className="mt-2 text-xl font-black text-white">Guide</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300/82">Open the tutorial overlay without leaving the home shell.</div>
                </button>
              </div>
            </div>
          )}

          {panel === 'daily' && (
            <div className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
              <div className="native-panel-soft rounded-[24px] p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">Today&apos;s route</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Daily seed {dailySeed}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/86">This mode now has deterministic setup so it can evolve into a true cross-platform daily system later without changing the product surface again.</p>
                <div className="mt-5 rounded-2xl border border-amber-300/16 bg-black/18 px-4 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/78">Today&apos;s AI table</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dailyLineupLabels.map(label => (
                      <div key={label} className="native-chip">{label}</div>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={onStartDaily} className="native-button-primary mt-5 w-full text-base font-black uppercase tracking-[0.16em]">Start Daily Run</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="native-panel-soft rounded-[22px] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Attempts</div>
                  <div className="mt-2 text-3xl font-black text-white">{profileStats.daily.attempts}</div>
                </div>
                <div className="native-panel-soft rounded-[22px] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Best today</div>
                  <div className="mt-2 text-3xl font-black text-white">{profileStats.daily.bestScore ?? '—'}</div>
                </div>
                <div className="native-panel-soft rounded-[22px] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Goal</div>
                  <div className="mt-2 text-sm font-bold leading-6 text-white">Beat your best score with fewer expensive grabs and better chip timing.</div>
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
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="native-panel-soft rounded-[24px] p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Device feel</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Native shell settings</h2>
                <div className="mt-5 grid gap-3">
                  <button type="button" onClick={onToggleSound} className={`native-toggle flex items-center justify-between px-4 py-3 text-sm font-black uppercase tracking-[0.14em] ${soundEnabled ? 'native-toggle-active' : ''}`}>
                    <span>Sound effects</span>
                    <span>{soundEnabled ? 'On' : 'Off'}</span>
                  </button>
                  <button type="button" onClick={onToggleHaptics} disabled={!hapticsSupported} className={`native-toggle flex items-center justify-between px-4 py-3 text-sm font-black uppercase tracking-[0.14em] ${hapticsEnabled && hapticsSupported ? 'native-toggle-active' : ''} ${!hapticsSupported ? 'cursor-not-allowed opacity-45' : ''}`}>
                    <span>Haptics</span>
                    <span>{hapticsSupported ? (hapticsEnabled ? 'On' : 'Off') : 'Unavailable'}</span>
                  </button>
                </div>
              </div>
              <div className="native-panel-soft rounded-[24px] p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300/76">Platform readiness</div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Install shell</div>
                    <div className="mt-1 text-sm font-bold text-white">{installReady ? 'Configured for standalone install surfaces' : 'Running in browser mode'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/76">Shared backend</div>
                    <div className="mt-1 break-all text-sm font-bold text-white">{endpointLabel}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm leading-6 text-slate-300/82">
                    Android and iOS shells can now point at the same room endpoint and reuse the same invite URLs without rewriting the multiplayer contract.
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
