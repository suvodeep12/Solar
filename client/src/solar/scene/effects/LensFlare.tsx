import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Classic lens-flare sprite chain along the sun→screen-center axis: an
 * anamorphic streak at the sun plus a row of tinted ghosts (some past the
 * screen center). The whole flare is hidden at screen center and fades in
 * as the sun drifts toward the view edge — the reward for dragging the sun
 * to the edge of frame. Additive, depth-ignored, kept below the bloom
 * threshold (0.85) so it never washes out.
 */

/** Axis position: 0 = the sun, 1 = screen center, >1 = past center */
interface FlareElement {
  sprite: THREE.Sprite;
  t: number;
  /** Size as a fraction of screen width */
  sizeX: number;
  /** Size as a fraction of screen height */
  sizeY: number;
  /** Base opacity (strength scales it) */
  opacity: number;
  shimmerPhase: number;
}

function makeGhostTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeRingTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.3, 'rgba(255,255,255,0)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.68, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const GHOST_TEX = makeGhostTexture();
const RING_TEX = makeRingTexture();

interface FlareSpec {
  t: number;
  sizeX: number;
  sizeY: number;
  opacity: number;
  color: string;
  ring?: boolean;
}

const SPECS: FlareSpec[] = [
  { t: 0, sizeX: 0.34, sizeY: 0.02, opacity: 0.5, color: '#cfe9ff' },
  { t: 0, sizeX: 0.1, sizeY: 0.1, opacity: 0.16, color: '#fff4d8' },
  { t: 0.42, sizeX: 0.055, sizeY: 0.055, opacity: 0.3, color: '#9fd8ff' },
  { t: 0.7, sizeX: 0.035, sizeY: 0.035, opacity: 0.26, color: '#ffd2ec' },
  { t: 1, sizeX: 0.025, sizeY: 0.025, opacity: 0.22, color: '#ffffff' },
  { t: 1.32, sizeX: 0.045, sizeY: 0.045, opacity: 0.16, color: '#a9e6ff' },
  { t: 1.6, sizeX: 0.075, sizeY: 0.075, opacity: 0.12, color: '#ffd9a8' },
  { t: 1.55, sizeX: 0.11, sizeY: 0.11, opacity: 0.08, color: '#9fd0ff', ring: true },
];

let elements: FlareElement[] | null = null;

function getFlare(): FlareElement[] {
  if (elements) return elements;
  elements = SPECS.map((spec, i) => {
    const material = new THREE.SpriteMaterial({
      map: spec.ring ? RING_TEX : GHOST_TEX,
      color: spec.color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = spec.ring ? 'flare_ring' : i === 0 ? 'flare_streak' : `flare_ghost${i}`;
    sprite.renderOrder = 9;
    sprite.visible = false;
    sprite.frustumCulled = false;
    return {
      sprite,
      t: spec.t,
      sizeX: spec.sizeX,
      sizeY: spec.sizeY,
      opacity: spec.opacity,
      shimmerPhase: i * 0.9,
    };
  });
  return elements;
}

const SUN_NDC = new THREE.Vector3();
const GHOST_NDC = new THREE.Vector3();
const DELTA_WORLD = new THREE.Vector3();

/** NDC distance from center at which the sun is considered off-screen */
const OFF_SCREEN_DIST = 1.05;

export function LensFlare() {
  useFrame(({ camera, clock }) => {
    const flare = getFlare();
    SUN_NDC.set(0, 0, 0).project(camera);
    const dist = Math.hypot(SUN_NDC.x, SUN_NDC.y);
    const offScreen = SUN_NDC.z > 1 || dist > OFF_SCREEN_DIST;
    if (offScreen) {
      for (const e of flare) e.sprite.visible = false;
      return;
    }
    // Strength grows as the sun leaves center; fade at the very edge so it
    // never pops in or out abruptly (reaches 0 at the off-screen cutoff).
    const strength = Math.min(1, dist * 1.25);
    const fade = Math.max(0, Math.min(1, (OFF_SCREEN_DIST - dist) / 0.25));
    for (const e of flare) {
      const ax = SUN_NDC.x * (1 - e.t);
      const ay = SUN_NDC.y * (1 - e.t);
      GHOST_NDC.set(ax, ay, 0.5).unproject(camera);
      e.sprite.position.copy(GHOST_NDC);
      DELTA_WORLD.set(ax + e.sizeX * 2, ay, 0.5).unproject(camera);
      const sx = DELTA_WORLD.distanceTo(GHOST_NDC);
      DELTA_WORLD.set(ax, ay + e.sizeY * 2, 0.5).unproject(camera);
      const sy = DELTA_WORLD.distanceTo(GHOST_NDC);
      e.sprite.scale.set(sx, sy, 1);
      const shimmer = 0.92 + 0.08 * Math.sin(clock.elapsedTime * 1.7 + e.shimmerPhase);
      e.sprite.material.opacity = e.opacity * strength * fade * shimmer;
      e.sprite.visible = true;
    }
  });

  return (
    <>
      {getFlare().map((e, i) => (
        <primitive key={i} object={e.sprite} />
      ))}
    </>
  );
}
