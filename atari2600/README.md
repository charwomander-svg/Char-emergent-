# Pitfall 3: The Kister Caverns

**An Atari 2600 Homebrew Game**

A technical showcase demonstrating the advanced capabilities of the Atari 2600 through sophisticated graphics and audio techniques.

![Atari 2600](docs/atari2600-badge.svg)

## 🎮 About

Pitfall 3: The Kister Caverns is a homebrew continuation of the legendary Pitfall series, built from scratch in 6502 assembly language. This game pushes the Atari 2600 to its limits, showcasing programming techniques that demonstrate why the VCS remains a fascinating platform for retro computing enthusiasts.

## ✨ Features

### Advanced Graphics Engine
- **Sprite Multiplexing** - Display 8+ objects simultaneously, exceeding the hardware's 5-object limit
- **Multi-color Sprites** - Dynamic color cycling creates rainbow effects on characters
- **Asymmetric Playfield** - Detailed cavern layouts using mirrored/repeated modes
- **Color Palette Animation** - Living environments through frame-by-frame color shifts
- **Parallax Scrolling** - Depth simulation through multi-speed background scrolling
- **Venetian Blinds Effect** - Scanline alternation for atmospheric depth

### Audio System
- **2-Channel Music Composition** - Melodic lead and bass/percussion on separate channels
- **Dynamic Audio Mixing** - Context-aware music themes (exploration, danger, boss)
- **Layered Sound Effects** - Jump, collect, hit, and death sounds
- **Procedural Audio** - Frequency sweeps for cavern ambience
- **Audio-Visual Sync** - Sound effects timed with sprite animations

### Gameplay
- **Fluid Movement** - Running and jumping with realistic physics
- **Multi-Screen Exploration** - 12 interconnected cavern chambers
- **Collectibles** - Gold bars, artifacts, and keys
- **Dynamic Hazards** - Pits, stalactites, rising lava, rolling boulders
- **Enemies** - Snakes, bats, and spiders with AI behaviors
- **Boss Encounters** - Multi-sprite bosses in key chambers
- **Lives & Scoring** - Traditional arcade-style progression

## 🛠️ Technical Details

### System Requirements
- **Console**: Atari 2600 / Atari VCS
- **ROM Size**: 4KB (standard cartridge)
- **Format**: NTSC (PAL compatible planned)
- **Controllers**: Joystick (1 player)

### Memory Optimization
- **RAM Usage**: Efficient use of 128 bytes of RAM
- **Lookup Tables**: Sine/cosine tables for smooth movement
- **Compressed Level Data**: Run-length encoding for level storage
- **Shared Sprite Data**: Object reuse to minimize ROM usage

### Advanced Techniques Demonstrated
1. **Kernel Manipulation** - Custom display kernels for varied screen layouts
2. **Precise Timing** - Cycle-counted scanline rendering (76 cycles per line)
3. **Sprite Positioning** - Hardware position registers with fine-tuning
4. **Collision Detection** - Hardware collision latches for fast interaction
5. **Color Streaming** - Mid-frame color changes for visual variety
6. **Audio Synthesis** - TIA sound channel manipulation

## 📦 Building from Source

### Prerequisites
- **dasm** - 6502 assembler ([download](https://github.com/dasm-assembler/dasm))
- **make** - Build automation tool (optional)
- **Stella** - Atari 2600 emulator for testing (optional) ([download](https://stella-emu.github.io/))

### Quick Build

```bash
# Clone the repository
cd atari2600/

# Build using the shell script
./build.sh

# Or use make
make

# Build and run in Stella emulator
./run.sh
# or
make run
```

### Build Output
- `build/pitfall3.bin` - ROM file (4096 bytes)
- `build/pitfall3.sym` - Symbol table for debugging
- `build/pitfall3.lst` - Assembly listing with addresses

## 🎯 How to Play

### Controls
- **Joystick Up** - Jump
- **Joystick Left/Right** - Move left/right
- **Fire Button** - Jump (alternative)

### Objective
Navigate through the Kister Caverns, collecting treasures while avoiding hazards and enemies. Reach the deepest chamber and defeat the final boss to win!

### Gameplay Tips
- Time your jumps carefully over pits and lava
- Collect gold bars for bonus points
- Watch for falling stalactites triggered by movement
- Some enemies follow patterns - learn them to avoid damage
- Keys unlock barricaded passages
- The lava rises over time - keep moving!

## 🔧 Development

### Project Structure
```
atari2600/
├── src/
│   ├── pitfall3.asm      # Main game source (6502 assembly)
│   └── vcs.h             # TIA/RIOT register definitions
├── build/                # Build output directory
├── docs/                 # Documentation
├── assets/               # Graphics/sound design notes
├── Makefile             # Build automation
├── build.sh             # Build script
└── run.sh               # Run script
```

### Memory Map
```
$0000-$007F : TIA registers (read/write)
$0080-$00FF : RAM (128 bytes)
$0280-$0297 : RIOT registers
$F000-$FFFF : ROM (4KB)
```

### Key Variables (RAM $80-$FF)
- Player position and velocity
- Enemy positions and states (8 enemies)
- Collectible positions (4 gold bars)
- Screen/level tracking
- Music and sound effect state
- Color cycling and animation counters
- Playfield data buffers

## 📚 Learning Resources

### Atari 2600 Programming
- [Atari 2600 Programming Guide](http://www.atariarchives.org/2bpg/)
- [Stella Programmer's Guide](https://atarihq.com/danb/files/stella.pdf)
- [6502 Assembly Reference](http://www.6502.org/tutorials/)
- [Racing the Beam Book](https://mitpress.mit.edu/books/racing-beam)

### Tools
- [dasm Assembler](https://github.com/dasm-assembler/dasm)
- [Stella Emulator](https://stella-emu.github.io/)
- [Atari Age Forums](https://atariage.com/forums/forum/65-atari-2600-programming/)

## 🎨 Graphics Breakdown

### Sprite Design
All sprites are 8 pixels wide and use single-bit patterns:
- **Player**: 16 scanlines tall, animated frames
- **Enemies**: 8 scanlines, multiple types
- **Collectibles**: Rendered via missile sprites

### Playfield Layout
The playfield uses three registers (PF0, PF1, PF2) that can be:
- **Mirrored** - Left half mirrors to right
- **Repeated** - Same pattern on both sides
- **Asymmetric** - Different patterns per side (advanced)

### Color Palette
Carefully selected NTSC color values for:
- Cavern walls: Earth tones ($84, $74, $64)
- Lava: Animated reds/oranges ($34, $36, $38)
- Character: Multi-color cycling ($2E, $4E, $6E)
- Collectibles: Bright yellows ($E0, $F0)

## 🎵 Audio Breakdown

### Music System
**Channel 0 (AUDC0)** - Melody
- Pure tone waveform (value $0C)
- 16-step melodic pattern
- Frequencies: 8-20 Hz range

**Channel 1 (AUDC1)** - Bass/Percussion
- Bass waveform (value $06)
- 8-step rhythmic pattern
- Lower frequencies for depth

### Sound Effects
- **Jump**: Frequency sweep up
- **Collect**: High-pitched ding
- **Hit**: Descending noise
- **Death**: Long falling tone
- **Victory**: Ascending arpeggio

## 🚀 Running on Real Hardware

### Using a Flash Cartridge
1. Copy `build/pitfall3.bin` to your Harmony/UnoCart/etc.
2. Insert cartridge into Atari 2600
3. Power on and enjoy!

### Compatibility
- **NTSC**: Fully tested and optimized
- **PAL**: Should work but may have timing differences
- **SECAM**: Should work (black & white)

## 📄 License

This is a homebrew project created for educational and entertainment purposes. The game is free to play and distribute.

**Note**: Pitfall is a trademark of Activision. This is an unofficial fan project not affiliated with or endorsed by Activision.

## 🙏 Acknowledgments

- Atari and the original VCS engineering team for creating an incredible system
- David Crane for the original Pitfall! series
- The AtariAge community for keeping 2600 development alive
- dasm development team for the excellent assembler
- Stella team for the premier emulator

## 📧 Contact

For questions, suggestions, or to share your high scores:
- Open an issue on GitHub
- Share on AtariAge forums
- Tweet with #Pitfall3

---

**Built with ❤️ for the Atari 2600**

*"Some treasures are worth the risk..."*
