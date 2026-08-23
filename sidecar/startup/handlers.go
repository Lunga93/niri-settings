// Handlers for the startup-applications feature: XDG autostart entries plus
// runner (dex) detection inside the niri config.
package startup

import (
	"encoding/json"
	"os"
	"os/exec"
	"strings"

	"niri-settings-sidecar/config"
	"niri-settings-sidecar/protocol"
)

// RunnerStatus reports whether autostart entries will actually run on niri.
type RunnerStatus struct {
	RunnerInstalled       bool   `json:"runner_installed"` // dex or wlautostart on $PATH
	RunnerInstalledDetail string `json:"runner_installed_detail"`
	RunnerLinePresent     bool   `json:"runner_line_present"`
}

// DetectRunner scans the niri config for a spawn-at-startup line that runs
// an XDG-autostart processor (dex or wlautostart).
func DetectRunner() RunnerStatus {
	var status RunnerStatus
	for _, runner := range []string{"dex", "wlautostart"} {
		if _, err := exec.LookPath(runner); err == nil {
			status.RunnerInstalled = true
			status.RunnerInstalledDetail = runner
			break
		}
	}

	data, err := os.ReadFile(config.Resolve().ConfigFile)
	if err != nil {
		return status
	}
	for _, line := range strings.Split(string(data), "\n") {
		trimmed := strings.TrimSpace(line)
		if !strings.HasPrefix(trimmed, "//") && strings.Contains(trimmed, "spawn-at-startup") &&
			(strings.Contains(trimmed, `"dex`) || strings.Contains(trimmed, "dex ") ||
				strings.Contains(trimmed, "wlautostart")) {
			status.RunnerLinePresent = true
			break
		}
	}
	return status
}

// HandleListStartupApps responds with all user autostart entries.
func HandleListStartupApps(_ map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}
	protocol.WriteResponse(map[string]any{
		"apps":   listApps(home),
		"runner": DetectRunner(),
	})
}

// HandleUpsertStartupApp creates or updates one autostart entry.
func HandleUpsertStartupApp(args map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}
	name, _ := protocol.GetStringArg(args, "name")
	command, _ := protocol.GetStringArg(args, "command")
	comment, _ := protocol.GetStringArg(args, "comment")

	app := App{Name: name, Command: command, Comment: comment}
	id, err := upsertApp(home, app)
	if err != nil {
		protocol.InvalidArgs(err.Error())
		return
	}
	protocol.WriteResponse(map[string]string{"id": id, "status": "ok"})
}

// HandleSetStartupAppEnabled toggles Hidden on one entry.
func HandleSetStartupAppEnabled(args map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}
	id, _ := protocol.GetStringArg(args, "id")
	raw, ok := args["enabled"]
	if !ok {
		protocol.InvalidArgs("Missing 'enabled' argument")
		return
	}
	blob, err := json.Marshal(raw)
	var enabled bool
	if err != nil || json.Unmarshal(blob, &enabled) != nil {
		protocol.InvalidArgs("'enabled' must be a boolean")
		return
	}

	if err := setEnabled(home, id, enabled); err != nil {
		protocol.WriteError("STARTUP_APP_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleDeleteStartupApp removes one entry file.
func HandleDeleteStartupApp(args map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}
	id, _ := protocol.GetStringArg(args, "id")
	if err := deleteApp(home, id); err != nil {
		protocol.WriteError("STARTUP_APP_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleEnsureAutostartRunner appends a dex spawn-at-startup line to the
// niri config when none exists and dex is installed. Idempotent.
func HandleEnsureAutostartRunner(_ map[string]any) {
	status := DetectRunner()
	if status.RunnerLinePresent {
		protocol.WriteResponse(map[string]string{"status": "already-present"})
		return
	}
	cfgPath := config.Resolve().ConfigFile
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		protocol.WriteError("CONFIG_READ_ERROR", err.Error(), nil)
		return
	}
	content := string(data)
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	content += "\n// Run XDG autostart entries (added by niri-settings)\n"
	content += `spawn-at-startup "dex -a"` + "\n"
	if err := os.WriteFile(cfgPath, []byte(content), 0o644); err != nil {
		protocol.WriteError("CONFIG_WRITE_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "added"})
}
