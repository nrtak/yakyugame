import test from 'node:test';import assert from 'node:assert/strict';
import {DEFENSIVE_PITCH_CAST,DEFENSIVE_PITCH_ASSETS,DEFENSIVE_PITCH_CAMERA,defensivePitcherPose,defensivePitcherFrame,defensivePitcherIdle,defensivePitcherPoint,defensiveRelease,nativePitcherPose} from './pitching-art.mjs';
import {pitchingPosition,characterPitcherMotionPose,characterPitcherPose} from './scene-render.mjs';
import {pitchingActorPose,PITCHING_GEOMETRY} from './scene-render.mjs';
import {catcherPose} from './opposing-art.mjs';
import {playerById} from './rosters.mjs';
import {PITCH_WINDUP_SECONDS} from './engine.mjs';
const deliveryClock=t=>t*PITCH_WINDUP_SECONDS/.72;

test('Emma painted delivery keeps her left throw and right landing sole through a two-foot finish',()=>{
 const base={pitcherId:'coral-club-emma',pitcherHand:'L',phase:'flight',elapsed:0,clock:0};
 const landing=defensivePitcherPose(base.pitcherId,'L',8).world;
 for(const elapsed of [0,.1,.299,.3,.5,.62,1]){
  const s={...base,elapsed},rear=defensivePitcherPose(s.pitcherId,s.pitcherHand,defensivePitcherFrame(s)),front=characterPitcherMotionPose(s);
  for(const p of [rear,front]){assert.equal(p.throws,'L');assert.equal(p.gloveHand,'R');assert.ok((p.scale??.15)>0);assert.equal(p.support,'R');}
  assert.deepEqual(rear.world,landing);
  assert.equal(rear.ballVisible,false);assert.equal(!!rear.containsBall,false);
  if(elapsed>=.62){
   assert.equal(rear.phase,'Grounded finish');assert.equal(front.phase,'settled');
   assert.deepEqual(rear.feetGrounded,{L:true,R:true});assert.deepEqual(front.feetGrounded,{L:true,R:true});
   assert.equal(rear.asset,'defenseEmmaMatched');assert.equal(front.asset,'emmaPitchSet');
   assert.deepEqual(front.world,characterPitcherPose(s.pitcherId,3).world);
  }
 }
 const early={...base,phase:'result',elapsed:.05,clock:.05};
 assert.equal(defensivePitcherFrame(early),9,'An early result must not skip the throwing arm follow-through');
 assert.equal(defensivePitcherFrame({...early,clock:.57}),13);
 assert.equal(characterPitcherMotionPose({...base,pitcherHand:'R'}),null);
});

test('Emma leaves the release hold once the ball is downrange and keeps the planted landing foot',()=>{
 const s={pitcherId:'coral-club-emma',pitcherHand:'L',phase:'flight',elapsed:.15,clock:0};
 const release=defensivePitcherPose(s.pitcherId,'L',8),follow=defensivePitcherPose(s.pitcherId,'L',defensivePitcherFrame(s));
 assert.equal(follow.phase,'Deceleration','Do not hold the overhead release painting for the old 300ms');
 assert.deepEqual(follow.world,release.world);assert.equal(follow.support,'R');
 const at=defensiveRelease('L'),ball=pitchingPosition({duration:.68,x:0,y:0,bend:0},s.elapsed,'L');
 assert.ok(ball.x>at.x,'The projectile has already left the fingertips');
 assert.equal(follow.containsBall,false);assert.equal(follow.ballVisible,false);
 assert.deepEqual(defensivePitcherPoint(release,release.hand),at);
});
test('defensive deliveries retain their own fixed roster hands and positive uncrossed crops',()=>{
 for(const [id,cast]of Object.entries(DEFENSIVE_PITCH_CAST)){
  const player=playerById(id);assert.equal(cast.throws,player.throws);assert.notEqual(cast.gloveHand,cast.throws);
  assert.equal(defensivePitcherPose(id,cast.gloveHand,0),null);
  for(let frame=0;frame<(id==='coral-club-emma'?14:5);frame++){
   const p=defensivePitcherPose(id,cast.throws,frame),[x,y,w,h]=p.rect;
   assert.ok(DEFENSIVE_PITCH_ASSETS[p.asset]);assert.ok(p.scale>0);
   assert.ok(x>=0&&y>=0&&x+w<=p.size[0]&&y+h<=p.size[1]);
   assert.equal(p.containsBall,false);assert.equal(p.ballVisible,id==='coral-club-emma'?[3,4,5,6,7].includes(frame):frame===2);
   assert.equal(p.throws,player.throws);assert.equal(p.gloveHand,player.gloveHand);
  }
 }
 assert.equal(defensivePitcherPose('navy-stars-ken','R',0),null);
});
test('pivot is fixed through gather/load and the stride landing stays fixed through release/recovery',()=>{
 for(const [id,cast]of Object.entries(DEFENSIVE_PITCH_CAST)){
  const isEmma=id==='coral-club-emma',poses=Array.from({length:isEmma?14:5},(_,i)=>defensivePitcherPose(id,cast.throws,i)),plant=isEmma?6:3;
  for(const p of poses.slice(0,plant)){assert.equal(p.support,cast.throws);assert.deepEqual(p.world,poses[0].world);}
  const landing=isEmma?{x:947,y:754.15}:defensivePitcherPoint(poses[2],poses[2].landing);
  if(isEmma)assert.deepEqual(poses[0].world,[540,830]);
  for(const p of poses.slice(plant)){assert.equal(p.support,cast.gloveHand);assert.ok(Math.hypot(p.world[0]-landing.x,p.world[1]-landing.y)<.01);}
 }
});
test('flight begins at the authored open throwing fingers, with no second baked-in ball',()=>{
 for(const [id,cast]of Object.entries(DEFENSIVE_PITCH_CAST)){
  const p=nativePitcherPose({pitcherId:id,pitcherHand:cast.throws,phase:'flight',elapsed:0})??defensivePitcherPose(id,cast.throws,id==='coral-club-emma'?8:3),expected=defensivePitcherPoint(p,p.hand),flight=pitchingPosition({duration:1.3,x:0,y:0,bend:0},0,cast.throws);
  assert.deepEqual(defensiveRelease(cast.throws),expected);assert.equal(flight.x,expected.x);assert.equal(flight.y,expected.y);
 }
});
test('receiving mitt aligns with the plate and receiver feet do not teleport during transfer',()=>{
 for(const id of ['navy-stars-lily','coral-club-sora']){
  const receive=pitchingActorPose(catcherPose(id),'catcher'),transfer=pitchingActorPose(catcherPose(id,'transfer'),'catcher');
  const mitt={x:receive.world[0]+(receive.glove[0]-receive.anchor[0])*receive.scale,y:receive.world[1]+(receive.glove[1]-receive.anchor[1])*receive.scale};
  assert.ok(Math.hypot(mitt.x-PITCHING_GEOMETRY.zone.x,mitt.y-PITCHING_GEOMETRY.zone.y)<1);
  assert.deepEqual(receive.world,transfer.world);assert.equal(receive.containsBall,false);assert.equal(transfer.containsBall,true);
 }
});
test('reference-look Ryan idle keeps its own ball and right pivot through the gathered delivery',()=>{
 const idle=defensivePitcherIdle('navy-stars-ryan','R');assert.ok(idle);assert.equal(idle.phase,'idle');assert.equal(idle.containsBall,true);assert.equal(idle.ballVisible,false);
 assert.equal(idle.gloveHand,'L');assert.equal(defensivePitcherIdle('navy-stars-ryan','L'),null);assert.equal(defensivePitcherIdle('navy-stars-ken','R'),null);
 const right=defensivePitcherPoint(idle,[772,1491]);for(const frame of[0,1,2])assert.deepEqual(defensivePitcherPose('navy-stars-ryan','R',frame).world,[right.x,right.y]);
 const release=defensiveRelease('R');assert.ok(release.x>0&&release.x<1600&&release.y>25&&release.y<960);
});

test('Ryan rear delivery advances from release into recovery without the out-of-order arm painting',()=>{
 const state={pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'windup',clock:deliveryClock(.60)};
 assert.equal(defensivePitcherFrame(state),2);
 assert.equal(defensivePitcherFrame({...state,clock:deliveryClock(.685)}),5);
 for(const[elapsed,frame]of[[0,3],[.054,3],[.055,4],[.139,4],[.14,4],[.299,4],[.3,7],[.499,7],[.5,8],[1,8]])assert.equal(defensivePitcherFrame({...state,phase:'flight',elapsed}),frame);
 // Ryan's extra painted drawings must not select nonexistent Emma frames.
 assert.equal(defensivePitcherFrame({...state,pitcherId:'coral-club-emma',pitcherHand:'L',clock:deliveryClock(.685)}),7);
 assert.equal(defensivePitcherFrame({...state,pitcherId:'coral-club-emma',pitcherHand:'L',phase:'flight',elapsed:.09}),9);
});

test('Ryan throwing hand does not reverse upward between deceleration and the leg carry',()=>{
 const base={pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'flight',clock:0};
 let lastY=-Infinity;
 for(const elapsed of [0,.054,.055,.1,.139,.14,.2,.299,.3,.4]){
  const s={...base,elapsed},frame=defensivePitcherFrame(s),p=defensivePitcherPose(s.pitcherId,s.pitcherHand,frame),hand=defensivePitcherPoint(p,p.hand);
  assert.notEqual(frame,6,'Historical lower-arm drawing must not precede the higher-arm recovery');
  assert.ok(hand.y>=lastY-1e-8,'Throwing arm reversed back upward');lastY=hand.y;
  assert.equal(p.throws,'R');assert.equal(p.gloveHand,'L');assert.equal(p.support,'L');
  assert.deepEqual(p.world,defensivePitcherPose(s.pitcherId,'R',3).world);
 }
});

test('Ryan right foot swings from behind to the arriving side before both feet settle',()=>{
 const state={pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'flight'},poses=[4,7,8].map(i=>defensivePitcherPose(state.pitcherId,'R',i)),feet=poses.map(p=>defensivePitcherPoint(p,p.rightFoot));
 assert.ok(feet[0].x<feet[1].x&&feet[1].x<feet[2].x,'Right cleat progresses forward through the authored arc');
 assert.ok(feet[1].y<poses[1].world[1]-80,'Bent right leg carries its cleat above the landing plane');assert.ok(feet[2].y<poses[2].world[1]-40&&feet[2].y>poses[2].world[1]-100,'Arriving right sole stays on the front slope of the mound');assert.ok(feet[2].x>poses[2].world[0]);
 const plate={x:PITCHING_GEOMETRY.zone.x,y:550},distance=p=>Math.hypot(p.x-plate.x,p.y-plate.y);assert.ok(distance(feet[2])<distance(feet[1]),'Right sole progresses toward home plate through the carry and landing');
 assert.deepEqual(poses.map(p=>p.rightFootGrounded),[false,false,true]);for(const p of poses){assert.equal(p.support,'L');assert.deepEqual(p.world,poses[0].world);assert.equal(p.containsBall,false);}
 assert.equal(defensivePitcherFrame({...state,phase:'result'}),8);assert.equal(defensivePitcherFrame({...state,phase:'hit'}),8);
 assert.equal(DEFENSIVE_PITCH_CAMERA.rightwardShift,85);assert.equal(PITCHING_GEOMETRY.zone.x,1085,'Camera offset leaves the distant plate and target pinned');
});

test('Ryan corrective frames keep the planted left sole and a single baseball owner',()=>{
 const landing=defensivePitcherPoint(defensivePitcherPose('navy-stars-ryan','R',2),[990,1060]);
 for(const frame of[3,5,6]){const p=defensivePitcherPose('navy-stars-ryan','R',frame);assert.equal(p.throws,'R');assert.equal(p.gloveHand,'L');assert.equal(p.support,'L');assert.ok(p.scale>0);assert.deepEqual(p.world,[landing.x,landing.y]);assert.ok(DEFENSIVE_PITCH_ASSETS[p.asset]);assert.equal(p.ballVisible,false);assert.equal(p.containsBall,frame===5);}
 const release=defensiveRelease('R');assert.ok(release.y>200&&release.y<400,'Release is forward near cap height rather than the old skyward endpoint');
});

test('Ryan shows backward arm extension before the hand rises and accelerates forward',()=>{
 const state={pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'windup'};
 for(const[clock,frame]of[[.30,1],[.359,1],[.36,9],[.44,9],[.509,9],[.51,2],[.629,2],[.63,5]])assert.equal(defensivePitcherFrame({...state,clock:deliveryClock(clock)}),frame);
 const back=defensivePitcherPose(state.pitcherId,'R',9),stride=defensivePitcherPose(state.pitcherId,'R',2),acceleration=defensivePitcherPose(state.pitcherId,'R',5),release=defensiveRelease('R');
 assert.equal(back.throws,'R');assert.equal(back.gloveHand,'L');assert.equal(back.support,'R');assert.deepEqual(back.world,stride.world);assert.equal(back.containsBall,false);assert.equal(back.ballVisible,true);
 const points=[back,stride,acceleration].map(p=>defensivePitcherPoint(p,p.hand));
 assert.ok(points[0].x<points[1].x&&points[1].x<points[2].x&&points[2].x<release.x);
 assert.ok(points[0].y>points[1].y&&points[1].y>points[2].y,'Authored hand rises from backswing through loading, without a downward push');
 assert.ok(DEFENSIVE_PITCH_ASSETS[back.asset].includes('arm-back'));
});

test('Ryan completes his follow-through, then plants both feet in his own field-ready drawing',()=>{
 const s={pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'flight',elapsed:.30};
 assert.equal(characterPitcherMotionPose(s).asset,'pitcherRecovery');
 const early={...s,phase:'result',elapsed:.1,clock:.1};
 assert.notEqual(characterPitcherMotionPose(early).phase,'settled');
 for(const state of [{...s,elapsed:.62},{...early,clock:.52},{...early,phase:'hit',clock:1},{...early,clock:5}]){
  const p=characterPitcherMotionPose(state);assert.equal(p.asset,'fieldnavystarsryan');assert.equal(p.phase,'settled');assert.deepEqual(p.feetGrounded,{L:true,R:true});assert.equal(p.support,'L');assert.equal(p.throws,'R');assert.equal(p.gloveHand,'L');assert.equal(p.containsBall,false);assert.deepEqual(p.world,characterPitcherPose(s.pitcherId,4).world);
 }
 assert.equal(characterPitcherMotionPose({...s,phase:'ready'}).asset,'pitcherSet');
});

test('a short pitch result lets Ryan rear leg finish its carry before the grounded ending',()=>{
 const s={pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'result',elapsed:.14,clock:0};
 assert.equal(defensivePitcherFrame(s),4);assert.equal(defensivePitcherFrame({...s,clock:.17}),7);assert.equal(defensivePitcherFrame({...s,clock:.37}),8);
});
