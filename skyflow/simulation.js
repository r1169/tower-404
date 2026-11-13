(function(root){
'use strict';
const durations={landing:12,taxiIn:8,service:18,taxiOut:8,takeoff:10};
const labels={holding:'Ожидание в воздухе',landing:'Посадка',taxiIn:'Руление к выходу',service:'Обслуживание у выхода',parked:'Обслужен у выхода',ready:'Готов к вылету',taxiOut:'Руление на полосу',takeoff:'Взлёт',departed:'Вылетел',emergency:'Топливо исчерпано'};
const episodes = [
 {id:1, title:'Последние в башне', startMinute:137, endMinute:220, waves:3, interval:72, firstArrival:65, fuelRate:1, delayLimit:210, closure:16,
  objective:'Удержите аэропорт и проверьте подозрительные борта.',
  intro:'После ложной эвакуации в башне остались Дана и Тимур. Резервный центр молчит. Самолёты продолжают прибывать.',
  ending:'В эфире звучит голос Даны: «Северный эвакуирован. Передайте управление». Дана снимает гарнитуру. «Я этого не говорила». Тимур сохраняет запись — в ней стоит вчерашняя дата.'},
 {id:2, title:'Ложные сигналы', startMinute:220, endMinute:290, waves:5, interval:55, firstArrival:48, fuelRate:1.2, delayLimit:190, closure:22,
  objective:'Сверяйте сообщения с экипажами. Проверка обновляет устаревшие сведения.',
  intro:'Система повторяет старые переговоры. Рейс 23 просит срочную посадку, хотя последняя сводка показывает большой запас топлива. Поручите Тимуру проверку. Среди тревожных сообщений есть ложные вызовы и настоящие угрозы.',
  ending:'Тимур находит цепочку архивных сообщений. Резервный центр получил отметку «башня эвакуирована» и отключил её канал. Теперь понятно, почему никто не отвечает. Дана: «Значит, надо вернуть нас в эфир».'},
 {id:3, title:'До рассвета', startMinute:290, endMinute:360, waves:7, interval:46, firstArrival:40, fuelRate:1.4, delayLimit:175, closure:28,
  objective:'Примите последние борта и дайте Тимуру 180 секунд на восстановление связи.',
  intro:'Резервный центр считает башню пустой. Тимур восстанавливает канал связи. На каждую проверку борта он временно откладывает ремонт. Дана удерживает поток рейсов до рассвета. Обе полосы работают, но осмотр может временно закрыть одну из них.',
  ending:'Резервный центр: «Северный, кто остался на связи?» Дана: «Двое. Смену сдаём». Тимур кладёт гарнитуру: «Запиши в журнал: кофе числился горячим». За окном светлеет.'}
];
function getEpisode(id){return episodes.find(e=>e.id===Number(id))||episodes[0]}
class Airport{
 constructor(data,options={}){this.episode=getEpisode(options.episode);this.linkProgress=0;this.linkReady=this.episode.id!==3;this.story=[];this.flights=data.map((f,viewSlot)=>({...f,viewSlot,initialFuel:f.fuel,phase:f.kind==='ВЫЛЕТ'?'ready':'holding',progress:0,done:false,checked:false,gate:f.kind==='ВЫЛЕТ'?3:null,runway:null,wait:0,warned:false}));this.runways=[{id:1,closed:false,owner:null},{id:2,closed:true,owner:null}];this.gates=[1,2,3,'ISO'].map(id=>({id,owner:id===3?61:null}));this.reputation=100;this.tower=100;this.losses=0;this.inspection=null;this.time=0;this.failed=null;this.events=[];this.effects=[];this.dynamic=!!options.dynamic;this.seed=options.seed??Math.floor(Math.random()*4294967295);this.randomState=this.seed>>>0;this.schedule=[];this.history=[];this.stage=1;this.target=data.length;this.revision=0;for(const f of this.flights){f.threat=f.risk;f.outcome=f.threat?['explosion','seizure','tower'][f.id%3]:'falseAlarm';f.delayLimit=210;f.urgent=f.kind==='СРОЧНЫЙ'||!!f.urgent;f.gapUntil=0}if(this.episode.id>1){
  this.runways[1].closed=false;
  for(const f of this.flights){f.delayLimit=this.episode.delayLimit;}
  const signal=this.flights.find(f=>f.id===23);
  if(signal){signal.threat=false;signal.risk=true;signal.fuel=44;signal.initialFuel=44;signal.reportedFuel=78;signal.signal='urgent';signal.urgent=true;signal.status='Экипаж просит срочную посадку. Сводка устарела — нужна проверка.';}
 }if(this.dynamic)this.plan()}
 random(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296}
 notify(type,message,id){const event={type,message,id,time:this.time};this.events.push(event);this.history.unshift(event);this.history=this.history.slice(0,12);this.revision++}
 plan(){
  const config=this.episode;
  const ids=[35,56,68,72,84,91,18,29,39,48,57,66,75,89];
  this.target+=config.waves*2;
  for(let wave=0;wave<config.waves;wave++){
   const at=config.firstArrival+wave*config.interval+Math.floor(this.random()*10);
   const special=wave===0?'urgent':wave===1?'suspect':this.random()<.5?'urgent':'suspect';
   for(let n=0;n<2;n++)this.schedule.push({at:at+n*18,type:'arrival',id:ids[wave*2+n],special:n===0?special:'normal'});
  }
  if(config.id===1)this.schedule.push({at:35,type:'open'});
  const closures=config.id===1?[102,192]:config.id===2?[85,165,245]:[70,140,210,280];
  for(const at of closures)this.schedule.push({at:at+Math.floor(this.random()*12),type:'closure'});
  if(config.id===2)this.schedule.push({at:100,type:'story',message:'Тимур: запись эвакуации пришла из архива. Сверяйте новые сообщения с экипажами.'});
  if(config.id===2)this.schedule.push({at:200,type:'story',message:'Тимур: техник подтвердил — неизвестный голос в прологе был его. После сбоя сервер повторил старый приказ эвакуации. Резервный центр принял запись за действующий приказ.'});
  if(config.id===3)this.schedule.push({at:30,type:'story',message:'Тимур: восстанавливаю канал. Проверки бортов временно прерывают работу со связью.'});
  this.schedule.sort((a,b)=>a.at-b.at);
 }
 recordStory(message){this.story.push(message);this.notify('story',message);}
 emergencyServices(){
  const wrecks=this.runways.filter(r=>r.wreck&&!r.recovery);if(!wrecks.length)return {ok:false,message:'Нет полос, ожидающих аварийные службы.'};
  for(const r of wrecks){r.recovery={started:this.time,duration:75};this.notify('recovery',`Полоса ${r.id}: службы выехали. Тушение, эвакуация, расчистка — 75 секунд.`)}return {ok:true,message:'Аварийные службы направлены ко всем повреждённым полосам.'};
 }
 blockRunway(r,codes){r.closed=true;r.closing=false;r.reopenAt=null;r.wreck={time:this.time,codes};r.recovery=null;const backup=this.runways.find(x=>x!==r&&!x.wreck&&x.owner===null);if(backup?.closed){backup.closed=false;backup.closing=false;backup.reopenAt=null;this.notify('runway',`Дана: резервная полоса ${backup.id} открыта досрочно.`)}this.notify('recovery',`Дана: полоса ${r.id} заблокирована обломками. Скажите «вызвать аварийные службы».`)}
 eventsTick(){
  for(const r of this.runways){if(r.recovery&&this.time-r.recovery.started>=r.recovery.duration){r.wreck=null;r.recovery=null;r.closed=false;this.notify('recovery',`Дана: полоса ${r.id} расчищена и открыта.`)}}
  if(!this.dynamic)return;
  for(const g of this.gates)if(g.blockedUntil&&this.time>=g.blockedUntil){g.owner=null;g.blockedUntil=null;this.notify('gate',`Выход ${g.id} освобождён службой безопасности.`)}
  const peakAt=this.episode.id===1?200:this.episode.firstArrival+2*this.episode.interval;
  const stage=this.time>=peakAt?3:this.time>=this.episode.firstArrival?2:1;
  if(stage!==this.stage){this.stage=stage;this.notify('stage',`Нагрузка растёт: этап ${stage}. Новые рейсы на подходе.`)}
  while(this.schedule.length&&this.schedule[0].at<=this.time){const e=this.schedule.shift();
   if(e.type==='arrival'){
    const urgent=e.special==='urgent',risk=e.special==='suspect',fuel=urgent?30+(this.episode.id-1)*3+Math.floor(this.random()*7):58+Math.floor(this.random()*21);
    this.flights.push({viewSlot:this.flights.length,id:e.id,code:`SF ${String(e.id).padStart(3,'0')}`,route:`${['Костанай','Астана','Алматы'][Math.floor(this.random()*3)]} → Северный`,fuel,initialFuel:fuel,kind:urgent?'СРОЧНЫЙ':risk?'ПРОВЕРКА':'ОБЫЧНЫЙ',risk,urgent,threat:risk&&this.random()<.55,outcome:['explosion','seizure','tower'][Math.floor(this.random()*3)],delayLimit:this.episode.delayLimit,status:risk?'Несоответствие данных. Требуется проверка.':urgent?'Срочная посадка: ограниченный запас топлива.':'Запрошена посадка.',phase:'holding',progress:0,done:false,checked:false,gate:null,runway:null,wait:0,warned:false});
    if(this.episode.id>1&&e.id===56){
     const flight=this.flights.at(-1);
     flight.signal='archive';flight.risk=true;flight.threat=false;flight.urgent=true;flight.kind='ПРОВЕРКА';
     flight.status='В эфире аварийный вызов. Сверьте его с экипажем — возможна архивная запись.';
    }
    this.notify(urgent?'urgent':risk?'suspect':'arrival',`Новый рейс ${e.id}. ${urgent?'Срочная посадка, топливо '+fuel+'%.':risk?'Проверьте сведения перед посадкой.':'Запрашивает посадку.'}`,e.id);
   }else if(e.type==='story'){this.recordStory(e.message)}else if(e.type==='open'){if(!this.runways[1].wreck){this.runways[1].closed=false;this.notify('runway','Полоса 2 открыта.')}}
   else if(e.type==='closure'){
    const candidates=this.runways.filter(r=>!r.closed&&!r.closing);if(candidates.length<2)continue;
    const r=candidates[Math.floor(this.random()*candidates.length)];r.closing=true;r.closureDuration=this.episode.closure+Math.floor(this.random()*7);
    this.notify('runway',`Полоса ${r.id}: обнаружен посторонний предмет. ${r.owner?'Закроется после завершения манёвра.':'Временно закрыта.'}`);
   }
  }
  for(const r of this.runways){if(r.closing&&r.owner===null){r.closing=false;r.closed=true;r.reopenAt=this.time+r.closureDuration;this.notify('runway',`Полоса ${r.id} закрыта на ${r.closureDuration} с.`)}if(!r.wreck&&r.reopenAt&&this.time>=r.reopenAt){r.closed=false;r.reopenAt=null;this.notify('runway',`Осмотр завершён. Полоса ${r.id} снова открыта.`)}}
  for(const f of this.flights){if(f.phase==='parked'&&f.releaseAt&&this.time>=f.releaseAt){const g=this.gates.find(g=>g.id===f.gate);if(g?.owner===f.id)g.owner=null;f.gate=null;f.phase='transferred';this.notify('gate',`${f.code}: переведён на дальнюю стоянку. Выход освобождён.`)}}
 }
 get finished(){return this.linkReady&&this.flights.filter(f=>f.done).length===this.target&&this.schedule.every(e=>e.type!=='arrival')&&!this.runways.some(r=>r.wreck)}
 command(id,action,options={}){
  const f=this.flights.find(f=>f.id===id);if(!f||f.done)return {ok:false,message:'Рейс уже обслужен или отсутствует.'};
  if(action==='Проверка'){
   if(f.phase!=='holding')return {ok:false,message:'Проверка доступна в ожидании.'};
   if(f.checked)return {ok:false,message:'Проверка уже завершена.'};
   if(this.inspection)return {ok:false,message:`Тимур занят: проверяет рейс ${this.inspection.id}.`};
   this.inspection={id:f.id,remaining:12};f.checking=true;this.notify('inspection',`Тимур: проверяю рейс ${f.id}. Нужно 12 секунд. Топливо продолжает расходоваться.`,f.id);
   return {ok:true,message:'Поручение передано Тимуру. Дождитесь заключения.'};
  }
  if(action==='Ожидание'){return {ok:f.phase==='holding'||f.phase==='ready',message:f.phase==='holding'?'Ожидание. Топливо продолжает расходоваться.':'Самолёт уже выполняет распоряжение.'}}
  const arrival=action==='Посадка'||action==='Изолированная стоянка';
  if(!arrival&&action!=='Взлёт')return {ok:false,message:'Неизвестное распоряжение.'};
  if(arrival&&f.phase!=='holding'||!arrival&&f.phase!=='ready')return {ok:false,message:'Распоряжение не соответствует состоянию рейса.'};
  const dangerous=arrival&&action==='Посадка'&&f.risk&&(!f.checked||f.threat);
  if(dangerous&&!options.force)return {ok:false,warning:true,message:f.checked?'Угроза подтверждена. Обычная посадка может вызвать инцидент. Уберите руку и подтвердите ОК ещё раз.':'Рейс не проверен. Возможна угроза. Уберите руку и подтвердите ОК ещё раз.'};
  const runway=options.runway?this.runways.find(r=>r.id===options.runway):this.runways.find(r=>!r.closed&&!r.closing&&r.owner===null&&!(r.safeAt>this.time));
  if(runway?.owner!==null&&runway&&!runway.closed&&!runway.closing){if(!options.force)return {ok:false,warning:true,message:'Полоса занята! Повторное ОК разрешит конфликтующее движение.'};const other=this.flights.find(x=>x.id===runway.owner);this.effects.push({type:'collision',runway:runway.id,codes:[f.code,other?.code||'БОРТ'],time:this.time});this.effects=this.effects.slice(-5);this.incident(f,'Столкновение на полосе',40);if(other&&!other.done)this.incident(other,'Столкновение на полосе',25);this.blockRunway(runway,[f.code,other?.code]);return {ok:true,message:'Столкновение. Полоса повреждена, работа продолжается.'}}
  if(runway?.safeAt>this.time){if(!options.force)return {ok:false,warning:true,message:'Безопасный интервал ещё не истёк. Повторное ОК разрешит опасный манёвр.'};this.incident(f,'Нарушение интервала: авария',30);return {ok:true,message:'Авария из-за нарушения интервала.'}}
  if(!runway||runway.closed||runway.closing||runway.owner!==null){const message=options.runway?(runway?.closed?'Выбранная полоса закрыта.':runway?.closing?'Полоса закрывается после текущего манёвра.':'Выбранная полоса занята.'):'Нет доступной полосы: дождитесь освобождения или окончания интервала.';return {ok:false,message};}
  let gate;
  if(arrival){gate=this.gates.find(g=>g.owner===null&&(action==='Изолированная стоянка'?g.id==='ISO':options.gate?g.id===options.gate:g.id!=='ISO'));if(!gate)return {ok:false,message:'Нет свободного подходящего выхода. Оставьте рейс в ожидании.'}}
  runway.owner=id;f.runway=runway.id;f.progress=0;f.approachTime=this.time;f.departureGate=f.gate;
  if(arrival){gate.owner=id;f.gate=gate.id;f.unsafe=action==='Посадка';f.phase='landing'}else f.phase='taxiOut';
  return {ok:true,message:`${f.code}: ${labels[f.phase]}, полоса ${runway.id}${arrival?', выход '+f.gate:''}.`};
 }
 tick(dt){
  if(this.failed||!Number.isFinite(dt)||dt<=0)return;
  // Small steps make phase transitions and fuel independent of frame frequency.
  while(dt>0&&!this.failed){const step=Math.min(dt,.1);dt-=step;this.time+=step;
   if(!this.linkReady&&!this.inspection){
    this.linkProgress=Math.min(180,this.linkProgress+step);
    if(this.linkProgress>=180){this.linkReady=true;this.recordStory('Резервный центр: Северный, слышим вас. Канал восстановлен. Завершайте приём бортов — мы готовим смену.');}
   }
   this.eventsTick();
   if(this.inspection){
    this.inspection.remaining-=step;
    if(this.inspection.remaining<=0){
     const flight=this.flights.find(f=>f.id===this.inspection.id);
     if(flight&&!flight.done){
      flight.checked=true;flight.checking=false;flight.reportedFuel=null;
      flight.status=flight.threat?'ОПАСЕН. Нужна изолированная стоянка.':'БЕЗОПАСЕН. Подозрение не подтвердилось.';
      if(flight.signal==='urgent'){
       flight.status='Срочный запрос настоящий. Топливо '+Math.ceil(flight.fuel)+'%. Посадка безопасна.';
       this.recordStory('Тимур: рейс '+flight.id+' подтвердил срочный запрос. В сводке были старые данные. Топливо '+Math.ceil(flight.fuel)+'% — дайте приоритет посадки.');
      }else if(flight.signal==='archive'){
       flight.urgent=false;flight.kind='ОБЫЧНЫЙ';
       flight.status='Аварийный вызов из архива. Экипаж подтвердил штатный полёт. Обычная посадка.';
       this.recordStory('Тимур: рейс '+flight.id+' в порядке. Аварийный вызов записан вчера. Снимаю срочность.');
      }
      this.notify('checked',`Тимур: рейс ${flight.id} — ${flight.status}`,flight.id);
     }
     this.inspection=null;
    }
   }
   for(const f of this.flights){
    if(f.phase==='holding'){f.wait+=step;f.fuel=Math.max(0,f.fuel-step*(f.urgent?.24:.20)*this.episode.fuelRate);if(f.fuel<=15&&!f.warned){f.warned=true;this.notify('warning',`${f.code}: топливо ${Math.ceil(f.fuel)}%. Нужна приоритетная посадка.`,f.id)}if(f.fuel<=0){this.incident(f,'Топливо исчерпано: аварийное приводнение',40);continue}if(f.wait>=f.delayLimit&&!f.urgent){this.divert(f);continue}}
    else if(['landing','taxiIn','taxiOut','takeoff'].includes(f.phase))f.fuel=Math.max(0,f.fuel-step*.04);
    const duration=durations[f.phase];if(!duration)continue;f.progress+=step/duration;
    if(f.progress+1e-9<1)continue;f.progress=0;
    if(f.phase==='landing'){this.releaseRunway(f);if(f.threat&&f.unsafe){const reason={explosion:'Взрыв у терминала',seizure:'Захват стоянки',tower:'Атака на диспетчерскую'}[f.outcome];if(f.outcome==='tower')this.tower=0;this.incident(f,reason, f.outcome==='seizure'?25:45);if(f.outcome==='explosion'){const r=this.runways.find(r=>r.id===f.runway);this.blockRunway(r,[f.code])}continue}f.phase='taxiIn'}
    else if(f.phase==='taxiIn')f.phase='service';
    else if(f.phase==='service'){f.phase='parked';f.done=true;if(this.dynamic)f.releaseAt=this.time+14;this.events.push({type:'complete',id:f.id,message:`${f.code}: обслуживание завершено, выход ${f.gate}.`})}
    else if(f.phase==='taxiOut'){f.phase='takeoff';this.gates.find(g=>g.id===f.gate).owner=null;f.gate=null}
    else if(f.phase==='takeoff'){f.phase='departed';f.done=true;this.releaseRunway(f);this.events.push({type:'complete',id:f.id,message:`${f.code}: взлёт завершён.`})}
   }
  }
 }
 releaseRunway(f){const r=this.runways.find(r=>r.id===f.runway);if(r?.owner===f.id){r.owner=null;r.safeAt=this.time+5}}
 forecast(){const waiting=this.flights.filter(f=>f.phase==='holding').length,busy=this.runways.filter(r=>r.owner!==null).length;return {load:Math.min(100,Math.round((waiting+busy)/4*100)),seconds:Math.ceil(this.runways.reduce((n,r)=>{const f=this.flights.find(f=>f.id===r.owner);return n+(f?(f.phase==='landing'?12:18)*(1-f.progress):0)},0)+Math.max(0,waiting-1)*12)}}
 divert(f){f.phase='diverted';f.done=true;f.status='Ушёл на запасной из-за задержки';this.reputation=Math.max(0,this.reputation-12);if(this.inspection?.id===f.id)this.inspection=null;this.notify('diverted',`${f.code}: ушёл на запасной. Репутация −12, борт в безопасности.`,f.id);if(this.reputation===0){this.failed=f.id;this.notify('failure','Аэропорт потерял управление.',f.id)}}
 incident(f,reason,cost){
  if(f.done)return;f.phase='lost';f.done=true;f.status=reason;this.losses++;this.reputation=Math.max(0,this.reputation-cost);
  this.releaseRunway(f);const gate=this.gates.find(g=>g.id===f.gate);if(gate?.owner===f.id){gate.owner=null;if(reason==='Захват стоянки'){gate.owner='BLOCKED';gate.blockedUntil=this.time+40}}f.gate=null;
  if(this.inspection?.id===f.id)this.inspection=null;
  this.notify('incident',`${f.code}: ${reason}. Репутация −${cost}.`,f.id);
  if(this.reputation===0||this.tower===0){this.failed=f.id;this.notify('failure','Аэропорт потерял управление.',f.id)}
 }
 drain(){return this.events.splice(0)}
}
labels.lost='Потерян';labels.diverted='Ушёл на запасной';labels.transferred='На дальней стоянке';
if(typeof module!=='undefined')module.exports={Airport,labels,episodes,getEpisode};root.SkyflowSimulation={Airport,labels,episodes,getEpisode};
})(typeof window==='undefined'?globalThis:window);
