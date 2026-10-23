import test from 'node:test';import assert from 'node:assert/strict';
import {DeviceGame} from './device-game.mjs';import {captureMatchCheckpoint,resumeMatchCheckpoint,createMatchSaveStore,MATCH_SAVE_KEY} from './match-save.mjs';
const disk=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('saved counts, runners, lineups and venue survive relaunch without replaying an outcome',()=>{
 const g=new DeviceGame({innings:3,homeTeamId:'coral-club',teamId:'navy-stars'});g.start();g.finishPitch({kind:'single'});g.next();g.finishPitch({kind:'ball'});g.next();const before=structuredClone(g.match);g.step(.03);g.phase='field';const r=resumeMatchCheckpoint(JSON.parse(JSON.stringify(captureMatchCheckpoint(g))));assert.deepEqual(r.match,before);assert.equal(r.phase,'menu');r.start();assert.equal(r.match.balls,1);assert.equal(r.match.bases[0],before.bases[0]);assert.equal(r.match.pitchNumber,2);assert.equal(r.batter.id,g.batter.id);assert.equal(r.homeTeamId,'coral-club');assert.equal(r.phase,'windup');
});
test('each saved player owns their game, guest is session only, completed saves clear by exact run',()=>{
 const d=disk(),s=createMatchSaveStore(d),g=new DeviceGame();g.start();s.save('A',{runId:'a',series:true,game:g});s.save('B',{runId:'b',game:g});s.save(null,{runId:'guest',game:g});const reopen=createMatchSaveStore(d);assert.equal(reopen.read('A').series,true);assert.equal(reopen.read('B').runId,'b');assert.equal(reopen.read(null),null);assert.equal(reopen.clear('A','wrong'),false);assert.equal(reopen.clear('A','a'),true);assert.equal(reopen.read('B').runId,'b');assert.equal(createMatchSaveStore(d).read('A'),null);
});
test('bad or future save data is preserved and never installed as live rules state',()=>{
 const g=new DeviceGame();g.start();const snap=captureMatchCheckpoint(g);for(const mutate of [s=>s.version=2,s=>s.match.bases=['navy-stars-ryan',null,null],s=>s.match.outs=3,s=>s.match.score[0]=99,s=>s.settings.teamId='bad',s=>s.match.order[0]=9]){const s=structuredClone(snap);mutate(s);assert.throws(()=>resumeMatchCheckpoint(s));}
 const d=disk();d.setItem(MATCH_SAVE_KEY,'{"version":2}');const s=createMatchSaveStore(d);s.save('A',{runId:'a',game:g});assert.equal(d.getItem(MATCH_SAVE_KEY),'{"version":2}');assert.match(s.notice,/session/);assert.ok(s.read('A'));assert.equal(captureMatchCheckpoint(new DeviceGame()),null);
});

test('corrupt statistics and future inning runs are rejected even when line totals agree',()=>{
 const g=new DeviceGame({innings:3});g.start();g.finishPitch({kind:'single'});g.next();const snap=captureMatchCheckpoint(g);
 for(const change of [s=>s.match.hits[0]++,s=>s.match.stats[g.teams[0].players[0].id].r++,s=>s.match.lineScore[0][2]=0,s=>s.match.stats[g.teams[0].players[0].id].ab=0]){const edited=structuredClone(snap);change(edited);assert.throws(()=>resumeMatchCheckpoint(edited));}
});
test('profile IDs with object property names remain isolated across reopening',()=>{
 const d=disk(),s=createMatchSaveStore(d),g=new DeviceGame();g.start();s.save('__proto__',{runId:'special',game:g});s.save('ordinary',{runId:'regular',game:g});const reopen=createMatchSaveStore(d);assert.equal(reopen.read('__proto__').runId,'special');assert.equal(reopen.read('ordinary').runId,'regular');assert.equal(reopen.read('constructor'),null);
});
