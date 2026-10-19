import { TEAMS, playerById, currentBatter, currentPitcher } from './match-engine.mjs';
import { MAYA_ART, CAST_SHEETS, castFrame } from './maya-art.mjs';

export const VIEW_W=1280,VIEW_H=720;
export const getZone=defense=>defense?{x:737,y:307,sx:49,sy:61}:{x:725,y:430,sx:77,sy:95};
export function createRenderer(canvas){
  const c=canvas.getContext('2d');
  let visibleLeft=0,visibleWidth=1280;
  const mayaImages={};
  if(typeof Image==='function')for(const [key,asset] of Object.entries(MAYA_ART)){
    const image=new Image();image.decoding='async';image.src=asset.src;mayaImages[key]=image;
  }
  const castImages={};
  if(typeof Image==='function')for(const [key,src] of Object.entries(CAST_SHEETS)){
    const image=new Image();image.decoding='async';image.src=src;castImages[key]=image;
  }
  const oval=(x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const path=(points,color,width=2)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();};
  const box=(x,y,w,h,r,color)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();};
  const label=(s,x,y,size,color='#fff',align='center')=>{c.fillStyle=color;c.font=`750 ${size}px system-ui`;c.textAlign=align;c.fillText(s,x,y);};
  const poly=(points,color)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=color;c.fill();};

  function character(x,y,s,teamId,p,role='field',pose=0,time=0){
    const frame=castFrame(p.id,role,pose),atlas=frame&&castImages[frame.sheet];
    if(role==='run'&&atlas?.complete&&atlas.naturalWidth>0){
      const head=castFrame(p.id,'bat',0),image=castImages[head.sheet],team=TEAMS[teamId];
      const stride=Math.sin(time*17)*10;
      c.save();c.translate(x,y);c.scale(s,s);
      oval(0,3,27,6,'#173b3e30');
      path([[-10,-47],[-19+stride,-10]],'#fff7ed',15);path([[10,-47],[18-stride,-10]],'#fff7ed',15);
      path([[-19+stride,-20],[-19+stride,-6]],team.color,11);path([[18-stride,-20],[18-stride,-6]],team.color,11);
      box(-30+stride,-8,25,10,4,team.color);box(7-stride,-8,25,10,4,team.color);
      box(-22,-104,44,57,9,teamId===0?'#fff4e8':team.color);
      path([[-19,-94],[-29-stride,-69]],team.color,13);path([[19,-94],[30+stride,-76]],team.color,13);
      path([[-29-stride,-72],[-18-stride,-58]],p.skin,9);path([[30+stride,-78],[19+stride,-93]],p.skin,9);
      path([[-18,-48],[18,-48]],'#3a4247',4);label(p.captain?'C':String(p.number),6,-69,13,teamId===0?team.color:team.trim);
      const [hx,hy,hw,hh]=head.rect,headHeight=58,headWidth=headHeight*(hw*.49)/(hh*.33);
      c.drawImage(image,hx+hw*.32,hy+hh*.12,hw*.49,hh*.33,-headWidth/2,-156,headWidth,headHeight);
      c.restore();return;
    }
    if(role!=='run'&&atlas?.complete&&atlas.naturalWidth>0){
      const [sx,sy,sw,sh]=frame.rect,height=frame.height*s,width=height*sw/sh;
      const left=x-width*frame.anchorX,top=y-height*frame.anchorY;
      oval(x,y+4,30*s,7*s,'#173b3e30');c.save();
      c.beginPath();
      // Packed poses have different silhouettes; keep adjacent helmets and cleats outside each frame.
      const edge=frame.clipRight??1;
      const clip=frame.kind==='field'?[[.28,0],[.76,0],[.76,.12],[1,.23],[1,1],[0,1],[0,.23],[.28,.12]]:
        frame.row===1&&frame.sheet==='navy'?[[0,0],[1,0],[1,.56],[edge,.56],[edge,1],[.75*edge,1],[.75*edge,.89],[.28*edge,.89],[.28*edge,1],[0,1]]:
        frame.row===1?[[0,0],[1,0],[1,.56],[edge,.56],[edge,1],[0,1]]:
        frame.sheet==='navy'&&frame.kind==='bat'?[[0,0],[1,0],[1,1],[.79,1],[.79,.96],[.28,.96],[.28,1],[0,1]]:
        frame.kind==='pitch'&&frame.index===2?[[0,0],[1,0],[1,.44],[.76,.44],[.76,1],[0,1]]:
        frame.kind==='pitch'&&frame.index===3?[[.43,0],[1,0],[1,1],[0,1],[0,.43],[.43,.43]]:
        [[0,0],[1,0],[1,1],[0,1]];
      clip.forEach(([a,b],i)=>i?c.lineTo(left+a*width,top+b*height):c.moveTo(left+a*width,top+b*height));
      c.closePath();c.clip();
      c.drawImage(atlas,sx,sy,sw,sh,left,top,width,height);c.restore();return;
    }
    if(p.id==='c1'&&role==='bat'){
      const key=pose>.28?'follow':'ready',image=mayaImages[key],asset=MAYA_ART[key];
      if(image?.complete&&image.naturalWidth>0){
        const height=186*s,width=height*image.naturalWidth/image.naturalHeight;
        oval(x,y+4,47*s,8*s,'#173b3e30');
        c.drawImage(image,x-width*asset.anchorX,y-height*asset.anchorY,width,height);return;
      }
    }
    const team=TEAMS[teamId],jersey=team.color,trim=team.trim,skin=p.skin,hair=p.hairColor;
    c.save();c.translate(x,y);c.scale(s,s);
    oval(0,3,30,7,'#173b3e35');
    const run=role==='run'?Math.sin(time*17)*9:0;
    path([[-10,-35],[-17+run,-5]],'#fff7e9',16);path([[11,-35],[17-run,-5]],'#fff7e9',16);
    path([[-17+run,-11],[-17+run,-2]],jersey,13);path([[17-run,-11],[17-run,-2]],jersey,13);
    box(-30+run,-7,27,11,5,'#243e4d');box(5-run,-7,29,11,5,'#243e4d');
    box(-25,-80,50,47,12,teamId===0?'#fff3e7':jersey);
    path([[-21,-74],[-27,-55]],jersey,15);path([[21,-74],[27,-55]],jersey,15);
    path([[-19,-34],[20,-34]],'#3a4247',4);path([[0,-75],[0,-38]],teamId===0?jersey:trim,1.5);
    label(p.captain?'C':String(p.number),11,-50,14,teamId===0?jersey:trim);
    // Rounded head, varied hair and clear anime eyes in the temporary A2 model.
    if(p.hair==='pony'){oval(-32,-104,12,26,hair);oval(-36,-85,10,19,hair);}
    if(p.hair==='bob'){oval(-24,-105,13,28,hair);oval(23,-105,13,28,hair);}
    oval(0,-108,33,32,skin);oval(-31,-105,5,8,skin);oval(31,-105,5,8,skin);
    oval(0,-130,31,17,hair);poly([[-31,-131],[-21,-108],[-10,-129],[0,-116],[12,-130],[27,-110],[32,-129]],hair);
    if(p.hair==='curly')for(let k=0;k<6;k++)oval(-26+k*10,-131-(k%2)*4,9,9,hair);
    if(p.hair==='wave')poly([[-29,-132],[-13,-148],[-6,-135],[8,-147],[17,-134],[32,-140],[27,-119]],hair);
    oval(-11,-106,5.4,7.8,'#fff8ef');oval(12,-106,5.4,7.8,'#fff8ef');
    oval(-10,-105,3.5,6,'#5b4030');oval(11,-105,3.5,6,'#5b4030');
    oval(-10,-104,2.2,4.5,'#2c3038');oval(11,-104,2.2,4.5,'#2c3038');
    oval(-11,-108,1.6,2,'#fff');oval(10,-108,1.6,2,'#fff');
    path([[-17,-119],[-7,-120]],hair,2);path([[7,-120],[17,-119]],hair,2);
    c.beginPath();c.arc(1,-98,7,.12,Math.PI-.1);c.strokeStyle='#a66b52';c.lineWidth=2;c.stroke();
    oval(-22,-99,5,2,'#d8847045');oval(23,-99,5,2,'#d8847045');
    if(role==='bat'||role==='run'){
      // A hard helmet with brim and ear guard for every batter and runner.
      c.beginPath();c.ellipse(0,-127,35,24,0,Math.PI,Math.PI*2);c.lineTo(35,-119);c.lineTo(-35,-119);c.closePath();c.fillStyle=jersey;c.fill();
      box(-36,-125,73,10,5,jersey);box(22,-122,14,31,7,jersey);box(20,-122,32,7,3,jersey);
      path([[-24,-139],[-9,-146],[12,-143]],'#ffffff55',3);oval(29,-105,3,4,'#1e3b4d');
      label(p.captain?'C':String(p.number),0,-129,13,trim);
    }else{
      c.beginPath();c.ellipse(0,-132,33,19,0,Math.PI,Math.PI*2);c.lineTo(33,-125);c.lineTo(-33,-125);c.closePath();c.fillStyle=jersey;c.fill();box(-35,-130,73,9,4,jersey);label(p.captain?'C':String(p.number),0,-133,12,trim);
    }
    if(role==='bat'){
      const swingAngle=pose*2.5;
      c.save();c.translate(16,-66);c.rotate(-.48+swingAngle);
      path([[0,0],[-18,-16]],skin,11);path([[-18,-18],[-34,-79]],'#c59255',9);path([[-20,-24],[-17,-14]],'#fff8e9',12);c.restore();
      path([[-26,-59],[6,-62]],skin,10);
    }else if(role==='pitch'){
      path([[25,-65],[33,-45-pose*65]],skin,11);oval(-31,-54,13,16,'#9f7047');
      if(pose>.1)oval(33,-49-pose*65,5,5,'#fffcdf');
    }else if(role==='run'){
      path([[-24,-68],[-30-run,-49]],skin,10);path([[24,-68],[30+run,-49]],skin,10);
    }else{
      path([[-24,-66],[-32,-47]],skin,10);path([[24,-66],[30,-46]],skin,10);oval(-33,-45,14,17,'#a97c50');path([[-41,-54],[-28,-36]],'#785234',2);
      if(p.position==='C'){
        box(-22,-77,44,37,8,'#254653');for(let k=0;k<3;k++)path([[-17,-67+k*9],[17,-67+k*9]],'#6b8289',2);
        oval(0,-109,35,30,'#344d5b66');for(const k of [-1,0,1])path([[-30,-109+k*12],[30,-109+k*12]],'#a7b5b7',2);
        path([[-15,-134],[-15,-80]],'#a7b5b7',2);path([[15,-134],[15,-80]],'#a7b5b7',2);
      }
    }
    c.restore();
  }

  function pitchingPose(v){
    if(v.phase==='windup')return v.clock<.18?0:1;
    if(v.phase==='flight')return v.elapsed<.16?2:3;
    return 0;
  }

  function backdrop(){
    const sky=c.createLinearGradient(0,0,0,270);sky.addColorStop(0,'#8ec9df');sky.addColorStop(1,'#d7ebed');c.fillStyle=sky;c.fillRect(-1800,0,4880,720);
    for(const [x,y] of [[190,78],[470,50],[1080,100]]){oval(x,y,65,15,'#ffffff99');oval(x+26,y-10,32,19,'#ffffff99');}
    for(let i=-30;i<50;i++){
      const x=i*75;box(x,185,45,60,2,i%2?'#d0d0b2':'#c0cfbf');poly([[x-5,187],[x+22,165],[x+50,187]],'#90a69b');
      path([[x,235],[x,178]],'#788d65',7);oval(x+4,181+(i%3)*6,35,38,i%2?'#78a879':'#63966f');
    }
    c.fillStyle='#317561';c.fillRect(-1800,228,4880,50);c.fillStyle='#d1dbbb';c.fillRect(-1800,225,4880,5);
    for(let i=-30;i<50;i++)path([[i*70,231],[i*70,278]],'#a0c59f44',1);
    c.fillStyle='#79ac60';c.fillRect(-1800,278,4880,442);
    const park=castImages.park;
    if(park?.complete&&park.naturalWidth>0)c.drawImage(park,visibleLeft,0,visibleWidth,278);
    for(let i=-8;i<17;i++)poly([[640,250],[i*180-500,720],[i*180-415,720]],'#ffffff07');
    box(961,157,201,99,4,'#244f4e');label('RIVERSIDE PARK',1061,180,14,'#e8efd4');label('CORAL  •  NAVY',1061,209,13,'#fff6dd');label('PLAY TOGETHER',1061,235,10,'#a8c9bb');
  }

  function battingScene(v){
    backdrop();const {match:m,phase,clock}=v,fieldTeam=1-m.half;
    poly([[641,279],[64,532],[575,720],[1270,624]],'#d8b27f');poly([[641,290],[965,435],[697,598],[344,438]],'#83b66b');
    oval(653,345,62,18,'#d3a775');box(641,337,24,6,1,'#fff7e6');
    path([[701,668],[55,435]],'#fff3da',4);path([[701,668],[1239,380]],'#fff3da',4);
    for(const [x,y] of [[350,438],[642,292],[960,438]])poly([[x-13,y-3],[x+8,y-7],[x+15,y+3],[x-7,y+8]],'#fff5df');
    oval(700,649,145,47,'#cda171');poly([[678,648],[721,648],[724,661],[700,679],[677,661]],'#fff7e5');
    path([[560,600],[624,619],[611,680],[548,660],[560,600]],'#f4e3c4',2);
    const positions={LF:[245,329,.43],CF:[500,296,.36],RF:[1000,315,.4],SS:[506,396,.55],'2B':[815,392,.55],'3B':[337,459,.62],'1B':[953,458,.62]};
    for(const p of TEAMS[fieldTeam].players){const spot=positions[p.position];if(spot)character(...spot,fieldTeam,p);}
    // Visible baserunners are members of the current batting lineup, in helmets.
    const baseSpots=[[965,438],[643,295],[350,439]];
    m.bases.forEach((id,i)=>{if(id)character(baseSpots[i][0]+17,baseSpots[i][1]-5,.52,m.half,playerById(id),'run',0,0);});
    character(653,349,.77,fieldTeam,currentPitcher(m),'pitch',pitchingPose(v));
    const swingPose=v.swing?Math.max(0,Math.min(1,(v.elapsed-v.swing.inputTime)/.19)):0;
    character(480,687,1.68,m.half,currentBatter(m),'bat',swingPose);
  }

  function pitchingScene(v){
    backdrop();const m=v.match;
    poly([[736,299],[125,720],[1280,720]],'#d8b27f');poly([[736,356],[402,720],[1048,720]],'#80ad65');
    path([[735,344],[80,720]],'#fff2d9',3);path([[735,344],[1260,720]],'#fff2d9',3);
    oval(561,625,139,42,'#cda171');box(545,618,40,10,1,'#fff4df');
    oval(736,349,87,25,'#cda171');poly([[726,340],[745,340],[748,348],[736,355],[724,348]],'#fff5dc');
    character(738,375,.56,0,TEAMS[0].players.find(p=>p.position==='C'),'field');
    character(672,354,.74,1,currentBatter(m),'bat',v.phase==='flight'&&v.cpuSwing&&v.elapsed>v.pitch.duration-.08?.8:0);
    character(550,683,1.68,0,currentPitcher(m),'pitch',pitchingPose(v));
  }

  function target(v){
    const z=getZone(v.match.half===1),x=z.x+v.aim.x*z.sx,y=z.y-v.aim.y*z.sy;
    c.save();c.strokeStyle='#fff7dfa6';c.lineWidth=2;c.setLineDash([7,6]);c.strokeRect(z.x-z.sx,z.y-z.sy,z.sx*2,z.sy*2);c.setLineDash([]);
    const radius=v.match.half===1?16:25;
    c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.strokeStyle='#22434c';c.lineWidth=6;c.stroke();c.strokeStyle='#fff8df';c.lineWidth=3;c.stroke();
    path([[x-radius-7,y],[x-radius+5,y]],'#fff8df',2);path([[x+radius-5,y],[x+radius+7,y]],'#fff8df',2);
    if(v.phase==='flight'&&v.guide&&v.match.half===0){const remain=Math.max(0,1-v.elapsed/v.pitch.duration);c.beginPath();c.arc(x,y,radius+remain*72,0,Math.PI*2);c.strokeStyle='#ffe9b0b0';c.lineWidth=3;c.stroke();}
    c.restore();
    c.beginPath();c.arc(170,568,52,0,Math.PI*2);c.fillStyle='#fff7df22';c.fill();c.strokeStyle='#fff7df80';c.lineWidth=2;c.stroke();oval(170+v.aim.x*13,568-v.aim.y*13,17,17,'#fff7df77');label('DRAG TO AIM',170,646,13,'#fff9e9');
  }

  function pitchBall(v){
    const p=v.pitch,z=getZone(v.match.half===1),d=Math.max(0,Math.min(1.18,v.elapsed/p.duration)),depth=d*d;
    let x,y,r;
    if(v.match.half===0){x=693+(z.x+p.x*z.sx-693)*depth+Math.sin(Math.min(1,d)*Math.PI)*p.bend*62;y=245+(z.y-p.y*z.sy-245)*depth-Math.sin(Math.min(1,d)*Math.PI)*37;r=4+depth*11;}
    else{x=638+(z.x+p.x*z.sx-638)*d+Math.sin(Math.min(1,d)*Math.PI)*p.bend*44;y=441+(z.y-p.y*z.sy-441)*d-Math.sin(Math.min(1,d)*Math.PI)*34;r=12-d*7;}
    oval(x+3,y+25,r*.7,r*.22,'#17374922');oval(x,y,r,r,'#fffdf0');c.beginPath();c.arc(x-r*.5,y,r*.7,-1,1);c.strokeStyle='#c56256';c.lineWidth=Math.max(1,r*.14);c.stroke();
  }

  const bases=[[640,650],[900,443],[640,270],[380,443],[640,650]];
  function between(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
  function fieldPlay(v){
    const {play,event,playTime:t,match:m}=v;
    c.fillStyle='#79ac60';c.fillRect(-1800,0,4880,720);
    for(let i=-10;i<15;i++){c.fillStyle='#ffffff08';c.fillRect(i*160,0,80,720);}
    c.beginPath();c.arc(640,620,527,Math.PI,Math.PI*2);c.strokeStyle='#2c7660';c.lineWidth=24;c.stroke();
    poly([[640,650],[955,443],[640,224],[325,443]],'#d9b17e');poly([[640,602],[846,443],[640,310],[434,443]],'#83b66b');
    path([[640,650],[130,251]],'#fff2dc',3);path([[640,650],[1150,251]],'#fff2dc',3);
    bases.slice(0,4).forEach(([x,y],i)=>{poly([[x,y-7],[x+11,y],[x,y+7],[x-11,y]],'#fff5e2');label(i===0?'HOME':String(i),x+(i===1?27:i===3?-27:0),y+(i===2?-18:24),12,'#345b45');});
    oval(640,477,40,16,'#d7ae7a');
    const positions={P:[640,480],C:[640,688],'1B':[931,421],'2B':[744,346],SS:[523,345],'3B':[349,421],LF:[330,215],CF:[640,153],RF:[951,215]};
    const targetX=640+(play.direction??.1)*420,targetY=610-(play.distance??.4)*460;
    const defender=play.kind==='groundout'?(targetX<640?'SS':'2B'):targetX<490?'LF':targetX>790?'RF':'CF';
    for(const p of TEAMS[1-event.team].players){let pos=positions[p.position];if(p.position===defender){const q=Math.min(1,t/1.1);pos=between(pos,[targetX,targetY+12],q);}character(pos[0],pos[1],.51,1-event.team,p);}
    // Ball flight and an automatic throw on groundouts; outcomes are resolved by rules.
    if(['single','double','triple','homerun','groundout','flyout'].includes(play.kind)){
      let b;
      if(play.kind==='groundout'&&t>1.0)b=between([targetX,targetY],bases[1],Math.min(1,(t-1)/.7));
      else{const q=Math.min(1,t/(play.kind==='homerun'?1.6:1.15));b=between(bases[0],[targetX,targetY],q);if(play.kind!=='groundout')b[1]-=Math.sin(q*Math.PI)*(play.kind==='homerun'?160:90);}
      if(t<1.85||play.kind==='homerun'){oval(b[0]+5,b[1]+15,7,3,'#17374933');oval(b[0],b[1],7,7,'#fff8e2');}
    }
    const runners=[...event.beforeBases.filter(Boolean),...(event.atBatEnded&&!['strikeout','groundout','flyout'].includes(event.kind)?[event.batter]:[])];
    for(const id of runners){
      const from=event.beforeBases.indexOf(id)+1,toIndex=event.afterBases.indexOf(id),to=toIndex<0?4:toIndex+1;
      const q=Math.min(1,t/(play.kind==='homerun'?3:2.05)),progress=from+(to-from)*q;
      const segment=Math.min(3,Math.floor(progress)),point=between(bases[segment],bases[segment+1],Math.min(1,progress-segment));
      character(point[0]+13,point[1]-5,.49,event.team,playerById(id),'run',0,t);
    }
    if(play.kind==='groundout'){const point=between(bases[0],bases[1],Math.min(1,t/1.95));character(point[0]+10,point[1],.49,event.team,playerById(event.batter),'run',0,t);}
    label('AUTOMATIC FIELDING & BASERUNNING',640,70,14,'#f7f7dc');
  }

  function draw(v){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const scale=r.height/720,offset=(r.width-1280*scale)/2;c.setTransform(dpr*scale,0,0,dpr*scale,offset*dpr,0);c.clearRect(-1800,0,4880,720);
    visibleLeft=-offset/scale;visibleWidth=r.width/scale;
    if(v.phase==='play'){fieldPlay(v);return;}
    if(v.match.half===0)battingScene(v);else pitchingScene(v);
    if(!['intro','final','break','roster'].includes(v.phase))target(v);
    if(v.phase==='flight'&&v.pitch)pitchBall(v);
  }
  function point(event,defense){const r=canvas.getBoundingClientRect(),s=r.height/720,ox=(r.width-1280*s)/2,z=getZone(defense);return {x:(event.clientX-r.left-ox)/s,y:(event.clientY-r.top)/s,z};}
  return {draw,point};
}
