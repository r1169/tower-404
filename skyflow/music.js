(function(root){
'use strict';
// Original adaptive synth score: no recordings, network requests or vocal samples.
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const BEAT=60/96,BAR=BEAT*4;
const harmony=[[50,57,60,64],[50,57,60,65],[46,53,57,60],[46,53,60,65],[53,60,64,67],[53,57,60,64],[48,55,62,64],[48,55,60,62]];
const themes={intro:[[74,69,72,77,74,72],[74,77,81,77,76,72],[77,74,72,69,72,74],[72,69,67,64,67,69]],shift:[[74,69,72,64],[72,65,69,72],[77,72,69,67],[72,67,64,69]]};
// Only visible operational information affects tension; hidden threats never reveal themselves musically.
function pressure({flights=[],runways=[],time=0,chapter=1,finalReady=true}={}){
 const active=flights.filter(f=>!f.done&&['holding','ready','landing','unauthorized','goAround','taxiOut','takeoff'].includes(f.phase)&&!(chapter===2&&f.id===404&&!finalReady));
 if(!active.length)return 0;
 const airborne=active.filter(f=>['holding','landing','unauthorized','goAround'].includes(f.phase));
 const fuels=airborne.filter(f=>f.caseType!=='phantom').map(f=>f.claimedEmergency&&!f.checked?8:f.fuel).filter(Number.isFinite);
 const fuel=fuels.length?Math.min(...fuels):100;
 let value=clamp((active.length-1)*.12,0,.55)+clamp((38-fuel)/65,0,.42);
 if(active.length>=3&&runways.filter(r=>!r.closed&&!r.closing&&!r.wreck).length<2)value+=.12;
 if(active.some(f=>f.replayPending&&f.replayDeadline-time<18))value+=.22;
 if(active.some(f=>f.radioBlocked||f.requiredRunway&&!f.safetyReady))value+=.15;
 if(runways.some(r=>r.wreck))value+=.18;
 if(airborne.some(f=>f.phase==='unauthorized'&&!f.earlyApproach))value=Math.max(value,.94);
 if(fuel<15)value=Math.max(value,.85);
 return clamp(value);
}
function scene({screen,chapter=1,paused=false,ended=false,story=null,tutorial=false,speaking=false,airport={}}={}){
 const intro=screen==='prologue'||screen==='chapter-intro'||screen==='game'&&story?.id==='briefing';
 const mode=intro?'intro':screen!=='game'?'menu':ended?'results':story?'story':paused||tutorial?'pause':'game';
 return {mode,chapter:screen==='game'||screen==='chapter-intro'?chapter:1,tension:mode==='game'?pressure({...airport,chapter}):0,duck:mode==='game'&&speaking};
}
function arrangement({mode='menu',chapter=1,tension=0}={}){
 const t=clamp(Number.isFinite(tension)?tension:0);
 if(mode==='intro')return {mode,bpm:112+(chapter-1)*4,energy:.92};
 if(mode==='story')return {mode,bpm:96+(chapter-1)*2,energy:.5};
 if(mode==='pause'||mode==='results')return {mode,bpm:84,energy:.12};
 if(mode==='game')return {mode,bpm:88+40*t,energy:.3+.7*t};
 return {mode,bpm:96,energy:.42};
}
function score(bar,chapter=1,options={}){
 const p={...arrangement({chapter,...options}),...options},beat=60/p.bpm,energy=p.energy;
 const chord=harmony[bar%8],notes=[],intro=p.mode==='intro',quiet=['pause','results'].includes(p.mode);
 const add=(midi,b,duration,gain,attack,release,type='sine',pan=0,kind='tone')=>notes.push({midi,beat:b,at:b*beat,duration:duration*beat,gain,attack,release:release*beat,type,pan,kind});
 // Shorter pads leave room for a syncopated bass and plucked counter-melody.
 chord.forEach((midi,i)=>add(midi,0,4.5,.065,.22,.8,'sine',(i-1.5)*.28));
 const bass=quiet?[0]:energy>.7?[0,.75,1.5,2,2.75,3.5]:[0,1.5,2.5];
 bass.forEach((b,i)=>add(chord[0]-12+(i%3===2?12:0),b,.58,.12,.012,.2,'triangle',-.08));
 const motif=(intro?themes.intro:themes.shift)[bar%4];
 const rhythm=intro?[0,.75,1.5,2,2.75,3.5]:[.5,1.75,2.5,3.5];
 if(!quiet)rhythm.forEach((b,i)=>add(motif[i],b,.65,i%2?.09:.13,.012,.42,'triangle',i%2?.2:-.2));
 // A rising ostinato becomes denser under pressure without exposing which contact is genuine.
 if(energy>.48&&!quiet){const steps=energy>.76?8:4;for(let i=0;i<steps;i++){const b=steps===8?i*.5:i+.5;add(chord[(i+Math.floor(bar/4))%4]+12,b,.32,.045,.007,.22,'sine',i%2?-.4:.4)}}
 if(!quiet){
  for(const b of energy>.68?[0,1.5,2,3.25]:[0,2])add(36,b,.38,.19,.004,.3,'sine',0,'kick');
  for(const b of [1,3])add(50,b,.16,.075,.003,.12,'sine',.08,'snare');
  const hats=energy>.68?8:4;for(let i=0;i<hats;i++)add(70,i*(4/hats)+(hats===4?.5:0),.1,i%2?.025:.04,.002,.07,'sine',i%2?.35:-.35,'hat');
  if((bar+1)%4===0&&energy>.7)for(const b of [3.5,3.75])add(50,b,.12,.05,.003,.09,'sine',-.15,'snare');
 }
 return notes;
}
class MusicPlayer{
 constructor(context,output,{setInterval:repeat=(fn,ms)=>globalThis.setInterval(fn,ms),clearInterval:cancel=id=>globalThis.clearInterval(id)}={}){
  this.ctx=context;this.repeat=repeat;this.cancel=cancel;this.voices=new Set();this.bar=0;this.beatIndex=0;this.next=0;this.timer=null;this.running=false;this.bpm=null;this.energy=null;
  this.state={enabled:true,volume:.45,mode:'menu',chapter:1,tension:0,duck:false,hidden:false};
  this.bus=context.createGain();this.bus.gain.value=0;this.bus.connect(output);
  this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=2800;this.filter.Q.value=.3;this.filter.connect(this.bus);
  if(context.createDelay){this.delay=context.createDelay(1);this.delay.delayTime.value=.3;const feedback=context.createGain(),wet=context.createGain();feedback.gain.value=.19;wet.gain.value=.12;this.filter.connect(this.delay);this.delay.connect(feedback);feedback.connect(this.delay);this.delay.connect(wet);wet.connect(this.bus)}
 }
 update(values){
  this.state={...this.state,...values};const s=this.state,active=s.enabled&&s.volume>0&&!s.hidden&&s.mode!=='off'&&this.ctx.state==='running';
  const mood=s.mode==='pause'?.35:s.mode==='story'?.53:s.mode==='results'?.5:s.mode==='intro'?.84:.8;
  const level=active?s.volume*mood*(s.duck?.38:1):0;
  if(level!==this.level){this.level=level;this.bus.gain.setTargetAtTime(level,this.ctx.currentTime,level===0?.07:.25)}
  if(active&&!this.running){this.running=true;this.next=this.ctx.currentTime+.08;this.pump();this.timer=this.repeat(()=>this.pump(),50)}
  else if(!active&&this.running)this.stop();
 }
 note(note,time){
  const c=this.ctx,noise=note.kind==='hat'||note.kind==='snare',o=noise?c.createBufferSource():c.createOscillator(),g=c.createGain(),pan=c.createStereoPanner();let filter;
  if(noise){
   if(!this.noise){this.noise=c.createBuffer(1,Math.ceil(c.sampleRate*.5),c.sampleRate);const data=this.noise.getChannelData(0);let seed=404;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1}}
   o.buffer=this.noise;filter=c.createBiquadFilter();filter.type=note.kind==='hat'?'highpass':'bandpass';filter.frequency.value=note.kind==='hat'?5700:1700;filter.Q.value=.7;o.connect(filter);filter.connect(g);
  }else{o.type=note.type;const frequency=440*Math.pow(2,(note.midi-69)/12);o.frequency.setValueAtTime(note.kind==='kick'?135:frequency,time);if(note.kind==='kick')o.frequency.exponentialRampToValueAtTime(42,time+.1);o.connect(g)}
  pan.pan.value=note.pan;const end=time+note.duration,release=Math.max(time+note.attack,end-note.release);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(note.gain,time+note.attack);g.gain.setValueAtTime(note.gain,release);g.gain.linearRampToValueAtTime(0,end);
  g.connect(pan);pan.connect(noise||note.kind==='kick'?this.bus:this.filter);
  const voice={o,g,pan,filter};this.voices.add(voice);o.onended=()=>{o.disconnect();g.disconnect();pan.disconnect();filter?.disconnect();this.voices.delete(voice)};
  o.start(time);o.stop(end+.03);
 }
 pump(){
  if(!this.running)return;
  const now=this.ctx.currentTime;if(this.next<now-.1)this.next=now+.08;
  while(this.next<now+.18){
   const target=arrangement(this.state);
   // Tempo and orchestration glide beat by beat. Existing notes keep their envelopes.
   this.bpm=this.bpm===null?target.bpm:this.bpm+clamp(target.bpm-this.bpm,-1.5,3);
   this.energy=this.energy===null?target.energy:this.energy+clamp(target.energy-this.energy,-.04,.08);
   const beat=60/this.bpm;
   for(const note of score(this.bar,this.state.chapter,{...target,bpm:this.bpm,energy:this.energy}))if(Math.floor(note.beat)===this.beatIndex)this.note(note,this.next+(note.beat-this.beatIndex)*beat);
   if(this.delay)this.delay.delayTime.setTargetAtTime(beat*.75,now,.5);
   this.next+=beat;this.beatIndex=(this.beatIndex+1)%4;if(this.beatIndex===0)this.bar=(this.bar+1)%16;
  }
 }
 stop(){
  this.running=false;if(this.timer!==null){this.cancel(this.timer);this.timer=null}
  for(const voice of this.voices){voice.g.gain.cancelScheduledValues(this.ctx.currentTime);voice.g.gain.setTargetAtTime(0,this.ctx.currentTime,.025);voice.o.stop(this.ctx.currentTime+.12)}
 }
}
const api={MusicPlayer,score,pressure,scene,arrangement,BEAT,BAR};if(typeof module!=='undefined')module.exports=api;root.SkyflowMusic=api;
})(typeof window==='undefined'?globalThis:window);
