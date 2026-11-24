import { readSettings } from "@/lib/config/settings";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const u = new URL(request.url);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
    request.headers.get("sec-fetch-site") !== "same-origin"
  )
    return Response.json({ message: "Unavailable." }, { status: 403 });
  const s = await readSettings();
  try {
    if (u.searchParams.get("provider") === "chat") {
      const base = (
        s.chatProvider === "openai" ? "https://api.openai.com/v1" : s.chatBase
      ).replace(/\/$/, "");
      const r = await fetch(
        base + (s.chatProvider === "ollama" ? "/api/tags" : "/models"),
        {
          headers: s.chatKey ? { Authorization: `Bearer ${s.chatKey}` } : {},
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!r.ok)
        return Response.json({
          message: `Chat provider returned ${r.status}. Check your settings.`,
        });
      const d = await r.json();
      const models =
        (s.chatProvider === "ollama"
          ? d.models?.map((m: { name: string }) => m.name)
          : d.data?.map((m: { id: string }) => m.id)) || [];
      return Response.json({
        message: models.includes(s.chatModel)
          ? "Connected. Selected model is available."
          : "Connected. Verify that the selected model is available.",
        models: models.slice(0, 200),
      });
    }
    if (s.voiceProvider === "system")
      return Response.json({
        message:
          process.platform === "darwin"
            ? "Mac system voice is available."
            : "System voice requires macOS.",
      });
    const r = await fetch(
      s.voiceProvider === "elevenlabs"
        ? "https://api.elevenlabs.io/v1/user"
        : s.voiceBase.replace(/\/$/, "") + "/models",
      {
        headers:
          s.voiceProvider === "elevenlabs" ? { "xi-api-key": s.voiceKey } : {},
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!r.ok)
      return Response.json({
        message: `Voice provider returned ${r.status}. Check the key and server.`,
      });
    if (s.voiceProvider === "elevenlabs") {
      const voicesResponse = await fetch(
        "https://api.elevenlabs.io/v1/voices",
        {
          headers: { "xi-api-key": s.voiceKey },
          signal: AbortSignal.timeout(8000),
        },
      );
      const voicesData = voicesResponse.ok ? await voicesResponse.json() : {};
      return Response.json({
        message:
          "Connected. Choose an available voice ID, then generate a reply to test it.",
        voices: (voicesData.voices || [])
          .slice(0, 100)
          .map((v: { name: string; voice_id: string }) => ({
            name: v.name,
            id: v.voice_id,
          })),
      });
    }
    return Response.json({
      message: "Connected. Generate a reply to test the selected voice.",
    });
  } catch {
    return Response.json({
      message:
        "Could not connect. Check that the server is running and the address is correct.",
    });
  }
}
