/** Bake gentle rate/pitch and tremolo effects into PCM WAV, playable by native controls. */
export function applyWavEffects(
  input: Uint8Array,
  level: number,
): Uint8Array<ArrayBuffer> {
  const output = Buffer.from(input);
  const strength = Math.min(100, Math.max(0, level)) / 100;
  if (!strength) return new Uint8Array(output);
  if (
    output.toString("ascii", 0, 4) !== "RIFF" ||
    output.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error("Unsupported local audio format.");
  let sampleRate = 0,
    channels = 0;
  for (let offset = 12; offset + 8 <= output.length;) {
    const name = output.toString("ascii", offset, offset + 4),
      size = output.readUInt32LE(offset + 4),
      data = offset + 8;
    if (data + size > output.length) throw new Error("Invalid audio data.");
    if (name === "fmt ") {
      if (
        size < 16 ||
        output.readUInt16LE(data) !== 1 ||
        output.readUInt16LE(data + 14) !== 16
      )
        throw new Error("Unsupported local audio encoding.");
      channels = output.readUInt16LE(data + 2);
      sampleRate = output.readUInt32LE(data + 4);
      const rate = Math.round(sampleRate * (1 - strength * 0.18));
      output.writeUInt32LE(rate, data + 4);
      output.writeUInt32LE(rate * output.readUInt16LE(data + 12), data + 8);
    }
    if (name === "data" && sampleRate && channels) {
      for (let i = 0; i + 2 <= size; i += 2) {
        const time = i / 2 / channels / sampleRate;
        const gain =
          1 - strength * 0.07 + Math.sin(time * Math.PI * 7) * strength * 0.07;
        output.writeInt16LE(
          Math.round(output.readInt16LE(data + i) * gain),
          data + i,
        );
      }
    }
    offset = data + size + (size % 2);
  }
  return new Uint8Array(output);
}
