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
  roomCode?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  localPlayerId, 
  onAction,
  onStartGame,
  hideChips,
  onToggleHideChips,
  roomCode
}) => {
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const isLocalTurn = gameState.players[gameState.currentPlayerIndex]?.id === localPlayerId;
  const canPass = localPlayer && localPlayer.chips > 0;
  const isWaiting = gameState.status === 'waiting';

  const currentCardColor = gameState.currentCard ? getCardColor(gameState.currentCard.value) : '#400000';

  return (
    <div className="flex flex-col h-screen bg-[#f3f3f3] font-sans text-slate-800 overflow-hidden">
      
      {/* Header & Controls */}
      <header className="flex-none h-[64px] p-3 md:p-4 flex justify-between items-center bg-[#2f3131] text-white shadow-md z-10 border-b-2 border-[#1a1c1c]">
        <div className="flex items-center gap-4">
          <h1 className="text-xl md:text-2xl font-black tracking-tighter">
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
             <span className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining</span>
             <span className="text-lg md:text-xl font-bold leading-tight">{gameState.deck.length}</span>
          </div>
          <button 
            onClick={onToggleHideChips}
            className="bg-[#1a1c1c] hover:bg-black px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors border border-slate-700 text-slate-300"
          >
            {hideChips ? 'Show Chips' : 'Hide Chips'}
          </button>
        </div>
      </header>
      
      {/* Mobile Room Code Strip (if it didn't fit in header) */}
      {roomCode && (
        <div className="md:hidden flex-none h-[28px] bg-slate-800 text-slate-300 text-[10px] py-1 px-3 text-center border-b border-slate-700 flex items-center justify-center">
          ROOM: <span className="text-white font-bold ml-1">{roomCode}</span>
        </div>
      )}

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Opponents (Left Panel Desktop / Top Row Mobile) */}
        {/* We use strict max heights/widths here and simple flex wrap for the strips */}
        <section className={`
           flex-none w-full md:w-[320px] 
           flex flex-row md:flex-col gap-4 p-4 md:p-6 
           overflow-x-auto md:overflow-y-auto bg-white/50 border-b md:border-b-0 md:border-r border-slate-200
           scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent
           ${isWaiting ? 'hidden' : 'flex opacity-100'}
        `}>
           {gameState.players.filter(p => p.id !== localPlayerId).map((player) => (
             <div key={player.id} className="flex-shrink-0 min-w-[240px] md:min-w-0 pr-4 md:pr-0">
                 <OpponentStrip 
                   player={player} 
                   isCurrentTurn={!isWaiting && gameState.players[gameState.currentPlayerIndex]?.id === player.id}
                   hideChips={hideChips}
                 />
             </div>
           ))}
        </section>

        {/* Center Board (Middle) */}
        <section className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-[radial-gradient(circle_at_center,_#ffffff,_#e2e2e2)] relative overflow-hidden">
          
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwdjhoOHYtOEgweiIgZmlsbD0ibm9uZSI+PC9wYXRoPgo8Y2lyY2xlIGN4PSI0IiBjeT0iNCIgcj0iMSIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjA1Ij48L2NpcmNsZT4KPC9zdmc+')] opacity-50 pointer-events-none"></div>

          {isWaiting ? (
            // WAITING ROOM UI
            <div className="z-10 flex flex-col items-center text-center animate-fade-in">
               <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#400000] mb-2">Waiting for Players</h2>
               <p className="text-slate-500 mb-8 font-medium max-w-sm">
                 Share the room code <strong className="text-slate-700">{roomCode}</strong> with others, or start now with {gameState.players.length - 1} bots.
               </p>
               
               {/* Display players currently in lobby */}
               <div className="flex gap-2 flex-wrap justify-center mb-10 max-w-md">
                 {gameState.players.map(p => (
                   <div key={p.id} className="bg-white border border-slate-200 shadow-sm rounded-full px-4 py-1.5 text-sm font-bold text-slate-700 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                     {p.name} {p.isBot && '🤖'}
                   </div>
                 ))}
               </div>

               <button
                  onClick={onStartGame}
                  className="px-10 py-5 rounded-full font-black text-xl bg-[#1A237E] text-white shadow-lg border-2 border-[#1A237E] hover:bg-[#000767] hover:-translate-y-1 hover:shadow-xl active:translate-y-0 transition-all duration-200"
               >
                 START GAME
               </button>
            </div>
          ) : (
            // ACTIVE GAME UI
            <>
              <div className="mb-4 md:mb-8 text-center z-10 h-[24px]">
                <h2 className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">
                  {gameState.status === 'finished' ? 'Game Over' : 'Current Card'}
                </h2>
              </div>

              {/* CARD CONTAINER - strictly sized */}
              <div className="relative group perspective-1000 w-[140px] h-[196px] md:w-[200px] md:h-[280px] z-10 flex-shrink-0">
                <div className={`
                  absolute inset-0 bg-[#f9f9f9] rounded-[16px] md:rounded-[24px] shadow-[0_16px_32px_-12px_rgba(0,0,0,0.3)] border border-white
                  flex flex-col items-center justify-center transition-transform duration-700 transform-gpu overflow-hidden
                  ${gameState.currentCard ? 'scale-100 rotate-y-0' : 'scale-95 rotate-y-180 opacity-0'}
                `}
                style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E")',
                }}
                >
                   {gameState.currentCard && (
                     <>
                       {/* Center Number with dynamic gradient color */}
                       <span 
                          className="text-[70px] md:text-[100px] font-black leading-none tracking-tighter mix-blend-multiply opacity-95 drop-shadow-sm"
                          style={{ color: currentCardColor }}
                       >
                         {gameState.currentCard.value}
                       </span>
                       {/* Top Left Mini Number */}
                       <div 
                          className="absolute top-3 left-4 md:top-4 md:left-5 flex flex-col items-center"
                          style={{ color: currentCardColor }}
                       >
                         <span className="text-lg md:text-xl font-black opacity-90 drop-shadow-sm">{gameState.currentCard.value}</span>
                       </div>
                       {/* Bottom Right Mini Number (Inverted) */}
                       <div 
                          className="absolute bottom-3 right-4 md:bottom-4 md:right-5 flex flex-col items-center rotate-180"
                          style={{ color: currentCardColor }}
                       >
                         <span className="text-lg md:text-xl font-black opacity-90 drop-shadow-sm">{gameState.currentCard.value}</span>
                       </div>
                     </>
                   )}
                </div>

                {/* Chips on Card */}
                {gameState.currentCard && gameState.chipsOnCurrentCard > 0 && (
                  <div className="absolute -bottom-4 -right-4 md:-bottom-8 md:-right-8 z-20 pointer-events-none">
                    <div className="relative">
                      {Array.from({ length: Math.min(gameState.chipsOnCurrentCard, 20) }).map((_, i) => (
                        <div 
                          key={i}
                          className="absolute w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-[#e17c5a] to-[#b52518] rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.3)] border border-[#ffb4a8]/30"
                          style={{
                            top: `${(i % 5) * -2 + Math.random() * 4}px`,
                            left: `${(i % 4) * -2 + Math.random() * 4}px`,
                            transform: `rotate(${Math.random() * 360}deg)`,
                            zIndex: i
                          }}
                        >
                           <div className="absolute inset-1.5 border border-[#380b00]/20 rounded-full opacity-60" />
                        </div>
                      ))}
                      <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-[#1a1c1c] text-[#f9f9f9] font-black text-sm md:text-lg px-2 py-0.5 md:px-3 md:py-1 rounded-full shadow-xl border-2 border-[#1a1c1c] z-30 flex items-center gap-1.5">
                         <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#e17c5a] inline-block shadow-inner" />
                         {gameState.chipsOnCurrentCard}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Local Player Turn Controls */}
              <div className={`
                mt-8 md:mt-12 flex gap-4 md:gap-6 transition-opacity duration-300 z-10 h-[56px] md:h-[64px]
                ${isLocalTurn ? 'opacity-100' : 'opacity-0 pointer-events-none'}
              `}>
                <button
                  onClick={() => onAction('pass')}
                  disabled={!canPass || !isLocalTurn}
                  className={`
                    px-6 py-2 md:px-8 md:py-3 rounded-full font-black text-sm md:text-lg shadow-lg border-2
                    transition-all duration-200 flex flex-col items-center justify-center min-w-[120px] md:min-w-[160px] h-full
                    ${canPass 
                      ? 'bg-white hover:bg-slate-50 hover:-translate-y-1 hover:shadow-xl active:translate-y-0' 
                      : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}
                  `}
                  style={canPass ? { color: currentCardColor, borderColor: currentCardColor } : {}}
                >
                  <span className="tracking-[0.1em]">PASS</span>
                  <span className={`text-[8px] md:text-[10px] font-bold mt-0.5 ${canPass ? 'opacity-70' : 'text-slate-400'}`}>
                    PAY 1 CHIP
                  </span>
                </button>
                <button
                  onClick={() => onAction('take')}
                  disabled={!isLocalTurn}
                  className="
                    px-6 py-2 md:px-8 md:py-3 rounded-full font-black text-sm md:text-lg text-white shadow-lg border-2
                    hover:-translate-y-1 hover:shadow-xl active:translate-y-0 h-full
                    transition-all duration-200 flex flex-col items-center justify-center min-w-[120px] md:min-w-[160px]
                  "
                  style={{ backgroundColor: currentCardColor, borderColor: currentCardColor }}
                >
                  <span className="tracking-[0.1em]">TAKE IT</span>
                  <span className="text-[8px] md:text-[10px] font-bold mt-0.5 text-white/80">
                    +{gameState.chipsOnCurrentCard} CHIPS
                  </span>
                </button>
              </div>
            </>
          )}
        </section>

      </main>

      {/* Local Player (Bottom) */}
      <footer className={`flex-none bg-white border-t border-slate-200 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-20 
                         h-[140px] md:h-[160px] w-full overflow-hidden transition-opacity duration-300 ${isWaiting ? 'opacity-0 pointer-events-none' : 'opacity-100 block'}`}>
         {localPlayer && (
            <div className="w-full h-full w-full mx-auto px-2 md:px-6 py-3 md:py-4 flex justify-center">
               <div className="flex flex-col h-full w-full max-w-7xl border border-slate-300 rounded-xl bg-[#f9f9f9] shadow-sm overflow-hidden">
                  
                  {/* Local Header */}
                  <div className={`flex justify-between items-center px-4 py-2 flex-none h-[40px] border-b border-slate-200 transition-colors duration-500 ${isLocalTurn && !isWaiting ? 'bg-opacity-10' : 'bg-white'}`}
                       style={isLocalTurn && !isWaiting ? { backgroundColor: `${currentCardColor}15` } : {}}
                  >
                    <h3 className="font-bold text-sm md:text-base tracking-tight flex items-center gap-2 text-slate-800">
                      {isLocalTurn && !isWaiting && (
                         <span className="w-2 h-2 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: currentCardColor }}></span>
                      )}
                      {localPlayer.name} (You)
                    </h3>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full font-bold text-sm bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#b52518] shadow-inner" />
                      {localPlayer.chips} Chips
                    </div>
                  </div>

                  {/* Local Cards - Horizontal strict scrolling */}
                  <div className="flex-1 relative overflow-hidden bg-white">
                    <div className="absolute inset-0 overflow-x-auto overflow-y-hidden px-4 flex items-center scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                       {localPlayer.cards.length > 0 ? (
                         <PlayerTableau player={localPlayer} isCurrentTurn={false} hideChips={false} isLocalPlayer={true} />
                       ) : (
                         <div className="w-full text-center text-slate-400 text-sm font-medium italic">
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
