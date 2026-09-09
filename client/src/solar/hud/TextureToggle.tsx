import { useUiStore } from '../simulation/uiStore.ts';
import type { TextureMode } from '../simulation/uiStore.ts';

export function TextureToggle() {
  const textureMode = useUiStore((s) => s.textureMode);
  const setTextureMode = useUiStore((s) => s.setTextureMode);

  const option = (mode: TextureMode, label: string) => (
    <button
      className="hud-button"
      aria-pressed={textureMode === mode}
      onClick={() => setTextureMode(mode)}
    >
      {label}
    </button>
  );

  return (
    <div role="group" aria-label="Texture style" className="hud-panel flex gap-2 !p-2">
      {option('procedural', 'Procedural')}
      {option('nasa', 'NASA')}
    </div>
  );
}
