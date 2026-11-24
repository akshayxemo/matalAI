const {test} = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
function load(path, globals = {}) {
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,require:()=>delivery,setTimeout,clearTimeout,AbortController,...globals});
 return module.exports;
}
const delivery=load('src/lib/engines/speech-delivery.ts');
function device(spoken){return {speechSynthesis:{cancel(){},resume(){},getVoices(){return [];},speak(u){spoken.push(u);}}};}
test('delivery scales from sober to drunk without changing answer text',()=>{
 assert.equal(delivery.speechProfile(0).rate,1);
 assert.equal(delivery.speechProfile(0).pitch,1);
 assert.ok(delivery.speechProfile(100).rate<delivery.speechProfile(40).rate);
 assert.ok(delivery.speechProfile(100,1).pauseMs>delivery.speechProfile(40,1).pauseMs);
 assert.notEqual(delivery.speechProfile(100,0).pitch,delivery.speechProfile(100,1).pitch);
});
test('device speech starts in the click without waiting for a network request',async()=>{
 const spoken=[];let started=false;
 const voice=load('src/lib/engines/voice.ts',{window:device(spoken),SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},fetch:()=>{throw Error('Device speech must not fetch');}});
 const playback=voice.playVoice('Hello.',0,{onStart:()=>{started=true;}});
 assert.equal(spoken.length,1);assert.equal(started,false);
 spoken[0].onstart();assert.equal(started,true);
 voice.stopVoice();await playback;
});
test('reply playback keeps its captured percentage across chunks; stop cancels queued speech',async()=>{
 const spoken=[];
 const voice=load('src/lib/engines/voice.ts',{window:device(spoken),SpeechSynthesisUtterance:class{constructor(text){this.text=text;}}});
 let currentMeter=100;
 await voice.playVoice('First sentence. Second sentence. Third sentence.',currentMeter);
 currentMeter=0; // Subsequent changes in the UI must not change this reply's voice.
 spoken[0].onend();
 await new Promise(r=>setTimeout(r,400));
 assert.equal(spoken.length,2);
 assert.equal(spoken[1].rate,delivery.speechProfile(100,1).rate);
 spoken[1].onend();voice.stopVoice();
 await new Promise(r=>setTimeout(r,500));assert.equal(spoken.length,2);
});
test('device speech failure reaches the UI instead of claiming audio is playing',async()=>{
 const spoken=[];let error='';
 const voice=load('src/lib/engines/voice.ts',{window:device(spoken),SpeechSynthesisUtterance:class{}});
 await voice.playVoice('Hello.',0,{onError:message=>{error=message;}});
 spoken[0].onerror({error:'not-allowed'});
 assert.match(error,/not-allowed/);
});
test('stopping while generated speech is pending prevents late playback',async()=>{
 let resolve,started=false;
 const voice=load('src/lib/engines/voice.ts',{
  window:device([]),AudioContext:class{state='running';resume(){return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}decodeAudioData(){return Promise.resolve({});}},
  fetch:()=>new Promise(r=>{resolve=r;}),
 });
 const playing=voice.playVoice('Cancelled.',100,{mode:'local',onStart:()=>{started=true;}});
 await new Promise(r=>setTimeout(r,0));voice.stopVoice();resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});await playing;
 assert.equal(started,false);
});

test('speech omits emojis and acting notes while preserving actual dialogue and factual parentheses',()=>{
 const result=delivery.prepareSpeechText('Hey 😂 *chuckles* [laughs] (slurs slightly) friend 👩🏽‍💻. Use Python (version 3).');
 assert.equal(result,'Hey friend . Use Python (version 3).');
 assert.equal(delivery.prepareSpeechText('😂 [laughs]'),'');
 assert.equal(delivery.prepareSpeechText('Hello 🇮🇳!'),'Hello !');
});

test('brand preserves Bengali-style syllables in one speech chunk without an inserted pause',()=>{
 assert.equal(delivery.prepareSpeechText('I am MatalAI.'),'I am Maa taal A I.');
 assert.equal(delivery.prepareSpeechText('Welcome to Matal AI!'),'Welcome to Maa taal A I!');
 assert.equal(delivery.prepareSpeechText('Metal is strong.'),'Metal is strong.');
 assert.equal(delivery.speechChunks('I am MatalAI.').length,1);
 assert.equal(delivery.speechChunks('I am MatalAI.')[0],'I am Maa taal A I.');
});
