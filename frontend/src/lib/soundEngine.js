/**
 * High-fidelity, zero-dependency Web Audio synthesizer for chime and focus notifications.
 * Works seamlessly across Windows and all Linux distributions (PipeWire, PulseAudio, ALSA)
 * without requiring external media binaries or codecs.
 */

let _audioContext = null;

export const SOUND_PRESETS = {
  bell: "Tibetan Singing Bell",
  chime: "Ascending Triad Chime",
  zen: "Resonant Temple Gong",
};

export function setAudioContext(ctx) {
  _audioContext = ctx;
}

export function getAudioContext() {
  if (typeof window === "undefined") return null;

  if (_audioContext) {
    if (_audioContext.state === "suspended") {
      _audioContext.resume().catch(() => {});
    }
    return _audioContext;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  _audioContext = new AudioCtx();

  if (_audioContext.state === "suspended") {
    _audioContext.resume().catch(() => {});
  }

  return _audioContext;
}

/**
 * Synthesizes a multi-harmonic singing bowl/bell.
 */
function playBell(ctx, masterGain, baseFreq = 528, duration = 3.0) {
  const now = ctx.currentTime;
  const harmonics = [
    { freqMult: 1.0, gain: 0.6, decay: duration },
    { freqMult: 1.503, gain: 0.35, decay: duration * 0.8 },
    { freqMult: 2.0, gain: 0.2, decay: duration * 0.6 },
    { freqMult: 3.01, gain: 0.12, decay: duration * 0.45 },
    { freqMult: 4.19, gain: 0.06, decay: duration * 0.3 },
  ];

  for (const h of harmonics) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * h.freqMult, now);

    // Click-free soft attack + exponential decay
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(h.gain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + h.decay);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + h.decay + 0.05);

    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    }, (h.decay + 0.1) * 1000);
  }
}

/**
 * Synthesizes an ascending 4-note joyful chime (C5, E5, G5, C6).
 */
function playChimeSequence(ctx, masterGain) {
  const notes = [
    { freq: 523.25, timeOffset: 0.0, dur: 1.6 },
    { freq: 659.25, timeOffset: 0.12, dur: 1.6 },
    { freq: 783.99, timeOffset: 0.24, dur: 1.6 },
    { freq: 1046.5, timeOffset: 0.36, dur: 2.2 },
  ];

  for (const n of notes) {
    const noteTime = ctx.currentTime + n.timeOffset;
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(n.freq, noteTime);

    overtone.type = "sine";
    overtone.frequency.setValueAtTime(n.freq * 2, noteTime);

    gain.gain.setValueAtTime(0.0001, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.3, noteTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + n.dur);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(masterGain);

    osc.start(noteTime);
    overtone.start(noteTime);
    osc.stop(noteTime + n.dur + 0.05);
    overtone.stop(noteTime + n.dur + 0.05);

    setTimeout(() => {
      try {
        osc.disconnect();
        overtone.disconnect();
        gain.disconnect();
      } catch {}
    }, (n.timeOffset + n.dur + 0.1) * 1000);
  }
}

/**
 * Synthesizes a deep resonant zen temple gong.
 */
function playGong(ctx, masterGain) {
  const now = ctx.currentTime;
  const baseFreq = 174;
  const duration = 3.6;

  const partials = [
    { mult: 1.0, gain: 0.7, decay: duration },
    { mult: 1.414, gain: 0.4, decay: duration * 0.8 },
    { mult: 2.76, gain: 0.25, decay: duration * 0.6 },
    { mult: 4.12, gain: 0.12, decay: duration * 0.4 },
  ];

  for (const p of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * p.mult, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + p.decay + 0.05);

    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    }, (p.decay + 0.1) * 1000);
  }
}

/**
 * Main chime player function.
 * @param {'bell' | 'chime' | 'zen'} soundType
 * @param {number} volume - 0 to 100
 * @returns {boolean} true if audio was dispatched
 */
export function playChime(soundType = "bell", volume = 80) {
  const volNum = Number(volume);
  if (isNaN(volNum) || volNum <= 0) {
    return false;
  }

  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    const masterGain = ctx.createGain();
    // Normalize volume [0, 100] -> [0, 0.4] to prevent audio clipping
    const normalizedGain = Math.min(1.0, Math.max(0.0, (volNum / 100) * 0.4));
    masterGain.gain.setValueAtTime(normalizedGain, ctx.currentTime);
    masterGain.connect(ctx.destination);

    switch (soundType) {
      case "chime":
        playChimeSequence(ctx, masterGain);
        break;
      case "zen":
        playGong(ctx, masterGain);
        break;
      case "bell":
      default:
        playBell(ctx, masterGain);
        break;
    }

    return true;
  } catch (err) {
    console.error("Audio playback error:", err);
    return false;
  }
}
