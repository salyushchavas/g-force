// Trace the supplied original wordmark into vector outlines for the 3D build; no replacement typeface.
// Optional asset-build dependencies (not required by the website build):
// npm install --prefix /tmp/gforce-art-build potrace @xmldom/xmldom polygon-clipping
// GFORCE_ART_DEPENDENCIES=/tmp/gforce-art-build node scripts/trace-original-brand.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';
const assetRequire = createRequire(path.resolve(process.env.GFORCE_ART_DEPENDENCIES ?? '.', 'package.json'));
const potrace = assetRequire('potrace');
const input = new URL('../public/brand/wordmark-white.png', import.meta.url);
for(const [name,left,width] of [['name',0,393],['descriptor',428,707]]){
 const image=await sharp(input.pathname).extract({left,top:0,width,height:62}).extractChannel('alpha').negate().png().toBuffer();
 const svg=await new Promise((resolve,reject)=>potrace.trace(image,{threshold:128,turdSize:1,optTolerance:.15},(error,svg)=>error?reject(error):resolve(svg)));
 await fs.writeFile(new URL(`../public/brand/original-${name}.svg`,import.meta.url),svg);
}
