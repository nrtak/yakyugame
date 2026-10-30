import test from 'node:test';import assert from 'node:assert/strict';import {gameControls} from './game-controls.mjs';
const state=changes=>({phase:'ready',userBatting:true,swingAt:null,paused:false,...changes});
test('only the action legal in the current play is enabled',()=>{assert.equal(gameControls(state()).actionEnabled,false);assert.equal(gameControls(state({phase:'flight'})).actionEnabled,true);assert.equal(gameControls(state({phase:'flight',swingAt:0})).actionEnabled,false);assert.equal(gameControls(state({phase:'pitch-ready',userBatting:false})).actionEnabled,true);assert.equal(gameControls(state({phase:'flight',userBatting:false})).actionEnabled,false);assert.equal(gameControls(state({phase:'pitch-ready',userBatting:false,paused:true})).actionEnabled,false);});
test('defensive targets explain force versus tag without accepting a throw before possession',()=>{const defense={canThrow:false,recommendation:'1B',throwOptions:[{base:'1B',force:true,out:true},{base:'2B',force:false,tagRequired:true}]};let c=gameControls(state({phase:'field',userBatting:false,defense}));assert.equal(c.actionVisible,false);assert.equal(c.aimVisible,false);assert.ok(c.bases.every(b=>!b.enabled));defense.canThrow=true;c=gameControls(state({phase:'field',userBatting:false,defense}));assert.equal(c.bases.find(b=>b.base==='1B').recommended,true);assert.equal(c.bases.find(b=>b.base==='2B').detail,'Tag needed');assert.match(c.bases.find(b=>b.base==='1B').ariaLabel,/1st base/);assert.equal(gameControls(state({phase:'field',userBatting:true,defense})).throwsVisible,false);});
test('menu, results and review hide action controls',()=>{for(const phase of ['menu','final','review']){const c=gameControls(state({phase}));assert.equal(c.actionVisible,false);assert.equal(c.aimVisible,false);assert.equal(c.actionEnabled,false);}});
test('instructions and aim availability follow the committed play',()=>{
 const pitching=gameControls(state({phase:'pitch-ready',userBatting:false}));assert.equal(pitching.aimEnabled,true);assert.equal(pitching.pitchesVisible,true);
 for(const phase of ['windup','flight']){const c=gameControls(state({phase,userBatting:false}));assert.equal(c.aimEnabled,false);assert.equal(c.pitchesVisible,false);assert.match(c.hint,/Pitch in progress/);}
 const waiting=gameControls(state({phase:'windup'}));assert.equal(waiting.aimEnabled,true);assert.equal(waiting.actionDetail,'GET READY');
 const swung=gameControls(state({phase:'flight',swingAt:0}));assert.equal(swung.aimEnabled,false);assert.equal(swung.actionDetail,'SWUNG');assert.match(swung.hint,/committed/);
 const fielding=gameControls(state({phase:'field',userBatting:false,defense:{canThrow:false}}));assert.ok(fielding.bases.every(b=>b.detail==='Wait for ball'));assert.equal(fielding.throwsVisible,false);
 assert.equal(gameControls(state({phase:'field',userBatting:false,defense:{canThrow:true}})).throwsVisible,true);
});

test('tag action waits for controlled possession and cannot be repeated while prepared or paused',()=>{
 const s=state({phase:'field',userBatting:false,defense:{canThrow:true,canTag:true}}),ready=gameControls(s);assert.equal(ready.tagVisible,true);assert.equal(ready.tagEnabled,true);
 assert.equal(gameControls({...s,paused:true}).tagEnabled,false);assert.equal(gameControls({...s,userBatting:true}).tagVisible,false);
 const prepared=gameControls({...s,defense:{canThrow:true,canTag:false,tagPending:true}});assert.equal(prepared.tagVisible,true);assert.equal(prepared.tagEnabled,false);assert.match(prepared.tagLabel,/READY/);
 assert.equal(gameControls({...s,phase:'review'}).tagVisible,false);
});
