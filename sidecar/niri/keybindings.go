package niri

import (
	"fmt"
	"os"
	"strings"

	"niri-settings-sidecar/config"
)

// Keybinding represents a single niri key binding.
type Keybinding struct {
	Action string `json:"action"`
	Key    string `json:"key"`
}

// ReadKeybindings extracts keybindings from the niri config file.
// Parses the `binds { ... }` block looking for lines like:
//
//	Mod+T { spawn "alacritty"; }
func ReadKeybindings() ([]Keybinding, error) {
	paths := config.Resolve()
	data, err := os.ReadFile(paths.ConfigFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read niri config: %w", err)
	}

	return parseKeybindings(string(data)), nil
}

func cleanActionStr(a string) string {
	a = strings.ReplaceAll(a, `"`, "")
	a = strings.ReplaceAll(a, `'`, "")
	a = strings.TrimRight(a, ";")
	a = strings.TrimSpace(a)
	// Normalize spawn-sh and spawn
	if strings.HasPrefix(a, "spawn-sh ") {
		return "spawn " + strings.TrimPrefix(a, "spawn-sh ")
	}
	return a
}

// parseKeybindings extracts keybindings from KDL config content.
func parseKeybindings(content string) []Keybinding {
	var bindings []Keybinding
	lines := strings.Split(content, "\n")

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Look for lines like: Mod+T { spawn "alacritty"; }
		// or: Mod+Shift+E { quit; }
		if idx := strings.Index(trimmed, "{"); idx > 0 {
			key := strings.TrimSpace(trimmed[:idx])
			rest := trimmed[idx+1:]

			// Strip hotkey-overlay-title="..." from the key
			if attrIdx := strings.Index(key, "hotkey-overlay-title="); attrIdx > 0 {
				key = strings.TrimSpace(key[:attrIdx])
			}
			// Also strip inline comments after the key
			if commentIdx := strings.Index(key, "//"); commentIdx > 0 {
				key = strings.TrimSpace(key[:commentIdx])
			}

			if idxEnd := strings.Index(rest, "}"); idxEnd > 0 {
				action := strings.TrimSpace(rest[:idxEnd])
				cleanedAction := cleanActionStr(action)

				if key != "" && cleanedAction != "" {
					bindings = append(bindings, Keybinding{
						Action: cleanedAction,
						Key:    key,
					})
				}
			}
		}
	}

	return bindings
}

// WriteKeybinding updates a single keybinding in the niri config.
// It finds the line containing the old key mapping and replaces it.
func WriteKeybinding(oldKey, newKey, action string) error {
	paths := config.Resolve()
	data, err := os.ReadFile(paths.ConfigFile)
	if err != nil {
		return fmt.Errorf("failed to read niri config: %w", err)
	}

	content := string(data)
	targetAction := cleanActionStr(action)

	lines := strings.Split(content, "\n")
	found := false

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") {
			continue
		}

		idx := strings.Index(trimmed, "{")
		if idx <= 0 {
			continue
		}

		idxEnd := strings.Index(trimmed[idx+1:], "}")
		if idxEnd < 0 {
			continue
		}

		lineAction := cleanActionStr(trimmed[idx+1 : idx+1+idxEnd])

		// Match either exact cleaned action, or contains if complex spawn
		if lineAction == targetAction || strings.Contains(lineAction, targetAction) || strings.Contains(targetAction, lineAction) {
			// Find indentation
			indent := ""
			for _, ch := range line {
				if ch == ' ' || ch == '\t' {
					indent += string(ch)
				} else {
					break
				}
			}
			if indent == "" {
				indent = "    "
			}

			// Preserve overlay title if present
			keyPart := strings.TrimSpace(trimmed[:idx])
			overlayTitle := ""
			if tIdx := strings.Index(keyPart, "hotkey-overlay-title="); tIdx > 0 {
				overlayTitle = " " + strings.TrimSpace(keyPart[tIdx:])
			}

			lines[i] = indent + newKey + overlayTitle + " " + trimmed[idx:]
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("could not find keybinding for action: %s", action)
	}

	newContent := strings.Join(lines, "\n")

	// Backup before writing
	if err := config.BackupConfig(paths.ConfigFile); err != nil {
		// Non-fatal, just log
		fmt.Printf("Warning: failed to backup config: %v\n", err)
	}

	return config.WriteConfig(paths.ConfigFile, newContent)
}
