import {createDerby,derbyPitch,applyDerbySwing,restoreDerby} from './home-run-derby.mjs';
import {SWING_LEAD,judgeSwing} from './engine.mjs';
import {TEAMS} from './rosters.mjs';
import {PRACTICE_CAPTAINS} from './batting-practice.mjs';
export const DERBY_HITTERS=[...TEAMS.flatMap(t=>t.players.filter(p=>p.captain).map(p=>({...p,team:t.name}))),...PRACTICE_CAPTAINS.map(p=>({...p,power:75}))];
function checkedDerby(value){const s=restoreDerby(value);for(const p of s.config.players){const known=DERBY_HITTERS.find(x=>x.id===p.id);if(!known||p.bats!==known.bats||p.power!==known.power||p.name!==known.name)throw Error('Unknown or changed Derby hitter.');}return s;}
export class DerbySession{
 constructor({ids=DERBY_HITTERS.slice(0,2).map(p=>p.id),seed=41,state=null}={}){this.state=state?checkedDerby(state):createDerby({players:ids.map(id=>{const p=DERBY_HITTERS.find(p=>p.id===id);if(!p)throw Error('Unknown Derby hitter.');return p;}),seed});this.phase=this.state.over?'summary':'turn-ready';this.clock=0;this.elapsed=0;this.aim={x:0,y:0};this.swingAt=null;this.contact=null;this.paused=false;this.result=null;}
 startTurn(){if(this.paused||this.phase!=='turn-ready')return false;this.phase='ready';this.clock=0;return true;}
 get player(){return this.state.config.players.find(p=>p.id===(this.pitch?.batterId??this.state.winners[0]));}
 get pitch(){return derbyPitch(this.state);}
 setAim(x,y){if(!this.paused&&this.swingAt===null&&['ready','windup','flight'].includes(this.phase)&&[x,y].every(Number.isFinite))this.aim={x:Math.max(-1.7,Math.min(1.7,x)),y:Math.max(-1.4,Math.min(1.4,y))};}
 swing(){if(this.paused||this.phase!=='flight'||this.swingAt!==null)return false;this.swingAt=this.elapsed;this.contact=judgeSwing(this.pitch,this.aim,this.elapsed+SWING_LEAD);return true;}
 step(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid Derby time');if(this.paused||['summary','turn-ready'].includes(this.phase))return;dt=Math.min(.05,dt);this.clock+=dt;
  if(this.phase==='ready'&&this.clock>=.85){this.phase='windup';this.clock=0;}
  else if(this.phase==='windup'&&this.clock>=.72){this.phase='flight';this.clock=0;this.elapsed=0;}
  else if(this.phase==='flight'){this.elapsed+=dt;if(this.elapsed>=Math.max(this.pitch.duration+.2,this.swingAt===null?0:this.swingAt+SWING_LEAD)){
   this.displayPlayer=this.player;this.displayPitch=this.pitch;const state=applyDerbySwing(this.state,{pitchId:this.pitch.id,swing:this.swingAt===null?null:{...this.aim,impactTime:this.swingAt+SWING_LEAD}});this.result=state.log.at(-1);this.state=state;this.phase='result';this.clock=0;
  }}else if(this.phase==='result'&&this.clock>=1.7){this.phase=this.state.over?'summary':this.pitch.batterId!==this.displayPlayer.id||this.state.attempt===0?'turn-ready':'ready';this.clock=0;this.elapsed=0;this.swingAt=null;this.contact=null;this.aim={x:0,y:0};}
 }
 sceneState(){const result=this.phase==='result',p=result?this.displayPlayer:this.player;return{phase:this.phase,clock:this.clock,elapsed:this.elapsed,aim:this.aim,swingAt:this.swingAt,pitch:result?this.displayPitch:this.pitch,result:this.contact,batterId:p.id,batterName:p.name,batterHand:p.bats,pitcherId:'navy-stars-ryan',homeTeamId:'navy-stars',venue:'Navy Stadium',liveDefense:true};}
}
export function createDerbySaveStore(storage){const key='yakyugame.derby.v1';let data=Object.create(null),notice='',writable=true;
 try{const raw=storage.getItem(key);if(raw){if(raw.length>8000000)throw Error();const v=JSON.parse(raw);if(v.version!==1||!v.saves||typeof v.saves!=='object'||Array.isArray(v.saves))throw Error();data=Object.assign(Object.create(null),v.saves);}}catch{writable=false;notice='Derby saves could not be opened. This session can still be played.';}
 const persist=()=>{if(writable)try{storage.setItem(key,JSON.stringify({version:1,saves:data}));}catch{writable=false;notice='Derby progress could not be saved. Keep the app open to continue.';}};
 return{get notice(){return notice;},read(id){if(!id||!data[id])return null;try{const v=data[id];if(typeof v.runId!=='string'||!v.runId)throw Error();return{runId:v.runId,state:checkedDerby(v.state)};}catch{notice='This Derby save is unavailable. Start a new Derby.';return null;}},save(id,runId,state){if(!id)return;if(typeof runId!=='string'||!runId)throw Error('Derby run ID required.');data[id]={runId,state:checkedDerby(state)};persist();},clear(id,runId){if(id&&data[id]?.runId===runId){delete data[id];persist();}}};
}
