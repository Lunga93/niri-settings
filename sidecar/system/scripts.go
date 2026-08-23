package system

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// isExecFile reports whether path exists as a regular executable file.
func isExecFile(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir() && info.Mode()&0o111 != 0
}

// ScriptBinDirs lists helper-script directories in priority order:
// NIRI_SCRIPT_BIN_DIR override, XDG_BIN_HOME, then ~/.local/bin. $PATH is
// consulted separately by ResolveScript via exec.LookPath.
func ScriptBinDirs(home string) []string {
	var dirs []string
	if d := os.Getenv("NIRI_SCRIPT_BIN_DIR"); d != "" && filepath.IsAbs(d) {
		dirs = append(dirs, d)
	}
	if x := os.Getenv("XDG_BIN_HOME"); x != "" && filepath.IsAbs(x) {
		dirs = append(dirs, x)
	}
	if home != "" {
		dirs = append(dirs, filepath.Join(home, ".local", "bin"))
	}
	return dirs
}

// ResolveScript finds a named helper script across the bin-dir candidates
// and finally $PATH. Names containing separators are rejected so this can
// never escape into arbitrary paths.
func ResolveScript(home, name string) (string, bool) {
	if name == "" || strings.ContainsRune(name, '/') {
		return "", false
	}
	for _, dir := range ScriptBinDirs(home) {
		p := filepath.Join(dir, name)
		if isExecFile(p) {
			return p, true
		}
	}
	if lp, err := exec.LookPath(name); err == nil {
		return lp, true
	}
	return "", false
}
