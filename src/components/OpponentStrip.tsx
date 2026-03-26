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
  const sortedCards = [...player.cards].sort((left, right) => left.value - right.value);

  return (
    <div className={`
      native-panel-soft relative flex w-full max-w-[360px] items-start gap-3 rounded-[24px] border p-3 md:p-4 transition-all duration-300
      ${isCurrentTurn ? 'border-orange-300/50 ring-2 ring-orange-300/24 shadow-lg scale-[1.01] z-10' : 'border-slate-500/20 opacity-95 hover:shadow-md hover:border-slate-400/40'}
    `}>
      <div className={`
        flex-none w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-base md:text-lg border
        ${isCurrentTurn ? 'bg-orange-500/85 border-orange-200/60 text-white shadow-inner animate-pulse' : 'bg-slate-800/70 border-slate-600/55 text-slate-200'}
      `}>
        {player.isBot ? '🤖' : player.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`font-bold text-sm md:text-base leading-none ${isCurrentTurn ? 'text-orange-100' : 'text-slate-100'}`}>
                {player.name}
              </h3>
              {persona && (
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-slate-800/85 text-slate-200 border border-slate-500/35">
                  {persona}
                </span>
              )}
            </div>
            {player.isBot && persona && (
              <p className="mt-1 text-[10px] leading-4 text-slate-300">
                {getPersonaLine(persona)}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-none">
            <div className="native-status-pill px-2 py-0.5 text-[10px] md:text-xs font-semibold border">
              Cards {sortedCards.length}
            </div>
            <div className={`rounded-full border px-2 py-0.5 text-[10px] md:text-xs font-black ${hideChips ? 'border-slate-500/60 bg-slate-700/90 text-slate-300' : 'border-amber-300/30 bg-amber-400/15 text-amber-100'}`}>
              {hideChips ? 'Chips ?' : `${player.chips} chips`}
            </div>
          </div>
        </div>

        {player.isBot && player.botConfig && (
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/35 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Skill</div>
              <div className="mt-0.5 text-xs font-black text-slate-100">{(player.botConfig.skill * 100).toFixed(0)}%</div>
            </div>
            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/35 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Aware</div>
              <div className="mt-0.5 text-xs font-black text-slate-100">{(player.botConfig.awareness * 100).toFixed(0)}%</div>
            </div>
            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/35 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Risk</div>
              <div className="mt-0.5 text-xs font-black text-slate-100">{(player.botConfig.riskyness * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Cards In Hand</div>
          {sortedCards.length === 0 ? (
            <span className="text-[10px] text-slate-400 italic">No cards</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sortedCards.map(card => (
                <div
                  key={card.value}
                  className="rounded-md px-1.5 py-0.5 text-[9px] md:text-[10px] font-black text-white shadow-sm"
                  style={{ backgroundColor: getCardColor(card.value) }}
                >
                  {card.value}
                </div>
              ))}
            </div>
          )}
        </div>

        {isCurrentTurn && isBotThinking && (
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-orange-200">
            <span className="thinking-dot" />
            <span className="thinking-dot" style={{ animationDelay: '100ms' }} />
            <span className="thinking-dot" style={{ animationDelay: '200ms' }} />
            <span className="ml-1">Thinking</span>
          </div>
        )}
      </div>
    </div>
  );
};
