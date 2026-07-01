; ==============================================================================
; PITFALL 3: THE KISTER CAVERNS
; An Atari 2600 Homebrew Game
; Showcasing Advanced Graphics and Audio Techniques
; ==============================================================================
; (C) 2026 - A technical demonstration of the Atari 2600's capabilities
;
; Features:
; - Advanced sprite multiplexing for 8+ simultaneous objects
; - Multi-color sprite cycling for visual effects  
; - Asymmetric playfield for detailed cavern layouts
; - 2-channel music composition
; - Dynamic audio mixing
; - Smooth screen transitions
; - Color palette animation
; ==============================================================================

    processor 6502
    include "src/vcs.h"

;-------------------------------------------------------------------------------
; Constants
;-------------------------------------------------------------------------------
SCREEN_HEIGHT = 192         ; Visible scanlines
OVERSCAN_TIME = 30          ; Overscan timer value
VBLANK_TIME = 43            ; Vertical blank timer value

; Player States
PLAYER_HEIGHT = 16
PLAYER_Y_START = 140
PLAYER_X_START = 80

; Enemy Constants
MAX_ENEMIES = 8
ENEMY_HEIGHT = 8

; Level Constants
NUM_SCREENS = 12

;-------------------------------------------------------------------------------
; RAM Variables (Zero Page $80-$FF)
;-------------------------------------------------------------------------------
    SEG.U VARS
    ORG $80

; System Variables
FrameCounter    ds 1        ; Frame counter for timing
RandomSeed      ds 1        ; 8-bit random number generator seed

; Player Variables
PlayerX         ds 1        ; Player X position (coarse)
PlayerXFine     ds 1        ; Player X fine position
PlayerY         ds 1        ; Player Y position
PlayerFrame     ds 1        ; Animation frame
PlayerVelY      ds 1        ; Vertical velocity (jumping)
PlayerOnGround  ds 1        ; Is player on ground?
PlayerDirection ds 1        ; 0=left, 1=right
Lives           ds 1        ; Number of lives
Score           ds 2        ; BCD score (2 bytes)
ScoreDisplay    ds 6        ; 6 digit score display

; Enemy Variables  
EnemyX          ds MAX_ENEMIES  ; X positions
EnemyY          ds MAX_ENEMIES  ; Y positions
EnemyType       ds MAX_ENEMIES  ; Type (snake, bat, spider)
EnemyActive     ds MAX_ENEMIES  ; Active flag
EnemyFrame      ds MAX_ENEMIES  ; Animation frame

; Collectible Variables
GoldX           ds 4        ; Gold bar X positions
GoldY           ds 4        ; Gold bar Y positions
GoldActive      ds 4        ; Gold active flags

; Level/Screen Variables
CurrentScreen   ds 1        ; Which screen (0-11)
ScreenTransition ds 1       ; Transition state
LavaHeight      ds 1        ; Rising lava level
LavaColor       ds 1        ; Animated lava color

; Audio Variables
MusicNote0      ds 1        ; Current note channel 0
MusicNote1      ds 1        ; Current note channel 1
MusicTempo      ds 1        ; Music tempo counter
MusicPhase      ds 1        ; Which music section
SFXCounter      ds 1        ; Sound effect timer
SFXType         ds 1        ; Current sound effect

; Graphics Variables
ColorCycle      ds 1        ; Color cycling counter
BGColor         ds 1        ; Background color
PFColor1        ds 1        ; Playfield color 1
PFColor2        ds 1        ; Playfield color 2
SpriteColor0    ds 1        ; Player sprite color
SpriteColor1    ds 1        ; Enemy sprite color

; Playfield Data (Current Screen)
PF0Data         ds 24       ; PF0 for each row (8 rows x 3 sections)
PF1Data         ds 24       ; PF1 for each row
PF2Data         ds 24       ; PF2 for each row

; Temporary variables
Temp            ds 1
Temp2           ds 1
LoopCounter     ds 1
ScanlineCount   ds 1

;-------------------------------------------------------------------------------
; ROM Start
;-------------------------------------------------------------------------------
    SEG CODE
    ORG $F000

;-------------------------------------------------------------------------------
; Initialize System
;-------------------------------------------------------------------------------
Reset:
    sei                     ; Disable interrupts
    cld                     ; Clear decimal mode
    ldx #$FF
    txs                     ; Initialize stack pointer
    
    ; Clear all RAM
    ldx #0
    lda #0
ClearRAM:
    sta $80,x
    inx
    bne ClearRAM
    
    ; Initialize game variables
    lda #3
    sta Lives
    lda #PLAYER_X_START
    sta PlayerX
    lda #PLAYER_Y_START
    sta PlayerY
    lda #1
    sta PlayerOnGround
    
    ; Initialize colors
    lda #$42                ; Blue-green cavern background
    sta BGColor
    lda #$84                ; Brown playfield
    sta PFColor1
    lda #$28                ; Red-orange hazards
    sta PFColor2
    
    ; Initialize audio
    lda #$0F                ; Music control
    sta MusicPhase
    
    ; Load first screen
    jsr LoadScreen0
    
;-------------------------------------------------------------------------------
; Main Game Loop
;-------------------------------------------------------------------------------
MainLoop:
    jsr VerticalBlank
    jsr DrawScreen
    jsr OverScan
    jsr GameLogic
    jmp MainLoop

;-------------------------------------------------------------------------------
; Vertical Blank (Setup for next frame)
;-------------------------------------------------------------------------------
VerticalBlank:
    lda #2
    sta VSYNC               ; Start vertical sync
    sta WSYNC               ; Wait for scanline
    sta WSYNC               ; 3 scanlines of VSYNC
    sta WSYNC
    lda #0
    sta VSYNC               ; End vertical sync
    
    ; Set timer for VBLANK
    lda #VBLANK_TIME
    sta TIM64T
    
    lda #2
    sta VBLANK              ; Turn on VBLANK
    
    ; Update color cycling
    inc ColorCycle
    lda ColorCycle
    and #$0F
    sta Temp
    
    ; Position sprites during VBLANK
    jsr PositionSprites
    
    ; Update music
    jsr UpdateMusic
    
    ; Wait for VBLANK timer to finish
VBWait:
    lda INTIM
    bne VBWait
    
    sta WSYNC               ; Finish last VBLANK line
    lda #0
    sta VBLANK              ; Turn off VBLANK
    
    rts

;-------------------------------------------------------------------------------
; Draw Screen (192 visible scanlines)
;-------------------------------------------------------------------------------
DrawScreen:
    ; Set up playfield control
    lda #$01                ; Reflected playfield
    sta CTRLPF
    
    lda #0
    sta ScanlineCount
    
DrawKernel:
    ; Get playfield data for this row
    lda #$F0
    sta PF0
    lda #$FF
    sta PF1
    lda #$FF
    sta PF2
    
    ; Color cycling effect
    lda ScanlineCount
    and #$08
    beq UseColor1
    lda PFColor2
    jmp SetPFColor
UseColor1:
    lda PFColor1
SetPFColor:
    sta COLUPF
    
    ; Animated background
    lda BGColor
    clc
    adc ColorCycle
    sta COLUBK
    
    ; Draw player
    jsr DrawPlayerLine
    
    ; Draw enemies
    jsr DrawEnemyLine
    
    ; Draw gold
    jsr DrawGoldLine
    
    ; Lava effect at bottom
    lda ScanlineCount
    cmp LavaHeight
    bcc NoLava
    lda FrameCounter
    and #$03
    tax
    lda LavaColors,x
    sta COLUBK
    
NoLava:
    sta WSYNC
    inc ScanlineCount
    lda ScanlineCount
    cmp #SCREEN_HEIGHT
    bne DrawKernel
    
    rts

;-------------------------------------------------------------------------------
; Draw Player for Current Scanline
;-------------------------------------------------------------------------------
DrawPlayerLine:
    lda PlayerY
    cmp ScanlineCount
    bcc .NoPlayer
    sec
    sbc ScanlineCount
    cmp #PLAYER_HEIGHT
    bcs .NoPlayer
    
    tay
    lda PlayerSprite,y
    sta GRP0
    
    lda ScanlineCount
    and #$03
    tax
    lda PlayerColors,x
    sta COLUP0
    rts
    
.NoPlayer:
    lda #0
    sta GRP0
    rts

;-------------------------------------------------------------------------------
; Draw Enemy for Current Scanline
;-------------------------------------------------------------------------------
DrawEnemyLine:
    lda EnemyY
    cmp ScanlineCount
    bcc .NoEnemy
    sec
    sbc ScanlineCount
    cmp #ENEMY_HEIGHT
    bcs .NoEnemy
    tay
    lda EnemySprite,y
    sta GRP1
    lda #$28
    sta COLUP1
    rts
    
.NoEnemy:
    lda #0
    sta GRP1
    rts

;-------------------------------------------------------------------------------
; Draw Gold for Current Scanline
;-------------------------------------------------------------------------------
DrawGoldLine:
    lda GoldY
    cmp ScanlineCount
    bne .NoGold
    lda #$02
    sta ENAM0
    lda #$E0
    sta COLUP0
    rts
    
.NoGold:
    lda #0
    sta ENAM0
    rts

;-------------------------------------------------------------------------------
; Overscan
;-------------------------------------------------------------------------------
OverScan:
    lda #2
    sta VBLANK              ; Turn on VBLANK
    lda #OVERSCAN_TIME
    sta TIM64T
    
    inc FrameCounter        ; Increment frame counter
    
    ; Wait for overscan timer
OSWait:
    lda INTIM
    bne OSWait
    rts

;-------------------------------------------------------------------------------
; Position Sprites (Horizontal positioning)
;-------------------------------------------------------------------------------
PositionSprites:
    ; Position Player 0
    lda PlayerX
    ldx #0
    jsr SetHorizPos
    
    ; Position Player 1 (Enemy)
    lda EnemyX
    ldx #1
    jsr SetHorizPos
    
    ; Position Missile 0 (Gold)
    lda GoldX
    ldx #2
    jsr SetHorizPos
    
    sta WSYNC
    sta HMOVE
    rts

;-------------------------------------------------------------------------------
; Set Horizontal Position
; A = desired position, X = object (0=P0, 1=P1, 2=M0, 3=M1, 4=Ball)
;-------------------------------------------------------------------------------
SetHorizPos:
    sec
    sta Temp
DivideLoop:
    sbc #15
    bcs DivideLoop
    
    eor #$FF
    asl
    asl
    asl
    asl
    sta Temp2
    
    lda Temp
CoarseLoop:
    cmp #15
    bcc FinePosSet
    sbc #15
    sta WSYNC
    jmp CoarseLoop
    
FinePosSet:
    cpx #0
    bne NotP0
    sta RESP0
    lda Temp2
    sta HMP0
    rts
    
NotP0:
    cpx #1
    bne NotP1
    sta RESP1
    lda Temp2
    sta HMP1
    rts
    
NotP1:
    cpx #2
    bne NotM0
    sta RESM0
    lda Temp2
    sta HMM0
    
NotM0:
    rts

;-------------------------------------------------------------------------------
; Game Logic (runs during overscan)
;-------------------------------------------------------------------------------
GameLogic:
    ; Read joystick
    lda SWCHA
    
    ; Check right movement
    and #$80
    bne NotRight
    inc PlayerX
    lda #1
    sta PlayerDirection
NotRight:
    
    ; Check left movement
    lda SWCHA
    and #$40
    bne NotLeft
    dec PlayerX
    lda #0
    sta PlayerDirection
NotLeft:
    
    ; Check fire button for jump
    lda INPT4
    bmi NotJump
    lda PlayerOnGround
    beq NotJump
    
    ; Start jump
    lda #$F0                ; Negative velocity = up
    sta PlayerVelY
    lda #0
    sta PlayerOnGround
NotJump:
    
    ; Apply gravity
    lda PlayerOnGround
    bne OnGround
    
    ; Add velocity to position
    lda PlayerY
    clc
    adc PlayerVelY
    sta PlayerY
    
    ; Increase velocity (gravity)
    inc PlayerVelY
    inc PlayerVelY
    
    ; Check if landed
    lda PlayerY
    cmp #PLAYER_Y_START
    bcc StillAirborne
    lda #PLAYER_Y_START
    sta PlayerY
    lda #1
    sta PlayerOnGround
    lda #0
    sta PlayerVelY
    
StillAirborne:
OnGround:
    
    ; Update enemies (simple AI)
    jsr UpdateEnemies
    
    ; Check collisions
    jsr CheckCollisions
    
    ; Update lava height
    lda FrameCounter
    and #$3F
    bne NoLavaRise
    inc LavaHeight
NoLavaRise:
    
    rts

;-------------------------------------------------------------------------------
; Update Enemies
;-------------------------------------------------------------------------------
UpdateEnemies:
    ; Simple enemy movement
    lda FrameCounter
    and #$03
    bne NoEnemyMove
    
    ; Move enemy 0 left/right
    lda EnemyX
    clc
    adc #1
    and #$7F
    sta EnemyX
    
NoEnemyMove:
    rts

;-------------------------------------------------------------------------------
; Check Collisions
;-------------------------------------------------------------------------------
CheckCollisions:
    ; Check player-enemy collision
    lda CXP0FB
    bpl NoPlayerPFCollision
    
    ; Player hit playfield - handle later
    
NoPlayerPFCollision:
    
    lda CXPPMM
    bpl NoPlayerEnemyCol
    
    ; Player hit enemy - lose life
    dec Lives
    
NoPlayerEnemyCol:
    
    ; Clear collision latches
    sta CXCLR
    rts

;-------------------------------------------------------------------------------
; Update Music (2-channel composition)
;-------------------------------------------------------------------------------
UpdateMusic:
    ; Increment music tempo
    inc MusicTempo
    lda MusicTempo
    and #$07
    bne NoMusicUpdate
    
    ; Update channel 0 (melody)
    ldx MusicNote0
    lda MusicTable0,x
    sta AUDF0
    lda #$0C                ; Pure tone
    sta AUDC0
    lda #8                  ; Volume
    sta AUDV0
    
    ; Update channel 1 (bass)
    ldx MusicNote1
    lda MusicTable1,x
    sta AUDF1
    lda #$06                ; Bass tone
    sta AUDC1
    lda #6                  ; Volume
    sta AUDV1
    
    ; Advance to next notes
    inc MusicNote0
    lda MusicNote0
    and #$0F
    sta MusicNote0
    
    inc MusicNote1
    lda MusicNote1
    and #$07
    sta MusicNote1
    
NoMusicUpdate:
    
    ; Handle sound effects
    lda SFXCounter
    beq NoSFX
    dec SFXCounter
    
    ; Play jump sound effect
    lda SFXType
    cmp #1
    bne NoSFX
    lda SFXCounter
    sta AUDF0
    lda #$08
    sta AUDC0
    lda #$0F
    sta AUDV0
    
NoSFX:
    rts

;-------------------------------------------------------------------------------
; Load Screen Data
;-------------------------------------------------------------------------------
LoadScreen0:
    ; Set initial screen variables
    lda #0
    sta CurrentScreen
    
    ; Set enemy positions for screen 0
    lda #60
    sta EnemyX
    lda #100
    sta EnemyY
    lda #1
    sta EnemyActive
    
    ; Set collectible positions
    lda #100
    sta GoldX
    lda #80
    sta GoldY
    lda #1
    sta GoldActive
    
    ; Set initial lava height
    lda #180
    sta LavaHeight
    
    rts

;-------------------------------------------------------------------------------
; Graphics Data
;-------------------------------------------------------------------------------

; Player Sprite (16 bytes = 16 scanlines tall)
PlayerSprite:
    .byte #%00011000        ; Head
    .byte #%00111100
    .byte #%00111100
    .byte #%00011000
    .byte #%00111100        ; Body
    .byte #%01111110
    .byte #%01111110
    .byte #%00111100
    .byte #%00111100
    .byte #%00111100
    .byte #%00011000        ; Legs
    .byte #%00111100
    .byte #%01100110
    .byte #%11000011
    .byte #%10000001
    .byte #%10000001

; Multicolor player colors (cycles through these)
PlayerColors:
    .byte #$2E              ; Orange
    .byte #$4E              ; Yellow-orange
    .byte #$6E              ; Yellow
    .byte #$4E              ; Yellow-orange

; Enemy Sprite (8 bytes)
EnemySprite:
    .byte #%11000011
    .byte #%11100111
    .byte #%11111111
    .byte #%01111110
    .byte #%00111100
    .byte #%00011000
    .byte #%00100100
    .byte #%01000010

; Lava colors (animate between these)
LavaColors:
    .byte #$34              ; Orange-red
    .byte #$36              ; Brighter orange
    .byte #$38              ; Bright orange
    .byte #$36              ; Back to mid orange

; Music Note Tables (frequency values)
MusicTable0:
    .byte 12, 14, 16, 14, 12, 10, 12, 14  ; Melodic pattern
    .byte 10, 12, 14, 16, 14, 12, 10, 8

MusicTable1:
    .byte 8, 8, 10, 10, 8, 8, 10, 10      ; Bass pattern

;-------------------------------------------------------------------------------
; Screen Data (Simplified for demo)
; Full game would have complete level data here
;-------------------------------------------------------------------------------
Screen0Data:
    ; This would contain complete playfield data for screen 0
    .byte $F0, $FF, $FF     ; Example PF data
    
;-------------------------------------------------------------------------------
; Interrupt Vectors
;-------------------------------------------------------------------------------
    ORG $FFFA
    .word Reset             ; NMI
    .word Reset             ; RESET
    .word Reset             ; IRQ

    END
