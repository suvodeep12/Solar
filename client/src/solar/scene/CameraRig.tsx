import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { bodyById } from '../bodies/jpl.ts';
import { sceneBody, sunRadiusScene } from '../bodies/display.ts';
import { AU_UNIT, bodyPositionAt } from '../simulation/orbitMath.ts';
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

  useEffect(() => {
    const f = focus.current;
    if (selectedId === null) {
      f.pos.set(0, 0, 0);
      f.targetDist = OVERVIEW_DIST;
      f.fly = null;
      return;
    }
    const spec = bodyById(selectedId);
    if (!spec) return;
    if (spec.kind === 'star') {
      f.pos.set(0, 0, 0);
      f.targetDist = Math.max(sunRadiusScene() * 12, 0.8);
    } else {
      const scene = sceneBody(spec);
      const days = useTimeStore.getState().days;
      const p = bodyPositionAt(spec, days);
      f.pos.set(p.x * AU_UNIT, p.y * AU_UNIT, p.z * AU_UNIT);
      f.targetDist = Math.max(scene.radiusScene * 12, 0.8);
    }
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

    if (selectedId !== null) {
      const spec = bodyById(selectedId);
      if (spec && spec.kind !== 'star') {
        const days = useTimeStore.getState().days;
        const p = bodyPositionAt(spec, days);
        f.pos.set(p.x * AU_UNIT, p.y * AU_UNIT, p.z * AU_UNIT);
      }
    }

    currentTarget.current.lerp(f.pos, 1 - Math.exp(-dt * 3));

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
      }}
    />
  );
}
