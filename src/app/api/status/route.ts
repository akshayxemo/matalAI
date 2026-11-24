import { readSettings } from "@/lib/config/settings";
import { snapshot } from "@/lib/providers/voice";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await readSettings();
  let online = false;
  try {
    const base = (
      s.chatProvider === "openai" ? "https://api.openai.com/v1" : s.chatBase
    ).replace(/\/$/, "");
    const res = await fetch(
      `${base}${s.chatProvider === "ollama" ? "/api/tags" : "/models"}`,
      {
        headers: s.chatKey ? { Authorization: `Bearer ${s.chatKey}` } : {},
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      },
    );
    const data = await res.json();
    online =
      res.ok &&
      (s.chatProvider !== "ollama" ||
        data.models?.some(
          (m: { name: string }) =>
            m.name === s.chatModel || m.name === `${s.chatModel}:latest`,
        ));
  } catch {}
  return Response.json({
    online,
    model: s.chatModel,
    provider: s.chatProvider,
    voiceMode: "local",
    voice: snapshot(s),
  });
}
