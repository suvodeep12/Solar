import { useEffect } from 'react';
import { ALL_BODIES } from '../bodies/jpl.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';

const SPEEDS = [0.5, 1, 7, 30, 365] as const;

const HANDLED = new Set([' ', '0', '1', '2', '3', '4', '5', 'r', 't', '[', ']', 'escape']);

/** Global sim controls: space play/pause, 1-5 speed presets, 0 reset,
 *  R realtime, T textures, [ ] body cycling, Esc overview. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (!HANDLED.has(key)) return;
      e.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      if (active?.tagName === 'BUTTON') active.blur();
      const time = useTimeStore.getState();
      const ui = useUiStore.getState();
      switch (key) {
        case ' ':
          time.togglePaused();
          break;
        case '0':
          time.reset();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          time.setSpeed(SPEEDS[Number(key) - 1]);
          break;
        case 'r':
          time.setMode(time.mode === 'realtime' ? 'simulated' : 'realtime');
          break;
        case 't':
          ui.setTextureMode(ui.textureMode === 'nasa' ? 'procedural' : 'nasa');
          break;
        case '[':
        case ']': {
          const dir = key === ']' ? 1 : -1;
          const cur = ALL_BODIES.findIndex((b) => b.id === ui.selectedId);
          const start = cur === -1 ? (dir > 0 ? -1 : 0) : cur;
          ui.select(ALL_BODIES[(start + dir + ALL_BODIES.length) % ALL_BODIES.length].id);
          break;
        }
        case 'escape':
          ui.select(null);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
