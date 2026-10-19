import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderer} from './match-render.mjs';
import {createMatch} from './match-engine.mjs';
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
test('Maya uses the cast atlas and changes batting frame without moving her planted feet',()=>{
  const f=setup();f.renderer.draw(f.view);const ready=f.draws.at(-1);assert.match(ready[0].src,/cast-coral-v1/);
  assert.equal(ready[2],0);
  const readyFoot=ready[6]+ready[8]*.985;assert.ok(Math.abs(readyFoot-687)<.1);
  f.draws.length=0;f.view.phase='flight';f.view.pitch={duration:1.25,x:0,y:0,bend:0};f.view.swing={inputTime:0};f.view.elapsed=.15;
  f.renderer.draw(f.view);const follow=f.draws.at(-1);assert.match(follow[0].src,/cast-coral-v1/);assert.equal(follow[2],358);
  const followFoot=follow[6]+follow[8]*.985;assert.ok(Math.abs(followFoot-readyFoot)<.1);
});
test('missing images fall back safely instead of removing players from the field',()=>{
  const f=setup();f.images.forEach(i=>i.complete=false);f.renderer.draw(f.view);assert.equal(f.draws.length,0);
  f.images.forEach(i=>i.complete=true);f.view.match.order[0]=1;f.renderer.draw(f.view);assert.ok(f.draws.length>0);
});
test('every lineup member renders their own batting image and an actual follow-through',()=>{
  const f=setup();
  for(let team=0;team<2;team++)for(let index=0;index<9;index++){
    f.view.match=createMatch();f.view.match.half=team;f.view.match.order[team]=index;
    f.view.phase='windup';f.view.clock=0;f.view.swing=null;f.draws.length=0;f.renderer.draw(f.view);
    const ready=f.draws.find(d=>Math.abs(d[8]-186*(team?.74:1.68))<.01);
    assert.ok(ready,`${TEAMS[team].players[index].name} has a ready illustration`);assert.match(ready[0].src,/cast-/);
    f.view.phase='flight';f.view.pitch={duration:1.25,x:0,y:0,bend:0};f.view.elapsed=.15;
    f.view.swing={inputTime:0};f.view.cpuSwing=true;f.view.elapsed=1.2;f.draws.length=0;f.renderer.draw(f.view);
    const follow=f.draws.find(d=>Math.abs(d[8]-186*(team?.74:1.68))<.01);
    assert.ok(follow);assert.equal(follow[0],ready[0]);assert.equal(follow[1],ready[1]);assert.ok(follow[2]>ready[2]);
  }
});
test('both pitchers progress through set, windup, release and follow-through atlas frames',()=>{
  const f=setup();
  for(let half=0;half<2;half++){
    f.view.match=createMatch();f.view.match.half=half;const sourceX=[];
    for(const [phase,clock,elapsed]of [['ready',0,0],['windup',.4,0],['flight',0,.05],['flight',0,.4]]){
      Object.assign(f.view,{phase,clock,elapsed,pitch:{duration:1.25,x:0,y:0,bend:0}});f.draws.length=0;f.renderer.draw(f.view);
      const pitcher=f.draws.find(d=>d[0].src.includes('pitchers-v1'));assert.ok(pitcher);sourceX.push(pitcher[1]);
    }
    assert.equal(new Set(sourceX).size,4);
  }
});
