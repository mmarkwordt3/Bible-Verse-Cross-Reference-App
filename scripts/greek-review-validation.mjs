export const REVIEW_STATUSES=['pending','reviewed','skipped'];
export const REVIEW_KINDS=['triage','expert'];
export const TRIAGE_OUTCOMES=['externally-supported','contextually-plausible','likely-common-language','likely-unrelated','expert-review-required','cannot-assess'];
export const RELATIONSHIP_TYPES=['explicit-quotation','close-verbal-reuse','probable-allusion','possible-echo','formulaic-common-expression','unrelated-false-positive','uncertain'];
export const CHRONOLOGY_CONFIDENCES=['direction-certain','direction-probable','direction-disputed','shared-earlier-tradition-possible','direction-unknown'];
const iso=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&!Number.isNaN(Date.parse(value));
const sized=(value,max)=>typeof value==='string'&&value.length<=max;

/** @param {any} data @param {{candidateIds?: Set<string>, algorithmVersion?: string, allowPending?: boolean}} [options] */
export function validateReviewData(data,options={}){
  const {candidateIds,algorithmVersion,allowPending=false}=options;
  const errors=[],at=(message,id)=>errors.push(`${id?`candidate ${id}`:'top level'}: ${message}`);
  if(!data||typeof data!=='object'||Array.isArray(data))return ['top level: expected a JSON object'];
  if(data.schemaVersion!==2)at('schemaVersion must be 2');
  if(data.layerId!=='greek-reuse'&&data.layer!=='greek-reuse')at('layerId must be greek-reuse');
  if(typeof data.algorithmVersion!=='string')at('algorithmVersion is required');
  if(!iso(data.datasetGeneratedAt))at('datasetGeneratedAt must be a canonical ISO timestamp');
  if(!Array.isArray(data.reviews)){at('reviews must be an array');return errors}
  const seen=new Set();
  for(const [index,review] of data.reviews.entries()){
    const id=review?.candidateId||`record ${index+1}`;
    if(typeof review?.candidateId!=='string'||!review.candidateId)at('candidateId is required',id);
    else if(seen.has(id))at('duplicate review record',id); else seen.add(id);
    if(candidateIds&&!candidateIds.has(review?.candidateId))at('unknown candidate ID',id);
    if(typeof review?.algorithmVersion!=='string')at('algorithmVersion is required',id);
    else if(algorithmVersion&&review.algorithmVersion!==algorithmVersion&&review.historicalAlgorithmVersion!==true)at(`algorithm version ${review.algorithmVersion} does not match ${algorithmVersion}; set historicalAlgorithmVersion true only for intentionally retained historical reviews`,id);
    if(!REVIEW_STATUSES.includes(review?.reviewStatus))at('invalid reviewStatus',id);
    if(review?.reviewStatus==='pending'&&!allowPending&&!review?.allowPublishedPending)at('published pending records are not permitted',id);
    if(!REVIEW_KINDS.includes(review?.reviewKind))at('invalid reviewKind',id);
    if(review?.reviewKind==='triage'&&review?.reviewStatus==='reviewed'){if(!TRIAGE_OUTCOMES.includes(review?.triageOutcome))at('invalid triageOutcome',id);if(!Number.isInteger(review?.triageConfidence)||review.triageConfidence<1||review.triageConfidence>5)at('triageConfidence must be 1–5',id)}
    if(review?.reviewKind==='expert'&&review?.reviewStatus==='reviewed'){if(!RELATIONSHIP_TYPES.includes(review?.relationshipType))at('invalid relationshipType',id);if(!Number.isInteger(review?.reviewerConfidence)||review.reviewerConfidence<1||review.reviewerConfidence>5)at('reviewerConfidence must be 1–5',id);if(!CHRONOLOGY_CONFIDENCES.includes(review?.chronologyConfidence))at('invalid chronologyConfidence',id)}
    if(review?.independenceGroup!==undefined&&!sized(review?.independenceGroup,120))at('independenceGroup must be a string of at most 120 characters',id);
    if(review?.notes!==undefined&&!sized(review?.notes,10000))at('notes must be a string of at most 10,000 characters',id);
    if(review?.reviewerLabel!==undefined&&!sized(review.reviewerLabel,120))at('reviewerLabel must be at most 120 characters',id);
    if(!iso(review?.reviewedAt))at('reviewedAt must be a canonical ISO timestamp',id);
    if(!iso(review?.updatedAt))at('updatedAt must be a canonical ISO timestamp',id);
    if(!Array.isArray(review?.supportingSources))at('supportingSources must be an array',id);
    else review.supportingSources.forEach((source,sourceIndex)=>{
      if(!source||typeof source!=='object'||!sized(source.citation,1000)||!source.citation)at(`supportingSources[${sourceIndex}].citation is required and limited to 1,000 characters`,id);
      if(!sized(source?.url,2000))at(`supportingSources[${sourceIndex}].url must be a string of at most 2,000 characters`,id);
      if(!sized(source?.notes,4000))at(`supportingSources[${sourceIndex}].notes must be a string of at most 4,000 characters`,id);
    });
  }
  return errors;
}
