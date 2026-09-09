export function KeyboardHints() {
  const k = 'text-white';
  const hint = 'font-mono text-xs leading-relaxed text-slate-300';
  return (
    <div className={`hud-hints pointer-events-none select-none ${hint}`}>
      <span className={k}>SPACE</span> play/pause · <span className={k}>1–5</span> speed ·{' '}
      <span className={k}>R</span> realtime · <span className={k}>0</span> reset ·{' '}
      <span className={k}>[ ]</span> body · <span className={k}>T</span> textures ·{' '}
      <span className={k}>ESC</span> overview
      <div className="mt-1">
        <span className={k}>LMB</span> orbit · <span className={k}>RMB</span> pan ·{' '}
        <span className={k}>WHEEL</span> zoom · <span className={k}>DBL-CLICK</span> focus
      </div>
    </div>
  );
}
