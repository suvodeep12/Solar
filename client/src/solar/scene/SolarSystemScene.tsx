import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useEffect } from 'react';
import { DWARF_PLANETS, PLANETS } from '../bodies/jpl.ts';
import { setMaxAnisotropy } from '../textures/anisotropy.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';
import { AsteroidBelt } from './AsteroidBelt.tsx';
import { CameraRig } from './CameraRig.tsx';
import { Comet } from './Comet.tsx';
import { KuiperBelt } from './KuiperBelt.tsx';
import { OrbitLine } from './OrbitLine.tsx';
import { Planet } from './Planet.tsx';
import { Saturation } from './effects/Saturation.tsx';
import { LensFlare } from './effects/LensFlare.tsx';
import { ScatteredDisc } from './ScatteredDisc.tsx';
import { Sun } from './Sun.tsx';
import { MilkyWay } from './sky/MilkyWay.tsx';
import { Meteors } from './sky/Meteors.tsx';
import { Starfield } from './sky/Starfield.tsx';

/** Pull the renderer's real max anisotropy into the shared texture config. */
function MaxAnisotropy() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
  }, [gl]);
  return null;
}

/**
 * Dev-only: exposes the live scene graph for browser QA (playwright evaluate).
 * `import.meta.env.DEV` is statically false in production builds — dropped.
 */
function DebugExpose() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  useEffect(() => {
    if (import.meta.env.DEV && window.location.search.includes('debug')) {
      (window as unknown as Record<string, unknown>).__solar = {
        scene,
        gl,
        camera,
        controls,
        time: useTimeStore,
        ui: useUiStore,
      };
    }
  }, [scene, gl, camera, controls]);
  return null;
}

export function SolarSystemScene() {
  useFrame((_, dt) => {
    useTimeStore.getState().tick(dt);
  });

  return (
    <>
      <MaxAnisotropy />
      <DebugExpose />
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 0, 0]} intensity={3} decay={0} />

      <Starfield />
      <MilkyWay />

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
      <KuiperBelt />
      <ScatteredDisc />
      <Comet />
      <Meteors />
      <LensFlare />

      <PerformanceMonitor>
        <AdaptiveDpr pixelated />
      </PerformanceMonitor>
      <EffectComposer>
        <Bloom mipmapBlur intensity={1.4} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
        <Saturation amount={1.15} />
        <Noise premultiply opacity={0.055} />
        <Vignette darkness={0.62} offset={0.28} />
      </EffectComposer>
    </>
  );
}
