---
tags: [standards, conventions]
up: "[[00 Home]]"
---

# 05 Code Standards

Conventions actually enforced or established in this codebase, with references. See also [[01 Architecture]] for boundaries and [[03 Development Guide]] for the check commands.

## Non-negotiables

1. **zod schemas are the contract.** Every shape crossing the IPC boundary is a zod schema, centralised per domain in `src/lib/schemas/<domain>.ts` (barrel: `src/lib/schemas/index.ts`). Sidecar responses must be validated with a schema — never trust raw JSON.
2. **Services never throw.** Functions in `src/lib/services/<domain>.ts` catch internally and return `null` / `false`, logging via `sidecarLogger`. Only `lib/ipc/client.ts` throws typed `AppError`s upward.
3. **Errors are structured**, not strings: `{code, message, details}` end-to-end (Go `AppError` → Rust → TS `AppError`). Add new codes in `sidecar/main.go` and match them in the UI.
4. **Rust stays thin.** No business logic in `src-tauri/src/lib.rs` — it is one command that pipes JSON. New system capabilities belong in the Go sidecar.
5. **State changes go through write-atoms.** Persistence (`writeSettings`) + side-effect triggering are wired into atoms — one module per domain in `src/stores/`; components never call services to save.
6. **No inline SVGs.** Never paste `<svg>` markup into TSX or generate it ad hoc. Icons come from reusable components: prefer `lucide-react`; custom glyphs live in `src/components/icons/` as typed components accepting `size`/`className`. Standalone SVG *files* under `assets/` are build inputs only (e.g. `npx tauri icon assets/icon.svg`), never imported into app code.

## Layer rules

| Layer | May import from | Must not |
|-------|-----------------|----------|
| `pages/`, `components/` | `@/stores` (all state), `@/lib/services` (read-only calls), UI libs | call `@tauri-apps/api` directly |
| `lib/services/<domain>.ts` | `lib/ipc`, `lib/schemas`, `lib/logger` | touch jotai atoms |
| `lib/ipc/client.ts` | `@tauri-apps/api/core`, schemas | know about specific commands' semantics |
| `stores/<domain>.ts` | `lib/services`, `lib/schemas` | touch the DOM outside theme application |
| `src-tauri` | – | grow new commands without a strong reason |

## Separation of concerns

The 2026-08-23 restructure paid off the original monolith debt: state lives domain-scoped in `src/stores/`, services in `src/lib/services/`, transport in `src/lib/ipc/`, schemas in `src/lib/schemas/`. Keep new code inside those boundaries — do not reintroduce flat god-files.

- One module per domain owning that slice's atoms: defaults, read atoms, write atoms. Side-effect dispatch stays with the domain or moves to a dedicated module.
- Schemas/types live beside their domain (`lib/schemas/<domain>.ts`), re-exported through `lib/schemas/index.ts`.
- Pages/components never reach past a domain module into a shared grab-bag.

**Rule going forward:** new domains always get their own modules in `stores/`, `lib/services/`, and `lib/schemas/`; never grow a domain file into a grab-bag.

**Tests:** colocated under per-concern `__tests__/` directories (`stores/__tests__/`, `lib/__tests__/`, `lib/schemas/__tests__/`), not beside sources.

## Formatting

Enforced by Prettier via `npm run format` (`.prettierrc`) and husky + lint-staged pre-commit on staged `ts/tsx/css`. Active config: double quotes, semicolons, 2-space indent, 100-char print width, trailing commas everywhere, always-parenthesised arrow params.

File-layout expectations that formatting alone won't give you: one component per `.tsx` file default-exported from its own name; colocated `*.test.ts(x)` next to the unit under test; imports ordered std-lib → packages → `@/` alias → relative, with type-only imports using `import type`.

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

Fixed 2026-08-22:
- [x] Repo committed on `main`, `.gitignore` added.
- [x] Root `README.md` written.
- [x] `bundle.externalBin` configured in `tauri.conf.json` — the Go sidecar is bundled automatically (`go build ./sidecar` into `src-tauri/binaries/` still required after Go changes).
- [x] `config.BackupConfig` now runs before every `config.kdl` overwrite (`handleWriteNiriConfig`).
- [x] `handleOpenFile` no longer offers terminal editors — the sidecar has no controlling TTY so `nvim/vim/nano` would die instantly; only `code` / `xdg-open` are used.
- [x] Fractional display scales parse correctly (`Output.Scale` is `float64`; was silently truncating `1.5` → `1`).
- [x] Logical size parsing actually matches now (dedicated `sizeRe`; `modeRe` required an `@ … Hz` suffix that logical-size lines never have).
- [x] Keybinding rebinding matches quote-stripped actions, so curated entries like `set-column-width "-10%"` find their line in the KDL.
- [x] Sound settings now apply via `wpctl` (`triggerSideEffects("sound", …)`); previously they persisted but never touched the system.
- [x] `writeSettings` calls are serialized — rapid slider ticks can no longer interleave and let a stale snapshot win.
- [x] `custom_subreddits` declared in `WallpaperSettingsSchema` — found by smoke-testing the sidecar against live config: zod was silently stripping it, so the next save from the app would have deleted it (and any write would have dropped it) from disk.

Accepted limitations (documented, not bugs):
- `security.csp` is `null` in `tauri.conf.json`; fine for a local tool, revisit if it ever loads remote content.
- No timeout wraps the sidecar process; a wedged handler stalls that invoke (handlers are all quick file/CLI ops today).
- Settings persist twice (localStorage via `atomWithStorage` + disk JSON); disk wins at startup via `loadSettingsAtom`.
- niri output/keybinding parsing is text/regex based against `niri msg` formats — it will need updating if niri changes its output shape.
- zod strips unknown keys inside known sections on parse; any new field your shell scripts write into `settings.json` must be added to `src/lib/schemas.ts` or it will vanish on the next save from this app.

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
