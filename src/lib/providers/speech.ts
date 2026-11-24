import { applyWavEffects } from "@/lib/engines/wav-effects";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function speechMode(): "local" | "hosted" | "browser" {
  if (
    process.env.TTS_BASE_URL &&
    process.env.TTS_API_KEY &&
    process.env.TTS_MODEL
  )
    return "hosted";
  return process.platform === "darwin" ? "local" : "browser";
}

/** Generate a browser-compatible WAV using the Mac's built-in voice. */
export async function localSpeech(
  text: string,
  level = 0,
  presentation: "male" | "female" = "male",
) {
  const directory = await mkdtemp(join(tmpdir(), "matalai-voice-"));
  try {
    const input = join(directory, "speech.txt");
    const output = join(directory, "speech.wav");
    await writeFile(input, text, "utf8");
    await promisify(execFile)(
      "/usr/bin/say",
      [
        "-v",
        presentation === "female" ? "Samantha" : "Daniel",
        "-f",
        input,
        "-o",
        output,
        "--file-format=WAVE",
        "--data-format=LEI16@22050",
      ],
      { timeout: 60000 },
    );
    return applyWavEffects(new Uint8Array(await readFile(output)), level);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
