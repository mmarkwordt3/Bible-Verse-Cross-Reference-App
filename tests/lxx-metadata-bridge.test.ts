import {readFile} from 'node:fs/promises';
import {describe,expect,it} from 'vitest';
import {analyzeFormulaicCandidate} from '../scripts/formulaic-greek.mjs';
import {buildUbsOverlapIndex} from '../scripts/greek-reuse-pipeline.mjs';
import {getLxxBookMetadata,LXX_BOOKS,lxxNativeBookId,lxxToUbsBookId,normalizeCenterBlcBookId,validateLxxInventory} from '../scripts/lxx-book-metadata.mjs';
import {createVersificationBridge,mapLxxVerse,mappedDisplayReference} from '../scripts/lxx-versification-bridge.mjs';

const confirmedCenterBlcNativeIds=['GEN','EXOD','LEV','NUM','DEUT','JOSH','JUDG','RUT','1SAM','2SAM','1KGS','2KGS','1CHR','2CHR','1ESDR','2ESDR','ESTH','JDT','TOBBA','TOBS','1MAC','2MAC','3MAC','4MAC','PS','OD','PROV','QOH','CANT','JOB','WIS','SIR','PSSOL','HOS','MIC','AMO','JOL','JONAH','OBAD','NAH','HAB','ZEPH','HAG','ZECH','MAL','ISA','JER','BAR','EPJER','LAM','EZEK','BEL','BELTH','DAN','DANTH','SUS','SUSTH'];
const correctedIds=['RUT','1CHR','2CHR','AMO','JOL','EPJER'];
const formerIds=['RUTH','1CH','2CH','AMOS','JOEL','EPJ'];

describe('CenterBLC LXX metadata',()=>{
 it('covers the confirmed 57-book production inventory exactly',()=>{const primaryIds=LXX_BOOKS.map(book=>book.nativeId);expect(LXX_BOOKS).toHaveLength(57);expect(new Set(primaryIds).size).toBe(57);expect(primaryIds).toEqual(confirmedCenterBlcNativeIds);expect(()=>validateLxxInventory(confirmedCenterBlcNativeIds)).not.toThrow();for(const id of correctedIds)expect(lxxNativeBookId(id)).toBe(id);for(const id of formerIds)expect(primaryIds).not.toContain(id)});
 it('normalizes real mixed-case Text-Fabric tokens through explicit source mappings',()=>{expect(['Ruth','1Chr','2Chr','Amos','Joel','EpJer'].map(normalizeCenterBlcBookId)).toEqual(correctedIds)});
 it('keeps former invented IDs as compatibility aliases only',()=>{expect(formerIds.map(lxxNativeBookId)).toEqual(correctedIds)});
 it('reports the complete inventory mismatch before downstream processing',()=>{expect(()=>validateLxxInventory(['1Chr','UnknownBook'])).toThrow(/Unknown raw IDs: UnknownBook.*Unknown normalized IDs: UNKNOWNBOOK.*Metadata IDs not observed:.*Full observed inventory:.*Full expected inventory:/)});
 it('maps safely comparable native books without renaming native IDs',()=>{expect(lxxToUbsBookId('EXOD')).toBe('EXO');expect(lxxToUbsBookId('RUT')).toBe('RUT');expect(lxxToUbsBookId('1CHR')).toBe('1CH');expect(lxxToUbsBookId('2CHR')).toBe('2CH');expect(lxxToUbsBookId('AMO')).toBe('AMO');expect(lxxToUbsBookId('JOL')).toBe('JOL');expect(lxxToUbsBookId('EPJER')).toBeNull();expect(lxxToUbsBookId('PS')).toBe('PSA');expect(lxxToUbsBookId('EZEK')).toBe('EZK');expect(lxxToUbsBookId('ZECH')).toBe('ZEC')});
 it('classifies derivative, uncertain, alternate, and Catholic materials explicitly',()=>{expect(getLxxBookMetadata('OD').directionalEligibility).toBe('ineligible');expect(getLxxBookMetadata('4MAC')).toMatchObject({displayName:'4 Maccabees',directionalEligibility:'uncertain',catholicCanonical:false});expect(getLxxBookMetadata('TOBBA').corpusCategory).toBe('alternate-recension');expect(getLxxBookMetadata('WIS').corpusCategory).toBe('catholic-deuterocanonical')});
 it('rejects unknown individual CenterBLC IDs',()=>{expect(()=>lxxNativeBookId('UNKNOWN')).toThrow(/Unknown CenterBLC/)});
});

describe('LXX versification bridge',()=>{
 it('maps Psalm 109:1 explicitly without changing its native identity',()=>{const mapping=mapLxxVerse('PS',109,1);expect(mapping.targets).toEqual([expect.objectContaining({book:'PSA',chapter:110,verse:1})]);expect(mappedDisplayReference('PS',109,1)).toContain('commonly Psalm 110:1')});
 it('uses the corrected native Joel ID for its explicit bridge',()=>{expect(mapLxxVerse('JOL',3,4).targets).toEqual([expect.objectContaining({book:'JOL',chapter:2,verse:31})])});
 it('supports one-to-many and many-to-one explicit records',()=>{const bridge=createVersificationBridge([{source:{book:'X',chapter:1,verse:1},targets:[{book:'Y',chapter:2,verse:1},{book:'Y',chapter:2,verse:2}]},{source:{book:'X',chapter:1,verse:2},targets:[{book:'Y',chapter:2,verse:2}]}]);expect(bridge.mapSource('X',1,1)).toHaveLength(2);expect(bridge.mapTarget('Y',2,2)).toHaveLength(2);expect(bridge.mapSource('X',9,9)).toBeNull()});
});

describe('UBS benchmark accounting',()=>{
 it('keeps event and group denominators separate with corrected native mappings',()=>{const events=Array.from({length:12},(_,index)=>({id:`event-${index}`,groupId:`group-${Math.floor(index/2)}`,sourcePassage:{bookId:'EXO',verseIds:[`quotations:EXO.20.${index+1}`]},targetPassage:{bookId:'MAT',verseIds:[`quotations:MAT.5.${index+1}`]}})),index=buildUbsOverlapIndex(events,{lxxVerseIds:Array.from({length:12},(_,index)=>`greek-reuse-lxx:EXOD.20.${index+1}`)});expect(index.mappedEvents.size).toBe(12);expect(index.mappedGroups.size).toBe(6);expect(index.totalEvents).toBe(12);expect(index.unmappedEvents).toHaveLength(0)});
});

describe('formulaic evidence and UI regression',()=>{
 it('preserves raw similarity while adjusting a 4 Maccabees-style doxology',()=>{const candidate={score:.9,sharedLemmas:['δοξα','εις','αιων','αμην'],source:{lemmaTokens:['δοξα','εις','αιων','αιων','αμην']},target:{lemmaTokens:['δοξα','εις','αιων','αιων','αμην']}};const result=analyzeFormulaicCandidate(candidate);expect(result.rawSimilarityScore).toBe(.9);expect(result.adjustedSimilarityScore).toBeLessThan(.9);expect(result.formulaicOnly).toBe(true);expect(result.formulaicCategories).toContain('doxology-forever-amen')});
 it('uses defined theme variables for the active passage/verse toggle',async()=>{const css=await readFile('src/styles/main.css','utf8');expect(css).toContain('button[aria-pressed=true]{background:var(--wine);color:var(--surface);border-color:var(--wine)');expect(css).not.toContain('var(--accent)')});
});
