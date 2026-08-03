# English-assisted Greek reuse review methodology

Phase E1b adds display evidence without modifying Layer D. The queue membership and order, candidates, clusters, scores, thresholds, and rankings are invariant.

## Sources and mapping

Brenton English Septuagint (`eng-Brenton`, eBible.org edition dated 2024-01-18) is public domain. The archive URL and SHA-256 field live in `data/sources/brenton-source.json`. The current environment could not reach eBible.org, so no translation text was generated or substituted and the hash remains explicitly pending. The manual workflow obtains and pins the official archive before normalization. The browser reads only committed JSON and makes no source-site request. Existing BSB target display text is reused.

Mappings are an explicit CenterBLC-ID-to-USFM-ID table. There is no fuzzy title mapping. LXX Psalm numbering is retained. Kingdoms maps explicitly to Samuel/Kings and Paralipomena to Chronicles. Esdras is ambiguous. Odes, 3–4 Maccabees, Psalms of Solomon, and the distinct Tobit, Daniel, Susanna, and Bel recensions are unsupported unless a source-specific crosswalk is later documented. Unavailable cases show the standard unavailable message and recommend Greek-expert review.

## Interpretation

Brenton is review assistance, not a claim that it represents every CenterBLC textual form. Transliteration removes combining accents and breathing marks, uses `ē/ō` for eta/omega and `th/ph/ch/ps` for theta/phi/chi/psi, while preserving word and punctuation boundaries. Transliteration is not translation. Template summaries report only committed algorithm fields. UBS overlap is external evidence, not proof. Triage is an English-assisted workflow, never an expert scholarly classification. Unsafe mappings should be triaged as expert review required or cannot assess.
