#!/usr/bin/env bash
# Build niri-settings from source and install to ~/.local (or $PREFIX).
# Usage: ./build-install.sh [PREFIX]     PREFIX defaults to "$HOME/.local"
set -euo pipefail
cd "$(dirname "$0")"

PREFIX="${1:-$HOME/.local}"
BIN_DIR="$PREFIX/bin"
SIDECAR_SRC="src-tauri/binaries/niri-settings-sidecar-x86_64-unknown-linux-gnu"
RELEASE_BIN="src-tauri/target/release/niri-settings"

echo "==> Building Go sidecar..."
go build -o "$SIDECAR_SRC" ./sidecar

echo "==> Building Tauri release (bundles frontend)..."
npx tauri build

echo "==> Installing to $PREFIX..."
install -Dm755 "$RELEASE_BIN" "$BIN_DIR/niri-settings"
install -Dm755 "$SIDECAR_SRC" "$BIN_DIR/niri-settings-sidecar"

DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_BASE="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor"

if [ "$(id -u)" -eq 0 ]; then
  DATA_DIR="$PREFIX/share/applications"
  ICON_BASE="$PREFIX/share/icons/hicolor"
fi

for size in 32x32 128x128 256x256; do
  install -Dm644 "src-tauri/icons/$size.png" "$ICON_BASE/$size/apps/niri-settings.png"
done

mkdir -p "$DATA_DIR"
cat > "$DATA_DIR/niri-settings.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Niri Settings
Comment=Settings companion for the niri Wayland compositor — part of Manatee Desktop
Exec=$BIN_DIR/niri-settings
Icon=niri-settings
Terminal=false
Categories=Settings;DesktopSettings;Utility;
Keywords=niri;settings;wallpaper;appearance;display;
StartupWMClass=niri-settings
EOF

command -v update-desktop-database >/dev/null && update-desktop-database "$DATA_DIR" || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -qtf "$ICON_BASE/.." || true

echo ""
echo "Installed:"
echo "  $BIN_DIR/niri-settings"
echo "  $BIN_DIR/niri-settings-sidecar"
echo "  $DATA_DIR/niri-settings.desktop"
echo ""
echo "Launch via your app launcher or run: niri-settings"
