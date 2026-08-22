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
				// Remove trailing semicolons
				action = strings.TrimRight(action, ";")
				// Remove quotes from spawn commands
				action = strings.ReplaceAll(action, `"`, "")

				if key != "" && action != "" {
					bindings = append(bindings, Keybinding{
						Action: action,
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

	// Find and replace the key binding line
	// Look for lines like:  Mod+T { spawn "alacritty"; }
	lines := strings.Split(content, "\n")
	found := false

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Check if this line contains the action we want to rebind
		if strings.Contains(trimmed, action) && strings.Contains(trimmed, "{") {
			// Replace the key part
			idx := strings.Index(trimmed, "{")
			if idx > 0 {
				lines[i] = "    " + newKey + " " + trimmed[idx:]
				found = true
				break
			}
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
