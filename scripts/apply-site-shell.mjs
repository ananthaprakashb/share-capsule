import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const marker='<script src="/site-shell.js" defer></script>';
const directFmPattern=/\s*<script\s+src=["']\/sharecapsule-fm\.js["']\s+defer><\/script>\s*/gi;
const ignored=new Set(['.git','node_modules']);

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
  if(html!==original){
    await writeFile(file,html);
    changed+=1;
    console.log(`updated ${path.relative(root,file)}`);
  }
}

const uncovered=[];
for(const file of files){
  const html=await readFile(file,'utf8');
  if(!html.includes('/site-shell.js'))uncovered.push(path.relative(root,file));
}
if(uncovered.length)throw new Error(`Site shell missing from: ${uncovered.join(', ')}`);
console.log(JSON.stringify({htmlFiles:files.length,changed,allCovered:true},null,2));
