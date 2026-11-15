const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {EpisodeTwoAirport}=require('./episode-two.js'),{EpisodeThreeAirport}=require('./episode-three.js');
const {parse,VoiceSession}=require('./controls.js');
const env={window:{},Image:class{}};vm.createContext(env);vm.runInContext(fs.readFileSync(__dirname+'/tower.js','utf8'),env);const pos=env.window.SkyflowTower.position;
function airport(Type=EpisodeTwoAirport){const a=new Type({seed:42});a.storyPending=null;a.schedule=[];a.flights=[];a.target=1;a.gates.forEach(g=>g.owner=null);a.runways.forEach(r=>{r.owner=null;r.closed=false});a.spawnCase({id:57,caseType:'early'});return a}
for(const Type of [EpisodeTwoAirport,EpisodeThreeAirport]){
 let a=airport(Type),f=a.flights[0];assert.equal(f.phase,'unauthorized');assert.equal(f.earlyApproach,true);assert.equal(a.forecast().seconds,28);assert.equal(a.runways[0].owner,57);assert.equal(a.gates[0].owner,57);
 assert.match(a.command(57,'Сверить журнал').message,/текущей смены/);assert.ok(a.command(57,'Принять заход').ok);assert.equal(a.command(57,'Принять заход').ok,false);
 a.tick(27.9);const before=pos(f,a.time);a.tick(.1);assert.equal(f.phase,'taxiIn');const after=pos(f,a.time);assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.01,'touchdown stays continuous');assert.equal(a.runways[0].owner,null);assert.equal(a.gates[0].owner,57);a.tick(27);assert.ok(f.done);assert.equal(a.reputation,100);assert.equal(a.losses,0);
 a=airport(Type);f=a.flights[0];a.tick(2);const origin=pos(f,a.time);assert.ok(a.command(57,'Второй круг').ok);assert.equal(a.reputation,96);assert.equal(a.unnecessaryGoArounds,1);assert.equal(a.runways[0].owner,null);assert.equal(a.gates[0].owner,null);assert.equal(pos(f,a.time).x,origin.x);assert.equal(pos(f,a.time).y,origin.y);assert.equal(pos(f,a.time).scale,origin.scale);assert.equal(a.command(57,'Второй круг').ok,false);assert.equal(a.reputation,96);a.tick(22);assert.equal(f.phase,'holding');assert.ok(f.fuel<55);assert.ok(a.command(57,'Посадка').ok);a.tick(1);assert.ok(a.command(57,'Второй круг').ok);assert.equal(a.reputation,96,'penalty applies once to the confirmed early approach');
 for(const conflict of ['closed','closing','occupied','separation','gate']){
  a=airport(Type);f=a.flights[0];const r=a.runways[0];if(conflict==='closed')r.closed=true;if(conflict==='closing')r.closing=true;if(conflict==='occupied')r.owner=99;if(conflict==='separation')r.safeAt=100;if(conflict==='gate')a.gates[0].owner=99;
  assert.equal(a.command(57,'Принять заход').ok,false);assert.ok(a.command(57,'Второй круг').ok);assert.equal(a.reputation,100,conflict);assert.equal(a.unnecessaryGoArounds,0);
 }
 a=airport(Type);a.tick(24);assert.equal(a.command(57,'Второй круг').ok,false);assert.equal(a.reputation,100);a.tick(5);assert.equal(a.losses,0);
 a=airport(Type);a.storyPending='test-pause';const state=JSON.stringify([a.time,a.flights,a.runways,a.gates]);a.tick(60);assert.equal(JSON.stringify([a.time,a.flights,a.runways,a.gates]),state);
 a=airport(Type);a.storyPending=null;a.command(57,'Второй круг');a.spawnCase({id:95,caseType:'forged'});assert.equal(a.command(95,'Принять заход').ok,false);a.command(95,'Второй круг');assert.equal(a.prevented,1);assert.equal(a.reputation,96);
}
// A legitimate outside clearance cannot steal a runway or gate from player traffic.
let a=airport();a.command(57,'Второй круг');a.runways.forEach(r=>r.owner=99);a.spawnCase({id:58,caseType:'early'});let waiting=a.flights.find(f=>f.id===58);assert.equal(waiting.phase,'holding');assert.equal(waiting.earlyQueued,true);a.runways[0].owner=null;a.runways[0].safeAt=a.time+5;a.tick(4);assert.equal(waiting.phase,'holding');a.tick(1.1);assert.equal(waiting.phase,'unauthorized');assert.equal(a.runways[0].owner,58);
for(const phrase of ['рейс 57 принять заход','рейс пятьдесят семь подтвердить заход']){assert.equal(parse(phrase).command,'Принять заход');assert.equal(new VoiceSession().receive(phrase).command.command,'Принять заход')}
console.log('PASS: early approaches land continuously, reserve real resources, pause, accept by voice, charge unnecessary go-arounds once and never penalize safety conflicts');
