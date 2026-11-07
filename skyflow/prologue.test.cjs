const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const app={innerHTML:''};let frame;const env={window:{SKYFLOW_DYNAMIC:false},document:{querySelector:s=>s==='#app'?app:null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>({querySelector:()=>({addEventListener(){}})}),body:{append(){}}},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:f=>frame=f};
vm.createContext(env);
for(const name of ['simulation','dialogue','tutorial','game']){let source=fs.readFileSync(__dirname+'/'+name+'.js','utf8');if(name==='game')source=source.replace('render();requestAnimationFrame(loop);','window.testExpression=crewExpression;window.storyAction=action;window.storyTick=tickStory;window.crewTick=tickCrew;window.crewDialogue=dialogue;render();requestAnimationFrame(loop);');vm.runInContext(source,env)}
const action=env.window.storyAction,input=env.window.skyflowInput,snap=env.window.skyflowSnapshot;

input({type:'navigation',action:'start'});assert.equal(snap().screen,'prologue');assert.equal((app.innerHTML.match(/<article/g)||[]).length,8);assert.equal((app.innerHTML.match(/story-panel unrevealed/g)||[]).length,7);
for(let i=0;i<6;i++){env.window.storyTick(20);assert.equal(snap().prologueStep,i+1);assert.equal(snap().time,0)}
assert.equal((app.innerHTML.match(/story-panel revealed/g)||[]).length,8);env.window.storyTick(20);assert.equal(snap().screen,'game');assert.equal(snap().tutorial,0);assert.equal(snap().paused,true);assert.doesNotMatch(app.innerHTML,/Показать, как всё работает/);
input({type:'navigation',action:'skipTutorial'});assert.equal(snap().tutorial,null);assert.equal(snap().paused,false);
for(const skip of [()=>action('skip-prologue'),()=>input({type:'gesture',action:'confirm'}),()=>input({type:'navigation',action:'skipPrologue'}),()=>input({type:'navigation',action:'skipTutorial'})]){action('prologue');skip();assert.equal(snap().screen,'game');assert.equal(snap().tutorial,0)}
action('prologue');input({type:'gesture',action:'cancel'});assert.equal(snap().screen,'menu');
action('prologue');let seconds=0;while(snap().screen==='prologue'&&seconds<25){env.window.storyTick(.1);seconds+=.1}assert.ok(seconds>=19&&seconds<21);assert.equal(snap().tutorial,0);assert.equal(snap().time,0);
console.log('PASS: sequential full-page comic, automatic tutorial after finish or skip, frozen simulation, existing skip-training control and no extra choice screen');
