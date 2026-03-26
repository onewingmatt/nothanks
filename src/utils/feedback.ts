type FeedbackEvent = 'game-start' | 'turn-change' | 'pass' | 'take' | 'game-over';

const canUseWindow = typeof window !== 'undefined';

class FeedbackEngine {
  private context: AudioContext | null = null;

  private readonly hapticPatterns: Record<FeedbackEvent, number | number[]> = {
    'game-start': [70, 40, 120],
    'turn-change': 50,
    'pass': 55,
    'take': [70, 45, 120],
    'game-over': [90, 50, 90, 50, 160],
  };

  supportsHaptics(): boolean {
    return canUseWindow && typeof navigator.vibrate === 'function';
  }

  private ensureContext(): AudioContext | null {
    if (!canUseWindow) return null;

    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      this.context = new AudioContextClass();
    }

    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {
        // Ignore resume errors; user gesture requirements vary by browser.
      });
    }

    return this.context;
  }

  private playTone(
    frequency: number,
    durationSeconds: number,
    type: OscillatorType,
    gainValue: number,
    delaySeconds = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySeconds;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + durationSeconds + 0.02);
  }

  play(event: FeedbackEvent, enabled: boolean) {
    if (!enabled) return;

    switch (event) {
      case 'game-start':
        this.playTone(392, 0.08, 'triangle', 0.04);
        this.playTone(523.25, 0.12, 'triangle', 0.035, 0.07);
        break;
      case 'turn-change':
        this.playTone(329.63, 0.06, 'sine', 0.025);
        break;
      case 'pass':
        this.playTone(180, 0.05, 'square', 0.02);
        break;
      case 'take':
        this.playTone(246.94, 0.07, 'triangle', 0.035);
        this.playTone(369.99, 0.09, 'triangle', 0.03, 0.04);
        break;
      case 'game-over':
        this.playTone(523.25, 0.09, 'triangle', 0.035);
        this.playTone(659.25, 0.11, 'triangle', 0.032, 0.07);
        this.playTone(783.99, 0.16, 'triangle', 0.03, 0.14);
        break;
      default:
        break;
    }
  }

  vibrate(event: FeedbackEvent, enabled: boolean): boolean {
    if (!enabled || !this.supportsHaptics()) return false;

    return navigator.vibrate(this.hapticPatterns[event]);
  }

  testHaptics(enabled: boolean): boolean {
    if (!enabled || !this.supportsHaptics()) return false;

    return navigator.vibrate([180, 80, 260]);
  }
}

export const feedbackEngine = new FeedbackEngine();
