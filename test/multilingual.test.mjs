import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEXT_LANGUAGES, localizedNames, whisperLanguage, subtitleLanguages } from '../src/languages.js';
import { applyLocalizations } from '../src/glossary-localizations.js';
import { command } from '../src/commands.js';
import { validateCatalog } from '../video/glossary-updates.mjs';
import { videoGlossary } from '../video/translation.mjs';
import { deepLRequestBody } from '../video/providers.mjs';
import { normalizeVideoReport } from '../video/report-import.mjs';
import { normalizeSharedDiscordReport } from '../src/shared-report.js';
import { Translator } from '../src/translator.js';
import { settings } from '../src/config.js';

const catalog=JSON.parse(readFileSync('glossary/zzz.json','utf8'));
test('additional language names preserve the legacy four-language shape and cover live matched concepts',()=>{
  const localized=catalog.entries.filter(entry=>entry.localizedNames);
  assert.equal(localized.length,1868);
  for(const entry of localized){assert.equal(entry.releaseStatus,'live');assert.equal(Object.keys(entry.preferred).length,4);assert.equal(Object.keys(localizedNames(entry)).length,4+Object.keys(entry.localizedNames).length);}
  assert.equal(validateCatalog(catalog).entries.length,2318);
  assert.equal(localizedNames(catalog.entries.find(entry=>entry.id==='combat:ultimate')).fr,'Ultime');
  const community=JSON.parse(readFileSync('glossary/community.json'));
  assert.equal(community.entries.length,73);
  for(const entry of community.entries){assert.equal(Object.keys(entry.communityPreferredDrafts).length,9);assert(Object.values(entry.communityPreferredDrafts).every(value=>value===null));}
  assert(catalog.entries.find(entry=>entry.id==='combat:assist-follow-up').aliases.includes('지돌'));
});
test('localization input cannot override base names, create concepts or enable unreleased entries',()=>{
  const base={ko:'기존',en:'Existing',ja:'既存', 'zh-CN':'现有'};
  const entry={id:'x',category:'skill',preferred:base,aliases:['기존'],releaseStatus:'live',rule:'keep',autoUse:false};
  const input={version:1,entries:[{id:'x',base,names:{fr:'Existant'}}]};
  const good=applyLocalizations({entries:[entry]},input);assert.equal(good.catalog.entries[0].autoUse,false);assert.deepEqual(good.catalog.entries[0].preferred,base);
  assert.equal(applyLocalizations({entries:[{...entry,releaseStatus:'prerelease'}]},input).report.applied.length,0);
  assert.equal(applyLocalizations({entries:[{...entry,preferred:{...base,en:'Renamed'}}]},input).report.applied.length,0);
  assert.equal(applyLocalizations({entries:[]},input).catalog.entries.length,0);
  assert.throws(()=>applyLocalizations({entries:[entry]},{version:1,entries:[{id:'x',base,names:{fr:'Name_JP0F'}}]}));
});
test('Discord choices and video input/target choices expose all 13 translation languages',()=>{
  const choices=command.toJSON().options.find(row=>row.name==='link').options.find(row=>row.name==='language').choices.map(row=>row.value);
  assert.deepEqual(choices,Object.keys(TEXT_LANGUAGES));
  const html=readFileSync('video/public/index.html','utf8');
  for(const id of ['sourceLanguage','targetLanguage']){const body=new RegExp('<select id="'+id+'">([\\s\\S]*?)</select>').exec(html)[1];for(const code of Object.keys(TEXT_LANGUAGES))assert(body.includes('value="'+code+'"'),id+'/'+code);}
  assert.equal(whisperLanguage('zh-Hant'),'zh');assert(subtitleLanguages('zh-Hant').includes('zh-TW'));
});
test('full video glossary retains all concepts but sends only needed localized spellings',()=>{
  const glossary=videoGlossary([{sourceText:'Use Ultimate.'}],{sourceLanguage:'en',targetLanguage:'fr',glossaryMode:'full'},'glossary/zzz.json');
  assert.equal(glossary.length,catalog.entries.length);
  const term=glossary.find(row=>row.id==='combat:ultimate');assert.equal(term.preferred.fr,'Ultime');assert.equal(term.preferred.en,'Ultimate');assert(!term.preferred.ru);assert(!term.localizedNames);
});
test('DeepL routes every supported target and reports accept added language codes',()=>{
  for(const code of Object.keys(TEXT_LANGUAGES)){const body=deepLRequestBody({sourceLanguage:'en',targetLanguage:code,cues:[{id:'1',text:'Hello'}],glossary:[],before:[],after:[]});assert(body.target_lang,code);}
  const shared={id:'R-20261019-abcdef123456',platform:'discord',source:{text:'Hello',language:'fr'},target:{text:'Hallo',language:'de'},issue:{type:'term',explanation:'Sample'}};
  assert.equal(normalizeSharedDiscordReport(shared).target.language,'de');
  assert.equal(normalizeVideoReport({...shared,id:'V-20261019-abcdef123456'}).source.language,'fr');
});
test('French input retrieves its registered names and translates to Russian in one provider request',async()=>{
  const config=settings({DISCORD_TOKEN:'test',DISCORD_APPLICATION_ID:'123456789012345678',TRANSLATION_PROVIDER:'openai',OPENAI_API_KEY:'synthetic-not-a-real-key'});
  let calls=0;
  const translator=new Translator(config,{reserve:()=> 'day',recordUsage:()=>{}},'glossary/zzz.json',async(url,init)=>{
    calls++;const body=JSON.parse(init.body),payload=JSON.parse(body.input);
    const term=payload.glossary.find(entry=>entry.id==='combat:ultimate');
    assert.equal(term.preferred.fr,'Ultime');assert.equal(term.preferred.ru,'Суперспособность');
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({ru:'Используй суперспособность после этой атаки.'})}]}]})};
  });
  const translated=await translator.translate({text:'Utilise ton Ultime après cette attaque.',sourceLanguage:'fr',targets:['ru']});
  assert.equal(calls,1);assert.match(translated.ru,/суперспособность/);
});
