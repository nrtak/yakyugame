// Run the actual game controller against a small DOM/canvas adapter and a clock.
// This exercises user events and the ten-pitch lifecycle without real-time waits.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as rules from './engine.mjs';

function fixture() {
  const elements=new Map();
  class Element {
    constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.value='0';this.textContent='';this.listeners={};this.children=[];this.checked=true;this.tagName='BUTTON';}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    fire(type,extra={}){for(const fn of this.listeners[type]??[])fn({target:this,preventDefault(){},...extra});}
    click(){if(!this.disabled)this.fire('click');}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    setAttribute(name,value){this[name]=value;}
    focus(){}
    setPointerCapture(){}
    getBoundingClientRect(){return {width:1280,height:720,left:0,top:0};}
  }
  const markup=readFileSync(new URL('./practice.html',import.meta.url),'utf8');
  for(const match of markup.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){
    const el=new Element(match[1]);el.hidden=/\bhidden\b/.test(match[0]);el.disabled=/\bdisabled\b/.test(match[0]);elements.set(el.id,el);
  }
  elements.get('speed').value='standard';
  const draw=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  elements.get('field').getContext=()=>draw;
  const doc=new Element();doc.hidden=false;doc.getElementById=id=>elements.get(id);doc.createElement=()=>new Element();doc.createTextNode=text=>({textContent:text});
  let clock=0,raf;
  const scope=vm.createContext({...rules,document:doc,devicePixelRatio:1,performance:{now:()=>clock},requestAnimationFrame:fn=>raf=fn,console});
  const source=readFileSync(new URL('./game.mjs',import.meta.url),'utf8').replace(/^import .*?;\r?\n/,'');
  vm.runInContext(source,scope,{filename:'game.mjs'});
  const step=seconds=>{for(let i=0;i<Math.ceil(seconds*60);i++){clock+=1000/60;raf(clock);}};
  const el=id=>elements.get(id);
  return {el,step,doc,start(){el('start').click();},review(){step(5);assert.equal(el('result-panel').hidden,false);}};
}

test('full ten-pitch session, correct takes, summary and restart',()=>{
  const f=fixture();f.start();
  for(let i=0;i<10;i++){
    f.review();assert.equal(f.el('pitch-number').textContent,`${i+1} / 10`);
    assert.equal(f.el('result-kicker').textContent,`PITCH ${i+1} OF 10`);
    f.el('next').click();
  }
  assert.equal(f.el('result-kicker').textContent,'PRACTICE COMPLETE');
  assert.equal(f.el('score').textContent,150);
  assert.match(f.el('result-detail').textContent,/3 well-judged takes/);
  f.el('next').click();assert.equal(f.el('intro').hidden,false);assert.equal(f.el('score').textContent,0);
});
test('aim plus timed input produces a hit, and double input cannot score twice',()=>{
  const f=fixture(),p=rules.makeSession(41)[0];f.start();
  for(const axis of ['x','y']){f.el('aim-'+axis).value=p[axis]*100;f.el('aim-'+axis).fire('input');}
  f.step(.8); // Windup is 48 simulated display frames.
  f.step(Math.max(0,p.duration-rules.SWING_LEAD-1/60));
  f.el('swing').click();f.el('swing').click();f.review();
  assert.match(f.el('result-title').textContent,/contact/i);assert.equal(f.el('hits').textContent,1);
  assert.ok(Number(f.el('score').textContent)>=90);
});
test('pause and backgrounding preserve the pending pitch',()=>{
  const f=fixture();f.start();f.step(1);f.el('pause').click();f.step(20);
  assert.equal(f.el('paused-panel').hidden,false);assert.equal(f.el('result-panel').hidden,true);
  f.el('resume').click();f.doc.hidden=true;f.doc.fire('visibilitychange');f.step(20);
  assert.equal(f.el('paused-panel').hidden,false);assert.equal(f.el('score').textContent,0);
  f.doc.hidden=false;f.doc.fire('visibilitychange');f.el('resume').click();f.review();
  assert.equal(f.el('result-title').textContent,'Called strike');
});
test('left-side drag moves aim without snapping it beneath the thumb',()=>{
  const f=fixture(),field=f.el('field');
  field.fire('pointerdown',{pointerId:1,clientX:160,clientY:570});assert.equal(Number(f.el('aim-x').value),0);
  field.fire('pointermove',{clientX:205,clientY:535});
  assert.ok(Number(f.el('aim-x').value)>0);assert.ok(Number(f.el('aim-y').value)>0);
  field.fire('pointerup');
});
test('early swing gives timing advice and restart clears an active pitch',()=>{
  const f=fixture();f.start();f.step(.9);f.el('swing').click();f.review();
  assert.equal(f.el('result-title').textContent,'Swing and miss');assert.match(f.el('result-detail').textContent,/early/);
  f.el('next').click();f.step(1);f.el('restart').click();f.step(5);
  assert.equal(f.el('intro').hidden,false);assert.equal(f.el('score').textContent,0);assert.equal(f.el('pitch-number').textContent,'1 / 10');
});
