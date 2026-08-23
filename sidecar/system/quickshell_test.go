package system

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const shellWithPragma = `//@ pragma UseQApplication
//@ pragma IconTheme Papirus
// Quickshell entry.

import QtQuick
import Quickshell
`

const shellWithoutPragma = `//@ pragma UseQApplication
// Quickshell entry.

import QtQuick
import Quickshell
`

func TestPatchIconThemePragmaReplacesExisting(t *testing.T) {
	got := patchIconThemePragma(shellWithPragma, "Cosmic")
	if strings.Count(got, "pragma IconTheme") != 1 {
		t.Fatalf("expected exactly one pragma:\n%s", got)
	}
	if !strings.Contains(got, "//@ pragma IconTheme Cosmic") {
		t.Errorf("pragma not replaced:\n%s", got)
	}
	if !strings.Contains(got, "pragma IconTheme Cosmic\n// Quickshell entry.") {
		t.Errorf("pragma moved out of place:\n%s", got)
	}
}

func TestPatchIconThemePragmaInsertsBeforeImports(t *testing.T) {
	got := patchIconThemePragma(shellWithoutPragma, "Papirus-Dark")
	if !strings.Contains(got, "//@ pragma IconTheme Papirus-Dark") {
		t.Errorf("pragma missing:\n%s", got)
	}
	pragmaIdx := strings.Index(got, "pragma IconTheme")
	importIdx := strings.Index(got, "\nimport QtQuick")
	if pragmaIdx > importIdx {
		t.Errorf("pragma must precede imports:\n%s", got)
	}
}

func TestSetQuickshellIconThemeWritesFile(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	qsDir := filepath.Join(dir, "quickshell")
	if err := os.MkdirAll(qsDir, 0755); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(qsDir, "shell.qml")
	if err := os.WriteFile(path, []byte(shellWithoutPragma), 0644); err != nil {
		t.Fatal(err)
	}

	if err := SetQuickshellIconTheme("Pop"); err != nil {
		t.Fatalf("SetQuickshellIconTheme: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "//@ pragma IconTheme Pop") {
		t.Errorf("file not patched:\n%s", data)
	}
}

func TestSetQuickshellIconThemeRejectsEmpty(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	if err := SetQuickshellIconTheme(""); err == nil {
		t.Error("empty theme should fail")
	}
}
