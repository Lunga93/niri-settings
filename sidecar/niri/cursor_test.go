package niri

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// isolateConfig points config.Resolve() at a temp dir and returns its path.
func isolateConfig(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	t.Setenv("NIRI_CONFIG", "")
	return dir
}

func writeConfig(t *testing.T, dir, content string) string {
	t.Helper()
	path := filepath.Join(dir, "niri", "config.kdl")
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
	return path
}

const baseConfig = `input {
    keyboard {
        xkb-layout "us"
    }
}

layout {
    gaps 8
}

binds {
    Mod+T { spawn "alacritty"; }
}
`

func readBack(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func TestSetCursorAppendsBlockWhenMissing(t *testing.T) {
	dir := isolateConfig(t)
	path := writeConfig(t, dir, baseConfig)

	if err := SetCursor("Pop", 32); err != nil {
		t.Fatalf("SetCursor: %v", err)
	}

	content := readBack(t, path)
	for _, want := range []string{
		"cursor {",
		`xcursor-theme "Pop"`,
		"xcursor-size 32",
		`gaps 8`,
	} {
		if !strings.Contains(content, want) {
			t.Errorf("expected %q in config:\n%s", want, content)
		}
	}
	if strings.Count(content, "cursor {") != 1 {
		t.Errorf("expected exactly one cursor block:\n%s", content)
	}

	env := readBack(t, filepath.Join(dir, "environment.d", "50-niri-cursor.conf"))
	if !strings.Contains(env, "XCURSOR_THEME=Pop") || !strings.Contains(env, "XCURSOR_SIZE=32") {
		t.Errorf("unexpected env file:\n%s", env)
	}
}

func TestSetCursorReplacesExistingValues(t *testing.T) {
	dir := isolateConfig(t)
	existing := baseConfig + "\ncursor {\n    xcursor-theme \"Adwaita\"\n    xcursor-size 24\n}\n"
	path := writeConfig(t, dir, existing)

	if err := SetCursor("breeze-dark", 48); err != nil {
		t.Fatalf("SetCursor: %v", err)
	}

	content := readBack(t, path)
	if strings.Contains(content, "Adwaita") || strings.Contains(content, "xcursor-size 24") {
		t.Errorf("old values not replaced:\n%s", content)
	}
	if !strings.Contains(content, `xcursor-theme "breeze-dark"`) || !strings.Contains(content, "xcursor-size 48") {
		t.Errorf("new values missing:\n%s", content)
	}
	if strings.Count(content, "cursor {") != 1 {
		t.Errorf("expected exactly one cursor block:\n%s", content)
	}
	// Surrounding blocks must survive untouched.
	if !strings.Contains(content, `xkb-layout "us"`) || !strings.Contains(content, `spawn "alacritty";`) {
		t.Errorf("neighbouring blocks damaged:\n%s", content)
	}
}

func TestSetCursorInsertsMissingKeyOnly(t *testing.T) {
	dir := isolateConfig(t)
	existing := baseConfig + "\ncursor {\n    xcursor-theme \"Pop\"\n}\n"
	path := writeConfig(t, dir, existing)

	if err := SetCursor("Pop", 34); err != nil {
		t.Fatalf("SetCursor: %v", err)
	}

	content := readBack(t, path)
	if strings.Count(content, `xcursor-theme "Pop"`) != 1 {
		t.Errorf("theme line duplicated:\n%s", content)
	}
	if !strings.Contains(content, "xcursor-size 34") {
		t.Errorf("size line not inserted:\n%s", content)
	}
}

func TestPatchCursorBlockIgnoresCommentsAndNestedBraces(t *testing.T) {
	content := "// cursor {\n//     xcursor-theme \"Old\"\n// }\n" +
		"binds {\n    Mod+Q { exit; }\n}\n" +
		"cursor {\n    // stale\n    xcursor-theme \"Old\"\n}\n" +
		"layout {\n    focus-ring {\n        width 2\n    }\n}\n"

	got := patchCursorBlock(content, "Cosmic", 24)
	for _, line := range strings.Split(got, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") {
			continue
		}
		if strings.Contains(trimmed, `"Old"`) {
			t.Errorf("stale theme survived outside comments:\n%s", got)
		}
	}
	if !strings.Contains(got, `xcursor-theme "Cosmic"`) || !strings.Contains(got, "xcursor-size 24") {
		t.Errorf("patch missing:\n%s", got)
	}
	if !strings.Contains(got, "width 2") || !strings.Contains(got, "Mod+Q { exit; }") {
		t.Errorf("other blocks damaged:\n%s", got)
	}
}

func TestSetCursorRejectsInvalidArgs(t *testing.T) {
	dir := isolateConfig(t)
	writeConfig(t, dir, baseConfig)

	if err := SetCursor("", 24); err == nil {
		t.Error("empty theme should fail")
	}
	if err := SetCursor("Pop", 0); err == nil {
		t.Error("zero size should fail")
	}
}
