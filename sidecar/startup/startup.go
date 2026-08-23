// Package startup manages XDG autostart entries (~/.config/autostart/*.desktop)
// for the Startup Applications feature.
package startup

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// App mirrors the fields of a Desktop Entry we care about.
type App struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Command  string `json:"command"`
	Comment  string `json:"comment"`
	Hidden   bool   `json:"hidden"`
	Terminal bool   `json:"terminal"`
	Path     string `json:"path"`
}

func autostartDir(home string) string {
	return filepath.Join(home, ".config", "autostart")
}

// slugify turns an app name into a filesystem-safe desktop-file id.
func slugify(name string) string {
	var b strings.Builder
	lastDash := false
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		case !lastDash && b.Len() > 0:
			b.WriteByte('-')
			lastDash = true
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "app"
	}
	return out
}

// parseDesktop extracts key=value pairs from the [Desktop Entry] section.
func parseDesktop(content string) map[string]string {
	fields := map[string]string{}
	inEntry := false
	for _, raw := range strings.Split(content, "\n") {
		line := strings.TrimSpace(raw)
		switch {
		case line == "" || strings.HasPrefix(line, "#"):
			continue
		case strings.HasPrefix(line, "["):
			inEntry = line == "[Desktop Entry]"
		default:
			if !inEntry {
				continue
			}
			key, val, found := strings.Cut(line, "=")
			if found {
				fields[strings.TrimSpace(key)] = strings.TrimSpace(val)
			}
		}
	}
	return fields
}

// appFromFields builds an App from parsed desktop-entry fields.
func appFromFields(path string, fields map[string]string) App {
	return App{
		ID:       strings.TrimSuffix(filepath.Base(path), ".desktop"),
		Name:     fields["Name"],
		Command:  fields["Exec"],
		Comment:  fields["Comment"],
		Hidden:   fields["Hidden"] == "true",
		Terminal: fields["Terminal"] == "true",
		Path:     path,
	}
}

// serializeDesktop renders canonical desktop-entry content.
func serializeDesktop(app App) string {
	var b strings.Builder
	b.WriteString("[Desktop Entry]\n")
	fmt.Fprintf(&b, "Type=Application\n")
	fmt.Fprintf(&b, "Name=%s\n", app.Name)
	fmt.Fprintf(&b, "Exec=%s\n", app.Command)
	if app.Comment != "" {
		fmt.Fprintf(&b, "Comment=%s\n", app.Comment)
	}
	fmt.Fprintf(&b, "Terminal=%s\n", boolStr(app.Terminal))
	fmt.Fprintf(&b, "Hidden=%s\n", boolStr(app.Hidden))
	fmt.Fprintf(&b, "NoDisplay=%s\n", boolStr(app.Hidden))
	return b.String()
}

func boolStr(v bool) string {
	if v {
		return "true"
	}
	return "false"
}

// listApps reads every *.desktop file in the user autostart dir.
func listApps(home string) []App {
	dir := autostartDir(home)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return []App{}
	}
	apps := []App{}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".desktop") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		app := appFromFields(path, parseDesktop(string(data)))
		if app.Name != "" || app.Command != "" {
			apps = append(apps, app)
		}
	}
	return apps
}

// upsertApp writes (creating or replacing) an autostart desktop file.
func upsertApp(home string, app App) (string, error) {
	if strings.TrimSpace(app.Name) == "" {
		return "", fmt.Errorf("app name is required")
	}
	if strings.TrimSpace(app.Command) == "" {
		return "", fmt.Errorf("app command is required")
	}
	id := slugify(app.Name)

	dir := autostartDir(home)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create %s: %w", dir, err)
	}

	// Preserve Hidden when updating an existing entry by name.
	path := filepath.Join(dir, id+".desktop")
	if data, err := os.ReadFile(path); err == nil {
		existing := appFromFields(path, parseDesktop(string(data)))
		app.Hidden = existing.Hidden
	}
	app.ID = id
	app.Path = path

	if err := os.WriteFile(path, []byte(serializeDesktop(app)), 0o644); err != nil {
		return "", fmt.Errorf("failed to write %s: %w", path, err)
	}
	return id, nil
}

// setEnabled flips the Hidden flag of an existing entry.
func setEnabled(home, id string, enabled bool) error {
	if strings.ContainsRune(id, '/') || id == "" {
		return fmt.Errorf("invalid app id")
	}
	path := filepath.Join(autostartDir(home), id+".desktop")
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("entry not found: %s", id)
	}
	app := appFromFields(path, parseDesktop(string(data)))
	app.Hidden = !enabled
	if err := os.WriteFile(path, []byte(serializeDesktop(app)), 0o644); err != nil {
		return fmt.Errorf("failed to write %s: %w", path, err)
	}
	return nil
}

// deleteApp removes an autostart entry file.
func deleteApp(home, id string) error {
	if strings.ContainsRune(id, '/') || id == "" {
		return fmt.Errorf("invalid app id")
	}
	path := filepath.Join(autostartDir(home), id+".desktop")
	if err := os.Remove(path); err != nil {
		return fmt.Errorf("entry not found: %s", id)
	}
	return nil
}
