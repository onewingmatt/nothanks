/* eslint-disable react-hooks/set-state-in-effect */
import React, { useMemo, useState } from 'react';

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  bullets: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Goal',
    description: 'Finish with the lowest score. Card values add points, chips subtract points.',
    bullets: [
      'Lower score wins the game.',
      'Consecutive cards count as only the lowest card in the run.',
      'Every chip you keep is minus one point.',
    ],
  },
  {
    title: 'Your Turn',
    description: 'Choose between PASS and TAKE IT whenever it is your turn.',
    bullets: [
      'PASS spends 1 chip and puts it on the card in the center.',
      'TAKE IT gives you the card plus all chips currently on it.',
      'If you have 0 chips, you must take the card.',
    ],
  },
  {
    title: 'Read The Table',
    description: 'Watch opponents and center chips to decide if a card is worth taking now or later.',
    bullets: [
      'A high card with many chips can become profitable.',
      'A card that extends your sequence can be very strong.',
      'Bots have different risk styles, so timing matters.',
    ],
  },
  {
    title: 'Play Flow',
    description: 'The deck ends, final scores are calculated, then you can rematch instantly.',
    bullets: [
      'Track your chips and card runs each round.',
      'Use Guide from the header to open this tutorial anytime.',
      'Try a quick rematch to learn bot patterns faster.',
    ],
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, onClose, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = useMemo(() => TUTORIAL_STEPS[stepIndex], [stepIndex]);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-[#10213d] to-[#1d355f] text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">Quick Guide</h2>
              <p className="text-xs md:text-sm text-blue-100 mt-1">Step {stepIndex + 1} of {TUTORIAL_STEPS.length}</p>
            </div>
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-5 md:px-6 py-5 md:py-6">
          <h3 className="text-lg md:text-xl font-extrabold text-slate-900">{currentStep.title}</h3>
          <p className="text-sm md:text-base text-slate-600 mt-2 leading-relaxed">{currentStep.description}</p>

          <div className="mt-4 space-y-2">
            {currentStep.bullets.map((bullet, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#1d355f] flex-none" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 md:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onComplete}
            className="px-3 py-2 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStepIndex(index => Math.max(0, index - 1))}
              disabled={isFirstStep}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider border transition-colors ${isFirstStep ? 'text-slate-400 border-slate-200 bg-slate-100 cursor-not-allowed' : 'text-slate-700 border-slate-300 bg-white hover:bg-slate-100'}`}
            >
              Back
            </button>

            {isLastStep ? (
              <button
                onClick={onComplete}
                className="px-4 py-2 rounded-lg text-xs md:text-sm font-black uppercase tracking-wider text-white bg-[#0f5132] hover:bg-[#146c43] transition-colors"
              >
                Got It
              </button>
            ) : (
              <button
                onClick={() => setStepIndex(index => Math.min(TUTORIAL_STEPS.length - 1, index + 1))}
                className="px-4 py-2 rounded-lg text-xs md:text-sm font-black uppercase tracking-wider text-white bg-[#1d355f] hover:bg-[#284b86] transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
