import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const lockPath='data/sources/brenton-source.json',lock=JSON.parse(fs.readFileSync(lockPath,'utf8')),out='data/raw/eng-Brenton_usfm.zip';fs.mkdirSync('data/raw',{recursive:true});
execFileSync('curl',['--fail','--location','--silent','--show-error',lock.archiveUrl,'--output',out],{stdio:'inherit'});const hash=crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
if(lock.archiveSha256&&lock.archiveSha256!==hash)throw Error(`Brenton archive SHA-256 mismatch: expected ${lock.archiveSha256}, got ${hash}`);
lock.archiveSha256=hash;lock.retrievedAt=new Date().toISOString();fs.writeFileSync(lockPath,JSON.stringify(lock,null,2)+'\n');console.log(`Fetched ${lock.sourceId}; SHA-256 ${hash}`);
