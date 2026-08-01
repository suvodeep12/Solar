import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AU_UNIT } from '../simulation/orbitMath.ts';

export interface ParticleBeltProps {
  count: number;
  /** Belt radial extent, AU */
  innerAu: number;
  outerAu: number;
  /** Vertical spread above/below the ecliptic, scene units */
  ySpread: number;
  /** Per-instance color palette (hex strings) */
  palette: string[];
  sizeMin: number;
  sizeMax: number;
  opacity?: number;
  /** Rigid group rotation speed, rad/s — keeps the belt alive without real n-body */
  rotateSpeed?: number;
  seed?: number;
}

function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43_758.5453;
  return s - Math.floor(s);
}

/**
 * Instanced rock/ice field on an annulus: per-instance tint, power-law sizes
 * (mostly small), deterministic placement. Used for the main belt, the Kuiper
 * belt and the scattered disc.
 */
export function ParticleBelt({
  count,
  innerAu,
  outerAu,
  ySpread,
  palette,
  sizeMin,
  sizeMax,
  opacity = 1,
  rotateSpeed = 0,
  seed = 1,
}: ParticleBeltProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const instances = useMemo(() => {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const tint = new THREE.Color();
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    for (let i = 0; i < count; i++) {
      const radius = AU_UNIT * (innerAu + hash(i * 1.7 + seed) * (outerAu - innerAu));
      const angle = hash(i * 2.3 + seed * 7) * Math.PI * 2;
      position.set(
        Math.cos(angle) * radius,
        (hash(i * 3.1 + seed * 13) - 0.5) * ySpread,
        Math.sin(angle) * radius,
      );
      quaternion.setFromEuler(
        new THREE.Euler(hash(i * 4.7) * Math.PI, hash(i * 5.3) * Math.PI, hash(i * 6.1) * Math.PI),
      );
      const u = hash(i * 7.9 + seed * 29);
      scale.setScalar(sizeMin + (sizeMax - sizeMin) * Math.pow(u, 1.8));
      matrix.compose(position, quaternion, scale);
      matrices.push(matrix.clone());
      colors.push(
        tint.set(palette[Math.floor(hash(i * 9.1 + seed * 37) * palette.length)]).clone(),
      );
    }
    return { matrices, colors };
  }, [count, innerAu, outerAu, ySpread, palette, sizeMin, sizeMax, seed]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    instances.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    instances.colors.forEach((c, i) => mesh.setColorAt(i, c));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [instances]);

  useFrame((_, dt) => {
    if (groupRef.current && rotateSpeed !== 0) {
      groupRef.current.rotation.y += dt * rotateSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={1}
          flatShading
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
