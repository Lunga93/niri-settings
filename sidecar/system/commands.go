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
//
// stdout/stderr are redirected to a temp FILE instead of pipes on purpose:
// backgrounded children inherit the file descriptors harmlessly, whereas
// inherited pipes keep io.Copy alive forever and deadlock cmd.Wait once a
// daemon outlives the script. The process group is killed on timeout so
// runaway foreground children cannot linger either.
func ExecScript(script string) error {
	cmd := exec.Command("bash", "-c", script)
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
		return fmt.Errorf("script timed out after %s: %s", execScriptTimeout, script)
	}
	if waitErr != nil {
		return fmt.Errorf("script execution failed: %w (output: %s)", waitErr, tailFile(logPath))
	}
	return nil
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

// SetWallpaper invokes ~/.local/bin/set-wallpaper or set-wallpaper with the specified wallpaper path.
func SetWallpaper(wallpaperPath string) error {
	return ExecScript(fmt.Sprintf("~/.local/bin/set-wallpaper %q", wallpaperPath))
}
