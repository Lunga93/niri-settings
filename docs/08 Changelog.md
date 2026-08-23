---
tags: [changelog, history]
---

# 08 Changelog

Dated record of shipped fixes and behavior changes: what broke, why, how it was fixed, and how it was verified. When a regression appears, find the last entry touching the same area here and in `git log` — the entry names the files and the verification that proved it worked.

Entries are newest-first. Pair every entry with a git commit (conventional commits) so code and rationale stay linked.

## 2026-08-23 — Startup Applications page; dex runner fixed on live config

**Feature:** New "Startup Apps" page under System managing XDG autostart entries (`~/.config/autostart/*.desktop`): list with enable/disable toggles (Hidden/NoDisplay flags), add-by-name+command form, delete. Because niri does not process XDG autostart itself, the page detects whether a runner exists — `dex`/`wlautostart` on `$PATH` **and** a `spawn-at-startup` line in the niri config — and offers a one-click, idempotent fix that appends `spawn-at-startup "dex -a"` when missing.

**Live fix applied:** The probe revealed this machine had a JetBrains Toolbox autostart entry and `dex` installed but no runner line, so autostart entries silently never ran at login. The runner line was added to `~/.config/niri/config.kdl` (pre-change backup: `/tmp/opencode/config.kdl.pre-dex`).

**Implementation:** Sidecar `startup` package (parse/serialize desktop entries, slug ids, hidden-flag preservation on update, path-escape rejection) + handlers registered as `list_startup_apps`, `upsert_startup_app`, `set_startup_app_enabled`, `delete_startup_app`, `ensure_autostart_runner`. Frontend: schema/service/store/page wired into the sidebar (Rocket icon), optimistic toggle with reload-on-failure reconciliation.

## 2026-08-23 — Portable script discovery; no more hardcoded install paths

**Symptom:** Helper scripts were assumed to live in `~/.local/bin` and the frontend invoked them by absolute path in shell strings (`~/.local/bin/apply-theme "$(cat ~/.config/current_wallpaper)"`). On any machine that installs them elsewhere — or only on `$PATH` — capabilities reported false while invocations failed, or vice versa.

**Fixes:**
- **Sidecar resolver** (`system/scripts.go`): named scripts resolve through `$NIRI_SCRIPT_BIN_DIR` → `$XDG_BIN_HOME` → `~/.local/bin` → `$PATH`. Names containing `/` are rejected.
- **New `run_script {name, args}` command**: executes a resolved script with string args under the same timeout/process-group guard rails. Args cross the JSON boundary via marshal round-trip (no type assertions).
- All frontend call sites rewired: apply-theme now receives the wallpaper path from `get_wallpaper_info` (no more shell `cat` of the marker file), and set-wallpaper/fetch-wallpaper/apply-display-scale/night-light all go through `run_script`.
- Keybindings page shows a notice when niri IPC is absent instead of silently failing.
- Docs: new [[09 Setup Tiers]] describing what works on bare niri vs helper-scripts-only vs the full dotfiles desktop.

**Regression hints:** Script not found ⇒ check resolution order above and `system/scripts_test.go`; banner wrong ⇒ compare `get_capabilities` output with installed scripts.

## 2026-08-23 — Night-light freeze, honest light mode, real network status

**Symptoms:** Toggling night light froze every backend feature; clicking Dark/Light left the app black while labels flipped; Network page always claimed ethernet was "Unplugged"; a stale sidecar made the new capability banners lie about missing scripts on first boot.

**Root causes:**
- `ExecScript` used `CombinedOutput()`: backgrounded children (wlsunset from the night-light script) inherit the output pipe forever, so `cmd.Wait()` never returned and the single-threaded sidecar command loop wedged permanently — every later click queued behind it. This is also why Light mode never persisted: the appearance chain's `write_settings` hung before reaching disk.
- Light mode reused pywal's **wallpaper background** for the window surface (`window: bg`), so a dark wallpaper kept the app black; `--color-surface-content` was missing entirely from the DOM token list, pinning the content pane dark.
- The Network page was static decoration — no atoms, no sidecar calls.

**Fixes:**
- **Sidecar `ExecScript` hardening:** file-backed stdout/stderr (daemons inheriting fds are harmless), process groups (`Setpgid`) and a 20 s timeout that SIGKILLs runaway foreground children. Tests cover failing scripts, backgrounded daemons and timeouts.
- **Light mode is real:** window/content/sidebar/titlebar surfaces come from the fixed light family when `color_scheme=light` regardless of wallpaper darkness; `data-theme="light|dark"` lands on `<html>` for `color-scheme`; content pane is now themed.
- **Single theme toggle:** removed DisplayPage's duplicate Color Scheme control — Appearance owns Dark/Light.
- **Network page live data:** new sidecar `get_network_status` merges `nmcli device status` with `ip -j addr`, filters docker/veth/loopback noise, and reports per-interface state + IPs. Wi-Fi/Ethernet rows reflect reality (ethernet now correctly reads connected with its address).
- Capability banners only appear after a successful probe; a stale sidecar binary during development can briefly show false negatives until reload.

**Regression hints:** Backend freeze after running a script ⇒ check `ExecScript` timeout path (`system/commands_test.go`). Wrong interface list ⇒ `isVirtualInterface` prefix list in `system/network.go`. Light mode regressing ⇒ `deriveThemeTokens` surface branches in `stores/theme.ts`.

## 2026-08-23 — Cursor control is real; quickshell Icons page deprecated

**Symptom:** Icon/cursor changes wrote gsettings correctly (verified: `Cosmic`/`Pop` in both `~/.config/dotfiles/settings.json` and gsettings) yet nothing visibly changed. Root causes: no xsettings daemon on niri ⇒ running GTK apps never repaint; the quickshell bar renders hardcoded text glyphs and ignores icon themes entirely; niri's `config.kdl` had no `cursor` block so cursor-theme barely reached anything; and a second competing UI — quickshell's own IconsPage with hardcoded presets (Tela/WhiteSur/Numix…) — could stomp values written by this app. Tray icons rendered as generic placeholders because Qt had **no icon theme configured at all** (falls back to hicolor).

**Fixes:**
- **Sidecar `set_niri_cursor`:** patches the top-level `cursor { }` block of the niri config (`sidecar/niri/cursor.go`; brace-counted block scan, commented-out blocks ignored, missing keys inserted, block appended when absent), writes `~/.config/environment.d/50-niri-cursor.conf` (`XCURSOR_THEME`/`XCURSOR_SIZE`) for future sessions, then hot-reloads niri. Five hermetic tests cover append/replace/insert/comment+nesting/invalid args.
- **Cursor atoms** (`stores/settings.ts`) now apply through one `applyCursor()` helper: gsettings (GTK apps) **and** niri config, on theme change, size change, and backup restore alike.
- **quickshell Icons page deprecated:** sidebar entry and `pageSources` mapping removed (index-mapped lists stay aligned); `IconsPage.qml` replaced by an inert stub that only offers an "Open Niri Settings" launcher — it reads/writes nothing.
- **Icons page hints:** captions state where each change takes effect.
- **Sidecar `set_quickshell_icon_theme`:** rewrites the `//@ pragma IconTheme <name>` line in quickshell's `shell.qml` (`sidecar/system/quickshell.go`; inserts under the last pragma or before imports when absent). quickshell watches its config and hot-reloads, re-resolving every tray/dock icon under the new theme — no restart needed. Wired into the icon-theme atom and backup restore; verified live via `qs log` ("Reloading configuration...") after a click.

**Regression hints:** Cursor not applying ⇒ check `cursor { }` in `~/.config/niri/config.kdl` and `environment.d/50-niri-cursor.conf`; sidecar tests in `niri/cursor_test.go`. Bar icons not following theme changes ⇒ check the pragma line in `~/dotfiles/quickshell/.config/quickshell/shell.qml` and `qs log`; sidecar tests in `system/quickshell_test.go`. Wrong quickshell page opening ⇒ `Categories.qml` order must match `SettingsContent.qml` `pageSources` order.

## 2026-08-23 — Theme switching feels instant; Icons page actually works

**Symptom:** Toggling light mode left the app dark until restart ("feels broken"); a `sleep 0.5` hack raced settings.json; the Appearance "Live Theme Preview" was a static mockup saying nothing; the Icons page offered hardcoded theme lists (Tela/Colloid/WhiteSur/Numix…) mostly **not installed**, silently fired-and-forgot gsettings calls, and selecting a missing theme blanked system icons to placeholders with no way back.

**Fixes:**
- **Instant theme switch:** appearance write-atoms moved into `stores/theme.ts`; state + CSS-variable repaint happen synchronously, then a serialized chain persists → runs `apply-theme` (no sleep) → re-reads the regenerated pywal palette and repaints again. Rapid toggles can no longer clobber each other.
- **Single source of truth:** `deriveThemeTokens(theme, appearance)` now feeds both `applyThemeToDOM` and the page preview.
- **Active Palette card** replaces the mockup: labeled swatches of the exact tokens in effect (Background/Sidebar/Card/Text/Secondary/Accent/Border) + a sample surface rendered from those values + regeneration spinner.
- **Icons page:** new sidecar `list_desktop_themes` scans XDG dirs (`index.theme` ⇒ icon theme; non-empty `cursors/` ⇒ cursor theme; reserved fallbacks skipped). Page shows only installed themes (current selection flagged if uninstalled), surfaces gsettings failures inline instead of swallowing them.
- **Backups:** first override captures the original icon/cursor theme (localStorage-backed) and exposes "Restore original".

**Regression hints:** DOM-not-updating after scheme toggle ⇒ check the serialized chain in `stores/theme.ts`. Icons page empty ⇒ `list_desktop_themes` payload must match `DesktopThemesSchema`. Theme math drift between preview and app ⇒ both must read `deriveThemeTokens`.

## 2026-08-23 — CI release pipeline

**What:** `.github/workflows/release.yml` automates the whole release: tag push (`v*`) runs frontend gates, builds the optimized sidecar (with a stdio smoke test), bundles AppImage/deb/rpm, assembles the portable tarball, and publishes a GitHub Release with all four artifacts. Tag/version mismatch fails fast; manual `workflow_dispatch` uploads artifacts to the run instead. Docs §04 §1c.

**Regression hints:** Failed tag build ⇒ check tag matches `tauri.conf.json` version first.

## 2026-08-23 — App icon, release bundles, portable installer

**What:** First distributable release of niri-settings.

- Custom app icon: settings-gear glyph on slate gradient (`assets/icon.svg` seed → full set via `npx tauri icon`). Bundled into deb/rpm/AppImage desktop entries + hicolor icons.
- Release pipeline proven end-to-end: optimized sidecar (`-trimpath -ldflags "-s -w"`, 3.0 MB vs 4.6 MB debug) → `tauri build` → `niri-settings_0.1.0_amd64.{AppImage,deb}` + `.rpm`.
- Parity verified: release sidecar output identical to debug (only randomized `wallpapers_by_mood` seed names differ, by design); raw binary and extracted AppImage both resolve the sidecar exe-adjacent and pass live smoke tests.
- Portable tarball via `packaging/make-tarball.sh` with user-local `install.sh`/`uninstall.sh` (XDG bin/desktop/hicolor-icon layout). Installed on this system at `~/.local/bin/niri-settings`; launcher entry "Niri Settings".
- Arch note: AppImage bundling needs `APPIMAGE_EXTRACT_AND_RUN=1`.
- New code standard (#6): no inline SVGs in TSX — lucide-react or components under `src/components/icons/`; standalone SVG files are build inputs only.

**Regression hints:** Missing icon after rebuild ⇒ re-run `npx tauri icon assets/icon.svg`. Sidecar-not-found in an installed copy ⇒ the two binaries must stay siblings (`install.sh` guarantees this).

## 2026-08-23 — Frontend split into layered folders (ipc / services / schemas / stores)

**Symptom:** `src/lib/` was flat spaghetti: `services.ts` (426 lines) handled every domain (settings, niri config, displays, audio, wallpaper, theme, files, gsettings); state lived in two homes (`lib/*Atoms.ts` and `stores/`); transport, schemas, logging and logic shared one directory; tests sat beside sources.

**Root cause:** No layer boundaries — the frontend equivalent of the sidecar monolith fixed earlier today.

**Fix (package-by-feature, mirroring the Go sidecar layout):**
- `src/lib/ipc/` — transport only: `client.ts` (invoke/invokeRaw/execScript), `errors.ts` (normalizeError). Dead `reloadQuickshell` removed.
- `src/lib/services/` — one file per domain (`settings`, `niri`, `display`, `system`, `audio`, `theme`, `wallpaper`) with `index.ts` re-exporting, so `@/lib/services` imports keep working.
- `src/lib/schemas/` — flat `schemas.ts` split into `errors/settings/wallpaper/display/audio/theme/keybindings` + `index.ts`.
- `src/stores/` — single home for all Jotai state: `settings/theme/wallpaper/display/audio/app/keybindings` (was `lib/*Atoms.ts` + scattered stores files), unified behind `@/stores`. Pages/components now import state from one place.
- Tests moved into per-concern `__tests__/` directories (`stores/__tests__/`, `lib/__tests__/`, `lib/schemas/__tests__/`).

**Verification:** typecheck ✓, 113 vitest tests ✓, eslint ✓.

**Regression hints:** Import errors after this change ⇒ old paths are gone (`@/lib/atoms|*Atoms` → `@/stores`, `@/lib/sidecar` → `@/lib/ipc`). Adding a service = new file in `lib/services/<domain>.ts` + export via its `index.ts`.

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
