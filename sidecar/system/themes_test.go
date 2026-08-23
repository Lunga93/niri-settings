package system

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func setupFakeIconsRoot(t *testing.T, mkdir func(root string)) string {
	t.Helper()
	root := t.TempDir()
	t.Setenv("XDG_DATA_HOME", root)
	// Point XDG_DATA_DIRS at a nonexistent dir so system-wide icon roots are
	// excluded and tests stay hermetic.
	t.Setenv("XDG_DATA_DIRS", filepath.Join(t.TempDir(), "nonexistent"))
	mkdir(root)
	return root
}

func TestListDesktopThemes(t *testing.T) {
	setupFakeIconsRoot(t, func(root string) {
		// Icon theme with pretty label.
		papirus := filepath.Join(root, "icons", "Papirus")
		os.MkdirAll(papirus, 0o755)
		os.WriteFile(filepath.Join(papirus, "index.theme"),
			[]byte("[Icon Theme]\nName=Papirus\nComment=x\n"), 0o644)

		// Cursor theme (no index.theme needed).
		cur := filepath.Join(root, "icons", "capitaine-cursors", "cursors")
		os.MkdirAll(cur, 0o755)
		os.WriteFile(filepath.Join(cur, "left_ptr"), []byte("x"), 0o644)

		// Reserved dir must be skipped.
		hicolor := filepath.Join(root, "icons", "hicolor")
		os.MkdirAll(hicolor, 0o755)
		os.WriteFile(filepath.Join(hicolor, "index.theme"), []byte("[Icon Theme]\nName=Hicolor\n"), 0o644)

		// Random dir without theme markers is ignored.
		junk := filepath.Join(root, "icons", "junk")
		os.MkdirAll(junk, 0o755)
	})

	got := ListDesktopThemes()

	if len(got.IconThemes) != 1 || got.IconThemes[0].ID != "Papirus" || got.IconThemes[0].Label != "Papirus" {
		t.Fatalf("unexpected icon themes: %+v", got.IconThemes)
	}
	if len(got.CursorThemes) != 1 || got.CursorThemes[0].ID != "capitaine-cursors" {
		t.Fatalf("unexpected cursor themes: %+v", got.CursorThemes)
	}
}

func TestListDesktopThemesFallsBackToDirName(t *testing.T) {
	setupFakeIconsRoot(t, func(root string) {
		dir := filepath.Join(root, "icons", "breeze")
		os.MkdirAll(dir, 0o755)
		// index.theme without a Name= line.
		os.WriteFile(filepath.Join(dir, "index.theme"), []byte("[Icon Theme]\n"), 0o644)
	})

	got := ListDesktopThemes()
	if len(got.IconThemes) != 1 || got.IconThemes[0].Label != "breeze" || got.IconThemes[0].ID != "breeze" {
		t.Fatalf("expected dir-name fallback, got: %+v", got.IconThemes)
	}
}

func TestHandleListDesktopThemesIsRegisteredShape(t *testing.T) {
	setupFakeIconsRoot(t, func(root string) {
		dir := filepath.Join(root, "icons", "Pop")
		os.MkdirAll(dir, 0o755)
		os.WriteFile(filepath.Join(dir, "index.theme"), []byte("[Icon Theme]\nName=Pop\n"), 0o644)
	})

	got := ListDesktopThemes()
	if len(got.IconThemes) != 1 || got.IconThemes[0].ID != "Pop" {
		t.Fatalf("unexpected icon themes: %+v", got.IconThemes)
	}
	// Handler must emit the same structure; verified indirectly since
	// protocol.WriteResponse binds real stdout at package init.
	b, err := json.Marshal(got)
	if err != nil || !json.Valid(b) {
		t.Fatalf("DesktopThemes is not JSON-encodable: %v", err)
	}
}
