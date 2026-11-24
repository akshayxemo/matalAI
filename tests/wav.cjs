const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const moduleObject={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/engines/wav-effects.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:moduleObject,exports:moduleObject.exports,Buffer});
const {applyWavEffects}=moduleObject.exports;
function wav(){const b=Buffer.alloc(244);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(22050,24);b.writeUInt32LE(44100,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(200,40);for(let i=44;i<b.length;i+=2)b.writeInt16LE(20000,i);return b;}
test('sober WAV is unchanged and drunk WAV keeps an audible PCM signal',()=>{
 const input=wav();assert.deepEqual(Buffer.from(applyWavEffects(input,0)),input);
 const drunk=Buffer.from(applyWavEffects(input,100));
 assert.equal(drunk.readUInt32LE(24),18081);
 assert.equal(drunk.readUInt32LE(28),36162);
 assert.equal(drunk.length,input.length);
 assert.ok(drunk.readInt16LE(44)>10000);
 assert.equal(input.readUInt32LE(24),22050);
});
