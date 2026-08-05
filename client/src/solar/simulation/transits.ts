import { moonById, moonId } from '../bodies/jpl.ts';
import { sceneBody, sceneMoonSpec } from '../bodies/display.ts';
import { bodyPositionAt, moonPositionAt } from './orbitMath.ts';
import { tiltedPosition } from './axialTilt.ts';

export type Alignment = 'transit' | 'eclipse';

/**
 * Find the day in [t0, t1] when a moon is best aligned with the sun as seen
 * from its parent planet — the same geometry as the live transit-spot /
 * lunar-eclipse gates in `Planet.tsx` `Moon`:
 *   - 'transit': moon between planet and sun (dot(moonDir, sunDir) → +1)
 *     e.g. Io's shadow crossing Jupiter's disk.
 *   - 'eclipse': moon in the planet's umbra (dot → −1), e.g. a total lunar
 *     eclipse on Earth.
 * Coarse scan at `stepDays`, then golden-section refine on the alignment
 * score so the returned day is accurate well past the step.
 */
export function findAlignmentDay(
  parentId: string,
  moonName: string,
  t0: number,
  t1: number,
  stepDays: number,
  alignment: Alignment = 'transit',
): number | null {
  const ref = moonById(moonId(parentId, moonName));
  if (!ref) return null;
  const parent = ref.parent;
  const planetScene = sceneBody(parent);
  const moonScene = sceneMoonSpec(ref.moon, planetScene.radiusScene);

  // Score: +1 moon dead-on the sun line (transit), −1 dead-on the anti-sun
  // line (eclipse). The sign flips so both extremes are the same maximum.
  const score = (t: number): number => {
    const sunP = bodyPositionAt(parent, t);
    const sunLen = Math.hypot(sunP.x, sunP.y, sunP.z);
    const sunDir = tiltedPosition(
      { x: -sunP.x / sunLen, y: -sunP.y / sunLen, z: -sunP.z / sunLen },
      parent.axialTiltDeg,
    );
    const moonP = moonPositionAt(ref.moon, moonScene.sceneDistance, t);
    const moonLen = Math.hypot(moonP.x, moonP.y, moonP.z);
    const dot = (moonP.x * sunDir.x + moonP.y * sunDir.y + moonP.z * sunDir.z) / moonLen;
    return alignment === 'transit' ? dot : -dot;
  };

  let best = NaN;
  let bestScore = -Infinity;
  for (let t = t0; t <= t1; t += stepDays) {
    const s = score(t);
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }
  if (!Number.isFinite(best)) return null;

  // Golden-section refine around the coarse argmax.
  let lo = Math.max(t0, best - stepDays);
  let hi = Math.min(t1, best + stepDays);
  const phi = (Math.sqrt(5) - 1) / 2;
  let c = hi - phi * (hi - lo);
  let d = lo + phi * (hi - lo);
  let sc = score(c);
  let sd = score(d);
  while (hi - lo > 1e-4) {
    if (sc > sd) {
      hi = d;
      d = c;
      sd = sc;
      c = hi - phi * (hi - lo);
      sc = score(c);
    } else {
      lo = c;
      c = d;
      sc = sd;
      d = lo + phi * (hi - lo);
      sd = score(d);
    }
  }
  return (lo + hi) / 2;
}

/** Convenience: `findAlignmentDay(..., 'transit')`. */
export function findTransitDay(
  parentId: string,
  moonName: string,
  t0: number,
  t1: number,
  stepDays: number,
): number | null {
  return findAlignmentDay(parentId, moonName, t0, t1, stepDays, 'transit');
}
