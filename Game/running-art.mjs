// A reviewed camera-consistent B frame replaces the original rear-view B.
// Other runner identities/directions stay explicit gaps until their own review.
export const RUNNING_ASSETS={emmaRunSheet:'assets/scene-coral-emma-base-running-v1.png',emmaRunB:'assets/scene-coral-emma-running-stride-b-v5.png'};
export function liveRunnerPose(s,r){
 if(r.id!=='coral-club-emma'||r.out||r.from!==0||r.to!==1)return null;
 const arrived=s.clock>=r.arriveAt,second=Math.floor(s.clock*7)%2===1;
 if(arrived)return{asset:'emmaRunSheet',sourceWidth:1942,rect:[1370,0,572,809],anchor:[1685,775],scale:.18,action:'arrival'};
 return second?{asset:'emmaRunB',sourceWidth:1374,rect:[0,0,1374,1145],anchor:[760,1100],scale:.127,action:'runB'}:{asset:'emmaRunSheet',sourceWidth:1942,rect:[0,0,710,809],anchor:[425,775],scale:.18,action:'runA'};
}
