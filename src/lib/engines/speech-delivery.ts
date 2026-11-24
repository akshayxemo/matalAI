/** Pure delivery planning, shared by playback and regression checks. */
export function speechProfile(level: number, index = 0) {
  const amount = Math.min(100, Math.max(0, level)) / 100;
  const variation = Math.sin(index * 2.4);
  return {
    rate: Math.max(.62, 1 - amount * .28 + variation * amount * .12),
    pitch: 1 - amount * .13 + Math.cos(index * 1.7) * amount * .17,
    pauseMs: amount < .15 ? 60 : Math.round(100 + amount * (180 + (index % 3) * 160)),
  };
}

/** Only words meant to be spoken reach basic/local TTS. Reactions need a capable model. */
export function prepareSpeechText(text: string) {
  const reaction = String.raw`(?:softly\s+)?(?:chuckles?|chuckling|laughs?|laughing|giggles?|giggling|hiccups?|burps?|sighs?|sighing|gasps?|coughs?|clears? throat|slurs?(?: slightly)?|slurring|stunned pause|pauses?(?: for comedic effect)?|whispers?|whispering)`;
  return text
    // Preserve Bengali-style syllables without punctuation that would split speech into separate utterances.
    .replace(/\bma[\s-]*tal[\s-]*a[\s.-]*i\b/gi, 'Maa taal A I')
    .replace(/```[\s\S]*?```/g, '')
    .replace(new RegExp(String.raw`\((?:${reaction})\)|\[(?:${reaction})\]|\*(?:${reaction})\*`, 'gi'), '')
    .replace(/[0-9#*]\uFE0F?\u20E3/gu, '')
    .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\u200D\uFE0F\u20E3]/gu, '')
    .replace(/[*#`_]/g, '')
    .replace(/[ \t]{2,}/g, ' ').trim();
}

export function speechChunks(text: string) {
  const clean = prepareSpeechText(text);
  // Short chunks let delivery adapt while the sober-up transition is running.
  return clean.match(/[^.!?,;:\n]+[.!?,;:]*|\n/g)?.flatMap(part => {
    const words = part.trim().split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 10) chunks.push(words.slice(i, i + 10).join(' '));
    return chunks;
  }).filter(Boolean) || [];
}
