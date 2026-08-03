import {createHash} from 'node:crypto';

export const QUEUE_TARGET=325;
export const INSPECTION_PASSAGES=[['PS',109,1,1],['ISA',6,9,10],['ISA',52,13,12,53],['EXOD',34,6,7],['GEN',2,24,24],['HAB',2,4,4],['PROV',3,12,12]];

const scoreSort=(a,b)=>b.adjustedSimilarityScore-a.adjustedSimilarityScore||a.id.localeCompare(b.id);
const intersects=(candidate,[book,startChapter,startVerse,endVerse,endChapter=startChapter])=>candidate.source.book===book&&!(candidate.source.endChapter<startChapter||candidate.source.startChapter>endChapter||candidate.source.endChapter===startChapter&&candidate.source.endVerse<startVerse||candidate.source.startChapter===endChapter&&candidate.source.startVerse>endVerse);
const stableHash=value=>createHash('sha256').update(`greek-review-v1:${value}`).digest('hex');

export function buildReviewQueue(candidates,manifest,passages=[]){
  const selected=new Map();
  const add=(candidate,reason)=>{if(!candidate)return;const entry=selected.get(candidate.id)||{candidate,reasons:new Set()};entry.reasons.add(reason);selected.set(candidate.id,entry)};
  const sorted=[...candidates].sort(scoreSort);
  sorted.filter(x=>x.overlapsUbsGroup).forEach(x=>add(x,'ubs-overlap'));
  sorted.filter(x=>!x.overlapsUbsGroup&&x.category==='high').slice(0,Math.max(0,250-selected.size)).forEach(x=>add(x,'top-high-non-ubs'));

  const medium=sorted.filter(x=>x.category==='medium'&&!selected.has(x.id));
  const strata=Map.groupBy(medium,x=>x.source.book);
  const sampled=[...strata.values()].flatMap(group=>[...group].sort((a,b)=>stableHash(a.id).localeCompare(stableHash(b.id))).slice(0,2)).sort((a,b)=>stableHash(a.id).localeCompare(stableHash(b.id))).slice(0,50);
  sampled.forEach(x=>add(x,'medium-stratified-sample'));
  sorted.filter(x=>x.formulaicCategories?.length||x.formulaicPenalty>0).forEach(x=>add(x,'formulaic-audit'));
  sorted.filter(x=>x.source.bookMetadata?.directionalEligibility==='uncertain'||x.source.bookMetadata?.corpusCategory==='alternate-recension').slice(0,15).forEach(x=>add(x,'chronology-audit'));

  const topIds=new Set(passages.slice(0,20).flatMap(x=>x.candidates||[]));
  sorted.filter(x=>topIds.has(x.id)||x.source.book==='EZEK').slice(0,25).forEach(x=>add(x,'top-ranked-source'));
  for(const passage of INSPECTION_PASSAGES)sorted.filter(x=>intersects(x,passage)).slice(0,2).forEach(x=>add(x,'inspection-passage'));
  sorted.filter(x=>!selected.has(x.id)).slice(0,Math.max(0,QUEUE_TARGET-selected.size)).forEach(x=>add(x,x.category==='high'?'top-high-non-ubs':'medium-stratified-sample'));

  const reasonOrder=['ubs-overlap','top-high-non-ubs','medium-stratified-sample','formulaic-audit','chronology-audit','top-ranked-source','inspection-passage'];
  const items=[...selected.values()].slice(0,350).map(({candidate,reasons})=>({
    candidateId:candidate.id,bookDetailFile:`books/${candidate.source.book}.json`,queueReasons:reasonOrder.filter(x=>reasons.has(x)),source:{reference:candidate.source.id,book:candidate.source.book,startChapter:candidate.source.startChapter,startVerse:candidate.source.startVerse,endChapter:candidate.source.endChapter,endVerse:candidate.source.endVerse,displayName:candidate.source.bookMetadata?.displayName||candidate.source.book,corpusCategory:candidate.source.bookMetadata?.corpusCategory||'unknown',directionalEligibility:candidate.source.bookMetadata?.directionalEligibility||'unknown'},target:{reference:candidate.target.id,book:candidate.target.book},adjustedSimilarityScore:candidate.adjustedSimilarityScore??candidate.score,rawSimilarityScore:candidate.rawSimilarityScore??candidate.score,similarityCategory:candidate.category,ubsOverlap:Boolean(candidate.overlapsUbsGroup),formulaic:Boolean(candidate.formulaicCategories?.length||candidate.formulaicPenalty>0)
  })).sort((a,b)=>Math.min(...a.queueReasons.map(x=>reasonOrder.indexOf(x)))-Math.min(...b.queueReasons.map(x=>reasonOrder.indexOf(x)))||b.adjustedSimilarityScore-a.adjustedSimilarityScore||a.candidateId.localeCompare(b.candidateId));
  return {schemaVersion:1,layerId:'greek-reuse',algorithmVersion:manifest.algorithmVersion,datasetGeneratedAt:manifest.generatedAt,queueVersion:1,selection:{targetSize:QUEUE_TARGET,seed:'greek-review-v1',reasonOrder},candidates:items};
}
