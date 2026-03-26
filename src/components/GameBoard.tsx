import React, { useState } from 'react';
import type { GameState, BotAction } from '../game/models';
import { PlayerTableau } from './PlayerTableau';
import { OpponentStrip } from './OpponentStrip';
import { getCardColor } from '../utils/colors';

interface GameBoardProps {
  gameState: GameState;
  localPlayerId: string;
  onAction: (action: BotAction) => void;
  onStartGame: () => void;
  hideChips: boolean;
  onToggleHideChips: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
  onOpenTutorial: () => void;
  mistakeHint: string;
  hapticsSupported: boolean;
  hapticsStatus: string;
  isBotThinking: boolean;
  turnPulseKey: number;
  prefersReducedMotion: boolean;
  roomCode?: string;
  isOnlineRoom?: boolean;
  isOnlineHost?: boolean;
  onlineStatus?: string;
  isSpectator?: boolean;
  spectators?: Array<{ name: string; connected: boolean }>;
  roomInviteUrl?: string;
  multiplayerEndpointLabel?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  localPlayerId, 
  onAction,
  onStartGame,
  hideChips,
  onToggleHideChips,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  onOpenTutorial,
  mistakeHint,
  hapticsSupported,
  hapticsStatus,
  isBotThinking,
  turnPulseKey,
  prefersReducedMotion,
  roomCode,
  isOnlineRoom = false,
  isOnlineHost = true,
  onlineStatus = '',
  isSpectator = false,
  spectators = [],
  roomInviteUrl,
  multiplayerEndpointLabel,
}) => {
  const [shareFeedback, setShareFeedback] = useState<string>('');
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isLocalTurn = !isSpectator && gameState.players[gameState.currentPlayerIndex]?.id === localPlayerId;
  const canPass = localPlayer && localPlayer.chips > 0;
  const isWaiting = gameState.status === 'waiting';

  const currentCardColor = gameState.currentCard ? getCardColor(gameState.currentCard.value) : '#400000';
  const turnLabel = isWaiting
    ? 'Waiting for start'
    : isSpectator
      ? `Spectating - ${currentPlayer?.name || 'Player'}'s turn`
      : isLocalTurn
      ? 'Your turn'
      : currentPlayer?.isBot
        ? `${currentPlayer.name} is thinking`
        : `${currentPlayer.name}'s turn`;

  const handleShareInvite = async () => {
    if (!roomInviteUrl || typeof window === 'undefined') return;

    try {
      if (typeof window.navigator.share === 'function') {
        await window.navigator.share({
          title: 'No Thanks! room invite',
          text: roomCode ? `Join my No Thanks! room ${roomCode}` : 'Join my No Thanks! room',
          url: roomInviteUrl,
        });
        setShareFeedback('Invite shared');
      } else {
        await window.navigator.clipboard.writeText(roomInviteUrl);
        setShareFeedback('Invite copied');
      }

      window.setTimeout(() => {
        setShareFeedback(current => (current ? '' : current));
      }, 1600);
    } catch {
      setShareFeedback('');
    }
  };

  return (
    <div className="native-shell flex h-[100dvh] flex-col overflow-hidden text-slate-100">
      <div className="native-orb left-[-5rem] top-[4.5rem] h-36 w-36 bg-orange-300/20 md:h-52 md:w-52" />
      <div className="native-orb right-[-4rem] top-[5rem] h-32 w-32 bg-cyan-300/22 md:h-48 md:w-48" />

      <header className="native-panel relative z-20 flex-none h-[56px] md:h-[64px] px-3 py-2 md:px-4 md:py-3 flex justify-between items-center border-b border-slate-500/30 rounded-none shadow-none">
        <div className="flex items-center gap-2 md:gap-4">
          <h1 className="text-lg md:text-2xl font-black tracking-tighter">
            NO <span className="text-[#ffb487]">THANKS!</span>
          </h1>
          {roomCode && (
            <div className="native-status-pill hidden md:flex px-2.5 py-1 text-[10px] md:text-xs font-semibold">
              ROOM: <span className="text-white ml-1 font-bold tracking-[0.18em]">{roomCode}</span>
            </div>
          )}
          {isOnlineRoom && isSpectator && (
            <div className="hidden md:flex rounded-full border border-indigo-300/35 bg-indigo-500/16 px-2.5 py-1 text-[10px] md:text-xs font-black text-indigo-100 tracking-[0.12em]">
              SPECTATOR
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto max-w-[62vw] md:max-w-none pb-0.5">
          <div className={`native-status-pill hidden sm:flex flex-col items-end px-2.5 py-1 transition-opacity ${isWaiting ? 'opacity-0' : 'opacity-100'}`}>
             <span className="text-[8px] md:text-[10px] font-semibold uppercase tracking-wider leading-none opacity-75">Remaining</span>
             <span className="text-[11px] md:text-sm font-bold leading-tight">{gameState.deck.length}</span>
          </div>
          <button
            onClick={onToggleSound}
            className={`native-toggle shrink-0 px-2 py-1 md:px-3 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider ${soundEnabled ? 'native-toggle-active' : ''}`}
            aria-pressed={soundEnabled}
          >
            SFX {soundEnabled ? 'On' : 'Off'}
          </button>
          <button
            onClick={onToggleHaptics}
            disabled={!hapticsSupported}
            className={`native-toggle shrink-0 px-2 py-1 md:px-3 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider ${hapticsSupported && hapticsEnabled ? 'native-toggle-active' : ''} ${!hapticsSupported ? 'opacity-45 cursor-not-allowed' : ''}`}
            aria-pressed={hapticsEnabled}
            title={hapticsSupported ? 'Toggle haptics' : 'This browser does not support vibration haptics'}
          >
            {hapticsSupported ? `Haptics ${hapticsEnabled ? 'On' : 'Off'}` : 'No Haptics'}
          </button>
          <button
            onClick={onOpenTutorial}
            className="native-toggle shrink-0 px-2 py-1 md:px-3 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider"
            title="Open quick guide"
          >
            Guide
          </button>
          <button 
            onClick={onToggleHideChips}
            className={`native-toggle shrink-0 px-2.5 py-1 md:px-3 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider ${hideChips ? 'native-toggle-active' : ''}`}
          >
            {hideChips ? 'Show Chips' : 'Hide Chips'}
          </button>
        </div>
      </header>

      {hapticsStatus && (
        <div className="relative z-20 flex-none border-b border-cyan-300/20 bg-cyan-500/10 text-cyan-100 text-[10px] md:text-xs font-semibold px-3 py-1 text-center">
          {hapticsStatus}
        </div>
      )}

      {roomCode && (
        <div className="native-panel-soft relative z-20 md:hidden flex-none h-[24px] text-slate-200 text-[9px] py-0.5 px-3 text-center border-b border-slate-500/30 flex items-center justify-center rounded-none shadow-none">
          ROOM: <span className="text-white font-bold ml-1 tracking-[0.18em]">{roomCode}</span>
        </div>
      )}

      <main className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
          <section className={`
            native-panel-soft flex-none w-full md:w-[380px]
           flex flex-row md:flex-col gap-3 p-3 md:p-5
           overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-slate-500/25
           scrollbar-thin scrollbar-thumb-slate-500/70 scrollbar-track-transparent items-center md:items-stretch rounded-none
            ${isWaiting ? 'hidden' : 'h-[164px] md:h-full opacity-100'}
        `}>
           {gameState.players.filter(p => p.id !== localPlayerId).map((player) => (
             <div key={player.id} className="flex-shrink-0 min-w-[280px] md:min-w-0 pr-3 md:pr-0 h-full md:h-auto py-1 md:py-0">
                 <OpponentStrip
                   player={player}
                   isCurrentTurn={!isWaiting && gameState.players[gameState.currentPlayerIndex]?.id === player.id}
                   hideChips={hideChips}
                   isBotThinking={isBotThinking && gameState.players[gameState.currentPlayerIndex]?.id === player.id}
                 />
             </div>
           ))}
        </section>

        <section className="flex-1 flex flex-col items-center justify-center p-3 md:p-8 relative overflow-hidden min-h-0">

          {isWaiting ? (
            <div className="z-10 native-panel-soft flex flex-col items-center text-center p-5 md:p-7 overflow-y-auto max-h-full rounded-[26px] border border-slate-400/24 shadow-2xl w-full max-w-2xl">
               <h2 className="text-2xl md:text-4xl font-black tracking-[-0.03em] text-white mb-2">Waiting For Players</h2>
               <p className="text-slate-300 text-xs md:text-base mb-6 font-medium max-w-xl leading-6">
                 {isOnlineRoom
                   ? <>Share room code <strong className="text-white tracking-[0.16em]">{roomCode}</strong> so friends can join from web, Android, or iOS clients.</>
                   : <>Share room code <strong className="text-white tracking-[0.16em]">{roomCode}</strong> with others, or start now with {gameState.players.length - 1} bots.</>}
               </p>

               {isOnlineRoom && onlineStatus && (
                 <div className="mb-4 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 text-[11px] md:text-xs font-semibold text-cyan-100">
                   {onlineStatus}
                 </div>
               )}

               {isOnlineRoom && roomInviteUrl && (
                 <div className="mb-5 flex max-w-xl flex-wrap items-center justify-center gap-2">
                   <button
                     onClick={handleShareInvite}
                     className="native-button-secondary px-4 py-2 text-xs font-black uppercase tracking-[0.14em]"
                   >
                     {shareFeedback || 'Share Invite Link'}
                   </button>
                   {multiplayerEndpointLabel && (
                     <div className="rounded-full border border-white/10 bg-black/18 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                       Shared endpoint {multiplayerEndpointLabel}
                     </div>
                   )}
                 </div>
               )}

               <div className="flex gap-2 flex-wrap justify-center mb-8 max-w-xl">
                 {gameState.players.map(p => (
                   <div key={p.id} className="native-status-pill px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-bold text-slate-100 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 animate-pulse" />
                     {p.name} {p.isBot && '(AI)'}
                   </div>
                 ))}
                 {spectators.map(spectator => (
                   <div key={`spectator-${spectator.name}`} className="rounded-full border border-indigo-300/32 bg-indigo-500/16 px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-bold text-indigo-100 flex items-center gap-2">
                     <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${spectator.connected ? 'bg-indigo-300' : 'bg-slate-400'}`} />
                     {spectator.name} (spectator)
                   </div>
                 ))}
               </div>

              <button
                onClick={onStartGame}
                disabled={isOnlineRoom && !isOnlineHost}
                className="native-button-primary px-8 py-3 md:px-10 md:py-4 rounded-full font-black text-base md:text-xl uppercase tracking-[0.12em] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isOnlineRoom ? (isOnlineHost ? 'Start Match' : 'Waiting For Host') : 'Start Game'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full min-h-0">
              <div className="mb-2 md:mb-6 text-center z-10 flex-none">
                <h2 className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-[0.2em]">
                  {gameState.status === 'finished' ? 'Game Over' : 'Current Card'}
                </h2>
              </div>

              {mistakeHint && (
                <div className="mb-3 md:mb-4 w-full max-w-xl rounded-xl border border-amber-300/30 bg-amber-500/12 px-3 py-2 text-amber-100 text-xs md:text-sm font-semibold shadow-sm">
                  {mistakeHint}
                </div>
              )}

              <div
                key={turnPulseKey}
                className={`native-status-pill mb-4 md:mb-6 px-4 py-1.5 border font-bold text-[11px] md:text-sm tracking-wider uppercase backdrop-blur-sm shadow-sm z-10 ${isLocalTurn ? 'text-emerald-100 border-emerald-300/35 bg-emerald-500/16' : 'text-slate-200'} ${prefersReducedMotion ? '' : 'turn-banner-enter'}`}
              >
                {turnLabel}
                {!isLocalTurn && isBotThinking && (
                  <span className="inline-flex items-center gap-1 ml-2">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" style={{ animationDelay: '100ms' }} />
                    <span className="thinking-dot" style={{ animationDelay: '200ms' }} />
                  </span>
                )}
              </div>

              {/* CARD CONTAINER - strictly sized, smaller on mobile */}
              {/* Reduced mobile height from 196px to 168px */}
              <div className="relative group perspective-1000 w-[120px] h-[168px] md:w-[180px] md:h-[252px] z-10 flex-shrink-0">
                <div
                key={gameState.currentCard?.value ?? 'no-card'}
                className={`
                  native-card-shell absolute inset-0 rounded-[12px] md:rounded-[20px]
                  flex flex-col items-center justify-center transition-transform duration-700 transform-gpu overflow-hidden
                  ${gameState.currentCard ? 'scale-100 rotate-y-0 card-deal-in' : 'scale-95 rotate-y-180 opacity-0'}
                `}
                style={{ backgroundColor: '#ffffff' }}
                >
                   {gameState.currentCard && (
                     <>
                       {/* Center Number */}
                       <span 
                          className="text-[60px] md:text-[90px] font-black leading-none tracking-tighter"
                          style={{ color: currentCardColor }}
                       >
                         {gameState.currentCard.value}
                       </span>
                       {/* Top Left Mini Number */}
                       <div 
                          className="absolute top-2 left-3 md:top-3 md:left-4 flex flex-col items-center"
                          style={{ color: currentCardColor }}
                       >
                         <span className="text-base md:text-lg font-black opacity-90">{gameState.currentCard.value}</span>
                       </div>
                       {/* Bottom Right Mini Number (Inverted) */}
                       <div 
                          className="absolute bottom-2 right-3 md:bottom-3 md:right-4 flex flex-col items-center rotate-180"
                          style={{ color: currentCardColor }}
                       >
                         <span className="text-base md:text-lg font-black opacity-90">{gameState.currentCard.value}</span>
                       </div>
                     </>
                   )}
                </div>

                {/* Chips on Card */}
                {gameState.currentCard && gameState.chipsOnCurrentCard > 0 && (
                  <div className="absolute -bottom-3 -right-3 md:-bottom-6 md:-right-6 z-20 pointer-events-none">
                    <div key={gameState.chipsOnCurrentCard} className="relative chip-stack-pop">
                      {Array.from({ length: Math.min(gameState.chipsOnCurrentCard, 20) }).map((_, i) => (
                        <div 
                          key={i}
                          className="absolute w-7 h-7 md:w-10 md:h-10 bg-gradient-to-br from-[#e17c5a] to-[#b52518] rounded-full shadow-[0_3px_5px_rgba(0,0,0,0.3)] border border-[#ffb4a8]/30"
                          style={{
                            top: `${(i % 5) * -1.4 + ((i * 11) % 3) - 1}px`,
                            left: `${(i % 4) * -1.4 + ((i * 7) % 3) - 1}px`,
                            transform: `rotate(${(i * 37) % 360}deg)`,
                            zIndex: i
                          }}
                        >
                           <div className="absolute inset-1 border border-[#380b00]/20 rounded-full opacity-60" />
                        </div>
                      ))}
                       <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 native-status-pill font-black text-[10px] md:text-sm px-1.5 py-0.5 md:px-2 md:py-0.5 shadow-xl border z-30 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-[#e17c5a] inline-block shadow-inner" />
                         {gameState.chipsOnCurrentCard}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Local Player Turn Controls */}
              {/* Reduced mobile height from 56px to 48px */}
              {!isSpectator && (
                <div className={`
                  mt-6 md:mt-10 flex gap-3 md:gap-5 transition-opacity duration-300 z-10 flex-none h-[48px] md:h-[56px]
                  ${isLocalTurn ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}>
                <button
                  onClick={() => onAction('pass')}
                  disabled={!canPass || !isLocalTurn}
                  className={`
                    native-button-secondary px-5 md:px-8 rounded-full font-black text-sm md:text-base shadow-md border
                    transition-all duration-200 flex flex-col items-center justify-center min-w-[110px] md:min-w-[140px] h-full
                    ${canPass 
                      ? 'hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0' 
                      : 'opacity-40 cursor-not-allowed'}
                  `}
                  style={canPass ? { color: '#f2f7ff', borderColor: `${currentCardColor}88` } : {}}
                >
                  <span className="tracking-[0.1em]">PASS</span>
                  <span className={`text-[8px] md:text-[9px] font-bold mt-0.5 leading-none ${canPass ? 'opacity-75' : 'text-slate-400'}`}>
                    PAY 1 CHIP
                  </span>
                </button>
                <button
                  onClick={() => onAction('take')}
                  disabled={!isLocalTurn}
                  className="
                    px-5 md:px-8 rounded-full font-black text-sm md:text-base text-white shadow-md border
                    hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 h-full
                    transition-all duration-200 flex flex-col items-center justify-center min-w-[110px] md:min-w-[140px]
                    disabled:opacity-40 disabled:cursor-not-allowed
                  "
                  style={{ backgroundColor: currentCardColor, borderColor: currentCardColor }}
                >
                  <span className="tracking-[0.1em]">TAKE IT</span>
                  <span className="text-[8px] md:text-[9px] font-bold mt-0.5 leading-none text-white/80">
                    +{gameState.chipsOnCurrentCard} CHIPS
                  </span>
                </button>
                </div>
              )}

              {isSpectator && (
                <div className="mt-6 md:mt-10 rounded-full border border-indigo-300/35 bg-indigo-500/16 px-4 py-2 text-[11px] md:text-sm font-bold uppercase tracking-wider text-indigo-100">
                  Spectating - controls disabled
                </div>
              )}
            </div>
          )}
        </section>

      </main>

      <footer className={`native-panel-soft flex-none border-t border-slate-500/28 z-20 h-[125px] md:h-[150px] w-full overflow-hidden transition-opacity duration-300 rounded-none ${isWaiting ? 'opacity-0 pointer-events-none' : 'opacity-100 block'}`}>
        {!isSpectator && localPlayer && (
            <div className="w-full h-full max-w-7xl mx-auto px-2 md:px-6 py-2 md:py-3 flex justify-center">
               <div className="native-panel-soft flex flex-col h-full w-full border border-slate-500/28 rounded-xl overflow-hidden">
                  
                  <div className={`flex justify-between items-center px-3 md:px-4 py-1.5 md:py-2 flex-none h-[36px] md:h-[40px] border-b border-slate-500/30 transition-colors duration-500 ${isLocalTurn && !isWaiting ? 'bg-opacity-10' : ''}`}
                       style={isLocalTurn && !isWaiting ? { backgroundColor: `${currentCardColor}22` } : {}}
                  >
                    <h3 className="font-bold text-xs md:text-sm tracking-tight flex items-center gap-1.5 text-slate-100">
                      {isLocalTurn && !isWaiting && (
                         <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: currentCardColor }}></span>
                      )}
                      {localPlayer.name} (You)
                    </h3>
                    <div className="native-chip-badge flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 font-bold text-[10px] md:text-xs border shadow-sm">
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-100 shadow-inner" />
                      {localPlayer.chips} Chips
                    </div>
                  </div>

                  <div className="flex-1 relative overflow-hidden bg-black/12">
                    <div className="absolute inset-0 overflow-x-auto overflow-y-hidden px-3 md:px-4 flex items-center scrollbar-thin scrollbar-thumb-slate-500/75 scrollbar-track-transparent">
                       {localPlayer.cards.length > 0 ? (
                         <PlayerTableau player={localPlayer} isCurrentTurn={false} hideChips={false} isLocalPlayer={true} />
                       ) : (
                         <div className="w-full text-center text-slate-400 text-xs md:text-sm font-medium italic">
                           Your cards will appear here
                         </div>
                       )}
                    </div>
                  </div>

               </div>
            </div>
         )}

          {isSpectator && (
            <div className="w-full h-full max-w-5xl mx-auto px-2 md:px-6 py-2 md:py-3 flex items-center justify-center">
              <div className="w-full border border-indigo-300/32 rounded-xl bg-indigo-500/16 px-4 py-3 text-center">
               <div className="text-sm md:text-base font-extrabold text-indigo-100">Spectator View</div>
               <div className="text-xs md:text-sm text-indigo-100/86 mt-1">You joined as spectator. You can watch this match live and join as a player before the next game starts.</div>
              </div>
            </div>
          )}
      </footer>

    </div>
  );
};
