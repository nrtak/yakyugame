import test from 'node:test';import assert from 'node:assert/strict';
import {DEFENSIVE_PITCH_CAST,DEFENSIVE_PITCH_ASSETS,DEFENSIVE_PITCH_CAMERA,defensivePitcherPose,defensivePitcherFrame,defensivePitcherIdle,defensivePitcherPoint,defensiveRelease} from './pitching-art.mjs';
import {pitchingPosition} from './scene-render.mjs';
import {pitchingActorPose,PITCHING_GEOMETRY} from './scene-render.mjs';
import {catcherPose} from './opposing-art.mjs';
import {playerById} from './rosters.mjs';
test('defensive deliveries retain their own fixed roster hands and positive uncrossed crops',()=>{
 for(const [id,cast]of Object.entries(DEFENSIVE_PITCH_CAST)){
  const player=playerById(id);assert.equal(cast.throws,player.throws);assert.notEqual(cast.gloveHand,cast.throws);
  assert.equal(defensivePitcherPose(id,cast.gloveHand,0),null);
  for(let frame=0;frame<5;frame++){
   const p=defensivePitcherPose(id,cast.throws,frame),[x,y,w,h]=p.rect;
   assert.ok(DEFENSIVE_PITCH_ASSETS[p.asset]);assert.ok(p.scale>0);
   assert.ok(x>=0&&y>=0&&x+w<=p.size[0]&&y+h<=p.size[1]);
   assert.equal(p.containsBall,false);assert.equal(p.ballVisible,frame===2);
   assert.equal(p.throws,player.throws);assert.equal(p.gloveHand,player.gloveHand);
  }
 }
 assert.equal(defensivePitcherPose('navy-stars-ken','R',0),null);
});
test('pivot is fixed through gather/load and the stride landing stays fixed through release/recovery',()=>{
 for(const [id,cast]of Object.entries(DEFENSIVE_PITCH_CAST)){
  const poses=Array.from({length:5},(_,i)=>defensivePitcherPose(id,cast.throws,i));
  for(const p of poses.slice(0,3)){assert.equal(p.support,cast.throws);assert.deepEqual(p.world,poses[0].world);}
  const landing=defensivePitcherPoint(poses[2],poses[2].landing);
  for(const p of poses.slice(3)){assert.equal(p.support,cast.gloveHand);assert.ok(Math.hypot(p.world[0]-landing.x,p.world[1]-landing.y)<.01);}
 }
});
test('flight begins at the authored open throwing fingers, with no second baked-in ball',()=>{
 for(const [id,cast]of Object.entries(DEFENSIVE_PITCH_CAST)){
  const p=defensivePitcherPose(id,cast.throws,3),expected=defensivePitcherPoint(p,p.hand),flight=pitchingPosition({duration:1.3,x:0,y:0,bend:0},0,cast.throws);
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

test('Ryan rear delivery passes rapidly from arm acceleration through release and deceleration',()=>{
 const state={pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'windup',clock:.60};
 assert.equal(defensivePitcherFrame(state),2);
 assert.equal(defensivePitcherFrame({...state,clock:.685}),5);
 for(const[elapsed,frame]of[[0,3],[.054,3],[.055,6],[.139,6],[.14,4],[.299,4],[.3,7],[.499,7],[.5,8],[1,8]])assert.equal(defensivePitcherFrame({...state,phase:'flight',elapsed}),frame);
 // Ryan's extra painted drawings must not select nonexistent Emma frames.
 assert.equal(defensivePitcherFrame({...state,pitcherId:'coral-club-emma',pitcherHand:'L',clock:.685}),2);
 assert.equal(defensivePitcherFrame({...state,pitcherId:'coral-club-emma',pitcherHand:'L',phase:'flight',elapsed:.09}),3);
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
 for(const[clock,frame]of[[.30,1],[.359,1],[.36,9],[.44,9],[.509,9],[.51,2],[.629,2],[.63,5]])assert.equal(defensivePitcherFrame({...state,clock}),frame);
 const back=defensivePitcherPose(state.pitcherId,'R',9),stride=defensivePitcherPose(state.pitcherId,'R',2),acceleration=defensivePitcherPose(state.pitcherId,'R',5),release=defensiveRelease('R');
 assert.equal(back.throws,'R');assert.equal(back.gloveHand,'L');assert.equal(back.support,'R');assert.deepEqual(back.world,stride.world);assert.equal(back.containsBall,false);assert.equal(back.ballVisible,true);
 const points=[back,stride,acceleration].map(p=>defensivePitcherPoint(p,p.hand));
 assert.ok(points[0].x<points[1].x&&points[1].x<points[2].x&&points[2].x<release.x);
 assert.ok(points[0].y>points[1].y&&points[1].y>points[2].y,'Authored hand rises from backswing through loading, without a downward push');
 assert.ok(DEFENSIVE_PITCH_ASSETS[back.asset].includes('arm-back'));
});
