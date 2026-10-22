import {FIELD_PLAY_DURATION,fieldPlay} from './field-camera.mjs';
import {makeSession,judgeSwing,judgeTake,SWING_LEAD,summarize} from './engine.mjs';
export class BattingScene {
 constructor(seed=73){this.seed=seed;this.reset();}
 reset(){this.pitches=makeSession(this.seed,'standard');this.index=0;this.results=[];this.phase='intro';this.clock=0;this.elapsed=0;this.aim={x:0,y:0};this.swingAt=null;this.contact=null;this.balls=0;this.strikes=0;this.outs=0;this.paused=false;this.fieldResult=null;}
 get pitch(){return this.pitches[this.index];}
 previewField(direction=-.55,options={}){this.reset();this.result={timingMs:-direction*150,title:'Hit camera preview',...options};this.phase='camera-review';}
 start(){if(this.phase!=='intro')return;this.phase='ready';this.clock=0;}
 setAim(x,y){if(this.swingAt===null&&['ready','windup','flight'].includes(this.phase)){this.aim={x:Math.max(-1.7,Math.min(1.7,x)),y:Math.max(-1.4,Math.min(1.4,y))};}}
 swing(){if(this.paused||this.phase!=='flight'||this.swingAt!==null)return false;this.swingAt=this.elapsed;this.contact=judgeSwing(this.pitch,{...this.aim},this.elapsed+SWING_LEAD,{forgiving:true});if(this.contact.kind==='hit')this.contact.flyBall=this.aim.y<this.pitch.y-.25;return true;}
 finish(result){this.fieldResult=null;this.result={...result,slowGrounder:result.slowGrounder??(result.kind==='hit'&&result.quality<.5)};this.results.push(this.result);if(result.kind==='hit'){this.balls=0;this.strikes=0;}else if(result.kind==='ball'){if(++this.balls===4){this.balls=0;this.strikes=0;}}else if(result.kind==='foul'){this.strikes=Math.min(2,this.strikes+1);}else{if(++this.strikes===3){this.strikes=0;this.balls=0;this.outs++;}}this.phase=result.kind==='hit'?'hit':'result';this.clock=0;}
 step(dt){if(this.paused||['intro','summary'].includes(this.phase))return;dt=Math.max(0,Math.min(.05,dt));this.clock+=dt;
  if(this.phase==='camera-review'){if(this.clock>=FIELD_PLAY_DURATION)this.reset();return;}
  if(this.phase==='hit'&&!this.fieldResult){const f=fieldPlay(this);if(f.call){this.fieldResult=f.outcome;this.result.fieldOutcome=f.outcome;this.result.title=f.flyBall?'Fly out':f.outcome==='out'?'Out at first':'Safe at first';if(f.outcome==='out')this.outs++;}}
  if(this.phase==='ready'&&this.clock>=.85){this.phase='windup';this.clock=0;}
  else if(this.phase==='windup'&&this.clock>=.72){this.phase='flight';this.clock=0;this.elapsed=0;}
  else if(this.phase==='flight'){this.elapsed+=dt;const impact=this.swingAt===null?Infinity:this.swingAt+SWING_LEAD;
   if(this.contact&&['hit','foul'].includes(this.contact.kind)&&this.elapsed>=impact)this.finish(this.contact);
   else if(this.elapsed>=Math.max(this.pitch.duration+.2,Number.isFinite(impact)?impact:0))this.finish(this.contact??judgeTake(this.pitch));
  }else if((this.phase==='result'&&this.clock>=1.5)||(this.phase==='hit'&&this.clock>=FIELD_PLAY_DURATION)){
   if(this.index===this.pitches.length-1){this.phase='summary';this.summary=summarize(this.results);}else{this.index++;this.phase='ready';this.clock=0;this.elapsed=0;this.swingAt=null;this.contact=null;this.aim={x:0,y:0};}
  }
 }
}
export function swingFrame(s){if(s.swingAt===null)return 0;const t=s.elapsed-s.swingAt+(['hit','result'].includes(s.phase)?s.clock:0);return t<.045?0:t<SWING_LEAD?1:t<.24?2:t<.64?3:0;}
export function pitcherFrame(s){if(s.phase==='windup')return s.clock<.16?0:s.clock<.49?1:2;if(s.phase==='flight')return s.elapsed<.3?3:4;if(['hit','result'].includes(s.phase))return 4;return 0;}
