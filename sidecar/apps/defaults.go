// Default-application categories and MIME association management.
package apps

import (
	"fmt"
	"os/exec"
	"strings"

	"niri-settings-sidecar/protocol"
)

// MimeGroup is a user-facing default-apps category.
type MimeGroup struct {
	ID    string   `json:"id"`
	Label string   `json:"label"`
	Mimes []string `json:"mimes"`
}

// mimeGroups defines the curated categories shown in the UI.
var mimeGroups = []MimeGroup{
	{ID: "browser", Label: "Web Browser", Mimes: []string{"text/html", "x-scheme-handler/https", "x-scheme-handler/http"}},
	{ID: "mail", Label: "Email", Mimes: []string{"x-scheme-handler/mailto"}},
	{ID: "editor", Label: "Text Editor", Mimes: []string{"text/plain"}},
	{ID: "images", Label: "Images", Mimes: []string{"image/png", "image/jpeg"}},
	{ID: "music", Label: "Music", Mimes: []string{"audio/mpeg", "audio/x-vorbis+ogg"}},
	{ID: "video", Label: "Video", Mimes: []string{"video/mp4"}},
	{ID: "files", Label: "File Manager", Mimes: []string{"inode/directory"}},
}

// queryDefault returns the current desktop-id handling mime, if any.
// It is a variable so tests can stub xdg-mime lookups.
var queryDefault = func(mime string) string {
	out, err := exec.Command("xdg-mime", "query", "default", mime).Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// setDefault associates desktopId with every mime in mimes via xdg-mime.
func setDefault(desktopID string, mimes []string) error {
	if desktopID == "" || !strings.HasSuffix(desktopID, ".desktop") {
		return fmt.Errorf("invalid desktop id: %q", desktopID)
	}
	args := append([]string{"default", desktopID}, mimes...)
	cmd := exec.Command("xdg-mime", args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("xdg-mime failed: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

// groupState is the per-category payload for the UI.
type groupState struct {
	Group      MimeGroup    `json:"group"`
	Current    string       `json:"current"`    // current default desktop-id ("" when unset)
	Candidates []DesktopApp `json:"candidates"` // installed apps that can handle it
}

// buildGroupStates pairs every category with its current default and the
// installed applications that declare support for its mimes.
func buildGroupStates(home string) []groupState {
	all := scanApps(home)
	byID := make(map[string]DesktopApp, len(all))
	for _, app := range all {
		byID[app.ID+".desktop"] = app
	}

	states := make([]groupState, 0, len(mimeGroups))
	for _, group := range mimeGroups {
		state := groupState{Group: group, Candidates: []DesktopApp{}}

		currentID := ""
		for _, mime := range group.Mimes {
			if id := queryDefault(mime); id != "" {
				currentID = id
				break
			}
		}
		state.Current = currentID

		for _, mime := range group.Mimes {
			for _, app := range all {
				for _, supported := range app.MimeTypes {
					if supported == mime && !containsApp(state.Candidates, app.ID) {
						state.Candidates = append(state.Candidates, app)
					}
				}
			}
		}
		// Sort the active default to the front of the choices.
		if app, ok := byID[currentID]; ok {
			for i, existing := range state.Candidates {
				if existing.ID == app.ID {
					state.Candidates = append([]DesktopApp{app},
						append(state.Candidates[:i:i], state.Candidates[i+1:]...)...)
					break
				}
			}
		}
		states = append(states, state)
	}
	return states
}

func containsApp(apps []DesktopApp, id string) bool {
	for _, app := range apps {
		if app.ID == id {
			return true
		}
	}
	return false
}

// HandleListInstalledApps responds with all launchable installed apps.
func HandleListInstalledApps(_ map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}
	apps := scanApps(home)
	if apps == nil {
		apps = []DesktopApp{}
	}
	protocol.WriteResponse(map[string]any{"apps": apps})
}

// HandleListDefaultApps responds with curated categories + candidates.
func HandleListDefaultApps(_ map[string]any) {
	home := protocol.HomeDir("HOME_ERROR")
	if home == "" {
		return
	}
	groups := buildGroupStates(home)
	// Drop internal mime list from serialization; candidates carry it.
	payload := make([]map[string]any, 0, len(groups))
	for _, state := range groups {
		payload = append(payload, map[string]any{
			"id":         state.Group.ID,
			"label":      state.Group.Label,
			"mimes":      state.Group.Mimes,
			"current":    state.Current,
			"candidates": state.Candidates,
		})
	}
	protocol.WriteResponse(map[string]any{"groups": payload})
}

// HandleSetDefaultApp sets one category's default to the given desktop id.
func HandleSetDefaultApp(args map[string]any) {
	groupID, _ := protocol.GetStringArg(args, "group")
	desktopID, _ := protocol.GetStringArg(args, "desktop_id")

	var target *MimeGroup
	for i := range mimeGroups {
		if mimeGroups[i].ID == groupID {
			target = &mimeGroups[i]
			break
		}
	}
	if target == nil {
		protocol.InvalidArgs(fmt.Sprintf("unknown group %q", groupID))
		return
	}
	if err := setDefault(desktopID, target.Mimes); err != nil {
		protocol.WriteError("DEFAULT_APP_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}
