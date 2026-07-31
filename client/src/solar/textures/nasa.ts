import { useQuery } from '@tanstack/react-query';
import * as THREE from 'three';
import sun from '../../assets/textures/2k_sun.jpg';
import mercury from '../../assets/textures/2k_mercury.jpg';
import venus from '../../assets/textures/2k_venus_surface.jpg';
import earth from '../../assets/textures/2k_earth_daymap.jpg';
import mars from '../../assets/textures/2k_mars.jpg';
import jupiter from '../../assets/textures/2k_jupiter.jpg';
import saturn from '../../assets/textures/2k_saturn.jpg';
import uranus from '../../assets/textures/2k_uranus.jpg';
import neptune from '../../assets/textures/2k_neptune.jpg';
import moon from '../../assets/textures/2k_moon.jpg';

/**
 * Vendored Solar System Scope 2k texture maps (CC BY 4.0) — served
 * same-origin, no CORS. Bodies without a photo (pluto, ceres, small moons)
 * fall back to procedural textures.
 */
const TEXTURE_URLS: Record<string, string> = {
  sun,
  mercury,
  venus,
  earth,
  mars,
  jupiter,
  saturn,
  uranus,
  neptune,
  moon,
};

export async function fetchNasaTexture(id: string): Promise<THREE.Texture> {
  const url = TEXTURE_URLS[id];
  if (!url) throw new Error(`no NASA texture for ${id}`);
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
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
    retry: 0,
  });
  return data;
}
