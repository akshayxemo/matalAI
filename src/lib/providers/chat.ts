import { readSettings } from "@/lib/config/settings";
export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};
export async function generateChat(messages: ChatMessage[]) {
  const s = await readSettings();
  const ollama = s.chatProvider === "ollama";
  const base = (
    s.chatProvider === "openai" ? "https://api.openai.com/v1" : s.chatBase
  ).replace(/\/$/, "");
  const res = await fetch(
    `${base}${ollama ? "/api/chat" : "/chat/completions"}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(!ollama && s.chatKey
          ? { Authorization: `Bearer ${s.chatKey}` }
          : {}),
      },
      body: JSON.stringify({
        model: s.chatModel,
        messages,
        ...(ollama ? { stream: false } : {}),
      }),
      signal: AbortSignal.timeout(180000),
    },
  );
  if (!res.ok)
    throw new Error(
      `Chat provider returned ${res.status}. Check the model, server and credentials.`,
    );
  const data = await res.json();
  const text = ollama
    ? data.message?.content
    : data.choices?.[0]?.message?.content;
  if (typeof text !== "string")
    throw new Error("The chat provider returned an invalid response.");
  return text as string;
}
