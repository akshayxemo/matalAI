"use client";
import { useEffect, useRef, useState } from "react";
import { SettingsPanel } from "./settings";
import type { VoiceChoice } from "./response-audio";
import { DrinkMenu } from "./drink-menu";
import { MoodCard } from "./mood-card";
import { ChatPanel } from "./chat-panel";
import { pour, type Drink } from "@/lib/engines/drinks";
import { Button } from "./ui/button";
export function MatalApp() {
  const [level, setLevel] = useState(0);
  const [drinkId, setDrinkId] = useState("mocktail");
  const [resetKey, setResetKey] = useState(0);
  const [sobering, setSobering] = useState(false);
  const [status, setStatus] = useState("Checking model…");
  const [online, setOnline] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voice, setVoice] = useState<VoiceChoice>();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        setVoice(d.voice);
        setOnline(d.online);
        setStatus(
          d.online
            ? `${d.provider === "ollama" ? "Local model" : "Hosted model"} ready · ${d.model}`
            : d.provider === "ollama"
              ? "Ollama offline or model missing"
              : "Model setup needed",
        );
      })
      .catch(() => setStatus("Server offline"));
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
  function cancel() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setSobering(false);
  }
  function sober() {
    if (timer.current || level <= 0) return;
    setDrinkId("mocktail");
    setSobering(true);
    const start = performance.now(),
      initial = level;
    timer.current = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / 5000);
      setLevel(initial * (1 - progress));
      if (progress >= 1) cancel();
    }, 50);
  }
  function addDrink(d: Drink) {
    cancel();
    setDrinkId(d.id);
    setLevel((l) => pour(l, d));
  }
  function reset() {
    cancel();
    setLevel(0);
    setDrinkId("mocktail");
  }
  return (
    <div className="app">
      <header>
        <a className="brand" href="/">
          <span className="brand-icon">✳</span> matal<span>AI</span>
          <small>THE TIPSY CHATBOT</small>
        </a>
        <div className="header-right">
          <span
            className="sobriety-readout"
            title={`${Math.round(level)}% tipsy`}
            aria-label={`Current sobriety: ${100 - Math.round(level)} percent sober, ${Math.round(level)} percent tipsy`}
          >
            <span className="sobriety-dot" aria-hidden="true" />
            {100 - Math.round(level)}% sober
          </span>
          <Button
            variant="ghost"
            className="header-sober"
            onClick={sober}
            disabled={level === 0 || sobering}
          >
            {sobering ? "Sobering…" : "Sober up"}
          </Button>
          <button
            type="button"
            className="settings-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            ⚙
          </button>
          <span className={`status ${online ? "online" : ""}`}>{status}</span>
          <Button
            variant="outline"
            className="icon-button"
            onClick={() => setResetKey((k) => k + 1)}
            aria-label="Start a new conversation"
          >
            ↺
          </Button>
        </div>
      </header>
      <main>
        <DrinkMenu onPour={addDrink} />
        <section className="conversation">
          <ChatPanel
            voice={voice}
            level={level}
            drinkId={drinkId}
            sobering={sobering}
            resetKey={resetKey}
            intro={
              <MoodCard
                level={level}
                sobering={sobering}
                onSober={sober}
                onReset={reset}
              />
            }
          />
        </section>
      </main>
      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onSaved={setVoice}
        />
      )}
      <footer>
        MADE FOR A GOOD TIME <span>✳</span> PLEASE CHAT RESPONSIBLY
      </footer>
    </div>
  );
}
