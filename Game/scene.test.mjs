import test from 'node:test';import assert from 'node:assert/strict';
import {PITCHER_POSES,PITCHER_SCALE,PITCH_RELEASE_FRAME,PITCH_RELEASE_HAND,pitcherPoint,BAT_CONTACT_POINT,SCENE_ASSETS,BATTER_POSES,batterPoint} from './scene-render.mjs';
import {BattingScene,swingFrame,pitcherFrame} from './scene-engine.mjs';import {SWING_LEAD} from './engine.mjs';import {pitchPosition,SCENE_GEOMETRY} from './scene-render.mjs';
import {characterBatterPose,BATTER_CAST} from './scene-render.mjs';
import {createArtLoader} from './scene-render.mjs';
import {allPlayers} from './rosters.mjs';
import {PRACTICE_CAPTAINS} from './batting-practice.mjs';
const until=(s,predicate,limit=120)=>{for(let i=0;i<limit*240;i++){if(predicate())return;s.step(1/240);}throw Error('Scene failed to progress');};
test('ten-pitch scene completes, including takes and replay reset',()=>{const s=new BattingScene();s.start();until(s,()=>s.phase==='summary');assert.equal(s.results.length,10);assert.equal(s.summary.goodTakes,3);assert.equal(s.outs,2);s.reset();assert.equal(s.phase,'intro');assert.equal(s.results.length,0);});
test('timed swings make contact once per pitch with visible contact frame at scoring',()=>{const s=new BattingScene();s.start();for(let n=0;n<10;n++){until(s,()=>s.phase==='flight');s.setAim(s.pitch.x,s.pitch.y);until(s,()=>s.elapsed>=s.pitch.duration-SWING_LEAD-.001);assert.equal(s.swing(),true);assert.equal(s.swing(),false);until(s,()=>s.phase==='hit');assert.equal(swingFrame(s),2);assert.equal(s.results.length,n+1);assert.equal(s.result.kind,'hit');if(n<9)until(s,()=>s.phase==='ready');}until(s,()=>s.phase==='summary');assert.equal(s.summary.fairHits,10);});
test('pause freezes a pitch and cannot accept a swing',()=>{const s=new BattingScene();s.start();until(s,()=>s.phase==='flight');s.paused=true;const at=s.elapsed;s.step(10);assert.equal(s.elapsed,at);assert.equal(s.swing(),false);s.paused=false;s.step(.03);assert.ok(s.elapsed>at);});
test('fouls cannot add a third strike and counts reset after third strike or fourth ball',()=>{const s=new BattingScene();s.strikes=2;s.finish({kind:'foul'});assert.equal(s.strikes,2);assert.equal(s.outs,0);s.finish({kind:'miss'});assert.equal(s.strikes,0);assert.equal(s.outs,1);s.balls=3;s.strikes=1;s.finish({kind:'ball'});assert.equal(s.balls,0);assert.equal(s.strikes,0);});
test('pitch paths start at the authored right-hand release and reach the pitch location continuously',()=>{const s=new BattingScene(),z=SCENE_GEOMETRY.zone;for(const p of s.pitches){const a=pitchPosition(p,0),b=pitchPosition(p,p.duration);assert.equal(a.x,SCENE_GEOMETRY.release.x);assert.equal(a.y,SCENE_GEOMETRY.release.y);assert.ok(Math.abs(b.x-z.x-p.x*z.rx)<1e-6);assert.ok(Math.abs(b.y-z.y+p.y*z.ry)<1e-6);let prior=a;for(let t=.01;t<=p.duration;t+=.01){const next=pitchPosition(p,t);assert.ok(Math.hypot(next.x-prior.x,next.y-prior.y)<10);prior=next;}}});
test('pitch recovery chooses the two-feet-down frame and input cannot swing before release',()=>{const s=new BattingScene();s.start();assert.equal(s.swing(),false);until(s,()=>s.phase==='windup');assert.equal(s.swing(),false);until(s,()=>s.phase==='flight');assert.equal(pitcherFrame(s),3);s.elapsed=.5;assert.equal(pitcherFrame(s),4);});
test('release follows the registered right-hand landmark and neutral contact meets the barrel',()=>{assert.deepEqual(SCENE_GEOMETRY.release,pitcherPoint(PITCH_RELEASE_FRAME,PITCH_RELEASE_HAND));const p={duration:1.25,x:0,y:0,bend:0};const end=pitchPosition(p,p.duration);assert.ok(Math.hypot(end.x-BAT_CONTACT_POINT.x,end.y-BAT_CONTACT_POINT.y)<.01);const [x,y,w,h]=PITCHER_POSES[PITCH_RELEASE_FRAME].rect;assert.ok(PITCH_RELEASE_HAND[0]>=x&&PITCH_RELEASE_HAND[0]<x+w&&PITCH_RELEASE_HAND[1]>=y&&PITCH_RELEASE_HAND[1]<y+h);});
test('current pitcher poses use whole drawings and positive, unmirrored scale',()=>{assert.equal(PITCHER_POSES.length,5);assert.ok(!Object.values(SCENE_ASSETS).some(p=>p.includes('scene-ryan-pitch-v2')));assert.ok(PITCHER_SCALE>0);for(const p of PITCHER_POSES){assert.ok(SCENE_ASSETS[p.asset]);const [x,y,w,h]=p.rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=p.sourceWidth&&y+h<=1536);assert.ok(p.anchor[0]>=x&&p.anchor[0]<=x+w&&p.anchor[1]>=y&&p.anchor[1]<=y+h);}});
test('new batter frames retain the planted foot and unchanged hitting target',()=>{for(const [frame,p]of BATTER_POSES.entries()){assert.deepEqual(batterPoint(frame,p.anchor),{x:580,y:843});assert.ok(p.scale>0);const [x,y,w,h]=p.rect;assert.ok(x>=0&&y>=0&&x+w<=p.sourceWidth&&y+h<=(p.asset==='batterReady'?1536:887));}assert.ok(Math.abs(BAT_CONTACT_POINT.x-900)<.001);assert.ok(Math.abs(BAT_CONTACT_POINT.y-523)<.001);});


test('pitching advances through set, lift, landing, release and recovery in order',()=>{const s=new BattingScene();s.start();const seen=[];while(s.phase!=='result'){const f=pitcherFrame(s);if(seen.at(-1)!==f)seen.push(f);s.step(1/240);}assert.deepEqual(seen,[0,1,2,3,4]);});
test('pivot stays at rubber during gather and left landing stays planted through recovery',()=>{for(const i of [0,1]){assert.equal(PITCHER_POSES[i].support,'R');assert.deepEqual(pitcherPoint(i,PITCHER_POSES[i].anchor),{x:957,y:546});}for(const i of [2,3,4]){assert.equal(PITCHER_POSES[i].support,'L');assert.deepEqual(pitcherPoint(i,PITCHER_POSES[i].anchor),{x:988,y:590});}const rear=pitcherPoint(2,[438,1174]);assert.ok(Math.hypot(rear.x-957,rear.y-546)<4);});
test('both full batting lineups retain their exact identity and roster hand in every frame',()=>{assert.equal(Object.keys(BATTER_CAST).length,allPlayers().length+PRACTICE_CAPTAINS.length);for(const player of allPlayers()){const ready=characterBatterPose(player.id,player.bats,0);assert.ok(ready);for(let frame=0;frame<4;frame++){const p=characterBatterPose(player.id,player.bats,frame);assert.ok(SCENE_ASSETS[p.asset]);assert.deepEqual(p.world,ready.world);assert.ok(p.scale>0);assert.ok(SCENE_ASSETS[p.asset].includes(player.id.split('-').at(-1)));}assert.equal(characterBatterPose(player.id,player.bats==='R'?'L':'R',0),null);}});
test('missing identities and opposite batting hands remain explicit gaps, never mirrored substitutes',()=>{assert.equal(characterBatterPose('unknown-player','R',0),null);assert.equal(characterBatterPose('coral-club-mia','L',0),null);assert.equal(characterBatterPose('coral-club-ken','R',4),null);});

test('character loading shares pending requests and releases unneeded image references',async()=>{
 const images=[],loader=createArtLoader({ready:'ready.png',motion:'motion.png'},()=>{const img={};images.push(img);return img;});
 const first=loader.load(['ready','ready']),second=loader.load(['ready','motion']);assert.equal(images.length,2);
 images[1].onload();images[0].onload();await Promise.all([first,second]);assert.equal(loader.art.ready,images[0]);
 await loader.load(['ready']);assert.equal(images.length,2);loader.retain(['motion']);assert.equal(loader.art.ready,undefined);assert.equal(loader.art.motion,images[1]);
});
test('failed character images can retry and unknown artwork is rejected',async()=>{
 const images=[],loader=createArtLoader({ready:'ready.png'},()=>{const img={};images.push(img);return img;});
 const first=loader.load(['ready']);images[0].onerror();await assert.rejects(first,/Unable to load ready/);assert.equal(loader.art.ready,undefined);
 const retry=loader.load(['ready']);assert.equal(images.length,2);images[1].onload();await retry;assert.equal(loader.art.ready,images[1]);
 await assert.rejects(loader.load(['missing']),/Unknown artwork/);
});
test('artwork memory measurements follow retained images rather than the whole roster',async()=>{
 const images=[],loader=createArtLoader({a:'a.png',b:'b.png'},()=>{const img={naturalWidth:100,naturalHeight:200};images.push(img);return img;});const pending=loader.load(['a','b']);assert.equal(loader.metrics.pending,2);images.forEach(i=>i.onload());await pending;assert.equal(loader.metrics.decodedBytes,160000);assert.equal(loader.metrics.peakDecodedBytes,160000);loader.retain(['b']);assert.equal(loader.metrics.decodedBytes,80000);assert.deepEqual(loader.metrics.loadedKeys,['b']);assert.equal(loader.metrics.loads,2);assert.equal(loader.metrics.failures,0);
});

test('an obsolete image finishing late cannot repopulate the retained image bank',async()=>{
 const images=[],bank=createArtLoader({old:'old.png',current:'current.png'},()=>{const img={naturalWidth:100,naturalHeight:200};images.push(img);return img;});
 const old=bank.load(['old']),current=bank.load(['current']);bank.retain(['current']);images[1].onload();images[0].onload();await Promise.all([old,current]);assert.deepEqual(bank.metrics.loadedKeys,['current']);assert.equal(bank.metrics.decodedBytes,80000);
 const retry=bank.load(['old']);assert.equal(images.length,3);images[2].onload();await retry;assert.equal(bank.art.old,images[2]);
});
