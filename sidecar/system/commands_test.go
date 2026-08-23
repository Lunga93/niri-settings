package system

import (
	"strings"
	"testing"
	"time"
)

func TestExecScriptCapturesFailure(t *testing.T) {
	err := ExecScript("echo boom >&2; exit 3")
	if err == nil {
		t.Fatal("expected error for failing script")
	}
	if !strings.Contains(err.Error(), "boom") {
		t.Errorf("expected stderr tail in error, got: %v", err)
	}
}

func TestExecScriptSurvivesBackgroundedDaemon(t *testing.T) {
	start := time.Now()
	// A child that outlives the script while holding inherited fds must not
	// block Wait(); this exact pattern froze the sidecar with wlsunset.
	err := ExecScript("sleep 30 & echo $! >/dev/null")
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("script should succeed instantly: %v", err)
	}
	if elapsed > 5*time.Second {
		t.Fatalf("ExecScript blocked on backgrounded child for %s", elapsed)
	}
}

func TestExecScriptTimesOutRunawayForeground(t *testing.T) {
	origTimeout := execScriptTimeout
	execScriptTimeout = 500 * time.Millisecond
	defer func() { execScriptTimeout = origTimeout }()

	start := time.Now()
	err := ExecScript("sleep 60")
	elapsed := time.Since(start)

	if err == nil || !strings.Contains(err.Error(), "timed out") {
		t.Fatalf("expected timeout error, got: %v", err)
	}
	if elapsed > 3*time.Second {
		t.Fatalf("timeout took too long: %s", elapsed)
	}
}
