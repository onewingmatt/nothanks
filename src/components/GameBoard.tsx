import React from 'react';
import type { GameState, BotAction } from '../game/models';
import { PlayerTableau } from './PlayerTableau';

interface GameBoardProps {
  gameState: GameState;
  localPlayerId: string;
  onAction: (action: BotAction) => void;
  hideChips: boolean;
  onToggleHideChips: () => void;
  roomCode?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  localPlayerId, 
  onAction,
  hideChips,
  onToggleHideChips,
  roomCode
}) => {
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const isLocalTurn = gameState.players[gameState.currentPlayerIndex]?.id === localPlayerId;
  const canPass = localPlayer && localPlayer.chips > 0;

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
          <div className="flex flex-col items-end">
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
        <div className="md:hidden flex-none h-[28px] bg-slate-800 text-slate-300 text-[10px] py-1 px-3 text-center border-b border-slate-700">
          ROOM: <span className="text-white font-bold ml-1">{roomCode}</span>
        </div>
      )}

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Opponents (Left Panel Desktop / Top Row Mobile) */}
        <section className="flex-none h-[150px] md:h-auto w-full md:w-[320px] flex flex-row md:flex-col gap-3 p-3 md:p-4 overflow-x-auto md:overflow-y-auto bg-white/50 border-b md:border-b-0 md:border-r border-slate-200">
           {gameState.players.filter(p => p.id !== localPlayerId).map((player) => (
             <PlayerTableau 
               key={player.id} 
               player={player} 
               isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === player.id}
               hideChips={hideChips}
               isLocalPlayer={false}
             />
           ))}
        </section>

        {/* Center Board (Middle) */}
        <section className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-[radial-gradient(circle_at_center,_#ffffff,_#e2e2e2)] relative">
          
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwdjhoOHYtOEgweiIgZmlsbD0ibm9uZSI+PC9wYXRoPgo8Y2lyY2xlIGN4PSI0IiBjeT0iNCIgcj0iMSIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjA1Ij48L2NpcmNsZT4KPC9zdmc+')] opacity-50 pointer-events-none"></div>

          <div className="mb-6 md:mb-10 text-center z-10 h-[32px]">
            <h2 className="text-sm md:text-base font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">
              {gameState.status === 'finished' ? 'Game Over' : 'Current Card'}
            </h2>
          </div>

          <div className="relative group perspective-1000 w-[160px] h-[224px] md:w-[220px] md:h-[308px] z-10">
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
                   {/* Center Number with subtle gradient */}
                   <span className="text-[80px] md:text-[120px] font-black leading-none text-[#400000] tracking-tighter mix-blend-multiply opacity-90">
                     {gameState.currentCard.value}
                   </span>
                   {/* Top Left Mini Number */}
                   <div className="absolute top-3 left-4 md:top-4 md:left-5 flex flex-col items-center text-[#400000]">
                     <span className="text-xl md:text-2xl font-black opacity-80">{gameState.currentCard.value}</span>
                   </div>
                   {/* Bottom Right Mini Number (Inverted) */}
                   <div className="absolute bottom-3 right-4 md:bottom-4 md:right-5 flex flex-col items-center text-[#400000] rotate-180">
                     <span className="text-xl md:text-2xl font-black opacity-80">{gameState.currentCard.value}</span>
                   </div>
                 </>
               )}
            </div>

            {/* Chips on Card */}
            {gameState.currentCard && gameState.chipsOnCurrentCard > 0 && (
              <div className="absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 z-20 pointer-events-none">
                <div className="relative">
                  {Array.from({ length: Math.min(gameState.chipsOnCurrentCard, 20) }).map((_, i) => (
                    <div 
                      key={i}
                      className="absolute w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-[#e17c5a] to-[#b52518] rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.3)] border border-[#ffb4a8]/30"
                      style={{
                        top: `${(i % 5) * -3 + Math.random() * 6}px`,
                        left: `${(i % 4) * -3 + Math.random() * 6}px`,
                        transform: `rotate(${Math.random() * 360}deg)`,
                        zIndex: i
                      }}
                    >
                       <div className="absolute inset-1.5 border border-[#380b00]/20 rounded-full opacity-60" />
                    </div>
                  ))}
                  <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-[#1a1c1c] text-[#f9f9f9] font-black text-lg md:text-xl px-2.5 py-0.5 md:px-3 md:py-1 rounded-full shadow-xl border-2 border-[#1a1c1c] z-30 flex items-center gap-1.5">
                     <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#e17c5a] inline-block shadow-inner" />
                     {gameState.chipsOnCurrentCard}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Local Player Turn Controls */}
          <div className={`
            mt-12 md:mt-20 flex gap-4 md:gap-6 transition-opacity duration-300 z-10 h-[64px] md:h-[80px]
            ${isLocalTurn ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}>
            <button
              onClick={() => onAction('pass')}
              disabled={!canPass || !isLocalTurn}
              className={`
                px-6 py-3 md:px-10 md:py-5 rounded-full font-black text-base md:text-xl shadow-lg border-2
                transition-all duration-200 flex flex-col items-center justify-center min-w-[140px] md:min-w-[180px] h-full
                ${canPass 
                  ? 'bg-white text-[#400000] border-[#400000] hover:bg-[#fff5f5] hover:-translate-y-1 hover:shadow-xl active:translate-y-0' 
                  : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}
              `}
            >
              <span className="tracking-[0.1em]">PASS</span>
              <span className={`text-[10px] md:text-xs font-bold mt-0.5 ${canPass ? 'text-[#8E0000]/70' : 'text-slate-400'}`}>
                PAY 1 CHIP
              </span>
            </button>
            <button
              onClick={() => onAction('take')}
              disabled={!isLocalTurn}
              className="
                px-6 py-3 md:px-10 md:py-5 rounded-full font-black text-base md:text-xl bg-[#400000] text-white shadow-lg border-2 border-[#400000]
                hover:bg-[#680000] hover:-translate-y-1 hover:shadow-xl active:translate-y-0 h-full
                transition-all duration-200 flex flex-col items-center justify-center min-w-[140px] md:min-w-[180px]
              "
            >
              <span className="tracking-[0.1em]">TAKE IT</span>
              <span className="text-[10px] md:text-xs font-bold mt-0.5 text-[#ffb4a8]">
                +{gameState.chipsOnCurrentCard} CHIPS
              </span>
            </button>
          </div>
          
        </section>

      </main>

      {/* Local Player (Bottom) */}
      <footer className="flex-none p-3 md:p-5 bg-white border-t border-slate-200 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-20 relative h-[160px] md:h-[200px] flex items-center justify-center">
         {localPlayer && (
            <div className="w-full max-w-4xl h-full">
               <PlayerTableau 
                 player={localPlayer} 
                 isCurrentTurn={isLocalTurn}
                 hideChips={false}
                 isLocalPlayer={true}
               />
            </div>
         )}
      </footer>

    </div>
  );
};
