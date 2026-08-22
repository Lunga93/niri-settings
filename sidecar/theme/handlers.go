package theme

import (
	"niri-settings-sidecar/protocol"
)

// HandleGetThemeColors returns the current pywal-derived palette.
func HandleGetThemeColors(_ map[string]any) {
	th, err := GetThemeColors()
	if err != nil {
		protocol.WriteError("THEME_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(th)
}
