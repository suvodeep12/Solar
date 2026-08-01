import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_BODIES } from '../bodies/jpl.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';
import { useKeyboardShortcuts } from './useKeyboardShortcuts.ts';

function Mount() {
  useKeyboardShortcuts();
  return null;
}

function keydown(key: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    useTimeStore.setState({ days: 0, speed: 1, mode: 'simulated' });
    useUiStore.setState({ selectedId: null, focusTick: 0, textureMode: 'nasa' });
    render(<Mount />);
  });

  it('space toggles play/pause', () => {
    keydown(' ');
    expect(useTimeStore.getState().mode).toBe('paused');
    keydown(' ');
    expect(useTimeStore.getState().mode).toBe('simulated');
  });

  it('digit keys set the matching speed preset', () => {
    keydown('3');
    expect(useTimeStore.getState().speed).toBe(7);
    keydown('5');
    expect(useTimeStore.getState().speed).toBe(365);
    keydown('1');
    expect(useTimeStore.getState().speed).toBe(0.5);
  });

  it('0 resets to the epoch', () => {
    useTimeStore.setState({ days: 1234 });
    keydown('0');
    expect(useTimeStore.getState().days).toBe(0);
  });

  it('r toggles realtime mode', () => {
    keydown('r');
    expect(useTimeStore.getState().mode).toBe('realtime');
    keydown('r');
    expect(useTimeStore.getState().mode).toBe('simulated');
  });

  it('t toggles the texture mode', () => {
    keydown('t');
    expect(useUiStore.getState().textureMode).toBe('procedural');
    keydown('t');
    expect(useUiStore.getState().textureMode).toBe('nasa');
  });

  it('escape deselects the current body', () => {
    useUiStore.setState({ selectedId: 'mars' });
    keydown('Escape');
    expect(useUiStore.getState().selectedId).toBeNull();
  });

  it('] selects the first body when nothing is selected', () => {
    keydown(']');
    expect(useUiStore.getState().selectedId).toBe('sun');
  });

  it('[ selects the last body when nothing is selected', () => {
    keydown('[');
    expect(useUiStore.getState().selectedId).toBe(ALL_BODIES[ALL_BODIES.length - 1].id);
  });

  it('] advances to the next body and wraps around', () => {
    useUiStore.setState({ selectedId: 'mars' });
    keydown(']');
    expect(useUiStore.getState().selectedId).toBe('jupiter');
    useUiStore.setState({ selectedId: ALL_BODIES[ALL_BODIES.length - 1].id });
    keydown(']');
    expect(useUiStore.getState().selectedId).toBe('sun');
  });

  it('[ moves to the previous body', () => {
    useUiStore.setState({ selectedId: 'mars' });
    keydown('[');
    expect(useUiStore.getState().selectedId).toBe('earth');
  });

  it('ignores auto-repeat and modifier-modified keys', () => {
    keydown(' ', { repeat: true });
    expect(useTimeStore.getState().mode).toBe('simulated');
    keydown('r', { ctrlKey: true });
    expect(useTimeStore.getState().mode).toBe('simulated');
  });

  it('ignores keys aimed at editable targets', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(useTimeStore.getState().mode).toBe('simulated');
    input.remove();
  });

  it('blurs a focused button so Space does not double-trigger', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    keydown(' ');
    expect(document.activeElement).not.toBe(button);
    expect(useTimeStore.getState().mode).toBe('paused');
    button.remove();
  });
});
