import { describe, expect, it } from 'vitest';
import {
  bodyPositionAt,
  dateFromDays,
  eccentricAnomaly,
  meanAnomalyAt,
  moonPositionAt,
  orbitalPlanePosition,
  orbitPoints,
} from './orbitMath.ts';
import { EARTH, MOON } from './orbitMath.fixtures.ts';

const TAU = Math.PI * 2;

describe('eccentricAnomaly', () => {
  it('returns the mean anomaly unchanged for circular orbits', () => {
    expect(eccentricAnomaly(0, 0)).toBeCloseTo(0, 9);
    expect(eccentricAnomaly(Math.PI, 0)).toBeCloseTo(Math.PI, 9);
    expect(eccentricAnomaly(TAU * 0.3, 0)).toBeCloseTo(TAU * 0.3, 9);
  });

  it('solves the Kepler equation for eccentric orbits', () => {
    for (const e of [0.1, 0.5, 0.9]) {
      for (const m of [0.1, 1.2, 3.0, 5.0]) {
        const eAnom = eccentricAnomaly(m, e);
        expect(eAnom - e * Math.sin(eAnom)).toBeCloseTo(m, 6);
      }
    }
  });

  it('handles the perihelion singularity (M = 0)', () => {
    expect(eccentricAnomaly(0, 0.9)).toBeCloseTo(0, 6);
  });
});

describe('meanAnomalyAt', () => {
  it('wraps periods and is zero at epoch and full periods', () => {
    expect(meanAnomalyAt(365.25, 0)).toBeCloseTo(0, 9);
    expect(meanAnomalyAt(365.25, 365.25)).toBeCloseTo(0, 9);
    expect(meanAnomalyAt(365.25, 730.5)).toBeCloseTo(0, 9);
  });

  it('reaches a quarter orbit at a quarter period', () => {
    expect(meanAnomalyAt(365.25, 365.25 / 4)).toBeCloseTo(Math.PI / 2, 9);
  });

  it('accepts negative time (pre-epoch)', () => {
    expect(meanAnomalyAt(365.25, -365.25 / 4) + Math.PI / 2).toBeCloseTo(0, 9);
  });
});

describe('orbitalPlanePosition', () => {
  it('places a circular orbit on the x axis at perihelion', () => {
    const p = orbitalPlanePosition(1, 0, 0);
    expect(p.x).toBeCloseTo(1, 9);
    expect(p.z).toBeCloseTo(0, 9);
    expect(p.y).toBe(0);
  });

  it('keeps a circular orbit at constant radius', () => {
    const p = orbitalPlanePosition(1, 0, Math.PI / 2);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(1, 9);
  });

  it('satisfies r = a(1 - e cos E)', () => {
    const a = 39.48;
    const e = 0.2488;
    const m = 2.0;
    const eAnom = eccentricAnomaly(m, e);
    const p = orbitalPlanePosition(a, e, m);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(a * (1 - e * Math.cos(eAnom)), 6);
  });
});

describe('bodyPositionAt', () => {
  it('puts Earth at perihelion (~0.98 AU) at epoch', () => {
    const p = bodyPositionAt(EARTH, 0);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1 - 0.0167, 2);
  });

  it('returns to the start after one period', () => {
    const p0 = bodyPositionAt(EARTH, 0);
    const p1 = bodyPositionAt(EARTH, EARTH.periodDays);
    expect(p0.x).toBeCloseTo(p1.x, 6);
    expect(p0.y).toBeCloseTo(p1.y, 6);
    expect(p0.z).toBeCloseTo(p1.z, 6);
  });

  it('keeps inclined orbits above the ecliptic somewhere', () => {
    const p = bodyPositionAt(EARTH, EARTH.periodDays / 4);
    const r = Math.hypot(p.x, p.y, p.z);
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThan(1.5);
  });
});

describe('moonPositionAt', () => {
  it('orbits at the given radius', () => {
    const radius = 0.0124 * MOON.distancePlanetRadii;
    const p = moonPositionAt(MOON, radius, 0);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(radius, 6);
  });

  it('counter-orbits for retrograde moons', () => {
    const retrograde = { ...MOON, retrograde: true };
    const radius = 0.0124 * MOON.distancePlanetRadii;
    const p0 = moonPositionAt(retrograde, radius, 0);
    const p1 = moonPositionAt(retrograde, radius, retrograde.periodDays / 4);
    const cross = p0.x * p1.z - p0.z * p1.x;
    expect(Math.sign(cross)).toBe(-1);
  });
});

describe('orbitPoints', () => {
  it('produces count * 3 finite scene-space points', () => {
    const points = orbitPoints(1, 0.0167, 0, 256);
    expect(points.length).toBe(256 * 3);
    for (const v of points) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('scales to scene units (2 world units per AU)', () => {
    const points = orbitPoints(1, 0, 0, 256);
    expect(Math.hypot(points[0], points[1], points[2])).toBeCloseTo(2, 6);
  });

  it('starts at perihelion', () => {
    const points = orbitPoints(5.203, 0.0489, 0, 256);
    const start = Math.hypot(points[0], points[1], points[2]);
    const aphelion = 5.203 * (1 + 0.0489) * 2;
    const perihelion = 5.203 * (1 - 0.0489) * 2;
    expect(Math.abs(start - perihelion)).toBeLessThan(Math.abs(start - aphelion));
  });
});

describe('dateFromDays', () => {
  it('starts at the J2000 epoch', () => {
    expect(dateFromDays(0)).toBe('2000-01-01T12:00:00.000Z');
  });

  it('advances one day per day', () => {
    expect(dateFromDays(1)).toBe('2000-01-02T12:00:00.000Z');
    // 2000 is a leap year: 365 days later is Dec 31, 366 is Jan 1 2001
    expect(dateFromDays(365)).toBe('2000-12-31T12:00:00.000Z');
    expect(dateFromDays(366)).toBe('2001-01-01T12:00:00.000Z');
  });
});
