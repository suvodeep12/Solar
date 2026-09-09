import { Canvas } from '@react-three/fiber';
import { InfoPanel } from './hud/InfoPanel.tsx';
import { KeyboardHints } from './hud/KeyboardHints.tsx';
import { TextureToggle } from './hud/TextureToggle.tsx';
import { TimeControls } from './hud/TimeControls.tsx';
import { WelcomeOverlay } from './hud/WelcomeOverlay.tsx';
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

      <div className="hud-time">
        <TimeControls />
      </div>
      <div className="hud-info">
        <InfoPanel />
      </div>
      <div className="hud-footer">
        <TextureToggle />
        <KeyboardHints />
      </div>

      <WelcomeOverlay />
    </div>
  );
}
