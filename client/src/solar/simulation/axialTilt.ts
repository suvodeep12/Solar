import type { BodySpec } from '../bodies/jpl.ts';
import { bodyPositionAt, type Vec3 } from './orbitMath.ts';

const DEG = Math.PI / 180;

/**
 * Scene angle for a body group's tilt: `rotation-z = tiltAngleRad(...)`.
 * Negative so the +Y pole leans toward +X in the orbital frame — the
 * December (perihelion-side) sun sits at −X, leaving the north pole
 * pointed away from it, matching the real sub-solar latitude sign.
 */
export function tiltAngleRad(axialTiltDeg: number): number {
  return (-axialTiltDeg * Math.PI) / 180;
}

/** Rotation axis of a body after applying its axial tilt (unit vector).
 * Rotating the +Y pole by the scene angle t about z yields (−sin t, cos t, 0). */
export function tiltAxis(axialTiltDeg: number): Vec3 {
  const t = tiltAngleRad(axialTiltDeg);
  return { x: -Math.sin(t), y: Math.cos(t), z: 0 };
}

/** Rotate a local position about z by the body's tilt (scene convention). */
export function tiltedPosition(local: Vec3, axialTiltDeg: number): Vec3 {
  const t = tiltAngleRad(axialTiltDeg);
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return {
    x: local.x * cos - local.y * sin,
    y: local.x * sin + local.y * cos,
    z: local.z,
  };
}

/**
 * Latitude of the point directly under the sun, degrees, + = toward the
 * tilted +Y pole. −23.4 at the December solstice, +23.4 in June for Earth.
 */
export function subSolarLatitude(spec: BodySpec, tDays: number): number {
  const pos = bodyPositionAt(spec, tDays);
  const len = Math.hypot(pos.x, pos.y, pos.z);
  const axis = tiltAxis(spec.axialTiltDeg);
  const dot = (axis.x * -pos.x + axis.y * -pos.y + axis.z * -pos.z) / len;
  return Math.asin(Math.max(-1, Math.min(1, dot))) / DEG;
}
