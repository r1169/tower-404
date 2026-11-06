const assert=require('node:assert/strict'),{Airport}=require('./simulation.js');
const data=[{id:12,code:'SF12',fuel:74},{id:23,code:'NV23',fuel:38,risk:true},{id:47,code:'AK47',fuel:57},{id:61,code:'SF61',fuel:92,kind:'ВЫЛЕТ'}];
let a=new Airport(data,{dynamic:true,seed:42});
assert.ok(a.command(23,'Проверка').ok);assert.equal(a.flights[1].checked,false);assert.equal(a.command(12,'Проверка').ok,false);a.tick(12.1);assert.equal(a.flights[1].checked,true);assert.ok(a.flights[1].fuel<38);assert.match(a.flights[1].status,/ОПАСЕН/);
assert.equal(a.command(23,'Посадка').warning,true);assert.equal(a.flights[1].phase,'holding');
assert.ok(a.command(23,'Изолированная стоянка').ok);a.tick(40);assert.equal(a.losses,0);
a=new Airport(data);a.flights[1].threat=false;a.command(23,'Проверка');a.tick(12.1);assert.match(a.flights[1].status,/БЕЗОПАСЕН/);assert.ok(a.command(23,'Посадка').ok);a.tick(38);assert.equal(a.losses,0);
for(const outcome of ['explosion','seizure','tower']){
 a=new Airport(data,{dynamic:true,seed:1});a.flights[1].outcome=outcome;assert.ok(a.command(23,'Посадка').warning);a.command(23,'Посадка',{force:true});a.tick(12.1);assert.equal(a.losses,1);assert.ok(a.reputation<100);assert.equal(!!a.failed,outcome==='tower');if(outcome==='explosion')assert.ok(a.runways[0].closed);if(outcome==='seizure')assert.equal(a.gates[0].owner,'BLOCKED');
}
a=new Airport(data);a.command(12,'Посадка');assert.equal(a.command(47,'Посадка',{runway:1}).warning,true);assert.equal(a.effects.length,0);a.command(47,'Посадка',{runway:1,force:true});assert.equal(a.losses,2);assert.equal(a.runways[0].owner,null);assert.equal(a.effects.length,1);assert.equal(a.effects[0].type,'collision');assert.deepEqual(a.effects[0].codes,['AK47','SF12']);
a=new Airport(data);a.command(12,'Посадка');a.tick(12);assert.ok(a.command(47,'Посадка',{runway:1}).warning);a.tick(5.1);assert.ok(a.command(47,'Посадка',{runway:1}).ok);
a=new Airport(data);a.flights[1].fuel=.1;a.tick(1);assert.equal(a.losses,1);assert.equal(a.failed,null);assert.equal(a.reputation,60);
a=new Airport(data);a.flights[0].fuel=100;a.flights[0].delayLimit=1;a.tick(2);assert.equal(a.flights[0].phase,'diverted');assert.equal(a.reputation,88);assert.equal(a.losses,0);
console.log('PASS: timed exclusive inspections, false alarm, dangerous confirmation, all three consequences, collision, separation, fuel and delay losses');
