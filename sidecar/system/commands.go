package system

import (
	"fmt"
	"os/exec"
)

// ExecScript runs a shell command via bash -c.
func ExecScript(script string) error {
	cmd := exec.Command("bash", "-c", script)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("script execution failed: %w (output: %s)", err, string(out))
	}
	return nil
}

// ReloadQuickshell signals the quickshell daemon to reload its configuration.
func ReloadQuickshell() error {
	return ExecScript("qs ipc call settings reload")
}

// SetGSetting sets a GSettings value for the GNOME desktop interface.
func SetGSetting(schema, key, value string) error {
	cmd := exec.Command("gsettings", "set", schema, key, value)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("gsettings set failed: %w (output: %s)", err, string(out))
	}
	return nil
}

// SetWallpaper invokes ~/.local/bin/set-wallpaper or set-wallpaper with the specified wallpaper path.
func SetWallpaper(wallpaperPath string) error {
	return ExecScript(fmt.Sprintf("~/.local/bin/set-wallpaper %q", wallpaperPath))
}
