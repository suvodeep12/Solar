/**
 * Renderer max anisotropy, cached module-side so textures can be configured
 * at creation time (inside loaders, not component scopes). Defaults to 16 —
 * the GPU-clamped practical maximum for every modern device.
 */
let maxAnisotropy = 16;

export function setMaxAnisotropy(value: number): void {
  maxAnisotropy = value;
}

export function getMaxAnisotropy(): number {
  return maxAnisotropy;
}
