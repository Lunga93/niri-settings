package startup

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const sampleEntry = `[Desktop Entry]
Type=Application
Name=My Tool
Exec=/usr/bin/my-tool --flag
Comment=Does things
Terminal=false
Hidden=true
NoDisplay=true
`

func TestParseAndSerializeRoundTrip(t *testing.T) {
	fields := parseDesktop(sampleEntry)
	app := appFromFields("/x/my-tool.desktop", fields)

	if app.Name != "My Tool" || app.Command != "/usr/bin/my-tool --flag" {
		t.Fatalf("parse wrong: %+v", app)
	}
	if !app.Hidden || app.Terminal {
		t.Fatalf("flags wrong: %+v", app)
	}

	out := serializeDesktop(app)
	reparsed := appFromFields("/x/my-tool.desktop", parseDesktop(out))
	if reparsed.Name != app.Name || reparsed.Command != app.Command || !reparsed.Hidden {
		t.Errorf("round trip lost data: %+v -> %s", app, out)
	}
	if !strings.Contains(out, "Hidden=true") || !strings.Contains(out, "NoDisplay=true") {
		t.Errorf("hidden must set both Hidden and NoDisplay: %s", out)
	}
}

func TestParseDesktopIgnoresOtherSections(t *testing.T) {
	content := "[Desktop Action win]\nName=Wrong\n\n[Desktop Entry]\nName=Right\nExec=x\n"
	app := appFromFields("/x/a.desktop", parseDesktop(content))
	if app.Name != "Right" {
		t.Errorf("expected Desktop Entry section to win, got %+v", app)
	}
}

func TestSlugify(t *testing.T) {
	cases := map[string]string{
		"My Cool App": "my-cool-app",
		"  spaces  ":  "spaces",
		"!!!":         "app",
		"a_b/c*d":     "a-b-c-d",
	}
	for in, want := range cases {
		if got := slugify(in); got != want {
			t.Errorf("slugify(%q) = %q, want %q", in, got, want)
		}
	}
}

func writeStub(t *testing.T, home, name, content string) string {
	t.Helper()
	dir := filepath.Join(home, ".config", "autostart")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestUpsertPreservesHiddenOnUpdate(t *testing.T) {
	home := t.TempDir()
	writeStub(t, home, "my-app.desktop", sampleEntry)

	id, err := upsertApp(home, App{Name: "My App", Command: "new-cmd"})
	if err != nil {
		t.Fatal(err)
	}
	if id != "my-app" {
		t.Fatalf("expected existing slug reuse, got %q", id)
	}
	data, _ := os.ReadFile(filepath.Join(home, ".config", "autostart", "my-app.desktop"))
	if !strings.Contains(string(data), "Hidden=true") {
		t.Errorf("update must preserve hidden flag, got:\n%s", data)
	}
	if !strings.Contains(string(data), "Exec=new-cmd") {
		t.Errorf("update must replace command, got:\n%s", data)
	}
}

func TestUpsertValidation(t *testing.T) {
	home := t.TempDir()
	if _, err := upsertApp(home, App{Name: "", Command: "x"}); err == nil {
		t.Error("missing name must fail")
	}
	if _, err := upsertApp(home, App{Name: "X", Command: " "}); err == nil {
		t.Error("missing command must fail")
	}
}

func TestSetEnabledAndDelete(t *testing.T) {
	home := t.TempDir()
	writeStub(t, home, "app.desktop",
		strings.Replace(sampleEntry, "Hidden=true", "Hidden=false", 1))

	if err := setEnabled(home, "app", false); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(filepath.Join(home, ".config", "autostart", "app.desktop"))
	if !strings.Contains(string(data), "Hidden=true") {
		t.Errorf("disable must hide entry, got:\n%s", data)
	}

	if err := deleteApp(home, "app"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(home, ".config", "autostart", "app.desktop")); !os.IsNotExist(err) {
		t.Error("entry file should be gone")
	}

	if err := setEnabled(home, "../escape", true); err == nil {
		t.Error("path separators in id must be rejected")
	}
}

func TestListAppsEmptyHome(t *testing.T) {
	apps := listApps(t.TempDir())
	if len(apps) != 0 {
		t.Errorf("expected empty list on bare home, got %+v", apps)
	}
}
