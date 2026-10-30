import { SWING_LEAD, SESSION_LENGTH, makeSession, judgeSwing, judgeTake, summarize } from './engine.mjs';

const $ = id => document.getElementById(id);
const canvas = $('field'), ctx = canvas.getContext('2d');
const W = 1280, H = 720;
const plate = { x: 718, y: 432, sx: 74, sy: 92 };
let state = 'intro', previousState = 'flight', elapsed = 0, windup = 0, resultTime = 0;
let pitchIndex = 0, session = makeSession(), results = [], swing = null, currentResult = null;
let aim = { x: 0, y: 0 }, dragging = false, dragOrigin = null, last = 0, seed = 41;
let pausedByVisibility = false;

function zonePoint(x, y) { return { x: plate.x + x * plate.sx, y: plate.y - y * plate.sy }; }
function roundRect(x,y,w,h,r,fill,stroke) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function ellipse(x,y,rx,ry,fill) { ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill(); }
function line(points, color, width=2) {ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function text(str,x,y,size,color='#fff',align='left') {ctx.font=`700 ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(str,x,y);}

// Temporary procedural A2 figures; all batters have a helmet shell, brim, ear guard.
function player(x,y,scale,team='navy',role='fielder',pose=0) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const coral=team==='coral', jersey=coral?'#dc685d':'#284864', trim=coral?'#ffe1d0':'#9dc8df';
  ellipse(0,5,31,8,'#214c3c35');
  line([[-9,-34],[-16,-2]],'#eeeade',15);line([[11,-34],[17,-2]],'#eeeade',15);
  roundRect(-27,-8,25,11,5,'#203748');roundRect(7,-8,25,11,5,'#203748');
  roundRect(-23,-73,47,42,10,jersey);line([[-18,-32],[18,-32]],'#243440',5);
  line([[0,-69],[0,-38]],trim,2);text(coral?'C':'10',8,-48,14,trim,'center');
  const armLift=role==='pitcher'?pose:0;
  line([[-20,-64],[-31,-47+armLift*14]],jersey,13);
  line([[20,-64],[30+armLift*8,-45-armLift*35]],jersey,13);
  if(role!=='batter'){
    ellipse(-32,-43+armLift*14,12,15,'#ad794d');
    line([[-38,-51+armLift*14],[-27,-37+armLift*14]],'#754c2c',2);
  }else ellipse(-31,-47,7,7,'#fff4df');
  ellipse(0,-96,31,30,'#edbf95');
  // Hair and face remain readable at the low-detail prototype scale.
  ellipse(-24,-99,7,17,'#503b31');ellipse(23,-99,7,16,'#503b31');
  if(coral){ellipse(-30,-103,10,26,'#503b31');ellipse(-35,-83,9,17,'#503b31');}
  ellipse(-10,-95,3.4,5,'#35414a');ellipse(10,-95,3.4,5,'#35414a');
  ellipse(-11,-97,1.2,1.5,'#fff');ellipse(9,-97,1.2,1.5,'#fff');
  ctx.beginPath();ctx.arc(0,-89,8,.15,Math.PI-.15);ctx.strokeStyle='#9b6049';ctx.lineWidth=2;ctx.stroke();
  if(role==='batter') {
    // Batting helmet, distinct from the pitcher's/fielder's cloth cap.
    ctx.beginPath();ctx.ellipse(0,-109,34,23,0,Math.PI,Math.PI*2);ctx.lineTo(34,-103);ctx.lineTo(-34,-103);ctx.closePath();ctx.fillStyle=jersey;ctx.fill();
    roundRect(-35,-109,70,10,5,jersey);roundRect(19,-108,14,29,7,jersey);
    line([[-20,-122],[9,-127]],'#ffffff55',4);ellipse(26,-94,3,4,'#263d4b');
    roundRect(13,-108,37,7,4,jersey);
    const a = swing && ['flight','result'].includes(state) ? Math.min(1,(elapsed-swing.inputTime)/.20) : 0;
    ctx.save();ctx.translate(18,-62);ctx.rotate(-.38+a*2.5);
    line([[0,0],[-15,-17]],'#edbf95',11);line([[-15,-17],[-28,-70]],'#c59250',9);line([[-16,-23],[-13,-14]],'#fff5e8',11);ctx.restore();
  } else {
    ctx.beginPath();ctx.ellipse(0,-114,32,18,0,Math.PI,Math.PI*2);ctx.lineTo(32,-108);ctx.lineTo(-32,-108);ctx.closePath();ctx.fillStyle=jersey;ctx.fill();roundRect(-33,-112,71,8,4,jersey);text('C',0,-115,13,trim,'center');
  }
  ctx.restore();
}

function drawField() {
  const sky=ctx.createLinearGradient(0,0,0,280);sky.addColorStop(0,'#91cce1');sky.addColorStop(1,'#dbedf0');ctx.fillStyle=sky;ctx.fillRect(-1600,0,4480,H);
  [[180,90],[490,61],[1030,100]].forEach(([x,y])=>{ellipse(x,y,65,14,'#ffffff6b');ellipse(x+30,y-9,32,20,'#ffffff6b');});
  // Neighborhood and tree line.
  for(let i=-16;i<30;i++){const x=i*97-20;roundRect(x,191-(i%3)*12,63,57,2,i%2?'#c7c6ab':'#b6c6b4');ctx.beginPath();ctx.moveTo(x-7,193-(i%3)*12);ctx.lineTo(x+32,167-(i%3)*12);ctx.lineTo(x+71,193-(i%3)*12);ctx.fillStyle='#829e94';ctx.fill();}
  for(let i=-33;i<61;i++){const x=i*49;line([[x,235],[x,170]],'#769678',8);ellipse(x,175+(i%3)*5,34,36,i%2?'#65946e':'#77a37d');}
  ctx.fillStyle='#357766';ctx.fillRect(-1600,221,4480,53);ctx.fillStyle='#c9d5ba';ctx.fillRect(-1600,220,4480,5);
  for(let i=-29;i<53;i++){line([[i*56,225],[i*56,271]],'#8eb89b55',1);}
  roundRect(926,162,200,103,5,'#244e4e','#c4d8bf');text('RIVERSIDE',1026,186,16,'#c7ddd0','center');text('PRACTICE',1026,209,12,'#b3cabb','center');text('CORAL  ·  NAVY',1026,240,15,'#fff4d9','center');
  ctx.fillStyle='#75a95b';ctx.fillRect(-1600,274,4480,H-274);
  for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(640,250);ctx.lineTo(i*180-600,H);ctx.lineTo(i*180-510,H);ctx.fillStyle='#ffffff08';ctx.fill();}
  // Infield perspective, foul lines and home plate.
  ctx.beginPath();ctx.moveTo(640,280);ctx.bezierCurveTo(330,305,200,438,80,535);ctx.lineTo(566,720);ctx.lineTo(1280,625);ctx.bezierCurveTo(1110,432,973,310,640,280);ctx.fillStyle='#d8af7c';ctx.fill();
  ctx.beginPath();ctx.moveTo(640,292);ctx.lineTo(965,433);ctx.lineTo(681,590);ctx.lineTo(344,438);ctx.closePath();ctx.fillStyle='#80ae64';ctx.fill();
  ellipse(653,344,62,18,'#d8af7c');roundRect(642,337,23,5,1,'#fff8e4');
  line([[700,666],[65,437]],'#fff5dd',4);line([[700,666],[1238,380]],'#fff5dd',4);
  [[350,438],[640,290],[963,436]].forEach(([x,y])=>{ctx.save();ctx.translate(x,y);ctx.rotate(.35);ctx.fillStyle='#fff5dd';ctx.fillRect(-11,-5,22,10);ctx.restore();});
  ellipse(699,647,150,48,'#cda070');
  ctx.beginPath();ctx.moveTo(679,648);ctx.lineTo(719,648);ctx.lineTo(723,661);ctx.lineTo(701,677);ctx.lineTo(677,661);ctx.closePath();ctx.fillStyle='#fff8e8';ctx.fill();
  line([[570,597],[625,616],[613,674],[558,655],[570,597]],'#f6e5c8',2);
  // Distant fielders and the opposing pitcher.
  [[224,326,.42],[413,293,.36],[861,293,.36],[1076,329,.43],[404,395,.56],[942,397,.56]].forEach(([x,y,s])=>player(x,y,s));
  const releasePose=state==='windup'?Math.sin(windup*5)*.7:state==='flight'?Math.max(0,1-elapsed*4):0;
  player(653,348,.76,'navy','pitcher',releasePose);
  player(477,678,1.78,'coral','batter');
}

function ballPosition(p, t) {
  const progress=Math.max(0,Math.min(1.22,t/p.duration));
  // Perspective acceleration and late curve preserve the actual terminal target.
  const depth=progress*progress;
  const target=zonePoint(p.x,p.y);
  return {x:675+(target.x-675)*depth + Math.sin(Math.min(1,progress)*Math.PI)*p.bend*60,
    y:263+(target.y-263)*depth-Math.sin(Math.min(1,progress)*Math.PI)*42,r:4+depth*11};
}

function drawBall(p,t,trail=true) {
  if(trail){for(let i=4;i>0;i--){const b=ballPosition(p,Math.max(0,t-i*.025));ellipse(b.x,b.y,b.r*(1-i*.1),b.r*(1-i*.1),`rgba(255,253,237,${.13-i*.02})`);}}
  const b=ballPosition(p,t);ellipse(b.x+4,b.y+26,b.r*.8,b.r*.22,'#183d4422');ellipse(b.x,b.y,b.r,b.r,'#fffdf2');
  ctx.beginPath();ctx.arc(b.x-b.r*.5,b.y,b.r*.7,-1,1);ctx.strokeStyle='#c66358';ctx.lineWidth=Math.max(1,b.r*.13);ctx.stroke();
  ctx.beginPath();ctx.arc(b.x+b.r*.5,b.y,b.r*.7,2.1,4.1);ctx.stroke();
}

function drawAim() {
  ctx.save();ctx.lineWidth=2;ctx.setLineDash([8,7]);ctx.strokeStyle='#ffffffa6';ctx.strokeRect(plate.x-plate.sx,plate.y-plate.sy,plate.sx*2,plate.sy*2);ctx.setLineDash([]);
  ctx.strokeStyle='#ffffff30';for(const n of [-1/3,1/3]){line([[plate.x+n*plate.sx,plate.y-plate.sy],[plate.x+n*plate.sx,plate.y+plate.sy]],'#ffffff30',1);line([[plate.x-plate.sx,plate.y+n*plate.sy],[plate.x+plate.sx,plate.y+n*plate.sy]],'#ffffff30',1);}
  const a=zonePoint(aim.x,aim.y);ctx.beginPath();ctx.arc(a.x,a.y,24,0,Math.PI*2);ctx.strokeStyle='#173e49';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#fff9dc';ctx.lineWidth=3;ctx.stroke();
  line([[a.x-32,a.y],[a.x-17,a.y]],'#fff9dc',3);line([[a.x+17,a.y],[a.x+32,a.y]],'#fff9dc',3);line([[a.x,a.y-32],[a.x,a.y-17]],'#fff9dc',3);line([[a.x,a.y+17],[a.x,a.y+32]],'#fff9dc',3);
  if(state==='flight' && $('guide').checked){
    const fraction=Math.max(0,Math.min(1,(session[pitchIndex].duration-elapsed)/session[pitchIndex].duration));
    ctx.beginPath();ctx.arc(a.x,a.y,24+fraction*67,0,Math.PI*2);ctx.strokeStyle='#ffe8a4aa';ctx.lineWidth=3;ctx.stroke();
  }
  if(currentResult && ['result','review'].includes(state)){
    const p=session[pitchIndex],target=zonePoint(p.x,p.y);line([[a.x,a.y],[target.x,target.y]],'#fff6cd99',2);ellipse(target.x,target.y,6,6,'#fff5c4');
  }
  ctx.restore();
  // A relative-drag area keeps the aiming thumb away from the pitch.
  ctx.beginPath();ctx.arc(165,571,55,0,Math.PI*2);ctx.fillStyle='#fffaf119';ctx.fill();ctx.strokeStyle='#fffaf170';ctx.lineWidth=2;ctx.stroke();
  ellipse(165+aim.x*13,571-aim.y*13,17,17,'#fffaf16b');text('DRAG TO AIM',165,650,13,'#fff9e9','center');
}

function render() {
  const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  const px=Math.round(bounds.width*dpr),py=Math.round(bounds.height*dpr);
  if(canvas.width!==px||canvas.height!==py){canvas.width=px;canvas.height=py;}
  // Fit the stance vertically; expand scenery on wide phones, crop sides in portrait.
  const scale=bounds.height/H, offsetX=(bounds.width-W*scale)/2;
  ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*offsetX,0);ctx.clearRect(-1000,0,4000,H);
  drawField();drawAim();
  if(state==='flight')drawBall(session[pitchIndex],elapsed);
  if(state==='result'){
    const p=session[pitchIndex];
    if(currentResult.kind==='hit'||currentResult.kind==='foul'){
      const end=zonePoint(p.x,p.y),t=resultTime;
      const side=currentResult.kind==='foul'?-1:1;
      const bx=end.x+side*t*300,by=end.y-t*440+t*t*130;
      ellipse(bx,by,Math.max(3,14-t*5),Math.max(3,14-t*5),'#fff9dd');
      line([[bx-side*30,by+16],[bx-side*10,by+6]],'#fff9dd88',3);
    }else if(resultTime<.25)drawBall(p,Math.min(p.duration+.22,elapsed+resultTime));
  }
}

function updateHUD() {
  const summary=summarize(results);
  $('pitch-number').textContent=`${Math.min(pitchIndex+1,SESSION_LENGTH)} / ${SESSION_LENGTH}`;
  $('score').textContent=summary.score;$('hits').textContent=summary.fairHits;
  $('progress').replaceChildren(...Array.from({length:SESSION_LENGTH},(_,i)=>{const dot=document.createElement('i');dot.className=results[i]?.kind??(i===pitchIndex?'current':'');return dot;}));
}
function showPanel(id) {
  $('overlay').hidden=!id;
  for(const panel of ['intro','result-panel','paused-panel'])$(panel).hidden=panel!==id;
}
function beginPitch() {
  showPanel(null);state='windup';windup=0;elapsed=0;resultTime=0;swing=null;currentResult=null;
  $('swing').disabled=true;$('pause').disabled=false;$('pause').textContent='Pause';$('feedback').textContent='';
  $('pitch-label').textContent=`PITCH ${pitchIndex+1} · GET READY`;
  $('status').textContent=pitchIndex<3?'Warm-up fastball. Find the ball with the aiming ring.':'Watch the flight. Changeups arrive later; curves bend.';
  updateHUD();
}
function attemptSwing() {
  if(state!=='flight'||swing)return;
  swing={inputTime:elapsed,impactTime:elapsed+SWING_LEAD,aim:{...aim}};
  currentResult=judgeSwing(session[pitchIndex],swing.aim,swing.impactTime);
  $('swing').disabled=true;
}
function finishPitch(result) {
  currentResult=result;results.push(result);state='result';resultTime=0;
  $('swing').disabled=true;$('pause').disabled=true;$('feedback').textContent=result.title;updateHUD();
}
function metrics(entries) {
  $('result-metrics').replaceChildren(...entries.map(([label,value])=>{const span=document.createElement('span'),strong=document.createElement('strong');span.append(document.createTextNode(label));strong.textContent=value;span.append(strong);return span;}));
}
function showReview() {
  state='review';showPanel('result-panel');$('feedback').textContent='';
  const r=currentResult;
  $('result-kicker').textContent=`PITCH ${pitchIndex+1} OF ${SESSION_LENGTH}`;$('result-title').textContent=r.title;$('result-detail').textContent=r.detail;
  metrics([['POINTS',`+${r.points}`],['TIMING',r.timingMs===null?'Taken':`${Math.round(Math.abs(r.timingMs))} ms ${r.timingMs<0?'early':'late'}`],['AIM',r.distance===undefined?'—':r.distance<.25?'Centered':r.distance<.64?'Close':'Wide']]);
  $('next').textContent=pitchIndex===SESSION_LENGTH-1?'See practice results →':'Next pitch →';$('next').focus({preventScroll:true});
}
function showSummary() {
  state='summary';const s=summarize(results);
  $('result-kicker').textContent='PRACTICE COMPLETE';$('result-title').textContent=s.fairHits>=6?'Finding your rhythm!':'Every swing is a start.';
  $('result-detail').textContent=`${s.contact} contacts from 10 pitches, including ${s.goodTakes} well-judged takes. Try another round or change speed.`;
  metrics([['SCORE',s.score],['FAIR HITS',`${s.fairHits} / 10`],['AVG. TIMING',s.averageTimingMs===null?'—':`${s.averageTimingMs} ms`]]);
  $('next').textContent='Back to practice setup →';
  $('status').textContent='Practice complete. Review your timing and try again.';
}
function setup() {
  state='intro';results=[];pitchIndex=0;swing=null;currentResult=null;aim={x:0,y:0};syncAim();
  showPanel('intro');$('swing').disabled=true;$('pause').disabled=true;$('pause').textContent='Pause';$('feedback').textContent='';$('pitch-label').textContent='WARM UP';
  $('status').textContent='Start with three fastballs. Then watch for curves and changes.';updateHUD();
}
function togglePause() {
  if(state==='paused'){state=previousState;showPanel(null);$('pause').textContent='Pause';$('swing').disabled=state!=='flight'||!!swing;last=performance.now();return;}
  if(!['windup','flight'].includes(state))return;
  previousState=state;state='paused';showPanel('paused-panel');$('pause').textContent='Resume';$('swing').disabled=true;$('resume').focus({preventScroll:true});
}
function syncAim(){ $('aim-x').value=Math.round(aim.x*100);$('aim-y').value=Math.round(aim.y*100); }
function pointerAim(event) {
  if(!['windup','flight','intro'].includes(state)||swing)return;
  const r=canvas.getBoundingClientRect(),s=r.height/H,ox=(r.width-W*s)/2;
  const x=(event.clientX-r.left-ox)/s,y=(event.clientY-r.top)/s;
  if(!dragOrigin)return;
  const nx=dragOrigin.direct?(x-plate.x)/plate.sx:dragOrigin.aim.x+(x-dragOrigin.x)/plate.sx*.7;
  const ny=dragOrigin.direct?(plate.y-y)/plate.sy:dragOrigin.aim.y-(y-dragOrigin.y)/plate.sy*.7;
  aim={x:Math.max(-1.8,Math.min(1.8,nx)),y:Math.max(-1.5,Math.min(1.5,ny))};syncAim();
}
canvas.addEventListener('pointerdown',e=>{
  const r=canvas.getBoundingClientRect(),s=r.height/H,ox=(r.width-W*s)/2;
  const x=(e.clientX-r.left-ox)/s,y=(e.clientY-r.top)/s;
  dragging=true;dragOrigin={x,y,aim:{...aim},direct:Math.abs(x-plate.x)<plate.sx*2.2&&Math.abs(y-plate.y)<plate.sy*1.8};
  canvas.setPointerCapture(e.pointerId);pointerAim(e);
});
canvas.addEventListener('pointermove',e=>{if(dragging)pointerAim(e);});
canvas.addEventListener('pointerup',()=>{dragging=false;dragOrigin=null;});canvas.addEventListener('pointercancel',()=>{dragging=false;dragOrigin=null;});
$('swing').addEventListener('pointerdown',e=>{e.preventDefault();attemptSwing();});
$('swing').addEventListener('click',attemptSwing);
$('start').addEventListener('click',()=>{session=makeSession(seed++,$('speed').value);beginPitch();});
$('next').addEventListener('click',()=>{if(state==='summary'){setup();$('start').focus();}else if(state==='review'){if(pitchIndex===SESSION_LENGTH-1)showSummary();else{pitchIndex++;beginPitch();}}});
$('restart').addEventListener('click',()=>{setup();$('start').focus();});
$('pause').addEventListener('click',togglePause);$('resume').addEventListener('click',togglePause);
$('access-toggle').addEventListener('click',()=>{const open=$('aim-controls').hidden;$('aim-controls').hidden=!open;$('access-toggle').setAttribute('aria-expanded',String(open));});
for(const axis of ['x','y'])$('aim-'+axis).addEventListener('input',e=>{if(!swing)aim[axis]=Number(e.target.value)/100;});
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.code==='Space'&&state==='flight'){e.preventDefault();attemptSwing();}
  if(e.code==='Enter'&&['review','summary'].includes(state)&&e.target.tagName!=='BUTTON'){e.preventDefault();$('next').click();}
  if(e.code.startsWith('Arrow')&&['flight','windup','intro'].includes(state)&&!swing){e.preventDefault();aim.x=Math.max(-1.8,Math.min(1.8,aim.x+(e.code==='ArrowRight'?.1:e.code==='ArrowLeft'?-.1:0)));aim.y=Math.max(-1.5,Math.min(1.5,aim.y+(e.code==='ArrowUp'?.1:e.code==='ArrowDown'?-.1:0)));syncAim();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['windup','flight'].includes(state)){pausedByVisibility=true;togglePause();}else if(!document.hidden&&pausedByVisibility){pausedByVisibility=false;last=performance.now();}});
function frame(now) {
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  if(state==='windup'){
    windup+=dt;if(windup>=.8){state='flight';elapsed=0;$('swing').disabled=false;$('pitch-label').textContent='BALL IN FLIGHT';}
  }else if(state==='flight'){
    elapsed+=dt;const p=session[pitchIndex];
    if(swing&&elapsed>=swing.impactTime&&['hit','foul'].includes(currentResult.kind))finishPitch(currentResult);
    else if(elapsed>=Math.max(p.duration+.22,swing?.impactTime??0))finishPitch(swing?currentResult:judgeTake(p));
  }else if(state==='result'){resultTime+=dt;if(resultTime>=1.05)showReview();}
  render();requestAnimationFrame(frame);
}
setup();requestAnimationFrame(frame);
