import React from 'react';
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
  onTestHaptics: () => void;
  onOpenTutorial: () => void;
  mistakeHint: string;
  hapticsSupported: boolean;
  hapticsStatus: string;
  isBotThinking: boolean;
  turnPulseKey: number;
  prefersReducedMotion: boolean;
  roomCode?: string;
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
  onTestHaptics,
  onOpenTutorial,
  mistakeHint,
  hapticsSupported,
  hapticsStatus,
  isBotThinking,
  turnPulseKey,
  prefersReducedMotion,
  roomCode
}) => {
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isLocalTurn = gameState.players[gameState.currentPlayerIndex]?.id === localPlayerId;
  const canPass = localPlayer && localPlayer.chips > 0;
  const isWaiting = gameState.status === 'waiting';

  const currentCardColor = gameState.currentCard ? getCardColor(gameState.currentCard.value) : '#400000';
  const turnLabel = isWaiting
    ? 'Waiting for start'
    : isLocalTurn
      ? 'Your turn'
      : currentPlayer?.isBot
        ? `${currentPlayer.name} is thinking`
        : `${currentPlayer.name}'s turn`;

  return (
    // Use h-[100dvh] instead of h-screen to properly fit mobile browsers with dynamic address bars
    <div className="flex flex-col h-[100dvh] bg-[#f3f3f3] font-sans text-slate-800 overflow-hidden">
      
      {/* Header & Controls */}
      {/* Reduced mobile height from 64px to 56px */}
      <header className="flex-none h-[56px] md:h-[64px] px-3 py-2 md:p-4 flex justify-between items-center bg-[#2f3131] text-white shadow-sm z-10 border-b border-[#1a1c1c]">
        <div className="flex items-center gap-2 md:gap-4">
          <h1 className="text-lg md:text-2xl font-black tracking-tighter">
            NO <span className="text-[#ffb4a8]">THANKS!</span>
          </h1>
          {roomCode && (
            <div className="hidden md:flex bg-black/40 px-2.5 py-1 rounded text-[10px] md:text-xs font-medium text-slate-300 border border-slate-700">
              ROOM: <span className="text-white ml-1 font-bold">{roomCode}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className={`flex flex-col items-end transition-opacity ${isWaiting ? 'opacity-0' : 'opacity-100'}`}>
             <span className="text-[8px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Remaining</span>
             <span className="text-base md:text-lg font-bold leading-tight">{gameState.deck.length}</span>
          </div>
          <button
            onClick={onToggleSound}
            className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors border shadow-sm ${soundEnabled ? 'bg-emerald-900/50 border-emerald-700 text-emerald-100 hover:bg-emerald-900/70' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
            aria-pressed={soundEnabled}
          >
            SFX {soundEnabled ? 'On' : 'Off'}
          </button>
          <button
            onClick={onToggleHaptics}
            disabled={!hapticsSupported}
            className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors border shadow-sm ${hapticsSupported ? (hapticsEnabled ? 'bg-indigo-900/50 border-indigo-700 text-indigo-100 hover:bg-indigo-900/70' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700') : 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'}`}
            aria-pressed={hapticsEnabled}
            title={hapticsSupported ? 'Toggle haptics' : 'This browser does not support vibration haptics'}
          >
            {hapticsSupported ? `Haptics ${hapticsEnabled ? 'On' : 'Off'}` : 'No Haptics'}
          </button>
          <button
            onClick={onTestHaptics}
            disabled={!hapticsSupported || !hapticsEnabled}
            className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors border shadow-sm ${hapticsSupported && hapticsEnabled ? 'bg-cyan-900/50 border-cyan-700 text-cyan-100 hover:bg-cyan-900/70' : 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'}`}
            title={hapticsSupported ? 'Play a strong haptics test pulse' : 'Haptics are not supported on this device'}
          >
            Test Buzz
          </button>
          <button
            onClick={onOpenTutorial}
            className="px-2 py-1 md:px-3 md:py-1.5 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors border shadow-sm bg-amber-900/40 border-amber-700 text-amber-100 hover:bg-amber-900/65"
            title="Open quick guide"
          >
            Guide
          </button>
          <button 
            onClick={onToggleHideChips}
            className="bg-[#1a1c1c] hover:bg-black px-2.5 py-1 md:px-3 md:py-1.5 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-700 text-slate-300 shadow-sm"
          >
            {hideChips ? 'Show Chips' : 'Hide Chips'}
          </button>
        </div>
      </header>

      {hapticsStatus && (
        <div className="flex-none bg-cyan-50 border-b border-cyan-200 text-cyan-900 text-[10px] md:text-xs font-semibold px-3 py-1 text-center">
          {hapticsStatus}
        </div>
      )}
      
      {/* Mobile Room Code Strip */}
      {/* Reduced mobile height from 28px to 24px */}
      {roomCode && (
        <div className="md:hidden flex-none h-[24px] bg-slate-800 text-slate-300 text-[9px] py-0.5 px-3 text-center border-b border-slate-700 flex items-center justify-center">
          ROOM: <span className="text-white font-bold ml-1 tracking-wider">{roomCode}</span>
        </div>
      )}

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Opponents (Top Row Mobile / Left Panel Desktop) */}
        {/* Reduced mobile height from 150px to 110px */}
        <section className={`
           flex-none w-full md:w-[320px] 
           flex flex-row md:flex-col gap-3 p-3 md:p-6 
           overflow-x-auto md:overflow-y-auto bg-white/50 border-b md:border-b-0 md:border-r border-slate-200
           scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent items-center md:items-stretch
           ${isWaiting ? 'hidden' : 'h-[110px] md:h-full opacity-100'}
        `}>
           {gameState.players.filter(p => p.id !== localPlayerId).map((player) => (
             <div key={player.id} className="flex-shrink-0 min-w-[220px] md:min-w-0 pr-3 md:pr-0 h-full md:h-auto py-1 md:py-0">
                 <OpponentStrip 
                   player={player} 
                   isCurrentTurn={!isWaiting && gameState.players[gameState.currentPlayerIndex]?.id === player.id}
                   hideChips={hideChips}
                   isBotThinking={isBotThinking && gameState.players[gameState.currentPlayerIndex]?.id === player.id}
                 />
             </div>
           ))}
        </section>

        {/* Center Board (Middle) */}
        <section className="flex-1 flex flex-col items-center justify-center p-2 md:p-8 bg-[radial-gradient(circle_at_center,_#ffffff,_#e2e2e2)] relative overflow-hidden min-h-0">
          
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwdjhoOHYtOEgweiIgZmlsbD0ibm9uZSI+PC9wYXRoPgo8Y2lyY2xlIGN4PSI0IiBjeT0iNCIgcj0iMSIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjA1Ij48L2NpcmNsZT4KPC9zdmc+')] opacity-50 pointer-events-none"></div>

          {isWaiting ? (
            // WAITING ROOM UI
            <div className="z-10 flex flex-col items-center text-center animate-fade-in p-4 overflow-y-auto max-h-full">
               <h2 className="text-xl md:text-3xl font-black tracking-tight text-[#400000] mb-2">Waiting for Players</h2>
               <p className="text-slate-500 text-xs md:text-base mb-6 font-medium max-w-sm">
                 Share the room code <strong className="text-slate-700">{roomCode}</strong> with others, or start now with {gameState.players.length - 1} bots.
               </p>
               
               {/* Display players currently in lobby */}
               <div className="flex gap-2 flex-wrap justify-center mb-8 max-w-md">
                 {gameState.players.map(p => (
                   <div key={p.id} className="bg-white border border-slate-200 shadow-sm rounded-full px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse"></span>
                     {p.name} {p.isBot && '🤖'}
                   </div>
                 ))}
               </div>

               <button
                  onClick={onStartGame}
                  className="px-8 py-3 md:px-10 md:py-5 rounded-full font-black text-base md:text-xl bg-[#1A237E] text-white shadow-lg border-2 border-[#1A237E] hover:bg-[#000767] hover:-translate-y-1 hover:shadow-xl active:translate-y-0 transition-all duration-200"
               >
                 START GAME
               </button>
            </div>
          ) : (
            // ACTIVE GAME UI
            <div className="flex flex-col items-center justify-center w-full h-full min-h-0">
              {/* Reduced margin/heights across the board to compress the center vertically */}
              <div className="mb-2 md:mb-6 text-center z-10 flex-none">
                <h2 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                  {gameState.status === 'finished' ? 'Game Over' : 'Current Card'}
                </h2>
              </div>

              {mistakeHint && (
                <div className="mb-3 md:mb-4 w-full max-w-xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-xs md:text-sm font-semibold shadow-sm">
                  {mistakeHint}
                </div>
              )}

              <div
                key={turnPulseKey}
                className={`mb-4 md:mb-6 px-4 py-1.5 rounded-full border font-bold text-[11px] md:text-sm tracking-wider uppercase bg-white/80 backdrop-blur-sm shadow-sm z-10 ${isLocalTurn ? 'text-[#1b5e20] border-[#1b5e20]/30' : 'text-slate-700 border-slate-300'} ${prefersReducedMotion ? '' : 'turn-banner-enter'}`}
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
                  absolute inset-0 bg-[#f9f9f9] rounded-[12px] md:rounded-[20px] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.25)] border border-white
                  flex flex-col items-center justify-center transition-transform duration-700 transform-gpu overflow-hidden
                  ${gameState.currentCard ? 'scale-100 rotate-y-0 card-deal-in' : 'scale-95 rotate-y-180 opacity-0'}
                `}
                style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E")',
                }}
                >
                   {gameState.currentCard && (
                     <>
                       {/* Center Number with dynamic gradient color */}
                       <span 
                          className="text-[60px] md:text-[90px] font-black leading-none tracking-tighter mix-blend-multiply opacity-95 drop-shadow-sm"
                          style={{ color: currentCardColor }}
                       >
                         {gameState.currentCard.value}
                       </span>
                       {/* Top Left Mini Number */}
                       <div 
                          className="absolute top-2 left-3 md:top-3 md:left-4 flex flex-col items-center"
                          style={{ color: currentCardColor }}
                       >
                         <span className="text-base md:text-lg font-black opacity-90 drop-shadow-sm">{gameState.currentCard.value}</span>
                       </div>
                       {/* Bottom Right Mini Number (Inverted) */}
                       <div 
                          className="absolute bottom-2 right-3 md:bottom-3 md:right-4 flex flex-col items-center rotate-180"
                          style={{ color: currentCardColor }}
                       >
                         <span className="text-base md:text-lg font-black opacity-90 drop-shadow-sm">{gameState.currentCard.value}</span>
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
                      <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-[#1a1c1c] text-[#f9f9f9] font-black text-[10px] md:text-sm px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full shadow-xl border-2 border-[#1a1c1c] z-30 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-[#e17c5a] inline-block shadow-inner" />
                         {gameState.chipsOnCurrentCard}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Local Player Turn Controls */}
              {/* Reduced mobile height from 56px to 48px */}
              <div className={`
                mt-6 md:mt-10 flex gap-3 md:gap-5 transition-opacity duration-300 z-10 flex-none h-[48px] md:h-[56px]
                ${isLocalTurn ? 'opacity-100' : 'opacity-0 pointer-events-none'}
              `}>
                <button
                  onClick={() => onAction('pass')}
                  disabled={!canPass || !isLocalTurn}
                  className={`
                    px-5 md:px-8 rounded-full font-black text-sm md:text-base shadow-md border-2
                    transition-all duration-200 flex flex-col items-center justify-center min-w-[110px] md:min-w-[140px] h-full
                    ${canPass 
                      ? 'bg-white hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0' 
                      : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}
                  `}
                  style={canPass ? { color: currentCardColor, borderColor: currentCardColor } : {}}
                >
                  <span className="tracking-[0.1em]">PASS</span>
                  <span className={`text-[8px] md:text-[9px] font-bold mt-0.5 leading-none ${canPass ? 'opacity-70' : 'text-slate-400'}`}>
                    PAY 1 CHIP
                  </span>
                </button>
                <button
                  onClick={() => onAction('take')}
                  disabled={!isLocalTurn}
                  className="
                    px-5 md:px-8 rounded-full font-black text-sm md:text-base text-white shadow-md border-2
                    hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 h-full
                    transition-all duration-200 flex flex-col items-center justify-center min-w-[110px] md:min-w-[140px]
                  "
                  style={{ backgroundColor: currentCardColor, borderColor: currentCardColor }}
                >
                  <span className="tracking-[0.1em]">TAKE IT</span>
                  <span className="text-[8px] md:text-[9px] font-bold mt-0.5 leading-none text-white/80">
                    +{gameState.chipsOnCurrentCard} CHIPS
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Local Player (Bottom) */}
      {/* Reduced mobile height from 140px to 125px */}
      <footer className={`flex-none bg-white border-t border-slate-200 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-20 
                         h-[125px] md:h-[150px] w-full overflow-hidden transition-opacity duration-300 ${isWaiting ? 'opacity-0 pointer-events-none' : 'opacity-100 block'}`}>
         {localPlayer && (
            <div className="w-full h-full max-w-7xl mx-auto px-2 md:px-6 py-2 md:py-3 flex justify-center">
               <div className="flex flex-col h-full w-full border border-slate-300 rounded-xl bg-[#f9f9f9] shadow-sm overflow-hidden">
                  
                  {/* Local Header */}
                  <div className={`flex justify-between items-center px-3 md:px-4 py-1.5 md:py-2 flex-none h-[36px] md:h-[40px] border-b border-slate-200 transition-colors duration-500 ${isLocalTurn && !isWaiting ? 'bg-opacity-10' : 'bg-white'}`}
                       style={isLocalTurn && !isWaiting ? { backgroundColor: `${currentCardColor}15` } : {}}
                  >
                    <h3 className="font-bold text-xs md:text-sm tracking-tight flex items-center gap-1.5 text-slate-800">
                      {isLocalTurn && !isWaiting && (
                         <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: currentCardColor }}></span>
                      )}
                      {localPlayer.name} (You)
                    </h3>
                    <div className="flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full font-bold text-[10px] md:text-xs bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#b52518] shadow-inner" />
                      {localPlayer.chips} Chips
                    </div>
                  </div>

                  {/* Local Cards - Horizontal strict scrolling */}
                  <div className="flex-1 relative overflow-hidden bg-white">
                    <div className="absolute inset-0 overflow-x-auto overflow-y-hidden px-3 md:px-4 flex items-center scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
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
      </footer>

    </div>
  );
};
