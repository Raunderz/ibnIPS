#!/usr/bin/env bash
# build.sh — rebuild ibnIPS debug APK and optionally install to device
# Usage:
#   ./build.sh          — build only
#   ./build.sh install  — build + adb install
#   ./build.sh release  — build release APK (R8 shrunk)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

MODE="${1:-debug}"

echo -e "${CYAN}${BOLD}==> ibnIPS build script${RESET}"
echo -e "${CYAN}    mode: ${MODE}${RESET}"
echo ""

# ── Build ──────────────────────────────────────────────────────────────
if [[ "$MODE" == "release" ]]; then
    echo -e "${BOLD}Building release APK (R8 shrinking)...${RESET}"
    ./gradlew clean assembleRelease --no-daemon
    APK="app/build/outputs/apk/release/app-release.apk"
else
    echo -e "${BOLD}Building debug APK...${RESET}"
    ./gradlew assembleDebug --no-daemon
    APK="app/build/outputs/apk/debug/app-debug.apk"
fi

# ── Size report ────────────────────────────────────────────────────────
echo ""
SIZE=$(du -sh "$APK" | cut -f1)
echo -e "${GREEN}${BOLD}✓ BUILD SUCCESSFUL${RESET}"
echo -e "  APK : ${APK}"
echo -e "  Size: ${SIZE}"

# ── Optional install ───────────────────────────────────────────────────
if [[ "$MODE" == "install" ]]; then
    echo ""
    if ! command -v adb &>/dev/null; then
        echo -e "${RED}adb not found in PATH — skipping install${RESET}"
        exit 0
    fi

    DEVICES=$(adb devices | grep -v "List of" | grep "device$" | wc -l)
    if [[ "$DEVICES" -eq 0 ]]; then
        echo -e "${RED}No device connected — skipping install${RESET}"
        exit 0
    fi

    echo -e "${BOLD}Forwarding port 3000 (device → localhost)...${RESET}"
    adb reverse tcp:3000 tcp:3000

    echo -e "${BOLD}Installing APK...${RESET}"
    adb install -r "$APK"

    echo ""
    echo -e "${GREEN}${BOLD}✓ Installed — launch ibnIPS on your device${RESET}"
    echo -e "  Logs: adb logcat -s ibnIPS ibnIPS-HTTP ibnIPS-Wifi"
fi
