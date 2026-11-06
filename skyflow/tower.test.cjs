const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');const env={window:{},Image:class{}};vm.createContext(env);vm.runInContext(fs.readFileSync(__dirname+'/tower.js','utf8'),env);const p=env.window.SkyflowTower.position;
const airport={time:10,runways:[{id:1,owner:12},{id:2,closed:true,owner:null}],gates:[{id:1,owner:12},{id:2,owner:null},{id:3,owner:61},{id:'ISO',owner:null,blockedUntil:20}],flights:[{id:12,phase:'landing'},{id:61,phase:'ready'}]};
let instruments=env.window.SkyflowTower.instrumentState(airport);
assert.equal(instruments.runways[0].status,'busy');assert.equal(instruments.runways[1].status,'closed');
assert.equal(instruments.gates[0].status,'reserved');assert.equal(instruments.gates[1].status,'free');assert.equal(instruments.gates[2].status,'occupied');assert.equal(instruments.gates[3].status,'blocked');
airport.flights[0].phase='service';airport.runways[0].owner=null;airport.runways[0].safeAt=15;
instruments=env.window.SkyflowTower.instrumentState(airport);assert.equal(instruments.gates[0].status,'occupied');assert.equal(instruments.runways[0].status,'separation');
airport.time=21;airport.gates[0].owner=null;instruments=env.window.SkyflowTower.instrumentState(airport);assert.equal(instruments.gates[0].status,'free');assert.equal(instruments.runways[0].status,'free');assert.equal(instruments.gates[3].status,'free');
console.log('PASS: instruments distinguish reserved and occupied gates, closures and separation');
for(let angle=-Math.PI;angle<=Math.PI;angle+=.1){const o=env.window.SkyflowTower.orientation(angle);assert.ok(Math.abs(o.tilt)<=.12);assert.ok(o.facing===1||o.facing===-1)}
for(const phase of ['holding','landing','taxiIn','service','parked','ready','taxiOut','takeoff'])for(const progress of [0,.5,1]){const point=p({id:12,phase,progress,runway:1,gate:2},10);assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));assert.ok(point.x>0&&point.x<1&&point.y>0&&point.y<.65);assert.ok(point.scale<=1)}
for(const [from,to]of [['landing','taxiIn'],['taxiIn','service'],['taxiOut','takeoff']]){const a=p({id:12,phase:from,progress:1,runway:1,gate:2},0),b=p({id:12,phase:to,progress:0,runway:1,gate:2},0);assert.ok(Math.abs(a.x-b.x)<1e-8&&Math.abs(a.y-b.y)<1e-8)}
for(const [w,h]of [[480,440],[1400,720],[440,248],[900,700]]){const f=env.window.SkyflowTower.fit(w,h);assert.ok(f.x>=0&&f.y>=0);assert.ok(1280*f.scale<=w+.001&&720*f.scale<=h+.001);assert.ok(Math.abs((1280*f.scale)/(720*f.scale)-16/9)<1e-9)}console.log('PASS: tower positions, path continuity and undistorted 16:9 viewport fit');
