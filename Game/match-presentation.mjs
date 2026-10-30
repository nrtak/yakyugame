import {TEAMS} from './rosters.mjs';
import {createMatch,applyOutcome,halfLabel,currentBatter,currentPitcher} from './match-engine.mjs';

export function teamSummary(id){
 const team=TEAMS.find(t=>t.id===id);if(!team)throw Error('Unknown team');
 const captain=team.players.find(p=>p.captain);
 return {id:team.id,name:team.name,short:team.short,color:team.color,captain:captain.name,
  throws:captain.throws==='L'?'Left-handed':'Right-handed',
  lineup:team.players.map((p,i)=>({order:i+1,id:p.id,name:p.name,position:p.position,bats:p.bats,throws:p.throws,captain:!!p.captain}))};
}
export function matchSummary(match,userTeamId='coral-club'){
 const userIndex=TEAMS.findIndex(t=>t.id===userTeamId);if(userIndex<0)throw Error('Unknown team');
 return {over:match.over,heading:match.over?'Final':halfLabel(match),
  role:match.over?'final':match.half===userIndex?'batting':'pitching',
  batter:match.over?null:currentBatter(match).name,pitcher:match.over?null:currentPitcher(match).name,
  outs:match.outs,bases:match.bases.map(Boolean),
  rows:TEAMS.map((t,i)=>({name:t.name,short:t.short,runs:match.score[i],hits:match.hits[i],
   innings:match.lineScore[i].map(n=>n===null?'—':String(n))})),
  result:!match.over?null:match.winner===null?'Draw':match.winner===userIndex?'You win!':'Good game',
  winningTeam:match.over&&match.winner!==null?TEAMS[match.winner].name:null,
  stats:TEAMS.flatMap((t,i)=>t.players.map(p=>({id:p.id,name:p.name,team:t.short,...match.stats[p.id]}))).filter(p=>p.ab||p.bb||p.r)};
}

// Deliberately scripted screen preview. Uses the real one-inning rules and is
// never submitted to a batting-session record or represented as a played game.
export const PREVIEW_PLAYS=['single','groundout','triple','flyout','strike','strike','strike',
 'groundout','single','flyout','strike','strike','strike'];
export class MatchFlowPreview {
 constructor(){this.reset();}
 reset(){this.match=createMatch({innings:1,seed:211});this.index=0;this.event=null;return this.match;}
 next(){if(this.match.over)return null;const kind=PREVIEW_PLAYS[this.index++];if(!kind)throw Error('Preview ended before match');
  const result=applyOutcome(this.match,{kind});this.match=result.match;this.event=result.event;return this.event;}
 finish(){while(!this.match.over)this.next();return this.match;}
}
