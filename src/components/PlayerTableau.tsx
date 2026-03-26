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
      native-panel-soft flex flex-col p-2 md:p-3 rounded-2xl border transition-colors duration-300
      ${isCurrentTurn ? 'border-orange-300/50 shadow-lg ring-1 ring-orange-300/24' : 'border-slate-500/20'}
      w-[260px] md:w-full md:min-h-[130px] md:max-h-[130px] flex-shrink-0 h-[100px]
    `}>
      {/* Header section is fixed height */}
      <div className="flex justify-between items-center mb-1.5 flex-none h-[24px]">
        <h3 className={`font-bold text-sm md:text-base tracking-tight truncate pr-2 ${isCurrentTurn ? 'text-orange-100' : 'text-slate-100'}`}>
          {player.name} {player.isBot && <span className="opacity-70 text-xs ml-1">AI</span>}
        </h3>
        <div className={`
          flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-xs border flex-shrink-0
          ${showChips ? 'native-chip-badge' : 'native-status-pill'}
        `}>
          <div className={`w-1.5 h-1.5 rounded-full ${showChips ? 'bg-orange-100' : 'bg-slate-400'}`} />
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
            <div className="flex items-center justify-center w-full h-[48px] md:h-[60px] text-slate-400 text-xs md:text-sm font-medium border-2 border-dashed border-slate-600/50 rounded-md bg-black/15">
              No Cards Yet
            </div>
          )}
         </div>
      </div>

      {/* Footer is fixed height */}
      <div className="mt-1 pt-1 border-t border-slate-500/35 text-[10px] md:text-xs font-medium text-slate-300 flex justify-between items-center flex-none h-[20px]">
        <span>{player.cards.length} Cards</span>
        {isCurrentTurn ? (
          <span className="text-orange-200 animate-pulse">Thinking...</span>
        ) : (
          <span className="text-transparent">Waiting</span>
        )}
      </div>
    </div>
  );
};
