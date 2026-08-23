package system

import (
	"bufio"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"niri-settings-sidecar/protocol"
)

// reservedThemeIDs are fallback/infrastructure directories that must never be
// offered as user-selectable themes.
var reservedThemeIDs = map[string]bool{
	"hicolor": true,
	"default": true,
	"locolor": true,
}

// DesktopTheme is one selectable entry in the Icons page.
type DesktopTheme struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// DesktopThemes lists installed icon and cursor themes.
type DesktopThemes struct {
	IconThemes   []DesktopTheme `json:"icon_themes"`
	CursorThemes []DesktopTheme `json:"cursor_themes"`
}

// themeDataDirs returns the XDG data dirs that may contain an icons/ subtree,
// most specific first: $XDG_DATA_HOME/icons then every $XDG_DATA_DIRS/icons.
func themeDataDirs() []string {
	var dirs []string
	if xdg := os.Getenv("XDG_DATA_HOME"); xdg != "" {
		dirs = append(dirs, filepath.Join(xdg, "icons"))
	} else if home, err := os.UserHomeDir(); err == nil {
		dirs = append(dirs, filepath.Join(home, ".local", "share", "icons"))
	}
	for _, d := range filepath.SplitList(os.Getenv("XDG_DATA_DIRS")) {
		if d != "" {
			dirs = append(dirs, filepath.Join(d, "icons"))
		}
	}
	if len(dirs) == 1 {
		// XDG default when XDG_DATA_DIRS is unset.
		dirs = append(dirs, "/usr/local/share/icons", "/usr/share/icons")
	}
	return dirs
}

// readThemeLabel extracts the first Name= line from a theme's index.theme.
func readThemeLabel(indexPath, fallback string) string {
	f, err := os.Open(indexPath)
	if err != nil {
		return fallback
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "Name=") && len(line) > 5 {
			return strings.TrimSpace(line[5:])
		}
	}
	return fallback
}

// ListDesktopThemes scans the XDG icon directories. Icon themes are
// directories containing index.theme; cursor themes are directories with a
// non-empty cursors/ subdirectory.
func ListDesktopThemes() DesktopThemes {
	seen := map[string]bool{}
	result := DesktopThemes{IconThemes: []DesktopTheme{}, CursorThemes: []DesktopTheme{}}

	for _, root := range themeDataDirs() {
		entries, err := os.ReadDir(root)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if !e.IsDir() || seen[e.Name()] || reservedThemeIDs[e.Name()] {
				continue
			}
			dir := filepath.Join(root, e.Name())
			seen[e.Name()] = true

			hasIndex := false
			hasCursors := false
			if subs, err := os.ReadDir(dir); err == nil {
				for _, s := range subs {
					switch strings.ToLower(s.Name()) {
					case "index.theme":
						hasIndex = true
					case "cursors":
						if files, err := os.ReadDir(filepath.Join(dir, "cursors")); err == nil && len(files) > 0 {
							hasCursors = true
						}
					}
				}
			}

			label := e.Name()
			if hasIndex {
				label = readThemeLabel(filepath.Join(dir, "index.theme"), label)
			}
			switch {
			case hasCursors:
				result.CursorThemes = append(result.CursorThemes, DesktopTheme{ID: e.Name(), Label: label})
			case hasIndex:
				result.IconThemes = append(result.IconThemes, DesktopTheme{ID: e.Name(), Label: label})
			}
		}
	}

	sort.Slice(result.IconThemes, func(i, j int) bool { return result.IconThemes[i].Label < result.IconThemes[j].Label })
	sort.Slice(result.CursorThemes, func(i, j int) bool { return result.CursorThemes[i].Label < result.CursorThemes[j].Label })
	return result
}

// HandleListDesktopThemes responds with installed desktop themes.
func HandleListDesktopThemes(_ map[string]any) {
	protocol.WriteResponse(ListDesktopThemes())
}
