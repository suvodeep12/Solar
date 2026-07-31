# Windows: bash in System32 is the WSL stub — point at Git's bash explicitly
set shell := ["C:\\Program Files\\Git\\bin\\bash.exe", "-ec", "-o", "pipefail"]

default:
    @just --list

# Full pre-commit gate: lint + typecheck + tests
gate:
    @cd client && bun run lint
    @cd client && bun run typecheck
    @cd client && bun run test

alias verify := gate

# Dev server (Vite, :5173, /api proxied to :5000)
dev:
    @cd client && bun run dev

# Production build
build:
    @cd client && bun run build

# Auto-format all source
format:
    @cd client && bun run format

# Dependency vulnerability scan
audit:
    @cd client && bun audit

# Lint with autofix
fix:
    @cd client && bun run lint --fix
