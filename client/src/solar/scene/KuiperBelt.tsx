import { ParticleBelt } from './ParticleBelt.tsx';

/** Kuiper belt: cold icy blues, 30–55 AU, a faint halo beyond Neptune. */
export function KuiperBelt() {
  return (
    <ParticleBelt
      count={6_000}
      innerAu={30}
      outerAu={55}
      ySpread={2.2}
      palette={['#8fa3b8', '#a7b8c9', '#7e93ab', '#9db0c2', '#74899f', '#b0bfcd', '#8ba0b5']}
      sizeMin={0.05}
      sizeMax={0.28}
      opacity={0.65}
      rotateSpeed={0.0006}
      seed={23}
    />
  );
}
