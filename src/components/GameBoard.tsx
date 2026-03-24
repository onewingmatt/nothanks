import React from 'react';
import type { GameState, BotAction } from '../game/models';
import { PlayerTableau } from './PlayerTableau';

interface GameBoardProps {
  gameState: GameState;
  localPlayerId: string;
  onAction: (action: BotAction) => void;
  hideChips: boolean;
  onToggleHideChips: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  localPlayerId, 
  onAction,
  hideChips,
  onToggleHideChips
}) => {
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const isLocalTurn = gameState.players[gameState.currentPlayerIndex]?.id === localPlayerId;
  const canPass = localPlayer && localPlayer.chips > 0;

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      
      {/* Header & Controls */}
      <header className="flex-none p-4 md:p-6 flex justify-between items-center bg-slate-800 text-white shadow-md z-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          No <span className="text-red-500">Thanks!</span>
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             <span className="text-sm text-slate-300">Cards Remaining</span>
             <span className="text-xl font-bold">{gameState.deck.length}</span>
          </div>
          <button 
            onClick={onToggleHideChips}
            className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-600"
          >
            {hideChips ? 'Show Opponent Chips' : 'Hide Opponent Chips'}
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Opponents (Left/Top) */}
        <section className="flex-none md:w-80 flex flex-row md:flex-col gap-4 p-4 overflow-x-auto md:overflow-y-auto bg-slate-50 shadow-inner">
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
        <section className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative border-t md:border-t-0 md:border-l border-slate-200 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-slate-100">
          
          <div className="mb-6 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-slate-600 mb-2">
              {gameState.status === 'finished' ? 'Game Over!' : 'Current Card'}
            </h2>
          </div>

          <div className="relative group perspective-1000 w-48 h-[268px] md:w-64 md:h-[358px]">
            <div className={`
              absolute inset-0 bg-white rounded-[24px] shadow-[0_12px_24px_rgba(0,0,0,0.12)] border border-slate-200
              flex flex-col items-center justify-center transition-transform duration-500 transform-gpu overflow-hidden
              ${gameState.currentCard ? 'scale-100 rotate-y-0' : 'scale-95 rotate-y-180 opacity-0'}
            `}
            style={{
              // Subtle linen/noise texture for the main card background
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E")',
            }}
            >
               {gameState.currentCard && (
                 <>
                   {/* Center Number with gradient */}
                   <span className="text-[100px] md:text-[140px] font-black leading-none bg-gradient-to-b from-[#8E0000] to-[#5C0000] bg-clip-text text-transparent drop-shadow-sm">
                     {gameState.currentCard.value}
                   </span>
                   {/* Top Left Mini Number */}
                   <div className="absolute top-4 left-5 flex flex-col items-center text-[#8E0000]">
                     <span className="text-3xl font-black">{gameState.currentCard.value}</span>
                   </div>
                   {/* Bottom Right Mini Number (Inverted) */}
                   <div className="absolute bottom-4 right-5 flex flex-col items-center text-[#8E0000] rotate-180">
                     <span className="text-3xl font-black">{gameState.currentCard.value}</span>
                   </div>
                 </>
               )}
            </div>

            {/* Chips on Card */}
            {gameState.currentCard && gameState.chipsOnCurrentCard > 0 && (
              <div className="absolute -bottom-8 -right-8 md:-bottom-12 md:-right-12 z-20 pointer-events-none">
                <div className="relative">
                  {Array.from({ length: Math.min(gameState.chipsOnCurrentCard, 20) }).map((_, i) => (
                    <div 
                      key={i}
                      className="absolute w-12 h-12 md:w-16 md:h-16 bg-[#b52518] rounded-full border-4 border-[#8E0000] shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
                      style={{
                        top: `${(i % 5) * -4 + Math.random() * 8}px`,
                        left: `${(i % 4) * -4 + Math.random() * 8}px`,
                        transform: `rotate(${Math.random() * 360}deg)`,
                        zIndex: i
                      }}
                    >
                       <div className="absolute inset-2 border-2 border-white/20 rounded-full opacity-50" />
                    </div>
                  ))}
                  <div className="absolute -top-4 -right-4 bg-slate-800 text-white font-bold text-xl md:text-2xl px-3 py-1 md:px-4 md:py-2 rounded-full shadow-lg border-2 border-[#b52518] z-30 flex items-center gap-2">
                     <span className="w-4 h-4 rounded-full bg-[#b52518] inline-block shadow-inner" />
                     {gameState.chipsOnCurrentCard}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Local Player Turn Controls */}
          <div className={`
            mt-12 md:mt-20 flex gap-4 md:gap-8 transition-all duration-300
            ${isLocalTurn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
          `}>
            <button
              onClick={() => onAction('pass')}
              disabled={!canPass || !isLocalTurn}
              className={`
                px-8 py-4 md:px-12 md:py-6 rounded-full font-extrabold text-xl md:text-2xl text-white shadow-[0_8px_16px_rgba(0,0,0,0.15)]
                transition-all duration-200 flex flex-col items-center justify-center min-w-[160px] md:min-w-[200px] border-none
                ${canPass 
                  ? 'bg-[#8E0000] hover:bg-[#680000] hover:-translate-y-1 hover:shadow-2xl active:translate-y-1 active:shadow-md' 
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'}
              `}
            >
              <span className="tracking-wide">NO THANKS</span>
              <span className={`text-xs md:text-sm font-medium mt-1 ${canPass ? 'text-white/80' : 'text-slate-400'}`}>
                Pay 1 Chip
              </span>
            </button>
            <button
              onClick={() => onAction('take')}
              disabled={!isLocalTurn}
              className="
                px-8 py-4 md:px-12 md:py-6 rounded-full font-extrabold text-xl md:text-2xl bg-[#1A237E] text-white shadow-[0_8px_16px_rgba(0,0,0,0.15)]
                hover:bg-[#000767] hover:-translate-y-1 hover:shadow-2xl active:translate-y-1 active:shadow-md border-none
                transition-all duration-200 flex flex-col items-center justify-center min-w-[160px] md:min-w-[200px]
              "
            >
              <span className="tracking-wide">TAKE IT</span>
              <span className="text-xs md:text-sm font-medium mt-1 text-white/80">
                +{gameState.chipsOnCurrentCard} Chips
              </span>
            </button>
          </div>
          
        </section>

      </main>

      {/* Local Player (Bottom) */}
      <footer className="flex-none p-4 md:p-6 bg-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
         {localPlayer && (
            <PlayerTableau 
              player={localPlayer} 
              isCurrentTurn={isLocalTurn}
              hideChips={false}
              isLocalPlayer={true}
            />
         )}
      </footer>

    </div>
  );
};
