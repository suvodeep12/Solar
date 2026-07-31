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

const TAU = Math.PI * 2;

export function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const textureMode = useUiStore((s) => s.textureMode);
  const nasaTexture = useNasaTexture('sun', textureMode === 'nasa');
  const texture = nasaTexture ?? proceduralTexture('sun');

  useFrame(({ camera }) => {
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
  });

  return (
    <group>
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
          map={texture}
          color="#000000"
          emissive="#ff9d2e"
          emissiveMap={texture}
          emissiveIntensity={2.2}
        />
      </mesh>
      <Html center distanceFactor={110} zIndexRange={[40, 0]} className="pointer-events-none">
        <div
          ref={labelRef}
          className="text-xs font-mono uppercase tracking-[0.25em] text-white/90 [text-shadow:0_0_8px_rgba(255,157,46,0.9)]"
        >
          Sun
        </div>
      </Html>
    </group>
  );
}
