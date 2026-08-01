import * as THREE from 'three';
import { useMemo } from 'react';
import milkyWay from '../../../assets/textures/milky_way.jpg';
import { getMaxAnisotropy } from '../../textures/anisotropy.ts';

/**
 * ESO Gigagalaxy 360° panorama (ESO/S. Brunier, CC BY 4.0) mapped onto a huge
 * back-side sphere. Galactic plane runs horizontally through the image, so the
 * sphere is tilted ~60° (galactic plane vs ecliptic) to sit across the sky.
 */
export function MilkyWay() {
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(milkyWay);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = getMaxAnisotropy();
    return t;
  }, []);

  return (
    <mesh rotation={[1.047, 2.4, 0]} renderOrder={-2}>
      <sphereGeometry args={[320, 48, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
        color={new THREE.Color(0.62, 0.64, 0.72)}
      />
    </mesh>
  );
}
