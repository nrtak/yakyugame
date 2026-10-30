import {allPlayers} from './rosters.mjs';
import {characterBatterPose,characterPitcherPose} from './scene-render.mjs';
import {opposingBatterPose} from './opposing-art.mjs';
import {approvedFieldPose} from './field-atlas.mjs';
import {defensivePitcherPose} from './pitching-art.mjs';
import {defenseBatterPose} from './defense-batting-art.mjs';
// Exact connections, not a statement about anatomical quality or art completion.
export function firstPairCoverage(){return allPlayers().map(p=>({id:p.id,name:p.name,bats:p.bats,throws:p.throws,gloveHand:p.gloveHand,
 homeBatting:[0,1,3].map(frame=>({frame,pose:characterBatterPose(p.id,p.bats,frame)})),
 opposingBatting:[0,1,3].map(frame=>{const pose=opposingBatterPose(p.id,p.bats,frame),phase=frame===0?'ready':frame===1?'contact':'follow';return{phase,pose,exact:pose?.phase===phase};}),
 fielding:['ready','runA','runB','gather','transfer','throw','receive','catch','recovery'].map(action=>({action,pose:approvedFieldPose(p.id,p.throws,action)})),
 pitching:p.captain?[0,1,2,3,4].map(frame=>({frame,pose:characterPitcherPose(p.id,frame)})):[],
 defensivePitching:p.captain?[0,1,2,3,4].map(frame=>({frame,pose:defensivePitcherPose(p.id,p.throws,frame)})):[],
 defensiveBatting:[0,1,3].map(frame=>({frame,pose:defenseBatterPose(p.id,p.bats,frame)})),
 running:p.id==='coral-club-emma'?['home-to-first']:[]
}));}
export function validateArtworkConnections(imageSizes){const coverage=firstPairCoverage();for(const p of coverage){if(p.gloveHand===p.throws)throw Error('Glove hand mismatch: '+p.id);
 for(const item of [...p.homeBatting,...p.opposingBatting,...p.fielding,...p.pitching,...p.defensivePitching,...p.defensiveBatting]){const pose=item.pose;if(!pose)continue;if(typeof pose.hand==='string'&&pose.hand!==p.bats)throw Error('Batting hand mismatch: '+p.id);if(pose.throws&&pose.throws!==p.throws)throw Error('Throwing hand mismatch: '+p.id);const image=imageSizes[pose.asset];if(!image)throw Error('Unmapped artwork '+pose.asset);const [x,y,w,h]=pose.rect;if(![x,y,w,h,...pose.anchor].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>image.width||y+h>image.height)throw Error('Artwork crop outside image: '+p.id+' / '+pose.asset);}
 }return coverage;}
