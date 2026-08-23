#!/usr/bin/env bash
# User-local (default) or system-wide install of niri-settings.
# Usage: ./install.sh [PREFIX]     PREFIX defaults to "$HOME/.local"
set -euo pipefail
cd "$(dirname "$0")"

PREFIX="${1:-$HOME/.local}"
BIN_DIR="$PREFIX/bin"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_BASE="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor"

[ "$(id -u)" -eq 0 ] && DATA_DIR="$PREFIX/share/applications" && ICON_BASE="$PREFIX/share/icons/hicolor"

install -Dm755 niri-settings "$BIN_DIR/niri-settings"
install -Dm755 niri-settings-sidecar "$BIN_DIR/niri-settings-sidecar"

for size in 32x32 128x128 256x256; do
  install -Dm644 "icons/$size.png" "$ICON_BASE/$size/apps/niri-settings.png"
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

echo "Installed:"
echo "  $BIN_DIR/niri-settings (+ sidecar)"
echo "  $DATA_DIR/niri-settings.desktop"
echo "Launch via your app launcher or: niri-settings"
