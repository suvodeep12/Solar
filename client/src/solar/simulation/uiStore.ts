import { create } from 'zustand';

export type TextureMode = 'procedural' | 'nasa';

export interface UiState {
  /** Currently focused body id, null = overview */
  selectedId: string | null;
  textureMode: TextureMode;
  /** Bumped on every select() call so re-selecting the same body re-flies the camera */
  focusTick: number;
  select: (id: string | null) => void;
  setTextureMode: (mode: TextureMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedId: null,
  textureMode: 'nasa',
  focusTick: 0,
  select: (id) => set((s) => ({ selectedId: id, focusTick: s.focusTick + 1 })),
  setTextureMode: (mode) => set({ textureMode: mode }),
}));
