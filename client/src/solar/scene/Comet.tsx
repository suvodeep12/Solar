import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { HALLEY } from '../bodies/comets.ts';
import { AU_UNIT, bodyPositionAt, orbitPoints } from '../simulation/orbitMath.ts';
import { useTimeStore } from '../simulation/timeStore.ts';

const RINGS = 24;
const SEGMENTS = 14;

/** Tapered tail streamer along +X with uv.x = 0 at the head, 1 at the tip. */
function tailGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring < RINGS; ring++) {
    const f = ring / (RINGS - 1);
    const x = Math.pow(f, 1.4);
    const r = 0.008 + (0.025 - 0.008) * f;
    for (let s = 0; s <= SEGMENTS; s++) {
      const theta = (s / SEGMENTS) * Math.PI * 2;
      positions.push(x, Math.cos(theta) * r, Math.sin(theta) * r);
      uvs.push(f, 0);
    }
  }
  for (let ring = 0; ring < RINGS - 1; ring++) {
    const a = ring * (SEGMENTS + 1);
    const b = a + SEGMENTS + 1;
    for (let s = 0; s < SEGMENTS; s++) {
      const i0 = a + s;
      const i1 = a + s + 1;
      const i2 = b + s;
      const i3 = b + s + 1;
      indices.push(i0, i2, i3, i0, i3, i1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

const TAIL_FRAGMENT = /* glsl */ `
  uniform float uBrightness;
  uniform float uTime;
  varying float vFade;
  void main() {
    float shimmer = 0.75 + 0.25 * sin(vFade * 60.0 + uTime * 6.0) * (1.0 - vFade);
    float alpha = pow(1.0 - vFade, 2.0) * uBrightness * shimmer;
    vec3 head = vec3(0.75, 0.9, 1.0);
    vec3 tail = vec3(0.35, 0.55, 0.9);
    gl_FragColor = vec4(mix(head, tail, vFade), alpha);
  }
`;

const TAIL_VERTEX = /* glsl */ `
  varying float vFade;
  void main() {
    vFade = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function Comet() {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const tailMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => tailGeometry(), []);

  const orbit = useMemo(() => {
    const positions = orbitPoints(
      HALLEY.distanceAu,
      HALLEY.eccentricity,
      HALLEY.inclinationDeg,
      512,
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useLayoutEffect(() => {
    const material = tailMaterialRef.current;
    if (material) {
      material.uniforms.uTime.value = 0;
    }
  }, []);

  useFrame(({ clock }) => {
    const days = useTimeStore.getState().days;
    const p = bodyPositionAt(HALLEY, days);
    const x = p.x * AU_UNIT;
    const y = p.y * AU_UNIT;
    const z = p.z * AU_UNIT;
    const group = groupRef.current;
    if (!group) return;
    group.position.set(x, y, z);

    const sunDist = Math.sqrt(x * x + y * y + z * z);
    const tail = tailRef.current;
    if (tail) {
      tail.quaternion.setFromUnitVectors(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(x, y, z).normalize(),
      );
      tail.scale.x = Math.min(24, Math.max(1, sunDist * 0.32));
    }
    const material = tailMaterialRef.current;
    if (material) {
      material.uniforms.uBrightness.value = Math.min(1, Math.max(0.08, 1.1 / (sunDist + 0.4)));
      material.uniforms.uTime.value = clock.elapsedTime;
    }
    const halo = haloRef.current;
    if (halo && (halo.material as THREE.MeshBasicMaterial).opacity) {
      (halo.material as THREE.MeshBasicMaterial).opacity =
        0.3 + 0.08 * Math.sin(clock.elapsedTime * 3);
    }
  });

  return (
    <group>
      <lineLoop geometry={orbit} frustumCulled={false}>
        <lineBasicMaterial color="#8fa3b8" transparent opacity={0.18} depthWrite={false} />
      </lineLoop>

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshBasicMaterial color="#dcebff" toneMapped={false} />
        </mesh>
        <mesh ref={haloRef}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshBasicMaterial
            color="#9fc4ff"
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh ref={tailRef} geometry={geo} frustumCulled={false} renderOrder={2}>
          <shaderMaterial
            ref={tailMaterialRef}
            vertexShader={TAIL_VERTEX}
            fragmentShader={TAIL_FRAGMENT}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            uniforms={{
              uBrightness: { value: 1 },
              uTime: { value: 0 },
            }}
          />
        </mesh>
      </group>
    </group>
  );
}
