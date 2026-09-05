#!/usr/bin/env bash
set -e

SDK_DIR="/opt/android-sdk"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

echo "Setting up Android SDK in $SDK_DIR..."
mkdir -p "$SDK_DIR"

if [ ! -f "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "Downloading Android command line tools..."
  mkdir -p /tmp/cmdline-tools
  curl -sS -L "$CMDLINE_TOOLS_URL" -o /tmp/cmdline-tools.zip
  unzip -q -o /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-extracted
  mkdir -p "$SDK_DIR/cmdline-tools/latest"
  cp -r /tmp/cmdline-tools-extracted/cmdline-tools/* "$SDK_DIR/cmdline-tools/latest/"
  rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools /tmp/cmdline-tools-extracted
fi

# Pre-accept all Android SDK licenses
mkdir -p "$SDK_DIR/licenses"
echo -e "24333f8a63b6825ea9c5514f83c2829b004d1fee\nd56f5187479451eabf01fb78af6dfcb131a6481e" > "$SDK_DIR/licenses/android-sdk-license"
echo -e "84831b9409646a2b8eac4a4249e9d69045248c70" > "$SDK_DIR/licenses/android-sdk-preview-license"

echo "Installing platform-tools, platforms;android-34, build-tools;34.0.0..."
yes | "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1 || true

echo "Writing android/local.properties..."
echo "sdk.dir=$SDK_DIR" > android/local.properties

echo "Android SDK setup complete!"
