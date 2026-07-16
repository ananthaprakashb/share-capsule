import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const marker='<script src="/site-shell.js" defer></script>';
const homeMarimuthuMarker='<script src="/home-marimuthu-today.js" defer></script>';
const marimuthuMarker='<script src="/marimuthu-profile.js" defer></script>';
const marimuthuRecentMarker='<script src="/marimuthu-recent.js" defer></script>';
const marimuthuBatchesMarker='<script src="/marimuthu-batches.js" defer></script>';
const directFmPattern=/\s*<script\s+src=["']\/sharecapsule-fm\.js["']\s+defer><\/script>\s*/gi;
const ignored=new Set(['.git','node_modules']);
const relativeFile=file=>path.relative(root,file).split(path.sep).join('/');
const isHomeFile=file=>relativeFile(file)==='index.html';
const isMarimuthuFile=file=>/^marimuthu(?:\/|$)/i.test(relativeFile(file));

async function walk(dir){
  const entries=await readdir(dir,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    if(ignored.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())files.push(...await walk(full));
    else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(full);
  }
  return files;
}

const files=await walk(root);
let changed=0;
for(const file of files){
  let html=await readFile(file,'utf8');
  const original=html;
  html=html.replace(directFmPattern,'\n');
  if(!html.includes('/site-shell.js')){
    if(!/<\/body>/i.test(html))throw new Error(`Missing </body> in ${relativeFile(file)}`);
    html=html.replace(/<\/body>/i,`  ${marker}\n</body>`);
  }
  if(isHomeFile(file)&&!html.includes('/home-marimuthu-today.js')){
    if(!/<\/body>/i.test(html))throw new Error(`Missing </body> in ${relativeFile(file)}`);
    html=html.replace(/<\/body>/i,`  ${homeMarimuthuMarker}\n</body>`);
  }
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-profile.js')){
    if(!/<\/body>/i.test(html))throw new Error(`Missing </body> in ${relativeFile(file)}`);
    html=html.replace(/<\/body>/i,`  ${marimuthuMarker}\n</body>`);
  }
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-recent.js')){
    if(!/<\/body>/i.test(html))throw new Error(`Missing </body> in ${relativeFile(file)}`);
    html=html.replace(/<\/body>/i,`  ${marimuthuRecentMarker}\n</body>`);
  }
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-batches.js')){
    if(!/<\/body>/i.test(html))throw new Error(`Missing </body> in ${relativeFile(file)}`);
    html=html.replace(/<\/body>/i,`  ${marimuthuBatchesMarker}\n</body>`);
  }
  if(html!==original){
    await writeFile(file,html);
    changed+=1;
    console.log(`updated ${relativeFile(file)}`);
  }
}

const uncovered=[];
const homeMarimuthuUncovered=[];
const marimuthuUncovered=[];
const marimuthuRecentUncovered=[];
const marimuthuBatchesUncovered=[];
for(const file of files){
  const html=await readFile(file,'utf8');
  if(!html.includes('/site-shell.js'))uncovered.push(relativeFile(file));
  if(isHomeFile(file)&&!html.includes('/home-marimuthu-today.js'))homeMarimuthuUncovered.push(relativeFile(file));
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-profile.js'))marimuthuUncovered.push(relativeFile(file));
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-recent.js'))marimuthuRecentUncovered.push(relativeFile(file));
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-batches.js'))marimuthuBatchesUncovered.push(relativeFile(file));
}
if(uncovered.length)throw new Error(`Site shell missing from: ${uncovered.join(', ')}`);
if(homeMarimuthuUncovered.length)throw new Error(`Homepage Marimuthu card missing from: ${homeMarimuthuUncovered.join(', ')}`);
if(marimuthuUncovered.length)throw new Error(`Marimuthu profile script missing from: ${marimuthuUncovered.join(', ')}`);
if(marimuthuRecentUncovered.length)throw new Error(`Marimuthu recent poem script missing from: ${marimuthuRecentUncovered.join(', ')}`);
if(marimuthuBatchesUncovered.length)throw new Error(`Marimuthu batch loader missing from: ${marimuthuBatchesUncovered.join(', ')}`);
console.log(JSON.stringify({htmlFiles:files.length,changed,allCovered:true,homeMarimuthuCovered:true,marimuthuCovered:true,marimuthuRecentCovered:true,marimuthuBatchesCovered:true},null,2));
