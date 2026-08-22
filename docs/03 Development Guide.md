---
tags: [development, setup, howto]
up: "[[00 Home]]"
---

# 03 Development Guide

Dummy-proof path from fresh clone to running app. Verified against this machine (Node 26, npm 12, Go ≥1.23, cargo ≥1.88).

## 0. Prerequisites (one-time)

| Tool | Check with | Install |
|------|-----------|---------|
| Node.js + npm | `node -v` | https://nodejs.org or nvm |
| Go ≥ 1.23 | `go version` | distro package or https://go.dev/dl |
| Rust + cargo | `cargo --version` | `curl https://sh.rustup.rs -sSf \| sh` |
| Tauri system deps (Linux) | – | webkit2gtk 4.1, gtk3, libappindicator — see the [Tauri prerequisites](https://tauri.app/start/prerequisites/) page for your distro |

> [!tip] You do **not** need a global Tauri CLI
> `@tauri-apps/cli` is an npm devDependency. Always use `npm run tauri …`.

## 1. First run (exactly these commands)

```sh
cd ~/src/niri-settings

# ① frontend deps
npm install

# ② build the Go sidecar into the externalBin location.
# The Tauri CLI copies this file over target/debug/ on EVERY launch,
# so building straight into target/debug/ is silently undone.
go build -o src-tauri/binaries/niri-settings-sidecar-x86_64-unknown-linux-gnu ./sidecar

# ③ launch
npm run tauri dev
```

What ③ does: starts Vite on port **1420** (`beforeDevCommand`), compiles the Rust shell, opens a frameless **1000×640** window. Frontend edits hot-reload; Rust edits recompile automatically.

> [!warning] Step ② is not optional
> `src-tauri/src/lib.rs` spawns the sidecar from the *directory of the executable* — in dev that is `src-tauri/target/debug/`. If you skip ② every page shows "Failed to spawn sidecar". Re-run step ② whenever you change Go code under `sidecar/` (Vite and Tauri will NOT rebuild it for you).

## 2. Everyday loop

```sh
npm run tauri dev      # app
npm test               # vitest (watch: npm run test:watch)
npm run lint           # eslint . --fix
npm run typecheck      # tsc --noEmit
npm run format         # prettier
```

Commits trigger the husky pre-commit hook → `lint-staged` runs eslint + prettier on staged `.ts/.tsx/.css` only.

## 3. Runtime dependencies (what the pages actually drive)

| External thing | Used by | Missing ⇒ |
|---|---|---|
| `niri msg` / `niri validate` | display & keybinding pages, config reload | `NIRI_IPC_FAILED` errors |
| `gsettings` | icon/appearance theming | GSETTINGS_ERROR |
| quickshell daemon (`qs ipc call settings reload`) | auto-reload after settings save | silent no-op (error swallowed) |
| `~/.local/bin/{apply-display-scale,night-light,apply-theme}` | side-effect scripts | silent no-op (`.catch(() => undefined)`) |

The UI itself launches fine outside a niri session — pages degrade individually.

## 4. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every action fails, "Failed to spawn sidecar at …" | sidecar binary missing next to exe | repeat setup step ② |
| Port 1420 already in use | another Vite instance running | kill it; port is `strictPort` by design |
| Go code changes have no effect | Vite ignores `sidecar/**`, Tauri doesn't watch it | rebuild sidecar (step ②), restart `tauri dev` if Rust changed too |
| Display/keybinding pages error instantly | no niri session (`niri msg` fails) | expected off-niri; test inside niri |
| Saved settings ignored by shell | quickshell not running | start quickshell; saves still persist to disk |

## 5. Repo hygiene notes

- Git tracking set up 2026-08-22: initial commit on `main`, `.gitignore` in place (ignores `node_modules/`, `dist/`, `coverage/`, `src-tauri/target/`, sidecar build output, Obsidian workspace state).
- No README exists at repo root — [[00 Home]] of this vault is the stand-in until one is written.

Next: [[04 Building and Distribution]]
