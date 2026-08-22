package theme

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// PywalTheme represents the colors extracted from pywal's colors.json
type PywalTheme struct {
	Wallpaper       string            `json:"wallpaper"`
	Alpha           string            `json:"alpha"`
	Scheme          string            `json:"scheme"`
	Special         map[string]string `json:"special"`
	Colors          map[string]string `json:"colors"`
	PrimaryAccent   string            `json:"primary_accent"`
	SecondaryAccent string            `json:"secondary_accent"`
}

// Default fallback theme if pywal is not run yet
func DefaultPywalTheme() PywalTheme {
	return PywalTheme{
		Wallpaper: "",
		Alpha:     "100",
		Scheme:    "dark",
		Special: map[string]string{
			"background": "#12100e",
			"foreground": "#dfe4e9",
			"cursor":     "#dfe4e9",
		},
		Colors: map[string]string{
			"color0":  "#12100e",
			"color1":  "#95975B",
			"color2":  "#55788D",
			"color3":  "#6B96AD",
			"color4":  "#0a84ff",
			"color5":  "#bf5af2",
			"color6":  "#B2CADC",
			"color7":  "#dfe4e9",
			"color8":  "#9c9fa3",
			"color9":  "#95975B",
			"color10": "#55788D",
			"color11": "#6B96AD",
			"color12": "#0a84ff",
			"color13": "#bf5af2",
			"color14": "#B2CADC",
			"color15": "#dfe4e9",
		},
		PrimaryAccent:   "#0a84ff",
		SecondaryAccent: "#bf5af2",
	}
}

// GetThemeColors reads pywal colors from ~/.cache/wal/colors.json
func GetThemeColors() (PywalTheme, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return DefaultPywalTheme(), err
	}

	path := filepath.Join(home, ".cache", "wal", "colors.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return DefaultPywalTheme(), nil
	}

	var raw struct {
		Wallpaper string            `json:"wallpaper"`
		Alpha     string            `json:"alpha"`
		Scheme    string            `json:"scheme"`
		Special   map[string]string `json:"special"`
		Colors    map[string]string `json:"colors"`
	}

	if err := json.Unmarshal(data, &raw); err != nil {
		return DefaultPywalTheme(), fmt.Errorf("failed to parse colors.json: %w", err)
	}

	theme := PywalTheme{
		Wallpaper: raw.Wallpaper,
		Alpha:     raw.Alpha,
		Scheme:    raw.Scheme,
		Special:   raw.Special,
		Colors:    raw.Colors,
	}

	if theme.Special == nil {
		theme.Special = make(map[string]string)
	}
	if theme.Colors == nil {
		theme.Colors = make(map[string]string)
	}
	if theme.Scheme == "" {
		theme.Scheme = "dark"
	}

	// Determine primary and secondary accents
	if val, ok := raw.Colors["primary_accent"]; ok && val != "" {
		theme.PrimaryAccent = val
	} else if val, ok := raw.Colors["color4"]; ok && val != "" {
		theme.PrimaryAccent = val
	} else if val, ok := raw.Colors["color1"]; ok && val != "" {
		theme.PrimaryAccent = val
	} else {
		theme.PrimaryAccent = "#0a84ff"
	}

	if val, ok := raw.Colors["secondary_accent"]; ok && val != "" {
		theme.SecondaryAccent = val
	} else if val, ok := raw.Colors["color5"]; ok && val != "" {
		theme.SecondaryAccent = val
	} else if val, ok := raw.Colors["color2"]; ok && val != "" {
		theme.SecondaryAccent = val
	} else {
		theme.SecondaryAccent = "#bf5af2"
	}

	return theme, nil
}
