# AGENTS.md

MERN app: React 19 + Vite SPA in `client/`, Express 5 + Mongoose API in `server/`. TypeScript (strict) everywhere. Bun is the runtime and package manager. This file is the canonical spec — code, scripts, and config must match it; if something here contradicts reality, fix the mismatch and update this file.

## Standing directive (user, 2026-07-31)

- Proactively suggest workflow improvements to keep everything 10/10; never stop at "good enough".
- No mistakes: verify with the full gate and real-browser checks where possible; if something looks off, investigate before moving on.
- Ask, never assume: ambiguous choices are a question, not a guess.
- Bleeding edge only: newest stable majors of tools/libraries; prefer fresh solutions over comfortable ones.
- Any skill, MCP server, plugin, or tool may be used; installing new software on the machine is fine once confirmed by the user.
- Record every confirmed improvement here so it survives sessions.

## Commands

Run inside `client/` or `server/` — there is no root package.json, no workspace tooling. Don't create either without asking. Root `justfile` provides recipes (`just gate`, `just dev`, `just build`, `just format`, `just audit`, `just fix`) — `just` is installed; verify with `just --list`.

- Install: `bun install` (commit `bun.lock`; add dev deps with `bun add -d`)
- Dev: `bun run dev` — client: Vite on :5173 (proxy `/api` → `http://localhost:5000` in `vite.config.ts`); server: `bun --watch src/index.ts` on :5000
- Build: `bun run build` — client: `tsc -b && vite build`; server: `tsc -p tsconfig.json`
- Verify: `bun run lint` (ESLint 9 flat config, `eslint.config.js` — never add `.eslintrc*`) · `bun run typecheck` · `bun run format` (Prettier: 2-space, single quotes, semicolons)
- Test: `bun run test` = Vitest; one file: `bunx vitest run src/routes/auth.test.ts`
- Full gate (single command): `bun run verify` = `bun run lint && bun run typecheck && bun run test`
- Pre-commit gate: `bun run lint && bun run typecheck && bun run test` (lefthook runs it)
- Scripts must not use Unix-only commands (`rm -rf`, `cp -r`) — they fail on Windows (win32).
- Long-lived shells (opencode, IDE terminals) carry a stale PATH — prefix commands with `$env:PATH = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")` so freshly installed tools (bun, gh, gitleaks, just) resolve.

## Confirmed improvements (2026-07-31)

- GitHub Actions: `ci.yml` (lint/typecheck/test/audit on push+PR) and `pages.yml` (build → GitHub Pages, `GH_PAGES=1` switches Vite `base` to `/Solar/`; local dev stays `/`). Add a `server/` job to `ci.yml` when server exists
- Playwright MCP registered globally (`~/.config/opencode/opencode.jsonc`) with Chromium installed — use it for real-browser QA of the WebGL app (jsdom can't run WebGL); restart opencode to load it
- Vite bundle split via `build.rolldownOptions.output.manualChunks`: `three` chunk (three/fiber/drei/postprocessing/three-stdlib) + `vendor` chunk (react/react-dom/react-query/zustand)
- `bun run verify` script + root `justfile` recipes (`gate`, `dev`, `build`, `format`, `audit`, `fix`)
- `.editorconfig` (LF, 2-space, utf-8) at repo root; `.gitignore` allows tracked images under `docs/`
- Public repo polish: README, MIT LICENSE, description + topics on GitHub, Pages deployment of the client
- Texture fix: solarsystemscope.com serves NO CORS headers and blocks hotlinking (mars needs a browser UA; pluto is fully server-blocked) — vendored 10 NASA 2K JPGs into `client/src/assets/textures/` (imported statically in `textures/nasa.ts`, loaded via `THREE.TextureLoader`, so no fetch/CORS path; `vite-env.d.ts` types `*.jpg`). Live-site console went from 41 errors to 0; new `client/public/favicon.svg` + `%BASE_URL%` fixed the favicon 404
- Clickable body labels (label `onClick` → `select()`) solve planet picking at overview zoom (3px bodies); sun emissive 1.15 in NASA mode (2.2 washes out the photosphere)
- Screen-space labels: no `distanceFactor` on drei `<Html>` — fixed `text-[10px] tracking-[0.15em]` + per-frame distance opacity fade (was scale-inflated ~2.7× at overview)
- Saturn ring texture: solarsystemscope.com ring PNG is fully hotlink-blocked (403 even with browser headers; `4k_` variant 404); Wikimedia mirror rate-limits (429); threejs.org examples no longer host it. Used Grant Hutchison's Celestia `saturn-rings.png` (4096×2 RGBA, public domain, `classe.cornell.edu/~seb/celestia/hutchison/`) — premultiplied-ish pale RGB, alpha defines C/B/Cassini/A bands. Ring uses custom `ringGeometry(inner, outer, segments)` with radial UVs (u = normalized radius, v = 0.5) — the old planar-square UVs smeared the strip diagonally across the planet face. Ring plane = axial-tilt group (`rotation-z`), mesh `rotation-x=-π/2`, meshBasicMaterial transparent DoubleSide depthWrite false
- Max anisotropy: `textures/anisotropy.ts` module (default 16, set/get) applied inside texture loaders, bootstrapped from renderer via `<MaxAnisotropy />` in `SolarSystemScene.tsx`. ESLint `react-hooks/immutability` forbids mutating `texture.anisotropy` in components (even via local aliases) — mutate only in loaders
- Venus uses `2k_venus_atmosphere.jpg` (clouds; the dark `_surface` map was deleted); moons use NASA map + procedural fallback, sphere 32×24, tidally locked spin `(days*TAU)/periodDays`
- CameraRig: fly-to is a self-contained 1.3s easeOutCubic animation (`fly = {fromDist, toDist, dir, t0}` captured at click time, camera = `f.pos + dir·dist`) that ENDS EXACTLY at the target — no exponential lerp tail. When not flying the rig NEVER writes `camera.position` (the old per-frame `offset`/`dist` chase pulled the camera back toward a stale `desired` each frame → rubber-band wheel zoom, verified locally); OrbitControls owns wheel/rotate fully, rig only lerps `controls.target` toward `f.pos` for the follow. Any input cancels the fly (`onStart` → `fly = null`) so the wheel always works mid-flight. `dampingFactor` 0.12, `minDistance` 0.6 (can't dive into the sun mesh), `maxDistance` 140; manual pan/zoom needs no rig bookkeeping anymore
- Click reliability: `uiStore.select()` bumps `focusTick` on every call so re-selecting the SAME body re-files the camera (zustand same-value sets otherwise skip `CameraRig`'s `[selectedId]` effect — deps are `[selectedId, focusTick]`); every body has an invisible oversized hit sphere (`max(0.3, radiusScene*2)`; sun `max(0.6, 1.5×)`, opacity-0 basic material, depthWrite false) so 3px bodies are clickable at overview without near-miss deselects (`onPointerMissed` → `select(null)` fires on any missed click). CRITICAL: label clicks MUST `e.stopPropagation()` — R3F's default `compute` maps `event.offsetX/Y` (relative to the LABEL element, ~21×15px) against the canvas size into garbage NDC, the raycast misses, and `onPointerMissed` deselects what the label just selected (traced locally: label select then instant `select(null)`; hit spheres already stopped propagation, labels did not). The Sun is a full selectable body: `StarSpec` (kind `'star'` — a SINGLETON literal, so `kind === 'star'` narrows the `SelectableSpec` union; a wide `BodyKind` discriminant there makes TS type-guard false branches misbehave) is in `ALL_BODIES`, CameraRig flies to origin with `sunRadiusScene()*12`, InfoPanel renders a star layout (no orbit rows). Moons are NOT selectable (MoonSpec has no BodySpec) — deliberate
- Visual overhaul (2026-08-01): custom `shaders/starfield.*.glsl` (13k twinkling seeded stars, 2 shells) + `shaders/atmosphere.*.glsl` (fresnel rim); `scene/sky/` (Starfield, MilkyWay — vendored ESO Gigagalaxy `milky_way.jpg` on dimmed BackSide sphere); `scene/effects/Atmosphere.tsx` (pulsing Sun corona, Earth/venus/mars rims); Earth clouds (`2k_earth_clouds.jpg` Wikimedia mirror — solarsystemscope.com now 403s even with browser UA) + night lights (`2k_earth_nightmap.jpg` from github raw); `DebugExpose` sets `window.__solar = {scene, gl, camera}` under `?debug` (DEV-only, tree-shaken). **BUG FOUND: `@react-three/postprocessing` `HueSaturation` with `saturation > 1` shifts warm colors to cyan** (verified by bisection + pixel sampling: warm sun 255,132,66 → cyan 2,152,156; its luminance-based sat math is broken). Replaced with custom 10-line `scene/effects/Saturation.tsx` (postprocessing `Effect` with `mainImage` shader, `luma + (rgb-luma)*uSaturation`, blend default NORMAL — custom effects are plain `<primitive object={effect} />` children, the composer collects `instanceof Effect` from the group). CA was also dropped from the grade (Bloom+Noise+Vignette+Saturation only)
- Phase 3 (2026-08-01, 95edb13): `scene/ParticleBelt.tsx` — generic instanced rock/ice field (per-instance `setColorAt` tints, power-law sizes, rigid group rotation); drives main belt (5k warm browns, 2.2–3.2 AU), `KuiperBelt.tsx` (6k icy blues 30–55 AU, faint halo — visible because far plane is 600), `ScatteredDisc.tsx` (1.5k sparse, 35–95 AU, y-spread 5). Uranus rings: `RingSpec` gained optional `texture`/`opacity` — narrow icy bands via procedural `uranus_ring` 1024×16 strip at 0.55 opacity on the 97.7° tilted plane (NASA saturn_ring strip must NOT leak to other bodies: only Saturn uses it). Halley (`bodies/comets.ts`): real JPL elements (a=17.834, e=0.96714, i=162.26°, epochDays=+5074.39 → perihelion 1986-02-09), NON-selectable visual (not in ALL_BODIES); `BodySpec.epochDays` shifts mean anomaly (unit-tested); `scene/Comet.tsx` — tail = tapered +X streamer geometry (RINGS×SEGMENTS), quaternion setFromUnitVectors(+X, normalize(pos)) each frame so it always points AWAY from the sun, `scale.x = clamp(sunDist·0.32, 1, 24)`, brightness `1.1/(sunDist+0.4)` clamped [0.08, 1], shimmer `sin(vFade·60 + uTime·6)`, additive DoubleSide depthWrite false renderOrder 2 + bloomed coma + pulsing halo; faint 512-pt orbit lineLoop (opacity 0.18). **Verification tip: comet perihelion is at t = −5074 days from J2000 (i.e., 22,431 days / 61.5s at 365d/s AFTER reset)** — the classic "13.9s" trap; pause the sim inside one atomic Playwright call (tool roundtrips are seconds; screenshot is ~30s)
- Earth cloud fix (2026-08-01, post-95edb13): the vendored `2k_earth_clouds.jpg` has a GRAY halo (corners 103–207, not black) → AdditiveBlending white-washed the planet to a white sphere. Both texture paths now emit WHITE pixels + alpha = coverage (`nasa.ts` `cloudAlphaTexture()` rewrites luminance→alpha; `procedural.ts` `cloudsTexture` alpha = `c²`), consumed with NORMAL blending (opacity 0.85, depthWrite false). Squared alpha keeps thin haze subtle (34% alpha>32) while thick storms stay visible (7.6% alpha>128); 0% alpha>200 so bloom can't re-white it. Verified live: sub-solar ocean reads (183,223,252), night side dark, zero white pixels on the disk. **QA trap: the sim RUNS at 1d/s by default and Earth drifts — pause (`❙❙`) before close-up pixel checks; also `gl.readPixels` returns BLACK unless you call `gl.render(scene, camera)` first (composer swaps the back buffer), and `page.screenshot` is the reliable path — it captures the composed output**
- WSL is installed but tooling stays Windows-native (justfile Git-bash shell mandatory); live site is `https://suvodeep12.github.io/Solar/` (NOT any other owner)

## Architecture

- `client/src/`: feature folders; single QueryClient in `lib/queryClient.ts`. TanStack Query v5 owns all server state — never duplicate it into Zustand stores (Zustand is UI state only)
- `client/src/solar/`: 3D solar system (React Three Fiber v9 + drei + three 0.185; react pinned 19.2.x — r3f peer requires <19.3). Real JPL-derived orbital data in `bodies/jpl.ts` (AU, km, days); scene scaling in `bodies/display.ts` (km→units + visibility floors); Kepler orbit math + J2000 time in `simulation/orbitMath.ts`; time/UI state in Zustand (`simulation/timeStore.ts`, `simulation/uiStore.ts`) — animation reads stores via `getState()` in `useFrame`, never via React selectors. Textures: NASA 2K photos vendored in `src/assets/textures/` (CC BY 4.0, Solar System Scope; served same-origin — never fetch texture URLs cross-origin, the host blocks CORS) with deterministic procedural fallback (`textures/procedural.ts`); Pluto/Ceres/small moons are procedural-only. Scene components in `scene/`, HUD in `hud/` (Tailwind v4). Pure math is unit-tested — don't add scenes/effects to tests (jsdom can't run WebGL); verify visuals/browser behavior with the Playwright MCP
- `client/src/api/`: typed fetch wrappers hitting relative `/api/...`; never hardcode an absolute API URL; no CORS middleware in dev (Vite proxy handles it)
- `server/src/index.ts`: app bootstrap + `app.listen`; routers in `src/routes/` mounted under `/api`; Mongoose schemas in `src/models/`; business logic in `src/services/`
- Client and server have separate package.json files; shared types are duplicated deliberately — no shared package

## Express 5 — this is NOT Express 4

- Async handlers need no try/catch: rejected promises are forwarded to error middleware automatically (no `next(err)` in handlers)
- Wildcard routes: `/*` is invalid — use `/*splat`, or `/{*splat}` to also match `/`
- `res.json(body, status)` is removed → `res.status(201).json(body)`; `res.redirect(302, url)` (arg order swapped); `res.send(200)` → `res.sendStatus(200)`; `app.del()`, `res.sendfile()`, `req.param()` are gone
- `req.body` is `undefined` before body parsing (not `{}`); `req.query` is a read-only getter, default "simple" parser
- `express.urlencoded()` defaults to `{ extended: false }` — pass `{ extended: true }` explicitly if needed

## MongoDB / Mongoose

- Connection string from `MONGODB_URI` in `server/.env`; dev URIs use `127.0.0.1`, not `localhost` (Node ≥17 resolves localhost to IPv6 and MongoDB usually isn't listening there)
- `server/.env` is gitignored; `server/.env.example` lists required vars (`MONGODB_URI`, `PORT`, `JWT_SECRET`). Never commit real secrets; never invent env vars without adding them to `.env.example`
- Read-only queries use `.lean()`; prefer `populate()` over denormalized copies

## Testing

- Vitest in both packages; server API tests use Supertest
- API tests read `MONGODB_TEST_URI` (default `mongodb://127.0.0.1:27017/mern_test`) and must clean up documents they create — tests share one DB
- Client tests mock the API layer with MSW; client tests must never hit a real server

## Conventions

- `"strict": true` in both tsconfigs; no `any`, no unused locals; type-only imports use `import type`
- Auth: JWT in `Authorization` header; keep auth logic in middleware, not inline in route handlers
