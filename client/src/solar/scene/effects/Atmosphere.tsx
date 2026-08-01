import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayoutEffect, useRef } from 'react';
import atmosphereFrag from '../../shaders/atmosphere.frag.glsl?raw';
import atmosphereVert from '../../shaders/atmosphere.vert.glsl?raw';

export interface AtmosphereProps {
  /** World-unit radius of the body the shell wraps */
  radius: number;
  color: string;
  intensity: number;
  /** Fresnel power: higher = thinner, more concentrated rim */
  power: number;
  /** Shell radius multiplier */
  scale: number;
  /** Slow breathing animation (used by the Sun's corona) */
  pulse?: boolean;
}

/** Fresnel rim glow — additive shell that brightens toward the silhouette. */
export function Atmosphere({
  radius,
  color,
  intensity,
  power,
  scale,
  pulse = false,
}: AtmosphereProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    materialRef.current = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
        uPower: { value: power },
      },
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (mesh && material) {
      mesh.material = material;
    }
    return () => {
      materialRef.current?.dispose();
      materialRef.current = null;
    };
  }, [color, intensity, power]);

  useFrame(({ clock }) => {
    if (pulse) {
      const material = materialRef.current;
      if (material) {
        const t = clock.elapsedTime;
        material.uniforms.uIntensity.value =
          intensity * (1 + 0.1 * Math.sin(t * 1.9) * Math.sin(t * 0.7 + 1.1));
      }
    }
  });

  return (
    <mesh ref={meshRef} scale={radius * scale} renderOrder={2}>
      <sphereGeometry args={[1, 48, 32]} />
    </mesh>
  );
}
