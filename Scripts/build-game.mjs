import {readFile,writeFile,mkdir} from 'node:fs/promises';
const gameRoot=new URL('../Game/',import.meta.url);
const read=name=>readFile(new URL(name,gameRoot),'utf8');
let html=await read('match.html'),css=await read('match.css');
const art=await readFile(new URL('assets/match-keyart.png',gameRoot));
css=css.replace("url('assets/match-keyart.png')",()=>`url('data:image/png;base64,${art.toString('base64')}')`);
let mayaModule=await read('maya-art.mjs');
for(const name of ['maya-ready-v1.png','maya-follow-v1.png','cast-coral-v1.png','cast-mixed-v2.png','cast-navy-v1.png','pitchers-v1.png','park-backdrop-v1.png']){
  const data=await readFile(new URL(`assets/${name}`,gameRoot));
  mayaModule=mayaModule.replace(`'assets/${name}'`,()=>JSON.stringify(`data:image/png;base64,${data.toString('base64')}`));
}
const modules=await Promise.all(['engine.mjs','rosters.mjs','match-engine.mjs','match-render.mjs','match-ui.mjs'].map(read));
modules.splice(3,0,mayaModule);
const js=modules.map(s=>s.replace(/^import .*?;\r?\n/gm,'').replace(/^export \{[^}]+\};?\r?\n?/gm,'').replace(/^export /gm,'')).join('\n');
new Function(js);
html=html.replace('<link rel="stylesheet" href="match.css">',()=>`<style>${css}</style>`);
html=html.replace('<script type="module" src="match-ui.mjs"></script>',()=>`<script>\n(()=>{\n${js}\n})();\n</script>`);
if(/<script[^>]+src=/.test(html))throw new Error('External scripts are not permitted');
const webRoot=new URL('../App/Web/',import.meta.url);await mkdir(webRoot,{recursive:true});
await writeFile(new URL('index.html',webRoot),html);
console.log(`Built bundled game (${Math.round(Buffer.byteLength(html)/1024)} KB).`);
