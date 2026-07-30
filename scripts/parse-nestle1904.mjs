import {access,readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

export const OSIS_TO_USFM={Matt:'MAT',Mark:'MRK',Luke:'LUK',John:'JHN',Acts:'ACT',Rom:'ROM','1Cor':'1CO','2Cor':'2CO',Gal:'GAL',Eph:'EPH',Phil:'PHP',Col:'COL','1Thess':'1TH','2Thess':'2TH','1Tim':'1TI','2Tim':'2TI',Titus:'TIT',Phlm:'PHM',Heb:'HEB',Jas:'JAS','1Pet':'1PE','2Pet':'2PE','1John':'1JN','2John':'2JN','3John':'3JN',Jude:'JUD',Rev:'REV'};
const REQUIRED_FIXTURES=[['MAT',1,1],['JHN',1,1],['ROM',1,1],['HEB',1,1],['REV',1,1]];

export function parseOsisReference(value){
  const match=String(value).match(/^\s*([1-3]?[A-Za-z]+)(?:\s+(\d+):(\d+)|\.(\d+)\.(\d+))\s*$/);
  if(!match?.[1])return null;
  const book=OSIS_TO_USFM[match[1]];
  if(!book)return null;
  const chapter=Number(match[2]??match[4]),verse=Number(match[3]??match[5]);
  return chapter>0&&verse>0?{book,chapter,verse}:null;
}

export function parseNestleMorph(text){
  const words=[],invalid=[];
  const lines=String(text).replace(/^\uFEFF/,'').split(/\r?\n/);
  let nonemptyLines=0;
  for(const [index,line] of lines.entries()){
    if(!line.trim()||line.startsWith('#'))continue;
    nonemptyLines++;
    const fields=line.split('\t');
    if(fields.length!==7){invalid.push({line:index+1,reason:`Expected 7 tab-delimited columns, found ${fields.length}`,raw:line});continue}
    const reference=parseOsisReference(fields[0]);
    if(!reference){invalid.push({line:index+1,reason:`Invalid or unknown OSIS reference: ${fields[0].trim()}`,raw:line});continue}
    words.push({...reference,sourceOrder:words.length,surface:fields[1],functionalMorphology:fields[2],formMorphology:fields[3],strong:fields[4],lemma:fields[5],normalized:fields[6]})
  }
  return {words,invalid,nonemptyLines};
}

export function validateNestleMorphStructure(parsed,{minimumWords=100000}={}){
  const unknownBooks=parsed.invalid.filter(item=>item.reason.startsWith('Invalid or unknown OSIS reference:'));
  if(unknownBooks.length)throw Error(`Nestle1904 contains ${unknownBooks.length} invalid or unknown OSIS book references; first reasons: ${unknownBooks.slice(0,5).map(item=>item.reason).join(' | ')}`);
  const books=new Set(parsed.words.map(word=>word.book));
  if(books.size!==27)throw Error(`Expected exactly 27 recognized Nestle1904 books, found ${books.size}`);
  if(parsed.words.length<=minimumWords)throw Error(`Nestle1904 word registry is implausibly small: ${parsed.words.length}`);
  const lemmaCoverage=parsed.words.filter(word=>word.lemma.length>0).length/parsed.words.length,normalizedCoverage=parsed.words.filter(word=>word.normalized.length>0).length/parsed.words.length;
  if(lemmaCoverage<.9||normalizedCoverage<.9)throw Error(`Nestle1904 lemma/normalized coverage is implausible: ${(lemmaCoverage*100).toFixed(1)}% / ${(normalizedCoverage*100).toFixed(1)}%`);
  const orders=new Set(parsed.words.map(word=>word.sourceOrder));
  if(orders.size!==parsed.words.length||parsed.words.some((word,index)=>word.sourceOrder!==index))throw Error('Nestle1904 source order is duplicated or malformed');
  for(const [book,chapter,verse] of REQUIRED_FIXTURES)if(!parsed.words.some(word=>word.book===book&&word.chapter===chapter&&word.verse===verse))throw Error(`Nestle1904 known verse is missing: ${book} ${chapter}:${verse}`);
  return {...parsed,structure:{bookCount:books.size,wordCount:parsed.words.length,lemmaCoverage,normalizedCoverage}};
}

function diagnostic(path,parsed,error){return {path,nonemptyLines:parsed?.nonemptyLines??0,validWords:parsed?.words.length??0,invalidLines:parsed?.invalid.length??0,invalidReasons:(parsed?.invalid||[]).slice(0,5).map(item=>item.reason),validationError:error instanceof Error?error.message:error?String(error):null}}
export async function discoverNestleMorph(directory,{validate=true}={}){
  const root=resolve(directory),preferred=resolve(root,'Nestle1904.csv'),inspected=[],names=[];
  try{await access(preferred);names.push('Nestle1904.csv')}catch{/* use recursive fallback */}
  const discovered=(await readdir(root,{recursive:true})).filter(name=>typeof name==='string'&&!/(^|\/)(README(?:\.md)?|parsing\.txt)$/i.test(name)&&/\.(csv|tsv|txt)$/i.test(name));
  for(const name of discovered.sort())if(!names.includes(name))names.push(name);
  for(const name of names){
    const path=resolve(root,name);let parsed;
    try{
      const text=await readFile(path,'utf8');parsed=parseNestleMorph(text);
      if(!parsed.words.length){inspected.push(diagnostic(path,parsed));continue}
      if(validate)validateNestleMorphStructure(parsed);
      return {path,text,...parsed,inspected};
    }catch(error){inspected.push(diagnostic(path,parsed,error))}
  }
  const details=inspected.map(item=>`${item.path}: ${item.nonemptyLines} nonempty, ${item.validWords} valid, ${item.invalidLines} invalid${item.validationError?`; ${item.validationError}`:''}${item.invalidReasons.length?`; first reasons: ${item.invalidReasons.join(' | ')}`:''}`).join('\n');
  throw Error(`No valid seven-column Nestle1904 morphology file found under ${root}. Files inspected: ${names.length}. Candidate diagnostics:\n${details||'(no eligible .csv/.tsv/.txt files found)'}`);
}
