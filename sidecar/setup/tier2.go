// Tier 2 adoption: detect the dotfiles desktop, back up user configs,
// launch the upstream installer safely, and restore previous setups.
package setup

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"niri-settings-sidecar/protocol"
)

// DotfilesDirName is the checkout location the installer expects.
const DotfilesDirName = "dotfiles"

// stowDirs mirrors install.sh STOW_DIRS; keep in sync.
var stowDirs = []string{
	"ags", "alacritty", "fastfetch", "gtk", "niri", "quickshell",
	"scripts", "swaync", "welcome", "systemd", "wofi", "opencode",
}

// extraPaths are user-level files the installer touches beyond stow dirs.
var extraPaths = []string{
	filepath.Join(".config", "dotfiles", "settings.json"),
	filepath.Join(".config", "current_wallpaper"),
}

type terminalSpec struct {
	bin  string
	args func(cmd string) []string
}

var terminalCandidates = []terminalSpec{
	{"alacritty", func(c string) []string { return []string{"-e", "bash", "-c", c} }},
	{"kitty", func(c string) []string { return []string{"bash", "-c", c} }},
	{"foot", func(c string) []string { return []string{"bash", "-c", c} }},
	{"wezterm", func(c string) []string {
		return []string{"start", "--always-new-process", "--", "bash", "-c", c}
	}},
}

// lookupTerminal is a variable so tests can stub terminal discovery.
var lookupTerminal = func() *terminalSpec {
	for i := range terminalCandidates {
		if _, err := exec.LookPath(terminalCandidates[i].bin); err == nil {
			return &terminalCandidates[i]
		}
	}
	return nil
}

type TierStatus struct {
	DotfilesPresent bool     `json:"dotfiles_present"`
	DotfilesDir     string   `json:"dotfiles_dir"`
	Stowed          []string `json:"stowed"`
	Tier            int      `json:"tier"`
}

func dotfilesHome(home string) string {
	return filepath.Join(home, DotfilesDirName)
}

// detectTier inspects the home directory without modifying anything.
// It scans ~/.config for symlinks that resolve into the dotfiles
// checkout — this is the ground truth of what stow has done, so
// detection works regardless of package naming or directory layout.
func detectTier(home string) TierStatus {
	status := TierStatus{
		DotfilesDir: dotfilesHome(home),
		Stowed:      []string{},
	}
	if info, err := os.Stat(status.DotfilesDir); err == nil && info.IsDir() {
		status.DotfilesPresent = true
	}
	if !status.DotfilesPresent {
		return status
	}
	status.Stowed = scanStowed(home, status.DotfilesDir)
	if len(status.Stowed) > 0 {
		status.Tier = 2
	} else {
		status.Tier = 1
	}
	return status
}

// scanStowed walks ~/.config looking for symlinks that resolve into
// dotfilesDir. Each such symlink is a stow-managed config entry.
func scanStowed(home, dotfilesDir string) []string {
	configDir := filepath.Join(home, ".config")
	entries, err := os.ReadDir(configDir)
	if err != nil {
		return nil
	}
	var stowed []string
	for _, e := range entries {
		if e.Type()&os.ModeSymlink == 0 {
			continue
		}
		target := filepath.Join(configDir, e.Name())
		link, err := os.Readlink(target)
		if err != nil {
			continue
		}
		resolved := link
		if !filepath.IsAbs(resolved) {
			resolved = filepath.Join(configDir, resolved)
		}
		if strings.HasPrefix(filepath.Clean(resolved), dotfilesDir) {
			stowed = append(stowed, e.Name())
		}
	}
	return stowed
}

type backupEntry struct {
	Path string `json:"path"`
	Kind string `json:"kind"` // dir | file | symlink | missing
}

const manifestName = "manifest.json"

// backupTargets copies every real file/dir the installer would replace into
// a timestamped directory and records what it did in a manifest.
func backupTargets(home string) (string, []backupEntry, error) {
	id := time.Now().Format("20060102-150405")
	root := filepath.Join(home, ".local", "share", "niri-settings", "backups", id)
	if err := os.MkdirAll(root, 0o755); err != nil {
		return "", nil, fmt.Errorf("cannot create backup dir: %w", err)
	}

	var entries []backupEntry
	for _, dir := range stowDirs {
		path := filepath.Join(home, ".config", dir)
		if err := capture(&entries, root, home, path); err != nil {
			return "", nil, err
		}
	}
	for _, rel := range extraPaths {
		if err := capture(&entries, root, home, filepath.Join(home, rel)); err != nil {
			return "", nil, err
		}
	}

	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return "", nil, err
	}
	if err := os.WriteFile(filepath.Join(root, manifestName), data, 0o644); err != nil {
		return "", nil, err
	}
	return id, entries, nil
}

func capture(entries *[]backupEntry, backupRoot, home, path string) error {
	rel, err := filepath.Rel(home, path)
	if err != nil {
		rel = strings.ReplaceAll(path, "/", "_")
	}
	info, err := os.Lstat(path)
	switch {
	case os.IsNotExist(err):
		*entries = append(*entries, backupEntry{Path: path, Kind: "missing"})
		return nil
	case err != nil:
		return err
	case info.Mode()&os.ModeSymlink != 0:
		*entries = append(*entries, backupEntry{Path: path, Kind: "symlink"})
		return nil
	case info.IsDir():
		*entries = append(*entries, backupEntry{Path: path, Kind: "dir"})
		return copyTree(path, filepath.Join(backupRoot, "data", rel))
	default:
		*entries = append(*entries, backupEntry{Path: path, Kind: "file"})
		dst := filepath.Join(backupRoot, "data", rel)
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return err
		}
		return copyFile(path, dst)
	}
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0o644)
}

func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, p)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		if !d.Type().IsRegular() {
			return nil
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		return copyFile(p, target)
	})
}

// installScriptCommand builds the shell snippet executed inside the terminal.
func installScriptCommand(dotfilesDir string, dryRun bool) string {
	flag := ""
	if dryRun {
		flag = " -n"
	}
	return fmt.Sprintf(
		"cd '%s' && ./install.sh%s; printf '\\nInstaller finished. Press Enter to close this window. '; read _",
		dotfilesDir, flag,
	)
}

type adoptResult struct {
	Status   string `json:"status"`
	BackupID string `json:"backup_id,omitempty"`
	BackedUp int    `json:"backed_up,omitempty"`
	Detail   string `json:"detail,omitempty"`
}

func adoptTier2(home string, dryRun bool) (*adoptResult, error) {
	if lookupTerminal() == nil {
		return nil, fmt.Errorf(
			"no supported terminal emulator found (need one of: alacritty, kitty, foot, wezterm)")
	}

	tier := detectTier(home)
	if tier.Tier == 2 && !dryRun {
		return &adoptResult{
			Status: "already_active",
			Detail: "dotfiles desktop is already installed; nothing was changed",
		}, nil
	}

	var backupID string
	var entries []backupEntry
	if !dryRun {
		id, captured, err := backupTargets(home)
		if err != nil {
			return nil, err
		}
		backupID = id
		for _, e := range captured {
			if e.Kind == "dir" || e.Kind == "file" {
				entries = append(entries, e)
			}
		}
	}

	term := lookupTerminal()
	script := installScriptCommand(tier.DotfilesDir, dryRun)
	cmd := exec.Command(term.bin, term.args(script)...)
	cmd.SysProcAttr = detachedProcAttr()
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("cannot open installer window: %w", err)
	}
	go func() { _ = cmd.Wait() }()

	res := &adoptResult{Status: "launched", BackupID: backupID}
	if dryRun {
		res.Status = "preview_launched"
	}
	if len(entries) > 0 {
		res.BackedUp = len(entries)
	}
	return res, nil
}

type backupInfo struct {
	ID      string `json:"id"`
	Created string `json:"created"`
	Items   int    `json:"items"`
}

func listBackups(home string) ([]backupInfo, error) {
	root := filepath.Join(home, ".local", "share", "niri-settings", "backups")
	dirEntries, err := os.ReadDir(root)
	if os.IsNotExist(err) {
		return []backupInfo{}, nil
	}
	if err != nil {
		return nil, err
	}
	out := []backupInfo{}
	for _, de := range dirEntries {
		if !de.IsDir() {
			continue
		}
		data, err := os.ReadFile(filepath.Join(root, de.Name(), manifestName))
		if err != nil {
			continue
		}
		var entries []backupEntry
		if json.Unmarshal(data, &entries) != nil {
			continue
		}
		items := 0
		for _, e := range entries {
			if e.Kind == "dir" || e.Kind == "file" {
				items++
			}
		}
		out = append(out, backupInfo{ID: de.Name(), Created: de.Name(), Items: items})
	}
	return out, nil
}

// restoreBackup puts previously replaced configs back and removes the
// dotfiles symlinks that took their place.
func restoreBackup(home, id string) (int, error) {
	if strings.ContainsAny(id, "/\\") || id == "." || id == ".." {
		return 0, fmt.Errorf("invalid backup id")
	}
	root := filepath.Join(home, ".local", "share", "niri-settings", "backups", id)
	data, err := os.ReadFile(filepath.Join(root, manifestName))
	if err != nil {
		return 0, fmt.Errorf("unknown backup %q", id)
	}
	var entries []backupEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return 0, err
	}

	restored := 0
	for _, e := range entries {
		switch e.Kind {
		case "symlink":
			if err := os.Remove(e.Path); err == nil {
				restored++
			}
		case "file":
			src := filepath.Join(root, "data", relDataPath(home, e.Path))
			if err := os.RemoveAll(e.Path); err != nil {
				continue
			}
			if err := os.MkdirAll(filepath.Dir(e.Path), 0o755); err != nil {
				continue
			}
			if err := copyFile(src, e.Path); err == nil {
				restored++
			}
		case "dir":
			src := filepath.Join(root, "data", relDataPath(home, e.Path))
			if err := os.RemoveAll(e.Path); err != nil {
				continue
			}
			if err := copyTree(src, e.Path); err == nil {
				restored++
			}
		case "missing":
			_ = os.RemoveAll(e.Path)
			restored++
		}
	}
	return restored, nil
}

// relDataPath recomputes the relative key used under the backup's data dir.
func relDataPath(home, path string) string {
	rel, err := filepath.Rel(home, path)
	if err != nil {
		return strings.ReplaceAll(path, "/", "_")
	}
	return rel
}

// detachedProcAttr detaches the installer terminal from the sidecar process
// group so it survives command completion.
func detachedProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{Setpgid: true}
}

func handleGetTierStatus(home string, _ map[string]any) {
	status := detectTier(home)
	status.DotfilesDir = "~/" + DotfilesDirName
	protocol.WriteResponse(map[string]any{"status": status})
}

func handleAdoptTier2(home string, args map[string]any) {
	raw, err := json.Marshal(args)
	if err != nil {
		protocol.InvalidArgs(err.Error())
		return
	}
	var req struct {
		DryRun bool `json:"dry_run"`
	}
	if err := json.Unmarshal(raw, &req); err != nil {
		protocol.InvalidArgs(err.Error())
		return
	}
	result, err := adoptTier2(home, req.DryRun)
	if err != nil {
		protocol.WriteError("ADOPT_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]any{"result": result})
}

func handleListTier2Backups(home string, _ map[string]any) {
	backups, err := listBackups(home)
	if err != nil {
		protocol.WriteError("BACKUP_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]any{"backups": backups})
}

func handleRestoreTier2Backup(home string, args map[string]any) {
	id, ok := protocol.GetStringArg(args, "id")
	if !ok {
		protocol.InvalidArgs("missing id")
		return
	}
	restored, err := restoreBackup(home, id)
	if err != nil {
		protocol.WriteError("RESTORE_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]any{"restored": restored})
}

// Public handlers using WithHome middleware.
var (
	HandleGetTierStatus      = protocol.WithHome(handleGetTierStatus)
	HandleAdoptTier2         = protocol.WithHome(handleAdoptTier2)
	HandleListTier2Backups   = protocol.WithHome(handleListTier2Backups)
	HandleRestoreTier2Backup = protocol.WithHome(handleRestoreTier2Backup)
)
