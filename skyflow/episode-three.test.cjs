const assert=require('node:assert/strict');
const {EpisodeThreeAirport}=require('./episode-three.js');
const {parse,VoiceSession}=require('./controls.js');

function readStory(a,{door='b',backup=true}={}){
 const id=a.storyPending;if(!id)return;
 const before={time:a.time,fuel:a.flights.map(f=>f.fuel),remaining:a.transmission.remaining};
 a.tick(180);assert.equal(a.time,before.time);assert.deepEqual(a.flights.map(f=>f.fuel),before.fuel);assert.equal(a.transmission.remaining,before.remaining);
 if(id==='archive-door'){assert.equal(a.chooseDoor(door),false);assert.ok(a.viewArchiveCamera());assert.ok(a.chooseDoor(door))}
 if(id==='archive-record')a.chooseBackup(backup);
 assert.ok(a.acknowledgeStory(id));
}
function run(reaction,options={}){
 const a=new EpisodeThreeAirport({seed:42});let next=0,minFuel=100,mistakeMade=false;
 for(let sec=0;sec<1200&&!a.finished&&!a.failed;sec++){
  if(a.storyPending)readStory(a,options);
  if(sec>=next){
   let used=false;
   const intruder=a.flights.find(f=>f.phase==='unauthorized'&&!f.earlyAccepted);
   if(intruder){assert.ok(a.command(intruder.id,intruder.earlyApproach?'Принять заход':'Второй круг').ok);used=true}
   if(!used&&a.runways.some(r=>r.wreck&&!r.recovery)){assert.ok(a.emergencyServices().ok);used=true}
   const radio=a.flights.find(f=>!f.done&&f.radioBlocked);
   if(!used&&radio&&a.transmission.state==='sending'&&!options.waitForUpload){
    let result=a.releaseArchiveChannel();if(result.warning)result=a.releaseArchiveChannel({force:true});assert.ok(result.ok);used=true;
   }
   if(!used&&radio&&!a.radioSwitch&&a.transmission.state!=='sending'){assert.ok(a.command(radio.id,'Резервная частота').ok);used=true}
   const replay=a.flights.find(f=>!f.done&&f.replayPending);
   if(!used&&replay){assert.ok(a.command(replay.id,replay.journalSeen?'Отменить разрешение':'Сверить журнал').ok);used=true}
   for(const f of a.flights.filter(f=>!f.done&&['holding','ready'].includes(f.phase)).sort((x,y)=>(x.urgent?x.fuel-60:x.fuel)-(y.urgent?y.fuel-60:y.fuel))){
    if(used)break;if(f.radioBlocked||f.forgeryQueued)continue;
    let command,opts={};
    if(f.caseType==='hydraulic'&&!f.safetyReady){
     if(options.badLanding&&!mistakeMade&&a.runways[1].owner===null&&!a.runways[1].closed){command='Посадка';opts={runway:2,force:true};mistakeMade=true}
     else if(!a.runwayPreparation&&!a.runways[0].closed&&a.runways[0].owner===null&&!(a.runways[0].safeAt>a.time))command='Подготовить полосу';
    }else if(f.risk&&!f.checked){if(!a.inspection)command='Проверка'}
    else if(f.caseType==='impostor'&&!f.cameraChecked){if(!a.camera)command='Камера'}
    else{
     const runway=a.runways.find(r=>(!f.requiredRunway||r.id===f.requiredRunway)&&!r.closed&&!r.closing&&r.owner===null&&!(r.safeAt>a.time));
     const gate=f.phase==='ready'||a.gates.some(g=>g.owner===null&&(f.threat?g.id==='ISO':g.id!=='ISO'));
     if(runway&&gate){command=f.phase==='ready'?'Взлёт':f.threat?'Изолированная стоянка':'Посадка';opts={runway:runway.id}}
    }
    if(command){const result=a.command(f.id,command,opts);assert.ok(result.ok,`${f.id}: ${result.message}`);used=true;if(f.phase==='landing')minFuel=Math.min(minFuel,f.fuel)}
   }
   if(used)next=sec+reaction;
  }
  a.tick(1);
 }
 assert.equal(a.finished,true,JSON.stringify({reaction,options,time:a.time,failed:a.failed,flights:a.flights.map(f=>[f.id,f.phase,Math.floor(f.fuel)]),story:a.storyPending,tx:a.transmission}));
 assert.deepEqual(a.storyRead,['briefing','archive-door','archive-record','finale']);
 assert.equal(a.flights.length,16);assert.equal(a.losses,options.badLanding?1:0);
 assert.equal(a.reputation,options.badLanding?65:100);assert.ok(a.flights.every(f=>f.done));
 return {a,summary:{reaction,seconds:Math.round(a.time),minLandingFuel:Math.floor(minFuel)}};
}
const runs=[6,10,14].map(reaction=>{const result=run(reaction);assert.equal(result.a.transmission.state,'sent');assert.equal(result.a.archiveOriginal,true);assert.equal(result.a.prevented,1);return result.summary});
assert.equal(run(10,{door:'a'}).a.archiveOriginal,false);
assert.equal(run(10,{backup:false}).a.transmission.state,'lost');
assert.equal(run(10,{backup:false,waitForUpload:true}).a.transmission.state,'sent');
assert.equal(run(10,{badLanding:true}).a.losses,1);

// A wrong forced decision has a concrete consequence; normal refusal changes no state.
let a=new EpisodeThreeAirport();readStory(a);a.spawnCase({id:56,caseType:'hydraulic'});a.runways[1].closed=false;
assert.ok(a.command(56,'Посадка',{runway:2}).warning);assert.equal(a.flights.at(-1).phase,'holding');
assert.ok(a.command(56,'Подготовить полосу').ok);assert.equal(a.runways[0].closed,true);a.tick(10.1);assert.equal(a.flights.find(f=>f.id===56).safetyReady,true);assert.equal(a.runways[0].closed,false);
assert.ok(a.command(56,'Посадка',{runway:1}).ok);a.tick(12.1);assert.equal(a.losses,0);

a=new EpisodeThreeAirport();readStory(a);a.spawnCase({id:91,caseType:'radio'});a.transmission.state='sending';
assert.equal(a.command(91,'Посадка',{force:true}).ok,false);assert.equal(a.command(91,'Резервная частота').ok,false);
assert.ok(a.releaseArchiveChannel().warning);assert.equal(a.transmission.state,'sending');a.backupSaved=true;assert.ok(a.releaseArchiveChannel().ok);
assert.ok(a.command(91,'Резервная частота').ok);a.tick(5);assert.equal(a.flights.find(f=>f.id===91).radioBlocked,true);a.tick(1.1);assert.equal(a.flights.find(f=>f.id===91).radioBlocked,false);

a=new EpisodeThreeAirport();readStory(a);a.tick(24.2);assert.equal(a.flights.find(f=>f.id===43).phase,'unauthorized');a.tick(28);assert.equal(a.failed,43);assert.ok(a.runways[1].wreck);

for(const [phrase,command] of [['рейс 56 подготовить полосу','Подготовить полосу'],['рейс 91 резервная частота','Резервная частота']]){assert.equal(parse(phrase).command,command);assert.equal(new VoiceSession().receive(phrase).command.command,command)}
for(const phrase of ['освободить канал','сохранить копию','передать без копии','открыть дверь б'])assert.equal(parse(phrase).type,'story-action');
console.log('PASS: chapter 3 full shifts, three evidence outcomes, damaged gear, blocked radio, shared channel, recoverable crash and story pauses',runs);
