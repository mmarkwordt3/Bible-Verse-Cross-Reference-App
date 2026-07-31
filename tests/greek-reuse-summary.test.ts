import {describe,expect,it} from 'vitest';
import {filterGreekRows,greekPrimarySummary,type GreekFilters,type GreekReuseRow} from '../src/greek-reuse-view';
import {paginateRows} from '../src/quotation-view';

const row=(id:string,overrides:Partial<GreekReuseRow>={}):GreekReuseRow=>({id,book:'PSA',displayName:'Psalms',originalReference:`PSA 1:${id}`,text:'λογος',rank:Number(id),highCount:1,mediumOrHigherCount:1,distinctNtBookCount:1,scoreSum:1,maximumScore:.8,ubsOverlapCount:0,exactNgramOccurrenceCount:1,maximumSharedContentLemmaCount:3,targetBooks:['MAT'],candidates:[`candidate-${id}`],startChapter:1,startVerse:Number(id),endChapter:1,endVerse:Number(id),directionalEligibility:'eligible',...overrides});
const rows=[row('1'),row('2',{book:'GEN',displayName:'Genesis',originalReference:'GEN 1:2',targetBooks:['ROM'],maximumScore:.6}),row('3',{ubsOverlapCount:1})];
const defaults:GreekFilters={search:'',book:'',targetBook:'',minimumScore:0,ubsStatus:'',similarityCategory:'',minimumSharedContentLemmas:0,exactNgramRequired:false,sourceCorpus:'eligible',formulaicStatus:'nonformulaic'};
const summary=(mode:'passages'|'verses',filters:GreekFilters=defaults)=>greekPrimarySummary(filterGreekRows(rows,filters).length,mode);

describe('Greek rankings primary summary',()=>{
 it('uses the filtered passage count and passage label',()=>expect(summary('passages')).toEqual({count:3,label:'matching ranked LXX source passages'}));
 it('uses the filtered verse count and verse label',()=>expect(summary('verses')).toEqual({count:3,label:'matching ranked LXX source verses'}));
 it('changes with a filter and returns to the default when the filter is cleared',()=>{expect(summary('passages',{...defaults,book:'GEN'}).count).toBe(1);expect(summary('passages',{...defaults,book:''}).count).toBe(3)});
 it('is independent of page size and pagination',()=>{const filtered=filterGreekRows(rows,defaults),count=greekPrimarySummary(filtered.length,'passages').count;expect(paginateRows(filtered,1,1).rows).toHaveLength(1);expect(paginateRows(filtered,2,1).rows).toHaveLength(1);expect(count).toBe(3)});
 it('is independent of sorting',()=>{const filtered=filterGreekRows(rows,defaults),before=greekPrimarySummary(filtered.length,'verses');filtered.slice().sort((a,b)=>a.maximumScore-b.maximumScore);expect(greekPrimarySummary(filtered.length,'verses')).toEqual(before)});
 it('never exceeds the complete row count',()=>{for(const mode of ['passages','verses'] as const)expect(summary(mode).count).toBeLessThanOrEqual(rows.length)});
 it('retains Greek rankings filtering across the supported controls',()=>{expect(summary('passages',{...defaults,search:'Genesis',book:'GEN',targetBook:'ROM',minimumScore:.5,ubsStatus:'no',similarityCategory:'high',minimumSharedContentLemmas:3,exactNgramRequired:true,sourceCorpus:'eligible',formulaicStatus:'nonformulaic'}).count).toBe(1);expect(summary('passages',{...defaults,ubsStatus:'yes'}).count).toBe(1)});
});
