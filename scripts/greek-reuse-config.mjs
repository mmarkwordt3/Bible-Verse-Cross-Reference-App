import {lxxNativeBookId} from './lxx-book-metadata.mjs';
export const GREEK_REUSE_ALGORITHM='greek-reuse-v2-formulaic';
export const GREEK_REUSE_CONFIG={windowSizes:[1,2,3],minimumSharedContentLemmas:3,rareLemmaDocumentFrequency:8,maxRetrievedSourcesPerTarget:250,weights:{weightedLemmaSimilarity:.3,targetRecall:.2,orderedLemmaSimilarity:.15,exactSurfaceNgram:.15,rareLemmaEvidence:.1,wordOrderPreservation:.1},penalties:{functionWordOnly:.8,properNameOnly:.7,lengthDifference:.15}};
export const EXPLICIT_STOP_LEMMAS=['ο','και','δε','γαρ','εν','εις','εκ','επι','προς','απο','ου','μη','τις','αυτος'];
export const LXX_REPOSITORY='https://github.com/CenterBLC/LXX';export const NT_REPOSITORY='https://github.com/biblicalhumanities/Nestle1904';
export const lxxBookId=lxxNativeBookId;
