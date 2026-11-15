(() => {
const app=document.querySelector('#app');
const flightData=[{id:12,code:'SF 012',route:'Алматы → Северный',fuel:74,kind:'ОБЫЧНЫЙ',status:'Данные подтверждены',risk:false},{id:23,code:'NV 023',route:'Астана → Северный',fuel:38,kind:'ПРОВЕРКА',status:'Позывной отсутствует в расписании',risk:true},{id:47,code:'AK 047',route:'Актау → Северный',fuel:57,kind:'СРОЧНЫЙ',status:'Запрошен приоритет посадки',risk:false},{id:61,code:'SF 061',route:'Северный → Караганда',fuel:92,kind:'ВЫЛЕТ',status:'Готов к вылету',risk:false}];

const chapters={2:{title:'Не отвечайте на вызов'},3:{title:'Последняя запись'}};
let chapter=1,nextChapter=null,chapterClockOffset=0;
let timurReturned=false;
function timurAway(){return chapter===3&&!timurReturned}
let episodeStory=null, leraDialogueRead=false;
let approach='normal',oldRecord=false,leraArrived=false;
function chapterAirport(){
 if(chapter===2)return new window.SkyflowEpisodeTwo.EpisodeTwoAirport();
 if(chapter===3)return new window.SkyflowEpisodeThree.EpisodeThreeAirport();
 return new window.SkyflowSimulation.Airport(flightData,{dynamic:window.SKYFLOW_DYNAMIC!==false});
}
function openChapter(number){
 if(number===1)chapterClockOffset=0;
 else if(ended&&nextChapter===number)chapterClockOffset+=airport.time;
 else if(number!==chapter)chapterClockOffset=number===2?215:490;
 chapter=number;
 if(number===1){action('prologue');return}
 close();tutorial.stop();reset();screen='game';paused=true;
 if(number===2){approach='unverified';screen='chapter-intro';prologueStep=0;prologueAge=0;window.skyflowAudio?.ambience(false);render();window.scrollTo?.(0,0);return}
 openEpisodeStory('briefing');window.scrollTo?.(0,0);
}
const episodeTwoFrames=[
 {title:'Неизвестная частота',lines:[['Пилот 404','Дана. Не запускайте генератор.'],['Дана','Откуда вы знаете моё имя?']]},
 {title:'Башня погасла',alarm:true,caption:'ОСНОВНОЕ ПИТАНИЕ ПОТЕРЯНО',lines:[['Тимур','Перевёл приборы на батареи. Мы ещё в эфире.']]},
 {title:'Два одинаковых позывных',lines:[['Дана','404, рядом с вами ещё один борт?'],['Пилот 404','Нет. Я один. Посмотрите в окно.']]},
 {title:'Доверяй тому, что проверил',signal:true,lines:[['Тимур','Камера, документы и журнал. Сопоставляй все три.'],['Дана','Не каждый ранний заход — подделка. Проверим разрешение и полосу. Опасный заход отменим вторым кругом.']]}
];
const episodeTwoDurations=[7,6,7,10];
function startEpisodeTwo(){close();screen='game';paused=false;prologueAge=0;window.skyflowAudio?.ambience(true);log='Дана: Сначала медицинский 39. ЭХО 42 повторяет позывной 404 — проверь камеру. Сам 404 ждёт в отдельном секторе до конца смены.';render();window.scrollTo?.(0,0)}
function nextEpisodeTwoFrame(){prologueAge=0;if(prologueStep<episodeTwoFrames.length-1){prologueStep++;render()}else startEpisodeTwo()}
function tickEpisodeTwoIntro(dt){prologueAge+=dt;const bar=document.querySelector('.story-timer');if(bar)bar.style.width=Math.min(100,(episodeTwoDurations.slice(0,prologueStep).reduce((a,b)=>a+b,0)+prologueAge)/30*100)+'%';if(prologueAge>=episodeTwoDurations[prologueStep])nextEpisodeTwoFrame()}
function episodeTwoIntro(){return `<section class="prologue comic-reader sequential-comic episode-two-intro"><header class="prologue-heading"><div><div class="eyebrow">TOWER <b>404</b> / ГЛАВА 02</div><h1>Не отвечайте на вызов</h1></div><button data-action="begin-shift">Начать смену · 👌</button></header><div class="comic-page">${episodeTwoFrames.map((p,i)=>`<article class="story-panel ${i<=prologueStep?'revealed':'unrevealed'} ${i===prologueStep?'current':''} ${p.alarm?'alarm-panel':''} ${p.signal?'signal-panel':''}"><div class="panel-illustration" style="background-image:url('assets/blackout-comic-crew.png');background-position:${i%2?'100%':'0%'} ${i>1?'100%':'0%'}" role="img" aria-label="${p.title}"></div><small class="panel-kicker">${p.title}</small><div class="panel-dialogue">${p.caption?'<p class="comic-narration">'+p.caption+'</p>':''}${p.lines.map(([who,line])=>`<div class="comic-bubble ${who==='Тимур'?'timur-bubble':''}"><b>${who}</b><p>${line}</p></div>`).join('')}</div></article>`).join('')}</div><div class="story-timeline"><div class="story-timer"></div></div><div class="prologue-controls"><span class="story-hint">${prologueStep+1} / 4 · кадры появляются по очереди · время смены остановлено</span><button data-action="prologue-next">Дальше →</button></div><p class="story-hint">«Дальше» — следующий кадр · 👌 начать смену сейчас · 👎 в меню</p></section>`}
function fuelReading(f){return f.caseType==='phantom'?0:f.claimedEmergency&&!f.checked?8:f.fuel}
function fuelText(f){return f.caseType==='phantom'?'нет телеметрии':f.claimedEmergency&&!f.checked?'8% · со слов экипажа':Math.ceil(f.fuel)+'%'}
const episodeTwoScenes={
 'wave-1':{title:'Он знает Дану',next:'Начать вторую волну',lines:[
  ['Дана','Один позывной появился в двух секторах. А следом пришёл аварийный вызов, который не совпал с телеметрией. Кто-то смешивает реальные рейсы с ложными сообщениями.'],
  ['Борт 404','Дана, не повторяйте ту смену. Слушайте самолёты, а не запись.'],
  ['Тимур','«Не повторяйте ту смену»… Я уже слышал это после старой аварии. Пока держим 404 отдельно. Камера и наш журнал работают независимо от входящего эфира.']
 ]},
 'wave-2':{title:'Разрешение из прошлого',next:'Начать третью волну',lines:[
  ['Дана','Теперь в эфир пришло старое разрешение на посадку. Ещё одно сообщение требовало изолировать безопасный самолёт. Одного тревожного сообщения недостаточно — нужно сравнивать источники.'],
  ['Тимур','Я сверил время пакета с записью старой аварии. Тогда система тоже повторила разрешение из другой смены. В отчёте виноватой сделали Леру, нашу коллегу.'],
  ['Дана','Значит, проверяем время, подпись и полосу. Подтверждённый ранний рейс принимаем. Старую команду отменяем, опасный заход — на второй круг. Сначала разберём последний поток. Потом выслушаем 404.']
 ]},
 'final-approach':{title:'Коридор для 404',next:'К посадке 404',lines:[
  ['Тимур','Остальных контактов в очереди нет. Подход к полосе свободен. Я подтвердил маршрут 404 по независимому каналу и взял его на камеру.'],
  ['Борт 404','На борту пассажир. Она знает, где хранится оригинал записи той аварии. После посадки попросит вас о встрече.'],
  ['Дана','404, ждите моего разрешения. Теперь можно выбрать ваш борт и отдать «рейс четыреста четыре, посадка». Это последняя посадка смены.']
 ]},
 lera:{title:'Кабина пуста',next:'Завершить разговор',lines:[
  ['Дана','Кресло пилота пустое. Голос звучал с записи, самолёт вели дистанционно. По трапу спускается женщина…',true],
  ['Тимур','Лера? Я был на твоих похоронах. Мы думали, что ты погибла.'],
  ['Лера','Я выжила. После аварии меня сделали виноватой, а настоящую запись спрятали под башней. Мне пришлось исчезнуть.'],
  ['Лера','Ложный приказ об эвакуации отправила я — хотела попасть в архив. Но поддельные разрешения самолётам отправляла не я. Сейчас кто-то повторяет то, что случилось в ту ночь.'],
  ['Дана','Ложная эвакуация тоже могла стоить людям жизни. С этим разберёмся. Сейчас нужен оригинал записи. Тимур, встреть Леру у архива. Я останусь на связи с самолётами.']
 ]}
};
function episodeThreeScene(id){
 const complete=airport.archiveOriginal&&airport.transmission.state==='sent';
 const scenes={
  briefing:{title:'Что нужно успеть до рассвета',next:'Начать смену',lines:[
   ['Дана','Лера прилетела на 404. Она призналась: ложный приказ об эвакуации был её способом попасть в архив. Но поддельные разрешения самолётам отправляла не она.'],
   ['Лера','В архиве под башней лежит оригинал записи старой аварии. Он доказывает, что разрешение повторила система. Меня сделали виноватой в отчёте.'],
   ['Тимур','Я иду к архиву, остаюсь на рации. Дана ведёт рейсы. План простой: найти оригинал, сохранить копию и передать её во внешний центр. Сначала — медицинский 64 и вылет 35.']
  ]},
  'archive-door':{title:'Проверить, кто у двери',next:'Подтвердить выбор',lines:[
   ['Тимур · рация','Я дошёл до архива. У двери А звучит запись моего голоса. Я у двери Б. Не выбирай по голосу — посмотри камеры.'],
   ['Дана','Сейчас нет самолётов на заходе, можно спокойно проверить. Открой камеры и выбери дверь, у которой виден Тимур. Ошибочная дверь закроет доступ к оригиналу; останется только фрагмент.']
  ],choices:airport.cameraViewed?[['door-a','Открыть дверь А'],['door-b','Открыть дверь Б']]:[],camera:true},
  'record-access':{title:airport.archiveOriginal?'Тимур вошёл в архив':'Оригинал за закрытой дверью',next:'Ко второй волне',lines:airport.archiveOriginal?[
   ['Тимур','Дверь Б открылась. Мы с Лерой внутри. Найдём оригинал, пока ты ведёшь следующий поток.'],
   ['Дана','На подходе борт с неисправным шасси: ему нужна подготовленная длинная полоса 1. Проверки остальных рейсов идут по рации; камера подхода остаётся доступна.']
  ]:[
   ['Тимур','Открыли дверь А с динамиком. Сработала блокировка архива. Мы забрали только фрагмент из резервного терминала. Полный разговор начальника остался внутри.'],
   ['Дана','Продолжаем смену и сохраним то, что есть. На подходе борт с неисправным шасси: ему нужна подготовленная длинная полоса 1.']
  ]},
  'archive-record':{title:airport.archiveOriginal?'Что произошло тогда':'Что удалось восстановить',next:'Подтвердить решение',lines:airport.archiveOriginal?[
   ['Запись · Тимур','В эфире звучит моё разрешение. Но я не нажимал передачу. В журнале стоит старое время — система повторила прежнюю команду, когда полоса уже была занята.'],
   ['Запись · начальник смены','В отчёте будет, что команду дала Лера. Подпиши. О сбое системы — ни слова.'],
   ['Тимур','Я испугался и подписал ложный отчёт. Лера была невиновна в той команде. Я дам показания и объясню свою подпись.'],
   ['Тимур','Ты с тех пор отвечаешь мне только по работе.'],['Дана','Сейчас по-другому не получается.'],['Тимур','Понимаю.'],['Дана','Мне нужна твоя помощь до конца смены. А потом поговорим про тот отчёт.'],['Тимур','Хорошо. Я не уйду.'],
   ['Лера','Передача во внешний центр займёт 36 секунд на резервном канале. Этот канал может понадобиться самолёту. Сохрани копию: тогда передачу можно прервать и продолжить после рейсов. Без копии прерывание потеряет запись.']
  ]:[
   ['Лера','Во фрагменте слышно старое разрешение, но разговора с начальником нет. Одной этой записи недостаточно, чтобы доказать подмену отчёта.'],
   ['Тимур','Я видел, как обвинили Леру, и подписал отчёт. Теперь дам показания. Даже неполный фрагмент нужно сохранить.'],
   ['Тимур','Ты с тех пор отвечаешь мне только по работе.'],['Дана','Сейчас по-другому не получается.'],['Тимур','Понимаю.'],['Дана','Мне нужна твоя помощь до конца смены. А потом поговорим про тот отчёт.'],['Тимур','Хорошо. Я не уйду.'],
   ['Дана','Передача займёт 36 секунд на резервном канале. Самолёту тоже может понадобиться этот канал. С копией передачу можно приостановить; без копии прерывание уничтожит запись.']
  ],choices:[['save-copy','Сохранить копию и начать передачу'],['without-copy','Передать без резервной копии']]},
  finale:{title:'Что удалось спасти',next:'Показать результаты',lines:[
   ['Внешний центр',complete?'Оригинал получен. Сохраняем запись и журнал: они подтверждают повтор старой команды системой и подмену отчёта.':airport.transmission.state==='sent'?'Фрагмент получен. Для расследования не хватает полного разговора. Нужны показания Леры и Тимура.':'Передача оборвалась, резервной копии нет. Запись не получена. Расследование начнётся с ваших показаний.'],
   ['Тимур','Я вернулся. Утром пойду к следователям: расскажу и о сбое, и о том, почему подписал ложный отчёт.'],
   ['Дана','Лера ответит за ложную эвакуацию. Старую аварию расследуют заново. Кто включил повтор команд сегодня, ещё нужно установить. Мы передадим журнал этой смены вместе с показаниями.']
  ]}
 };
 return scenes[id];
}
function currentEpisodeScene(){return chapter===3?episodeThreeScene(episodeStory.id):episodeTwoScenes[episodeStory.id]}
function storyPortrait(who,text){
 const person=who.includes('Тимур')?'timur':who==='Дана'?'dana':who==='Лера'?'lera':'radio';
 const mood=/испуг|винов|отчёт|прости|не получается|опас|потер/.test(text)?2:/передач|проверь|полос|план/.test(text)?3:0;
 return '<div class="story-avatar '+person+'" role="img" aria-label="'+(person==='radio'?'Голос по связи':'Портрет '+who.replace('Запись · ',''))+'" style="--face-x:'+(mood*100/3)+'%">'+(person==='radio'?'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 29v6m8-15v24m8-32v40m8-26v12m8-20v28m8-34v40m8-24v8" fill="none" stroke="currentColor" stroke-width="3"/></svg>':'')+'</div>';
}
function storyIdentity(who){
 const recorded=who.startsWith('Запись'),name=who.replace('Запись · ','').replace(' · рация','');
 const channel=recorded?'Архивная запись':who.includes('Тимур')&&chapter===3&&!timurReturned&&episodeStory?.id!=='finale'?'По рации':who==='Внешний центр'||who==='Борт 404'?'Радиоканал':'';
 return '<h2 class="story-person-name">'+name+'</h2>'+(channel?'<small class="story-channel">'+channel+'</small>':'');
}
function showEpisodeStory(){
 const scene=currentEpisodeScene(),line=scene.lines[episodeStory.step],last=episodeStory.step===scene.lines.length-1,choosing=last&&!!scene.choices;
 const art=line[2]?'<div class="lera-reveal"><figure><div><img src="assets/lera-reveal-pixel.png" alt="Пустая кабина 404"></div><figcaption>В кабине никого</figcaption></figure><figure><div><img src="assets/lera-reveal-pixel.png" alt="Лера выходит из самолёта"></div><figcaption>Пассажир у трапа</figcaption></figure></div>':'';
 const choiceUI=choosing?(scene.camera?(airport.cameraViewed?archiveCameraViews():'<button data-story-choice="archive-camera">Посмотреть камеры архива</button>'):'')+'<div class="story-choices">'+scene.choices.map(([value,label])=>'<button class="'+(episodeStory.choice===value?'chosen':'')+'" data-story-choice="'+value+'">'+label+'</button>').join('')+'</div>':'';
 const choiceLabel=scene.choices?.find(([value])=>value===episodeStory.choice)?.[1];
 modal('ГЛАВА 0'+chapter+' · ПАУЗА','',`<div class="episode-story">${art}<div class="story-conversation">${storyPortrait(line[0],line[1])}<div>${storyIdentity(line[0])}<p class="story-line">${line[1]}</p></div></div>${choiceUI}${choiceLabel?'<p class="story-decision">Выбрано: '+choiceLabel+'. Подтвердите ОК; отмена снимает выбор.</p>':''}<p class="story-progress">${episodeStory.step+1} / ${scene.lines.length} · время, топливо и движение остановлены</p><p class="story-hint">${choosing?'Выберите действие кнопкой или голосом, затем подтвердите ОК. Отмена не принимает решение.':'Читайте в своём темпе. «Дальше», «продолжить» или ОК — следующая реплика.'}</p></div>`,(episodeStory.step?'<button data-action="story-back">← Назад / отменить выбор</button>':'')+`<button class="primary" data-action="story-next" ${choosing&&!choiceLabel?'disabled':''}>${last?scene.next:'Дальше →'} · 👌</button><button data-action="exit">В меню</button>`);
}
function openEpisodeStory(id){dialogue.clearPersonal();episodeStory={id,step:0,choice:null};paused=true;pending=null;window.skyflowAudio?.ambience(false);window.skyflowAudio?.syncEngines?.([],false);render();showEpisodeStory()}
function chooseEpisodeStory(choice){
 if(chapter!==3||!episodeStory)return 'Сейчас сюжетного выбора нет.';
 const scene=currentEpisodeScene();if(episodeStory.step!==scene.lines.length-1)return 'Сначала дочитайте разговор: «дальше» или ОК.';
 if(choice==='archive-camera'&&scene.camera){airport.viewArchiveCamera();showEpisodeStory();return 'У двери А динамик, у двери Б виден Тимур.'}
 if(!scene.choices?.some(([value])=>value===choice))return 'Сначала посмотрите камеры или выберите доступное действие.';
 episodeStory.choice=choice;showEpisodeStory();return 'Выбор подготовлен. ОК подтверждает; отмена снимает выбор.';
}
function advanceEpisodeStory(){
 const scene=currentEpisodeScene();
 if(episodeStory.step<scene.lines.length-1){episodeStory.step++;showEpisodeStory();return 'Следующая реплика. Смена остаётся на паузе.'}
 const id=episodeStory.id;
 if(chapter===3){
  if(scene.choices&&!episodeStory.choice)return 'Выберите действие и подтвердите ОК. Разговор остаётся на паузе.';
  if(id==='archive-door'){airport.chooseDoor(episodeStory.choice==='door-b'?'b':'a');openEpisodeStory('record-access');return 'Решение принято. Прочитайте результат.'}
  if(id==='archive-record')airport.chooseBackup(episodeStory.choice==='save-copy');
  const checkpoint=id==='record-access'?'archive-door':id;
  if(!airport.acknowledgeStory(checkpoint))return 'Этот разговор ещё не завершён.';
  if(id==='finale')timurReturned=true;
 }else if(id==='lera')leraDialogueRead=true;else{airport.acknowledgeStory(id);if(id==='wave-2')oldRecord=true}
 episodeStory=null;close();paused=false;window.skyflowAudio?.ambience(true);
 log=chapter===3?`Дана: этап ${airport.wave}. Продолжаем смену.`:id==='final-approach'?airport.finalLockReason():id==='lera'?'Разговор завершён. Готовим передачу смены.':`Дана: начинается волна ${airport.wave}. Сверяйте источники перед разрешением.`;
 render();if(chapter===3&&airport.finished)finish(true);return log;
}
function episodeTwoEvidence(f){
 const special=['phantom','falseUrgent','clerical','impostor'].includes(f.caseType);
 const camera=airport.camera?.id===f.id?'Наведение камеры…':f.cameraClue||'Сектор не проверен.';
 const docs=f.documentClue||'Документы не сверены.';
 return `<section class="flight-evidence"><strong>Сверка источников</strong>${episodeThreeEvidence(f)}${f.earlyApproach?'<p class="early-note">Ранний рейс подтверждён. '+(airport.earlyApproachSafe(f)?'Полоса и выход доступны. Ненужный второй круг: −4 репутации.':'Полоса или выход недоступны. Второй круг без штрафа.')+'</p><button data-command="Принять заход" '+(f.earlyAccepted?'disabled':'')+'>'+(f.earlyAccepted?'Заход принят':'Принять заход')+'</button>':''}${f.id===404?'<p class="final-flight-note">'+airport.finalLockReason()+'</p>':''}<p><b>Камера:</b> ${camera}</p><p><b>Документы:</b> ${docs}</p><p><b>Наш журнал:</b> ${f.journalClue||'Не сверен. Входящий пакет не является вашим разрешением.'}</p>${f.forged?'<p class="danger-text">Чужой заход на закрытую полосу! Нужен второй круг.</p>':''}${f.replayPending?'<p class="danger-text">Старый пакет: экипаж начнёт заход через <b data-replay-time>'+Math.max(0,Math.ceil(f.replayDeadline-airport.time))+'</b> с. Сверьте журнал и отмените разрешение.</p>':''}${f.phase==='goAround'?'<p>Возврат через <b data-goaround="'+f.id+'">'+Math.ceil((1-f.progress)*22)+'</b> с. После возврата нужно новое разрешение.</p>':''}<div class="evidence-actions">${!f.done&&['holding','unauthorized'].includes(f.phase)?'<button data-command="Камера">Камера · 4 с</button><button data-command="Сверить журнал">Сверить журнал</button>':''}${f.replayPending?'<button data-command="Отменить разрешение">Отменить старое разрешение</button>':''}${!f.done&&f.phase==='holding'&&special?'<button data-command="Снять отметку">Снять отметку</button>':''}${f.claimedEmergency?'<button data-command="Отказать в приоритете">Отказать в приоритете</button>':''}</div></section>`;
}
function externalApproaches(){return flights.filter(f=>f.phase==='unauthorized').sort((a,b)=>Number(!!a.earlyApproach)-Number(!!b.earlyApproach)||b.progress-a.progress)}
function externalApproachPanel(f){
 const safe=f.earlyApproach&&airport.earlyApproachSafe(f);
 const details=f.earlyApproach?(safe?'Дана: ранний рейс подтверждён, полоса '+f.runway+' и стоянка доступны. Ненужный второй круг: −4 репутации.':'Разрешение настоящее, но полоса или выход недоступны. Отправьте на второй круг без штрафа.'):'Подписи текущей смены нет. Полоса '+f.runway+' закрыта: на ней техника. Отмените опасный заход.';
 return '<div class="approach-notice '+(safe?'safe-approach':'danger-approach')+'"><h3>Внешний заход · рейс '+f.id+'</h3><p>'+details+'</p><p>До касания <b data-approach-time="'+f.id+'">'+Math.ceil((1-f.progress)*28)+'</b> с · на второй круг ещё <b data-approach-window="'+f.id+'">'+Math.max(0,Math.ceil((.82-f.progress)*28))+'</b> с</p><div class="evidence-actions"><button data-evidence-id="'+f.id+'" data-evidence-command="Сверить журнал">Сверить журнал</button>'+(f.earlyApproach?'<button data-evidence-id="'+f.id+'" data-evidence-command="Принять заход" '+(f.earlyAccepted?'disabled':'')+'>'+(f.earlyAccepted?'Заход принят':'Принять заход')+'</button>':'')+'<button data-quick-goaround="'+f.id+'">Рейс '+f.id+' · второй круг</button></div></div>';
}
function episodeTwoPanel(){
 const approaches=externalApproaches(),replay=flights.find(f=>!f.done&&f.replayPending),threat=approaches[0]||replay;
 const hint=airport.finalReady?'404 подтверждён. Остальные контакты разобраны. Разрешите финальную посадку.':airport.wave===1?'Сначала медицинский 39. Камера отличит ЭХО 42 от настоящего 404. Проверьте аварийный запрос 35; у 73 срочность подтверждена.':airport.wave===2?'Посадки конкурируют с вылетом 62. Проверяйте документы и подпись требования изоляции.':'Подтверждённые ранние заходы можно принимать. Поддельные команды отменяйте. Сверяйте журнал и состояние полосы.';
 const alert=(approaches.length?'<div class="approach-stack">'+approaches.map(externalApproachPanel).join('')+'</div>':'')+(replay?'<p class="danger-text">Рейс '+replay.id+': старый пакет. До начала захода <b data-replay-time>'+Math.max(0,Math.ceil(replay.replayDeadline-airport.time))+'</b> с.</p><div class="evidence-actions"><button data-evidence-id="'+replay.id+'" data-evidence-command="Сверить журнал">Сверить журнал</button><button data-evidence-id="'+replay.id+'" data-evidence-command="Отменить разрешение">Отменить разрешение</button></div>':'');
 return '<section class="episode-two-console '+(approaches.some(f=>!f.earlyApproach)||replay?'critical':'')+'"><div><span class="eyebrow">ГЛАВА 02 · ВОЛНА '+airport.wave+' ИЗ 3</span>'+(alert||'<h2>'+(airport.finalReady?'Финальная посадка · 404':'Управление потоком')+'</h2><p>'+hint+'</p>')+(threat&&pending?'<div class="intercept-confirm"><strong>'+pending.code+' → '+pending.action+'</strong>'+(pending.warning?'<p>'+pending.warning+'</p>':'')+'<button data-action="confirm">ОК · Подтвердить</button><button data-action="cancel">Отмена</button></div>':'')+'</div><div class="signal-summary"><b>КОНТАКТЫ</b><span>'+handled+' / '+airport.target+'</span><small>Включая ложные отметки</small>'+(!oldRecord?'<button data-action="old-record">Запись аварии</button>':'')+'</div></section>';
}
function refreshEpisodeTwo(){
 if(chapter<2)return;
 for(const el of document.querySelectorAll('[data-approach-time],[data-approach-window]')){const plane=flights.find(f=>f.id===Number(el.dataset.approachTime||el.dataset.approachWindow));if(plane)el.textContent=Math.max(0,Math.ceil(((el.dataset.approachWindow !== undefined ? .82 : 1)-plane.progress)*28))}
 const f=externalApproaches()[0],replay=flights.find(f=>!f.done&&f.replayPending);
 const time=document.querySelector('[data-intercept-time]'),windowLeft=document.querySelector('[data-intercept-window]');
 if(time&&f)time.textContent=Math.ceil((1-f.progress)*28);
 if(windowLeft&&f)windowLeft.textContent=Math.max(0,Math.ceil((.82-f.progress)*28));
 for(const el of document.querySelectorAll('[data-replay-time]'))if(replay)el.textContent=Math.max(0,Math.ceil(replay.replayDeadline-airport.time));
 for(const el of document.querySelectorAll('[data-goaround]')){const plane=flights.find(f=>f.id===Number(el.dataset.goaround));if(plane)el.textContent=Math.ceil((1-plane.progress)*22)}
}
function prepareChannelRelease(){
 if(chapter!==3||paused||ended)return 'Освободить канал можно во время третьей смены.';
 pending={kind:'channel',code:'АРХИВ',action:'Освободить резервный канал'};render();return 'Освобождение канала подготовлено. Подтвердите ОК.';
}
function episodeThreePanel(){
 const intruder=externalApproaches()[0],replay=flights.find(f=>!f.done&&f.replayPending),radio=flights.find(f=>!f.done&&f.radioBlocked);
 const titles=['Дойти до архива','Найти оригинал','Передать доказательства'];
 let alert='';
 if(intruder)alert='<div class="approach-stack">'+externalApproaches().map(externalApproachPanel).join('')+'</div>';
 else if(replay)alert='<h3>Старое разрешение · рейс '+replay.id+'</h3><p>Экипаж начнёт заход через <b data-replay-time>'+Math.max(0,Math.ceil(replay.replayDeadline-airport.time))+'</b> с. Сверьте журнал и отмените старый пакет.</p><div class="evidence-actions"><button data-evidence-id="'+replay.id+'" data-evidence-command="Сверить журнал">Сверить журнал</button><button data-evidence-id="'+replay.id+'" data-evidence-command="Отменить разрешение">Отменить разрешение</button></div>';
 else if(radio)alert='<h3>Нет связи · рейс '+radio.id+'</h3><p>Помехи на основной частоте. Нужна резервная связь: настройка занимает 6 секунд. '+(airport.transmission.state==='sending'?'Резервный канал занят архивом. Дождитесь передачи или освободите канал.':'Канал свободен. Настройте резервную частоту, затем разрешите посадку.')+'</p><button data-evidence-id="'+radio.id+'" data-evidence-command="Резервная частота">Рейс '+radio.id+' · резервная частота</button>';
 const tasks=['Медицинский 64 — первым. Вылет 35 использует те же полосы. Следите за чужим разрешением рейсу 43. После потока спокойно проверим камеры архива.','Рейсу 56 нужны аварийная команда и полоса 1. Срочный 72 ждёт посадку. Сравнивайте документы подозрительных бортов: требование изоляции может быть ложным.','Сохраните связь с рейсом 91, отмените старый пакет для 86, отправьте 96 на вылет. Копия архива при необходимости будет передана после рейсов.'];
 const tx=airport.transmission,txLabels={'not-started':'Ещё не начата',sending:'Идёт передача',paused:'Приостановлена до завершения рейсов',sent:'Внешний центр подтвердил получение',lost:'Запись потеряна при прерывании'};
 const additionalReplay=intruder&&replay?'<p class="danger-text">Одновременно: рейс '+replay.id+' получил старый пакет. До захода <b data-replay-time>'+Math.max(0,Math.ceil(replay.replayDeadline-airport.time))+'</b> с.</p><div class="evidence-actions"><button data-evidence-id="'+replay.id+'" data-evidence-command="Сверить журнал">Рейс '+replay.id+' · сверить журнал</button><button data-evidence-id="'+replay.id+'" data-evidence-command="Отменить разрешение">Отменить старое разрешение</button></div>':'';
 const secondary=additionalReplay+(radio&&(intruder||replay)?'<p class="danger-text">Одновременно: рейс '+radio.id+' не слышит основную частоту. Восстановите резервную связь до посадки.</p>':'');
 const archive=airport.wave===3?'<div class="archive-transfer"><b>АРХИВ · '+txLabels[tx.state]+'</b><p>'+(tx.state==='sending'?'Осталось <strong data-transfer-time>'+Math.ceil(tx.remaining)+'</strong> с · резервный канал занят.':tx.state==='paused'?'Резервный канал доступен самолёту. Передача возобновится автоматически.':'')+'</p><small>'+(airport.backupSaved?'Резервная копия сохранена.':'Резервной копии нет: прерывание потеряет запись.')+'</small>'+(tx.state==='sending'?'<button data-channel-release>Освободить канал для самолёта → ОК</button>':'')+'</div>':'';
 return '<section class="episode-two-console episode-three-console '+(intruder&&!intruder.earlyApproach||replay||radio?'critical':'')+'"><div><span class="eyebrow">03 / ПОСЛЕДНЯЯ ЗАПИСЬ · ЭТАП '+airport.wave+' ИЗ 3</span><h2>'+titles[airport.wave-1]+'</h2><ol class="mission-steps">'+titles.map((t,i)=>'<li class="'+(airport.wave===i+1?'current':airport.wave>i+1?'complete':'')+'">'+(i+1)+'. '+t+'</li>').join('')+'</ol>'+ '<div class="third-situation"><div>'+(alert||'<p>'+tasks[airport.wave-1]+'</p>')+secondary+'</div>'+archive+'</div>'+(pending?'<div class="intercept-confirm"><strong>'+pending.code+' → '+pending.action+'</strong>'+(pending.warning?'<p class="danger-text">'+pending.warning+'</p>':'')+'<button data-action="confirm">ОК · Подтвердить</button><button data-action="cancel">Отмена</button></div>':'')+'</div></section>';
}
function episodeThreeEvidence(f){
 if(chapter!==3)return '';
 if(f.caseType==='hydraulic')return '<div class="special-flight"><b>НЕИСПРАВНОСТЬ ШАССИ</b><p>'+(f.safetyReady?(f.phase==='holding'?'Команда готова. Нужна посадка на полосу 1.':'Посадка на подготовленную полосу 1 разрешена.'):airport.runwayPreparation?'Подготовка полосы 1: <b data-preparation-time>'+Math.ceil(airport.runwayPreparation.remaining)+'</b> с.':'Подготовьте полосу 1 (10 с). Затем разрешите посадку именно на неё.')+'</p>'+(!f.done&&f.phase==='holding'?'<div class="evidence-actions"><button data-command="Подготовить полосу">Подготовить полосу</button><button data-emergency-landing="'+f.id+'">Посадка · полоса 1</button></div>':'')+'</div>';
 if(f.caseType==='radio')return '<div class="special-flight"><b>РЕЗЕРВНАЯ СВЯЗЬ</b><p>'+(airport.radioSwitch?'Настройка: <b data-radio-time>'+Math.ceil(airport.radioSwitch.remaining)+'</b> с.':f.radioBlocked?'Основная частота недоступна. Сначала переключите борт на резерв.':'Связь подтверждена. Можно давать посадку.')+'</p>'+(!f.done&&f.radioBlocked?'<button data-command="Резервная частота">Резервная частота</button>':'')+'</div>';
 return '';
}
function refreshEpisodeThree(){
 if(chapter!==3)return;
 for(const [selector,value] of [['[data-transfer-time]',airport.transmission.remaining],['[data-preparation-time]',airport.runwayPreparation?.remaining],['[data-radio-time]',airport.radioSwitch?.remaining]])for(const el of document.querySelectorAll(selector))if(value!==undefined)el.textContent=Math.ceil(value);
}
function chapterPanel(){return chapter===2?episodeTwoPanel():chapter===3?episodeThreePanel():''}
function inspectApproach(){
 if(chapter!==2||approach==='normal'||paused||ended)return 'Камера подхода пока не нужна.';
 approach='verified';
 const result=airport.command(42,'Камера');
 log=result.message;
 render();return log;
}
function listenRecord(){
 if(chapter!==2||paused||ended)return 'Запись доступна во время второй смены.';
 oldRecord=true;
 timur='Это мой голос. Я не давал разрешения на посадку. Я знал, что сегодня кто-то придёт за оригиналом, но думал, что это Орлов.';
 render();return 'На записи молодой Тимур разрешает посадку, затем слышен сигнал столкновения. Для посадки отдельно проверьте документы борта 404.';
}
function archiveCameraViews(){
 return '<div class="archive-cameras"><figure><div class="archive-feed"><div class="archive-door">А</div><span class="archive-speaker" aria-hidden="true">▤</span></div><figcaption>Дверь А · никого нет. Работает динамик.</figcaption></figure><figure><div class="archive-feed"><div class="archive-door">Б</div><div class="archive-timur" aria-hidden="true"></div></div><figcaption>Дверь Б · Тимур ждёт у двери.</figcaption></figure></div>';
}
let airport=new window.SkyflowSimulation.Airport(flightData,{dynamic:window.SKYFLOW_DYNAMIC!==false});let flights=airport.flights;let resourceRunway=null,resourceGate=null;
let screen='start',selected=12,pending=null,paused=false,handled=0,score=0,reputation=100,elapsed=0,level=1,ended=false,log='Резервный центр не отвечает. Пока работаем самостоятельно. Дана, первый борт уже на подходе.',timur='Скажите «рейс двадцать три, проверка» и подтвердите ОК. Мне нужно 12 секунд. Проверяю по одному: у меня всего две руки и один кофе.',lastTick=Date.now(),anim=0;
const $=s=>document.querySelector(s);
function shiftClock(){
 const seconds=137*60+Math.floor((chapterClockOffset+airport.time)*12);
 return [Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60].map(value=>String(value).padStart(2,'0')).join(':');
}
function clockLabel(){
 return shiftClock()+(screen==='game'?(ended?' · Смена завершена':paused?' · Пауза':''):'');
}function top(){return `<header class="top"><div class="brand">${screen==='game'?'<span class="brand-name">TOWER <b>404</b></span>':''} <span class="brand-caption">НОЧНАЯ ДИСПЕТЧЕРСКАЯ</span></div><div class="top-right mono"><span class="hide">АЭРОПОРТ СЕВЕРНЫЙ</span><span><i class="dot"></i>НОЧНАЯ СМЕНА</span><span class="amber" id="shift-clock">${clockLabel()}</span></div></header>`}
const dialogue=new window.SkyflowDialogue.Dialogue();const crew=new window.SkyflowDialogue.Crew({classic:true});let lastLines={dana:log,timur},speechBlip=0;
const escapeText=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function syncDialogue(){
 for(const [who,text]of Object.entries({dana:log,timur})){if(lastLines[who]!==text){lastLines[who]=text;dialogue.say(who,text)}}
 dialogue.invalidate(item=>{if(!item.topic)return false;if(item.topic.startsWith('approach:'))return !flights.some(f=>'approach:'+f.id===item.topic&&f.earlyApproach&&airport.earlyApproachSafe(f));if(item.topic.startsWith('forged:'))return !flights.some(f=>'forged:'+f.id===item.topic&&f.phase==='unauthorized');const r=airport.runways.find(r=>'runway:'+r.id===item.topic);if(!r)return false;return /закрыта|временно закрыта/i.test(item.text)&&!r.closed||/снова открыта|полоса \d открыта|расчищена и открыта/i.test(item.text)&&r.closed});
}
function animateSpeech(){if(tutorial.active){document.querySelectorAll('.speaking').forEach(el=>el.classList.remove('speaking'));return}document.querySelectorAll('[data-speaker]').forEach(el=>{const item=dialogue.visible(el.dataset.speaker),box=el.parentElement;box.classList.toggle('speaking',!!item);if(!item){el.textContent='';el.classList.remove('talking');return}const count=Math.min(item.text.length,Math.floor(item.age*48));el.textContent=item.text.slice(0,count);el.classList.toggle('talking',count<item.text.length)})}
function dialogueJournal(){return dialogue.history.map(e=>`<p><span class="mint mono">${Math.floor(e.time)} с · ${e.who==='dana'?'Дана':'Тимур'}</span> ${escapeText(e.text)}</p>`).join('')||'<p>Сообщений пока нет.</p>'}
const tutorial=new window.SkyflowTutorial.Tutorial();
function tutorialSeen(){try{return localStorage.getItem('tower404-tutorial')==='done'}catch{return false}}
function beginTutorial(){close();reset();screen='game';paused=true;tutorial.start();window.skyflowAudio?.ambience(false);render()}
function finishTutorial(){tutorial.stop();try{localStorage.setItem('tower404-tutorial','done')}catch{}close();reset();screen='game';render()}
function tutorialInput(input){
 if(input.type==='audio')return setAudioPreference(input.action)||'Звук недоступен.';
 if(input.type==='navigation'&&input.action==='exit'){tutorial.stop();action('exit');return 'Обучение закрыто.'}
 if(input.type==='navigation'&&input.action==='skipTutorial'){finishTutorial();return 'Обучение пропущено. Смена началась.'}
 if(input.type==='navigation'&&input.action==='tutorial'){beginTutorial();return 'Обучение начато заново.'}
 if(input.type==='navigation'&&['next','resume'].includes(input.action)||input.type==='gesture'&&input.action==='confirm'&&tutorial.step.next){tutorial.next();if(!tutorial.active)finishTutorial();else render();return 'Дальше.'}
 const expected=tutorial.step.expect;
 if(input.type==='gesture'&&input.action==='cancel'){
  if(pending){pending=null;tutorial.index=expected==='confirmInspection'?7:4;render();return 'Учебный приказ отменён. Подготовьте его ещё раз.'}
  return 'Чтобы выйти, скажите «пропустить обучение» или «главное меню».';
 }
 if(input.type==='select'&&input.id===12&&expected==='select'){selected=12;tutorial.accept('select');render();return 'Выбран рейс 12.'}
 if(input.type==='select'&&input.id===23&&expected==='inspection'){selected=23;render();return 'Теперь скажите «проверка».'}
 if(input.type==='command'&&((expected==='landing'&&(input.id??selected)===12&&input.command==='Посадка')||(expected==='inspection'&&(input.id??selected)===23&&input.command==='Проверка'))){
  selected=expected==='landing'?12:23;const f=flights.find(f=>f.id===selected);pending={id:f.id,code:f.code,action:input.command};tutorial.accept(expected);render();return 'Учебный приказ подготовлен. Покажите ОК.';
 }
 if(input.type==='gesture'&&input.action==='confirm'&&['confirmLanding','confirmInspection'].includes(expected)){pending=null;tutorial.accept(expected);render();return 'Учебный приказ подтверждён.'}
 return tutorial.step.next?'Скажите «дальше» или покажите ОК.':'Выполните подсказку Даны. Можно сказать «пропустить обучение».';
}
function drawTutorial(){
 document.querySelector('.tutorial-layer')?.remove();if(!tutorial.active)return;
 const step=tutorial.step,layer=document.createElement('div');layer.className='tutorial-layer';
 layer.innerHTML=`<div class="tutorial-shade"></div><div class="tutorial-focus"></div><section class="tutorial-card" role="dialog" aria-label="Обучение с Даной"><div class="tutorial-guide"><img id="tutorial-dana" class="tutorial-portrait" src="assets/dana-tutorial-v15.png" alt="Дана — наставница в обучении" width="256" height="256"><div><div class="eyebrow">ДАНА СОКОЛОВА · ${tutorial.index<2?'ВСТУПЛЕНИЕ':'ОБУЧЕНИЕ'}</div><small>${tutorial.index+1} / ${window.SkyflowTutorial.steps.length} · Время остановлено</small></div></div><h2>${step.title}</h2><p>${step.text}</p><div class="buttons">${step.next?`<button class="primary" data-tutorial-next>${step.next} · ОК</button>`:'<span class="tutorial-hint">Выполните действие на подсвеченном объекте</span>'}<button data-tutorial-skip>Пропустить обучение</button></div><small>Голос: «дальше», «пропустить обучение», «главное меню»</small></section>`;
 document.body.append(layer);layer.querySelector('[data-tutorial-next]')?.addEventListener('click',()=>tutorialInput({type:'navigation',action:'next'}));layer.querySelector('[data-tutorial-skip]').addEventListener('click',finishTutorial);
 positionTutorial(true);
}
function positionTutorial(scroll=false){
 if(!tutorial.active)return;const layer=document.querySelector('.tutorial-layer');if(!layer)return;
 const step=tutorial.step,card=layer.querySelector('.tutorial-card'),focus=layer.querySelector('.tutorial-focus'),shade=layer.querySelector('.tutorial-shade'),target=step.target?document.querySelector(tutorial.index===7&&selected===23?'[data-command="Проверка"]':step.target):null;
 if(scroll)target?.scrollIntoView?.({block:window.innerWidth<650?'start':'center',behavior:'instant'});
 const vw=window.innerWidth,vh=window.innerHeight;
 if(!target){focus.style.display='none';shade.style.clipPath='none';card.style.left='50%';card.style.top='50%';card.style.bottom='auto';card.style.transform='translate(-50%,-50%)';return}
 let r=target.getBoundingClientRect();if(step.region){const [x,y,w,h]=step.region;r={left:r.left+r.width*x,top:r.top+r.height*y,width:r.width*w,height:r.height*h}}
 const left=Math.max(4,r.left-6),top=Math.max(4,r.top-6),right=Math.min(vw-4,r.left+r.width+6),bottom=Math.min(vh-4,r.top+r.height+6);
 focus.style.cssText=`left:${left}px;top:${top}px;width:${right-left}px;height:${bottom-top}px`;
 shade.style.clipPath=`polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${left}px ${top}px,${right}px ${top}px,${right}px ${bottom}px,${left}px ${bottom}px,${left}px ${top}px)`;
 card.style.transform='none';const cw=Math.min(440,vw-24),ch=Math.min(card.offsetHeight,vh-24);
 let x=right+16+cw<vw?right+16:left-16-cw>0?left-16-cw:vw-cw-12;
 let y=bottom+16+ch<vh?bottom+16:top-16-ch>0?top-16-ch:12;
 card.style.left=Math.max(12,x)+'px';card.style.top=Math.max(12,Math.min(y,vh-ch-12))+'px';card.style.bottom='auto';
}
window.addEventListener?.('resize',()=>positionTutorial());window.addEventListener?.('scroll',()=>positionTutorial(),true);
function render(){syncDialogue();const journalOpen=!!document.querySelector('.event-log[open]');app.innerHTML=top()+(screen==='game'?game():screen==='chapter-intro'?episodeTwoIntro():screen==='prologue'?prologue():hero());if(screen==='game'){drawPortrait('dana','dana');drawPortrait('timur','timur');animateSpeech()}bind();if(journalOpen)document.querySelector('.event-log')?.setAttribute('open','');drawTutorial()}

let prologueStep=0,prologueAge=0;
const comicPages=['assets/comic-night-pixel-v6.png','assets/comic-signal-pixel-v6.png'];
const comicPreloads=typeof Image!=='undefined'?comicPages.map(src=>{const image=new Image();image.src=src;return image}):[];
const comicPanels=[
 {title:'02:13 · Северный',caption:'Обычная ночная смена.',lines:[]},
 {title:'Диспетчерская',lines:[['Дана','Сколько там до конца смены?'],['Тимур','Если часы не врут — целая вечность.']]},
 {title:'02:15 · Системное оповещение',alarm:true,caption:'ПРИКАЗ №404',lines:[['Система','Немедленная эвакуация всего персонала аэропорта.']]},
 {title:'Что-то не так',lines:[['Дана','Эвакуация? Из-за чего?!'],['Тимур','В журнале нет отправителя…']]},
 {title:'Связь потеряна',caption:'Коридоры пустеют. Резервный центр молчит.',lines:[]},
 {title:'SF 012 · В эфире',lines:[['Пилот','Северный, запрашиваем разрешение на посадку. Приём…']]},
 {title:'Мы остаёмся',lines:[['Дана','В воздухе ещё несколько бортов.'],['Тимур','Значит, будем принимать. Вдвоём.']]},
 {title:'Неизвестная частота',signal:true,lines:[['Неизвестный','Башня 404… Не доверяйте приказу. Узнайте, кто за этим стоит…']]}
];
const storyDurations=[1.5,3.5,2.5,3,1.5,3,4.5];
function tickStory(dt){if(screen==='chapter-intro'){tickEpisodeTwoIntro(dt);return}if(screen!=='prologue')return;prologueAge+=dt;const duration=storyDurations[prologueStep];const bar=document.querySelector('.story-timer');if(bar)bar.style.width=Math.min(100,(storyDurations.slice(0,prologueStep).reduce((sum,n)=>sum+n,0)+prologueAge)/storyDurations.reduce((sum,n)=>sum+n,0)*100)+'%';if(prologueAge>=duration){prologueAge=0;if(prologueStep<6){prologueStep++;render()}else action('begin-shift')}}

const prologueScenes=[
 ['02:13 · Аэропорт «Северный»','Обычная ночная смена. За окнами мокрая полоса, на радаре — несколько бортов. В диспетчерской остались Дана и Тимур.'],
 ['Дана и Тимур','Дана: «Сколько там до конца смены?» Тимур: «Если часы не врут — целая вечность». Через две минуты всё изменится.'],
 ['02:15 · Приказ №404','На терминалах появляется приказ: немедленно эвакуировать персонал аэропорта. Подтверждение администрации есть. Имени отправителя — нет.'],
 ['Без отправителя','Дана: «Эвакуация? Из-за чего?!» Тимур: «Сейчас проверю… Странно. В журнале нет отправителя».'],
 ['Пустые коридоры','Один за другим сотрудники перестают выходить на связь. Резервный центр молчит. Но в воздухе всё ещё самолёты.'],
 ['SF 012 · Запрос на посадку','«Северный, рейс SF-012. Запрашиваем разрешение на посадку. Приём…» Дана и Тимур решают остаться: кто-то должен принять борты.'],
 ['Неизвестная частота','«Башня 404… если вы меня слышите… не доверяйте приказу. Узнайте, кто за этим стоит…» Сигнал обрывается. До рассвета вы отвечаете за каждый борт.']
];
function prologue(){const active=prologueStep<6?prologueStep:7;return `<section class="prologue comic-reader single-page-comic sequential-comic"><header class="prologue-heading"><div><div class="eyebrow">TOWER <b>404</b> / ПРОЛОГ</div><h1>Последняя смена</h1></div><button data-action="skip-prologue">Пропустить · 👌</button></header><div class="comic-page">${comicPanels.map((p,i)=>{const page=Math.floor(i/4),cell=i%4,revealed=i<=active,focused=i===active||(active===7&&i===6);return `<article class="story-panel ${revealed?'revealed':'unrevealed'} ${focused?'current':''} ${p.alarm?'alarm-panel':''} ${p.signal?'signal-panel':''}"><div class="panel-illustration" style="background-image:url('${comicPages[page]}');background-position:${cell%2?'100%':'0%'} ${cell>1?'100%':'0%'}" role="img" aria-label="${p.title}"></div><small class="panel-kicker">${p.title}</small><div class="panel-dialogue">${p.caption?'<p class="comic-narration">'+p.caption+'</p>':''}${p.lines.map(([who,text])=>'<div class="comic-bubble '+(who==='Тимур'?'timur-bubble':'')+'"><b>'+who+'</b><p>'+text+'</p></div>').join('')}</div></article>`}).join('')}</div><div class="story-timeline"><div class="story-timer"></div></div><p class="story-hint">Кадры и диалоги появляются по очереди · 👌 начать смену сейчас · 👎 в меню</p></section>`}

function hero(){return `<section class="hero"><div class="hero-copy"><div class="eyebrow">Сюжетная стратегия / pixel edition</div><h1>Последние<br><em>в башне.</em></h1><p>В башне остались только двое.<br>Связь с резервным центром потеряна.<br>А самолёты всё ещё просят посадку.</p>${screen==='start'?`<div class="buttons"><button class="primary" data-action="menu">Войти в диспетчерскую ↗</button><button data-action="about">О проекте</button></div>`:`<div class="menu-list"><button class="primary" data-action="prologue">01 &nbsp; Начать смену <span>↗</span></button><button data-action="prologue">Пролог · Последняя смена <span>→</span></button><button data-action="tutorial">Обучение с Даной <span>→</span></button><button data-action="how">Как играть <span>→</span></button><button data-action="chapters">Эпизоды <small>3 главы</small></button><button data-action="settings">Настройки <span>⚙</span></button></div>`}<div class="hero-foot mono"><span>01 — ПОСЛЕДНИЕ В БАШНЕ</span><span>02:17 — 06:00</span></div><div class="chapter"><span>Голос задаёт распоряжение</span><span class="mint">01</span></div><div class="chapter"><span>Жест подтверждает решение</span><span class="mint">02</span></div></div><div class="hero-art brand-art"><img class="tower-logo" src="assets/tower-404-logo.jpeg" alt="Tower 404 — диспетчерская башня и самолёт на фоне луны" width="1254" height="1254" fetchpriority="high" decoding="async"></div></section><div class="screen-footer mono">ВЕРСИЯ 0.16 · ГЛАВА 3: ПОСЛЕДНЯЯ ЗАПИСЬ · ВКЛЮЧИТЕ ГОЛОС И КАМЕРУ В ПАНЕЛИ НИЖЕ</div>`}
function game(){if(flights.find(x=>x.id===selected)?.done)selected=flights.find(x=>!x.done)?.id||selected;let f=flights.find(x=>x.id===selected)||flights[0];return `<div class="shell ${chapter===2&&approach!=='normal'?'emergency-light':''}"><div class="brief"><div><div class="eyebrow">${chapter>1?'ГЛАВА 0'+chapter+' · '+chapters[chapter].title+' / ':''}Нагрузка 0${airport.stage} / ${['Последние в башне','Растущий поток','Час пик'][airport.stage-1]}</div><h1>${chapter===2?'Отличить борты от подставных сигналов':chapter===3?'Вывести рейсы и сохранить доказательства':'Удержать аэропорт до рассвета'}</h1></div><div class="stats"><div class="stat"><small>РЕЙСЫ</small><strong>${handled} / ${airport.target}</strong></div><div class="stat"><small>РЕПУТАЦИЯ</small><strong class="mint">${reputation}%</strong></div><div class="stat"><small>ОЧКИ</small><strong>${score.toString().padStart(4,'0')}</strong></div><button data-action="pause">Ⅱ Пауза</button></div></div>${chapterPanel()}<div class="workspace tower-workspace"><aside class="panel"><div class="panel-head"><span>ОЧЕРЕДЬ РЕЙСОВ</span><span class="mint">${flights.filter(x=>!x.done).length}</span></div><div class="flights">${flights.filter(x=>!x.done).map(x=>`<div class="flight ${x.id===selected?'active':''}" data-flight="${x.id}"><div class="flight-line"><span class="flight-name">${x.code}</span><span class="tag ${x.risk?'warn':''}">${(x.urgent||x.claimedEmergency)&&!x.done?'СРОЧНЫЙ · ':x.risk&&!x.done?'ПРОВЕРКА · ':''}${x.caseType==='witness'&&!airport.finalReady?'ОТДЕЛЬНЫЙ СЕКТОР':(x.earlyApproach?'Ранний заход':window.SkyflowSimulation.labels[x.phase])}</span></div><small>${x.route}</small><div class="fuel"><div data-fuel-bar="${x.id}" style="width:${Math.ceil(fuelReading(x))}%;background:${fuelReading(x)<40?'var(--amber)':'var(--mint)'}"></div></div><div class="flight-line" style="margin:8px 0 0"><small>ТОПЛИВО</small><small data-fuel="${x.id}">${fuelText(x)}</small></div></div>`).join('')}</div></aside><section class="panel"><div class="panel-head"><span>ВИД ИЗ БАШНИ / СЕКТОР 04</span></div><div class="map-wrap"><canvas id="airport" width="1280" height="720"></canvas><div class="crew-nameplates"><span>Дана Соколова</span><span>${timurAway()?'Тимур · рация':'Тимур Асанов'}</span></div><div class="map-label mono">N ↑ &nbsp; 54° 12′ / 69° 23′</div><div class="bottom crew-near"><section class="panel character dana-active"><canvas class="portrait" id="dana" width="38" height="44"></canvas><div><div class="eyebrow">ДАНА · УПРАВЛЕНИЕ ДВИЖЕНИЕМ</div><h3>Дана Соколова</h3><p class="speech" data-speaker="dana"></p><small>«рейс двенадцать, посадка» → 👌 · опасное решение требует второго 👌</small></div></section><section class="panel character ${airport.inspection?'working':'timur-active'}">${timurAway()?'<span class="empty-timur-chair" role="img" aria-label="Пустое кресло Тимура"></span>':'<canvas class="portrait" id="timur" width="38" height="44"></canvas>'}<div><div class="eyebrow amber">ТИМУР · БЕЗОПАСНОСТЬ</div><h3>${timurAway()?'Тимур · рация':'Тимур Асанов'}</h3><p class="speech" data-speaker="timur"></p><small id="check-progress">${airport.inspection?'Осталось '+Math.ceil(airport.inspection.remaining)+' с':'«рейс двадцать три, проверка» → 👌'}</small></div></section></div></div><div class="runway-strip" aria-label="Состояние полос">${airport.runways.map(r=>`<span data-runway-status="${r.id}">${runwayText(r)}</span>`).join("")}</div><div class="forecast"><span class="eyebrow">ПРОГНОЗ</span><div><strong class="mint" id="live-load">Нагрузка ${airport.forecast().load}%</strong><p><span id="live-wait">Ожидание ~${airport.forecast().seconds} с</span> · ясно · ветер 3 м/с<br>Расчёт по очереди и занятости полос.</p></div></div></section><aside class="panel right-panel"><div class="panel-head"><span>КАРТОЧКА РЕЙСА</span><span>↗</span></div><div class="detail"><div class="eyebrow">ВЫБРАННЫЙ БОРТ</div><h2>${f.code}</h2><div class="route">${f.route}</div><div class="kv"><span class="muted">Тип</span><span>Пассажирский</span></div><div class="kv"><span class="muted">Топливо</span><span class="${f.fuel<40?'amber':'mint'}" data-fuel="${f.id}">${fuelText(f)}</span></div><div class="kv"><span class="muted">Проверка</span><span>${f.checking?'ТИМУР ПРОВЕРЯЕТ':f.checked?'Завершена':'Не запрошена'}</span></div><div class="kv"><span class="muted">Состояние</span><span>${(f.earlyApproach?'Ранний подтверждённый заход':window.SkyflowSimulation.labels[f.phase])}</span></div><div class="kv"><span class="muted">Выбор полосы / выхода</span><span>${resourceRunway||'авто'} / ${resourceGate||'авто'}</span></div><div class="kv"><span class="muted">Назначено</span><span>${f.runway||'—'} / ${f.gate||'—'}</span></div><p class="note">${f.done?f.status||'Рейс завершён.':f.status}</p>${airport.runways.some(r=>r.wreck&&!r.recovery)?`<button class="emergency-call" data-emergency>Вызвать спасателей и расчистить полосу</button><small>Тушение, эвакуация и расчистка — 75 с.</small>`:""}<details class="runway-choice"><summary>Полоса: ${resourceRunway||"автоматически"}</summary><p>Автоматически — выбрать свободную. Вручную — назначить конкретную полосу.</p><div class="resource-controls"><button data-runway="1">1</button><button data-runway="2">2</button><button data-runway="0">Авто</button></div></details><div class="commands"><button data-command="Посадка" ${f.done?'disabled':''}>↓ Посадка</button><button data-command="Взлёт" ${f.done?'disabled':''}>↑ Взлёт</button><button data-command="Проверка" ${f.done?'disabled':''}>⌕ Проверка</button><button data-command="Ожидание" ${f.done?'disabled':''}>◷ Ожидание</button>${['landing','unauthorized'].includes(f.phase)?'<button class="wide goaround-button" data-command="Второй круг">↗ Второй круг</button>':''}<button class="wide" data-command="Изолированная стоянка" ${f.done?'disabled':''}>Изолированная стоянка</button></div>${pending?`<div class="pending"><div class="eyebrow amber">ПОДТВЕРДИТЕ РАСПОРЯЖЕНИЕ</div><p>${pending.code} → ${pending.action}</p>${pending.warning?`<p class="danger-text">${pending.warning}</p>`:''}<button data-action="confirm">👌 Подтвердить</button> <button data-action="cancel">👎 Отмена</button></div>`:''}${chapter>=2?episodeTwoEvidence(f):''}</div></aside></div><details class="event-log panel"><summary>История смены · ожидается ещё ${airport.target-flights.length} рейсов</summary>${dialogueJournal()}</details><div class="channel mono"><span>◉ ГОЛОС + ▣ КАМЕРА <b>СТАТУС В ПАНЕЛИ НИЖЕ</b></span><span>РЕЙС ДВЕНАДЦАТЬ → ПОСАДКА → ЖЕСТ 👌</span></div></div>`}
function setAudioPreference(action,value){const result=window.skyflowAudio?.setting(action,value);refreshAudioSettings();return result}
function audioPreferences(){return window.skyflowAudio?.preferences?.()||{enabled:true,volume:.18,musicEnabled:true,musicVolume:.45}}
function showAudioSettings(){
 if(screen==='game'){paused=true;window.skyflowAudio?.syncEngines?.([],false);window.skyflowAudio?.ambience(false)}
 const p=audioPreferences();
 modal('НАСТРОЙКИ','Звук и музыка','<div class="music-settings"><div class="music-setting-row"><div><strong>Пульс башни</strong><p>Живая электроника без вокала. Свой ритм для вступлений и смены.</p></div><button data-audio-setting="music-toggle" aria-pressed="'+p.musicEnabled+'">'+(p.musicEnabled?'Выключить музыку':'Включить музыку')+'</button></div><label for="music-volume">Громкость музыки <output id="music-level">'+Math.round(p.musicVolume*100)+'%</output></label><input id="music-volume" data-music-volume type="range" min="0" max="100" step="5" value="'+Math.round(p.musicVolume*100)+'"><p class="music-hint">С ростом нагрузки ритм ускоряется. Во время реплик музыка тише. Настройки сохраняются.</p><p id="music-status" role="status">'+(!p.enabled?'Общий звук выключен.':p.musicEnabled?'Музыка включена.':'Музыка выключена; сигналы и двигатели остаются.')+'</p></div><div class="audio-effects"><strong>Общая громкость: <span id="sound-level">'+Math.round(p.volume*100)+'%</span></strong><div class="buttons"><button data-audio-setting="quieter">Тише</button><button data-audio-setting="louder">Громче</button><button data-audio-toggle data-audio-setting="'+(p.enabled?'mute':'unmute')+'">'+(p.enabled?'Выключить весь звук':'Включить весь звук')+'</button></div></div><p class="music-hint">Голосом: «музыка тише», «музыка громче», «выключить музыку». Камера и микрофон включаются в нижней панели.</p>',screen==='game'?'<button data-action="pause">Назад к паузе</button>':'<button data-action="close">Назад</button>');
}
function refreshAudioSettings(){
 const p=audioPreferences(),musicButton=document.querySelector('[data-audio-setting="music-toggle"]'),soundButton=document.querySelector('[data-audio-toggle]');
 if(musicButton){musicButton.textContent=p.musicEnabled?'Выключить музыку':'Включить музыку';musicButton.setAttribute('aria-pressed',String(p.musicEnabled))}
 if(soundButton){soundButton.textContent=p.enabled?'Выключить весь звук':'Включить весь звук';soundButton.dataset.audioSetting=p.enabled?'mute':'unmute'}
 const level=document.querySelector('#music-level'),sound=document.querySelector('#sound-level'),range=document.querySelector('[data-music-volume]'),status=document.querySelector('#music-status');
 if(level)level.textContent=Math.round(p.musicVolume*100)+'%';if(sound)sound.textContent=Math.round(p.volume*100)+'%';if(range)range.value=Math.round(p.musicVolume*100);
 if(status)status.textContent=!p.enabled?'Общий звук выключен.':!p.musicEnabled?'Музыка выключена; сигналы и двигатели остаются.':p.musicVolume===0?'Громкость музыки — 0%.':'Музыка включена.';
}
function bind(){document.querySelectorAll('[data-audio-setting]').forEach(b=>b.onclick=()=>{window.skyflowAudio?.setting(b.dataset.audioSetting);refreshAudioSettings()});document.querySelectorAll('[data-music-volume]').forEach(b=>b.oninput=()=>{window.skyflowAudio?.setting('music-volume',b.value);refreshAudioSettings()});document.querySelectorAll('[data-emergency-landing]').forEach(b=>b.onclick=()=>window.skyflowInput({type:'command',id:Number(b.dataset.emergencyLanding),command:'Посадка',runway:1}));document.querySelectorAll('[data-story-choice]').forEach(b=>b.onclick=()=>chooseEpisodeStory(b.dataset.storyChoice));document.querySelectorAll('[data-channel-release]').forEach(b=>b.onclick=()=>prepareChannelRelease());document.querySelectorAll('[data-evidence-command]').forEach(b=>b.onclick=()=>window.skyflowInput({type:'command',id:Number(b.dataset.evidenceId),command:b.dataset.evidenceCommand}));document.querySelectorAll('[data-quick-goaround]').forEach(b=>b.onclick=()=>window.skyflowInput({type:'command',id:Number(b.dataset.quickGoaround),command:'Второй круг'}));document.querySelectorAll("[data-emergency]").forEach(b=>b.onclick=()=>window.skyflowInput({type:"emergency"}));document.querySelectorAll("[data-runway]").forEach(b=>b.onclick=()=>window.skyflowInput({type:"resource",runway:Number(b.dataset.runway)||null}));document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));document.querySelectorAll('[data-flight]').forEach(b=>b.onclick=()=>window.skyflowInput({type:'select',id:+b.dataset.flight}));document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>window.skyflowInput({type:'command',command:b.dataset.command}))}
function modal(label,title,body,buttons){close();const o=document.createElement('div');o.className='overlay';o.innerHTML=`<section class="modal"><div class="eyebrow">${label}</div>${title?`<h2>${title}</h2>`:''}${body}<div class="buttons">${buttons}</div></section>`;app.append(o);bind()}
function close(){document.querySelector('.overlay')?.remove()}
function action(a){
 if(episodeStory){
  if(a==='exit'){episodeStory=null;close()}
  else if(a==='story-back'){if(episodeStory.choice)episodeStory.choice=null;else episodeStory.step=Math.max(0,episodeStory.step-1);showEpisodeStory();return}
  else if(['story-next','resume','confirm'].includes(a))return advanceEpisodeStory();
  else return 'Разговор на паузе. Дальше — следующая реплика; в меню — выйти.';
 }
if(screen==='chapter-intro'&&['skip-prologue','begin-shift','resume','start'].includes(a)){startEpisodeTwo();return}if(screen==='chapter-intro'&&a==='prologue-next'){nextEpisodeTwoFrame();return}if(a==='approach-camera')return inspectApproach();if(a==='old-record')return listenRecord();if(/^chapter-[123]$/.test(a)){openChapter(Number(a.slice(-1)));return}if(a==='retry-chapter'){openChapter(chapter);return}if(a==='skip-prologue'||a==='begin-shift'){if(screen==='prologue'){beginTutorial();return}tutorial.stop();close();reset();screen='game';render();return}if(a==='prologue'){chapter=1;chapterClockOffset=0;tutorial.stop();close();prologueStep=0;prologueAge=0;screen='prologue';window.skyflowAudio?.ambience(false);render();return}if(a==='prologue-next'){if(prologueStep<6){prologueStep++;render()}else action('begin-shift');return}if(a==='prologue-back'){prologueStep=Math.max(0,prologueStep-1);render();return}if(a==='tutorial'){chapter=1;chapterClockOffset=0;beginTutorial();return}if(tutorial.active&&['confirm','cancel'].includes(a))return tutorialInput({type:'gesture',action:a});if(a==='journal'){modal('ЖУРНАЛ СМЕНЫ','Сообщения диспетчеров',dialogueJournal(),screen==='game'?'<button data-action="resume">Продолжить</button>':'<button data-action="close">Назад</button>');return}if(a!=='confirm')window.skyflowAudio?.play(a==='confirm'?'confirm':a==='cancel'?'cancel':a==='pause'?'pause':a==='resume'?'resume':'select');if(a==='menu'){screen='menu';render();window.scrollTo?.(0,0)}if(a==='start'){if(screen!=='game'&&screen!=='prologue'&&window.SKYFLOW_PROLOGUE!==false){action('prologue');return}if(screen==='prologue'){action('begin-shift');return}if(window.SKYFLOW_TUTORIAL!==false&&!tutorialSeen()){beginTutorial();return}close();reset();screen='game';render()}if(a==='about')modal('TOWER 404 / КОНЦЕПЦИЯ','Двое против неизвестности','<p>Ночной аэропорт. Поддельный приказ об эвакуации. Два диспетчера должны сохранить управление и выяснить, кому можно доверять.</p><p>Авторская пиксельная стратегия. Голосовые распоряжения и подтверждение жестами включаются в панели оборудования.</p>','<button data-action="close">Понятно</button>');if(a==='close')close();if(a==='how')modal('ПОДГОТОВКА К СМЕНЕ','Каждое решение имеет вес','<p>Выберите рейс в очереди. Проверьте сведения, подготовьте распоряжение и подтвердите его. Подозрительные борта сначала проверяйте. Обслужите десять рейсов. Они прибывают тремя волнами. Проверяйте подозрительные борта, срочные сажайте первыми. Закрытия полос временные; свободные ресурсы подбираются автоматически.</p><p>Сейчас управление доступно кнопками для проверки визуального прототипа. Для игры без мыши включите голос и камеру в панели ниже.</p>','<button class="primary" data-action="start">Начать смену</button><button data-action="close">Назад</button>');if(a==='chapters')modal('TOWER 404','Выберите главу','<div class="menu-list"><button data-action="chapter-1">01 · Последние в башне</button><button data-action="chapter-2">02 · Не отвечайте на вызов</button><button data-action="chapter-3">03 · Последняя запись</button></div>','<button data-action="close">Назад</button>');if(a==='settings')showAudioSettings();if(a==='pause'){window.skyflowAudio?.syncEngines?.([],false);window.skyflowAudio?.ambience(false);paused=true;modal('СМЕНА ПРИОСТАНОВЛЕНА','Пауза','<p>Возьмите время, чтобы оценить ситуацию. Самолёты ожидают вашего возвращения.</p>','<button class="primary" data-action="resume">Продолжить</button><button data-action="settings">Звук и музыка</button><button data-action="exit">Главное меню</button><button class="danger" data-action="fail">Экран поражения</button>')}if(a==='resume'){window.skyflowAudio?.ambience(true);paused=false;close();}if(a==='exit'){window.skyflowAudio?.syncEngines?.([],false);window.skyflowAudio?.ambience(false);pending=null;paused=false;screen='menu';render();window.scrollTo?.(0,0)}if(a==='fail'){close();finish(false)}if(a==='cancel'){pending=null;render()}if(a==='confirm')return execute()}
function reset(){episodeStory=null;leraDialogueRead=false;timurReturned=false;approach="normal";oldRecord=false;leraArrived=false;nextChapter=null;airport=chapterAirport();flights=airport.flights;resourceRunway=null;resourceGate=null;for(const f of flights)f.status=chapter===2&&f.id===404?airport.finalLockReason():f.risk?'Позывной отсутствует в расписании':f.kind==='ВЫЛЕТ'?'Готов к вылету':f.kind==='СРОЧНЫЙ'?'Запрошен приоритет посадки':'Данные подтверждены';window.skyflowAudio?.ambience(true);handled=0;score=0;reputation=100;elapsed=0;crew.reset();crew.chapter=chapter;if(chapter<3)crew.idleIndex=1;ended=false;paused=false;pending=null;selected=chapter===2?39:flights[0].id;for(const f of flights){f.done=false;f.checked=false}log='Выберите рейс голосом, задайте приказ и подтвердите ОК. Подозрительные борта сначала проверьте.';timur='';dialogue.reset();lastLines={dana:'',timur:''};syncDialogue()}
function execute(){if(!pending||paused||ended)return;const order=pending;
 if(order.kind==='channel'){
  const result=airport.releaseArchiveChannel({force:!!order.warning});log=result.message;
  if(result.warning){pending.warning=result.message;render();return result.message}
  pending=null;render();return result.message;
 }

 const result=airport.command(order.id,order.action,order);reputation=airport.reputation;handled=flights.filter(f=>f.done).length;log=result.message;
 if(result.warning){pending={...order,force:true,warning:result.message};window.skyflowAudio?.play('error');render();return result.message}
 pending=null;if(result.ok){score+=result.points||0;if(order.action==='Проверка'){log=lastLines.dana;timur='Рейс '+order.id+': начинаю проверку. Нужно 12 секунд.';}window.skyflowAudio?.play('confirm')}else{crew.react({type:'rejected'},airport.time);window.skyflowAudio?.play('error');toast(result.message)}render();return result.message;}
function tickCrew(){const busy=!!(pending||airport.inspection||airport.runways.some(r=>r.wreck)||flights.some(f=>!f.done&&(f.fuel<25||(f.urgent&&f.phase==='holding'&&f.fuel<40)||f.forged||f.replayPending||f.radioBlocked)));dialogue.holdPersonal=busy;
 if(busy&&chapter>=2&&dialogue.active?.kind==='personal'){dialogue.deferred.unshift(dialogue.active);dialogue.active=null}
 return crew.tick(airport.time,dialogue,{busy,wave:airport.wave})}

function simulationTick(dt){if(screen!=='game'||paused||ended)return;airport.tick(dt);reputation=airport.reputation;if(chapter===2&&flights.some(f=>f.caseType==='phantom'&&f.cameraChecked))approach='verified';
 for(const event of airport.drain()){
  if(event.type==='inspection')continue;
  if(event.type==='complete'){score+=100;log=event.message;window.skyflowAudio?.play('message')}
  else if(event.type==='forged'){log=event.message;lastLines.dana=log;dialogue.say('dana',log,{priority:3,topic:'forged:'+event.id,emotion:'worried'});window.skyflowAudio?.play('error')}
  else if(event.type==='early'){log=event.message;lastLines.dana=log;dialogue.say('dana',log,{priority:2,topic:'approach:'+event.id,emotion:'focused'})}
  else if(event.type==='checked'){timur=event.message;score+=25;window.skyflowAudio?.play('message')}
  else if(event.type==='incident'){if(chapter>=2)dialogue.clearPersonal();log=event.message;window.skyflowAudio?.play(event.message.includes('Столкновение')?'crash':'error');toast(event.message);document.body.classList.add('incident-flash');setTimeout(()=>document.body.classList.remove('incident-flash'),700)}
  else if(event.message){if(['runway','recovery','gate','arrival','urgent','fuel','warning','diverted','stage','unnecessary','early-landed'].includes(event.type))log=event.message;else timur=event.message;window.skyflowAudio?.play(event.type==='urgent'||event.type==='suspect'?'error':'message')}
  syncDialogue();
  crew.react({...event,caseType:flights.find(f=>f.id===event.id)?.caseType},airport.time);
 }
 handled=flights.filter(f=>f.done).length;
 if(airport.failed){pending=null;render();finish(false);return}
 if(chapter===2&&airport.storyPending){openEpisodeStory(airport.storyPending);return}
 if(chapter===2&&!leraArrived&&airport.finalReady&&flights.some(f=>f.id===404&&f.phase==='service')){
  leraArrived=true;openEpisodeStory('lera');return;
 }
 if(chapter===3&&airport.storyPending){openEpisodeStory(airport.storyPending);return}
 if(airport.finished&&(chapter!==2||leraDialogueRead)){render();finish(true)}else tickCrew()
}
function chapterEnding(){

 if(chapter===2)return (airport.prevented?'Вы отменили поддельное разрешение. ':'')+(airport.resolvedSignals?'Ложные отметки разобраны. ':'')+(leraArrived?'Лера была пассажиром. Голос пилота звучал с записи, а самолётом управляли дистанционно. Она просит Тимура встретить её у архива под башней.':'Борт 404 не прибыл. Неизвестная женщина выходит на служебную связь и представляется Лерой. Тимур узнаёт голос.');
 const complete=airport.archiveOriginal&&airport.transmission.state==='sent';
 const outcome=complete?'Оригинал записи передан во внешний центр. Запись подтверждает повтор старого разрешения системой и подмену отчёта начальником смены.':airport.transmission.state==='sent'?'Передан неполный фрагмент. В нём нет всего разговора: следствию понадобятся показания Леры и Тимура.':'Передача прервана без резервной копии. Запись потеряна, но Лера и Тимур готовы дать показания.';
 return '<p>'+outcome+'</p><p>Дана завершила работу с рейсами. Поддельный приказ об эвакуации отправила Лера ради доступа в архив. Она объяснит свой поступок следователям. Кто запустил повторную передачу команд этой ночью, ещё предстоит установить.</p>';

}
function finish(win){nextChapter=win&&chapter<3?chapter+1:null;window.skyflowAudio?.syncEngines?.([],false);window.skyflowAudio?.ambience(false);window.skyflowAudio?.play(win?'win':'lose');paused=true;ended=true;const bestKey=chapter===1?'skyflow-best':'skyflow-best-'+chapter;const best=Math.max(score,+(localStorage.getItem(bestKey)||0));localStorage.setItem(bestKey,best);modal(win?'СМЕНА ЗАВЕРШЕНА':'КРИТИЧЕСКИЙ ИНЦИДЕНТ',win?'Вы удержали аэропорт.':'Связь прервана.',`${win&&chapter===3?chapterEnding():'<p>'+(win&&chapters[chapter]?chapterEnding():win?'Смена завершена. Посмотрите репутацию и потери: не все решения проходят бесследно.':'Смена завершена досрочно. Вернитесь в башню и проверьте сведения перед следующим решением.')+'</p>'}${win&&chapter===3?'<figure class="continuation-art"><img src="assets/continuation-dawn.png" alt="Башня Северного и самолёт над полосой на рассвете"><figcaption>Рассвет · смена завершена</figcaption></figure>':''}<div class="result-row"><span>${chapter===2?'Закрыто контактов (включая ложные)':'Обслужено рейсов'}</span><strong>${handled} / ${airport.target}</strong></div><div class="result-row"><span>Репутация аэропорта</span><strong>${reputation}%</strong></div><div class="result-row"><span>Потерянные самолёты</span><strong>${airport.losses}</strong></div><div class="result-row"><span>Очки / лучший результат</span><strong>${score} / ${best}</strong></div>`, (nextChapter?'<button class="primary" data-action="chapter-'+nextChapter+'">Следующая глава</button>':'')+'<button data-action="'+(chapter===1?'start':'retry-chapter')+'">Повторить смену</button><button data-action="exit">В меню</button>')}
function toast(t){const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),3000)}
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)}
function plane(c,x,y,color,scale=1,rot=0){c.save();c.translate(Math.round(x),Math.round(y));c.rotate(rot);c.scale(scale,scale);for(const [a,b,w,h]of [[-2,-12,4,25],[-5,-7,10,5],[-15,0,30,4],[-9,9,18,3]])rect(c,a,b,w,h,color);rect(c,-1,-9,2,4,'#203642');rect(c,-15,1,2,2,'#ed827d');rect(c,13,1,2,2,'#8de2be');c.restore()}
function drawMap(canvas,t,hero=false){window.SkyflowTower?.draw(canvas,t,airport,selected,hero)}
const expressionArt=typeof Image!=='undefined'?new Image():null;if(expressionArt)expressionArt.src='assets/crew-emotions-v3.png';
function crewExpression(who){const item=dialogue.visible(who);if(airport.failed||airport.runways.some(r=>r.wreck)||flights.some(f=>!f.done&&f.fuel<22)||item?.priority===2)return who==='dana'?2:3;if(airport.inspection||item?.priority===1||pending)return 3;if(item?.emotion)return ({neutral:0,warm:1,amused:1,worried:2,focused:3})[item.emotion]??0;if(item&&/коф|печень|спяч|гарнитур|топливом|рассвет|ради тебя|хорошо работаем|короче|неплох|третьего|спал|заварил/i.test(item.text))return 1;return 0}
const crewArt=typeof Image!=='undefined'?new Image():null;
if(crewArt)crewArt.src='assets/crew-reference.png';
function drawPortrait(id,who){const el=document.getElementById(id);if(!el)return;if((id==='dana'||id==='timur')&&expressionArt?.complete&&expressionArt.naturalWidth){const mood=crewExpression(who);if(el.dataset?.expression===String(mood))return;if(el.dataset)el.dataset.expression=String(mood);if(el.width!==360){el.width=360;el.height=360}const c=el.getContext('2d');c.clearRect(0,0,360,360);c.imageSmoothingEnabled=false;const w=expressionArt.naturalWidth/4,h=expressionArt.naturalHeight/2;c.drawImage(expressionArt,mood*w,(who==='dana'?0:1)*h,w,h,0,0,360,360);return;}if(!crewArt?.complete||!crewArt.naturalWidth){drawPixelPortrait(id,who);return}if(el.width!==256){el.width=256;el.height=276}const c=el.getContext('2d');c.clearRect(0,0,256,276);c.imageSmoothingEnabled=false;const scale=crewArt.naturalWidth/1774;c.drawImage(crewArt,34*scale,(who==='dana'?77:494)*scale,284*scale,276*scale,0,0,256,276)}
function drawPixelPortrait(id,who){let el=document.getElementById(id);if(!el)return;let c=el.getContext('2d'),d=who==='dana';c.clearRect(0,0,38,44);rect(c,3,25,32,19,'#15232f');rect(c,2,31,5,13,'#344857');rect(c,31,31,5,13,'#344857');rect(c,8,32,24,12,d?'#244b60':'#64777a');rect(c,13,29,13,9,'#c88d6f');rect(c,10,10,19,21,'#d8a17d');rect(c,8,6,22,10,d?'#483d3d':'#29363c');rect(c,8,12,4,d?20:8,d?'#483d3d':'#29363c');rect(c,27,10,4,d?24:10,d?'#483d3d':'#29363c');rect(c,14,18,3,2,'#172d36');rect(c,23,18,3,2,'#172d36');rect(c,18,26,5,1,'#8c584e');rect(c,7,15,3,9,d?'#86e2c5':'#f4bb70');rect(c,9,23,8,2,d?'#86e2c5':'#f4bb70');rect(c,16,23,3,3,'#152c36');rect(c,17,37,4,7,d?'#86e2c5':'#f4bb70');if(Math.sin(performance.now()/1800)>.98){rect(c,14,18,3,2,'#d8a17d');rect(c,23,18,3,2,'#d8a17d')}if(document.querySelector('[data-speaker='+who+']')?.classList.contains('talking'))rect(c,18,25,5,Math.sin(performance.now()/80)>0?3:1,'#6b4141')}
function runwayText(r){
 let status='свободна';
 if(r.intruder)status='чужой заход · рейс '+r.intruder;
 else if(r.wreck)status=r.recovery?'расчистка · '+Math.max(0,Math.ceil(r.recovery.duration-airport.time+r.recovery.started))+' с':'заблокирована · нужны службы';
 else if(r.closed)status='закрыта';
 else if(r.closing)status='закрывается';
 else if(r.owner!=null)status='занята · рейс '+r.owner;
 else if(r.safeAt>airport.time)status='интервал · '+Math.ceil(r.safeAt-airport.time)+' с';
 return 'Полоса '+r.id+' · '+status;
}
function refreshLive(){refreshEpisodeTwo();refreshEpisodeThree();const clock=document.querySelector('#shift-clock');document.querySelectorAll("[data-runway-status]").forEach(el=>{const r=airport.runways.find(r=>r.id===Number(el.dataset.runwayStatus));if(r)el.textContent=runwayText(r);});for(const f of flights){document.querySelectorAll(`[data-fuel="${f.id}"]`).forEach(el=>el.textContent=fuelText(f));document.querySelectorAll(`[data-fuel-bar="${f.id}"]`).forEach(el=>el.style.width=fuelReading(f)+'%')}const progress=document.querySelector('#check-progress');if(progress&&airport.inspection)progress.textContent='Осталось '+Math.ceil(airport.inspection.remaining)+' с';const forecast=airport.forecast();const load=document.querySelector('#live-load'),wait=document.querySelector('#live-wait');if(load)load.textContent='Нагрузка '+forecast.load+'%';if(wait)wait.textContent='Ожидание ~'+forecast.seconds+' с'}
let mapTime=0,mapPrevious=0,uiTime=0;function loop(ms){const delta=mapPrevious?Math.min((ms-mapPrevious)/1000,.1):0;mapPrevious=ms;tickStory(delta);if(!paused)mapTime+=delta;const radioWaiting=flights.some(f=>f.radioReadyAt>airport.time);const revision=airport.revision;const phases=flights.map(f=>f.phase).join();simulationTick(delta);syncDialogue();const lineChanged=screen==='game'&&!paused&&!ended?dialogue.tick(delta):false;if(screen==='game'&&!paused&&!ended&&(lineChanged||radioWaiting!==flights.some(f=>f.radioReadyAt>airport.time)||revision!==airport.revision||phases!==flights.map(f=>f.phase).join()))render();uiTime+=delta;if(screen==='game'&&uiTime>.2){uiTime=0;const clock=document.querySelector('#shift-clock');if(clock)clock.textContent=clockLabel();if(!paused&&!ended)refreshLive()}window.skyflowAudio?.syncEngines?.(flights,screen==='game'&&!paused&&!ended);window.skyflowAudio?.syncMusic?.(window.SkyflowMusic?.scene({screen,chapter,paused,ended,story:episodeStory,tutorial:tutorial.active,speaking:!!dialogue.active,airport})||{mode:'off'});const t=screen==='game'?airport.time:mapTime;const cv=document.getElementById(screen==='game'?'airport':'hero');if(cv)drawMap(cv,t,screen!=='game');if(screen==='game'){drawPortrait('dana','dana');drawPortrait('timur','timur');animateSpeech();speechBlip+=delta;if(!paused&&!ended&&dialogue.active&&dialogue.active.age*48<dialogue.active.text.length&&speechBlip>.16){speechBlip=0;window.skyflowAudio?.play(dialogue.active.who==='dana'?'voiceDana':'voiceTimur')}}requestAnimationFrame(loop)}
window.skyflowSnapshot=()=>JSON.parse(JSON.stringify({flights,runways:airport.runways,gates:airport.gates,handled,paused,ended,time:airport.time,reputation:airport.reputation,losses:airport.losses,target:airport.target,screen,chapter,clock:shiftClock(),approach,oldRecord,archiveOriginal:airport.archiveOriginal,doorChoice:airport.doorChoice,cameraViewed:airport.cameraViewed,backupSaved:airport.backupSaved,transmission:airport.transmission,runwayPreparation:airport.runwayPreparation,radioSwitch:airport.radioSwitch,leraArrived,leraDialogueRead,episodeStory,wave:airport.wave,storyRead:airport.storyRead,finalReady:airport.finalReady,revokedPermits:airport.revokedPermits,prologueStep,stage:airport.stage,pending,prevented:airport.prevented,resolvedSignals:airport.resolvedSignals,history:airport.history,tutorial:tutorial.active?tutorial.index:null}));
window.skyflowInput=function(input){
 if(episodeStory){
  if(input.type==='audio')return setAudioPreference(input.action);
  if(input.type==='story-action')return chooseEpisodeStory(input.action);
  if(input.type==='navigation'&&input.action==='exit'){action('exit');return 'Главное меню.'}
  if((input.type==='navigation'&&['next','resume'].includes(input.action))||(input.type==='gesture'&&input.action==='confirm'))return advanceEpisodeStory();
  if(input.type==='gesture'&&input.action==='cancel'){action('story-back');return 'Предыдущая реплика. Разговор остаётся на паузе.'}
  return 'Разговор на паузе. «Дальше», «продолжить» или ОК — следующая реплика. Отмена — предыдущая.';
 }

 if(screen==='chapter-intro'){
  if(input.type==='audio')return setAudioPreference(input.action);
  if(input.type==='gesture'){action(input.action==='cancel'?'exit':'begin-shift');return 'Вступление завершено.'}
  if(input.type==='navigation'){if(['exit','close'].includes(input.action)){action('exit');return 'Главное меню.'}if(input.action==='next'){nextEpisodeTwoFrame();return 'Следующий кадр.'}if(['resume','start','skipPrologue','skipTutorial'].includes(input.action)){startEpisodeTwo();return 'Вторая смена началась.'}}
  return 'Кадры сменяются автоматически. «Дальше» — следующий; ОК — начать смену; отмена — в меню.';
 }
 if(screen==='prologue'){
  if(input.type==='gesture'){action(input.action==='cancel'?'exit':'skip-prologue');return input.action==='cancel'?'Главное меню.':'Пролог пропущен. Начинаем обучение с Даной.'}
  if(input.type==='navigation'){if(['start','skipTutorial','skipPrologue','next'].includes(input.action)){action('skip-prologue');return 'Пролог пропущен. Начинаем обучение с Даной.'}if(['exit','close'].includes(input.action)){action('exit');return 'Главное меню.'}return 'Кадры меняются автоматически. ОК — пропустить, отмена — в меню.'}
 }
if(tutorial.active)return tutorialInput(input);
 const overlay=!!document.querySelector('.overlay');
 if(input.type==='audio')return setAudioPreference(input.action)||'Звук недоступен.';
 if(input.type==='gesture'&&(screen!=='game'||paused||ended||overlay)){if(input.action==='cancel'){if(paused&&!ended)action('resume');else if(ended)action('exit');else close();return 'Назад.'}if(ended){action(chapter>1?(nextChapter?'chapter-'+nextChapter:'retry-chapter'):'start');return 'Новая смена.'}if(paused){action('resume');return 'Смена продолжается.'}if(overlay){close();return 'Окно закрыто.'}action('start');return 'Смена начата.';}
 if(input.type==='navigation'){
  const a=input.action;
  if(a==='next-chapter'){
   if(!ended||!nextChapter)return 'Следующая глава доступна после успешной смены.';
   openChapter(nextChapter);return 'Следующая глава. Покажите ОК или скажите «продолжить».';
  }
  if(/^chapter-[123]$/.test(a)||a==='retry-chapter'){
   if(screen==='game'&&!ended)return 'Сначала скажите «главное меню».';
   action(a);return 'Глава открыта.';
  }
  if(['next','skipTutorial'].includes(a))return 'Обучение сейчас не запущено. Скажите «обучение».';
  if(a==='pause'){window.skyflowAudio?.syncEngines?.([],false);if(screen!=='game'||paused)return 'Смена сейчас не идёт.';action(a)}
  else if(a==='resume'){if(!paused||ended)return 'Нет приостановленной смены.';action(a)}
  else if(a==='close'){if(paused&&!ended)action('resume');else if(ended)return 'Скажите «повторить смену» или «главное меню».';else close()}
  else if(a==='start'){if(screen==='game'&&!ended)return 'Смена уже запущена. Для выхода скажите «главное меню».';action(a)}
  else if(a==='exit'){window.skyflowAudio?.syncEngines?.([],false);pending=null;action(a)}
  else {if(screen==='game'&&!paused&&!ended){action('pause')}close();action(a)}
  return 'Готово.';
 }
 if(screen!=='game'||paused||ended||overlay)return 'Сначала начните или продолжите смену.';
 if(input.type==='gesture'){

  if(!pending)return 'Сначала отдайте голосовое распоряжение.';
  const response=action(input.action);return response||'Распоряжение отменено.';
 }
 if(chapter===3&&input.type==='story-action'&&input.action==='release-channel')return prepareChannelRelease();
 if(chapter>=2&&input.type==='story-action'&&input.action==='clearance-review'){const f=externalApproaches()[0]||flights.find(f=>f.id===selected);return window.skyflowInput({type:'command',id:f.id,command:'Сверить журнал'})}

 if(input.type==='approach-camera')return inspectApproach();
 if(input.type==='story-action'&&input.action==='old-record')return listenRecord();
 if(input.type==='emergency'){const result=airport.emergencyServices();log=result.message;window.skyflowAudio?.play(result.ok?'confirm':'error');render();return result.message;}
 if(input.type==='resource'){if(input.runway!==undefined)resourceRunway=input.runway;if(input.gate!==undefined)resourceGate=input.gate;pending=null;render();return 'Ресурс выбран. Теперь отдайте распоряжение.';}
 if(input.type==='cycle'){
  const available=flights.filter(f=>!f.done);if(!available.length)return 'Все рейсы обслужены.';
  let index=available.findIndex(f=>f.id===selected);selected=available[(index+input.direction+available.length)%available.length].id;pending=null;window.skyflowAudio?.play('select');render();return `Выбран рейс ${selected}.`;
 }
 if(input.id!==undefined){const f=flights.find(f=>f.id===input.id);if(!f||f.done)return 'Рейс отсутствует или уже обслужен.';selected=f.id;pending=null}
 if(input.type==='select'){window.skyflowAudio?.play('select');render();return `Выбран рейс ${selected}.`}
 if(input.type==='command'){
  const f=flights.find(f=>f.id===selected);if(f.done)return 'Выберите необслуженный рейс.';
  pending={id:f.id,code:f.code,action:input.command,runway:input.runway!==undefined?input.runway:resourceRunway,gate:resourceGate};window.skyflowAudio?.play('prepare');render();return `Рейс ${selected}: ${input.command}. Подтвердите жестом 👌 или отмените 👎.`;
 }
 return 'Неизвестная команда.';
};
render();requestAnimationFrame(loop);

})();
