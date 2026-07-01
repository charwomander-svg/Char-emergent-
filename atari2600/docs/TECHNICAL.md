# Pitfall 3: Technical Documentation

## Memory Map

### Zero Page RAM ($80-$FF) - 128 bytes
```
$80-$81   System Variables
  $80     FrameCounter       ; Frame counter (rolls over)
  $81     RandomSeed         ; PRNG seed

$82-$89   Player Variables (8 bytes)
  $82     PlayerX            ; X position (coarse)
  $83     PlayerXFine        ; X position (fine)
  $84     PlayerY            ; Y position
  $85     PlayerFrame        ; Animation frame
  $86     PlayerVelY         ; Vertical velocity
  $87     PlayerOnGround     ; Ground flag
  $88     PlayerDirection    ; 0=left, 1=right
  $89     Lives              ; Lives remaining

$8A-$91   Score Variables (8 bytes)
  $8A-$8B Score              ; BCD score (2 bytes)
  $8C-$91 ScoreDisplay       ; 6-digit display buffer

$92-$A9   Enemy Variables (24 bytes)
  $92-$99 EnemyX             ; X positions (8 enemies)
  $9A-$A1 EnemyY             ; Y positions
  $A2-$A9 EnemyType          ; Type codes

$AA-$B1   Enemy Variables cont. (8 bytes)
  $AA-$B1 EnemyActive        ; Active flags
  $B2-$B9 EnemyFrame         ; Animation frames

$BA-$C1   Collectible Variables (8 bytes)
  $BA-$BD GoldX              ; Gold X positions (4)
  $BE-$C1 GoldY              ; Gold Y positions (4)

$C2-$C5   Collectible Variables cont.
  $C2-$C5 GoldActive         ; Active flags (4)

$C6-$CB   Level/Screen Variables
  $C6     CurrentScreen      ; Screen number (0-11)
  $C7     ScreenTransition   ; Transition state
  $C8     LavaHeight         ; Rising lava Y
  $C9     LavaColor          ; Lava color index

$CC-$D1   Audio Variables
  $CC     MusicNote0         ; Channel 0 note
  $CD     MusicNote1         ; Channel 1 note
  $CE     MusicTempo         ; Tempo counter
  $CF     MusicPhase         ; Music section
  $D0     SFXCounter         ; SFX duration
  $D1     SFXType            ; SFX type code

$D2-$D7   Graphics Variables
  $D2     ColorCycle         ; Color cycle counter
  $D3     BGColor            ; Background base
  $D4     PFColor1           ; Playfield color 1
  $D5     PFColor2           ; Playfield color 2
  $D6     SpriteColor0       ; Player color
  $D7     SpriteColor1       ; Enemy color

$D8-$EF   Playfield Data (24 bytes)
  $D8-$DF PF0Data            ; PF0 per row
  $E0-$E7 PF1Data            ; PF1 per row
  $E8-$EF PF2Data            ; PF2 per row

$F0-$F5   Temporary Variables
  $F0     Temp               ; General temp
  $F1     Temp2              ; General temp
  $F2     LoopCounter        ; Loop iterator
  $F3     ScanlineCount      ; Current scanline
```

## ROM Layout ($F000-$FFFF) - 4KB

```
$F000-$F0FF   Initialization & Main Loop
$F100-$F3FF   Display Kernel & Graphics Routines
$F400-$F5FF   Game Logic & Physics
$F600-$F7FF   AI & Collision Detection
$F800-$F9FF   Audio System
$FA00-$FBFF   Level Data & Sprite Graphics
$FC00-$FDFF   Additional Level Data
$FE00-$FFF9   Music Tables & Constants
$FFFA-$FFFF   Interrupt Vectors
```

## Display Kernel

### Timing Overview
The Atari 2600 uses NTSC timing:
- 262 total scanlines per frame (~60Hz)
- 3 scanlines for VSYNC
- 37 scanlines for VBLANK (setup time)
- 192 visible scanlines (gameplay area)
- 30 scanlines for OVERSCAN

Each scanline has 76 color clocks (76 CPU cycles at 1.19MHz).

### Kernel Structure

```
Frame:
  VSYNC (3 scanlines)
    - Set VSYNC register
    - Wait 3 scanlines
    - Clear VSYNC
    
  VBLANK (37 scanlines)
    - Set VBLANK register
    - Position sprites horizontally
    - Update music/SFX
    - Prepare next frame data
    - Wait for timer
    - Clear VBLANK
    
  VISIBLE (192 scanlines)
    - Loop through 192 scanlines
    - Each scanline:
      * Set playfield registers (PF0/PF1/PF2)
      * Set playfield colors (COLUPF)
      * Set background color (COLUBK)
      * Check player sprite position
      * Check enemy sprite position
      * Check missile positions (gold)
      * Apply lava effect if below threshold
      * WSYNC to finish scanline
    
  OVERSCAN (30 scanlines)
    - Set VBLANK register
    - Run game logic
    - Process input
    - Update positions
    - Check collisions
    - Wait for timer
```

## Graphics Techniques

### 1. Sprite Multiplexing

The TIA can only display 5 objects at once:
- Player 0 (P0)
- Player 1 (P1)
- Missile 0 (M0)
- Missile 1 (M1)
- Ball (BL)

To show 8+ enemies, we use **time-division multiplexing**:
- Different enemies drawn on different scanlines
- Creates flicker effect but allows more objects
- Human eye integrates the flickering into solid objects

Implementation:
```assembly
; Pseudo-code for multiplexing
ScanlineLoop:
    EnemySlot = Scanline MOD NumEnemies
    IF EnemyY[EnemySlot] == CurrentScanline
        Draw Enemy[EnemySlot] sprite
    ENDIF
```

### 2. Multi-Color Sprites

Change sprite colors mid-sprite for rainbow effect:

```assembly
; Example from player drawing
lda ScanlineCount
and #$03           ; Cycle every 4 scanlines
tax
lda PlayerColors,x ; Load color from table
sta COLUP0         ; Set player 0 color
```

Color table:
```assembly
PlayerColors:
    .byte #$2E     ; Orange
    .byte #$4E     ; Yellow-orange
    .byte #$6E     ; Yellow
    .byte #$4E     ; Yellow-orange (back)
```

### 3. Asymmetric Playfield

The playfield is 40 pixels wide and uses 20 bits:
- PF0: 4 bits (reversed)
- PF1: 8 bits
- PF2: 8 bits (reversed)

Can be set to:
- **CTRLPF=0**: Repeat (same on both sides)
- **CTRLPF=1**: Mirror (reflected)
- Change PF mid-screen for asymmetric layouts

### 4. Color Cycling Animation

Animate environmental features by cycling colors:

```assembly
; Lava animation
lda FrameCounter
and #$03           ; 4-frame cycle
tax
lda LavaColors,x   ; Get color
sta COLUBK         ; Set background
```

### 5. Parallax Scrolling

Simulate depth by scrolling different layers at different speeds:
- Far background: Slow scroll (every 4 frames)
- Mid ground: Medium scroll (every 2 frames)
- Foreground: Fast scroll (every frame)

Achieved by updating playfield at different rates.

## Audio System

### TIA Audio Channels

The TIA has 2 audio channels, each with 3 registers:
- **AUDCx**: Control (selects waveform)
- **AUDFx**: Frequency (0-31)
- **AUDVx**: Volume (0-15)

### Waveform Types (AUDCx values)

Common values:
- `$00`: Silence
- `$04`: Pure tone (melody)
- `$06`: Bass tone
- `$08`: Noise (effects)
- `$0C`: Buzzy tone
- `$0F`: Pure high pitch

### Music Implementation

```assembly
UpdateMusic:
    ; Check tempo
    lda MusicTempo
    and #$07           ; Update every 8 frames
    bne NoMusicUpdate
    
    ; Channel 0 - Melody
    ldx MusicNote0
    lda MelodyTable,x  ; Get frequency
    sta AUDF0
    lda #$0C          ; Pure tone
    sta AUDC0
    lda #8            ; Volume
    sta AUDV0
    
    ; Channel 1 - Bass
    ldx MusicNote1
    lda BassTable,x
    sta AUDF1
    lda #$06          ; Bass waveform
    sta AUDC1
    lda #6            ; Lower volume
    sta AUDV1
    
    ; Advance notes
    inc MusicNote0
    inc MusicNote1
```

### Sound Effects

SFX temporarily override music on one channel:

```assembly
; Jump sound effect
PlayJumpSFX:
    lda #16           ; Duration
    sta SFXCounter
    lda #1            ; Jump type
    sta SFXType

; In UpdateMusic:
    lda SFXCounter
    beq NoSFX
    dec SFXCounter
    
    ; Frequency sweep for jump
    lda SFXCounter
    sta AUDF0
    lda #$08
    sta AUDC0
    lda #$0F
    sta AUDV0
```

## Physics & Collision

### Gravity System

```assembly
; Apply gravity each frame
PlayerVelY += 2        ; Gravity constant
PlayerY += PlayerVelY  ; Apply velocity

; Ground check
IF PlayerY >= GroundLevel
    PlayerY = GroundLevel
    PlayerVelY = 0
    PlayerOnGround = TRUE
ENDIF

; Jump
IF FireButton AND PlayerOnGround
    PlayerVelY = -8    ; Negative = upward
    PlayerOnGround = FALSE
ENDIF
```

### Horizontal Positioning

The TIA uses a timing-based positioning system:

```assembly
SetHorizPos:
    ; Wait for right edge of screen
    ; Each 15-pixel increment = 1 CPU cycle
    
    sta WSYNC          ; Start at left edge
    
CoarseLoop:
    lda DesiredX
    cmp #15
    bcc DoneCoarse
    sbc #15
    sta WSYNC          ; Wait more cycles
    jmp CoarseLoop
    
DoneCoarse:
    sta RESPx          ; Reset sprite at position
    
    ; Fine-tune with HMPx register
    lda FinePos
    sta HMPx
    sta WSYNC
    sta HMOVE          ; Apply fine position
```

### Collision Detection

The TIA provides hardware collision registers:

```assembly
CheckCollisions:
    ; Player-Playfield
    lda CXP0FB
    bpl NoPlayerPF
    ; Handle collision
    
NoPlayerPF:
    ; Player-Enemy
    lda CXPPMM
    bpl NoPlayerEnemy
    ; Lose life
    
NoPlayerEnemy:
    ; Clear latches for next frame
    sta CXCLR
```

## Performance Optimization

### Cycle Counting

Each scanline has exactly 76 cycles. The kernel must:
1. Update TIA registers (2-3 cycles each)
2. Process sprite logic (varies)
3. End with WSYNC (waits until cycle 76)

Critical sections are cycle-counted:
```assembly
    ; This sequence is exactly 76 cycles
    lda #$F0          ; 2 cycles
    sta PF0           ; 3 cycles
    lda #$FF          ; 2 cycles
    sta PF1           ; 3 cycles
    ; ... more code
    sta WSYNC         ; Wait to cycle 76
```

### Lookup Tables

Pre-compute expensive operations:

```assembly
; Sine table for smooth movement
SineTable:
    .byte 0, 6, 12, 17, 21, 24, 26, 27
    .byte 27, 26, 24, 21, 17, 12, 6, 0

; Usage:
    ldx Phase
    lda SineTable,x
    ; Use as offset
```

### Bank Switching

For games >4KB, use bank switching:
- F8 scheme: 8KB (2 banks)
- F6 scheme: 16KB (4 banks)
- Additional hardware required in cartridge

This game uses standard 4KB.

## Testing & Debugging

### Stella Debugger

Stella includes a powerful debugger:
- Set breakpoints
- Step through code
- View RAM/registers
- Monitor TIA output

### Common Issues

**Flickering sprites**: Ensure consistent positioning each frame

**Color artifacts**: WSYNC timing issues - align color changes with scanlines

**Collision false positives**: Clear CX latches at frame start

**Audio glitches**: Ensure AUDVx = 0 to silence channels

### Performance Metrics

Target: 60 FPS (NTSC)
- Each frame: ~16.7ms
- Kernel must complete within timing windows
- Logic must finish during overscan

## Expansion Ideas

### Future Enhancements

1. **Additional Screens**: Expand to 16-24 screens
2. **Bank Switching**: Use 8KB ROM for more content
3. **High Score Save**: Use SaveKey peripheral
4. **PAL Optimization**: Adjust timing for 50Hz
5. **Difficulty Switches**: Use console switches for modes
6. **Two-Player Mode**: Use second joystick port

### Technical Challenges

- **More simultaneous sprites**: Advanced multiplexing
- **Smooth scrolling**: Mid-screen playfield updates
- **Complex AI**: Within CPU constraints
- **Digitized sound**: PCM playback techniques

## References

- Stella Programmer's Guide by Steve Wright
- Racing the Beam: The Atari Video Computer System (MIT Press)
- 6502 Assembly Language Programming by Lance Leventhal
- AtariAge Programming Forum: https://atariage.com/
- TIA Hardware Notes: https://problemkaputt.de/2k6specs.htm

---

**Document Version**: 1.0  
**Last Updated**: 2026  
**For**: Pitfall 3: The Kister Caverns
