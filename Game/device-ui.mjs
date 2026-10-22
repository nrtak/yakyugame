import {DeviceGame} from './device-game.mjs';
import {createSceneRenderer,SCENE_GEOMETRY} from './scene-render.mjs';
import {BASE_POINTS} from './defense-play.mjs';
import {TEAMS,playerById} from './rosters.mjs';
const $=id=>document.getElementById(id),canvas=$('field'),ctx=canvas.getContext('2d'),renderer=createSceneRenderer(canvas);
let game=new DeviceGame(),loaded=false,last=performance.now(),drag=null,lastField=null,shown='';
function overlay(which){$('overlay').hidden=!which;for(const id of ['menu','paused','results'])$(id).hidden=id!==which;}
function dot(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function label(text,x,y,size=22,color='#173747'){ctx.font=`bold ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y);ctx.textAlign='start';}
function tactical(s){
 ctx.fillStyle='#9fca82';ctx.fillRect(0,0,1600,960);for(let y=0;y<960;y+=110){ctx.fillStyle='#ffffff0c';ctx.fillRect(0,y,1600,55);}
 const center=s.ball,project=p=>({x:800+(p.x-center.x)*6,y:480-(p.y-center.y)*6});
 const pts=['HOME','1B','2B','3B'].map(b=>project(BASE_POINTS[b]));ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(const p of pts.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fillStyle='#d5af7d';ctx.fill();
 ctx.strokeStyle='#fff5d9';ctx.lineWidth=6;ctx.beginPath();for(const p of [project({x:-300,y:300}),pts[0],project({x:300,y:300})])ctx.lineTo(p.x,p.y);ctx.stroke();
 for(const [base,p]of Object.entries(BASE_POINTS)){const q=project(p);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.PI/4);ctx.fillStyle='white';ctx.fillRect(-13,-13,26,26);ctx.restore();label(base,q.x+40,q.y+10,22);}
 const team=TEAMS.find(t=>t.id===s.teamId);for(const p of s.players){const q=project(p.point);if(q.x<0||q.x>1600||q.y<50||q.y>880)continue;dot(q.x,q.y,30,p.id===s.fielderId?'#b88729':team.color);label(p.position,q.x,q.y+8,22,'white');label(p.name,q.x,q.y+58,22);}
 for(const r of s.runners){if(r.out)continue;const q=project(r.point);dot(q.x,q.y,23,'#d7675c');ctx.strokeStyle='white';ctx.lineWidth=3;ctx.stroke();label(playerById(r.id).name,q.x,q.y-34,20,'#8f292b');}
 const b=project(s.ball);b.y-=s.ball.z*6;dot(b.x+3,b.y+5,12,'#17374755');dot(b.x,b.y,12,'#fffdf4');ctx.strokeStyle='#d45c55';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-4,b.y-8);ctx.lineTo(b.x+4,b.y+8);ctx.stroke();
 label('NAMED POSITION MARKERS · CHARACTER ACTIONS PENDING',800,925,20,'#173747');
 if(s.playType||s.call){const word=s.playType==='tripleplay'?'TRIPLE PLAY':s.playType==='doubleplay'?'DOUBLE PLAY':s.call==='out'?'FORCE OUT':s.call==='safe'?'SAFE':'NO FORCE · TAG REQUIRED';ctx.fillStyle='#173b56e8';ctx.fillRect(500,135,600,70);label(word,800,183,32,'white');}
}
function pitching(){
 ctx.fillStyle='#8fbf78';ctx.fillRect(0,0,1600,960);ctx.fillStyle='#d8b783';ctx.beginPath();ctx.ellipse(800,345,240,100,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(800,830,260,90,0,0,Math.PI*2);ctx.fill();
 const batsRight=game.batter.bats==='R',bx=batsRight?1000:600;dot(800,815,85,TEAMS.find(t=>t.id===game.teamId).color);label(game.pitcher.name+' · '+game.pitcher.throws+'HP',800,828,30,'white');
 dot(800,260,35,'#173747');label('C',800,271,25,'white');dot(bx,330,50,'#cc625a');label(game.batter.name+' · '+game.batter.bats+' BAT',bx,410,24);label('Character artwork pending',800,920,23);
 const z={x:800,y:340,rx:100,ry:115};ctx.strokeStyle='#fff9';ctx.lineWidth=3;ctx.strokeRect(z.x-z.rx,z.y-z.ry,z.rx*2,z.ry*2);const tx=z.x+game.aim.x*z.rx,ty=z.y-game.aim.y*z.ry;ctx.strokeStyle='white';ctx.beginPath();ctx.arc(tx,ty,32,0,Math.PI*2);ctx.stroke();
 if(game.phase==='flight'&&game.pitch){const q=Math.min(1.2,game.elapsed/game.pitch.duration),e=q*q,x=800+(game.pitcher.throws==='R'?65:-65);dot(x+(z.x+game.pitch.x*z.rx-x)*e,740+(z.y-game.pitch.y*z.ry-740)*e,13-5*Math.min(1,q),'#fffdf4');}
 label('1B SIDE',300,300,20);label('3B SIDE',1300,300,20);
}
function draw(){
 if(game.phase==='field'||(game.phase==='review'&&lastField)){tactical(game.defense??lastField);return;}
 if(!game.userBatting&&game.phase!=='menu'){pitching();return;}
 const s=game.sceneState();if(s.pitch&&game.pitcher.throws==='L')s.pitch={...s.pitch,release:{x:1000,y:SCENE_GEOMETRY.release.y}};renderer.draw(s);
}
function results(){
 const m=game.match;$('winner').textContent=m.winner===null?'A friendly draw':TEAMS[m.winner].name+' wins';$('final-score').textContent=`CORAL ${m.score[0]} — ${m.score[1]} NAVY`;
 const table=document.createElement('table'),head=document.createElement('tr');for(const t of ['Player','AB','H','R','RBI']){const th=document.createElement('th');th.textContent=t;head.append(th);}table.append(head);
 for(const team of TEAMS)for(const p of team.players){const s=m.stats[p.id];if(!s.ab&&!s.bb&&!s.r)continue;const tr=document.createElement('tr');for(const v of [team.short+' · '+p.name,s.ab,s.h,s.r,s.rbi]){const td=document.createElement('td');td.textContent=v;tr.append(td);}table.append(tr);}$('stats').replaceChildren(table);
}
function update(){
 const m=game.match,field=game.phase==='field',s=game.defense;$('coral').textContent='CORAL '+m.score[0];$('navy').textContent='NAVY '+m.score[1];$('half').textContent=m.over?'FINAL':(m.half===0?'TOP':'BOT')+' 1';$('count').textContent=`B ${m.balls} · S ${m.strikes} · O ${m.outs+(field?s?.playOuts??0:0)}`;
 $('pause').disabled=['menu','final'].includes(game.phase);$('pad').hidden=field||['review','menu','final'].includes(game.phase);$('action').hidden=field||['review','menu','final'].includes(game.phase);$('action').textContent=game.userBatting?'SWING':'PITCH';$('action').disabled=game.paused||(game.userBatting?game.phase!=='flight'||game.swingAt!==null:game.phase!=='pitch-ready');$('pitches').hidden=game.userBatting||game.phase!=='pitch-ready';
 for(const p of document.querySelectorAll('[data-pitch]')){p.setAttribute('aria-pressed',String(p.dataset.pitch===game.pitchKind));p.disabled=game.paused;}
 $('throws').hidden=!field||game.userBatting;for(const b of document.querySelectorAll('[data-base]')){b.disabled=game.paused||!s?.canThrow;b.classList.toggle('recommended',s?.canThrow&&s.recommendation===b.dataset.base);}
 $('next').hidden=game.phase!=='review';$('next').textContent=m.over?'See results →':game.event?.halfEnded?'Change sides →':'Next pitch →';
 let message=game.batter.name+' · '+game.batter.bats+' BAT vs '+game.pitcher.name+' · '+game.pitcher.throws+'HP';
 if(game.phase==='field')message=game.userBatting?'Defense follows the ball':s?.canThrow?'Ball secured · Tap a base'+(s.playOuts?' for another out':''):s?.phase==='approach'?'Fielding the ground ball':s?.phase==='carry'?'Touching the bag':'Follow the throw';
 else if(game.phase==='pitch-ready')message+=' · Aim, choose a pitch, tap Pitch';else if(game.phase==='review')message=game.event.title+' · '+game.event.detail;
 $('message').textContent=message;
 if(game.paused)overlay('paused');else if(game.phase==='menu')overlay('menu');else if(game.phase==='final'){if(shown!=='final')results();overlay('results');}else overlay(null);shown=game.paused?'paused':game.phase;
}
function begin(){if(!loaded)return;game=new DeviceGame({teamId:$('team').value,seed:211});lastField=null;game.start();last=performance.now();update();}
function act(){game.userBatting?game.swing():game.releasePitch();update();}
function pause(){game.pause();drag=null;last=performance.now();update();}
window.GameLifecycle={pause};
for(const id of ['start','again'])$(id).addEventListener('click',begin);$('pause').addEventListener('click',pause);$('resume').addEventListener('click',()=>{game.resume();last=performance.now();update();});$('exit').addEventListener('click',()=>{game.reset();lastField=null;update();});$('next').addEventListener('click',()=>{lastField=null;game.next();last=performance.now();update();});
for(const b of document.querySelectorAll('[data-pitch]'))b.addEventListener('click',()=>{game.choosePitch(b.dataset.pitch);for(const p of document.querySelectorAll('[data-pitch]'))p.setAttribute('aria-pressed',String(p===b));});for(const b of document.querySelectorAll('[data-base]'))b.addEventListener('click',()=>{game.throwTo(b.dataset.base);update();});
function beginDrag(e){const p=renderer.point(e);drag={id:e.pointerId,start:p,aim:{...game.aim}};e.currentTarget.setPointerCapture(e.pointerId);}
function moveDrag(e){if(!drag||drag.id!==e.pointerId)return;const p=renderer.point(e);game.setAim(drag.aim.x+(p.x-drag.start.x)/150,drag.aim.y-(p.y-drag.start.y)/150);}
for(const id of ['field','pad']){$(id).addEventListener('pointerdown',e=>{e.preventDefault();beginDrag(e);});$(id).addEventListener('pointermove',moveDrag);for(const t of ['pointerup','pointercancel'])$(id).addEventListener(t,()=>{drag=null;});}
 $('action').addEventListener('pointerdown',e=>{e.preventDefault();act();});$('action').addEventListener('click',e=>{if(e.detail===0)act();});
document.addEventListener('keydown',e=>{if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Space'&&!e.repeat&&e.target.tagName!=='BUTTON'){e.preventDefault();act();}if(e.code.startsWith('Arrow')){e.preventDefault();game.setAim(game.aim.x+(e.code==='ArrowRight'?.1:e.code==='ArrowLeft'?-.1:0),game.aim.y+(e.code==='ArrowUp'?.1:e.code==='ArrowDown'?-.1:0));}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();last=performance.now();});
function frame(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(game.phase==='field')lastField=game.defense;game.step(dt);draw();update();requestAnimationFrame(frame);}
renderer.ready.then(()=>{loaded=true;$('start').disabled=false;$('start').textContent='Play one inning';requestAnimationFrame(frame);}).catch(()=>{$('message').textContent='Artwork could not load. Please reopen the app.';$('start').textContent='Unable to load artwork';});
