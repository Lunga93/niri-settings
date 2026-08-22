// Package settings owns the app-level settings.json file that the frontend
// persists through read_settings / write_settings.
package settings

import (
	"fmt"
	"os"
	"path/filepath"

	"niri-settings-sidecar/protocol"
	"niri-settings-sidecar/system"
)

func filePath(home string) string {
	return filepath.Join(home, ".config", "dotfiles", "settings.json")
}

// HandleRead returns settings.json content, or "{}" when it does not exist.
func HandleRead(_ map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}

	path := filePath(home)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			protocol.WriteResponse("{}")
			return
		}
		protocol.WriteError("FILE_READ_ERROR", fmt.Sprintf("Failed to read %s: %v", path, err), nil)
		return
	}
	protocol.WriteResponse(string(data))
}

// HandleWrite persists settings.json and reloads quickshell so bar widgets
// pick the changes up.
func HandleWrite(args map[string]any) {
	content, ok := protocol.GetStringArg(args, "content")
	if !ok {
		protocol.InvalidArgs("Missing 'content' argument")
		return
	}

	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}

	dir := filepath.Join(home, ".config", "dotfiles")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		protocol.WriteError("DIR_CREATE_ERROR", fmt.Sprintf("Failed to create %s: %v", dir, err), nil)
		return
	}

	path := filePath(home)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		protocol.WriteError("FILE_WRITE_ERROR", fmt.Sprintf("Failed to write %s: %v", path, err), nil)
		return
	}

	// Auto-reload quickshell after settings save.
	_ = system.ReloadQuickshell()

	protocol.WriteResponse(map[string]string{"status": "ok", "path": path})
}
