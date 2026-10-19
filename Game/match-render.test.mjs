import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderer} from './match-render.mjs';
import {createMatch} from './match-engine.mjs';

function setup(){
  const images=[],draws=[];
  const previous=globalThis.Image;
  globalThis.Image=class {constructor(){this.complete=true;this.naturalWidth=1024;this.naturalHeight=1536;images.push(this);}};
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),drawImage:(...args)=>draws.push(args)}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const canvas={width:0,height:0,getContext:()=>context,getBoundingClientRect:()=>({width:844,height:278,left:0,top:0})};
  const renderer=createRenderer(canvas);globalThis.Image=previous;
  const view={match:createMatch(),phase:'windup',clock:0,elapsed:0,pitch:null,swing:null,aim:{x:0,y:0},guide:true};
  return {renderer,view,draws,images};
}
test('Maya uses the ready illustration and swaps to follow-through with the actual swing pose',()=>{
  const f=setup();f.renderer.draw(f.view);assert.equal(f.draws.length,1);assert.match(f.draws[0][0].src,/maya-ready-v1/);
  const readyFoot=f.draws[0][2]+f.draws[0][4]*.985;assert.ok(Math.abs(readyFoot-687)<.1);
  f.draws.length=0;f.view.phase='flight';f.view.pitch={duration:1.25,x:0,y:0,bend:0};f.view.swing={inputTime:0};f.view.elapsed=.15;
  f.renderer.draw(f.view);assert.match(f.draws[0][0].src,/maya-follow-v1/);
  const followFoot=f.draws[0][2]+f.draws[0][4]*.975;assert.ok(Math.abs(followFoot-readyFoot)<.1);
});
test('missing illustrations fall back safely and other characters keep their own identities',()=>{
  const f=setup();f.images.forEach(i=>i.complete=false);f.renderer.draw(f.view);assert.equal(f.draws.length,0);
  f.images.forEach(i=>i.complete=true);f.view.match.order[0]=1;f.renderer.draw(f.view);assert.equal(f.draws.length,0);
});
