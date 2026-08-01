import { describe, expect, it } from 'vitest';
import { ALL_BODIES, bodyById, moonById, moonId } from './jpl.ts';

describe('moonId', () => {
  it('namespaces the moon by its parent', () => {
    expect(moonId('jupiter', 'Io')).toBe('jupiter_io');
    expect(moonId('earth', 'Moon')).toBe('earth_moon');
  });

  it('strips non-alphanumeric characters', () => {
    expect(moonId('earth', 'The Moon')).toBe('earth_themoon');
  });
});

describe('moonById', () => {
  it('resolves a moon with its parent body', () => {
    const ref = moonById('jupiter_io');
    expect(ref?.parent.id).toBe('jupiter');
    expect(ref?.moon.name).toBe('Io');
  });

  it('resolves moons of dwarf planets', () => {
    const ref = moonById('pluto_charon');
    expect(ref?.parent.id).toBe('pluto');
    expect(ref?.moon.name).toBe('Charon');
  });

  it('returns undefined for unknown ids and for bodies', () => {
    expect(moonById('nope')).toBeUndefined();
    expect(moonById('mars')).toBeUndefined();
    expect(moonById('sun')).toBeUndefined();
  });

  it('round-trips every moon in the catalog and ids are unique', () => {
    const seen = new Set<string>();
    let count = 0;
    for (const body of ALL_BODIES) {
      if (body.kind === 'star') continue;
      for (const moon of body.moons) {
        const id = moonId(body.id, moon.name);
        expect(seen.has(id)).toBe(false);
        seen.add(id);
        count += 1;
        const ref = moonById(id);
        expect(ref?.parent.id).toBe(body.id);
        expect(ref?.moon.name).toBe(moon.name);
      }
    }
    expect(count).toBeGreaterThan(10);
    expect(seen.size).toBe(count);
  });

  it('does not collide with body ids', () => {
    const bodyIds = new Set(ALL_BODIES.map((b) => b.id));
    for (const body of ALL_BODIES) {
      if (body.kind === 'star') continue;
      for (const moon of body.moons) {
        expect(bodyIds.has(moonId(body.id, moon.name))).toBe(false);
      }
    }
    expect(bodyById('earth_moon')).toBeUndefined();
  });
});
