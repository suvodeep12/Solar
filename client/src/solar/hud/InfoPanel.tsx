import { bodyById, moonById } from '../bodies/jpl.ts';
import type { BodySpec, StarSpec } from '../bodies/jpl.ts';
import { useUiStore } from '../simulation/uiStore.ts';

type Spec = BodySpec | StarSpec;

function isStar(spec: Spec): spec is StarSpec {
  return spec.kind === 'star';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 py-2 last:border-0">
      <span className="font-mono text-xs text-slate-300">{label}</span>
      <span className="min-w-0 text-right font-mono text-sm text-white">{value}</span>
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
      <div className="hud-panel">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="hud-label !text-sky-200">Moon of {parent.name}</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">{moon.name}</h2>
          </div>
          <button className="hud-button shrink-0" onClick={() => select(null)} aria-label="Close">
            Close
          </button>
        </div>
        <Row label="Radius" value={`${moon.radiusKm.toLocaleString()} km`} />
        <Row
          label="Distance"
          value={`${moon.distancePlanetRadii.toFixed(1)} R\u00a0\u00b7\u00a0${(moon.distancePlanetRadii * parent.radiusKm).toLocaleString()} km`}
        />
        <Row label="Orbit" value={`${moon.periodDays.toLocaleString()} days`} />
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Orbits {parent.name} once every {moon.periodDays.toLocaleString()} days.
        </p>
      </div>
    );
  }

  if (!spec) return null;
  const subtitle = isStar(spec) ? 'Star' : spec.kind === 'dwarf' ? 'Dwarf planet' : 'Planet';

  return (
    <div className="hud-panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="hud-label !text-sky-200">{subtitle}</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">{spec.name}</h2>
        </div>
        <button className="hud-button shrink-0" onClick={() => select(null)} aria-label="Close">
          Close
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
      <p className="mt-4 text-sm leading-relaxed text-slate-300">{spec.fact}</p>
    </div>
  );
}
