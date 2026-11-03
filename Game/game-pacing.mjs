// Presentation waits use game time so pausing never skips an introduction.
export class GamePacing{
 constructor(){this.clear();}
 clear(){this.remaining=0;this.resumed=false;this.changeSides=false;}
 begin({resumed=false,changeSides=false}={}){this.resumed=resumed;this.changeSides=changeSides;this.remaining=resumed?1.4:changeSides?1.8:2.4;}
 get active(){return this.remaining>0;}
 step(dt,{paused=false}={}){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid presentation time');if(!this.active)return true;if(!paused)this.remaining=Math.max(0,this.remaining-dt);return false;}
}
export function automaticPitchDelay(game){
 if(game.phase!=='review'||!game.atBat?.userBatting)return null;
 return game.match.over||game.event?.halfEnded?2.2:game.event?.atBatEnded?1.6:1.05;
}
