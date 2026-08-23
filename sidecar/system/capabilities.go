package system

import (
	"os"
	"os/exec"
	"path/filepath"

	"niri-settings-sidecar/protocol"
)

// Capabilities reports which host integrations are available so the UI can
// adapt instead of assuming this machine's dotfiles setup. Every field is a
// best-effort probe; nothing here is fatal.
type Capabilities struct {
	Niri              bool `json:"niri"`
	GSettings         bool `json:"gsettings"`
	Wpctl             bool `json:"wpctl"`
	Quickshell        bool `json:"quickshell"`
	ApplyTheme        bool `json:"apply_theme"`
	ApplyDisplayScale bool `json:"apply_display_scale"`
	NightLight        bool `json:"night_light"`
	PywalCache        bool `json:"pywal_cache"`
}

// hasScript reports whether a named helper script resolves to an executable
// in the bin-dir candidates ($NIRI_SCRIPT_BIN_DIR, XDG_BIN_HOME,
// ~/.local/bin) or anywhere on $PATH.
func hasScript(home, name string) bool {
	_, ok := ResolveScript(home, name)
	return ok
}

func hasBinary(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// DetectCapabilities probes the host for optional integrations.
func DetectCapabilities() Capabilities {
	home, _ := os.UserHomeDir()

	niri := hasBinary("niri") || os.Getenv("NIRI_SOCKET") != ""

	pywalCache := false
	if home != "" {
		if _, err := os.Stat(filepath.Join(home, ".cache", "wal", "colors.json")); err == nil {
			pywalCache = true
		}
	}

	caps := Capabilities{
		Niri:              niri,
		GSettings:         hasBinary("gsettings"),
		Wpctl:             hasBinary("wpctl"),
		ApplyTheme:        hasScript(home, "apply-theme"),
		ApplyDisplayScale: hasScript(home, "apply-display-scale"),
		NightLight:        hasScript(home, "night-light"),
		PywalCache:        pywalCache,
	}

	if hasBinary("qs") || hasBinary("quickshell") {
		if base, err := os.UserConfigDir(); err == nil {
			if _, err := os.Stat(filepath.Join(base, "quickshell", "shell.qml")); err == nil {
				caps.Quickshell = true
			}
		}
	}
	return caps
}

// HandleGetCapabilities responds with detected host integrations.
func HandleGetCapabilities(_ map[string]any) {
	protocol.WriteResponse(DetectCapabilities())
}
