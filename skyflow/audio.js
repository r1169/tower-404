(() => {
 let ctx,master,hum,enabled=true,volume=.18;
 function init(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=enabled?volume:0;master.connect(ctx.destination)}if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx}
 function tone(freq,duration,delay=0,type='sine',gain=.25){if(!ctx||ctx.state!=='running')return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.02)}
 function play(name){if(name==='crash'&&ctx&&ctx.state==='running'){const buffer=ctx.createBuffer(1,ctx.sampleRate*.7,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.12))*.5;const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.35;source.connect(gain);gain.connect(master);source.onended=()=>{source.disconnect();gain.disconnect()};source.start();return}const patterns={voiceDana:[[720,.035,0,'triangle',.08]],voiceTimur:[[430,.035,0,'square',.04]],select:[[660,.07]],prepare:[[440,.09],[660,.1,.11]],confirm:[[540,.08],[810,.14,.09]],cancel:[[420,.1],[280,.12,.1]],error:[[160,.18],[140,.18,.2]],pause:[[440,.15],[330,.15,.15]],resume:[[330,.12],[440,.15,.12]],win:[[523,.2],[659,.2,.2],[784,.35,.4]],lose:[[330,.2],[247,.2,.2],[165,.5,.4]],message:[[1100,.05],[1100,.05,.12]]};for(const args of patterns[name]||patterns.select)tone(...args)}
 function ambience(active){if(hum){hum.stop();hum=null}if(active&&ctx){hum=ctx.createOscillator();const g=ctx.createGain();hum.type='sine';hum.frequency.value=65;g.gain.value=.035;hum.connect(g);g.connect(master);hum.start()}}
 function setting(action){init();if(action==='mute')enabled=false;if(action==='unmute')enabled=true;if(action==='quieter')volume=Math.max(.02,volume-.05);if(action==='louder')volume=Math.min(.5,volume+.05);master.gain.setTargetAtTime(enabled?volume:0,ctx.currentTime,.05);return `Звук ${enabled?'включён':'выключен'}, громкость ${Math.round(volume*100)}%.`}
 const engines=new Map();let noiseBuffer;
 function syncEngines(flights,active){
  if(!ctx||ctx.state!=='running')return;
  const moving=active?flights.filter(f=>['landing','takeoff','taxiIn','taxiOut'].includes(f.phase)):[];
  const ids=new Set(moving.map(f=>f.id));
  for(const [id,e] of engines)if(!ids.has(id)){e.gain.gain.setTargetAtTime(.0001,ctx.currentTime,.04);e.noise.stop(ctx.currentTime+.2);e.whine.stop(ctx.currentTime+.2);e.noise.onended=()=>{e.noise.disconnect();e.whine.disconnect();e.filter.disconnect();e.whineGain.disconnect();e.gain.disconnect();e.pan.disconnect()};engines.delete(id)}
  for(const f of moving){let e=engines.get(f.id);if(!e){
   if(!noiseBuffer){noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.03)/1.03;data[i]=brown*3}}
   const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),whine=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();noise.buffer=noiseBuffer;noise.loop=true;filter.type='lowpass';filter.Q.value=.6;whine.type='sine';gain.gain.value=0;noise.connect(filter);filter.connect(gain);const whineGain=ctx.createGain();whineGain.gain.value=.025;whine.connect(whineGain);whineGain.connect(gain);gain.connect(pan);pan.connect(master);noise.start();whine.start();e={noise,filter,whine,gain,pan,whineGain};engines.set(f.id,e);
  }
  const q=f.progress,takeoff=f.phase==='takeoff',landing=f.phase==='landing',power=takeoff?Math.sin(Math.PI*q)*.8+.2:landing?.25+Math.sin(Math.PI*q)*.55:.12;
  e.gain.gain.setTargetAtTime(power*.6/Math.sqrt(Math.max(1,moving.length)),ctx.currentTime,.12);
  e.filter.frequency.setTargetAtTime(takeoff?500+q*2100:landing?1500-q*900:400,ctx.currentTime,.2);
  e.whine.frequency.setTargetAtTime(takeoff?100+q*190:landing?230-q*90:85,ctx.currentTime,.2);
  e.pan.pan.setTargetAtTime(takeoff?.5-q:landing?-.5+q:0,ctx.currentTime,.15);
  }
 }
 window.skyflowAudio={init,play,ambience,setting,syncEngines};document.addEventListener('click',()=>{try{init()}catch{}},{once:true});
})();
