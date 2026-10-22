import test from 'node:test';import assert from 'node:assert/strict';
import {usesFieldView,fieldPlay,fieldToScreen,FIELD_CUT_TIME,FIELD_GLOVE_OFFSET,FIELD_PLAY_DURATION} from './field-camera.mjs';
import {BattingScene} from './scene-engine.mjs';
test('fair contact cuts to field view after a brief contact hold; fouls and misses stay at home',()=>{
 const s=new BattingScene();s.finish({kind:'hit',timingMs:80});assert.equal(usesFieldView(s),false);s.clock=FIELD_CUT_TIME;assert.equal(usesFieldView(s),true);
 for(const kind of ['foul','miss','ball','strike']){s.finish({kind});s.clock=1;assert.equal(usesFieldView(s),false);}
});
test('review slice uses the roster positions for Ken and Sora for every preview',()=>{for(const direction of [-1,0,1]){const s=new BattingScene();s.previewField(direction);s.clock=3;const f=fieldPlay(s);assert.equal(f.position,'SS');assert.equal(f.receiverRole,'1B');assert.equal(f.fielderId,'navy-stars-ken');assert.equal(f.receiverId,'navy-stars-sora');assert.ok(f.direction<0);}});
test('camera remains a tight bounded crop and ball stays on screen through pickup and throw',()=>{
 for(const direction of [-1,-.5,0,.5,1]){const s=new BattingScene();s.previewField(direction);let prior;
 for(let t=FIELD_CUT_TIME;t<FIELD_PLAY_DURATION;t+=1/60){s.clock=t;const f=fieldPlay(s),v=f.camera,p=fieldToScreen(f.ball,v);assert.ok(v.x>=0&&v.y>=0&&v.x+v.width<=1536&&v.y+v.height<=1024);assert.equal(v.width,640);assert.ok(p.x>40&&p.x<1560&&p.y>40&&p.y<920);if(prior)assert.ok(Math.hypot(v.x-prior.x,v.y-prior.y)<20);prior=v;}}
});
test('retrieval finishes at the authored glove landmark, then holds both fielder and camera',()=>{
 const s=new BattingScene();s.previewField(-.5);s.clock=2.3;const f=fieldPlay(s);assert.ok(f.collected&&f.gathering);assert.ok(Math.abs(f.ball.x-f.fielder.x-FIELD_GLOVE_OFFSET.x)<1e-8);assert.ok(Math.abs(f.ball.y-f.fielder.y-FIELD_GLOVE_OFFSET.y)<1e-8);s.clock=2.35;assert.deepEqual(fieldPlay(s).camera,f.camera);
});
test('camera preview never changes results and pause freezes it',()=>{
 const s=new BattingScene();s.previewField(.5);s.step(.05);s.paused=true;const t=s.clock;s.step(.05);assert.equal(s.clock,t);s.paused=false;for(let i=0;i<140;i++)s.step(.05);assert.equal(s.phase,'intro');assert.equal(s.results.length,0);
});
test('actual fair hits retain field view until play duration and return to the next pitch',()=>{
 const s=new BattingScene();s.finish({kind:'hit',timingMs:0});for(let i=0;i<65;i++)s.step(.05);assert.equal(s.phase,'hit');assert.equal(usesFieldView(s),true);for(let i=0;i<65;i++)s.step(.05);assert.equal(s.phase,'ready');assert.equal(s.index,1);assert.equal(s.results.length,1);assert.ok(FIELD_PLAY_DURATION>3);
});

test('visible possession moves from pickup glove to throwing hand to receiving glove',()=>{const s=new BattingScene();s.previewField(-.6);for(const [time,owner] of [[2.3,'fielding-glove'],[2.7,'throwing-hand'],[5,'receiving-glove']]){s.clock=time;const f=fieldPlay(s);assert.equal(f.possession,owner);assert.ok(Number.isFinite(f.ball.x)&&Number.isFinite(f.ball.y));}s.clock=5;const f=fieldPlay(s);assert.ok(f.received&&f.receiverReady);assert.equal(f.receiverRole,'1B');});
test('Sora covers first; ball does not jump at transfer or release',()=>{const s=new BattingScene();s.previewField(.9);s.clock=3;assert.equal(fieldPlay(s).receiverRole,'1B');let prior;for(let t=2;t<5;t+=.001){s.clock=t;const f=fieldPlay(s);if(prior)assert.ok(Math.hypot(f.ball.x-prior.x,f.ball.y-prior.y)<2);prior=f.ball;} });
