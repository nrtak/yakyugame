// Local 2D art pass. Portable builds embed these assets; no external requests.
export const MAYA_ART={
  ready:{src:'assets/maya-ready-v1.png',anchorX:.55,anchorY:.985},
  follow:{src:'assets/maya-follow-v1.png',anchorX:.61,anchorY:.975}
};

export const CAST_SHEETS={
  coral:'assets/cast-coral-v1.png',
  mixed:'assets/cast-mixed-v2.png',
  navy:'assets/cast-navy-v1.png',
  pitchers:'assets/pitchers-v1.png',
  park:'assets/park-backdrop-v1.png'
};
export const CAST_COLUMNS={
  c1:['coral',0],c2:['coral',1],c3:['coral',2],c4:['coral',3],c5:['coral',4],c6:['coral',5],
  c7:['mixed',0],c8:['mixed',1],c9:['mixed',2],n1:['mixed',3],n2:['mixed',4],n3:['mixed',5],
  n4:['navy',0],n5:['navy',1],n6:['navy',2],n7:['navy',3],n8:['navy',4],n9:['navy',5]
};
const CAST_GRID={
  coral:{x:[0,280,537,778,1043,1282,1536],fieldX:[0,276,536,778,1040,1280,1536],y:[[0,358],[358,692],[692,1024]]},
  mixed:{x:[0,280,535,780,1045,1292,1536],fieldX:[0,272,536,776,1038,1293,1536],y:[[0,369],[369,704],[704,1024]]},
  navy:{x:[0,291,546,795,1051,1300,1536],fieldX:[0,274,531,788,1040,1285,1536],y:[[0,397],[391,734],[704,1024]]}
};
export function castFrame(id,role,pose=0){
  const entry=CAST_COLUMNS[id];if(!entry)return null;
  if(role==='pitch'&&(id==='c9'||id==='n1')){
    const row=id==='c9'?0:1;
    const frames=row?[[20,510,300,514,.50],[350,510,300,514,.55],[650,510,600,514,.68],[1140,510,396,514,.82]]:
      [[20,0,310,510,.50],[350,0,300,510,.55],[650,0,580,510,.66],[1115,0,421,510,.80]];
    const index=Math.max(0,Math.min(3,Math.floor(pose))),f=frames[index];
    return {sheet:'pitchers',rect:f.slice(0,4),anchorX:f[4],anchorY:.975,height:176,kind:'pitch',index};
  }
  const [sheet,column]=entry,grid=CAST_GRID[sheet],row=role==='bat'?(pose>.28?1:0):2;
  const x=row===2?grid.fieldX:grid.x;
  const [top,bottom]=grid.y[row],baseWidth=x[column+1]-x[column];
  const width=row===1?Math.min(baseWidth+36,1536-x[column]):baseWidth;
  return {sheet,rect:[x[column],top,width,bottom-top],anchorX:baseWidth*.5/width,anchorY:.985,height:role==='bat'?186:154,kind:row===2?'field':'bat',row,clipRight:baseWidth/width};
}
