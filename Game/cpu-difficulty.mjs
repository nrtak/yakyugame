// Contact assistance and opponent skill are independent preferences.
export const CPU_DIFFICULTIES=Object.freeze({
 relaxed:Object.freeze({label:'Relaxed',pitchSpeed:'relaxed',chase:.34,missAdjustment:.14,qualityAdjustment:-.13}),
 standard:Object.freeze({label:'Standard',pitchSpeed:'standard',chase:.21,missAdjustment:0,qualityAdjustment:0}),
 challenging:Object.freeze({label:'Challenging',pitchSpeed:'quick',chase:.10,missAdjustment:-.10,qualityAdjustment:.12})
});
export function cpuDifficulty(value='standard'){
 if(!Object.hasOwn(CPU_DIFFICULTIES,value))throw Error('Unknown opponent difficulty');
 return CPU_DIFFICULTIES[value];
}
