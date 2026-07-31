import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { BodySpec } from '../bodies/jpl.ts';
import type { SceneMoonSpec } from '../bodies/display.ts';
import { sceneBody } from '../bodies/display.ts';
import { AU_UNIT, bodyPositionAt, moonPositionAt } from '../simulation/orbitMath.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';
import { proceduralTexture } from '../textures/procedural.ts';
import { useNasaTexture } from '../textures/nasa.ts';

const TAU = Math.PI * 2;

function Moon({ moon }: { moon: SceneMoonSpec }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const days = useTimeStore.getState().days;
    const pos = moonPositionAt(moon, moon.sceneDistance, days);
    groupRef.current?.position.set(pos.x, pos.y, pos.z);
    if (meshRef.current) {
      meshRef.current.rotation.y = (days * 24 * TAU) / 24;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[moon.sceneRadius, 16, 12]} />
        <meshStandardMaterial map={proceduralTexture(moon.name.toLowerCase())} roughness={1} />
      </mesh>
    </group>
  );
}

export const Planet = memo(function Planet({ spec }: { spec: BodySpec }) {
  const scene = sceneBody(spec);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const selectedId = useUiStore((s) => s.selectedId);
  const textureMode = useUiStore((s) => s.textureMode);
  const nasaTexture = useNasaTexture(spec.id, textureMode === 'nasa');
  const texture = nasaTexture ?? proceduralTexture(spec.id);
  const isSelected = selectedId === spec.id;

  useFrame(({ camera }) => {
    const days = useTimeStore.getState().days;
    const pos = bodyPositionAt(spec, days);
    const group = groupRef.current;
    if (group) {
      group.position.set(pos.x * AU_UNIT, pos.y * AU_UNIT, pos.z * AU_UNIT);
      if (meshRef.current) {
        meshRef.current.rotation.y = (days * 24 * TAU) / spec.rotationPeriodHours;
      }
      const label = labelRef.current;
      if (label) {
        const d = camera.position.distanceTo(group.position);
        label.style.opacity = String(Math.min(1, Math.max(0, (48 - d) / 36)));
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          useUiStore.getState().select(spec.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[scene.radiusScene, 64, 48]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>

      {spec.ring && scene.ringInnerScene && scene.ringOuterScene && (
        <group rotation-z={spec.axialTiltDeg * (Math.PI / 180)}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[scene.ringInnerScene, scene.ringOuterScene, 96]} />
            <meshBasicMaterial
              map={proceduralTexture('saturn_ring')}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
              opacity={0.92}
            />
          </mesh>
        </group>
      )}

      {scene.moons.map((m) => (
        <Moon key={m.name} moon={m} />
      ))}

      {isSelected && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[scene.radiusScene * 1.35, scene.radiusScene * 1.42, 64]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}

      <Html center distanceFactor={110} zIndexRange={[40, 0]} className="pointer-events-none">
        <div
          ref={labelRef}
          className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/80 [text-shadow:0_0_6px_rgba(0,0,0,0.9)]"
        >
          {spec.name}
        </div>
      </Html>
    </group>
  );
});
