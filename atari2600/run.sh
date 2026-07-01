#!/bin/bash
# ==============================================================================
# run.sh - Run Pitfall 3 in Stella emulator
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROM_FILE="$SCRIPT_DIR/build/pitfall3.bin"

# Check if ROM exists
if [ ! -f "$ROM_FILE" ]; then
    echo "ROM not found. Building..."
    "$SCRIPT_DIR/build.sh"
fi

# Try to find and run Stella
if command -v stella &> /dev/null; then
    echo "Launching Stella emulator..."
    stella "$ROM_FILE"
elif command -v Stella &> /dev/null; then
    echo "Launching Stella emulator..."
    Stella "$ROM_FILE"
elif [ -f "/usr/bin/stella" ]; then
    echo "Launching Stella emulator..."
    /usr/bin/stella "$ROM_FILE"
elif [ -f "/usr/local/bin/stella" ]; then
    echo "Launching Stella emulator..."
    /usr/local/bin/stella "$ROM_FILE"
else
    echo ""
    echo "Stella emulator not found!"
    echo ""
    echo "Please install Stella or load the ROM manually:"
    echo "  ROM file: $ROM_FILE"
    echo ""
    echo "Stella download: https://stella-emu.github.io/"
    echo ""
    echo "Alternative emulators:"
    echo "  - Javatari (web-based)"
    echo "  - z26"
    echo "  - MESS/MAME"
    exit 1
fi
