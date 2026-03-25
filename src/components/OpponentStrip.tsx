import React from 'react';
import type { Player } from '../game/models';
import { getCardColor } from '../utils/colors';

interface OpponentStripProps {
  player: Player;
  isCurrentTurn: boolean;
  hideChips: boolean;
}

export const OpponentStrip: React.FC<OpponentStripProps> = ({ 
  player, 
  isCurrentTurn, 
  hideChips 
}) => {
  return (
    <div className={`
      relative flex items-center gap-3 p-2 md:p-3 pr-4 rounded-full border bg-white shadow-sm transition-all duration-300 w-full max-w-[280px]
      ${isCurrentTurn ? 'border-[#8E0000] ring-2 ring-[#8E0000]/30 shadow-md scale-[1.02] z-10' : 'border-slate-200 opacity-90'}
    `}>
      {/* Avatar / Turn Indicator */}
      <div className={`
        flex-none w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg md:text-xl
        ${isCurrentTurn ? 'bg-[#8E0000] text-white shadow-inner animate-pulse' : 'bg-slate-100 text-slate-500'}
      `}>
        {player.isBot ? '🤖' : player.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <h3 className={`font-bold text-sm md:text-base truncate pr-2 ${isCurrentTurn ? 'text-[#8E0000]' : 'text-slate-800'}`}>
            {player.name}
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] md:text-xs font-semibold text-slate-600 border border-slate-200">
             <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
             {player.cards.length}
          </div>
        </div>
        
        {/* Condensed Cards Preview with dynamic coloring */}
        <div className="flex items-center gap-1 mt-1 overflow-hidden h-4">
          {player.cards.length === 0 ? (
            <span className="text-[10px] text-slate-400 italic">No cards</span>
          ) : (
             <div className="flex gap-0.5 overflow-hidden">
                {player.cards.slice(0, 8).map(c => (
                  <div 
                    key={c.value} 
                    className="text-white text-[8px] font-bold px-1 rounded-sm flex-none opacity-90"
                    style={{ backgroundColor: getCardColor(c.value) }}
                  >
                    {c.value}
                  </div>
                ))}
                {player.cards.length > 8 && (
                   <div className="text-[8px] text-slate-500 font-bold px-0.5 flex-none">+{player.cards.length - 8}</div>
                )}
             </div>
          )}
        </div>
      </div>

      {/* Chips Badge - positioned absolutely on the right edge */}
      <div className={`
        absolute -right-2 top-1/2 -translate-y-1/2
        flex flex-col items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 shadow-sm
        ${hideChips 
          ? 'bg-slate-200 border-slate-300 text-slate-500' 
          : 'bg-[#b52518] border-[#8E0000] text-white'}
      `}>
        <span className="text-xs md:text-sm font-black">{hideChips ? '?' : player.chips}</span>
      </div>
    </div>
  );
};
