#!/usr/bin/env bash
# Remove a niri-settings install. Usage: ./uninstall.sh [PREFIX]
set -euo pipefail

PREFIX="${1:-$HOME/.local}"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_BASE="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor"

[ "$(id -u)" -eq 0 ] && DATA_DIR="$PREFIX/share/applications" && ICON_BASE="$PREFIX/share/icons/hicolor"

rm -f "$PREFIX/bin/niri-settings" "$PREFIX/bin/niri-settings-sidecar"
rm -f "$DATA_DIR/niri-settings.desktop"
rm -f "$ICON_BASE"/{32x32,128x128,256x256}/apps/niri-settings.png

command -v update-desktop-database >/dev/null && update-desktop-database "$DATA_DIR" || true
echo "niri-settings removed from $PREFIX"
