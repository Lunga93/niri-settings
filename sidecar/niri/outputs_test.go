package niri

import "testing"

// Sampled verbatim from `niri msg outputs` on a two-monitor setup where DP-1
// is physically rotated 90 degrees. Regression guard: Width/Height must keep
// the native mode pixels; logical size (already rotation-corrected) must not
// overwrite them, or the UI's transform swap renders rotated displays wrong.
const sampleOutputs = `Output "Dell Inc. DELL P2422H 3P0RYF3" (DP-1)
  Current mode: 1920x1080 @ 60.000 Hz (preferred)
  Variable refresh rate: not supported
  Physical size: 530x300 mm
  Logical position: 1920, 0
  Logical size: 1080x1920
  Scale: 1
  Transform: 90° counter-clockwise
  Available modes:
    1920x1080@60.000 (current, preferred)
    1600x900@60.000

Output "ViewSonic Corporation VX2758-C-MH V9M191500306" (HDMI-A-1)
  Current mode: 1920x1080 @ 143.996 Hz (preferred)
  Variable refresh rate: not supported
  Physical size: 600x330 mm
  Logical position: 0, 0
  Logical size: 1920x1080
  Scale: 1
  Transform: normal
  Available modes:
    1920x1080@60.000 (preferred)
    1920x1080@143.996 (current)
`

func TestParseOutputsKeepsNativeModeDims(t *testing.T) {
	outputs := parseOutputs(sampleOutputs)
	if len(outputs) != 2 {
		t.Fatalf("expected 2 outputs, got %d", len(outputs))
	}

	dp1 := outputs[0]
	if dp1.Connector != "DP-1" {
		t.Fatalf("expected connector DP-1, got %q", dp1.Connector)
	}
	if dp1.Width != 1920 || dp1.Height != 1080 {
		t.Errorf(
			"rotated output must keep native mode dims, got %dx%d",
			dp1.Width,
			dp1.Height,
		)
	}
	if dp1.Transform != "90" {
		t.Errorf("expected transform 90, got %q", dp1.Transform)
	}
	if dp1.X != 1920 || dp1.Y != 0 {
		t.Errorf("expected logical position (1920, 0), got (%d, %d)", dp1.X, dp1.Y)
	}
	if dp1.Scale != 1.0 {
		t.Errorf("expected scale 1, got %g", dp1.Scale)
	}
	if len(dp1.Modes) != 2 || dp1.Modes[0] != "1920x1080@60.000" {
		t.Errorf("unexpected modes parsed: %v", dp1.Modes)
	}

	hdmi := outputs[1]
	if hdmi.Transform != "normal" {
		t.Errorf("expected transform normal, got %q", hdmi.Transform)
	}
	if hdmi.Width != 1920 || hdmi.Height != 1080 {
		t.Errorf(
			"unrotated output must keep native mode dims, got %dx%d",
			hdmi.Width,
			hdmi.Height,
		)
	}
}
