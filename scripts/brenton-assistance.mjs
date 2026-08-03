import fs from 'node:fs';

export const UNAVAILABLE='English LXX text unavailable for this source or recension.';
// Deliberately explicit: an absent key is never interpreted as a title match.
export const BRENTON_BOOK_MAP=Object.freeze({
 GEN:'GEN',EXOD:'EXO',LEV:'LEV',NUM:'NUM',DEUT:'DEU',JOSH:'JOS',JUDG:'JDG',RUT:'RUT',
 '1SAM':'1SA','2SAM':'2SA','1KGS':'1KI','2KGS':'2KI','1CHR':'1CH','2CHR':'2CH',
 ESTH:'EST',JDT:'JDT','1MAC':'1MA','2MAC':'2MA',PS:'PSA',PROV:'PRO',QOH:'ECC',CANT:'SNG',JOB:'JOB',WIS:'WIS',SIR:'SIR',
 HOS:'HOS',MIC:'MIC',AMO:'AMO',JOL:'JOL',JONAH:'JON',OBAD:'OBA',NAH:'NAM',HAB:'HAB',ZEPH:'ZEP',HAG:'HAG',ZECH:'ZEC',MAL:'MAL',
 ISA:'ISA',JER:'JER',BAR:'BAR',EPJER:'LJE',LAM:'LAM',EZEK:'EZK'
});
export const UNSUPPORTED=Object.freeze({
 '1ESDR':'Esdras identity and versification are ambiguous','2ESDR':'Esdras identity and versification are ambiguous',
 TOBBA:'Brenton does not identify the CenterBLC Vaticanus recension',TOBS:'Brenton does not identify the CenterBLC Sinaiticus recension',
 '3MAC':'Not present in the pinned Brenton USFM source','4MAC':'Not present in the pinned Brenton USFM source',OD:'Odes is derivative and has no safe Brenton mapping',PSSOL:'Not present in Brenton',
 BEL:'Old Greek recension is unsupported',BELTH:'Theodotion recension cannot safely be inferred',DAN:'Old Greek recension is unsupported',DANTH:'Theodotion recension cannot safely be inferred',SUS:'Old Greek recension is unsupported',SUSTH:'Theodotion recension cannot safely be inferred'
});
export function mappingFor(book){if(Object.hasOwn(BRENTON_BOOK_MAP,book))return {status:'exact',usfmBook:BRENTON_BOOK_MAP[book],notes:book==='PS'?'LXX/Brenton Psalm numbering is retained; no MT renumbering is inferred.':''};if(Object.hasOwn(UNSUPPORTED,book))return {status:'unsupported',notes:UNSUPPORTED[book]};return {status:'unknown',notes:'Unknown CenterBLC book ID; fuzzy matching is forbidden.'}}
// Notes are containers, not character styles. Remove the complete container first;
// stripping marker names first would leak their cross-reference/footnote payload.
export const NOTE_CONTAINERS=Object.freeze(['x','f','fe','ef','ex']);
export function cleanUsfmVerse(value){
 let clean=String(value);
 for(const marker of NOTE_CONTAINERS){
  const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  clean=clean.replace(new RegExp(`\\\\${escaped}(?:\\s|$)[\\s\\S]*?\\\\${escaped}\\*`,'gi'),' ');
 }
 // Character-formatting markers deliberately retain their enclosed Scripture text.
 clean=clean.replace(/\\\+[a-z][a-z0-9-]*\*?/gi,'').replace(/\\[a-z][a-z0-9-]*\*?/gi,'');
 return clean.replace(/\s+([,.;:!?])/g,'$1').replace(/\s+/g,' ').trim();
}
export function parseUsfm(text){const id=/\\id\s+([^\s]+)/.exec(text)?.[1];if(!id)throw Error('USFM is missing an \\id marker');let chapter=0;const verses={};for(const line of text.split(/\r?\n/)){const c=/^\\c\s+(\d+)/.exec(line);if(c){chapter=Number(c[1]);continue}const v=/^\\v\s+([0-9]+(?:-[0-9]+)?)\s+(.+)/.exec(line);if(v){const clean=cleanUsfmVerse(v[2]);for(const n of v[1].split('-').map(Number)){verses[`${chapter}:${n}`]=clean}}}return {id,verses}}
export function residualUsfmArtifact(value){return /\\(?:x|xt|xo|f|fe|fr|ft|fq|fk)\b/i.test(value)||/^\+\s*\d+:\d+\b/.test(value)||/\+\s*\d+:\d+\s+(?:Mat|Mark|Luke|John|Acts|Rom|Cor|Gal|Eph|Heb|Pet|Rev)\./i.test(value)}
export function loadNormalized(path='data/normalized/brenton-verses.json'){return fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):{sourceId:'eng-Brenton',books:{}}}
