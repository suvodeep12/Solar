import { describe, expect, it } from 'vitest';
import { findAlignmentDay, findTransitDay } from './transits.ts';
import { MOMENTS } from './presets.ts';
import { HALLEY } from '../bodies/comets.ts';
import { bodyPositionAt, moonPositionAt } from './orbitMath.ts';
import { sceneBody, sceneMoonSpec } from '../bodies/display.ts';
import { bodyById, moonById, moonId, PLANETS } from '../bodies/jpl.ts';
import { subSolarLatitude, tiltedPosition } from './axialTilt.ts';

/** Alignment score of a moon at day t — mirrors the live gate math. */
function alignmentAt(parentId: string, moonName: string, t: number): number {
  const ref = moonById(moonId(parentId, moonName))!;
  const parent = ref.parent;
  const planetScene = sceneBody(parent);
  const moonScene = sceneMoonSpec(ref.moon, planetScene.radiusScene);
  const sunP = bodyPositionAt(parent, t);
  const sunLen = Math.hypot(sunP.x, sunP.y, sunP.z);
  const sunDir = tiltedPosition(
    { x: -sunP.x / sunLen, y: -sunP.y / sunLen, z: -sunP.z / sunLen },
    parent.axialTiltDeg,
  );
  const moonP = moonPositionAt(ref.moon, moonScene.sceneDistance, t);
  const moonLen = Math.hypot(moonP.x, moonP.y, moonP.z);
  return (moonP.x * sunDir.x + moonP.y * sunDir.y + moonP.z * sunDir.z) / moonLen;
}

describe('findAlignmentDay', () => {
  it('finds an Io transit on the sun line (max possible for the 3.1° tilt)', () => {
    const day = findTransitDay('jupiter', 'Io', -30, 30, 0.25);
    expect(day).not.toBeNull();
    // Jupiter's axial tilt caps the in-plane alignment at cos(3.1°) ≈ 0.9985;
    // the found day must be the argmax (well above the transit gate ~0.998).
    expect(alignmentAt('jupiter', 'Io', day!)).toBeGreaterThan(0.998);
  });

  it('finds a total lunar eclipse (moon opposite the sun)', () => {
    const day = findAlignmentDay('earth', 'Moon', -365, 365, 0.25, 'eclipse');
    expect(day).not.toBeNull();
    expect(alignmentAt('earth', 'Moon', day!)).toBeCloseTo(-1, 4);
  });

  it('returns a day inside the search window', () => {
    const day = findTransitDay('jupiter', 'Io', -30, 30, 0.25);
    expect(day!).toBeGreaterThanOrEqual(-30);
    expect(day!).toBeLessThanOrEqual(30);
  });

  it('returns null for an unknown moon', () => {
    expect(findTransitDay('earth', 'Nope', -10, 10, 0.25)).toBeNull();
  });

  it('is deterministic across calls', () => {
    const a = findTransitDay('jupiter', 'Io', -30, 30, 0.25);
    const b = findTransitDay('jupiter', 'Io', -30, 30, 0.25);
    expect(a).toBe(b);
  });
});

describe('MOMENTS', () => {
  it('halley perihelion matches the catalog epoch', () => {
    const halley = MOMENTS.find((m) => m.id === 'halley')!;
    const epochDays = HALLEY.epochDays as number;
    expect(halley.days).toBe(-epochDays);
    expect(halley.focusId).toBe('sun');
  });

  it('june solstice has the sub-solar point at +23.44°', () => {
    const moment = MOMENTS.find((m) => m.id === 'june-solstice')!;
    const earth = PLANETS.find((p) => p.id === 'earth')!;
    expect(subSolarLatitude(earth, moment.days)).toBeCloseTo(23.44, 1);
  });

  it('every solver-based preset is a real alignment', () => {
    const io = MOMENTS.find((m) => m.id === 'io-transit')!;
    expect(alignmentAt('jupiter', 'Io', io.days)).toBeGreaterThan(0.998);
    const eclipse = MOMENTS.find((m) => m.id === 'lunar-eclipse')!;
    expect(alignmentAt('earth', 'Moon', eclipse.days)).toBeLessThan(-0.99);
  });

  it('all presets focus a selectable body or overview', () => {
    for (const m of MOMENTS) {
      if (m.focusId === null) continue;
      expect(bodyById(m.focusId) ?? moonById(m.focusId)).toBeDefined();
    }
  });
});
