"use client";
import { Smile } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { stopVoice, type VoiceMode } from "@/lib/engines/voice";
import { Button } from "./ui/button";
import { ResponseAudio, type VoiceChoice } from "./response-audio";
export type Message = {
  role: "user" | "assistant";
  content: string;
  level: number;
  voice?: VoiceChoice;
  error?: boolean;
};
const welcome =
  "Well, hello there. I’m MatalAI — your charmingly questionable drinking buddy. Pick me a drink or keep me sober, then tell me what’s on your mind. 🍸";
export function ChatPanel({
  level,
  drinkId,
  sobering,
  resetKey,
  intro,
  voice,
}: {
  level: number;
  drinkId: string;
  sobering: boolean;
  resetKey: number;
  intro: ReactNode;
  voice?: VoiceChoice;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcome, level: 0 },
  ]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("browser");
  const messageList = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setVoiceMode(d.voiceMode || "browser"))
      .catch(() => {});
  }, []);
  useEffect(
    () => () => {
      controller.current?.abort();
      stopVoice();
    },
    [],
  );
  useEffect(() => {
    controller.current?.abort();
    stopVoice();
    setPending(false);
    setMessages([{ role: "assistant", content: welcome, level: 0 }]);
  }, [resetKey]);
  useEffect(() => {
    const list = messageList.current;
    if (list) list.scrollTop = messages.length === 1 ? 0 : list.scrollHeight;
  }, [messages, pending]);
  async function send(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || pending || sobering) return;
    const requestLevel = Math.round(level);
    const user: Message = { role: "user", content: text, level: requestLevel };
    const prior = messages
      .filter(
        (m) =>
          !m.error && !(level === 0 && m.role === "assistant" && m.level > 0),
      )
      .slice(-18);
    const next = [...prior, user];
    setMessages((m) => [...m, user]);
    setPrompt("");
    setPending(true);
    const ac = new AbortController();
    controller.current = ac;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          level: requestLevel,
          drinkId,
        }),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply, level: requestLevel, voice },
      ]);
    } catch (error) {
      if (!ac.signal.aborted)
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `Could not reach the model: ${error instanceof Error ? error.message : "Unknown error"}. Check the setup instructions.`,
            level: 0,
            error: true,
          },
        ]);
    } finally {
      if (!ac.signal.aborted) setPending(false);
    }
  }

  return (
    <>
      <div
        className="messages"
        ref={messageList}
        tabIndex={0}
        aria-label="Chat history"
        aria-live="polite"
      >
        <div className="chat-intro" aria-live="off">
          {intro}
          <div className="chat-heading">
            <div>
              <span className="eyebrow">GOOD TIMES, GREAT CHAT</span>
              <h2>
                Pull up a stool<span>.</span>
              </h2>
            </div>
            <span className="voice-badge">♪ &nbsp; VOICE ON TAP</span>
          </div>
        </div>
        {messages.map((m, i) => (
          <div className={`message ${m.role}`} key={i}>
            <div className="avatar">
              {m.role === "user" ? (
                <Smile size={19} strokeWidth={2} aria-hidden="true" />
              ) : (
                "✳"
              )}
            </div>
            <div>
              <div className="message-meta">
                {m.role === "user"
                  ? "YOU"
                  : `MATALAI · ${m.level}% WHEN GENERATED`}
              </div>
              <div className="bubble">{m.content}</div>
              {m.role === "assistant" && !m.error && (
                <ResponseAudio
                  text={m.content}
                  level={m.level}
                  mode={voiceMode}
                  voice={m.voice}
                />
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="message assistant">
            <div className="avatar">✳</div>
            <div className="bubble">Thinking…</div>
          </div>
        )}
      </div>
      <form onSubmit={send}>
        <label className="sr-only" htmlFor="prompt">
          Your message
        </label>
        <div className="composer">
          <input
            id="prompt"
            maxLength={4000}
            autoComplete="off"
            placeholder={
              sobering
                ? "Sobering up… messages resume in a moment."
                : "Say something... anything."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
          <Button
            id="send"
            type="submit"
            disabled={pending || sobering}
            aria-label="Send message"
          >
            ↑
          </Button>
        </div>
        <div className="composer-footer">
          <span>GOOD CONVERSATIONS START HERE.</span>
          <span>AI CAN MAKE MISTAKES. DRUNK OR NOT.</span>
        </div>
      </form>
    </>
  );
}
