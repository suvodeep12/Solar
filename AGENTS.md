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
