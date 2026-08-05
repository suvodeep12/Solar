import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { BodySpec } from '../bodies/jpl.ts';
import { bodyById, moonId } from '../bodies/jpl.ts';
import type { SceneMoonSpec } from '../bodies/display.ts';
import { sceneBody, sunRadiusScene } from '../bodies/display.ts';
import { AU_UNIT, bodyPositionAt, moonPositionAt } from '../simulation/orbitMath.ts';
import { tiltAngleRad, tiltedPosition } from '../simulation/axialTilt.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';
import { proceduralTexture } from '../textures/procedural.ts';
import { useNasaTexture } from '../textures/nasa.ts';
import { Atmosphere } from './effects/Atmosphere.tsx';

const TAU = Math.PI * 2;

/** Scratch vector for world-position reads inside useFrame (no per-frame alloc) */
const WORLD_POS = new THREE.Vector3();
/** Eclipse/transit scratch vectors (module-level — the render loop never allocates). */
const SUN_DIR = new THREE.Vector3();
const MOON_DIR = new THREE.Vector3();
const SPOT_POS = new THREE.Vector3();

/** Fresnel rim glow per body — Earth bright, Venus soft, Mars a dusty haze. */
const ATMOSPHERES: Record<
  string,
  { color: string; intensity: number; power: number; scale: number }
> = {
  earth: { color: '#4d9fff', intensity: 1.35, power: 3.2, scale: 1.05 },
  venus: { color: '#ffd9a8', intensity: 0.7, power: 3.2, scale: 1.06 },
  mars: { color: '#d98a5f', intensity: 0.45, power: 2.6, scale: 1.04 },
};

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

function Moon({
  parentId,
  moon,
  planetRadius,
}: {
  parentId: string;
  moon: SceneMoonSpec;
  planetRadius: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const spotRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const textureMode = useUiStore((s) => s.textureMode);
  const nasaTexture = useNasaTexture('moon', textureMode === 'nasa');
  const texture = nasaTexture ?? proceduralTexture('moon');
  const id = moonId(parentId, moon.name);
  const parent = bodyById(parentId);

  useFrame(({ camera }) => {
    const days = useTimeStore.getState().days;
    const pos = moonPositionAt(moon, moon.sceneDistance, days);
    groupRef.current?.position.set(pos.x, pos.y, pos.z);
    if (meshRef.current) {
      meshRef.current.rotation.y = (days * TAU) / moon.periodDays;
    }

    // Eclipse / transit geometry, all in the parent's tilt frame (this
    // component lives inside the tilt group, so local == tilt-frame coords).
    const spot = spotRef.current;
    if (parent && parent.kind !== 'star' && spot) {
      // Sun direction in the tilt frame: the orbit is sun-centered, so the
      // sun sits at -bodyPositionAt(parent) from the planet.
      const sunP = bodyPositionAt(parent, days);
      SUN_DIR.set(-sunP.x, -sunP.y, -sunP.z);
      const planetDist = SUN_DIR.length() * AU_UNIT;
      SUN_DIR.normalize();
      const tilted = tiltedPosition(SUN_DIR, parent.axialTiltDeg);
      SUN_DIR.set(tilted.x, tilted.y, tilted.z);

      MOON_DIR.set(pos.x, pos.y, pos.z);
      MOON_DIR.normalize();
      const dot = MOON_DIR.dot(SUN_DIR);

      // Angular radii of the sun/moon/planet as seen from the parent: the
      // transit window is the moon blocking the sun's disc, the umbra window
      // the planet's shadow cone reaching the moon's orbit.
      const sunAng = Math.asin(sunRadiusScene() / planetDist);
      const moonAng = Math.asin(moon.sceneRadius / moon.sceneDistance);
      const planetAng = Math.asin(planetRadius / moon.sceneDistance);
      const umbraHalf = Math.max(0, sunAng - planetAng);

      // Transit: moon between planet and sun — its shadow spot on the day side.
      const transiting = dot > Math.cos(sunAng + moonAng);
      // Lunar eclipse: moon inside the planet's umbra (anti-sun side).
      const eclipsed = dot < -Math.cos(umbraHalf);

      const material = meshRef.current?.material as THREE.MeshStandardMaterial | undefined;
      if (material) {
        material.color.setScalar(eclipsed ? 0.2 : 1);
      }

      if (transiting) {
        // Umbra radius at the planet surface (display-scaled, ~moon visual
        // size scaled by the planet/sun distance ratio).
        const umbraR = Math.min(
          (moon.sceneRadius * planetDist) / moon.sceneDistance,
          planetRadius * 0.3,
        );
        SPOT_POS.copy(MOON_DIR).multiplyScalar(planetRadius * 1.002);
        spot.position.copy(SPOT_POS);
        spot.scale.setScalar(umbraR);
        spot.lookAt(camera.position);
        spot.visible = true;
      } else {
        spot.visible = false;
      }
    }
    const label = labelRef.current;
    if (label) {
      groupRef.current?.getWorldPosition(WORLD_POS);
      const d = camera.position.distanceTo(WORLD_POS);
      const opacity = Math.min(1, Math.max(0, (48 - d) / 36));
      label.style.display = opacity > 0 ? '' : 'none';
      label.style.opacity = String(opacity);
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          name={id}
          onClick={(e) => {
            e.stopPropagation();
            useUiStore.getState().select(id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            useUiStore.getState().select(id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[moon.sceneRadius, 32, 24]} />
          <meshStandardMaterial map={texture} roughness={1} />
        </mesh>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            useUiStore.getState().select(id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            useUiStore.getState().select(id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[Math.max(0.15, moon.sceneRadius * 3), 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <Html center zIndexRange={[40, 0]} className="pointer-events-none">
          <div
            ref={labelRef}
            onClick={(e) => {
              e.stopPropagation();
              useUiStore.getState().select(id);
            }}
            className="pointer-events-auto cursor-pointer select-none text-[10px] font-mono uppercase tracking-[0.15em] text-white/60 transition-colors hover:text-white [text-shadow:0_0_6px_rgba(0,0,0,0.9)]"
          >
            {moon.name}
          </div>
        </Html>
      </group>
      <mesh ref={spotRef} name={`${id}_spot`} visible={false} renderOrder={3}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </>
  );
}

export const Planet = memo(function Planet({ spec }: { spec: BodySpec }) {
  const scene = sceneBody(spec);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const selectedId = useUiStore((s) => s.selectedId);
  const textureMode = useUiStore((s) => s.textureMode);
  const nasaTexture = useNasaTexture(spec.id, textureMode === 'nasa');
  const texture = nasaTexture ?? proceduralTexture(spec.id);
  const ringTexture = useNasaTexture('saturn_ring', textureMode === 'nasa');
  const ringMap =
    spec.ring?.texture === undefined
      ? (ringTexture ?? proceduralTexture('saturn_ring'))
      : proceduralTexture(spec.ring.texture);
  const ringOpacity = spec.ring?.opacity ?? 1;
  const cloudTexture = useNasaTexture(
    'earth_clouds',
    textureMode === 'nasa' && spec.id === 'earth',
  );
  const cloudMap = cloudTexture ?? proceduralTexture('earth_clouds');
  const nightTexture = useNasaTexture('earth_night', textureMode === 'nasa' && spec.id === 'earth');
  const isSelected = selectedId === spec.id;
  const atmosphere = ATMOSPHERES[spec.id];
  const tiltRad = tiltAngleRad(spec.axialTiltDeg);

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
      if (cloudsRef.current) {
        cloudsRef.current.rotation.y = ((days * 24 * TAU) / spec.rotationPeriodHours) * 1.03;
      }
      const label = labelRef.current;
      if (label) {
        const d = camera.position.distanceTo(group.position);
        const opacity = Math.min(1, Math.max(0, (48 - d) / 36));
        label.style.display = opacity > 0 ? '' : 'none';
        label.style.opacity = String(opacity);
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
        onDoubleClick={(e) => {
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

      {/* Tilted body frame: the rotation axis, clouds, rings, and moon
          orbits all share the body's equatorial plane. */}
      <group rotation-z={tiltRad}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            useUiStore.getState().select(spec.id);
          }}
          onDoubleClick={(e) => {
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
          <meshStandardMaterial
            key={spec.id === 'earth' ? (nightTexture ? 'earth-night' : 'earth-day') : undefined}
            map={texture}
            roughness={1}
            metalness={0}
            emissive={spec.id === 'earth' && nightTexture ? '#ffffff' : '#000000'}
            emissiveMap={spec.id === 'earth' && nightTexture ? nightTexture : null}
            emissiveIntensity={spec.id === 'earth' && nightTexture ? 0.85 : 0}
          />
        </mesh>

        {spec.id === 'earth' && (
          <mesh ref={cloudsRef} scale={1.013} renderOrder={1}>
            <sphereGeometry args={[scene.radiusScene, 48, 32]} />
            <meshBasicMaterial map={cloudMap} transparent opacity={0.7} depthWrite={false} />
          </mesh>
        )}

        {atmosphere && <Atmosphere radius={scene.radiusScene} {...atmosphere} />}

        {ringGeo && (
          <mesh geometry={ringGeo} rotation-x={-Math.PI / 2}>
            <meshBasicMaterial
              map={ringMap}
              transparent
              opacity={ringOpacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Ring shadow: dark equatorial band on the disk (latitudes ±14°),
            slightly outside the surface, following the ring plane. */}
        {ringGeo && (
          <mesh renderOrder={3} scale={1.002}>
            <sphereGeometry args={[scene.radiusScene, 96, 12, 0, TAU, Math.PI / 2 - 0.245, 0.49]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
          </mesh>
        )}

        {scene.moons.map((m) => (
          <Moon key={m.name} parentId={spec.id} moon={m} planetRadius={scene.radiusScene} />
        ))}

        {isSelected && (
          <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
            <ringGeometry args={[scene.radiusScene * 1.35, scene.radiusScene * 1.42, 64]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} depthWrite={false} />
          </mesh>
        )}
      </group>

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
