import { describe, expect, it } from 'vitest';
import { OPENBIBLE_BOOKS, OSIS_TO_USFM, USFM_TO_BOOK } from '../scripts/openbible-config.mjs';
import { buildGraph, calculateMetrics, openBibleId, parsePoint, parseTarget, parseTsv, rankOpenBible } from '../scripts/parse-openbible.mjs';

type TargetResult = ReturnType<typeof parseTarget>;
type PointResult = ReturnType<typeof parsePoint>;
interface ScoredRow { score: number }
interface MetricVerse { book: string; text: string | null; rank?: number }
const isTargetSuccess = (result: TargetResult): result is Extract<TargetResult, { ok: true }> => result.ok;
const isTargetFailure = (result: TargetResult): result is Extract<TargetResult, { ok: false }> => !result.ok;
const isPointFailure = (result: PointResult): result is Extract<PointResult, { ok: false }> => !result.ok;

describe('OpenBible books', () => {
  it('defines all 66 USFM IDs', () => { expect(OPENBIBLE_BOOKS).toHaveLength(66); expect(Object.keys(USFM_TO_BOOK)).toHaveLength(66); expect(USFM_TO_BOOK.JHN.name).toBe('John'); });
  it('maps OSIS aliases', () => { expect(OSIS_TO_USFM.gen).toBe('GEN'); expect(OSIS_TO_USFM.exod).toBe('EXO'); expect(OSIS_TO_USFM['1sam']).toBe('1SA'); expect(OSIS_TO_USFM.rev).toBe('REV'); });
});

describe('OpenBible parser', () => {
  it('parses exact references and scores', () => {
    const parsed = parseTsv('From Verse\tTo Verse\tVotes\nExod.34.6\tNum.14.18\t-2\nExod.34.7\tNum.14.18\t0\nNum.14.18\tExod.34.6\t8');
    expect(parsed.rows.map((row: ScoredRow) => row.score)).toEqual([-2, 0, 8]); expect(parsed.invalid).toHaveLength(0);
  });
  it('expands same chapter and repeated-book ranges', () => {
    const repeated = parseTarget('Luke.6.20-Luke.6.23'), compact = parseTarget('Matt.5.3-5');
    expect(isTargetSuccess(repeated)).toBe(true); expect(isTargetSuccess(compact)).toBe(true);
    if (!isTargetSuccess(repeated) || !isTargetSuccess(compact)) throw new Error('Expected valid target ranges');
    expect(repeated.targets).toHaveLength(4); expect(compact.targets).toHaveLength(3);
  });
  it('rejects malformed, reversed, cross-book, and invalid references', () => {
    const reversed = parseTarget('Matt.5.4-3'), crossBook = parseTarget('Matt.5.3-Luke.6.2');
    const unknown = parsePoint('Nope.1.1'), nonpositive = parsePoint('Gen.0.1');
    if (!isTargetFailure(reversed) || !isTargetFailure(crossBook) || !isPointFailure(unknown) || !isPointFailure(nonpositive)) throw new Error('Expected parser failures');
    expect(reversed.error).toMatch(/Reversed/); expect(crossBook.error).toMatch(/Cross-book/); expect(unknown.error).toMatch(/Unknown/); expect(nonpositive.error).toMatch(/positive/);
  });
});

it('deduplicates, takes highest score, excludes self-links, and does not mirror', () => {
  const parsed = parseTsv('From Verse\tTo Verse\tVotes\nExod.34.6\tNum.14.18\t2\nExod.34.6\tNum.14.18\t8\nNum.14.18\tExod.34.6\t4\nExod.34.7\tExod.34.7\t9');
  const graph = buildGraph(parsed); expect(graph.edges.size).toBe(2); expect(graph.duplicates).toBe(1); expect(graph.selfLinks).toHaveLength(1); expect(graph.edges.get(`${openBibleId('EXO', 34, 6)}>${openBibleId('NUM', 14, 18)}`)?.score).toBe(8);
});

it('calculates graph metrics and competition ranks', () => {
  const parsed = parseTsv('From Verse\tTo Verse\tVotes\nExod.34.6\tNum.14.18\t2\nNum.14.18\tExod.34.6\t4\nExod.34.7\tNum.14.18\t3');
  const graph = buildGraph(parsed, new Map([[openBibleId('EXO', 34, 6), { id: openBibleId('EXO', 34, 6), book: 'EXO', chapter: 34, verse: 6, text: 'text' }]]));
  const metrics = calculateMetrics(graph.registry, graph.edges), numberVerse = metrics.verses.find((verse: MetricVerse) => verse.book === 'NUM');
  expect(numberVerse).toMatchObject({ incoming: 2, outgoing: 1, connected: 2, reciprocal: 1, sourceBooks: 1 });
  expect(metrics.verses.some((verse: MetricVerse) => verse.text === null)).toBe(true);
  expect(rankOpenBible(metrics.verses).map((verse: MetricVerse) => verse.rank)).toEqual([1, 2, 3]);
});
