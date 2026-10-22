// Movement is a prototype tuning model, in plate-zone units. These are not
// measured MLB velocities. Fastball retains the existing 1.25s standard flight.
export const PITCH_TYPES=Object.freeze(Object.fromEntries(Object.entries({
 fast:{name:'Fastball',duration:1,side:0,drop:0,hint:'Straight and quick'},
 curve:{name:'Curveball',duration:1.12,side:.85,drop:1.2,hint:'Glove-side break and drop'},
 change:{name:'Changeup',duration:1.23,side:-.35,drop:.5,hint:'Slower with arm-side fade'},
 slider:{name:'Slider',duration:1.08,side:.8,drop:.4,hint:'Sweeps to the glove side'},
 cutter:{name:'Cutter',duration:1.03,side:.3,drop:.1,hint:'Short glove-side cut'},
 sinker:{name:'Sinker',duration:1.04,side:-.6,drop:.7,hint:'Arm-side run and sink'},
 splitter:{name:'Splitter',duration:1.16,side:0,drop:1.4,hint:'Late downward break'},
 knuckle:{name:'Knuckleball',duration:1.34,side:0,drop:.4,flutter:.2,hint:'Slow, irregular flutter'}
}).map(([id,p])=>[id,Object.freeze(p)])));
export const COMMON_PITCHES=Object.freeze(['fast','curve','change']);
// Assigned once with seed 10222026, then frozen. Never reroll on a new game,
// camera change, profile switch, or app launch. Identity includes the team.
export const PITCHER_EXTRAS=Object.freeze(Object.fromEntries(Object.entries({
 'aqua-pearls-nina':['slider','cutter','sinker'],
 'blue-comets-chloe':['slider','sinker'],
 'coral-club-emma':['knuckle','splitter','sinker'],
 'crimson-hawks-daniel':['cutter'],
 'emerald-dragons-kenta':['knuckle'],
 'forest-foxes-oliver':['splitter','slider'],
 'golden-suns-hana':['slider','knuckle','cutter'],
 'navy-stars-ryan':['sinker','cutter'],
 'sakura-blossoms-yui':['splitter'],
 'sand-dunes-leo':['sinker']
}).map(([id,p])=>[id,Object.freeze(p)])));
export function pitcherRepertoire(id){return [...COMMON_PITCHES,...(PITCHER_EXTRAS[id]??[])];}
export function pitchMovement(kind,hand,flutterSeed=0){
 const type=PITCH_TYPES[kind];if(!type)throw Error('Unknown pitch type');
 if(!['R','L'].includes(hand))throw Error('Unknown throwing hand');
 // From the catcher: a RHP's glove-side break is screen right. A camera
 // reversal changes projection, never the anatomical throwing hand.
 return {side:type.side*(hand==='R'?1:-1),drop:type.drop,flutter:type.flutter??0,seed:flutterSeed};
}
export function pitchOffset(p,q){
 if(q<=0||q>=1)return {x:0,y:0};
 if(!p.movement)return {x:Math.sin(Math.PI*q)*(p.bend??0)*40/65,y:0};
 const m=p.movement,e=q*q,late=Math.max(0,(q-.45)/.55)**2,shape=late-e;
 const envelope=Math.sin(Math.PI*q),phase=(m.seed??0)*Math.PI*2;
 return {x:m.side*shape+m.flutter*envelope*Math.sin(q*19+phase),
  y:m.drop*shape+m.flutter*.65*envelope*Math.sin(q*27+phase*1.7)};
}
export function projectPitch(p,t,release,zone,reverseX=false){
 const q=Math.max(0,Math.min(1.2,t/p.duration)),e=q*q,offset=pitchOffset(p,q),side=reverseX?-1:1;
 return {x:release.x+(zone.x+side*p.x*zone.rx-release.x)*e+side*offset.x*zone.rx,
  y:release.y+(zone.y-p.y*zone.ry-release.y)*e+offset.y*zone.ry,q};
}
