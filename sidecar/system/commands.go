package system

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time"
)

// execScriptTimeout bounds every helper script. Scripts that daemonize
// (wlsunset, gammastep, ...) must never wedge the sidecar's command loop.
// Var (not const) so tests can shorten it.
var execScriptTimeout = 20 * time.Second

// ExecScript runs a shell command via bash -c with a hard timeout.
func ExecScript(script string) error {
	return RunCommand("bash", []string{"-c", script})
}

// RunCommand executes a program with args under the shared guard rails:
// file-backed stdio (so daemons inheriting fds can't deadlock Wait),
// process groups and a timeout SIGKILL.
func RunCommand(name string, args []string) error {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	logFile, err := os.CreateTemp("", "niri-exec-*.log")
	if err != nil {
		return fmt.Errorf("script log create failed: %w", err)
	}
	logPath := logFile.Name()
	defer os.Remove(logPath)
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return fmt.Errorf("script start failed: %w", err)
	}

	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

	var waitErr error
	timedOut := false
	select {
	case waitErr = <-done:
	case <-time.After(execScriptTimeout):
		timedOut = true
		if cmd.Process != nil {
			_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		}
		waitErr = <-done
	}
	logFile.Close()

	if timedOut {
		return fmt.Errorf("script timed out after %s: %s", execScriptTimeout, name)
	}
	if waitErr != nil {
		return fmt.Errorf("script execution failed: %w (output: %s)", waitErr, tailFile(logPath))
	}
	return nil
}

// RunNamedScript resolves a helper script by name (bin dirs then $PATH) and
// runs it with args, so callers never hardcode install locations.
func RunNamedScript(home, name string, scriptArgs []string) error {
	path, ok := ResolveScript(home, name)
	if !ok {
		return fmt.Errorf("helper script %q not found (searched NIRI_SCRIPT_BIN_DIR, XDG_BIN_HOME, ~/.local/bin, $PATH)", name)
	}
	return RunCommand(path, scriptArgs)
}

// tailFile returns the last 400 bytes of a file for error messages.
func tailFile(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	out := string(data)
	if len(out) > 400 {
		out = out[len(out)-400:]
	}
	return strings.TrimSpace(out)
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

// SetWallpaper runs the set-wallpaper helper (resolved, not hardcoded).
func SetWallpaper(wallpaperPath string) error {
	home, _ := os.UserHomeDir()
	return RunNamedScript(home, "set-wallpaper", []string{wallpaperPath})
}
