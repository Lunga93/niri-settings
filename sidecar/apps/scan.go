// Package apps scans installed applications (XDG desktop entries) and
// manages MIME default associations.
package apps

import (
	"os"
	"path/filepath"
	"strings"
)

// DesktopApp is one installed application from a .desktop file.
type DesktopApp struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Exec      string   `json:"exec"`
	Icon      string   `json:"icon"`
	Comment   string   `json:"comment"`
	MimeTypes []string `json:"mime_types"`
}

// dataDirs lists application-scan roots, user dirs first (they win).
func dataDirs(home string) []string {
	dirs := []string{}

	userData := os.Getenv("XDG_DATA_HOME")
	if userData == "" && home != "" {
		userData = filepath.Join(home, ".local", "share")
	}
	if userData != "" {
		dirs = append(dirs,
			filepath.Join(userData, "flatpak", "exports", "share", "applications"),
			filepath.Join(userData, "applications"),
		)
	}

	dataHomeList := os.Getenv("XDG_DATA_DIRS")
	if dataHomeList == "" {
		dataHomeList = "/usr/local/share:/usr/share"
	}
	for _, d := range filepath.SplitList(dataHomeList) {
		dirs = append(dirs,
			filepath.Join(d, "flatpak", "exports", "share", "applications"),
			filepath.Join(d, "applications"),
		)
	}
	return dirs
}

// stripFieldCodes removes %f/%F/%u/%U/... placeholders from an Exec string,
// keeping %% literals intact.
func stripFieldCodes(exec string) string {
	fields := strings.Fields(exec)
	out := make([]string, 0, len(fields))
	for _, f := range fields {
		if len(f) == 2 && f[0] == '%' && f[1] != '%' {
			continue
		}
		out = append(out, f)
	}
	return strings.TrimSpace(strings.Join(out, " "))
}

// splitMimeList parses a semicolon-delimited MimeType value.
func splitMimeList(raw string) []string {
	parts := strings.Split(raw, ";")
	mimes := make([]string, 0, len(parts))
	for _, p := range parts {
		if p != "" {
			mimes = append(mimes, p)
		}
	}
	return mimes
}

// scanApps walks the data dirs and returns deduplicated desktop entries.
// Earlier directories win; hidden or NoDisplay entries are skipped.
func scanApps(home string) []DesktopApp {
	seen := map[string]bool{}
	var apps []DesktopApp
	for _, dir := range dataDirs(home) {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			name := entry.Name()
			if entry.IsDir() || !strings.HasSuffix(name, ".desktop") || seen[name] {
				continue
			}
			data, err := os.ReadFile(filepath.Join(dir, name))
			if err != nil {
				continue
			}
			app, ok := parseDesktopEntry(strings.TrimSuffix(name, ".desktop"), string(data))
			if !ok {
				continue
			}
			seen[name] = true
			apps = append(apps, app)
		}
	}
	return apps
}

// parseDesktopEntry builds a DesktopApp from desktop-file content. Returns
// false for entries that should not be offered to users.
func parseDesktopEntry(id, content string) (DesktopApp, bool) {
	fields := map[string]string{}
	inEntry := false
	for _, raw := range strings.Split(content, "\n") {
		line := strings.TrimSpace(raw)
		switch {
		case line == "" || strings.HasPrefix(line, "#"):
			continue
		case strings.HasPrefix(line, "["):
			inEntry = line == "[Desktop Entry]"
		case inEntry:
			key, val, found := strings.Cut(line, "=")
			if found {
				fields[strings.TrimSpace(key)] = strings.TrimSpace(val)
			}
		}
	}
	if fields["NoDisplay"] == "true" || fields["Hidden"] == "true" {
		return DesktopApp{}, false
	}
	name := fields["Name"]
	execLine := fields["Exec"]
	if name == "" || execLine == "" {
		return DesktopApp{}, false
	}

	return DesktopApp{
		ID:        id,
		Name:      name,
		Exec:      stripFieldCodes(execLine),
		Icon:      fields["Icon"],
		Comment:   fields["Comment"],
		MimeTypes: splitMimeList(fields["MimeType"]),
	}, true
}
