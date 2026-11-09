import {validateArtworkConnections} from './artwork-coverage.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SCENE_ASSETS} from './scene-render.mjs';

// File integrity and dimensions only: this cannot certify identity or anatomy.
export async function auditArtwork(){
 const lock=JSON.parse(await readFile(new URL('scene-art-lock.json',import.meta.url),'utf8')),images=[];
 for(const path of [...new Set(Object.values(SCENE_ASSETS))]){
  if(!/^assets\/[\w.-]+\.png$/.test(path))throw Error('Invalid runtime artwork path: '+path);
  const bytes=await readFile(new URL(path,import.meta.url));
  if(createHash('sha256').update(bytes).digest('hex')!==lock.assets[path])throw Error('Artwork changed: '+path);
  if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG: '+path);
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);if(!width||!height||width>16384||height>16384)throw Error('Invalid artwork dimensions: '+path);
  images.push({path,width,height,fileBytes:bytes.length,decodedBytes:width*height*4});
 }
 const byKey=Object.fromEntries(Object.entries(SCENE_ASSETS).map(([key,path])=>[key,images.find(i=>i.path===path)]));const coverage=validateArtworkConnections(byKey);
 return{coverage,images,files:images.length,totalFileBytes:images.reduce((n,i)=>n+i.fileBytes,0),totalDecodedBytes:images.reduce((n,i)=>n+i.decodedBytes,0),note:'Total catalogue size, not simultaneous memory usage. File checks do not approve artwork.'};
}
