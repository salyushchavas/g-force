// Licensed security-key photograph. Keep the original outside public; ship cropped responsive derivatives.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original=process.env.GFORCE_SECURITY_SOURCE||path.join(os.tmpdir(),'gforce-media-originals','pexels-cottonbro-5474301.jpg');
const sourceUrl='https://images.pexels.com/photos/5474301/pexels-photo-5474301.jpeg';
try{await fs.access(original);}catch{await fs.mkdir(path.dirname(original),{recursive:true});const response=await fetch(sourceUrl);if(!response.ok)throw new Error(`Photo download failed: ${response.status}`);await fs.writeFile(original,Buffer.from(await response.arrayBuffer()));}
const crop={left:0,top:3250,width:4480,height:2520};
const widths=[640,800,1280,1920];
const sources={avif:[],webp:[],jpg:[]};
for(const width of widths){for(const format of ['avif','webp','jpg']){const filename=`security-key-laptop-${width}.${format}`;let output=sharp(original).rotate().extract(crop).resize(width);output=format==='avif'?output.avif({quality:54,effort:6}):format==='webp'?output.webp({quality:79,effort:5}):output.jpeg({quality:84,mozjpeg:true});await output.toFile(path.join(root,'public/media/img',filename));sources[format].push(`/media/img/${filename}`);}}
const credit={author:'cottonbro studio',source:'Pexels',page_url:'https://www.pexels.com/photo/close-up-shot-of-a-laptop-5474301/',license:'Pexels License',license_url:'https://www.pexels.com/license/'};
const entry={kind:'image',title:'A USB security key beside a laptop',width:1920,height:1080,objectPosition:'60% 65%',sources:{srcset:sources},credit};
await fs.writeFile(path.join(root,'src/data/media-security.json'),JSON.stringify(['svc-cybersecurity','blog-cyber-career'].map(slot=>({slot,...entry})),null,2)+'\n');
console.log('Prepared security-key image for cybersecurity and its career article.');
