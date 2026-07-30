import {afterEach,describe,expect,it} from 'vitest';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {OSIS_TO_USFM,discoverNestleMorph,parseNestleMorph,parseOsisReference,validateNestleMorphStructure} from '../scripts/parse-nestle1904.mjs';
const roots:string[]=[];
const row=(reference:string,surface='Βίβλος')=>`${reference}\t${surface}\tN\tN-NSF\t976\tβίβλος\tβιβλος`;
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})))});
async function root(){const path=await mkdtemp(join(tmpdir(),'nestle-test-'));roots.push(path);return path}

describe('Nestle1904 reference and row parsing',()=>{
  it('accepts space-colon and legacy dot references including numbered books',()=>{expect(parseOsisReference(' Matt 1:1 ')).toEqual({book:'MAT',chapter:1,verse:1});expect(parseOsisReference('1Cor 13:1')).toEqual({book:'1CO',chapter:13,verse:1});expect(parseOsisReference('2Thess 2:1')).toEqual({book:'2TH',chapter:2,verse:1});expect(parseOsisReference('1John.1.1')).toEqual({book:'1JN',chapter:1,verse:1});expect(parseOsisReference('Matt.1.1')).toEqual({book:'MAT',chapter:1,verse:1})});
  it('rejects unknown and malformed references',()=>{expect(parseOsisReference('Unknown 1:1')).toBeNull();expect(parseOsisReference('Matt.1:1')).toBeNull();expect(parseOsisReference('Matt 0:1')).toBeNull()});
  it('preserves BOM-safe CRLF Greek fields, punctuation, empty fields, and source order',()=>{const parsed=parseNestleMorph(`\uFEFF${row('Matt 1:1','Βίβλος,')}\r\n${row('Mark 1:1','λόγος·').replace('\tN\t','\t\t')}\r\n`);expect(parsed.words).toHaveLength(2);expect(parsed.words[0]).toMatchObject({book:'MAT',surface:'Βίβλος,',sourceOrder:0});expect(parsed.words[1]).toMatchObject({book:'MRK',surface:'λόγος·',functionalMorphology:'',sourceOrder:1})});
  it('requires exactly seven tab-delimited columns',()=>{const parsed=parseNestleMorph('Matt 1:1,not,tabs');expect(parsed.words).toHaveLength(0);expect(parsed.invalid[0]?.reason).toMatch(/7 tab-delimited columns/)})
});

describe('Nestle1904 structural validation and discovery',()=>{
  it('validates all 27 books, coverage, known verses, and deterministic source order',()=>{const books=Object.values(OSIS_TO_USFM).map(book=>String(book??''));if(books.some(book=>!book))throw Error('Expected every Nestle1904 mapping to have a USFM book ID');const known=new Map([['MAT','1:1'],['JHN','1:1'],['ROM','1:1'],['HEB','1:1'],['REV','1:1']]),words=books.map((book,index)=>({book,chapter:Number((known.get(book)||'1:2').split(':')[0]),verse:Number((known.get(book)||'1:2').split(':')[1]),sourceOrder:index,lemma:'λόγος',normalized:'λογος'}));expect(validateNestleMorphStructure({words,invalid:[],nonemptyLines:words.length},{minimumWords:0}).structure.bookCount).toBe(27)});
  it('rejects unknown OSIS books during production validation',()=>{expect(()=>validateNestleMorphStructure({words:[],invalid:[{line:1,reason:'Invalid or unknown OSIS reference: MadeUp 1:1',raw:row('MadeUp 1:1')}],nonemptyLines:1})).toThrow(/invalid or unknown OSIS book references/)});
  it('prefers Nestle1904.csv over recursive candidates',async()=>{const directory=await root();await writeFile(join(directory,'Nestle1904.csv'),row('Matt 1:1'));await writeFile(join(directory,'other.tsv'),row('Mark 1:1'));const found=await discoverNestleMorph(directory,{validate:false});expect(found.path).toBe(join(directory,'Nestle1904.csv'));expect(found.words[0]?.book).toBe('MAT')});
  it('falls back recursively and ignores README and parsing documentation',async()=>{const directory=await root(),nested=join(directory,'nested');await mkdir(nested);await writeFile(join(directory,'README.md'),row('Mark 1:1'));await writeFile(join(directory,'parsing.txt'),row('Luke 1:1'));await writeFile(join(nested,'words.tsv'),row('John 1:1'));const found=await discoverNestleMorph(directory,{validate:false});expect(found.path).toBe(join(nested,'words.tsv'));expect(found.words[0]?.book).toBe('JHN')});
  it('reports inspected files and useful invalid diagnostics',async()=>{const directory=await root();await writeFile(join(directory,'Nestle1904.csv'),'bad\trow');await expect(discoverNestleMorph(directory,{validate:false})).rejects.toThrow(/Files inspected: 1[\s\S]*0 valid[\s\S]*Expected 7 tab-delimited columns/)})
});
