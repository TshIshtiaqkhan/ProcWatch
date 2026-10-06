import { describe, it, expect, vi, beforeEach } from "vitest";
import { playChime, SOUND_PRESETS, setAudioContext } from "../lib/soundEngine";

describe("Sound Engine", () => {
  let mockGainNode;
  let mockOscillatorNode;
  let mockContext;

  beforeEach(() => {
    mockGainNode = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockOscillatorNode = {
      type: "sine",
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };

    mockContext = {
      state: "running",
      currentTime: 0,
      createGain: vi.fn(() => mockGainNode),
      createOscillator: vi.fn(() => mockOscillatorNode),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
    };

    setAudioContext(mockContext);
  });

  it("exports known sound presets", () => {
    expect(SOUND_PRESETS).toHaveProperty("bell");
    expect(SOUND_PRESETS).toHaveProperty("chime");
    expect(SOUND_PRESETS).toHaveProperty("zen");
  });

  it("plays bell sound with multi-oscillator harmonic synthesis", () => {
    const played = playChime("bell", 80);
    expect(played).toBe(true);
    expect(mockContext.createGain).toHaveBeenCalled();
    expect(mockContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillatorNode.start).toHaveBeenCalled();
    expect(mockOscillatorNode.stop).toHaveBeenCalled();
  });

  it("plays chime sound with sequence", () => {
    const played = playChime("chime", 60);
    expect(played).toBe(true);
    expect(mockContext.createGain).toHaveBeenCalled();
    expect(mockContext.createOscillator).toHaveBeenCalled();
  });

  it("plays zen gong sound", () => {
    const played = playChime("zen", 100);
    expect(played).toBe(true);
    expect(mockContext.createGain).toHaveBeenCalled();
  });

  it("handles suspended audio context by resuming", () => {
    mockContext.state = "suspended";
    playChime("bell", 50);
    expect(mockContext.resume).toHaveBeenCalled();
  });

  it("handles zero volume or sound disabled by not playing", () => {
    const playedZero = playChime("bell", 0);
    expect(playedZero).toBe(false);
  });
});
