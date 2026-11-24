<img width="1469" height="725" alt="Screenshot 2026-11-24 at 4 29 13 PM" src="https://github.com/user-attachments/assets/0c0c5393-6442-43b3-a119-57fceb2ae613" />

# MatalAI 🍸

A modular Next.js / TypeScript app for a fictional tipsy chat companion. Drinks affect its personality and voice; **Sober up** brings it back over five seconds. This is a game, not a blood-alcohol calculator.

## Start locally for free

You need Node.js 20.9+ and Ollama. The default is the free local conversational model `llama3.2:3b`. Run `ollama pull llama3.2:3b` once if it is not installed. This replaces the coding-oriented model, which followed character instructions poorly.

1. Start the Ollama server in one terminal: `ollama serve`.
2. In another terminal:
   ```sh
   cd "$HOME/Desktop/Personal/MatalAI"
   npm install
   npm run dev
   ```
3. Open http://localhost:3000. No API keys are required for local chat and browser speech.

To use another local model, copy `.env.example` to `.env.local` and set `OLLAMA_MODEL` to its installed name. Model downloads require internet and storage; check each model's license.

## Stack and modules

- Next.js App Router and TypeScript, Tailwind CSS, a local shadcn-style Button primitive, and Motion for React (the current Framer Motion package).
- `src/lib/engines/drinks.ts`: drink data, fictional score, and stages.
- `src/lib/engines/personality.ts`: persona instructions, generated on the server.
- `src/lib/providers/chat.ts`: interchangeable Ollama and OpenAI-compatible chat providers.
- `src/lib/engines/speech-delivery.ts`: pure stage-scaled pacing and chunk planning.
- `src/lib/engines/voice.ts`: speech playback and Web Audio tremolo/rate effects for generated audio; free browser speech fallback.
- `src/components`: independent drink menu, mood/sobriety controls, chat, and UI primitives.
- `src/app/api`: server-only chat, voice and status routes. No database; conversations and meter are held in browser memory.
- `legacy/` preserves the original Python version.

## Optional hosted models and expressive voice

Copy `.env.example` to `.env.local`, then set the provider URL, model and API key on the **server**. The voice route supports OpenAI-compatible `/audio/speech` endpoints and style instructions; support for instructions varies by provider. Without these settings, a local Mac uses its built-in `say` voice to generate a WAV file, played through a Listen/Stop button with no visible player or download link. Other hosts use built-in browser speech with chunk-by-chunk variations in pacing, pitch and pauses. Each message stores the percentage captured when its prompt was submitted. Its label and voice playback keep that percentage even if the meter changes while the reply is pending or while audio is playing. This remains a device speech approximation; a configured expressive speech provider can provide more natural articulation. Hosted providers may charge and their free tiers can change; check their current pricing and terms. Never put keys in client code or commit `.env.local`.

## Deployment

The app can be deployed to a Node-compatible Next.js host such as Vercel, but local Ollama at `127.0.0.1` on your Mac will not be available to a public deployment. Configure a hosted model and optional voice provider using server-side environment variables. The included in-memory rate limiter is only a local/single-instance safeguard: it resets on restart and is not reliable across serverless instances. Before public launch, add a shared rate limiter, authenticated or otherwise abuse-resistant access, provider spending limits, and production monitoring. No deployment has been performed.

## Verification

`npm test` checks voice intensity, immutable reply playback levels, immediate device speech startup, explicit playback errors, and cancellation of queued or pending speech. `npm run build` checks the production build and TypeScript. Text personas have been compared against the actual local model at sober, tipsy and maximum levels.

Listen starts speech and changes to Stop while it is playing. There are no visible audio controls or downloads. Local WAV effects are baked into the audio at the reply’s saved percentage, so older messages retain their own voice level.

The header keeps a compact sobriety badge and Sober up button visible. The larger mood card scrolls with chat history. Drinks and chat history have independent scroll regions with slim scrollbars; the composer stays at the bottom.
