const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const {parse,GestureGate}=require('./controls.js');
let overlay=null;const sounds=[];
const app={innerHTML:'',append(o){overlay=o}};
const context={window:{SKYFLOW_PROLOGUE:false,SKYFLOW_DYNAMIC:false,SKYFLOW_TUTORIAL:false,skyflowAudio:{play:n=>sounds.push(n),ambience:()=>{},setting:a=>'audio '+a}},document:{querySelector:s=>s==='#app'?app:s==='.overlay'?overlay:null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>({innerHTML:'',remove(){overlay=null}}),body:{append(){},classList:{add(){},remove(){}}}},localStorage:{getItem:()=>0,setItem(){}},requestAnimationFrame(){},setTimeout(){},console};
let frame;context.requestAnimationFrame=f=>frame=f;
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/simulation.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/episode-two.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/episode-three.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/dialogue.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/tutorial.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/game.js','utf8').replace('render();requestAnimationFrame(loop);','window.testAction=action;window.testAirport=()=>airport;render();requestAnimationFrame(loop);'),context);
let clock=1;frame(clock);function advance(seconds){for(let i=0;i<seconds*10;i++)frame(clock+=100)}
const input=context.window.skyflowInput;
const speak=s=>input(parse(s));
let time=0;const gate=new GestureGate();
function gesture(name){gate.update('None',1,time+=100);gate.update('None',1,time+=250);gate.update(name,1,time+=100);const a=gate.update(name,1,time+=900);assert.ok(a);return input({type:'gesture',action:a})}

const act=context.window.testAction,snap=context.window.skyflowSnapshot;



function playChapter(completeArchive=true,openRecord=true){
 gesture('OK');
 for(let i=0;i<600&&!snap().ended;i++){
  if(snap().approach==='unverified'){
   assert.match(app.innerHTML,/ЭХО 42/);
   assert.equal(overlay,null);


   const before=snap().time;
   speak('камера подхода');
   if(openRecord)speak('запись аварии');
   assert.equal(snap().oldRecord,openRecord);
   advance(1);assert.ok(snap().time>before);
  }
  if(snap().episodeStory){
   const before=snap();assert.equal(before.paused,true);assert.equal(before.pending,null);
   advance(120);assert.equal(snap().time,before.time);assert.deepEqual(snap().flights,before.flights);assert.deepEqual(snap().transmission,before.transmission);assert.deepEqual(snap().episodeStory,before.episodeStory);
   assert.match(overlay.innerHTML,/время, топливо и движение остановлены/);
   if(before.episodeStory.id==='lera')assert.ok(before.flights.filter(f=>f.id!==404).every(f=>f.done));
   let pages=0;
   while(snap().episodeStory&&pages++<30){
    if(overlay.innerHTML.includes('data-story-choice="archive-camera"')){speak('камера архива');assert.equal(snap().cameraViewed,true);continue}
    if(overlay.innerHTML.includes('data-story-choice="door-a"')){
     speak('открыть дверь а');assert.equal(snap().episodeStory.choice,'door-a');gesture('Thumb_Down');assert.equal(snap().episodeStory.choice,null);assert.equal(snap().doorChoice,null);
     speak(completeArchive?'открыть дверь б':'открыть дверь а');gesture('OK');continue;
    }
    if(overlay.innerHTML.includes('data-story-choice="save-copy"')){speak('сохранить копию');gesture('OK');continue}
    speak('дальше');
   }
   assert.ok(pages<30);assert.equal(snap().time,before.time);
   if(!snap().ended)assert.equal(snap().paused,false);
  }
  if(snap().ended)break;
  if(snap().chapter===3&&snap().transmission.state==='sending'&&snap().flights.some(f=>f.radioBlocked&&!f.done)){speak('освободить канал');gesture('OK')}
  for(const f of snap().flights.filter(f=>f.phase==='unauthorized'&&!f.earlyAccepted)){speak('рейс '+f.id+(f.earlyApproach?' принять заход':' второй круг'));gesture('OK')}
  for(const f of snap().flights.filter(f=>['holding','ready'].includes(f.phase)).sort((a,b)=>a.fuel-b.fuel)){
   if(f.id===404&&!snap().finalReady)continue;
   if(f.radioBlocked){speak('рейс '+f.id+' резервная частота');gesture('OK');continue}
   if(f.caseType==='hydraulic'&&!f.safetyReady){speak('рейс '+f.id+' подготовить полосу');gesture('OK');continue}
   if(f.caseType==='hydraulic')speak('первая полоса');else speak('автоматический выбор');
   if(f.replayPending){speak('рейс '+f.id+' '+(f.journalSeen?'отменить разрешение':'сверить журнал'));gesture('OK');continue}
   if(f.caseType==='phantom'){if(!f.cameraChecked){speak('рейс 42 камера');gesture('OK')}else{speak('рейс 42 снять отметку');gesture('OK')}continue}
   if(f.risk&&!f.checked){if(!f.checking){speak('рейс '+f.id+' проверка');gesture('OK')}continue}
   const number=f.id===404?'четыре ноль четыре':f.id;
   speak('рейс '+number+' '+(f.phase==='ready'?'взлёт':f.threat?'изолированная стоянка':'посадка'));
   gesture('OK');
  }
  advance(1);
 }
 assert.equal(snap().ended,true);
 assert.equal(snap().handled,snap().target);
 assert.equal(snap().losses,0);
}
speak('глава два');assert.equal(snap().chapter,2);assert.equal(snap().screen,'chapter-intro');assert.match(app.innerHTML,/episode-two-intro/);advance(7);assert.equal(snap().time,0);
playChapter();assert.equal(snap().leraArrived,true);assert.match(overlay.innerHTML,/Лера была пассажиром/);
const endClock=snap().clock;speak('следующая глава');assert.equal(snap().chapter,3);assert.equal(snap().clock,endClock);
playChapter();assert.equal(snap().backupSaved,true);assert.match(overlay.innerHTML,/Оригинал записи передан/);assert.doesNotMatch(overlay.innerHTML,/Следующий аэропорт/);assert.match(overlay.innerHTML,/смена завершена/);assert.match(app.innerHTML,/id="timur"/);
speak('главное меню');speak('третья глава');playChapter(false);assert.match(overlay.innerHTML,/неполный фрагмент/);assert.equal(snap().archiveOriginal,false);
assert.equal(parse('борт четыре ноль четыре посадка').id,404);
assert.equal(parse('борт 404 проверка').id,404);
assert.equal(new (require('./controls.js').VoiceSession)().receive('борт 4 0 4 посадка').command.id,404);
console.log('PASS: 404, blackout and camera, Lera reveal, clock continuity, two Timur voices, full and partial endings without mouse');


speak('главное меню');speak('вторая глава');playChapter(true,false);assert.equal(snap().oldRecord,true);assert.equal(snap().leraDialogueRead,true);assert.equal(snap().leraArrived,true);

// Intro ends automatically, cancellation leaves the menu, and no fuel burns during it.
speak('главное меню');speak('вторая глава');const introFuel=snap().flights[0].fuel;advance(20);assert.equal(snap().time,0);assert.equal(snap().flights[0].fuel,introFuel);advance(11);assert.equal(snap().screen,'game');assert.ok(snap().time<2);
speak('главное меню');speak('вторая глава');gesture('Thumb_Down');advance(35);assert.equal(snap().screen,'menu');
// The speech parser + gesture gate prepare, cancel, confirm and pause a live interception.
speak('вторая глава');gesture('OK');context.window.testAirport().spawnCase({id:56,caseType:'forged'});advance(1);assert.equal(snap().flights.find(f=>f.id===56).phase,'unauthorized');
speak('рейс пятьдесят шесть второй круг');gesture('Thumb_Down');assert.equal(snap().pending,null);assert.equal(snap().flights.find(f=>f.id===56).phase,'unauthorized');
speak('рейс пятьдесят шесть второй круг');gesture('OK');assert.equal(snap().flights.find(f=>f.id===56).phase,'goAround');speak('пауза');const pausedTime=snap().time;advance(30);assert.equal(snap().time,pausedTime);speak('продолжить');advance(23);assert.equal(snap().flights.find(f=>f.id===56).phase,'holding');assert.equal(snap().prevented,1);
console.log('PASS: episode 2 automatic intro, exit, live speech/gesture go-around cancellation and confirmation, pause freezes maneuver');

// Leave a paused interlude, then retry: no story state or final permission leaks.
speak('главное меню');speak('вторая глава');gesture('OK');
const testAirport=context.window.testAirport();
for(const f of testAirport.flights.filter(f=>f.id!==404)){f.done=true;f.phase='transferred'}
testAirport.schedule=[];advance(1);assert.equal(snap().episodeStory.id,'wave-1');
speak('закрыть');assert.equal(snap().paused,true);assert.equal(snap().episodeStory.step,0);
speak('главное меню');assert.equal(snap().screen,'menu');assert.equal(snap().episodeStory,null);
speak('вторая глава');gesture('OK');assert.equal(snap().wave,1);assert.equal(snap().finalReady,false);assert.equal(snap().leraDialogueRead,false);
speak('рейс четыреста четыре посадка');assert.match(gesture('OK'),/после трёх волн/);assert.equal(snap().flights.find(f=>f.id===404).phase,'holding');
console.log('PASS: all story pages pause simulation, navigation never skips dialogue, final 404 landing, safe exit and retry');

// UI decisions require explicit confirmation; thumb-down never chooses a dangerous option.
speak('главное меню');speak('третья глава');const freshThird=snap();advance(90);assert.equal(snap().time,0);assert.deepEqual(snap().flights,freshThird.flights);
while(snap().episodeStory)speak('дальше');
const third=context.window.testAirport();
third.schedule=[];for(const f of third.flights){f.done=true;f.phase='transferred'}for(const g of third.gates)g.owner=null;
advance(1);assert.equal(snap().episodeStory.id,'archive-door');
speak('дальше');gesture('OK');assert.equal(snap().doorChoice,null);speak('камера архива');speak('открыть дверь б');assert.equal(snap().doorChoice,null);gesture('OK');
while(snap().episodeStory)speak('дальше');
third.schedule=[];advance(1);assert.equal(snap().episodeStory.id,'archive-record');
while(!overlay.innerHTML.includes('data-story-choice="without-copy"'))speak('дальше');speak('передать без копии');assert.equal(snap().backupSaved,false);gesture('Thumb_Down');assert.equal(snap().episodeStory.choice,null);speak('передать без копии');gesture('OK');
advance(1);assert.equal(snap().transmission.state,'sending');
speak('освободить канал');gesture('OK');assert.match(snap().pending.warning,/копии нет/);assert.equal(snap().transmission.state,'sending');gesture('Thumb_Down');assert.equal(snap().transmission.state,'sending');
speak('освободить канал');gesture('OK');gesture('OK');assert.equal(snap().transmission.state,'lost');
speak('главное меню');speak('третья глава');assert.equal(snap().backupSaved,false);assert.equal(snap().doorChoice,null);assert.equal(snap().transmission.state,'not-started');assert.equal(snap().episodeStory.id,'briefing');
console.log('PASS: third chapter choices, cancellation, double confirmation of archive loss, intro freeze and retry');

// Compact conversations identify the speaker without a duplicate title.
assert.match(overlay.innerHTML,/story-avatar dana/);assert.match(overlay.innerHTML,/<h2 class="story-person-name">Дана<\/h2>/);assert.ok(!overlay.innerHTML.includes('<h2>Что нужно успеть'));
speak('дальше');assert.match(overlay.innerHTML,/story-avatar lera/);speak('дальше');assert.match(overlay.innerHTML,/story-avatar timur/);assert.match(overlay.innerHTML,/По рации/);
while(snap().episodeStory)speak('дальше');
const simultaneous=context.window.testAirport();simultaneous.schedule=[];simultaneous.spawnCase({id:67,caseType:'early'});simultaneous.spawnCase({id:86,caseType:'replay'});advance(.1);speak('рейс 67');
assert.match(app.innerHTML,/Ранний заход/);assert.match(app.innerHTML,/Одновременно: рейс 86 получил старый пакет/);assert.match(app.innerHTML,/data-evidence-command="Принять заход"/);
speak('рейс 67 принять заход');assert.equal(snap().flights.find(f=>f.id===67).earlyAccepted,undefined);gesture('Thumb_Down');assert.equal(snap().flights.find(f=>f.id===67).earlyAccepted,undefined);
speak('рейс 67 принять заход');gesture('OK');assert.equal(snap().flights.find(f=>f.id===67).earlyAccepted,true);assert.equal(snap().reputation,100);speak('пауза');const pausedApproaches=snap();advance(90);assert.deepEqual(snap().flights,pausedApproaches.flights);
console.log('PASS: portraits, one speaker heading, simultaneous early/replayed clearances, confirmation/cancellation and paused approach timers');
