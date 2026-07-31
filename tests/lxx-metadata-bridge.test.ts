import {readFile} from 'node:fs/promises';
import {describe,expect,it} from 'vitest';
import {analyzeFormulaicCandidate} from '../scripts/formulaic-greek.mjs';
import {buildUbsOverlapIndex} from '../scripts/greek-reuse-pipeline.mjs';
import {getLxxBookMetadata,LXX_BOOKS,lxxNativeBookId,lxxToUbsBookId,validateLxxInventory} from '../scripts/lxx-book-metadata.mjs';
import {createVersificationBridge,mapLxxVerse,mappedDisplayReference} from '../scripts/lxx-versification-bridge.mjs';

const actualIds=['GEN','EXOD','LEV','NUM','DEUT','JOSH','JUDG','RUTH','1SAM','2SAM','1KGS','2KGS','1CH','2CH','1ESDR','2ESDR','ESTH','JDT','TOBBA','TOBS','1MAC','2MAC','3MAC','4MAC','PS','OD','PROV','QOH','CANT','JOB','WIS','SIR','PSSOL','HOS','AMOS','MIC','JOEL','OBAD','JONAH','NAH','HAB','ZEPH','HAG','ZECH','MAL','ISA','JER','BAR','LAM','EPJ','EZEK','SUS','SUSTH','DAN','DANTH','BEL','BELTH'];

describe('CenterBLC LXX metadata',()=>{
 it('covers all 57 native IDs and preserves them in Layer D',()=>{expect(LXX_BOOKS).toHaveLength(57);expect(()=>validateLxxInventory(actualIds)).not.toThrow();expect(lxxNativeBookId('EXOD')).toBe('EXOD');expect(lxxNativeBookId('PS')).toBe('PS');expect(()=>lxxNativeBookId('UNKNOWN')).toThrow(/Unknown CenterBLC/)});
 it('maps safely comparable native books without renaming native IDs',()=>{expect(lxxToUbsBookId('EXOD')).toBe('EXO');expect(lxxToUbsBookId('DEUT')).toBe('DEU');expect(lxxToUbsBookId('JOSH')).toBe('JOS');expect(lxxToUbsBookId('JUDG')).toBe('JDG');expect(lxxToUbsBookId('PS')).toBe('PSA');expect(lxxToUbsBookId('EZEK')).toBe('EZK');expect(lxxToUbsBookId('ZECH')).toBe('ZEC')});
 it('classifies derivative, uncertain, alternate, and Catholic materials explicitly',()=>{expect(getLxxBookMetadata('OD').directionalEligibility).toBe('ineligible');expect(getLxxBookMetadata('4MAC')).toMatchObject({displayName:'4 Maccabees',directionalEligibility:'uncertain',catholicCanonical:false});expect(getLxxBookMetadata('TOBBA').corpusCategory).toBe('alternate-recension');expect(getLxxBookMetadata('WIS').corpusCategory).toBe('catholic-deuterocanonical')});
});

describe('LXX versification bridge',()=>{
 it('maps Psalm 109:1 explicitly without changing its native identity',()=>{const mapping=mapLxxVerse('PS',109,1);expect(mapping.targets).toEqual([expect.objectContaining({book:'PSA',chapter:110,verse:1})]);expect(mappedDisplayReference('PS',109,1)).toContain('commonly Psalm 110:1')});
 it('supports one-to-many and many-to-one explicit records',()=>{const bridge=createVersificationBridge([{source:{book:'X',chapter:1,verse:1},targets:[{book:'Y',chapter:2,verse:1},{book:'Y',chapter:2,verse:2}]},{source:{book:'X',chapter:1,verse:2},targets:[{book:'Y',chapter:2,verse:2}]}]);expect(bridge.mapSource('X',1,1)).toHaveLength(2);expect(bridge.mapTarget('Y',2,2)).toHaveLength(2);expect(bridge.mapSource('X',9,9)).toBeNull()});
});

describe('UBS benchmark accounting',()=>{
 it('keeps event and group denominators separate with corrected native mappings',()=>{const events=Array.from({length:12},(_,index)=>({id:`event-${index}`,groupId:`group-${Math.floor(index/2)}`,sourcePassage:{bookId:'EXO',verseIds:[`quotations:EXO.20.${index+1}`]},targetPassage:{bookId:'MAT',verseIds:[`quotations:MAT.5.${index+1}`]}})),index=buildUbsOverlapIndex(events,{lxxVerseIds:Array.from({length:12},(_,index)=>`greek-reuse-lxx:EXOD.20.${index+1}`)});expect(index.mappedEvents.size).toBe(12);expect(index.mappedGroups.size).toBe(6);expect(index.totalEvents).toBe(12);expect(index.unmappedEvents).toHaveLength(0)});
});

describe('formulaic evidence and UI regression',()=>{
 it('preserves raw similarity while adjusting a 4 Maccabees-style doxology',()=>{const candidate={score:.9,sharedLemmas:['δοξα','εις','αιων','αμην'],source:{lemmaTokens:['δοξα','εις','αιων','αιων','αμην']},target:{lemmaTokens:['δοξα','εις','αιων','αιων','αμην']}};const result=analyzeFormulaicCandidate(candidate);expect(result.rawSimilarityScore).toBe(.9);expect(result.adjustedSimilarityScore).toBeLessThan(.9);expect(result.formulaicOnly).toBe(true);expect(result.formulaicCategories).toContain('doxology-forever-amen')});
 it('uses defined theme variables for the active passage/verse toggle',async()=>{const css=await readFile('src/styles/main.css','utf8');expect(css).toContain('button[aria-pressed=true]{background:var(--wine);color:var(--surface);border-color:var(--wine)');expect(css).not.toContain('var(--accent)')});
});
