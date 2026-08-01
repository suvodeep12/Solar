import type { BodySpec } from './jpl.ts';

/**
 * Comet 1P/Halley — real JPL elements (retrograde, i = 162.26°).
 * Not selectable and not part of ALL_BODIES: a pure visual (like the belts).
 * epochDays shifts the mean anomaly so perihelion lands on 1986-02-09.
 */
export const HALLEY: BodySpec = {
  id: 'halley',
  name: 'Halley',
  kind: 'dwarf',
  radiusKm: 5.5,
  distanceAu: 17.834,
  periodDays: 27_505,
  eccentricity: 0.9671429,
  inclinationDeg: 162.26,
  axialTiltDeg: 0,
  rotationPeriodHours: 52.5,
  epochDays: 5_074.39,
  gravity: '0 m/s²',
  moonsCount: 0,
  fact: 'Every 75 years the most famous comet of all sweeps past the Sun on a 1.2-unit-wide orbit.',
  moons: [],
};
