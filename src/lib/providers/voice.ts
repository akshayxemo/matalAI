import {
  parseActingCues,
  prepareSpeechText,
} from "@/lib/engines/speech-delivery";
import type { Settings } from "@/lib/config/settings";
import { localSpeech } from "./speech";
export type VoiceSnapshot = {
  provider: "local" | "elevenlabs" | "system";
  presentation: "male" | "female";
  profile: string;
};
export function snapshot(s: Settings): VoiceSnapshot {
  return {
    provider: s.voiceProvider,
    presentation: s.presentation,
    profile: s.presentation === "male" ? s.maleVoice : s.femaleVoice,
  };
}
/** One steady voice, with a progressively stronger performance as the level rises. */
export function style(level: number) {
  const identity = "Keep the same natural voice and accent throughout. ";
  if (level < 15)
    return (
      identity + "Speak clearly and soberly, with a steady conversational pace."
    );
  if (level < 35)
    return (
      identity +
      "Sound slightly tipsy and relaxed, with warm, playful emphasis and a brief hesitation."
    );
  if (level < 60)
    return (
      identity +
      "Sound clearly tipsy and a little tongue-tied, with loose articulation, uneven pauses and playful emphasis. Keep the words understandable."
    );
  if (level < 85)
    return (
      identity +
      "Act noticeably drunk and tongue-tied. Gently blur syllables, hesitate and stretch occasional words, with uneven pauses. Remain understandable."
    );
  return (
    identity +
    "Act very drunk and tongue-tied, with more blurred syllables, shaky starts, stretched words and longer uneven pauses. Keep the words understandable."
  );
}
/** ElevenLabs performs its own supported audio tags; never forward arbitrary tags. */
export function prepareTaggedSpeech(text: string) {
  const tokens: string[] = [];
  const protectedText = text.replace(
    /\[(laughs|chuckles|sighs|gasps|whispers|hiccups|burps|coughs|clears throat|sniffs|takes a breath|groans|sobs|slurring|pauses)\]/g,
    (_, tag: string) => {
      tokens.push(tag);
      return ` CUEPHRASE${tokens.length - 1}TOKEN `;
    },
  );
  return prepareSpeechText(protectedText).replace(
    /CUEPHRASE(\d+)TOKEN/g,
    (_, index: string) => `[${tokens[Number(index)]}]`,
  );
}

/** Eleven v3 takes acting directions as inline tags, not a separate instruct field. */
export function elevenDeliveryTag(level: number): string {
  if (level < 15) return "";
  if (level < 35) return "[slightly tipsy, relaxed and warm]";
  if (level < 60) return "[tipsy, slightly tongue-tied, uneven pacing]";
  if (level < 85) return "[drunk, tongue-tied, gently slurring words]";
  return "[very drunk, stumbling over words, slurred speech]";
}

/** Apply the delivery direction throughout longer responses, retaining cue positions. */
export function elevenPerformance(text: string, level: number): string {
  const tag = elevenDeliveryTag(level);
  if (!tag) return text;
  // Insert after complete sentences, without splitting decimal numbers or deleting words.
  const directed = text.replace(/([.!?]+)(\s+)(?=[A-Z“"'])/g, `$1$2${tag} `);
  return `${tag} ${directed}`;
}

/** Qwen supports whole-utterance style instructions, not a guaranteed inline laugh tag. */
export function cueDirection(cues: string[]) {
  const reactions: string[] = [];
  if (cues.includes("laugh") || cues.includes("chuckle"))
    reactions.push(
      "include a natural brief chuckle where it fits the dialogue",
    );
  if (cues.includes("sigh")) reactions.push("use a natural brief sigh");
  if (cues.includes("gasp")) reactions.push("use a brief surprised gasp");
  if (cues.includes("whisper"))
    reactions.push("soften the voice as if whispering");
  const directions: Record<string, string> = {
    hiccup: "give a brief natural hiccup",
    burp: "give a brief natural burp",
    cough: "include a brief cough",
    throat: "briefly clear the throat",
    sniff: "include a brief sniff",
    breath: "take an audible breath",
    groan: "include a brief groan",
    sob: "sound briefly tearful",
    slur: "slur the following words slightly while remaining intelligible",
    pause: "add a short dramatic pause",
  };
  for (const [cue, direction] of Object.entries(directions)) {
    if (cues.includes(cue)) reactions.push(direction);
  }
  return reactions.length ? ` Performance cues: ${reactions.join(", ")}.` : "";
}

export async function generateVoice(
  text: string,
  level: number,
  voice: VoiceSnapshot,
  settings: Settings,
) {
  const acting = parseActingCues(text);
  const spoken = prepareSpeechText(text);
  if (!spoken) throw Error("No spoken words.");
  if (voice.provider === "system")
    return {
      audio: await localSpeech(spoken, level, voice.presentation),
      type: "audio/wav",
    };
  let url: string,
    headers: Record<string, string> = { "Content-Type": "application/json" },
    body: object;
  if (voice.provider === "elevenlabs") {
    if (!settings.voiceKey)
      throw Error("Add an ElevenLabs API key in voice settings.");
    if (!/^[a-zA-Z0-9_-]{5,100}$/.test(voice.profile))
      throw Error("Set a valid ElevenLabs voice ID in settings.");
    url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.profile)}`;
    headers["xi-api-key"] = settings.voiceKey;
    body = {
      text: elevenPerformance(prepareTaggedSpeech(acting.taggedText), level),
      model_id: "eleven_v3",
    };
  } else {
    url = `${settings.voiceBase.replace(/\/$/, "")}/audio/speech`;
    body = {
      model: settings.voiceModel,
      input: spoken,
      voice: voice.profile,
      instruct: style(level) + cueDirection(acting.cues),
      response_format: "wav",
    };
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
  } catch {
    if (voice.provider === "local" && process.platform === "darwin")
      return {
        audio: await localSpeech(spoken, level, voice.presentation),
        type: "audio/wav",
        fallback: true,
      };
    throw Error(
      voice.provider === "local"
        ? "Local voice server is unavailable. Start MLX Audio or choose a system voice."
        : "Cannot reach ElevenLabs. Check your internet connection.",
    );
  }
  if (!response.ok) {
    if (voice.provider === "elevenlabs" && response.status === 402)
      throw Error(
        "ElevenLabs reports insufficient credits or payment is required. Check your ElevenLabs account usage and billing, or select a local voice in Settings.",
      );
    throw Error(
      `${voice.provider === "local" ? "Local voice server" : "ElevenLabs"} returned ${response.status}. Check settings, credentials, model access or quota.`,
    );
  }
  return {
    audio: new Uint8Array(await response.arrayBuffer()),
    type: response.headers.get("content-type") || "audio/mpeg",
  };
}
