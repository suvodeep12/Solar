import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { memo, useMemo, useRef } from 'react';
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

/** Ring annulus with radial UVs (u = normalized radius, v = 0.5) so band
 * profiles map correctly from a strip texture. */
function ringGeometry(inner: number, outer: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring < 2; ring++) {
    const r = ring === 0 ? inner : outer;
    const u = ring === 0 ? 0 : 1;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * TAU;
      positions.push(Math.cos(theta) * r, Math.sin(theta) * r, 0);
      uvs.push(u, 0.5);
      normals.push(0, 0, 1);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i;
    const b = i + 1;
    const c = i + segments + 2;
    const d = i + segments + 1;
    indices.push(a, b, d, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

function Moon({ moon }: { moon: SceneMoonSpec }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const textureMode = useUiStore((s) => s.textureMode);
  const nasaTexture = useNasaTexture('moon', textureMode === 'nasa');
  const texture = nasaTexture ?? proceduralTexture('moon');

  useFrame(() => {
    const days = useTimeStore.getState().days;
    const pos = moonPositionAt(moon, moon.sceneDistance, days);
    groupRef.current?.position.set(pos.x, pos.y, pos.z);
    if (meshRef.current) {
      meshRef.current.rotation.y = (days * TAU) / moon.periodDays;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[moon.sceneRadius, 32, 24]} />
        <meshStandardMaterial map={texture} roughness={1} />
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
  const ringTexture = useNasaTexture('saturn_ring', textureMode === 'nasa');
  const ringMap = ringTexture ?? proceduralTexture('saturn_ring');
  const isSelected = selectedId === spec.id;

  const ringGeo = useMemo(() => {
    if (!spec.ring || scene.ringInnerScene === undefined || scene.ringOuterScene === undefined) {
      return null;
    }
    return ringGeometry(scene.ringInnerScene, scene.ringOuterScene, 192);
  }, [spec.ring, scene.ringInnerScene, scene.ringOuterScene]);

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
        <sphereGeometry args={[Math.max(0.3, scene.radiusScene * 2), 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

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

      {ringGeo && (
        <group rotation-z={spec.axialTiltDeg * (Math.PI / 180)}>
          <mesh geometry={ringGeo} rotation-x={-Math.PI / 2}>
            <meshBasicMaterial
              map={ringMap}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
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

      <Html center zIndexRange={[40, 0]} className="pointer-events-none">
        <div
          ref={labelRef}
          onClick={(e) => {
            e.stopPropagation();
            useUiStore.getState().select(spec.id);
          }}
          className="pointer-events-auto cursor-pointer select-none text-[10px] font-mono uppercase tracking-[0.15em] text-white/80 transition-colors hover:text-white [text-shadow:0_0_6px_rgba(0,0,0,0.9)]"
        >
          {spec.name}
        </div>
      </Html>
    </group>
  );
});
