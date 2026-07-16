import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const marker='<script src="/site-shell.js" defer></script>';
const marimuthuMarker='<script src="/marimuthu-profile.js" defer></script>';
const marimuthuRecentMarker='<script src="/marimuthu-recent.js" defer></script>';
const directFmPattern=/\s*<script\s+src=["']\/sharecapsule-fm\.js["']\s+defer><\/script>\s*/gi;
const ignored=new Set(['.git','node_modules']);
const isMarimuthuFile=file=>/^marimuthu(?:\/|$)/i.test(path.relative(root,file).split(path.sep).join('/'));

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
    if(!/<\/body>/i.test(html))throw new Error(`Missing </body> in ${path.relative(root,file)}`);
    html=html.replace(/<\/body>/i,`  ${marker}\n</body>`);
  }
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-profile.js')){
    if(!/<\/body>/i.test(html))throw new Error(`Missing </body> in ${path.relative(root,file)}`);
    html=html.replace(/<\/body>/i,`  ${marimuthuMarker}\n</body>`);
  }
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-recent.js')){
    if(!/<\/body>/i.test(html))throw new Error(`Missing </body> in ${path.relative(root,file)}`);
    html=html.replace(/<\/body>/i,`  ${marimuthuRecentMarker}\n</body>`);
  }
  if(html!==original){
    await writeFile(file,html);
    changed+=1;
    console.log(`updated ${path.relative(root,file)}`);
  }
}

const uncovered=[];
const marimuthuUncovered=[];
const marimuthuRecentUncovered=[];
for(const file of files){
  const html=await readFile(file,'utf8');
  if(!html.includes('/site-shell.js'))uncovered.push(path.relative(root,file));
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-profile.js'))marimuthuUncovered.push(path.relative(root,file));
  if(isMarimuthuFile(file)&&!html.includes('/marimuthu-recent.js'))marimuthuRecentUncovered.push(path.relative(root,file));
}
if(uncovered.length)throw new Error(`Site shell missing from: ${uncovered.join(', ')}`);
if(marimuthuUncovered.length)throw new Error(`Marimuthu profile script missing from: ${marimuthuUncovered.join(', ')}`);
if(marimuthuRecentUncovered.length)throw new Error(`Marimuthu recent poem script missing from: ${marimuthuRecentUncovered.join(', ')}`);
console.log(JSON.stringify({htmlFiles:files.length,changed,allCovered:true,marimuthuCovered:true,marimuthuRecentCovered:true},null,2));
