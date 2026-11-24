import { prepareSpeechText } from "@/lib/engines/speech-delivery";
import { readSettings } from "@/lib/config/settings";
import {
  generateVoice,
  snapshot,
  type VoiceSnapshot,
} from "@/lib/providers/voice";
import { limit } from "@/lib/engines/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!limit(`voice:${key}`, 10))
    return Response.json(
      { error: "Too many voice requests." },
      { status: 429 },
    );
  try {
    if (Number(request.headers.get("content-length") || 0) > 10000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const { text, level, voice } = await request.json();
    if (
      typeof text !== "string" ||
      text.length < 1 ||
      text.length > 4000 ||
      !Number.isFinite(level) ||
      level < 0 ||
      level > 100
    )
      return Response.json({ error: "Invalid request." }, { status: 400 });
    const spoken = prepareSpeechText(text);
    if (!spoken)
      return Response.json({ error: "No spoken words." }, { status: 400 });
    const settings = await readSettings();
    const v: VoiceSnapshot = voice || snapshot(settings);
    if (
      !["local", "elevenlabs", "system"].includes(v.provider) ||
      !["male", "female"].includes(v.presentation) ||
      typeof v.profile !== "string" ||
      v.profile.length > 100
    )
      return Response.json(
        { error: "Invalid voice selection." },
        { status: 400 },
      );
    const result = await generateVoice(text, level, v, settings);
    return new Response(result.audio, {
      headers: {
        "Content-Type": result.type,
        "Cache-Control": "no-store",
        ...(result.fallback ? { "X-Voice-Fallback": "system" } : {}),
      },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Voice failed." },
      { status: 502 },
    );
  }
}
