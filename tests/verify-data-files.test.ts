import {execFile} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {promisify} from 'node:util';
import {afterEach,describe,expect,it} from 'vitest';

const execFileAsync=promisify(execFile);
const roots:string[]=[];
const verifier=resolve('scripts/verify-data-files.mjs');
const greekCore=['passage-rankings.json','verse-rankings.json','book-stats.json','data-quality.json','config.json','candidate-index.json'];

afterEach(async()=>{
  await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));
});

async function fixtureRoot(){
  const root=await mkdtemp(join(tmpdir(),'verify-data-'));
  roots.push(root);
  await mkdir(join(root,'public/data/greek-reuse/books'),{recursive:true});
  await writeFile(join(root,'public/data/layers.json'),'[]');
  return root;
}

describe('generated data verification',()=>{
  it('uses the Greek manifest inventory to verify core and per-book files',async()=>{
    const root=await fixtureRoot();
    await writeFile(join(root,'public/data/greek-reuse/manifest.json'),JSON.stringify({sourceBooks:['GEN']}));
    for(const file of greekCore)await writeFile(join(root,'public/data/greek-reuse',file),'{}');
    await writeFile(join(root,'public/data/greek-reuse/books/GEN.json'),'{}');
    const result=await execFileAsync(process.execPath,[verifier,'public','greek-reuse'],{cwd:root,encoding:'utf8'});
    expect(result.stdout).toContain('Verified 9 public data assets');
    expect(result.stderr).toBe('');
  });

  it('reports Greek inventory discovery failure before core verification fails',async()=>{
    const root=await fixtureRoot();
    await expect(execFileAsync(process.execPath,[verifier,'public','greek-reuse'],{cwd:root,encoding:'utf8'})).rejects.toMatchObject({
      stderr:expect.stringContaining('Greek reuse inventory unavailable'),
    });
  });
});
