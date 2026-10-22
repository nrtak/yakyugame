import {swingFrame,pitcherFrame} from './scene-engine.mjs';
import {usesFieldView,fieldPlay} from './field-camera.mjs';
export const SCENE_ASSETS={flyFielder:'assets/scene-mia-fly-return-v1.png',fieldThrow:'assets/scene-ken-sora-throw-v1.png',fieldPark:'assets/scene-field-elevated-v1.png',fielder:'assets/scene-ken-field-v1.png',park:'assets/scene-ballpark-v2.png',batterReady:'assets/scene-emma-ready-v7.png',batterMotion:'assets/scene-emma-motion-v7.png',pitcherSet:'assets/scene-ryan-set-v3.png',pitcherLift:'assets/scene-ryan-lift-v3.png',pitcherStride:'assets/scene-ryan-stride-v3.png',pitcherRelease:'assets/scene-ryan-release-v3.png',pitcherRecovery:'assets/scene-ryan-recovery-v3.png'};
// Whole-body v7 drawings share a planted front-foot anchor. These are local
// review assets, not a fully validated anatomical animation or final art.
export const BATTER_POSES=[
 {asset:'batterReady',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[672,1338],world:[580,843],scale:.6},
 {asset:'batterMotion',sourceWidth:1774,rect:[130,0,960,887],anchor:[573,837],world:[580,843],scale:.9},
 {asset:'batterMotion',sourceWidth:1774,rect:[130,0,960,887],anchor:[573,837],world:[580,843],scale:.9},
 {asset:'batterMotion',sourceWidth:1774,rect:[1095,0,679,887],anchor:[1595,838],world:[580,843],scale:.9}
];
export function batterPoint(frame,point){const p=BATTER_POSES[frame];return{x:p.world[0]+(point[0]-p.anchor[0])*p.scale,y:p.world[1]+(point[1]-p.anchor[1])*p.scale};}
// Local whole-body review drawings: R throws, L wears glove. Never mirror.
// Register the R pivot sole for set/lift, then the L landing sole through recovery.
// Positive uniform scaling preserves the drawings; this is not final anatomy approval.
export const PITCHER_POSES=[
 {asset:'pitcherSet',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[696,1430],world:[957,546],support:'R'},
 {asset:'pitcherLift',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[600,1470],world:[957,546],support:'R'},
 {asset:'pitcherStride',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[650,1480],world:[988,590],support:'L'},
 {asset:'pitcherRelease',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[658,1450],world:[988,590],support:'L'},
 {asset:'pitcherRecovery',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[775,1475],world:[988,590],support:'L'}
];
export const PITCHER_SCALE=.15;
export function pitcherPoint(frame,point){const p=PITCHER_POSES[frame];return {x:p.world[0]+(point[0]-p.anchor[0])*PITCHER_SCALE,y:p.world[1]+(point[1]-p.anchor[1])*PITCHER_SCALE};}
export const PITCH_RELEASE_FRAME=3;
export const PITCH_RELEASE_HAND=[158,250];
// Preserve the existing hitting target while aligning the new barrel to it.
export const BAT_CONTACT_POINT=batterPoint(2,[573+320/.9,837-320/.9]);
export const SCENE_GEOMETRY={width:1600,height:960,zone:{...BAT_CONTACT_POINT,rx:65,ry:86},release:pitcherPoint(PITCH_RELEASE_FRAME,PITCH_RELEASE_HAND)};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function pitchPosition(p,t){const q=clamp(t/p.duration,0,1.2),z=SCENE_GEOMETRY.zone,r=p.release??SCENE_GEOMETRY.release,e=q*q;return {x:r.x+(z.x+p.x*z.rx-r.x)*e+Math.sin(Math.PI*clamp(q,0,1))*p.bend*40,y:r.y+(z.y-p.y*z.ry-r.y)*e,r:6+8*e};}
export function createSceneRenderer(canvas){const c=canvas.getContext('2d'),art={};const ready=Promise.all(Object.entries(SCENE_ASSETS).map(([key,src])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{art[key]=img;resolve();};img.onerror=()=>reject(new Error('Unable to load '+key));img.src=src;})));
 function oval(x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 function sprite(image,rect,anchor,world,scale){c.drawImage(image,...rect,world[0]+(rect[0]-anchor[0])*scale,world[1]+(rect[1]-anchor[1])*scale,rect[2]*scale,rect[3]*scale);}
 function pitcher(frame){const p=PITCHER_POSES[frame],img=art[p.asset];const k=img.naturalWidth/p.sourceWidth;oval(p.world[0],p.world[1],24,4,'#173b3e30');sprite(img,p.rect.map(v=>v*k),p.anchor.map(v=>v*k),p.world,PITCHER_SCALE/k);}
 function batter(frame){const p=BATTER_POSES[frame],img=art[p.asset],k=img.naturalWidth/p.sourceWidth;
  sprite(img,p.rect.map(v=>v*k),p.anchor.map(v=>v*k),p.world,p.scale/k);
 }
 function ball(x,y,r){oval(x+2,y+4,r,r,'#14324542');oval(x,y,r,r,'#fffdf2');c.save();c.translate(x,y);c.strokeStyle='#df625d';c.lineWidth=Math.max(1,r*.12);for(const side of [-1,1]){c.beginPath();c.arc(side*r*.8,0,r*.7,side<0?-.9:2.2,side<0?.9:4.1);c.stroke();}c.restore();}
 function fieldView(s){
  const f=fieldPlay(s),v=f.camera,scale=1600/v.width;
  c.save();c.scale(scale,scale);c.translate(-v.x,-v.y);
  c.drawImage(art.fieldPark,0,0,1536,1024);
  const pose=f.gathering?2:Math.floor(f.t*7)%2;
  const poses=[{rect:[0,0,510,1024],anchor:[240,900]},{rect:[512,0,510,1024],anchor:[770,900]},{rect:[1024,0,512,1024],anchor:[1275,800]}];
  const p=poses[pose],k=art.fielder.naturalWidth/1536;
  const throwPoses=[{rect:[0,0,520,1024],anchor:[470,920]},{rect:[520,0,504,1024],anchor:[930,920]},{rect:[1024,0,512,1024],anchor:[1470,705]}];
  const actionSprite=(n,where)=>{const p=throwPoses[n],k=art.fieldThrow.naturalWidth/1536;sprite(art.fieldThrow,p.rect.map(v=>v*k),p.anchor.map(v=>v*k),[where.x,where.y],.115/k);};
  // Receiver covers the bag before the throw; the bag is not the ball target.
  oval(f.receiver.x,f.receiver.y,19,5,'#193c4050');
  actionSprite(2,f.receiver);
  oval(f.fielder.x,f.fielder.y,19,5,'#193c4050');
  if(f.flyBall){const poses=[{rect:[0,0,545,1024],anchor:[280,960]},{rect:[550,0,500,1024],anchor:[810,970]},{rect:[1055,0,481,1024],anchor:[1305,980]}],p=poses[f.flyPose],k=art.flyFielder.naturalWidth/1536;sprite(art.flyFielder,p.rect.map(n=>n*k),p.anchor.map(n=>n*k),[f.fielder.x,f.fielder.y],.115/k);}else if(f.throwing)actionSprite(f.releasing?1:0,f.fielder);else sprite(art.fielder,p.rect.map(n=>n*k),p.anchor.map(n=>n*k),[f.fielder.x,f.fielder.y],.115/k);
  if(!f.collected)oval(f.ground.x,f.ground.y+1,5,2,'#17354070');
  // Possession changes the ball's anchor, never its visibility. Draw it over
  // the open glove pocket so the pickup remains readable on a phone.
  ball(f.ball.x,f.ball.y,4);
  c.restore();
  c.fillStyle='#183b54df';c.fillRect(40,810,410,76);c.fillStyle='#fff';c.font='bold 24px system-ui';c.fillText((f.received?'SORA · 1B':f.flyBall?'MIA · CF':'KEN · SS')+' · '+f.stage,60,844);c.font='18px system-ui';c.fillText(f.flyBall?'Fly catch and return':'First-base timing · runner art pending',60,873);
  if(f.call){c.fillStyle=f.call==='out'?'#a83735ee':'#176b50ee';c.fillRect(630,110,340,65);c.fillStyle='white';c.font='bold 34px system-ui';c.textAlign='center';c.fillText(f.flyBall?'FLY OUT':f.call==='out'?'OUT AT FIRST':'SAFE AT FIRST',800,154);c.textAlign='start';}
 }
 function draw(s){c.clearRect(0,0,1600,960);if(!art.park)return;if(usesFieldView(s)){fieldView(s);return;}c.drawImage(art.park,0,0,1600,960);
  // No captain-clone placeholders: supporting players need their own reviewed art.
  if(!s.pitcherId||s.pitcherId==='navy-stars-ryan')pitcher(pitcherFrame(s));else{oval(957,490,42,42,'#173d59');c.fillStyle='white';c.font='bold 21px system-ui';c.textAlign='center';c.fillText(s.pitcherName+' · LHP',957,498);c.font='16px system-ui';c.fillText('Art pending',957,560);c.textAlign='start';}
  if(!s.batterId||s.batterId==='coral-club-emma'){oval(470,925,87,12,'#173b3e25');batter(swingFrame(s));}
  else{const left=s.batterHand!=='L',x=left?430:1220;c.fillStyle='#193d58e8';c.fillRect(x-150,715,300,115);c.fillStyle='#fff';c.font='bold 25px system-ui';c.textAlign='center';c.fillText(s.batterName+' · '+s.batterHand+' BAT',x,758);c.font='19px system-ui';c.fillText('Character artwork pending',x,795);c.textAlign='start';const t=s.swingAt===null?0:Math.max(0,s.elapsed-s.swingAt),a=t<.14?-1.1+t*9: .2+Math.min(t-.14,.4)*3;c.save();c.translate(left?680:1110,645);c.rotate(left?a:-a);c.strokeStyle='#d5a157';c.lineWidth=22;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(165,-100);c.stroke();c.restore();}
  const z=SCENE_GEOMETRY.zone;c.strokeStyle='#fff9e3bb';c.lineWidth=3;c.strokeRect(z.x-z.rx,z.y-z.ry,z.rx*2,z.ry*2);const x=z.x+s.aim.x*z.rx,y=z.y-s.aim.y*z.ry;
  c.strokeStyle='#fffef0';c.lineWidth=3;c.beginPath();c.arc(x,y,29,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x-39,y);c.lineTo(x-18,y);c.moveTo(x+18,y);c.lineTo(x+39,y);c.moveTo(x,y-39);c.lineTo(x,y-18);c.moveTo(x,y+18);c.lineTo(x,y+39);c.stroke();
  if(s.phase==='flight'){const b=pitchPosition(s.pitch,s.elapsed);ball(b.x,b.y,b.r);const remain=clamp(1-s.elapsed/s.pitch.duration,0,1);c.strokeStyle='#ffe8a9b0';c.lineWidth=2;c.beginPath();c.arc(x,y,29+remain*70,0,Math.PI*2);c.stroke();}
  else if(s.phase==='hit'){const q=clamp(s.clock/1.3,0,1),start=pitchPosition(s.pitch,Math.min(s.pitch.duration,s.swingAt+.14)),dir=fieldPlay(s).direction;const end={x:900+dir*480,y:450};const bx=start.x+(end.x-start.x)*q,by=start.y+(end.y-start.y)*q-Math.sin(q*Math.PI)*200;ball(bx,by,Math.max(3,14*(1-q)));}
 }
 function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*1600/r.width,y:(e.clientY-r.top)*960/r.height};}
 return {ready,draw,point};
}

