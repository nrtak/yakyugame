import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as rules from './engine.mjs';
import * as baseball from './match-engine.mjs';

function fixture(){
  class El{
    constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.value='0';this.checked=false;this.textContent='';this.children=[];this.listeners={};this.style={};this.dataset={};this.tagName='BUTTON';}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    fire(type,extra={}){for(const fn of this.listeners[type]??[])fn({target:this,detail:0,preventDefault(){},...extra});}
    click(){if(!this.disabled)this.fire('click');}
    append(...x){this.children.push(...x);}
    replaceChildren(...x){this.children=x;}
    setAttribute(k,v){this[k]=v;}
    focus(){}
    setPointerCapture(){}
  }
  const elements=new Map(),markup=readFileSync(new URL('./match.html',import.meta.url),'utf8');
  for(const m of markup.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){const el=new El(m[1]);el.hidden=/\bhidden\b/.test(m[0]);el.disabled=/\bdisabled\b/.test(m[0]);el.checked=/\bchecked\b/.test(m[0]);elements.set(el.id,el);}
  elements.get('speed').value='standard';
  const pitches=['fast','curve','change'].map(kind=>{const b=new El();b.dataset.pitch=kind;return b;});
  const document=new El();document.getElementById=id=>elements.get(id);document.querySelectorAll=()=>pitches;document.createElement=()=>new El();
  let time=0,raf;
  const scope=vm.createContext({...rules,...baseball,document,window:{},performance:{now:()=>time},requestAnimationFrame:fn=>raf=fn,
    createRenderer:()=>({draw(){},point:e=>({x:e.clientX,y:e.clientY,z:{x:725,y:430,sx:77,sy:95}})})});
  const source=readFileSync(new URL('./match-ui.mjs',import.meta.url),'utf8').replace(/^import .*?;\r?\n/gm,'');vm.runInContext(source,scope);
  const step=seconds=>{for(let i=0;i<Math.ceil(seconds*60);i++){time+=1000/60;raf(time);}};
  const el=id=>elements.get(id);
  const until=(predicate,limit=15)=>{for(let i=0;i<limit*60;i++){if(predicate())return;step(1/60);}throw new Error('Controller did not reach expected visible state');};
  return {el,step,until,document,pitches};
}
test('actual UI controller completes a full match through both player roles and all inning breaks',()=>{
  const f=fixture();f.el('start').click();let pitches=0,breaks=0;
  while(f.el('final-panel').hidden&&pitches<500){
    if(!f.el('break-panel').hidden){breaks++;f.el('continue').click();}
    if(f.el('action-word').textContent==='PITCH'&&!f.el('action').disabled){
      f.el('action').click();assert.equal(f.el('action-word').textContent,'RELEASE');f.step(.4);f.el('action').click();
    }
    f.until(()=>!f.el('next').disabled||!f.el('break-panel').hidden||!f.el('final-panel').hidden);
    pitches++;if(!f.el('next').disabled)f.el('next').click();
  }
  assert.equal(f.el('final-panel').hidden,false);assert.ok(pitches>=27);assert.ok(breaks>=4);assert.equal(f.el('inning').textContent,'FINAL');assert.equal(f.el('away-score').textContent,0);
  assert.ok(f.el('line-score').children[0].children.length===3);
  f.el('boxscore-open').click();assert.equal(f.el('roster-title').textContent,'Game box score');f.el('roster-close').click();assert.equal(f.el('final-panel').hidden,false);
  f.el('rematch').click();assert.equal(f.el('intro-panel').hidden,false);assert.equal(f.el('away-score').textContent,0);
});
test('timed player contact advances the batter after the field animation',()=>{
  const f=fixture(),p=baseball.makeMatchPitch(baseball.createMatch());f.el('start').click();
  for(const axis of ['x','y']){f.el('aim-'+axis).value=p[axis]*100;f.el('aim-'+axis).fire('input');}
  f.until(()=>!f.el('action').disabled);f.step(p.duration-rules.SWING_LEAD-1/60);f.el('action').click();
  f.until(()=>!f.el('next').disabled);assert.equal(f.el('next').textContent,'Next batter →');
  assert.equal(f.el('strikes').textContent,0);assert.match(f.el('batter-name').textContent,/Ren/);
});
test('roster opened while paused does not lose the saved live-game state',()=>{
  const f=fixture();f.el('start').click();f.step(.9);f.el('pause').click();
  f.el('roster-open').click();assert.equal(f.el('roster-panel').hidden,false);f.el('roster-close').click();
  assert.equal(f.el('pause-panel').hidden,false);f.step(20);assert.equal(f.el('next').disabled,true);
  f.el('resume').click();f.until(()=>!f.el('next').disabled);assert.equal(f.el('modal-layer').hidden,true);
});
test('opening teams during live play and backgrounding both freeze the pitch',()=>{
  const f=fixture();f.el('start').click();f.step(.9);f.el('roster-open').click();f.step(20);assert.equal(f.el('next').disabled,true);f.el('roster-close').click();
  f.document.hidden=true;f.document.fire('visibilitychange');f.step(20);assert.equal(f.el('pause-panel').hidden,false);
  f.document.hidden=false;f.document.fire('visibilitychange');f.el('resume').click();f.until(()=>!f.el('next').disabled);
});
test('one pointer tap cannot both start and release the pitch meter',()=>{
  const f=fixture();f.el('start').click();
  while(f.el('break-panel').hidden){f.until(()=>!f.el('next').disabled||!f.el('break-panel').hidden);if(!f.el('next').disabled)f.el('next').click();}
  f.el('continue').click();assert.equal(f.el('action-word').textContent,'PITCH');
  f.el('action').fire('pointerdown');f.el('action').fire('click',{detail:1});assert.equal(f.el('action-word').textContent,'RELEASE');assert.equal(f.el('release-wrap').hidden,false);
  f.pitches[1].click();assert.equal(f.pitches[1]['aria-pressed'],'true');
  f.step(.4);f.el('action').fire('pointerdown');f.el('action').fire('click',{detail:1});assert.equal(f.el('release-wrap').hidden,true);f.until(()=>!f.el('next').disabled||!f.el('break-panel').hidden);
});
test('watch-demo mode plays both teams automatically to a final score',()=>{
  const f=fixture();f.el('watch-demo').click();
  f.until(()=>!f.el('final-panel').hidden,1800);
  assert.equal(f.el('inning').textContent,'FINAL');assert.equal(f.el('action').disabled,true);
  assert.ok(Number(f.el('away-score').textContent)+Number(f.el('home-score').textContent)>=0);
});
