package niri

import (
	"fmt"
	"os/exec"
	"regexp"
	"strings"
)

// Output represents a display output from niri.
type Output struct {
	Name      string  `json:"name"`
	Enabled   bool    `json:"enabled"`
	Width     int     `json:"width"`
	Height    int     `json:"height"`
	RefreshHz int     `json:"refresh_hz"`
	Scale     float64 `json:"scale"`
	X         int     `json:"x"`
	Y         int     `json:"y"`
	Focused   bool    `json:"focused"`
}

var modeRe = regexp.MustCompile(`(\d+)x(\d+)\s*@\s*([\d.]+)\s*Hz`)
var sizeRe = regexp.MustCompile(`(\d+)x(\d+)`)
var posRe = regexp.MustCompile(`(-?\d+),\s*(-?\d+)`)

// ListOutputs queries niri for connected display outputs.
func ListOutputs() ([]Output, error) {
	cmd := exec.Command("niri", "msg", "outputs")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("niri msg outputs failed: %w (output: %s)", err, string(out))
	}

	return parseOutputs(string(out)), nil
}

// parseOutputs parses the text output of `niri msg outputs`.
// Format:
//
//	Output "Vendor Model" (DP-1)
//	  Current mode: 1920x1080 @ 60.000 Hz (preferred)
//	  Logical position: 1920, 0
//	  Logical size: 1080x1920
//	  Scale: 1
func parseOutputs(raw string) []Output {
	var outputs []Output
	lines := strings.Split(raw, "\n")

	var current *Output
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		// New output block: starts with "Output" (not indented)
		if strings.HasPrefix(trimmed, "Output ") {
			if current != nil {
				outputs = append(outputs, *current)
			}
			name := extractOutputName(trimmed)
			current = &Output{
				Name:    name,
				Enabled: true,
			}
			continue
		}

		// Available modes block — skip the indented mode lines
		if strings.HasPrefix(trimmed, "Available modes:") {
			continue
		}

		if current == nil {
			continue
		}

		// Skip lines that are indented mode listings (contain @ and are under Available modes)
		if strings.Contains(line, "  ") && strings.Contains(trimmed, "@") && !strings.HasPrefix(trimmed, "Current") {
			continue
		}

		parts := strings.SplitN(trimmed, ":", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		switch {
		case key == "Current mode":
			if m := modeRe.FindStringSubmatch(val); len(m) == 4 {
				fmt.Sscanf(m[1], "%d", &current.Width)
				fmt.Sscanf(m[2], "%d", &current.Height)
				var hz float64
				fmt.Sscanf(m[3], "%f", &hz)
				current.RefreshHz = int(hz + 0.5)
			}
		case key == "Scale":
			var s float64
			if _, err := fmt.Sscanf(val, "%g", &s); err == nil {
				current.Scale = s
			}
		case key == "Logical position":
			if m := posRe.FindStringSubmatch(val); len(m) == 3 {
				fmt.Sscanf(m[1], "%d", &current.X)
				fmt.Sscanf(m[2], "%d", &current.Y)
			}
		case key == "Logical size":
			// Note: modeRe cannot match here — logical size lines have no "@ … Hz".
			if m := sizeRe.FindStringSubmatch(val); len(m) == 3 {
				fmt.Sscanf(m[1], "%d", &current.Width)
				fmt.Sscanf(m[2], "%d", &current.Height)
			}
		}
	}

	if current != nil {
		outputs = append(outputs, *current)
	}

	return outputs
}

// ReloadConfig sends a signal to niri to reload its configuration.
func ReloadConfig() error {
	cmd := exec.Command("niri", "msg", "action", "reload-config")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("niri reload-config failed: %w (output: %s)", err, string(out))
	}
	return nil
}
