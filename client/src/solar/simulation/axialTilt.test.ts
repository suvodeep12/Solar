import { describe, expect, it } from 'vitest';
import { EARTH } from './orbitMath.fixtures.ts';
import { subSolarLatitude, tiltAngleRad, tiltedPosition, tiltAxis } from './axialTilt.ts';

describe('tiltAngleRad', () => {
  it('is negative of the tilt in radians (scene rotation-z)', () => {
    expect(tiltAngleRad(23.44)).toBeCloseTo((-23.44 * Math.PI) / 180, 9);
    expect(tiltAngleRad(0)).toBeCloseTo(0, 9);
    expect(tiltAngleRad(97.77)).toBeCloseTo((-97.77 * Math.PI) / 180, 9);
  });
});

describe('tiltAxis', () => {
  it('leans the +Y pole toward +X in the orbital frame', () => {
    const axis = tiltAxis(23.44);
    expect(axis.x).toBeCloseTo(Math.sin((23.44 * Math.PI) / 180), 9);
    expect(axis.y).toBeCloseTo(Math.cos((23.44 * Math.PI) / 180), 9);
    expect(axis.z).toBe(0);
    const len = Math.hypot(axis.x, axis.y, axis.z);
    expect(len).toBeCloseTo(1, 9);
  });

  it('lays the axis down for a 90° world like Uranus', () => {
    const axis = tiltAxis(90);
    expect(Math.abs(axis.x)).toBeCloseTo(1, 9);
    expect(axis.y).toBeCloseTo(0, 6);
  });
});

describe('tiltedPosition', () => {
  it('rotates the equatorial plane about z by the tilt', () => {
    const p = tiltedPosition({ x: 1, y: 0, z: 0 }, 90);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(-1, 9);
    expect(p.z).toBe(0);
  });

  it('maps the +Y pole onto the tilt axis', () => {
    const p = tiltedPosition({ x: 0, y: 1, z: 0 }, 23.44);
    const axis = tiltAxis(23.44);
    expect(p.x).toBeCloseTo(axis.x, 9);
    expect(p.y).toBeCloseTo(axis.y, 9);
    expect(p.z).toBeCloseTo(axis.z, 9);
  });

  it('preserves length (rigid rotation)', () => {
    for (const tilt of [23.44, 97.77, 177.4]) {
      const p = tiltedPosition({ x: 3.62, y: 0.5, z: -1.1 }, tilt);
      expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(Math.hypot(3.62, 0.5, 1.1), 9);
    }
  });
});

describe('subSolarLatitude', () => {
  it('puts the December sun over the southern hemisphere (t = 0 = Jan 1, near perihelion)', () => {
    expect(subSolarLatitude(EARTH, 0)).toBeCloseTo(-23.44, 6);
  });

  it('puts the June sun over the northern hemisphere at aphelion', () => {
    expect(subSolarLatitude(EARTH, 365.25 / 2)).toBeCloseTo(23.44, 6);
  });

  it('crosses the equator at the frame equinoxes', () => {
    expect(Math.abs(subSolarLatitude(EARTH, 365.25 / 4))).toBeLessThan(1);
    expect(Math.abs(subSolarLatitude(EARTH, (3 * 365.25) / 4))).toBeLessThan(1);
  });

  it('is ~0 for a nearly untilted body at any time', () => {
    const mercury = { ...EARTH, axialTiltDeg: 0.034 };
    for (const t of [0, 90, 200, -365.25 / 4]) {
      expect(Math.abs(subSolarLatitude(mercury, t))).toBeLessThan(0.1);
    }
  });

  it('is antisymmetric under half an orbit', () => {
    const a = subSolarLatitude(EARTH, 0);
    const b = subSolarLatitude(EARTH, 365.25 / 2);
    expect(a).toBeCloseTo(-b, 6);
  });

  it('stays within the tilt magnitude for the whole year', () => {
    let max = 0;
    for (let t = -182; t <= 182; t += 5) {
      max = Math.max(max, Math.abs(subSolarLatitude(EARTH, t)));
    }
    expect(max).toBeLessThanOrEqual(23.44 + 1e-9);
    expect(max).toBeGreaterThan(23.4);
  });
});
