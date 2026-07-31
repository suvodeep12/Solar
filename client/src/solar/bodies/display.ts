import type { BodySpec, MoonSpec } from './jpl.ts';
import { AU_UNIT } from '../simulation/orbitMath.ts';

/**
 * World units per km. Chosen so Jupiter lands at ~0.49 scene units;
 * small bodies sit on a visibility floor of 0.06.
 */
const KM_UNIT = 7e-6;
const MIN_RADIUS = 0.06;
/** Moons below this radius are invisible; floor them instead. */
const MIN_MOON_RADIUS = 0.015;

export interface SceneMoonSpec extends MoonSpec {
  sceneRadius: number;
  sceneDistance: number;
}

export interface SceneBodySpec {
  id: string;
  name: string;
  kind: BodySpec['kind'];
  distanceScene: number;
  radiusScene: number;
  ringInnerScene?: number;
  ringOuterScene?: number;
  moons: SceneMoonSpec[];
}

function sceneMoon(moon: MoonSpec, planetRadiusScene: number): SceneMoonSpec {
  const ratio = Math.min(0.08, Math.max(0.03, moon.radiusKm / 3_400));
  return {
    ...moon,
    sceneRadius: Math.max(MIN_MOON_RADIUS, planetRadiusScene * ratio),
    sceneDistance: planetRadiusScene * moon.distancePlanetRadii,
  };
}

export function sceneBody(spec: BodySpec): SceneBodySpec {
  const radiusScene = Math.max(MIN_RADIUS, spec.radiusKm * KM_UNIT);
  return {
    id: spec.id,
    name: spec.name,
    kind: spec.kind,
    distanceScene: spec.distanceAu * AU_UNIT,
    radiusScene,
    ringInnerScene: spec.ring ? (spec.ring.innerKm / spec.radiusKm) * radiusScene : undefined,
    ringOuterScene: spec.ring ? (spec.ring.outerKm / spec.radiusKm) * radiusScene : undefined,
    moons: spec.moons.map((m) => sceneMoon(m, radiusScene)),
  };
}

/** Fixed visual size: a glowing star, larger than every planet, smaller than Mercury's orbit. */
export function sunRadiusScene(): number {
  return 0.55;
}
