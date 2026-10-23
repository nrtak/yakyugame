import test from 'node:test';import assert from 'node:assert/strict';import {GroundDefense} from './defense-play.mjs';
import {liveFieldPose,fieldProject,poseLandmark,liveBallPoint,LIVE_FIELD_SCALE,poseGround} from './live-field-art.mjs';
import {FlightDefense} from './flight-defense.mjs';

test('Clara gathers with her own right glove while unsupported left-throw actions remain unavailable',()=>{
 const context={teamId:'navy-stars',batterId:'coral-club-emma'},id='navy-stars-mia';
 const target=new GroundDefense(context).state.players.find(p=>p.id===id).point;
 const play=new GroundDefense({...context,target});
 for(let n=0;n<3000&&play.state.phase!=='gather';n++)play.step(.01);
 const s=play.state,actor=s.players.find(p=>p.id===id),pose=liveFieldPose(s,actor);
 assert.equal(s.phase,'gather');assert.equal(s.fielderId,id);assert.equal(pose.asset,'navyClaraGather');
 assert.equal(pose.throws,'L');assert.equal(pose.gloveHand,'R');
 assert.deepEqual(liveBallPoint(s,new Map([[id,pose]])),poseLandmark(pose,poseGround(pose,actor)));
 assert.equal(liveFieldPose(s,{...actor,throws:'R'}),null);
 for(let n=0;n<3000&&!play.canThrow;n++)play.step(.01);
 assert.equal(play.canThrow,true);play.throwTo('1B');
 assert.equal(liveFieldPose(play.state,play.state.players.find(p=>p.id===id)),null);
});

test('Coral Sora transfers and throws to first with her own right-handed catcher art and release point',()=>{
 const play=new GroundDefense({teamId:'coral-club',batterId:'navy-stars-ryan',target:{x:0,y:4},ballTravel:.6});
 for(let n=0;n<3000&&!play.canThrow;n++)play.step(.01);
 assert.equal(play.canThrow,true);let s=play.state,actor=s.players.find(p=>p.id==='coral-club-sora');
 assert.equal(s.fielderId,actor.id);assert.equal(liveFieldPose(s,actor).asset,'coralCatcherTransfer');
 play.throwTo('1B');for(let n=0;n<3000&&play.state.phase!=='throw';n++)play.step(.01);
 s=play.state;assert.equal(s.phase,'throw');actor=s.players.find(p=>p.id==='coral-club-sora');const pose=liveFieldPose(s,actor);
 assert.equal(pose.asset,'coralCatcherThrow');assert.equal(pose.throws,'R');assert.equal(pose.gloveHand,'L');
 assert.deepEqual(liveBallPoint({...s,throwProgress:0},new Map([[actor.id,pose]])),poseLandmark(pose,poseGround(pose,actor),'hand'));
 assert.equal(liveFieldPose(s,{...actor,throws:'L'}),null);
 const receiver=s.players.find(p=>p.id===s.throwToId);
 assert.equal(liveFieldPose({...s,players:s.players.map(p=>p.id===receiver.id?{...p,point:{x:actor.point.x-10,y:actor.point.y}}:p)},actor),null);
});

test('Clara and Emi catches retain right gloves and visible ball possession',()=>{
 for(const [teamId,batterId,id]of [['navy-stars','coral-club-emma','navy-stars-mia'],['coral-club','navy-stars-ryan','coral-club-emi']]){
  const play=new FlightDefense({teamId,batterId,contact:{quality:.6,launchAngle:40,direction:0}});
  for(let n=0;n<3000&&!play.finished;n++)play.step(.01);
  assert.equal(play.finished,true);
  const s=play.state,p=s.players.find(p=>p.id===id),pose=liveFieldPose(s,p);
  assert.equal(s.fielderId,id);assert.equal(s.airCatch,true);assert.equal(pose.action,'catch');assert.equal(pose.throws,'L');assert.equal(pose.gloveHand,'R');
  assert.deepEqual(liveBallPoint(s,new Map([[id,pose]])),poseLandmark(pose,poseGround(pose,p)));
  assert.equal(liveFieldPose(s,{...p,throws:'R'}),null);
 }
});
test('base landmarks align to the illustrated park without reflecting the field',()=>{const d=90/Math.sqrt(2),a=fieldProject({x:d,y:d}),b=fieldProject({x:-d,y:d}),home=fieldProject({x:0,y:0});assert.ok(Math.abs(a.x-1238)<1);assert.ok(Math.abs(a.y-495)<1);assert.ok(Math.abs(b.x-298)<1);assert.deepEqual(home,{x:768,y:870});assert.ok(LIVE_FIELD_SCALE>0);});
test('approved Jasper fields, transfers and throws while possession stays at the authored hand and glove',()=>{
 const p=new GroundDefense();while(!p.canThrow)p.step(.01);let s=p.state,ken=s.players.find(x=>x.id==='navy-stars-ken'),pose=liveFieldPose(s,ken);assert.equal(ken.name,'Jasper');assert.equal(pose.asset,'navyKenField');assert.equal(pose.action,'transfer');assert.equal(pose.throws,'R');assert.equal(pose.gloveHand,'L');let poses=new Map(s.players.map(x=>[x.id,liveFieldPose(s,x)]).filter(([,pose])=>pose));assert.deepEqual(liveBallPoint(s,poses),poseLandmark(pose,fieldProject(ken.point)));
 p.throwTo('1B');s=p.state;assert.equal(liveFieldPose(s,ken).action,'transfer');while(p.state.phase!=='throw')p.step(.01);pose=liveFieldPose(p.state,ken);assert.equal(pose.action,'throw');assert.equal(pose.asset,'navyKenField');while(!p.finished)p.step(.01);s=p.state;const sora=s.players.find(x=>x.id==='navy-stars-sora'),receive=liveFieldPose(s,sora);assert.equal(receive.asset,'fieldnavystarssora');assert.equal(receive.action,'receive');poses=new Map(s.players.map(x=>[x.id,liveFieldPose(s,x)]).filter(([,pose])=>pose));assert.deepEqual(poseGround(receive,sora),fieldProject(sora.bagContact));assert.deepEqual(liveBallPoint(s,poses),poseLandmark(receive,fieldProject(sora.bagContact)));
});
test('another identity or unsupported throwing direction never borrows the inspected throw art',()=>{const p=new GroundDefense({bases:['coral-club-mia',null,null]});while(!p.canThrow)p.step(.01);p.throwTo('2B');const s=p.state,ken=s.players.find(x=>x.id==='navy-stars-ken');assert.notEqual(liveFieldPose(s,ken),'kenLoad');assert.equal(liveFieldPose({...s,teamId:'coral-club'},ken),null);assert.equal(liveFieldPose(s,{...ken,id:'unregistered-fielder'}),null);});
test('approved Dylan art preserves R throw and L glove and rejects an unsupported rear-running view',()=>{
 const p=new GroundDefense({target:{x:-120,y:210}});while(!p.canThrow)p.step(.01);let s=p.state,dylan=s.players.find(x=>x.id==='navy-stars-dylan');assert.equal(s.fielderId,dylan.id);let pose=liveFieldPose(s,dylan);assert.equal(pose.asset,'navyDylanField');assert.equal(pose.throws,'R');assert.equal(pose.gloveHand,'L');assert.deepEqual(liveBallPoint(s,new Map([[dylan.id,pose]])),poseLandmark(pose,poseGround(pose,dylan)));
 assert.equal(liveFieldPose({...s,phase:'approach',ballOwnerId:null},{...dylan,moving:true,motion:{x:0,y:10}}),null);p.throwTo('1B');s=p.state;pose=liveFieldPose(s,s.players.find(x=>x.id===dylan.id));assert.equal(pose.action,'transfer');while(p.state.phase!=='throw')p.step(.01);pose=liveFieldPose(p.state,p.state.players.find(x=>x.id===dylan.id));assert.equal(pose.action,'throw');
});
test('Coral Ken and Noah use only their exact approved fielding sheets with visible possession',()=>{
 for(const [target,id,asset]of [[{x:-40,y:115},'coral-club-ken','coralKenField'],[{x:120,y:210},'coral-club-noah','coralNoahField']]){
  const p=new GroundDefense({teamId:'coral-club',batterId:'navy-stars-ryan',target});while(!p.canThrow)p.step(.01);const s=p.state,actor=s.players.find(x=>x.id===id),pose=liveFieldPose(s,actor);assert.equal(s.fielderId,id);assert.equal(pose.asset,asset);assert.equal(pose.throws,'R');assert.equal(pose.gloveHand,'L');assert.deepEqual(liveBallPoint(s,new Map([[id,pose]])),poseLandmark(pose,poseGround(pose,actor)));assert.equal(liveFieldPose(s,{...actor,throws:'L'}),null);assert.equal(liveFieldPose({...s,teamId:'navy-stars'},actor),null);
 }
});
