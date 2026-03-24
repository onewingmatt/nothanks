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
      flex flex-col p-4 rounded-xl border-4 transition-all duration-300
      ${isCurrentTurn ? 'border-amber-400 bg-amber-50 shadow-lg scale-[1.02]' : 'border-slate-200 bg-white/80 scale-100'}
      w-full md:w-auto min-w-[200px] flex-1
    `}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-bold text-lg md:text-xl ${isCurrentTurn ? 'text-amber-700' : 'text-slate-800'}`}>
          {player.name} {player.isBot && '🤖'}
        </h3>
        <div className={`
          flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold
          ${showChips ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}
        `}>
          <div className={`w-3 h-3 rounded-full ${showChips ? 'bg-red-500 shadow-sm' : 'bg-slate-300'}`} />
          <span>{showChips ? player.chips : '?'}</span>
        </div>
      </div>
      
      <div className="flex-1">
        <CardGroup cards={player.cards} isCurrentPlayer={isLocalPlayer} />
      </div>

      <div className="mt-4 pt-2 border-t border-slate-200 text-sm text-slate-500 flex justify-between">
        <span>Cards: {player.cards.length}</span>
        {isCurrentTurn && <span className="text-amber-600 font-semibold animate-pulse">Thinking...</span>}
      </div>
    </div>
  );
};
