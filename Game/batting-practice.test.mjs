import test from 'node:test';import assert from 'node:assert/strict';
import {CaptainBattingPractice,PRACTICE_CAPTAINS} from './batting-practice.mjs';
import {characterBatterPose,SCENE_ASSETS} from './scene-render.mjs';import {SWING_LEAD} from './engine.mjs';
test('six captains play ten pitches using their own approved art and fixed batting hand',()=>{
 for(const p of PRACTICE_CAPTAINS){const game=new CaptainBattingPractice(p.id);game.start();let swings=0;
  for(let tick=0;tick<30000&&game.phase!=='summary';tick++){
   if(game.phase==='flight'&&game.swingAt===null&&game.elapsed>=game.pitch.duration-SWING_LEAD-.004){game.setAim(game.pitch.x,game.pitch.y);assert.equal(game.swing(),true);assert.equal(game.swing(),false);swings++;}
   game.step(.005);
  }
  assert.equal(swings,10);assert.equal(game.summary.pitches,10);assert.equal(game.summary.fairHits,10);assert.equal(game.sceneState().batterHand,p.bats);assert.equal(game.sceneState().liveDefense,true);
  for(const frame of [0,2,3]){const pose=characterBatterPose(p.id,p.bats,frame);assert.ok(SCENE_ASSETS[pose.asset].includes(p.id));assert.ok(pose.scale>0);}assert.equal(characterBatterPose(p.id,p.bats==='L'?'R':'L',0),null);
 }
});
test('practice pause freezes motion and rejects inputs and invalid times',()=>{
 const g=new CaptainBattingPractice(PRACTICE_CAPTAINS[0].id);g.start();g.paused=true;const clock=g.clock;g.step(1);assert.equal(g.clock,clock);assert.equal(g.swing(),false);g.setAim(NaN,Infinity);assert.deepEqual(g.aim,{x:0,y:0});assert.throws(()=>g.step(NaN));assert.throws(()=>new CaptainBattingPractice('unknown'));
});
test('Yui contact retains the long barrel without leaking it into the follow-through crop',()=>{const contact=characterBatterPose('sakura-blossoms-yui','R',2),follow=characterBatterPose('sakura-blossoms-yui','R',3);assert.ok(contact.rect[0]+contact.rect[2]>=1120);assert.ok(follow.rect[0]>=1125);assert.ok(contact.rect[0]+contact.rect[2]<=follow.rect[0]);assert.equal(follow.rect[0]+follow.rect[2],1774);});
