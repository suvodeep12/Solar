import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { bodyById } from '../bodies/jpl.ts';
import { sceneBody } from '../bodies/display.ts';
import { AU_UNIT, bodyPositionAt } from '../simulation/orbitMath.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';

const OVERVIEW_POSITION = new THREE.Vector3(0, 18, 36);

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const selectedId = useUiStore((s) => s.selectedId);
  const focusTick = useUiStore((s) => s.focusTick);
  const focus = useRef({
    pos: new THREE.Vector3(0, 0, 0),
    dist: OVERVIEW_POSITION.length(),
    targetDist: OVERVIEW_POSITION.length(),
    offset: new THREE.Vector3(0, 0.42, 1).normalize(),
    flyTo: false,
  });
  const currentTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    if (selectedId === null) {
      focus.current.pos.set(0, 0, 0);
      focus.current.targetDist = OVERVIEW_POSITION.length();
      focus.current.flyTo = false;
      return;
    }
    const spec = bodyById(selectedId);
    if (!spec) return;
    const scene = sceneBody(spec);
    const days = useTimeStore.getState().days;
    const p = bodyPositionAt(spec, days);
    focus.current.pos.set(p.x * AU_UNIT, p.y * AU_UNIT, p.z * AU_UNIT);
    focus.current.targetDist = Math.max(scene.radiusScene * 12, 0.8);
    focus.current.flyTo = true;
  }, [selectedId, focusTick]);

  useFrame(({ camera }, dt) => {
    const k = 1 - Math.exp(-dt * 3);
    const f = focus.current;
    const controls = controlsRef.current;

    if (selectedId !== null) {
      const spec = bodyById(selectedId);
      if (spec) {
        const days = useTimeStore.getState().days;
        const p = bodyPositionAt(spec, days);
        f.pos.set(p.x * AU_UNIT, p.y * AU_UNIT, p.z * AU_UNIT);
      }
    }

    const toTarget = camera.position.clone().sub(currentTarget.current);
    if (f.flyTo) {
      f.dist = THREE.MathUtils.lerp(f.dist, f.targetDist, k);
      if (Math.abs(f.dist - f.targetDist) < Math.max(0.01 * f.targetDist, 0.02)) {
        f.flyTo = false;
      }
    } else if (toTarget.lengthSq() > 1e-6) {
      f.offset.lerp(toTarget.clone().normalize(), k).normalize();
      f.dist = THREE.MathUtils.lerp(f.dist, toTarget.length(), k);
    }

    currentTarget.current.lerp(f.pos, k);
    const desired = f.pos.clone().add(f.offset.clone().multiplyScalar(f.dist));
    camera.position.lerp(desired, k);
    controls?.target.copy(currentTarget.current);
    controls?.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.4}
      maxDistance={140}
    />
  );
}
