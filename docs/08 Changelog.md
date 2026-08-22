---
tags: [changelog, history]
---

# 08 Changelog

Dated record of shipped fixes and behavior changes: what broke, why, how it was fixed, and how it was verified. When a regression appears, find the last entry touching the same area here and in `git log` — the entry names the files and the verification that proved it worked.

Entries are newest-first. Pair every entry with a git commit (conventional commits) so code and rationale stay linked.

## 2026-08-23 — Ghost wallpapers inflated counts and grid

**Symptom:** Hero badge reported 123 wallpapers while the library holds ~91 files; mood counts and mood-filtered lists included images that no longer exist.

**Root cause:** `getWallpaperData` (`sidecar/main.go`) inserted **every** entry of `~/.cache/dotfiles/wallpaper-moods.json` into the catalog without checking the file still exists. The mood cache outlives deleted/moved wallpapers, so dead entries leaked into `wallpapers`, `mood_counts`, `wallpapers_by_mood`, and `total_scanned`.

**Fix:** Cache loop now `os.Stat`s each resolved path and skips missing entries/directories before touching counts or the catalog. Regression test added: `sidecar/main_test.go::TestGetWallpaperDataSkipsDeadCacheEntries`.

**Verification:** `go vet`, new test passing, all four sidecar binary targets rebuilt, frontend gates unaffected.

**Regression hints:** counts drifting from reality again ⇒ check whether a new catalog source was added that also trusts cached paths without an existence check.

## 2026-08-23 — Wallpaper memory crash fix + thumbnail pipeline

**Symptom:** Opening the Wallpaper page froze and eventually crashed the entire machine.

**Root causes (two, compounding):**

1. Every gallery card rendered the *full-resolution* source file via the Tauri asset protocol. WebKitGTK decodes each image to uncompressed RGBA (~33 MB for 4K), with no thumbnails and no virtualization — scrolling a large library meant multi-GB RSS in the webview, starving niri itself.
2. `get_wallpaper_info` read the current wallpaper file fully into memory, base64-encoded it (+33 %) and shipped it inside one JSON line on every page visit. The payload was copied ~5× (Go → Rust stdout buffer → serde Value → IPC string → Zod/Jotai retention).

**Fix:**

- Go sidecar (`sidecar/thumbs.go`): 512 px JPEG thumbnails cached in `~/.cache/dotfiles/thumbs/` (FNV-hashed filenames, mtime staleness check, bounded worker pool). JPEG/PNG decoded natively; webp/gif/avif via ffmpeg fallback. New command `ensure_wallpaper_thumbs`.
- Removed `image_base64` end-to-end (sidecar, schema, atoms, hero `<img>`); hero now uses the asset protocol.
- Grid cards load only thumbnails; progressive reveal (24 cards + IntersectionObserver chunks) instead of full virtualization.
- Asset protocol scope locked down from `["**"]` to wallpaper + thumbs dirs. Config globs cannot expand `$HOME`, so `src-tauri/src/lib.rs` grants the two directories at runtime via `asset_protocol_scope().allow_directory()` in a `setup` hook.
- Schema-failure logging no longer dumps whole payloads into the retained logger.
- `applyWallpaperAtom` no longer triggers a redundant full catalog refresh per apply.

**Verification:** sidecar smoke test (4 K source → 10 KB thumb), live `tauri dev` run showing `get_wallpaper_info` 26 ms / `ensure_wallpaper_thumbs` 7 ms (all cache hits), typecheck + 108 tests + eslint + cargo check green.

**Regression hints:** placeholders-on-all-cards ⇒ check (a) thumbs exist in `~/.cache/dotfiles/thumbs/`, (b) the spawned sidecar is current (`Executing command … via <path>` lines on stderr), (c) runtime scope hook still present in `lib.rs`.

## 2026-08-23 — Stale sidecar binary resurrected by Tauri CLI (follow-up to the above)

**Symptom:** After shipping the thumbnail pipeline, every card still showed placeholder icons despite correct frontend/Rust/scope changes.

**Root cause:** The dev docs said to build the sidecar straight into `src-tauri/target/debug/`. The Tauri CLI re-copies `bundle.externalBin` (`src-tauri/binaries/niri-settings-sidecar-x86_64-unknown-linux-gnu`) over that path on **every** launch — silently reverting to a pre-thumbnail binary. Cards then received no `thumbnail` field (empty image URLs) and `ensure_wallpaper_thumbs` failed as "Unknown command", swallowed by the service layer.

**Fix:** Build the canonical suffixed binary instead (`docs/00 Home.md`, `docs/03 Development Guide.md`, `docs/07 Roadmap.md` updated with an explicit warning).

**Regression hints:** "my rebuild did nothing" ⇒ diff byte size/mtime of `src-tauri/target/debug/niri-settings-sidecar` against `src-tauri/binaries/niri-settings-sidecar-x86_64-unknown-linux-gnu`; they must match after a launch.

## 2026-08-23 — Settings write-atom deduplication

**Change:** `src/lib/atoms.ts` repeated the same mutate→set→persist→side-effect boilerplate across ~15 write atoms. Extracted a single `commitSettings(get, set, mutate, sideEffect?)` helper; sound volume/mute quartet collapsed into `soundVolumeFieldAtom`/`soundMutedFieldAtom` factories; the accent-color twins share `accentColorAtom(key)`. Persistence failures are now logged uniformly.

**Removed:** unused `listWallpapers` service (and `WallpaperListSchema` import) from `src/lib/services.ts`; the sidecar command remains available if needed later.

**Verification:** typecheck + 108 tests + eslint green; atom exports and signatures unchanged, so page call sites are untouched.

## Format for new entries

```
## YYYY-MM-DD — Short title

**Symptom/Context:** …
**Root cause:** …            (or **Change:** for refactors)
**Fix:** …                   (files + mechanism)
**Verification:** …          (commands run, evidence seen)
**Regression hints:** …      (optional: where to look first if it breaks again)
```
