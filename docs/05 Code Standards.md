---
tags: [standards, conventions]
up: "[[00 Home]]"
---

# 05 Code Standards

Conventions actually enforced or established in this codebase, with references. See also [[01 Architecture]] for boundaries and [[03 Development Guide]] for the check commands.

## Non-negotiables

1. **zod schemas are the contract.** Every shape crossing the IPC boundary is defined in `src/lib/schemas.ts` (`SettingsDataSchema`, `AppErrorSchema`, …). Sidecar responses must be parsed with `invokeSidecar(cmd, Schema)` — never trust raw JSON.
2. **Services never throw.** Functions in `src/lib/services.ts` catch internally and return `null` / `false`, logging via `sidecarLogger`. Only `sidecar.ts` throws typed `AppError`s upward.
3. **Errors are structured**, not strings: `{code, message, details}` end-to-end (Go `AppError` → Rust → TS `AppError`). Add new codes in `sidecar/main.go` and match them in the UI.
4. **Rust stays thin.** No business logic in `src-tauri/src/lib.rs` — it is one command that pipes JSON. New system capabilities belong in the Go sidecar.
5. **State changes go through write-atoms.** Persistence (`writeSettings`) + `triggerSideEffects` are wired into atoms in `src/lib/atoms.ts`; components never call services to save.

## Layer rules

| Layer | May import from | Must not |
|-------|-----------------|----------|
| `pages/`, `components/` | `stores/*`, `lib/atoms`, `lib/services`, UI libs | call `@tauri-apps/api` directly |
| `lib/services.ts` | `lib/sidecar`, `lib/schemas` | touch jotai atoms |
| `lib/sidecar.ts` | `@tauri-apps/api/core`, schemas | know about specific commands' semantics |
| `src-tauri` | – | grow new commands without a strong reason |

## Naming & style

- React components `PascalCase.tsx`; hooks/helpers camelCase; atoms suffixed `Atom` (`loadSettingsAtom`).
- Services named verb-first mirroring sidecar commands: `readNiriConfig` ↔ `read_niri_config`.
- Path alias `@/` → `src/` (see `vite.config.ts`).
- Tailwind utility classes inline; theme tokens via CSS variables (`bg-surface-sidebar`, `text-text-subtitle`).
- Go: handlers grouped by domain package (`niri`, `system`, `config`); every handler writes a `Response` via `writeResponse`/`writeError`.

## Quality gates

| Gate | Command | Config source |
|---|---|---|
| Tests (vitest) | `npm test` | `test:` block in `vite.config.ts`; colocated `*.test.ts(x)`; coverage limited to `src/lib/**` excluding `sidecar.ts` |
| Lint (auto-fix) | `npm run lint` | `eslint.config.js` (flat config) |
| Types | `npm run typecheck` | `tsconfig.json` |
| Format | `npm run format` | `.prettierrc` |
| Pre-commit | automatic | husky + lint-staged on staged `ts/tsx/css` |

## Known gaps (fix-me list)

- [ ] Repo has zero commits; create initial commit.
- [ ] No root `.gitignore`: add at least `node_modules/`, `dist/`, `coverage/`, `src-tauri/target/`.
- [ ] No README at repo root.
- [ ] `bundle.externalBin` not configured ([[04 Building and Distribution]], §2).
- [ ] `config.BackupConfig` exists in `sidecar/config/paths.go` but is never called before overwriting `config.kdl` — consider wiring it into `handleWriteNiriConfig`.
- [ ] `handleOpenFile` tries editors sequentially with no timeout; a blocking `$EDITOR` could stall the response.

## Code reference index

Quick jump table for the symbols you will need most:

| Symbol | Location |
|---|---|
| `sidecar_command` (only Rust command) | `src-tauri/src/lib.rs:20` |
| Sidecar path resolution | `src-tauri/src/lib.rs:30` |
| Command dispatcher (16 cases) | `sidecar/main.go:73` |
| niri path resolution (`$NIRI_CONFIG`, XDG) | `sidecar/config/paths.go` `Resolve()` |
| `invokeSidecar` / `normalizeError` | `src/lib/sidecar.ts` |
| Service wrappers per command | `src/lib/services.ts` |
| `settingsAtom`, write-atoms, `triggerSideEffects` | `src/lib/atoms.ts` (side effects at line 334) |
| Navigation model & sidebar tree | `src/stores/appAtoms.ts` |
| Page registry map | `src/components/layout/AppLayout.tsx` |
| zod contracts | `src/lib/schemas.ts` |
