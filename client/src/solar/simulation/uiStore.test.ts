import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore.ts';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ selectedId: null, focusTick: 0, textureMode: 'nasa' });
  });

  it('starts with no selection in NASA texture mode', () => {
    const s = useUiStore.getState();
    expect(s.selectedId).toBeNull();
    expect(s.textureMode).toBe('nasa');
  });

  it('selects a body', () => {
    useUiStore.getState().select('mars');
    expect(useUiStore.getState().selectedId).toBe('mars');
  });

  it('bumps focusTick on every select call, even for the same id', () => {
    useUiStore.getState().select('mars');
    const t1 = useUiStore.getState().focusTick;
    useUiStore.getState().select('mars');
    const t2 = useUiStore.getState().focusTick;
    useUiStore.getState().select('mars');
    const t3 = useUiStore.getState().focusTick;
    expect(t1).toBe(1);
    expect(t2).toBe(t1 + 1);
    expect(t3).toBe(t2 + 1);
  });

  it('bumps focusTick when deselecting', () => {
    useUiStore.getState().select('venus');
    const t = useUiStore.getState().focusTick;
    useUiStore.getState().select(null);
    expect(useUiStore.getState().selectedId).toBeNull();
    expect(useUiStore.getState().focusTick).toBe(t + 1);
  });
});
