# Pitfall 3: Asset Design Notes

## Sprite Graphics

### Player Character (16 scanlines)
```
Design: Adventurer/explorer
Colors: Multi-color cycling (orange → yellow → orange)
Animation: 4 frames
  - Frame 0: Standing
  - Frame 1: Walking (left foot forward)
  - Frame 2: Standing  
  - Frame 3: Walking (right foot forward)
```

**Pixel Pattern (Frame 0 - Standing)**:
```
   ..XX....    Scanline 0  (Head)
   .XXXX...    Scanline 1
   .XXXX...    Scanline 2
   ..XX....    Scanline 3
   .XXXX...    Scanline 4  (Body)
   XXXXXX..    Scanline 5
   XXXXXX..    Scanline 6
   .XXXX...    Scanline 7
   .XXXX...    Scanline 8
   .XXXX...    Scanline 9
   ..XX....    Scanline 10 (Legs)
   .XXXX...    Scanline 11
   XX..XX..    Scanline 12
   XX...XX.    Scanline 13
   X.....X.    Scanline 14
   X.....X.    Scanline 15
```

### Enemies

**Snake (8 scanlines)** - Red
```
XX....XX    Head with fangs
XXX..XXX    
XXXXXXXX    Body segments
.XXXXXX.    
..XXXX..    
...XX...    
..X..X..    Tail
.X....X.    
```

**Bat (8 scanlines)** - Purple
```
X.X..X.X    Wings spread
XXX..XXX    
XXXXXXXX    Body
.XX..XX.    
..XXXX..    Head
...XX...    
..X..X..    Feet
.X....X.    
```

**Spider (8 scanlines)** - Green
```
X.X..X.X    Legs (top)
XX....XX    
.XXXXXX.    Body
..XXXX..    
.X.XX.X.    
X......X    Legs (bottom)
..X..X..    
.X....X.    
```

**Scorpion (8 scanlines)** - Orange
```
....XXX.    Tail/stinger
...XX...    
.XXXXXX.    Body
XX....XX    Claws
.XXXXXX.    
..XXXX..    
.X....X.    Legs
X......X    
```

### Collectibles

**Gold Bar** - Using Missile sprite
```
Color: Yellow-gold ($E0, $F0)
Size: 4 pixels wide
Pattern: Solid block
Shimmer: Alternates between two yellows
```

**Artifact** - Using Missile sprite  
```
Color: Cyan ($98, $A8)
Size: 4 pixels wide
Pattern: Solid with sparkle effect
Animation: Rotate colors each frame
```

**Key** - Using Missile sprite
```
Color: Magenta ($68, $78)
Size: 4 pixels wide  
Pattern: Solid block
Pulse: Brightness varies
```

## Playfield Graphics

### Cavern Wall Patterns

**PF0** (4 bits, reversed): `$F`, `$E`, `$C`, `$8`
**PF1** (8 bits): `$FF`, `$EE`, `$CC`, `$88`, `$00`
**PF2** (8 bits, reversed): `$FF`, `$EE`, `$CC`, `$88`, `$00`

**Pattern 1: Solid Wall**
```
PF0 = $F0    ████
PF1 = $FF    ████████
PF2 = $FF    ████████
Result: Completely blocked
```

**Pattern 2: Platform**
```
PF0 = $00    ....
PF1 = $00    ........
PF2 = $FF    ████████
Result: Platform at right side
```

**Pattern 3: Pit**
```
PF0 = $F0    ████
PF1 = $00    ........
PF2 = $F0    ████....
Result: Gap in middle
```

**Pattern 4: Stalactites**
```
PF0 = $A0    █.█.
PF1 = $AA    █.█.█.█.
PF2 = $AA    █.█.█.█.
Result: Spiky ceiling
```

### Screen Layouts

**Screen 0: Entrance Cavern**
- Top: Solid ceiling with exit gap
- Middle: Large platform
- Bottom: Ground level
- Collectibles: 1 gold bar
- Enemies: 1 snake (patrol)

**Screen 1: The Drop**
- Top: Platform
- Middle: Empty space (long fall)
- Bottom: Platform with spikes
- Collectibles: 2 gold bars (risky positions)
- Enemies: None (hazard is the fall)

**Screen 2: Bat Alley**
- Top: Uneven ceiling
- Middle: Multiple small platforms
- Bottom: Lava pool
- Collectibles: 1 gold, 1 key
- Enemies: 2 bats (flying pattern)

**Screen 3: Spider's Lair**
- Top: Stalactites
- Middle: Wide platforms
- Bottom: Spike pit
- Collectibles: 1 artifact (hidden)
- Enemies: 3 spiders (ceiling drops)

**Screen 4: Boss Arena - Snake King**
- Top: High ledges
- Middle: Large open arena
- Bottom: Solid ground
- Collectibles: None (boss reward)
- Boss: Snake King

[Continues for screens 5-12...]

## Color Palettes

### NTSC Colors (Register Values)

**Cavern Walls**:
- Primary: `$84` (Brown)
- Secondary: `$74` (Darker brown)
- Accent: `$28` (Red-orange for hazards)

**Background**:
- Base: `$42` (Blue-green)
- Dark variation: `$02` (Black-blue)
- Light variation: `$62` (Light blue-green)

**Lava** (animated cycle):
- Frame 0: `$34` (Orange-red)
- Frame 1: `$36` (Brighter orange)
- Frame 2: `$38` (Bright orange)
- Frame 3: `$36` (Back to mid)

**Player Colors** (multi-color cycle):
- Base: `$2E` (Orange)
- Mid: `$4E` (Yellow-orange)
- Peak: `$6E` (Yellow)
- Mid: `$4E` (Yellow-orange back)

**Enemy Colors**:
- Snake: `$28` (Red)
- Bat: `$68` (Purple)
- Spider: `$D8` (Green)
- Scorpion: `$38` (Orange)

**Collectible Colors**:
- Gold: `$E0` / `$F0` (Yellow, shimmer)
- Artifact: `$98` / `$A8` (Cyan, pulse)
- Key: `$68` / `$78` (Magenta, glow)

### PAL Colors (Future)
PAL uses different color values:
- Add 16 to NTSC values for similar hues
- Test on PAL hardware/emulator
- Some colors shift significantly

## Sound Design

### Music Composition

**Exploration Theme** (Channel 0 melody):
```
Notes: C4, E4, G4, E4, C4, A3, C4, E4
Frequencies: 12, 14, 16, 14, 12, 10, 12, 14
Tempo: 8 frames per note (slow)
Waveform: Pure tone (AUDC0 = $0C)
```

**Exploration Theme** (Channel 1 bass):
```
Notes: C3, C3, G3, G3, C3, C3, G3, G3
Frequencies: 8, 8, 10, 10, 8, 8, 10, 10
Tempo: 8 frames per note
Waveform: Bass (AUDC1 = $06)
```

**Danger Theme** (faster tempo):
```
Same notes, but 4 frames per note
Add tremolo effect by varying volume
```

**Boss Theme**:
```
More complex pattern
Faster tempo (2 frames per note)
Higher pitch range
Alternate bass rhythms
```

### Sound Effects Specifications

**Jump**:
- Start Freq: 16
- End Freq: 8
- Duration: 8 frames
- Waveform: Pure tone
- Volume: 15 → 10 (fade)

**Collect Gold**:
- Frequency: 20
- Duration: 4 frames
- Waveform: Pure high
- Volume: 15 (constant)

**Player Hit**:
- Start Freq: 20
- End Freq: 4
- Duration: 16 frames
- Waveform: Noise
- Volume: 15 → 0 (fade out)

**Enemy Hit**:
- Frequency: 8
- Duration: 6 frames
- Waveform: Buzzy
- Volume: 12 (constant)

**Death**:
- Start Freq: 16
- End Freq: 2
- Duration: 60 frames (1 second)
- Waveform: Pure + Noise mix
- Volume: 15 → 0 (slow fade)

**Door Open**:
- Start Freq: 8
- End Freq: 12
- Duration: 20 frames
- Waveform: Bass
- Volume: 10 (constant)

**Stalactite Fall**:
- Start Freq: 20
- End Freq: 6
- Duration: 30 frames
- Waveform: White noise
- Volume: 8 → 12 (crescendo)

## Animation Cycles

### Player Walk Cycle
```
Frame 0 (8 frames) → Frame 1 (8 frames) → Frame 2 (8 frames) → Frame 3 (8 frames) → loop
Standing            Foot forward          Standing            Other foot forward
```

### Enemy Animations

**Snake Slither**:
```
2 frames alternating every 8 frames
Pattern shifts body segments
```

**Bat Flight**:
```
4 frames (wings flap)
Frame 0: Wings up
Frame 1: Wings mid
Frame 2: Wings down
Frame 3: Wings mid
8 frames per animation frame
```

**Spider Crawl**:
```
2 frames
Legs alternate positions
12 frames per animation frame
```

### Environmental Animations

**Lava Bubble**:
```
Color cycle: 4 frames
Bubble rise: Random Y positions
Frequency: Every 16-32 frames
```

**Stalactite Shake**:
```
Before fall: 8 frames of X-position wobble
Fall: Steady downward movement
Duration: Until hits ground or player
```

**Gold Shimmer**:
```
Alternate between two yellow shades
4 frames per color
Continuous loop
```

## Level Data Format

Each screen stored as:
```
Screen Data Structure (32 bytes):
  Bytes 0-7:   PF0 patterns (8 rows)
  Bytes 8-15:  PF1 patterns (8 rows)
  Bytes 16-23: PF2 patterns (8 rows)
  Bytes 24-27: Enemy positions (4 enemies max)
  Bytes 28-30: Collectible positions
  Byte 31:     Special flags (boss, lava, etc.)
```

Total: 12 screens × 32 bytes = 384 bytes of level data

## Future Asset Ideas

### Additional Enemies
- Mole (burrows, pops up)
- Crystal Golem (slow, heavy)
- Shadow Bat (invisible phases)

### Power-ups
- Torch (lights dark areas)
- Rope (swing across gaps)
- Shield (one-hit protection)
- Speed Boots (faster movement)

### Visual Effects
- Screen shake on boulder impact
- Flash on item collect
- Fade transitions between screens
- Particle burst on enemy defeat

---

**Design Philosophy**: Keep it simple, iconic, and readable even on old TVs. The Atari 2600's limitations breed creativity!
