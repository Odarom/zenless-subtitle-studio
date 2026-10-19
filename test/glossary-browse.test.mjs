import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, relative, posix } from 'node:path';
import { buildGlossaryRelease } from '../scripts/video-glossary-build.mjs';
import { buildCatalogBrowser } from '../scripts/glossary-browse.mjs';

test('public catalog links every concept to a small readable page without changing the DB snapshot', t => {
  const folder=mkdtempSync(resolve('.tools/catalog-test-'));
  t.after(()=>{assert(!relative(resolve('.tools'),folder).startsWith('..'));rmSync(folder,{recursive:true,force:true});});
  const release=buildGlossaryRelease(process.cwd(),folder),catalog=JSON.parse(readFileSync('glossary/zzz.json'));
  assert.equal(Buffer.compare(readFileSync(join(folder,'catalog/zzz.json')),readFileSync('glossary/zzz.json')),0);
  const index=readFileSync(join(folder,'catalog/INDEX.md'),'utf8');
  assert.equal([...index.matchAll(/^\| \[/gm)].length,catalog.entries.length);
  for(const entry of catalog.entries)assert(index.includes(`[${entry.id}](`));
  for(const file of release.browseFiles){
    const text=readFileSync(join(folder,file),'utf8');
    assert(Buffer.byteLength(text)<900000,file);
    for(const language of ['한국어','English','日本語','简体中文'])assert(text.includes('## '+language+'\n'),file);
    for(const match of text.matchAll(/\]\(([^\s)]+)\)/g)){
      if(/^https?:/.test(match[1]))continue;
      const [path,fragment]=match[1].split('#'),target=path?posix.normalize(posix.join(posix.dirname(file),path)):file;
      const body=readFileSync(join(folder,target),'utf8');
      if(fragment&&!['한국어','english','日本語','简体中文'].includes(fragment))assert([...body.matchAll(/^#{1,6} (.+)$/gm)].some(m=>m[1].toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu,'').replace(/ /g,'-')===fragment),`${file} -> ${match[1]}`);
    }
  }
  for(const locale of ['ko','en','ja','zh-CN']){
    const guide=readFileSync(join(folder,`README-${locale}.md`),'utf8');
    assert(guide.includes('](catalog/BROWSE.md)'));assert(guide.includes('](catalog/INDEX.md)'));
    assert(guide.includes('https://raw.githubusercontent.com/Odarom/zenless-translation-database/main/catalog/zzz.json'));
  }
});
test('readable pages escape database text instead of interpreting it as Markdown or HTML', t=>{
  const folder=mkdtempSync(resolve('.tools/catalog-escape-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
  buildCatalogBrowser({entries:[{id:'stat:example',category:'stat',preferred:{ko:'<img src=x>',en:'[external](javascript:test)'},aliases:['a|b','[link]'],meaning:'<script>run()</script>',rule:'No guessing.'}]},folder);
  const text=readFileSync(join(folder,'catalog/terms/stat-1.md'),'utf8');
  assert(!text.includes('<script>'));assert(!text.includes('<img'));assert(text.includes('&lt;script&gt;'));assert(text.includes('a&#124;b'));
  assert(text.includes('\\[external\\]'));assert(!text.includes('undefined'));
});
