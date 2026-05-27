"""
Generate retro 8-bit WAV sound effects for Ghost Maze.
Uses only Python stdlib (wave + math + struct) so no extra deps needed.
Outputs to /app/frontend/assets/sounds/*.wav
"""

import math
import struct
import wave
import os

OUT_DIR = "/app/frontend/assets/sounds"
os.makedirs(OUT_DIR, exist_ok=True)

SAMPLE_RATE = 22050  # lower rate = smaller files, fine for SFX
BIT_DEPTH = 16
MAX_AMP = 2 ** (BIT_DEPTH - 1) - 1


def square_wave(freq, t):
    return 1.0 if math.sin(2 * math.pi * freq * t) >= 0 else -1.0


def triangle_wave(freq, t):
    x = (freq * t) % 1.0
    return 4 * abs(x - 0.5) - 1


def sawtooth_wave(freq, t):
    return 2 * ((freq * t) % 1.0) - 1


def envelope(t, duration_s, attack=0.005, release=0.05):
    if t < attack:
        return t / attack
    rel_start = duration_s - release
    if t > rel_start:
        return max(0.0, 1.0 - (t - rel_start) / release)
    return 1.0


def render_tone(freq, duration_ms, wave_fn=square_wave, volume=0.3, end_freq=None,
                attack_ms=4, release_ms=40):
    """Render a single tone with linear pitch sweep + ADSR envelope."""
    duration_s = duration_ms / 1000.0
    n_samples = int(SAMPLE_RATE * duration_s)
    samples = []
    for i in range(n_samples):
        t = i / SAMPLE_RATE
        # Pitch sweep
        if end_freq is not None:
            ratio = t / duration_s
            current_freq = freq * ((end_freq / freq) ** ratio)
        else:
            current_freq = freq
        env = envelope(t, duration_s, attack_ms / 1000.0, release_ms / 1000.0)
        sample = wave_fn(current_freq, t) * env * volume
        samples.append(sample)
    return samples


def append_silence(samples, duration_ms):
    n = int(SAMPLE_RATE * duration_ms / 1000.0)
    samples.extend([0.0] * n)


def write_wav(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(BIT_DEPTH // 8)
        w.setframerate(SAMPLE_RATE)
        # Clip & convert to 16-bit PCM
        frames = b"".join(
            struct.pack("<h", max(-MAX_AMP, min(MAX_AMP, int(s * MAX_AMP))))
            for s in samples
        )
        w.writeframes(frames)
    size = os.path.getsize(path)
    print(f"  {os.path.basename(path)}  {size:>5} bytes  ({len(samples)/SAMPLE_RATE*1000:.0f}ms)")


# --- Define each SFX ---

def gen_chomp():
    s = render_tone(280, 50, square_wave, 0.35, end_freq=220, attack_ms=1, release_ms=20)
    write_wav(f"{OUT_DIR}/chomp.wav", s)


def gen_pellet():
    s = render_tone(420, 35, square_wave, 0.30, attack_ms=1, release_ms=20)
    write_wav(f"{OUT_DIR}/pellet.wav", s)


def gen_super():
    # Rising arpeggio
    s = []
    for freq, dur in [(220, 90), (330, 90), (440, 90), (660, 180)]:
        s.extend(render_tone(freq, dur, square_wave, 0.45))
    write_wav(f"{OUT_DIR}/super.wav", s)


def gen_catch():
    # Two rising sweeps
    s = render_tone(880, 80, square_wave, 0.55, end_freq=1320)
    s.extend(render_tone(1320, 120, square_wave, 0.55, end_freq=1760))
    write_wav(f"{OUT_DIR}/catch.wav", s)


def gen_combo():
    # Bigger arpeggio for combos
    s = []
    for freq in [880, 1320, 1760, 2200]:
        s.extend(render_tone(freq, 70, square_wave, 0.55))
    write_wav(f"{OUT_DIR}/combo.wav", s)


def gen_ghost_eaten():
    s = []
    for freq in [660, 880, 1320]:
        s.extend(render_tone(freq, 80, triangle_wave, 0.5))
    write_wav(f"{OUT_DIR}/ghost_eaten.wav", s)


def gen_death():
    # Descending sawtooth wail
    s = render_tone(440, 140, sawtooth_wave, 0.5, end_freq=220)
    s.extend(render_tone(220, 200, sawtooth_wave, 0.5, end_freq=110))
    s.extend(render_tone(110, 260, sawtooth_wave, 0.5, end_freq=55))
    write_wav(f"{OUT_DIR}/death.wav", s)


def gen_win():
    # Triumphant ascending major chord arpeggio
    for freq, dur, name in [
        (523, 110, "C5"),
        (659, 110, "E5"),
        (784, 110, "G5"),
        (1047, 280, "C6"),
    ]:
        pass
    s = []
    for freq, dur in [(523, 110), (659, 110), (784, 110), (1047, 280)]:
        s.extend(render_tone(freq, dur, square_wave, 0.5))
    write_wav(f"{OUT_DIR}/win.wav", s)


def gen_lose():
    s = []
    for freq, dur in [(392, 160), (311, 160), (220, 320)]:
        s.extend(render_tone(freq, dur, sawtooth_wave, 0.5))
    write_wav(f"{OUT_DIR}/lose.wav", s)


def gen_ui_click():
    s = render_tone(660, 40, square_wave, 0.35, attack_ms=1, release_ms=15)
    write_wav(f"{OUT_DIR}/ui_click.wav", s)


print("Generating Ghost Maze SFX...")
gen_chomp()
gen_pellet()
gen_super()
gen_catch()
gen_combo()
gen_ghost_eaten()
gen_death()
gen_win()
gen_lose()
gen_ui_click()
print("Done.")
