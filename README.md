# niri-settings

A settings application for the [niri](https://github.com/YaLTeR/niri) Wayland compositor and its quickshell desktop shell — wallpaper, appearance, icons, display, keybindings, network, sound.

## Stack

| Tier | Tech | Location |
|------|------|----------|
| UI | React 19 · TypeScript · Vite · Tailwind 4 · jotai · zod | `src/` |
| Core | Tauri v2 (Rust) | `src-tauri/` |
| System access | Go sidecar (JSON over stdio, spawned per request) | `sidecar/` |

The frontend never touches the system directly: it calls one Tauri command (`sidecar_command`), which pipes a JSON request to the Go sidecar next to the executable. See `docs/01 Architecture.md`.

## Development

Prerequisites: Node.js, Go ≥ 1.23, Rust, and the [Tauri Linux dependencies](https://tauri.app/start/prerequisites/).

```sh
npm install
go build -o src-tauri/target/debug/niri-settings-sidecar ./sidecar   # required before first run
npm run tauri dev
```

## Checks & build

```sh
npm test            # vitest
npm run lint        # eslint --fix
npm run typecheck   # tsc --noEmit
npm run tauri build # production bundle in src-tauri/target/release/
```

## Documentation

Full docs live in [`docs/`](./docs/00%20Home.md) as an Obsidian vault:

- [[docs/00 Home|Home]] · [[docs/01 Architecture|Architecture]] · [[docs/02 Execution Flow|Execution Flow]]
- [[docs/03 Development Guide|Development Guide]] · [[docs/04 Building and Distribution|Building]] · [[docs/05 Code Standards|Code Standards]] · [[docs/06 Design Brief|Design Brief]]

## License

All rights reserved © lunga.
