import {createMatch,applyOutcome,currentBatter,currentPitcher,halfLabel} from './match-engine.mjs';
import {fieldPlay} from './field-camera.mjs';
import {GroundDefense} from './defense-play.mjs';

// Rules bridge for the one-inning game. Kept separate from the ten-pitch art
// review until every lineup/camera has its own inspected character artwork.
export class InningController {
 constructor(seed=211){this.match=createMatch({innings:1,seed});this.pending=null;this.events=[];}
 get view(){return this.match.over?'final':this.match.half===0?'batting':'pitching';}
 get actors(){return {batter:currentBatter(this.match),pitcher:currentPitcher(this.match)};}
 beginContact(contact){if(this.pending||this.match.over)throw Error('Cannot begin another play');this.pending={phase:'hit',clock:0,result:{...contact},applied:false};}
 beginDefense(options={}){if(this.pending||this.match.over)throw Error('Cannot begin another play');this.pending=new GroundDefense({...options,teamId:this.match.half===0?'navy-stars':'coral-club',batterId:this.actors.batter.id,bases:this.match.bases,outs:this.match.outs});return this.pending.state;}
 throwTo(base){return this.pending instanceof GroundDefense?this.pending.throwTo(base):false;}
 get defenseState(){return this.pending instanceof GroundDefense?this.pending.state:null;}
 step(dt){if(!this.pending)return null;
  if(this.pending instanceof GroundDefense){this.pending.step(dt);if(!this.pending.finished)return null;const outcome=this.pending.resolution;this.pending=null;return this.pitchResult(outcome);}
  this.pending.clock+=Math.max(0,dt);const f=fieldPlay(this.pending);if(!f.call)return null;
  const kind=f.outcome==='out'?(this.pending.result.flyBall?'flyout':'groundout'):'single';
  this.pending=null;return this.pitchResult({kind});
 }
 pitchResult(outcome){if(this.pending)throw Error('Resolve live play before the next pitch');const oldHalf=halfLabel(this.match);const result=applyOutcome(this.match,outcome);this.match=result.match;const event={...result.event,view:this.view,previousHalf:oldHalf};this.events.push(event);return event;}
}
