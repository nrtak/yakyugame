import { TEAMS, playerById, currentBatter, currentPitcher, GROUND_PLAY } from './match-engine.mjs';
import { PRACTICE_PARKS, CHARACTER_ART, practiceFrame, drawPracticeActor } from './practice-actors.mjs';
import { SWING_LEAD } from './engine.mjs';

export const VIEW_W=1280,VIEW_H=720;
export const BATTING_CAMERA={zoom:1.24,x:640,y:120};
export function battingCamera(hand,width){return {...BATTING_CAMERA,focusX:640+(hand==='R'?-1:1)*Math.max(0,1280-width)*.20};}
export function battingSceneBounds(left,width){return width<1280?{left:0,width:1280}:{left,width};}
export const BATTING_VISIBLE_FIELDERS=['SS','2B'];
export const cameraIsPitching=v=>v.camera?v.camera==='mound':v.match.half===1;
const batterFor=v=>v.batter??currentBatter(v.match);
const pitcherFor=v=>v.pitcher??currentPitcher(v.match);
// Handedness determines the box in field space; changing cameras reverses screen sides.
export function batterPlacement(rear,hand='R',left=0,width=1280){
  const side=(hand==='L'?-1:1)*(rear?-1:1);
  const box=batterBox(rear,hand,left,width),frame=practiceFrame('placement','bat',0,rear,'',hand,hand);
  const points=['L','R'].flatMap(s=>[frame.joints[s][5],frame.toes[s]]);
  const minX=Math.min(...points.map(p=>p[0]))-6,maxX=Math.max(...points.map(p=>p[0]))+6;
  const minY=Math.min(...points.map(p=>p[1]))-6,maxY=Math.max(...points.map(p=>p[1]))+6;
  let scale=Math.min(rear?3.5:1,(box.right-box.left)/(maxX-minX),(box.bottom-box.top)/(maxY-minY));
  for(let attempt=0;attempt<80;attempt++,scale*=.98){
    const y=bounded(rear?675:397,box.top-(minY-186)*scale,box.bottom-(maxY-186)*scale);
    let lo=box.left-(minX-110)*scale,hi=box.right-(maxX-110)*scale;
    for(const point of points){
      const py=y+(point[1]-186)*scale,r=6*scale,margin=rear?16:3;
      for(const edgeY of [py-r,py+r]){
        const edge=batterChalkBounds(rear,hand,edgeY,left,width);
        lo=Math.max(lo,edge.left+margin+r-(point[0]-110)*scale);
        hi=Math.min(hi,edge.right-margin-r-(point[0]-110)*scale);
      }
    }
    if(lo<=hi)return {x:bounded(left+width*(.5+side*(rear?.20:.09)),lo,hi),y,scale};
  }
  throw new Error('Batter cannot fit inside the painted box.');
}
// Traced inner chalk edges in the approved backgrounds, including perspective.
export function batterChalkBounds(rear,hand,y,left=0,width=1280){
 const q=rear?(y-610)/110:(y-388)/22;
 let a=rear?(294-175*q)/1280:(.376-.023*q),b=rear?(528-85*q)/1280:(.455-.009*q);
 const right=(hand==='L')===rear;
 if(right)[a,b]=[1-b,1-a];
 return {left:left+width*a,right:left+width*b};
}
// Interior ground regions of the painted boxes; never move the stance to chase aim.
export function batterBox(rear,hand='R',left=0,width=1280){
 const right=(hand==='L')===rear;
 const bounds=rear?(right?[.595,.85]:[.15,.405]):(right?[.56,.66]:[.34,.44]);
 return {left:left+width*bounds[0],right:left+width*bounds[1],top:rear?628:390,bottom:rear?704:407};
}
export const getZone=defense=>defense?{x:640,y:327,sx:49,sy:61}:{x:640,y:458,sx:88,sy:82};
export function battingContactPoint(v){
 const z=getZone(cameraIsPitching(v)),aim=v.swing?.aim??v.aim??{x:0,y:0};
 return [z.x+aim.x*z.sx,z.y-aim.y*z.sy];
}
export function getPitchPose(v){
  const blend=(from,to,t)=>({from,to,t:bounded(t,0,1)**2*(3-2*bounded(t,0,1))});
  if(v.phase==='windup')return v.clock<.28?blend(0,1,v.clock/.28):v.clock<.54?blend(1,4,(v.clock-.28)/.26):blend(4,2,(v.clock-.54)/.18);
  if(v.phase==='flight')return v.elapsed<.22?blend(2,3,v.elapsed/.22):blend(3,5,(v.elapsed-.22)/.4);
  if(v.phase==='call'||v.phase==='review')return 5;
  return 0;
}
const bounded=(v,min,max)=>Math.max(min,Math.min(max,v));
// Shared ground-plane scale for fielders and runners in the elevated play camera.
export const fieldPlayerScale=y=>.66+bounded((y-170)/535,0,1)*.22;
export const playDuration=kind=>kind==='homerun'?3.6:kind==='triple'?3.1:kind==='double'?2.7:2.35;
// Scene coordinates follow the bases painted in the approved park backgrounds.
// Player identities never change when the viewing direction changes.
export function fieldLayout(left=0,width=1280){
 const at=u=>left+width*u;
 return {bases:[[at(.5),659],[at(.72),469],[at(.5),279],[at(.28),469],[at(.5),659]],
  positions:{P:[at(.5),481],C:[at(.5),705],'1B':[at(.73),425],'2B':[at(.63),321],
   SS:[at(.37),321],'3B':[at(.27),425],LF:[at(.22),270],CF:[at(.5),170],RF:[at(.78),270]}};
}
export function battingFieldLayout(left=0,width=1280){
 const at=u=>left+width*u;
 return {LF:[at(.18),360,.46],CF:[at(.5),354,.44],RF:[at(.82),360,.46],
  SS:[at(.34),382,.64],'2B':[at(.66),382,.64],'3B':[at(.10),399,.76],'1B':[at(.90),399,.76]};
}
export function fieldLanding(play,left=0,width=1280){
 const y=play.kind==='homerun'?48:620-bounded(play.distance??.4,0,1)*430;
 // Keep shallow fair balls inside the foul lines, including extreme timing.
 const maxSide=Math.min(.44,.22*(659-y)/190);
 const side=bounded(bounded(play.direction??.1,-1,1)*.40,-maxSide,maxSide);
 return [left+width*(.5+side),y];
}
export function defensivePlan(play,left=0,width=1280){
 const {bases,positions}=fieldLayout(left,width),landing=fieldLanding(play,left,width);
 if(!['single','double','triple','groundout','flyout'].includes(play.kind))return {defender:null,receiver:null,coverage:{}};
 const candidates=play.kind==='groundout'?['P','SS','2B','3B','1B']:['LF','CF','RF'];
 const distance=role=>Math.hypot((positions[role][0]-landing[0])*1280/width,positions[role][1]-landing[1]);
 const defender=candidates.reduce((best,role)=>distance(role)<distance(best)?role:best);
 const coverage={};
 let receiver=null;
 if(play.kind==='groundout'){
  receiver=defender==='1B'?'P':'1B';
  coverage[receiver]=[bases[1][0]-24,bases[1][1]];
  if(defender==='SS')coverage['2B']=[bases[2][0]+12,bases[2][1]];
  if(defender==='2B')coverage.SS=[bases[2][0]-12,bases[2][1]];
  if(defender==='1B')coverage['2B']=[landing[0]-width*.06,landing[1]-55];
  // Outfielders back up their side of the play; the pitcher clears the throwing lane.
  for(const role of ['LF','CF','RF']){
   const start=positions[role];coverage[role]=[start[0]+(landing[0]-start[0])*.13,start[1]+36];
  }
  if(defender!=='P'&&receiver!=='P')coverage.P=[positions.P[0]+width*.04,positions.P[1]+20];
 }else{
  // Supporting outfielders take separate lanes rather than chasing one point.
  for(const role of ['LF','CF','RF'])if(role!==defender){
   const start=positions[role];
   coverage[role]=[start[0]+(landing[0]-start[0])*.25,start[1]+(landing[1]-start[1])*.18];
  }
  const cutoff=landing[0]<left+width*.5?'SS':'2B',cover=cutoff==='SS'?'2B':'SS';
  // The cutoff stays home-side of the pickup, including shallow center-field hits.
  // Using second base as the interpolation origin stacked three players together.
  coverage[cutoff]=landing.map((n,i)=>n+(bases[0][i]-n)*.35);
  coverage[cover]=[bases[2][0]+(cover==='SS'?-45:45),bases[2][1]+14];
  const separation=coverage[cover].map((n,i)=>n-landing[i]),gap=Math.hypot(...separation);
  if(gap<80)coverage[cover]=landing.map((n,i)=>n+separation[i]/Math.max(1,gap)*80);
  coverage['1B']=[bases[1][0]-24,bases[1][1]];coverage['3B']=[bases[3][0]+18,bases[3][1]];
  coverage.P=[positions.P[0],positions.P[1]+35];
 }
 return {defender,receiver,coverage};
}
export function fieldApproach(start,end,time,arrival,delay=.08){
 const q=bounded((time-delay)/Math.max(.01,arrival-delay),0,1),ease=q*q*(3-2*q);
 const direction=end.map((n,i)=>n-start[i]),distance=Math.hypot(...direction)*ease;
 return {position:start.map((n,i)=>n+direction[i]*ease),pose:{moving:q>0&&q<1,direction,distance,amount:Math.min(1,q*6,(1-q)*6)}};
}
export function battingPose(v){
 if(v.battingPose!==undefined)return v.battingPose;
 if(['ready','windup','intro','review','final','break'].includes(v.phase))return 0;
 const at=v.swing?.inputTime??(v.cpuSwing&&v.pitch?v.pitch.duration-SWING_LEAD:null);
 if(at===null)return 0;
 // elapsed stops when the call is made; clock continues the follow-through.
 const extra=v.phase==='play'?v.playTime??0:['call','review'].includes(v.phase)?v.clock??0:0;
 const elapsed=Math.max(0,v.elapsed-at+extra);
 return elapsed<=SWING_LEAD?.5*elapsed/SWING_LEAD:.5+.5*Math.min(1,(elapsed-SWING_LEAD)/.24);
}
export function framePoint(frame,position,scale,point){
 const h=frame.height*scale,w=h*frame.rect[2]/frame.rect[3];
 return [position[0]+(point[0]-frame.anchorX)*w,position[1]+(point[1]-frame.anchorY)*h+(frame.groundOffset??0)];
}
export function fieldingInteraction(play,fieldTeam,left=0,width=1280){
 const plan=defensivePlan(play,left,width),{positions}=fieldLayout(left,width),landing=fieldLanding(play,left,width);
 const player=TEAMS[fieldTeam].players.find(p=>p.position===plan.defender);
 if(!player)return {...plan,destination:landing,actionArt:false,motionOptions:{}};
 const rear=landing[1]<positions[plan.defender][1]-12;
 const gather=practiceFrame(player.id,'field','gather',rear,player.position,player.throws);
 const catchFrame=practiceFrame(player.id,'field','catch',rear,player.position,player.throws);
 const actionArt=Boolean(gather.throwingHandPoint);
 const frame=play.kind==='flyout'?catchFrame:gather;
 let footY=landing[1]+12,scale=fieldPlayerScale(footY);
 // Keep a low glove above the landing plane, including at distant depth scales.
 for(let i=0;i<4;i++){
  const gloveY=framePoint(frame,[0,footY],scale,frame.glove)[1];
  if(gloveY<=landing[1])break;
  footY-=gloveY-landing[1]+.01;scale=fieldPlayerScale(footY);
 }
 const offset=framePoint(frame,[0,0],scale,frame.glove);
 const destination=play.kind==='groundout'||play.kind==='flyout'?
  [landing[0]-offset[0],footY]:[landing[0],landing[1]-16];
 const gatherPoint=framePoint(frame,destination,scale,frame.glove);
 const motionOptions={catchHeight:Math.max(0,landing[1]-gatherPoint[1]),gatherHeight:Math.max(0,landing[1]-gatherPoint[1]),cameraDestination:destination};
 if(actionArt&&play.kind==='groundout'){
  const throwing=practiceFrame(player.id,'field','throw',false,player.position,player.throws);
  motionOptions.releasePoint=framePoint(throwing,destination,scale,throwing.throwingHandPoint);
 }
 if(plan.receiver){
  const receiver=TEAMS[fieldTeam].players.find(p=>p.position===plan.receiver),position=plan.coverage[plan.receiver];
  const receiving=practiceFrame(receiver.id,'field','receive',false,receiver.position,receiver.throws);
  motionOptions.receivePoint=framePoint(receiving,position,fieldPlayerScale(position[1]),receiving.glove);
  motionOptions.receiveGround=position[1];
 }
 return {...plan,destination,actionArt,motionOptions,gatherPoint,rear};
}
export function fieldMotion(play,time,left=0,width=1280){
 const t=Math.max(0,time),at=u=>left+width*u,grounder=play.kind==='groundout',homer=play.kind==='homerun';
 if(!['single','double','triple','homerun','groundout','flyout'].includes(play.kind))return {ball:[at(.5),659],ground:[at(.5),659],height:0,landing:[at(.5),420],stage:'walk',arrival:0,zoom:1,focusX:at(.5),focusY:360,radius:7,visible:false};
 const landing=fieldLanding(play,left,width);
 const hit=['single','double','triple'].includes(play.kind);
 const arrival=grounder?GROUND_PLAY.arrival:homer?1.6:1.15,q=bounded(t/arrival,0,1);
 let ground=[at(.5)+(landing[0]-at(.5))*q,659+(landing[1]-659)*q],height;
 let stage=t<arrival?'hit':'fielded';
 height=grounder?Math.abs(Math.sin(q*Math.PI*3))*9*(1-q)+(play.gatherHeight??0)*q:4*q*(1-q)*(homer?220:110)+(play.kind==='flyout'?(play.catchHeight??35)*q:0);
 // A safe hit lands and rolls; only a flyout is caught on arrival.
 if(hit&&t>=arrival){
  const roll=bounded((t-arrival)/.65,0,1);
  ground=[landing[0],landing[1]-28*roll];
  height=Math.abs(Math.sin(roll*Math.PI*2))*8*(1-roll);
  stage=roll<1?'rolling':'fielded';
 }
 if(grounder&&t>=arrival){
  const gather=bounded((t-arrival)/GROUND_PLAY.transfer,0,1);
  const release=play.releasePoint??[landing[0]+(play.releaseOffset??0),landing[1]-(play.transferHeight??20)];
  height=(play.gatherHeight??0)+(landing[1]-release[1]-(play.gatherHeight??0))*gather;
  ground=[landing[0]+(release[0]-landing[0])*gather,landing[1]];
 }
 const delay=play.throwDelay===null?Infinity:Math.max(0,play.throwDelay??0);
 if(grounder&&t>=arrival&&t<=arrival+GROUND_PLAY.transfer+delay)stage='transfer';
 if(grounder&&t>arrival+GROUND_PLAY.transfer+delay){
  const throwQ=bounded((t-arrival-GROUND_PLAY.transfer-delay)/GROUND_PLAY.flight,0,1);stage=throwQ<1?'throw':'received';
  const releaseX=play.releasePoint?.[0]??landing[0]+(play.releaseOffset??0),releaseHeight=play.releasePoint?landing[1]-play.releasePoint[1]:play.transferHeight??20;
  const receive=play.receivePoint??[at(.72)-24,449],receiveGround=play.receiveGround??469;
  ground=[releaseX+(receive[0]-releaseX)*throwQ,landing[1]+(receiveGround-landing[1])*throwQ];height=releaseHeight+(receiveGround-receive[1]-releaseHeight)*throwQ+4*throwQ*(1-throwQ)*35;
 }
 const ball=[ground[0],ground[1]-height];
 const plan=defensivePlan(play,left,width),positions=fieldLayout(left,width).positions;
 const destination=play.cameraDestination??landing,start=positions[plan.defender]??landing;
 let cameraPlayer=fieldApproach(start,destination,t,hit?1.8:arrival).position;
 if(grounder&&plan.receiver){
  const followThrow=bounded((t-arrival-GROUND_PLAY.transfer-delay)/GROUND_PLAY.flight,0,1);
  const receiver=plan.coverage[plan.receiver];
  cameraPlayer=cameraPlayer.map((n,i)=>n+(receiver[i]-n)*followThrow);
 }
 const camera=fieldCamera(ball,cameraPlayer,t,left,width);
 // The secured ball is inside the glove during the transfer and any queued-throw wait.
 const secured=grounder&&t>=arrival+.04&&t<=arrival+GROUND_PLAY.transfer+delay;
 return {ball,ground,height,landing,stage,arrival,...camera,cameraPlayer,radius:7-q*2,visible:!secured&&(homer?t<2.0:grounder?t<1.95+delay:hit?t<arrival+.7:t<arrival+.15)};
}
export function fieldCamera(ball,player,time,left=0,width=1280){
 const size=fieldPlayerScale(player[1]);
 // Follow the ball immediately, widening only enough for the approaching fielder.
 const q=bounded(time/.8,0,1),inclusion=q*q*(3-2*q);
 const subject=ball.map((n,i)=>n+(player[i]-n)*inclusion);
 const bounds={left:Math.min(ball[0]-18,subject[0]-42*size),right:Math.max(ball[0]+18,subject[0]+42*size),
  top:Math.min(ball[1]-18,subject[1]-155*size*inclusion),bottom:Math.max(ball[1]+18,subject[1]+12*size)};
 const zoom=Math.max(1.35,Math.min(2.8,(width-48)/(bounds.right-bounds.left),580/(bounds.bottom-bounds.top)));
 const x=(bounds.left+bounds.right)/2,y=(bounds.top+bounds.bottom)/2;
 const fitX=bounded(x,left+width/(2*zoom),left+width-width/(2*zoom));
 const fitY=bounded(y,360/zoom,720-360/zoom);
 return {zoom,focusX:fitX,focusY:fitY};
}
// Match the foreground batter's body size (excluding the raised bat).
// The pivot shoe contacts the rubber; the left stride foot lands upfield.
export const pitcherPlacement=(rear,index=0)=>referencePitcherPlacement(rear,index);
export function referencePitcherPlacement(rear,index=0,hand='R',battingHand='R',left=0,width=1280){
 // Pivot ankle is on the painted rubber, never shifted off it for a sightline.
 const scale=rear?3:.95,rubber=rear?[left+width*.46875-92,628]:[left+width*.5,388];
 return {x:rubber[0],y:rubber[1],scale};
}
function placementFor(v,index,left=0,width=1280){
 const p=pitcherFor(v),rear=cameraIsPitching(v);
 return referencePitcherPlacement(rear,index,p.throws,batterFor(v).bats,left,width);
}
export function createRenderer(canvas){
  const c=canvas.getContext('2d');
  let visibleLeft=0,visibleWidth=1280;
  let activeBatCamera=battingCamera('R',1280);
  const castImages={},loads=[];
  if(typeof Image==='function')for(const [key,src] of Object.entries({...PRACTICE_PARKS,...CHARACTER_ART})){
    const image=new Image();image.decoding='async';castImages[key]=image;
    loads.push(new Promise((resolve,reject)=>{
      image.onload=()=>resolve();image.onerror=()=>reject(new Error('Game artwork could not load.'));
      image.src=src;if(image.complete&&image.naturalWidth>0)resolve();
    }));
  }
  const ready=Promise.all(loads);
  // The controller presents a loading error; review pages can still inspect
  // the remaining assets without creating an unhandled rejection.
  ready.catch(()=>{});
  const oval=(x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const path=(points,color,width=2)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();};
  const box=(x,y,w,h,r,color)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();};
  const label=(s,x,y,size,color='#fff',align='center')=>{c.fillStyle=color;c.font=`700 ${size}px system-ui`;c.textAlign=align;c.fillText(s,x,y);};
  const poly=(points,color)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=color;c.fill();};

  function character(x,y,s,teamId,p,role='field',pose=0,time=0,rear=false,contact=null){
    if(!p)throw new Error('Missing canonical roster player.');
    const localContact=contact?[(contact[0]-x)/s+110,(contact[1]-y)/s+186]:null;
    drawPracticeActor(c,x,y,s,TEAMS[teamId],p,role,pose,time,rear,localContact,castImages);
  }

  function pitchingPose(v){
    return getPitchPose(v);
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
    const {match:m}=v,fieldTeam=1-m.half,park=castImages.battingPark;
    if(park?.complete&&park.naturalWidth>0)c.drawImage(park,visibleLeft,0,visibleWidth,720);else backdrop();
    const at=u=>visibleLeft+visibleWidth*u;
    const positions=battingFieldLayout(visibleLeft,visibleWidth);
    TEAMS[fieldTeam].players.filter(p=>BATTING_VISIBLE_FIELDERS.includes(p.position)).sort((a,b)=>positions[a.position][1]-positions[b.position][1]).forEach(p=>character(...positions[p.position],fieldTeam,p));
    const baseSpots=[[at(.91),401],[at(.5),372],[at(.09),401]];
    m.bases.forEach((id,i)=>{if(id)character(baseSpots[i][0],baseSpots[i][1],.54,m.half,playerById(id),'run',0,0);});
    const pose=pitchingPose(v),placement=placementFor(v,pose,visibleLeft,visibleWidth);
    character(placement.x,placement.y,placement.scale,fieldTeam,pitcherFor(v),'pitch',pose);
    const swingPose=battingPose(v);
    const batter=batterFor(v),spot=batterPlacement(true,batter.bats,visibleLeft,visibleWidth);
    character(spot.x,spot.y,spot.scale,m.half,batter,'bat',swingPose,0,true,battingContactPoint(v));
  }

  function pitchingScene(v){
    const m=v.match,park=castImages.pitchingPark;
    if(park?.complete&&park.naturalWidth>0){
      c.drawImage(park,visibleLeft,0,visibleWidth,720);
      // Reproject the ground into an offset view; the fence stays horizontal.
      const sourceH=park.naturalHeight||park.naturalWidth*720/1280;
      for(let y=398;y<720;y+=2){
        const offset=-.4*(y-398),spread=(y-398)*.48;
        c.drawImage(park,0,y/720*sourceH,park.naturalWidth,2/720*sourceH,visibleLeft+offset-spread/2,y,visibleWidth+spread,2.1);
      }
    }else backdrop();
    const fieldTeam=1-m.half;
    character(640,426,.65,fieldTeam,TEAMS[fieldTeam].players.find(p=>p.position==='C'),'field');
    // The right-handed box changes screen sides when viewed from the mound.
    const batter=batterFor(v),spot=batterPlacement(false,batter.bats,visibleLeft,visibleWidth);
    const swingPose=battingPose(v);
    character(spot.x,spot.y,spot.scale,m.half,batter,'bat',swingPose,0,false,battingContactPoint(v));
    const pose=pitchingPose(v),placement=placementFor(v,pose,visibleLeft,visibleWidth);
    character(placement.x,placement.y,placement.scale,fieldTeam,pitcherFor(v),'pitch',pose,0,true);
  }

  function target(v){
    const defense=cameraIsPitching(v),z=getZone(defense),x=z.x+v.aim.x*z.sx,y=z.y-v.aim.y*z.sy;
    c.save();c.strokeStyle='#fff7dfa6';c.lineWidth=2;c.setLineDash([7,6]);c.strokeRect(z.x-z.sx,z.y-z.sy,z.sx*2,z.sy*2);c.setLineDash([]);
    if(!defense&&v.forgiving){
      c.beginPath();c.ellipse(x,y,z.sx*.64*1.5,z.sy*.64*1.5,0,0,Math.PI*2);
      c.fillStyle='#ffe4a51a';c.fill();c.strokeStyle='#ffe4a566';c.lineWidth=1.5;c.stroke();
    }
    const radius=defense?16:25;
    c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.strokeStyle='#22434c';c.lineWidth=6;c.stroke();c.strokeStyle='#fff8df';c.lineWidth=3;c.stroke();
    path([[x-radius-7,y],[x-radius+5,y]],'#fff8df',2);path([[x+radius-5,y],[x+radius+7,y]],'#fff8df',2);
    if(v.phase==='flight'&&v.guide&&!defense){const remain=Math.max(0,1-v.elapsed/v.pitch.duration);c.beginPath();c.arc(x,y,radius+remain*72,0,Math.PI*2);c.strokeStyle='#ffe9b0b0';c.lineWidth=3;c.stroke();}
    c.restore();

  }

  function pitchBall(v){
    const defense=cameraIsPitching(v),p=v.pitch,z=getZone(defense),d=Math.max(0,Math.min(1.18,v.elapsed/p.duration)),depth=d*d;
    const pitcher=pitcherFor(v),frame=practiceFrame(pitcher.id,'pitch',2,defense,'P',pitcher.throws);
    const placement=placementFor(v,2,visibleLeft,visibleWidth),h=frame.height*placement.scale,w=h*frame.rect[2]/frame.rect[3];
    const startX=placement.x+w*(frame.release[0]-frame.anchorX);
    const startY=placement.y+h*(frame.release[1]-frame.anchorY);
    let x,y,r;
    if(!defense){x=startX+(z.x+p.x*z.sx-startX)*depth+Math.sin(Math.min(1,d)*Math.PI)*p.bend*62;y=startY+(z.y-p.y*z.sy-startY)*depth-Math.sin(Math.min(1,d)*Math.PI)*37;r=4+depth*11;}
    else{x=startX+(z.x+p.x*z.sx-startX)*d+Math.sin(Math.min(1,d)*Math.PI)*p.bend*44;y=startY+(z.y-p.y*z.sy-startY)*d-Math.sin(Math.min(1,d)*Math.PI)*34;r=12-d*7;}
    oval(x+3,y+25,r*.7,r*.22,'#17374922');oval(x,y,r,r,'#fffdf0');c.beginPath();c.arc(x-r*.5,y,r*.7,-1,1);c.strokeStyle='#c56256';c.lineWidth=Math.max(1,r*.14);c.stroke();
  }

  function between(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
  function overheadField(){
    // Dedicated ground-plane view. No horizon or flat stadium backdrop is used here.
    c.save();c.translate(visibleLeft,0);c.scale(visibleWidth/1280,1);
    c.fillStyle='#376f4c';c.fillRect(0,0,1280,720);
    const sector=(rx,ry,color)=>{c.beginPath();c.moveTo(640,659);c.ellipse(640,659,rx,ry,0,-Math.PI*.75,-Math.PI*.25);c.closePath();c.fillStyle=color;c.fill();};
    sector(850,574,'#6caa57');
    c.save();c.beginPath();c.moveTo(640,659);c.ellipse(640,659,850,574,0,-Math.PI*.75,-Math.PI*.25);c.closePath();c.clip();
    for(let y=90;y<660;y+=70){c.fillStyle='#ffffff09';c.fillRect(0,y,1280,35);}
    c.restore();
    c.beginPath();c.ellipse(640,659,850,574,0,-Math.PI*.75,-Math.PI*.25);c.strokeStyle='#d9c87c';c.lineWidth=12;c.stroke();
    sector(650,439,'#cb9565');
    const diamond=[[640,659],[921.6,469],[640,279],[358.4,469],[640,659]];
    path(diamond,'#cb9565',42);
    poly([[640,611],[850,469],[640,327],[430,469]],'#70a453');
    oval(640,481,48,32,'#d9ac7c');box(625,477,30,5,1,'#fff6dd');
    oval(640,659,62,40,'#d9ac7c');
    path([[18,239],[640,659],[1262,239]],'#fff3d9',3);
    for(const p of diamond.slice(1,4))poly([[p[0],p[1]-8],[p[0]+12,p[1]],[p[0],p[1]+8],[p[0]-12,p[1]]],'#fff9ec');
    poly([[630,653],[650,653],[650,661],[640,668],[630,661]],'#fff9ec');
    c.strokeStyle='#fff3d9';c.lineWidth=2;c.strokeRect(600,638,22,36);c.strokeRect(658,638,22,36);
    c.restore();
  }
  function fieldPlay(v){
    const {play,event,playTime:t,match:m}=v;
    let motion=fieldMotion(play,t,visibleLeft,visibleWidth);
    const at=u=>visibleLeft+visibleWidth*u;
    const {bases,positions}=fieldLayout(visibleLeft,visibleWidth);
    const actors=[];
    const [targetX,targetY]=motion.landing;
    const {defender,receiver,coverage,destination,actionArt,motionOptions}=fieldingInteraction(play,1-event.team,visibleLeft,visibleWidth);
    motion=fieldMotion({...play,...motionOptions},t,visibleLeft,visibleWidth);
    c.save();c.translate(640,360);c.scale(motion.zoom,motion.zoom);c.translate(-motion.focusX,-motion.focusY);
    overheadField();
    for(const p of TEAMS[1-event.team].players){
      let pos=positions[p.position],pose=0;
      if(p.position===defender){
        const safeHit=['single','double','triple'].includes(play.kind);
        const movement=fieldApproach(pos,destination,t,safeHit?1.8:motion.arrival);
        pos=movement.position;pose=movement.pose;
        if(play.kind==='flyout'&&t>=motion.arrival-.2)pose='catch';
        if(actionArt){
          pose=play.kind==='flyout'&&t>motion.arrival-.2?'catch':
            motion.stage==='throw'||motion.stage==='received'?'throw':
            motion.stage==='transfer'&&t>motion.arrival+.04?'transfer':
            t>(safeHit?1.8:motion.arrival)-.08?'gather':pose;
        }
      }
      if(coverage[p.position]){
        const movement=fieldApproach(pos,coverage[p.position],t,motion.arrival,.12);
        pos=movement.position;pose=movement.pose;
        if(p.position===receiver&&!movement.pose.moving&&t>=motion.arrival)pose='receive';
      }
      const rear=p.position===defender&&targetY<positions[p.position][1]-12;
      actors.push([pos[0],pos[1],fieldPlayerScale(pos[1]),1-event.team,p,'field',pose,t,rear]);
    }
    // Ball flight and an automatic throw on groundouts; outcomes are resolved by rules.
    const paintBall=()=>{if(['single','double','triple','homerun','groundout','flyout'].includes(play.kind)){
      const b=motion.ball;
      if(motion.visible){
       oval(motion.ground[0],motion.ground[1]+3,Math.max(3,9-motion.height*.018),3,'#17374955');
       oval(b[0],b[1],motion.radius+2,motion.radius+2,'#234c5d66');oval(b[0],b[1],motion.radius,motion.radius,'#fff8e2');
      }
    }};
    const runners=[...event.beforeBases.filter(Boolean),...(event.atBatEnded&&!['strikeout','groundout','flyout'].includes(event.kind)?[event.batter]:[])];
    for(const id of runners){
      const from=event.beforeBases.indexOf(id)+1,toIndex=event.afterBases.indexOf(id),to=toIndex<0?4:toIndex+1;
      const duration=play.kind==='groundout'&&id===event.batter?GROUND_PLAY.runner:playDuration(play.kind)-.25;
      const q=Math.min(1,t/duration),progress=from+(to-from)*q;
      if(to===4&&q===1)continue;
      const segment=Math.min(3,Math.floor(progress)),point=between(bases[segment],bases[segment+1],Math.min(1,progress-segment));
      const direction=bases[segment+1].map((n,i)=>n-bases[segment][i]),moving=from!==to&&q<1;
      const gait={moving,direction,distance:(progress-from)*Math.hypot(...direction),amount:Math.min(1,t*6)};
      actors.push([point[0]+13,point[1]-5,fieldPlayerScale(point[1]),event.team,playerById(id),'run',gait,0,direction[1]<0]);
    }
    if(play.kind==='groundout'&&!runners.includes(event.batter)){
      const q=Math.min(1,t/GROUND_PLAY.runner),point=between(bases[0],bases[1],q),direction=bases[1].map((n,i)=>n-bases[0][i]);
      actors.push([point[0]+10,point[1],fieldPlayerScale(point[1]),event.team,playerById(event.batter),'run',{moving:q<1,direction,distance:Math.hypot(...direction)*q,amount:Math.min(1,t*6)},0,true]);
    }
    actors.sort((a,b)=>a[1]-b[1]).forEach(args=>character(...args));paintBall();
    const activeRole=['throw','received'].includes(motion.stage)?receiver:defender;
    const active=actors.find(a=>a[5]==='field'&&a[4].position===activeRole);
    if(active){box(active[0]-22,active[1]+12,44,21,5,'#183e43dd');label(activeRole,active[0],active[1]+27,13);}
    c.restore();
    const action=motion.stage==='throw'?'THROW TO FIRST':motion.stage==='transfer'?'GATHER · TRANSFER':motion.stage==='received'?'BALL RECEIVED':motion.stage==='fielded'?(play.kind==='flyout'?'CAUGHT':'BALL FIELDED'):motion.stage==='rolling'?'CHASE THE BALL':'BALL IN PLAY';
    label(action+' · AUTO FIELDING',640,115,13,'#f7f7dc');
  }

  function plateView(v,overlays=false,flash=false){
    c.save();
    const savedLeft=visibleLeft,savedWidth=visibleWidth;
    if(!cameraIsPitching(v)){
      const a=activeBatCamera=battingCamera(batterFor(v).bats,visibleWidth);
      c.translate(a.x,a.y);c.scale(a.zoom,a.zoom);c.translate(-a.focusX,-a.y);
      const scene=battingSceneBounds(visibleLeft,visibleWidth);visibleLeft=scene.left;visibleWidth=scene.width;
    }
    if(cameraIsPitching(v))pitchingScene(v);else battingScene(v);
    if(overlays&&!['intro','final','break','roster'].includes(v.phase))target(v);
    if(overlays&&v.phase==='flight'&&v.pitch)pitchBall(v);
    if(flash){const contact=battingContactPoint(v);oval(contact[0],contact[1],12,12,'#fff6c899');}
    visibleLeft=savedLeft;visibleWidth=savedWidth;
    c.restore();
  }
  function draw(v){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const scale=r.height/720,offset=(r.width-1280*scale)/2;c.setTransform(dpr*scale,0,0,dpr*scale,offset*dpr,0);c.clearRect(-1800,0,4880,720);
    visibleLeft=-offset/scale;visibleWidth=r.width/scale;
    if(v.phase==='play'){
      if(v.playTime<.1&&['single','double','triple','homerun','groundout','flyout'].includes(v.play.kind)){
        const contactView={...v,battingPose:battingPose(v)};
        plateView(contactView,false,true);
      }else{
        // Reference-style broadcast cut: no dissolving duplicate players/ball.
        fieldPlay({...v,playTime:Math.max(0,v.playTime-.1)});
      }
      return;
    }
    plateView(v,true);
  }
  function point(event,defense){const r=canvas.getBoundingClientRect(),s=r.height/720,ox=(r.width-1280*s)/2,z=getZone(defense);
   let x=(event.clientX-r.left-ox)/s,y=(event.clientY-r.top)/s;
   if(!defense){const a=activeBatCamera;x=a.focusX+(x-a.x)/a.zoom;y=a.y+(y-a.y)/a.zoom;}
   return {x,y,z};}
  return {draw,point,ready};
}
