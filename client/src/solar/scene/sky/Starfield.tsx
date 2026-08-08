import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import starfieldFrag from '../../shaders/starfield.frag.glsl?raw';
import starfieldVert from '../../shaders/starfield.vert.glsl?raw';
import { mulberry32 } from './random.ts';

interface StarShell {
  radius: number;
  count: number;
  sizeMin: number;
  sizeMax: number;
  brightness: number;
}

/** Two depth shells of stars: a near layer with parallax, a dense far layer. */
const SHELLS: StarShell[] = [
  { radius: 64, count: 4_000, sizeMin: 1.7, sizeMax: 4.0, brightness: 1.0 },
  { radius: 175, count: 9_000, sizeMin: 1.0, sizeMax: 2.5, brightness: 0.85 },
];

/** Temperature-tinted star palette: mostly dim white, some blue/amber, few red. */
const STAR_COLORS: [number, number, number][] = [
  [1.0, 1.0, 1.0],
  [0.9, 0.92, 1.0],
  [0.7, 0.8, 1.0],
  [1.0, 0.93, 0.82],
  [1.0, 0.85, 0.6],
  [1.0, 0.7, 0.5],
];

function buildGeometry(shells: StarShell[]): THREE.BufferGeometry {
  const total = shells.reduce((sum, s) => sum + s.count, 0);
  const rand = mulberry32(0x5e11);
  const positions = new Float32Array(total * 3);
  const sizes = new Float32Array(total);
  const twinkles = new Float32Array(total);
  const colors = new Float32Array(total * 3);
  let i = 0;
  for (const shell of shells) {
    for (let n = 0; n < shell.count; n++, i++) {
      const z = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      const radius = shell.radius * (0.9 + rand() * 0.15);
      positions[i * 3] = r * Math.cos(theta) * radius;
      positions[i * 3 + 1] = z * radius;
      positions[i * 3 + 2] = r * Math.sin(theta) * radius;
      sizes[i] = shell.sizeMin + rand() * (shell.sizeMax - shell.sizeMin);
      twinkles[i] = rand() * Math.PI * 2;
      const pick = rand();
      const color =
        pick < 0.55
          ? STAR_COLORS[0]
          : pick < 0.75
            ? STAR_COLORS[1 + Math.floor(rand() * 2)]
            : STAR_COLORS[3 + Math.floor(rand() * 3)];
      const bright = (0.4 + rand() * 0.6) * shell.brightness;
      colors[i * 3] = color[0] * bright;
      colors[i * 3 + 1] = color[1] * bright;
      colors[i * 3 + 2] = color[2] * bright;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Custom twinkling point-sprite starfield across two depth shells. */
export function Starfield() {
  const geometry = useMemo(() => buildGeometry(SHELLS), []);
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

  return <points ref={pointsRef} geometry={geometry} frustumCulled={false} />;
}
