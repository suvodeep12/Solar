import { create } from 'zustand';
import { dateFromDays } from './orbitMath.ts';

export type TimeMode = 'paused' | 'simulated' | 'realtime';

export interface TimeState {
  /** Simulated days elapsed since J2000 epoch */
  days: number;
  /** Days of sim time per wall-clock second (used in 'simulated' mode) */
  speed: number;
  mode: TimeMode;
  setSpeed: (speed: number) => void;
  setMode: (mode: TimeMode) => void;
  pause: () => void;
  resume: () => void;
  togglePaused: () => void;
  reset: () => void;
  /** Advance the simulation; called by the animation loop with dt in seconds */
  tick: (dtSeconds: number) => void;
}

const DEFAULT_SPEED = 1;
/** One sim day per real second, the default "live-ish" pace */
const REALTIME_DAYS_PER_SECOND = 1 / 86_400;

export const useTimeStore = create<TimeState>((set, get) => ({
  days: 0,
  speed: DEFAULT_SPEED,
  mode: 'simulated',
  setSpeed: (speed) => set({ speed, mode: speed === 0 ? 'paused' : 'simulated' }),
  setMode: (mode) => set({ mode }),
  pause: () => set({ mode: 'paused' }),
  resume: () => set({ mode: 'simulated' }),
  togglePaused: () => {
    const { mode } = get();
    set({ mode: mode === 'paused' ? 'simulated' : 'paused' });
  },
  reset: () => set({ days: 0 }),
  tick: (dtSeconds) => {
    const { mode, speed } = get();
    if (mode === 'paused' || dtSeconds <= 0) return;
    const daysPerSecond = mode === 'realtime' ? REALTIME_DAYS_PER_SECOND : speed;
    set({ days: get().days + dtSeconds * daysPerSecond });
  },
}));

export const simDate = (days: number): string => dateFromDays(days);
