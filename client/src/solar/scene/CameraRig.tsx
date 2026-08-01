import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { bodyById, moonById } from '../bodies/jpl.ts';
import { sceneBody, sceneMoonSpec, sunRadiusScene } from '../bodies/display.ts';
import { AU_UNIT, bodyPositionAt, moonPositionAt } from '../simulation/orbitMath.ts';
import { tiltedPosition } from '../simulation/axialTilt.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';

const OVERVIEW_DIST = Math.sqrt(18 * 18 + 36 * 36);
const FLY_DURATION = 1.3;

interface Fly {
  fromDist: number;
  toDist: number;
  /** Unit vector from the click-time camera toward the target */
  dir: THREE.Vector3;
  /** Wall-clock seconds when the fly started */
  t0: number;
}

type TargetKind = 'star' | 'planet' | 'moon';

/** World position + viewing distance for any selectable target (star,
 *  planet/dwarf, or moon — moons live in the parent's tilted frame). */
function resolveTarget(
  id: string,
  days: number,
): { pos: THREE.Vector3; dist: number; kind: TargetKind } | null {
  const body = bodyById(id);
  if (body) {
    if (body.kind === 'star') {
      return {
        pos: new THREE.Vector3(0, 0, 0),
        dist: Math.max(sunRadiusScene() * 12, 0.8),
        kind: 'star',
      };
    }
    const scene = sceneBody(body);
    const p = bodyPositionAt(body, days);
    return {
      pos: new THREE.Vector3(p.x * AU_UNIT, p.y * AU_UNIT, p.z * AU_UNIT),
      dist: Math.max(scene.radiusScene * 12, 0.8),
      kind: 'planet',
    };
  }
  const ref = moonById(id);
  if (!ref) return null;
  const planetScene = sceneBody(ref.parent);
  const moonScene = sceneMoonSpec(ref.moon, planetScene.radiusScene);
  const planetP = bodyPositionAt(ref.parent, days);
  const local = moonPositionAt(ref.moon, moonScene.sceneDistance, days);
  const offset = tiltedPosition(local, ref.parent.axialTiltDeg);
  return {
    pos: new THREE.Vector3(
      planetP.x * AU_UNIT + offset.x,
      planetP.y * AU_UNIT + offset.y,
      planetP.z * AU_UNIT + offset.z,
    ),
    dist: Math.max(moonScene.sceneRadius * 12, 0.6),
    kind: 'moon',
  };
}

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const selectedId = useUiStore((s) => s.selectedId);
  const focusTick = useUiStore((s) => s.focusTick);
  const focus = useRef({
    pos: new THREE.Vector3(0, 0, 0),
    targetDist: OVERVIEW_DIST,
    fly: null as Fly | null,
  });
  const currentTarget = useRef(new THREE.Vector3());
  const prevMoon = useRef<THREE.Vector3 | null>(null);
  /** Any OrbitControls gesture (rotate/zoom/pan) in flight — the follow's
   *  target-lerp must not fight the user mid-gesture. */
  const interacting = useRef(false);
  /** Wall-clock seconds until the follow may re-center again after a manual
   *  pan: pans stick for ~3s after release, then gently re-aim at the body. */
  const panPauseUntil = useRef(0);

  useEffect(() => {
    const f = focus.current;
    if (selectedId === null) {
      f.pos.set(0, 0, 0);
      f.targetDist = OVERVIEW_DIST;
      f.fly = null;
      return;
    }
    const target = resolveTarget(selectedId, useTimeStore.getState().days);
    if (!target) return;
    f.pos.copy(target.pos);
    f.targetDist = target.dist;
    // A new fly is a fresh intent: drop any pending pan pause so the follow
    // re-aims immediately once the fly lands (else the target stays stale
    // at the pre-pan position until the pause expires).
    interacting.current = false;
    panPauseUntil.current = 0;
    const camera = controlsRef.current?.object;
    if (!camera) return;
    const fromPos = camera.position;
    const delta = f.pos.clone().sub(fromPos);
    const fromDist = Math.max(delta.length(), 1e-3);
    f.fly = {
      fromDist,
      toDist: f.targetDist,
      dir: delta.normalize(),
      t0: performance.now() / 1000,
    };
  }, [selectedId, focusTick]);

  useFrame(({ camera }, dt) => {
    const f = focus.current;
    const controls = controlsRef.current;

    const target =
      selectedId !== null ? resolveTarget(selectedId, useTimeStore.getState().days) : null;
    if (target) f.pos.copy(target.pos);

    // Moons sweep around their parent fast (days, not years): delta-follow
    // the moon's displacement so the camera stays glued to it without
    // fighting OrbitControls' wheel/rotate (which own camera.pos). The
    // currentTarget must track the same displacement or it lags the moon by
    // the in-gesture distance (pivot swings on rotate, pan false-positives).
    if (target?.kind === 'moon' && !f.fly && prevMoon.current) {
      const delta = f.pos.clone().sub(prevMoon.current);
      if (delta.lengthSq() > 1e-14) {
        camera.position.add(delta);
        currentTarget.current.add(delta);
      }
    }
    prevMoon.current = target?.kind === 'moon' ? f.pos.clone() : null;

    const now = performance.now() / 1000;
    if (!interacting.current && now > panPauseUntil.current) {
      currentTarget.current.lerp(f.pos, 1 - Math.exp(-dt * 3));
    }
    // The exponential chase never quite reaches f.pos, and moons outpace the
    // 3/s lerp entirely (target would lag the body by speed/3, swinging the
    // view on rotate and false-flagging pans). Once close, snap so the follow
    // is exact — runs during gestures too so wheel/rotate pivot around the body.
    if (currentTarget.current.distanceTo(f.pos) < 0.01) {
      currentTarget.current.copy(f.pos);
    }
    if (controls) {
      if (f.fly) {
        const elapsed = performance.now() / 1000 - f.fly.t0;
        const t = Math.min(1, elapsed / FLY_DURATION);
        const ease = 1 - Math.pow(1 - t, 3);
        const dist = THREE.MathUtils.lerp(f.fly.fromDist, f.fly.toDist, ease);
        camera.position.copy(f.pos).addScaledVector(f.fly.dir, -dist);
        if (t >= 1) f.fly = null;
      }
      controls.target.copy(currentTarget.current);
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={0.6}
      maxDistance={140}
      onStart={() => {
        focus.current.fly = null;
        interacting.current = true;
        panPauseUntil.current = performance.now() / 1000 + 3;
      }}
      onEnd={() => {
        interacting.current = false;
        const controls = controlsRef.current;
        // A pan drags controls.target away from the followed body; rotate/zoom
        // keep it near f.pos. A gesture-start-vs-end comparison would
        // false-positive on moons (the delta-follow moves the target by the
        // moon's displacement every frame) — distance-to-body is the
        // pan-specific test.
        if (controls && controls.target.distanceTo(focus.current.pos) > 0.2) {
          panPauseUntil.current = performance.now() / 1000 + 3;
        }
      }}
    />
  );
}
