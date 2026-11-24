"use client";
import { useEffect, useRef, useState } from "react";
import { playVoice, stopVoice, type VoiceMode } from "@/lib/engines/voice";
import { Button } from "./ui/button";

let activePlayer: HTMLAudioElement | null = null;
let activeGeneration: AbortController | null = null;

export type VoiceChoice = {
  provider: "local" | "elevenlabs" | "system";
  presentation: "male" | "female";
  profile: string;
};
export function ResponseAudio({
  text,
  level,
  mode,
  voice,
}: {
  text: string;
  level: number;
  mode: VoiceMode;
  voice?: VoiceChoice;
}) {
  const player = useRef<HTMLAudioElement>(null);
  const request = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  const deviceOwned = useRef(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const audio = player.current;
    return () => {
      request.current?.abort();
      if (activeGeneration === request.current) activeGeneration = null;
      audio?.pause();
      if (activePlayer === audio) activePlayer = null;
      if (deviceOwned.current) stopVoice();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  async function start(audio: HTMLAudioElement) {
    // Replays call play() directly in the button click, with no asynchronous fetch.
    try {
      await audio.play();
    } catch (e) {
      setLoading(false);
      setPlaying(false);
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Audio is ready. Click Listen again to allow playback."
          : "Playback did not start. Please try Listen again.",
      );
    }
  }
  async function listen() {
    setError("");
    if (loading) {
      request.current?.abort();
      if (activeGeneration === request.current) activeGeneration = null;
      setLoading(false);
      return;
    }
    if (playing) {
      player.current?.pause();
      if (player.current) player.current.currentTime = 0;
      if (deviceOwned.current) {
        stopVoice();
        deviceOwned.current = false;
      }
      setPlaying(false);
      return;
    }
    activeGeneration?.abort();
    activeGeneration = null;
    if (activePlayer) {
      activePlayer.pause();
      activePlayer = null;
    }
    if (mode === "browser") {
      deviceOwned.current = true;
      setLoading(true);
      try {
        await playVoice(text, level, {
          onStart: () => {
            setLoading(false);
            setPlaying(true);
          },
          onEnd: () => {
            deviceOwned.current = false;
            setPlaying(false);
          },
          onError: (message) => {
            deviceOwned.current = false;
            setLoading(false);
            setPlaying(false);
            setError(message);
          },
        });
      } catch (e) {
        deviceOwned.current = false;
        setLoading(false);
        setError(e instanceof Error ? e.message : "Speech unavailable.");
      }
      return;
    }
    const audio = player.current;
    if (!audio) {
      setError("Audio is unavailable. Please refresh.");
      return;
    }
    if (objectUrl.current) {
      await start(audio);
      return;
    }
    if (loading) return;
    setLoading(true);
    const controller = new AbortController();
    request.current = controller;
    activeGeneration = controller;
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, level, voice }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not prepare speech.");
      }
      setFallback(response.headers.get("X-Voice-Fallback") === "system");
      const blob = await response.blob();
      if (!blob.size) throw new Error("The speech response was empty.");
      if (controller.signal.aborted) return;
      const src = URL.createObjectURL(blob);
      objectUrl.current = src;
      audio.src = src;
      audio.volume = 1;
      audio.muted = false;
      audio.load();
      await start(audio);
    } catch (e) {
      if (!controller.signal.aborted) {
        setLoading(false);
        setError(e instanceof Error ? e.message : "Audio failed.");
      }
    } finally {
      if (activeGeneration === controller) activeGeneration = null;
      if (request.current === controller && controller.signal.aborted)
        setLoading(false);
    }
  }
  return (
    <div className="response-audio">
      <Button
        variant="ghost"
        className="listen"
        onClick={listen}
        aria-label={`${loading ? "Preparing audio for" : playing ? "Stop" : "Listen to"} response at drunk level ${level}%`}
        aria-busy={loading}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="voice-spinner" aria-hidden="true" /> Preparing
            voice…
          </>
        ) : playing ? (
          "■ Stop"
        ) : (
          "▶ Listen"
        )}{" "}
        · Drunk {level}%
      </Button>
      <audio
        ref={player}
        hidden
        preload="none"
        onPlay={() => {
          stopVoice();
          if (activePlayer && activePlayer !== player.current)
            activePlayer.pause();
          activePlayer = player.current;
        }}
        onPlaying={() => {
          setLoading(false);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setLoading(false);
          setPlaying(false);
          setError("Audio playback failed. Please try Listen again.");
        }}
      />
      {fallback && (
        <p className="note">
          Local voice server is offline; using the Mac voice.
        </p>
      )}
      {error && (
        <p className="note" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
