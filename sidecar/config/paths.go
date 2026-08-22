package config

import (
	"os"
	"path/filepath"
)

// Paths holds resolved XDG config paths for niri.
type Paths struct {
	ConfigDir  string
	ConfigFile string
}

// Resolve returns the niri config directory and main config file path.
func Resolve() Paths {
	home, err := os.UserHomeDir()
	if err != nil {
		return Paths{
			ConfigDir:  ".config/niri",
			ConfigFile: ".config/niri/config.kdl",
		}
	}

	xdgConfig := os.Getenv("XDG_CONFIG_HOME")
	if xdgConfig == "" {
		xdgConfig = filepath.Join(home, ".config")
	}

	configDir := filepath.Join(xdgConfig, "niri")

	if envConfig := os.Getenv("NIRI_CONFIG"); envConfig != "" {
		return Paths{
			ConfigDir:  configDir,
			ConfigFile: envConfig,
		}
	}

	return Paths{
		ConfigDir:  configDir,
		ConfigFile: filepath.Join(configDir, "config.kdl"),
	}
}

// WriteConfig writes raw KDL content to the config file.
func WriteConfig(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

// BackupConfig creates a .bak copy of the config file before writing.
func BackupConfig(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return os.WriteFile(path+".bak", data, 0644)
}
