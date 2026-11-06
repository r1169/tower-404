const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{Airport}=require('./simulation.js');
const env={window:{},Image:class{}};vm.createContext(env);vm.runInContext(fs.readFileSync(__dirname+'/tower.js','utf8'),env);const {position}=env.window.SkyflowTower;
function close(a,b){assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-8,JSON.stringify({a,b}));assert.ok(Math.abs(a.scale-b.scale)<1e-8)}
function angle(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
for(const runway of [1,2])for(const gate of [1,2,3,'ISO']){
 const f={id:23,viewSlot:7,runway,gate,departureGate:gate,approachTime:37};
 const holding=position({...f,phase:'holding'},37),landing=position({...f,phase:'landing',progress:0},37);close(holding,landing);
 for(const [from,to]of [['landing','taxiIn'],['taxiIn','service'],['taxiOut','takeoff']]){
  const a=position({...f,phase:from,progress:1},49),b=position({...f,phase:to,progress:0},49);close(a,b);assert.ok(Math.abs(angle(a.heading,b.heading))<1e-8);
 }
 for(const phase of ['landing','taxiIn','taxiOut','takeoff']){let prev=position({...f,phase,progress:0},37);for(let n=1;n<=1000;n++){const next=position({...f,phase,progress:n/1000},37);assert.ok(Math.hypot(next.x-prev.x,next.y-prev.y)<.005);assert.ok(Math.abs(angle(next.heading,prev.heading))<.08);prev=next}}
}
const a=new Airport([{id:12,fuel:74},{id:23,fuel:38,risk:true},{id:47,fuel:57}],{dynamic:true,seed:1});
const untouched=position(a.flights[2],0);a.flights[0].done=true;a.flights[0].phase='lost';assert.deepEqual(position(a.flights[2],0),untouched);
a.time=37;a.runways[1].closed=false;assert.ok(a.command(23,'Изолированная стоянка').ok);assert.equal(a.flights[1].approachTime,37);
console.log('PASS: continuous position, scale and heading across phases on both runways and every gate; stable holding slots');
