const assert=require('node:assert/strict'),{Airport}=require('./simulation.js'),{parse}=require('./controls.js');
const data=[{id:12,code:'SF12',fuel:74},{id:47,code:'AK47',fuel:57}];
let a=new Airport(data);assert.equal(a.emergencyServices().ok,false);a.command(12,'Посадка');a.command(47,'Посадка',{runway:1,force:true});
assert.ok(a.runways[0].wreck);assert.equal(a.runways[1].closed,false);assert.equal(a.finished,false);a.tick(40);assert.ok(a.runways[0].closed);assert.ok(a.runways[0].wreck);
assert.ok(a.emergencyServices().ok);assert.equal(a.emergencyServices().ok,false);a.tick(74.9);assert.ok(a.runways[0].wreck);a.tick(.2);assert.equal(a.runways[0].wreck,null);assert.equal(a.runways[0].closed,false);assert.equal(a.finished,true);
assert.equal(parse('вызвать аварийные службы').type,'emergency');
// The scheduled opening must never clear a wrecked second runway.
a=new Airport(data,{dynamic:true,seed:1});a.runways[1].closed=false;a.command(12,'Посадка',{runway:2});a.command(47,'Посадка',{runway:2,force:true});a.tick(36);assert.ok(a.runways[1].wreck);assert.ok(a.runways[1].closed);
console.log('PASS: persistent wreck, early backup opening, voice rescue, no duplicate dispatch, 75-second recovery and no premature win');
