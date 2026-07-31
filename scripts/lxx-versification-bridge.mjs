import {lxxToBsbBookId,lxxToUbsBookId} from './lxx-book-metadata.mjs';
export const LXX_VERSIFICATION_BRIDGE_VERSION='explicit-lxx-ubs-v1';
export const LXX_VERSIFICATION_PROVENANCE='Scripture Index explicit crosswalk; reviewed native Rahlfs/CenterBLC and UBS/USFM reference pairs. Identity mappings are limited to books without a known chapter-level numbering conflict.';
const complexBooks=new Set(['PS','JER','JOL','MAL','DAN','DANTH','SUS','SUSTH','BEL','BELTH']);
const explicit=new Map([
 ['PS.8.6',[{book:'PSA',chapter:8,verse:6}]],
 ['PS.109.1',[{book:'PSA',chapter:110,verse:1,displayLabel:'LXX Psalm 109:1; commonly Psalm 110:1'}]],
 ['JOL.3.4',[{book:'JOL',chapter:2,verse:31,displayLabel:'LXX Joel 3:4; commonly Joel 2:31'}]],
]);
const key=(book,chapter,verse)=>`${book}.${chapter}.${verse}`;
/**
 * @typedef {{book:string,chapter:number,verse:number}} BridgeReference
 * @typedef {{source:BridgeReference,targets:BridgeReference[]}} BridgeRecord
 */
/** @param {BridgeRecord[]} records */
export function createVersificationBridge(records){const forward=new Map(),reverse=new Map();for(const record of records){const source=key(record.source.book,record.source.chapter,record.source.verse),targets=record.targets.map(target=>({...target}));forward.set(source,targets);for(const target of targets){const targetKey=key(target.book,target.chapter,target.verse),sources=reverse.get(targetKey)||[];sources.push({...record.source});reverse.set(targetKey,sources)}}return {forward,reverse,mapSource:(book,chapter,verse)=>forward.get(key(book,chapter,verse))||null,mapTarget:(book,chapter,verse)=>reverse.get(key(book,chapter,verse))||null}}
export function mapLxxVerse(nativeBook,chapter,verse,target='ubs'){
 const special=explicit.get(key(nativeBook,chapter,verse));if(special)return {targets:special,provenance:LXX_VERSIFICATION_PROVENANCE,explicit:true};
 const mappedBook=target==='bsb'?lxxToBsbBookId(nativeBook):lxxToUbsBookId(nativeBook);if(!mappedBook)return {targets:[],reason:'Unknown UBS book mapping',provenance:LXX_VERSIFICATION_PROVENANCE};
 if(complexBooks.has(nativeBook))return {targets:[],reason:'Missing verse-level crosswalk',provenance:LXX_VERSIFICATION_PROVENANCE};
 return {targets:[{book:mappedBook,chapter,verse}],provenance:LXX_VERSIFICATION_PROVENANCE,explicit:false};
}
export function mappedDisplayReference(nativeBook,chapter,verse){const mapping=mapLxxVerse(nativeBook,chapter,verse,'bsb');return mapping.targets[0]?.displayLabel||null}
