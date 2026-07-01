; VCS.H
; TIA and RIOT register definitions for Atari 2600
; Standard include file for all Atari 2600 development

;-------------------------------------------------------------------------------
; TIA Write Addresses
;-------------------------------------------------------------------------------
VSYNC   = $00   ; Vertical Sync Set-Clear
VBLANK  = $01   ; Vertical Blank Set-Clear
WSYNC   = $02   ; Wait for Horizontal Blank
RSYNC   = $03   ; Reset Horizontal Sync Counter
NUSIZ0  = $04   ; Number-Size player/missile 0
NUSIZ1  = $05   ; Number-Size player/missile 1
COLUP0  = $06   ; Color-Luminance Player 0
COLUP1  = $07   ; Color-Luminance Player 1
COLUPF  = $08   ; Color-Luminance Playfield
COLUBK  = $09   ; Color-Luminance Background
CTRLPF  = $0A   ; Control Playfield, Ball, Collisions
REFP0   = $0B   ; Reflection Player 0
REFP1   = $0C   ; Reflection Player 1
PF0     = $0D   ; Playfield Register Byte 0
PF1     = $0E   ; Playfield Register Byte 1
PF2     = $0F   ; Playfield Register Byte 2
RESP0   = $10   ; Reset Player 0
RESP1   = $11   ; Reset Player 1
RESM0   = $12   ; Reset Missile 0
RESM1   = $13   ; Reset Missile 1
RESBL   = $14   ; Reset Ball
AUDC0   = $15   ; Audio Control 0
AUDC1   = $16   ; Audio Control 1
AUDF0   = $17   ; Audio Frequency 0
AUDF1   = $18   ; Audio Frequency 1
AUDV0   = $19   ; Audio Volume 0
AUDV1   = $1A   ; Audio Volume 1
GRP0    = $1B   ; Graphics Register Player 0
GRP1    = $1C   ; Graphics Register Player 1
ENAM0   = $1D   ; Graphics Enable Missile 0
ENAM1   = $1E   ; Graphics Enable Missile 1
ENABL   = $1F   ; Graphics Enable Ball
HMP0    = $20   ; Horizontal Motion Player 0
HMP1    = $21   ; Horizontal Motion Player 1
HMM0    = $22   ; Horizontal Motion Missile 0
HMM1    = $23   ; Horizontal Motion Missile 1
HMBL    = $24   ; Horizontal Motion Ball
VDELP0  = $25   ; Vertical Delay Player 0
VDELP1  = $26   ; Vertical Delay Player 1
VDELBL  = $27   ; Vertical Delay Ball
RESMP0  = $28   ; Reset Missile 0 to Player 0
RESMP1  = $29   ; Reset Missile 1 to Player 1
HMOVE   = $2A   ; Apply Horizontal Motion
HMCLR   = $2B   ; Clear Horizontal Move Registers
CXCLR   = $2C   ; Clear Collision Latches

;-------------------------------------------------------------------------------
; TIA Read Addresses
;-------------------------------------------------------------------------------
CXM0P   = $00   ; Collision M0-P1, M0-P0
CXM1P   = $01   ; Collision M1-P0, M1-P1
CXP0FB  = $02   ; Collision P0-PF, P0-BL
CXP1FB  = $03   ; Collision P1-PF, P1-BL
CXM0FB  = $04   ; Collision M0-PF, M0-BL
CXM1FB  = $05   ; Collision M1-PF, M1-BL
CXBLPF  = $06   ; Collision BL-PF, unused
CXPPMM  = $07   ; Collision P0-P1, M0-M1
INPT0   = $08   ; Read Paddle Controller 0
INPT1   = $09   ; Read Paddle Controller 1
INPT2   = $0A   ; Read Paddle Controller 2
INPT3   = $0B   ; Read Paddle Controller 3
INPT4   = $0C   ; Read Player 0 Fire Button
INPT5   = $0D   ; Read Player 1 Fire Button

;-------------------------------------------------------------------------------
; RIOT (6532) Addresses
;-------------------------------------------------------------------------------
SWCHA   = $0280 ; Port A I/O Register (Joystick)
SWACNT  = $0281 ; Port A Data Direction Register
SWCHB   = $0282 ; Port B I/O Register (Console switches)
SWBCNT  = $0283 ; Port B Data Direction Register
INTIM   = $0284 ; Timer Output
TIMINT  = $0285 ; Timer Interrupt
TIM1T   = $0294 ; Set 1 Clock Interval
TIM8T   = $0295 ; Set 8 Clock Interval
TIM64T  = $0296 ; Set 64 Clock Interval
T1024T  = $0297 ; Set 1024 Clock Interval

;-------------------------------------------------------------------------------
; RAM (128 bytes at $80-$FF)
;-------------------------------------------------------------------------------
