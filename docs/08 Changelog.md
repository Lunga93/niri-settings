---
tags: [changelog, history]
---

# 08 Changelog

Dated record of shipped fixes and behavior changes: what broke, why, how it was fixed, and how it was verified. When a regression appears, find the last entry touching the same area here and in `git log` — the entry names the files and the verification that proved it worked.

Entries are newest-first. Pair every entry with a git commit (conventional commits) so code and rationale stay linked.

## 2026-08-23 — ensureWallpaperThumbs contract simplified to always resolve

**Symptom:** Editor kept reporting `TS2339: Property 'generated' does not exist on type 'true'` at the thumbs-version bump even though runtime worked and CLI tsc was clean — a stale union in the editor's TS server kept resurrecting the old boolean-era signature.

**Root cause:** The service's return type was a union (`Promise<WallpaperThumbsResult | null>`), left over from when it returned a plain boolean. Unions on this call site invited both the null-guard dance and editor-cache confusion.

**Fix:** `ensureWallpaperThumbs` now **always resolves** `{ generated, total }` — failures and unexpected shapes resolve `{ generated: 0, total: 0 }` after logging in the service layer. Callers compare `thumbs.generated > 0` directly; no null branch, no boolean legacy. Contract note: this service never returns null anymore.

**Verification:** typecheck ✓, 113 tests ✓, eslint ✓.

**Regression hints:** If failure handling ever needs distinguishing from "nothing to do", reintroduce an explicit status field on the result object — never a bare boolean/null.

## 2026-08-23 — "Fetch new wallpaper now" left the settings app stale

**Symptom:** The Fetch-now button changed the desktop wallpaper, terminal colors, everything external — but the settings app kept showing the old wallpaper in its hero preview (and old theme accents). Selecting a wallpaper from the gallery updated the app correctly.

**Root cause:** `fetch-wallpaper` overwrites `daily.jpg` **in place**, so `current_wallpaper` keeps the identical path string. The hero `<img src={resolveWallpaperUrl(current_wallpaper)}>` therefore had a byte-identical URL before and after the fetch, and the webview served its cached copy — same class of stale-cache bug as the invisible thumbnails. Two further gaps versus `applyWallpaperAtom`: fetch-now never re-read pywal colors into app state, and never busted any image caches.

**Fix:**
- New `fetchNewWallpaperAtom` in `src/lib/wallpaperAtoms.ts` owns the whole sequence: run script → `refreshWallpaperInfoAtom` → unconditional `wallpaperThumbsVersionAtom` bump (files provably changed on disk) → `getThemeColors` + `pywalThemeAtom` + `applyThemeToDOM`, mirroring manual selection.
- Hero preview URL is versioned with `?v=<thumbsVersion>` like gallery thumbs, so bumped versions reload fresh bytes.
- `WallpaperPage.handleFetchNow` reduced to calling the atom.

**Verification:** typecheck ✓, 113 vitest tests ✓ (new: fetch success bumps version even when ensure generates nothing; script failure returns false without bumping), eslint ✓.

**Regression hints:** App preview stale again ⇒ check that whatever triggers the change also bumps `wallpaperThumbsVersionAtom` or changes the URL. Any new out-of-band wallpaper mutation must go through an atom that refreshes info + theme + cache version together.

## 2026-08-23 — Rotated display renders landscape in arrangement canvas

**Symptom:** On the Display page, a portrait monitor rotated 90° (DP-1, Dell P2422H) drew its canvas box wider than tall — the "vertical display" appeared horizontal despite the inspector showing 1080x1920 logical size and the 90° badge.

**Root cause:** Double dimension swap. The sidecar's `niri msg outputs` parser set Width/Height from `Current mode:` (native pixels), but then let the later `Logical size:` line overwrite them — niri reports logical size already rotation-corrected (native 1920x1080 → logical 1080x1920). The Display page canvas *also* swaps width/height when `transform` is 90/270, so rotated displays were swapped twice and rendered in the wrong orientation. Unrotated displays were unaffected because their logical and native sizes match.

**Fix:**
- `sidecar/niri/outputs.go`: `Logical size` is now deliberately ignored — Width/Height stay native mode pixels; consumers apply transform swaps themselves. Removed the now-unused `sizeRe` regex.
- Frontend untouched: its existing `isPortrait ? height : width` swap is correct against native dims.
- Regression test `sidecar/niri/outputs_test.go` parses real two-monitor niri text and asserts native dims + transform survive parsing.

**Verification:** gofmt/vet/tests green; all four sidecar binaries rebuilt; live stdio smoke test shows `DP-1 | mode: 1920x1080 | transform: 90`.

**Regression hints:** Rotated boxes wrong again ⇒ check whether anything reintroduces logical-size overwriting or a second swap. Note `width/height` in DisplayOutput are **native mode pixels**, never logical.

## 2026-08-23 — Thumbnails invisible on first page open until a mood switch

**Symptom:** Opening the wallpapers page showed skeleton placeholders instead of thumbnails; selecting a different mood made them appear. Terminal log showed every command executing twice (`get_wallpaper_info` ×2, `ensure_wallpaper_thumbs` ×2) on page open, which gave no clue why images stayed hidden.

**Root cause:** Two stacked issues. (1) Card readiness relied solely on `<img onLoad>`; when the webview serves an already-cached image the load event can fire before React attaches its listener, so `imageLoaded` stayed `false` and the image remained at `opacity-0`. Mood switches reconciled the grid enough to recreate the `<img>` nodes, letting the event land on the second attempt. Yesterday's removal of the unconditional thumbs-version bump had been accidentally masking this with a forced second load pass. (2) React StrictMode double-invokes the page's mount effect, launching two concurrent refresh cycles against the sidecar (the doubled logs).

**Fix:**
- New global `thumbStatusAtom`/`markThumbStatusAtom` in `src/lib/wallpaperAtoms.ts` replace per-card `useState`: confirmed loaded/error state survives remounts and is keyed by versioned URL.
- Card in `src/pages/WallpaperPage.tsx` verifies `img.complete && naturalWidth > 0` in an effect (covers missed events) and appends `?v=<thumbsVersion>` to asset URLs so a version bump genuinely refetches/retries instead of just resetting flags.
- `refreshWallpaperInfoAtom` shares one module-level in-flight promise; concurrent callers (StrictMode double-mount, manual refresh button) join the running cycle.
- Sidecar success log line in `src-tauri/src/lib.rs` now includes payload size plus summaries (`generated N/M` for ensure_wallpaper_thumbs, `scanned/listed` for get_wallpaper_info).

**Verification:** typecheck ✓, 111 vitest tests ✓ (new: concurrent-refresh dedupe, thumb status marking), eslint ✓, cargo check ✓.

**Regression hints:** Stuck skeletons after this change ⇒ check `thumbStatusAtom` keys match the exact `versionedUrl` used by `<img src>`. Duplicate sidecar cycles returning ⇒ new caller bypassing `refreshWallpaperInfoAtom`.

## 2026-08-23 — Sidecar monolith split into domain packages (Go standards pass)

**Symptom:** `sidecar/main.go` had grown to 744 lines holding wire types, arg parsing, generic file ops, and the whole wallpaper domain — every feature meant editing the same file; untestable outside package main.

**Root cause:** No structure existed beyond per-domain logic folders (`audio/`, `niri/`, …); all handlers, transport helpers, and the wallpaper catalog lived in `main.go`.

**Fix:** Followed current community standards (package-by-feature over package-by-layer, thin entrypoint, shallow hierarchy, no utils dumping ground):

- New `sidecar/protocol/` owns the JSON envelope (`Request`/`Response`/`AppError`, `WriteResponse`/`WriteError`, typed arg getters) — domain packages never touch stdout directly.
- Handlers moved next to their logic: `niri/handlers.go`, `audio/handlers.go`, `system/handlers.go`, `theme/handlers.go`, new `settings/` package, and a new `wallpaper/` package (catalog + thumbs + handlers).
- `wallpaper.Build()` returns a `Catalog` struct instead of a 4-value tuple; test moved to `wallpaper/catalog_test.go`.
- `main.go` is now an 83-line registry dispatch (`map[string]protocol.Handler`) — adding a command = one registry row + one handler.
- Tech debt fixed in passing: `any` replaces `interface{}`, single `os.Stat` reuse with truthful disk mtime, audio volume handler now rejects missing `id` like its sibling, encode errors logged.

**Verification:** gofmt/vet/tests green, all four binary targets rebuilt, live stdio smoke test (`get_wallpaper_info` returns valid envelope, ghost-free count 106, UNKNOWN_COMMAND path intact).

**Regression hints:** "Unknown command" after adding one ⇒ forgot the registry row in `main.go`. Response shape regressions ⇒ diff `protocol/protocol.go` first.

## 2026-08-23 — Wallpaper page state reset on navigation

**Symptom:** Leaving the Wallpaper page and returning reloaded every thumbnail (grid flashing back to skeletons), collapsed the gallery reveal back to 24 cards, and lost scroll position.

**Root cause:** Two compounding issues. (1) `refreshWallpaperInfoAtom` bumped `wallpaperThumbsVersionAtom` unconditionally on every mount, even when `ensure_wallpaper_thumbs` generated nothing — each card's retry effect then cleared `imageLoaded` and re-requested all images. (2) The reveal counter was component state reset by an effect keyed on the `filteredWallpapers` array identity, which changes on every refetch/remount.

**Fix:** Version bump now happens only when the sidecar reports `generated > 0` (service returns `WallpaperThumbsResult | null`). Reveal count moved into `galleryVisibleCountAtom`; it resets only when the mood filter changes and is clamped if the library shrinks. Dead code removed: unused `listWallpapers` service, `WallpaperListSchema`/`WallpaperList`.

**Verification:** typecheck + 109 vitest tests (incl. new bump/no-bump regression tests) + eslint green.

**Regression hints:** thumbnails flashing again ⇒ check whether anything else writes `wallpaperThumbsVersionAtom`. Note `WallpaperThumbsResult` is deliberately kept — it is the service return type.

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
