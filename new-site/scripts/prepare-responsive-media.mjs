// Add a missing intermediate photo size. At phone DPR=2 and 700px desktop cards,
// jumping straight from 640px to1280px needlessly doubles the decoded pixel count.
// Read existing licensed exports; preserve each slot's credits and art direction.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const files=(await fs.readdir('src/data')).filter(name=>/^media(?:-[\w-]+)?\.json$/.test(name)&&name!=='media-responsive.json').sort((a,b)=>a==='media.json'?-1:b==='media.json'?1:a.localeCompare(b));
const entries=new Map();
for(const name of files)for(const item of JSON.parse(await fs.readFile(path.join('src/data',name),'utf8')))entries.set(item.slot,item);
const result=[];const prepared=new Set();
for(const entry of entries.values()){
 if(entry.kind!=='image'||!Array.isArray(entry.sources?.srcset?.jpg))continue;
 const input=entry.sources.srcset.jpg.find(url=>/-1280\.jpg$/.test(url));
 if(!input)continue;
 const stem=input.replace(/-1280\.jpg$/,'-responsive-800');
 if(!prepared.has(stem)){
  for(const format of ['avif','webp','jpg']){
   const output=path.join('public',`${stem}.${format}`);
   const image=sharp(path.join('public',input)).resize({width:800});
   await (format==='avif'?image.avif({quality:52,effort:6}):format==='webp'?image.webp({quality:80,effort:5}):image.jpeg({quality:85,mozjpeg:true})).toFile(output);
  }
  prepared.add(stem);
 }
 const sources=structuredClone(entry.sources);
 for(const format of ['avif','webp','jpg']){
  if(Array.isArray(sources.srcset[format]))sources.srcset[format].splice(1,0,`${stem}.${format}`);
 }
 result.push({...entry,sources});
}
await fs.writeFile('src/data/media-responsive.json',JSON.stringify(result,null,2)+'\n');
console.log(`Added 800px candidates to ${result.length} photo slots (${prepared.size} unique photographs).`);
