/** Pure delivery planning, shared by playback and regression checks. */
export function speechProfile(level: number, index = 0) {
  const amount = Math.min(100, Math.max(0, level)) / 100;
  const variation = Math.sin(index * 2.4);
  return {
    rate: Math.max(0.62, 1 - amount * 0.28 + variation * amount * 0.12),
    pitch: 1 - amount * 0.13 + Math.cos(index * 1.7) * amount * 0.17,
    pauseMs:
      amount < 0.15 ? 60 : Math.round(100 + amount * (180 + (index % 3) * 160)),
  };
}

export type ActingCue =
  | "laugh"
  | "chuckle"
  | "sigh"
  | "gasp"
  | "whisper"
  | "hiccup"
  | "burp"
  | "cough"
  | "throat"
  | "sniff"
  | "breath"
  | "groan"
  | "sob"
  | "slur"
  | "pause";

/** Provider directions are best-effort; support varies by voice and model. */
export const cueTags: Record<ActingCue, string> = {
  laugh: "laughs",
  chuckle: "chuckles",
  sigh: "sighs",
  gasp: "gasps",
  whisper: "whispers",
  hiccup: "hiccups",
  burp: "burps",
  cough: "coughs",
  throat: "clears throat",
  sniff: "sniffs",
  breath: "takes a breath",
  groan: "groans",
  sob: "sobs",
  slur: "slurring",
  pause: "pauses",
};

const actions: Record<string, ActingCue | null> = {
  laugh: "laugh",
  laughs: "laugh",
  laughing: "laugh",
  chuckle: "chuckle",
  chuckles: "chuckle",
  chuckling: "chuckle",
  giggle: "chuckle",
  giggles: "chuckle",
  giggling: "chuckle",
  sigh: "sigh",
  sighs: "sigh",
  sighing: "sigh",
  gasp: "gasp",
  gasps: "gasp",
  gasping: "gasp",
  whisper: "whisper",
  whispers: "whisper",
  whispering: "whisper",
  squint: null,
  squints: null,
  squinting: null,
  smiles: null,
  smiling: null,
  grins: null,
  winks: null,
  nods: null,
  shrugs: null,
  "looks around": null,
  "looks confused": null,
  "shakes head": null,
  "rubs eyes": null,
  "raises eyebrows": null,
  "rolls eyes": null,
  "takes a sip": null,
  hic: "hiccup",
  hiccup: "hiccup",
  hiccups: "hiccup",
  hiccuping: "hiccup",
  hiccupping: "hiccup",
  burp: "burp",
  burps: "burp",
  burping: "burp",
  cough: "cough",
  coughs: "cough",
  coughing: "cough",
  "clear throat": "throat",
  "clears throat": "throat",
  "clears his throat": "throat",
  "clears her throat": "throat",
  sniff: "sniff",
  sniffs: "sniff",
  sniffing: "sniff",
  "takes a breath": "breath",
  "takes a deep breath": "breath",
  "deep breath": "breath",
  breathes: "breath",
  groan: "groan",
  groans: "groan",
  groaning: "groan",
  sob: "sob",
  sobs: "sob",
  sobbing: "sob",
  crying: "sob",
  slur: "slur",
  slurs: "slur",
  slurring: "slur",
  "slurs slightly": "slur",
  "stunned pause": "pause",
  "pauses for comedic effect": "pause",
  pause: "pause",
  pauses: "pause",
};

/** Recognize a small allowlist of acting notes without removing normal prose or markdown. */
export function parseActingCues(text: string): {
  text: string;
  cues: ActingCue[];
  taggedText: string;
} {
  const cues: ActingCue[] = [];
  const actionPattern =
    /(?<!\*)\*(?!\*)([^*\n]{1,240})\*(?!\*)|\[([^\]\n]{1,240})\]|\(([^()\n]{1,240})\)/g;
  const taggedText = text.replace(
    actionPattern,
    (original, starred, bracketed, parenthesized) => {
      const action = (starred || bracketed || parenthesized)
        .trim()
        .toLowerCase()
        .replace(
          /^(?:(?:softly|quietly|nervously|loudly|awkwardly|gently|slightly|briefly)\s+)+/,
          "",
        )
        .replace(
          /\s+(?:(?:softly|quietly|nervously|loudly|awkwardly|gently|slightly|briefly))+$/,
          "",
        );
      if (Object.hasOwn(actions, action)) {
        const cue = actions[action];
        if (!cue) return "";
        cues.push(cue);
        return `[${cueTags[cue]}]`;
      }
      // Compound stage directions start with an action verb, e.g. "laughs loudly,
      // then composes himself". Ordinary italics and explanatory parentheses remain.
      const stageDirection =
        /^(?:(?:softly|quietly|nervously|loudly|awkwardly|gently|slightly|briefly|momentarily)\s+)*(?:laughs?|laughing|chuckles?|chuckling|giggles?|giggling|roars?|sighs?|sighing|gasps?|gasping|whispers?|whispering|hiccups?|hiccupping|burps?|burping|coughs?|coughing|sniffs?|sniffing|groans?|groaning|sobs?|sobbing|cries|crying|slurs?|slurring|pauses?|pausing|clears?|breathes?|takes? a (?:deep )?breath|squints?|squinting|winks?|smiles?|grins?|nods?|shrugs?|looks?|shakes?|rubs?|raises?|rolls?|composes?|regains?|momentarily loses?)\b/i;
      if (!stageDirection.test(action)) return original;
      const matches: [RegExp, ActingCue][] = [
        [/\b(?:laugh(?:s|ing|ter)?|roars? with laughter)\b/i, "laugh"],
        [/\b(?:chuckl(?:e|es|ing)|giggl(?:e|es|ing))\b/i, "chuckle"],
        [/\b(?:hiccups?|hiccupping|hic)\b/i, "hiccup"],
        [/\b(?:burps?|burping)\b/i, "burp"],
        [/\b(?:sighs?|sighing)\b/i, "sigh"],
        [/\b(?:gasps?|gasping)\b/i, "gasp"],
        [/\b(?:coughs?|coughing)\b/i, "cough"],
        [/\bclear(?:s|ing)? (?:his |her |their )?throat\b/i, "throat"],
        [/\b(?:sniffs?|sniffing)\b/i, "sniff"],
        [
          /\b(?:breathes?|(?:takes?|taking) (?:a |a deep )?breath)\b/i,
          "breath",
        ],
        [/\b(?:groans?|groaning)\b/i, "groan"],
        [/\b(?:sobs?|sobbing|cries|crying)\b/i, "sob"],
        [/\b(?:whispers?|whispering)\b/i, "whisper"],
        [/\b(?:slurs?|slurring)\b/i, "slur"],
        [/\b(?:pauses?|pausing)\b/i, "pause"],
      ];
      const found = matches
        .flatMap(([pattern, cue]) => {
          const match = pattern.exec(action);
          return match ? [{ index: match.index, cue }] : [];
        })
        .sort((a, b) => a.index - b.index);
      for (const { cue } of found) cues.push(cue);
      return found.map(({ cue }) => `[${cueTags[cue]}]`).join(" ");
    },
  );
  const cleanText = taggedText.replace(
    /\[(?:laughs|chuckles|sighs|gasps|whispers|hiccups|burps|coughs|clears throat|sniffs|takes a breath|groans|sobs|slurring|pauses)\]/g,
    "",
  );
  return { text: cleanText, cues, taggedText };
}

/** Only words meant to be spoken reach basic/local TTS. Reactions need a capable model. */
export function prepareSpeechText(text: string) {
  return parseActingCues(text)
    .text // Preserve Bengali-style syllables without punctuation that would split speech into separate utterances.
    .replace(/\bma[\s-]*tal[\s-]*a[\s.-]*i\b/gi, "Maa taal A I")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[0-9#*]\uFE0F?\u20E3/gu, "")
    .replace(
      /\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\u200D\uFE0F\u20E3]/gu,
      "",
    )
    .replace(/[*#`_]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function speechChunks(text: string) {
  const clean = prepareSpeechText(text);
  // Short chunks let delivery adapt while the sober-up transition is running.
  return (
    clean
      .match(/[^.!?,;:\n]+[.!?,;:]*|\n/g)
      ?.flatMap((part) => {
        const words = part.trim().split(/\s+/);
        const chunks: string[] = [];
        for (let i = 0; i < words.length;) {
          let end = Math.min(words.length, i + 10);
          // Keep the name in one utterance, even when it lands on a chunk boundary.
          for (let j = i; j < end; j++) {
            if (
              words[j] === "Maa" &&
              words[j + 1] === "taal" &&
              words[j + 2] === "A" &&
              /^I[.!?,;:]*$/.test(words[j + 3] || "") &&
              j + 4 > end
            )
              end = j === i ? j + 4 : j;
          }
          chunks.push(words.slice(i, end).join(" "));
          i = end;
        }
        return chunks;
      })
      .filter(Boolean) || []
  );
}
