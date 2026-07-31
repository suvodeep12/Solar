import { beforeEach, describe, expect, it } from 'vitest';
import { useTimeStore } from './timeStore.ts';

describe('timeStore', () => {
  beforeEach(() => {
    useTimeStore.getState().reset();
  });

  it('starts at epoch, playing at 1 day/second', () => {
    const s = useTimeStore.getState();
    expect(s.days).toBe(0);
    expect(s.speed).toBe(1);
    expect(s.mode).toBe('simulated');
  });

  it('advances by dt x speed in simulated mode', () => {
    useTimeStore.getState().tick(0.5);
    useTimeStore.getState().tick(0.5);
    expect(useTimeStore.getState().days).toBeCloseTo(1, 9);
  });

  it('ignores tick while paused', () => {
    useTimeStore.getState().pause();
    useTimeStore.getState().tick(10);
    expect(useTimeStore.getState().days).toBe(0);
  });

  it('ignores non-positive dt', () => {
    useTimeStore.getState().tick(0);
    useTimeStore.getState().tick(-1);
    expect(useTimeStore.getState().days).toBe(0);
  });

  it('runs in realtime at one day per real day', () => {
    useTimeStore.getState().setMode('realtime');
    useTimeStore.getState().tick(86_400);
    expect(useTimeStore.getState().days).toBeCloseTo(1, 9);
  });

  it('treats speed 0 as paused', () => {
    useTimeStore.getState().setSpeed(0);
    expect(useTimeStore.getState().mode).toBe('paused');
    useTimeStore.getState().tick(10);
    expect(useTimeStore.getState().days).toBe(0);
  });

  it('returns to simulated mode when a speed is set', () => {
    useTimeStore.getState().setMode('realtime');
    useTimeStore.getState().setSpeed(7);
    expect(useTimeStore.getState().mode).toBe('simulated');
    expect(useTimeStore.getState().speed).toBe(7);
  });

  it('toggles between paused and simulated', () => {
    useTimeStore.getState().togglePaused();
    expect(useTimeStore.getState().mode).toBe('paused');
    useTimeStore.getState().togglePaused();
    expect(useTimeStore.getState().mode).toBe('simulated');
  });

  it('resets days to zero', () => {
    useTimeStore.getState().tick(30);
    expect(useTimeStore.getState().days).toBeGreaterThan(0);
    useTimeStore.getState().reset();
    expect(useTimeStore.getState().days).toBe(0);
  });
});
