import {describe,expect,it} from 'vitest';
// @ts-expect-error JavaScript build module intentionally has no declaration file.
import {flattenBsbVerseContent,parseBsbComplete,passageText} from '../scripts/parse-bsb.mjs';
// @ts-expect-error JavaScript build module intentionally has no declaration file.
import {OPENBIBLE_BOOKS} from '../scripts/openbible-config.mjs';

describe('BSB complete JSON parser',()=>{
  const fixture={books:[{id:'GEN',chapters:[{chapter:{number:1,content:[
    {type:'heading',content:['Creation']},
    {type:'verse',number:1,content:['In the ',{type:'emphasis',content:['beginning']},{type:'note',content:['omit me']},{type:'lineBreak'},' God created.']}
  ]}}]}]};
  it('reads the real nested shape and excludes non-verse metadata',()=>{
    const verses=parseBsbComplete(fixture,{validate:false});
    expect(verses.get('openbible:GEN.1.1')?.text).toBe('In the beginning God created.');
    expect(verses.size).toBe(1);
  });
  it('flattens legitimate inline formatting and ignores notes',()=>{
    expect(flattenBsbVerseContent(['A',{type:'bold',content:[' B ']},{type:'footnote',content:['hidden']}])).toBe('A B');
  });
  it('joins multi-verse passage text in canonical order',()=>{
    const registry=new Map([
      ['openbible:EXO.34.7',{id:'openbible:EXO.34.7',book:'EXO',chapter:34,verse:7,text:'second'}],
      ['openbible:EXO.34.6',{id:'openbible:EXO.34.6',book:'EXO',chapter:34,verse:6,text:'first'}]
    ]);
    expect(passageText(registry,{bookId:'EXO',startChapter:34,startVerse:6,endChapter:34,endVerse:7})).toMatchObject({text:'first second',complete:true,available:2});
  });
  it('validates 66 books, a plausible registry size, and known verse text',()=>{
    const knownChapters:Record<string,number>={LEV:19,PSA:110,JHN:3};
    const complete={books:OPENBIBLE_BOOKS.map((book:{id:string})=>({id:book.id,chapters:[{chapter:{number:knownChapters[book.id]||1,content:Array.from({length:460},(_,index)=>({type:'verse',number:index+1,content:[`${book.id} text ${index+1}`]}))}}]}))};
    const verses=parseBsbComplete(complete);
    expect(verses.size).toBeGreaterThan(30000);
    for(const id of ['openbible:GEN.1.1','openbible:LEV.19.18','openbible:PSA.110.1','openbible:JHN.3.16'])expect(verses.get(id)?.text).toBeTruthy();
  });
  it('rejects an implausibly small production registry',()=>expect(()=>parseBsbComplete(fixture)).toThrow(/Expected 66 BSB books|implausibly small/));
});
