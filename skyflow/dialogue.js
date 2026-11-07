(() => {
 class Dialogue {
  constructor(){this.reset()}
  reset(){this.active=null;this.queue=[];this.deferred=[];this.holdPersonal=false;this.history=[];this.sequence=0;this.time=0;this.seen=new Map()}
  say(who,text,options={}){
   text=String(text||'').replace(/^(Дана|Тимур):\s*/,'').trim();if(!text)return;
   const key=who+':'+text;if(this.time-(this.seen.get(key)??-100)<20)return;
   this.seen.set(key,this.time);
   const personal=options.kind==='personal';
   const priority=personal?-1:/авари|столкнов|опас|топлив|обломк|потер|угроз|срочн/i.test(text)?2:/провер|заключ|безопас/i.test(text)?1:0;
   const runway=text.match(/полоса\s+(\d)/i),topic=runway?'runway:'+runway[1]:null;
   // Replace the current status of a resource; history still keeps every change.
   if(topic){this.queue=this.queue.filter(x=>x.topic!==topic);if(this.active?.topic===topic)this.active=null}
   if(!personal&&priority===2){const waiting=this.queue.filter(x=>x.kind==='personal');if(this.active?.kind==='personal'){waiting.unshift(this.active);this.active=null}this.deferred.push(...waiting);this.queue=this.queue.filter(x=>x.kind!=='personal')}
   const item={id:++this.sequence,who,text,priority,topic,kind:personal?'personal':'operation',emotion:options.emotion??null,age:0,duration:Math.max(6,Math.min(13,text.length/15+3)),time:this.time};
   this.history.unshift(item);this.history=this.history.slice(0,60);
   if(!this.active)this.active=item;
   else if(priority===2&&priority>this.active.priority){this.active=item;this.queue=this.queue.filter(x=>x.priority>=priority)}
   else{this.queue.push(item);this.queue.sort((a,b)=>b.priority-a.priority||a.id-b.id);this.queue=this.queue.filter((x,i)=>x.kind==='personal'||i<5)}
  }
  invalidate(test){if(this.active&&test(this.active))this.active=null;this.queue=this.queue.filter(x=>!test(x));if(!this.active)this.active=this.nextLine()}
  nextLine(){const index=this.queue.findIndex(x=>!this.holdPersonal||x.kind!=='personal');if(index>=0)return this.queue.splice(index,1)[0];return !this.holdPersonal?this.deferred.shift()||null:null}
  tick(dt){this.time+=dt;this.queue=this.queue.filter(x=>x.kind==='personal'||this.time-x.time<18);const before=this.active?.id;if(this.active){this.active.age+=dt;if(this.active.age>=this.active.duration)this.active=null}if(!this.active)this.active=this.nextLine();return before!==this.active?.id}
  visible(who){return this.active?.who===who?this.active:null}
 }

 // Character exchanges wait for a calm gap; operational dialogue always takes over.
 const exchanges={
  first:[['dana','Первый борт дома. Каждый раз выдыхаю только после посадки.','warm'],['timur','А я — после твоего выдоха. Значит, всё действительно в порядке.','warm']],
  departure:[['dana','Проводили. Пусть у них дальше будет спокойный полёт.','warm'],['timur','И никаких ночных сюрпризов. Свои мы, кажется, уже получили.','amused']],
  streak:[['timur','Три борта подряд. Мы начинаем напоминать полноценную смену.','amused'],['dana','Только не говори это громко. Ночь услышит и пришлёт ещё работу.','amused']],
  checked:[['timur','Люблю, когда сведения сходятся. У цифр хотя бы нет привычки спорить.','amused'],['dana','Это ты сейчас на меня посмотрел?','amused']],
  suspect:[['dana','Мне не нравится, когда за позывным ничего не понятно. Там ведь люди.','worried'],['timur','Поэтому и сверяем всё по шагам. Я возьму документы, ты держи связь.','focused']],
  mistake:[['dana','Я поторопилась. Злюсь на себя.','worried'],['timur','Одна команда — ещё не вся смена. Сначала сверимся с данными. Я рядом.','warm']],
  aftermath:[['dana','Я всё ещё слышу тот сигнал. Не получается просто забыть.','worried'],['timur','И не надо. Давай по одному решению. Следующее примем вместе.','warm']],
  pressure:[['dana','Хочется ответить всем сразу. Ненавижу заставлять людей ждать.','worried'],['timur','Сразу у нас только два голоса. Давай по очереди. Я подстрахую.','focused']],
  idle:[
   [['dana','Ты кофе заварил или взлётную полосу им обработал?','amused'],['timur','Главное — не перепутать с авиационным топливом. Хотя бодрит примерно так же.','amused']],
   [['timur','После смены я официально ухожу в спячку.','amused'],['dana','Сначала сдашь гарнитуру. В прошлый раз спал прямо в ней.','amused']],
   [['dana','Смотри, какой рассвет будет. Ради такого можно и остаться.','warm'],['timur','Я остался ради тебя. И потому что лифт не работает.','amused']],
   [['dana','Ещё один борт дома. Хорошо работаем.','warm'],['timur','Отлично. В графе «состав смены» пишем: два диспетчера и один упрямый кофейник.','warm']],
   [['dana','Ты опять нарисовал лицо на моей кружке?','amused'],['timur','Это индикатор заряда. Пока хмурится — пора долить кофе.','amused']],
   [['timur','Ты всегда запоминаешь голоса пилотов?','neutral'],['dana','Да. Так проще помнить, что на радаре не просто точки.','warm']],
   [['dana','После смены пойду завтракать. И закажу всё, что не из автомата.','warm'],['timur','У меня амбициознее план. Стул без колёс и восемь часов тишины.','amused']],
   [['dana','Ты слишком спокойный. У тебя вообще бывает паника?','amused'],['timur','Бывает. Просто сначала я аккуратно откладываю ручку.','amused']],
   [['timur','У тебя стикер на мониторе отклеивается.','neutral'],['dana','Не трогай. Это мой счастливый стикер. С третьего курса.','warm'],['timur','Тогда ему положена надбавка за выслугу лет.','amused']],
   [['dana','Спасибо, что не ушёл. Я бы одна тут с ума сошла.','warm'],['timur','Кто-то же должен напоминать тебе про остывший чай.','warm']],
   [['timur','Тебе помочь или сначала дать поворчать?','amused'],['dana','И то и другое. Я многозадачная.','amused']],
   [['dana','Когда страшно, я начинаю слишком много говорить.','worried'],['timur','Говори. Я всё равно слушаю.','warm']]
  ]
 };
 class Crew {
  constructor({classic=false}={}){this.classic=classic;this.reset()}
  reset(){this.next=8;this.idleIndex=0;this.completed=0;this.pending=null;this.used=new Set();this.lastReaction=-100}
  react(event,time=0){
   if(this.classic)return;
   let topic=event.type==='complete'?(++this.completed===1?(/взлёт/i.test(event.message||'')?'departure':'first'):this.completed===3?'streak':null):event.type==='checked'?(/угроз|подозр|не совп|не найден/i.test(event.message||'')?'suspect':'checked'):event.type==='incident'?'aftermath':event.type==='rejected'?'mistake':event.type==='stage'?'pressure':null;
   if(!topic||this.used.has(topic))return;
   const urgent=['aftermath','mistake','suspect'].includes(topic);
   if(this.pending&&!urgent)return;
   this.pending={topic,time,expires:time+45};this.next=Math.max(this.next,time+(urgent?4:2));
  }
  tick(time,dialogue,state={}){
   if(this.pending&&time>this.pending.expires)this.pending=null;
   if(state.busy||dialogue.deferred.length||time<this.next)return false;
   if(this.classic){if(dialogue.active?.priority===2||dialogue.active?.kind==='personal'||dialogue.queue.some(x=>x.kind==='personal'||x.priority===2)||dialogue.queue.length>1)return false}else if(dialogue.active||dialogue.queue.length)return false;
   let lines;
   if(this.pending){if(time-this.lastReaction<20)return false;const {topic}=this.pending;this.pending=null;this.used.add(topic);lines=exchanges[topic];this.lastReaction=time}
   else {const count=exchanges.idle.length;if(this.idleIndex>=count)return false;lines=exchanges.idle[this.idleIndex++]}
   for(const [who,text,emotion]of lines)dialogue.say(who,text,{kind:'personal',emotion});
   this.next=time+22;return true;
  }
 }

 if(typeof module!=='undefined')module.exports={Dialogue,Crew};
 if(typeof window!=='undefined')window.SkyflowDialogue={Dialogue,Crew};
})();
