# MatalAI 🍸

A playful local chat app where drinks change an AI's personality and spoken voice. This is a simulation, not a real blood-alcohol calculator.

## Start it on your Mac

You need Python 3 and [Ollama](https://ollama.com/download). Both are already installed on this computer, but Ollama's server was not running when this project was created.

1. Open Terminal and start Ollama in one window:
   ```sh
   ollama serve
   ```
   If it says the address is already in use, the server is probably already running.
2. This Mac already has the default `qwen2.5-coder:1.5b` model. For a more conversational option, download a free local model (requires internet and several GB of storage):
   ```sh
   ollama pull llama3.2:3b
   ```
3. Go to this folder and start the app (use `MATALAI_MODEL=llama3.2:3b python3 server.py` if you downloaded that model):
   ```sh
   cd "/Users/akshaykumardas/Desktop/Personal/MatalAI"
   python3 server.py
   ```
   Or simply open Terminal in this MatalAI folder and run `python3 server.py`.
4. Open <http://127.0.0.1:8765>. Choose drinks and send a message. Click **Listen** under a response for browser speech.

No API key or paid subscription is required. The default model runs locally, so speed depends on your Mac. It is a small coding-oriented model already present on this computer; a larger conversational model may give better character responses. Ollama models have their own licenses; check the model's terms for your use. To use another model you have already pulled, start the app with `MATALAI_MODEL=your-model python3 server.py`.

## How it works

Each drink adds a fixed amount to the fictional tipsy meter. The displayed ABV is illustrative and is not used to calculate real intoxication. The meter naturally drops by 2 points per minute, including time away; **Sober up** immediately removes 25 points. Each response uses the current level, and its Listen button uses that response's level. The browser's built-in speech engine changes rate and pitch; voices and the quality of the effect vary by device and browser. This is a basic voice effect, not a custom expressive drunk voice model.

The conversation lives in the current browser tab's memory; only the meter is saved locally in the browser. Requests go from the local Python server to Ollama on the same computer by default. There is no authentication; the server binds to localhost and is intended for personal local use.

## Deployment

This project is ready for local use, not yet a public deployment. A public version needs a hosted inference provider or an accessible model server, server-side secret management, abuse/rate limiting, and a deployment host. Local Ollama and browser speech keep the personal version free; hosted model and voice services can have quotas or usage costs. Never put provider API keys in browser code. A more natural voice would require an expressive TTS model or service and additional integration.
