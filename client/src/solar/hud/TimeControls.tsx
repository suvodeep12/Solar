import { useEffect, useRef, useState } from 'react';
import { MOMENTS } from '../simulation/presets.ts';
import { simDate, useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';

const SPEEDS = [0.5, 1, 7, 30, 365] as const;

export function TimeControls() {
  const mode = useTimeStore((s) => s.mode);
  const speed = useTimeStore((s) => s.speed);
  const setSpeed = useTimeStore((s) => s.setSpeed);
  const setMode = useTimeStore((s) => s.setMode);
  const togglePaused = useTimeStore((s) => s.togglePaused);
  const reset = useTimeStore((s) => s.reset);
  const [date, setDate] = useState(() => simDate(0));
  const frameRef = useRef(0);

  useEffect(() => {
    const update = () => {
      const days = useTimeStore.getState().days;
      const next = simDate(days);
      setDate((prev) => (prev === next ? prev : next));
      frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const buttonClass = 'hud-button';

  return (
    <section aria-label="Simulation controls" className="hud-panel flex flex-col gap-3">
      <div>
        <div className="hud-label mb-1">Simulation date · UTC</div>
        <time dateTime={date} className="font-mono text-sm tabular-nums text-white">
          {date}
        </time>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={buttonClass}
          onClick={togglePaused}
          aria-label={mode === 'paused' ? 'Play' : 'Pause'}
          title="Space"
        >
          {mode === 'paused' ? 'Play' : 'Pause'}
        </button>
        <button
          className={buttonClass}
          aria-pressed={mode === 'realtime'}
          onClick={() => setMode(mode === 'realtime' ? 'simulated' : 'realtime')}
          title="R"
        >
          Realtime
        </button>
        <button className={buttonClass} onClick={reset} title="0">
          Reset
        </button>
      </div>
      <div
        role="group"
        aria-label="Simulation speed in days per second"
        className="grid grid-cols-5 gap-1.5"
      >
        {SPEEDS.map((s, i) => (
          <button
            key={s}
            className={`${buttonClass} !px-1 !py-1`}
            aria-label={`${s} days per second`}
            aria-pressed={mode === 'simulated' && speed === s}
            title={String(i + 1)}
            onClick={() => setSpeed(s)}
          >
            <span className="block">{s}</span>
            <span className="block text-[11px]">d/s</span>
          </button>
        ))}
      </div>
      <details className="border-t border-white/15 pt-2">
        <summary className="hud-disclosure">Explore views &amp; moments</summary>
        <div className="flex flex-col gap-3 pt-2">
          <div className="hud-label">Views</div>
          <div className="flex flex-wrap gap-2">
            <button
              className={buttonClass}
              onClick={() => {
                // A view is an absolute pose: drop any selection first so the
                // follow doesn't re-aim at it as soon as the flight lands.
                useUiStore.getState().select(null);
                useUiStore.getState().setView('galactic-band');
              }}
            >
              Galactic band
            </button>
          </div>
          <div className="hud-label">Moments</div>
          <div className="flex flex-wrap gap-2">
            {MOMENTS.map((moment) => (
              <button
                key={moment.id}
                className={buttonClass}
                onClick={() => {
                  useTimeStore.setState({
                    days: moment.days,
                    speed: moment.speed ?? 1,
                    mode: moment.paused ? 'paused' : 'simulated',
                  });
                  useUiStore.getState().select(moment.focusId);
                }}
              >
                {moment.label}
              </button>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
