package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"niri-settings-sidecar/audio"
	"niri-settings-sidecar/config"
	"niri-settings-sidecar/niri"
	"niri-settings-sidecar/system"
	"niri-settings-sidecar/theme"
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

func expandPath(path string) string {
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

func writeResponse(w io.Writer, data interface{}) {
	json.NewEncoder(w).Encode(Response{OK: true, Data: data})
}

func writeError(w io.Writer, code string, message string, details interface{}) {
	log.Printf("[sidecar:go] ERROR [%s] %s (details: %v)\n", code, message, details)
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

	log.Printf("[sidecar:go] Received command: %s (args count: %d)\n", req.Command, len(req.Args))

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
	case "get_wallpaper_info":
		handleGetWallpaperInfo()
	case "list_wallpapers":
		handleListWallpapers()
	case "ensure_wallpaper_thumbs":
		handleEnsureWallpaperThumbs()
	case "set_wallpaper":
		handleSetWallpaper(req.Args)
	case "get_theme_colors":
		handleGetThemeColors()
	case "get_audio_devices":
		handleGetAudioDevices()
	case "set_audio_device":
		handleSetAudioDevice(req.Args)
	case "set_audio_volume":
		handleSetAudioVolume(req.Args)
	case "test_audio":
		handleTestAudio()
	case "apply_display_layout":
		handleApplyDisplayLayout(req.Args)
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
	if err := config.BackupConfig(paths.ConfigFile); err != nil {
		// Non-fatal: the config may not exist yet on a fresh system.
		fmt.Printf("Warning: failed to backup niri config: %v\n", err)
	}
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

	resolvedPath := expandPath(path)
	data, err := os.ReadFile(resolvedPath)
	if err != nil {
		writeError(os.Stdout, "FILE_READ_ERROR", fmt.Sprintf("Failed to read %s: %v", resolvedPath, err), nil)
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

	resolvedPath := expandPath(path)
	dir := filepath.Dir(resolvedPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		writeError(os.Stdout, "DIR_CREATE_ERROR", fmt.Sprintf("Failed to create dir %s: %v", dir, err), nil)
		return
	}

	if err := os.WriteFile(resolvedPath, []byte(content), 0644); err != nil {
		writeError(os.Stdout, "FILE_WRITE_ERROR", fmt.Sprintf("Failed to write %s: %v", resolvedPath, err), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok", "path": resolvedPath})
}

func handleOpenFile(args map[string]interface{}) {
	path, ok := getStringArg(args, "path")
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'path' argument", nil)
		return
	}

	resolvedPath := expandPath(path)
	// Only launchers that can attach to the desktop environment work here:
	// the sidecar has no controlling TTY, so terminal editors (nvim, vim,
	// nano) would die immediately with stdin/stdout disconnected.
	editors := []string{"code", "xdg-open"}
	var lastErr error
	for _, editor := range editors {
		cmd := exec.Command(editor, resolvedPath)
		if err := cmd.Start(); err != nil {
			lastErr = err
			continue
		}
		writeResponse(os.Stdout, map[string]string{"status": "ok", "editor": editor})
		return
	}
	writeError(os.Stdout, "NO_EDITOR", fmt.Sprintf("Failed to open %s: %v", resolvedPath, lastErr), nil)
}

type WallpaperItem struct {
	Path      string   `json:"path"`
	Filename  string   `json:"filename"`
	Name      string   `json:"name"`
	Moods     []string `json:"moods"`
	FileSize  int64    `json:"file_size"`
	MTime     float64  `json:"mtime"`
	Thumbnail string   `json:"thumbnail"`
}

type WallpaperMoodStats struct {
	LAvg float64 `json:"L_avg"`
	CAvg float64 `json:"C_avg"`
	HDom float64 `json:"h_dom"`
}

type WallpaperTagEntry struct {
	MTime float64            `json:"mtime"`
	Moods []string           `json:"moods"`
	Stats WallpaperMoodStats `json:"stats"`
}

type WallpaperMoodsCacheFile struct {
	Version int                          `json:"version"`
	Tags    map[string]WallpaperTagEntry `json:"tags"`
}

func getWallpaperData(home string) ([]WallpaperItem, map[string]int, map[string][]string, int) {
	moodCounts := map[string]int{
		"dark":  0,
		"light": 0,
		"warm":  0,
		"cool":  0,
		"sky":   0,
		"earth": 0,
	}
	wallpapersByMood := map[string][]string{
		"dark":  {},
		"light": {},
		"warm":  {},
		"cool":  {},
		"sky":   {},
		"earth": {},
	}
	wallpapersMap := make(map[string]WallpaperItem)

	cachePath := filepath.Join(home, ".cache", "dotfiles", "wallpaper-moods.json")
	if cacheData, err := os.ReadFile(cachePath); err == nil {
		var cache WallpaperMoodsCacheFile
		if err := json.Unmarshal(cacheData, &cache); err == nil {
			for path, entry := range cache.Tags {
				resolvedPath := expandPath(path)
				var moods []string
				for _, m := range entry.Moods {
					mLower := strings.ToLower(m)
					moods = append(moods, mLower)
					if _, ok := moodCounts[mLower]; ok {
						moodCounts[mLower]++
						wallpapersByMood[mLower] = append(wallpapersByMood[mLower], resolvedPath)
					}
				}
				if moods == nil {
					moods = []string{}
				}
				filename := filepath.Base(resolvedPath)
				ext := filepath.Ext(filename)
				name := strings.TrimSuffix(filename, ext)
				var fileSize int64
				if fi, err := os.Stat(resolvedPath); err == nil {
					fileSize = fi.Size()
				}
				wallpapersMap[resolvedPath] = WallpaperItem{
					Path:      resolvedPath,
					Filename:  filename,
					Name:      name,
					Moods:     moods,
					FileSize:  fileSize,
					MTime:     entry.MTime,
					Thumbnail: thumbnailPathFor(home, resolvedPath),
				}
			}
		}
	}

	wallpapersDir := filepath.Join(home, "Pictures", "wallpapers")
	if entries, err := os.ReadDir(wallpapersDir); err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			ext := strings.ToLower(filepath.Ext(entry.Name()))
			if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" {
				fullPath := filepath.Join(wallpapersDir, entry.Name())
				if _, exists := wallpapersMap[fullPath]; !exists {
					var fileSize int64
					var mtime float64
					if fi, err := entry.Info(); err == nil {
						fileSize = fi.Size()
						mtime = float64(fi.ModTime().Unix())
					}
					wallpapersMap[fullPath] = WallpaperItem{
						Path:      fullPath,
						Filename:  entry.Name(),
						Name:      strings.TrimSuffix(entry.Name(), ext),
						Moods:     []string{},
						FileSize:  fileSize,
						MTime:     mtime,
						Thumbnail: thumbnailPathFor(home, fullPath),
					}
				}
			}
		}
	}

	wallpapers := make([]WallpaperItem, 0, len(wallpapersMap))
	for _, item := range wallpapersMap {
		wallpapers = append(wallpapers, item)
	}

	sort.Slice(wallpapers, func(i, j int) bool {
		return strings.ToLower(wallpapers[i].Filename) < strings.ToLower(wallpapers[j].Filename)
	})

	return wallpapers, moodCounts, wallpapersByMood, len(wallpapers)
}

func handleGetWallpaperInfo() {
	home, err := os.UserHomeDir()
	if err != nil {
		writeError(os.Stdout, "USER_DIR_ERROR", "Could not get user home directory", nil)
		return
	}

	currentPath := ""
	currentFile := filepath.Join(home, ".config", "current_wallpaper")
	if data, err := os.ReadFile(currentFile); err == nil {
		currentPath = strings.TrimSpace(string(data))
	}
	if currentPath == "" {
		fallback := filepath.Join(home, "Pictures", "wallpapers", "daily.jpg")
		if _, err := os.Stat(fallback); err == nil {
			currentPath = fallback
		}
	}
	if currentPath != "" {
		currentPath = expandPath(currentPath)
	}

	wallpapers, moodCounts, wallpapersByMood, totalScanned := getWallpaperData(home)

	skipToday := false
	skipFile := filepath.Join(home, ".local", "share", "dotfiles", "skip_today")
	if skipData, err := os.ReadFile(skipFile); err == nil {
		todayStr := time.Now().Format("2006-01-02")
		if strings.TrimSpace(string(skipData)) == todayStr {
			skipToday = true
		}
	}

	writeResponse(os.Stdout, map[string]interface{}{
		"current_wallpaper":  currentPath,
		"total_scanned":      totalScanned,
		"mood_counts":        moodCounts,
		"wallpapers_by_mood": wallpapersByMood,
		"wallpapers":         wallpapers,
		"skip_today":         skipToday,
	})
}

func handleListWallpapers() {
	home, err := os.UserHomeDir()
	if err != nil {
		writeError(os.Stdout, "USER_DIR_ERROR", "Could not get user home directory", nil)
		return
	}
	wallpapers, _, _, total := getWallpaperData(home)
	writeResponse(os.Stdout, map[string]interface{}{
		"wallpapers": wallpapers,
		"total":      total,
	})
}

func handleSetWallpaper(args map[string]interface{}) {
	path, ok := getStringArg(args, "path")
	if !ok || strings.TrimSpace(path) == "" {
		writeError(os.Stdout, "INVALID_ARGS", "Missing or empty 'path' argument", nil)
		return
	}
	resolvedPath := expandPath(strings.TrimSpace(path))
	if _, err := os.Stat(resolvedPath); err != nil {
		writeError(os.Stdout, "FILE_NOT_FOUND", fmt.Sprintf("Wallpaper file not found: %s", resolvedPath), nil)
		return
	}

	home, _ := os.UserHomeDir()
	if home != "" {
		currentFile := filepath.Join(home, ".config", "current_wallpaper")
		_ = os.WriteFile(currentFile, []byte(resolvedPath), 0644)
	}

	if err := system.SetWallpaper(resolvedPath); err != nil {
		writeError(os.Stdout, "SET_WALLPAPER_FAILED", fmt.Sprintf("Failed to set wallpaper: %v", err), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{
		"status": "ok",
		"path":   resolvedPath,
	})
}

func handleGetThemeColors() {
	th, err := theme.GetThemeColors()
	if err != nil {
		writeError(os.Stdout, "THEME_ERROR", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, th)
}

func handleGetAudioDevices() {
	info, err := audio.GetAudioDevices()
	if err != nil {
		writeError(os.Stdout, "AUDIO_ERROR", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, info)
}

func handleSetAudioDevice(args map[string]interface{}) {
	var id int
	if rawID, ok := args["id"]; ok {
		switch v := rawID.(type) {
		case float64:
			id = int(v)
		case int:
			id = v
		default:
			writeError(os.Stdout, "INVALID_ARGS", "Invalid or missing 'id' argument", nil)
			return
		}
	} else {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'id' argument", nil)
		return
	}

	if err := audio.SetDefaultAudioDevice(id); err != nil {
		writeError(os.Stdout, "AUDIO_ERROR", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}

func handleSetAudioVolume(args map[string]interface{}) {
	var id int
	if rawID, ok := args["id"]; ok {
		switch v := rawID.(type) {
		case float64:
			id = int(v)
		case int:
			id = v
		}
	}

	volume := 100
	if rawVol, ok := args["volume"]; ok {
		switch v := rawVol.(type) {
		case float64:
			volume = int(v)
		case int:
			volume = v
		}
	}

	muted := false
	if rawMuted, ok := args["muted"]; ok {
		if b, ok := rawMuted.(bool); ok {
			muted = b
		}
	}

	if err := audio.SetAudioVolume(id, volume, muted); err != nil {
		writeError(os.Stdout, "AUDIO_ERROR", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}

func handleTestAudio() {
	if err := audio.TestAudio(); err != nil {
		writeError(os.Stdout, "AUDIO_ERROR", err.Error(), nil)
		return
	}
	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}

func handleApplyDisplayLayout(args map[string]interface{}) {
	rawDisplays, ok := args["displays"]
	if !ok {
		writeError(os.Stdout, "INVALID_ARGS", "Missing 'displays' argument", nil)
		return
	}

	data, err := json.Marshal(rawDisplays)
	if err != nil {
		writeError(os.Stdout, "INVALID_ARGS", "Failed to serialize displays", nil)
		return
	}

	var layouts []niri.DisplayLayoutConfig
	if err := json.Unmarshal(data, &layouts); err != nil {
		writeError(os.Stdout, "INVALID_ARGS", "Failed to parse displays layout", nil)
		return
	}

	if err := niri.ApplyDisplayLayout(layouts); err != nil {
		writeError(os.Stdout, "DISPLAY_LAYOUT_ERROR", err.Error(), nil)
		return
	}

	writeResponse(os.Stdout, map[string]string{"status": "ok"})
}
