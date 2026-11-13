const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const {parse,GestureGate}=require('./controls.js');
let overlay=null;const sounds=[];const saved=new Map([['skyflow-best','0'],['tower404-campaign','broken legacy data']]);
const app={innerHTML:'',append(o){overlay=o}};
const context={window:{SKYFLOW_PROLOGUE:false,SKYFLOW_DYNAMIC:false,SKYFLOW_TUTORIAL:false,skyflowAudio:{play:n=>sounds.push(n),ambience:()=>{},setting:a=>'audio '+a}},document:{querySelector:s=>s==='#app'?app:s==='.overlay'?overlay:null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>({innerHTML:'',remove(){overlay=null}}),body:{append(){},classList:{add(){},remove(){}}}},localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},requestAnimationFrame(){},setTimeout(){},console};
let frame;context.requestAnimationFrame=f=>frame=f;
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/simulation.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/dialogue.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/tutorial.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/game.js','utf8'),context);
let clock=1;frame(clock);function advance(seconds){for(let i=0;i<seconds*10;i++)frame(clock+=100)}
const input=context.window.skyflowInput;
const speak=s=>input(parse(s));
let time=0;const gate=new GestureGate();
function gesture(name){gate.update('None',1,time+=100);gate.update('None',1,time+=250);gate.update(name,1,time+=100);const a=gate.update(name,1,time+=900);assert.ok(a);return input({type:'gesture',action:a})}
gesture('OK');assert.match(app.innerHTML,/0 \/ 4/);
speak('журнал');assert.ok(overlay);assert.match(overlay.innerHTML,/Сообщения диспетчеров/);assert.equal(context.window.skyflowSnapshot().paused,true);speak('закрыть');assert.equal(overlay,null);assert.equal(context.window.skyflowSnapshot().paused,false);
speak('рейс двенадцать посадка');assert.match(app.innerHTML,/ПОДТВЕРДИТЕ/);
speak('пауза');assert.ok(overlay);assert.match(input(parse('рейс двадцать три')),/продолжите/);
const before=context.window.skyflowSnapshot();advance(20);assert.deepEqual(context.window.skyflowSnapshot().flights,before.flights);
gesture('OK');assert.equal(overlay,null);assert.match(app.innerHTML,/ПОДТВЕРДИТЕ/);
gesture('Thumb_Down');assert.doesNotMatch(app.innerHTML,/ПОДТВЕРДИТЕ/);
speak('рейс двенадцать посадка');gesture('OK');
speak('рейс двадцать три проверка');gesture('OK');assert.match(app.innerHTML,/Рейс 23: начинаю проверку/);assert.match(app.innerHTML,/Тимур Асанов/);
speak('помощь');assert.ok(overlay);speak('закрыть');assert.equal(overlay,null);
advance(18);speak('рейс двадцать три изолированная стоянка');gesture('OK');
advance(18);speak('рейс сорок семь посадка');gesture('OK');
advance(18);speak('рейс шестьдесят один взлет');gesture('OK');advance(40);assert.match(overlay.innerHTML,/Вы удержали аэропорт/);assert.match(overlay.innerHTML,/425/);
gesture('OK');assert.equal(overlay,null);assert.match(app.innerHTML,/0 \/ 4/);speak('рейс двадцать три');assert.doesNotMatch(app.innerHTML,/Обнаружена подмена/);
speak('главное меню');assert.match(app.innerHTML,/Начать смену/);
for(const command of ['эпизоды','настройки','о проекте','помощь']){speak(command);assert.ok(overlay);gesture('Thumb_Down');assert.equal(overlay,null)}
assert.equal(speak('выключить звук'),'audio mute');assert.equal(speak('включить звук'),'audio unmute');
speak('начать смену');speak('рейс шестьдесят один посадка');gesture('OK');assert.doesNotMatch(app.innerHTML,/ПОДТВЕРДИТЕ/);
speak('рейс двадцать три посадка');gesture('OK');gesture('OK');advance(13);
assert.match(overlay.innerHTML,/Связь прервана/);gesture('Thumb_Down');assert.match(app.innerHTML,/Начать смену/);
assert.ok(sounds.includes('win'));assert.ok(sounds.includes('lose'));assert.ok(sounds.includes('error'));
context.window.SKYFLOW_DYNAMIC=true;speak('начать смену');
for(let second=0;second<500&&!context.window.skyflowSnapshot().ended;second++){
 const snapshot=context.window.skyflowSnapshot();
 for(const f of snapshot.flights.filter(f=>f.phase==='holding'||f.phase==='ready').sort((a,b)=>a.fuel-b.fuel)){
  if(f.checking)continue;if(f.risk&&!f.checked){speak(`рейс ${f.id} проверка`);gesture('OK')}
  speak(`рейс ${f.id} ${f.phase==='ready'?'взлет':f.risk?'изолированная стоянка':'посадка'}`);gesture('OK');
 }
 advance(1);
 if(second===60){speak('пауза');const saved=context.window.skyflowSnapshot();advance(30);assert.deepEqual(context.window.skyflowSnapshot(),saved);speak('продолжить')}
}
assert.equal(context.window.skyflowSnapshot().handled,10);assert.match(overlay.innerHTML,/Вы удержали аэропорт/);
console.log('PASS: dynamic 10-flight shift via speech parser and gesture gate, including events and pause');
console.log('PASS: voice/gesture-only win, lose, repeat, pause, cancel, help, settings, episodes, menu, sound routing');

// Continue the campaign through the same voice and gesture entry points.
speak('следующий эпизод');
assert.equal(context.window.skyflowSnapshot().episodeId, 2);
assert.equal(context.window.skyflowSnapshot().screen, 'briefing');
assert.match(overlay.innerHTML, /Ложные сигналы/);
const brief = context.window.skyflowSnapshot();
advance(20);
assert.deepEqual(context.window.skyflowSnapshot(), brief);
for (const episode of [2, 3]) {
 gesture('OK');
 assert.equal(context.window.skyflowSnapshot().episodeId, episode);
 assert.equal(context.window.skyflowSnapshot().screen, 'game');
 assert.equal(context.window.skyflowSnapshot().time, 0);
 assert.equal(context.window.skyflowSnapshot().tutorial, null);
 assert.match(speak('эпизод один'), /главное меню/);
 for (let second = 0; second < 650 && !context.window.skyflowSnapshot().ended; second++) {
  const snap = context.window.skyflowSnapshot();
  for (const flight of snap.flights.filter(f => ['holding', 'ready'].includes(f.phase)).sort((a, b) => a.fuel - b.fuel)) {
   if (flight.checking) continue;
   if (flight.risk && !flight.checked) {
    speak(`рейс ${flight.id} проверка`);gesture('OK');continue;
   }
   const freeRunway = snap.runways.some(r => !r.closed && !r.closing && r.owner === null && !(r.safeAt > snap.time));
   const freeGate = flight.phase === 'ready' || snap.gates.some(g => g.owner === null && (flight.threat ? g.id === 'ISO' : g.id !== 'ISO'));
   if (!freeRunway || !freeGate) continue;
   speak(`рейс ${flight.id} ${flight.phase === 'ready' ? 'взлет' : flight.threat ? 'изолированная стоянка' : 'посадка'}`);
   gesture('OK');
   break;
  }
  advance(1);
  if (second === 45) {
   speak('пауза');const frozen = context.window.skyflowSnapshot();advance(15);
   assert.deepEqual(context.window.skyflowSnapshot(), frozen);
   speak('продолжить');
  }
 }
 const done = context.window.skyflowSnapshot();
 assert.equal(done.ended, true);assert.equal(done.losses, 0);
 assert.equal(done.handled, episode === 2 ? 14 : 18);
 if (episode === 2) {
  assert.match(overlay.innerHTML, /Следующий эпизод/);
  speak('следующий эпизод');assert.match(overlay.innerHTML, /До рассвета/);
 } else {
  assert.match(overlay.innerHTML, /Рассвет. Башня снова на связи/);
  assert.match(overlay.innerHTML, /кофе числился горячим/);
  assert.equal(done.linkReady, true);
  assert.doesNotMatch(overlay.innerHTML, /data-action="next-episode"/);
 }
}
speak('главное меню');speak('эпизод два');
assert.match(overlay.innerHTML, /Ложные сигналы/);
gesture('Thumb_Down');assert.equal(context.window.skyflowSnapshot().screen, 'menu');
speak('эпизод три');speak('начать смену');
assert.equal(context.window.skyflowSnapshot().episodeId, 3);
assert.equal(context.window.skyflowSnapshot().time, 0);
assert.equal(context.window.skyflowSnapshot().linkProgress, 0);
console.log('PASS: campaign progression 1→2→3, frozen briefing/pause, final ending, direct selection and clean replay via voice/gestures');

const campaign=JSON.parse(saved.get('tower404-campaign'));
for(const id of [1,2,3]){assert.equal(campaign[id].completed,true);assert.ok(campaign[id].best>0);}
console.log('PASS: campaign saves completion and per-episode best, tolerates invalid stored data');
