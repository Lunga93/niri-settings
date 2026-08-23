// Package setup — in-app update: check GitHub releases, download, apply.
package setup

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"niri-settings-sidecar/protocol"
)

const (
	updateOwner  = "Lunga93"
	updateRepo   = "niri-settings"
	updateAsset  = "niri-settings-%s-linux-x86_64.tar.gz"
	updateStaging = ".local/share/niri-settings/update"
)

var currentVersion = "0.1.2" // set at build time via -ldflags if desired

type UpdateInfo struct {
	Available bool   `json:"available"`
	Version   string `json:"version"`
	URL       string `json:"url"`
	Notes     string `json:"notes"`
}

type UpdateProgress struct {
	Status  string `json:"status"` // "downloading", "extracting", "ready", "error"
	Percent int    `json:"percent,omitempty"`
	Message string `json:"message,omitempty"`
}

// HandleCheckForUpdate queries GitHub releases for a newer version.
func HandleCheckForUpdate(_ map[string]any) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", updateOwner, updateRepo)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		protocol.WriteResponse(map[string]any{"available": false, "error": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		protocol.WriteResponse(map[string]any{"available": false})
		return
	}

	var release struct {
		TagName string `json:"tag_name"`
		Body    string `json:"body"`
		Assets  []struct {
			Name               string `json:"name"`
			BrowserDownloadURL string `json:"browser_download_url"`
		} `json:"assets"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		protocol.WriteResponse(map[string]any{"available": false})
		return
	}

	latestVersion := strings.TrimPrefix(release.TagName, "v")
	if latestVersion == currentVersion {
		protocol.WriteResponse(map[string]any{"available": false})
		return
	}

	var downloadURL string
	for _, a := range release.Assets {
		if strings.Contains(a.Name, "linux-x86_64.tar.gz") {
			downloadURL = a.BrowserDownloadURL
			break
		}
	}

	protocol.WriteResponse(map[string]any{
		"available": true,
		"version":   latestVersion,
		"url":       downloadURL,
		"notes":     release.Body,
	})
}

// HandleDownloadUpdate downloads the release tarball to a staging directory.
func HandleDownloadUpdate(args map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}
	raw, _ := json.Marshal(args)
	var req struct {
		URL string `json:"url"`
	}
	json.Unmarshal(raw, &req)
	if req.URL == "" {
		protocol.InvalidArgs("missing url")
		return
	}

	staging := filepath.Join(home, updateStaging)
	if err := os.MkdirAll(staging, 0o755); err != nil {
		protocol.WriteError("UPDATE_ERROR", err.Error(), nil)
		return
	}

	tarball := filepath.Join(staging, "update.tar.gz")
	out, err := os.Create(tarball)
	if err != nil {
		protocol.WriteError("UPDATE_ERROR", err.Error(), nil)
		return
	}
	defer out.Close()

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Get(req.URL)
	if err != nil {
		protocol.WriteError("UPDATE_ERROR", err.Error(), nil)
		return
	}
	defer resp.Body.Close()

	written, err := io.Copy(out, resp.Body)
	if err != nil {
		protocol.WriteError("UPDATE_ERROR", err.Error(), nil)
		return
	}

	protocol.WriteResponse(map[string]any{
		"status":  "downloaded",
		"path":    tarball,
		"size":    written,
	})
}

// HandleApplyUpdate extracts the tarball, replaces sidecar, flags main binary
// for update on next launch.
func HandleApplyUpdate(args map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}
	raw, _ := json.Marshal(args)
	var req struct {
		Path string `json:"path"`
	}
	json.Unmarshal(raw, &req)
	if req.Path == "" {
		protocol.InvalidArgs("missing path")
		return
	}

	staging := filepath.Join(home, updateStaging)
	extractDir := filepath.Join(staging, "extracted")
	os.RemoveAll(extractDir)
	os.MkdirAll(extractDir, 0o755)

	// Extract tarball
	cmd := exec.Command("tar", "-xzf", req.Path, "-C", extractDir)
	if out, err := cmd.CombinedOutput(); err != nil {
		protocol.WriteError("UPDATE_ERROR", fmt.Sprintf("extract failed: %s %s", err, string(out)), nil)
		return
	}

	binDir := filepath.Join(home, ".local", "bin")

	// Replace sidecar (safe while running — it's stateless)
	sidecarSrc := findFile(extractDir, "niri-settings-sidecar")
	sidecarDst := filepath.Join(binDir, "niri-settings-sidecar")
	if sidecarSrc != "" {
		os.Chmod(sidecarSrc, 0o755)
		copyFile(sidecarSrc, sidecarDst)
	}

	// Copy icons
	iconDst := filepath.Join(home, ".local", "share", "icons", "hicolor")
	for _, size := range []string{"32x32", "128x128", "256x256"} {
		src := findFile(extractDir, size+".png")
		if src != "" {
			dst := filepath.Join(iconDst, size, "apps", "niri-settings.png")
			os.MkdirAll(filepath.Dir(dst), 0o755)
			copyFile(src, dst)
		}
	}

	// Flag main binary for update on next launch
	flagFile := filepath.Join(staging, "pending_update")
	mainSrc := findFile(extractDir, "niri-settings")
	pending := map[string]string{
		"main_binary": mainSrc,
		"target":      filepath.Join(binDir, "niri-settings"),
		"desktop":     findFile(extractDir, "niri-settings.desktop"),
		"desktop_dst": filepath.Join(home, ".local", "share", "applications", "niri-settings.desktop"),
	}
	data, _ := json.MarshalIndent(pending, "", "  ")
	os.WriteFile(flagFile, data, 0o644)

	// Clean up
	os.RemoveAll(extractDir)
	os.Remove(req.Path)

	protocol.WriteResponse(map[string]any{
		"status":  "ready",
		"message": "Update downloaded. Restart the app to apply.",
	})
}

// HandlePendingUpdate checks if there's a pending update to apply on launch.
func HandlePendingUpdate(_ map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}

	flagFile := filepath.Join(home, updateStaging, "pending_update")
	data, err := os.ReadFile(flagFile)
	if err != nil {
		protocol.WriteResponse(map[string]any{"pending": false})
		return
	}

	var pending map[string]string
	if json.Unmarshal(data, &pending) != nil {
		protocol.WriteResponse(map[string]any{"pending": false})
		return
	}

	// Apply the pending update
	if mainSrc, ok := pending["main_binary"]; ok && mainSrc != "" {
		os.Chmod(mainSrc, 0o755)
		copyFile(mainSrc, pending["target"])
	}
	if desktopSrc, ok := pending["desktop"]; ok && desktopSrc != "" {
		os.MkdirAll(filepath.Dir(pending["desktop_dst"]), 0o755)
		copyFile(desktopSrc, pending["desktop_dst"])
	}

	os.Remove(flagFile)
	os.RemoveAll(filepath.Join(home, updateStaging))

	protocol.WriteResponse(map[string]any{
		"pending": true,
		"message": "Update applied. Some changes may require a logout/login.",
	})
}

// findFile recursively searches dir for a file with the given name.
func findFile(dir, name string) string {
	var found string
	filepath.WalkDir(dir, func(p string, d os.DirEntry, err error) error {
		if err != nil || found != "" {
			return nil
		}
		if !d.IsDir() && d.Name() == name {
			found = p
		}
		return nil
	})
	return found
}

// versionTuple parses "0.1.1" into [0,1,1] for comparison.
var numRe = regexp.MustCompile(`\d+`)

func versionTuple(v string) [3]int {
	parts := numRe.FindAllString(v, 3)
	var t [3]int
	for i, p := range parts {
		fmt.Sscanf(p, "%d", &t[i])
	}
	return t
}
