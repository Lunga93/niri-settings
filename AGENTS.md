# AGENTS.md

## What this is

Settings companion for the [niri](https://github.com/YaLTeR/niri) Wayland compositor. Three strictly separated tiers:

```
React 19/TS UI (src/) → Tauri v2 (src-tauri/) → Go sidecar (sidecar/)
        invoke()         one command:          registry map in main.go,
                         sidecar_command       JSON over stdio, one spawn per request
```

Rust is deliberately thin (`src-tauri/src/lib.rs` — pipes JSON, no business logic). All system access lives in Go.

## Commands

```sh
npm install
go build -o src-tauri/binaries/niri-settings-sidecar-x86_64-unknown-linux-gnu ./sidecar  # BEFORE first dev run
npm run tauri dev
```

- The target-triple suffix is required: it is the `externalBin` path from `src-tauri/tauri.conf.json`. The Tauri CLI re-copies it into `target/debug/` on every launch, so building straight into `target/debug/` (as `README.md` still suggests) is silently clobbered.
- **Rebuild the sidecar after any change under `sidecar/**`** — Vite ignores that dir and nothing else watches it.
- **Production build:** `npm run tauri build` → `src-tauri/target/release/niri-settings`. The `tauri` script is mapped to `tauri` (not `tauri dev`), so `npm run tauri build` correctly runs a release build that bundles `dist/` into the binary. A debug build (`tauri dev`) embeds `localhost:1420` and will show "Connection refused" when installed.
- **Install:** `./build-install.sh` (builds + installs to `~/.local`), or `./packaging/make-tarball.sh` then `./install.sh` from the tarball.
- `npm test` — vitest run; single file: `npx vitest run src/stores/__tests__/settings.test.ts`
- `npm run typecheck` — tsc --noEmit
- `npm run lint` — eslint . **--fix** (mutates the working tree; not a pure check)
- `npm run format` — Prettier; also enforced on commit via husky + lint-staged (staged ts/tsx/css)
- Vite dev server: port 1420, `strictPort` — kill stray instances before starting.
- No CI runs lint/tests on push/PR; only `release.yml` (tag push) runs typecheck + test. Local gates are the gates.
- Go ≥ 1.22 (from `sidecar/go.mod`).

## Layout & boundaries

Post-restructure homes (`docs/01`–`docs/04` deleted; `docs/05` trimmed):

| Concern | Location |
|---|---|
| State atoms | `src/stores/<domain>.ts` (+ `index.ts`) |
| Services | `src/lib/services/<domain>.ts` |
| zod schemas | `src/lib/schemas/<domain>.ts` |
| Transport | `src/lib/ipc/client.ts` (only file importing `@tauri-apps/api/core`) |
| Command dispatch | `sidecar/main.go` registry map (~45 commands across domain packages) |

Layer rules: pages/components use stores + services only; services catch internally and return `null`/`false` (log via `sidecarLogger`); only `lib/ipc/client.ts` throws typed `AppError`s; new system capabilities go in the Go sidecar, not Rust. A new domain gets its own module in **all three** of `stores/`, `lib/services/`, `lib/schemas/`.

Trust code over prose here: the README setup command, the docs' code index ("16 commands", `src/lib/{atoms,services,schemas,sidecar}.ts`), and older audit notes predate the restructure. Verify claims by reading source.

## Conventions that bite

- ESLint errors on: `any`, **every type assertion** (`x as T` banned — use zod parse/narrowing), missing explicit return types, non-arrow functions, value-importing types (`import type` required).
- Every sidecar response must pass a zod schema via `invokeSidecar`. Unknown keys are **stripped on parse**: a field written to disk by shell scripts must be declared in `src/lib/schemas/` or it vanishes on the next app save.
- Icons come from `lucide-react`; never inline `<svg>` in TSX.
- Tests live in per-concern `__tests__/` dirs (not beside sources); vitest env is `node` — no jsdom, so there are no DOM/component tests. Atom tests use `createStore` from jotai; services and IPC are mocked via `vi.mock("@/lib/services")` / `vi.mock("@/lib/ipc")`.
- Path alias `@/` → `src/`.
- IPC helpers: `invokeSidecar` throws on error; `callSidecar` catches and returns `null`. Services should use `callSidecar` or wrap `invokeRaw` + manual `safeParse` with try/catch returning `null`/`false`.

## Sharp edges (facts, not bug reports)

- A stale 4.5 MB compiled binary is tracked at root `binaries/niri-settings-sidecar`; nothing references it. The real sidecar lives gitignored under `src-tauri/binaries/`.
- `resolve_sidecar_binary()` (`src-tauri/src/lib.rs`) falls back through cwd-relative paths and bare PATH lookup if exe-dir resolution misses.
- Wallpaper scan (`sidecar/wallpaper/wallpaper.go` `Build`) is non-recursive over `~/Pictures/wallpapers`; mood-cache-tagged subdirs merge in, untagged subdir files are invisible. `filteredWallpapersAtom` synthesizes fallback items (`file_size`/`mtime` = 0) when the catalog array is empty.
- Wallpaper-store write atoms persist via unawaited `writeSettings(next).catch(() => undefined)`; new code with ordering-sensitive side effects should await persistence first (e.g. skip_today writes settings then touches marker files).
- Release: git tag `v<ver>` must equal `version` in `src-tauri/tauri.conf.json` (CI enforces); keep `package.json` version in sync manually. Portable tarball: `./packaging/make-tarball.sh`.
- Runtime deps degrade individually outside a niri session: display/keybinding pages need `niri msg`; quickshell reload and theme helper scripts fail silently by design.
- `docs/01`–`docs/04` deleted (stale post-restructure). `docs/05` trimmed. Trust source over these docs.
