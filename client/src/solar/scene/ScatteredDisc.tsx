import { ParticleBelt } from './ParticleBelt.tsx';

/** Scattered disc: sparse, tilted, reddish-tinged worlds from 35 to 95 AU. */
export function ScatteredDisc() {
  return (
    <ParticleBelt
      count={1_500}
      innerAu={35}
      outerAu={95}
      ySpread={5}
      palette={['#9a8c8c', '#b0a0a4', '#877a7e', '#c0a8ac', '#7e7076']}
      sizeMin={0.05}
      sizeMax={0.22}
      opacity={0.5}
      rotateSpeed={0.0004}
      seed={37}
    />
  );
}
