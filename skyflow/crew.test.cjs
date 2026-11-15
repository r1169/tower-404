const assert=require('node:assert/strict');const {Dialogue,Crew}=require('./dialogue.js');
const d=new Dialogue(),c=new Crew();
assert.equal(c.tick(20,d,{busy:true}),false);assert.equal(d.history.length,0);
assert.equal(c.tick(20,d),true);assert.equal(d.active.who,'dana');assert.equal(d.active.emotion,'amused');assert.equal(d.queue[0].who,'timur');assert.equal(d.queue[0].kind,'personal');
d.say('dana','SF 012: посадка разрешена.');assert.equal(d.active.kind,'personal');assert.equal(d.queue.length,2);assert.equal(d.queue[0].text,'SF 012: посадка разрешена.');
d.reset();c.reset();c.react({type:'complete'},5);assert.equal(c.tick(17,d),true);assert.match(d.active.text,/Первый борт дома/);assert.equal(d.active.emotion,'warm');
d.reset();c.react({type:'complete'},25);c.react({type:'complete'},30);assert.equal(c.tick(58,d),true);assert.match(d.active.text,/Три борта подряд/);
d.reset();c.reset();c.react({type:'rejected'},10);assert.equal(c.tick(20,d,{busy:true}),false);assert.equal(c.tick(20,d),true);assert.equal(d.active.emotion,'worried');assert.equal(d.queue[0].emotion,'warm');d.say('timur','Срочно: мало топлива!');assert.equal(d.active.kind,'operation');assert.equal(d.active.priority,2);assert.equal(d.queue.length,0);
d.reset();c.reset();c.react({type:'checked',message:'Угроза подтверждена'},2);assert.equal(c.tick(18,d),true);assert.match(d.active.text,/Там ведь люди/);assert.equal(d.queue[0].emotion,'focused');
d.reset();c.reset();c.react({type:'complete'},0);c.tick(50,d,{busy:true});assert.equal(c.pending,null);assert.equal(d.history.length,0);
c.reset();assert.equal(c.pending,null);assert.equal(c.completed,0);assert.equal(c.used.size,0);assert.equal(c.idleIndex,0);
// Exhaust the calm conversations; they do not cycle through the same jokes forever.
for(let i=0;i<12;i++){d.reset();assert.equal(c.tick(20+i*50,d),true)}d.reset();assert.equal(c.tick(800,d),false);
console.log('PASS: character voices, emotion metadata, event reactions, busy suppression, immediate operational interruption, stale reaction expiry, reset and no repeating idle loop');

// Later chapters have their own colleagues' conversations and event reactions.
for(const chapter of [2,3]){
 const later=new Crew({classic:true});later.chapter=chapter;d.reset();assert.equal(later.tick(9,d,{busy:true,wave:1}),false);
 assert.ok(later.tick(10,d,{busy:false,wave:1}));assert.match(d.active.text,chapter===2?/чай справа/:/лестниц/);
 const initial=d.active.text;d.reset();assert.equal(later.tick(65,d,{busy:false,wave:1}),false);
 later.react({type:'unnecessary'},70);assert.ok(later.tick(75,d,{busy:false,wave:1}));assert.match(d.active.text,/Зря завернули/);
 d.say('dana','Опасный заход!',{priority:3});assert.equal(d.active.kind,'operation');assert.ok(d.deferred.length);d.clearPersonal();assert.equal(d.deferred.length,0);assert.ok(!d.queue.some(x=>x.kind==='personal'));
 later.react({type:'incident'},90);d.reset();assert.ok(later.tick(140,d,{busy:false,wave:3}));assert.match(d.active.text,/тот сигнал/);d.reset();assert.equal(later.tick(200,d,{busy:false,wave:3}),false);
 later.reset();d.reset();assert.ok(later.tick(10,d,{busy:false,wave:1}));assert.equal(d.active.text,initial);
}
const thirdCrew=new Crew();thirdCrew.chapter=3;thirdCrew.react({type:'complete',caseType:'hydraulic'},30);d.reset();assert.ok(thirdCrew.tick(35,d,{busy:false,wave:2}));assert.match(d.active.text,/Сел. Полосу освободил/);
const secondCrew=new Crew();secondCrew.chapter=2;secondCrew.react({type:'goaround',caseType:'forged'},40);d.reset();assert.ok(secondCrew.tick(45,d,{busy:false,wave:3}));assert.match(d.active.text,/мой голос/);
console.log('PASS: chapter-specific conversations, event context, once per shift, interruption, incident suppression and fresh retry');

d.reset();c.reset();assert.equal(c.tick(8,d),true);assert.match(d.active.text,/взлётную полосу/);assert.match(d.queue[0].text,/бодрит/);d.say('dana','Новый рейс в очереди.');d.tick(7);assert.equal(d.active.kind,'operation');d.tick(7);assert.equal(d.active.kind,'personal');assert.equal(d.active.who,'timur');d.reset();assert.equal(c.tick(30,d),true);assert.match(d.active.text,/спячку/);console.log('PASS: restored original jokes, eight-second opening, frequent exchanges and resumption after routine messages');

const classic=new Crew({classic:true});d.reset();classic.react({type:'complete'},1);assert.equal(classic.pending,null);d.say('dana','Рейс принят.');assert.equal(classic.tick(8,d),true);assert.match(d.queue[0].text,/кофе заварил/);d.reset();classic.tick(30,d);assert.match(d.active.text,/После смены я официально ухожу в спячку/);d.reset();classic.tick(52,d);assert.match(d.queue[0].text,/Я остался ради тебя. И потому что лифт не работает/);d.reset();classic.tick(74,d);assert.match(d.queue[0].text,/упрямый кофейник/);d.reset();classic.tick(96,d);assert.match(d.active.text,/нарисовал лицо/);console.log('PASS: original five conversations play in order, queue behind routine status, ignore new reactions then continue with fresh conversations');

d.reset();d.say('dana','Дай договорить.',{kind:'personal'});d.tick(1);const line=d.active;d.say('timur','Прибыл новый рейс.');assert.equal(d.active,line);assert.equal(d.active.age,1);d.tick(6);assert.equal(d.active.text,'Прибыл новый рейс.');d.tick(7);assert.equal(d.active,null);assert.equal(d.history.filter(x=>x.text==='Дай договорить.').length,1);console.log('PASS: routine messages wait for the current line; no replay or typing restart');

d.reset();const preserved=new Crew({classic:true});preserved.idleIndex=2;preserved.tick(8,d);assert.equal(d.active.who,'dana');d.tick(7);assert.equal(d.active.who,'timur');d.tick(1);const interrupted=d.active;d.say('dana','Срочно: мало топлива!');assert.equal(d.active.kind,'operation');d.holdPersonal=true;d.tick(90);assert.equal(d.active,null);assert.equal(d.deferred.length,1);d.holdPersonal=false;d.tick(.1);assert.equal(d.active,interrupted);assert.ok(d.active.age>=1);assert.match(d.active.text,/Я остался ради тебя/);assert.equal(d.history.filter(x=>/Я остался ради тебя/.test(x.text)).length,1);console.log('PASS: lift punchline survives emergencies and long waits, resumes without restarting or duplicate history');

d.reset();const once=new Crew({classic:true});const spoken=[];for(let i=0;i<12;i++){d.reset();assert.equal(once.tick(8+i*30,d),true);spoken.push(d.active.text,...d.queue.map(x=>x.text))}d.reset();assert.equal(once.tick(600,d),false);assert.equal(new Set(spoken).size,spoken.length);assert.equal(spoken.filter(x=>x==='Я остался ради тебя. И потому что лифт не работает.').length,1);assert.ok(!spoken.some(x=>/Когда ты рядом/.test(x)));once.reset();assert.equal(once.tick(8,d),true);console.log('PASS: no repeated personal dialogue per shift, flirt removed, exact lift joke kept once, fresh shift resets conversations');

assert.ok(!spoken.some(x=>/Знаешь, чего не хватает|Третьего диспетчера|Печенья/.test(x)));console.log('PASS: entire unfinished dispatcher-question exchange removed');
