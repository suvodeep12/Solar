import * as THREE from 'three';
import { memo, useMemo } from 'react';
import { orbitPoints } from '../simulation/orbitMath.ts';
import type { BodySpec } from '../bodies/jpl.ts';

export const OrbitLine = memo(function OrbitLine({ spec }: { spec: BodySpec }) {
  const geometry = useMemo(() => {
    const positions = orbitPoints(spec.distanceAu, spec.eccentricity, spec.inclinationDeg);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [spec]);
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color="#3b4252" transparent opacity={0.35} depthWrite={false} />
    </lineLoop>
  );
});
