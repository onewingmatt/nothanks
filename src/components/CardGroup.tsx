import React from 'react';
import type { Card } from '../game/models';
import { getCardColor } from '../utils/colors';

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

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 mt-2">
      {sequences.map((seq, seqIdx) => (
        <div key={seqIdx} className="relative flex">
          {seq.map((c, i) => {
            const cardColor = getCardColor(c.value);
            return (
              <div
                key={c.value}
                className={`
                  relative flex flex-col items-center justify-center 
                  w-[40px] h-[56px] md:w-[50px] md:h-[70px]
                  rounded-[4px] bg-white border border-slate-300
                  shadow-sm overflow-hidden
                  ${i > 0 ? '-ml-5 md:-ml-7' : 'z-10'}
                  ${isCurrentPlayer && i === 0 ? 'ring-2 ring-offset-1' : ''}
                `}
                style={{
                  zIndex: seq.length - i, // Lowest card on top
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E")',
                  // Use the card's dynamic color for the active ring if applicable
                  '--tw-ring-color': cardColor
                } as React.CSSProperties}
                title={`Sequence: ${seq.map(sc => sc.value).join(', ')}`}
              >
                {/* Center Number with dynamic gradient color */}
                <span 
                  className={`font-black text-lg md:text-xl drop-shadow-sm ${i > 0 ? 'opacity-40' : 'opacity-90'}`}
                  style={{ color: cardColor }}
                >
                  {c.value}
                </span>
              </div>
            );
          })}
          {/* Sequence badge indicator (only shown if a sequence exists) */}
          {seq.length > 1 && (
            <div 
              className="absolute -top-1 left-1/2 -translate-x-1/2 text-white text-[8px] md:text-[10px] px-1.5 py-[1px] rounded-full font-bold whitespace-nowrap shadow-sm z-20 pointer-events-none"
              style={{ backgroundColor: getCardColor(seq[0].value) }}
            >
              {seq[0].value}-{seq[seq.length - 1].value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
