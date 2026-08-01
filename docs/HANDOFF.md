# Handoff — Solar client "wow" package

Date: 2026-08-01. Pick up where this leaves off. Full spec: AGENTS.md (canonical).

## State

- `main` at `57f79df` ("feat: moon transit shadows and lunar eclipses (phase b item 1)"), Phase A + Phase B item 1 done; CI green; Pages live at https://suvodeep12.github.io/Solar/ (deploys from main push).
- Working tree clean. `bun run verify` green (8 files / 77 tests) at 57f79df.
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
1. **Moon shadows / eclipses** — DONE (57f79df), verified live:
   - Transit spot (black 0.5-opacity circle, renderOrder 3, depth-tested) + lunar-eclipse darkening (`material.color.setScalar(0.2/1)`) in `Planet.tsx` `Moon` component; spot mesh is a SIBLING of the moon group (local origin = tilt group = planet center — inside the group its local origin was the moon's orbit position, wrong), `name={moonId}_spot` for probes.
   - All geometry in the tilt frame: `sunLocal = tiltedPosition(normalize(-bodyPositionAt(parent)), axialTiltDeg)`; gates `dot > cos(sunAng+moonAng)` (transit) / `dot < -cos(max(0, sunAng-planetAng))` (eclipse); sunAng = `asin(sunRadiusScene()/planetDist)` with `planetDist = |bodyPositionAt| × AU_UNIT` (scene units — consistent).
   - Verified: io transit day 0.885 (dot 0.9985) → spot on Jupiter's day side at the sub-solar limb, scale 0.134 (= `0.039×9.9/2.887` — correct umbra sizing), hides on the far side; Earth lunar eclipses: 42 samples/yr, centered total eclipse at day 88.75, monthly cadence within eclipse seasons (58.75 & 88.75 are 29.5d apart — correct).
   - Note: jupiter's moons never eclipse (planetAng > sunAng → umbraHalf 0 — physically right for the big visual sun); the umbra cone exists only where `moon.sceneDistance > planetRadius/asin...` (earth ✓).
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

- `window.__solar = { scene, gl, camera, controls, time, ui }` (dev + `?debug` only; `time`/`ui` are the zustand stores — `s.time.setState({days, mode:'paused'})`, `s.ui.setState({selectedId})` for scripted scenes). No THREE global — build vectors via `new s.camera.position.constructor()`.
- Moon meshes carry `name={moonId(parentId, moon.name)}` (e.g. `saturn_titan`, `jupiter_io`, `earth_moon`) — `s.scene.getObjectByName(...).getWorldPosition(v)`; transit spots are `{moonId}_spot` (name suffix `_spot`).
- Probe gotcha: `getObjectByName('jupiter_io_spot')` may hit a dev/StrictMode stale copy (esp. mid-HMR) — `traverse` all matches and pick the visible one, or reload first.
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

1. ✅ Phase A (755729e) + Phase B item 1 eclipses (57f79df) — done, committed, verified live.
2. Phase B: meteors → lens flare → perf hygiene, verify each live, commit per item (or per group).
3. Phase C: presets + solver + tests → verify → commit.
4. Final: AGENTS.md bullets for everything confirmed, full gate, push (Pages auto-deploys).
