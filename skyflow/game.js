(() => {
const app=document.querySelector('#app');
const flightData=[{id:12,code:'SF 012',route:'Алматы → Северный',fuel:74,kind:'ОБЫЧНЫЙ',status:'Данные подтверждены',risk:false},{id:23,code:'NV 023',route:'Астана → Северный',fuel:38,kind:'ПРОВЕРКА',status:'Позывной отсутствует в расписании',risk:true},{id:47,code:'AK 047',route:'Актау → Северный',fuel:57,kind:'СРОЧНЫЙ',status:'Запрошен приоритет посадки',risk:false},{id:61,code:'SF 061',route:'Северный → Караганда',fuel:92,kind:'ВЫЛЕТ',status:'Готов к вылету',risk:false}];
let episodeId=1,episodeIntro=false;
const episode=()=>window.SkyflowSimulation.getEpisode(episodeId);
let airport=new window.SkyflowSimulation.Airport(flightData,{dynamic:window.SKYFLOW_DYNAMIC!==false,episode:episodeId});let flights=airport.flights;let resourceRunway=null,resourceGate=null;
let screen='start',selected=12,pending=null,paused=false,handled=0,score=0,reputation=100,elapsed=0,level=1,ended=false,log='Резервный центр не отвечает. Пока работаем самостоятельно. Дана, первый борт уже на подходе.',timur='Скажите «рейс двадцать три, проверка» и подтвердите ОК. Мне нужно 12 секунд. Проверяю по одному: у меня всего две руки и один кофе.',lastTick=Date.now(),anim=0;
const $=s=>document.querySelector(s);
function shiftClock(){const config=episode();const horizon=config.firstArrival+(config.waves-1)*config.interval+80;const m=Math.min(config.endMinute,config.startMinute+Math.floor(airport.time/horizon*(config.endMinute-config.startMinute)));return String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}function top(){return `<header class="top"><div class="brand">${screen==='game'?'<span class="brand-name">TOWER <b>404</b></span>':''} <span class="brand-caption">НОЧНАЯ ДИСПЕТЧЕРСКАЯ</span></div><div class="top-right mono"><span class="hide">АЭРОПОРТ СЕВЕРНЫЙ</span><span><i class="dot"></i>НОЧНАЯ СМЕНА</span><span class="amber" id="shift-clock">${shiftClock()}</span></div></header>`}
const dialogue=new window.SkyflowDialogue.Dialogue();const crew=new window.SkyflowDialogue.Crew({classic:true});let lastLines={dana:log,timur},speechBlip=0;
const escapeText=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function syncDialogue(){
 for(const [who,text]of Object.entries({dana:log,timur})){if(lastLines[who]!==text){lastLines[who]=text;dialogue.say(who,text)}}
 dialogue.invalidate(item=>{if(!item.topic)return false;const r=airport.runways.find(r=>'runway:'+r.id===item.topic);if(!r)return false;return /закрыта|временно закрыта/i.test(item.text)&&!r.closed||/снова открыта|полоса \d открыта|расчищена и открыта/i.test(item.text)&&r.closed});
}
function animateSpeech(){if(tutorial.active){document.querySelectorAll('.speaking').forEach(el=>el.classList.remove('speaking'));return}document.querySelectorAll('[data-speaker]').forEach(el=>{const item=dialogue.visible(el.dataset.speaker),box=el.parentElement;box.classList.toggle('speaking',!!item);if(!item){el.textContent='';el.classList.remove('talking');return}const count=Math.min(item.text.length,Math.floor(item.age*48));el.textContent=item.text.slice(0,count);el.classList.toggle('talking',count<item.text.length)})}
function dialogueJournal(){return dialogue.history.map(e=>`<p><span class="mint mono">${Math.floor(e.time)} с · ${e.who==='dana'?'Дана':'Тимур'}</span> ${escapeText(e.text)}</p>`).join('')||'<p>Сообщений пока нет.</p>'}
const tutorial=new window.SkyflowTutorial.Tutorial();
function tutorialSeen(){try{return localStorage.getItem('tower404-tutorial')==='done'}catch{return false}}
function beginTutorial(){episodeId=1;episodeIntro=false;close();reset();screen='game';paused=true;tutorial.start();window.skyflowAudio?.ambience(false);render()}
function finishTutorial(){tutorial.stop();try{localStorage.setItem('tower404-tutorial','done')}catch{}close();reset();screen='game';render()}
function tutorialInput(input){
 if(input.type==='audio')return window.skyflowAudio?.setting(input.action)||'Звук недоступен.';
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
function render(){syncDialogue();const journalOpen=!!document.querySelector('.event-log[open]');app.innerHTML=top()+(screen==='game'?game():screen==='prologue'?prologue():hero());if(screen==='game'){drawPortrait('dana','dana');drawPortrait('timur','timur');animateSpeech()}bind();if(journalOpen)document.querySelector('.event-log')?.setAttribute('open','');drawTutorial()}

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
function tickStory(dt){if(screen!=='prologue')return;prologueAge+=dt;const duration=storyDurations[prologueStep];const bar=document.querySelector('.story-timer');if(bar)bar.style.width=Math.min(100,(storyDurations.slice(0,prologueStep).reduce((sum,n)=>sum+n,0)+prologueAge)/storyDurations.reduce((sum,n)=>sum+n,0)*100)+'%';if(prologueAge>=duration){prologueAge=0;if(prologueStep<6){prologueStep++;render()}else action('begin-shift')}}

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

function hero(){return `<section class="hero"><div class="hero-copy"><div class="eyebrow">Сюжетная стратегия / pixel edition</div><h1>Последние<br><em>в башне.</em></h1><p>В башне остались только двое.<br>Связь с резервным центром потеряна.<br>А самолёты всё ещё просят посадку.</p>${screen==='start'?`<div class="buttons"><button class="primary" data-action="menu">Войти в диспетчерскую ↗</button><button data-action="about">О проекте</button></div>`:`<div class="menu-list"><button class="primary" data-action="start">Начать смену <span>↗</span></button><button data-action="prologue">Пролог · Последняя смена <span>→</span></button><button data-action="tutorial">Обучение с Даной <span>→</span></button><button data-action="how">Как играть <span>→</span></button><button data-action="chapters">Эпизоды <small>${episodeId} / 3</small></button><button data-action="settings">Настройки <span>⚙</span></button></div>`}<div class="hero-foot mono"><span>${String(episodeId).padStart(2,'0')} — ${episode().title.toUpperCase()}</span><span>02:17 — 06:00</span></div><div class="chapter"><span>Голос задаёт распоряжение</span><span class="mint">01</span></div><div class="chapter"><span>Жест подтверждает решение</span><span class="mint">02</span></div></div><div class="hero-art brand-art"><img class="tower-logo" src="assets/tower-404-logo.jpeg" alt="Tower 404 — диспетчерская башня и самолёт на фоне луны" width="1254" height="1254" fetchpriority="high" decoding="async"></div></section><div class="screen-footer mono">ТРИ ЭПИЗОДА · НОЧЬ ДО РАССВЕТА · ВКЛЮЧИТЕ ГОЛОС И КАМЕРУ В ПАНЕЛИ НИЖЕ</div>`}
function game(){if(flights.find(x=>x.id===selected)?.done)selected=flights.find(x=>!x.done)?.id||selected;let f=flights.find(x=>x.id===selected)||flights[0];return `<div class="shell"><div class="brief"><div><div class="eyebrow">Эпизод ${episodeId} · ${episode().title} / Нагрузка ${airport.stage}</div><h1>${episodeId===1?'Удержать аэропорт до рассвета':episode().title}</h1></div><div class="stats"><div class="stat"><small>РЕЙСЫ</small><strong>${handled} / ${airport.target}</strong></div><div class="stat"><small>РЕПУТАЦИЯ</small><strong class="mint">${reputation}%</strong></div><div class="stat"><small>ОЧКИ</small><strong>${score.toString().padStart(4,'0')}</strong></div><button data-action="pause">Ⅱ Пауза</button></div></div><div class="workspace tower-workspace"><aside class="panel"><div class="panel-head"><span>ОЧЕРЕДЬ РЕЙСОВ</span><span class="mint">${flights.filter(x=>!x.done).length}</span></div><div class="flights">${flights.filter(x=>!x.done).map(x=>`<div class="flight ${x.id===selected?'active':''}" data-flight="${x.id}"><div class="flight-line"><span class="flight-name">${x.code}</span><span class="tag ${x.risk?'warn':''}">${x.urgent&&!x.done?'СРОЧНЫЙ · ':x.risk&&!x.done?'ПРОВЕРКА · ':''}${window.SkyflowSimulation.labels[x.phase]}</span></div><small>${x.route}</small><div class="fuel"><div data-fuel-bar="${x.id}" style="width:${Math.ceil(x.reportedFuel??x.fuel)}%;background:${x.fuel<40?'var(--amber)':'var(--mint)'}"></div></div><div class="flight-line" style="margin:8px 0 0"><small>${x.reportedFuel!=null?'СВОДКА УСТАРЕЛА':'ТОПЛИВО'}</small><small data-fuel="${x.id}">${Math.ceil(x.reportedFuel??x.fuel)}%</small></div></div>`).join('')}</div></aside><section class="panel"><div class="panel-head"><span>ВИД ИЗ БАШНИ / СЕКТОР 04</span></div><div class="map-wrap"><canvas id="airport" width="1280" height="720"></canvas><div class="crew-nameplates"><span>Дана Соколова</span><span>Тимур Асанов</span></div><div class="map-label mono">N ↑ &nbsp; 54° 12′ / 69° 23′</div><div class="map-legend mono">${airport.runways.map(r=>`<span data-runway-status="${r.id}" class="${r.closed?'amber':''}">● ПОЛОСА ${r.id}: ${r.wreck?(r.recovery?'РАСЧИСТКА '+Math.max(0,Math.ceil(75-airport.time+r.recovery.started))+' с':'ОБЛОМКИ — НУЖНЫ СЛУЖБЫ'):r.closed?'ЗАКРЫТА':r.closing?'ЗАКРЫВАЕТСЯ':r.owner?'РЕЙС '+r.owner:'СВОБОДНА'}</span>`).join('')}</div><div class="bottom crew-near"><section class="panel character dana-active"><canvas class="portrait" id="dana" width="38" height="44"></canvas><div><div class="eyebrow">ДАНА · УПРАВЛЕНИЕ ДВИЖЕНИЕМ</div><h3>Дана Соколова</h3><p class="speech" data-speaker="dana"></p><small>«рейс двенадцать, посадка» → 👌 · опасное решение требует второго 👌</small></div></section><section class="panel character ${airport.inspection?'working':'timur-active'}"><canvas class="portrait" id="timur" width="38" height="44"></canvas><div><div class="eyebrow amber">ТИМУР · БЕЗОПАСНОСТЬ</div><h3>Тимур Асанов</h3><p class="speech" data-speaker="timur"></p><small id="check-progress">${airport.inspection?'Осталось '+Math.ceil(airport.inspection.remaining)+' с':'«рейс двадцать три, проверка» → 👌'}</small></div></section></div></div><div class="forecast"><span class="eyebrow">ПРОГНОЗ</span><div><strong class="mint" id="live-load">Нагрузка ${airport.forecast().load}%</strong><p><span id="live-wait">Ожидание ~${airport.forecast().seconds} с</span> · ясно · ветер 3 м/с<br>Расчёт по очереди и занятости полос.</p></div></div>${campaignStatus()}</section><aside class="panel right-panel"><div class="panel-head"><span>КАРТОЧКА РЕЙСА</span><span>↗</span></div><div class="detail"><div class="eyebrow">ВЫБРАННЫЙ БОРТ</div><h2>${f.code}</h2><div class="route">${f.route}</div><div class="kv"><span class="muted">Тип</span><span>Пассажирский</span></div><div class="kv"><span class="muted">${f.reportedFuel!=null?'Топливо · старая сводка':'Топливо'}</span><span class="${f.fuel<40?'amber':'mint'}" data-fuel="${f.id}">${Math.ceil(f.reportedFuel??f.fuel)}%</span></div><div class="kv"><span class="muted">Проверка</span><span>${f.checking?'ТИМУР ПРОВЕРЯЕТ':f.checked?'Завершена':'Не запрошена'}</span></div><div class="kv"><span class="muted">Состояние</span><span>${window.SkyflowSimulation.labels[f.phase]}</span></div><div class="kv"><span class="muted">Выбор полосы / выхода</span><span>${resourceRunway||'авто'} / ${resourceGate||'авто'}</span></div><div class="kv"><span class="muted">Назначено</span><span>${f.runway||'—'} / ${f.gate||'—'}</span></div><p class="note">${f.done?f.status||'Рейс завершён.':f.status}</p>${airport.runways.some(r=>r.wreck&&!r.recovery)?`<button class="emergency-call" data-emergency>Вызвать спасателей и расчистить полосу</button><small>Тушение, эвакуация и расчистка — 75 с.</small>`:""}<details class="runway-choice"><summary>Полоса: ${resourceRunway||"автоматически"}</summary><p>Автоматически — выбрать свободную. Вручную — назначить конкретную полосу.</p><div class="resource-controls"><button data-runway="1">1</button><button data-runway="2">2</button><button data-runway="0">Авто</button></div></details><div class="commands"><button data-command="Посадка" ${f.done?'disabled':''}>↓ Посадка</button><button data-command="Взлёт" ${f.done?'disabled':''}>↑ Взлёт</button><button data-command="Проверка" ${f.done?'disabled':''}>⌕ Проверка</button><button data-command="Ожидание" ${f.done?'disabled':''}>◷ Ожидание</button><button class="wide" data-command="Изолированная стоянка" ${f.done?'disabled':''}>Изолированная стоянка</button></div>${pending?`<div class="pending"><div class="eyebrow amber">ПОДТВЕРДИТЕ РАСПОРЯЖЕНИЕ</div><p>${pending.code} → ${pending.action}</p>${pending.warning?`<p class="danger-text">${pending.warning}</p>`:''}<button data-action="confirm">👌 Подтвердить</button> <button data-action="cancel">👎 Отмена</button></div>`:''}</div></aside></div><details class="event-log panel"><summary>История смены · ожидается ещё ${airport.target-flights.length} рейсов</summary>${dialogueJournal()}</details><div class="channel mono"><span>◉ ГОЛОС + ▣ КАМЕРА <b>СТАТУС В ПАНЕЛИ НИЖЕ</b></span><span>РЕЙС ДВЕНАДЦАТЬ → ПОСАДКА → ЖЕСТ 👌</span></div></div>`}
function bind(){document.querySelectorAll("[data-emergency]").forEach(b=>b.onclick=()=>window.skyflowInput({type:"emergency"}));document.querySelectorAll("[data-runway]").forEach(b=>b.onclick=()=>window.skyflowInput({type:"resource",runway:Number(b.dataset.runway)||null}));document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));document.querySelectorAll('[data-flight]').forEach(b=>b.onclick=()=>window.skyflowInput({type:'select',id:+b.dataset.flight}));document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>window.skyflowInput({type:'command',command:b.dataset.command}))}
function modal(label,title,body,buttons){close();const o=document.createElement('div');o.className='overlay';o.innerHTML=`<section class="modal"><div class="eyebrow">${label}</div><h2>${title}</h2>${body}<div class="buttons">${buttons}</div></section>`;app.append(o);bind()}
function close(){document.querySelector('.overlay')?.remove()}
function savedCampaign(){
 try{const value=JSON.parse(localStorage.getItem('tower404-campaign')||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}
}
function saveEpisode(){
 const progress=savedCampaign();
 progress[episodeId]={completed:true,best:Math.max(score,Number(progress[episodeId]?.best)||0)};
 try{localStorage.setItem('tower404-campaign',JSON.stringify(progress));}catch{}
}
function campaignStatus(){
 if(episodeId===1)return '';
 const latest=airport.story.at(-1);
 return `<div class="campaign-status"><p>${escapeText(episode().objective)}</p>${episodeId===3?`<label>Связь <strong id="link-status">${airport.linkReady?'восстановлена':Math.floor(airport.linkProgress/180*100)+'%'+(airport.inspection?' · проверка борта':' · восстановление')}</strong></label><progress id="link-progress" max="180" value="${airport.linkProgress}"></progress>`:''}${latest?`<p class="campaign-clue">${escapeText(latest)}</p>`:''}</div>`;
}
function showChapters(){
 const progress=savedCampaign();
 modal('ЭПИЗОДЫ','Одна ночь. Три смены.',window.SkyflowSimulation.episodes.map(config=>`<button class="episode-card" data-action="episode-${config.id}"><span>${config.id}. ${config.title}</span><small>${4+config.waves*2} рейсов · ${['Начальный','Сложнее','Высокая нагрузка'][config.id-1]}${progress[config.id]?.completed?' · Пройден':''}</small><p>${config.objective}</p></button>`).join('')+'<p>Голосом: «эпизод два» или «эпизод три». Все эпизоды доступны в этой версии.</p>','<button data-action="close">Назад</button>');
}
function showEpisodeIntro(){
 tutorial.stop();close();pending=null;episodeIntro=true;screen='briefing';paused=true;
 window.skyflowAudio?.syncEngines?.([],false);window.skyflowAudio?.ambience(false);render();
 modal('ЭПИЗОД '+episodeId,episode().title,`<p>${episode().intro}</p><p class="mint">${episode().objective}</p><p>${4+episode().waves*2} рейсов. Голосом «начать смену» или жест ОК.</p>`,'<button class="primary" data-action="launch-episode">На связь · ОК</button><button data-action="exit">В меню</button>');
}
function launchEpisode(){episodeIntro=false;close();reset();screen='game';render();}
function action(a){
 if(/^episode-[123]$/.test(a)){if(screen==='game'&&!ended){toast('Сначала выйдите в главное меню.');return;}episodeId=Number(a.slice(-1));if(episodeId===1){action('prologue');}else showEpisodeIntro();return;}
 if(a==='next-episode'){if(!ended||!airport.finished||episodeId>=3)return;episodeId++;showEpisodeIntro();return;}
 if(a==='launch-episode'){if(episodeIntro)launchEpisode();return;}
 if(a==='start'&&(episodeId>1||episodeIntro)){if(episodeIntro)launchEpisode();else showEpisodeIntro();return;}
if(a==='skip-prologue'||a==='begin-shift'){if(screen==='prologue'){beginTutorial();return}tutorial.stop();close();reset();screen='game';render();return}if(a==='prologue'){episodeId=1;episodeIntro=false;tutorial.stop();close();prologueStep=0;prologueAge=0;screen='prologue';window.skyflowAudio?.ambience(false);render();return}if(a==='prologue-next'){if(prologueStep<6){prologueStep++;render()}else action('begin-shift');return}if(a==='prologue-back'){prologueStep=Math.max(0,prologueStep-1);render();return}if(a==='tutorial'){beginTutorial();return}if(tutorial.active&&['confirm','cancel'].includes(a))return tutorialInput({type:'gesture',action:a});if(a==='journal'){modal('ЖУРНАЛ СМЕНЫ','Сообщения диспетчеров',dialogueJournal(),screen==='game'?'<button data-action="resume">Продолжить</button>':'<button data-action="close">Назад</button>');return}if(a!=='confirm')window.skyflowAudio?.play(a==='confirm'?'confirm':a==='cancel'?'cancel':a==='pause'?'pause':a==='resume'?'resume':'select');if(a==='menu'){screen='menu';render()}if(a==='start'){if(screen!=='game'&&screen!=='prologue'&&window.SKYFLOW_PROLOGUE!==false){action('prologue');return}if(screen==='prologue'){action('begin-shift');return}if(window.SKYFLOW_TUTORIAL!==false&&!tutorialSeen()){beginTutorial();return}close();reset();screen='game';render()}if(a==='about')modal('TOWER 404 / КОНЦЕПЦИЯ','Двое против неизвестности','<p>Ночной аэропорт. Поддельный приказ об эвакуации. Два диспетчера должны сохранить управление и выяснить, кому можно доверять.</p><p>Авторская пиксельная стратегия. Голосовые распоряжения и подтверждение жестами включаются в панели оборудования.</p>','<button data-action="close">Понятно</button>');if(a==='close')close();if(a==='how')modal('ПОДГОТОВКА К СМЕНЕ','Каждое решение имеет вес','<p>Выберите рейс в очереди. Проверьте сведения, подготовьте распоряжение и подтвердите его. Подозрительные борта сначала проверяйте. Обслужите все рейсы эпизода. Во втором и третьем эпизодах прибывает больше бортов, а топливо расходуется быстрее. Устаревшую сводку уточняйте проверкой. В финале Тимур восстанавливает связь между проверками. Проверяйте подозрительные борта, срочные сажайте первыми. Закрытия полос временные; свободные ресурсы подбираются автоматически.</p><p>Сейчас управление доступно кнопками для проверки визуального прототипа. Для игры без мыши включите голос и камеру в панели ниже.</p>','<button class="primary" data-action="start">Начать смену</button><button data-action="close">Назад</button>');if(a==='chapters')showChapters();if(a==='settings')modal('НАСТРОЙКИ','Оборудование и доступ','<p>Микрофон и камера будут проверяться перед сменой. Включите устройства в панели бесконтактного управления ниже.</p><p>Звук: сигналы и фоновый гул. Голосом: «тише», «громче», «выключить звук», «включить звук».<br>Стиль: пиксельный, ночная палитра.<br>Управление: голос и жесты после первоначальной настройки. Кнопки оставлены для отладки.</p>','<button data-action="close">Назад</button>');if(a==='pause'){window.skyflowAudio?.syncEngines?.([],false);window.skyflowAudio?.ambience(false);paused=true;modal('СМЕНА ПРИОСТАНОВЛЕНА','Пауза','<p>Возьмите время, чтобы оценить ситуацию. Самолёты ожидают вашего возвращения.</p>','<button class="primary" data-action="resume">Продолжить</button><button data-action="exit">Главное меню</button><button class="danger" data-action="fail">Экран поражения</button>')}if(a==='resume'){window.skyflowAudio?.ambience(true);paused=false;close()}if(a==='exit'){episodeIntro=false;tutorial.stop();window.skyflowAudio?.syncEngines?.([],false);window.skyflowAudio?.ambience(false);pending=null;paused=false;screen='menu';render()}if(a==='fail'){close();finish(false)}if(a==='cancel'){pending=null;render()}if(a==='confirm')return execute()}
function reset(){airport=new window.SkyflowSimulation.Airport(flightData,{dynamic:window.SKYFLOW_DYNAMIC!==false,episode:episodeId});flights=airport.flights;resourceRunway=null;resourceGate=null;for(const f of flights)if(!f.signal)f.status=f.risk?'Позывной отсутствует в расписании':f.kind==='ВЫЛЕТ'?'Готов к вылету':f.kind==='СРОЧНЫЙ'?'Запрошен приоритет посадки':'Данные подтверждены';window.skyflowAudio?.ambience(true);handled=0;score=0;reputation=100;elapsed=0;crew.reset();ended=false;paused=false;pending=null;selected=12;for(const f of flights){f.done=false;f.checked=false}log=episodeId===1?'Выберите рейс голосом, задайте приказ и подтвердите ОК. Подозрительные борта сначала проверьте.':episode().objective;timur='';dialogue.reset();lastLines={dana:'',timur:''};syncDialogue()}
function execute(){if(!pending||paused||ended)return;const order=pending;const result=airport.command(order.id,order.action,order);reputation=airport.reputation;handled=flights.filter(f=>f.done).length;log=result.message;
 if(result.warning){pending={...order,force:true,warning:result.message};window.skyflowAudio?.play('error');render();return result.message}
 pending=null;if(result.ok){score+=result.points||0;if(order.action==='Проверка'){log=lastLines.dana;timur='Рейс '+order.id+': начинаю проверку. Нужно 12 секунд.';}window.skyflowAudio?.play('confirm')}else{crew.react({type:'rejected'},airport.time);window.skyflowAudio?.play('error');toast(result.message)}render();return result.message;}
function tickCrew(){const busy=!!(pending||airport.inspection||airport.runways.some(r=>r.wreck)||flights.some(f=>!f.done&&(f.fuel<25||(f.urgent&&f.phase==='holding'&&f.fuel<40))));dialogue.holdPersonal=busy;return crew.tick(airport.time,dialogue,{busy})}
function simulationTick(dt){if(screen!=='game'||paused||ended)return;airport.tick(dt);reputation=airport.reputation;
 for(const event of airport.drain()){
  if(event.type==='inspection')continue;
  if(event.type==='story'){dialogue.say('timur',event.message);continue;}
  if(event.type==='complete'){score+=100;log=event.message;window.skyflowAudio?.play('message')}
  else if(event.type==='checked'){timur=event.message;score+=25;window.skyflowAudio?.play('message')}
  else if(event.type==='incident'){log=event.message;window.skyflowAudio?.play(event.message.includes('Столкновение')?'crash':'error');toast(event.message);document.body.classList.add('incident-flash');setTimeout(()=>document.body.classList.remove('incident-flash'),700)}
  else if(event.message){if(['runway','recovery','gate','arrival','urgent','fuel','warning','diverted','stage'].includes(event.type))log=event.message;else timur=event.message;window.skyflowAudio?.play(event.type==='urgent'||event.type==='suspect'?'error':'message')}
  syncDialogue();
  crew.react(event,airport.time);
 }
 handled=flights.filter(f=>f.done).length;
 if(airport.failed){pending=null;render();finish(false);return}
 if(airport.finished){render();finish(true)}else tickCrew()
}
function finish(win){
 window.skyflowAudio?.syncEngines?.([],false);window.skyflowAudio?.ambience(false);window.skyflowAudio?.play(win?'win':'lose');
 paused=true;ended=true;
 let best=score;try{best=Math.max(score,Number(localStorage.getItem('skyflow-best'))||0);localStorage.setItem('skyflow-best',best);}catch{}
 if(win)saveEpisode();
 const ending=win?episode().ending:'Смена завершена досрочно. Проверьте сведения перед следующим решением и попробуйте снова.';
 const aftermath=win&&(airport.losses||reputation<100)?'Ночь оставила последствия. Потери и задержки зафиксированы в журнале.':'';
 modal(win?'ЭПИЗОД '+episodeId+' ЗАВЕРШЁН':'КРИТИЧЕСКИЙ ИНЦИДЕНТ',win?(episodeId===3?'Рассвет. Башня снова на связи.':'Вы удержали аэропорт.'):'Связь прервана.',
 `<p class="episode-ending">${ending}</p>${aftermath?`<p>${aftermath}</p>`:''}<div class="result-row"><span>Завершено рейсов</span><strong>${handled} / ${airport.target}</strong></div><div class="result-row"><span>Репутация / потери</span><strong>${reputation}% / ${airport.losses}</strong></div><div class="result-row"><span>Очки / лучший результат</span><strong>${score} / ${best}</strong></div>${win&&episodeId<3?'<p>Скажите «следующий эпизод», чтобы продолжить историю.</p>':''}`,
 `${win&&episodeId<3?'<button class="primary" data-action="next-episode">Следующий эпизод</button>':''}<button data-action="start">Повторить смену · ОК</button><button data-action="exit">В меню</button>`);
}
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
function refreshLive(){const link=document.querySelector('#link-progress'),linkStatus=document.querySelector('#link-status');if(link)link.value=airport.linkProgress;if(linkStatus)linkStatus.textContent=airport.linkReady?'восстановлена':Math.floor(airport.linkProgress/180*100)+'%'+(airport.inspection?' · проверка борта':' · восстановление');const clock=document.querySelector('#shift-clock');if(clock)clock.textContent=shiftClock();document.querySelectorAll("[data-runway-status]").forEach(el=>{const r=airport.runways.find(r=>r.id===Number(el.dataset.runwayStatus));if(r?.recovery)el.textContent="● ПОЛОСА "+r.id+": "+Math.max(0,Math.ceil(75-airport.time+r.recovery.started))+" с до открытия";});for(const f of flights){document.querySelectorAll(`[data-fuel="${f.id}"]`).forEach(el=>el.textContent=Math.ceil(f.reportedFuel??f.fuel)+'%');document.querySelectorAll(`[data-fuel-bar="${f.id}"]`).forEach(el=>el.style.width=(f.reportedFuel??f.fuel)+'%')}const progress=document.querySelector('#check-progress');if(progress&&airport.inspection)progress.textContent='Осталось '+Math.ceil(airport.inspection.remaining)+' с';const forecast=airport.forecast();const load=document.querySelector('#live-load'),wait=document.querySelector('#live-wait');if(load)load.textContent='Нагрузка '+forecast.load+'%';if(wait)wait.textContent='Ожидание ~'+forecast.seconds+' с'}
let mapTime=0,mapPrevious=0,uiTime=0;function loop(ms){const delta=mapPrevious?Math.min((ms-mapPrevious)/1000,.1):0;mapPrevious=ms;tickStory(delta);if(!paused)mapTime+=delta;const revision=airport.revision;const phases=flights.map(f=>f.phase).join();simulationTick(delta);syncDialogue();const lineChanged=screen==='game'&&!paused&&!ended?dialogue.tick(delta):false;if(screen==='game'&&!paused&&!ended&&(lineChanged||revision!==airport.revision||phases!==flights.map(f=>f.phase).join()))render();uiTime+=delta;if(screen==='game'&&!paused&&!ended&&uiTime>.5){uiTime=0;refreshLive()}window.skyflowAudio?.syncEngines?.(flights,screen==='game'&&!paused&&!ended);const t=screen==='game'?airport.time:mapTime;const cv=document.getElementById(screen==='game'?'airport':'hero');if(cv)drawMap(cv,t,screen!=='game');if(screen==='game'){drawPortrait('dana','dana');drawPortrait('timur','timur');animateSpeech();speechBlip+=delta;if(!paused&&!ended&&dialogue.active&&dialogue.active.age*48<dialogue.active.text.length&&speechBlip>.16){speechBlip=0;window.skyflowAudio?.play(dialogue.active.who==='dana'?'voiceDana':'voiceTimur')}}requestAnimationFrame(loop)}
window.skyflowSnapshot=()=>JSON.parse(JSON.stringify({flights,runways:airport.runways,gates:airport.gates,handled,paused,ended,time:airport.time,reputation:airport.reputation,losses:airport.losses,target:airport.target,screen,episodeId,linkProgress:airport.linkProgress,linkReady:airport.linkReady,story:airport.story,prologueStep,stage:airport.stage,history:airport.history,tutorial:tutorial.active?tutorial.index:null}));
window.skyflowInput=function(input){
 if(episodeIntro){
  if(input.type==='audio')return window.skyflowAudio?.setting(input.action);
  if(input.type==='gesture'){action(input.action==='confirm'?'launch-episode':'exit');return 'Готово.';}
  if(input.type==='navigation'){
   if(['start','resume','next'].includes(input.action)){action('launch-episode');return 'Смена начата.';}
   if(['close','exit'].includes(input.action)){action('exit');return 'Главное меню.';}
   if(/^episode-[123]$/.test(input.action)){action(input.action);return 'Эпизод выбран.';}
  }
  return 'Скажите «начать смену» или покажите ОК.';
 }

 if(screen==='prologue'){
  if(input.type==='gesture'){action(input.action==='cancel'?'exit':'skip-prologue');return input.action==='cancel'?'Главное меню.':'Пролог пропущен. Начинаем обучение с Даной.'}
  if(input.type==='navigation'){if(['start','skipTutorial','skipPrologue','next'].includes(input.action)){action('skip-prologue');return 'Пролог пропущен. Начинаем обучение с Даной.'}if(['exit','close'].includes(input.action)){action('exit');return 'Главное меню.'}return 'Кадры меняются автоматически. ОК — пропустить, отмена — в меню.'}
 }
if(tutorial.active)return tutorialInput(input);
 const overlay=!!document.querySelector('.overlay');
 if(input.type==='audio')return window.skyflowAudio?.setting(input.action)||'Звук недоступен.';
 if(input.type==='gesture'&&(screen!=='game'||paused||ended||overlay)){if(input.action==='cancel'){if(paused&&!ended)action('resume');else if(ended)action('exit');else close();return 'Назад.'}if(ended){action('start');return 'Новая смена.'}if(paused){action('resume');return 'Смена продолжается.'}if(overlay){close();return 'Окно закрыто.'}action('start');return 'Смена начата.';}
 if(input.type==='navigation'){
  const a=input.action;
  if(/^episode-[123]$/.test(a)&&screen==='game'&&!ended)return 'Сначала скажите «главное меню».';
  if(a==='next-episode'&&(!ended||!airport.finished||episodeId===3))return 'Следующий эпизод доступен после завершения текущего.';
  if(['next','skipTutorial'].includes(a))return 'Обучение сейчас не запущено. Скажите «обучение».';
  if(a==='pause'){window.skyflowAudio?.syncEngines?.([],false);if(screen!=='game'||paused)return 'Смена сейчас не идёт.';action(a)}
  else if(a==='resume'){if(!paused||ended)return 'Нет приостановленной смены.';action(a)}
  else if(a==='close'){if(paused&&!ended)action('resume');else if(ended)return 'Скажите «повторить смену» или «главное меню».';else close()}
  else if(a==='start'){if(screen==='game'&&!ended)return 'Смена уже запущена. Для выхода скажите «главное меню».';action(a)}
  else if(a==='exit'){episodeIntro=false;tutorial.stop();window.skyflowAudio?.syncEngines?.([],false);pending=null;action(a)}
  else {if(screen==='game'&&!paused&&!ended){action('pause')}close();action(a)}
  return 'Готово.';
 }
 if(screen!=='game'||paused||ended||overlay)return 'Сначала начните или продолжите смену.';
 if(input.type==='gesture'){
  if(!pending)return 'Сначала отдайте голосовое распоряжение.';
  const response=action(input.action);return response||'Распоряжение отменено.';
 }
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
  pending={id:f.id,code:f.code,action:input.command,runway:resourceRunway,gate:resourceGate};window.skyflowAudio?.play('prepare');render();return `Рейс ${selected}: ${input.command}. Подтвердите жестом 👌 или отмените 👎.`;
 }
 return 'Неизвестная команда.';
};
render();requestAnimationFrame(loop);

})();
