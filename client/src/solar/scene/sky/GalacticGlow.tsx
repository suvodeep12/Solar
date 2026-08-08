import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import glowFrag from '../../shaders/glow.frag.glsl?raw';
import glowVert from '../../shaders/glow.vert.glsl?raw';
import { GALACTIC_EULER, buildGalacticGlow } from './galactic.ts';

/**
 * Nebula-glow depth shells: large soft additive sprites at three radii
 * (≈140/210/300) along the band. On camera translation the shells separate,
 * so the band itself reads as layered gas, not a painted backdrop.
 */
export function GalacticGlow() {
  const geometry = useMemo(() => buildGalacticGlow(), []);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointsRef = useRef<THREE.Points>(null);

  useLayoutEffect(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: glowVert,
      fragmentShader: glowFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      depthTest: true,
    });
    const points = pointsRef.current;
    const material = materialRef.current;
    if (points && material) {
      points.material = material;
      points.renderOrder = -1;
    }
    return () => {
      materialRef.current?.dispose();
      materialRef.current = null;
    };
  }, []);

  useFrame(({ clock }) => {
    const material = materialRef.current;
    if (material) {
      material.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <group rotation={GALACTIC_EULER}>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false} />
    </group>
  );
}
