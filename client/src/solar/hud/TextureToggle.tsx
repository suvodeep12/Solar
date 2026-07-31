import { useUiStore } from '../simulation/uiStore.ts';
import type { TextureMode } from '../simulation/uiStore.ts';

export function TextureToggle() {
  const textureMode = useUiStore((s) => s.textureMode);
  const setTextureMode = useUiStore((s) => s.setTextureMode);

  const option = (mode: TextureMode, label: string) => (
    <button
      className="px-3 py-1 font-mono text-xs uppercase tracking-widest transition-colors"
      style={
        textureMode === mode
          ? {
              color: '#fff',
              backgroundColor: 'rgba(56,189,248,0.25)',
              borderColor: 'rgba(56,189,248,0.7)',
            }
          : { color: 'rgba(255,255,255,0.55)' }
      }
      onClick={() => setTextureMode(mode)}
    >
      {label}
    </button>
  );

  return (
    <div className="pointer-events-auto flex overflow-hidden rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm">
      {option('procedural', 'Procedural')}
      {option('nasa', 'NASA')}
    </div>
  );
}
