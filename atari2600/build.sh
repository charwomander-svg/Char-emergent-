#!/bin/bash
# ==============================================================================
# build.sh - Build script for Pitfall 3: The Loster Caverns
# ==============================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo " Building Pitfall 3: The Loster Caverns"
echo "========================================"
echo ""

# Check for dasm
if ! command -v dasm &> /dev/null; then
    echo "ERROR: dasm assembler not found!"
    echo "Please install dasm to build this project."
    echo ""
    echo "Installation:"
    echo "  git clone https://github.com/dasm-assembler/dasm.git"
    echo "  cd dasm && make && sudo make install"
    exit 1
fi

# Create build directory
mkdir -p build

# Assemble the ROM
echo "Assembling source code..."
dasm src/pitfall3.asm -f3 -v0 -obuild/pitfall3.bin -sbuild/pitfall3.sym -lbuild/pitfall3.lst

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Build successful!"
    echo ""
    
    # Display file info
    ROM_SIZE=$(wc -c < build/pitfall3.bin)
    echo "ROM created: build/pitfall3.bin"
    echo "ROM size: $ROM_SIZE bytes"
    
    if [ $ROM_SIZE -eq 4096 ]; then
        echo "Format: Standard 4K Atari 2600 cartridge"
    elif [ $ROM_SIZE -eq 8192 ]; then
        echo "Format: 8K Atari 2600 cartridge (with bank switching)"
    else
        echo "Format: Custom size"
    fi
    
    echo ""
    echo "Symbol table: build/pitfall3.sym"
    echo "Listing file: build/pitfall3.lst"
    echo ""
    echo "To run: ./run.sh"
    echo "        or load build/pitfall3.bin in your preferred emulator"
else
    echo ""
    echo "✗ Build failed!"
    exit 1
fi
