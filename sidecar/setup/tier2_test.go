package setup

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectTierLevels(t *testing.T) {
	home := t.TempDir()

	status := detectTier(home)
	if status.Tier != 0 {
		t.Errorf("bare home should be tier 0, got %d", status.Tier)
	}

	dotfiles := dotfilesHome(home)
	if err := os.MkdirAll(dotfiles, 0o755); err != nil {
		t.Fatal(err)
	}
	status = detectTier(home)
	if status.Tier != 1 || !status.DotfilesPresent {
		t.Errorf("checkout only should be tier 1, got %d", status.Tier)
	}

	configDir := filepath.Join(home, ".config")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	for i, dir := range stowDirs {
		real := filepath.Join(dotfiles, dir)
		if err := os.MkdirAll(real, 0o755); err != nil {
			t.Fatal(err)
		}
		linkPath := filepath.Join(configDir, dir)
		if i%2 == 0 {
			// stow creates relative links; exercise that path too
			if err := os.Symlink(filepath.Join("..", DotfilesDirName, dir), linkPath); err != nil {
				t.Fatal(err)
			}
		} else if err := os.Symlink(real, linkPath); err != nil {
			t.Fatal(err)
		}
	}
	status = detectTier(home)
	if status.Tier != 2 {
		t.Errorf("fully stowed should be tier 2, got %d (stowed=%d)", status.Tier, len(status.Stowed))
	}
}

func TestAdoptFailsFastWithoutTerminal(t *testing.T) {
	orig := lookupTerminal
	defer func() { lookupTerminal = orig }()
	lookupTerminal = func() *terminalSpec { return nil }

	result, err := adoptTier2(t.TempDir(), false)
	if err == nil || result != nil {
		t.Fatal("adoption without a terminal must fail before touching anything")
	}
}

func TestBackupAndRestoreRoundTrip(t *testing.T) {
	home := t.TempDir()
	configDir := filepath.Join(home, ".config", "niri")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(configDir, "config.kdl"), []byte("my precious config"), 0o644); err != nil {
		t.Fatal(err)
	}
	settingsPath := filepath.Join(home, ".config", "dotfiles", "settings.json")
	if err := os.MkdirAll(filepath.Dir(settingsPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(settingsPath, []byte(`{"display":{}}`), 0o644); err != nil {
		t.Fatal(err)
	}
	missingPath := filepath.Join(home, ".config", "wofi")

	id, entries, err := backupTargets(home)
	if err != nil {
		t.Fatal(err)
	}
	kinds := map[string]string{}
	for _, e := range entries {
		kinds[e.Path] = e.Kind
	}
	if kinds[configDir] != "dir" || kinds[settingsPath] != "file" || kinds[missingPath] != "missing" {
		t.Fatalf("unexpected kinds: %+v", kinds)
	}
	if _, err := os.Stat(filepath.Join(home, ".local", "share", "niri-settings", "backups", id, manifestName)); err != nil {
		t.Fatal("manifest missing")
	}

	simulateInstall(t, home)

	restored, err := restoreBackup(home, id)
	if err != nil {
		t.Fatal(err)
	}
	if restored < 3 {
		t.Errorf("expected at least 3 restorations, got %d", restored)
	}
	got, err := os.ReadFile(filepath.Join(configDir, "config.kdl"))
	if err != nil || string(got) != "my precious config" {
		t.Errorf("config.kdl not restored: %v %q", err, string(got))
	}
	if link, err := os.Readlink(filepath.Join(configDir, "niri")); err == nil {
		t.Errorf("symlink should be replaced by real config, still links to %s", link)
	}
}

// simulateInstall mimics what stow does: replaces real dirs with symlinks
// into a fake checkout and rewrites captured files.
func simulateInstall(t *testing.T, home string) {
	t.Helper()
	dotfiles := dotfilesHome(home)
	configDir := filepath.Join(home, ".config")

	if err := os.RemoveAll(configDir); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	for _, dir := range stowDirs {
		real := filepath.Join(dotfiles, dir)
		if err := os.MkdirAll(real, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.Symlink(real, filepath.Join(configDir, dir)); err != nil {
			t.Fatal(err)
		}
	}
	settingsPath := filepath.Join(home, ".config", "dotfiles", "settings.json")
	if err := os.MkdirAll(filepath.Dir(settingsPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(settingsPath, []byte(`{"stowed":true}`), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestListBackupsReportsManifestsOnly(t *testing.T) {
	home := t.TempDir()
	if backups, err := listBackups(home); err != nil || len(backups) != 0 {
		t.Fatalf("no backups expected, got %v %v", backups, err)
	}

	id, _, err := backupTargets(home)
	if err != nil {
		t.Fatal(err)
	}
	backups, err := listBackups(home)
	if err != nil || len(backups) != 1 || backups[0].ID != id {
		t.Fatalf("expected one backup %q, got %+v %v", id, backups, err)
	}

	junk := filepath.Join(home, ".local", "share", "niri-settings", "backups", "not-a-backup")
	if err := os.MkdirAll(junk, 0o755); err != nil {
		t.Fatal(err)
	}
	if backups, err := listBackups(home); err != nil || len(backups) != 1 {
		t.Fatalf("dirs without manifests must be ignored, got %+v %v", backups, err)
	}
}

func TestDetectTierViaStowSymlinks(t *testing.T) {
	home := t.TempDir()
	dotfiles := dotfilesHome(home)

	// Create the stow checkout structure: dotfiles/<pkg>/.config/<pkg>/
	configDir := filepath.Join(home, ".config")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}

	stowedCount := 0
	for _, dir := range stowDirs {
		pkgDir := filepath.Join(dotfiles, dir, ".config", dir)
		if err := os.MkdirAll(pkgDir, 0o755); err != nil {
			t.Fatal(err)
		}
		// Create the symlink in ~/.config/ pointing into the dotfiles checkout.
		link := filepath.Join(configDir, dir)
		target := filepath.Join("..", DotfilesDirName, dir, ".config", dir)
		if err := os.Symlink(target, link); err != nil {
			t.Fatal(err)
		}
		stowedCount++
	}

	status := detectTier(home)
	if status.Tier != 2 {
		t.Errorf("stowed layout should be tier 2, got %d (stowed=%d)", status.Tier, len(status.Stowed))
	}
	if len(status.Stowed) != stowedCount {
		t.Errorf("expected %d stowed dirs, got %d", stowedCount, len(status.Stowed))
	}
}

func TestRestoreRejectsBadIDs(t *testing.T) {
	home := t.TempDir()
	for _, id := range []string{"../escape", "a/b", ".", ".."} {
		if _, err := restoreBackup(home, id); err == nil {
			t.Errorf("restoreBackup(%q) must fail", id)
		}
	}
}
