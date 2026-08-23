package system

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	qsIconThemePragmaRe = regexp.MustCompile(`(?m)^[ \t]*//@[ \t]*pragma[ \t]+IconTheme[ \t]+\S+.*$`)
	qsAnyPragmaRe       = regexp.MustCompile(`(?m)^[ \t]*//@[ \t]*pragma[ \t]+.*$`)
	qsFirstImportRe     = regexp.MustCompile(`(?m)^import[ \t]`)
)

// ShellConfigPath resolves the quickshell root QML file.
// os.UserConfigDir already honors XDG_CONFIG_HOME over $HOME/.config.
func ShellConfigPath() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "quickshell", "shell.qml"), nil
}

// SetQuickshellIconTheme patches the //@ pragma IconTheme line in the
// quickshell shell.qml root file. quickshell watches its config and reloads
// the whole shell when it changes, which re-resolves tray/dock icons under
// the new theme.
func SetQuickshellIconTheme(theme string) error {
	if theme == "" {
		return fmt.Errorf("icon theme must not be empty")
	}
	path, err := ShellConfigPath()
	if err != nil {
		return fmt.Errorf("failed to resolve quickshell config: %w", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read %s: %w", path, err)
	}

	content := patchIconThemePragma(string(data), theme)

	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w", path, err)
	}
	return nil
}

func patchIconThemePragma(content, theme string) string {
	line := "//@ pragma IconTheme " + theme

	if qsIconThemePragmaRe.MatchString(content) {
		return qsIconThemePragmaRe.ReplaceAllString(content, line)
	}

	// Insert directly under the last existing pragma so it stays in the
	// leading pragma block quickshell parses.
	pragmaLocs := qsAnyPragmaRe.FindAllStringIndex(content, -1)
	if len(pragmaLocs) > 0 {
		last := pragmaLocs[len(pragmaLocs)-1]
		return content[:last[1]] + "\n" + line + content[last[1]:]
	}

	loc := qsFirstImportRe.FindStringIndex(content)
	if loc != nil {
		return content[:loc[0]] + line + "\n" + content[loc[0]:]
	}
	if content != "" && !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	return content + line + "\n"
}
