package niri

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// Output represents a display output from niri.
type Output struct {
	Name        string   `json:"name"`
	FullName    string   `json:"full_name"`
	Connector   string   `json:"connector"`
	Enabled     bool     `json:"enabled"`
	Width       int      `json:"width"`
	Height      int      `json:"height"`
	RefreshHz   int      `json:"refresh_hz"`
	Scale       float64  `json:"scale"`
	X           int      `json:"x"`
	Y           int      `json:"y"`
	Transform   string   `json:"transform"`
	CurrentMode string   `json:"current_mode"`
	Modes       []string `json:"modes"`
	Focused     bool     `json:"focused"`
}

// DisplayLayoutConfig represents layout settings for a single output.
type DisplayLayoutConfig struct {
	Name      string  `json:"name"`
	FullName  string  `json:"full_name"`
	Connector string  `json:"connector"`
	X         int     `json:"x"`
	Y         int     `json:"y"`
	Transform string  `json:"transform"`
	Scale     float64 `json:"scale"`
	Mode      string  `json:"mode"`
}

var (
	modeRe = regexp.MustCompile(`(\d+)x(\d+)\s*@\s*([\d.]+)\s*Hz`)
	posRe  = regexp.MustCompile(`(-?\d+),\s*(-?\d+)`)
)

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
func parseOutputs(raw string) []Output {
	var outputs []Output
	lines := strings.Split(raw, "\n")

	var current *Output
	inModes := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		// New output block: starts with "Output "
		if strings.HasPrefix(trimmed, "Output ") {
			if current != nil {
				outputs = append(outputs, *current)
			}
			inModes = false
			fullName, connector := parseOutputHeader(trimmed)
			displayName := connector
			if displayName == "" {
				displayName = fullName
			}
			current = &Output{
				Name:      displayName,
				FullName:  fullName,
				Connector: connector,
				Enabled:   true,
				Transform: "normal",
				Scale:     1.0,
				Modes:     make([]string, 0),
			}
			continue
		}

		if current == nil {
			continue
		}

		if strings.HasPrefix(trimmed, "Available modes:") {
			inModes = true
			continue
		}

		if inModes {
			// Mode lines look like: 1920x1080@60.000 (current, preferred)
			if strings.Contains(trimmed, "@") {
				modeStr := strings.Fields(trimmed)[0]
				current.Modes = append(current.Modes, modeStr)
				continue
			}
		}

		parts := strings.SplitN(trimmed, ":", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		switch {
		case key == "Current mode":
			current.CurrentMode = val
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
			// Deliberately ignored: logical size is already rotation-corrected,
			// while Width/Height must stay in native mode pixels. Consumers
			// (canvas rendering, snapping) apply the transform swap themselves.
			continue
		case key == "Transform":
			current.Transform = normalizeTransform(val)
		}
	}

	if current != nil {
		outputs = append(outputs, *current)
	}

	return outputs
}

func parseOutputHeader(line string) (string, string) {
	// Format: Output "Dell Inc. DELL P2422H 3P0RYF3" (DP-1)
	fullName := ""
	connector := ""

	if start := strings.Index(line, "\""); start != -1 {
		if end := strings.Index(line[start+1:], "\""); end != -1 {
			fullName = line[start+1 : start+1+end]
		}
	}

	if idx := strings.LastIndex(line, "("); idx != -1 {
		end := strings.LastIndex(line, ")")
		if end > idx {
			connector = line[idx+1 : end]
		}
	}

	if fullName == "" && connector == "" {
		fullName = strings.TrimPrefix(line, "Output ")
	}

	return fullName, connector
}

func normalizeTransform(val string) string {
	lower := strings.ToLower(val)
	if strings.Contains(lower, "90") {
		return "90"
	}
	if strings.Contains(lower, "180") {
		return "180"
	}
	if strings.Contains(lower, "270") {
		return "270"
	}
	if strings.Contains(lower, "flipped-90") {
		return "flipped-90"
	}
	if strings.Contains(lower, "flipped-180") {
		return "flipped-180"
	}
	if strings.Contains(lower, "flipped-270") {
		return "flipped-270"
	}
	if strings.Contains(lower, "flipped") {
		return "flipped"
	}
	return "normal"
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

// ApplyDisplayLayout applies display configuration via wlr-randr and updates niri config.kdl.
func ApplyDisplayLayout(layouts []DisplayLayoutConfig) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("cannot determine home directory: %w", err)
	}

	configPath := filepath.Join(home, ".config", "niri", "config.kdl")
	contentBytes, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read niri config.kdl: %w", err)
	}
	content := string(contentBytes)

	// Build the replacement KDL output block
	var sb strings.Builder
	for _, l := range layouts {
		targetName := l.FullName
		if targetName == "" {
			targetName = l.Connector
		}
		if targetName == "" {
			targetName = l.Name
		}

		scale := l.Scale
		if scale <= 0 {
			scale = 1.0
		}

		scaleStr := strconv.FormatFloat(scale, 'f', -1, 64)

		sb.WriteString(fmt.Sprintf("output %q {\n", targetName))
		if l.Mode != "" {
			sb.WriteString(fmt.Sprintf("    mode %q\n", l.Mode))
		}
		sb.WriteString(fmt.Sprintf("    scale %s\n", scaleStr))
		if l.Transform != "" && l.Transform != "normal" {
			sb.WriteString(fmt.Sprintf("    transform %q\n", l.Transform))
		}
		sb.WriteString(fmt.Sprintf("    position x=%d y=%d\n", l.X, l.Y))
		sb.WriteString("}\n\n")

		// Also apply via wlr-randr if possible
		connector := l.Connector
		if connector == "" {
			connector = l.Name
		}
		if connector != "" {
			args := []string{"--output", connector, "--pos", fmt.Sprintf("%d,%d", l.X, l.Y), "--scale", scaleStr}
			if l.Transform != "" {
				args = append(args, "--transform", l.Transform)
			}
			exec.Command("wlr-randr", args...).Run()
		}
	}

	outputsBlock := strings.TrimSpace(sb.String())

	// Check if AUTO_OUTPUTS markers exist
	beginMarker := "// BEGIN_AUTO_OUTPUTS"
	endMarker := "// END_AUTO_OUTPUTS"

	var newContent string
	if strings.Contains(content, beginMarker) && strings.Contains(content, endMarker) {
		startIdx := strings.Index(content, beginMarker) + len(beginMarker)
		endIdx := strings.Index(content, endMarker)
		newContent = content[:startIdx] + "\n\n" + outputsBlock + "\n\n" + content[endIdx:]
	} else {
		// Insert before binds or at top of output config
		if idx := strings.Index(content, "binds {"); idx != -1 {
			newContent = content[:idx] + beginMarker + "\n\n" + outputsBlock + "\n\n" + endMarker + "\n\n" + content[idx:]
		} else {
			newContent = content + "\n\n" + beginMarker + "\n\n" + outputsBlock + "\n\n" + endMarker + "\n"
		}
	}

	if err := os.WriteFile(configPath, []byte(newContent), 0644); err != nil {
		return fmt.Errorf("failed to write niri config.kdl: %w", err)
	}

	// Trigger config reload
	_ = ReloadConfig()

	return nil
}
