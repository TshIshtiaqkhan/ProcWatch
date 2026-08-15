#!/usr/bin/env bash
set -e

# ProcWatch Linux One-Line Installer
REPO="Ishtiaqkh4n/ProcWatch"
GITHUB_API="https://api.github.com/repos/${REPO}/releases/latest"

echo "========================================="
echo "       Installing ProcWatch Desktop      "
echo "========================================="

# 1. Architecture check
ARCH=$(uname -m)
if [ "$ARCH" != "x86_64" ]; then
    echo "❌ Error: ProcWatch is currently only supported on x86_64 (amd64) architecture."
    exit 1
fi

# 2. Check for sudo / root privileges
if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
    if ! command -v sudo >/dev/null 2>&1; then
        echo "❌ Error: This installer requires root or sudo privileges."
        exit 1
    fi
else
    SUDO=""
fi

# 3. Detect latest release URL
echo "🔍 Fetching latest ProcWatch release..."
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

RELEASE_DATA=$(curl -sSL "$GITHUB_API" 2>/dev/null || true)

# 4. Check Linux Distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO_ID=${ID:-unknown}
    DISTRO_LIKE=${ID_LIKE:-unknown}
else
    DISTRO_ID="unknown"
    DISTRO_LIKE="unknown"
fi

# 5. Determine installation method (Debian/Ubuntu .deb vs AppImage)
IS_DEBIAN=false
if [[ "$DISTRO_ID" =~ (ubuntu|debian|linuxmint|pop|elementary|zorin) ]] || [[ "$DISTRO_LIKE" =~ (ubuntu|debian) ]]; then
    IS_DEBIAN=true
fi

if [ "$IS_DEBIAN" = true ]; then
    echo "📦 Detected Debian/Ubuntu-based distribution (${NAME:-Linux})."
    
    DEB_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url.*\.deb" | cut -d : -f 2,3 | tr -d '\" ' | head -n 1)
    
    if [ -z "$DEB_URL" ]; then
        # Fallback to direct URL pattern
        DEB_URL="https://github.com/${REPO}/releases/latest/download/procwatch_amd64.deb"
    fi

    echo "⬇️  Downloading Debian package: $DEB_URL"
    curl -fSL "$DEB_URL" -o "$TEMP_DIR/procwatch.deb" || {
        echo "⚠️  Direct .deb download failed, falling back to AppImage install..."
        IS_DEBIAN=false
    }
    
    if [ "$IS_DEBIAN" = true ]; then
        echo "⚙️  Installing ProcWatch via apt (auto-resolving dependencies)..."
        $SUDO apt-get update -qq
        $SUDO apt-get install -y "$TEMP_DIR/procwatch.deb"
        echo "✅ ProcWatch has been successfully installed!"
        echo "🚀 Launch it by searching 'ProcWatch' in your application menu or running 'procwatch' in the terminal."
        exit 0
    fi
fi

# AppImage Fallback for Fedora, Arch, openSUSE, etc.
echo "📦 Installing Universal AppImage..."
APPIMAGE_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url.*\.AppImage" | cut -d : -f 2,3 | tr -d '\" ' | head -n 1)

if [ -z "$APPIMAGE_URL" ]; then
    APPIMAGE_URL="https://github.com/${REPO}/releases/latest/download/ProcWatch.AppImage"
fi

echo "⬇️  Downloading AppImage..."
curl -fSL "$APPIMAGE_URL" -o "$TEMP_DIR/ProcWatch.AppImage"
chmod +x "$TEMP_DIR/ProcWatch.AppImage"

# Install binary to /usr/local/bin
$SUDO mkdir -p /usr/local/bin
$SUDO mv "$TEMP_DIR/ProcWatch.AppImage" /usr/local/bin/procwatch

# Install required system tools if missing
if command -v pacman >/dev/null 2>&1; then
    echo "⚙️  Checking required tools via pacman..."
    $SUDO pacman -S --needed --noconfirm xdotool wmctrl xorg-xprop 2>/dev/null || true
elif command -v dnf >/dev/null 2>&1; then
    echo "⚙️  Checking required tools via dnf..."
    $SUDO dnf install -y xdotool wmctrl xorg-x11-utils 2>/dev/null || true
elif command -v zypper >/dev/null 2>&1; then
    echo "⚙️  Checking required tools via zypper..."
    $SUDO zypper install -y xdotool wmctrl xprop 2>/dev/null || true
fi

# Create .desktop launcher entry
$SUDO mkdir -p /usr/share/applications
cat << 'EOF' | $SUDO tee /usr/share/applications/procwatch.desktop > /dev/null
[Desktop Entry]
Name=ProcWatch
Comment=Offline application time and productivity tracker
Exec=/usr/local/bin/procwatch
Terminal=false
Type=Application
Categories=Utility;
EOF

echo "========================================="
echo "✅ ProcWatch installed to /usr/local/bin/procwatch"
echo "🚀 You can now run 'procwatch' from your terminal or application launcher!"
echo "========================================="
