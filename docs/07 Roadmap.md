---
tags: [roadmap, todo]
---

# 07 Roadmap

> [!info] For the developing agent
> This is the working backlog, ordered by priority. Each item lists evidence (`file:line`), the fix, and acceptance criteria. Work top-down; one item ≈ one commit. Read [[01 Architecture]], [[05 Code Standards]], and [[06 Design Brief]] first. **Always rebuild the sidecar after touching `sidecar/**`** — see [[04 Building and Distribution]].

**Verified facts you can rely on (Aug 2026):**

- The Go sidecar's `get_wallpaper_info` **works**: returns 123 indexed wallpapers, correct mood counts (`dark 24, sky 24, earth 21, cool 17, light 14, warm 5`) and a valid base64 preview. The wallpaper problem is **UI-level**, not backend.
- Light mode is broken because there is **no light palette anywhere** — see P0.1.
- Every settings write fires its side-effect **before** the settings file is flushed — see P0.2.

---

## Tech-lead review — Aug 22 evening (snapshot of `856e1d5` + working tree)

Gates were **all green** (typecheck, eslint, 103 tests, `go vet`/`go build`, `cargo check`) while the app visibly regressed — proof the verification section needs behavioral checks, not just compile gates. Code was changing during review; re-validate line numbers before acting.

**What landed well:** wallpaper gallery + mood filtering works against real data; `set_wallpaper` sidecar command delegates to the existing `~/.local/bin/set-wallpaper` script (awww + apply-theme + persistence); monolith split started correctly (`schemas/wallpaper.ts`, `wallpaperAtoms.ts`, no duplicate atom instances); honest per-item error atom (`wallpaperApplyErrorAtom`).

**Regressions / risks found (fix before new features):**

1. **[security] Asset protocol wide open** — `tauri.conf.json` sets `assetProtocol.scope: ["**"]`: the webview may read *any* file on disk via `convertFileSrc`. Scope it to `$HOME/Pictures/wallpapers/**` and the thumbnail cache directory only.
2. **[security/stability] Sidecar resolution fallbacks** — `resolve_sidecar_binary()` (`src-tauri/src/lib.rs`) tries 8 cwd-relative paths then falls back to bare `PATH` lookup. A production launch from an unexpected directory can execute an arbitrary same-named binary. Keep exe-dir lookup; drop cwd/PATH fallbacks outside dev builds.
3. **[perf regression] `get_wallpaper_info` payload grew** — the response still embeds the ~1.9 MB base64 hero **and** now the full `wallpapers` catalog with metadata, re-downloaded through a fresh process spawn on every page visit. The thumbnail pipeline (asset protocol) was enabled but never used; the base64 path must go.
4. **[race] `applyWallpaperAtom` chains** three spawns (set → full info refresh → theme colors) and reads `colors.json` immediately after `set-wallpaper` kicks off an *async* `apply-theme` — accents can render from the previous wallpaper. Also refreshes the entire catalog just to update one hero.
5. **[P0.2 not applied to new code]** — every write atom in `wallpaperAtoms.ts:148,158,176,190` still does fire-and-forget `writeSettings(next).catch(() => undefined)` followed by file-touching scripts (`skip_today`). New code must follow the flush-before-side-effect rule.
6. **[repo hygiene]** `.output.txt` (522 KB of dumped base64) sits at repo root from a debug session — delete it and add `*.output.txt` / debug dumps to `.gitignore`. Verbose per-command logging (`eprintln!` in Rust, `log.Printf` in Go) has no level gating — fine in dev, noisy in release.
7. **[data consistency]** `getWallpaperData` merges cache-tagged paths (incl. `archive/*`) with a *non-recursive* scan of `~/Pictures/wallpapers`; untagged sub-directory files are invisible, and `filteredWallpapersAtom` carries a large fallback path reconstructing items from raw strings (`file_size: 0, mtime: 0`) — normalization logic leaking into UI because backend shape and UI needs disagree. Pick one source of truth server-side.
8. **[still dead]** `topBarAtom` remains in the trimmed `atoms.ts`.

### Design debt: Wallpaper page (can still see improvements)

- [ ] Filename labels bleed/overflow thumbnail cards (screenshot: truncated `min-60`-style text escaping its box) — enforce `min-w-0` on flex parents + consistent truncation; decide one label treatment (below-card vs overlay).
- [ ] Card sizing/cropping inconsistency across breakpoints; standardize aspect-ratio cards and hover states.
- [ ] Label contrast over light thumbnails (white text + weak scrim).
- [ ] Replace base64 hero with asset-protocol thumbnail (ties into review #3); show selection ring on current wallpaper; wire `wallpaperApplyErrorAtom` to a toast (sonner).

### Design debt: Display settings (can still see improvements)

- [ ] Layout canvas drag has no snap-to-grid/alignment guides and no keyboard/touch accessibility — add snap + arrow-key nudging.
- [ ] Flipped transforms (`flipped/flipped-90/…`) parsed by Go but unreachable from `ROTATION_OPTIONS`.
- [ ] Apply-layout success/failure honesty (false "Applied & Saved!") and rendered `displayOutputsErrorAtom` — still open from P0.4.
- [ ] Scale/refresh-rate/mode controls need consistent control components (shadcn Select/Slider) instead of bespoke pills.

---

## P0 — Critical fixes

### P0.1 Theme architecture: real foreground/background palettes

**Root cause.** `applyThemeToDOM()` (`src/lib/themeAtoms.ts:36-83`) pipes **raw pywal colors** (wallpaper-derived, always dark-ish) into CSS vars regardless of mode, mixing them with a few hardcoded creams. There is no scoped light palette; any miss falls back to the warm-dark `@theme` defaults (`src/index.css:9-49`). Result: beige-sidebar/black-content hybrids, dark UI with "Light" selected, first-paint flash.

**Tasks**

- [ ] In `src/index.css`, immediately after the `@theme` block, add a complete `:root[data-theme="light"] { … }` override containing every semantic token below (fixed warm-light palette). Also declare `color-scheme: dark` on `:root` and `color-scheme: light` on the light scope.
- [ ] Rewrite `applyThemeToDOM` to do exactly two things: set `document.documentElement.dataset.theme` and set **accent-only** vars: `--color-accent`, `--color-accent-soft`, `--color-accent-hover`, plus a new luminance-computed `--color-accent-fg`. Delete all surface/text/border overrides and `adjustBrightness` (`themeAtoms.ts:85-99`). Pywal supplies accents only; CSS owns surfaces/text.
- [ ] Kill first-paint flash: cache `{scheme, accent}` to `localStorage` on every apply; read it synchronously in `src/main.tsx` and set `data-theme` + accent vars **before** React mounts. Match the Tauri window background (`backgroundColor` in `src-tauri/tauri.conf.json` or via window setter on toggle).
- [ ] Keep `App.tsx:19-21` effect as the single reactive applier (it already re-runs on every appearance/pywalTheme change).

**Token contract (both modes required)**

| Token | Dark (warm, ~current) | Light (warm cream) |
|---|---|---|
| `--color-surface-window` | `#12100e` | `#f5ede0` |
| `--color-surface-content` | `#1a1611` | `#f5ede0` |
| `--color-surface-sidebar` | `#15110c` | `#ede3d4` |
| `--color-surface-titlebar` | `#231d16` | `#e5dbcc` |
| `--color-surface-elevated` | `#221c14` | `#ffffff` |
| `--color-surface-hover/-active` | fg @ 8% / 14% | fg @ 6% / 12% |
| `--color-text-header` | `#f5ede0` | `#1a1611` |
| `--color-text-body` | `#d6cfc4` | `#3d362c` |
| `--color-text-subtitle` | `#8a8175` | `#6c6356` |
| `--color-text-muted` | `#5c554b` | `#857a68` |
| `--color-border`/`-strong` | fg @ 8% / 14% | fg @ 10% / 18% |

All text-on-surface pairs ≥ 4.5:1 contrast.

**Accept.** Toggling Dark↔Light instantly re-skins **every** page incl. sidebar, cards, text, scrollbar; restart preserves mode with zero dark flash; grep finds no page reading pywal bg/fg.

### P0.2 Settings race: flush before side-effects

**Evidence.** Every write atom does fire-and-forget `writeSettings(next).catch(() => undefined)` then *immediately* calls `triggerSideEffects(...)`/`execScript(...)` — which reads the very file being written (`~/.config/dotfiles/settings.json`). `~/.local/bin/apply-theme` therefore can regenerate from the previous value. The appearance path even sleeps 0.5 s hoping to win the race (`src/lib/atoms.ts:107,122,137,148,…,351-355`).

**Tasks**

- [ ] Make all write atoms `await writeSettings(next)` **before** triggering effects (atoms are sync today — convert handlers to async write-atoms; jotai supports async `atom(null, async …)`).
- [ ] Remove the `sleep 0.5 &&` wrapper (`atoms.ts:353`); sequence explicitly instead.
- [ ] In `setColorSchemeAtom`: after the external apply-theme completes (~2 s), re-fetch `getThemeColors()` (`loadThemeColorsAtom`) because `wal -l` re-ranks the palette in light mode and accents may shift.

**Accept.** One toggle click applies fully; `~/.local/share/dotfiles/apply-theme.log` shows the just-written `color_scheme`.

### P0.3 Wallpaper feature completion

**CONFIRMED ROOT CAUSE of "wallpapers not loading" (Aug 22 late, reproduced end-to-end).** The Go sidecar emits valid data, but the frontend silently rejects all of it at schema validation:

1. `sidecar/main.go:468` declares `var moods []string` — for any wallpaper whose mood-cache entry is empty (27 of 123), the slice stays **nil**, and `json.Marshal` renders a nil slice as `"moods": null`.
2. `src/lib/schemas/wallpaper.ts:8` uses `moods: z.array(z.string()).default([])` — zod's `.default()` only fills `undefined`; it **rejects `null`**. One bad item fails the whole `safeParse`.
3. `getWallpaperInfo()` (`services.ts:267-271`) catches the failed parse and returns `null` → `wallpaperInfoAtom` keeps `DEFAULT_WALLPAPER_INFO` → banner "Unable to retrieve wallpapers from sidecar backend", every count 0, hero empty. Nothing throws, nothing crashes — the failure is invisible unless you know where to look.

Reproduction: run the current binary with `printf '{"command":"get_wallpaper_info","args":{}}\n' | ./src-tauri/target/debug/niri-settings-sidecar`, unwrap `.data`, feed through `WallpaperInfoSchema.safeParse` → fails on `wallpapers[i].moods` = null (indices 0/2/4/6/11/…).

**Fix directive (pick one, TS-side preferred):**
- TS (preferred): make the schema defensive — `moods: z.array(z.string()).nullish().transform(v => v ?? [])` (or `.catch([])`). Schemas are the app's boundary contract; hardening them there protects against every future backend drift.
- Go: normalize at source — after the loop in `getWallpaperData`, `if moods == nil { moods = []string{} }`. Note `main.go:516` already does this correctly (`[]string{}`) on the other path; line 468 was missed.
- Belt-and-braces: do both.

Also note: this exact class of bug (silent `null` vs missing key) will recur across every schema using `.default()` against Go responses. Audit all schemas for nullable-vs-absent semantics once, centrally.

> [!warning] Historical note
> The original "wallpapers are broken" report predates the gallery work: `wallpapers_by_mood` was fetched but rendered by nothing, and both built binaries were stale relative to `sidecar/main.go`. That product gap has since been addressed by commit `856e1d5`; what remains broken today is the validation boundary above. Mood cards only persist `selected_mood` for an external script; the hero still re-downloads ~1.9 MB of base64 through a fresh process spawn on **every** visit (`main.go:447-456`, `WallpaperPage.tsx:159`).

**Tasks**

- [x] Rebuild sidecar first: `go build -o src-tauri/target/debug/niri-settings-sidecar ./sidecar`. *(done Aug 22 23:24 — binary now newer than source)*
- [ ] Fix the `moods: null` validation failure per the root-cause analysis above (schema hardening and/or Go nil-slice normalization).
- [ ] Add a regression test: feed a fixture containing `"moods": null` through `WallpaperInfoSchema` — it must parse, not fail.
- [ ] Gallery: render a responsive thumbnail grid from `wallpapers_by_mood[selected_mood] ?? all paths`, including untagged entries under "All".
- [ ] Click-to-apply: new sidecar command `set_wallpaper {path}` that writes `~/.config/current_wallpaper`, applies it (swaybg/swww or reuse the repo's scripts), then runs `apply-theme`. Wire optimistic selection state.
- [ ] Thumbnails: generate small thumbs once per image into `~/.cache/dotfiles/thumbs/` (Go-side resize on scan), serve via Tauri asset protocol (`convertFileSrc`) — **delete the base64 hero path**.
- [ ] Loading skeletons for the grid; empty-state when a mood has 0 hits.

**Accept.** Clicking a wallpaper changes the desktop background within ~2 s and updates the hero; revisiting the page costs no multi-MB IPC; mood filter visibly filters the grid.

### P0.4 Honest states and visible errors

- [ ] `handleApplyLayout` shows "Applied & Saved!" unconditionally (`DisplayPage.tsx:203-207`) because `saveDisplayLayoutAtom` swallows errors (`displayAtoms.ts:103-105`) — rethrow and render failure.
- [ ] `displayOutputsErrorAtom` is written (`displayAtoms.ts:15,36,41`) and read by nobody; "Detect Displays" failures masquerade as "No displays found" (`DisplayPage.tsx:270-274`). Render the error state.
- [ ] Keybinding edits set optimistic state with no rollback when persist fails (`KeybindingsPage.tsx:89-99`) — revert + notify.
- [ ] Unhandled-rejection cluster: `void execScript(...)` wpctl chains have no `.catch` (`atoms.ts:358-363`); missing `wpctl` floats rejections on every sound write. Also catch `xdg-open` (`WallpaperPage.tsx:334`).
- [ ] Replace the **27× `.catch(() => undefined)`** persistence swallows with toast notifications (sonner, P3). List: `atoms.ts:107,122,137,148,161,174,187,202,213,224,234,242,250,258,289,299,304,306,317,331,339,340,354`, `services.ts:50`.

**Accept.** Force-fail paths (e.g., temporarily rename the sidecar binary) produce visible toasts, not silence; no console unhandled rejections during a full click-through.

---

## P1 — Dead code cleanup (resolves IDE warnings)

Delete unless noted. After deletion: `npm run typecheck && npm run lint && npm test` must stay green; adjust tests that referenced removed symbols.

- [ ] **Split the monoliths** (see *Separation of concerns* in [[05 Code Standards]]): break `src/lib/atoms.ts` (~370 lines: settings + appearance + wallpaper + icons + display + sound atoms + `triggerSideEffects`) into domain modules following the existing `displayAtoms.ts` / `audioAtoms.ts` / `themeAtoms.ts` pattern — e.g. `appearanceAtoms.ts`, `wallpaperAtoms.ts`, `iconsAtoms.ts`, `soundAtoms.ts`, keeping `settingsAtom`/`loadSettingsAtom` and side-effect dispatch in a small core module. Split `schemas.ts` the same way (`lib/schemas/<domain>.ts`, types exported beside their schema). Update all imports and tests; keep a thin `lib/atoms.ts` re-export barrel only if it keeps the diff reviewable, then delete it. Accept: no file in `src/lib` mixes two domains; pages import from domain modules only.
- [ ] `topBarAtom` (`src/lib/atoms.ts:22`) + entire `top_bar` section: `TopBarSettingsSchema` fields `background_opacity/text_glow/font_family/font_weight` (`schemas.ts:44-48,74`). Decision point: planned future feature — if keeping, move to a clearly-marked "future" section; otherwise delete schema + field.
- [ ] `setAccentSecondaryAtom` (`atoms.ts:126-139`) — orphan writer for `manual_secondary` (`schemas.ts:41`).
- [ ] `setSettingsFieldAtom` / `setSettingsSectionAtom` (`atoms.ts:32,60`) — test-only; either adopt as the generic writers everywhere or delete with their tests.
- [ ] `updateDeviceVolumeAtom` (`audioAtoms.ts:63`) — per-device volume has no UI; `SoundPage` reads `settings.sound.*` only, so parsed `AudioDevice.volume/.muted` are permanently stale.
- [ ] `readNiriConfig`, `writeNiriConfig`, `validateNiriConfig`, `readFile`, `writeFile` (`services.ts:69-160`) — unused wrappers.
- [ ] `invokeSidecar` (`sidecar.ts:36-66`) — everything uses `invokeRaw`; keep one path.
- [ ] `reloadQuickshell` (`sidecar.ts:98`) + unreachable dispatch case `"reload_quickshell"` (`sidecar/main.go:102-103`, handler `:185-191`).
- [ ] `Divider` component (`src/components/settings/Divider.tsx`) — never rendered.
- [ ] **Duplicated ToggleSwitch (the 15-line fragment)**: `DisplayPage.tsx:40-58` defines a private near-copy of the shared `components/settings/ToggleSwitch.tsx` minus the `disabled` prop. Use the shared one.
- [ ] `DisplayLayoutConfigSchema` (`schemas.ts:108`) — used nowhere.
- [ ] `parseDisplayOutputs` (`schemas.ts:191`) vs inline schema in `displayAtoms.ts:19` — dedupe into the shared parser.
- [ ] `bindingForAtom` / `setKeybindingsAtom` (`stores/keybindingAtoms.ts:22,27`) are tested but bypassed by `KeybindingsPage` (inline `.find()` at `:30-31`, direct primitive write at `:206`) — make the page use the atoms (kills an O(n²) too) or delete them.
- [ ] Unused CSS tokens (`src/index.css`): `--color-danger-soft`, `--color-success-soft`, `--color-warn`, and the three `--radius-*` tokens (nothing consumes them). Either wire radius tokens into utilities during P4 or drop. `accent-soft/hover` become live again via P0.1.
- [ ] Empty package dir `sidecar/kdl/` (abandoned parser).
- [ ] `tauri-plugin-shell` (Rust `lib.rs:78` + `package.json`) — zero usages in `src/`. Remove unless adopted deliberately.
- [ ] Prune dead schema fields (keep anything P0.3 consumes): `sources_order`, `unsplash_api_key`, `wallhaven_api_key`, `pexels_api_key`, `recent`, `favorites`, `library_dir`, `alert_sounds_enabled` (`schemas.ts:24-34,68`); `PywalTheme.wallpaper/alpha/cursor` (`:144-146`); `DisplayOutput.enabled/refresh_hz/current_mode` (`:93-101`) — or surface them in Display UI.
- [ ] Mock pages: `NetworkPage.tsx:25-60` and `SysInfoPage.tsx:7-26` render hard-coded fake state — wire real sidecar data or visually mark as placeholders.
- [ ] Flipped transforms unreachable: Go normalizes `flipped/flipped-90/180/270` (`niri/outputs.go:196-207`) but `ROTATION_OPTIONS` (`DisplayPage.tsx:33-38`) cycles only normal/90/180/270 — add flipped modes.

---

## P2 — Performance

Measured baseline: single 491 KB eager JS bundle; 14 framer-motion importers; ~24 `whileHover`/27 `whileTap`; **0 memoized components**; 24 `sidecar_command` spawns per session (one process per trivial op); 0 polling.

- [ ] Code-split pages: `React.lazy` all eight static page imports (`AppLayout.tsx:7-14`); target initial bundle < 200 KB gz.
- [ ] Thumbnail pipeline (P0.3) removes the largest IPC payloads.
- [ ] Persistent sidecar (or request batching): today `mkdir -p && date > file` costs a whole Go process spawn (`atoms.ts:301-307`); gsettings = one spawn per key (`services.ts:127-136`). A long-lived sidecar with framed JSON over stdin/stdout is the architectural goal ([[01 Architecture]] protocol unchanged).
- [ ] Tab switching pays exit-then-enter animation (~0.4 s) via `AnimatePresence mode="wait"` (`AppLayout.tsx:53-67`) **plus** remount refetches through new spawns — switch to `mode="popLayout"`/sync and cache fetched info per session (invalidate on explicit refresh only).
- [ ] `KeybindingsPage`: all 45 rows subscribe to the entire keybindings atom and regex-normalize per render (`KeybindingsPage.tsx:30-31`); memoize rows, precompute a `Map` (reuse `bindingForAtom`).
- [ ] Double persistence per toggle: `atomWithStorage` sync-writes full JSON to localStorage **and** spawns a disk write with no change detection (`atoms.ts:17,45,48-50`) — add shallow-equality short-circuit.
- [ ] Memoize leaf components with stable props (`SettingsGroup`, `SettingsRow`, `ToggleSwitch`, pill selectors) once pages are lazy.
- [ ] Document (don't remove) StrictMode double-mounting in dev duplicating startup spawns (`main.tsx:7`).

**Accept.** Cold open < 1 s to interactive; tab switch imperceptible (< 100 ms); sidecar spawns per session ≤ 8; bundle budget met in `vite build` output.

---

## P3 — Library additions

| Library | Purpose | Resolves |
|---|---|---|
| **shadcn/ui** (Radix primitives) | Dialog, Select, DropdownMenu, Tabs, Tooltip, Slider, Switch — styled via our own tokens | Replaces bespoke `<select>` (WallpaperPage `:266-275`), hand-rolled modal (KeybindingsPage `:143`), ad-hoc pills/sliders; consistent a11y + focus-visible rings for free |
| **sonner** | Toasts | Every swallowed error in P0.4 gets user feedback |
| **cmdk** | ⌘K command palette | Jump to any of the 8 pages + run actions ("toggle light", "fetch wallpaper") |
| **tauri-plugin-window-state** | Remember window size/position | Desktop-app polish |

Notes:

- shadcn works with Tailwind v4; map its CSS-variable layer onto the P4 token names so components consume **only** our semantics.
- Install: `npx shadcn@latest init` then `add dialog select dropdown-menu tabs tooltip slider switch`; `npm i sonner cmdk`; `npm i @tauri-apps/plugin-window-state` + register in `lib.rs`.
- Gate: after adding, `rg "bg-\[#|text-\[#|border-\[#"` over `src/pages` must trend to zero.

---

## P4 — Design overhaul (foreground/background system)

The app owns **fixed dual palettes** (P0.1 table); pywal contributes accents only. This is the visual contract for every component, present and future:

- [ ] Enforce semantic-token-only styling in pages/components; ban raw hex arbitrary values (`bg-[#…]`) except inside the Live Theme Preview mock.
- [ ] Radius discipline: use (or delete) `--radius-card/control/pill` consistently — currently three dead tokens while pages freehand `rounded-xl/2xl/lg`.
- [ ] Selection indicators: replace `ring-white` patterns (`AppearancePage.tsx:226-227,260-261`, `WallpaperPage.tsx:208`) with `ring-accent ring-offset-[surface]` so they survive light mode.
- [ ] Focus-visible rings on every interactive element (Radix gives most of this).
- [ ] Skeleton/empty states for every async region (wallpaper grid, displays, devices, bindings).
- [ ] Motion standard: single ease `[0.22, 1, 0.36, 1]`, durations ≤ 300 ms, `whileTap` scale ≥ 0.97; respect `prefers-reduced-motion`.
- [ ] Sidebar section labels and muted text verified against the light palette (≥ 4.5:1).
- [ ] Consolidate duplicated theme controls (Appearance page vs `DisplayPage.tsx:503`) into the Appearance page; Display links to it.

Visual direction lives in [[06 Design Brief]] — this section is its engineering enforcement.

---

## Verification gates (run after every section)

```sh
go vet ./... && go build -o src-tauri/binaries/niri-settings-sidecar-x86_64-unknown-linux-gnu ./sidecar
cargo check                              # in src-tauri/
npm run typecheck && npm run lint && npm test
```

Manual matrix before calling P0 done:

- [ ] Toggle Dark↔Light on **all 8 pages** — no mixed/half-themed states, no flash on relaunch
- [ ] Accent Dynamic↔Manual × both schemes — accent updates everywhere, text on accent readable (`--color-accent-fg`)
- [ ] Restart persistence: scheme, accent, wallpaper selection survive
- [ ] Wallpaper: click-to-apply changes the real desktop background
- [ ] Failure visibility: rename sidecar binary → every action toasts, no silent no-ops, no unhandled rejections
- [ ] `vite build` output meets the P2 bundle budget

---

*Sources: dead-code/state audit + performance recon + live sidecar probe, Aug 2026. Update this doc as items land; strike completed boxes.*
