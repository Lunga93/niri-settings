package audio

import (
	"niri-settings-sidecar/protocol"
)

// HandleGetDevices returns sinks/sources with volumes and the defaults.
func HandleGetDevices(_ map[string]any) {
	info, err := GetAudioDevices()
	if err != nil {
		protocol.WriteError("AUDIO_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(info)
}

// HandleSetDevice switches the default device by id.
func HandleSetDevice(args map[string]any) {
	id, ok := protocol.GetIntArg(args, "id")
	if !ok {
		protocol.InvalidArgs("Invalid or missing 'id' argument")
		return
	}

	if err := SetDefaultAudioDevice(id); err != nil {
		protocol.WriteError("AUDIO_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleSetVolume sets volume/mute for a device by id.
func HandleSetVolume(args map[string]any) {
	id, ok := protocol.GetIntArg(args, "id")
	if !ok {
		protocol.InvalidArgs("Invalid or missing 'id' argument")
		return
	}
	volume, ok := protocol.GetIntArg(args, "volume")
	if !ok {
		volume = 100
	}
	muted := false
	if raw, ok := args["muted"]; ok {
		if b, isBool := raw.(bool); isBool {
			muted = b
		}
	}

	if err := SetAudioVolume(id, volume, muted); err != nil {
		protocol.WriteError("AUDIO_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}

// HandleTest plays a test sound through the default sink.
func HandleTest(_ map[string]any) {
	if err := TestAudio(); err != nil {
		protocol.WriteError("AUDIO_ERROR", err.Error(), nil)
		return
	}
	protocol.WriteResponse(map[string]string{"status": "ok"})
}
