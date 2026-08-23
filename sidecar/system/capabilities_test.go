package system

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"niri-settings-sidecar/protocol"
)

// captureProtocolOutput redirects protocol.Out to a buffer for fn's duration.
func captureProtocolOutput(t *testing.T, fn func()) string {
	t.Helper()
	orig := protocol.Out
	buf := &bytes.Buffer{}
	protocol.Out = buf
	defer func() { protocol.Out = orig }()
	fn()
	return buf.String()
}

func TestDetectCapabilitiesWithCleanHome(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(t.TempDir(), "xdg"))
	t.Setenv("NIRI_SOCKET", "")
	t.Setenv("PATH", "/nonexistent/bin")

	caps := DetectCapabilities()

	if caps.Niri || caps.GSettings || caps.Wpctl || caps.ApplyTheme ||
		caps.ApplyDisplayScale || caps.NightLight || caps.PywalCache || caps.Quickshell {
		t.Errorf("expected everything false on a bare host: %+v", caps)
	}
}

func TestDetectCapabilitiesDetectsScriptsAndCache(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(home, "xdg"))
	t.Setenv("NIRI_SOCKET", "")
	t.Setenv("PATH", "/nonexistent/bin")

	bin := filepath.Join(home, ".local", "bin")
	for _, name := range []string{"apply-theme", "night-light"} {
		p := filepath.Join(bin, name)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte("#!/bin/sh\n"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	// Non-executable file must not count.
	if err := os.WriteFile(filepath.Join(bin, "apply-display-scale"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	walDir := filepath.Join(home, ".cache", "wal")
	if err := os.MkdirAll(walDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(walDir, "colors.json"), []byte("{}"), 0o644); err != nil {
		t.Fatal(err)
	}

	caps := DetectCapabilities()

	if !caps.ApplyTheme || !caps.NightLight {
		t.Errorf("executable scripts not detected: %+v", caps)
	}
	if caps.ApplyDisplayScale {
		t.Errorf("non-executable script must be ignored: %+v", caps)
	}
	if !caps.PywalCache {
		t.Errorf("pywal cache not detected: %+v", caps)
	}
}

func TestHandleGetCapabilitiesEmitsJSON(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("PATH", "/nonexistent/bin")

	stdout := captureProtocolOutput(t, func() {
		HandleGetCapabilities(nil)
	})

	var parsed map[string]any
	if err := json.Unmarshal([]byte(stdout), &parsed); err != nil {
		t.Fatalf("invalid response JSON %q: %v", stdout, err)
	}
	if parsed["ok"] != true {
		t.Errorf("expected ok=true, got %v", parsed["ok"])
	}
	data, ok := parsed["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected object data, got %T", parsed["data"])
	}
	if _, exists := data["apply_theme"]; !exists {
		t.Errorf("missing apply_theme field in %+v", data)
	}
}
