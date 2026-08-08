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

  const buttonClass =
    'rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-xs text-white/80 transition-colors hover:border-sky-400/60 hover:text-white';

  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-lg border border-white/10 bg-black/50 p-3 backdrop-blur-sm">
      <div className="font-mono text-xs tracking-widest text-white/60">SIM DATE</div>
      <div className="font-mono text-sm text-white">{date}</div>
      <div className="flex items-center gap-1">
        <button
          className={buttonClass}
          onClick={togglePaused}
          aria-label={mode === 'paused' ? 'Play' : 'Pause'}
          title="Space"
        >
          {mode === 'paused' ? '\u25b6' : '\u2759\u2759'}
        </button>
        {SPEEDS.map((s, i) => (
          <button
            key={s}
            className={buttonClass}
            data-active={mode === 'simulated' && speed === s}
            title={String(i + 1)}
            style={
              mode === 'simulated' && speed === s
                ? { borderColor: 'rgba(56,189,248,0.7)', color: '#fff' }
                : undefined
            }
            onClick={() => setSpeed(s)}
          >
            {s}d/s
          </button>
        ))}
        <button
          className={buttonClass}
          style={
            mode === 'realtime' ? { borderColor: 'rgba(56,189,248,0.7)', color: '#fff' } : undefined
          }
          onClick={() => setMode(mode === 'realtime' ? 'simulated' : 'realtime')}
          title="R"
        >
          REAL
        </button>
        <button className={buttonClass} onClick={reset} title="0">
          RESET
        </button>
      </div>
      <div className="font-mono text-xs tracking-widest text-white/60">VIEWS</div>
      <div className="flex flex-wrap gap-1">
        <button
          className={buttonClass}
          onClick={() => {
            // A view is an absolute pose: drop any selection first so the
            // follow doesn't re-aim at it as soon as the flight lands.
            useUiStore.getState().select(null);
            useUiStore.getState().setView('galactic-band');
          }}
        >
          GALACTIC BAND
        </button>
      </div>
      <div className="font-mono text-xs tracking-widest text-white/60">MOMENTS</div>
      <div className="flex flex-wrap gap-1">
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
  );
}
