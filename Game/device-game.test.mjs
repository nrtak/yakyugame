import test from 'node:test';import assert from 'node:assert/strict';
import {DeviceGame} from './device-game.mjs';import {SWING_LEAD} from './engine.mjs';
import {swingFrame} from './scene-engine.mjs';import {usesFieldView} from './field-camera.mjs';
import {TEAMS,HOME_VENUES,venueName} from './rosters.mjs';
const reach=(g,phase)=>{for(let i=0;i<3000;i++){if(g.phase===phase)return;g.step(.01);}throw Error('Did not reach '+phase);};
test('the venue belongs to the home team regardless of the chosen player team',()=>{
 for(const team of TEAMS){const g=new DeviceGame({teamId:team.id});assert.equal(g.venue,'Navy Stadium');assert.equal(g.sceneState().venue,g.venue);g.start();g.match.half=1;assert.equal(g.venue,'Navy Stadium');}
 assert.equal(venueName(TEAMS[0]),'Coral Field');assert.equal(HOME_VENUES['sand-dunes'],'Sand Dunes Field');assert.ok(Object.values(HOME_VENUES).every(n=>/ (Stadium|Field|Park)$/.test(n)));
});
test('batting contact enters the same defensive controller and applies a completed play once',()=>{
 const g=new DeviceGame();g.start();reach(g,'flight');g.setAim(g.pitch.x,g.pitch.y);while(g.elapsed<g.pitch.duration-SWING_LEAD-.005)g.step(.005);assert.equal(g.swing(),true);assert.equal(g.swing(),false);reach(g,'field');assert.ok(g.defense);reach(g,'review');assert.equal(g.inning.events.length,1);assert.ok(['single','groundout','fielderschoice','flyout','homerun'].includes(g.event.kind));g.step(10);assert.equal(g.inning.events.length,1);
});
test('pause is idempotent and resume preserves pitch time and contact input',()=>{
 const g=new DeviceGame();g.start();reach(g,'flight');g.step(.1);const elapsed=g.elapsed;g.pause();g.pause();for(let i=0;i<100;i++)g.step(.05);assert.equal(g.elapsed,elapsed);assert.equal(g.swing(),false);g.resume();g.step(.02);assert.ok(g.elapsed>elapsed);
});
test('a complete one-inning device game changes roles and reaches real results',()=>{
 for(const teamId of ['coral-club','navy-stars']){const g=new DeviceGame({teamId});g.start();let seenBat=false,seenPitch=false,plays=0;
  for(let i=0;i<60000&&g.phase!=='final';i++){
   if(g.phase==='pitch-ready'){seenPitch=true;g.choosePitch(plays%2?'curve':'fast');g.setAim(0,0);g.releasePitch();}
   if(g.userBatting&&g.phase==='flight')seenBat=true;
   if(g.phase==='field'&&!g.userBatting&&g.defense.canThrow)g.throwTo(g.defense.recommendation);
   if(g.phase==='review'){plays++;g.next();}else g.step(.05);
  }
  assert.equal(g.phase,'final');assert.equal(g.match.over,true);assert.equal(g.match.inning,1);assert.ok(seenBat&&seenPitch);assert.ok(plays>=6);assert.ok(g.match.log.every(e=>e.inning===1));
 }
});
test('pitch choices and throwing inputs only act in the matching player role',()=>{
 const g=new DeviceGame({teamId:'navy-stars'});g.start();assert.equal(g.phase,'pitch-ready');assert.equal(g.choosePitch('curve'),true);assert.equal(g.choosePitch('invalid'),false);assert.equal(g.swing(),false);assert.equal(g.throwTo('1B'),false);g.releasePitch();assert.equal(g.pitch.kind,'curve');assert.equal(g.pitcher.throws,'R');
});
test('paused pitch selection and review controls cannot advance play underneath the pause screen',()=>{
 const g=new DeviceGame({teamId:'navy-stars'});g.start();g.pause();assert.equal(g.choosePitch('curve'),false);assert.equal(g.releasePitch(),false);g.resume();g.phase='review';g.pause();assert.equal(g.next(),false);assert.equal(g.phase,'review');
});
test('real names and handedness survive role changes without borrowing a different character identity',()=>{
 const g=new DeviceGame();assert.equal(g.sceneState().batterId,'coral-club-emma');assert.equal(g.sceneState().pitcherId,'navy-stars-ryan');for(let i=0;i<9;i++)g.inning.pitchResult({kind:'strike'});assert.equal(g.pitcher.id,'coral-club-emma');assert.equal(g.pitcher.throws,'L');assert.equal(g.sceneState().batterName,'Ryan');
});
test('out review retains the completed batter and camera until the player continues',()=>{
 const g=new DeviceGame();g.start();for(let out=0;out<3;out++){
  const batter=g.batter.id,pitcher=g.pitcher.id;for(let strike=0;strike<3;strike++){g.finishPitch({kind:'strike'});if(strike<2)g.next();}
  assert.equal(g.sceneState().batterId,batter);assert.equal(g.sceneState().pitcherId,pitcher);assert.equal(g.viewingBatting,true);
  if(out===2){assert.equal(g.userBatting,false);assert.equal(g.renderPitcher.throws,'R');}
  g.next();assert.equal(g.sceneState().batterId,g.batter.id);
 }assert.equal(g.viewingBatting,false);assert.equal(g.renderPitcher.throws,'L');
});
test('fair contact shows the follow-through before the field camera takes over',()=>{
 const g=new DeviceGame();g.start();reach(g,'flight');g.setAim(g.pitch.x,g.pitch.y);while(g.elapsed<g.pitch.duration-SWING_LEAD-.005)g.step(.005);g.swing();reach(g,'contact');assert.equal(swingFrame(g.sceneState()),2);g.step(.05);g.step(.05);g.step(.02);assert.equal(g.phase,'contact');assert.equal(swingFrame(g.sceneState()),3);g.step(.03);assert.equal(usesFieldView(g.sceneState()),false);reach(g,'field');
});

test('CPU fair contact holds the plate-arrival instant rather than jumping from an overshot pitch',()=>{
 const g=new DeviceGame({teamId:'navy-stars'});g.start();g.releasePitch();reach(g,'flight');
 assert.ok(['single','double','triple','homerun','groundout','flyout'].includes(g.cpu.kind));
 while(g.phase==='flight')g.step(.017);
 assert.equal(g.phase,'contact');assert.equal(g.elapsed,g.pitch.duration);const impact=g.sceneState();
 assert.ok(Math.abs(impact.elapsed-impact.swingAt-SWING_LEAD)<1e-8);assert.equal(g.inning.events.length,0);
 g.step(.05);assert.equal(g.elapsed,g.pitch.duration);assert.equal(g.phase,'contact');reach(g,'field');assert.ok(g.defense);
});
test('the device controller can run three regulation innings while the default stays one',()=>{
 assert.equal(new DeviceGame().match.innings,1);
 const g=new DeviceGame({innings:3});g.start();let priorOrder=0;
 for(let half=0;half<6;half++){
  assert.equal(g.match.inning,Math.floor(half/2)+1);assert.equal(g.match.half,half%2);
  for(let out=0;out<3;out++){for(let strike=0;strike<3;strike++){g.finishPitch({kind:'strike'});if(strike<2)g.next();}assert.equal(g.atBat.inning,Math.floor(half/2)+1);g.next();}
  if(half===1){priorOrder=g.match.order[0];assert.equal(priorOrder,3);assert.equal(g.batter.id,TEAMS[0].players[3].id);}
 }
 assert.equal(g.phase,'final');assert.equal(g.match.inning,3);assert.deepEqual(g.match.score,[0,0]);assert.deepEqual(g.match.order,[0,0]);assert.equal(g.match.log.length,54);for(const team of TEAMS)for(const player of team.players)assert.equal(g.match.stats[player.id].ab,1);
 g.reset();assert.equal(g.match.innings,3);assert.equal(g.match.inning,1);assert.deepEqual(g.match.order,[0,0]);
 for(const innings of [0,-1,1.5,10,NaN,Infinity])assert.throws(()=>new DeviceGame({innings}));
});
test('interruptions freeze an active defensive play and cannot duplicate a throw or result',()=>{
 const g=new DeviceGame({teamId:'navy-stars'});g.start();g.beginFair({quality:.6,launchAngle:0,direction:-.3});const seen=new Set();
 for(let n=0;n<2000&&g.phase==='field';n++){
  seen.add(g.defense.phase);
  if(n%7===0){g.pause();const before=structuredClone(g.defense);assert.equal(g.throwTo('1B'),false);g.step(1);assert.deepEqual(g.defense,before);g.resume();}
  if(g.defense.canThrow){assert.equal(g.throwTo(g.defense.recommendation),true);assert.equal(g.throwTo('1B'),false);}
  g.step(.01);
 }
 assert.equal(g.phase,'review');assert.equal(g.inning.events.length,1);g.step(10);assert.equal(g.inning.events.length,1);assert.ok(seen.has('transfer')&&seen.has('throw'));
});
test('1, 3, 7 and 9 innings preserve roles, lineups and home-field identity for either home team',()=>{
 for(const innings of [1,3,7,9])for(const homeTeamId of ['coral-club','navy-stars']){
  const g=new DeviceGame({innings,homeTeamId,teamId:homeTeamId});g.start();assert.equal(g.userBatting,false);assert.equal(g.pitcher.id,g.teams[1].players.find(p=>p.captain).id);assert.equal(g.venue,homeTeamId==='coral-club'?'Coral Field':'Navy Stadium');
  for(let half=0;half<innings*2;half++){
   assert.equal(g.userBatting,half%2===1);assert.equal(g.batter.id.startsWith(g.teams[half%2].id),true);
   for(let out=0;out<3;out++)for(let strike=0;strike<3;strike++){g.finishPitch({kind:'strike'});g.next();}
  }
  assert.equal(g.phase,'final');assert.equal(g.match.inning,innings);assert.equal(g.match.log.length,innings*18);assert.deepEqual(g.match.order,[(innings*3)%9,(innings*3)%9]);
  assert.ok(g.match.lineScore.every(line=>line.length===innings&&line.every(n=>n===0)));g.reset();assert.equal(g.match.teamIds[1],homeTeamId);assert.equal(g.match.innings,innings);
 }
});
