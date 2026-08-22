---
tags: [moc, index]
---

# niri-settings — Home

A cross-platform-styled desktop settings application for the [niri](https://github.com/YaLTeR/niri) Wayland compositor and its quickshell desktop shell. Built with **Tauri v2**: React UI, thin Rust core, and a Go sidecar that does the actual system work.

> [!note] Repo state (Aug 2026)
> The repo has **no commits yet**, no README, and no `.gitignore`. See [[05 Code Standards]] for hygiene TODOs.

## Reading order

| # | Note | What you learn |
|---|------|----------------|
| 1 | [[01 Architecture]] | Three-tier design, directory map, IPC command registry |
| 2 | [[02 Execution Flow]] | Mermaid diagrams: startup, settings-change pipeline, sidecar protocol |
| 3 | [[03 Development Guide]] | Dummy-proof setup, first run, troubleshooting |
| 4 | [[04 Building and Distribution]] | Producing a working executable / installers |
| 5 | [[05 Code Standards]] | Conventions, testing gates, code reference index |

## TL;DR

```sh
# one-time setup
npm install
go build -o src-tauri/target/debug/niri-settings-sidecar ./sidecar

# every dev session
npm run tauri dev        # vite :1420 + rust build + app window

# checks
npm test && npm run lint && npm run typecheck

# production binary
npm run tauri build      # -> src-tauri/target/release/niri-settings
```

> [!warning] Read this before running anything
> The app spawns a **Go helper binary** sitting *next to the executable*. If it is missing, every page errors with "Failed to spawn sidecar". The one-time `go build …` line above prevents this. Full explanation in [[03 Development Guide]].
