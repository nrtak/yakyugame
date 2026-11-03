import test from 'node:test';
import assert from 'node:assert/strict';
import {DeviceGame} from './device-game.mjs';
import {cpuBat,createMatch,applyOutcome,currentPitcher} from './match-engine.mjs';
import {SWING_LEAD} from './engine.mjs';
import {captureMatchCheckpoint,resumeMatchCheckpoint} from './match-save.mjs';
import {occupiedBases,baseDescription,lineScoreRows} from './scoreboard.mjs';

function advanceToReview(g){
 for(let i=0;i<4000&&g.phase!=='review';i++){
  if(g.phase==='field'&&!g.userBatting){if(g.defense.canTag)g.tagRunner();else if(g.defense.canThrow&&g.defense.recommendation)g.throwTo(g.defense.recommendation);}
  g.step(.005);
 }
 assert.equal(g.phase,'review','A released pitch must resolve');
}
test('real pitch selection survives fair contact, saves and changing sides without sharing pitcher memory',()=>{
 let g=new DeviceGame({teamId:'navy-stars',innings:3});g.start();
 for(const kind of ['curve','change','fast']){
  const pitcher=g.pitcher.id;assert.equal(g.choosePitch(kind),true);assert.equal(g.releasePitch(),true);advanceToReview(g);
  assert.equal(g.event.pitchKind,kind);assert.equal(g.event.pitcherId,pitcher);assert.equal(g.match.lastPitchByPitcher[pitcher],kind);
  g.next();
 }
 const saved=captureMatchCheckpoint(g);g=resumeMatchCheckpoint(JSON.parse(JSON.stringify(saved)));assert.deepEqual(g.match.lastPitchByPitcher,saved.match.lastPitchByPitcher);g.start();
 while(g.match.half===0){g.finishPitch({kind:'strike'});g.next();}
 assert.equal(g.match.lastPitchByPitcher['coral-club-emma'],undefined);
 const pitcher=g.pitcher.id,kind=g.pitch.kind;
 // A real judged swing enters flight/defense rather than injecting a hit result.
 g.setAim(g.pitch.x,g.pitch.y-.3);
 for(let i=0;i<4000&&g.phase!=='review';i++){if(g.phase==='flight'&&g.swingAt===null&&g.elapsed>=g.pitch.duration-SWING_LEAD)g.swing();g.step(.005);}
 assert.equal(g.contact.kind,'hit');assert.equal(g.event.pitchKind,kind);assert.equal(g.match.lastPitchByPitcher[pitcher],kind);
 assert.equal(g.match.lastPitchByPitcher['navy-stars-ryan'],'fast');
 const corrupt=structuredClone(saved);corrupt.match.lastPitchByPitcher['coral-club-mia']='fast';assert.throws(()=>resumeMatchCheckpoint(corrupt),/pitch history/);
 const legacy=structuredClone(saved);delete legacy.match.lastPitchByPitcher;assert.doesNotThrow(()=>resumeMatchCheckpoint(legacy));
});
test('CPU pitch recognition responds to its current pitcher only',()=>{
 let changed=0;
 for(let seed=1;seed<=500;seed++){
  const m=createMatch({seed}),pitch={kind:'fast',inZone:true,x:0,y:0,releaseError:0};
  const original=cpuBat(m,pitch),other=structuredClone(m);other.lastPitchByPitcher['coral-club-emma']='fast';assert.deepEqual(cpuBat(other,pitch),original);
  const repeated=structuredClone(m);repeated.lastPitchByPitcher[currentPitcher(m).id]='fast';if(JSON.stringify(cpuBat(repeated,pitch))!==JSON.stringify(original))changed++;
 }
 assert.ok(changed>25,'Repeated pitches must actually affect CPU decisions');
 const m=createMatch();assert.throws(()=>applyOutcome(m,{kind:'ball',pitchKind:'knuckle'}),/pitch type/);assert.equal(m.pitchNumber,0);
});
test('both clubs complete scoring games through judged swings, live defense, pause and save/resume',()=>{
 for(const teamId of ['coral-club','navy-stars'])for(const homeTeamId of ['coral-club','navy-stars']){
  let g=new DeviceGame({teamId,homeTeamId}),swings=0,resumed=false,paused=false,sawField=false;g.start();
  for(let n=0;n<50000&&g.phase!=='final';n++){
   if(g.phase==='pitch-ready'){g.setAim(0,0);g.choosePitch(['fast','curve','change'][g.match.pitchNumber%3]);g.releasePitch();}
   if(g.userBatting&&g.phase==='windup'&&swings<2)g.setAim(g.pitch.x,g.pitch.y+(swings===0?0:-.3));
   if(g.userBatting&&g.phase==='flight'&&g.swingAt===null&&swings<2&&Math.abs(g.pitch.y)<1&&Math.abs(g.pitch.x)<1.4&&g.elapsed>=g.pitch.duration-SWING_LEAD+(swings===0?-.07:0)){assert.equal(g.swing(),true);assert.equal(g.contact.kind,'hit');swings++;}
   if(g.phase==='field'){
    sawField=true;if(!paused){g.pause();const state=structuredClone(g.defense);g.step(1);assert.deepEqual(g.defense,state);g.resume();paused=true;}
    if(!g.userBatting){if(g.defense.canTag)g.tagRunner();else if(g.defense.canThrow&&g.defense.recommendation)g.throwTo(g.defense.recommendation);}
   }
   if(g.phase==='review'){
    for(let side=0;side<2;side++){assert.equal(g.match.score[side],g.match.lineScore[side].reduce((n,x)=>n+(x??0),0));assert.equal(g.match.score[side],g.teams[side].players.reduce((n,p)=>n+g.match.stats[p.id].r,0));}
    const snapshot=captureMatchCheckpoint(g);
    if(!resumed&&snapshot&&(g.match.score.some(n=>n>0)||g.match.bases.some(Boolean))){const before=structuredClone(g.match);g=resumeMatchCheckpoint(JSON.parse(JSON.stringify(snapshot)));assert.deepEqual(g.match,before);g.start();resumed=true;}else g.next();
   }else g.step(.005);
  }
  assert.equal(g.phase,'final',teamId+' as '+homeTeamId+' home');assert.ok(g.match.score.some(n=>n>0),JSON.stringify({teamId,homeTeamId,plays:g.match.log.map(e=>[e.batterName,e.kind])}));assert.ok(sawField&&paused&&resumed);assert.equal(swings,2);
  assert.equal(g.match.pitchNumber,g.match.log.length);assert.equal(g.match.log.filter(e=>e.batter===g.teams[g.teams.findIndex(t=>t.id===teamId)].players[0].id&&e.atBatEnded).length,1);
  for(const e of g.match.log){assert.ok(e.pitchKind);assert.ok(e.pitcherId);}
 }
});
test('base indicators use actual runner identities and inning scores preserve unplayed halves',()=>{
 let m=createMatch({innings:1});m=applyOutcome(m,{kind:'single'}).match;
 assert.deepEqual(occupiedBases(m).filter(b=>b.id).map(b=>[b.base,b.name]),[[1,'Emma']]);assert.equal(baseDescription(m),'Emma on first');assert.match(baseDescription(m,{inPlay:true}),/^At the start of this play:/);
 for(let n=0;n<9;n++)m=applyOutcome(m,{kind:'strike'}).match;
 m=applyOutcome(m,{kind:'homerun'}).match;assert.equal(m.over,true);assert.equal(m.log.at(-1).walkOff,true);
 assert.deepEqual(lineScoreRows(m).map(r=>r.innings),[[0],[1]]);
 let skipped=createMatch({innings:3});skipped.inning=3;skipped.score=[0,1];skipped.lineScore=[[0,0,null],[1,0,null]];skipped.outs=2;skipped.strikes=2;skipped=applyOutcome(skipped,{kind:'strike'}).match;
 assert.equal(skipped.over,true);assert.equal(lineScoreRows(skipped)[1].innings[2],null);
});
