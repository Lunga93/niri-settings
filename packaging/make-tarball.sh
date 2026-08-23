#!/usr/bin/env bash
# Assemble the portable release tarball from a completed `tauri build`.
# Output: release/niri-settings-<ver>-linux-x86_64.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(grep -o '"version": "[^"]*"' src-tauri/tauri.conf.json | head -1 | cut -d'"' -f4)
OUT="release/niri-settings-$VERSION-linux-x86_64.tar.gz"
STAGE="release/stage"

mkdir -p "$STAGE/icons"
cp src-tauri/target/release/niri-settings "$STAGE/"
cp src-tauri/target/release/niri-settings-sidecar "$STAGE/"
cp src-tauri/icons/32x32.png "$STAGE/icons/"
cp src-tauri/icons/128x128.png "$STAGE/icons/"
cp src-tauri/icons/128x128@2x.png "$STAGE/icons/256x256.png"
cp packaging/install.sh packaging/uninstall.sh "$STAGE/"

cat > "$STAGE/README.md" <<EOF
# niri-settings $VERSION

Part of the Manatee Desktop experience for the niri Wayland compositor.

Install (user-local, no root):

    ./install.sh              # installs to ~/.local
    ./install.sh /usr/local   # or system-wide

Then launch "Niri Settings" from your app launcher, or run \`niri-settings\`.

Uninstall:

    ./uninstall.sh            # pass the same PREFIX you installed with
EOF

tar -czf "$OUT" -C "$STAGE" .
rm -rf "$STAGE"
echo "Created $OUT"
