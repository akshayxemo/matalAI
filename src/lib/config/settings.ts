import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
export type Settings = {
  chatProvider: "ollama" | "compatible" | "openai";
  chatBase: string;
  chatModel: string;
  chatKey: string;
  voiceProvider: "local" | "elevenlabs" | "system";
  voiceBase: string;
  voiceModel: string;
  voiceKey: string;
  maleVoice: string;
  femaleVoice: string;
  presentation: "male" | "female";
};
const file = join(homedir(), ".matalai", "settings.json");
export const defaults: Settings = {
  chatProvider: "ollama",
  chatBase: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  chatModel: process.env.OLLAMA_MODEL || "llama3.2:3b",
  chatKey: "",
  voiceProvider: "local",
  voiceBase: "http://127.0.0.1:8000/v1",
  voiceModel: "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-6bit",
  voiceKey: "",
  maleVoice: "Ryan",
  femaleVoice: "Vivian",
  presentation: "male",
};
export async function readSettings(): Promise<Settings> {
  try {
    return { ...defaults, ...JSON.parse(await readFile(file, "utf8")) };
  } catch {
    return { ...defaults };
  }
}
export async function writeSettings(value: Settings) {
  await mkdir(join(homedir(), ".matalai"), { recursive: true, mode: 0o700 });
  await writeFile(file, JSON.stringify(value, null, 2), { mode: 0o600 });
}
export function publicSettings(s: Settings) {
  const { chatKey, voiceKey, ...rest } = s;
  return { ...rest, hasChatKey: !!chatKey, hasVoiceKey: !!voiceKey };
}
export function localRequest(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    return (
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      !!origin &&
      new URL(origin).origin === url.origin
    );
  } catch {
    return false;
  }
}
