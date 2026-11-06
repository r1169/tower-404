const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const env={window:{},Image:class{},performance:{now:()=>0}};vm.createContext(env);vm.runInContext(fs.readFileSync(__dirname+'/tower.js','utf8'),env);
function render(f){const calls=[];const c=new Proxy({measureText:s=>({width:s.length*7})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)});const canvas={width:1280,height:720,clientWidth:1280,clientHeight:720,getContext:()=>c};env.window.SkyflowTower.draw(canvas,0,{time:0,flights:[f],runways:[{id:1,owner:null},{id:2,owner:null}],gates:[]},null,false);return calls}
assert.equal(render({id:12,code:'SF012',phase:'holding'}).filter(c=>c[0]==='ellipse').length,0);
for(const runway of [1,2]){
 const base={id:12,code:'SF012',runway};
 assert.equal(render({...base,phase:'landing',progress:0}).filter(c=>c[0]==='ellipse').length,0);
 assert.equal(render({...base,phase:'landing',progress:.8}).filter(c=>c[0]==='ellipse').length,1);
 assert.equal(render({...base,phase:'takeoff',progress:.98}).filter(c=>c[0]==='ellipse').length,0);
 for(const phase of ['landing','takeoff']){const f={...base,phase,progress:.5};const p=env.window.SkyflowTower.position(f,0);assert.equal(Math.sin(p.heading)>0,phase==='landing');assert.equal(render(f).filter(c=>c[0]==='rotate'&&Math.abs(c[1])>.01).length,0)}
}
console.log('PASS: no shadows in the sky; front on landing, rear on takeoff, no rocket-style sprite rotation');
