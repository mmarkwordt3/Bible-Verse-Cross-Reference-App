import { OSIS_TO_USFM, USFM_TO_BOOK } from './openbible-config.mjs';

/** @typedef {{book:string, chapter:number, verse:number, id:string}} ParsedOpenBibleTarget */
/** @typedef {{ok:true, target:ParsedOpenBibleTarget, error?:never}|{ok:false, error:string, target?:never}} OpenBiblePointResult */
/** @typedef {{ok:true, targets:ParsedOpenBibleTarget[], error?:never}|{ok:false, error:string, targets?:never}} OpenBibleParseResult */

export const openBibleId = (book, chapter, verse) => `openbible:${book}.${chapter}.${verse}`;
export function resolveOpenBibleBook(value) {
  return OSIS_TO_USFM[String(value).replace(/\./g, '').toLowerCase()] || null;
}
/** @returns {OpenBiblePointResult} */
export function parsePoint(raw) {
  const match = String(raw).trim().match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/);
  if (!match) return { ok: false, error: 'Malformed verse reference' };
  const book = resolveOpenBibleBook(match[1]);
  if (!book) return { ok: false, error: `Unknown book abbreviation: ${match[1]}` };
  const chapter = Number(match[2]);
  const verse = Number(match[3]);
  if (chapter < 1 || verse < 1) return { ok: false, error: 'Chapter and verse must be positive' };
  return { ok: true, target: { book, chapter, verse, id: openBibleId(book, chapter, verse) } };
}
/** @returns {OpenBibleParseResult} */
export function parseTarget(raw) {
  const parts = String(raw).trim().split('-');
  if (parts.length > 2) return { ok: false, error: 'Malformed range' };
  const startResult = parsePoint(parts[0]);
  if (!startResult.ok) return startResult;
  const start = startResult.target;
  if (parts.length === 1) return { ok: true, targets: [start] };
  const endRaw = parts[1];
  /** @type {OpenBiblePointResult} */
  let endResult;
  if (/^\d+$/.test(endRaw)) {
    const verse = Number(endRaw);
    endResult = { ok: true, target: { ...start, verse, id: openBibleId(start.book, start.chapter, verse) } };
  } else if (/^\d+\.\d+$/.test(endRaw)) {
    const [chapter, verse] = endRaw.split('.').map(Number);
    endResult = { ok: true, target: { book: start.book, chapter, verse, id: openBibleId(start.book, chapter, verse) } };
  } else {
    endResult = parsePoint(endRaw);
  }
  if (!endResult.ok) return endResult;
  const end = endResult.target;
  if (end.book !== start.book) return { ok: false, error: 'Cross-book ranges are unsupported' };
  if (end.chapter < start.chapter || (end.chapter === start.chapter && end.verse < start.verse)) return { ok: false, error: 'Reversed range' };
  if (end.chapter !== start.chapter) return { ok: false, error: 'Multi-chapter ranges require a verse registry' };
  return { ok: true, targets: Array.from({ length: end.verse - start.verse + 1 }, (_, index) => ({ ...start, verse: start.verse + index, id: openBibleId(start.book, start.chapter, start.verse + index) })) };
}
export function parseTsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split('\t').map((value) => value.trim().toLowerCase()) || [];
  const from = header.findIndex((value) => /from/.test(value));
  const to = header.findIndex((value) => /to/.test(value));
  const score = header.findIndex((value) => /vote|score|relevance/.test(value));
  if (from < 0 || to < 0) throw new Error(`Unrecognized OpenBible TSV header: ${header.join(' | ')}`);
  const rows = [];
  const invalid = [];
  const inventory = {};
  for (const [index, line] of lines.entries()) {
    const fields = line.split('\t');
    const sourceRaw = fields[from];
    const targetRaw = fields[to];
    const scoreRaw = score < 0 ? '0' : fields[score];
    const alias = sourceRaw?.match(/^([1-3]?[A-Za-z]+)/)?.[1];
    if (alias) inventory[alias] = (inventory[alias] || 0) + 1;
    const sourceResult = parsePoint(sourceRaw);
    const targetResult = parseTarget(targetRaw);
    const value = Number(scoreRaw);
    if (!sourceResult.ok || !targetResult.ok || !Number.isInteger(value)) {
      invalid.push({ line: index + 2, raw: line, reason: !sourceResult.ok ? sourceResult.error : !targetResult.ok ? targetResult.error : 'Score is not an integer' });
      continue;
    }
    rows.push({ source: sourceResult.target, targets: targetResult.targets, score: value, raw: line });
  }
  return { rows, invalid, inventory, sourceRows: lines.length };
}
export function buildGraph(parsed, textRegistry = new Map()) {
  const registry = new Map(textRegistry), edges = new Map(), selfLinks = [];
  let expanded = 0, duplicates = 0;
  for (const row of parsed.rows) for (const target of row.targets) {
    expanded += 1;
    if (!registry.has(row.source.id)) registry.set(row.source.id, { ...row.source, text: null });
    if (!registry.has(target.id)) registry.set(target.id, { ...target, text: null });
    if (row.source.id === target.id) { selfLinks.push(row); continue; }
    const key = `${row.source.id}>${target.id}`, existing = edges.get(key);
    if (existing) { duplicates += 1; existing.score = Math.max(existing.score, row.score); existing.rows.push(row.raw); }
    else edges.set(key, { source: row.source.id, target: target.id, score: row.score, rows: [row.raw] });
  }
  return { registry, edges, selfLinks, expanded, duplicates };
}
export function calculateMetrics(registry, edges) {
  const incoming = new Map(), outgoing = new Map();
  for (const edge of edges.values()) {
    const incomingEdges = incoming.get(edge.target) || [];
    incomingEdges.push(edge); incoming.set(edge.target, incomingEdges);
    const outgoingEdges = outgoing.get(edge.source) || [];
    outgoingEdges.push(edge); outgoing.set(edge.source, outgoingEdges);
  }
  const verses = [];
  for (const verse of registry.values()) {
    const ins = incoming.get(verse.id) || [], outs = outgoing.get(verse.id) || [];
    const inNeighbors = new Set(ins.map((edge) => edge.source)), outNeighbors = new Set(outs.map((edge) => edge.target));
    const connected = new Set([...inNeighbors, ...outNeighbors]);
    verses.push({ ...verse, incoming: ins.length, outgoing: outs.length, connected: connected.size, reciprocal: [...connected].filter((id) => inNeighbors.has(id) && outNeighbors.has(id)).length, sourceBooks: new Set(ins.map((edge) => edge.source.split('.')[0].replace('openbible:', ''))).size, targetBooks: new Set(outs.map((edge) => edge.target.split('.')[0].replace('openbible:', ''))).size, incomingScore: ins.reduce((total, edge) => total + edge.score, 0), outgoingScore: outs.reduce((total, edge) => total + edge.score, 0), maxIncomingScore: ins.length ? Math.max(...ins.map((edge) => edge.score)) : 0, maxOutgoingScore: outs.length ? Math.max(...outs.map((edge) => edge.score)) : 0 });
  }
  return { verses, incoming, outgoing };
}
export function rankOpenBible(rows, metric = 'incoming') {
  rows.sort((a, b) => b[metric] - a[metric] || USFM_TO_BOOK[a.book].order - USFM_TO_BOOK[b.book].order || a.chapter - b.chapter || a.verse - b.verse);
  let previous;
  return rows.map((verse, index) => { const rank = index && verse[metric] === rows[index - 1][metric] ? previous : index + 1; previous = rank; return { ...verse, rank }; });
}
