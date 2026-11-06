(() => {
 const background=new Image();background.src='assets/tower-night-pixel.png';
 const effectStarts=new WeakMap();
 function fit(width,height){const scale=Math.min(width/1280,height/720);return {scale,x:(width-1280*scale)/2,y:(height-720*scale)/2}}
 const mix=(a,b,q)=>[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];
 const runways={1:{far:[.209,.38],near:[.253,.525]},2:{far:[.177,.38],near:[.065,.515]}};
 const clamp=q=>Math.max(0,Math.min(1,q));
 const direction=v=>Math.atan2(v[1]*720,v[0]*1280);
 function bezier(a,b,c,d,q){const k=1-q;return {point:[k*k*k*a[0]+3*k*k*q*b[0]+3*k*q*q*c[0]+q*q*q*d[0],k*k*k*a[1]+3*k*k*q*b[1]+3*k*q*q*c[1]+q*q*q*d[1]],heading:direction([3*k*k*(b[0]-a[0])+6*k*q*(c[0]-b[0])+3*q*q*(d[0]-c[0]),3*k*k*(b[1]-a[1])+6*k*q*(c[1]-b[1])+3*q*q*(d[1]-c[1])])}}
 function holding(f,t){const slot=f.viewSlot??f.id;return [.23+(slot%5)*.115+Math.sin(t*.08+f.id)*.008,.18+Math.floor((slot%10)/5)*.055]}
 function taxiPath(f,q){const {far,near}=runways[f.runway===2?2:1],gate=[f.gate==='ISO'||f.departureGate==='ISO'?.9:.65+(Number(f.gate||f.departureGate||1)-1)*.09,.55],exit=[.48,.565];
  return q<.5?bezier(near,[near[0]+(near[0]-far[0])*.25,near[1]+(near[1]-far[1])*.25],[exit[0]-.09,exit[1]],exit,q*2):bezier(exit,[exit[0]+.09,exit[1]],[gate[0]-.05,gate[1]],gate,(q-.5)*2);
 }
 function position(f,t){const {far,near}=runways[f.runway===2?2:1],gate=[f.gate==='ISO'?.9:.65+(Number(f.gate||1)-1)*.09,.55];let p,heading=0,scale=1,alt=0;
  const q=clamp(f.progress||0);
  if(f.phase==='holding'){p=holding(f,t);scale=.55;heading=Math.PI}
  else if(f.phase==='landing'){
   if(q<.4){const origin=holding(f,f.approachTime??t-q*12),path=bezier(origin,[origin[0]-.08,origin[1]],[far[0]-(near[0]-far[0])*.65,far[1]-(near[1]-far[1])*.65],far,q/.4);p=path.point;heading=path.heading;alt=.06*(1-q/.4)}
   else{p=mix(far,near,(q-.4)/.6);heading=direction([near[0]-far[0],near[1]-far[1]])}scale=.55+q*.45;
  }else if(f.phase==='takeoff'){p=mix(near,far,q);alt=Math.max(0,(q-.65)*.16);p=[p[0],p[1]-alt];heading=direction([far[0]-near[0],far[1]-near[1]]);scale=1-q*.45}
  else if(f.phase==='taxiIn'||f.phase==='taxiOut'){const path=taxiPath(f,f.phase==='taxiOut'?1-q:q);p=path.point;heading=path.heading+(f.phase==='taxiOut'?Math.PI:0)}
  else{p=gate;heading=f.phase==='ready'?Math.PI:0}
  return {x:p[0],y:p[1],groundY:f.phase==='takeoff'?p[1]+alt:p[1],heading,scale,altitude:alt};
 }
 function orientation(heading){return {facing:Math.cos(heading)<0?-1:1,tilt:0,endView:Math.abs(Math.cos(heading))<.78}}
 function shadowVisible(f,p){return f.phase!=='holding'&&p.groundY>=.38&&(p.altitude||0)<.012}
 function jet(c,p,f,t,w,h){
  const size=Math.min(w/1000,h/562)*p.scale;
  if(shadowVisible(f,p)){c.save();c.translate(p.x*w,p.groundY*h+7);c.scale(size,size*.4);c.fillStyle='#0007';c.beginPath();c.ellipse(0,0,28,6,0,0,Math.PI*2);c.fill();c.restore()}
  c.save();c.translate(Math.round(p.x*w),Math.round(p.y*h));c.scale(size,size);
  if(f.phase==='takeoff')c.globalAlpha=clamp((1-(f.progress||0))/.12);
  const rawCos=Math.cos(p.heading),co=Math.sign(rawCos)*Math.pow(Math.abs(rawCos),4),si=Math.sign(Math.sin(p.heading))*Math.sqrt(Math.max(0,1-co*co)),front=Math.sin(p.heading)>=0;
  // A foreshortened 3D silhouette: heading changes the viewpoint, never rotates the wings vertically.
  const project=([u,v,z])=>[Math.round(u*co-v*si),Math.round(u*si*.28+v*co*.22-z)];
  function poly(points,color){c.fillStyle=color;c.beginPath();points.map(project).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
  function dot(point,color,size=3){const [x,y]=project(point);c.fillStyle=color;c.fillRect(x-1,y-1,size,size)}
  function fin(){poly([[-23,0,5],[-28,0,23],[-21,0,22],[-13,0,5]],'#438bc0');if(Math.abs(co)<.65){const [x,y]=project([-23,0,6]);c.fillStyle='#438bc0';c.fillRect(x-1,y-16,3,17)}poly([[-22,-3,5],[-30,-15,4],[-23,-15,4],[-13,-3,5]],'#8aacc2');poly([[-22,3,5],[-30,15,4],[-23,15,4],[-13,3,5]],'#abc7d6')}
  if(front)fin();
  poly([[-6,-4,5],[-20,-31,3],[-12,-31,4],[11,-4,6]],'#769bb5');
  poly([[-6,4,5],[-20,31,3],[-12,31,4],[11,4,6]],'#a3c3d5');
  for(const side of [-1,1]){const v=side*16;poly([[-8,v-3,2],[10,v-3,2],[12,v,0],[9,v+3,2],[-8,v+3,2]],'#426d8b');const [x,y]=project([front?11:-8,v,1]),ew=2+Math.round(2*Math.abs(si));c.fillStyle='#6f94ad';c.fillRect(x-1,y-8,3,7);c.fillStyle='#afccdc';c.beginPath();for(const [dx,dy]of [[-ew+1,-4],[ew-1,-4],[ew,-2],[ew,2],[ew-1,4],[-ew+1,4],[-ew,2],[-ew,-2]])c.lineTo(x+dx,y+dy);c.closePath();c.fill();c.fillStyle='#142d40';c.fillRect(x-ew+1,y-2,Math.max(2,ew*2-2),4)}
  poly([[-27,-3,5],[-20,-5,8],[19,-5,10],[30,0,7],[19,5,9],[-20,5,7],[-27,3,5]],'#d2e3e9');
  poly([[-26,3,4],[20,5,5],[30,0,7],[19,5,9],[-20,5,7]],'#7e9fb8');
  poly([[-20,-2,9],[18,-2,11],[25,0,10],[18,2,11],[-20,2,9]],'#f1f7f2');
  if(front&&Math.abs(co)<.55){const [x,y]=project([26,0,7]);c.fillStyle='#d6e6ec';c.fillRect(x-5,y-5,10,8);c.fillRect(x-3,y+3,6,2);c.fillStyle='#214762';c.fillRect(x-4,y-4,8,3);c.fillStyle='#f2f6ed';c.fillRect(x-2,y,4,3)}
  else if(front||Math.abs(co)>.55)poly([[20,-3,10],[25,-2,9],[25,2,9],[20,3,10]],'#214762');
  if(Math.abs(co)>.5)for(let u=-17;u<16;u+=5)dot([u,front?5:-5,8],'#55a8d5',2);
  if(!front)fin();
  dot([-15,-31,4],'#ff6b70');dot([-15,31,4],'#8aefc4');
  if(p.altitude<.015&&f.phase!=='holding')for(const v of [-4,4])dot([10,v,-2],'#111e2a',3);
  if(front&&f.phase==='landing')dot([26,0,5],'#ffe3a4',3);
  c.restore();
  const label=f.code;c.font='bold 14px Consolas,monospace';const labelWidth=c.measureText(label).width;const lx=p.x*w-labelWidth/2,ly=p.y*h-27*size-6;c.fillStyle='#06121ee8';c.fillRect(lx-5,ly-14,labelWidth+10,19);c.strokeStyle=f.urgent?'#ffce7a':'#5c9bbb';c.strokeRect(lx-5,ly-14,labelWidth+10,19);c.fillStyle=f.urgent?'#ffce7a':'#e1f3ff';c.fillText(label,lx,ly);
 }
 function instrumentState(airport){
  return {runways:airport.runways.map(r=>({...r,status:r.wreck||r.closed?'closed':r.owner!=null?'busy':r.closing?'closing':r.safeAt>airport.time?'separation':'free'})),gates:airport.gates.map(g=>{const f=airport.flights.find(f=>f.id===g.owner);return {...g,flight:f,status:g.blockedUntil>airport.time?'blocked':g.owner==null?'free':f&&['ready','service','parked','emergency'].includes(f.phase)?'occupied':'reserved'}})};
 }
 function consoleInstruments(c,airport,selected){
  const state=instrumentState(airport),colors={free:'#76e7b3',busy:'#ffc46b',closed:'#ff7278',closing:'#ffc46b',separation:'#87bbeb',occupied:'#ffc46b',reserved:'#87bbeb',blocked:'#ff7278'};
  function text(s,x,y,size=17,color='#bce9fa'){c.font='bold '+size+'px Consolas,monospace';c.fillStyle=color;c.fillText(s,x,y)}
  function box(x,y,w,h,color){c.strokeStyle=color;c.lineWidth=2;c.strokeRect(x,y,w,h)}
  function plane(x,y,scale,color,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.fillStyle=color;for(const a of [[-2,-17,4,34],[-5,-10,10,8],[-19,0,38,5],[-10,12,20,4]])c.fillRect(...a);c.fillStyle='#275978';c.fillRect(-1,-12,2,5);c.restore()}
  function screen(x,y,a,b,d,e,paint){c.save();c.transform(a,b,d,e,x,y);c.beginPath();c.rect(0,0,320,180);c.clip();c.fillStyle='#061c35';c.fillRect(0,0,320,180);c.strokeStyle='#143b5b';c.lineWidth=1;for(let yy=6;yy<180;yy+=8){c.beginPath();c.moveTo(0,yy);c.lineTo(320,yy);c.stroke()}paint();c.restore()}
  // Affine placement follows the two existing monitor glass surfaces.
  screen(322,491,214/320,0,-12/180,126/180,()=>{
   text('ПОЛОСЫ',12,23,20);
   state.runways.forEach((r,i)=>{const y=36+i*66,col=colors[r.status],label={free:'СВОБОДНА',busy:'ЗАНЯТА',closed:'ЗАКРЫТА',closing:'ЗАКРЫВАЕТСЯ',separation:'ИНТЕРВАЛ'}[r.status];
    text('0'+r.id,12,y+15,20,col);text(label,58,y+15,17,col);box(12,y+23,296,29,col);
    c.fillStyle='#95b8cb';for(let x=47;x<280;x+=30)c.fillRect(x,y+36,15,2);for(let k=0;k<4;k++){c.fillRect(17,y+27+k*5,12,2);c.fillRect(291,y+27+k*5,12,2)}
    const f=airport.flights.find(f=>f.id===r.owner);if(f){const q=f.phase==='landing'?Math.max(0,(f.progress-.4)/.6):f.phase==='takeoff'?1-f.progress:1;plane(40+q*236,y+36,.55,f.id===selected?'#fff1ad':'#cfeeff',Math.PI/2)}
    if(r.status==='closed'){c.strokeStyle=col;c.beginPath();c.moveTo(145,y+28);c.lineTo(166,y+46);c.moveTo(166,y+28);c.lineTo(145,y+46);c.stroke()}
   });text('● СВОБ.  ● ЗАНЯТА  × ЗАКР.',10,176,12);
  });
  screen(745,491,233/320,0,1/180,130/180,()=>{
   text('СТОЯНКИ',10,23,20);c.fillStyle='#24517a';c.fillRect(10,30,221,13);c.fillStyle='#7ed6f5';for(let x=16;x<230;x+=16)c.fillRect(x,34,9,4);
   c.strokeStyle='#dca755';c.lineWidth=3;c.beginPath();c.moveTo(10,142);c.lineTo(309,142);c.stroke();
   state.gates.forEach((g,i)=>{const x=12+i*78,col=colors[g.status];text(g.id==='ISO'?'ИЗО':String(g.id),x+18,62,18,col);box(x,68,62,62,col);c.strokeStyle='#dca755';c.beginPath();c.moveTo(x+31,131);c.lineTo(x+31,142);c.stroke();
    if(g.status==='occupied')plane(x+31,99,.83,g.owner===selected?'#fff1ad':'#cfeeff');
    if(g.status==='reserved'){text('РЕЗ.',x+8,104,15,col);c.fillStyle=col;c.fillRect(x+27,119,8,4)}
    if(g.status==='blocked')text('×',x+22,110,28,col);
   });const ordinary=state.gates.filter(g=>g.id!=='ISO'),occupied=ordinary.filter(g=>g.status==='occupied').length,reserved=ordinary.filter(g=>g.status==='reserved').length;
   text('ЗАНЯТО '+occupied+' / '+ordinary.length,10,171,18,'#76e7b3');if(reserved)text('РЕЗ. '+reserved,211,171,15,'#87bbeb');
  });
 }
 function draw(canvas,t,airport,selected,hero){
  const actualWidth=Math.max(1,Math.round(canvas.clientWidth||canvas.width)),actualHeight=Math.max(1,Math.round(canvas.clientHeight||canvas.height));if(canvas.width!==actualWidth)canvas.width=actualWidth;if(canvas.height!==actualHeight)canvas.height=actualHeight;
  const c=canvas.getContext('2d'),w=1280,h=720,view=fit(actualWidth,actualHeight);c.setTransform(1,0,0,1,0,0);c.fillStyle='#040b15';c.fillRect(0,0,actualWidth,actualHeight);c.setTransform(view.scale,0,0,view.scale,view.x,view.y);c.imageSmoothingEnabled=false;if(background.complete&&background.naturalWidth)c.drawImage(background,0,0,w,h);
  const traffic=hero?[{id:12,code:'SF 012',phase:'landing',progress:(t%22)/22,runway:1}]:airport.flights;
  traffic.filter(f=>!['lost','diverted','departed','transferred','emergency'].includes(f.phase)).sort((a,b)=>position(a,t).y-position(b,t).y).forEach(f=>{const p=position(f,t);jet(c,p,f,t,w,h);if(f.id===selected){c.strokeStyle='#7ee7d0';c.strokeRect(p.x*w-25*p.scale-4,p.y*h-20*p.scale-2,54*p.scale+8,42*p.scale+4)}});
  if(hero)return;
  for(const effect of airport.effects||[]){
   if(!effectStarts.has(effect))effectStarts.set(effect,performance.now());const age=(performance.now()-effectStarts.get(effect))/1000;if(age>12)continue;
   const x=runways[effect.runway===2?2:1].near[0]*w,y=.50*h;
   if(effect.type==='collision'&&age<1.4){const k=age/1.4;jet(c,{x:x/w-.1*(1-k),y:y/h-.025*(1-k),groundY:y/h,scale:.7,heading:.3},{id:0,code:effect.codes[0],phase:'landing'},t,w,h);jet(c,{x:x/w+.1*(1-k),y:y/h+.025*(1-k),groundY:y/h,scale:.7,heading:Math.PI+.3},{id:1,code:effect.codes[1],phase:'takeoff'},t,w,h);continue}
   const blastAge=age-(effect.type==='collision'?1.4:0);c.save();
   if(blastAge<.7){c.fillStyle=`rgba(255,156,52,${.3*(1-blastAge/.7)})`;c.fillRect(0,0,w,h)}
   for(let i=0;i<18;i++){const angle=i*2.4,radius=(8+Math.min(blastAge,2)*24)*(i%3+1)/3;c.fillStyle=blastAge<1?(i%2?'#ffbd55':'#ff6633'):'#242c39';c.fillRect(Math.round((x+Math.cos(angle)*radius)/4)*4,Math.round((y+Math.sin(angle)*radius-blastAge*9)/4)*4,8+i%3*4,8+i%3*4)}
   c.fillStyle='#0b101b';c.fillRect(x-19,y+5,38,7);c.fillStyle='#ff8667';c.font='bold 14px Consolas,monospace';c.fillText(effect.type==='collision'?'СТОЛКНОВЕНИЕ / ПОЛОСА ЗАКРЫТА':'АВАРИЯ / РАБОТАЮТ СЛУЖБЫ',x-95,y-75);c.restore();
  }
  for(const r of airport.runways){
   if(r.wreck){const x=runways[r.id].near[0]*w,y=.50*h,elapsed=r.recovery?airport.time-r.recovery.started:0,stage=elapsed<25?'ТУШЕНИЕ':elapsed<50?'ЭВАКУАЦИЯ':'РАСЧИСТКА';
    c.fillStyle='#3b454c';c.fillRect(x-30,y,45,7);c.fillRect(x+8,y+9,25,6);c.fillStyle='#8fa4ac';c.fillRect(x-26,y-6,18,6);c.fillRect(x+16,y+2,14,6);c.fillStyle='#1a202b';c.fillRect(x-35,y+14,75,5);
    if(!r.recovery||elapsed<25){for(let i=0;i<7;i++){c.fillStyle=i%2?'#ffad39':'#e95c36';c.fillRect(x-22+i*7,y-7-Math.sin(t*5+i)*7,5,9)}for(let i=0;i<5;i++){c.fillStyle='#26303ccc';c.fillRect(x-15+i*8,y-22-i*7-Math.sin(t+i)*4,15,13)}}
    if(r.recovery){for(let i=0;i<2;i++){const tx=x+45+i*23,ty=y+20;c.fillStyle=i?'#dfd9ad':'#b64b42';c.fillRect(tx,ty,20,9);c.fillStyle='#82b7cd';c.fillRect(tx+12,ty,5,5);c.fillStyle=Math.sin(t*8)>0?'#5baaff':'#ff5b51';c.fillRect(tx+6,ty-3,6,3)}c.fillStyle='#101d2d';c.fillRect(x-50,y-60,150,28);c.fillStyle='#f4c26e';c.font='11px Consolas';c.fillText(stage+' '+Math.ceil(75-elapsed)+' с',x-44,y-43)}else{c.fillStyle='#ff9b7a';c.font='12px Consolas';c.fillText('ОБЛОМКИ / ВЫЗОВИТЕ СЛУЖБЫ',x-70,y-48)}
   }
   const x=w*(r.id===1?.47:.5),y=h*.704;const color=r.closed||r.closing?'#ff535c':r.owner?'#ffc15b':'#62afff';c.shadowColor=color;c.shadowBlur=8;c.fillStyle=color;c.fillRect(x,y,w*.015,h*.018);c.shadowBlur=0}
  consoleInstruments(c,airport,selected);
  c.font='11px Consolas,monospace';c.fillStyle='#83cfff';c.fillText('TOWER 04 / NIGHT WATCH',w*.26,h*.94);
 }
 window.SkyflowTower={draw,position,fit,runways,orientation,instrumentState,shadowVisible,holding,taxiPath,drawAircraft:jet};
})();
