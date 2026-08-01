export function KeyboardHints() {
  const k = 'text-white/60';
  const hint = 'font-mono text-[10px] tracking-[0.15em] text-white/40';
  return (
    <div className={`pointer-events-none select-none ${hint}`}>
      <span className={k}>SPACE</span> play/pause · <span className={k}>1–5</span> speed ·{' '}
      <span className={k}>R</span> realtime · <span className={k}>0</span> reset ·{' '}
      <span className={k}>[ ]</span> body · <span className={k}>T</span> textures ·{' '}
      <span className={k}>ESC</span> overview
    </div>
  );
}
