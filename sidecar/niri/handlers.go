package niri

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

	"niri-settings-sidecar/config"
	"niri-settings-sidecar/protocol"
)

// HandleListOutputs returns all niri outputs.
func HandleListOutputs(_ map[string]any) {
	outputs, err := ListOutputs()
	if err != nil {
		protocol.WriteError("NIRI_IPC_FAILED", err.Error(), nil)
		return
	}
	protocol.WriteResponse(outputs)
}

// HandleFocusedOutput returns the currently focused output name.
func HandleFocusedOutput(_ map[string]any) {
	name, err := GetFocusedOutput()
	if err != nil {
		protocol.WriteError("NIRI_IPC_FAILED", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"name": name})
}

// HandleReloadConfig asks niri to reload its configuration.
func HandleReloadConfig(_ map[string]any) {
	if err := ReloadConfig(); err != nil {
		protocol.WriteError("NIRI_RELOAD_FAILED", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleReadConfig returns the resolved niri config file content.
func HandleReadConfig(_ map[string]any) {
	paths := config.Resolve()
	data, err := os.ReadFile(paths.ConfigFile)
	if err != nil {
		protocol.WriteError("NIRI_CONFIG_READ_ERROR", fmt.Sprintf("Failed to read %s: %v", paths.ConfigFile, err), nil)
		return
	}
	protocol.WriteResponse(map[string]string{
		"content": string(data),
		"path":    paths.ConfigFile,
	})
}

// HandleWriteConfig backs up, writes, and hot-reloads the niri config.
func HandleWriteConfig(args map[string]any) {
	content, ok := protocol.GetStringArg(args, "content")
	if !ok {
		protocol.InvalidArgs("Missing 'content' argument")
		return
	}

	paths := config.Resolve()
	if err := config.BackupConfig(paths.ConfigFile); err != nil {
		// Non-fatal: the config may not exist yet on a fresh system.
		fmt.Printf("Warning: failed to backup niri config: %v\n", err)
	}
	if err := config.WriteConfig(paths.ConfigFile, content); err != nil {
		protocol.WriteError("NIRI_CONFIG_WRITE_ERROR", fmt.Sprintf("Failed to write %s: %v", paths.ConfigFile, err), nil)
		return
	}

	// Auto-reload niri after config write.
	if err := ReloadConfig(); err != nil {
		protocol.WriteError("NIRI_RELOAD_FAILED", fmt.Sprintf("Config saved but reload failed: %v", err), nil)
		return
	}

	protocol.WriteResponse(map[string]string{"status": "ok", "path": paths.ConfigFile})
}

// Validate runs `niri validate` against the resolved config file.
func Validate() (bool, string) {
	paths := config.Resolve()
	cmd := exec.Command("niri", "validate", "--config", paths.ConfigFile)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, fmt.Sprintf("Validation failed: %s", string(out))
	}
	return true, ""
}

// HandleValidateConfig validates the niri config without writing it.
func HandleValidateConfig(_ map[string]any) {
	ok, message := Validate()
	if !ok {
		protocol.WriteError("NIRI_VALIDATE_FAILED", message, nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "valid"})
}

// HandleReadKeybindings parses keybindings from the niri config.
func HandleReadKeybindings(_ map[string]any) {
	bindings, err := ReadKeybindings()
	if err != nil {
		protocol.WriteError("KEYBINDING_READ_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(bindings)
}

// HandleWriteKeybinding rebinds oldKey (if any) to newKey for action and
// hot-reloads niri.
func HandleWriteKeybinding(args map[string]any) {
	oldKey, _ := protocol.GetStringArg(args, "oldKey")
	newKey, _ := protocol.GetStringArg(args, "newKey")
	action, _ := protocol.GetStringArg(args, "action")

	if newKey == "" || action == "" {
		protocol.InvalidArgs("Missing 'newKey' or 'action' argument")
		return
	}

	if err := WriteKeybinding(oldKey, newKey, action); err != nil {
		protocol.WriteError("KEYBINDING_WRITE_ERROR", err.Error(), nil)
		return
	}

	// Auto-reload niri after keybinding change.
	_ = ReloadConfig()

	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleApplyDisplayLayout applies position/size/transform to outputs.
func HandleApplyDisplayLayout(args map[string]any) {
	rawDisplays, ok := args["displays"]
	if !ok {
		protocol.InvalidArgs("Missing 'displays' argument")
		return
	}

	data, err := json.Marshal(rawDisplays)
	if err != nil {
		protocol.InvalidArgs("Failed to serialize displays")
		return
	}

	var layouts []DisplayLayoutConfig
	if err := json.Unmarshal(data, &layouts); err != nil {
		protocol.InvalidArgs("Failed to parse displays layout")
		return
	}

	if err := ApplyDisplayLayout(layouts); err != nil {
		protocol.WriteError("DISPLAY_LAYOUT_ERROR", err.Error(), nil)
		return
	}

	protocol.WriteResponse(map[string]string{"status": "ok"})
}
