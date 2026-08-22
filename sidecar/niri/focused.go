package niri

import (
	"fmt"
	"os/exec"
	"strings"
)

// GetFocusedOutput returns the short name of the currently focused output (e.g. "DP-1").
func GetFocusedOutput() (string, error) {
	cmd := exec.Command("niri", "msg", "focused-output")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("niri focused-output failed: %w (output: %s)", err, string(out))
	}
	// First line looks like: Output "Vendor Model" (DP-1)
	firstLine := strings.SplitN(strings.TrimSpace(string(out)), "\n", 2)[0]
	return extractOutputName(firstLine), nil
}

// extractOutputName pulls the short name from a line like:
//
//	Output "Dell Inc. DELL P2422H 3P0RYF3" (DP-1)
func extractOutputName(line string) string {
	if idx := strings.LastIndex(line, "("); idx != -1 {
		end := strings.LastIndex(line, ")")
		if end > idx {
			return line[idx+1 : end]
		}
	}
	return line
}
