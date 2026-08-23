package setup

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestInstallToCustomDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "bin")
	t.Setenv("NIRI_SCRIPT_BIN_DIR", dir)
	t.Setenv("XDG_BIN_HOME", "")
	home := t.TempDir()

	results, err := installScripts(home)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != len(scripts) {
		t.Fatalf("expected %d results, got %d", len(scripts), len(results))
	}
	for _, r := range results {
		if r.status != "installed" {
			t.Errorf("%s: expected installed, got %q (%s)", r.script, r.status, r.detail)
		}
		info, err := os.Stat(filepath.Join(dir, r.script))
		if err != nil {
			t.Fatalf("%s missing: %v", r.script, err)
		}
		if info.Mode().Perm()&0o100 == 0 {
			t.Errorf("%s not executable", r.script)
		}
	}
}

func TestInstallFallsBackToLocalBin(t *testing.T) {
	t.Setenv("NIRI_SCRIPT_BIN_DIR", "")
	t.Setenv("XDG_BIN_HOME", "")
	home := t.TempDir()

	if _, err := installScripts(home); err != nil {
		t.Fatal(err)
	}
	for _, spec := range scripts {
		if _, err := os.Stat(filepath.Join(home, ".local", "bin", spec.name)); err != nil {
			t.Errorf("%s not in ~/.local/bin: %v", spec.name, err)
		}
	}
}

func TestForeignScriptIsKept(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "bin")
	t.Setenv("NIRI_SCRIPT_BIN_DIR", dir)
	home := t.TempDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	foreign := "#!/usr/bin/env bash\n# my precious custom script\nexit 0\n"
	if err := os.WriteFile(filepath.Join(dir, "apply-theme"), []byte(foreign), 0o755); err != nil {
		t.Fatal(err)
	}

	results, err := installScripts(home)
	if err != nil {
		t.Fatal(err)
	}
	kept := 0
	for _, r := range results {
		if r.script == "apply-theme" && r.status != "kept" {
			t.Errorf("foreign apply-theme should be kept, got %q", r.status)
		}
		if r.status == "kept" {
			kept++
		}
	}
	got, _ := os.ReadFile(filepath.Join(dir, "apply-theme"))
	if string(got) != foreign {
		t.Error("foreign script content must not be modified")
	}
	if kept != 1 {
		t.Errorf("expected exactly one kept script, got %d", kept)
	}
}

func TestManagedScriptIsUpdated(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "bin")
	t.Setenv("NIRI_SCRIPT_BIN_DIR", dir)
	home := t.TempDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	old := "#!/usr/bin/env bash\n" + marker + "\nold version\n"
	path := filepath.Join(dir, "night-light")
	if err := os.WriteFile(path, []byte(old), 0o755); err != nil {
		t.Fatal(err)
	}

	results, err := installScripts(home)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, r := range results {
		if r.script == "night-light" {
			found = true
			if r.status != "updated" {
				t.Errorf("managed script should be updated, got %q", r.status)
			}
		}
	}
	if !found {
		t.Fatal("night-light result missing")
	}
	content, _ := os.ReadFile(path)
	if strings.Contains(string(content), "old version") {
		t.Error("managed script was not overwritten")
	}
}
