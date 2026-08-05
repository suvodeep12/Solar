import { findAlignmentDay } from './transits.ts';

export interface Moment {
  id: string;
  label: string;
  /** Simulated days since J2000 to jump to */
  days: number;
  /** Days/second to run at after the jump (default 1) */
  speed?: number;
  /** Land paused at the exact moment (events like transits are a blink at any speed) */
  paused?: boolean;
  /** Body to focus (null = overview) */
  focusId: string | null;
}

const SOLSTICE_JUNE = 182;

/**
 * One-click "moments": real dates + solver-found alignments. All values are
 * deterministic — a preset is a pure function of the orbital catalog.
 */
export const MOMENTS: Moment[] = [
  {
    id: 'halley',
    label: 'Halley perihelion',
    days: -5074.39,
    focusId: 'sun',
  },
  {
    id: 'june-solstice',
    label: 'June solstice',
    days: SOLSTICE_JUNE,
    focusId: 'earth',
  },
  {
    id: 'uranus-pole',
    label: 'Uranus pole-on',
    days: 0,
    focusId: 'uranus',
  },
  {
    id: 'io-transit',
    label: 'Io transit',
    // Io crosses the sun line ~every 1.77d; the window covers several transits
    // so the preset always resolves regardless of catalog tweaks. Paused at the
    // exact alignment: the shadow's on-disk window is only ~0.04 sim-days.
    days: findAlignmentDay('jupiter', 'Io', -30, 30, 0.25, 'transit') ?? 0,
    speed: 0.05,
    paused: true,
    focusId: 'jupiter',
  },
  {
    id: 'lunar-eclipse',
    label: 'Lunar eclipse',
    // Paused at deepest umbra: the darkened window is ~2.5 sim-days (~2.5s at
    // 1d/s); play reveals it over ~a minute at 0.05d/s.
    days: findAlignmentDay('earth', 'Moon', -365, 365, 0.25, 'eclipse') ?? 0,
    speed: 0.05,
    paused: true,
    focusId: 'earth',
  },
];
