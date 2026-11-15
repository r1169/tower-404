const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Airport}=require('./simulation.js');
const {EpisodeTwoAirport}=require('./episode-two.js');
const {parse,VoiceSession}=require('./controls.js');
const env={window:{},Image:class{}};vm.createContext(env);vm.runInContext(fs.readFileSync(__dirname+'/tower.js','utf8'),env);
const pos=env.window.SkyflowTower.position;
function same(a,b){assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.00001);assert.ok(Math.abs(a.scale-b.scale)<.00001)}
for(const runway of [1,2]){
 const a=new Airport([{id:12,code:'SF 012',fuel:50}],{dynamic:false});a.runways[1].closed=false;
 assert.ok(a.command(12,'Посадка',{runway}).ok);a.tick(2);
 const f=a.flights[0],before=pos(f,a.time),fuel=f.fuel;
 assert.ok(a.command(12,'Второй круг').ok);same(before,pos(f,a.time));assert.equal(a.gates[0].owner,null);assert.equal(a.runways[runway-1].owner,null);
 assert.equal(a.command(12,'Посадка').ok,false);a.tick(21.99);const end=pos(f,a.time);a.tick(.02);assert.equal(f.phase,'holding');assert.ok(Math.hypot(end.x-pos(f,a.time).x,end.y-pos(f,a.time).y)<.001);assert.ok(fuel-f.fuel>7&&fuel-f.fuel<7.1);
 assert.ok(a.command(12,'Посадка').ok);a.tick(5);assert.equal(a.command(12,'Второй круг').ok,false);
}
let a=new EpisodeTwoAirport();assert.ok(a.command(42,'Камера').ok);a.tick(4.1);assert.match(a.flights[2].cameraClue,/нет самолёта/);assert.ok(a.command(42,'Снять отметку').ok);assert.equal(a.reputation,100);assert.equal(a.resolvedSignals,1);
a=new EpisodeTwoAirport();assert.ok(a.command(42,'Посадка').warning);a.command(42,'Посадка',{force:true});assert.equal(a.reputation,88);assert.equal(a.runways[0].owner,'SIGNAL');assert.equal(a.gates[0].owner,'SIGNAL');a.tick(25.1);assert.equal(a.runways[0].owner,null);assert.equal(a.gates[0].owner,null);
// Ignoring a forged clearance causes a collision, a persistent wreck and defeat.
a=new EpisodeTwoAirport();a.spawnCase({id:56,caseType:'forged'});a.tick(1);let f=a.flights.find(f=>f.id===56);assert.equal(f.phase,'unauthorized');assert.equal(a.runways[1].intruder,56);assert.equal(a.runways[1].closed,true);a.tick(29);assert.equal(a.failed,56);assert.ok(a.runways[1].wreck);assert.equal(f.phase,'lost');
a=new EpisodeTwoAirport();a.spawnCase({id:56,caseType:'forged'});a.tick(11);f=a.flights.find(f=>f.id===56);const before=pos(f,a.time);assert.ok(a.command(56,'Второй круг').ok);same(before,pos(f,a.time));assert.equal(a.runways[1].intruder,null);a.tick(23);assert.equal(f.phase,'holding');assert.equal(a.prevented,1);assert.equal(a.failed,null);
a=new EpisodeTwoAirport();a.spawnCase({id:56,caseType:'forged'});a.tick(24);assert.equal(a.command(56,'Второй круг').ok,false);a.tick(5);assert.equal(a.failed,56);
a=new Airport([{id:12,code:'SF 012',fuel:3}]);a.command(12,'Посадка');a.tick(1);a.command(12,'Второй круг');a.tick(22);assert.equal(a.flights[0].phase,'lost');
for(const [phrase,command] of [['рейс 56 второй круг','Второй круг'],['борт четыре ноль четыре камера','Камера'],['рейс 42 снять отметку','Снять отметку'],['рейс 35 отказать в приоритете','Отказать в приоритете'],['рейс 56 сверить журнал','Сверить журнал'],['рейс 56 отменить разрешение','Отменить разрешение']]){assert.equal(parse(phrase).command,command);assert.equal(new VoiceSession().receive(phrase).command.command,command)}
// One deliberate order every 6/10/14 seconds, including all investigations.
const runs=[];
for(const reaction of [6,10,14]){
 a=new EpisodeTwoAirport({seed:42});let next=0,lowest=100;
 for(let sec=0;sec<900&&!a.finished&&!a.failed;sec++){
  if(a.storyPending){
   const id=a.storyPending,t=a.time,fuels=a.flights.map(f=>f.fuel);a.tick(120);assert.equal(a.time,t);assert.deepEqual(a.flights.map(f=>f.fuel),fuels);assert.ok(a.acknowledgeStory(id));
  }
  if(sec>=next){let used=false;const intruder=a.flights.find(f=>f.phase==='unauthorized'&&!f.earlyAccepted);
   if(intruder&&!intruder.earlyAccepted){assert.ok(a.command(intruder.id,intruder.earlyApproach?'Принять заход':'Второй круг').ok);used=true}
   const replay=a.flights.find(f=>f.replayPending&&!f.done);
   if(!used&&replay){assert.ok(a.command(replay.id,replay.journalSeen?'Отменить разрешение':'Сверить журнал').ok);used=true}
   for(const f of a.flights.filter(f=>['holding','ready'].includes(f.phase)&&(f.id!==404||a.finalReady)).sort((x,y)=>(x.urgent?x.fuel-50:x.caseType==='phantom'?10:x.fuel)-(y.urgent?y.fuel-50:y.caseType==='phantom'?10:y.fuel))){
    if(used)break;if(f.forgeryQueued)continue;let command;
    if(f.caseType==='phantom')command=f.cameraChecked?'Снять отметку':!a.camera?'Камера':null;
    else if(f.risk&&!f.checked)command=!a.inspection?'Проверка':null;
    else if(f.caseType==='impostor'&&!f.cameraChecked)command=!a.camera?'Камера':null;
    else if(f.claimedEmergency)command='Отказать в приоритете';
    else if(a.runways.some(r=>!r.closed&&!r.closing&&r.owner===null&&!(r.safeAt>a.time))&&(f.phase==='ready'||a.gates.some(g=>g.owner===null&&(f.threat?g.id==='ISO':g.id!=='ISO'))))command=f.phase==='ready'?'Взлёт':f.threat?'Изолированная стоянка':'Посадка';
    if(command){const result=a.command(f.id,command);assert.ok(result.ok,result.message);used=true;if(f.phase==='landing')lowest=Math.min(lowest,f.fuel)}
   }
   if(used)next=sec+reaction;
  }
  a.tick(1);
 }
 assert.equal(a.finished,true,JSON.stringify({reaction,failed:a.failed,flights:a.flights.map(f=>[f.id,f.phase,f.fuel])}));assert.equal(a.losses,0);assert.equal(a.reputation,100);assert.equal(a.prevented,1);assert.equal(a.revokedPermits,1);assert.equal(a.resolvedSignals,1);assert.deepEqual(a.storyRead,['wave-1','wave-2','final-approach']);assert.equal(a.flights.length,14);assert.ok(a.flights.every(f=>f.done));
 runs.push({reaction,seconds:Math.round(a.time),minLandingFuel:Math.floor(lowest)});
}
console.log('PASS: go-around continuity, resource release, fuel exhaustion, phantom penalties, forged crash/rescue, commands and full shifts',runs);

// A life-critical interception must not wait behind another fuel warning.
vm.runInContext(fs.readFileSync(__dirname+'/dialogue.js','utf8'),env);
const dialogue=new env.window.SkyflowDialogue.Dialogue();dialogue.say('timur','Топливо 15 процентов');dialogue.say('dana','Чужое разрешение',{priority:3,topic:'forged:56'});assert.equal(dialogue.active.text,'Чужое разрешение');dialogue.invalidate(item=>item.topic==='forged:56');assert.notEqual(dialogue.active?.topic,'forged:56');

// The final flight cannot bypass the gate through forced landing, isolation or dismissal.
a=new EpisodeTwoAirport();
for(const command of ['Посадка','Изолированная стоянка','Снять отметку'])assert.equal(a.command(404,command,{force:true}).ok,false);
a.tick(150);assert.equal(a.flights[0].phase,'holding');assert.ok(a.flights[0].fuel>90);
// Old packets are independently inspectable and revocable. Ignoring or trusting one escalates.
a=new EpisodeTwoAirport();a.spawnCase({id:56,caseType:'replay'});
assert.equal(a.command(56,'Отменить разрешение').ok,false);a.command(56,'Сверить журнал');assert.match(a.flights.at(-1).journalClue,/предыдущей смены/);assert.ok(a.command(56,'Отменить разрешение').ok);a.tick(49);assert.equal(a.flights.find(f=>f.id===56).phase,'holding');assert.equal(a.revokedPermits,1);
a=new EpisodeTwoAirport();a.spawnCase({id:56,caseType:'replay'});a.tick(49);assert.equal(a.flights.find(f=>f.id===56).phase,'unauthorized');assert.equal(a.command(56,'Отменить разрешение').ok,false);assert.ok(a.command(56,'Второй круг').ok);
a=new EpisodeTwoAirport();a.spawnCase({id:56,caseType:'replay'});assert.ok(a.command(56,'Посадка').warning);assert.ok(a.command(56,'Посадка',{force:true}).ok);assert.equal(a.flights.find(f=>f.id===56).phase,'unauthorized');a.tick(29);assert.equal(a.failed,56);
// Recoverable bad decisions do not lock the next wave or the final flight.
for(const mistake of ['phantomLanding','dismissReal','wrongIsolation']){
 a=new EpisodeTwoAirport();
 if(mistake==='phantomLanding')a.command(42,'Посадка',{force:true});
 if(mistake==='dismissReal')a.command(39,'Снять отметку',{force:true});
 if(mistake==='wrongIsolation')a.command(39,'Изолированная стоянка');
 for(let n=0;n<700&&!a.finished&&!a.failed;n++){
  if(a.storyPending)a.acknowledgeStory(a.storyPending);
  for(const f of a.flights.filter(f=>!f.done&&f.id!==404||f.id===404&&a.finalReady&&!f.done)){
   if(f.phase==='unauthorized'){if(!f.earlyAccepted)a.command(f.id,f.earlyApproach?'Принять заход':'Второй круг');continue}
   if(f.phase==='ready'){a.command(f.id,'Взлёт');continue}
   if(f.phase!=='holding')continue;
   if(f.replayPending){a.command(f.id,'Сверить журнал');a.command(f.id,'Отменить разрешение');continue}
   if(f.caseType==='phantom'){if(!f.cameraChecked){if(!a.camera)a.command(f.id,'Камера')}else a.command(f.id,'Снять отметку');continue}
   if(f.risk&&!f.checked){if(!a.inspection)a.command(f.id,'Проверка');continue}
   if(f.claimedEmergency){a.command(f.id,'Отказать в приоритете');continue}
   a.command(f.id,f.threat?'Изолированная стоянка':'Посадка');
  }
  a.tick(1);
 }
 assert.equal(a.finished,true,mistake);assert.ok(a.reputation<100&&a.reputation>0,mistake);assert.equal(a.flights.find(f=>f.id===404).done,true);
}
console.log('PASS: wave checkpoints, final-flight gates, paused fuel, stale permits and recoverable mistakes');
