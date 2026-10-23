import {CPU_DIFFICULTIES} from './cpu-difficulty.mjs';
import {TEAMS} from './rosters.mjs';
import {emptyProgression,normalizeProgression,startSeries,prepareSeriesMatch,recordSeriesMatch,startCup,prepareCupMatch,recordCupMatch,grantProgressReward} from './tournament-progress.mjs';
import {restoreDerby} from './home-run-derby.mjs';
import {PLAY_TIPS} from './game-help.mjs';
export const PROFILE_STORAGE_KEY='yakyugame.profiles.v1';
export const DEFAULT_PREFERENCES={teamId:'coral-club',homeTeamId:'navy-stars',innings:1,sensitivity:'1',assisted:true,difficulty:'standard',reducedMotion:false};
const copy=value=>structuredClone(value);
const knownTips=value=>Array.isArray(value)?[...new Set(value.filter(id=>Object.hasOwn(PLAY_TIPS,id)))]:[];
const emptyRecords=()=>({games:0,wins:0,losses:0,draws:0,runs:0,hits:0,strikeouts:0,derbies:0,derbyTitles:0,derbyHomeRuns:0,longestHomeRun:0,practice:{batting:0,pitching:0},completed:[]});
function records(value){const r=emptyRecords();for(const key of ['games','wins','losses','draws','runs','hits','strikeouts','derbies','derbyTitles','derbyHomeRuns','longestHomeRun'])if(Number.isSafeInteger(value?.[key])&&value[key]>=0)r[key]=value[key];for(const mode of ['batting','pitching'])if(Number.isFinite(value?.practice?.[mode]))r.practice[mode]=Math.max(0,Math.min(1000,value.practice[mode]));r.completed=Array.isArray(value?.completed)?[...new Set(value.completed.filter(k=>typeof k==='string'))]:[];return r;}
export function completedMatchRecord(match,teamId){
 const teams=match?.teamIds?match.teamIds.map(id=>TEAMS.find(t=>t.id===id)):TEAMS,team=teams.findIndex(t=>t.id===teamId);if(team<0||!match?.over)throw Error('A completed match is required');
 if(![...match.score,...match.hits].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('Invalid completed score');
 return{outcome:match.score[team]===match.score[1-team]?'draw':match.score[team]>match.score[1-team]?'win':'loss',runs:match.score[team],hits:match.hits[team],strikeouts:teams[1-team].players.reduce((n,p)=>n+match.stats[p.id].k,0)};
}
const preferences=value=>({
 teamId:['coral-club','navy-stars'].includes(value?.teamId)?value.teamId:DEFAULT_PREFERENCES.teamId,
 homeTeamId:['coral-club','navy-stars'].includes(value?.homeTeamId)?value.homeTeamId:'navy-stars',
 innings:[1,3,7,9].includes(value?.innings)?value.innings:1,
 sensitivity:['0.7','1','1.3'].includes(value?.sensitivity)?value.sensitivity:'1',
 assisted:typeof value?.assisted==='boolean'?value.assisted:true,
 difficulty:Object.hasOwn(CPU_DIFFICULTIES,value?.difficulty)?value.difficulty:'standard',
 reducedMotion:typeof value?.reducedMotion==='boolean'?value.reducedMotion:false
});
export function profileName(value){
 const name=String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
 if(!name||[...name].length>20||/[\p{Cc}\p{Cf}]/u.test(name))throw Error('Use a name with 1–20 characters.');
 return name;
}
// Profiles are device-local preferences. Guest changes never modify a saved player.
export function createProfileStore(storage,makeId=()=>crypto.randomUUID()){
 let state={version:1,activeId:null,players:[]},guest=copy(DEFAULT_PREFERENCES),guestTips=[],notice='',canSave=true;
 try{
  const raw=storage.getItem(PROFILE_STORAGE_KEY);
  if(raw!==null){
   const data=JSON.parse(raw);
   if(data?.version!==1||!Array.isArray(data.players))throw Error('Unknown profile data');
   const ids=new Set(),names=new Set();
   for(const p of data.players){
    if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Invalid profile');
    const name=profileName(p.name),key=name.toLocaleLowerCase();if(names.has(key))throw Error('Duplicate profile');
    ids.add(p.id);names.add(key);state.players.push({id:p.id,name,preferences:preferences(p.preferences),records:records(p.records),progression:normalizeProgression(p.progression),tutorials:knownTips(p.tutorials)});
   }
   state.activeId=ids.has(data.activeId)?data.activeId:null;
  }
 }catch{
  state={version:1,activeId:null,players:[]};canSave=false;notice='Saved profiles are unavailable. You can play, but changes will last only for this session.';
 }
 function persist(){
  if(!canSave)return;
  try{storage.setItem(PROFILE_STORAGE_KEY,JSON.stringify(state));}
  catch{canSave=false;notice='Your device could not save these changes. They will last only for this session.';}
 }
 const selected=()=>state.players.find(p=>p.id===state.activeId);
 return{
  get players(){return state.players.map(p=>({id:p.id,name:p.name}));},
  get current(){const p=selected();return p?copy(p):{id:null,name:'Guest',preferences:copy(guest),records:emptyRecords(),progression:emptyProgression(),tutorials:[...guestTips]};},
  get notice(){return notice;},
  create(value){const name=profileName(value);if(state.players.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('That name is already in use. Choose it from the player list.');
   const id=makeId();if(typeof id!=='string'||!id||state.players.some(p=>p.id===id))throw Error('Could not create this profile. Please try again.');
   state.players.push({id,name,preferences:copy(DEFAULT_PREFERENCES),records:emptyRecords(),progression:emptyProgression(),tutorials:[]});state.activeId=id;persist();return this.current;
  },
  select(id){if(!state.players.some(p=>p.id===id))throw Error('Player profile not found.');state.activeId=id;persist();return this.current;},
  useGuest(){guest=copy(DEFAULT_PREFERENCES);state.activeId=null;persist();return this.current;},
  update(changes){const p=selected(),next=preferences({...this.current.preferences,...changes});if(p){p.preferences=next;persist();}else guest=next;return this.current;},
  finishTutorial(ids){const next=knownTips([...this.current.tutorials,...ids]),p=selected();if(p){p.tutorials=next;persist();}else guestTips=next;},
  resetTutorials(){const p=selected();if(p){p.tutorials=[];persist();}else guestTips=[];},
  startSeries(profileId,options){const p=state.players.find(p=>p.id===profileId);if(!p)throw Error('Choose a player profile to save a series.');p.progression=startSeries(p.progression,options);persist();return copy(p.progression);},
  prepareSeriesMatch(profileId,matchId){const p=state.players.find(p=>p.id===profileId);if(!p)throw Error('Choose a player profile to save a series.');const next=prepareSeriesMatch(p.progression,matchId);p.progression=next.progress;persist();return copy(next.fixture);},
  recordSeriesMatch(profileId,result){const p=state.players.find(p=>p.id===profileId);if(!p)return false;p.progression=recordSeriesMatch(p.progression,result);persist();return copy(p.progression);},
  startCup(profileId,options){const p=state.players.find(p=>p.id===profileId);if(!p)throw Error('Choose a player profile to save a Cup.');p.progression=startCup(p.progression,options);persist();return copy(p.progression);},
  prepareCupMatch(profileId,matchId){const p=state.players.find(p=>p.id===profileId);if(!p)throw Error('Choose a player profile to save a Cup.');const next=prepareCupMatch(p.progression,matchId);p.progression=next.progress;persist();return copy(next.fixture);},
  recordCupMatch(profileId,result){const p=state.players.find(p=>p.id===profileId);if(!p)return false;p.progression=recordCupMatch(p.progression,result);persist();return copy(p.progression);},
  recordDerby(profileId,runId,derbyState){const p=state.players.find(p=>p.id===profileId);if(!p)return false;const s=restoreDerby(derbyState);if(!s.over||typeof runId!=='string'||!runId)throw Error('A completed Derby is required.');const key='derby:'+runId;if(p.records.completed.includes(key))return false;const hitter=s.config.players[0].id,homeRuns=s.log.filter(e=>e.batterId===hitter&&e.homeRun).length;p.records.derbies++;p.records.derbyHomeRuns+=homeRuns;p.records.longestHomeRun=Math.max(p.records.longestHomeRun,s.longest[hitter]);if(s.winners.includes(hitter)){p.records.derbyTitles++;p.progression=grantProgressReward(p.progression,{id:key,award:'home-run-derby-champion'});}p.records.completed.push(key);persist();return true;},
  recordMatch(profileId,matchId,summary){
   const p=state.players.find(p=>p.id===profileId);if(!p)return false;
   if(!matchId||typeof matchId!=='string'||!['win','loss','draw'].includes(summary?.outcome)||!['runs','hits','strikeouts'].every(k=>Number.isSafeInteger(summary[k])&&summary[k]>=0))throw Error('Invalid completed match');
   const key='match:'+matchId;if(p.records.completed.includes(key))return false;
   p.records.games++;p.records[{win:'wins',loss:'losses',draw:'draws'}[summary.outcome]]++;
   // Completion receipts are not a recent-history list: evicting an old ID
   // would allow a restored result to award the same game a second time.
   for(const k of ['runs','hits','strikeouts'])p.records[k]+=summary[k];p.records.completed.push(key);persist();return true;
  },
  recordPractice(profileId,attemptId,mode,score){
   const p=state.players.find(p=>p.id===profileId);if(!p)return false;
   if(!['batting','pitching'].includes(mode)||typeof attemptId!=='string'||!attemptId||!Number.isInteger(score)||score<0||score>1000)throw Error('Invalid practice score');
   const key='practice:'+attemptId;if(p.records.completed.includes(key))return false;
   p.records.practice[mode]=Math.max(p.records.practice[mode],score);p.records.completed.push(key);persist();return true;
  }
 };
}
