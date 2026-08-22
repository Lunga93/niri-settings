package audio

import (
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

// AudioDevice represents an audio sink (output) or source (input).
type AudioDevice struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	IsDefault  bool   `json:"is_default"`
	Volume     int    `json:"volume"`
	Muted      bool   `json:"muted"`
	DeviceType string `json:"device_type"`
}

// AudioInfo contains sinks and sources.
type AudioInfo struct {
	Sinks           []AudioDevice `json:"sinks"`
	Sources         []AudioDevice `json:"sources"`
	DefaultSinkID   *int          `json:"default_sink_id"`
	DefaultSourceID *int          `json:"default_source_id"`
}

var (
	deviceLineRe = regexp.MustCompile(`^[\s│]*(\*)?\s*(\d+)\.\s*(.+?)(?:\s*\[([^\]]+)\])*$`)
	volRe        = regexp.MustCompile(`vol:\s*([\d.]+)`)
)

// GetAudioDevices runs `wpctl status` and parses sinks and sources.
func GetAudioDevices() (AudioInfo, error) {
	cmd := exec.Command("wpctl", "status")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return AudioInfo{}, fmt.Errorf("wpctl status failed: %w (output: %s)", err, string(out))
	}

	return parseWpctlStatus(string(out)), nil
}

func parseWpctlStatus(raw string) AudioInfo {
	var info AudioInfo
	info.Sinks = make([]AudioDevice, 0)
	info.Sources = make([]AudioDevice, 0)

	lines := strings.Split(raw, "\n")
	section := ""

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		if strings.Contains(line, "Sinks:") {
			section = "sinks"
			continue
		} else if strings.Contains(line, "Sources:") {
			section = "sources"
			continue
		} else if strings.Contains(line, "Filters:") || strings.Contains(line, "Streams:") || strings.Contains(line, "Video") || strings.Contains(line, "Settings") {
			section = ""
			continue
		}

		if section != "sinks" && section != "sources" {
			continue
		}

		if trimmed == "" || trimmed == "│" {
			continue
		}

		m := deviceLineRe.FindStringSubmatch(line)
		if len(m) >= 4 {
			isDefault := m[1] == "*"
			id, err := strconv.Atoi(m[2])
			if err != nil {
				continue
			}
			rawName := strings.TrimSpace(m[3])
			extra := ""
			if len(m) > 4 {
				extra = m[4]
			}

			volume := 100
			muted := false

			if strings.Contains(strings.ToUpper(line), "MUTED") {
				muted = true
			}

			if vm := volRe.FindStringSubmatch(line); len(vm) == 2 {
				if f, err := strconv.ParseFloat(vm[1], 64); err == nil {
					volume = int(f*100 + 0.5)
				}
			}

			devType := determineDeviceType(section, rawName, extra)

			dev := AudioDevice{
				ID:         id,
				Name:       cleanDeviceName(rawName),
				IsDefault:  isDefault,
				Volume:     volume,
				Muted:      muted,
				DeviceType: devType,
			}

			if section == "sinks" {
				info.Sinks = append(info.Sinks, dev)
				if isDefault {
					curID := id
					info.DefaultSinkID = &curID
				}
			} else if section == "sources" {
				info.Sources = append(info.Sources, dev)
				if isDefault {
					curID := id
					info.DefaultSourceID = &curID
				}
			}
		}
	}

	return info
}

func determineDeviceType(section, name, extra string) string {
	lower := strings.ToLower(name + " " + extra)
	if section == "sinks" {
		if strings.Contains(lower, "headset") || strings.Contains(lower, "headphone") || strings.Contains(lower, "earphone") {
			return "headphones"
		}
		if strings.Contains(lower, "hdmi") || strings.Contains(lower, "displayport") || strings.Contains(lower, "digital") {
			return "hdmi"
		}
		if strings.Contains(lower, "speaker") || strings.Contains(lower, "analog") {
			return "speaker"
		}
		return "sink"
	}

	if strings.Contains(lower, "headset") || strings.Contains(lower, "mic") || strings.Contains(lower, "mono") || strings.Contains(lower, "analog") {
		return "mic"
	}
	return "source"
}

func cleanDeviceName(name string) string {
	// Strip trailing brackets or status markers if captured
	name = strings.TrimSpace(name)
	if idx := strings.Index(name, "["); idx != -1 {
		name = strings.TrimSpace(name[:idx])
	}
	return name
}

// SetDefaultAudioDevice sets the default sink or source in WirePlumber.
func SetDefaultAudioDevice(id int) error {
	cmd := exec.Command("wpctl", "set-default", strconv.Itoa(id))
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("wpctl set-default failed: %w (output: %s)", err, string(out))
	}
	return nil
}

// SetAudioVolume sets the volume and mute state of a specific device.
func SetAudioVolume(id int, vol int, muted bool) error {
	volPct := fmt.Sprintf("%d%%", vol)
	cmd := exec.Command("wpctl", "set-volume", strconv.Itoa(id), volPct)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("wpctl set-volume failed: %w (output: %s)", err, string(out))
	}

	muteVal := "0"
	if muted {
		muteVal = "1"
	}
	cmdMute := exec.Command("wpctl", "set-mute", strconv.Itoa(id), muteVal)
	if out, err := cmdMute.CombinedOutput(); err != nil {
		return fmt.Errorf("wpctl set-mute failed: %w (output: %s)", err, string(out))
	}

	return nil
}

// TestAudio plays a short audio feedback sound.
func TestAudio() error {
	// Try paplay or canberra or aplay
	paths := []string{
		"/usr/share/sounds/freedesktop/stereo/complete.oga",
		"/usr/share/sounds/freedesktop/stereo/bell.oga",
		"/usr/share/sounds/freedesktop/stereo/message.oga",
	}

	for _, p := range paths {
		cmd := exec.Command("paplay", p)
		if err := cmd.Start(); err == nil {
			return nil
		}
	}

	cmd := exec.Command("canberra-gtk-play", "-i", "complete")
	return cmd.Start()
}
