const assert=require('node:assert/strict');const {Airport}=require('./simulation.js');
const data=[{id:12,code:'SF012',fuel:74},{id:23,code:'NV023',fuel:38,risk:true},{id:47,code:'AK047',fuel:57},{id:61,code:'SF061',fuel:92,kind:'ВЫЛЕТ'}];
// A closure request during landing blocks new reservations but lets its owner finish.
let a=new Airport(data,{dynamic:true,seed:1});a.schedule=[{at:1,type:'closure'}];a.target=4;a.runways[1].closed=false;a.random=()=>0;
a.command(12,'Посадка');a.tick(2);assert.equal(a.runways[0].closing,true);assert.equal(a.runways[0].closed,false);assert.equal(a.runways[0].owner,12);
assert.equal(a.command(47,'Посадка',{runway:1}).ok,false);
a.tick(11);assert.equal(a.runways[0].closed,true);assert.equal(a.runways[0].owner,null);a.tick(30);assert.equal(a.runways[0].closed,false);
// Deterministic seeds and different seeds produce repeatable/varied schedules.
const x=new Airport(data,{dynamic:true,seed:42}),y=new Airport(data,{dynamic:true,seed:42}),z=new Airport(data,{dynamic:true,seed:99});
assert.deepEqual(x.schedule,y.schedule);assert.notDeepEqual(x.schedule,z.schedule);assert.equal(x.finished,false);
// Dispatch all traffic for many seeds, asserting safety every step.
for(let seed=0;seed<100;seed++){
 const sim=new Airport(data,{dynamic:true,seed});let arrivals=0,urgent=0,suspect=0,completed=0,closures=0;
 for(let t=0;t<500&&!sim.failed&&!sim.finished;t++){
  const waiting=sim.flights.filter(f=>f.phase==='holding'||f.phase==='ready').sort((a,b)=>a.fuel-b.fuel);
  for(const f of waiting){if(f.risk&&!f.checked)sim.command(f.id,'Проверка');sim.command(f.id,f.phase==='ready'?'Взлёт':f.risk?'Изолированная стоянка':'Посадка')}
  sim.tick(1);
  for(const e of sim.drain()){if(['arrival','urgent','suspect'].includes(e.type))arrivals++;if(e.type==='urgent')urgent++;if(e.type==='suspect')suspect++;if(e.type==='complete')completed++;if(e.type==='runway'&&e.message.includes('закрыта на'))closures++}
  for(const r of sim.runways){if(r.closed)assert.equal(r.owner,null);if(r.owner!==null)assert.ok(sim.flights.some(f=>f.id===r.owner&&['landing','taxiOut','takeoff'].includes(f.phase)))}
  for(const g of sim.gates){if(g.owner!==null)assert.equal(sim.flights.find(f=>f.id===g.owner).gate,g.id)}
 }
 assert.equal(sim.failed,null,`seed ${seed} failed`);assert.equal(sim.finished,true,`seed ${seed} unfinished`);assert.equal(arrivals,6);assert.equal(completed,10);assert.ok(urgent>=1&&suspect>=1);assert.ok(closures>=1);
 assert.equal(new Set(sim.flights.map(f=>f.id)).size,10);
}
console.log('PASS: safe closure/reopening, reproducible randomness, 100 full shifts, new arrivals, emergencies, suspects, gates and runway invariants');
