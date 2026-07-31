import type { BodySpec, MoonSpec } from '../bodies/jpl.ts';

export const EARTH: BodySpec = {
  id: 'earth',
  name: 'Earth',
  kind: 'planet',
  radiusKm: 6371,
  distanceAu: 1.0,
  periodDays: 365.25,
  eccentricity: 0.0167,
  inclinationDeg: 0,
  axialTiltDeg: 23.44,
  rotationPeriodHours: 23.93,
  gravity: '9.81 m/s²',
  moonsCount: 1,
  fact: '',
  moons: [],
};

export const MOON: MoonSpec = {
  name: 'Moon',
  radiusKm: 1737.4,
  distancePlanetRadii: 60.3,
  periodDays: 27.32,
};
