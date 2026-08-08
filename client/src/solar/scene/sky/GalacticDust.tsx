import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import dustFrag from '../../shaders/dust.frag.glsl?raw';
import dustVert from '../../shaders/dust.vert.glsl?raw';
import { GALACTIC_EULER, buildGalacticDust } from './galactic.ts';

/**
 * Foreground dust lanes: soft NORMAL-blended dark sprites straddling the
 * band (radius 90–260). They darken the backdrop/glow from a real 3D
 * position, so the Milky Way's signature dark streaks shift with parallax
 * while flying. Depth-tested: planets in front are never dimmed.
 */
export function GalacticDust() {
  const geometry = useMemo(() => buildGalacticDust(), []);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointsRef = useRef<THREE.Points>(null);

  useLayoutEffect(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
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
