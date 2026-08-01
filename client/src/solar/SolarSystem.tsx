import { Canvas } from '@react-three/fiber';
import { InfoPanel } from './hud/InfoPanel.tsx';
import { KeyboardHints } from './hud/KeyboardHints.tsx';
import { TextureToggle } from './hud/TextureToggle.tsx';
import { TimeControls } from './hud/TimeControls.tsx';
import { useKeyboardShortcuts } from './hud/useKeyboardShortcuts.ts';
import { SolarSystemScene } from './scene/SolarSystemScene.tsx';
import { useUiStore } from './simulation/uiStore.ts';

export function SolarSystem() {
  useKeyboardShortcuts();
  return (
    <div className="fixed inset-0">
      <Canvas
        camera={{ position: [0, 18, 36], fov: 55, near: 0.1, far: 600 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerMissed={() => useUiStore.getState().select(null)}
      >
        <SolarSystemScene />
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4">
        <TimeControls />
      </div>
      <div className="pointer-events-none absolute right-4 top-4">
        <InfoPanel />
      </div>
      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <TextureToggle />
        <KeyboardHints />
      </div>
    </div>
  );
}
