const MUTE_KEY = "margins-sound-muted";

export type SoundName =
  | "click"
  | "snap"
  | "warning"
  | "launch"
  | "success"
  | "fail";

let audioContext: AudioContext | null = null;

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined" || readMuted()) return null;
  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext ??= new AudioContextConstructor();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(
  context: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType,
  offset = 0,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + offset;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playSound(name: SoundName): void {
  const context = getContext();
  if (!context) return;

  if (name === "click") tone(context, 520, 0.06, "square");
  if (name === "snap") tone(context, 180, 0.09, "triangle");
  if (name === "warning") {
    tone(context, 190, 0.1, "sawtooth");
    tone(context, 150, 0.1, "sawtooth", 0.12);
  }
  if (name === "launch") {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(70, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(180, context.currentTime + 0.7);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.75);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.8);
  }
  if (name === "success") {
    tone(context, 392, 0.12, "sine");
    tone(context, 523, 0.16, "sine", 0.13);
    tone(context, 659, 0.2, "sine", 0.3);
  }
  if (name === "fail") {
    tone(context, 130, 0.18, "triangle");
    tone(context, 92, 0.24, "triangle", 0.16);
  }
}

export function isSoundMuted(): boolean {
  return readMuted();
}

export function setSoundMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // Audio remains usable when storage is unavailable.
  }
}

export function toggleSoundMuted(): boolean {
  const muted = !readMuted();
  setSoundMuted(muted);
  return muted;
}
