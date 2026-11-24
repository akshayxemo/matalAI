import { generateChat, type ChatMessage } from "@/lib/providers/chat";
import {
  personalityPrompt,
  cleanPerformanceNotes,
} from "@/lib/engines/personality";
import { limit } from "@/lib/engines/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!limit(`chat:${key}`))
    return Response.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  try {
    if (Number(request.headers.get("content-length") || 0) > 100000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const { messages, level, drinkId } = await request.json();
    if (
      !Array.isArray(messages) ||
      messages.length < 1 ||
      messages.length > 20 ||
      !Number.isFinite(level) ||
      level < 0 ||
      level > 100 ||
      typeof drinkId !== "string" ||
      drinkId.length > 30 ||
      !messages.every(
        (m: ChatMessage) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.length > 0 &&
          m.content.length <= 4000,
      ) ||
      messages.at(-1).role !== "user"
    )
      return Response.json({ error: "Invalid request." }, { status: 400 });
    const reply = await generateChat([
      { role: "system", content: personalityPrompt(level, drinkId) },
      ...messages,
    ]);
    return Response.json({ reply: cleanPerformanceNotes(reply) });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Could not reach the model.",
      },
      { status: 502 },
    );
  }
}
