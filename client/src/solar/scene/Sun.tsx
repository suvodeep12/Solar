import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SUN } from '../bodies/jpl.ts';
import { sunRadiusScene } from '../bodies/display.ts';
import { proceduralTexture } from '../textures/procedural.ts';
import { useNasaTexture } from '../textures/nasa.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';
import { Atmosphere } from './effects/Atmosphere.tsx';

const TAU = Math.PI * 2;

export function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const textureMode = useUiStore((s) => s.textureMode);
  const nasaTexture = useNasaTexture('sun', textureMode === 'nasa');
  const texture = nasaTexture ?? proceduralTexture('sun');

  useFrame(({ camera, clock }) => {
    const days = useTimeStore.getState().days;
    const spin = meshRef.current?.rotation;
    if (spin) {
      spin.y = (days * 24 * TAU) / SUN.rotationPeriodHours;
    }
    const label = labelRef.current;
    if (label) {
      const d = camera.position.length();
      label.style.opacity = String(Math.min(1, Math.max(0, (48 - d) / 36)));
    }
    const material = materialRef.current;
    if (material) {
      const t = clock.elapsedTime;
      const pulse = 1 + 0.05 * Math.sin(t * 2.3) * Math.sin(t * 0.8 + 0.7);
      material.emissiveIntensity = (textureMode === 'nasa' ? 1.5 : 2.2) * pulse;
    }
  });

  return (
    <group>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          useUiStore.getState().select('sun');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[Math.max(0.6, sunRadiusScene() * 1.5), 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          useUiStore.getState().select('sun');
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[sunRadiusScene(), 64, 48]} />
        <meshStandardMaterial
          ref={materialRef}
          map={texture}
          color="#000000"
          emissive="#ff9d2e"
          emissiveMap={texture}
          emissiveIntensity={textureMode === 'nasa' ? 1.5 : 2.2}
        />
      </mesh>
      <Atmosphere
        radius={sunRadiusScene()}
        color="#ffb84d"
        intensity={0.5}
        power={4.5}
        scale={1.6}
        pulse
      />
      <Html center zIndexRange={[40, 0]} className="pointer-events-none">
        <div
          ref={labelRef}
          onClick={(e) => {
            e.stopPropagation();
            useUiStore.getState().select('sun');
          }}
          className="pointer-events-auto cursor-pointer select-none text-[10px] font-mono uppercase tracking-[0.15em] text-white/90 transition-colors hover:text-white [text-shadow:0_0_8px_rgba(255,157,46,0.9)]"
        >
          Sun
        </div>
      </Html>
    </group>
  );
}
