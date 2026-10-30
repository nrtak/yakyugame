import { PRACTICE_POSES } from './practice-poses.mjs';

// Deliberately simple mechanics-test figures, never final character artwork.
export const PRACTICE_PARKS={
 battingPark:'assets/park-batting-approved-v1.png',
 pitchingPark:'assets/park-pitching-approved-v1.png',
 fieldingPark:'assets/park-fielding-approved-v1.png'
};
export const CHARACTER_ART={coralHeads:'assets/coral-character-heads-v1.png',navyHeads:'assets/navy-character-heads-v1.png',uniformParts:'assets/character-uniform-parts-v1.png',rearHelmets:'assets/character-helmets-rear-v1.png'};
export function characterHeadCell(player,helmet,facing,faceVisible){
 const navy=player.id.startsWith('navy-stars-'),names=navy?['ryan','mia','ken','lily','dylan','noah','emma','sora','theo']:['emma','mia','ken','lily','dylan','noah','emi','sora','theo'];
 const row=names.indexOf(player.id.split('-').at(-1));
 if(row<0)throw new Error('Missing canonical character art: '+player.id);
 const col=(!faceVisible?2:Math.abs(facing[0])>.48?(facing[0]>0?1:3):0)+(helmet?4:0);
 if(helmet&&col===6){
  const ys=[0,240,474,694,927,1158,1387,1659,1932,2172];
  return {key:'rearHelmets',row,col,rect:[navy?362:0,ys[row]+3,362,ys[row+1]-ys[row]-6],pixelScale:.17};
 }
 // Generation did not preserve equal row heights; use visually checked boundaries.
 const ys=navy?[0,150,290,426,565,706,840,986,1162,1310]:[0,146,277,417,555,696,840,979,1139,1306];
 const inset=col%4===2?13:2;
 return {key:navy?'navyHeads':'coralHeads',row,col,rect:[col*147.75+inset,ys[row]+2,147.75-inset*2,ys[row+1]-ys[row]-4]};
}
const opposite=h=>h==='R'?'L':'R';
const dot3=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const add3=(a,b)=>a.map((v,i)=>v+b[i]);
const pitchStages=['set','lift','release','follow','load','recover'];
const mix3=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// Temporary locomotion construction. Anatomical sides stay fixed as heading changes.
function locomotion(frame,motion){
 const d=motion.direction??[0,1],length=Math.hypot(d[0],d[1]/.66)||1;
 const forward=[d[0]/length,d[1]/.66/length,0],left=[forward[1],-forward[0],0];
 const amount=Math.max(0,Math.min(1,motion.amount??1)),phase=(motion.distance??0)/58*Math.PI*2;
 const point=(side,along,height)=>left.map((n,i)=>n*side+forward[i]*along+(i===2?height:0));
 const project=p=>[110+p[0]*90,186+p[1]*59.4-p[2]*90];
 const rig={joints:{},toes:{}};
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,swing=Math.sin(phase+(side==='L'?0:Math.PI));
  const hip=point(sign*.13,0,.84),shoulder=point(sign*.21,.09*amount,1.4);
  const ankle=point(sign*.13,swing*.23*amount,.04+Math.max(0,Math.cos(phase+(side==='L'?0:Math.PI)))*.14*amount);
  const knee=jointBetween(hip,point(sign*.13,.4,.48),ankle,.44,.44);
  const wrist=point(sign*.24,.19-swing*.18*amount,1.06);
  const elbow=jointBetween(shoulder,point(sign*.31,-.34,1.12),wrist,.31,.29);
  rig.joints[side]=[shoulder,elbow,wrist,hip,knee,ankle];
  rig.toes[side]=point(0,.14,0);
 }
 frame.rig=rig;frame.toward=[0,Math.cos(.6),Math.sin(.6)];
 frame.joints=Object.fromEntries(['L','R'].map(s=>[s,rig.joints[s].map(project)]));
 frame.toes=Object.fromEntries(['L','R'].map(s=>[s,project(add3(rig.joints[s][5],rig.toes[s]))]));
 frame.head=project(point(0,.13*amount,1.72));frame.neck=project(point(0,.09*amount,1.51));
 frame.facing=[forward[0],forward[1]*.5];frame.faceVisible=forward[1]>-.15;frame.chestVisible=forward[1]>0;
 frame.glove=frame.joints[frame.gloveHand][2].map((n,i)=>n/[220,186][i]);
 frame.release=frame.joints[frame.throws][2].map((n,i)=>n/[220,186][i]);
 frame.throwingHandPoint=frame.release;frame.locomotion=true;
 return frame;
}
function jointBetween(start,bend,end,a,b){
 const delta=end.map((v,i)=>v-start[i]),d=Math.hypot(...delta),axis=delta.map(v=>v/d);
 const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
 let normal=bend.map((v,i)=>v-start[i]),projection=dot3(normal,axis);
 normal=normal.map((v,i)=>v-axis[i]*projection);
 const n=Math.hypot(...normal)||1;
 return start.map((v,i)=>v+axis[i]*along+normal[i]/n*height);
}
function pitchRig(hand,index){
 if(index===5){
  // Temporary recovery after the reference follow-through: face home, both feet down.
  const rig=structuredClone(PRACTICE_POSES.pitch[hand].set),angle=hand==='R'?Math.PI/2:-Math.PI/2;
  const rotate=v=>[v[0]*Math.cos(angle)-v[1]*Math.sin(angle),v[0]*Math.sin(angle)+v[1]*Math.cos(angle),v[2]];
  const lead=opposite(hand),plant=PRACTICE_POSES.pitch[hand].release.joints[lead][5];
  const anchor=rotate(rig.joints[lead][5]),shift=plant.map((n,i)=>n-anchor[i]);
  const position=v=>add3(rotate(v),shift);
  for(const side of ['L','R']){rig.joints[side]=rig.joints[side].map(position);rig.toes[side]=rotate(rig.toes[side]);}
  for(const key of ['hip','shoulder','head'])rig[key]=position(rig[key]);
  for(const key of ['chest','leftaxis','up','gaze','target'])rig[key]=rotate(rig[key]);
  rig.gaze=[0,-1,0];rig.target=[0,-1,0];
  return rig;
 }
 const rig=structuredClone(PRACTICE_POSES.pitch[hand][pitchStages[index]??'set']);
 // Keep the drive foot on the rubber during loading and the stride foot planted after release.
 const dy=index===4?-.28:index===3?.08:0;
 if(dy){
  for(const side of ['L','R'])rig.joints[side]=rig.joints[side].map(p=>[p[0],p[1]+dy,p[2]]);
  for(const key of ['hip','shoulder','head'])rig[key][1]+=dy;
 }
 return rig;
}
function blendedPitch(hand,pose){
 if(typeof pose!=='object')return pitchRig(hand,pose);
 const a=pitchRig(hand,pose.from),b=pitchRig(hand,pose.to),t=pose.t;
 for(const side of ['L','R']){
  const original=a.joints[side],other=b.joints[side];
  const j=original.map((p,i)=>mix3(p,other[i],t));
  for(const [root,joint,end,l1,l2] of [[0,1,2,.31,.29],[3,4,5,.44,.44]]){
   const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
   const axis=normalize(j[end].map((n,i)=>n-j[root][i]));
   const pole=points=>{
    const sourceAxis=normalize(points[end].map((n,i)=>n-points[root][i]));
    const delta=points[joint].map((n,i)=>n-points[root][i]),d=dot3(delta,sourceAxis);
    const normal=delta.map((n,i)=>n-d*sourceAxis[i]),projection=dot3(normal,axis);
    return normalize(normal.map((n,i)=>n-projection*axis[i]));
   };
   const u=pole(original),v=pole(other),cos=Math.max(-1,Math.min(1,dot3(u,v))),angle=Math.acos(cos);
   let normal;
   if(pose.to===5){
    const cross=(x,y)=>[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
    const reference=normalize(original[end].map((n,i)=>n-original[root][i]+other[end][i]-other[root][i]));
    const referencePole=points=>{
     const d=points[joint].map((n,i)=>n-points[root][i]),projection=dot3(d,reference);
     return normalize(d.map((n,i)=>n-projection*reference[i]));
    };
    const ru=referencePole(original),rv=referencePole(other);
    const referenceTurn=Math.atan2(dot3(reference,cross(ru,rv)),dot3(ru,rv));
    let turn=Math.atan2(dot3(axis,cross(u,v)),cos);
    if(turn-referenceTurn>Math.PI)turn-=2*Math.PI;
    if(turn-referenceTurn<-Math.PI)turn+=2*Math.PI;
    const perpendicular=cross(axis,u);
    normal=u.map((n,i)=>n*Math.cos(turn*t)+perpendicular[i]*Math.sin(turn*t));
   }else if(cos>.999)normal=normalize(mix3(u,v,t));
   else{
    const perpendicular=cos<-.999?[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]]:normalize(v.map((n,i)=>n-u[i]*cos));
    normal=u.map((n,i)=>n*Math.cos(angle*t)+perpendicular[i]*Math.sin(angle*t));
   }
   j[joint]=jointBetween(j[root],j[root].map((n,i)=>n+normal[i]),j[end],l1,l2);
  }
  a.joints[side]=j;
  a.toes[side]=mix3(a.toes[side],b.toes[side],t);
 }
 for(const key of ['hip','shoulder','head','chest','leftaxis','up','gaze'])a[key]=mix3(a[key],b[key],t);
 return a;
}

export function practiceFrame(id,role,pose=0,rear=false,position='',throws='R',bats='R',time=0){
 const hand=role==='bat'?bats:throws,stage=role==='pitch'?pitchStages[typeof pose==='object'?(pose.t<1?pose.from:pose.to):pose]??'set':role==='bat'?'ready':String(pose);
 const frame={id,kind:role,stage,temporary:true,helmet:role==='bat'||role==='run',earGuards:'both',
  throws,gloveHand:opposite(throws),bats,pivotFoot:throws,strideFoot:opposite(throws),
  rect:[0,0,220,186],height:186,anchorX:.5,anchorY:1,parts:[],rear};
 if(role==='bat'||role==='pitch'){
  const rig=role==='pitch'?blendedPitch(hand,pose):structuredClone(PRACTICE_POSES[role][hand][stage]);
  if(role==='bat'){
   const center=mix3(rig.joints.L[5],rig.joints.R[5],.5);
   for(const side of ['L','R']){
    const j=rig.joints[side];j[5]=mix3(center,j[5],.65);
    j[4]=jointBetween(j[3],j[4],j[5],.44,.44);
   }
  }
  const camera=role==='pitch'?(rear?[-.24,1]:[1,-1]):!rear?[-.24,1]:bats==='R'?[-1,-1]:[1,-1];
  const length=Math.hypot(...camera),angle=role==='pitch'&&rear?.24:.17;
  const [cx,cy]=camera.map(n=>n/length),right=[-cy,cx,0],up=[-cx*Math.sin(angle),-cy*Math.sin(angle),Math.cos(angle)],toward=[cx*Math.cos(angle),cy*Math.cos(angle),Math.sin(angle)];
  const anchor=role==='bat'?rig.joints[hand][5]:PRACTICE_POSES.pitch[hand].set.joints[hand][5];
  const project=v=>{const d=v.map((n,i)=>n-anchor[i]);return [110+dot3(d,right)*90,186-dot3(d,up)*90];};
  frame.rig=rig;frame.project=project;frame.toward=toward;
  frame.joints=Object.fromEntries(['L','R'].map(s=>[s,rig.joints[s].map(project)]));
  frame.toes=Object.fromEntries(['L','R'].map(s=>[s,project(add3(rig.joints[s][5],rig.toes[s]))]));
  frame.head=project(rig.head);frame.neck=project(add3(rig.shoulder,rig.up.map(x=>x*.12)));
  frame.facing=[dot3(rig.gaze,right),-dot3(rig.gaze,up)];
  frame.faceVisible=dot3(rig.gaze,toward)>.1;
  frame.chestVisible=dot3(rig.chest,toward)>0;
  frame.bat=rig.bat?.map(project);
  frame.glove=frame.joints[opposite(throws)][2].map((n,i)=>n/[220,186][i]);
  frame.release=frame.joints[throws][2].map((n,i)=>n/[220,186][i]);
 }else{
  // Fielding/run symbols intentionally omit detailed anatomy during this test.
  const run=role==='run'?Math.sin(time*14)*16:0,crouch=position==='C'?22:0;
  frame.head=[110,49+crouch];frame.neck=[110,72+crouch];frame.faceVisible=!rear;frame.chestVisible=!rear;
  frame.facing=[0,0];frame.joints={};frame.toes={};
  for(const side of ['L','R']){
   const sign=(side==='L'?1:-1)*(rear?-1:1),x=110+sign*20;
   let wrist=[x+sign*4,126+crouch],elbow=[x+sign*8,106+crouch];
   if(role==='run'){wrist=[x,100-sign*run];elbow=[x+sign*10,118-sign*run];}
   else if(side===opposite(throws)){
    if(pose==='gather')wrist=[110+sign*9,169];
    if(pose==='catch')wrist=[x,39];
    if(pose==='receive')wrist=[x+sign*18,97];
    if(pose==='transfer'||pose==='throw')wrist=[110+sign*10,99];
   }else if(pose==='throw'){elbow=[x+sign*18,71];wrist=[x+sign*27,49];}
   const foot=[110+sign*26+sign*run,182-Math.max(0,sign*run)*.4];
   frame.joints[side]=[[x,83+crouch],elbow,wrist,[110+sign*12,127+crouch*.4],[110+sign*27,153],foot];
   frame.toes[side]=[foot[0]+sign*8,foot[1]+1];
  }
  frame.glove=frame.joints[opposite(throws)][2].map((n,i)=>n/[220,186][i]);
  frame.release=frame.joints[throws][2].map((n,i)=>n/[220,186][i]);
 }
 if((role==='field'||role==='run')&&pose&&typeof pose==='object'&&pose.direction)return locomotion(frame,{...pose,amount:pose.moving?pose.amount:0});
 frame.throwingHandPoint=frame.release;
 return frame;
}

// Temporary field-space bat sweep, projected by the same camera as the stance.
// A rigid bat foreshortens as it turns; it must not windmill in screen space.
export function animatePracticeSwing(f,progress,contact){
 if(!f.bat||progress<=0)return f;
 const p=Math.min(1,progress),start=f.bat.map(v=>[...v]);
 const worldStart=f.rig.bat[1].map((n,i)=>n-f.rig.bat[0][i]);
 const worldLength=Math.hypot(...worldStart);
 const projectedLength=Math.hypot(start[1][0]-start[0][0],start[1][1]-start[0][1]);
 const direction=(f.bats==='R'?1:-1)*(f.rear?1:-1);
 const target=contact??[start[0][0]+direction*projectedLength,start[0][1]+40];
 const bottom=f.bats==='R'?'L':'R',top=f.bats;
 const sign=f.bats==='R'?1:-1;
 const startAzimuth=Math.atan2(worldStart[1],worldStart[0]);
 const contactAzimuth=f.bats==='R'?0:-Math.PI;
 const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
 const ease=t=>t*t*(3-2*t);
 const before=p<=.5,t=before?ease(p*2):ease((p-.5)*2);
 const azimuth=before?startAzimuth+(contactAzimuth-startAzimuth)*t:contactAzimuth+sign*2.25*t;
 const elevation=before?worldStart[2]/worldLength+(-.16-worldStart[2]/worldLength)*t:-.16+.66*t;
 const vector=(az,z)=>[Math.cos(az)*Math.sqrt(1-z*z)*worldLength,Math.sin(az)*Math.sqrt(1-z*z)*worldLength,z*worldLength];
 const origin=f.project([0,0,0]);
 const projectVector=v=>f.project(v).map((n,i)=>n-origin[i]);
 const worldVector=vector(azimuth,elevation),offset=projectVector(worldVector);
 const contactOffset=projectVector(vector(contactAzimuth,-.16));
 const contactKnob=target.map((n,i)=>n-contactOffset[i]);
 const follow=[f.joints[bottom][0][0],f.joints[bottom][0][1]-10];
 // Drive the handle out toward the field before folding into the finish.
 // The rear R batting camera projects this extension from right to left.
 const extension=projectVector([0,.34,0]);
 const extended=contactKnob.map((n,i)=>n+extension[i]);
 const knob=before?mix(start[0],contactKnob,t):p<=.78?
  mix(contactKnob,extended,ease((p-.5)/.28)):mix(extended,follow,ease((p-.78)/.22));
 const hands=Object.fromEntries([[bottom,.07],[top,.15]].map(([side,g])=>[side,knob.map((n,i)=>n+offset[i]*g/worldLength)]));
 // A small upper-body lean supports the arc; hips and every ground anchor stay fixed.
 const center=f.joints.L[0].map((n,i)=>(n+f.joints.R[0][i])/2);
 const gripCenter=hands.L.map((n,i)=>(n+hands.R[i])/2);
 const reach=Math.hypot(...gripCenter.map((n,i)=>n-center[i]));
 const lean=Math.max(0,reach-34)/Math.max(1,reach);
 const shift=gripCenter.map((n,i)=>(n-center[i])*lean);
 for(const side of ['L','R']){
  const j=f.joints[side],shoulder=j[0].map((n,i)=>n+shift[i]);
  const end=hands[side],dx=end[0]-shoulder[0],dy=end[1]-shoulder[1],d=Math.hypot(dx,dy);
  const a=27.9,b=26.1,along=(a*a-b*b+d*d)/(2*Math.max(.001,d));
  const h=Math.sqrt(Math.max(0,a*a-along*along));
  // Elbows stay below the shoulder/handle line instead of snapping upward.
  const bend=dx>=0?1:-1;
  j[0]=shoulder;j[1]=[shoulder[0]+dx/d*along-dy/d*h*bend,shoulder[1]+dy/d*along+dx/d*h*bend];j[2]=end;
 }
 f.neck=f.neck.map((n,i)=>n+shift[i]*.5);f.head=f.head.map((n,i)=>n+shift[i]*.5);
 f.bat=[knob,knob.map((n,i)=>n+offset[i])];f.swingProgress=p;f.batWorldVector=worldVector;
 return f;
}

export function drawPracticeActor(c,x,y,scale,team,player,role,pose,time,rear,contact=null,art=null){
 const f=practiceFrame(player.id,role,pose,rear,player.position,player.throws,player.bats,time);
 if(role==='bat')animatePracticeSwing(f,pose,contact);
 const jersey=team.id==='navy-stars'?'#23376b':'#e94043',skin=player.skin??'#e6bd94',edge='#233b49';
 const line=(pts,color,width)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();};
 const oval=(p,rx,ry,color)=>{c.beginPath();c.ellipse(...p,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
 const polygon=(pts,color)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=color;c.fill();};
 const limb=(pts,color,w)=>{line(pts,edge,w+2);line(pts,color,w);};
 const dressed=Object.keys(CHARACTER_ART).every(key=>art?.[key]?.complete);
 const navy=team.id==='navy-stars';
 const piece=(rect,a,b,width)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  c.save();c.translate(...a);c.rotate(Math.atan2(dy,dx)-Math.PI/2);
  c.drawImage(art.uniformParts,...rect,-width/2,-3,width,length+6);c.restore();
 };
 const torso=()=>{
  const l=f.joints.L,r=f.joints.R,top=[(l[0][0]+r[0][0])/2,(l[0][1]+r[0][1])/2],bottom=[(l[3][0]+r[3][0])/2,(l[3][1]+r[3][1])/2];
  const rect=navy?(f.chestVisible?[737,76,150,231]:[1045,75,147,231]):(f.chestVisible?[105,78,160,226]:[419,72,152,232]);
  const width=Math.max(19,Math.hypot(l[0][0]-r[0][0],l[0][1]-r[0][1])+8);
  c.save();
  const dx=bottom[0]-top[0],dy=bottom[1]-top[1],length=Math.hypot(dx,dy)||1,side=[dy/length,-dx/length];
  const corners=[top.map((n,i)=>n-side[i]*width*.5),top.map((n,i)=>n+side[i]*width*.5),bottom.map((n,i)=>n+side[i]*width*.37),bottom.map((n,i)=>n-side[i]*width*.37)];
  c.beginPath();corners.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.clip();
  piece(rect,top,bottom,width);c.restore();
 };
 c.save();c.translate(x-110*scale,y-186*scale);c.scale(scale,scale);
 const support=role==='pitch'?f.joints[['release','follow','recover'].includes(f.stage)?opposite(player.throws):player.throws][5]:[110,186];
 oval(support,25,4,'#173b3e30');
 const sides=['L','R'].sort((a,b)=>f.rig?dot3(f.rig.joints[a][0],f.toward)-dot3(f.rig.joints[b][0],f.toward):0);
 for(const s of sides){const j=f.joints[s];limb([j[3],j[4],j[5]],'#f7f1e4',12);line([j[4].map((n,i)=>n+(j[5][i]-n)*.55),j[5]],jersey,10);limb([j[5],f.toes[s]],'#263945',10);
  if(dressed){piece([1075,448,49,170],j[3],j[4],18);
   line([[j[3][0]+(s==='L'?6:-6),j[3][1]],[j[4][0]+(s==='L'?5:-5),j[4][1]]],navy?'#6597d0':'#eb4348',1.5);
   piece(navy?[419,641,125,269]:[103,641,121,269],j[4],j[5],16);
   const toe=f.toes[s],dx=toe[0]-j[5][0],dy=toe[1]-j[5][1],mid=[(toe[0]+j[5][0])/2,(toe[1]+j[5][1])/2];
   // Shoes keep their soles below the ankle; turning left must not turn them upside down.
   c.save();c.translate(...mid);c.scale(dx<0?-1:1,1);
   c.rotate(Math.max(-.38,Math.min(.38,Math.atan2(dy,Math.abs(dx)))));
   const shoeWidth=14+10*Math.abs(dx)/(Math.hypot(dx,dy)||1);
   c.drawImage(art.uniformParts,...(navy?[952,713,278,160]:[642,717,278,156]),-shoeWidth*.45,-8,shoeWidth,14);c.restore();
  }
 }
 const l=f.joints.L,r=f.joints.R;
 if(dressed){
  const pelvis=[l[3].map((n,i)=>n+(i===0?5:-5)),r[3].map((n,i)=>n+(i===0?-5:-5)),r[3].map((n,i)=>n+(i===1?12:0)),l[3].map((n,i)=>n+(i===1?12:0))];
  polygon(pelvis,'#f7f1f2');
  line([l[3].map((n,i)=>n+(i===1?8:0)),r[3].map((n,i)=>n+(i===1?8:0))],'#d5cbd5',1);
 }
 polygon([l[0],r[0],r[3],l[3]],edge);polygon([l[0],r[0],r[3],l[3]],jersey);
 if(dressed)torso();
 line([l[3],r[3]],'#33434b',4);
 line([[(l[0][0]+r[0][0])/2,(l[0][1]+r[0][1])/2],f.head],skin,10);
 // Far arm first. Separate arm and equipment anchors remain anatomical.
 const arm=s=>{const j=f.joints[s];limb([j[0],j[1]],jersey,9);limb([j[1],j[2]],skin,7);
  if(dressed){piece(navy?[405,381,172,192]:[85,380,175,197],j[0],j[1],16);
   const cuff=j[1].map((n,i)=>n+(j[2][i]-n)*.55);piece([741,356,116,260],j[1],cuff,10);}
  oval(j[2],4,4,skin);};
 arm(sides[0]);
 if(!dressed){oval(f.head,15,18,skin);
 oval([f.head[0],f.head[1]-5],16,14,jersey);
 const facing=f.facing,brim=[f.head[0]+facing[0]*23,f.head[1]-6+facing[1]*12];
 line([[f.head[0],f.head[1]-6],brim],jersey,6);
 if(f.faceVisible){const eye=[f.head[0]+facing[0]*10,f.head[1]+1];oval(eye,1.6,2.2,edge);}
 if(f.helmet){
  // Double ear protection avoids introducing a camera-dependent guard flip.
  for(const side of [-1,1]){line([[f.head[0]+side*13,f.head[1]-2],[f.head[0]+side*13,f.head[1]+9]],jersey,7);}
  line([[f.head[0]-8,f.head[1]-15],[f.head[0]+4,f.head[1]-18]],'#ffffff80',2);
 }
 }else{
  const cell=characterHeadCell(player,f.helmet,f.facing,f.faceVisible);
  const img=art[cell.key],long=player.hair==='pony'||player.hair==='long';
  const w=cell.pixelScale?cell.rect[2]*cell.pixelScale:long?47:42,h=cell.pixelScale?cell.rect[3]*cell.pixelScale:long?48:43;
  // Atlas margins differ: seat the neck cutout over the rig's neck connection.
  // Rear helmet art has more empty space below the skull than the side heads.
  const headTop=f.head[1]-25+(cell.pixelScale?8:4);
  c.drawImage(img,...cell.rect,f.head[0]-w/2,headTop,w,h);
 }
 arm(sides[1]);
 if(f.bat){line(f.bat,'#9d642f',5);line([f.bat[0],f.bat[0].map((n,i)=>n+(f.bat[1][i]-n)*.22)],'#eee8db',4);for(const s of sides)oval(f.joints[s][2],4,4,'#fff9ed');}
 if(role!=='bat'&&role!=='run'){
  const glove=f.joints[f.gloveHand][2];oval(glove,9,11,'#ab7842');line([[glove[0]-4,glove[1]-6],[glove[0]+4,glove[1]+5]],'#6c4b30',2);
  if(dressed)c.drawImage(art.uniformParts,...(f.faceVisible?[53,933,249,266]:[354,937,252,263]),glove[0]-12,glove[1]-14,24,28);
  if(role==='pitch'&&['set','lift','load'].includes(f.stage))oval(f.joints[player.throws][2],3.4,3.4,'#fffdf3');
 }
 if(role==='field'&&player.position==='C'){
  if(f.chestVisible)polygon([l[0],r[0],r[3],l[3]],'#253d50');
  else line([l[0],r[3]],'#253d50',3);
  if(f.faceVisible)for(const offset of [-7,0,7])line([[f.head[0]-15,f.head[1]+offset],[f.head[0]+15,f.head[1]+offset]],'#d0d9df',2);
  for(const s of sides)line([f.joints[s][4],f.joints[s][5]],'#253d50',13);
 }
 c.restore();return f;
}
