const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("fs");
const vm = require("vm");
function load(path, requires, globals = {}) {
  const m = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: m,
    exports: m.exports,
    require: (x) => requires[x],
    Response,
    AbortSignal,
    Uint8Array,
    process,
    encodeURIComponent,
    ...globals,
  });
  return m.exports;
}
const delivery = load("src/lib/engines/speech-delivery.ts", {});
const voiceModules = {
  "./speech": { localSpeech: async () => new Uint8Array([1]) },
  "@/lib/engines/speech-delivery": delivery,
};
const defaults = {
  chatProvider: "ollama",
  chatBase: "http://localhost:11434",
  chatModel: "example",
  chatKey: "",
  voiceProvider: "local",
  voiceBase: "http://localhost:8000/v1",
  voiceModel: "qwen",
  voiceKey: "",
  maleVoice: "Ryan",
  femaleVoice: "Vivian",
  presentation: "male",
};
test("chat dispatches messages to the chosen provider without exposing credentials to its output", async () => {
  let request;
  let config = {
    ...defaults,
    chatProvider: "compatible",
    chatBase: "https://provider.example/v1",
    chatKey: "test-key",
  };
  const chat = load(
    "src/lib/providers/chat.ts",
    { "@/lib/config/settings": { readSettings: async () => config } },
    {
      fetch: async (url, opts) => {
        request = { url, opts };
        return Response.json({ choices: [{ message: { content: "Hello" } }] });
      },
    },
  );
  assert.equal(
    await chat.generateChat([{ role: "user", content: "Hi" }]),
    "Hello",
  );
  assert.equal(request.url, "https://provider.example/v1/chat/completions");
  assert.equal(request.opts.headers.Authorization, "Bearer test-key");
  config = { ...defaults };
  const ollama = load(
    "src/lib/providers/chat.ts",
    { "@/lib/config/settings": { readSettings: async () => config } },
    {
      fetch: async (url, opts) => {
        request = { url, opts };
        return Response.json({ message: { content: "Hi" } });
      },
    },
  );
  assert.equal(
    await ollama.generateChat([{ role: "user", content: "Hi" }]),
    "Hi",
  );
  assert.equal(request.url, "http://localhost:11434/api/chat");
});
test("voice snapshot retains selected profile and sends level-specific instructions to MLX", async () => {
  let request;
  const voice = load("src/lib/providers/voice.ts", voiceModules, {
    fetch: async (url, opts) => {
      request = { url, opts };
      return new Response(new Uint8Array([1, 2]), {
        headers: { "content-type": "audio/wav" },
      });
    },
  });
  const s = { ...defaults, presentation: "female" };
  const snap = voice.snapshot(s);
  assert.equal(snap.profile, "Vivian");
  await voice.generateVoice("Hello", 90, snap, s);
  const body = JSON.parse(request.opts.body);
  assert.equal(body.voice, "Vivian");
  assert.match(body.instruct, /tongue-tied/);
  assert.equal(request.url, "http://localhost:8000/v1/audio/speech");
});
test("ElevenLabs uses its own endpoint and rejects missing credentials", async () => {
  let request;
  const voice = load("src/lib/providers/voice.ts", voiceModules, {
    fetch: async (url, opts) => {
      request = { url, opts };
      return new Response(new Uint8Array([1]));
    },
  });
  const snap = {
    provider: "elevenlabs",
    presentation: "male",
    profile: "JBFqnCBsd6RMkjVDRZzb",
  };
  await assert.rejects(
    voice.generateVoice("Hello", 0, snap, defaults),
    /API key/,
  );
  await voice.generateVoice("Hello", 90, snap, {
    ...defaults,
    voiceKey: "test-key",
  });
  assert.match(request.url, /api\.elevenlabs\.io/);
  assert.equal(request.opts.headers["xi-api-key"], "test-key");
  assert.match(JSON.parse(request.opts.body).text, /very drunk/);
});
test("unreachable local voice falls back on macOS without using ElevenLabs", async () => {
  const voice = load(
    "src/lib/providers/voice.ts",
    {
      "./speech": { localSpeech: async () => new Uint8Array([7]) },
      "@/lib/engines/speech-delivery": delivery,
    },
    {
      process: { platform: "darwin" },
      fetch: async () => {
        throw Error("offline");
      },
    },
  );
  const result = await voice.generateVoice(
    "Hello",
    0,
    voice.snapshot(defaults),
    defaults,
  );
  assert.equal(result.fallback, true);
  assert.equal(result.audio[0], 7);
});

test("voice direction keeps the same identity while intensity increases at each stage", () => {
  const voice = load("src/lib/providers/voice.ts", {
    "./speech": { localSpeech: async () => new Uint8Array([1]) },
    "@/lib/engines/speech-delivery": delivery,
  });
  const levels = [0, 15, 35, 60, 85];
  const directions = levels.map(voice.style);
  for (const direction of directions) {
    assert.match(direction, /same natural voice and accent/);
  }
  assert.match(directions[0], /soberly/);
  assert.match(directions[1], /slightly tipsy/);
  assert.match(directions[2], /clearly tipsy/);
  assert.match(directions[3], /noticeably drunk/);
  assert.match(directions[4], /very drunk/);
  assert.equal(voice.style(34), directions[1]);
  assert.equal(voice.style(35), directions[2]);
});

test("acting cues reach ElevenLabs at their position and Qwen as a delivery instruction", async () => {
  const requests = [];
  const voice = load("src/lib/providers/voice.ts", voiceModules, {
    fetch: async (url, opts) => {
      requests.push(JSON.parse(opts.body));
      return new Response(new Uint8Array([1]));
    },
  });
  const text = "*squints*, Wha'? River? *laughs* That's funny.";
  await voice.generateVoice(
    text,
    70,
    { provider: "local", presentation: "male", profile: "Ryan" },
    defaults,
  );
  assert.doesNotMatch(requests[0].input, /squints|laughs/i);
  assert.match(requests[0].instruct, /noticeably drunk/);
  assert.match(requests[0].instruct, /chuckle/);
  await voice.generateVoice(
    text,
    70,
    {
      provider: "elevenlabs",
      presentation: "male",
      profile: "JBFqnCBsd6RMkjVDRZzb",
    },
    { ...defaults, voiceKey: "test-key" },
  );
  assert.match(requests[1].text, /River\?\s*\[laughs\]\s*That's funny/);
  assert.doesNotMatch(requests[1].text, /squints/i);
});

test("multiple vocal expressions keep their location for ElevenLabs and reach local directions", async () => {
  const requests = [];
  const voice = load("src/lib/providers/voice.ts", voiceModules, {
    fetch: async (_url, opts) => {
      requests.push(JSON.parse(opts.body));
      return new Response(new Uint8Array([1]));
    },
  });
  const text =
    "Oh! *hiccups* Wait, *coughs* sorry. (takes a deep breath) Right. *sighs*";
  await voice.generateVoice(
    text,
    70,
    { provider: "local", presentation: "male", profile: "Ryan" },
    defaults,
  );
  assert.match(requests[0].instruct, /hiccup/);
  assert.match(requests[0].instruct, /cough/);
  assert.match(requests[0].instruct, /breath/);
  assert.match(requests[0].instruct, /sigh/);
  assert.doesNotMatch(requests[0].input, /hiccups|coughs|deep breath|sighs/);
  await voice.generateVoice(
    text,
    70,
    {
      provider: "elevenlabs",
      presentation: "male",
      profile: "JBFqnCBsd6RMkjVDRZzb",
    },
    { ...defaults, voiceKey: "test-key" },
  );
  assert.match(requests[1].text, /Oh!\s*\[hiccups\]\s*Wait,\s*\[coughs\]/);
  assert.match(requests[1].text, /\[takes a breath\]/);
  assert.match(requests[1].text, /\[sighs\]/);
});

test("ElevenLabs directions track saved level, preserve reactions and never add intoxication when sober", async () => {
  const voice = load("src/lib/providers/voice.ts", voiceModules);
  const line = "Hello. [laughs] I am here. This is fine.";
  assert.equal(voice.elevenPerformance(line, 0), line);
  assert.match(voice.elevenPerformance(line, 20), /slightly tipsy/);
  assert.match(voice.elevenPerformance(line, 40), /tongue-tied/);
  assert.match(voice.elevenPerformance(line, 70), /gently slurring/);
  const chaos = voice.elevenPerformance(line, 100);
  assert.match(chaos, /very drunk/);
  assert.match(chaos, /\[laughs\]/);
  assert.ok((chaos.match(/very drunk/g) || []).length >= 2);
  assert.match(
    voice.elevenPerformance("Value is 3.14 units.", 70),
    /3\.14 units/,
  );
});

test("compound acting notes are never spoken as dialogue and become positional ElevenLabs cues", async () => {
  const requests = [];
  const voice = load("src/lib/providers/voice.ts", voiceModules, {
    fetch: async (_url, opts) => {
      requests.push(JSON.parse(opts.body));
      return new Response(new Uint8Array([1]));
    },
  });
  const text = `*laughs loudly, then composes himself* Ah, no... I'm not drunk... yet. *winks* Here's one for ya: Why did the beer go to therapy? *pauses for dramatic effect* Because it was feeling a little "flat"! *roars with laughter, momentarily losing train of thought* Oh man, that was good...`;
  await voice.generateVoice(
    text,
    75,
    {
      provider: "elevenlabs",
      presentation: "male",
      profile: "JBFqnCBsd6RMkjVDRZzb",
    },
    { ...defaults, voiceKey: "test-key" },
  );
  const output = requests[0].text;
  assert.match(output, /\[laughs\]\s*Ah/);
  assert.match(output, /therapy\?\s*\[pauses\]\s*Because/);
  assert.match(output, /flat"!\s*\[laughs\]\s*Oh man/);
  assert.doesNotMatch(
    output,
    /composes|winks|dramatic effect|roars|losing train/i,
  );
  assert.match(output, /drunk, tongue-tied/);
});
