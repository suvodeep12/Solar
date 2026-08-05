import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const POOL_SIZE = 16;
/** How far behind the head the streak trails, seconds of motion */
const STREAK_SECONDS = 0.9;
const METEOR_LIFE_MIN = 1.6;
const METEOR_LIFE_MAX = 2.4;
/** Distance from the camera at spawn, scene units */
const SPAWN_DIST_MIN = 20;
const SPAWN_DIST_MAX = 80;
const METEOR_SPEED_MIN = 3;
const METEOR_SPEED_MAX = 7;
/** Seconds until the first meteor (instant wow) */
const FIRST_SPAWN_MIN = 2;
const FIRST_SPAWN_MAX = 6;
/** Seconds between subsequent meteors */
const SPAWN_GAP_MIN = 8;
const SPAWN_GAP_MAX = 20;
/** Spread of the spawn cone around the camera's forward axis (0.35 ≈ ±19°) */
const SPAWN_CONE = 0.35;
/** Forward fraction of the velocity (keeps the streak in view longer) */
const FORWARD_MIX = 0.6;

/** Seeded PRNG (mulberry32) so meteor spawns are deterministic per session. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MeteorState {
  active: boolean;
  born: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

interface MeteorLine {
  line: THREE.Line;
  state: MeteorState;
  positions: Float32Array;
  colors: Float32Array;
  material: THREE.LineBasicMaterial;
}

const HEAD_COLOR = new THREE.Color(1, 1, 1);
const TAIL_COLOR = new THREE.Color(0.9, 0.55, 0.25);

let pool: MeteorLine[] | null = null;
let rng: (() => number) | null = null;
let nextSpawnAt = -1;

function getPool(): MeteorLine[] {
  if (pool) return pool;
  pool = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const positions = new Float32Array(6);
    const colors = new Float32Array(6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 2);
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.name = `meteor_${i}`;
    line.frustumCulled = false;
    line.renderOrder = 1;
    pool.push({
      line,
      state: {
        active: false,
        born: 0,
        life: METEOR_LIFE_MAX,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
      },
      positions,
      colors,
      material,
    });
  }
  return pool;
}

const DIR = new THREE.Vector3();
const FWD = new THREE.Vector3();
const TANGENT = new THREE.Vector3();
const JITTER = new THREE.Vector3();

/**
 * Pooled shooting stars: additive line streaks with a bright head and a
 * fading tail, spawned inside the camera's view cone at random 8-20s
 * intervals. Wall-clock driven (a sky effect, not part of the sim's time).
 */
export function Meteors() {
  useFrame(({ camera, clock }, dt) => {
    const lines = getPool();
    const now = clock.elapsedTime;
    if (!rng) rng = mulberry32(0x51a7);
    const rand = rng;
    if (nextSpawnAt < 0) {
      nextSpawnAt = now + FIRST_SPAWN_MIN + rand() * (FIRST_SPAWN_MAX - FIRST_SPAWN_MIN);
    }
    if (now >= nextSpawnAt) {
      const inactive = lines.find((m) => !m.state.active);
      if (inactive) {
        const state = inactive.state;
        camera.getWorldDirection(FWD);
        let attempts = 0;
        let valid = false;
        while (!valid && attempts < 8) {
          attempts++;
          TANGENT.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1)
            .projectOnPlane(FWD)
            .normalize();
          valid = !Number.isNaN(TANGENT.x);
        }
        DIR.copy(FWD).addScaledVector(TANGENT, SPAWN_CONE).normalize();
        const dist = SPAWN_DIST_MIN + rand() * (SPAWN_DIST_MAX - SPAWN_DIST_MIN);
        state.pos.copy(camera.position).addScaledVector(DIR, dist);
        const speed = METEOR_SPEED_MIN + rand() * (METEOR_SPEED_MAX - METEOR_SPEED_MIN);
        JITTER.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).multiplyScalar(0.25 * speed);
        state.vel
          .copy(TANGENT)
          .multiplyScalar(speed)
          .addScaledVector(FWD, speed * FORWARD_MIX)
          .add(JITTER);
        state.born = now;
        state.life = METEOR_LIFE_MIN + rand() * (METEOR_LIFE_MAX - METEOR_LIFE_MIN);
        state.active = true;
      }
      nextSpawnAt = now + SPAWN_GAP_MIN + rand() * (SPAWN_GAP_MAX - SPAWN_GAP_MIN);
    }

    const head = DIR;
    const tail = JITTER;
    for (const m of lines) {
      const { state } = m;
      if (!state.active) {
        m.material.opacity = 0;
        continue;
      }
      const t = (now - state.born) / state.life;
      if (t >= 1) {
        state.active = false;
        m.material.opacity = 0;
        continue;
      }
      state.pos.addScaledVector(state.vel, dt);
      head.copy(state.pos);
      tail.copy(state.pos).addScaledVector(state.vel, -STREAK_SECONDS);
      m.positions[0] = head.x;
      m.positions[1] = head.y;
      m.positions[2] = head.z;
      m.positions[3] = tail.x;
      m.positions[4] = tail.y;
      m.positions[5] = tail.z;
      m.colors[0] = HEAD_COLOR.r;
      m.colors[1] = HEAD_COLOR.g;
      m.colors[2] = HEAD_COLOR.b;
      m.colors[3] = TAIL_COLOR.r;
      m.colors[4] = TAIL_COLOR.g;
      m.colors[5] = TAIL_COLOR.b;
      m.material.opacity = Math.sin(Math.PI * t);
      m.line.geometry.attributes.position.needsUpdate = true;
      m.line.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <>
      {getPool().map((m, i) => (
        <primitive key={i} object={m.line} />
      ))}
    </>
  );
}
