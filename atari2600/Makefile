# ==============================================================================
# Pitfall 3: The Kister Caverns - Makefile
# ==============================================================================

# Assembler
DASM = dasm

# Source files
SRC_DIR = src
BUILD_DIR = build
MAIN_SRC = $(SRC_DIR)/pitfall3.asm

# Output files
ROM_NAME = pitfall3
ROM_FILE = $(BUILD_DIR)/$(ROM_NAME).bin
LIST_FILE = $(BUILD_DIR)/$(ROM_NAME).lst
SYMBOL_FILE = $(BUILD_DIR)/$(ROM_NAME).sym

# Assembler flags
DASM_FLAGS = -f3 -v0 -s$(SYMBOL_FILE) -l$(LIST_FILE)

# Default target
all: $(ROM_FILE) info

# Create build directory
$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

# Assemble the ROM
$(ROM_FILE): $(MAIN_SRC) $(BUILD_DIR)
	@echo "Assembling $(MAIN_SRC)..."
	$(DASM) $(MAIN_SRC) $(DASM_FLAGS) -o$(ROM_FILE)
	@echo "ROM created: $(ROM_FILE)"

# Display ROM information
info: $(ROM_FILE)
	@echo ""
	@echo "===================================="
	@echo "  Pitfall 3: The Kister Caverns"
	@echo "===================================="
	@ls -lh $(ROM_FILE) | awk '{print "  ROM Size: " $$5}'
	@echo "  Format:   Atari 2600 (4K)"
	@echo "===================================="
	@echo ""

# Run in Stella emulator (if installed)
run: $(ROM_FILE)
	@if command -v stella >/dev/null 2>&1; then \
		echo "Launching Stella emulator..."; \
		stella $(ROM_FILE); \
	else \
		echo "Stella emulator not found."; \
		echo "Install Stella or manually load: $(ROM_FILE)"; \
	fi

# Clean build files
clean:
	@echo "Cleaning build files..."
	@rm -rf $(BUILD_DIR)
	@echo "Clean complete."

# Rebuild from scratch
rebuild: clean all

# Help target
help:
	@echo "Pitfall 3: The Kister Caverns - Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  make          - Build the ROM (default)"
	@echo "  make all      - Build ROM and show info"
	@echo "  make run      - Build and run in Stella emulator"
	@echo "  make clean    - Remove all build files"
	@echo "  make rebuild  - Clean and rebuild"
	@echo "  make help     - Show this help message"
	@echo ""
	@echo "Requirements:"
	@echo "  - dasm (6502 assembler)"
	@echo "  - stella (optional, for testing)"

.PHONY: all info run clean rebuild help
