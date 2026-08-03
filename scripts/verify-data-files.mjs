import {access,readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {BOOKS} from './config.mjs';
import {OPENBIBLE_BOOKS} from './openbible-config.mjs';

const mode=process.argv[2];
const only=process.argv[3];

if(!['public','dist'].includes(mode)){
  throw Error('Usage: node scripts/verify-data-files.mjs <public|dist> [openbible|quotations|greek-reuse]');
}

const root=resolve(mode==='public'?'public/data':'dist/data');
const douay=[
  'manifest.json',
  'rankings.json',
  'book-stats.json',
  'data-quality.json',
  ...BOOKS.map(book=>`books/${book}.json`),
];
const openbible=[
  'layers.json',
  'openbible/manifest.json',
  'openbible/rankings.json',
  'openbible/book-stats.json',
  'openbible/data-quality.json',
  ...OPENBIBLE_BOOKS.map(book=>`openbible/books/${book.id}.json`),
];

let quotationBooks=[];
let quotationDiscoveryError;
try{
  const manifest=JSON.parse(await readFile(resolve(root,'quotations/manifest.json'),'utf8'));
  quotationBooks=manifest.sourceBooks||[];
}catch(error){
  quotationDiscoveryError=error;
}

if(!quotationBooks.length){
  try{
    const stats=JSON.parse(await readFile(resolve(root,'quotations/book-stats.json'),'utf8'));
    quotationBooks=stats.map(book=>book.id);
  }catch(error){
    quotationDiscoveryError=new AggregateError(
      [quotationDiscoveryError,error].filter(Boolean),
      'Unable to inspect quotation book inventory',
    );
  }
}

if(only==='quotations'&&!quotationBooks.length&&quotationDiscoveryError){
  console.warn(`Quotation inventory unavailable; core-file verification will report the missing source: ${quotationDiscoveryError.message}`);
}

let greekBooks=[];
let greekDiscoveryError;
try{
  const manifest=JSON.parse(await readFile(resolve(root,'greek-reuse/manifest.json'),'utf8'));
  greekBooks=manifest.sourceBooks||[];
}catch(error){
  greekDiscoveryError=error;
}

if(only==='greek-reuse'&&!greekBooks.length&&greekDiscoveryError){
  console.warn(`Greek reuse inventory unavailable; core-file verification will report the missing source: ${greekDiscoveryError.message}`);
}

const greekCore=[
  'layers.json',
  'greek-reuse/manifest.json',
  'greek-reuse/passage-rankings.json',
  'greek-reuse/verse-rankings.json',
  'greek-reuse/book-stats.json',
  'greek-reuse/data-quality.json',
  'greek-reuse/config.json',
  'greek-reuse/candidate-index.json',
  'greek-reuse/review-queue.json',
  'reviews/greek-reuse-reviews.json',
];
const greekReuse=[
  ...greekCore,
  ...greekBooks.map(book=>`greek-reuse/books/${book}.json`),
];
const quotationCore=[
  'layers.json',
  'quotations/manifest.json',
  'quotations/rankings.json',
  'quotations/book-stats.json',
  'quotations/data-quality.json',
  'quotations/events.json',
  'quotations/verse-rankings.json',
  'quotations/target-rankings.json',
];
const quotations=[
  ...quotationCore,
  ...quotationBooks.map(book=>`quotations/books/${book}.json`),
];

const required=only==='openbible'
  ?openbible
  :only==='quotations'
    ?quotations
    :only==='greek-reuse'
      ?greekReuse
      :[...douay,...openbible,...quotations,...greekReuse];
const missing=[];
const empty=[];

for(const path of required){
  try{
    const absolutePath=resolve(root,path);
    await access(absolutePath);
    if((await stat(absolutePath)).size===0){
      empty.push(path);
    }
  }catch{
    missing.push(path);
  }
}

if(missing.length||empty.length){
  throw Error(`Required ${mode} data is incomplete. Missing: ${missing.join(', ')||'none'}; empty: ${empty.join(', ')||'none'}. Run the bootstrap data workflow before deployment.`);
}

console.log(`Verified ${required.length} ${mode} data assets across the requested layer set.`);
