# Handoff — Solar client "wow" package

Date: 2026-08-01. Pick up where this leaves off. Full spec: AGENTS.md (canonical).

## State

- `main` at `fe1ebd8` ("fix: exact moon-follow pivot through gestures + reviewer round-2 nits"), pushed; CI green; Pages live at https://suvodeep12.github.io/Solar/ (deploys from main push).
- Working tree clean. `bun run verify` green (8 files / 77 tests) at fe1ebd8.
- No `server/` dir, no `client/src/api/` — server work explicitly deferred by user ("api later", "Defer DB entirely"). Client-only from here.
- User wants this client to be "as cool/mindblowing/impressive/10/10 as possible", asked to "use proactively any installed plugins/skills/MCP" — session tools did NOT include anything new (config at `~/.config/opencode/opencode.jsonc` still lists the same 10 plugins + playwright MCP); new installs likely load after an opencode restart. `customize-opencode` skill available if config work is needed.

## Approved plan (user picked scope; Phase A mandatory, Phase B items: eclipses, meteors, lens flare, perf hygiene, quick-jump presets; URL state + screenshot button NOT selected)

### Phase A — interaction feel (start here)
1. **Real slide-pan** — rework `CameraRig.tsx` with a `panOffset` (world vector relative to body):
   - Not interacting: `controls.target = f.pos + panOffset` (copy each frame); when pause expired, lerp `panOffset → 0` at 3/s (body gently re-centers).
   - Interacting: SKIP the copy (OrbitControls owns target during gestures). The moon delta-follow must then ALSO translate `controls.target` by the moon's delta (5b-era trick, now works since the copy no longer wipes it) so the rotate pivot stays glued.
   - `onEnd`: `panOffset = controls.target − f.pos`; `|panOffset| > 0.2` → 3s stick (`panPauseUntil`). Fly start: zero panOffset + cancel pause.
   - CRITICAL copy rule: copy runs when `!interacting || f.fly` (during a fly the target must track f.pos even mid-gesture).
   - Current bug being fixed: unconditional `controls.target.copy(currentTarget)` (line ~158) reverts every pan → pan is a janky "vantage move", body never leaves center; overview pans fight the re-aim.
2. **Dynamic `minDistance`**: moon selected → 0.15, else 0.6 (sun can't be dived into). Derive in render from `selectedId` (`moonById` exists for `sun` too? no — `bodyById('sun')` is the star; moon ⇔ `bodyById(id) === undefined && moonById(id) !== undefined`).
3. **Discoverability**: extend `KeyboardHints.tsx` legend with mouse controls ("LMB orbit · RMB pan · wheel zoom · dbl-click focus"); one-time first-load overlay (auto-fades on first pointerdown); double-click-to-focus on bodies (Planet.tsx + Sun.tsx + Moon onClick → add onDoubleClick; careful: double-click also fires two clicks → selection twice is fine, focusTick bumps).

### Phase B — visuals
1. **Moon shadows / eclipses** (in `Planet.tsx` `Moon` component + per-moon shadow disc):
   - Transit spot: black soft disc at planet surface point toward the moon. All math in the tilt frame (Moon's `groupRef.position` IS the tilt-frame local pos — Moon lives inside the tilt group, Planet.tsx:214+271). `spotDir = normalize(moonLocal)`; disc at `spotDir × R×1.002` (R = `scene.radiusScene`), radius = umbra ≈ `moonR × planetDist/moonDist` (moonR = `sceneMoonSpec(...).sceneRadius`, moonDist = `sceneDistance`), opacity ~0.5, `depthTest: true` (hidden on far side), `depthWrite: false`, `renderOrder 3` — same pattern as the ring-shadow band (Planet.tsx:264-269: black 0.32-opacity band, scale 1.002, `[radius, 96, 12, 0, TAU, PI/2−0.245, 0.49]`).
   - Visibility gate: moon between planet and sun → `dot(normalize(moonLocal), sunLocal) > threshold` (~0.92, tune live). `sunLocal = tiltedPosition(normalize(-bodyPositionAt(parent, days)), axialTiltDeg)` (axialTilt.ts `tiltedPosition`).
   - Lunar eclipse (reciprocal): moon in planet's umbra → `dot < −threshold` → darken moon material (`material.color.setScalar(~0.2)` via meshRef material access; reset otherwise).
2. **Meteors**: new `scene/sky/Meteors.tsx` — pool of ~16 additive `THREE.Line` (or thin stretched sprites) with head + fading tail; spawn every ~8–20s (random), streak 1–2s, fade; `depthWrite false`, `frustumCulled false`; animate in `useFrame` from `clock.elapsedTime`. Keep OUT of the starfield shader (separate component, no shader churn). Visible mainly at overview — fine.
3. **Lens flare**: new `scene/effects/LensFlare.tsx` — classic sprite-ghost chain along sun→screen-center axis; procedural radial-gradient CanvasTextures (seeded like `procedural.ts` mulberry32); `THREE.SpriteMaterial` additive, `depthTest false`, `depthWrite false`; each frame: sun world pos = origin → NDC → if on-screen (|ndc| < 1), place ~6 ghosts along `normalize(center − sunNdc)` scaled by distance, opacity ∝ distance; hide off-screen. KEEP luminance below bloom threshold (0.85) so it doesn't wash out (the "orange wash" trap from earlier phases).
4. **Perf hygiene**:
   - CameraRig: module-level scratch vectors — `resolveTarget` allocates `new THREE.Vector3` every frame + `f.pos.clone()` in the delta-follow; replace with scratch pools.
   - Tab-hidden: `useThree((s) => s.setFrameloop)` — `document.visibilitychange` → hidden `'never'`, visible `'always'` (in `SolarSystemScene.tsx`; also the `TimeControls` RAF date updater keeps running — same guard or leave, it's cheap).
   - Label culling: `label.style.opacity` already set per frame (Planet.tsx:185-189, Sun, Moon); when computed opacity ≈ 0 add `display: none` to kill off-screen label DOM (25 labels at overview clutter).

### Phase C — quick-jump presets
- New `simulation/presets.ts`: `interface Moment { id, label, days, speed?, focusId }` + pure `findTransitDay(parentId, moonName, t0, t1, stepDays)` solver in `simulation/transits.ts` — scans `moonPositionAt`/`bodyPositionAt` for max `dot(moonLocal, sunLocal)` alignment; unit-test the solver + preset sanity (Halley: `days = −HALLEY.epochDays = −5074.39`).
- Presets: Halley perihelion (−5074.39, focus overview/sun), Earth June solstice (+182, focus earth), Uranus pole-on (0, focus uranus), Io transit on Jupiter (solved), Earth lunar eclipse (solved).
- UI: "MOMENTS" row under `TimeControls.tsx` (same `buttonClass`); action: `useTimeStore.setState({ days, speed: preset.speed ?? 1, mode: 'simulated' })` + `useUiStore.getState().select(focusId)`.

## Verification recipes (Playwright MCP, `http://localhost:5173/?debug`, resize 1600×900, dev server runs `bun run dev` in `client/`)

- `window.__solar = { scene, gl, camera, controls }` (dev + `?debug` only). No THREE global — build vectors via `new s.camera.position.constructor()`.
- Moon meshes carry `name={moonId(parentId, moon.name)}` (e.g. `saturn_titan`, `jupiter_io`, `earth_moon`) — `s.scene.getObjectByName(...).getWorldPosition(v)`.
- Probes: `t2m = controls.target.distanceTo(moonWorld)`, `c2m = camera.position.distanceTo(moonWorld)`, `miss = |(cam + fwd·c2m) − moonWorld|` (fwd via `getWorldDirection`), `centerPx = |project(moonWorld) − center|`.
- Label clicks are flaky in dev (StrictMode triples `<Html>` labels): click the moon hit-sphere by computing its screen projection and `page.mouse.click` at that point; or `dispatchEvent(new MouseEvent('click', {bubbles:true}))` on the visible label div (filter `textContent === name && offsetWidth > 0`, prefer on-screen).
- Pause sim before pixel checks (sim runs 1d/s; `❙❙` button). `page.screenshot` is the reliable pixel path (composer swaps back buffer; `gl.readPixels` returns black unless `gl.render` first).
- Phase A checks: pan (RMB drag) → body slides off-center, HOLDs 3s, glides back; rotate mid-follow glued at 1d/s AND 365d/s (t2m=0, miss=0 through the whole drag — this currently PASSES, keep it passing); fly-after-pan lands exact (t2m → 0, c2m → 0.6); wheel zoom-in on a moon goes below 0.6 (to 0.15 clamp), no rubber-band.
- Phase B checks: Io transit (Jupiter day side has a dark spot — screenshot + sample pixels, cf. Saturn ring-shadow band numbers 146→118→163); lunar eclipse on Earth (moon visibly dark); meteors over ~30s (screenshot); flare at sun near view edge.
- Phase C: preset clicks land exact days; transit preset visually confirmed (spot on disk).

## Gotchas (from AGENTS.md + live QA)

- Vite texture cache-busters `?t=<mtime>` — after replacing vendored textures, touch the file.
- Vite transforms/prettifies served TSX (`< 0.01` → `< .01`) — check intent not literal string when verifying HMR state.
- HMR + React 19 StrictMode double-mount: scene-graph `getObjectByName` may hit a stale copy — re-check after reload; production = single set.
- ESLint `react-hooks/immutability` forbids mutating `texture.anisotropy` in components — only in loaders.
- Scripts must be Windows-safe (no `rm -rf`); stale PATH in long-lived shells — prefix with the `$env:PATH = ...` refresh.
- Pre-commit lefthook runs prettier/vitest/eslint/tsc/gitleaks; pre-push runs tsc. Commit style: lowercase `fix:`/`feat:` with parenthetical phase tags (see `git log`).
- AGENTS.md standing directive: every confirmed improvement must be recorded there (update the 5b moon-follow bullet when CameraRig changes; add new bullets per phase).
- `0` keyboard = reset time only (NOT camera); ESC = overview/deselect.

## Files map (all read this session — edit directly)

- `client/src/solar/scene/CameraRig.tsx` (190 lines; panOffset rework goes here)
- `client/src/solar/scene/Planet.tsx` (297; Moon at 64-137 inside tilt group; ring-shadow band 262-269; selection ring 275-280; label fade 185-189)
- `client/src/solar/scene/Sun.tsx` (106; emissive pulse 34-39; atmosphere 84-91)
- `client/src/solar/scene/SolarSystemScene.tsx` (91; effects chain 83-88: Bloom 1.4/0.85/0.2, Saturation 1.15, Noise 0.055, Vignette 0.62/0.28; DebugExpose 33-44)
- `client/src/solar/scene/effects/Saturation.tsx` (custom Effect precedent for postprocessing)
- `client/src/solar/simulation/{timeStore,uiStore}.ts` (small; timeStore has setState-friendly shape)
- `client/src/solar/simulation/orbitMath.ts` (Vec3 plain objects `{x,y,z}`; `bodyPositionAt(spec, days)`, `moonPositionAt(moon, sceneDistance, days)`, `AU_UNIT`, `dateFromDays`)
- `client/src/solar/simulation/axialTilt.ts` (`tiltedPosition(local, deg)`, `tiltAngleRad`, `subSolarLatitude`)
- `client/src/solar/bodies/display.ts` (`sceneBody`, `sceneMoonSpec(moon, planetRadiusScene)` — sceneRadius floor 0.015, sceneDistance = planetRadius × distancePlanetRadii; `sunRadiusScene() = 0.55`)
- `client/src/solar/bodies/jpl.ts` (`moonId(parentId, name)` → `saturn_titan`; `moonById`; `ALL_BODIES`; `bodyById`)
- `client/src/solar/bodies/comets.ts` (`HALLEY.epochDays = 5074.39` → perihelion at days −5074.39)
- `client/src/solar/hud/{TimeControls,KeyboardHints,InfoPanel,TextureToggle}.tsx`, `hud/useKeyboardShortcuts.ts`
- `client/src/solar/SolarSystem.tsx` (HUD layout: TimeControls top-left, InfoPanel top-right, TextureToggle+KeyboardHints bottom-center)
- `client/src/solar/sky/{Starfield,MilkyWay}.tsx`, `shaders/starfield.*.glsl`, `shaders/atmosphere.*.glsl`
- `client/src/solar/scene/{AsteroidBelt,KuiperBelt,ScatteredDisc,ParticleBelt,Comet,OrbitLine}.tsx`

## Next steps (in order)

1. Phase A implementation (CameraRig panOffset + minDistance + hints/dbl-click/overlay) → live verify probes → `bun run verify` → commit (lefthook runs gate) → push.
2. Phase B: eclipses → meteors → lens flare → perf hygiene, verify each live, commit per item (or per group).
3. Phase C: presets + solver + tests → verify → commit.
4. Final: AGENTS.md bullets for everything confirmed, full gate, push (Pages auto-deploys).
