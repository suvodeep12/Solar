import { useQuery } from '@tanstack/react-query';
import * as THREE from 'three';
import { getMaxAnisotropy } from './anisotropy.ts';
import sun from '../../assets/textures/2k_sun.jpg';
import mercury from '../../assets/textures/2k_mercury.jpg';
import venus from '../../assets/textures/2k_venus_atmosphere.jpg';
import earth from '../../assets/textures/2k_earth_daymap.jpg';
import mars from '../../assets/textures/2k_mars.jpg';
import jupiter from '../../assets/textures/2k_jupiter.jpg';
import saturn from '../../assets/textures/2k_saturn.jpg';
import uranus from '../../assets/textures/2k_uranus.jpg';
import neptune from '../../assets/textures/2k_neptune.jpg';
import moon from '../../assets/textures/2k_moon.jpg';
import saturnRing from '../../assets/textures/saturn_ring_alpha.png';
import earthClouds from '../../assets/textures/2k_earth_clouds.jpg';
import earthNight from '../../assets/textures/2k_earth_nightmap.jpg';

/**
 * Vendored texture maps — served same-origin, no CORS. Planet spheres: Solar
 * System Scope 2k photos (CC BY 4.0). Saturn rings: Grant Hutchison's 4k
 * Celestia ring map (public domain), since solarsystemscope.com blocks the
 * ring file. Bodies without a photo (pluto, ceres, small moons) fall back to
 * procedural textures.
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
  saturn_ring: saturnRing,
  earth_clouds: earthClouds,
  earth_night: earthNight,
};

export async function fetchNasaTexture(id: string): Promise<THREE.Texture> {
  const url = TEXTURE_URLS[id];
  if (!url) throw new Error(`no NASA texture for ${id}`);
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        if (id === 'earth_clouds') {
          resolve(cloudAlphaTexture(texture.image));
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = getMaxAnisotropy();
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

/**
 * The vendored clouds photo has a gray atmospheric halo instead of pure
 * black, so additive blending white-washed the planet. Rewrite it as white
 * pixels with alpha = luminance — normal blending then composites cleanly.
 */
function cloudAlphaTexture(image: HTMLImageElement | HTMLCanvasElement): THREE.CanvasTexture {
  const width = image.width;
  const height = image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < data.data.length; i += 4) {
    const lum = (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3;
    const a = (lum * lum) / 255;
    data.data[i] = 255;
    data.data[i + 1] = 255;
    data.data[i + 2] = 255;
    data.data[i + 3] = a;
  }
  ctx.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = getMaxAnisotropy();
  return texture;
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
