import {appendFile,mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {clusterGreekCandidates} from './cluster-greek-candidates.mjs';
import {getLxxBookMetadata,LXX_BOOKS,lxxToUbsBookId} from './lxx-book-metadata.mjs';
import {mapLxxVerse} from './lxx-versification-bridge.mjs';

const suffix=id=>String(id).split(':').at(-1);
const verseParts=id=>{const [book,chapter,verse]=suffix(id).split('.');return {book,chapter,verse}};
const pairKey=(sourceBook,sourceVerse,targetBook,targetVerse)=>`${sourceBook}|${sourceVerse}|${targetBook}|${targetVerse}`;

/**
 * @typedef {object} UbsBenchmarkPassage
 * @property {string} [bookId]
 * @property {string[]} [verseIds]
 */

/**
 * @typedef {object} UbsBenchmarkEvent
 * @property {string} [id]
 * @property {string} [groupId]
 * @property {UbsBenchmarkPassage} [sourcePassage]
 * @property {UbsBenchmarkPassage} [targetPassage]
 */

/**
 * @typedef {object} BuildUbsOverlapIndexOptions
 * @property {string[]} [lxxVerseIds]
 */

export function createMemoryTracker({logger=console.log,startedAt=performance.now(),warningHeapBytes=Infinity}={}){
  let peakRss=0,peakHeapUsed=0,peakHeapTotal=0;
  function sample(stage,details={}){const memory=process.memoryUsage();peakRss=Math.max(peakRss,memory.rss);peakHeapUsed=Math.max(peakHeapUsed,memory.heapUsed);peakHeapTotal=Math.max(peakHeapTotal,memory.heapTotal);logger(JSON.stringify({stage,elapsedMs:Math.round(performance.now()-startedAt),rss:memory.rss,heapUsed:memory.heapUsed,heapTotal:memory.heapTotal,memoryWarning:memory.heapUsed>=warningHeapBytes,...details}));return memory}
  return {sample,metrics:()=>({peakRss,peakHeapUsed,peakHeapTotal})};
}

/**
 * Build the verse-pair lookup used to compare native LXX candidates with UBS events.
 * Invalid or incomplete events remain available in the returned diagnostics.
 *
 * @param {UbsBenchmarkEvent[]} events
 * @param {BuildUbsOverlapIndexOptions} [options]
 */
export function buildUbsOverlapIndex(events,options={}){
  const {lxxVerseIds=[]}=options;
  const pairs=new Map(),groups=new Set(),mappedEvents=new Set(),unmappedEvents=[];
  const available=new Set(lxxVerseIds.map(id=>suffix(id)));
  const mappedUbsBooks=new Set(LXX_BOOKS.filter(book=>book.directionalEligibility==='eligible'&&book.ubsBookId).map(book=>book.ubsBookId));
  const mappedAvailable=new Set();
  for(const nativeId of available){const [nativeBook,chapter,verse]=nativeId.split('.'),metadata=getLxxBookMetadata(nativeBook);if(metadata.directionalEligibility!=='eligible')continue;for(const target of mapLxxVerse(nativeBook,Number(chapter),Number(verse)).targets)mappedAvailable.add(`${target.book}.${target.chapter}.${target.verse}`)}
  for(const [eventIndex,event] of events.entries()){
    const sourceBook=event.sourcePassage?.bookId,targetBook=event.targetPassage?.bookId,groupId=event.groupId;
    const eventId=event.id||`ubs-event-${eventIndex+1}`;
    if(!sourceBook||!targetBook||!groupId){unmappedEvents.push({eventId,groupId,reason:'Invalid source or target reference'});continue}
    groups.add(groupId);
    const sourceMappable=!lxxVerseIds.length||(event.sourcePassage.verseIds||[]).some(id=>{const parsed=verseParts(id);return mappedAvailable.has(`${sourceBook}.${parsed.chapter}.${parsed.verse}`)});
    if(!sourceMappable){unmappedEvents.push({eventId,groupId,sourcePassage:event.sourcePassage,targetPassage:event.targetPassage,reason:mappedUbsBooks.has(sourceBook)?'Missing verse-level crosswalk':'Unknown LXX book mapping'});continue}
    mappedEvents.add(eventId);
    for(const sourceId of event.sourcePassage.verseIds||[])for(const targetId of event.targetPassage.verseIds||[]){
      const source=verseParts(sourceId),target=verseParts(targetId),key=pairKey(sourceBook,`${source.chapter}.${source.verse}`,targetBook,`${target.chapter}.${target.verse}`),entry=pairs.get(key)||{groups:new Set(),events:new Set()};
      entry.groups.add(groupId);entry.events.add(eventId);pairs.set(key,entry);
    }
  }
  const mappedGroups=new Set(events.filter((event,index)=>mappedEvents.has(event.id||`ubs-event-${index+1}`)).map(event=>event.groupId));
  return {pairs,groups,mappedEvents,mappedGroups,unmappedEvents,totalEvents:events.length};
}

export function matchingUbsOverlap(candidate,index){
  const nativeBook=candidate.source.book,metadata=getLxxBookMetadata(nativeBook),sourceBook=lxxToUbsBookId(nativeBook),result=new Set();
  const events=new Set();if(!sourceBook||metadata.directionalEligibility!=='eligible')return {groups:result,events};
  for(const sourceId of candidate.source.verseIds)for(const targetId of candidate.target.verseIds){
    const source=verseParts(sourceId),target=verseParts(targetId),mapped=mapLxxVerse(nativeBook,Number(source.chapter),Number(source.verse));
    for(const mappedSource of mapped.targets){const entry=index.pairs.get(pairKey(sourceBook,`${mappedSource.chapter}.${mappedSource.verse}`,target.book,`${target.chapter}.${target.verse}`));if(entry){for(const group of entry.groups)result.add(group);for(const event of entry.events)events.add(event)}}
  }
  return {groups:result,events};
}
export function matchingUbsGroups(candidate,index){return matchingUbsOverlap(candidate,index).groups}

export function directMatchingUbsGroups(candidate,events){
  const sourceBook=lxxToUbsBookId(candidate.source.book),result=new Set();
  if(!sourceBook)return result;
  const sourceVerses=new Set(candidate.source.verseIds.flatMap(id=>{const value=verseParts(id);return mapLxxVerse(candidate.source.book,Number(value.chapter),Number(value.verse)).targets.map(target=>`${target.chapter}.${target.verse}`)})),targetVerses=new Set(candidate.target.verseIds.map(id=>{const value=verseParts(id);return `${value.chapter}.${value.verse}`}));
  for(const event of events)if(event.sourcePassage?.bookId===sourceBook&&event.targetPassage?.bookId===candidate.target.book&&(event.sourcePassage.verseIds||[]).some(id=>{const value=verseParts(id);return sourceVerses.has(`${value.chapter}.${value.verse}`)})&&(event.targetPassage.verseIds||[]).some(id=>{const value=verseParts(id);return targetVerses.has(`${value.chapter}.${value.verse}`)}))result.add(event.groupId);
  return result;
}

const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]};
export function deriveGreekThresholds(scores){if(!scores.length)throw Error('No safely mapped UBS benchmark candidates were recovered; refusing to invent similarity thresholds');return {high:percentile(scores,.75),medium:percentile(scores,.4),reason:'Derived from the 75th and 40th percentiles of safely mapped UBS-overlapping candidate scores.'}}

export function calibrateGreekCandidates({targetWindows,retrieve,score,ubsIndex,tracker,progressInterval=500}){
  const ubsScores=[],bestRanks=new Map(),bestEventRanks=new Map();let rawRetrievedPairCount=0,scoredPairCount=0,maxRetainedCandidates=0;
  for(const [targetIndex,target] of targetWindows.entries()){
    const retrieved=retrieve(target);rawRetrievedPairCount+=retrieved.length;
    const local=[];
    for(const item of retrieved){const candidate=score(item.source,target),overlap=matchingUbsOverlap(candidate,ubsIndex);candidate.matchingUbsGroupIds=[...overlap.groups].sort();candidate.matchingUbsEventIds=[...overlap.events].sort();if(overlap.events.size)ubsScores.push(candidate.score);local.push(candidate);scoredPairCount++}
    local.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));maxRetainedCandidates=Math.max(maxRetainedCandidates,local.length);
    for(const [rankIndex,candidate] of local.entries()){for(const group of candidate.matchingUbsGroupIds)bestRanks.set(group,Math.min(bestRanks.get(group)||Infinity,rankIndex+1));for(const event of candidate.matchingUbsEventIds)bestEventRanks.set(event,Math.min(bestEventRanks.get(event)||Infinity,rankIndex+1))}
    if((targetIndex+1)%progressInterval===0)tracker?.sample('calibration-progress',{processed:targetIndex+1,retained:local.length,targetBook:target.book});
  }
  return {thresholds:deriveGreekThresholds(ubsScores),ubsScores,bestRanks,bestEventRanks,rawRetrievedPairCount,scoredPairCount,maxRetainedCandidates};
}

export function compactCandidate(candidate,groups,category,alternativeWindows=[]){
  const compactWindow=(window,isSource)=>({id:window.id,book:window.book,nativeBook:window.nativeBook,bookOrder:window.bookOrder,startChapter:window.startChapter,startVerse:window.startVerse,endChapter:window.endChapter,endVerse:window.endVerse,verseIds:window.verseIds,originalWords:window.originalWords,lemmaTokens:window.lemmaTokens,...(isSource?{bookMetadata:getLxxBookMetadata(window.book),mappedReference:mapLxxVerse(window.book,window.startChapter,window.startVerse)}:{})});
  return {id:candidate.id,source:compactWindow(candidate.source,true),target:compactWindow(candidate.target,false),score:candidate.score,rawSimilarityScore:candidate.rawSimilarityScore??candidate.score,adjustedSimilarityScore:candidate.adjustedSimilarityScore??candidate.score,formulaicPenalty:candidate.formulaicPenalty||0,formulaicCategories:candidate.formulaicCategories||[],formulaicOnly:Boolean(candidate.formulaicOnly),formulaicEvidenceScore:candidate.formulaicEvidenceScore||0,nonformulaicSharedContentLemmaCount:candidate.nonformulaicSharedContentLemmaCount??candidate.sharedLemmas.length,category,components:candidate.components,penalties:candidate.penalties,sharedLemmas:candidate.sharedLemmas,sharedRareLemmas:candidate.sharedRareLemmas,matchingPositions:candidate.matchingPositions,exactNgrams:candidate.exactNgrams,matchingUbsGroupIds:[...groups].sort(),matchingUbsEventIds:[...(candidate.matchingUbsEventIds||[])].sort(),overlapsUbsGroup:groups.size>0,overlapsOpenBible:false,overlapsDouay:false,alternativeWindows:[...alternativeWindows].sort()};
}

export async function processGreekPartitions({targetWindows,retrieve,score,ubsIndex,thresholds,tempDirectory,tracker,limits,progressInterval=500}){
  const partitions=new Map();for(const target of targetWindows){const list=partitions.get(target.book)||[];list.push(target);partitions.set(target.book,list)}
  await mkdir(tempDirectory,{recursive:true});const summaries=[],counts={rawRetrievedPairs:0,scoredPairs:0,lowScoringRawCandidates:0,mediumRetainedCandidates:0,highRetainedCandidates:0,clusteredRepresentatives:0,nestedAlternativesRemoved:0,formulaicAuditCandidatesRetained:0},lowSample=[],lowByBook={};let maxRetainedCandidates=0,maxPartitionHeapGrowth=0;
  for(const book of [...partitions.keys()].sort()){
    const before=process.memoryUsage().heapUsed,retained=[],windows=partitions.get(book);
    tracker?.sample('production-partition-start',{processed:0,retained:0,targetBook:book});
    for(const [windowIndex,target] of windows.entries()){
      const retrieved=retrieve(target);counts.rawRetrievedPairs+=retrieved.length;
      for(const item of retrieved){const candidate=score(item.source,target);counts.scoredPairs++;if(candidate.score<thresholds.medium&&!candidate.formulaicCategories?.length){counts.lowScoringRawCandidates++;const key=`${candidate.source.book}|${candidate.target.book}`;lowByBook[key]=(lowByBook[key]||0)+1;if(lowSample.length<100)lowSample.push({id:candidate.id,source:candidate.source.id,target:candidate.target.id,score:candidate.score});continue}if(candidate.score<thresholds.medium)counts.formulaicAuditCandidatesRetained++;const overlap=matchingUbsOverlap(candidate,ubsIndex);candidate.matchingUbsGroupIds=[...overlap.groups];candidate.matchingUbsEventIds=[...overlap.events];candidate.overlapsUbsGroup=overlap.groups.size>0;retained.push(candidate);if(candidate.score>=thresholds.high)counts.highRetainedCandidates++;else if(candidate.score>=thresholds.medium)counts.mediumRetainedCandidates++}
      if(retained.length>limits.maxRetainedPerPartition){const sourceCounts=new Map();for(const candidate of retained)sourceCounts.set(candidate.source.book,(sourceCounts.get(candidate.source.book)||0)+1);const largestSource=[...sourceCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];throw Error(`Greek reuse safety limit exceeded: partition=${book}; retained=${retained.length}; thresholds=${JSON.stringify(thresholds)}; heapUsed=${process.memoryUsage().heapUsed}; largestSourceBook=${largestSource?.[0]||'unknown'} (${largestSource?.[1]||0}); largestTargetBook=${book}; increase partition granularity after inspecting candidate distribution; final candidates were not truncated.`)}
      if((windowIndex+1)%progressInterval===0)tracker?.sample('production-progress',{processed:windowIndex+1,retained:retained.length,targetBook:book});
    }
    maxRetainedCandidates=Math.max(maxRetainedCandidates,retained.length);const clusters=clusterGreekCandidates(retained);counts.clusteredRepresentatives+=clusters.length;counts.nestedAlternativesRemoved+=retained.length-clusters.length;
    const bySourceBook=new Map();for(const cluster of clusters){const candidate=cluster.representative,groups=new Set(candidate.matchingUbsGroupIds),compact=compactCandidate(candidate,groups,candidate.score>=thresholds.high?'high':candidate.score>=thresholds.medium?'medium':'low-formulaic',cluster.alternatives.map(item=>item.id));summaries.push(compact);const lines=bySourceBook.get(compact.source.book)||[];lines.push(JSON.stringify(compact));bySourceBook.set(compact.source.book,lines)}
    for(const [sourceBook,lines] of [...bySourceBook].sort(([a],[b])=>a.localeCompare(b))){const path=resolve(tempDirectory,`${sourceBook}.jsonl`);await appendFile(path,`${lines.sort().join('\n')}\n`);const size=(await stat(path)).size;if(size>limits.maxTempFileBytes)throw Error(`Greek reuse temporary output limit exceeded: partition=${book}; sourceBook=${sourceBook}; bytes=${size}; retained=${retained.length}; thresholds=${JSON.stringify(thresholds)}; split source-book output before retrying.`)}
    const after=process.memoryUsage().heapUsed;maxPartitionHeapGrowth=Math.max(maxPartitionHeapGrowth,Math.max(0,after-before));tracker?.sample('production-partition-complete',{processed:windows.length,retained:clusters.length,targetBook:book});
  }
  summaries.sort((a,b)=>a.id.localeCompare(b.id));lowSample.sort((a,b)=>a.id.localeCompare(b.id));return {summaries,counts,lowAudit:{sample:lowSample,countsBySourceTargetBook:lowByBook},maxRetainedCandidates,maxPartitionHeapGrowth};
}

export async function readCandidateJsonl(path){const text=await readFile(path,'utf8');return text.split('\n').filter(Boolean).map(line=>JSON.parse(line)).sort((a,b)=>a.id.localeCompare(b.id))}
export async function writeJsonChecked(path,value,maxBytes){const text=JSON.stringify(value);if(Buffer.byteLength(text)>maxBytes)throw Error(`Greek reuse output limit exceeded: path=${path}; bytes=${Buffer.byteLength(text)}; limit=${maxBytes}; split this output before retrying.`);await writeFile(path,text);return text}
