import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {validateReviewData} from './greek-review-validation.mjs';

const root=resolve(import.meta.dirname,'..');
const [reviews,manifest,index]=await Promise.all([
  readFile(resolve(root,'data/reviews/greek-reuse-reviews.json'),'utf8').then(JSON.parse),
  readFile(resolve(root,'public/data/greek-reuse/manifest.json'),'utf8').then(JSON.parse),
  readFile(resolve(root,'public/data/greek-reuse/candidate-index.json'),'utf8').then(JSON.parse),
]);
const errors=validateReviewData(reviews,{candidateIds:new Set(index.map(x=>x.id)),algorithmVersion:manifest.algorithmVersion});
if(reviews.algorithmVersion!==manifest.algorithmVersion)errors.unshift(`top level: algorithmVersion ${reviews.algorithmVersion} does not match ${manifest.algorithmVersion}`);
if(errors.length){console.error(errors.map((x,i)=>`${i+1}. ${x}`).join('\n'));process.exitCode=1}else console.log(`Validated ${reviews.reviews.length} published Greek reuse reviews against ${index.length} Layer D candidates.`);
