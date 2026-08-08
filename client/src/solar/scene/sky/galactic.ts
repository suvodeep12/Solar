import * as THREE from 'three';
import { mulberry32 } from './random.ts';

/**
 * The galactic frame. The Milky Way band is painted on a back-side sphere
 * rotated by GALACTIC_EULER (band runs along the sphere's local XZ equator,
 * local +Y is the band normal). Every galactic layer (backdrop, 3D star
 * volume, glow shells, dust lanes) shares this frame so they align by
 * construction — the "traversable galaxy" is a stack of real 3D layers.
 */
export const GALACTIC_EULER = new THREE.Euler(1.047, 2.4, 0);
export const GALACTIC_QUAT = new THREE.Quaternion().setFromEuler(GALACTIC_EULER);

/** World-space unit normal of the galactic plane (local +Y rotated). */
export const GALACTIC_NORMAL = new THREE.Vector3(0, 1, 0).applyQuaternion(GALACTIC_QUAT);

/** Direction in the band plane toward the bright galactic center/bulge
 *  (local XZ, unit length). Pinned empirically against the ESO panorama
 *  (the bright bulge sits near the image's horizontal center → local −X). */
export const GALACTIC_CENTER_DIR_LOCAL = new THREE.Vector3(-1, 0, 0);

export const GALACTIC_CENTER_DIR = GALACTIC_CENTER_DIR_LOCAL.clone().applyQuaternion(GALACTIC_QUAT);

const DISK_MIN_R = 70;
const DISK_MAX_R = 320;
const DISK_THICKNESS = 0.13;
const BULGE_BAND_RAD = 0.7;

/** Temperature palette for galactic stars: mostly faint cool whites, some
 *  warm amber, a few hot blue. Brightness is applied separately (tasteful —
 *  the 3D cloud must never compete with the planets). */
const GALACTIC_COLORS: [number, number, number][] = [
  [0.92, 0.95, 1.0],
  [0.75, 0.82, 1.0],
  [1.0, 0.95, 0.88],
  [1.0, 0.88, 0.7],
  [0.65, 0.75, 1.0],
];

/** One instanced point sprite's vertex data. */
function makeGeometry(attrs: Float32Array): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(attrs, 3));
  return geometry;
}

/**
 * The galactic star volume: a thin, flaring disk of instanced points in the
 * band plane (radius 70–320 — past the Kuiper belt, inside the 600 far
 * plane). Because the camera sits inside this volume, the band parallaxes on
 * translation and flying toward it literally enters the star cloud.
 */
export function buildGalacticStars(count = 45_000, seed = 0x6a1a): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const centerAngle = Math.atan2(GALACTIC_CENTER_DIR_LOCAL.z, GALACTIC_CENTER_DIR_LOCAL.x);

  for (let i = 0; i < count; i++) {
    // Radius: biased outward (u^1.4) so the visible band holds plenty of stars.
    const u = rand();
    const r = DISK_MIN_R + (DISK_MAX_R - DISK_MIN_R) * Math.pow(u, 1.4);
    // Thickness: flaring disk, |y| ≤ ~0.13·r (triangular-ish distribution).
    const y = (rand() + rand() - 1) * DISK_THICKNESS * r;
    // Angle: ~55% of stars concentrate toward the galactic center (the bulge).
    let theta: number;
    if (rand() < 0.55) {
      theta = centerAngle + (rand() * 2 - 1) * BULGE_BAND_RAD;
    } else {
      theta = rand() * Math.PI * 2;
    }
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * r;

    // A few bright beacons along the band for eye-candy.
    const beacon = rand() < 0.005;
    sizes[i] = beacon ? 2.6 + rand() * 1.0 : 1.2 + rand() * 1.9;
    twinkles[i] = rand() * Math.PI * 2;
    const pick = rand();
    const color = beacon
      ? GALACTIC_COLORS[1 + Math.floor(rand() * 2)]
      : GALACTIC_COLORS[Math.floor(pick * GALACTIC_COLORS.length) % GALACTIC_COLORS.length];
    const bright = beacon ? 0.75 + rand() * 0.15 : 0.18 + rand() * 0.37;
    colors[i * 3] = color[0] * bright;
    colors[i * 3 + 1] = color[1] * bright;
    colors[i * 3 + 2] = color[2] * bright;
  }

  const geometry = makeGeometry(positions);
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export interface GlowShell {
  radius: number;
  spread: number;
  size: number;
  alphaMin: number;
  alphaMax: number;
}

/**
 * Large soft nebula-glow sprites in three depth shells along the band. On
 * translation the shells separate — the band itself reads as layered gas
 * instead of a painted backdrop. Additive, very faint.
 */
export const GLOW_SHELLS: GlowShell[] = [
  { radius: 140, spread: 18, size: 55, alphaMin: 0.03, alphaMax: 0.055 },
  { radius: 210, spread: 24, size: 80, alphaMin: 0.025, alphaMax: 0.045 },
  { radius: 300, spread: 30, size: 110, alphaMin: 0.02, alphaMax: 0.035 },
];

export function buildGalacticGlow(count = 1_500, seed = 0x9c01): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const centerAngle = Math.atan2(GALACTIC_CENTER_DIR_LOCAL.z, GALACTIC_CENTER_DIR_LOCAL.x);
  const perShell = Math.ceil(count / GLOW_SHELLS.length);

  for (let i = 0; i < count; i++) {
    const shell = GLOW_SHELLS[Math.min(GLOW_SHELLS.length - 1, Math.floor(i / perShell))];
    const r = shell.radius + (rand() * 2 - 1) * shell.spread;
    // Gas clouds are thicker than the star disk.
    const y = (rand() + rand() - 1) * 0.22 * r;
    // Clump toward the bulge: 65% within ~45° of the center direction.
    let theta: number;
    if (rand() < 0.65) {
      theta = centerAngle + (rand() * 2 - 1) * 0.8;
    } else {
      theta = rand() * Math.PI * 2;
    }
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * r;

    sizes[i] = shell.size * (0.8 + rand() * 0.4);
    alphas[i] = shell.alphaMin + rand() * (shell.alphaMax - shell.alphaMin);
    const warm = rand() < 0.3;
    const c = warm ? [1.0, 0.85, 0.62] : [0.68, 0.76, 1.0];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }

  const geometry = makeGeometry(positions);
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Foreground dust lanes: soft NORMAL-blended dark sprites straddling the
 * band. They darken the backdrop (and the glow) from a real 3D position, so
 * the Milky Way's signature dark streaks shift with parallax while flying.
 */
export function buildGalacticDust(count = 600, seed = 0xd5a7): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);

  const centerAngle = Math.atan2(GALACTIC_CENTER_DIR_LOCAL.z, GALACTIC_CENTER_DIR_LOCAL.x);

  for (let i = 0; i < count; i++) {
    const r = 90 + rand() * 170;
    const y = (rand() + rand() - 1) * 0.24 * r;
    // Dust clumps loosely follow the band, biased to the far side of the
    // center (the Great Rift region lives toward Sagittarius).
    let theta: number;
    if (rand() < 0.7) {
      theta = centerAngle + (rand() * 2 - 1) * 1.1;
    } else {
      theta = rand() * Math.PI * 2;
    }
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * r;

    sizes[i] = 30 + rand() * 70;
    alphas[i] = 0.05 + rand() * 0.11;
  }

  const geometry = makeGeometry(positions);
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  return geometry;
}

/** Shader uniforms shared by the galactic point layers. */
export const GALACTIC_UNIFORMS = {
  uTime: { value: 0 },
};
