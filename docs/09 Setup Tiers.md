# Setup Tiers & Integrations

niri-settings is designed to **run anywhere niri runs** and degrade honestly:
features that depend on optional host integrations are detected at startup
(`get_capabilities`) and pages show a notice instead of failing silently.

## Capability probe

On launch the sidecar reports which of these exist on the host:

| Capability | Detected by | Powers |
| --- | --- | --- |
| `niri` | `niri` on `$PATH` or `NIRI_SOCKET` set | Display outputs, keybindings editor, cursor config patching |
| `gsettings` | binary on `$PATH` | GTK icon/cursor theme + color scheme for apps |
| `wpctl` | binary on `$PATH` (WirePlumber/PipeWire) | Volume, mute, device switching |
| `quickshell` | `qs`/`quickshell` binary **and** `~/.config/quickshell/shell.qml` | Top-bar icon theme sync (pragma patch + hot reload) |
| `apply_theme` | helper script resolved (see below) | Pywal palette regeneration on wallpaper/theme change |
| `apply_display_scale` | helper script resolved | System-wide text scaling |
| `night_light` | helper script resolved | wlsunset-based color temperature |
| `pywal_cache` | `~/.cache/wal/colors.json` readable | Current palette display |

## Helper-script resolution

Named scripts are never hardcoded to one directory. The sidecar resolves them
in this order:

1. `$NIRI_SCRIPT_BIN_DIR` (absolute path; highest priority)
2. `$XDG_BIN_HOME`
3. `~/.local/bin`
4. `$PATH` (`exec.LookPath`)

So on a machine that ships these scripts in `/usr/bin` or any custom dir,
either put that dir on `$PATH`, or export
`NIRI_SCRIPT_BIN_DIR=/path/to/scripts` before launching the app.

Scripts are executed with file-backed stdio, process groups and a 20 s
timeout, so scripts that daemonize (e.g. `night-light` backgrounding
wlsunset) can never wedge the app.

## Setup tiers

### Tier 0 — bare niri (works out of the box)
Just niri. Wallpaper browsing/applying (via niri IPC), keybindings editing,
display arrangement, cursor theme/size patching of `~/.config/niri/config.kdl`.
Pages whose helpers are missing show an explanatory notice.

Recommended extras for Tier 0: `gsettings` (comes with GLib/gtk3 settings
schemas), WirePlumber for sound, NetworkManager for network status.

### Tier 1 — helper scripts only (full appearance pipeline)
Install these executables anywhere resolvable (default `~/.local/bin`):

- `set-wallpaper <path>` — applies wallpaper + writes
  `~/.config/current_wallpaper`
- `apply-theme <wallpaper>` — pywal regeneration feeding app palettes
- `fetch-wallpaper` — daily wallpaper fetcher (optional)
- `apply-display-scale`, `night-light` — scaling / color temperature

Reference implementations live in the dotfiles repo:
`https://github.com/Lunga93/dotfiles` (scripts under
`scripts/.local/bin`). Either copy them or point `NIRI_SCRIPT_BIN_DIR`
at your checkout.

With Tier 1 you get: pywal-driven light/dark themes, accent extraction from
wallpapers, night light, text scaling — without the rest of the desktop.

### Tier 2 — full dotfiles desktop
Installing the whole dotfiles suite (quickshell bar, lock screen, clipboard
manager, wallpaper-control bindings, …) gives the complete experience the
app was built against, including instant top-bar icon-theme switching.
The app detects quickshell automatically and patches its IconTheme pragma.

## Notes & caveats

- Keybinding defaults shown in the UI include spawn actions for dotfiles
  scripts (clipboard-manager, lock-screen, …). On Tier 0 those entries still
  edit fine but do nothing when invoked — remove them in the UI if unused.
- The quickshell icon-theme integration assumes the default single-config
  layout (`~/.config/quickshell/shell.qml`).
- Without gsettings, GTK apps keep whatever theme they started with until
  restarted into a session where the setting exists.
