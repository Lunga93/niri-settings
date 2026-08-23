package system

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestResolveScriptPrefersOverrideDir(t *testing.T) {
	override := t.TempDir()
	t.Setenv("NIRI_SCRIPT_BIN_DIR", override)
	t.Setenv("XDG_BIN_HOME", "")
	home := t.TempDir()

	// Same name in ~/.local/bin must lose to the override dir.
	local := filepath.Join(home, ".local", "bin", "apply-theme")
	if err := os.MkdirAll(filepath.Dir(local), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(local, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	winner := filepath.Join(override, "apply-theme")
	if err := os.WriteFile(winner, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}

	got, ok := ResolveScript(home, "apply-theme")
	if !ok || got != winner {
		t.Errorf("expected override dir win (%s), got %q ok=%v", winner, got, ok)
	}
}

func TestResolveScriptFallsBackToHomeBinThenPath(t *testing.T) {
	t.Setenv("NIRI_SCRIPT_BIN_DIR", "")
	t.Setenv("XDG_BIN_HOME", "")
	home := t.TempDir()
	t.Setenv("HOME", home)

	bin := filepath.Join(home, ".local", "bin")
	fakePathDir := t.TempDir()
	t.Setenv("PATH", fakePathDir)

	if _, ok := ResolveScript(home, "night-light"); ok {
		t.Fatal("must not resolve when nowhere present")
	}

	onPath := filepath.Join(fakePathDir, "night-light")
	if err := os.WriteFile(onPath, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	got, ok := ResolveScript(home, "night-light")
	if !ok || got != onPath {
		t.Errorf("expected PATH fallback %s, got %q ok=%v", onPath, got, ok)
	}

	local := filepath.Join(bin, "night-light")
	if err := os.MkdirAll(bin, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(local, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	got, ok = ResolveScript(home, "night-light")
	if !ok || got != local {
		t.Errorf("expected ~/.local/bin to beat PATH, got %q ok=%v", got, ok)
	}
}

func TestResolveScriptRejectsPathsAndMissing(t *testing.T) {
	t.Setenv("NIRI_SCRIPT_BIN_DIR", "")
	t.Setenv("XDG_BIN_HOME", "")
	home := t.TempDir()
	t.Setenv("PATH", "/nonexistent/bin")

	if _, ok := ResolveScript(home, ""); ok {
		t.Error("empty name must not resolve")
	}
	if _, ok := ResolveScript(home, "../evil"); ok {
		t.Error("names with separators must be rejected")
	}
	if _, ok := ResolveScript(home, "does-not-exist"); ok {
		t.Error("missing script must not resolve")
	}
}

func TestRunNamedScriptExecutesResolvedPath(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("NIRI_SCRIPT_BIN_DIR", dir)
	home := t.TempDir()

	script := filepath.Join(dir, "echo-args")
	content := "#!/bin/sh\nprintf '%s\\n' \"$@\"\n"
	if err := os.WriteFile(script, []byte(content), 0o755); err != nil {
		t.Fatal(err)
	}

	if err := RunNamedScript(home, "echo-args", []string{"one", "two"}); err != nil {
		t.Fatalf("resolved run failed: %v", err)
	}
	err := RunNamedScript(home, "missing-script", nil)
	if err == nil || !strings.Contains(err.Error(), "not found") {
		t.Errorf("expected not-found error, got: %v", err)
	}
}
