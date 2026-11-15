(function(root){
'use strict';
const Sim=typeof module!=='undefined'?require('./simulation.js'):root.SkyflowSimulation;
const Traffic=typeof module!=='undefined'?require('./episode-two.js').EpisodeTwoAirport:root.SkyflowEpisodeTwo.EpisodeTwoAirport;
// Reuse inspections, evidence, replayed permits and continuous go-arounds from chapter 2.
class EpisodeThreeAirport extends Traffic {
 constructor(options={}){
  super(options);
  const initial=new Sim.Airport([
   {id:64,code:'AK 064',route:'Срочный медицинский рейс',fuel:42,kind:'СРОЧНЫЙ'},
   {id:35,code:'SF 035',route:'Северный → Алматы',fuel:90,kind:'ВЫЛЕТ'}
  ]);
  this.flights=initial.flights;this.runways=initial.runways;this.gates=initial.gates;
  this.target=16;this.schedule=[];this.wave=1;this.storyPending='briefing';this.storyRead=[];
  this.doorChoice=null;this.cameraViewed=false;this.archiveOriginal=false;this.backupSaved=false;this.backupDecision=null;
  this.transmission={state:'not-started',remaining:36};this.runwayPreparation=null;this.radioSwitch=null;
 }
 get finished(){return this.storyRead.includes('finale')&&this.flights.length===this.target&&this.flights.every(f=>f.done)&&!this.failed}
 viewArchiveCamera(){if(this.storyPending!=='archive-door')return false;this.cameraViewed=true;return true}
 chooseDoor(door){
  if(this.storyPending!=='archive-door'||!this.cameraViewed||!['a','b'].includes(door)||this.doorChoice)return false;
  this.doorChoice=door;this.archiveOriginal=door==='b';return true;
 }
 chooseBackup(save){
  if(this.storyPending!=='archive-record')return false;
  if(typeof save!=='boolean')return false;this.backupSaved=save;this.backupDecision=save;return true;
 }
 acknowledgeStory(id){
  if(id!==this.storyPending)return false;
  if(id==='archive-door'&&!this.doorChoice)return false;
  if(id==='archive-record'&&this.backupDecision===null)return false;
  this.storyRead.push(id);this.storyPending=null;
  if(id==='briefing')this.schedule=[{at:this.time+18,type:'open'},...this.waveSchedule([[10,67,'early'],[20,69,'normal'],[24,43,'forged']])].sort((a,b)=>a.at-b.at);
  else if(id==='archive-door'){
   this.wave=2;this.schedule=this.waveSchedule([[0,56,'hydraulic'],[8,76,'departure'],[12,72,'urgent'],[18,74,'early'],[24,78,'clerical'],[38,84,'impostor']]);
  }else if(id==='archive-record'){
   this.wave=3;this.transmission.state='sending';
   this.schedule=this.waveSchedule([[0,91,'radio'],[6,93,'normal'],[10,86,'replay'],[18,98,'early'],[24,96,'departure']]);
  }
  this.notify('stage',id==='finale'?'Смена закончена.':`Этап ${this.wave} из 3. Продолжайте работу с рейсами.`);
  return true;
 }
 checkWave(){
  if(this.storyPending||this.failed||this.storyRead.includes('finale'))return;
  if(this.schedule.some(e=>['caseArrival','forgeRetry'].includes(e.type))||this.flights.some(f=>!f.done))return;
  if(this.runways.some(r=>r.owner!==null||r.intruder||r.wreck||r.safeAt>this.time))return;
  if(this.wave===3){
   if(this.transmission.state==='paused'){
    this.transmission.state='sending';this.notify('archive','Все рейсы выведены. Передача сохранённой копии автоматически возобновлена.');return;
   }
   if(this.transmission.state==='sending')return;
  }
  this.storyPending=this.wave===1?'archive-door':this.wave===2?'archive-record':'finale';
  this.notify('story','Поток разобран. Важный разговор — на паузе.');
 }
 spawnCase(e){
  if(e.caseType==='departure'&&!this.gates.some(g=>g.id!=='ISO'&&g.owner===null)){
   this.schedule.push({...e,at:this.time+1});this.schedule.sort((a,b)=>a.at-b.at);return;
  }
  super.spawnCase(e);
  const f=this.flights.find(f=>f.id===e.id);
  if(e.caseType==='hydraulic'){
   f.requiredRunway=1;f.safetyReady=false;f.status='Неисправность шасси. Нужна длинная полоса 1 и подготовка аварийной команды (10 с).';
  }else if(e.caseType==='radio'){
   f.fuel=26;f.initialFuel=26;f.urgent=true;f.kind='СРОЧНЫЙ';f.holdingBurn=.30;f.radioBlocked=true;
   f.status='Основную частоту глушит помеха. Посадку можно подтвердить только по резервной частоте. Её сейчас занимает передача архива.';
  }
  if(['hydraulic','radio','departure'].includes(e.caseType))this.notify(e.caseType==='radio'?'urgent':'arrival',`${f.code}: ${f.status}`,f.id);
 }
 releaseArchiveChannel(options={}){
  if(this.storyPending)return {ok:false,message:'Сейчас разговор на паузе.'};
  if(this.transmission.state!=='sending')return {ok:false,message:'Передача архива сейчас не занимает резервный канал.'};
  if(!this.backupSaved&&!options.force)return {ok:false,warning:true,message:'Резервной копии нет. Прерывание передачи потеряет запись. Повторное ОК — освободить канал для самолёта ценой доказательств.'};
  this.transmission.state=this.backupSaved?'paused':'lost';
  const message=this.backupSaved?'Канал освобождён. Копия сохранена; передача возобновится после обслуживания рейсов.':'Канал освобождён, но запись потеряна. Останутся показания Леры и Тимура.';
  this.notify('archive',message);return {ok:true,message};
 }
 command(id,action,options={}){
  const f=this.flights.find(f=>f.id===id);
  if(!f||f.done)return {ok:false,message:'Рейс уже завершён или отсутствует.'};
  if(this.storyPending)return {ok:false,message:'Смена на паузе. Дочитайте разговор.'};
  if(action==='Подготовить полосу'){
   if(f.caseType!=='hydraulic'||f.phase!=='holding')return {ok:false,message:'Для этого рейса специальная подготовка полосы не требуется.'};
   if(f.safetyReady)return {ok:false,message:'Аварийная команда уже готова на полосе 1.'};
   if(this.runwayPreparation)return {ok:false,message:'Подготовка уже идёт. Нужно 10 секунд.'};
   const r=this.runways[0];
   if(r.closed||r.closing||r.wreck||r.owner!==null||r.safeAt>this.time)return {ok:false,message:'Сначала дождитесь освобождения полосы 1 и окончания безопасного интервала.'};
   r.closed=true;r.reopenAt=this.time+10;this.runwayPreparation={id,remaining:10};
   this.notify('runway','Полоса 1 закрыта на 10 с для подготовки аварийной команды.',id);return {ok:true,message:'Готовим полосу 1. Остальные борта могут использовать полосу 2.'};
  }
  if(action==='Резервная частота'){
   if(!f.radioBlocked||f.phase!=='holding')return {ok:false,message:'Резервная связь для этого борта уже работает или не требуется.'};
   if(this.transmission.state==='sending')return {ok:false,message:'Резервный канал занят архивом. Дождитесь передачи или скажите «освободить канал».'};
   if(this.radioSwitch)return {ok:false,message:'Настройка резервной частоты уже идёт.'};
   this.radioSwitch={id,remaining:6};this.notify('radio',`${f.code}: настраиваем резервную частоту. 6 секунд.`,id);return {ok:true,message:'Ждите подтверждения связи, затем дайте посадку.'};
  }
  const landing=['Посадка','Изолированная стоянка'].includes(action);
  let badEmergencyLanding=false;
  if(landing&&f.radioBlocked)return {ok:false,message:'Экипаж не слышит основную частоту. Сначала восстановите резервную связь.'};
  if(landing&&f.requiredRunway&&f.phase==='holding'){
   const r=options.runway?this.runways.find(r=>r.id===options.runway):this.runways.find(r=>!r.closed&&!r.closing&&r.owner===null&&!(r.safeAt>this.time));
   if(!r||r.closed||r.closing||r.owner!==null||r.safeAt>this.time)return {ok:false,message:'Нужная полоса пока недоступна. Ждите освобождения подготовленной полосы 1.'};
   if(!f.safetyReady||r.id!==1){
    if(!options.force)return {ok:false,warning:true,message:'У рейса отказ шасси. Нужны подготовленная полоса 1 и аварийная команда. Повторное ОК — посадка с риском аварии.'};
    badEmergencyLanding=true;
   }
  }
  const result=super.command(id,action,options);
  if(result.ok&&landing&&f.phase==='landing')f.badEmergencyLanding=badEmergencyLanding;
  return result;
 }
 tick(dt){
  if(!Number.isFinite(dt)||dt<=0||this.storyPending||this.failed)return;
  while(dt>1e-9&&!this.storyPending&&!this.failed){const step=Math.min(dt,.1);dt-=step;
   const inspection=this.inspection?.id;super.tick(step);
   if(this.failed)break;
   if(inspection&&!this.inspection){const f=this.flights.find(f=>f.id===inspection);if(f&&!f.done){
    if(f.caseType==='hydraulic')f.documentClue='Неисправность шасси подтверждена. Только полоса 1 с аварийной командой.';
    if(f.caseType==='radio')f.documentClue='Борт и маршрут подтверждены. Помеха только на основной частоте.';
   }}
   if(this.runwayPreparation){this.runwayPreparation.remaining-=step;if(this.runwayPreparation.remaining<=1e-8){const f=this.flights.find(f=>f.id===this.runwayPreparation.id);this.runwayPreparation=null;if(f&&!f.done){f.safetyReady=true;f.status='Аварийная команда готова. Направьте борт на полосу 1.';this.notify('runway',`${f.code}: ${f.status}`,f.id)}}}
   if(this.radioSwitch){this.radioSwitch.remaining-=step;if(this.radioSwitch.remaining<=1e-8){const f=this.flights.find(f=>f.id===this.radioSwitch.id);this.radioSwitch=null;if(f&&!f.done){f.radioBlocked=false;f.status='Экипаж подтвердил связь по резервной частоте. Можно давать посадку.';this.notify('radio',`${f.code}: ${f.status}`,f.id)}}}
   for(const f of this.flights)if(f.badEmergencyLanding&&f.phase==='taxiIn'&&!f.done){
    f.badEmergencyLanding=false;const r=this.runways.find(r=>r.id===f.runway);this.incident(f,'Авария при посадке: шасси не выдержало без безопасной подготовки',35);this.blockRunway(r,[f.code]);
   }
   if(this.transmission.state==='sending'){this.transmission.remaining=Math.max(0,this.transmission.remaining-step);if(this.transmission.remaining<1e-8){this.transmission.state='sent';this.notify('archive','Внешний центр подтвердил получение записи.')}}
   this.checkWave();
  }
 }
}
if(typeof module!=='undefined')module.exports={EpisodeThreeAirport};root.SkyflowEpisodeThree={EpisodeThreeAirport};
})(typeof window==='undefined'?globalThis:window);
