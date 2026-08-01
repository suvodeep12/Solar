import * as THREE from 'three';
import { getMaxAnisotropy } from './anisotropy.ts';
import { CLOUD_ALPHA_SCALE } from './nasa.ts';

/** Seeded PRNG (mulberry32) so procedural textures are stable across renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')!];
}

function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = getMaxAnisotropy();
  return texture;
}

/**
 * Smooth 2D value noise with bilinear interpolation over a fixed lattice.
 * Deterministic for a given seed and lattice size.
 */
function valueNoise(seed: number, latticeSize = 64): (x: number, y: number) => number {
  const rand = mulberry32(seed);
  const lattice: number[] = [];
  for (let i = 0; i < latticeSize * latticeSize; i++) {
    lattice.push(rand());
  }
  const at = (x: number, y: number): number => {
    const xi = ((x % latticeSize) + latticeSize) % latticeSize;
    const yi = ((y % latticeSize) + latticeSize) % latticeSize;
    return lattice[yi * latticeSize + xi];
  };
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    value += amp * noise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

/** Gas giant: horizontal bands from value noise rows, tinted, with storm swirls. */
function gasGiantTexture(
  seed: number,
  base: [number, number, number],
  bands = 9,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const [canvas, ctx] = makeCanvas(width, height);
  const rand = mulberry32(seed);
  const noise = valueNoise(seed, 32);
  const bandColors: [number, number, number][] = [];
  for (let i = 0; i < bands; i++) {
    const shade = 0.55 + rand() * 0.9;
    bandColors.push([
      Math.min(255, base[0] * shade),
      Math.min(255, base[1] * shade),
      Math.min(255, base[2] * shade),
    ]);
  }
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const t = (y / height) * bands;
    const i = Math.min(bands - 1, Math.floor(t));
    const f = t - Math.floor(t);
    const [c1, c2] = [bandColors[i], bandColors[Math.min(bands - 1, i + 1)]];
    for (let x = 0; x < width; x++) {
      const n = fbm(noise, x / 90, y / 26, 3);
      const wobble = 0.75 + n * 0.5;
      const idx = (y * width + x) * 4;
      image.data[idx] = Math.min(255, (c1[0] + (c2[0] - c1[0]) * f) * wobble);
      image.data[idx + 1] = Math.min(255, (c1[1] + (c2[1] - c1[1]) * f) * wobble);
      image.data[idx + 2] = Math.min(255, (c1[2] + (c2[2] - c1[2]) * f) * wobble);
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  for (let s = 0; s < 12; s++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 8 + rand() * 26;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${0.08 + rand() * 0.14})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasTexture(canvas);
}

/** Rocky world: fbm terrain, latitude tint, polar caps. */
function rockyTexture(
  seed: number,
  base: [number, number, number],
  cap: [number, number, number],
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const [canvas, ctx] = makeCanvas(width, height);
  const rand = mulberry32(seed);
  const noise = valueNoise(seed, 32);
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const lat = Math.abs(y - height / 2) / (height / 2);
    for (let x = 0; x < width; x++) {
      const n = fbm(noise, x / 60, y / 60, 5);
      const craters = Math.sin(x * 0.11 + rand()) * Math.cos(y * 0.09 + rand()) * 0.25;
      const v = 0.5 + n * 0.85 + craters;
      const idx = (y * width + x) * 4;
      if (lat > 0.85) {
        image.data[idx] = cap[0];
        image.data[idx + 1] = cap[1];
        image.data[idx + 2] = cap[2];
      } else {
        image.data[idx] = Math.min(255, base[0] * v);
        image.data[idx + 1] = Math.min(255, base[1] * v);
        image.data[idx + 2] = Math.min(255, base[2] * v);
      }
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas);
}

/** Earth-like: ocean base, fbm continents, ice caps. */
function earthTexture(seed: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const [canvas, ctx] = makeCanvas(width, height);
  const noise = valueNoise(seed, 24);
  const rand = mulberry32(seed ^ 0x9e37);
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const lat = Math.abs(y - height / 2) / (height / 2);
    for (let x = 0; x < width; x++) {
      const n = fbm(noise, x / 90, y / 90, 4);
      const ridge = Math.sin(x / 30) * Math.cos(y / 26) * 0.2;
      const idx = (y * width + x) * 4;
      if (lat > 0.88) {
        image.data[idx] = 236;
        image.data[idx + 1] = 243;
        image.data[idx + 2] = 249;
      } else if (n + ridge > 0.5) {
        const g = rand() * 0.5;
        image.data[idx] = 70 + rand() * 45;
        image.data[idx + 1] = 100 + g * 100;
        image.data[idx + 2] = 48 + rand() * 35;
      } else {
        image.data[idx] = 18;
        image.data[idx + 1] = 58;
        image.data[idx + 2] = 118 + n * 60;
      }
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas);
}

/** Sun: granulated emissive surface, darker limb. */
function sunTexture(seed: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const [canvas, ctx] = makeCanvas(width, height);
  const noise = valueNoise(seed, 40);
  const rand = mulberry32(seed);
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x / width - 0.5;
      const dy = y / height - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy) * 2;
      const granule = 0.9 + fbm(noise, x / 26, y / 26, 4) * 0.22;
      const limb = Math.max(0, 1 - d * 0.6);
      const v = 255 * granule * (0.72 + limb * 0.38);
      const idx = (y * width + x) * 4;
      image.data[idx] = Math.min(255, v);
      image.data[idx + 1] = Math.min(255, v * 0.86);
      image.data[idx + 2] = Math.min(255, v * 0.5);
      image.data[idx + 3] = 255;
    }
  }
  void rand;
  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas);
}

/** Faint icy world (dwarf planets, icy moons). */
function icyTexture(seed: number): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const [canvas, ctx] = makeCanvas(width, height);
  const noise = valueNoise(seed, 24);
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = fbm(noise, x / 42, y / 42, 4);
      const v = 148 + n * 110;
      const idx = (y * width + x) * 4;
      image.data[idx] = Math.min(255, v);
      image.data[idx + 1] = Math.min(255, v + 8);
      image.data[idx + 2] = Math.min(255, v + 22);
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas);
}

/** Soft ring band with alpha falloff and Cassini-like gaps. */
export function ringTexture(seed: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 16;
  const [canvas, ctx] = makeCanvas(width, height);
  const rand = mulberry32(seed);
  const image = ctx.createImageData(width, height);
  for (let p = 0; p < image.data.length; p += 4) {
    const x = (p / 4) % width;
    const t = x / width;
    let alpha = 0;
    const gaps = [0.08, 0.18, 0.42];
    if (!gaps.some((g) => Math.abs(t - g) < 0.012)) {
      alpha = Math.sin(t * Math.PI) ** 0.7 * (0.35 + rand() * 0.55);
    }
    const v = 210 + rand() * 45;
    image.data[p] = v;
    image.data[p + 1] = v * 0.94;
    image.data[p + 2] = v * 0.86;
    image.data[p + 3] = Math.floor(alpha * 255);
  }
  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas);
}

/** Uranus: a handful of narrow, faint icy bands on a near-empty ring plane. */
function uranusRingTexture(seed: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 16;
  const [canvas, ctx] = makeCanvas(width, height);
  const rand = mulberry32(seed ^ 0x51a7);
  const image = ctx.createImageData(width, height);
  const bands = [0.28, 0.3, 0.33, 0.48, 0.57, 0.7, 0.73, 0.79, 0.93, 0.99];
  for (let p = 0; p < image.data.length; p += 4) {
    const x = (p / 4) % width;
    const t = x / width;
    const v = 165 + rand() * 40;
    const band = bands.find((b) => Math.abs(t - b) < 0.011);
    const alpha = band ? 0.35 + rand() * 0.4 + (band > 0.95 ? 0.2 : 0) : 0;
    image.data[p] = v;
    image.data[p + 1] = v * 1.02;
    image.data[p + 2] = Math.min(255, v * 1.14);
    image.data[p + 3] = Math.floor(alpha * 255);
  }
  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas);
}

/** Cloud cover: white fBm wisps, alpha from coverage — consumed over the
 * surface with normal blending (never black-filled). */
function cloudsTexture(seed: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const [canvas, ctx] = makeCanvas(width, height);
  const noise = valueNoise(seed ^ 0xabcd, 24);
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = fbm(noise, x / 50, y / 50, 5);
      const streak = 0.12 * Math.sin((y / height) * Math.PI * 14 + n * 2.2);
      const v = (n + streak - 0.55) / 0.4;
      const c = Math.min(1, Math.max(0, v));
      const idx = (y * width + x) * 4;
      image.data[idx] = 255;
      image.data[idx + 1] = 255;
      image.data[idx + 2] = 255;
      image.data[idx + 3] = Math.floor(c * c * 255 * CLOUD_ALPHA_SCALE);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvasTexture(canvas);
}

const cache = new Map<string, THREE.CanvasTexture>();

/** Deterministic procedural texture per body id, cached for the app lifetime. */
export function proceduralTexture(id: string): THREE.CanvasTexture {
  const hit = cache.get(id);
  if (hit) return hit;
  const seed = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 42);
  let texture: THREE.CanvasTexture;
  switch (id) {
    case 'sun':
      texture = sunTexture(seed);
      break;
    case 'earth':
      texture = earthTexture(seed);
      break;
    case 'jupiter':
      texture = gasGiantTexture(seed, [205, 155, 115]);
      break;
    case 'saturn':
      texture = gasGiantTexture(seed, [225, 200, 150]);
      break;
    case 'uranus':
      texture = gasGiantTexture(seed, [150, 205, 215], 5);
      break;
    case 'neptune':
      texture = gasGiantTexture(seed, [65, 105, 210], 6);
      break;
    case 'venus':
      texture = rockyTexture(seed, [200, 160, 95], [220, 200, 150]);
      break;
    case 'mars':
      texture = rockyTexture(seed, [170, 80, 45], [240, 230, 220]);
      break;
    case 'mercury':
      texture = rockyTexture(seed, [125, 115, 105], [150, 140, 130]);
      break;
    case 'moon':
    case 'phobos':
    case 'deimos':
    case 'charon':
      texture = rockyTexture(seed, [135, 130, 125], [150, 145, 140]);
      break;
    case 'saturn_ring':
      texture = ringTexture(seed);
      break;
    case 'uranus_ring':
      texture = uranusRingTexture(seed);
      break;
    case 'earth_clouds':
      texture = cloudsTexture(seed);
      break;
    default:
      texture = icyTexture(seed);
  }
  cache.set(id, texture);
  return texture;
}
