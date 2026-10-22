import {BattingScene} from './scene-engine.mjs';
export const PRACTICE_CAPTAINS=[
 {id:'forest-foxes-oliver',name:'Oliver',team:'Forest Foxes',bats:'R'},
 {id:'sakura-blossoms-yui',name:'Yui',team:'Sakura Blossoms',bats:'R'},
 {id:'blue-comets-chloe',name:'Chloe',team:'Blue Comets',bats:'L'},
 {id:'crimson-hawks-daniel',name:'Daniel',team:'Crimson Hawks',bats:'L'},
 {id:'golden-suns-hana',name:'Hana',team:'Golden Suns',bats:'L'},
 {id:'sand-dunes-leo',name:'Leo',team:'Sand Dunes',bats:'L'}
];
// A batting session is separate from a match: it cannot change game scores,
// series progress or an unfinished match checkpoint.
export class CaptainBattingPractice extends BattingScene{
 constructor(id,seed=73){super(seed);this.player=PRACTICE_CAPTAINS.find(p=>p.id===id);if(!this.player)throw Error('Unknown practice captain');}
 finish(result){super.finish(result);this.phase='result';}
 setAim(x,y){if(Number.isFinite(x)&&Number.isFinite(y))super.setAim(x,y);}
 step(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid practice time');super.step(dt);}
 sceneState(){return{...this,liveDefense:true,batterId:this.player.id,batterName:this.player.name,batterHand:this.player.bats,pitcherId:'navy-stars-ryan',homeTeamId:'navy-stars',venue:'Navy Stadium',pitch:this.pitch};}
}
