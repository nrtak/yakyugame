import test from 'node:test';import assert from 'node:assert/strict';
import {createSceneRenderer,SCENE_ASSETS} from './scene-render.mjs';
import {DeviceGame} from './device-game.mjs';
import {PITCH_WINDUP_SECONDS} from './engine.mjs';
import {nativePitcherPose,defensivePitcherPose,defensivePitcherFrame} from './pitching-art.mjs';

test('receding pitches are occluded by the foreground pitcher in either defensive delivery',async()=>{
 const previous=globalThis.Image,calls=[];
 class ImageStub{constructor(){this.naturalWidth=1600;this.naturalHeight=960;}set src(url){this.url=url;queueMicrotask(()=>this.onload?.());}}
 globalThis.Image=ImageStub;
 try{
  const ctx=new Proxy({drawImage:(image)=>calls.push({kind:'image',url:image.url}),ellipse:(x,y,r)=>calls.push({kind:'ellipse',x,y,r})},{get:(o,k)=>k in o?o[k]:()=>{}});
  const canvas={getContext:()=>ctx};const renderer=createSceneRenderer(canvas);await renderer.ready;
  for(const teamId of ['coral-club','navy-stars']){
   const g=new DeviceGame({teamId,homeTeamId:teamId});g.start();g.releasePitch();
   await renderer.prepareDefense(teamId,{runnerIds:[]});await renderer.prepareOpposing(g.batter.id,g.sceneState().catcherId);
   const s={...g.sceneState(),phase:'flight',elapsed:0};calls.length=0;renderer.drawPitching(s);
   const pose=nativePitcherPose(s)??defensivePitcherPose(s.pitcherId,s.pitcherHand,defensivePitcherFrame(s));
   const ball=calls.findIndex(c=>c.kind==='ellipse'&&Math.abs(c.r-13)<1e-8),pitcher=calls.findIndex(c=>c.kind==='image'&&c.url===SCENE_ASSETS[pose.asset]);
   assert.ok(ball>=0&&pitcher>ball,'Near pitcher must occlude the ball as it leaves an obscured throwing hand.');
  }
 }finally{globalThis.Image=previous;}
});

test('both defensive deliveries complete the windup before their unchanged pitch flight begins',()=>{
 for(const teamId of ['coral-club','navy-stars']){
  const g=new DeviceGame({teamId,homeTeamId:teamId});g.start();g.releasePitch();const duration=g.pitch.duration;let elapsed=0;
  while(g.phase==='windup'&&elapsed<2){g.step(.01);elapsed+=.01;}
  assert.equal(g.phase,'flight');assert.ok(Math.abs(elapsed-PITCH_WINDUP_SECONDS)<.02);assert.equal(g.elapsed,0);assert.equal(g.pitch.duration,duration);
 }
});
