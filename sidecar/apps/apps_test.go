package apps

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeDesktop creates a .desktop file inside dir with the given content.
func writeDesktop(t *testing.T, dir, name, content string) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

// newDataRoot builds a fake XDG data root containing an applications dir
// and registers it as the sole XDG_DATA_DIRS entry so scans stay hermetic.
func newDataRoot(t *testing.T) string {
	t.Helper()
	root := filepath.Join(t.TempDir(), "share")
	t.Setenv("XDG_DATA_DIRS", root)
	return filepath.Join(root, "applications")
}

const validEntry = `[Desktop Entry]
Type=Application
Name=Test Browser
Exec=test-browser %u
Icon=test-browser
Comment=A browser for tests
MimeType=text/html;image/png;
`

func TestScanAppsDedupeUserWins(t *testing.T) {
	home := t.TempDir()
	userApps := filepath.Join(home, ".local", "share", "applications")
	systemApps := newDataRoot(t)

	writeDesktop(t, userApps, "app.desktop",
		"[Desktop Entry]\nName=User Version\nExec=user-app\n")
	writeDesktop(t, systemApps, "app.desktop",
		"[Desktop Entry]\nName=System Version\nExec=system-app\n")
	writeDesktop(t, systemApps, "other.desktop",
		validEntry)

	t.Setenv("XDG_DATA_HOME", "")

	apps := scanApps(home)
	if len(apps) != 2 {
		t.Fatalf("expected 2 apps, got %d: %+v", len(apps), apps)
	}
	byID := map[string]DesktopApp{}
	for _, app := range apps {
		byID[app.ID] = app
	}
	if byID["app"].Name != "User Version" {
		t.Errorf("user entry should win for app.desktop, got %+v", byID["app"])
	}
	if byID["other"].Exec != "test-browser" {
		t.Errorf("field codes should be stripped, got %q", byID["other"].Exec)
	}
	if len(byID["other"].MimeTypes) != 2 {
		t.Errorf("mime list should be parsed, got %+v", byID["other"].MimeTypes)
	}
}

func TestScanAppsSkipsHiddenAndNoDisplay(t *testing.T) {
	home := t.TempDir()
	userApps := filepath.Join(home, ".local", "share", "applications")

	writeDesktop(t, userApps, "hidden.desktop",
		"[Desktop Entry]\nType=Application\nName=Hidden\nExec=hidden-app\nNoDisplay=true\n")
	writeDesktop(t, userApps, "gone.desktop",
		"[Desktop Entry]\nType=Application\nName=Gone\nExec=gone-app\nHidden=true\n")
	writeDesktop(t, userApps, "noexec.desktop",
		"[Desktop Entry]\nType=Application\nName=No Exec\n")

	t.Setenv("XDG_DATA_HOME", "")
	if err := os.MkdirAll(newDataRoot(t), 0o755); err != nil {
		t.Fatal(err)
	}

	if apps := scanApps(home); len(apps) != 0 {
		t.Errorf("hidden/nodisplay/exec-less entries must be skipped, got %+v", apps)
	}
}

func TestStripFieldCodes(t *testing.T) {
	cases := map[string]string{
		"foo %u":        "foo",
		"foo --open %F": "foo --open",
		"env A=1 bar":   "env A=1 bar",
		"foo %%":        "foo %%", // literal percent is not a field code
		"":              "",
	}
	for in, want := range cases {
		if got := stripFieldCodes(in); got != want {
			t.Errorf("stripFieldCodes(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestParseDesktopEntryIgnoresOtherSections(t *testing.T) {
	content := "[Desktop Action new-window]\nName=Should Not Win\nExec=nope\n\n[Desktop Entry]\nName=Real\nExec=real-app\n"
	app, ok := parseDesktopEntry("x", content)
	if !ok || app.Name != "Real" || app.Exec != "real-app" {
		t.Errorf("section parsing wrong: ok=%v app=%+v", ok, app)
	}
}

func TestBuildGroupStatesCandidatesAndCurrentOverride(t *testing.T) {
	home := t.TempDir()
	userApps := filepath.Join(home, ".local", "share", "applications")
	writeDesktop(t, userApps, "browser-a.desktop",
		strings.Replace(validEntry, "Test Browser", "Browser A", 1))
	writeDesktop(t, userApps, "browser-b.desktop",
		"[Desktop Entry]\nName=Browser B\nExec=browser-b\nMimeType=text/html;\n")
	writeDesktop(t, userApps, "editor.desktop",
		"[Desktop Entry]\nName=Editor\nExec=ed\nMimeType=text/plain;\n")

	t.Setenv("XDG_DATA_HOME", "")
	if err := os.MkdirAll(newDataRoot(t), 0o755); err != nil {
		t.Fatal(err)
	}

	origQuery := queryDefault
	defer func() { queryDefault = origQuery }()

	queryDefault = func(mime string) string {
		if mime == "text/html" {
			return "browser-b.desktop"
		}
		return ""
	}

	states := buildGroupStates(home)
	byGroup := map[string]groupState{}
	for _, state := range states {
		byGroup[state.Group.ID] = state
	}

	browser := byGroup["browser"]
	if browser.Current != "browser-b.desktop" {
		t.Errorf("current default mismatch: %q", browser.Current)
	}
	if len(browser.Candidates) != 2 {
		t.Fatalf("expected 2 browser candidates, got %+v", browser.Candidates)
	}
	if browser.Candidates[0].ID != "browser-b" {
		t.Errorf("active default should be promoted first, got %+v", browser.Candidates[0])
	}

	editor := byGroup["editor"]
	if editor.Current != "" {
		t.Errorf("unset mime should have empty current, got %q", editor.Current)
	}
	if len(editor.Candidates) != 1 || editor.Candidates[0].ID != "editor" {
		t.Errorf("editor candidates wrong: %+v", editor.Candidates)
	}
}

func TestSetDefaultRejectsBadIDs(t *testing.T) {
	for _, id := range []string{"", "evil; rm -rf", "no-extension"} {
		if err := setDefault(id, []string{"text/html"}); err == nil {
			t.Errorf("setDefault(%q) should fail", id)
		}
	}
}
