import test from 'node:test';import assert from 'node:assert/strict';
import {cpuBat,createMatch,makeMatchPitch} from './match-engine.mjs';
import {DeviceGame} from './device-game.mjs';
import {captureMatchCheckpoint,resumeMatchCheckpoint} from './match-save.mjs';
import {createProfileStore} from './player-profiles.mjs';
test('opponent difficulty is deterministic and changes only the chosen skill and pitch speed',()=>{
 const m=createMatch(),easy=makeMatchPitch(m,{difficulty:'relaxed'}),normal=makeMatchPitch(m),hard=makeMatchPitch(m,{difficulty:'challenging'});
 assert.ok(easy.duration>normal.duration&&normal.duration>hard.duration);assert.equal(easy.x,hard.x);assert.equal(easy.kind,hard.kind);assert.deepEqual(makeMatchPitch(m,{difficulty:'challenging'}),hard);assert.throws(()=>new DeviceGame({difficulty:'unknown'}));
 const totals={};for(const difficulty of ['relaxed','standard','challenging']){let misses=0,chases=0,quality=0;for(let seed=1;seed<=1000;seed++){const match=createMatch({seed:Math.imul(seed,2654435761)>>>0}),pitch={kind:'fast',inZone:true,x:0,y:0,releaseError:0};const hit=cpuBat(match,pitch,{difficulty});assert.deepEqual(cpuBat(match,pitch,{difficulty}),hit);misses+=hit.kind==='miss';quality+=hit.quality??0;chases+=cpuBat(match,{...pitch,inZone:false,x:1.4},{difficulty}).kind!=='ball';}totals[difficulty]={misses,chases,quality};}
 assert.ok(totals.relaxed.misses>totals.standard.misses&&totals.standard.misses>totals.challenging.misses);assert.ok(totals.relaxed.chases>totals.standard.chases&&totals.standard.chases>totals.challenging.chases);assert.ok(totals.challenging.quality>totals.standard.quality&&totals.standard.quality>totals.relaxed.quality);
});
test('difficulty persists with a profile and checkpoint; older saves keep standard skill',()=>{
 const data=new Map(),disk={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},profiles=createProfileStore(disk,()=> 'player');profiles.create('Alex');profiles.update({difficulty:'challenging'});assert.equal(createProfileStore(disk).current.preferences.difficulty,'challenging');profiles.update({difficulty:'bad'});assert.equal(profiles.current.preferences.difficulty,'standard');
 const game=new DeviceGame({difficulty:'relaxed'});game.start();const saved=captureMatchCheckpoint(game);assert.equal(resumeMatchCheckpoint(saved).difficulty,'relaxed');delete saved.settings.difficulty;assert.equal(resumeMatchCheckpoint(saved).difficulty,'standard');saved.settings.difficulty='bad';assert.throws(()=>resumeMatchCheckpoint(saved));
});
