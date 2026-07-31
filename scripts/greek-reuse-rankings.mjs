export function buildGreekRankings(clusters,thresholds){const map=new Map();for(const cluster of clusters){const candidate=cluster.representative;if(candidate.score<thresholds.medium)continue;const source=candidate.source,entry=map.get(source.id)||{...source,candidates:[],targetBooks:new Set(),targetPassages:new Set(),ubsCount:0,ngramCount:0,rareLemmas:new Set(),scoreSum:0,maximumScore:0,maximumSharedContentLemmaCount:0,highCount:0,mediumOrHigherCount:0,rawHighCount:0,formulaicCount:0,formulaicOnlyCount:0,eligibleCount:0};entry.candidates.push(candidate.id);const directionallyEligible=source.bookMetadata?.directionalEligibility==='eligible',defaultEligible=directionallyEligible&&!candidate.formulaicOnly;if(defaultEligible){entry.mediumOrHigherCount++;entry.targetBooks.add(candidate.target.book);entry.targetPassages.add(candidate.target.id);entry.scoreSum+=candidate.score;entry.maximumScore=Math.max(entry.maximumScore,candidate.score)}if(defaultEligible&&candidate.score>=thresholds.high)entry.highCount++;if(candidate.rawSimilarityScore>=thresholds.high)entry.rawHighCount++;if(candidate.formulaicCategories?.length)entry.formulaicCount++;if(candidate.formulaicOnly)entry.formulaicOnlyCount++;if(directionallyEligible)entry.eligibleCount++;if(candidate.overlapsUbsGroup)entry.ubsCount++;if(candidate.exactNgrams.length)entry.ngramCount++;candidate.sharedRareLemmas.forEach(x=>entry.rareLemmas.add(x));entry.maximumSharedContentLemmaCount=Math.max(entry.maximumSharedContentLemmaCount,candidate.sharedLemmas.length);map.set(source.id,entry)}const rows=[...map.values()].map(x=>({...x,distinctNtBookCount:x.targetBooks.size,distinctNtTargetPassageCount:x.targetPassages.size,meanScore:x.scoreSum/x.candidates.length,directionalEligibility:x.bookMetadata?.directionalEligibility||'uncertain',corpusCategory:x.bookMetadata?.corpusCategory||'chronology-uncertain',displayName:x.bookMetadata?.displayName||x.book,rawHighCount:x.rawHighCount,formulaicCount:x.formulaicCount,formulaicOnlyCount:x.formulaicOnlyCount,directionallyEligibleCandidateCount:x.eligibleCount,ubsOverlapCount:x.ubsCount,exactNgramOccurrenceCount:x.ngramCount,distinctSharedRareLemmaCount:x.rareLemmas.size,targetBooks:[...x.targetBooks]})).sort((a,b)=>b.highCount-a.highCount||b.scoreSum-a.scoreSum||b.distinctNtBookCount-a.distinctNtBookCount||b.maximumScore-a.maximumScore||a.bookOrder-b.bookOrder||a.startChapter-b.startChapter||a.startVerse-b.startVerse||a.id.localeCompare(b.id));let previous;return rows.map((row,index)=>{const rank=index&&row.highCount===rows[index-1].highCount?previous:index+1;previous=rank;return {...row,rank,slug:row.book,modern:row.book,historical:row.book,testament:'Old',deuterocanonical:false,order:row.bookOrder,chapter:row.startChapter,verse:row.startVerse,text:row.originalWords.join(' '),incoming:row.highCount,outgoing:row.mediumOrHigherCount,sourceBooks:row.distinctNtBookCount,originalReference:`${row.book} ${row.startChapter}:${row.startVerse}${row.endChapter!==row.startChapter?`-${row.endChapter}:${row.endVerse}`:row.endVerse!==row.startVerse?`-${row.endVerse}`:''}`,targetPassages:undefined,rareLemmas:undefined}})}

function verseTextLookup(verses){
  if(verses instanceof Map)return verses;
  return new Map((verses||[]).map(verse=>[verse.id,verse.text??verse.originalWords?.join(' ')??verse.words?.map(word=>word.surface).join(' ')??'']));
}

/** Project passage candidates onto their constituent source verses without changing passage rankings. */
export function projectGreekVerses(rankings,candidateById,thresholds,verses){
  const map=new Map(),textByVerse=verseTextLookup(verses);
  for(const passage of rankings)for(const verseId of passage.verseIds){
    const parts=verseId.split('.'),entry=map.get(verseId)||{
      id:verseId,book:passage.book,bookOrder:passage.bookOrder,chapter:Number(parts.at(-2)),verse:Number(parts.at(-1)),
      directionalEligibility:passage.directionalEligibility,corpusCategory:passage.corpusCategory,displayName:passage.displayName,
      passages:new Set(),candidatesByTarget:new Map(),text:textByVerse.get(verseId)??(passage.verseIds.length===1?passage.text:'')
    };
    entry.passages.add(passage.id);
    for(const id of passage.candidates){
      const candidate=candidateById.get(id);if(!candidate?.target?.id)continue;
      const previous=entry.candidatesByTarget.get(candidate.target.id);
      if(!previous||candidate.score>previous.score||(candidate.score===previous.score&&candidate.id.localeCompare(previous.id)<0))entry.candidatesByTarget.set(candidate.target.id,candidate);
    }
    map.set(verseId,entry);
  }
  const rows=[...map.values()].map(entry=>{
    const candidates=[...entry.candidatesByTarget.values()],directionallyEligible=entry.directionalEligibility==='eligible';
    const eligible=candidates.filter(candidate=>directionallyEligible&&!candidate.formulaicOnly),targetBooks=new Set(eligible.map(candidate=>candidate.target.book));
    const highThreshold=thresholds?.high??candidates[0]?.thresholds?.high??Infinity;
    return {...entry,candidatesByTarget:undefined,passages:undefined,candidates:candidates.map(candidate=>candidate.id),
      originalReference:`${entry.book} ${entry.chapter}:${entry.verse}`,startChapter:entry.chapter,startVerse:entry.verse,endChapter:entry.chapter,endVerse:entry.verse,
      formulaicCount:candidates.filter(candidate=>candidate.formulaicCategories?.length).length,
      formulaicOnlyCount:candidates.filter(candidate=>candidate.formulaicOnly).length,
      rawHighCount:candidates.filter(candidate=>(candidate.rawSimilarityScore??candidate.score)>=highThreshold).length,
      mediumOrHigherCount:eligible.length,highCount:eligible.filter(candidate=>candidate.score>=highThreshold).length,
      scoreSum:eligible.reduce((sum,candidate)=>sum+candidate.score,0),maximumScore:Math.max(0,...eligible.map(candidate=>candidate.score)),
      ubsOverlapCount:candidates.filter(candidate=>candidate.overlapsUbsGroup).length,
      exactNgramOccurrenceCount:candidates.filter(candidate=>candidate.exactNgrams?.length).length,
      maximumSharedContentLemmaCount:Math.max(0,...candidates.map(candidate=>candidate.sharedLemmas?.length||0)),
      distinctNtBookCount:targetBooks.size,targetBooks:[...targetBooks],ntOccurrenceCount:eligible.length,sourcePassageCount:entry.passages.size};
  }).sort((a,b)=>b.highCount-a.highCount||b.scoreSum-a.scoreSum||b.distinctNtBookCount-a.distinctNtBookCount||b.maximumScore-a.maximumScore||a.bookOrder-b.bookOrder||a.chapter-b.chapter||a.verse-b.verse||a.id.localeCompare(b.id));
  let previous;return rows.map((row,index)=>{const rank=index&&row.highCount===rows[index-1].highCount?previous:index+1;previous=rank;return {...row,rank}});
}
