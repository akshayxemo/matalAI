import {
  readSettings,
  writeSettings,
  publicSettings,
  localRequest,
  type Settings,
} from "@/lib/config/settings";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (
    !localRequest(request) &&
    !(
      ["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(request.url).hostname,
      ) && request.headers.get("sec-fetch-site") === "same-origin"
    )
  )
    return Response.json(
      { error: "Settings are only available on this computer." },
      { status: 403 },
    );
  return Response.json(publicSettings(await readSettings()), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  if (!localRequest(request))
    return Response.json(
      { error: "Settings are only available on this computer." },
      { status: 403 },
    );
  try {
    const data = await request.json();
    const old = await readSettings();
    const val = { ...old };
    const allowed = [
      "chatBase",
      "chatModel",
      "voiceBase",
      "voiceModel",
      "maleVoice",
      "femaleVoice",
    ] as const;
    for (const k of allowed) {
      if (typeof data[k] !== "string" || data[k].length > 300)
        throw Error("Invalid settings");
      val[k] = data[k].trim();
    }
    if (
      !["ollama", "compatible", "openai"].includes(data.chatProvider) ||
      !["local", "elevenlabs", "system"].includes(data.voiceProvider) ||
      !["male", "female"].includes(data.presentation)
    )
      throw Error("Invalid provider");
    val.chatProvider = data.chatProvider;
    val.voiceProvider = data.voiceProvider;
    val.presentation = data.presentation;
    for (const k of ["chatKey", "voiceKey"] as const) {
      if (
        data[k] !== undefined &&
        (typeof data[k] !== "string" ||
          data[k].length > 500 ||
          /[\r\n]/.test(data[k]))
      )
        throw Error("Invalid key");
      if (data[k]) val[k] = data[k].trim();
      if (data[`clear${k[0].toUpperCase() + k.slice(1)}`]) val[k] = "";
    }
    for (const url of [val.chatBase, val.voiceBase]) {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
        throw Error("Invalid server URL");
    }
    await writeSettings(val as Settings);
    return Response.json(publicSettings(val));
  } catch {
    return Response.json(
      { error: "Check your settings and server URLs." },
      { status: 400 },
    );
  }
}
