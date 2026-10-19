import { seededRandom, SPEEDS } from './engine.mjs';
import { TEAMS, allPlayers, playerById } from './rosters.mjs';

export function createMatch({innings=3,seed=211}={}) {
  return {innings,seed,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],
    lineScore:[Array(innings).fill(null),Array(innings).fill(null)],order:[0,0],pitchNumber:0,over:false,winner:null,
    lastPitch:null,log:[],stats:Object.fromEntries(allPlayers().map(p=>[p.id,{ab:0,h:0,r:0,rbi:0,bb:0,k:0}]))};
}
export const battingTeam = m => m.half;
export const fieldingTeam = m => 1-m.half;
export const currentBatter = m => TEAMS[m.half].players[m.order[m.half]%9];
export const currentPitcher = m => TEAMS[1-m.half].players.find(p=>p.position==='P');
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
  if(event.runs)stats.rbi+=event.runs;
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
  const pitchKind=kind??(['fast','fast','curve','change'][Math.floor(rand()*4)]);
  let x,y;
  if(aim){const scatter=.08+releaseError*.7;x=aim.x+(rand()-.5)*scatter*2;y=aim.y+(rand()-.5)*scatter*2;}
  else{const outside=rand()<.23;x=(rand()-.5)*1.55;y=(rand()-.5)*1.5;if(outside){if(rand()<.5)x=(x>=0?1:-1)*(1.18+rand()*.35);else y=(y>=0?1:-1)*(1.15+rand()*.3);}}
  return {kind:pitchKind,x,y,duration:(SPEEDS[speed]??1.25)*(pitchKind==='change'?1.23:pitchKind==='curve'?1.12:1),
    bend:pitchKind==='curve'?(x>0?-1:1)*.9:0,inZone:Math.abs(x)<=1&&Math.abs(y)<=1,releaseError};
}

export function contactOutcome(m,contact){
  const batter=currentBatter(m),rand=seededRandom(m.seed+m.pitchNumber*397+991),roll=rand();
  const q=Math.min(1,Math.max(0,contact.quality+(batter.power-75)*.0015));
  let kind;
  if(q>.83&&roll<.42)kind='homerun';
  else if(q>.75&&roll<.13)kind='triple';
  else if(q>.57&&roll<.52)kind='double';
  else if(q>.28&&roll<.80)kind='single';
  else kind=rand()<.5?'groundout':'flyout';
  const direction=typeof contact.timingMs==='number'?Math.max(-.8,Math.min(.8,-contact.timingMs/140)):(rand()-.5)*1.5;
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

export function resultHeadline(m){return m.winner===null?'A friendly draw':`${TEAMS[m.winner].short} wins!`;}
export function playerOfGame(m){return allPlayers().slice().sort((a,b)=>{
  const value=p=>m.stats[p.id].h*2+m.stats[p.id].rbi*2+m.stats[p.id].r+m.stats[p.id].bb*.5;
  return value(b)-value(a);
})[0];}
export {TEAMS,playerById};
