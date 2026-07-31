const marks=/\p{M}+/gu,punctuation=/[^\p{L}\p{N}]+/gu;
export function normalizeGreek(value=''){return String(value).normalize('NFD').toLowerCase().replace(marks,'').replace(/ς/g,'σ').replace(punctuation,'').normalize('NFC')}
export const normalizeGreekLemma=normalizeGreek;
export function normalizeGreekTokens(values){return values.map(normalizeGreek).filter(Boolean)}
