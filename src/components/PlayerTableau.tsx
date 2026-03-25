import React from 'react';
import type { Player } from '../game/models';
import { CardGroup } from './CardGroup';

interface PlayerTableauProps {
  player: Player;
  isCurrentTurn: boolean;
  hideChips: boolean;
  isLocalPlayer: boolean;
}

export const PlayerTableau: React.FC<PlayerTableauProps> = ({ 
  player, 
  isCurrentTurn, 
  hideChips, 
  isLocalPlayer 
}) => {
  // Always show chips for the local player, optionally hide for others
  const showChips = isLocalPlayer || !hideChips;

  if (isLocalPlayer) {
     return <CardGroup cards={player.cards} isCurrentPlayer={true} />;
  }

  return (
    <div className={`
      flex flex-col p-2 md:p-3 rounded-xl border-2 transition-colors duration-300
      ${isCurrentTurn ? 'border-[#8E0000] bg-red-50/50 shadow-md ring-1 ring-[#8E0000]' : 'border-slate-200 bg-white/90'}
      w-[260px] md:w-full md:min-h-[130px] md:max-h-[130px] flex-shrink-0 h-[100px]
    `}>
      {/* Header section is fixed height */}
      <div className="flex justify-between items-center mb-1.5 flex-none h-[24px]">
        <h3 className={`font-bold text-sm md:text-base tracking-tight truncate pr-2 ${isCurrentTurn ? 'text-[#8E0000]' : 'text-slate-800'}`}>
          {player.name} {player.isBot && <span className="opacity-70 text-xs ml-1">🤖</span>}
        </h3>
        <div className={`
          flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-xs border flex-shrink-0
          ${showChips ? 'bg-[#b52518]/10 text-[#8E0000] border-[#b52518]/20' : 'bg-slate-100 text-slate-500 border-slate-200'}
        `}>
          <div className={`w-1.5 h-1.5 rounded-full ${showChips ? 'bg-[#b52518]' : 'bg-slate-300'}`} />
          <span>{showChips ? player.chips : '?'}</span>
        </div>
      </div>
      
      {/* 
        Scrollable container for cards 
        Using absolute height boundaries ensures the container never resizes based on content length or height.
      */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
         <div className="absolute inset-0 overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent flex items-center">
          {player.cards.length > 0 ? (
            <CardGroup cards={player.cards} isCurrentPlayer={isLocalPlayer} />
          ) : (
            <div className="flex items-center justify-center w-full h-[48px] md:h-[60px] text-slate-300 text-xs md:text-sm font-medium border-2 border-dashed border-slate-200 rounded-md">
              No Cards Yet
            </div>
          )}
         </div>
      </div>

      {/* Footer is fixed height */}
      <div className="mt-1 pt-1 border-t border-slate-200 text-[10px] md:text-xs font-medium text-slate-500 flex justify-between items-center flex-none h-[20px]">
        <span>{player.cards.length} Cards</span>
        {isCurrentTurn ? (
          <span className="text-[#8E0000] animate-pulse">Thinking...</span>
        ) : (
          <span className="text-transparent">Waiting</span>
        )}
      </div>
    </div>
  );
};
