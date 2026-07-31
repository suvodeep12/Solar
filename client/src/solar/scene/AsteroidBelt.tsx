import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AU_UNIT } from '../simulation/orbitMath.ts';

const COUNT = 5_000;
/** Main belt spans ~2.2–3.2 AU in the plane, with vertical spread. */
const INNER_AU = 2.2;
const OUTER_AU = 3.2;

export function AsteroidBelt() {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const matrices = useMemo(() => {
    const hash = (n: number): number => {
      const s = Math.sin(n * 12.9898) * 43_758.5453;
      return s - Math.floor(s);
    };
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    return Array.from({ length: COUNT }, (_, i) => {
      const radius = AU_UNIT * (INNER_AU + hash(i * 1.7) * (OUTER_AU - INNER_AU));
      const angle = hash(i * 2.3) * Math.PI * 2;
      position.set(Math.cos(angle) * radius, (hash(i * 3.1) - 0.5) * 0.6, Math.sin(angle) * radius);
      quaternion.setFromEuler(
        new THREE.Euler(hash(i * 4.7) * Math.PI, hash(i * 5.3) * Math.PI, hash(i * 6.1) * Math.PI),
      );
      scale.setScalar(0.02 + hash(i * 7.9) * 0.06);
      matrix.compose(position, quaternion, scale);
      return matrix;
    });
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.004;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8a7a66" roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}
