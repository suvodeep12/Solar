import { describe, expect, it } from 'vitest';
import { DWARF_PLANETS, PLANETS } from '../bodies/jpl.ts';
import { sceneBody, sunRadiusScene } from '../bodies/display.ts';

describe('display scaling', () => {
  it('keeps the Sun larger than every body', () => {
    const sun = sunRadiusScene();
    for (const spec of [...PLANETS, ...DWARF_PLANETS]) {
      expect(sceneBody(spec).radiusScene).toBeLessThan(sun);
    }
  });

  it('orders gas giants above rocky worlds', () => {
    const byId = (id: string) => sceneBody(PLANETS.find((p) => p.id === id)!);
    expect(byId('jupiter').radiusScene).toBeGreaterThan(byId('earth').radiusScene);
    expect(byId('jupiter').radiusScene).toBeGreaterThan(byId('mercury').radiusScene);
  });

  it('scales distance linearly with AU', () => {
    const earth = sceneBody(PLANETS.find((p) => p.id === 'earth')!);
    const saturn = sceneBody(PLANETS.find((p) => p.id === 'saturn')!);
    expect(saturn.distanceScene).toBeCloseTo(earth.distanceScene * 9.537, 3);
  });

  it('keeps every radius above the visibility floor', () => {
    for (const spec of [...PLANETS, ...DWARF_PLANETS]) {
      expect(sceneBody(spec).radiusScene).toBeGreaterThanOrEqual(0.06);
    }
  });

  it('keeps Saturn ring edges sane and outside the planet', () => {
    const saturn = sceneBody(PLANETS.find((p) => p.id === 'saturn')!);
    expect(saturn.ringInnerScene).toBeDefined();
    expect(saturn.ringOuterScene).toBeDefined();
    expect(saturn.ringInnerScene!).toBeGreaterThan(saturn.radiusScene);
    expect(saturn.ringOuterScene!).toBeGreaterThan(saturn.ringInnerScene!);
  });

  it('gives moons a visible radius with a sane orbit', () => {
    const earth = sceneBody(PLANETS.find((p) => p.id === 'earth')!);
    const moon = earth.moons[0];
    expect(moon.sceneRadius).toBeGreaterThan(0.01);
    expect(moon.sceneDistance).toBeGreaterThan(earth.radiusScene);
  });
});
