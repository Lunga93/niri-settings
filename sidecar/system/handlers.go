package system

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"niri-settings-sidecar/protocol"
)

// ExpandPath resolves a leading ~ to the user home directory.
func ExpandPath(path string) string {
	if strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err == nil {
			return filepath.Join(home, path[2:])
		}
	} else if path == "~" {
		home, err := os.UserHomeDir()
		if err == nil {
			return home
		}
	}
	return path
}

// HandleExecScript runs a shell script via ExecScript.
func HandleExecScript(args map[string]any) {
	script, ok := protocol.GetStringArg(args, "script")
	if !ok {
		protocol.InvalidArgs("Missing 'script' argument")
		return
	}
	if err := ExecScript(script); err != nil {
		protocol.WriteError("SCRIPT_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleRunScript resolves a named helper script (bin dirs, then $PATH) and
// executes it with optional string args. Keeps install locations out of the
// frontend entirely.
func HandleRunScript(args map[string]any) {
	name, ok := protocol.GetStringArg(args, "name")
	if !ok {
		protocol.InvalidArgs("Missing 'name' argument")
		return
	}

	scriptArgs := []string{}
	if raw, present := args["args"]; present && raw != nil {
		// JSON round-trip converts []any of strings without type assertions.
		blob, err := json.Marshal(raw)
		if err != nil {
			protocol.InvalidArgs("Invalid 'args' argument")
			return
		}
		var parsed []string
		if err := json.Unmarshal(blob, &parsed); err != nil {
			protocol.InvalidArgs("'args' must be an array of strings")
			return
		}
		scriptArgs = parsed
	}

	home, _ := os.UserHomeDir()
	if err := RunNamedScript(home, name, scriptArgs); err != nil {
		protocol.WriteError("SCRIPT_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleReloadQuickshell reloads the quickshell bar.
func HandleReloadQuickshell(_ map[string]any) {
	if err := ReloadQuickshell(); err != nil {
		protocol.WriteError("QUICKSHELL_RELOAD_FAILED", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleSetGSetting writes a GNOME/gsettings key.
func HandleSetGSetting(args map[string]any) {
	schema, _ := protocol.GetStringArg(args, "schema")
	key, _ := protocol.GetStringArg(args, "key")
	value, _ := protocol.GetStringArg(args, "value")

	if schema == "" || key == "" {
		protocol.InvalidArgs("Missing 'schema' or 'key' argument")
		return
	}

	if err := SetGSetting(schema, key, value); err != nil {
		protocol.WriteError("GSETTINGS_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleSetQuickshellIconTheme patches the IconTheme pragma in quickshell's
// shell.qml so its bar/tray/dock icons follow the selected theme after the
// shell hot-reloads.
func HandleSetQuickshellIconTheme(args map[string]any) {
	theme, ok := protocol.GetStringArg(args, "theme")
	if !ok || theme == "" {
		protocol.InvalidArgs("Missing 'theme' argument")
		return
	}

	if err := SetQuickshellIconTheme(theme); err != nil {
		protocol.WriteError("QUICKSHELL_ICON_THEME_ERROR", err.Error(), nil)
		return
	}
	_ = ReloadQuickshell()

	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleReadFile streams a file's content back as a JSON string.
func HandleReadFile(args map[string]any) {
	path, ok := protocol.GetStringArg(args, "path")
	if !ok {
		protocol.InvalidArgs("Missing 'path' argument")
		return
	}

	resolvedPath := ExpandPath(path)
	data, err := os.ReadFile(resolvedPath)
	if err != nil {
		protocol.WriteError("FILE_READ_ERROR", fmt.Sprintf("Failed to read %s: %v", resolvedPath, err), nil)
		return
	}
	protocol.WriteResponse(string(data))
}

// HandleWriteFile writes content to a file, creating parent directories.
func HandleWriteFile(args map[string]any) {
	path, ok := protocol.GetStringArg(args, "path")
	if !ok {
		protocol.InvalidArgs("Missing 'path' argument")
		return
	}
	content, ok := protocol.GetStringArg(args, "content")
	if !ok {
		protocol.InvalidArgs("Missing 'content' argument")
		return
	}

	resolvedPath := ExpandPath(path)
	dir := filepath.Dir(resolvedPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		protocol.WriteError("DIR_CREATE_ERROR", fmt.Sprintf("Failed to create dir %s: %v", dir, err), nil)
		return
	}

	if err := os.WriteFile(resolvedPath, []byte(content), 0o644); err != nil {
		protocol.WriteError("FILE_WRITE_ERROR", fmt.Sprintf("Failed to write %s: %v", resolvedPath, err), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok", "path": resolvedPath})
}

// HandleOpenFile opens a file with the first available GUI editor. The sidecar
// has no controlling TTY, so terminal editors would die immediately.
func HandleOpenFile(args map[string]any) {
	path, ok := protocol.GetStringArg(args, "path")
	if !ok {
		protocol.InvalidArgs("Missing 'path' argument")
		return
	}

	resolvedPath := ExpandPath(path)
	editors := []string{"code", "xdg-open"}
	var lastErr error
	for _, editor := range editors {
		cmd := exec.Command(editor, resolvedPath)
		if err := cmd.Start(); err != nil {
			lastErr = err
			continue
		}
		protocol.WriteResponse(map[string]string{"status": "ok", "editor": editor})
		return
	}
	protocol.WriteError("NO_EDITOR", fmt.Sprintf("Failed to open %s: %v", resolvedPath, lastErr), nil)
}
