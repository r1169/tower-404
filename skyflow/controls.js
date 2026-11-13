(function(root){
'use strict';
function parse(text){
 const s=text.toLowerCase().replace(/ё/g,'е').replace(/рейс(?=\d)/g,'рейс ').replace(/борт(?=\d)/g,'борт ').replace(/[^а-яa-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 if(/(?:^| )(?:не|нет)(?: |$)/.test(s))return {error:'Отрицательная фраза не выполняется. Скажите «отмена» или отдайте точную команду.'};
 if(/^(?:башня )?(?:вызвать аварийные службы|аварийные службы|вызвать спасателей)$/.test(s))return {type:'emergency'};
 const episodeMatch=s.match(/^(?:начать )?эпизод (1|2|3|один|два|три)$/)||s.match(/^(первый|второй|третий) эпизод$/);
 if(episodeMatch){const number=({'один':1,'два':2,'три':3,'первый':1,'второй':2,'третий':3})[episodeMatch[1]]||Number(episodeMatch[1]);return {type:'navigation',action:'episode-'+number};}
 if(s==='следующий эпизод')return {type:'navigation',action:'next-episode'};
 const resources={'первая полоса':{runway:1},'полоса один':{runway:1},'вторая полоса':{runway:2},'полоса два':{runway:2},'первый выход':{gate:1},'выход один':{gate:1},'второй выход':{gate:2},'выход два':{gate:2},'третий выход':{gate:3},'выход три':{gate:3},'автоматический выбор':{runway:null,gate:null}};
 if(resources[s])return {type:'resource',...resources[s]};
 const units={'один':1,'два':2,'три':3,'четыре':4,'пять':5,'шесть':6,'семь':7,'восемь':8,'девять':9,'десять':10,'одиннадцать':11,'двенадцать':12,'тринадцать':13,'четырнадцать':14,'пятнадцать':15,'шестнадцать':16,'семнадцать':17,'восемнадцать':18,'девятнадцать':19,'двадцать':20,'тридцать':30,'сорок':40,'пятьдесят':50,'шестьдесят':60,'семьдесят':70,'восемьдесят':80,'девяносто':90};
 const aliases={'двенадцатый':'двенадцать','третий':'три','седьмой':'семь','первый':'один','пятый':'пять','шестой':'шесть','восьмой':'восемь','второй':'два','четвертый':'четыре','девятый':'девять'};
 let id;const phrase=s.match(/(?:рейс|борт)\s+(?:номер\s+)?(?:(?:sf|nv|ak|сф|нв|ак)\s+)?(.+)/);
 if(phrase){const words=phrase[1].split(' ').map(w=>aliases[w]||w);if(/^\d$/.test(words[0])&&/^\d$/.test(words[1]))id=+(words[0]+words[1]);else if(/^\d+$/.test(words[0]))id=+words[0];else if(units[words[0]]){id=units[words[0]];if(id>=20&&units[words[1]]<10)id+=units[words[1]]}}
 if(id===undefined){const bare=s.match(/^(\d{1,2})(?:\s|$)/);if(bare)id=+bare[1]}
 if(id!==undefined&&(id<1||id>99))return {error:'Номер рейса должен быть от 1 до 99'};
 if(phrase&&id===undefined)return {error:'Не понял номер рейса. Скажите, например: «рейс двадцать три».'};
 if(/^(?:дальше|далее|следующий шаг)$/.test(s))return {type:'navigation',action:'next'};
 if(/^(?:пропустить|пропустить пролог)$/.test(s))return {type:'navigation',action:'skipPrologue'};
 if(/^(?:пропустить обучение|пропустить вступление)$/.test(s))return {type:'navigation',action:'skipTutorial'};
 if(/^(?:обучение|обучение с даной|начать обучение)$/.test(s))return {type:'navigation',action:'tutorial'};
 const routes=[[/^(?:башня )?(?:начать смену|начать игру|повторить смену)$/,'start'],[/^(?:башня )?(?:главное меню|в меню|меню)$/,'exit'],[/^(?:башня )?пауза$/,'pause'],[/^(?:башня )?(?:продолжить|продолжить смену)$/,'resume'],[/^(?:башня )?(?:закрыть|назад)$/,'close'],[/^(?:башня )?(?:как играть|помощь)$/,'how'],[/^(?:башня )?настройки$/,'settings'],[/^(?:башня )?эпизоды$/,'chapters'],[/^(?:башня )?(?:отключить управление|выключить управление)$/,'stop']];
 if(/^(?:открыть )?(?:журнал|журнал смены|история смены)$/.test(s))return {type:'navigation',action:'journal'};
 for(const [re,action]of routes)if(re.test(s))return {type:'navigation',action};
 const sound={'выключить звук':'mute','без звука':'mute','включить звук':'unmute','тише':'quieter','громче':'louder'};
 if(sound[s])return {type:'audio',action:sound[s]};
 if(/^(?:башня )?(?:о проекте|об игре)$/.test(s))return {type:'navigation',action:'about'};
 if(/^(?:башня )?(?:отмена|отменить)$/.test(s))return {type:'gesture',action:'cancel'};
 if(/^(?:башня )?(?:следующий рейс|предыдущий рейс)$/.test(s))return {type:'cycle',direction:s.includes('предыдущий')?-1:1};
 let command;
 if(s.includes('изолированная стоянка')||s.includes('изолированную стоянку')||s.includes('изоляция'))command='Изолированная стоянка';
 else if(s.includes('проверк')||s.includes('начать проверку')||s.includes('проверить'))command='Проверка';
 else if(s.includes('посадк')||s.includes('посадить')||s.includes('садиться'))command='Посадка';
 else if(s.includes('взлет'))command='Взлёт';
 else if(s.includes('ожидан')||s.includes('ожидать')||s.includes('ждать'))command='Ожидание';
 if(command)return {type:'command',id,command};
 if(id)return {type:'select',id};
 return {error:'Команда не распознана. Например: «рейс двенадцать, посадка»'};
}
class VoiceSession{
 receive(text){
  const normalized=text.toLowerCase().replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim();
  if(/\S.*\sбашн[яею](?:\s|$)/.test(normalized)||(normalized.match(/\d+/g)||[]).length>1||(normalized.match(/(?:рейс|борт)\s/g)||[]).length>1)return {error:true,message:'Склеились несколько фраз. Повторите одну: «рейс двадцать три, посадка».'};
  const command=parse(normalized);
  return command.error?{error:true,message:command.error}:{command};
 }
}
function classifyGesture(result){
 const hand=result.landmarks?.[0];
 if(hand?.length===21){
  const distance=(a,b)=>Math.hypot(hand[a].x-hand[b].x,hand[a].y-hand[b].y);
  const size=distance(0,9);
  if(size>.035&&distance(4,8)<size*.32&&[12,16,20].every((tip,i)=>distance(tip,0)>distance([10,14,18][i],0)*1.15))return {categoryName:'OK',score:.95};
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
const ui=document.createElement('section');ui.className='handsfree';ui.innerHTML=`<div class="hf-heading"><strong>БЕСКОНТАКТНОЕ УПРАВЛЕНИЕ</strong><button id="hf-toggle">Включить голос и камеру</button></div><p id="hf-status" role="status" aria-live="polite">После настройки — голос и жесты. Chrome / Edge рекомендуются.</p><details><summary>Команды и обработка данных</summary><p>Микрофон: браузерное распознавание может отправлять звук сервису браузера; требуется сеть. Камера: кадры обрабатываются MediaPipe на устройстве, модель загружается из сети. Видео и аудио игра не сохраняет.</p><p>Без ключевого слова. Говорите по одной команде, с паузой между фразами. «Начать смену», «рейс двенадцать», «рейс двадцать три, проверка», «посадка», «взлёт», «изолированная стоянка», «ожидание», «следующий рейс», «пауза», «продолжить», «главное меню», «закрыть», «помощь», «отключить управление».</p><p>👌 Удержать 0,5 с — подтвердить. 👎 Удержать — отменить. Между жестами уберите руку. Распоряжение подтверждается только жестом.</p></details><video id="hf-video" autoplay muted playsinline></video><p id="hf-heard">Речь: — · Жест: —</p>`;document.body.append(ui);
const status=ui.querySelector('#hf-status'),heard=ui.querySelector('#hf-heard'),toggle=ui.querySelector('#hf-toggle'),video=ui.querySelector('video');video.hidden=true;
let wanted=false,rec=null,stream=null,model=null,timer=null,restart=null,run=0,lastVideo=-1,lastSpeech='',gesture='—',gate=new GestureGate(),voice=new VoiceSession(),lastTranscript='',lastAt=0;
const live=document.createElement('div');live.className='hf-live';live.setAttribute('role','status');live.textContent='Голос и камера выключены';document.body.append(live);
function say(s){status.textContent=s;live.textContent=(lastSpeech?'УСЛЫШАЛ: «'+lastSpeech+'» → ':'')+s}
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
  function frame(){if(!wanted||token!==run)return;try{if(video.readyState>=2&&video.currentTime!==lastVideo){lastVideo=video.currentTime;const result=model.recognizeForVideo(video,performance.now());const g=classifyGesture(result);gesture=g?`${g.categoryName} ${Math.round(g.score*100)}%`:'рука не видна';labels();const event=gate.update(g?.categoryName,g?.score||0,performance.now());if(event){const response=root.skyflowInput?.({type:'gesture',action:event});if(response&&!response.includes('Сначала отдайте')){status.textContent=response;live.textContent='ЖЕСТ: '+response}}}}catch(e){say('Ошибка камеры: '+e.message);stop();return}timer=setTimeout(frame,100)}frame();
 }catch(e){stop();say('Не удалось включить управление: '+e.message+'. Проверьте разрешения, сеть и подключение камеры.')}
}
toggle.onclick=start;root.addEventListener('pagehide',stop);
})(typeof window==='undefined'?globalThis:window);
