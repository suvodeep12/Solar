import { create } from 'zustand';

export type TextureMode = 'procedural' | 'nasa';

/** Absolute camera-pose presets ("photo mode"). Extensible. */
export type ViewId = 'galactic-band';

export interface UiState {
  /** Currently focused body id, null = overview */
  selectedId: string | null;
  textureMode: TextureMode;
  /** Bumped on every select() call so re-selecting the same body re-flies the camera */
  focusTick: number;
  /** Camera-pose preset to fly to; cleared when the flight lands or any input cancels it */
  viewId: ViewId | null;
  /** Bumped on every setView() so re-requesting the same view re-flies the camera */
  viewTick: number;
  select: (id: string | null) => void;
  setTextureMode: (mode: TextureMode) => void;
  setView: (id: ViewId | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedId: null,
  textureMode: 'nasa',
  focusTick: 0,
  viewId: null,
  viewTick: 0,
  select: (id) => set((s) => ({ selectedId: id, focusTick: s.focusTick + 1 })),
  setTextureMode: (mode) => set({ textureMode: mode }),
  setView: (viewId) => set((s) => ({ viewId, viewTick: s.viewTick + 1 })),
}));
