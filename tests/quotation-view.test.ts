import {expect,it} from 'vitest';
import {filterQuotationRows,paginateRows,quotationColumnLabels,type QuotationRow} from '../src/quotation-view';
const rows:QuotationRow[]=[
{id:'a',bookId:'EXO',originalReference:'EXO 34:6-7',text:'merciful',rank:1,quotationGroupCount:3,ntOccurrenceCount:5,distinctNtBookCount:2,targetBooks:['ROM']},
{id:'b',bookId:'ISA',originalReference:'ISA 53:4',text:'sorrows',rank:2,quotationGroupCount:1,ntOccurrenceCount:1,distinctNtBookCount:1,targetBooks:['MAT']}
];
it('counts filtered rows before pagination and never exceeds the total',()=>{const filtered=filterQuotationRows(rows,{search:'Exo',book:'EXO',minimumGroups:2,targetBook:'ROM'}),page=paginateRows(filtered,1,1);expect(filtered).toHaveLength(1);expect(page.total).toBe(1);expect(page.total).toBeLessThanOrEqual(rows.length)});
it('uses quotation-specific passage columns',()=>expect(quotationColumnLabels).toContain('UBS quotation groups'));
