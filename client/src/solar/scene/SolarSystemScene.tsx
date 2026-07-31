import { AdaptiveDpr, PerformanceMonitor, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect } from 'react';
import { DWARF_PLANETS, PLANETS } from '../bodies/jpl.ts';
import { setMaxAnisotropy } from '../textures/anisotropy.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { AsteroidBelt } from './AsteroidBelt.tsx';
import { CameraRig } from './CameraRig.tsx';
import { OrbitLine } from './OrbitLine.tsx';
import { Planet } from './Planet.tsx';
import { Sun } from './Sun.tsx';

/** Pull the renderer's real max anisotropy into the shared texture config. */
function MaxAnisotropy() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
  }, [gl]);
  return null;
}

export function SolarSystemScene() {
  useFrame((_, dt) => {
    useTimeStore.getState().tick(dt);
  });

  return (
    <>
      <MaxAnisotropy />
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 0, 0]} intensity={3} decay={0} />
      <Stars radius={150} depth={40} count={4000} factor={3} saturation={0} fade speed={0.4} />

      <CameraRig />
      <Sun />
      {PLANETS.map((spec) => (
        <group key={spec.id}>
          <OrbitLine spec={spec} />
          <Planet spec={spec} />
        </group>
      ))}
      {DWARF_PLANETS.map((spec) => (
        <group key={spec.id}>
          <OrbitLine spec={spec} />
          <Planet spec={spec} />
        </group>
      ))}
      <AsteroidBelt />

      <PerformanceMonitor>
        <AdaptiveDpr pixelated />
      </PerformanceMonitor>
      <EffectComposer>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={1} luminanceSmoothing={0.2} />
      </EffectComposer>
    </>
  );
}
