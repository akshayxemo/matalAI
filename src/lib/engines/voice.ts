import { speechChunks, speechProfile } from "./speech-delivery";

export type VoiceMode = "local" | "hosted" | "browser";
type PlaybackOptions = {
  mode?: VoiceMode;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};
let generation = 0;
let stopActive: (() => void) | null = null;
// Retain the utterance until completion; some speech implementations otherwise lose it.
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopVoice() {
  generation++;
  const stop = stopActive;
  stopActive = null;
  stop?.();
  activeUtterance = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

export async function playVoice(
  text: string,
  level: number,
  options: PlaybackOptions = {},
) {
  stopVoice();
  const id = generation;
  const savedLevel = Math.min(100, Math.max(0, level));
  const mode = options.mode || "browser";
  if (mode === "browser") {
    // Run synchronously in the Listen click, before any fetch or await. This preserves
    // user activation on browsers that block speech after an asynchronous request.
    if (!("speechSynthesis" in window))
      throw new Error(
        "Device speech is unavailable. Open the app in Safari or Chrome.",
      );
    const chunks = speechChunks(text);
    if (!chunks.length) throw new Error("This response has no speakable text.");
    const synth = window.speechSynthesis;
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    stopActive = () => {
      clearTimeout(timer);
      clearTimeout(watchdog);
    };
    const fail = (message: string) => {
      if (id !== generation) return;
      stopVoice();
      options.onError?.(message);
    };
    const next = () => {
      if (id !== generation) return;
      if (index >= chunks.length) {
        activeUtterance = null;
        options.onEnd?.();
        return;
      }
      const profile = speechProfile(savedLevel, index);
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      activeUtterance = utterance;
      const voices = synth.getVoices();
      const voice =
        voices.find((v) => v.localService && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;
      utterance.volume = 1;
      utterance.onstart = () => {
        clearTimeout(watchdog);
        if (id === generation && index === 0) options.onStart?.();
      };
      utterance.onend = () => {
        clearTimeout(watchdog);
        if (id !== generation) return;
        index++;
        timer = setTimeout(next, profile.pauseMs);
      };
      utterance.onerror = (event) =>
        fail(
          `Device speech failed (${event.error}). Try Safari or Chrome, or the local voice.`,
        );
      watchdog = setTimeout(
        () =>
          fail(
            "The browser did not start speech. Try Safari or Chrome, or the local voice.",
          ),
        8000,
      );
      synth.resume();
      synth.speak(utterance);
    };
    next();
    return;
  }

  if (typeof AudioContext === "undefined")
    throw new Error("Audio playback is unavailable in this browser.");
  // Unlock audio during the user's click, while the generated WAV is being fetched.
  const context = new AudioContext();
  const resumed = context.resume();
  const controller = new AbortController();
  let source: AudioBufferSourceNode | null = null;
  stopActive = () => {
    controller.abort();
    if (source) {
      source.onended = null;
      source.stop();
    }
    if (context.state !== "closed") void context.close();
  };
  try {
    await resumed;
    const response = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, level: savedLevel }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Could not generate audio.");
    }
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    if (id !== generation) return;
    if (context.state !== "running")
      throw new Error(
        "Audio is paused by the browser. Click Listen again to allow playback.",
      );
    source = context.createBufferSource();
    source.buffer = buffer;
    const strength = savedLevel / 100;
    const gain = context.createGain();
    const lfo = context.createOscillator();
    const depth = context.createGain();
    source.playbackRate.value = 1 - strength * 0.18;
    gain.gain.value = 1 - strength * 0.08;
    lfo.frequency.value = 3.5;
    depth.gain.value = strength * 0.07;
    lfo.connect(depth).connect(gain.gain);
    source.connect(gain).connect(context.destination);
    source.onended = () => {
      if (context.state !== "closed") void context.close();
      if (id === generation) {
        stopActive = null;
        options.onEnd?.();
      }
    };
    lfo.start();
    source.start();
    options.onStart?.();
  } catch (error) {
    if (id !== generation) return;
    stopVoice();
    throw error;
  }
}
