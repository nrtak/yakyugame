import {TEAMS} from './rosters.mjs';
import {GroundDefense} from './defense-play.mjs';
import {FlightDefense} from './flight-defense.mjs';
import {rigDefenseSettings} from './rig-defense-settings.mjs';
export const STORY_SPOTLIGHTS={
 'coral-club':{id:'mia-corner',actorId:'coral-club-mia',title:'Mia’s corner',goal:'Secure the grounder, then tap first base to beat the batter.',speaker:'Mia',intro:'You do not have to make every out yourself, Emma. Give me this corner.',success:'Mia handles the play at first. Emma backs her teammate’s decision.',retry:'The runner got through this time. Get to the target, secure the ball, and tap first promptly.'},
 'navy-stars':{id:'clara-read',actorId:'navy-stars-mia',title:'Clara’s read',goal:'Move Clara under the landing target and catch the fly before it bounces.',speaker:'Clara',intro:'I can see the ball from here, Ryan. Let me make the read.',success:'Clara calls for it and makes the catch. Ryan lets her finish the play.',retry:'The ball found the grass. Move toward the gold target early; Dive can help with a low ball.'}
};
export function spotlightFor(teamId){const s=STORY_SPOTLIGHTS[teamId];if(!s)throw Error('Unknown story club');return{...s};}
export class StorySpotlight{
 constructor(teamId){this.team=TEAMS.find(t=>t.id===teamId);this.definition=spotlightFor(teamId);this.teamId=teamId;this.offense=TEAMS.find(t=>t.id!==teamId);this.userBatting=false;this.phase='ready';this.paused=false;this.play=null;this.result=null;}
 start(){if(this.paused||this.phase!=='ready')return false;const o={...rigDefenseSettings(this.teamId),teamId:this.teamId,batterId:this.offense.players[0].id,outs:2};this.play=this.teamId==='navy-stars'?new FlightDefense({...o,contact:{quality:.5,launchAngle:40,direction:0}}):new GroundDefense({...o,target:{x:59,y:75},ballTravel:1.4,runnerTime:4.7});this.play.enableManualFielding();if(this.play.fielder.id!==this.definition.actorId)throw Error('Story spotlight selected the wrong teammate');this.phase='field';return true;}
 get defense(){return this.play?.state??null;}
 setFielderInput(x,y){return !this.paused&&this.phase==='field'?this.play.setFielderInput(x,y):false;}
 performFieldAction(){return !this.paused&&this.phase==='field'?this.play.performFieldAction():false;}
 throwTo(base){return !this.paused&&this.phase==='field'?this.play.throwTo(base):false;}
 tagRunner(){return false;}
 step(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid spotlight time');if(this.paused||this.phase!=='field')return;this.play.step(Math.min(.05,dt));if(!this.play.finished)return;const r=this.play.resolution,success=this.teamId==='navy-stars'?r.kind==='flyout':r.retired?.some(p=>p.id===this.play.context.batterId&&p.base==='1B')===true;this.result={challengeId:this.definition.id,success,detail:success?this.definition.success:this.definition.retry};this.phase='summary';}
}
