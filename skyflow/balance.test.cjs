const assert=require('node:assert/strict'),{Airport}=require('./simulation.js');
const data=[{id:12,code:'SF012',fuel:74},{id:23,code:'NV023',fuel:38,risk:true},{id:47,code:'AK047',fuel:57,kind:'СРОЧНЫЙ'},{id:61,code:'SF061',fuel:92,kind:'ВЫЛЕТ'}];
// A dispatcher issues only one order per thinking/voice/gesture interval.
const results=[];
for(const reaction of [6,10,14]){
 let longest=0,lowestFuel=100;
 for(let seed=0;seed<100;seed++){
  const a=new Airport(data,{dynamic:true,seed});let nextOrder=reaction;
  for(let t=0;t<600&&!a.finished&&!a.failed;t++){
   if(t>=nextOrder){
    const candidates=a.flights.filter(f=>['holding','ready'].includes(f.phase)&&!f.checking).sort((a,b)=>(a.phase==='ready'?999:a.fuel/(a.urgent?.24:.2))-(b.phase==='ready'?999:b.fuel/(b.urgent?.24:.2)));
    for(const f of candidates){
     if(f.risk&&!f.checked){if(a.inspection)continue;assert.ok(a.command(f.id,'Проверка').ok);nextOrder=t+reaction;break}
     const runway=a.runways.some(r=>!r.closed&&!r.closing&&r.owner===null&&!(r.safeAt>a.time));
     const gate=f.phase==='ready'||a.gates.some(g=>g.owner===null&&(f.threat?g.id==='ISO':g.id!=='ISO'));
     if(!runway||!gate)continue;
     const result=a.command(f.id,f.phase==='ready'?'Взлёт':f.threat?'Изолированная стоянка':'Посадка');
     assert.ok(result.ok);if(f.phase==='landing')lowestFuel=Math.min(lowestFuel,f.fuel);nextOrder=t+reaction;break;
    }
   }
   a.tick(1);a.drain();
  }
  assert.equal(a.failed,null,`reaction ${reaction}, seed ${seed}`);assert.equal(a.finished,true);assert.equal(a.losses,0);assert.equal(a.reputation,100);
  longest=Math.max(longest,a.time);
 }
 results.push({reactionSeconds:reaction,seeds:100,longestShiftSeconds:Math.ceil(longest),minimumLandingFuel:Math.floor(lowestFuel)});
}
let a=new Airport(data);a.flights[0].delayLimit=1;a.tick(2);assert.equal(a.flights[0].phase,'diverted');assert.equal(a.losses,0);assert.equal(a.reputation,88);
console.log('PASS: 300 shifts, delayed one-at-a-time orders, checks before decisions, no losses or diversions');console.log(JSON.stringify(results));
