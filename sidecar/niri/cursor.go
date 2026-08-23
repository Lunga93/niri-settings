package niri

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"niri-settings-sidecar/config"
)

var (
	cursorThemeLineRe  = regexp.MustCompile(`^\s*xcursor-theme\s+"[^"]*".*$`)
	cursorSizeLineRe   = regexp.MustCompile(`^\s*xcursor-size\s+\d+.*$`)
	cursorBlockStartRe = regexp.MustCompile(`^cursor(\s|\{)`)
)

// SetCursor patches the top-level `cursor { ... }` block of the niri config
// with the given xcursor theme and size, creating the block when missing, and
// additionally writes an environment.d file so apps launched in future
// sessions inherit XCURSOR_THEME/XCURSOR_SIZE. Callers should ReloadConfig()
// afterwards to apply the change live.
func SetCursor(theme string, size int) error {
	if theme == "" {
		return fmt.Errorf("cursor theme must not be empty")
	}
	if size <= 0 {
		return fmt.Errorf("cursor size must be positive")
	}

	paths := config.Resolve()
	data, err := os.ReadFile(paths.ConfigFile)
	if err != nil {
		return fmt.Errorf("failed to read niri config: %w", err)
	}

	content := patchCursorBlock(string(data), theme, size)

	if err := config.BackupConfig(paths.ConfigFile); err != nil {
		fmt.Printf("Warning: failed to backup config: %v\n", err)
	}
	if err := config.WriteConfig(paths.ConfigFile, content); err != nil {
		return fmt.Errorf("failed to write niri config: %w", err)
	}
	return writeCursorEnvFile(theme, size)
}

// patchCursorBlock rewrites xcursor-theme/xcursor-size inside the first
// top-level cursor block, or appends a new block when none exists.
func patchCursorBlock(content, theme string, size int) string {
	lines := strings.Split(content, "\n")

	start := -1
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") {
			continue
		}
		if cursorBlockStartRe.MatchString(line) {
			start = i
			break
		}
	}

	themeValue := fmt.Sprintf("xcursor-theme \"%s\"", theme)
	sizeValue := fmt.Sprintf("xcursor-size %d", size)

	if start < 0 {
		block := []string{"", "cursor {", "    " + themeValue, "    " + sizeValue, "}"}
		if content != "" && !strings.HasSuffix(content, "\n") {
			content += "\n"
		}
		return content + strings.Join(block, "\n") + "\n"
	}

	end := findBlockEnd(lines, start)
	out := make([]string, 0, len(lines)+2)
	out = append(out, lines[:start+1]...)

	replacedTheme := false
	replacedSize := false

	for _, line := range lines[start+1 : end] {
		switch {
		case !replacedTheme && cursorThemeLineRe.MatchString(line):
			out = append(out, leadingWhitespace(line)+themeValue)
			replacedTheme = true
		case !replacedSize && cursorSizeLineRe.MatchString(line):
			out = append(out, leadingWhitespace(line)+sizeValue)
			replacedSize = true
		default:
			out = append(out, line)
		}
	}

	if !replacedTheme || !replacedSize {
		insertIndent := "    "
		for _, line := range lines[start+1 : end] {
			if strings.TrimSpace(line) != "" {
				insertIndent = leadingWhitespace(line)
				break
			}
		}
		var missing []string
		if !replacedTheme {
			missing = append(missing, insertIndent+themeValue)
		}
		if !replacedSize {
			missing = append(missing, insertIndent+sizeValue)
		}
		at := len(out)
		out = append(out[:at], append(missing, out[at:]...)...)
	}

	out = append(out, lines[end:]...)
	return strings.Join(out, "\n")
}

// findBlockEnd returns the index of the line that closes the block opened at
// start, accounting for nested braces.
func findBlockEnd(lines []string, start int) int {
	depth := 0
	for i := start; i < len(lines); i++ {
		for _, ch := range lines[i] {
			switch ch {
			case '{':
				depth++
			case '}':
				depth--
			}
		}
		if depth <= 0 {
			return i
		}
	}
	return len(lines) - 1
}

func leadingWhitespace(line string) string {
	trimmed := strings.TrimLeft(line, " \t")
	return line[:len(line)-len(trimmed)]
}

// writeCursorEnvFile persists XCURSOR_THEME/XCURSOR_SIZE for future sessions.
func writeCursorEnvFile(theme string, size int) error {
	xdgConfig, err := os.UserConfigDir()
	if err != nil {
		return nil
	}
	dir := filepath.Join(xdgConfig, "environment.d")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create environment.d: %w", err)
	}
	content := fmt.Sprintf("XCURSOR_THEME=%s\nXCURSOR_SIZE=%d\n", theme, size)
	envPath := filepath.Join(dir, "50-niri-cursor.conf")
	if err := os.WriteFile(envPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w", envPath, err)
	}
	return nil
}
