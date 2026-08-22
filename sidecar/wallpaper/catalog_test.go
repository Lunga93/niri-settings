package wallpaper

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestGetWallpaperDataSkipsDeadCacheEntries(t *testing.T) {
	home := t.TempDir()
	wallpapersDir := filepath.Join(home, "Pictures", "wallpapers")
	cacheDir := filepath.Join(home, ".cache", "dotfiles")
	for _, dir := range []string{wallpapersDir, cacheDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	live := filepath.Join(wallpapersDir, "live.jpg")
	untagged := filepath.Join(wallpapersDir, "untagged.png")
	for _, p := range []string{live, untagged} {
		if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	dead := filepath.Join(wallpapersDir, "deleted.jpg")

	cache := moodsCacheFile{
		Version: 1,
		Tags: map[string]tagEntry{
			live: {Moods: []string{"dark", "sky"}},
			dead: {Moods: []string{"warm"}},
		},
	}
	data, err := json.Marshal(cache)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(cacheDir, "wallpaper-moods.json"), data, 0o644); err != nil {
		t.Fatal(err)
	}

	result := Build(home)
	wallpapers, moodCounts, byMood, total := result.Items, result.MoodCount, result.ByMood, result.Total

	const wantTotal = 2
	if total != wantTotal {
		t.Errorf("total = %d, want %d", total, wantTotal)
	}

	seen := make(map[string]bool, len(wallpapers))
	for _, w := range wallpapers {
		if seen[w.Path] {
			t.Errorf("duplicate catalog entry for %s", w.Path)
		}
		seen[w.Path] = true
	}
	if seen[dead] {
		t.Errorf("deleted wallpaper leaked into catalog: %s", dead)
	}
	if !seen[live] || !seen[untagged] {
		t.Errorf("missing live wallpapers; got %v", wallpapers)
	}

	if moodCounts["dark"] != 1 || moodCounts["sky"] != 1 {
		t.Errorf("moodCounts dark/sky = %d/%d, want 1/1", moodCounts["dark"], moodCounts["sky"])
	}
	if moodCounts["warm"] != 0 {
		t.Errorf("moodCounts warm = %d, want 0 (only source was a dead entry)", moodCounts["warm"])
	}
	if len(byMood["dark"]) != 1 || len(byMood["warm"]) != 0 {
		t.Errorf("wallpapers_by_mood dark/warm = %d/%d, want 1/0", len(byMood["dark"]), len(byMood["warm"]))
	}
}
