import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildReviewQueue} from './greek-review-queue.mjs';

const root=resolve(import.meta.dirname,'..'),data=resolve(root,'public/data/greek-reuse');
const [manifest,passages,files]=await Promise.all([
  readFile(resolve(data,'manifest.json'),'utf8').then(JSON.parse),
  readFile(resolve(data,'passage-rankings.json'),'utf8').then(JSON.parse),
  readdir(resolve(data,'books')),
]);
const books=await Promise.all(files.filter(x=>x.endsWith('.json')).sort().map(file=>readFile(resolve(data,'books',file),'utf8').then(JSON.parse)));
const queue=buildReviewQueue(books.flatMap(x=>x.candidates||[]),manifest,passages);
await mkdir(resolve(data),{recursive:true});
await writeFile(resolve(data,'review-queue.json'),`${JSON.stringify(queue)}\n`);
await mkdir(resolve(root,'public/data/reviews'),{recursive:true});
await writeFile(resolve(root,'public/data/reviews/greek-reuse-reviews.json'),await readFile(resolve(root,'data/reviews/greek-reuse-reviews.json'),'utf8'));
const composition=Object.fromEntries(queue.selection.reasonOrder.map(reason=>[reason,queue.candidates.filter(x=>x.queueReasons.includes(reason)).length]));
console.log(`Built deterministic Greek review queue: ${queue.candidates.length} candidates (${Object.entries(composition).map(([k,v])=>`${k}=${v}`).join(', ')}).`);
