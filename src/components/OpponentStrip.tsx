import React from 'react';
import type { Player } from '../game/models';
import { getCardColor } from '../utils/colors';

interface OpponentStripProps {
  player: Player;
  isCurrentTurn: boolean;
  hideChips: boolean;
  isBotThinking: boolean;
}

function getBotPersona(player: Player): string | null {
  if (!player.isBot || !player.botConfig) return null;

  const { skill, awareness, riskyness } = player.botConfig;
  if (skill >= 0.8 && awareness >= 0.8 && riskyness >= 0.8) return 'Table Shark';
  if (skill >= 0.8 && awareness >= 0.8) return 'Grand Tactician';
  if (riskyness >= 0.8) return 'High Roller';
  if (skill >= 0.8) return 'Cold Calculator';
  if (awareness >= 0.8) return 'Mind Reader';
  return 'Balanced Bot';
}

function getPersonaLine(persona: string | null): string {
  switch (persona) {
    case 'Table Shark':
      return 'Smells value and presses hard.';
    case 'Grand Tactician':
      return 'Tracks every edge on board.';
    case 'High Roller':
      return 'Leans aggressive for bigger swings.';
    case 'Cold Calculator':
      return 'Optimizes raw card math first.';
    case 'Mind Reader':
      return 'Watches stacks and pressure points.';
    default:
      return 'Plays a balanced risk line.';
  }
}

export const OpponentStrip: React.FC<OpponentStripProps> = ({ 
  player, 
  isCurrentTurn, 
  hideChips,
  isBotThinking
}) => {
  const persona = getBotPersona(player);

  return (
    <div className={`
      native-panel-soft relative flex items-center gap-3 p-2.5 md:p-3.5 pr-4 rounded-[22px] border transition-all duration-300 w-full max-w-[300px]
      ${isCurrentTurn ? 'border-orange-300/50 ring-2 ring-orange-300/24 shadow-lg scale-[1.01] z-10' : 'border-slate-500/20 opacity-95'}
    `}>
      {/* Avatar / Turn Indicator */}
      <div className={`
        flex-none w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-base md:text-lg border
        ${isCurrentTurn ? 'bg-orange-500/85 border-orange-200/60 text-white shadow-inner animate-pulse' : 'bg-slate-800/70 border-slate-600/55 text-slate-200'}
      `}>
        {player.isBot ? 'AI' : player.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2 pr-2 overflow-hidden">
             <h3 className={`font-bold text-sm md:text-base truncate ${isCurrentTurn ? 'text-orange-100' : 'text-slate-100'}`}>
               {player.name}
             </h3>
             {persona && (
               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-slate-800/85 text-slate-200 border border-slate-500/35">
                 {persona}
               </span>
             )}
             {player.isBot && player.botConfig && (
                <div className="hidden md:flex gap-1">
                   <span className="text-[8px] bg-blue-500/16 border border-blue-300/28 text-blue-100 px-1 rounded" title="Skill">S:{player.botConfig.skill}</span>
                   <span className="text-[8px] bg-emerald-500/16 border border-emerald-300/28 text-emerald-100 px-1 rounded" title="Awareness">A:{player.botConfig.awareness}</span>
                </div>
             )}
          </div>
          <div className="native-status-pill flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-xs font-semibold border flex-none">
             <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
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
                    className="text-white text-[8px] font-bold px-1 rounded-sm flex-none opacity-95"
                    style={{ backgroundColor: getCardColor(c.value) }}
                  >
                    {c.value}
                  </div>
                ))}
                {player.cards.length > 8 && (
                   <div className="text-[8px] text-slate-300 font-bold px-0.5 flex-none">+{player.cards.length - 8}</div>
                )}
             </div>
          )}
        </div>
        {isCurrentTurn && isBotThinking && (
          <div className="mt-1 flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-orange-200">
            <span>{getPersonaLine(persona)}</span>
            <span className="thinking-dot" />
            <span className="thinking-dot" style={{ animationDelay: '100ms' }} />
            <span className="thinking-dot" style={{ animationDelay: '200ms' }} />
          </div>
        )}
      </div>

      {/* Chips Badge - positioned absolutely on the right edge */}
      <div className={`
        absolute -right-2 top-1/2 -translate-y-1/2
        flex flex-col items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 shadow-sm
        ${hideChips 
          ? 'bg-slate-700/90 border-slate-500 text-slate-300' 
          : 'native-chip-badge'}
      `}>
        <span className="text-xs md:text-sm font-black">{hideChips ? '?' : player.chips}</span>
      </div>
    </div>
  );
};
