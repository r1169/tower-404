const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {MusicPlayer,score,pressure,scene,arrangement,BAR}=require('./music.js');
const {parse,VoiceSession}=require('./controls.js');
let sources=[],intervals=new Map(),serial=0;
function param(){return {value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push([v,t])},linearRampToValueAtTime(v,t){this.value=v;this.events.push([v,t])},exponentialRampToValueAtTime(v,t){this.value=v;this.events.push([v,t])},setTargetAtTime(v,t){this.value=v;this.events.push([v,t])},cancelScheduledValues(t){this.events=this.events.filter(e=>e[1]<t)}}}
function node(source=false){const n={gain:param(),frequency:param(),Q:param(),pan:param(),delayTime:param(),connect(){},disconnect(){this.disconnected=true},start(t){this.startAt=t},stop(t){this.stopAt=t}};if(source)sources.push(n);return n}
class Context{constructor(){this.state='running';this.currentTime=0;this.sampleRate=100;this.destination={};Context.last=this}createGain(){return node()}createOscillator(){return node(true)}createBufferSource(){return node(true)}createBiquadFilter(){return node()}createStereoPanner(){return node()}createDelay(){return node()}createBuffer(ch,length){return {getChannelData:()=>new Float32Array(length)}}}
const timers={setInterval(fn){const id=++serial;intervals.set(id,fn);return id},clearInterval(id){intervals.delete(id)}};
const c=new Context(),m=new MusicPlayer(c,c.destination,timers);
m.update({mode:'game',volume:.45});const initial=sources.length,level=m.level;assert.ok(initial>4);assert.equal(intervals.size,1);assert.ok(sources.every(s=>s.startAt>0&&s.stopAt>s.startAt));
for(let i=0;i<100;i++)m.update({mode:'game',volume:.45});assert.equal(sources.length,initial);assert.equal(intervals.size,1);
m.update({duck:true});assert.ok(m.level<level/2);m.update({duck:false});assert.equal(m.level,level);
m.update({mode:'pause'});assert.ok(m.level<level);assert.equal(intervals.size,1);m.update({mode:'story'});assert.ok(m.level<level);
c.currentTime=BAR;for(const fn of intervals.values())fn();assert.ok(sources.length>initial);
const count=sources.length;c.currentTime=1000;m.pump();assert.ok(sources.length-count<=10,'a suspended tab must not replay hundreds of missed bars');
m.update({hidden:true});assert.equal(intervals.size,0);assert.equal(m.level,0);assert.ok(sources.every(s=>s.stopAt<=1000.2));for(const s of sources)s.onended?.();assert.equal(m.voices.size,0);
m.update({hidden:false});assert.equal(intervals.size,1);m.update({volume:0});assert.equal(intervals.size,0);m.update({volume:.45,enabled:false});assert.equal(intervals.size,0);m.update({enabled:true});assert.equal(intervals.size,1);m.update({mode:'off'});assert.equal(intervals.size,0);
for(let chapter=1;chapter<=3;chapter++)for(let bar=0;bar<16;bar++)for(const n of score(bar,chapter)){assert.ok(n.midi>=34&&n.midi<=80);assert.ok(n.at>=0&&n.at<BAR);assert.ok(n.duration>n.attack+n.release);assert.ok(n.gain>0&&n.gain<.2)}

const quietFlight={id:12,phase:'holding',fuel:70,done:false},openRunways=[{closed:false},{closed:false}];
const calm={flights:[quietFlight],runways:openRunways};
const busy={flights:Array.from({length:5},(_,i)=>({...quietFlight,id:i,fuel:i?50:24})),runways:openRunways};
assert.equal(pressure(calm),0);assert.ok(pressure(busy)>.65);
assert.equal(pressure({...busy,flights:busy.flights.map(f=>({...f,done:true}))}),0,'completed flights must not sustain pressure');
assert.ok(pressure({flights:[{...quietFlight,fuel:8}]})>=.85);
assert.ok(pressure({flights:[{...quietFlight,phase:'unauthorized'}]})>=.94);
assert.equal(pressure({flights:[{...quietFlight,phase:'unauthorized',earlyApproach:true}]}),0,'confirmed early approaches are not automatically emergencies');
assert.equal(pressure({flights:[{...quietFlight,id:404,fuel:5}],chapter:2,finalReady:false}),0,'404 waiting offstage must not keep the whole episode tense');
assert.equal(pressure({flights:[{...quietFlight,caseType:'phantom',fuel:0}]}),0,'missing telemetry is not empty fuel');
assert.equal(pressure({flights:[{...quietFlight,threat:true}]}),pressure(calm),'music cannot spoil hidden threats');
assert.ok(pressure({flights:[{...quietFlight,claimedEmergency:true,checked:false}]})>=.85,'an unverified emergency sounds urgent until checked');
assert.equal(pressure({flights:[{...quietFlight,claimedEmergency:true,checked:true}]}),0);
assert.ok(pressure({...busy,runways:[{closed:true},{closed:false}]})>pressure(busy));
assert.ok(pressure({flights:[{...quietFlight,replayPending:true,replayDeadline:25}],time:20})>pressure(calm));
assert.equal(scene({screen:'prologue'}).mode,'intro');assert.equal(scene({screen:'chapter-intro',chapter:2}).mode,'intro');
assert.equal(scene({screen:'game',chapter:3,paused:true,story:{id:'briefing'}}).mode,'intro');
assert.equal(scene({screen:'game',paused:true,story:{id:'archive-record'},airport:busy}).mode,'story');
assert.equal(scene({screen:'game',paused:true,airport:busy}).tension,0);
assert.equal(scene({screen:'menu',ended:true}).mode,'menu','old game-over state must not leak into menu music');
assert.equal(scene({screen:'game',airport:busy,speaking:true}).duck,true);
assert.equal(scene({screen:'game',tutorial:true}).mode,'pause');
assert.equal(arrangement({mode:'game',tension:0}).bpm,88);assert.equal(arrangement({mode:'game',tension:1}).bpm,128);
for(const mode of ['intro','game','story','pause'])for(let chapter=1;chapter<=3;chapter++)for(let bar=0;bar<16;bar++){
 const profile=arrangement({mode,chapter,tension:1}),notes=score(bar,chapter,profile);
 for(const n of notes){assert.ok(n.midi>=34&&n.midi<=81);assert.ok(n.beat>=0&&n.beat<4);assert.ok(n.duration>n.attack+n.release);assert.ok(n.gain>0&&n.gain<.2)}
 if(mode==='pause')assert.ok(notes.every(n=>n.kind==='tone'));else assert.ok(notes.some(n=>n.kind==='kick'));
}
assert.ok(score(0,1,{mode:'intro'}).length>score(0,1,{mode:'game',tension:0}).length);

// Real-time beat scheduling: accelerate, settle, switch scenes, never stack players or leave gaps.
sources=[];intervals.clear();const adaptiveContext=new Context(),adaptive=new MusicPlayer(adaptiveContext,adaptiveContext.destination,timers);
adaptive.update({mode:'game',tension:0});assert.equal(adaptive.bpm,88);
let peakVoices=0;
function runMusic(seconds){const until=adaptiveContext.currentTime+seconds;while(adaptiveContext.currentTime<until){adaptiveContext.currentTime+=.05;const lastBpm=adaptive.bpm;for(const fn of intervals.values())fn();assert.ok(Math.abs(adaptive.bpm-lastBpm)<=3.001);assert.ok(adaptive.next>adaptiveContext.currentTime);for(const voice of [...adaptive.voices])if(voice.o.stopAt<=adaptiveContext.currentTime)voice.o.onended();peakVoices=Math.max(peakVoices,adaptive.voices.size)}}
adaptive.update({tension:1});runMusic(12);assert.equal(adaptive.bpm,128);assert.equal(intervals.size,1);
adaptive.update({tension:0});runMusic(22);assert.equal(adaptive.bpm,88);assert.ok(peakVoices<40,'voices stay bounded at peak load');
adaptive.update({mode:'intro',chapter:3});runMusic(8);assert.equal(adaptive.bpm,120);
adaptive.update({mode:'pause'});runMusic(22);assert.equal(adaptive.bpm,84);
adaptive.update({hidden:true});assert.equal(intervals.size,0);

// The integration remains silent until a gesture, stores preferences and leaves SFX intact.
sources=[];intervals.clear();const store=new Map(),listeners={};
const sandbox={window:{AudioContext:Context},document:{hidden:false,addEventListener:(name,fn)=>listeners[name]=fn},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},...timers,Math};
vm.createContext(sandbox);
// Browser timer methods require their Window receiver (Chromium throws otherwise).
vm.runInContext(`const originalRepeat=setInterval,originalCancel=clearInterval;
 globalThis.setInterval=function(...args){if(this!==globalThis)throw new TypeError('Illegal invocation');return originalRepeat(...args)};
 globalThis.clearInterval=function(...args){if(this!==globalThis)throw new TypeError('Illegal invocation');return originalCancel(...args)};`,sandbox);
for(const file of ['music.js','audio.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),sandbox);
const audio=sandbox.window.skyflowAudio;audio.syncMusic({mode:'menu',chapter:1,duck:false});assert.equal(sources.length,0);listeners.click();assert.ok(sources.length>0);assert.equal(intervals.size,1);
audio.setting('music-off');assert.equal(intervals.size,0);const before=sources.length;audio.play('confirm');assert.ok(sources.length>before,'signals still play without music');
audio.setting('music-volume',65);assert.equal(audio.preferences().musicVolume,.65);assert.equal(audio.preferences().musicEnabled,false);audio.setting('music-on');assert.equal(intervals.size,1);
audio.setting('mute');assert.equal(intervals.size,0);assert.equal(audio.preferences().musicEnabled,true);audio.setting('unmute');assert.equal(intervals.size,1);
sandbox.document.hidden=true;listeners.visibilitychange();assert.equal(intervals.size,0);sandbox.document.hidden=false;listeners.visibilitychange();assert.equal(intervals.size,1);
audio.setting('music-off');vm.runInContext(fs.readFileSync(__dirname+'/audio.js','utf8'),sandbox);assert.equal(sandbox.window.skyflowAudio.preferences().musicEnabled,false);assert.equal(sandbox.window.skyflowAudio.preferences().musicVolume,.65);
for(const [text,action] of [['выключить музыку','music-off'],['включить музыку','music-on'],['музыка тише','music-quieter'],['музыка громче','music-louder']]){assert.equal(parse(text).action,action);assert.equal(new VoiceSession().receive(text).command.action,action)}
console.log('PASS: original score, gesture-only start, one scheduler, dialogue ducking, quiet pause, hidden-tab stop, voice cleanup, independent music/SFX, saved volume and voice commands');
console.log('PASS: distinct intros, live operational pressure without mystery spoilers, 88–128 BPM acceleration/deceleration, beat continuity, bounded voices and rhythmic percussion');
