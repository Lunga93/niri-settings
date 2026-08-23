// Package setup installs self-contained Tier 1 helper scripts so a bare
// niri setup can gain the full appearance pipeline with one click.
package setup

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"niri-settings-sidecar/protocol"
)

const marker = "# niri-settings-managed"

type scriptSpec struct {
	name    string
	content string
}

var scripts = []scriptSpec{
	{
		name: "set-wallpaper",
		content: `#!/usr/bin/env bash
` + marker + `
set -euo pipefail
[ "$#" -ge 1 ] || { echo "Usage: set-wallpaper <image-path>" >&2; exit 2; }
IMG="$(readlink -f "$1")"
[ -f "$IMG" ] || { echo "No such file: $IMG" >&2; exit 1; }
STATE="$HOME/.config/current_wallpaper"
mkdir -p "$(dirname "$STATE")"
printf '%s\n' "$IMG" > "$STATE"
if command -v awww >/dev/null 2>&1; then
    awww img "$IMG" >/dev/null 2>&1 || true
elif command -v swww >/dev/null 2>&1; then
    swww img "$IMG" >/dev/null 2>&1 || true
fi
command -v apply-theme >/dev/null 2>&1 && apply-theme "$IMG" || true
`,
	},
	{
		name: "apply-theme",
		content: `#!/usr/bin/env bash
` + marker + `
set -euo pipefail
WALL="${1:-$(cat "$HOME/.config/current_wallpaper" 2>/dev/null || true)}"
[ -n "$WALL" ] || exit 0
[ -f "$WALL" ] || exit 0
if command -v wal >/dev/null 2>&1; then
    wal -i "$WALL" -n -q
else
    echo "apply-theme: pywal (wal) not installed; palette not regenerated" >&2
    exit 0
fi
command -v reload-desktop >/dev/null 2>&1 && reload-desktop || true
`,
	},
	{
		name: "night-light",
		content: `#!/usr/bin/env bash
` + marker + `
set -euo pipefail
SETTINGS="$HOME/.config/dotfiles/settings.json"
enabled=$(grep -E '"night_light_enabled"' "$SETTINGS" 2>/dev/null | grep -q true && echo on || echo off)
temp=$(grep -E '"night_light_temperature"' "$SETTINGS" 2>/dev/null | grep -oE '[0-9]+' || echo 4500)
pkill -x wlsunset 2>/dev/null || true
[ "$enabled" = "on" ] || exit 0
if ! command -v wlsunset >/dev/null 2>&1; then
    echo "night-light: wlsunset not installed" >&2
    exit 0
fi
nohup wlsunset -t "$temp" -T 6500 -S 09:00 -s 19:00 >/dev/null 2>&1 &
`,
	},
	{
		name: "apply-display-scale",
		content: `#!/usr/bin/env bash
` + marker + `
set -euo pipefail
SETTINGS="$HOME/.config/dotfiles/settings.json"
scale=$(grep -A3 '"display"' "$SETTINGS" 2>/dev/null | grep -E '"scale"' | grep -oE '[0-9]+\.?[0-9]*' | head -1)
[ -n "$scale" ] || scale=1.0
if command -v gsettings >/dev/null 2>&1; then
    gsettings set org.gnome.desktop.interface text-scaling-factor "$scale"
fi
if command -v niri >/dev/null 2>&1; then
    while IFS= read -r line; do
        out=${line%%:*}
        out=${out//\"/}
        [ -n "$out" ] && niri msg output "$out" scale "$scale" >/dev/null 2>&1 || true
    done < <(niri msg --json outputs 2>/dev/null | grep -E '^  "' || true)
fi
`,
	},
}

// installDir mirrors the sidecar script resolution order so installed
// helpers are found without any environment configuration.
func installDir(home string) string {
	if custom := os.Getenv("NIRI_SCRIPT_BIN_DIR"); custom != "" && filepath.IsAbs(custom) {
		return custom
	}
	if binHome := os.Getenv("XDG_BIN_HOME"); binHome != "" && filepath.IsAbs(binHome) {
		return binHome
	}
	return filepath.Join(home, ".local", "bin")
}

type installResult struct {
	script string
	status string // "installed", "updated", "kept"
	detail string
}

func installScripts(home string) ([]installResult, error) {
	dir := installDir(home)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("cannot create %s: %w", dir, err)
	}

	results := make([]installResult, 0, len(scripts))
	for _, spec := range scripts {
		path := filepath.Join(dir, spec.name)
		res := installResult{script: spec.name}

		existing, err := os.ReadFile(path)
		switch {
		case err == nil:
			if !strings.Contains(string(existing), marker) {
				res.status = "kept"
				res.detail = "existing custom version left untouched"
				results = append(results, res)
				continue
			}
			res.status = "updated"
		case os.IsNotExist(err):
			res.status = "installed"
		default:
			return nil, err
		}

		if err := os.WriteFile(path, []byte(spec.content), 0o755); err != nil {
			return nil, fmt.Errorf("cannot write %s: %w", path, err)
		}
		results = append(results, res)
	}
	return results, nil
}

func handleInstallHelperScripts(home string, _ map[string]any) {
	results, err := installScripts(home)
	if err != nil {
		protocol.WriteError("SETUP_ERROR", err.Error(), nil)
		return
	}
	payloadResults := make([]map[string]any, 0, len(results))
	for _, r := range results {
		payloadResults = append(payloadResults, map[string]any{
			"script": r.script,
			"status": r.status,
			"detail": r.detail,
		})
	}
	protocol.WriteResponse(map[string]any{
		"dir":     installDir(home),
		"results": payloadResults,
	})
}

// HandleInstallHelperScripts writes the bundled Tier 1 scripts to the
// user's helper directory, never overwriting foreign versions.
var HandleInstallHelperScripts = protocol.WithHome(handleInstallHelperScripts)
