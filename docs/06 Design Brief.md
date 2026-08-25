---
tags: [design, brief]
---

# 06 Design Brief — niri-settings

**For:** designers taking over the look, feel, and structure of this app.
**Status of this document:** requirements only. It describes *what the app does and must support* — every visual and structural decision is yours.

> [!tip] Ground rule
> Nothing in the current interface is sacred. Treat the capability inventory below as the product; the existing screens are one possible (unloved) interpretation, summarized neutrally in the appendix so you know what exists today.

## 1. Product context

niri-settings is a **personal desktop settings app** for a single power user's Linux machine running the [niri](https://github.com/YaLTeR/niri) scrollable-tiling Wayland compositor and a quickshell-based desktop shell. It is part of that user's dotfiles ecosystem: the app reads and writes configuration files that *other tools also read*, so it behaves like a control room rather than a consumer product.

- Platform: desktop window on Linux/Wayland only (Tauri v2). No mobile, no web.
- Audience: exactly one expert user who values glanceability, speed, and honesty over hand-holding.
- Language: English only. No i18n requirement.
- Window today: 1000×640, resizable, frameless with a custom title bar. You may propose different chrome behavior (within what a frameless Tauri window allows).

## 2. Capability inventory

This is the complete feature set. Phrase your design work against these capabilities; you decide which screens, groupings, or flows express them.

### Wallpaper
The user can:
- Set an automatic rotation frequency (e.g. hourly/daily) or skip changing today.
- Enable/disable wallpaper sources and order their priority: local folder, Unsplash, Reddit (with custom subreddit list), Bing, Picsum, Wallhaven, Pexels — several need per-source API keys.
- Pick a "mood"/vibe tag that steers source selection.
- See recent wallpapers (file paths), mark favorites, choose a library directory.
- Trigger an immediate fetch/change ("do it now" action).

### Appearance
The user can:
- Switch dark/light scheme.
- Choose accent mode: **dynamic** (derived from the current wallpaper by a shell script) or **manual** primary/secondary accent colors from curated palettes.
- Changing appearance re-applies theming via a script that inspects the current wallpaper — results may take a moment to land.

### Icons & cursor
The user can set the icon theme, cursor theme, and cursor size (applied instantly via gsettings).

### Display
The user can:
- See connected monitor outputs **live from niri**: name, resolution, refresh rate, scale, position, and which is focused (a mini-map visualization exists today).
- Pick UI scale from fixed presets (0.8, 1.0, 1.25, 1.5, 2.0).
- Toggle night light and set its temperature (1500–6500K).
- Scale/night-light changes run helper scripts (`apply-display-scale`, `night-light`).

### Keybindings
The user can:
- Browse ~45 curated actions grouped as General, Window Focus, Window Movement, Workspaces, Layout, Screenshots, Power.
- See each action's current binding (parsed live from the niri KDL config file).
- Rebind any action via a **keyboard-capture interaction** ("press keys…"), previewed as `Initial → New` before confirming.
- Saving edits the config file (automatic backup kept) and niri hot-reloads — changes are live immediately.
- Note: there is no flow yet for *adding brand-new* bindings or removing ones — you may spec this as future state.

### Sound
The user can set output volume (0–100%), mute output, set input/mic volume, mute input. Applied instantly via WirePlumber (`wpctl`).

### Network — ⚠ placeholder
Today a static mock (hardcoded "Connected / Not connected"). No backend exists. If your design wants real Wi-Fi/Ethernet/VPN status, spec the ideal state and mark backend dependency.

### System info — ⚠ placeholder
A static list (compositor, shell, OS, kernel, display server). Real data would need backend work — same treatment as Network.

## 3. Behavioral truths to design around

These are properties of the system, not design preferences:

1. **Every change persists asynchronously.** Writes go to `~/.config/dotfiles/settings.json`, a file *co-owned by other shell scripts*. The UI must feel instant (optimistic updates) while giving honest feedback about save success/failure. Design save/error/toast patterns deliberately — they don't exist yet.
2. **Actions have small but real latency.** Each command spawns a short-lived helper process (~10–50 ms). Slider drags fire many rapid actions. Designs should tolerate this without feeling laggy (e.g. commit-on-release vs live-commit decisions are yours to make — flag them explicitly).
3. **Graceful degradation is normal.** Helper CLIs may be missing (niri, wpctl) or scripts absent; when they are, actions silently no-op or fail. Loading, empty, error, and degraded states are **first-class screens**, not edge cases.
4. **Some data is fetched once on page open**, not streamed. Refresh affordances and staleness handling are design-relevant.
5. **Keybinding capture needs focus handling**: capturing raw keyboard input inside a settings window has UX implications (escape hatches, conflict indication).

## 4. Fixed points vs open space

| Fixed (product/tech) | Yours to decide |
|---|---|
| The capability set above | Information architecture & navigation model |
| Stack: React + Tailwind 4, framer-motion available, lucide icon set available | Page grouping — merge/split/add pages freely |
| Single window, resizable, min ≈1000×640 | Visual language, color, typography, density |
| Settings file schema co-owned with shell scripts (field names can't be renamed casually) | Window chrome/title bar treatment |
| English-only, single user | Motion language, transitions |
| Local-only, no network content beyond wallpaper sources | All loading/empty/error/degraded state designs; accessibility approach |

## 5. Questions we'd like answered in your proposal

1. What navigation model fits ~8 capability areas best for one power user?
2. Which controls deserve always-visible placement vs progressive disclosure?
3. How should async saves communicate (and how loudly should failures shout)?
4. What is the motion personality — utilitarian-snappy or expressive?
5. Should Network/SysInfo appear at all until backends exist?

## 6. Deliverables & acceptance

**Deliverables**
1. IA proposal (structure + navigation rationale).
2. High-fidelity mockups of key screens covering every capability in §2.
3. Component & state inventory — including loading, empty, error, degraded variants.
4. Theme/token sheet (colors, type, spacing, radii, elevation) implementable in Tailwind 4 CSS variables.
5. Motion notes where interaction timing matters.

**Acceptance criteria**
- Every capability in §2 has a designed home; nothing in the inventory is orphaned.
- Placeholder features (Network, SysInfo) are either designed as future-state or consciously cut.
- Degraded/no-backend states are designed, not improvised later.
- Layouts hold up at the minimum window size.
- Feedback for every async action is specified.

## Appendix A — Current implementation (neutral baseline)

Today's app is a two-pane layout: a fixed ~232 px left sidebar (two labeled groups, icon+label items) and a content pane showing one page at a time with subtle enter/exit animations. Pages are built from generic building blocks — titled groups of rows containing toggles, sliders, pill selectors, and static labels — plus a custom-drawn title bar. Wallpaper page additionally has mood chips, color-swatch palettes, a recents strip, and a refresh button; Display has a small SVG monitor map; Keybindings uses an inline key-capture widget. Reference files if you want to see the current components: `src/components/settings/*`, `src/pages/*`. Again: reference only — redesign freely.
