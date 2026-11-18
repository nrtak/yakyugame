import test from 'node:test';import assert from 'node:assert/strict';
import {layoutFieldTargets,fieldTargetPosition} from './defense-controls.mjs';
import {GroundDefense} from './defense-play.mjs';
import {defensiveFieldCamera} from './scene-render.mjs';
import {liveBallPoint,liveFieldPose} from './live-field-art.mjs';
const overlaps=(a,b,gap=0)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;

test('compressed base markers retain separate phone-sized hit areas and suggested identity',()=>{
 for(const [width,height]of[[670,402],[650,390],[402,241.2],[320,192],[1600,960]]){
  const blocked=[{x:width*.03,y:height*.03,width:76,height:44},{x:width*.68,y:height*.02,width:width*.29,height:45}];
  const targets=['1B','2B','3B','HOME'].map((base,i)=>({base,x:width*.5+i,y:height*.55,recommended:base==='2B'}));
  const placed=layoutFieldTargets(targets,{width,height,blocked});assert.equal(placed.length,4,JSON.stringify({width,height}));
  assert.equal(placed.filter(p=>p.recommended)[0].base,'2B');
  for(const [i,a]of placed.entries()){
   assert.ok(a.width>=52&&a.height>=52);assert.ok(a.x>=8&&a.y>=10&&a.x+a.width<=width-8&&a.y+a.height<=height*.79+1e-8);
   assert.ok(!blocked.some(b=>overlaps(a,b,4)));for(const b of placed.slice(i+1))assert.equal(overlaps(a,b,6),false);
  }
 }
});

test('base choices stay distinct across real pulled-back infield and outfield cameras',()=>{
 for(const teamId of['coral-club','navy-stars'])for(const target of[{x:-40,y:115},{x:0,y:270},{x:125,y:220}]){
  const p=new GroundDefense({teamId,batterId:teamId==='coral-club'?'navy-stars-ryan':'coral-club-emma',target,runnerTime:18});p.step(p.collectAt+.01);
  const s={...p.state,controlRail:true,throwTargets:true},poses=new Map(s.players.map(p=>[p.id,liveFieldPose(s,p)]).filter(([,p])=>p)),camera=defensiveFieldCamera(s,liveBallPoint(s,poses));
  const targets=['1B','2B','3B','HOME'].map(base=>{const p=fieldTargetPosition(base,camera);return{base,x:p.x*670,y:p.y*402,recommended:s.recommendation===base};});
  const placed=layoutFieldTargets(targets,{width:670,height:402});assert.equal(placed.length,4);
  for(let i=0;i<placed.length;i++)for(const b of placed.slice(i+1))assert.equal(overlaps(placed[i],b,6),false);
 }
});

test('an impossible marker layout returns the accessible rail fallback instead of overlapping choices',()=>{
 const targets=['1B','2B','3B','HOME'].map(base=>({base,x:100,y:100}));
 assert.deepEqual(layoutFieldTargets(targets,{width:200,height:120,blocked:[{x:0,y:0,width:200,height:120}]}),[]);
});
