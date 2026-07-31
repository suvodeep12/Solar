import { useQuery } from '@tanstack/react-query';
import * as THREE from 'three';

/**
 * NASA-style equirectangular textures (Solar System Scope's NASA-derived
 * 2k set; CORS-enabled). Downloaded on demand, blob-cached per session.
 */
export const TEXTURE_URLS: Record<string, string> = {
  sun: 'https://www.solarsystemscope.com/textures/download/2k_sun.jpg',
  mercury: 'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg',
  venus: 'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg',
  earth: 'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
  mars: 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg',
  jupiter: 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg',
  saturn: 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg',
  uranus: 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
  neptune: 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
  moon: 'https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
  pluto: 'https://www.solarsystemscope.com/textures/download/2k_pluto.jpg',
};

const objectUrlCache = new Map<string, string>();

export function nasaTextureUrl(id: string): string | undefined {
  return TEXTURE_URLS[id];
}

export async function fetchNasaTexture(id: string): Promise<THREE.Texture> {
  const url = nasaTextureUrl(id);
  if (!url) throw new Error(`no NASA texture for ${id}`);
  let objectUrl = objectUrlCache.get(id);
  if (!objectUrl) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`texture fetch failed: HTTP ${res.status}`);
    objectUrl = URL.createObjectURL(await res.blob());
    objectUrlCache.set(id, objectUrl);
  }
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      objectUrl!,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

/**
 * Load the NASA texture for a body when enabled; undefined while disabled or
 * pending/failed, so callers fall back to procedural textures.
 */
export function useNasaTexture(id: string, enabled: boolean): THREE.Texture | undefined {
  const { data } = useQuery({
    queryKey: ['nasa-texture', id],
    queryFn: () => fetchNasaTexture(id),
    enabled,
    staleTime: Infinity,
    retry: 1,
  });
  return data;
}
