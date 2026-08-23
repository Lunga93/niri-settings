// Command niri-settings-sidecar is a one-shot JSON-over-stdio worker spawned
// per command by the Tauri host. main only reads the request and dispatches
// to domain handlers; all logic lives in the domain packages.
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"

	"niri-settings-sidecar/audio"
	"niri-settings-sidecar/niri"
	"niri-settings-sidecar/protocol"
	"niri-settings-sidecar/settings"
	"niri-settings-sidecar/system"
	"niri-settings-sidecar/theme"
	"niri-settings-sidecar/wallpaper"
)

// registry maps a command name to its domain handler. Adding a command means
// adding one entry here plus the handler in the owning package.
var registry = map[string]protocol.Handler{
	// niri
	"list_outputs":         niri.HandleListOutputs,
	"focused_output":       niri.HandleFocusedOutput,
	"reload_config":        niri.HandleReloadConfig,
	"read_niri_config":     niri.HandleReadConfig,
	"write_niri_config":    niri.HandleWriteConfig,
	"validate_niri_config": niri.HandleValidateConfig,
	"read_keybindings":     niri.HandleReadKeybindings,
	"write_keybinding":     niri.HandleWriteKeybinding,
	"apply_display_layout": niri.HandleApplyDisplayLayout,
	"set_niri_cursor":      niri.HandleSetCursor,
	// system
	"exec_script":         system.HandleExecScript,
	"reload_quickshell":   system.HandleReloadQuickshell,
	"set_gsetting":        system.HandleSetGSetting,
	"read_file":           system.HandleReadFile,
	"write_file":          system.HandleWriteFile,
	"open_file":           system.HandleOpenFile,
	"list_desktop_themes": system.HandleListDesktopThemes,
	// settings
	"read_settings":  settings.HandleRead,
	"write_settings": settings.HandleWrite,
	// wallpaper
	"get_wallpaper_info":      wallpaper.HandleGetInfo,
	"list_wallpapers":         wallpaper.HandleList,
	"ensure_wallpaper_thumbs": wallpaper.HandleEnsureThumbs,
	"set_wallpaper":           wallpaper.HandleSet,
	// theme
	"get_theme_colors": theme.HandleGetThemeColors,
	// audio
	"get_audio_devices": audio.HandleGetDevices,
	"set_audio_device":  audio.HandleSetDevice,
	"set_audio_volume":  audio.HandleSetVolume,
	"test_audio":        audio.HandleTest,
}

func main() {
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		protocol.WriteError("READ_ERROR", "Failed to read stdin", nil)
		os.Exit(1)
	}

	var req protocol.Request
	if err := json.Unmarshal(input, &req); err != nil {
		protocol.WriteError("PARSE_ERROR", "Invalid JSON request", nil)
		os.Exit(1)
	}

	log.Printf("[sidecar:go] Received command: %s (args count: %d)\n", req.Command, len(req.Args))

	handler, ok := registry[req.Command]
	if !ok {
		protocol.WriteError("UNKNOWN_COMMAND", fmt.Sprintf("Unknown command: %s", req.Command), nil)
		os.Exit(1)
	}
	if req.Args == nil {
		req.Args = map[string]any{}
	}
	handler(req.Args)
}
