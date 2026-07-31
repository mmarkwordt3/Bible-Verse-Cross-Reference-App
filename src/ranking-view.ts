import type {Verse} from './types';

export interface RankingFilters {
  search:string;
  testament:string;
  book:string;
  canon:string;
  minimumReferences:number;
}
export type RankingSort='rank'|'incoming'|'canonical'|'connected'|'outgoing'|'sourceBooks'|'incomingScore';

export function filterRankingRows(allRows:readonly Verse[],filters:RankingFilters):Verse[]{
  const query=filters.search.trim().toLowerCase();
  return allRows.filter(row=>{
    const searchable=`${row.id} ${(row as Verse&{osis?:string}).osis||''} ${row.chapter}:${row.verse} ${row.text||''} ${row.modern} ${row.historical}`.toLowerCase();
    return (!query||searchable.includes(query))
      &&(!filters.testament||row.testament===filters.testament)
      &&(!filters.book||row.slug===filters.book)
      &&(!filters.canon||(filters.canon==='deutero')===row.deuterocanonical)
      &&row.incoming>=filters.minimumReferences;
  });
}

export function sortRankingRows(filteredRows:readonly Verse[],sort:RankingSort):Verse[]{
  const rows=[...filteredRows],canonical=(a:Verse,b:Verse)=>a.order-b.order||a.chapter-b.chapter||a.verse-b.verse;
  if(sort==='canonical')return rows.sort(canonical);
  if(sort==='incoming')return rows.sort((a,b)=>b.incoming-a.incoming||canonical(a,b));
  if(sort==='rank')return rows.sort((a,b)=>a.rank-b.rank||canonical(a,b));
  return rows.sort((a,b)=>{const difference=Number(b[sort]||0)-Number(a[sort]||0);return difference||canonical(a,b)});
}

export function paginateRankingRows<T>(sortedRows:readonly T[],requestedPage:number,pageSize:number){
  const pages=Math.max(1,Math.ceil(sortedRows.length/pageSize)),page=Math.min(Math.max(1,requestedPage),pages);
  return {paginatedRows:sortedRows.slice((page-1)*pageSize,page*pageSize),page,pages};
}
