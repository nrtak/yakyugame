import {suspendApprovedFieldRegistries} from './test-rig-isolation.mjs';
import test from'node:test';import assert from'node:assert/strict';
import {GroundDefense}from'./defense-play.mjs';import {liveFieldPose,liveBallPoint,fieldBallIsPainted,poseLandmark,poseGround}from'./live-field-art.mjs';
import {approvedFieldPose}from'./field-atlas.mjs';import {characterBatterPose,SCENE_ASSETS}from'./scene-render.mjs';

test('approved left transfers retain own identity and one painted ball at the external throwing hand',(t)=>{suspendApprovedFieldRegistries(t);
 for(const [team,id,asset]of[['coral-club','coral-club-emma','coralEmmaTransfer'],['coral-club','coral-club-mia','coralMiaTransfer'],['coral-club','coral-club-emi','coralEmiTransfer'],['navy-stars','navy-stars-mia','navyClaraTransfer']]){
  const context={teamId:team,batterId:team==='coral-club'?'navy-stars-ryan':'coral-club-emma'},initial=new GroundDefense(context),target=initial.state.players.find(p=>p.id===id).point,play=new GroundDefense({...context,target});
  for(let n=0;n<3000&&!play.canThrow;n++)play.step(.01);const s=play.state,p=s.players.find(p=>p.id===id);assert.equal(s.fielderId,id);const pose=liveFieldPose(s,p),poses=new Map([[id,pose]]);
  assert.equal(pose.asset,asset);assert.equal(pose.throws,'L');assert.equal(pose.gloveHand,'R');assert.equal(fieldBallIsPainted(s,poses),true);assert.deepEqual(liveBallPoint(s,poses),poseLandmark(pose,poseGround(pose,p),'hand'));
  assert.equal(fieldBallIsPainted({...s,possession:'free'},poses),false);assert.equal(fieldBallIsPainted({...s,phase:'tag'},poses),false);assert.equal(liveFieldPose(s,{...p,throws:'R'}),null);assert.equal(liveFieldPose({...s,teamId:'other-team'},p),null);
 }
});
test('Clara release starts at her bare left fingers and never reflects toward an unsupported target',(t)=>{suspendApprovedFieldRegistries(t);
 const p={id:'navy-stars-mia',throws:'L',point:{x:0,y:100}},receiver={id:'navy-stars-sora',point:{x:60,y:60}},s={teamId:'navy-stars',players:[p,receiver],throwFromId:p.id,throwToId:receiver.id,phase:'throw',possession:'free',ball:{x:0,y:100,z:0},throwProgress:0,runners:[]};
 const pose=liveFieldPose(s,p),poses=new Map([[p.id,pose]]);assert.equal(pose.asset,'navyClaraThrow');assert.equal(pose.containsBall,undefined);assert.equal(fieldBallIsPainted(s,poses),false);assert.deepEqual(liveBallPoint(s,poses),poseLandmark(pose,poseGround(pose,p),'hand'));
 assert.equal(liveFieldPose({...s,players:[p,{...receiver,point:{x:-60,y:60}}]},p),null);assert.equal(approvedFieldPose(p.id,'R','throw'),null);
});
test('five approved shorter-hair ready drawings preserve each original batting registration',(t)=>{suspendApprovedFieldRegistries(t);
 for(const id of['coral-club-emma','coral-club-mia','coral-club-emi','navy-stars-mia','navy-stars-sora']){const p=characterBatterPose(id,'R',0);assert.equal(SCENE_ASSETS[p.asset],'assets/scene-'+id+'-ready-short-hair-v1.png');assert.deepEqual(p.rect,[0,0,1024,1536]);assert.deepEqual(p.anchor,[672,1338]);assert.equal(p.scale,.6);}
});
