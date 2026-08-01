import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'solar:welcome-seen';
const FADE_MS = 500;

/**
 * One-time first-load control overlay: fades out on the first pointerdown or
 * keydown (any key), remembered per browser via localStorage so returning
 * visitors are not nagged. pointer-events-none so the very first click also
 * reaches the canvas underneath.
 */
export function WelcomeOverlay() {
  const [state, setState] = useState<'shown' | 'fading' | 'hidden'>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === null ? 'shown' : 'hidden';
    } catch {
      return 'shown';
    }
  });
  const dismissed = useRef(false);

  useEffect(() => {
    if (state === 'hidden') return;
    const dismiss = () => {
      if (dismissed.current) return;
      dismissed.current = true;
      setState('fading');
      window.setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, '1');
        } catch {
          // private mode / storage blocked — still hide for this session
        }
        setState('hidden');
      }, FADE_MS);
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [state]);

  if (state === 'hidden') return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-opacity duration-500 ${
        state === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="mx-4 max-w-md rounded-xl border border-white/10 bg-black/70 p-6 text-center shadow-2xl backdrop-blur-md">
        <h1 className="font-mono text-2xl tracking-[0.35em] text-white">SOLAR SYSTEM</h1>
        <p className="mt-2 font-mono text-[11px] tracking-widest text-white/50">
          REAL JPL ORBITS · 365 SIM DAYS PER SECOND MAX
        </p>
        <div className="mt-4 space-y-1 border-t border-white/10 pt-4 font-mono text-[11px] tracking-[0.15em] text-white/60">
          <div>
            <span className="text-sky-300/80">LMB</span> orbit ·{' '}
            <span className="text-sky-300/80">RMB</span> pan ·{' '}
            <span className="text-sky-300/80">WHEEL</span> zoom ·{' '}
            <span className="text-sky-300/80">DBL-CLICK</span> focus
          </div>
          <div className="pt-1">
            <span className="text-sky-300/80">SPACE</span> play/pause ·{' '}
            <span className="text-sky-300/80">1–5</span> speed ·{' '}
            <span className="text-sky-300/80">[ ]</span> body ·{' '}
            <span className="text-sky-300/80">T</span> textures ·{' '}
            <span className="text-sky-300/80">ESC</span> overview
          </div>
        </div>
        <p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-white/30">
          CLICK ANYWHERE OR PRESS ANY KEY
        </p>
      </div>
    </div>
  );
}
