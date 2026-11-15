(function(root){
'use strict';
function parse(text){
 const s=text.toLowerCase().replace(/ё/g,'е').replace(/рейс(?=\d)/g,'рейс ').replace(/борт(?=\d)/g,'борт ').replace(/[^а-яa-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 if(/(?:^| )(?:не|нет)(?: |$)/.test(s))return {error:'Отрицательная фраза не выполняется. Скажите «отмена» или отдайте точную команду.'};
 if(/^(?:башня )?(?:вызвать аварийные службы|аварийные службы|вызвать спасателей)$/.test(s))return {type:'emergency'};
 if(/^(?:башня )?(?:(?:передать|передай|отправить|отправь) (?:часть )?)?архив(?:а)?$/.test(s))return {type:'archive'};
 const archivePhrase=s.replace(/^(?:башня )?(?:передать|отправить) /,'').replace(/^башня /,'');
 const packet=/^показани[ея](?: свидетел[яей]+)?$/.test(archivePhrase)?'witness':
  /^(?:приказ|приказ 404)$/.test(archivePhrase)?'order':
  /^(?:запись|запись переговоров)$/.test(archivePhrase)?'radio':null;
 if(packet)return {type:'archive',packet};
 if(/^(?:покажи |открой )?камер[ау] подхода$/.test(s))return {type:'approach-camera'};
 const storyAction={'сверить журнал':'clearance-review','отменить ложную команду':'clearance-cancel','довериться эфиру':'clearance-trust','запись аварии':'old-record','открыть запись аварии':'old-record','камера архива':'archive-camera','сохранить копию':'save-copy','передать без копии':'without-copy','освободить канал':'release-channel','открыть дверь а':'door-a','открыть дверь б':'door-b','вернуть канал самолету':'flight-channel','передать запись сейчас':'archive-channel'}[s];
 if(storyAction)return {type:'story-action',action:storyAction};
 const location={'осмотреть архив':'archive','осмотреть радиорубку':'radio','осмотреть радиорубка':'radio','осмотреть коридор':'corridor','запустили кассету':'time-tape','открыли канал':'time-channel','орлов ответил':'time-reply'}[s];
 if(location)return {type:'search',location};
 const resources={'первая полоса':{runway:1},'полоса один':{runway:1},'вторая полоса':{runway:2},'полоса два':{runway:2},'первый выход':{gate:1},'выход один':{gate:1},'второй выход':{gate:2},'выход два':{gate:2},'третий выход':{gate:3},'выход три':{gate:3},'автоматический выбор':{runway:null,gate:null}};
 if(resources[s])return {type:'resource',...resources[s]};
 const units={'один':1,'два':2,'три':3,'четыре':4,'пять':5,'шесть':6,'семь':7,'восемь':8,'девять':9,'десять':10,'одиннадцать':11,'двенадцать':12,'тринадцать':13,'четырнадцать':14,'пятнадцать':15,'шестнадцать':16,'семнадцать':17,'восемнадцать':18,'девятнадцать':19,'двадцать':20,'тридцать':30,'сорок':40,'пятьдесят':50,'шестьдесят':60,'семьдесят':70,'восемьдесят':80,'девяносто':90};
 const aliases={'двенадцатый':'двенадцать','третий':'три','седьмой':'семь','первый':'один','пятый':'пять','шестой':'шесть','восьмой':'восемь','второй':'два','четвертый':'четыре','девятый':'девять'};
 let id;const phrase=s.match(/(?:рейс|борт)\s+(?:номер\s+)?(?:(?:sf|nv|ak|сф|нв|ак)\s+)?(.+)/);
 if(phrase){const words=phrase[1].split(' ').map(w=>aliases[w]||w);if(/^(?:четыре ноль четыре|4 0 4|четыреста четыре)(?: |$)/.test(words.join(' ')))id=404;else if(/^\d$/.test(words[0])&&/^\d$/.test(words[1]))id=+(words[0]+words[1]);else if(/^\d+$/.test(words[0]))id=+words[0];else if(units[words[0]]){id=units[words[0]];if(id>=20&&units[words[1]]<10)id+=units[words[1]]}}
 if(id===undefined){const bare=s.match(/^(\d{1,2})(?:\s|$)/);if(bare)id=+bare[1]}
 if(id!==undefined&&(id<1||(id>99&&id!==404)))return {error:'Номер рейса должен быть от 1 до 99'};
 if(phrase&&id===undefined)return {error:'Не понял номер рейса. Скажите, например: «рейс двадцать три».'};
 if(/^(?:дальше|далее|следующий шаг)$/.test(s))return {type:'navigation',action:'next'};
 if(/^(?:пропустить|пропустить пролог)$/.test(s))return {type:'navigation',action:'skipPrologue'};
 if(/^(?:пропустить обучение|пропустить вступление)$/.test(s))return {type:'navigation',action:'skipTutorial'};
 if(/^(?:обучение|обучение с даной|начать обучение)$/.test(s))return {type:'navigation',action:'tutorial'};
 const numberedChapter=s.match(/^(?:башня )?(?:(?:открой|открыть|выбрать|запусти) )?глава (1|2|3|один|два|три)$/);
 if(numberedChapter){
  const number={один:1,два:2,три:3}[numberedChapter[1]]??Number(numberedChapter[1]);
  return {type:'navigation',action:'chapter-'+number};
 }
 const chapterCommand={'первая глава':'chapter-1','вторая глава':'chapter-2','третья глава':'chapter-3','ложные сигналы':'chapter-2','до рассвета':'chapter-3','следующая глава':'next-chapter','повторить главу':'retry-chapter'}[s.replace(/^(?:башня )?(?:(?:открой|открыть|выбрать|запусти) )?/, '')];
 if(chapterCommand)return {type:'navigation',action:chapterCommand};
 const routes=[[/^(?:башня )?(?:начать смену|начать игру|повторить смену)$/,'start'],[/^(?:башня )?(?:главное меню|в меню|меню)$/,'exit'],[/^(?:башня )?пауза$/,'pause'],[/^(?:башня )?(?:продолжить|продолжить смену)$/,'resume'],[/^(?:башня )?(?:закрыть|назад)$/,'close'],[/^(?:башня )?(?:как играть|помощь)$/,'how'],[/^(?:башня )?настройки$/,'settings'],[/^(?:башня )?эпизоды$/,'chapters'],[/^(?:башня )?(?:отключить управление|выключить управление)$/,'stop']];
 if(/^(?:открыть )?(?:журнал|журнал смены|история смены)$/.test(s))return {type:'navigation',action:'journal'};
 for(const [re,action]of routes)if(re.test(s))return {type:'navigation',action};
 const sound={'выключить звук':'mute','без звука':'mute','включить звук':'unmute','тише':'quieter','громче':'louder','выключить музыку':'music-off','без музыки':'music-off','включить музыку':'music-on','музыка тише':'music-quieter','тише музыку':'music-quieter','музыка громче':'music-louder','громче музыку':'music-louder'};
 if(sound[s])return {type:'audio',action:sound[s]};
 if(/^(?:башня )?(?:о проекте|об игре)$/.test(s))return {type:'navigation',action:'about'};
 if(/^(?:башня )?(?:отмена|отменить)$/.test(s))return {type:'gesture',action:'cancel'};
 if(/^(?:башня )?(?:следующий рейс|предыдущий рейс)$/.test(s))return {type:'cycle',direction:s.includes('предыдущий')?-1:1};
 let command;
 if(/второй круг|второго круга|повторный заход|уйти на круг/.test(s))command='Второй круг';
 else if(/принять заход|принимаю заход|подтвердить заход/.test(s))command='Принять заход';
 else if(/снять отметку|удалить отметку|убрать отметку/.test(s))command='Снять отметку';
 else if(/отказать в приоритете|отменить приоритет/.test(s))command='Отказать в приоритете';
 else if(/подготовить полосу|подготовка полосы/.test(s))command='Подготовить полосу';
 else if(/резервная частота|резервную частоту|резервный канал/.test(s))command='Резервная частота';
 else if(/отменить разрешение|отозвать разрешение|отменить старое разрешение/.test(s))command='Отменить разрешение';
 else if(/сверить журнал/.test(s))command='Сверить журнал';
 else if(/камера|камеру|камерой/.test(s))command='Камера';
 else if(s.includes('изолированная стоянка')||s.includes('изолированную стоянку')||s.includes('изоляция'))command='Изолированная стоянка';
 else if(s.includes('проверк')||s.includes('начать проверку')||s.includes('проверить'))command='Проверка';
 else if(s.includes('посадк')||s.includes('посадить')||s.includes('садиться'))command='Посадка';
 else if(/взлет|взлетать|взлететь|вылет/.test(s))command='Взлёт';
 else if(s.includes('ожидан')||s.includes('ожидать')||s.includes('ждать'))command='Ожидание';
 if(command)return {type:'command',id,command};
 if(id)return {type:'select',id};
 return {error:'Команда не распознана. Например: «рейс двенадцать, посадка»'};
}
class VoiceSession{
 receive(text){
  const normalized=text.toLowerCase().replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim();
  if(/\S.*\sбашн[яею](?:\s|$)/.test(normalized)||(normalized.replace(/(?:рейс|борт) 4 0 4(?= |$)/g, "борт 404").match(/\d+/g)||[]).length>1||(normalized.match(/(?:рейс|борт)\s/g)||[]).length>1)return {error:true,message:'Склеились несколько фраз. Повторите одну: «рейс двадцать три, посадка».'};
  const command=parse(normalized);
  return command.error?{error:true,message:command.error}:{command};
 }
}
function classifyGesture(result){
 const hand=result.landmarks?.[0];
 if(hand?.length===21){
  const distance=(a,b)=>Math.hypot(hand[a].x-hand[b].x,hand[a].y-hand[b].y);
  const size=distance(0,9);
  if(size>.025&&distance(4,8)<size*.40&&[12,16,20].filter((tip,i)=>distance(tip,0)>distance([10,14,18][i],0)*1.08).length>=2)return {categoryName:'OK',score:.95};
 }
 const g=result.gestures?.[0]?.[0];return g?.categoryName==='Thumb_Down'?g:{categoryName:'None',score:0};
}
class GestureGate{
 constructor(){this.reset()}
 reset(){this.name='';this.since=0;this.latched=false;this.neutralSince=null}
 update(name,score,time){
  if(!['OK','Thumb_Down'].includes(name)||score<.75){if(this.neutralSince===null)this.neutralSince=time;if(time-this.neutralSince>=200)this.reset();return null}
  this.neutralSince=null;
  if(name!==this.name){if(this.latched)return null;this.name=name;this.since=time}
  if(!this.latched&&time-this.since>=500){this.latched=true;return name==='OK'?'confirm':'cancel'}return null;
 }
}
if(typeof module!=='undefined')module.exports={parse,GestureGate,classifyGesture,VoiceSession};
if(!root.document)return;
const ui=document.createElement('section');ui.className='handsfree';ui.innerHTML=`<div class="hf-heading"><strong>БЕСКОНТАКТНОЕ УПРАВЛЕНИЕ</strong><button id="hf-toggle">Включить голос и камеру</button></div><p id="hf-status" role="status" aria-live="polite">После настройки — голос и жесты. Chrome / Edge рекомендуются.</p><details><summary>Команды и обработка данных</summary><p>Микрофон: браузерное распознавание может отправлять звук сервису браузера; требуется сеть. Камера: кадры обрабатываются MediaPipe на устройстве, модель загружается из сети. Видео и аудио игра не сохраняет.</p><p>Без ключевого слова. Говорите по одной команде, с паузой между фразами. «Начать смену», «рейс двенадцать», «рейс двадцать три, проверка», «посадка», «взлёт», «изолированная стоянка», «ожидание», «следующий рейс», «вторая глава», «третья глава», «следующая глава», «передать архив», «пауза», «продолжить», «главное меню», «закрыть», «помощь», «отключить управление».</p><p>Главы 2 и 3: «рейс 57 принять заход» — для подтверждённого раннего рейса. Ненужный второй круг: −4 репутации; при занятой или закрытой полосе штрафа нет. Глава 2: «рейс 42 камера», «рейс 42 снять отметку», «рейс 35 отказать в приоритете», «рейс 56 сверить журнал», «рейс 56 отменить разрешение», «рейс 95 второй круг». В разговорах: «дальше» или ОК — следующая реплика, отмена — предыдущая; смена на паузе. Каждое распоряжение → 👌. Камера — 4 с, проверка — 12 с, второй круг — 22 с и около 7% топлива.</p><p>Глава 3: «рейс 56 подготовить полосу», «первая полоса», «рейс 56 посадка», «автоматический выбор»; «освободить канал», «рейс 91 резервная частота». В архиве: «камера архива», «открыть дверь б», «сохранить копию» или «передать без копии». Решение подтверждается ОК, отмена снимает выбор.</p><p>👌 Удержать 0,5 с — подтвердить. 👎 Удержать — отменить. Между жестами уберите руку. Распоряжение подтверждается только жестом.</p></details><video id="hf-video" autoplay muted playsinline></video><p id="hf-heard">Речь: — · Жест: —</p>`;document.body.append(ui);
const status=ui.querySelector('#hf-status'),heard=ui.querySelector('#hf-heard'),toggle=ui.querySelector('#hf-toggle'),video=ui.querySelector('video');video.hidden=true;
let wanted=false,rec=null,stream=null,model=null,timer=null,restart=null,run=0,lastVideo=-1,lastSpeech='',gesture='—',gate=new GestureGate(),voice=new VoiceSession(),lastTranscript='',lastAt=0;
// Device controls stay reachable even when the host iframe has scrolling disabled.
ui.id='hf-panel';ui.hidden=true;ui.setAttribute('aria-label','Голос и камера');
const closePanel=document.createElement('button');closePanel.type='button';closePanel.className='hf-close';closePanel.textContent='✕';closePanel.setAttribute('aria-label','Закрыть панель камеры и микрофона');ui.querySelector('.hf-heading').append(closePanel);
const live=document.createElement('div');live.className='hf-live';
const liveMessage=document.createElement('span');liveMessage.className='hf-live-message';liveMessage.setAttribute('role','status');liveMessage.setAttribute('aria-live','polite');liveMessage.textContent='Голос и камера выключены';
const panelButton=document.createElement('button');panelButton.type='button';panelButton.id='hf-panel-button';panelButton.textContent='Камера и микрофон';panelButton.setAttribute('aria-controls',ui.id);panelButton.setAttribute('aria-expanded','false');
live.append(liveMessage,panelButton);document.body.append(live);
function showPanel(open,restoreFocus=false){ui.hidden=!open;panelButton.setAttribute('aria-expanded',String(open));if(open)toggle.focus();else if(restoreFocus)panelButton.focus()}
panelButton.onclick=()=>showPanel(ui.hidden);closePanel.onclick=()=>showPanel(false,true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!ui.hidden){event.preventDefault();event.stopImmediatePropagation();showPanel(false,true)}},true);
document.addEventListener('pointerdown',event=>{if(!ui.hidden&&!ui.contains(event.target)&&!live.contains(event.target))showPanel(false)});
function measureDock(){document.documentElement.style.setProperty('--hf-dock-height',Math.ceil(live.getBoundingClientRect().height)+'px');root.dispatchEvent(new Event('tower-device-layout'))}
if(root.ResizeObserver)new root.ResizeObserver(measureDock).observe(live);else root.addEventListener('resize',measureDock);measureDock();
function say(s){status.textContent=s;liveMessage.textContent=(lastSpeech?'УСЛЫШАЛ: «'+lastSpeech+'» → ':'')+s}
function labels(){heard.textContent=`Речь: ${lastSpeech||'—'} · Жест: ${gesture}`}
function stop(){wanted=false;run++;clearTimeout(restart);clearTimeout(timer);rec?.abort();rec=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;model?.close();model=null;gate.reset();toggle.textContent='Включить голос и камеру';toggle.disabled=false;say('Управление выключено. Камера и микрофон освобождены.')}
async function start(){
 try{root.skyflowAudio?.init()}catch{}
 if(wanted){stop();return}
 if(!confirm('Включить микрофон и камеру? Браузер может отправлять звук своему сервису распознавания. Видео обрабатывается локально. Игра не сохраняет записи.'))return;
 const Speech=root.SpeechRecognition||root.webkitSpeechRecognition;
 if(!Speech){say('В этом браузере нет SpeechRecognition. Откройте адрес игры в Chrome или Edge.');return}
 wanted=true;const token=++run;toggle.disabled=true;say('Запрашиваем устройства и загружаем модель жестов…');
 try{
  stream=await navigator.mediaDevices.getUserMedia({video:{width:320,height:240},audio:true});
  if(token!==run){stream.getTracks().forEach(t=>t.stop());return}
  // SpeechRecognition owns its audio stream; release this permission-check audio track.
  stream.getAudioTracks().forEach(t=>t.stop());video.srcObject=stream;video.hidden=false;await video.play();
  const {FilesetResolver,GestureRecognizer}=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/vision_bundle.mjs');
  const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm');
  const loaded=await GestureRecognizer.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'},runningMode:'VIDEO',numHands:1});
  if(token!==run){loaded.close();return}model=loaded;
  rec=new Speech();rec.lang='ru-RU';rec.continuous=false;rec.interimResults=true;
  rec.onstart=()=>{status.textContent='Микрофон слушает короткую команду. Голос готовит распоряжение, ОК выполняет его.'};
  rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(!e.results[i].isFinal){heard.textContent='Слышу: '+e.results[i][0].transcript;continue}const text=e.results[i][0].transcript.trim();const now=Date.now();if(text===lastTranscript&&now-lastAt<1200)continue;lastTranscript=text;lastAt=now;lastSpeech=text;labels();const received=voice.receive(text,now);if(!received.command){say(received.message);continue}const cmd=received.command;if(cmd.action==='stop'){stop();return}const result=cmd.error||root.skyflowInput?.(cmd);say(result||'Команда принята.')}};
  rec.onerror=e=>{if(['not-allowed','service-not-allowed','audio-capture'].includes(e.error))stop();say(`Ошибка голоса: ${e.error}. ${e.error==='network'?'Проверьте сеть и поддержку сервиса браузером.':'Проверьте доступ к микрофону.'}`)};
  rec.onend=()=>{if(wanted&&token===run)restart=setTimeout(()=>{try{rec.start()}catch(e){say('Не удалось возобновить голос: '+e.message)}},250)};
  rec.start();toggle.disabled=false;toggle.textContent='Выключить управление';say('Готово. Скажите «начать смену». После каждой фразы сделайте короткую паузу. Подтверждайте распоряжения жестом 👌.');
  function frame(){if(!wanted||token!==run)return;try{if(video.readyState>=2&&video.currentTime!==lastVideo){lastVideo=video.currentTime;const result=model.recognizeForVideo(video,performance.now());const g=classifyGesture(result);gesture=g?`${g.categoryName} ${Math.round(g.score*100)}%`:'рука не видна';labels();const event=gate.update(g?.categoryName,g?.score||0,performance.now());if(event){const response=root.skyflowInput?.({type:'gesture',action:event});if(response){status.textContent=response;liveMessage.textContent='ЖЕСТ: '+response}}}}catch(e){say('Ошибка камеры: '+e.message);stop();return}timer=setTimeout(frame,100)}frame();
 }catch(e){stop();say('Не удалось включить управление: '+e.message+'. Проверьте разрешения, сеть и подключение камеры.')}
}
toggle.onclick=start;
root.addEventListener('pagehide',stop);
})(typeof window==='undefined'?globalThis:window);
