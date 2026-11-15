(function(root){
'use strict';
const Base=typeof module!=='undefined'?require('./simulation.js').Airport:root.SkyflowSimulation.Airport;
// Fixed clues and threats make the mystery learnable; traffic still competes for resources.
class EpisodeTwoAirport extends Base {
 constructor(options={}){
  super([
   {id:404,code:'404',route:'Отдельный сектор ожидания',fuel:96,risk:true,threat:false,caseType:'witness',holdingBurn:.035},
   {id:39,code:'AK 039',route:'Медицинский рейс',fuel:42,kind:'СРОЧНЫЙ'},
   {id:42,code:'ЭХО 42',route:'Передаёт позывной 404',fuel:100,risk:true,threat:false,caseType:'phantom'}
  ],{...options,dynamic:true});
  this.target=14;this.resolvedSignals=0;this.prevented=0;this.revokedPermits=0;this.camera=null;this.permitLog=[];this.unnecessaryGoArounds=0;
  this.wave=1;this.storyPending=null;this.storyRead=[];this.finalReady=false;
  const witness=this.flights[0];witness.delayLimit=Infinity;witness.status=this.finalLockReason();
  this.schedule=[{at:20,type:'open'},...this.waveSchedule([[18,35,'falseUrgent'],[24,73,'urgent'],[32,57,'early']])].sort((a,b)=>a.at-b.at);
 }
 trafficStage(){return this.wave}
 waveSchedule(entries){return entries.map(([after,id,caseType])=>({at:this.time+after,type:'caseArrival',id,caseType}))}
 finalLockReason(){return this.finalReady?'404 подтверждён. Коридор свободен: разрешите последнюю посадку.':'404 ждёт в отдельном секторе на экономичном режиме. Посадка после трёх волн и подтверждения Тимура.'}
 get finished(){return this.finalReady&&super.finished}
 checkWave(){
  if(this.finalReady||this.storyPending||this.failed)return;
  if(this.schedule.some(e=>['caseArrival','forgeRetry'].includes(e.type)))return;
  if(this.flights.some(f=>f.id!==404&&!f.done))return;
  if(this.runways.some(r=>r.owner!==null||r.intruder||r.wreck||r.safeAt>this.time))return;
  this.storyPending=this.wave===3?'final-approach':'wave-'+this.wave;
  this.notify('story','Поток разобран. Есть время поговорить.',404);
 }
 acknowledgeStory(id){
  if(id!==this.storyPending)return false;
  this.storyRead.push(id);this.storyPending=null;
  if(id==='final-approach'){
   this.finalReady=true;const f=this.flights.find(f=>f.id===404);
   f.checked=true;f.cameraChecked=true;f.risk=false;f.documentClue='Тимур подтвердил маршрут по независимому каналу. Посторонних бортов в коридоре нет.';f.cameraClue='404 один в секторе. Визуальное сопровождение установлено.';f.status=this.finalLockReason();
   this.notify('signal',f.status,404);
  }else{
   this.wave++;
   const entries=this.wave===2?[[0,68,'clerical'],[6,62,'departure'],[12,86,'normal'],[24,56,'replay']]:[[0,81,'impostor'],[14,91,'urgent'],[20,88,'early'],[30,95,'forged']];
   this.schedule.push(...this.waveSchedule(entries));this.schedule.sort((a,b)=>a.at-b.at);
   this.notify('stage',`Волна ${this.wave} из 3. Новый поток на подходе.`);
  }
  return true;
 }
 eventsTick(){
  // Consume our events before the base queue; other event types keep their normal behavior.
  const due=this.schedule.filter(e=>e.at<=this.time&&['caseArrival','forgeRetry'].includes(e.type));
  this.schedule=this.schedule.filter(e=>!due.includes(e));
  for(const e of due){if(e.type==='caseArrival')this.spawnCase(e);else{const f=this.flights.find(f=>f.id===e.id);if(f&&!f.done&&f.phase==='holding')this.forgeClearance(f)}}
  super.eventsTick();
  for(const r of this.runways)if(r.signalUntil&&this.time>=r.signalUntil){r.signalUntil=null;r.owner=null;this.notify('runway',`Полоса ${r.id}: ложное резервирование снято.`)}
  for(const g of this.gates)if(g.signalUntil&&this.time>=g.signalUntil){g.signalUntil=null;g.owner=null}
 }
 spawnCase(e){
  if(e.caseType==='departure'&&!this.gates.some(g=>g.id!=='ISO'&&g.owner===null)){
   this.schedule.push({...e,at:this.time+1});this.schedule.sort((a,b)=>a.at-b.at);return;
  }
  const urgent=e.caseType==='urgent',risk=['falseUrgent','clerical','impostor'].includes(e.caseType);
  const fuel=urgent?34:e.caseType==='falseUrgent'?65:e.caseType==='early'?62:56;
  const f={id:e.id,code:`SF ${String(e.id).padStart(3,'0')}`,viewSlot:this.flights.length,route:e.caseType==='impostor'?'Заявлен рейс из Алматы':'Астана → Северный',fuel,initialFuel:fuel,phase:'holding',kind:urgent?'СРОЧНЫЙ':risk?'ПРОВЕРКА':'ОБЫЧНЫЙ',risk,urgent,threat:e.caseType==='impostor',outcome:'explosion',caseType:e.caseType,claimedEmergency:e.caseType==='falseUrgent',delayLimit:210,wait:0,progress:0,done:false,checked:false,gate:null,runway:null,status:e.caseType==='falseUrgent'?'Экипаж заявляет 8% топлива. Телеметрия ещё не сверена.':risk?'Есть расхождения. Сопоставьте документы и камеру.':'Запрошена посадка.'};
  this.flights.push(f);this.notify(urgent?'urgent':risk?'suspect':'arrival',`${f.code}: ${f.status}`,f.id);
  if(e.caseType==='departure'){
   const gate=this.gates.find(g=>g.id!=='ISO'&&g.owner===null);gate.owner=f.id;f.gate=gate.id;f.phase='ready';f.kind='ВЫЛЕТ';f.fuel=90;f.initialFuel=90;f.route='Северный → Астана';f.status='Готов к вылету. Посадки и вылеты используют одни и те же полосы.';
  }
  if(e.caseType==='early'){
   f.externalClearance=true;f.earlyQueued=true;f.documentClue='Изменение расписания подтверждено независимым центром. Борт прибыл на 8 минут раньше.';
   f.journalClue='Действующее разрешение текущей смены, подпись соседнего сектора подтверждена.';
   f.status='Ранний рейс подтверждён. Ожидает свободную полосу и стоянку для согласованного захода.';this.startEarlyApproach(f);
  }
  if(e.caseType==='clerical'){f.status='Входящее сообщение требует изоляции. Подписи службы безопасности нет. Проверьте документы: это может быть ложный донос.';this.notify('suspect',`${f.code}: ${f.status}`,f.id)}
  if(e.caseType==='replay'){
   f.replayPending=true;f.replayDeadline=this.time+48;f.status='Экипаж получил пакет разрешения с отметкой «ПРЕДЫДУЩАЯ СМЕНА» и ждёт 48 с. Сверьте журнал, затем отмените старое разрешение.';
   this.notify('replay',`${f.code}: ${f.status}`,f.id);
  }
  if(e.caseType==='forged'){f.forgeryQueued=true;this.forgeClearance(f)}
 }
 startEarlyApproach(f){
  const runway=this.runways.find(r=>!r.closed&&!r.closing&&!r.wreck&&!r.intruder&&r.owner===null&&!(r.safeAt>this.time));
  const gate=this.gates.find(g=>g.id!=='ISO'&&g.owner===null);
  if(!runway||!gate)return false;
  runway.owner=f.id;gate.owner=f.id;f.runway=runway.id;f.gate=gate.id;f.phase='unauthorized';f.progress=0;f.approachTime=this.time;f.earlyQueued=false;f.earlyApproach=true;
  f.status=`Ранний заход подтверждён. Полоса ${runway.id} свободна для этого борта, выход ${gate.id} зарезервирован. Можно принять заход; ненужный второй круг −4 репутации.`;
  this.notify('early',`Дана: ${f.code} раньше на восемь минут. Изменение подтвердили, полоса ${runway.id} свободна для него. Можем принимать.`,f.id);return true;
 }
 earlyApproachSafe(f){
  const runway=this.runways.find(r=>r.id===f.runway),gate=this.gates.find(g=>g.id===f.gate);
  return !!(runway&&!runway.closed&&!runway.closing&&!runway.wreck&&!runway.intruder&&runway.owner===f.id&&!(runway.safeAt>this.time)&&gate?.owner===f.id);
 }
 forgeClearance(f){
  const r=this.runways[1];
  // A maintenance vehicle enters only once legitimate traffic has cleared the runway.
  if(r.owner!==null){f.status='Экипаж получил чужую команду и ожидает захода. Следите за предупреждением: может понадобиться второй круг.';this.schedule.push({at:this.time+1,type:'forgeRetry',id:f.id});this.schedule.sort((a,b)=>a.at-b.at);return}
  r.closed=true;r.closing=false;r.reopenAt=this.time+55;r.intruder=f.id;
  f.phase='unauthorized';f.runway=r.id;f.approachTime=this.time;f.progress=0;f.forged=true;f.forgeryQueued=false;f.replayPending=false;
  f.status='В эфире звучит голос Даны. Подписи оператора в журнале нет. Полоса 2 закрыта: на ней техника.';
  this.notify('forged',`${f.code} получил ${f.caseType==='replay'?'старое':'чужое'} разрешение! До касания 28 с. Полоса 2 закрыта. «Рейс ${f.id}, второй круг» → 👌.`,f.id);
 }
 command(id,action,options={}){
  const f=this.flights.find(f=>f.id===id);
  if(!f||f.done)return {ok:false,message:'Рейс уже завершён или отсутствует.'};
  if(this.storyPending)return {ok:false,message:'Разговор на паузе. Сначала дочитайте сообщение.'};
  if(action==='Принять заход'||(action==='Посадка'&&f.earlyApproach&&f.phase==='unauthorized')){
   if(!f.earlyApproach||f.phase!=='unauthorized')return {ok:false,message:'Подтверждённого раннего захода у этого борта нет. Сверьте журнал и состояние полосы.'};
   if(!this.earlyApproachSafe(f))return {ok:false,message:'Разрешение настоящее, но полоса или выход сейчас недоступны. Нужен второй круг; штрафа за безопасность не будет.'};
   if(f.earlyAccepted)return {ok:false,message:'Заход уже принят. Борт продолжает посадку.'};
   f.earlyAccepted=true;f.status=`Ранний заход принят. Посадка на полосу ${f.runway}.`;this.notify('signal',`${f.code}: ${f.status}`,f.id);return {ok:true,message:f.status};
  }
  if(id===404){
   if(['Снять отметку','Изолированная стоянка'].includes(action))return {ok:false,message:'404 — отдельный подтверждаемый контакт. Его нужно сохранить до финальной посадки.'};
   if(action==='Посадка'&&!this.finalReady)return {ok:false,message:this.finalLockReason()};
  }
  if(action==='Камера'){
   if(!['holding','unauthorized'].includes(f.phase))return {ok:false,message:'Камера подхода доступна для борта в воздухе.'};
   if(this.camera)return {ok:false,message:`Камера уже наводится на рейс ${this.camera.id}.`};
   this.camera={id,remaining:4};this.notify('camera',`Тимур: навожу камеру на ${f.code}. 4 секунды.`,id);
   return {ok:true,message:'Камера проверяет указанный сектор. Результат появится в карточке.'};
  }
  if(action==='Сверить журнал'){
   f.journalSeen=true;this.revision++;
   f.journalClue=f.forged?'Разрешения этой смены нет. Немедленно отдайте «второй круг».':f.replayPending?'Пакет из предыдущей смены. Номер полосы тот же, но время и смена не совпадают. Нового разрешения Даны нет. Отмените старое разрешение.':f.earlyApproach?'Действующее разрешение текущей смены. Подпись соседнего сектора подтверждена. Проверьте доступность полосы.':this.permitLog.some(p=>p.id===id)?'Разрешение этой смены подписано вами.':'Вашего разрешения на посадку в журнале нет.';
   return {ok:true,message:'ЖУРНАЛ: '+f.journalClue};
  }
  if(action==='Отменить разрешение'){
   if(f.phase==='unauthorized')return {ok:false,message:'Борт уже на заходе. Сейчас нужен «второй круг».'};
   if(!f.replayPending)return {ok:false,message:'Старого разрешения, ожидающего отмены, нет.'};
   if(!f.journalSeen)return {ok:false,message:'Сначала сверьте журнал: нужно установить, какой пакет отменяем.'};
   f.replayPending=false;f.permitRevoked=true;this.revokedPermits++;f.journalClue='Старое разрешение отменено. Новый заход — по вашей команде.';f.status=f.journalClue;this.notify('signal',`${f.code}: ${f.status}`,id);return {ok:true,message:f.status};
  }
  if(['Посадка','Изолированная стоянка'].includes(action)&&f.forgeryQueued)return {ok:false,message:'Экипаж получил противоречащие команды. Следите за предупреждением о заходе.'};
  if(['Посадка','Изолированная стоянка'].includes(action)&&f.replayPending){
   if(!options.force)return {ok:false,warning:true,message:'Экипаж использует старый пакет. Сверьте журнал и отмените разрешение. Повторное ОК — довериться старому пакету: борт пойдёт на закрытую полосу.'};
   f.replayPending=false;f.forgeryQueued=true;this.forgeClearance(f);return {ok:true,message:'Старый пакет принят. Отмените опасный заход командой «второй круг»!'};
  }
  if(action==='Снять отметку'){
   if(f.phase!=='holding')return {ok:false,message:'Снимать отметку можно только в ожидании. Для заходящего борта — второй круг.'};
   if(!f.cameraChecked&&!options.force)return {ok:false,warning:true,message:'Камера ещё не проверена. Можно потерять настоящий борт. Повторное ОК — снять отметку.'};
   if(f.caseType==='phantom'){f.done=true;f.phase='dismissed';this.resolvedSignals++;this.notify('signal','ЭХО 42 удалено. Настоящий борт 404 остаётся на подходе.',id)}
   else{this.divert(f);this.reputation=Math.max(0,this.reputation-6);this.notify('warning',`${f.code}: вы сняли реальный борт; он уходит на запасной. Всего −18 репутации.`,id);if(this.reputation===0)this.failed=id}
   return {ok:true,message:f.caseType==='phantom'?'Ложная отметка снята.':'Настоящий самолёт потерял диспетчерское сопровождение и ушёл на запасной.'};
  }
  if(action==='Отказать в приоритете'){
   if(f.caseType!=='falseUrgent'||f.priorityDenied)return {ok:false,message:'У этого рейса нет неподтверждённого запроса приоритета.'};
   if(!f.checked)return {ok:false,message:'Сначала поручите Тимуру сверить аварийный запрос: «проверка».'};
   f.priorityDenied=true;f.claimedEmergency=false;f.status='Ложная срочность отклонена. Борт обслуживается в общей очереди.';this.notify('signal',f.status,id);return {ok:true,message:f.status};
  }
  if(f.caseType==='phantom'&&['Посадка','Изолированная стоянка'].includes(action)){
   if(!options.force)return {ok:false,warning:true,message:'У отметки нет независимого подтверждения. Камера позволяет проверить сектор. Повторное ОК — резервировать полосу на свой риск.'};
   const r=this.runways.find(r=>!r.closed&&!r.closing&&r.owner===null&&!(r.safeAt>this.time));
   const g=this.gates.find(g=>g.owner===null&&(action==='Изолированная стоянка'?g.id==='ISO':g.id!=='ISO'));
   if(!r||!g)return {ok:false,message:'Нет свободных ресурсов для резервирования.'};
   r.owner='SIGNAL';r.signalUntil=this.time+25;g.owner='SIGNAL';g.signalUntil=this.time+25;
   f.done=true;f.phase='dismissed';this.reputation=Math.max(0,this.reputation-12);this.resolvedSignals++;
   this.notify('warning','Посадку получил фантом. Полоса и выход потеряны на 25 секунд. Репутация −12.',id);if(this.reputation===0)this.failed=id;
   return {ok:true,message:'Самолёта нет: ложный сигнал занял ресурсы аэропорта.'};
  }
  const unnecessary=action==='Второй круг'&&f.phase==='unauthorized'&&f.earlyApproach&&this.earlyApproachSafe(f)&&!f.earlyPenaltyApplied;
  const result=super.command(id,action,options);
  if(result.ok&&action==='Второй круг'&&f.earlyApproach){
   f.earlyApproach=false;f.journalClue='Ранний заход отменён. После возврата нужно новое разрешение.';
   if(unnecessary){f.earlyPenaltyApplied=true;this.unnecessaryGoArounds++;this.reputation=Math.max(0,this.reputation-4);this.notify('unnecessary',`${f.code}: безопасный подтверждённый заход отменён без причины. Репутация −4; второй круг расходует топливо и возвращает борт в очередь.`,id);if(this.reputation===0)this.failed=id}
   else this.notify('signal',`${f.code}: второй круг ради безопасности. Штрафа нет.`,id);
  }
  if(result.ok&&['landing','taxiOut'].includes(f.phase))f.status=result.message;
  if(result.ok&&action==='Второй круг'&&f.forged){f.forged=false;f.journalClue='Чужое разрешение отменено вторым кругом. Ждите возврата и дайте новое разрешение.';this.prevented++;this.notify('signal',`${f.code}: чужое разрешение отменено. Повторный заход — только по вашей команде.`,id)}
  if(result.ok&&['Посадка','Изолированная стоянка'].includes(action)){
   this.permitLog.push({id,action,time:this.time});
   f.journalClue='Текущее разрешение подписано вами в этой смене.';
   if(action==='Изолированная стоянка'&&!f.threat){this.reputation=Math.max(0,this.reputation-8);this.notify('warning',`${f.code}: безопасный борт изолирован. Репутация −8.`,id);if(this.reputation===0)this.failed=id}
  }
  return result;
 }
 tick(dt){
  if(!Number.isFinite(dt)||dt<=0||this.failed||this.storyPending)return;
  while(dt>1e-9&&!this.failed&&!this.storyPending){const step=Math.min(dt,.1);dt-=step;

   const inspection=this.inspection?.id;super.tick(step);
   if(inspection&&!this.inspection){const f=this.flights.find(f=>f.id===inspection);if(f&&!f.done){
    const clues={phantom:'Позывной совпадает с 404, но второго плана полёта нет. Проверьте сектор камерой.',witness:this.finalLockReason(),falseUrgent:'Телеметрия: запас более 60% на момент вызова. Аварийного кода нет. Заявленные 8% не подтверждены. Реальный срочный рейс 73 подтверждён.',clerical:'Код ответчика и маршрут совпадают. Требование изоляции не подписано службой безопасности. Борт безопасен: нужна обычная посадка.',impostor:'Код ответчика принадлежит борту на земле в другом аэропорту. Документы подменены; нужна изоляция.'};
    f.documentClue=clues[f.caseType]||'План полёта и код ответчика совпадают.';f.status=f.documentClue;
    this.events=this.events.filter(e=>!(e.type==='checked'&&e.id===f.id));this.notify('checked',`Тимур: ${f.code}. ${f.documentClue}`,f.id);
   }}
   if(this.camera){this.camera.remaining-=step;if(this.camera.remaining<=0){const f=this.flights.find(f=>f.id===this.camera.id);this.camera=null;if(f&&!f.done){f.cameraChecked=true;f.cameraClue=f.caseType==='phantom'?'В секторе ЭХО 42 нет самолёта. Реальный 404 виден отдельно.':f.caseType==='impostor'?'На борту другая окраска и регистрация, чем в заявке.':`Самолёт ${f.code} виден в назначенном секторе.`;this.notify('camera',f.cameraClue,f.id)}}}
   for(const f of this.flights){
    if(f.earlyQueued&&!f.done&&f.phase==='holding')this.startEarlyApproach(f);
    if(f.replayPending&&!f.done&&this.time>=f.replayDeadline){f.replayPending=false;f.forgeryQueued=true;this.forgeClearance(f)}
    if(f.caseType==='phantom'&&!f.done){f.fuel=100;if(f.wait>=170){f.done=true;f.phase='dismissed';this.resolvedSignals++;this.reputation=Math.max(0,this.reputation-8);this.notify('warning','Фантом исчез сам. Помеха не расследована: −8 репутации.',f.id);if(this.reputation===0)this.failed=f.id}}
    if(f.phase==='unauthorized'){
     f.progress+=step/28;f.fuel=Math.max(0,f.fuel-step*.2);
     if(f.fuel<=0)this.incident(f,'Топливо исчерпано на заходе',40);
     else if(f.progress+1e-9>=1){
      if(f.earlyApproach&&this.earlyApproachSafe(f)){this.releaseRunway(f);f.earlyApproach=false;f.phase='taxiIn';f.progress=0;f.status='Ранний рейс сел безопасно. Руление к выходу.';this.notify('early-landed',`${f.code}: ранний заход завершён, полоса освобождена.`,f.id)}
      else {const r=this.runways.find(r=>r.id===f.runway),other=this.flights.find(x=>x.id===r.owner&&x.id!==f.id);this.effects.push({type:'collision',runway:r.id,codes:[f.code,'ПРЕПЯТСТВИЕ'],time:this.time});this.incident(f,'Столкновение: опасный заход не отменён',60);if(other&&!other.done)this.incident(other,'Столкновение на полосе',40);this.blockRunway(r,[f.code,'ПРЕПЯТСТВИЕ']);this.failed=f.id;this.notify('failure','Опасный заход привёл к катастрофе. Смена прервана.',f.id)}
     }
    }
    if(f.phase==='parked'&&f.gate==='ISO'&&!f.securityHold){f.securityHold=true;f.releaseAt=this.time+42;this.notify('gate',`${f.code}: изолированная стоянка занята службой безопасности ещё 42 с.`,f.id)}
    if(f.id===404&&f.done&&f.phase==='lost')this.failed=404;
   }
   this.checkWave();
  }
 }
}
if(typeof module!=='undefined')module.exports={EpisodeTwoAirport};root.SkyflowEpisodeTwo={EpisodeTwoAirport};
})(typeof window==='undefined'?globalThis:window);
