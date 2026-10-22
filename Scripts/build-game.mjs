import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SCENE_ASSETS} from '../Game/scene-render.mjs';
import {TEAMS} from '../Game/rosters.mjs';
const gameRoot=new URL('../Game/',import.meta.url),webRoot=new URL('../App/Web/',import.meta.url);
const read=name=>readFile(new URL(name,gameRoot),'utf8');
const modules=['rosters.mjs','engine.mjs','match-engine.mjs','field-camera.mjs','defense-play.mjs','inning-controller.mjs','device-game.mjs','scene-engine.mjs','scene-render.mjs','device-ui.mjs'];
let js='const __gameModules={};\n';
for(const name of modules){
 let source=await read(name);const exported=new Set();
 source=source.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"];?\r?\n/gm,(_,names,dependency)=>`const {${names.replace(/\s+as\s+/g,':')}}=__gameModules[${JSON.stringify(dependency)}];\n`);
 source=source.replace(/export\s*\{([^}]+)\};?/g,(_,names)=>{for(const n of names.split(','))exported.add(n.trim());return '';});
 source=source.replace(/export\s+(const|let|function|class)\s+(\w+)/g,(_,kind,id)=>{exported.add(id);return `${kind} ${id}`;});
 if(/^\s*(import|export)\s/m.test(source))throw Error(`Unbundled module statement in ${name}`);
 js+=`__gameModules[${JSON.stringify(name)}]=(()=>{\n${source}\nreturn {${[...exported].join(',')}};\n})();\n`;
}
new Function(js);
const lock=JSON.parse(await read('scene-art-lock.json')),selected=Object.values(SCENE_ASSETS);
if(JSON.stringify([...selected].sort())!==JSON.stringify(Object.keys(lock.assets).sort()))throw Error('Artwork selection differs from pinned manifest');
const ids=new Set(TEAMS.flatMap(t=>t.players.map(p=>p.id)));
for(const names of Object.values(lock.characters))for(const id of names)if(!ids.has(id))throw Error('Unknown artwork character '+id);
await mkdir(new URL('assets/',webRoot),{recursive:true});
for(const name of selected){
 if(!/^assets\/[a-z0-9-]+\.png$/.test(name))throw Error('Invalid asset path');
 const data=await readFile(new URL(name,gameRoot));if(createHash('sha256').update(data).digest('hex')!==lock.assets[name])throw Error('Artwork changed: '+name);
 await copyFile(new URL(name,gameRoot),new URL(name,webRoot));
}
const css=await read('device.css');let html=await read('device.html');
html=html.replace('<link rel="stylesheet" href="device.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="device-ui.mjs"></script>',()=>`<script>\n(()=>{\n${js}\n})();\n</script>`);
if(/<script[^>]+src=|<link[^>]+stylesheet/.test(html))throw Error('Unbundled external source');
await writeFile(new URL('index.html',webRoot),html);
console.log(`Built offline one-inning game (${Math.round(Buffer.byteLength(html)/1024)} KB, ${selected.length} pinned artwork files).`);
