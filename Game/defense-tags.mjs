// Simplified game-space reach, not a claim about an authored glove animation.
export const TAG_REACH=5.5,TAG_BASE_TOUCH=.5;
export function tagContactValid({at,arriveAt,holderPoint,runnerPoint,startPoint}){
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 return Number.isFinite(at)&&at>0&&Number.isFinite(arriveAt)&&at<arriveAt-1e-8&&[holderPoint,runnerPoint,startPoint].every(point)&&distance(runnerPoint,startPoint)>TAG_BASE_TOUCH&&distance(holderPoint,runnerPoint)<=TAG_REACH+1e-7;
}
export function firstTagContact({from,to,arriveAt,holderPoint,runnerPoint,startPoint}){
 const end=Math.min(to,arriveAt-2e-8),valid=at=>tagContactValid({at,arriveAt,holderPoint:holderPoint(at),runnerPoint:runnerPoint(at),startPoint});
 if(end<from)return null;if(valid(from))return from;
 let a=from;while(a<end){const b=Math.min(end,a+1/120);if(valid(b)){let lo=a,hi=b;for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(valid(mid))hi=mid;else lo=mid;}return hi;}a=b;}return null;
}
