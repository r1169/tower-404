const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
let sources=[],params=[];
function param(){return {value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v;params.push(v)}}}
function node(source=false){const n={gain:param(),frequency:param(),Q:param(),pan:param(),connect(){},disconnect(){this.disconnected=true},start(){this.started=true},stop(){this.stopped=true;this.onended?.()}};if(source)sources.push(n);return n}
class Context{constructor(){this.state='running';this.currentTime=0;this.sampleRate=100;this.destination={}}createGain(){return node()}createOscillator(){return node(true)}createBufferSource(){return node(true)}createBiquadFilter(){return node()}createStereoPanner(){return node()}createBuffer(ch,length){return {getChannelData:()=>new Float32Array(length)}}}
const ctx={window:{AudioContext:Context},document:{addEventListener(){}},Math};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/audio.js','utf8'),ctx);const a=ctx.window.skyflowAudio;
a.init();a.syncEngines([{id:12,phase:'landing',progress:.2}],true);assert.equal(sources.length,2);assert.ok(sources.every(s=>s.started));
for(let i=0;i<10;i++)a.syncEngines([{id:12,phase:'landing',progress:.5}],true);assert.equal(sources.length,2);
a.syncEngines([],false);assert.ok(sources.every(s=>s.stopped));
a.syncEngines([{id:12,phase:'takeoff',progress:.7}],true);assert.equal(sources.length,4);assert.ok(params.includes(233));
a.syncEngines([{id:12,phase:'departed',progress:0}],true);assert.ok(sources.every(s=>s.stopped));
a.setting('mute');a.setting('unmute');console.log('PASS: engine start/update, no duplicate voices, pause cleanup, takeoff pitch and completion cleanup');
