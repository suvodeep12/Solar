export type BodyKind = 'star' | 'planet' | 'dwarf';

export interface MoonSpec {
  name: string;
  radiusKm: number;
  /** Mean distance from planet center, in planet radii */
  distancePlanetRadii: number;
  /** Sidereal orbital period, days */
  periodDays: number;
  /** Retrograde (clockwise) orbit */
  retrograde?: boolean;
}

export interface RingSpec {
  /** Inner edge, km */
  innerKm: number;
  /** Outer edge, km */
  outerKm: number;
  /** Tilt of the ring plane from the body's equator, degrees */
  tiltDeg: number;
  /** Procedural ring texture id (defaults to 'saturn_ring') */
  texture?: string;
  /** Ring opacity (default 1) */
  opacity?: number;
}

export interface BodySpec {
  id: string;
  name: string;
  kind: Exclude<BodyKind, 'star'>;
  /** Mean radius, km */
  radiusKm: number;
  /** Semi-major axis, AU */
  distanceAu: number;
  /** Sidereal orbital period, days */
  periodDays: number;
  /** Orbital eccentricity */
  eccentricity: number;
  /** Inclination vs ecliptic, degrees */
  inclinationDeg: number;
  /** Axial tilt vs orbital plane, degrees */
  axialTiltDeg: number;
  /** Sidereal rotation period, hours (negative = retrograde) */
  rotationPeriodHours: number;
  /** Mean-anomaly phase offset, days (0 = perihelion at J2000 epoch) */
  epochDays?: number;
  gravity: string;
  moonsCount: number;
  fact: string;
  moons: MoonSpec[];
  ring?: RingSpec;
}

/** Sun sits at the origin; never orbits anything */
export interface StarSpec {
  kind: 'star';
  id: string;
  name: string;
  radiusKm: number;
  rotationPeriodHours: number;
  gravity: string;
  fact: string;
}

export const SUN: StarSpec = {
  kind: 'star',
  id: 'sun',
  name: 'Sun',
  radiusKm: 696_340,
  rotationPeriodHours: 609.12,
  gravity: '274 m/s²',
  fact: 'Contains 99.86% of the Solar System\u2019s mass; fuses ~600 million tonnes of hydrogen per second.',
};

export const PLANETS: BodySpec[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    kind: 'planet',
    radiusKm: 2_439.7,
    distanceAu: 0.387,
    periodDays: 87.97,
    eccentricity: 0.2056,
    inclinationDeg: 7.0,
    axialTiltDeg: 0.034,
    rotationPeriodHours: 1_407.6,
    gravity: '3.7 m/s²',
    moonsCount: 0,
    fact: 'A year here is 88 Earth days, a solar day ~176 \u2014 the slowest rotation-to-orbit ratio in the system.',
    moons: [],
  },
  {
    id: 'venus',
    name: 'Venus',
    kind: 'planet',
    radiusKm: 6_051.8,
    distanceAu: 0.723,
    periodDays: 224.7,
    eccentricity: 0.0068,
    inclinationDeg: 3.39,
    axialTiltDeg: 177.4,
    rotationPeriodHours: -5_832.5,
    gravity: '8.87 m/s²',
    moonsCount: 0,
    fact: 'Rotates backwards \u2014 the Sun rises in the west \u2014 and its 464 °C surface is hot enough to melt lead.',
    moons: [],
  },
  {
    id: 'earth',
    name: 'Earth',
    kind: 'planet',
    radiusKm: 6_371,
    distanceAu: 1.0,
    periodDays: 365.25,
    eccentricity: 0.0167,
    inclinationDeg: 0.0,
    axialTiltDeg: 23.44,
    rotationPeriodHours: 23.93,
    gravity: '9.81 m/s²',
    moonsCount: 1,
    fact: 'The only known world with liquid surface water and life; 71% of its surface is ocean.',
    moons: [
      {
        name: 'Moon',
        radiusKm: 1_737.4,
        distancePlanetRadii: 60.3,
        periodDays: 27.32,
      },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    kind: 'planet',
    radiusKm: 3_389.5,
    distanceAu: 1.524,
    periodDays: 686.98,
    eccentricity: 0.0934,
    inclinationDeg: 1.85,
    axialTiltDeg: 25.19,
    rotationPeriodHours: 24.62,
    gravity: '3.71 m/s²',
    moonsCount: 2,
    fact: 'Home to Olympus Mons, the tallest volcano in the Solar System at 21.9 km \u2014 nearly 3\u00d7 Everest.',
    moons: [
      { name: 'Phobos', radiusKm: 11.3, distancePlanetRadii: 2.76, periodDays: 0.319 },
      { name: 'Deimos', radiusKm: 6.2, distancePlanetRadii: 6.92, periodDays: 1.263 },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    kind: 'planet',
    radiusKm: 69_911,
    distanceAu: 5.203,
    periodDays: 4_332.59,
    eccentricity: 0.0489,
    inclinationDeg: 1.3,
    axialTiltDeg: 3.13,
    rotationPeriodHours: 9.93,
    gravity: '24.79 m/s²',
    moonsCount: 95,
    fact: '2.5\u00d7 the mass of all other planets combined; the Great Red Spot is a storm wider than Earth.',
    moons: [
      { name: 'Io', radiusKm: 1_821.6, distancePlanetRadii: 5.9, periodDays: 1.769 },
      { name: 'Europa', radiusKm: 1_560.8, distancePlanetRadii: 9.4, periodDays: 3.551 },
      { name: 'Ganymede', radiusKm: 2_634.1, distancePlanetRadii: 15.0, periodDays: 7.155 },
      { name: 'Callisto', radiusKm: 2_410.3, distancePlanetRadii: 26.3, periodDays: 16.689 },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    kind: 'planet',
    radiusKm: 58_232,
    distanceAu: 9.537,
    periodDays: 10_759.22,
    eccentricity: 0.0565,
    inclinationDeg: 2.49,
    axialTiltDeg: 26.73,
    rotationPeriodHours: 10.66,
    gravity: '10.44 m/s²',
    moonsCount: 146,
    fact: 'Its rings span 280,000 km yet average only ~10 m thick \u2014 95% water ice.',
    moons: [
      { name: 'Titan', radiusKm: 2_574.7, distancePlanetRadii: 20.3, periodDays: 15.945 },
      { name: 'Enceladus', radiusKm: 252.1, distancePlanetRadii: 3.95, periodDays: 1.37 },
    ],
    ring: { innerKm: 66_900, outerKm: 140_220, tiltDeg: 0 },
  },
  {
    id: 'uranus',
    name: 'Uranus',
    kind: 'planet',
    radiusKm: 25_362,
    distanceAu: 19.191,
    periodDays: 30_688.5,
    eccentricity: 0.0457,
    inclinationDeg: 0.77,
    axialTiltDeg: 97.77,
    rotationPeriodHours: -17.24,
    gravity: '8.87 m/s²',
    moonsCount: 28,
    fact: 'Rolls around the Sun on its side \u2014 its axis is tilted 98°, so each pole gets 42 years of sunlight.',
    moons: [{ name: 'Titania', radiusKm: 788.4, distancePlanetRadii: 17.2, periodDays: 8.706 }],
    ring: { innerKm: 38_000, outerKm: 51_200, tiltDeg: 0, texture: 'uranus_ring', opacity: 0.55 },
  },
  {
    id: 'neptune',
    name: 'Neptune',
    kind: 'planet',
    radiusKm: 24_622,
    distanceAu: 30.07,
    periodDays: 60_182,
    eccentricity: 0.0113,
    inclinationDeg: 1.77,
    axialTiltDeg: 28.32,
    rotationPeriodHours: 16.11,
    gravity: '11.15 m/s²',
    moonsCount: 16,
    fact: 'Winds top 2,100 km/h \u2014 the fastest in the Solar System \u2014 and it emits 2.6\u00d7 the heat it receives.',
    moons: [
      {
        name: 'Triton',
        radiusKm: 1_353.4,
        distancePlanetRadii: 14.3,
        periodDays: 5.877,
        retrograde: true,
      },
    ],
  },
];

export const DWARF_PLANETS: BodySpec[] = [
  {
    id: 'ceres',
    name: 'Ceres',
    kind: 'dwarf',
    radiusKm: 473,
    distanceAu: 2.77,
    periodDays: 1_680,
    eccentricity: 0.0758,
    inclinationDeg: 10.59,
    axialTiltDeg: 4,
    rotationPeriodHours: 9.07,
    gravity: '0.28 m/s²',
    moonsCount: 0,
    fact: 'Largest object in the asteroid belt \u2014 1/3 of the belt\u2019s total mass \u2014 with bright salt deposits in Occator crater.',
    moons: [],
  },
  {
    id: 'pluto',
    name: 'Pluto',
    kind: 'dwarf',
    radiusKm: 1_188.3,
    distanceAu: 39.48,
    periodDays: 90_560,
    eccentricity: 0.2488,
    inclinationDeg: 17.16,
    axialTiltDeg: 122.53,
    rotationPeriodHours: -153.29,
    gravity: '0.62 m/s²',
    moonsCount: 5,
    fact: 'Its orbit crosses Neptune\u2019s \u2014 a 2:3 resonance keeps them from colliding; heart-shaped Sputnik Planitia is nitrogen ice.',
    moons: [{ name: 'Charon', radiusKm: 606, distancePlanetRadii: 16.6, periodDays: 6.387 }],
  },
  {
    id: 'eris',
    name: 'Eris',
    kind: 'dwarf',
    radiusKm: 1_163,
    distanceAu: 67.67,
    periodDays: 203_830,
    eccentricity: 0.4407,
    inclinationDeg: 44.04,
    axialTiltDeg: 78,
    rotationPeriodHours: 25.9,
    gravity: '0.82 m/s²',
    moonsCount: 1,
    fact: 'Its discovery in 2005 triggered Pluto\u2019s reclassification; one orbit takes 558 Earth years.',
    moons: [{ name: 'Dysnomia', radiusKm: 350, distancePlanetRadii: 37, periodDays: 15.77 }],
  },
];

export type SelectableSpec = BodySpec | StarSpec;

export const ALL_BODIES: SelectableSpec[] = [SUN, ...PLANETS, ...DWARF_PLANETS];

export function bodyById(id: string): SelectableSpec | undefined {
  return ALL_BODIES.find((b) => b.id === id);
}

/** Unique selector for a moon, namespaced by its parent body id. */
export function moonId(parentId: string, moonName: string): string {
  return `${parentId}_${moonName.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
}

export interface MoonRef {
  parent: BodySpec;
  moon: MoonSpec;
}

export function moonById(id: string): MoonRef | undefined {
  for (const body of ALL_BODIES) {
    if (body.kind === 'star') continue;
    for (const moon of body.moons) {
      if (moonId(body.id, moon.name) === id) return { parent: body, moon };
    }
  }
  return undefined;
}
