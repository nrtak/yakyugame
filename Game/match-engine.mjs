import { seededRandom, SPEEDS } from './engine.mjs';
import { TEAMS, allPlayers, playerById } from './rosters.mjs';
import {PITCH_TYPES,pitcherRepertoire,pitchMovement} from './pitch-types.mjs';

export function createMatch({innings=3,seed=211,homeTeamId='navy-stars'}={}) {
  if(!Number.isInteger(innings)||innings<1||innings>9)throw Error('Choose 1–9 regulation innings');
  if(!TEAMS.some(t=>t.id===homeTeamId))throw Error('Unknown home team');
  const teamIds=[TEAMS.find(t=>t.id!==homeTeamId).id,homeTeamId];
  return {innings,seed,teamIds,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],
    lineScore:[Array(innings).fill(null),Array(innings).fill(null)],order:[0,0],pitchNumber:0,over:false,winner:null,
    lastPitch:null,log:[],stats:Object.fromEntries(allPlayers().map(p=>[p.id,{ab:0,h:0,r:0,rbi:0,bb:0,k:0}]))};
}
export const matchTeams = m => m.teamIds?m.teamIds.map(id=>TEAMS.find(t=>t.id===id)):TEAMS;
export const battingTeam = m => TEAMS.indexOf(matchTeams(m)[m.half]);
export const fieldingTeam = m => TEAMS.indexOf(matchTeams(m)[1-m.half]);
export const currentBatter = m => TEAMS[battingTeam(m)].players[m.order[m.half]%9];
export const currentPitcher = m => TEAMS[fieldingTeam(m)].players.find(p=>p.position==='P');
export const GROUND_PLAY={arrival:1.05,transfer:.12,flight:.58,runner:1.95,contactHold:.1,maxDelay:.75};
export function throwAtFirst(outcome,delay=0){
  if(outcome.kind!=='groundout')return {...outcome};
  const receive=GROUND_PLAY.arrival+GROUND_PLAY.transfer+GROUND_PLAY.flight+Math.max(0,delay);
  return receive>=GROUND_PLAY.runner-1e-8?
    {...outcome,kind:'single',detail:'Late throw. The batter beats the ball to first; other runners advance one base.'}:
    {...outcome,detail:'The throw reaches first before the runner. Other runners hold.'};
}
export const halfLabel = m => `${m.half===0?'Top':'Bottom'} ${m.inning}`;

function addRun(m,runner,event){
  // On a non-HR walk-off, scoring stops when the winning runner crosses home.
  if(event.kind!=='homerun'&&m.inning===m.innings&&m.half===1&&m.score[1]>m.score[0])return;
  m.score[m.half]++;m.lineScore[m.half][m.inning-1]++;m.stats[runner].r++;event.runs++;
}
function advanceOnHit(m,batter,bases,event){
  const next=[null,null,null];
  for(let i=2;i>=0;i--)if(m.bases[i]){
    if(i+bases>=3)addRun(m,m.bases[i],event);else next[i+bases]=m.bases[i];
  }
  if(bases===4)addRun(m,batter.id,event);else next[bases-1]=batter.id;
  m.bases=next;
}
function advanceOnWalk(m,batter,event){
  if(m.bases[0]){
    if(m.bases[1]){if(m.bases[2])addRun(m,m.bases[2],event);m.bases[2]=m.bases[1];}
    m.bases[1]=m.bases[0];
  }
  m.bases[0]=batter.id;
}
function finish(m){m.over=true;m.winner=m.score[0]===m.score[1]?null:m.score[0]>m.score[1]?0:1;}
function switchHalf(m,event){
  event.halfEnded=true;event.completedHalf=halfLabel(m);
  m.outs=0;m.balls=0;m.strikes=0;m.bases=[null,null,null];
  if(m.half===0){
    if(m.inning===m.innings&&m.score[1]>m.score[0]){finish(m);return;}
    m.half=1;
  }else if(m.inning===m.innings){finish(m);return;}else{m.inning++;m.half=0;}
}

// A completed assisted ground play carries runner identities, not just an
// animation's generic "out" label. Recheck forces and destinations at the rules boundary.
function applyDefense(m,outcome,event,batter,stats){
  const c=outcome.context;
  if(!c||c.teamId!==TEAMS[fieldingTeam(m)].id||c.batterId!==batter.id||c.outs!==m.outs||JSON.stringify(c.bases)!==JSON.stringify(m.bases))throw Error('Stale defensive play context');
  const forces={'1B':batter.id};let chain=true;
  for(let i=0;i<3;i++){chain=chain&&Boolean(m.bases[i]);if(chain)forces[['2B','3B','HOME'][i]]=m.bases[i];}
  const retired=outcome.retired;
  if(!Array.isArray(retired)||retired.length>3-m.outs)throw Error('Too many defensive outs');
  const checked=new Set();
  for(const r of retired){
    const from=m.bases.indexOf(r.id),behind=r.id===batter.id?[]:[batter.id,...m.bases.slice(0,from).filter(Boolean)];
    if(!r.force||forces[r.base]!==r.id||checked.has(r.id)||behind.some(id=>checked.has(id)))throw Error('Invalid or removed force');checked.add(r.id);
  }
  const retiredIds=new Set(retired.map(r=>r.id)),thirdForce=m.outs+retired.length===3;
  const movements=[{id:batter.id,base:1},...m.bases.map((id,i)=>id?{id,base:forces[['2B','3B','HOME'][i]]===id?i+2:i+1}:null).filter(Boolean)].filter(r=>!retiredIds.has(r.id));
  const destinations=movements.filter(r=>r.base<4),runs=thirdForce?[]:movements.filter(r=>r.base===4).map(r=>r.id);
  const same=(a,b)=>JSON.stringify(a.slice().sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y))))===JSON.stringify(b.slice().sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y))));
  if(!Array.isArray(outcome.destinations)||!Array.isArray(outcome.runs)||!same(outcome.destinations,destinations)||!same(outcome.runs,runs))throw Error('Invalid defensive runner destinations');
  const kind=retired.length?(retiredIds.has(batter.id)?'groundout':'fielderschoice'):'single';
  if(outcome.recordAs!==kind)throw Error('Defensive scoring does not match the play');
  m.bases=[null,null,null];for(const r of destinations)m.bases[r.base-1]=r.id;
  m.outs+=retired.length;stats.ab++;if(kind==='single'){stats.h++;m.hits[m.half]++;}
  event.kind=kind;event.atBatEnded=true;event.retired=structuredClone(retired);
  for(const id of runs)addRun(m,id,event);
  event.title=kind==='groundout'?`${batter.name} grounds out`:kind==='fielderschoice'?`${batter.name} reaches on a fielder's choice`:`${batter.name} reaches safely`;
  if(retired.length>=2){event.playType=retired.length===3?'tripleplay':'doubleplay';event.title=retired.length===3?'Triple play!':`${batter.name} hits into a double play`;}
}

// Pure transition: never mutate a caller's match. Only completed plays enter here.
export function applyOutcome(match,outcome){
  if(match.over)throw new Error('Game already complete');
  const m=structuredClone(match),team=m.half,batter=currentBatter(m);
  if(m.lineScore[team][m.inning-1]===null)m.lineScore[team][m.inning-1]=0;
  const event={kind:outcome.kind,title:'',runs:0,team,batter:batter.id,batterName:batter.name,
    beforeBases:[...m.bases],afterBases:null,atBatEnded:false,halfEnded:false,gameEnded:false,walkOff:false,detail:outcome.detail??''};
  m.pitchNumber++;
  if(outcome.pitchKind)m.lastPitch=outcome.pitchKind;
  const stats=m.stats[batter.id];
  switch(outcome.kind){
    case 'defensiveplay':applyDefense(m,outcome,event,batter,stats);break;
    case 'ball':m.balls++;event.title=`Ball ${m.balls}`;if(m.balls===4){advanceOnWalk(m,batter,event);stats.bb++;event.title=`${batter.name} walks`;event.kind='walk';event.atBatEnded=true;}break;
    case 'strike':
    case 'miss':m.strikes++;event.title=outcome.kind==='miss'?'Swing and miss':'Called strike';if(m.strikes===3){m.outs++;stats.k++;stats.ab++;event.title=`${batter.name} strikes out`;event.kind='strikeout';event.atBatEnded=true;}break;
    case 'foul':m.strikes=Math.min(2,m.strikes+1);event.title='Foul ball';break;
    case 'single':case 'double':case 'triple':case 'homerun':{
      const n={single:1,double:2,triple:3,homerun:4}[outcome.kind];
      advanceOnHit(m,batter,n,event);stats.h++;stats.ab++;m.hits[team]++;event.atBatEnded=true;
      event.title=outcome.kind==='homerun'?'Home run!':`${batter.name} hits a ${outcome.kind}`;break;
    }
    case 'groundout':case 'flyout':m.outs++;stats.ab++;event.atBatEnded=true;event.title=outcome.kind==='flyout'?`${batter.name} flies out`:`${batter.name} grounds out`;break;
    default:throw new Error(`Unknown outcome ${outcome.kind}`);
  }
  if(event.runs&&event.playType!=='doubleplay'&&event.playType!=='tripleplay')stats.rbi+=event.runs;
  event.afterBases=[...m.bases];event.outsAfterPlay=m.outs;event.countAfterPlay=[m.balls,m.strikes];
  if(event.atBatEnded){m.order[team]=(m.order[team]+1)%9;m.balls=0;m.strikes=0;}
  // Walk-off ends immediately, including a bases-loaded walk. Home runs score all runners.
  if(m.inning===m.innings&&m.half===1&&m.score[1]>m.score[0]){event.walkOff=true;finish(m);}
  else if(m.outs===3)switchHalf(m,event);
  event.gameEnded=m.over;m.log.push({...event,inning:match.inning,half:match.half});
  return {match:m,event};
}

export function makeMatchPitch(m,{speed='standard',kind=null,aim=null,releaseError=0}={}){
  const rand=seededRandom(m.seed+m.pitchNumber*179+37);
  const pitcher=currentPitcher(m),repertoire=pitcherRepertoire(pitcher.id),choices=['fast',...repertoire];
  const pitchKind=kind??choices[Math.floor(rand()*choices.length)];
  if(!repertoire.includes(pitchKind))throw Error('Pitch is not in this pitcher’s repertoire');
  let x,y;
  if(aim){const scatter=.08+releaseError*.7;x=aim.x+(rand()-.5)*scatter*2;y=aim.y+(rand()-.5)*scatter*2;}
  else{const outside=rand()<.23;x=(rand()-.5)*1.55;y=(rand()-.5)*1.5;if(outside){if(rand()<.5)x=(x>=0?1:-1)*(1.18+rand()*.35);else y=(y>=0?1:-1)*(1.15+rand()*.3);}}
  return {kind:pitchKind,pitcherId:pitcher.id,throws:pitcher.throws,x,y,duration:(SPEEDS[speed]??1.25)*PITCH_TYPES[pitchKind].duration,
    movement:pitchMovement(pitchKind,pitcher.throws,rand()),bend:pitchKind==='curve'?(pitcher.throws==='R'?1:-1)*.9:0,inZone:Math.abs(x)<=1&&Math.abs(y)<=1,releaseError};
}

export function contactOutcome(m,contact){
  const batter=currentBatter(m),rand=seededRandom(m.seed+m.pitchNumber*397+991),roll=rand();
  const q=Math.min(1,Math.max(0,contact.quality+(batter.power-75)*.0015));
  let kind;
  const homeRun=q>.83?.30:q>.75?.08:0;
  const triple=q>.70?.025:.005;
  const double=q>.65?.20:q>.45?.09:.015;
  const single=q>.75?.33:q>.50?.28:q>.28?.20:.06;
  if(roll<homeRun)kind='homerun';
  else if(roll<homeRun+triple)kind='triple';
  else if(roll<homeRun+triple+double)kind='double';
  else if(roll<homeRun+triple+double+single)kind='single';
  else kind=rand()<.5?'groundout':'flyout';
  const direction=typeof contact.timingMs==='number'?Math.max(-.8,Math.min(.8,contact.timingMs/140*(batter.bats==='L'?-1:1))):(rand()-.5)*1.5;
  return {kind,quality:q,direction,distance:kind==='homerun'?1.23:kind==='double'||kind==='triple'?.82:kind==='single'?.62:.43,
    detail:kind==='groundout'?'The infield makes the play at first. Other runners hold.':kind==='flyout'?'Caught in the field. Runners hold.':kind==='homerun'?'Over the fence! Everyone comes home.':`Safe! Runners advance ${kind==='single'?'one base':kind==='double'?'two bases':'three bases'}.`};
}

export function cpuBat(m,pitch){
  const rand=seededRandom(m.seed+m.pitchNumber*811+149),batter=currentBatter(m);
  const swings=rand()<(pitch.inZone?.94:.21);
  if(!swings)return {kind:pitch.inZone?'strike':'ball',detail:pitch.inZone?'The batter watches it cross the zone.':'The batter lets it go outside.'};
  const edge=Math.max(Math.abs(pitch.x),Math.abs(pitch.y));
  const variation=m.lastPitch&&m.lastPitch!==pitch.kind?.05:0;
  if(rand()<.20+Math.max(0,edge-.55)*.17+variation+(pitch.inZone?0:.15))return {kind:'miss',detail:'A swing through the pitch.'};
  if(rand()<.23)return {kind:'foul',detail:'Fouled away. Keep changing the pitch location.'};
  const repeated=m.lastPitch===pitch.kind?.08:0;
  const quality=Math.max(.1,Math.min(.97,.24+rand()*.55+(batter.contact-75)*.002+pitch.releaseError*.10+repeated-Math.max(0,edge-.4)*.12));
  return contactOutcome(m,{quality,timingMs:(rand()-.5)*140});
}

export function resultHeadline(m){return m.winner===null?'A friendly draw':`${matchTeams(m)[m.winner].short} wins!`;}
export function playerOfGame(m){return allPlayers().slice().sort((a,b)=>{
  const value=p=>m.stats[p.id].h*2+m.stats[p.id].rbi*2+m.stats[p.id].r+m.stats[p.id].bb*.5;
  return value(b)-value(a);
})[0];}
export {TEAMS,playerById};
