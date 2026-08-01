import { describe, expect, it } from 'vitest';
import { cloudAlpha } from './nasa.ts';

describe('cloudAlpha', () => {
  it('is zero for pure black pixels', () => {
    expect(cloudAlpha(0)).toBe(0);
  });

  it('is monotonic in luminance', () => {
    for (let lum = 1; lum < 255; lum += 7) {
      expect(cloudAlpha(lum + 1)).toBeGreaterThanOrEqual(cloudAlpha(lum));
    }
  });

  it('keeps the brightest storm pixels translucent', () => {
    expect(cloudAlpha(232)).toBeLessThan(0.6 * 255);
    expect(cloudAlpha(255)).toBeLessThan(0.6 * 255);
  });

  it('keeps thin haze nearly invisible', () => {
    expect(cloudAlpha(55) / 255).toBeLessThan(0.05);
  });

  it('keeps typical mid clouds subtle but visible', () => {
    const a = cloudAlpha(117) / 255;
    expect(a).toBeGreaterThan(0.08);
    expect(a).toBeLessThan(0.2);
  });
});
