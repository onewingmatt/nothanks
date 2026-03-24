import React from 'react';
import type { Card } from '../game/models';

interface CardGroupProps {
  cards: Card[];
  isCurrentPlayer: boolean;
}

/**
 * Automatically groups sequential cards in a player's tableau.
 * Displays them visually condensed.
 */
export const CardGroup: React.FC<CardGroupProps> = ({ cards, isCurrentPlayer }) => {
  if (cards.length === 0) return null;

  // Sort cards ascending
  const sortedCards = [...cards].sort((a, b) => a.value - b.value);

  // Group into sequences
  const sequences: Card[][] = [];
  let currentSeq: Card[] = [sortedCards[0]];

  for (let i = 1; i < sortedCards.length; i++) {
    if (sortedCards[i].value === sortedCards[i - 1].value + 1) {
      currentSeq.push(sortedCards[i]);
    } else {
      sequences.push(currentSeq);
      currentSeq = [sortedCards[i]];
    }
  }
  sequences.push(currentSeq);

  // We want to achieve a roughly 2.5 : 3.5 aspect ratio for playing cards
  // 10 units wide : 14 units tall = 2.5 : 3.5 = 1 : 1.4

  return (
    <div className="flex flex-wrap gap-2 md:gap-4 mt-2">
      {sequences.map((seq, seqIdx) => (
        <div key={seqIdx} className="relative flex">
          {seq.map((c, i) => (
            <div
              key={c.value}
              className={`
                relative flex items-center justify-center 
                w-12 h-[68px] md:w-16 md:h-[90px]
                rounded-md bg-white border border-slate-300
                shadow-[0_2px_4px_rgba(0,0,0,0.1)]
                overflow-hidden
                ${i > 0 ? '-ml-8 md:-ml-10' : 'z-10'}
                ${isCurrentPlayer && i === 0 ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
              `}
              style={{
                zIndex: seq.length - i, // Lowest card on top
                // Add a very subtle noise/linen texture inline
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E")',
              }}
              title={`Sequence: ${seq.map(sc => sc.value).join(', ')}`}
            >
              {/* Top Left Mini Number */}
              <div className={`absolute top-0.5 left-1 text-[8px] md:text-[10px] font-bold ${i === 0 ? 'text-[#8E0000]' : 'text-slate-300'}`}>
                 {c.value}
              </div>
              
              {/* Center Number */}
              <span className={`font-black text-xl md:text-2xl ${i === 0 ? 'text-[#8E0000]' : 'text-slate-300'}`}>
                {c.value}
              </span>

              {/* Bottom Right Mini Number (Inverted) */}
              <div className={`absolute bottom-0.5 right-1 text-[8px] md:text-[10px] font-bold rotate-180 ${i === 0 ? 'text-[#8E0000]' : 'text-slate-300'}`}>
                 {c.value}
              </div>
            </div>
          ))}
          {/* Sequence badge indicator */}
          {seq.length > 1 && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] md:text-[11px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap shadow-sm z-20 pointer-events-none">
              {seq[0].value}-{seq[seq.length - 1].value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
