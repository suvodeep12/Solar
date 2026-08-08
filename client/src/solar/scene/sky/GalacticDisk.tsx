import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import starfieldFrag from '../../shaders/starfield.frag.glsl?raw';
import starfieldVert from '../../shaders/starfield.vert.glsl?raw';
import { GALACTIC_EULER, buildGalacticStars } from './galactic.ts';

/**
 * The 3D galactic star volume: ~45k instanced points in the band plane
 * (radius 70–320). The camera lives inside it, so the band parallaxes on any
 * translation and flying toward it literally enters the star cloud. Reuses
 * the starfield twinkle shader (aSize/aTwinkle/aColor).
 */
export function GalacticDisk() {
  const geometry = useMemo(() => buildGalacticStars(), []);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointsRef = useRef<THREE.Points>(null);

  useLayoutEffect(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: starfieldVert,
      fragmentShader: starfieldFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = pointsRef.current;
    const material = materialRef.current;
    if (points && material) {
      points.material = material;
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
