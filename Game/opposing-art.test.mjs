import test from 'node:test';import assert from 'node:assert/strict';
import {allPlayers} from './rosters.mjs';import {DeviceGame} from './device-game.mjs';
import {opposingBatterPose,opposingArtKeys,catcherPose,catcherAction,OPPOSING_ASSETS,OPPOSING_CAST} from './opposing-art.mjs';
import {swingFrame} from './scene-engine.mjs';
test('both opposing lineups keep identity, fixed batting hand, and authored cameras',()=>{
 for(const p of allPlayers()){const pose=opposingBatterPose(p.id,p.bats,0);assert.ok(pose);assert.ok(OPPOSING_ASSETS[pose.asset].includes(p.id));assert.ok(pose.scale>0);assert.equal(opposingBatterPose(p.id,p.bats==='R'?'L':'R',0),null);}
 assert.equal(opposingBatterPose('unknown','R',0),null);
});
test('approved opposing phases preserve identity and explicit missing-phase fallback',()=>{
 const emma=[0,2,3].map(f=>opposingBatterPose('coral-club-emma','R',f));assert.deepEqual(emma.map(p=>p.phase),['ready','contact','follow']);assert.deepEqual(emma[0].world,emma[1].world);assert.deepEqual(emma[1].world,emma[2].world);
 const theo=opposingBatterPose('coral-club-theo','L',2),follow=opposingBatterPose('coral-club-theo','L',3);assert.match(OPPOSING_ASSETS[theo.asset],/contact-v2/);assert.notEqual(follow.asset,theo.asset);assert.equal(follow.phase,'follow');
 assert.equal(opposingBatterPose('navy-stars-ryan','R',2).phase,'contact');
 for(const id of ['navy-stars-ken','navy-stars-noah','navy-stars-lily','navy-stars-emma'])assert.deepEqual([0,2,3].map(f=>opposingBatterPose(id,'R',f).phase),['ready','contact','follow']);
 const cast=OPPOSING_CAST['navy-stars-dylan'],saved={...cast};
 try{delete cast.follow;assert.equal(opposingBatterPose('navy-stars-dylan','L',3).phase,'contact');delete cast.contact;assert.equal(opposingBatterPose('navy-stars-dylan','L',3).phase,'ready');}finally{Object.assign(cast,saved);}
});
test('catcher ownership changes to the authored ball in the mitt without a duplicate overlay',()=>{
 for(const id of ['navy-stars-lily','coral-club-sora']){const receive=catcherPose(id),transfer=catcherPose(id,'transfer');assert.equal(receive.containsBall,false);assert.equal(transfer.containsBall,true);assert.equal(transfer.gloveHand,'L');assert.equal(transfer.throws,'R');assert.deepEqual(receive.world,transfer.world);assert.ok(opposingArtKeys('coral-club-emma',id).includes(transfer.asset));}
 assert.equal(catcherAction({phase:'result',clock:.1,pitchOutcome:{kind:'miss'}}),'receive');assert.equal(catcherAction({phase:'result',clock:.3,pitchOutcome:{kind:'miss'}}),'transfer');assert.equal(catcherAction({phase:'result',clock:.3,pitchOutcome:{kind:'foul'}}),'receive');
});
test('CPU swings and catcher identity survive a third-out review until continue',()=>{
 const g=new DeviceGame({teamId:'navy-stars'});g.start();g.releasePitch();g.phase='flight';g.cpu={kind:'miss'};g.elapsed=g.pitch.duration-.05;
 assert.ok(swingFrame(g.sceneState())>0);g.match.outs=2;g.match.strikes=2;g.finishPitch({kind:'miss'});const old=g.sceneState();assert.equal(old.catcherId,'navy-stars-lily');assert.equal(old.pitchOutcome.kind,'miss');assert.equal(g.match.half,1);assert.equal(g.sceneState().catcherId,'navy-stars-lily');assert.equal(g.sceneState().batterId,'coral-club-emma');
});
