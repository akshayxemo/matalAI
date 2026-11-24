<img width="1469" height="725" alt="Screenshot 2026-11-24 at 4 29 13 PM" src="https://github.com/user-attachments/assets/0c0c5393-6442-43b3-a119-57fceb2ae613" />

# MatalAI 🍸

Created by **akshayxemo**. Copyright © 2026 akshayxemo. MatalAI’s original project code is available under the [MIT License](LICENSE). Third-party models and dependencies have their own licenses.

A playful AI companion whose fictional personality and voice change as you add drinks. This is a game, not an intoxication or blood-alcohol calculator.

## Complete setup from scratch (macOS)

This guide uses Terminal, a free app already on your Mac. Open it with Spotlight: press **⌘ Space**, type **Terminal**, and press Return. Lines inside a code block are commands: paste one line, press Return, and wait for it to finish. You need internet for installation and model downloads, several GB of free disk space, and an Apple Silicon Mac for the optional MLX voice. The basic app also works on macOS Intel with a compatible Ollama model and system voice.

### 1. Install Node.js

Download and run the current LTS macOS installer from [nodejs.org](https://nodejs.org/en/download). Close and reopen Terminal after installing, then check:

```sh
node --version
npm --version
```

Both commands should print a version. Next.js requires Node.js 20.9 or newer. If a command is not found, reopen Terminal and reinstall Node from the official installer.

### 2. Install and start Ollama

Download [Ollama for macOS](https://ollama.com/download/mac), install it and open it. Its current macOS installer requires macOS 14 or later. In Terminal check `ollama --version`. With the Ollama app running, download the default chat model:

```sh
ollama pull llama3.2:3b
ollama list
```

The model is a multi-gigabyte download. `ollama list` should show `llama3.2:3b`. If the app is not running, start it or run `ollama serve` in a separate Terminal window. If it reports the address is already in use, an Ollama server may already be running.

### 3. Get the project

If you received a ZIP, extract it and open Terminal inside the extracted MatalAI folder. If you have a repository URL, clone it with Git and enter the resulting folder. On this Mac the existing project is here:

```sh
cd "$HOME/Desktop/Personal/MatalAI"
```

For another location, type `cd ` (including the space), drag the project folder into Terminal, and press Return. Check that you are in the right folder with `ls`: you should see `package.json` and `src`.

### 4. Install and run MatalAI

```sh
npm install
npm run dev
```

Leave this Terminal window open. Open the **Local** address printed by Next.js in Chrome or Safari; usually it is `http://localhost:3000`, but Next.js may select another port if that one is busy. Open **Start a conversation** on the home page. Press Control-C in the terminal to stop the app when finished.

### 5. Start chatting

Ask any question, select drinks to change the fictional tipsy level, and use **Listen** beneath a reply. Each reply retains its own level. The header shows sobriety and has a **Sober up** button; sending pauses during the five-second transition. The gear opens independent chat and voice settings. The first model response may take longer while it loads.

### Next time

Open Ollama, then open Terminal in the project folder and run `npm run dev`. Open the printed Local address. No `npm install` is needed again unless dependencies change. If you use the optional MLX voice server, start it separately as described below.

### Troubleshooting

- **`node` / `npm` / `ollama` not found:** install the relevant program, close and reopen Terminal, then check the versions above.
- **Ollama offline or model missing:** open Ollama, run `ollama list` and `ollama pull llama3.2:3b`. In settings, save the actual installed model name and test saved chat settings.
- **Address already in use:** use the different Local URL printed by Next.js; do not assume port 3000.
- **No sound:** check Mac output volume and the browser tab’s sound setting, then press Listen again. If MLX is offline, the app reports that it is using the Mac voice.
- **Slow or out of memory:** use a smaller installed chat model via settings, close other applications, or select Mac system voice instead of MLX.
- **ElevenLabs 402:** check the account’s available credits; choose a local voice if you do not want paid usage.

## Expressive local voice on Apple Silicon

MatalAI speaks to the [MLX Audio server](https://github.com/Blaizzy/mlx-audio/blob/main/docs/guides/web-ui-api-server.md), using Qwen3-TTS CustomVoice. It supports preset voices and style instructions. [Qwen3-TTS model documentation](https://github.com/Blaizzy/mlx-audio/blob/main/mlx_audio/tts/models/qwen3_tts/README.md) describes available models and speakers. The 1.7B model is heavier but has stronger style control; it and Ollama compete for unified memory on an 8 GB Mac. First generation may be slow and requires a model download and free disk space. This integration has not yet been verified against a running MLX server on this machine.

On an Apple Silicon Mac, create a separate Python environment with a Python version supported by the current MLX Audio package (Python 3.11 or 3.12 is a practical choice):

```sh
# Install Python 3.12 from https://www.python.org/downloads/ first.
python3.12 -m venv ~/.matalai-voice-venv
~/.matalai-voice-venv/bin/pip install 'mlx-audio[server]'
~/.matalai-voice-venv/bin/mlx_audio.server --host 127.0.0.1 --port 8000
```

The command may be available as `python -m mlx_audio.server` depending on package version. Choose **Local expressive · MLX Audio** in settings. The model defaults to `mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-6bit`; male/female profiles default to Ryan and Vivian. Model compatibility, download size, speed, and voice quality depend on hardware and package version. The model can vary tone and pacing, but convincing drunk articulation is not guaranteed. For lighter operation select **Mac system voice**. Browser speech is available as a fallback in the existing client, but selection for non-macOS hosts is not yet exposed in the settings UI.

## Optional providers

Chat settings support Ollama, OpenAI-compatible endpoints, and OpenAI. Save settings before using **Test saved chat settings**; Ollama model discovery populates the model selector. Voice settings are independent: select MLX Audio, Mac system voice, or ElevenLabs. For ElevenLabs, add an API key and accessible male/female voice IDs. **Test saved voice settings** validates account access and attempts to list available voices. ElevenLabs calls can consume credits and have account-specific model/voice restrictions; check [current pricing](https://elevenlabs.io/pricing) before use. The integration sends response text and style tags to ElevenLabs and has not been tested against a real key in this environment.

Settings are stored in `~/.matalai/settings.json` with owner-only permissions. API keys are never returned to the UI or stored in the project. The gear interface only accepts settings changes from a same-origin localhost request; it is intended for one user on a local machine. Leave a key blank when editing to retain it or check its removal option. Do not paste secrets into chat, Git, or public screenshots.

## Architecture and limitations

`src/lib/providers/chat.ts` adapts chat APIs. `src/lib/providers/voice.ts` dispatches MLX, ElevenLabs, and system voice requests. `src/lib/config/settings.ts` owns local configuration; `src/app/api` keeps credentials on the server. Drink scoring, persona prompts, and speech cleanup are separate engines. Each newly generated response captures its level and voice provider/profile; audio is created only when Listen is pressed. Voice server/model URLs and credentials are current global settings, so changing them may affect uncached older replies. Hosted or self-hosted deployments need secure authentication, a server-side secret store, CSRF protection, outbound URL restrictions, shared rate limiting and spending controls. The local settings UI deliberately does not support remote management, and local Ollama/MLX addresses on a developer laptop will not automatically be reachable from a hosted server. Do not expose this personal server publicly without additional security work.

The app uses no database. Chat history is held in the tab. Run `npm test`, `npm run format:check`, and `npm run build` to verify the project. Use `npm run format` to format source files and tests.
