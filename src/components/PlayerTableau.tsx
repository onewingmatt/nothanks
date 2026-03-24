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

  return (
    <div className={`
      flex flex-col p-3 md:p-4 rounded-xl border-2 transition-all duration-300
      ${isCurrentTurn ? 'border-[#8E0000] bg-red-50/50 shadow-md ring-1 ring-[#8E0000]' : 'border-slate-200 bg-white/90'}
      w-full md:w-auto min-w-[220px] max-w-[400px] flex-shrink-0
    `}>
      <div className="flex justify-between items-center mb-3">
        <h3 className={`font-bold text-base md:text-lg tracking-tight ${isCurrentTurn ? 'text-[#8E0000]' : 'text-slate-800'}`}>
          {player.name} {player.isBot && <span className="opacity-70 text-sm ml-1">🤖</span>}
        </h3>
        <div className={`
          flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-sm border
          ${showChips ? 'bg-[#b52518]/10 text-[#8E0000] border-[#b52518]/20' : 'bg-slate-100 text-slate-500 border-slate-200'}
        `}>
          <div className={`w-2 h-2 rounded-full ${showChips ? 'bg-[#b52518]' : 'bg-slate-300'}`} />
          <span>{showChips ? player.chips : '?'}</span>
        </div>
      </div>
      
      {/* Scrollable container for cards so they don't bloat the layout vertically */}
      <div className="flex-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        <CardGroup cards={player.cards} isCurrentPlayer={isLocalPlayer} />
      </div>

      <div className="mt-2 pt-2 border-t border-slate-200 text-xs font-medium text-slate-500 flex justify-between items-center">
        <span>{player.cards.length} Cards</span>
        {isCurrentTurn && <span className="text-[#8E0000] animate-pulse">Thinking...</span>}
      </div>
    </div>
  );
};
