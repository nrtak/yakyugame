import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceFrame, animatePracticeSwing, PRACTICE_PARKS, CHARACTER_ART, characterHeadCell} from './practice-actors.mjs';
import {batterBox,batterChalkBounds,BATTING_CAMERA,BATTING_VISIBLE_FIELDERS,battingCamera,battingSceneBounds,fieldApproach} from './match-render.mjs';
import {createRenderer,pitcherPlacement,getPitchPose,fieldMotion,fieldPlayerScale,batterPlacement,referencePitcherPlacement,cameraIsPitching,battingContactPoint,fieldLayout,battingFieldLayout,defensivePlan,fieldLanding,framePoint,battingPose,fieldingInteraction} from './match-render.mjs';
import {SWING_LEAD} from './engine.mjs';
import {createMatch,GROUND_PLAY} from './match-engine.mjs';
import {TEAMS} from './rosters.mjs';

function setup(){
  const images=[],draws=[];
  const previous=globalThis.Image;
  globalThis.Image=class {constructor(){this.complete=true;this.naturalWidth=1536;this.naturalHeight=1024;images.push(this);}};
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),drawImage:(...args)=>draws.push(args)}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const canvas={width:0,height:0,getContext:()=>context,getBoundingClientRect:()=>({width:844,height:278,left:0,top:0})};
  const renderer=createRenderer(canvas);globalThis.Image=previous;
  const view={match:createMatch(),phase:'windup',clock:0,elapsed:0,pitch:null,swing:null,aim:{x:0,y:0},guide:true};
  return {renderer,view,draws,images};
}

test('canonical players render every gameplay phase without legacy sprite IDs or missing anchors',async()=>{
 const f=setup();await f.renderer.ready;
 assert.deepEqual(f.images.map(i=>i.src).sort(),Object.values({...PRACTICE_PARKS,...CHARACTER_ART}).sort(),'canonical cast and environment artwork load');
 for(const half of [0,1])for(let index=0;index<9;index++){
  f.view.match=createMatch({innings:1});f.view.match.half=half;f.view.match.order[half]=index;
  for(const [phase,clock,elapsed] of [['ready',0,0],['windup',.3,0],['windup',.6,0],['flight',0,.05],['flight',0,.3],['flight',0,1.25]]){
   Object.assign(f.view,{phase,clock,elapsed,pitch:{duration:1.25,x:0,y:0,bend:.9},cpuSwing:true,swing:null});
   assert.doesNotThrow(()=>f.renderer.draw(f.view));
  }
  const id=TEAMS[half].players[index].id;
  for(const kind of ['single','double','triple','homerun','groundout','flyout','walk'])for(const t of [.08,.4,1.2,1.7,2.1]){
   Object.assign(f.view,{phase:'play',playTime:t,play:{kind,direction:.4,distance:.55},event:{team:half,batter:id,beforeBases:[null,null,null],afterBases:['single','walk'].includes(kind)?[id,null,null]:[null,null,null],atBatEnded:true,kind}});
   assert.doesNotThrow(()=>f.renderer.draw(f.view),`${id}: ${kind} at ${t}`);
  }
 }
});

test('every roster player retains batting hand, glove hand and helmet across cameras',()=>{
 for(const team of TEAMS)for(const p of team.players)for(const rear of [false,true]){
  for(const role of ['bat','run','field','pitch'])for(const pose of role==='pitch'?[0,1,4,2,3]:[0,.2,.5,1]){
   const f=practiceFrame(p.id,role,pose,rear,p.position,p.throws,p.bats);
   assert.equal(f.helmet,role==='bat'||role==='run');assert.equal(f.bats,p.bats);
   assert.equal(f.throws,p.throws);assert.notEqual(f.gloveHand,p.throws);
   assert.equal(f.pivotFoot,p.throws);assert.equal(f.strideFoot,f.gloveHand);
   assert.ok(Object.values(f.joints).flat(2).every(Number.isFinite));
   if(role==='pitch')assert.deepEqual(f.release,f.joints[p.throws][2].map((v,i)=>v/[220,186][i]));
  }
 }
});

test('camera projection preserves source limb lengths and the reference rear-batting foot arrangement',()=>{
 for(const hand of ['R','L'])for(const rear of [false,true])for(const phase of [0,1,4,2,3]){
  const frame=practiceFrame('test','pitch',phase,rear,'P',hand);
  for(const points of Object.values(frame.rig.joints))for(const [a,b,length] of [[0,1,.31],[1,2,.29],[3,4,.44],[4,5,.44]]){
   assert.ok(Math.abs(Math.hypot(...points[a].map((v,i)=>v-points[b][i]))-length)<.00001);
  }
 }
 const right=practiceFrame('test','bat',0,true,'P','L','R');
 assert.ok(right.joints.L[5][0]<right.joints.R[5][0],'front left foot is screen-left of rear right foot');
 for(const side of ['L','R'])assert.ok(right.toes[side][0]>right.joints[side][5][0],'both toes point across the plate');
 assert.deepEqual(battingContactPoint({match:{half:0},aim:{x:1,y:1},swing:{aim:{x:-.5,y:.25}}}),[596,437.5]);
});
test('box side follows handedness and reverses with the camera at phone widths',()=>{
 for(const width of [667,844,1280,1560])for(const hand of ['R','L']){
  const left=640-width/2;
  const home=batterPlacement(true,hand,left,width),mound=batterPlacement(false,hand,left,width);
  assert.equal(Math.sign(home.x-640),hand==='R'?-1:1);
  assert.equal(Math.sign(mound.x-640),hand==='R'?1:-1);
  for(const rear of [false,true]){
   const set=referencePitcherPlacement(rear,0,hand),lift=referencePitcherPlacement(rear,1,hand),load=referencePitcherPlacement(rear,4,hand);
   assert.deepEqual(set,lift);assert.deepEqual(lift,load,'pivot stays at the rubber through loading');
   assert.deepEqual(referencePitcherPlacement(rear,2,hand),referencePitcherPlacement(rear,3,hand),'stride foot stays planted after release');
  }
 }
 assert.equal(cameraIsPitching({match:{half:0}}),false);
 assert.equal(cameraIsPitching({match:{half:1}}),true);
 assert.equal(cameraIsPitching({camera:'mound',match:{half:0}}),true);
});

test('a queued throw waits for the pickup and a delayed throw keeps a continuous ball path',()=>{
 const waiting=fieldMotion({kind:'groundout',throwDelay:null,direction:.3,distance:.43},1.8);
 assert.equal(waiting.stage,'transfer');assert.equal(waiting.height,20);
 const delayed={kind:'groundout',throwDelay:.5,direction:.3,distance:.43};
 const a=fieldMotion(delayed,1.6699),b=fieldMotion(delayed,1.6701);
 assert.ok(Math.hypot(a.ball[0]-b.ball[0],a.ball[1]-b.ball[1])<1);
 assert.equal(fieldMotion(delayed,1.8).stage,'throw');
 assert.equal(fieldMotion(delayed,2.3).stage,'received');
 assert.equal(fieldMotion({kind:'flyout'},1.15).height,35,'fly ball reaches glove height instead of the shoes');
});

test('pitcher pivot contacts the painted rubber and stride stays on mound dirt in both cameras',()=>{
 for(const width of [540,844,1280,1560])for(const rear of [true,false])for(const throws of ['R','L']){
  const left=640-width/2,set=referencePitcherPlacement(rear,0,throws,'R',left,width);
  const rubber=rear?[.433,.558,628]:[.48,.52,388];
  const offset=rear?-92:0,spread=rear?110.4:0;
  assert.ok(set.x>=left+offset-spread/2+(width+spread)*rubber[0]&&set.x<=left+offset-spread/2+(width+spread)*rubber[1]);
  assert.equal(set.y,rubber[2]);
  for(const phase of [0,1,4])assert.deepEqual(referencePitcherPlacement(rear,phase,throws,'L',left,width),set,'batter hand cannot move pitcher off rubber');
  const release=referencePitcherPlacement(rear,2,throws,'R',left,width);
  assert.deepEqual(release,referencePitcherPlacement(rear,3,throws,'R',left,width));
  assert.ok(release.y>=(rear?580:380)&&release.y<=(rear?720:430));
  assert.ok(release.x>=left+width*(rear?.05:.3)&&release.x<=left+width*(rear?.95:.7));
 }
});

test('hit tracking follows a continuous ball path through fielding and a throw to first',()=>{
 const walk=fieldMotion({kind:'walk'},.8);assert.equal(walk.zoom,1);assert.equal(walk.visible,false);
 const play={kind:'groundout',direction:-.5,distance:.4},arrival=fieldMotion(play,0).arrival;
 for(const edge of [arrival,arrival+.12]){
  const a=fieldMotion(play,edge-.0001),b=fieldMotion(play,edge+.0001);
  assert.ok(Math.hypot(a.ball[0]-b.ball[0],a.ball[1]-b.ball[1])<1);
 }
 assert.equal(fieldMotion(play,1.5).stage,'throw');
 const received=fieldMotion(play,1.9);assert.equal(received.stage,'received');assert.deepEqual(received.ball,[1280*.72-24,449]);
 for(const width of [720,1280,1560])for(const kind of ['single','double','triple','homerun','groundout','flyout'])for(let t=0;t<3;t+=.03){
  const f=fieldMotion({kind,direction:.8,distance:.8},t,640-width/2,width);
  assert.ok(f.zoom>=1.35&&f.zoom<=2.8);assert.ok(f.ball.every(Number.isFinite));assert.ok(f.height>=0);
  const x=640+(f.ball[0]-f.focusX)*f.zoom,y=360+(f.ball[1]-f.focusY)*f.zoom;
  if(f.visible)assert.ok(x>=640-width/2&&x<=640+width/2&&y>=0&&y<=720,`${kind} visible during tracking`);
 }
});

test('approved starting alignment puts CF behind second and separates SS/2B from the mound',()=>{
 for(const width of [720,1280,1560]){
  const left=640-width/2,home=battingFieldLayout(left,width),field=fieldLayout(left,width);
  assert.equal(home.CF[0],640);assert.equal(field.positions.CF[0],field.bases[2][0]);
  assert.ok(home.SS[0]<640-width*.1);assert.ok(home['2B'][0]>640+width*.1);
  assert.ok(home.LF[0]<home.CF[0]&&home.RF[0]>home.CF[0]);
  assert.ok(home.SS[1]>=370&&home.SS[1]<388,'SS stands in middle infield behind rubber');
  assert.ok(home['2B'][1]>=370&&home['2B'][1]<388);
  assert.ok(home['1B'][1]<410&&home['3B'][1]<410,'corner infielders are beside base areas, not on foreground grass');
  for(const role of ['LF','CF','RF'])assert.ok(home[role][1]<367,'outfielders stay behind infield dirt');
  assert.equal(Object.keys(field.positions).length,9);
 }
});

test('coverage assigns an actual receiver and the approved supporting lanes',()=>{
 const short=defensivePlan({kind:'groundout',direction:-.4,distance:.72});
 assert.equal(short.defender,'SS');assert.equal(short.receiver,'1B');assert.ok(short.coverage['2B']);
 const first=defensivePlan({kind:'groundout',direction:.85,distance:.6});
 assert.equal(first.defender,'1B');assert.equal(first.receiver,'P');assert.ok(first.coverage['2B']);
 const fly=defensivePlan({kind:'flyout',direction:0,distance:.7});
 assert.equal(fly.defender,'CF');assert.equal(fly.receiver,null);
 assert.ok(fly.coverage.LF[0]<640&&fly.coverage.RF[0]>640);
 for(const p of [short,first])assert.notEqual(p.defender,p.receiver);
});

test('fair landing points stay between foul lines even on shallow pulled balls',()=>{
 for(const width of [720,1280,1560])for(const direction of [-1,0,1])for(const distance of [0,.2,.4,.8,1]){
  const left=640-width/2,point=fieldLanding({kind:'groundout',direction,distance},left,width);
  const max=width*Math.min(.44,.22*(659-point[1])/190);
  assert.ok(Math.abs(point[0]-640)<=max+.001);
 }
});

test('throw arrives at the selected receiver glove with no discontinuity at transfer',()=>{
 for(const id of ['c4','n4','c9','n1']){
  const frame=practiceFrame(id,'field','receive',false,id.endsWith('4')?'1B':'P');
  const receiver=[1194.56,400],point=framePoint(frame,receiver,fieldPlayerScale(400),frame.glove);
  const play={kind:'groundout',direction:-.4,distance:.72,receivePoint:point};
  const result=fieldMotion(play,1.9);
  assert.ok(Math.hypot(result.ball[0]-point[0],result.ball[1]-point[1])<.001);
  assert.ok(point[1]<receiver[1]-30,'ball arrives above the shoes');
 }
});

test('visible contact phase matches the scoring impact time for player and CPU swings',()=>{
 const v={phase:'flight',swing:{inputTime:1},elapsed:1+SWING_LEAD};
 assert.ok(Math.abs(battingPose(v)-.5)<1e-8);
 assert.equal(battingPose({...v,elapsed:1.5}),1);
 assert.ok(Math.abs(battingPose({phase:'flight',cpuSwing:true,pitch:{duration:1.25},elapsed:1.25})-.5)<1e-8);
 assert.ok(battingPose({...v,phase:'play',playTime:.08})>.5);
 assert.ok(battingPose({...v,phase:'call',clock:.08})>.5);
 assert.equal(battingPose({...v,phase:'review'}),0);
});

test('projected swing keeps physical bat length, both grips attached, and both shoes inside the box',()=>{
 for(const rear of [false,true])for(const hand of ['L','R'])for(const width of [540,667,844,1280,1560]){
  const left=640-width/2,spot=batterPlacement(rear,hand,left,width),box=batterBox(rear,hand,left,width);
  const base=practiceFrame('test','bat',0,rear,'P',hand,hand),length=Math.hypot(...base.bat[1].map((n,i)=>n-base.bat[0][i]));
  const target=[(640-spot.x)/spot.scale+110,((rear?458:327)-spot.y)/spot.scale+186];
  let last=null;
  for(let tick=0;tick<=100;tick++){
   const p=tick/100,f=animatePracticeSwing(practiceFrame('test','bat',p,rear,'P',hand,hand),p,target);
   const physical=Math.hypot(...base.rig.bat[1].map((n,i)=>n-base.rig.bat[0][i]));
   if(p>0)assert.ok(Math.abs(Math.hypot(...f.batWorldVector)-physical)<1e-6);
   assert.ok(Math.hypot(...f.bat[1].map((n,i)=>n-f.bat[0][i]))<=physical*90+.001);
   for(const side of ['L','R']){
    assert.deepEqual(f.joints[side][5],base.joints[side][5]);assert.deepEqual(f.toes[side],base.toes[side]);
    for(const point of [f.joints[side][5],f.toes[side]]){
     const x=spot.x+(point[0]-110)*spot.scale,y=spot.y+(point[1]-186)*spot.scale,r=5*spot.scale;
     assert.ok(x-r>=box.left-.001&&x+r<=box.right+.001&&y-r>=box.top-.001&&y+r<=box.bottom+.001);
     for(const edgeY of [y-6*spot.scale,y+6*spot.scale]){
      const edge=batterChalkBounds(rear,hand,edgeY,left,width),margin=rear?10:3;
      assert.ok(x-6*spot.scale>=edge.left+margin-.001&&x+6*spot.scale<=edge.right-margin+.001,'whole shoe clears angled chalk');
     }
    }
    const v=f.joints[side][2].map((n,i)=>n-f.bat[0][i]),axis=f.bat[1].map((n,i)=>n-f.bat[0][i]);
    assert.ok(Math.abs(v[0]*axis[1]-v[1]*axis[0])<.001,'hands stay on the handle');
   }
   if(p===.5)assert.ok(Math.hypot(...f.bat[1].map((n,i)=>n-target[i]))<1e-6,'barrel crosses the contact point at scoring time');
   if(last)assert.ok(Math.hypot(...f.bat[1].map((n,i)=>n-last[i]))<12,'no bat teleport between animation samples');
   last=f.bat[1];
  }
 }
});

test('follow-through sweeps upfield then across the body instead of circling down toward the feet',()=>{
 for(const hand of ['R','L']){
  const vectors=[];
  for(const rear of [true,false]){
   const frames=[.5,.65,.85,1].map(p=>animatePracticeSwing(practiceFrame('test','bat',0,rear,'P',hand,hand),p));
   const sign=hand==='R'?1:-1;
   assert.ok(frames[0].batWorldVector[0]*sign>0,'contact extends across the plate');
   assert.ok(frames[1].batWorldVector[1]>0,'barrel continues toward the pitcher after contact');
   assert.ok(frames[3].batWorldVector[0]*sign<0,'finish crosses to the opposite shoulder');
   assert.ok(frames[3].batWorldVector[2]>0,'finish rises instead of pointing at the ground');
   for(const f of frames)assert.ok(f.bat[1][1]<Math.min(f.joints.L[4][1],f.joints.R[4][1]),'barrel never dives below the knees');
   vectors.push(frames.map(f=>f.batWorldVector));
  }
  assert.deepEqual(vectors[0],vectors[1],'camera changes the projection, not the swing direction');
 }
});

test('handle extends outward after contact before returning to the finishing shoulder',()=>{
 for(const hand of ['R','L'])for(const rear of [true,false]){
  const at=p=>animatePracticeSwing(practiceFrame('test','bat',0,rear,'P',hand,hand),p);
  const contact=at(.5),extension=at(.78),direction=rear?(hand==='R'?-1:1):-1;
  assert.ok((extension.bat[0][0]-contact.bat[0][0])*direction>(rear?15:5));
  assert.ok(Math.abs(extension.bat[0][1]-contact.bat[0][1])<6,'extend through the ball before lifting into wrap');
 }
});

test('close tracking follows the ball then frames the active player across directions and phone widths',()=>{
 for(const width of [540,844,1280,1560])for(const direction of [-.9,0,.9])for(const kind of ['single','flyout','groundout']){
  const left=640-width/2,play={kind,direction,distance:.7};
  const interaction=fieldingInteraction(play,1,left,width),p={...play,...interaction.motionOptions};
  let last;
  for(let t=0;t<2.3;t+=.01){
   const f=fieldMotion(p,t,left,width),s=fieldPlayerScale(f.cameraPlayer[1]);
   const points=t<.8?[f.ball]:[f.ball,[f.cameraPlayer[0],f.cameraPlayer[1]],[f.cameraPlayer[0],f.cameraPlayer[1]-155*s]];
   for(const pt of points){
    const x=640+(pt[0]-f.focusX)*f.zoom,y=360+(pt[1]-f.focusY)*f.zoom;
    assert.ok(x>=left&&x<=left+width&&y>=0&&y<=720,`${kind} ${direction}: active play remains framed`);
   }
   if(last){assert.ok(Math.abs(f.focusX-last.focusX)<width*.03,'pan tracks a fast throw without a position jump');assert.ok(Math.abs(f.focusY-last.focusY)<16);assert.ok(Math.abs(f.zoom-last.zoom)<.08);}
   last=f;
  }
 }
});
test('grounder pickup and throw connect to the active glove, hand and receiver across phone widths',()=>{
 for(const team of [0,1])for(const width of [720,1280,1560])for(const direction of [0,-.4,.85]){
  const left=640-width/2,play={kind:'groundout',direction,distance:direction===-.4?.72:direction===.85?.6:.5};
  const interaction=fieldingInteraction(play,team,left,width),motionPlay={...play,...interaction.motionOptions};
  const caught=fieldMotion(motionPlay,GROUND_PLAY.arrival,left,width);
  assert.ok(Math.hypot(...caught.ball.map((v,i)=>v-interaction.gatherPoint[i]))<.001,'grounder reaches the glove');
  if(interaction.actionArt){
   const player=TEAMS[team].players.find(p=>p.position===interaction.defender);
   const frame=practiceFrame(player.id,'field','throw',false,player.position,player.throws);
   const hand=framePoint(frame,interaction.destination,fieldPlayerScale(interaction.destination[1]),frame.throwingHandPoint);
   const released=fieldMotion(motionPlay,GROUND_PLAY.arrival+GROUND_PLAY.transfer+.000001,left,width);
   assert.ok(Math.hypot(...released.ball.map((v,i)=>v-hand[i]))<.01,'throw leaves the anatomical throwing hand');
  }
  const received=fieldMotion(motionPlay,GROUND_PLAY.arrival+GROUND_PLAY.transfer+GROUND_PLAY.flight,left,width);
  assert.ok(Math.hypot(...received.ball.map((v,i)=>v-interaction.motionOptions.receivePoint[i]))<1e-8);
 }
});
test('a queued throw keeps the secured ball hidden until release without a position jump',()=>{
 const play={kind:'groundout',direction:0,distance:.5,throwDelay:.3};
 const interaction=fieldingInteraction(play,1),p={...play,...interaction.motionOptions};
 const release=GROUND_PLAY.arrival+GROUND_PLAY.transfer+.3;
 assert.equal(fieldMotion(p,GROUND_PLAY.arrival).visible,true);
 assert.equal(fieldMotion(p,release-.001).visible,false);
 assert.equal(fieldMotion({...p,throwDelay:null},10).visible,false);
 assert.equal(fieldMotion(p,release+.001).visible,true);
 const a=fieldMotion(p,release-.000001),b=fieldMotion(p,release+.000001);
 assert.ok(Math.hypot(...a.ball.map((v,i)=>v-b.ball[i]))<.01);
});

test('pitch animation keeps limb lengths, planted feet and release continuous between key poses',()=>{
 for(const hand of ['R','L'])for(const rear of [false,true]){
  const foot=hand==='R'?'L':'R';let last;
  for(let tick=0;tick<=162;tick++){
   const time=tick/100,pose=getPitchPose(time<.72?{phase:'windup',clock:time}:{phase:'flight',elapsed:time-.72});
   const f=practiceFrame('test','pitch',pose,rear,'P',hand),j=f.rig.joints;
   for(const side of ['R','L'])for(const [a,b,len] of [[0,1,.31],[1,2,.29],[3,4,.44],[4,5,.44]])
    assert.ok(Math.abs(Math.hypot(...j[side][a].map((n,i)=>n-j[side][b][i]))-len)<1e-5);
   if(time<=.54)assert.ok(Math.hypot(...j[hand][5].map((n,i)=>n-[0,.2,.04][i]))<1e-6,'pivot foot stays planted during gather and load');
   if(time>=.72)assert.ok(Math.abs(j[foot][5][1]+.62)<1e-6,'lead foot stays planted through follow-through');
   if(last)for(const side of ['L','R'])for(let i=0;i<6;i++)assert.ok(Math.hypot(...f.joints[side][i].map((n,k)=>n-last.joints[side][i][k]))<15,'no joint teleport at pose changes');
   last=f;
  }
 }
});

test('pitchers recover onto both feet, facing home, instead of holding the leg in the air',()=>{
 for(const hand of ['L','R'])for(const rear of [true,false]){
  const f=practiceFrame('test','pitch',getPitchPose({phase:'flight',elapsed:.7}),rear,'P',hand);
  for(const side of ['L','R']){assert.ok(Math.abs(f.rig.joints[side][5][2]-.04)<1e-8);assert.ok(f.rig.toes[side][1]<0);}
  assert.deepEqual(f.rig.gaze,[0,-1,0]);assert.ok(f.rig.chest[1]<-.99);assert.equal(f.stage,'recover');
 }
});

test('closer batting camera preserves aim coordinates and limits background fielders',()=>{
 const {renderer}=setup(),a=BATTING_CAMERA;
 const width=844,height=278,scale=height/720,offset=(width-1280*scale)/2;
 for(const p of [[640,458],[596,437.5],[720,500]]){
  const q=renderer.point({clientX:offset+(a.x+(p[0]-a.x)*a.zoom)*scale,clientY:(a.y+(p[1]-a.y)*a.zoom)*scale},false);
  assert.ok(Math.abs(q.x-p[0])<1e-6&&Math.abs(q.y-p[1])<1e-6);
 }
 assert.ok(a.zoom>=1.2);assert.deepEqual(BATTING_VISIBLE_FIELDERS,['SS','2B']);
 assert.ok(fieldMotion({kind:'groundout',direction:-.7,distance:.7},.05).zoom>=2.5,'hit camera begins close, without a full-field establishing shot');
 for(const width of [540,671,844])for(const hand of ['L','R']){
  const scene=battingSceneBounds(640-width/2,width),spot=batterPlacement(true,hand,scene.left,scene.width),camera=battingCamera(hand,width);
  assert.equal(spot.scale,3.5,'narrow viewport crops scenery instead of shrinking the batter');
  const contactX=camera.x+(640-camera.focusX)*camera.zoom;
  assert.ok(contactX>640-width/2&&contactX<640+width/2,'contact stays visible for both hands');
 }
});

test('narrow stance retains full foreground size rather than shrinking the batter',()=>{
 for(const hand of ['R','L']){
  const f=practiceFrame('test','bat',0,true,'P',hand,hand);
  const spread=Math.hypot(...f.rig.joints.L[5].map((v,i)=>v-f.rig.joints.R[5][i]));
  assert.ok(spread>.4&&spread<.43);assert.ok(batterPlacement(true,hand).scale>=3.5);
 }
 const field=fieldLayout();
 assert.ok(Math.abs((field.bases[0][1]-field.bases[1][1])-(field.bases[1][1]-field.bases[2][1]))<1e-8,'overhead diamond has equal near and far depth');
});

test('directional running preserves limbs, opposite arm-leg motion, helmets and glove hands',()=>{
 for(const throws of ['R','L'])for(const direction of [[1,0],[-1,0],[0,1],[0,-1],[1,-1]])for(const role of ['run','field']){
  for(let step=0;step<24;step++){
   const frame=practiceFrame('test',role,{moving:true,direction,distance:step*58/24,amount:1},false,'SS',throws);
   assert.equal(frame.helmet,role==='run');assert.equal(frame.gloveHand,throws==='R'?'L':'R');
   const forward=[direction[0],direction[1]/.66],length=Math.hypot(...forward);
   for(const side of ['L','R']){
    const j=frame.rig.joints[side];
    for(const [a,b,len] of [[0,1,.31],[1,2,.29],[3,4,.44],[4,5,.44]])assert.ok(Math.abs(Math.hypot(...j[a].map((n,i)=>n-j[b][i]))-len)<1e-6);
    const foot=j[5][0]*forward[0]/length+j[5][1]*forward[1]/length;
    const hand=j[2][0]*forward[0]/length+j[2][1]*forward[1]/length-.19;
    assert.ok(foot*hand<=1e-8,'same-side hand and foot counter-swing');
    assert.ok(j[5][2]>=.04-1e-8,'shoe stays above the ground');
   }
  }
 }
});

test('defenders react, accelerate, brake and settle while supporting players cover the play',()=>{
 const start=[300,300],end=[450,400];
 assert.deepEqual(fieldApproach(start,end,.04,1).position,start);
 assert.deepEqual(fieldApproach(start,end,1,1).position,end);
 assert.equal(fieldApproach(start,end,1,1).pose.moving,false);
 const speed=t=>Math.hypot(...fieldApproach(start,end,t+.01,1).position.map((n,i)=>n-fieldApproach(start,end,t,1).position[i]));
 assert.ok(speed(.1)<speed(.5));assert.ok(speed(.95)<speed(.5));
 for(const direction of [-.8,.8]){
  const plan=defensivePlan({kind:'single',direction,distance:.8});
  assert.ok(Object.keys(plan.coverage).length>=6);
  assert.ok(!plan.coverage[plan.defender],'supporting players keep distinct assignments');
 }
});

test('shallow hits keep cutoff and base coverage clear of the outfielder pickup',()=>{
 for(const width of [540,900,1280])for(const direction of [-.1,0,.1])for(const distance of [.72,.8,.88]){
  const play={kind:'single',direction,distance},plan=defensivePlan(play,0,width),landing=fieldLanding(play,0,width);
  const cutoff=direction<0?'SS':'2B',cover=cutoff==='SS'?'2B':'SS';
  assert.ok(plan.coverage[cutoff][1]>landing[1],'cutoff remains toward home from the pickup');
  assert.ok(Math.hypot(...plan.coverage[cutoff].map((n,i)=>n-landing[i]))>=95,'cutoff leaves room to field the ball');
  assert.ok(Math.hypot(...plan.coverage[cover].map((n,i)=>n-landing[i]))>=79.99,'base coverage leaves room to field the ball');
 }
});

test('all eighteen identities have distinct team atlas slots and explicit helmet views',()=>{
 const identities=new Set();
 for(const team of TEAMS)for(const player of team.players){
  const cap=characterHeadCell(player,false,[0,0],true),helmet=characterHeadCell(player,true,[0,0],true);
  identities.add(`${cap.key}/${cap.row}`);assert.equal(helmet.row,cap.row);assert.equal(helmet.col,cap.col+4);
  const back=characterHeadCell(player,true,[0,0],false);
  assert.equal(back.col,6,'rear batting view uses the helmet rear drawing');
  assert.equal(back.key,'rearHelmets','never reuse a cap with an adjustable rear opening for a batter');
  assert.equal(characterHeadCell(player,true,[-1,0],true).col,7);
  assert.equal(characterHeadCell(player,true,[1,0],true).col,5);
  for(const cell of [cap,helmet,back]){
   assert.ok(cell.rect[0]>=0&&cell.rect[1]>=0);
   assert.ok(cell.rect[0]+cell.rect[2]<=(cell.key==='rearHelmets'?724:1182)&&cell.rect[1]+cell.rect[3]<=(cell.key==='rearHelmets'?2172:1330));
  }
 }
 assert.equal(identities.size,18);
});
