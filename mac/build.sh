#!/usr/bin/env bash
# Builds "build/Run My Agents.app" next to this script.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
board="${RUN_MY_AGENTS_BOARD:-$(cd "$here/../services/app/board" && pwd)}"
out="$here/build"; app="$out/Run My Agents.app"
rm -rf "$app"; mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" "$out/tmp"

# icon
swiftc -O "$here/icon/render-icon.swift" -o "$out/tmp/render-icon"
"$out/tmp/render-icon" "$out/tmp/icon-1024.png"
set_dir="$out/tmp/AppIcon.iconset"; rm -rf "$set_dir"; mkdir -p "$set_dir"
for s in 16 32 128 256 512; do
  sips -z $s $s "$out/tmp/icon-1024.png" --out "$set_dir/icon_${s}x${s}.png" >/dev/null
  d=$((s*2)); sips -z $d $d "$out/tmp/icon-1024.png" --out "$set_dir/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$set_dir" -o "$app/Contents/Resources/AppIcon.icns"
cp "$out/tmp/icon-1024.png" "$here/icon/icon-1024.png"

# binary (bake the board dir)
sed "s|__BAKED_BOARD_DIR__|$board|" "$here/RunMyAgents.swift" > "$out/tmp/main.swift"
swiftc -O "$out/tmp/main.swift" -o "$app/Contents/MacOS/RunMyAgents" -framework AppKit -framework WebKit

cat > "$app/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Run My Agents</string>
  <key>CFBundleDisplayName</key><string>Run My Agents</string>
  <key>CFBundleIdentifier</key><string>sh.flisk.run-my-agents</string>
  <key>CFBundleExecutable</key><string>RunMyAgents</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSPrincipalClass</key><string>NSApplication</string>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
codesign --force --deep -s - "$app"
echo "Built: $app (board: $board)"
