// Package wallpaper owns the wallpaper library: mood-cache reading, catalog
// construction, thumbnails, and the commands the frontend calls.
package wallpaper

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"niri-settings-sidecar/protocol"
	"niri-settings-sidecar/system"
)

// Item is one wallpaper in the catalog.
type Item struct {
	Path      string   `json:"path"`
	Filename  string   `json:"filename"`
	Name      string   `json:"name"`
	Moods     []string `json:"moods"`
	FileSize  int64    `json:"file_size"`
	MTime     float64  `json:"mtime"`
	Thumbnail string   `json:"thumbnail"`
}

type moodStats struct {
	LAvg float64 `json:"L_avg"`
	CAvg float64 `json:"C_avg"`
	HDom float64 `json:"h_dom"`
}

type tagEntry struct {
	MTime float64   `json:"mtime"`
	Moods []string  `json:"moods"`
	Stats moodStats `json:"stats"`
}

type moodsCacheFile struct {
	Version int                 `json:"version"`
	Tags    map[string]tagEntry `json:"tags"`
}

// Catalog is the full wallpaper library state sent to the frontend.
type Catalog struct {
	Items     []Item              `json:"-"`
	MoodCount map[string]int      `json:"-"`
	ByMood    map[string][]string `json:"-"`
	Total     int                 `json:"-"`
}

var knownMoods = []string{"dark", "light", "warm", "cool", "sky", "earth"}

// Build scans the mood cache and ~/Pictures/wallpapers and merges both
// sources. Cache entries whose file no longer exists are skipped so deleted
// wallpapers never inflate counts or leak ghost cards into the grid.
func Build(home string) Catalog {
	moodCount := make(map[string]int, len(knownMoods))
	byMood := make(map[string][]string, len(knownMoods))
	for _, m := range knownMoods {
		moodCount[m] = 0
		byMood[m] = []string{}
	}
	items := make(map[string]Item)

	cachePath := filepath.Join(home, ".cache", "dotfiles", "wallpaper-moods.json")
	if cacheData, err := os.ReadFile(cachePath); err == nil {
		var cache moodsCacheFile
		if err := json.Unmarshal(cacheData, &cache); err == nil {
			for path, entry := range cache.Tags {
				resolvedPath := system.ExpandPath(path)
				fi, statErr := os.Stat(resolvedPath)
				if statErr != nil || fi.IsDir() {
					continue
				}
				var moods []string
				for _, m := range entry.Moods {
					mLower := strings.ToLower(m)
					moods = append(moods, mLower)
					if _, ok := moodCount[mLower]; ok {
						moodCount[mLower]++
						byMood[mLower] = append(byMood[mLower], resolvedPath)
					}
				}
				if moods == nil {
					moods = []string{}
				}
				filename := filepath.Base(resolvedPath)
				ext := filepath.Ext(filename)
				items[resolvedPath] = Item{
					Path:      resolvedPath,
					Filename:  filename,
					Name:      strings.TrimSuffix(filename, ext),
					Moods:     moods,
					FileSize:  fi.Size(),
					MTime:     float64(fi.ModTime().Unix()),
					Thumbnail: ThumbnailPathFor(home, resolvedPath),
				}
			}
		}
	}

	wallpapersDir := filepath.Join(home, "Pictures", "wallpapers")
	if entries, err := os.ReadDir(wallpapersDir); err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			ext := strings.ToLower(filepath.Ext(entry.Name()))
			switch ext {
			case ".jpg", ".jpeg", ".png", ".webp":
			default:
				continue
			}
			fullPath := filepath.Join(wallpapersDir, entry.Name())
			if _, exists := items[fullPath]; exists {
				continue
			}
			var fileSize int64
			var mtime float64
			if fi, err := entry.Info(); err == nil {
				fileSize = fi.Size()
				mtime = float64(fi.ModTime().Unix())
			}
			items[fullPath] = Item{
				Path:      fullPath,
				Filename:  entry.Name(),
				Name:      strings.TrimSuffix(entry.Name(), ext),
				Moods:     []string{},
				FileSize:  fileSize,
				MTime:     mtime,
				Thumbnail: ThumbnailPathFor(home, fullPath),
			}
		}
	}

	catalog := Catalog{
		Items:     make([]Item, 0, len(items)),
		MoodCount: moodCount,
		ByMood:    byMood,
	}
	for _, item := range items {
		catalog.Items = append(catalog.Items, item)
	}
	sort.Slice(catalog.Items, func(i, j int) bool {
		return strings.ToLower(catalog.Items[i].Filename) < strings.ToLower(catalog.Items[j].Filename)
	})
	catalog.Total = len(catalog.Items)
	return catalog
}

// CurrentWallpaper resolves the active wallpaper path from the
// current_wallpaper marker file with a daily.jpg fallback.
func CurrentWallpaper(home string) string {
	currentPath := ""
	currentFile := filepath.Join(home, ".config", "current_wallpaper")
	if data, err := os.ReadFile(currentFile); err == nil {
		currentPath = strings.TrimSpace(string(data))
	}
	if currentPath == "" {
		fallback := filepath.Join(home, "Pictures", "wallpapers", "daily.jpg")
		if _, err := os.Stat(fallback); err == nil {
			currentPath = fallback
		}
	}
	if currentPath != "" {
		currentPath = system.ExpandPath(currentPath)
	}
	return currentPath
}

// SkipToday reports whether rotation is skipped for today.
func SkipToday(home string) bool {
	skipFile := filepath.Join(home, ".local", "share", "dotfiles", "skip_today")
	data, err := os.ReadFile(skipFile)
	if err != nil {
		return false
	}
	todayStr := time.Now().Format("2006-01-02")
	return strings.TrimSpace(string(data)) == todayStr
}

// HandleGetInfo answers get_wallpaper_info.
func HandleGetInfo(_ map[string]any) {
	home := protocol.HomeDir("USER_DIR_ERROR")
	if home == "" {
		return
	}

	catalog := Build(home)
	protocol.WriteResponse(map[string]any{
		"current_wallpaper":  CurrentWallpaper(home),
		"total_scanned":      catalog.Total,
		"mood_counts":        catalog.MoodCount,
		"wallpapers_by_mood": catalog.ByMood,
		"wallpapers":         catalog.Items,
		"skip_today":         SkipToday(home),
	})
}

// HandleList answers list_wallpapers.
func HandleList(_ map[string]any) {
	home := protocol.HomeDir("USER_DIR_ERROR")
	if home == "" {
		return
	}
	catalog := Build(home)
	protocol.WriteResponse(map[string]any{
		"wallpapers": catalog.Items,
		"total":      catalog.Total,
	})
}

// HandleSet applies a wallpaper by absolute or ~-relative path.
func HandleSet(args map[string]any) {
	path, ok := protocol.GetStringArg(args, "path")
	if !ok || strings.TrimSpace(path) == "" {
		protocol.InvalidArgs("Missing or empty 'path' argument")
		return
	}
	resolvedPath := system.ExpandPath(strings.TrimSpace(path))
	if _, err := os.Stat(resolvedPath); err != nil {
		protocol.WriteError("FILE_NOT_FOUND", fmt.Sprintf("Wallpaper file not found: %s", resolvedPath), nil)
		return
	}

	home := protocol.HomeDir("USER_DIR_ERROR")
	if home != "" {
		currentFile := filepath.Join(home, ".config", "current_wallpaper")
		_ = os.WriteFile(currentFile, []byte(resolvedPath), 0o644)
	}

	if err := system.SetWallpaper(resolvedPath); err != nil {
		protocol.WriteError("SET_WALLPAPER_FAILED", fmt.Sprintf("Failed to set wallpaper: %v", err), nil)
		return
	}
	protocol.WriteResponse(map[string]string{
		"status": "ok",
		"path":   resolvedPath,
	})
}
