import { ParticleBelt } from './ParticleBelt.tsx';

/** Main asteroid belt: warm rocky browns, ~2.2–3.2 AU. */
export function AsteroidBelt() {
  return (
    <ParticleBelt
      count={5_000}
      innerAu={2.2}
      outerAu={3.2}
      ySpread={0.6}
      palette={[
        '#8a7a66',
        '#9b8774',
        '#6e6257',
        '#a08c7c',
        '#7d6f60',
        '#b39a80',
        '#8f7a6a',
        '#66594c',
      ]}
      sizeMin={0.015}
      sizeMax={0.075}
      rotateSpeed={0.004}
      seed={11}
    />
  );
}
