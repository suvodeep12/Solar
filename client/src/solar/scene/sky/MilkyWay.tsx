import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import milkyWay from '../../../assets/textures/milky_way.jpg';
import { getMaxAnisotropy } from '../../textures/anisotropy.ts';
import { GALACTIC_EULER } from './galactic.ts';

const FRAGMENT = /* glsl */ `
  #include <colorspace_pars_fragment>

  uniform sampler2D uMap;
  uniform float uTime;
  uniform vec3 uDim;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y,
    );
  }

  void main() {
    vec3 c = texture2D(uMap, vUv).rgb * uDim;
    // Slow scroll-noise shimmer — the band "breathes" like gas instead of
    // reading as a static photograph. Mean ≈ 1.0 so brightness never drifts.
    float n1 = noise(vUv * vec2(6.0, 14.0) + uTime * 0.015);
    float n2 = noise(vUv * vec2(3.0, 8.0) - uTime * 0.01 + 5.0);
    float n3 = noise(vUv * vec2(14.0, 30.0) + uTime * 0.03 + 9.0);
    float shimmer = 0.92 + 0.08 * (0.4 * n1 + 0.35 * n2 + 0.25 * n3) * 2.0;
    c *= shimmer;
    gl_FragColor = sRGBTransferOETF(vec4(c, 1.0));
  }
`;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * ESO Gigagalaxy 360° panorama (ESO/S. Brunier, CC BY 4.0) mapped onto a huge
 * back-side sphere, dimmed so the 3D galactic layers read as foreground, with
 * a slow scroll-noise shimmer that makes the band feel like living gas.
 * Shares GALACTIC_EULER with the star volume/glow/dust layers.
 */
export function MilkyWay() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(milkyWay);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = getMaxAnisotropy();
    return t;
  }, []);

  useLayoutEffect(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uTime: { value: 0 },
        uDim: { value: new THREE.Vector3(0.53, 0.55, 0.62) },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
    });
    materialRef.current = material;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.material = material;
    }
    return () => {
      material.dispose();
      materialRef.current = null;
    };
  }, [texture]);

  useFrame(({ clock }) => {
    const material = materialRef.current;
    if (material) {
      material.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} rotation={GALACTIC_EULER} renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[320, 48, 32]} />
    </mesh>
  );
}
