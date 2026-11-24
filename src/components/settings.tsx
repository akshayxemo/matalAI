"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { VoiceChoice } from "./response-audio";
type Settings = {
  chatProvider: "ollama" | "compatible" | "openai";
  chatBase: string;
  chatModel: string;
  hasChatKey: boolean;
  voiceProvider: "local" | "elevenlabs" | "system";
  voiceBase: string;
  voiceModel: string;
  hasVoiceKey: boolean;
  maleVoice: string;
  femaleVoice: string;
  presentation: "male" | "female";
};
export function SettingsPanel({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (voice: VoiceChoice) => void;
}) {
  const [s, setS] = useState<Settings | null>(null);
  const [chatKey, setChatKey] = useState(""),
    [voiceKey, setVoiceKey] = useState(""),
    [clearChatKey, setClearChatKey] = useState(false),
    [clearVoiceKey, setClearVoiceKey] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/settings", { headers: { "X-Requested-With": "MatalAI" } })
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            "Settings are available when opening the app on localhost.",
          );
        setS(await r.json());
      })
      .catch((e) => setNotice(e.message));
  }, []);
  function field(k: keyof Settings, value: string) {
    setS((v) => {
      if (!v) return v;
      if (k === "voiceProvider" && value !== v.voiceProvider) {
        return {
          ...v,
          voiceProvider: value as Settings["voiceProvider"],
          maleVoice: value === "elevenlabs" ? "JBFqnCBsd6RMkjVDRZzb" : "Ryan",
          femaleVoice:
            value === "elevenlabs" ? "EXAVITQu4vr4xnSDxMaL" : "Vivian",
        };
      }
      return { ...v, [k]: value };
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...s,
          chatKey,
          voiceKey,
          clearChatKey,
          clearVoiceKey,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setS(d);
      setChatKey("");
      setVoiceKey("");
      setClearChatKey(false);
      setClearVoiceKey(false);
      onSaved({
        provider: d.voiceProvider,
        presentation: d.presentation,
        profile: d.presentation === "male" ? d.maleVoice : d.femaleVoice,
      });
      setNotice("Settings saved.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  async function check(which: "chat" | "voice") {
    setBusy(true);
    try {
      const r = await fetch(`/api/settings/test?provider=${which}`);
      const d = await r.json();
      setNotice(d.message);
      if (d.models) setModels(d.models);
      if (d.voices) setVoices(d.voices);
    } catch {
      setNotice("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-overlay" onClick={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-title">
          <div>
            <span className="eyebrow">MAKE IT YOURS</span>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>
        {s && (
          <form onSubmit={save}>
            <h3>Chat</h3>
            <label>
              Provider
              <select
                value={s.chatProvider}
                onChange={(e) => field("chatProvider", e.target.value)}
              >
                <option value="ollama">Ollama · local</option>
                <option value="compatible">OpenAI-compatible</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
            {s.chatProvider !== "openai" && (
              <label>
                Server URL
                <input
                  value={s.chatBase}
                  onChange={(e) => field("chatBase", e.target.value)}
                />
              </label>
            )}
            <label>
              Model
              <input
                list="models"
                value={s.chatModel}
                onChange={(e) => field("chatModel", e.target.value)}
              />
              <datalist id="models">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
            {s.chatProvider !== "ollama" && (
              <label>
                API key
                <input
                  type="password"
                  value={chatKey}
                  onChange={(e) => setChatKey(e.target.value)}
                  autoComplete="off"
                  placeholder={
                    s.hasChatKey
                      ? "Saved · leave blank to keep"
                      : "Paste your key"
                  }
                />
              </label>
            )}
            {s.hasChatKey && (
              <label>
                <input
                  type="checkbox"
                  checked={clearChatKey}
                  onChange={(e) => setClearChatKey(e.target.checked)}
                />{" "}
                Remove saved chat key
              </label>
            )}
            <button
              type="button"
              className="settings-test"
              onClick={() => check("chat")}
              disabled={busy}
            >
              Test saved chat settings
            </button>
            <h3>Voice</h3>
            <label>
              Provider
              <select
                value={s.voiceProvider}
                onChange={(e) => field("voiceProvider", e.target.value)}
              >
                <option value="local">Local expressive · MLX Audio</option>
                <option value="system">Mac system voice</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </label>
            <label>
              Voice presentation
              <select
                value={s.presentation}
                onChange={(e) => field("presentation", e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            {s.voiceProvider === "local" && (
              <>
                <label>
                  Local voice server URL
                  <input
                    value={s.voiceBase}
                    onChange={(e) => field("voiceBase", e.target.value)}
                  />
                </label>
                <label>
                  Voice model
                  <input
                    value={s.voiceModel}
                    onChange={(e) => field("voiceModel", e.target.value)}
                  />
                </label>
              </>
            )}
            {s.voiceProvider === "elevenlabs" && (
              <label>
                ElevenLabs API key
                <input
                  type="password"
                  value={voiceKey}
                  onChange={(e) => setVoiceKey(e.target.value)}
                  autoComplete="off"
                  placeholder={
                    s.hasVoiceKey
                      ? "Saved · leave blank to keep"
                      : "Paste your key"
                  }
                />
              </label>
            )}
            {s.hasVoiceKey && (
              <label>
                <input
                  type="checkbox"
                  checked={clearVoiceKey}
                  onChange={(e) => setClearVoiceKey(e.target.checked)}
                />{" "}
                Remove saved voice key
              </label>
            )}
            {s.voiceProvider !== "system" && (
              <>
                <label>
                  Male voice{" "}
                  {s.voiceProvider === "elevenlabs" ? "ID" : "profile"}
                  <input
                    list="voice-profiles"
                    value={s.maleVoice}
                    onChange={(e) => field("maleVoice", e.target.value)}
                  />
                </label>
                <label>
                  Female voice{" "}
                  {s.voiceProvider === "elevenlabs" ? "ID" : "profile"}
                  <input
                    list="voice-profiles"
                    value={s.femaleVoice}
                    onChange={(e) => field("femaleVoice", e.target.value)}
                  />
                </label>
                <datalist id="voice-profiles">
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </datalist>
              </>
            )}
            <p className="settings-hint">
              Save before testing. ElevenLabs requests use your credits; local
              voice requires a running MLX Audio server.
            </p>
            <button
              type="button"
              className="settings-test"
              onClick={() => check("voice")}
              disabled={busy}
            >
              Test saved voice settings
            </button>
            <button className="settings-save" disabled={busy}>
              Save settings
            </button>
          </form>
        )}
        {notice && (
          <p className="settings-notice" role="status">
            {notice}
          </p>
        )}
      </section>
    </div>
  );
}
