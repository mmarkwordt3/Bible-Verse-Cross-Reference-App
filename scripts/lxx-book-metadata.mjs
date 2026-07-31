export const LXX_BOOK_METADATA_VERSION='centerblc-1935-books-v2';

const books=[
 ['GEN','Genesis','protocanonical','eligible','GEN','GEN',true],['EXOD','Exodus','protocanonical','eligible','EXO','EXO',true],['LEV','Leviticus','protocanonical','eligible','LEV','LEV',true],['NUM','Numbers','protocanonical','eligible','NUM','NUM',true],['DEUT','Deuteronomy','protocanonical','eligible','DEU','DEU',true],['JOSH','Joshua','protocanonical','eligible','JOS','JOS',true],['JUDG','Judges','protocanonical','eligible','JDG','JDG',true],['RUT','Ruth','protocanonical','eligible','RUT','RUT',true],['1SAM','1 Samuel','protocanonical','eligible','1SA','1SA',true],['2SAM','2 Samuel','protocanonical','eligible','2SA','2SA',true],['1KGS','1 Kings','protocanonical','eligible','1KI','1KI',true],['2KGS','2 Kings','protocanonical','eligible','2KI','2KI',true],['1CHR','1 Chronicles','protocanonical','eligible','1CH','1CH',true],['2CHR','2 Chronicles','protocanonical','eligible','2CH','2CH',true],
 ['1ESDR','1 Esdras','other-jewish-septuagintal','uncertain',null,null,false,'No safe UBS/BSB identity mapping'],['2ESDR','2 Esdras','chronology-uncertain','uncertain',null,null,false,'Composite tradition; no safe identity mapping'],['ESTH','Esther','protocanonical','eligible','EST','EST',true],['JDT','Judith','catholic-deuterocanonical','eligible',null,null,true,'UBS quotation corpus has no stable Judith mapping'],
 ['TOBBA','Tobit (Vaticanus recension)','alternate-recension','uncertain',null,null,true,'Alternate Tobit recension ambiguity'],['TOBS','Tobit (Sinaiticus recension)','alternate-recension','uncertain',null,null,true,'Alternate Tobit recension ambiguity'],['1MAC','1 Maccabees','catholic-deuterocanonical','eligible',null,null,true,'Not covered by the UBS/BSB registry'],['2MAC','2 Maccabees','catholic-deuterocanonical','eligible',null,null,true,'Not covered by the UBS/BSB registry'],['3MAC','3 Maccabees','other-jewish-septuagintal','uncertain',null,null,false,'Chronology and directional use are uncertain'],['4MAC','4 Maccabees','other-jewish-septuagintal','uncertain',null,null,false,'Chronology and formulaic reuse require cautious interpretation'],
 ['PS','Psalms','protocanonical','eligible','PSA','PSA',true],['OD','Odes','christian-liturgical-or-derivative','ineligible',null,null,false,'Collection includes New Testament-derived canticles'],['PROV','Proverbs','protocanonical','eligible','PRO','PRO',true],['QOH','Ecclesiastes','protocanonical','eligible','ECC','ECC',true],['CANT','Song of Songs','protocanonical','eligible','SNG','SNG',true],['JOB','Job','protocanonical','eligible','JOB','JOB',true],['WIS','Wisdom of Solomon','catholic-deuterocanonical','eligible',null,null,true,'Not covered by the UBS/BSB registry'],['SIR','Sirach','catholic-deuterocanonical','eligible',null,null,true,'Not covered by the UBS/BSB registry'],['PSSOL','Psalms of Solomon','other-jewish-septuagintal','uncertain',null,null,false,'Chronology is uncertain'],
 ['HOS','Hosea','protocanonical','eligible','HOS','HOS',true],['MIC','Micah','protocanonical','eligible','MIC','MIC',true],['AMO','Amos','protocanonical','eligible','AMO','AMO',true],['JOL','Joel','protocanonical','eligible','JOL','JOL',true],['JONAH','Jonah','protocanonical','eligible','JON','JON',true],['OBAD','Obadiah','protocanonical','eligible','OBA','OBA',true],['NAH','Nahum','protocanonical','eligible','NAM','NAM',true],['HAB','Habakkuk','protocanonical','eligible','HAB','HAB',true],['ZEPH','Zephaniah','protocanonical','eligible','ZEP','ZEP',true],['HAG','Haggai','protocanonical','eligible','HAG','HAG',true],['ZECH','Zechariah','protocanonical','eligible','ZEC','ZEC',true],['MAL','Malachi','protocanonical','eligible','MAL','MAL',true],
 ['ISA','Isaiah','protocanonical','eligible','ISA','ISA',true],['JER','Jeremiah','protocanonical','eligible','JER','JER',true],['BAR','Baruch','catholic-deuterocanonical','eligible',null,null,true,'Not covered by the UBS/BSB registry'],['EPJER','Epistle of Jeremiah','catholic-deuterocanonical','eligible',null,null,true,'Not covered by the UBS/BSB registry'],['LAM','Lamentations','protocanonical','eligible','LAM','LAM',true],['EZEK','Ezekiel','protocanonical','eligible','EZK','EZK',true],
 ['BEL','Bel and the Dragon (Old Greek)','alternate-recension','uncertain',null,null,true,'Alternate Daniel recension ambiguity'],['BELTH','Bel and the Dragon (Theodotion)','alternate-recension','uncertain',null,null,true,'Alternate Daniel recension ambiguity'],['DAN','Daniel (Old Greek)','alternate-recension','uncertain',null,null,true,'Alternate Daniel recension ambiguity'],['DANTH','Daniel (Theodotion)','alternate-recension','uncertain',null,null,true,'Alternate Daniel recension ambiguity'],['SUS','Susanna (Old Greek)','alternate-recension','uncertain',null,null,true,'Alternate Daniel recension ambiguity'],['SUSTH','Susanna (Theodotion)','alternate-recension','uncertain',null,null,true,'Alternate Daniel recension ambiguity'],
];

export const LXX_BOOKS=Object.freeze(books.map(([nativeId,displayName,corpusCategory,directionalEligibility,ubsBookId,bsbBookId,catholicCanonical,reasonNotMapped],canonicalOrder)=>Object.freeze({nativeId,nativeName:nativeId,displayName,historicalDisplayName:displayName,canonicalOrder:canonicalOrder+1,corpusCategory,directionalEligibility,ubsBookId:ubsBookId||undefined,bsbBookId:bsbBookId||undefined,catholicCanonical,reasonNotMapped:reasonNotMapped||undefined})));

const byId=new Map(LXX_BOOKS.map(book=>[book.nativeId,book]));
export const LXX_LEGACY_BOOK_ALIASES=Object.freeze({RUTH:'RUT','1CH':'1CHR','2CH':'2CHR',AMOS:'AMO',JOEL:'JOL',EPJ:'EPJER'});
export const CENTERBLC_RAW_BOOK_IDS=Object.freeze({Ruth:'RUT','1Chr':'1CHR','2Chr':'2CHR',Amos:'AMO',Joel:'JOL',EpJer:'EPJER'});

const normalizeToken=value=>String(value).trim().toUpperCase();
const primaryId=value=>{
 const raw=String(value).trim();
 return CENTERBLC_RAW_BOOK_IDS[raw]||LXX_LEGACY_BOOK_ALIASES[normalizeToken(raw)]||normalizeToken(raw);
};

export function normalizeCenterBlcBookId(rawId){const normalized=primaryId(rawId);if(!byId.has(normalized))throw Error(`Unknown CenterBLC LXX book ID: ${rawId}`);return normalized}
export function getLxxBookMetadata(nativeId){const metadata=byId.get(primaryId(nativeId));if(!metadata)throw Error(`Unknown CenterBLC LXX book ID: ${nativeId}`);return metadata}
export function lxxNativeBookId(value){return getLxxBookMetadata(value).nativeId}
export function lxxToUbsBookId(value){return getLxxBookMetadata(value).ubsBookId||null}
export function lxxToBsbBookId(value){return getLxxBookMetadata(value).bsbBookId||null}

export function validateLxxInventory(rawIds){
 const observedRaw=[...new Set(rawIds.map(value=>String(value).trim()))].sort();
 const normalized=observedRaw.map(rawId=>({rawId,normalizedId:primaryId(rawId)}));
 const unknown=normalized.filter(item=>!byId.has(item.normalizedId));
 const observedIds=[...new Set(normalized.filter(item=>byId.has(item.normalizedId)).map(item=>item.normalizedId))].sort();
 const expectedIds=LXX_BOOKS.map(book=>book.nativeId).sort();
 const missing=expectedIds.filter(id=>!observedIds.includes(id));
 if(unknown.length||missing.length){
  throw Error(`CenterBLC LXX inventory mismatch before window generation. Unknown raw IDs: ${unknown.map(item=>item.rawId).join(', ')||'(none)'}. Unknown normalized IDs: ${unknown.map(item=>item.normalizedId).join(', ')||'(none)'}. Metadata IDs not observed: ${missing.join(', ')||'(none)'}. Full observed inventory: ${observedRaw.join(', ')}. Full expected inventory: ${expectedIds.join(', ')}`);
 }
 return normalized.map(item=>getLxxBookMetadata(item.normalizedId));
}
