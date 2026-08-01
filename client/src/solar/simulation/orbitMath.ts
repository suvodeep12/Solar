import type { BodySpec, MoonSpec } from '../bodies/jpl.ts';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** World units per AU. Neptune ends up at 60.1 units, well inside the far clip. */
export const AU_UNIT = 2.0;

/** J2000 epoch: 2000-01-01T12:00 UTC (TT ≈ UTC for display purposes). */
export const EPOCH_JD = 2_451_545.0;
export const EPOCH_MS = Date.UTC(2000, 0, 1, 12);
export const MS_PER_DAY = 86_400_000;

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Solve Kepler's equation M = E - e sin E for the eccentric anomaly via Newton iteration. */
export function eccentricAnomaly(
  meanAnomaly: number,
  eccentricity: number,
  tolerance = 1e-9,
): number {
  let e = meanAnomaly;
  for (let i = 0; i < 64; i++) {
    const delta = (e - eccentricity * Math.sin(e) - meanAnomaly) / (1 - eccentricity * Math.cos(e));
    e -= delta;
    if (Math.abs(delta) < tolerance) break;
  }
  return e;
}

export function meanAnomalyAt(periodDays: number, tDays: number): number {
  return ((tDays / periodDays) % 1) * TAU;
}

/**
 * Position of a body on its orbital plane in AU: x toward perihelion,
 * z in the direction of motion. Units are AU; caller scales to scene.
 */
export function orbitalPlanePosition(
  semiMajorAu: number,
  eccentricity: number,
  meanAnomaly: number,
): Vec3 {
  const e = eccentricAnomaly(meanAnomaly, eccentricity);
  return {
    x: semiMajorAu * (Math.cos(e) - eccentricity),
    z: semiMajorAu * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(e),
    y: 0,
  };
}

/**
 * Position of a body in ecliptic coordinates (AU): rotate the orbital plane
 * by the inclination about the x axis (ascending node at x). y is ecliptic north.
 */
export function eclipticPosition(
  semiMajorAu: number,
  eccentricity: number,
  inclinationDeg: number,
  meanAnomaly: number,
): Vec3 {
  const p = orbitalPlanePosition(semiMajorAu, eccentricity, meanAnomaly);
  const incl = inclinationDeg * DEG;
  return {
    x: p.x,
    y: p.z * Math.sin(incl),
    z: p.z * Math.cos(incl),
  };
}

export function bodyPositionAt(spec: BodySpec, tDays: number): Vec3 {
  return eclipticPosition(
    spec.distanceAu,
    spec.eccentricity,
    spec.inclinationDeg,
    meanAnomalyAt(spec.periodDays, tDays + (spec.epochDays ?? 0)),
  );
}

export function moonPositionAt(moon: MoonSpec, orbitRadiusScene: number, tDays: number): Vec3 {
  const direction = moon.retrograde ? -1 : 1;
  const p = orbitalPlanePosition(
    orbitRadiusScene,
    0,
    meanAnomalyAt(moon.periodDays, direction * tDays),
  );
  return { x: p.x, y: 0, z: p.z };
}

/** Sample N points of an orbit (AU) for a line geometry. */
export function orbitPoints(
  semiMajorAu: number,
  eccentricity: number,
  inclinationDeg: number,
  count = 256,
): Float32Array {
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const meanAnomaly = (i / count) * TAU;
    const p = eclipticPosition(semiMajorAu, eccentricity, inclinationDeg, meanAnomaly);
    points[i * 3] = p.x * AU_UNIT;
    points[i * 3 + 1] = p.y * AU_UNIT;
    points[i * 3 + 2] = p.z * AU_UNIT;
  }
  return points;
}

/** Days since J2000 epoch to a UTC date string. */
export function dateFromDays(tDays: number): string {
  return new Date(EPOCH_MS + tDays * MS_PER_DAY).toISOString();
}
