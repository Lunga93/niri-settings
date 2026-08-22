package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"

	"niri-settings-sidecar/config"
	"niri-settings-sidecar/niri"
	"niri-settings-sidecar/system"
)

// AppError is the structured error type returned to the frontend.
type AppError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Response wraps a successful payload.
type Response struct {
	OK    bool        `json:"ok"`
	Data  interface{} `json:"data,omitempty"`
	Error *AppError   `json:"error,omitempty"`
}

// Request represents an incoming command from the frontend.
type Request struct {
	Command string                 `json:"command"`
	Args    map[string]interface{} `json:"args"`
}

func writeResponse(w io.Writer, data interface{}) {
	json.NewEncoder(w).Encode(Response{OK: true, Data: data})
}

func writeError(w io.Writer, code string, message string, details interface{}) {
	json.NewEncoder(w).Encode(Response{
		OK: false,
		Error: &AppError{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

func getStringArg(args map[string]interface{}, key string) (string, bool) {
	val, ok := args[key]
	if !ok {
		return "", false
	}
	s, ok := val.(string)
	return s, ok
}

func main() {
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		writeError(os.Stdout, "READ_ERROR", "Failed to read stdin", nil)
		os.Exit(1)
	}

	var req Request
	if err := json.Unmarshal(input, &req); err != nil {
		writeError(os.Stdout, "PARSE_ERROR", "Invalid JSON request", nil)
		os.Exit(1)
	}

	switch req.Command {
	case "list_outputs":
		handleListOutputs()
	case "focused_output":
		handleFocusedOutput()
	case "reload_config":
		handleReloadConfig()
	case "exec_script":
		handleExecScript(req.Args)
	case "reload_quickshell":
		handleReloadQuickshell()
	case "read_settings":
		handleReadSettings()
	case "write_settings":
		handleWriteSettings(req.Args)
	case "read_niri_config":
		handleReadNiriConfig()
	case "write_niri_config":
		handleWriteNiriConfig(req.Args)
	case "validate_niri_config":
		handleValidateNiriConfig()
	case "read_keybindings":
		handleReadKeybindings()
	case "write_keybinding":
		handleWriteKeybinding(req.Args)
	case "set_gsetting":
		handleSetGSetting(req.Args)
	case "read_file":
		handleReadFile(req.Args)
	case "write_file":
		handleWriteFile(req.Args)
	case "open_file":
		handleOpenFile(req.Args)
	default:
		writeError(os.Stdout, "UNKNOWN_COMMAND", fmt.Sprintf("Unknown command: %s", req.Command), nil)
		os.Exit(1)
	}
}

func handleListOutputs() {
	outputs, err := niri.ListOutputs()
	if err != nil {
		writeError(os.Stdout, "NIRI_IPC_FAILED", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, outputs)
}

func handleFocusedOutput() {
	name, err := niri.GetFocusedOutput()
	if err != nil {
		writeError(os.Stdout, "NIRI_IPC_FAILED", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"name": name})
}

func handleReloadConfig() {
	if err := niri.ReloadConfig(); err != nil {
		writeError(os.Stdout, "NIRI_RELOAD_FAILED", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}

func handleExecScript(args map[string]interface{}) {
	script, ok := getStringArg(args, "script")
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'script' argument", nil)
		return
	}
	if err := system.ExecScript(script); err != nil {
		writeError(os.Stdout, "SCRIPT_ERROR", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}

func handleReloadQuickshell() {
	if err := system.ReloadQuickshell(); err != nil {
		writeError(os.Stdout, "QUICKSHELL_RELOAD_FAILED", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}

func handleReadSettings() {
	home, err := os.UserHomeDir()
	if err != nil {
		writeError(os.Stdout, "HOME_ERROR", "Cannot determine home directory", nil)
		return
	}

	path := filepath.Join(home, ".config", "dotfiles", "settings.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			writeResponse(os.Stdout, "{}")
			return
		}
		writeError(os.Stdout, "FILE_READ_ERROR", fmt.Sprintf("Failed to read %s: %v", path, err), nil)
		return
	}
	writeResponse(os.Stdout, string(data))
}

func handleWriteSettings(args map[string]interface{}) {
	content, ok := getStringArg(args, "content")
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'content' argument", nil)
		return
	}

	home, err := os.UserHomeDir()
	if err != nil {
		writeError(os.Stdout, "HOME_ERROR", "Cannot determine home directory", nil)
		return
	}

	dir := filepath.Join(home, ".config", "dotfiles")
	if err := os.MkdirAll(dir, 0755); err != nil {
		writeError(os.Stdout, "DIR_CREATE_ERROR", fmt.Sprintf("Failed to create %s: %v", dir, err), nil)
		return
	}

	path := filepath.Join(dir, "settings.json")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		writeError(os.Stdout, "FILE_WRITE_ERROR", fmt.Sprintf("Failed to write %s: %v", path, err), nil)
		return
	}

	// Auto-reload quickshell after settings save
	_ = system.ReloadQuickshell()

	writeResponse(os.Stdout, map[string]string{"status": "ok", "path": path})
}

func handleReadNiriConfig() {
	paths := config.Resolve()
	data, err := os.ReadFile(paths.ConfigFile)
	if err != nil {
		writeError(os.Stdout, "NIRI_CONFIG_READ_ERROR", fmt.Sprintf("Failed to read %s: %v", paths.ConfigFile, err), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{
		"content": string(data),
		"path":    paths.ConfigFile,
	})
}

func handleWriteNiriConfig(args map[string]interface{}) {
	content, ok := getStringArg(args, "content")
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'content' argument", nil)
		return
	}

	paths := config.Resolve()
	if err := config.WriteConfig(paths.ConfigFile, content); err != nil {
		writeError(os.Stdout, "NIRI_CONFIG_WRITE_ERROR", fmt.Sprintf("Failed to write %s: %v", paths.ConfigFile, err), nil)
		return
	}

	// Auto-reload niri after config write
	if err := niri.ReloadConfig(); err != nil {
		writeError(os.Stdout, "NIRI_RELOAD_FAILED", fmt.Sprintf("Config saved but reload failed: %v", err), nil)
		return
	}

	writeResponse(os.Stdout, map[string]string{"status": "ok", "path": paths.ConfigFile})
}

func handleValidateNiriConfig() {
	paths := config.Resolve()
	cmd := exec.Command("niri", "validate", "--config", paths.ConfigFile)
	out, err := cmd.CombinedOutput()
	if err != nil {
		writeError(os.Stdout, "NIRI_VALIDATE_FAILED", fmt.Sprintf("Validation failed: %s", string(out)), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "valid"})
}

func handleReadKeybindings() {
	bindings, err := niri.ReadKeybindings()
	if err != nil {
		writeError(os.Stdout, "KEYBINDING_READ_ERROR", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, bindings)
}

func handleWriteKeybinding(args map[string]interface{}) {
	oldKey, _ := getStringArg(args, "oldKey")
	newKey, _ := getStringArg(args, "newKey")
	action, _ := getStringArg(args, "action")

	if newKey == "" || action == "" {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'newKey' or 'action' argument", nil)
		return
	}

	if err := niri.WriteKeybinding(oldKey, newKey, action); err != nil {
		writeError(os.Stdout, "KEYBINDING_WRITE_ERROR", err.Error(), nil)
		return
	}

	// Auto-reload niri after keybinding change
	_ = niri.ReloadConfig()

	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}

func handleSetGSetting(args map[string]interface{}) {
	schema, _ := getStringArg(args, "schema")
	key, _ := getStringArg(args, "key")
	value, _ := getStringArg(args, "value")

	if schema == "" || key == "" {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'schema' or 'key' argument", nil)
		return
	}

	if err := system.SetGSetting(schema, key, value); err != nil {
		writeError(os.Stdout, "GSETTINGS_ERROR", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}

func handleReadFile(args map[string]interface{}) {
	path, ok := getStringArg(args, "path")
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'path' argument", nil)
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		writeError(os.Stdout, "FILE_READ_ERROR", fmt.Sprintf("Failed to read %s: %v", path, err), nil)
		return
	}
	writeResponse(os.Stdout, string(data))
}

func handleWriteFile(args map[string]interface{}) {
	path, ok := getStringArg(args, "path")
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'path' argument", nil)
		return
	}
	content, ok := getStringArg(args, "content")
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'content' argument", nil)
		return
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		writeError(os.Stdout, "DIR_CREATE_ERROR", fmt.Sprintf("Failed to create dir %s: %v", dir, err), nil)
		return
	}

	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		writeError(os.Stdout, "FILE_WRITE_ERROR", fmt.Sprintf("Failed to write %s: %v", path, err), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok", "path": path})
}

func handleOpenFile(args map[string]interface{}) {
	path, ok := getStringArg(args, "path")
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'path' argument", nil)
		return
	}

	editors := []string{"code", "nvim", "vim", "nano", "xdg-open"}
	var lastErr error
	for _, editor := range editors {
		cmd := exec.Command(editor, path)
		if err := cmd.Start(); err != nil {
			lastErr = err
			continue
		}
		writeResponse(os.Stdout, map[string]string{"status": "ok", "editor": editor})
		return
	}
	writeError(os.Stdout, "NO_EDITOR", fmt.Sprintf("Failed to open %s: %v", path, lastErr), nil)
}
