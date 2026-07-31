import { create } from 'zustand';

export type TextureMode = 'procedural' | 'nasa';

export interface UiState {
  /** Currently focused body id, null = overview */
  selectedId: string | null;
  textureMode: TextureMode;
  select: (id: string | null) => void;
  setTextureMode: (mode: TextureMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedId: null,
  textureMode: 'procedural',
  select: (id) => set({ selectedId: id }),
  setTextureMode: (mode) => set({ textureMode: mode }),
}));
