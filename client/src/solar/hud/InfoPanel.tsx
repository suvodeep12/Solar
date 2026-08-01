import { bodyById, moonById } from '../bodies/jpl.ts';
import type { BodySpec, StarSpec } from '../bodies/jpl.ts';
import { useUiStore } from '../simulation/uiStore.ts';

type Spec = BodySpec | StarSpec;

function isStar(spec: Spec): spec is StarSpec {
  return spec.kind === 'star';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-white/5 py-1.5 last:border-0">
      <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">{label}</span>
      <span className="font-mono text-xs text-white/90">{value}</span>
    </div>
  );
}

export function InfoPanel() {
  const selectedId = useUiStore((s) => s.selectedId);
  const select = useUiStore((s) => s.select);
  const spec = selectedId ? bodyById(selectedId) : undefined;
  const moonRef = spec || !selectedId ? undefined : moonById(selectedId);

  if (!spec && !moonRef) return null;

  if (moonRef) {
    const { parent, moon } = moonRef;
    return (
      <div className="pointer-events-auto w-72 rounded-lg border border-white/10 bg-black/60 p-4 backdrop-blur-md">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.3em] text-sky-300/80">
              Moon of {parent.name}
            </div>
            <h2 className="text-xl font-semibold text-white">{moon.name}</h2>
          </div>
          <button
            className="rounded px-1.5 font-mono text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => select(null)}
            aria-label="Close"
          >
            {'\u2715'}
          </button>
        </div>
        <Row label="Radius" value={`${moon.radiusKm.toLocaleString()} km`} />
        <Row
          label="Distance"
          value={`${moon.distancePlanetRadii.toFixed(1)} R\u00a0\u00b7\u00a0${(moon.distancePlanetRadii * parent.radiusKm).toLocaleString()} km`}
        />
        <Row label="Orbit" value={`${moon.periodDays.toLocaleString()} days`} />
        <p className="mt-3 text-xs leading-relaxed text-white/70">
          Orbits {parent.name} once every {moon.periodDays.toLocaleString()} days.
        </p>
      </div>
    );
  }

  if (!spec) return null;
  const subtitle = isStar(spec) ? 'Star' : spec.kind === 'dwarf' ? 'Dwarf planet' : 'Planet';

  return (
    <div className="pointer-events-auto w-72 rounded-lg border border-white/10 bg-black/60 p-4 backdrop-blur-md">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.3em] text-sky-300/80">
            {subtitle}
          </div>
          <h2 className="text-xl font-semibold text-white">{spec.name}</h2>
        </div>
        <button
          className="rounded px-1.5 font-mono text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          onClick={() => select(null)}
          aria-label="Close"
        >
          {'\u2715'}
        </button>
      </div>
      <Row label="Radius" value={`${spec.radiusKm.toLocaleString()} km`} />
      {isStar(spec) ? (
        <>
          <Row label="Day" value={`${Math.abs(spec.rotationPeriodHours).toFixed(1)} h`} />
          <Row label="Gravity" value={spec.gravity} />
        </>
      ) : (
        <>
          <Row label="Orbit" value={`${spec.distanceAu.toLocaleString()} AU`} />
          <Row label="Year" value={`${spec.periodDays.toLocaleString()} days`} />
          <Row label="Eccentricity" value={spec.eccentricity.toFixed(4)} />
          <Row label="Inclination" value={`${spec.inclinationDeg}\u00b0`} />
          <Row label="Axial tilt" value={`${spec.axialTiltDeg.toFixed(1)}\u00b0`} />
          <Row
            label="Day"
            value={`${Math.abs(spec.rotationPeriodHours).toFixed(1)} h${spec.rotationPeriodHours < 0 ? ' (retrograde)' : ''}`}
          />
          <Row label="Gravity" value={spec.gravity} />
          <Row label="Moons" value={String(spec.moonsCount)} />
        </>
      )}
      <p className="mt-3 text-xs leading-relaxed text-white/70">{spec.fact}</p>
    </div>
  );
}
