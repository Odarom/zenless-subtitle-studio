import test from 'node:test';
import assert from 'node:assert/strict';
import { settings, UserError } from '../src/config.js';
import { Translator, validateTranslationLanguages } from '../src/translator.js';
import { localTranslation } from '../src/ollama.js';
import { geminiTranslation } from '../src/gemini.js';
import { protectLayout } from '../src/layout.js';
import { validateCombatAttributes } from '../src/attributes.js';
const path = new URL('../glossary/zzz.json', import.meta.url);
const creds = { DISCORD_TOKEN: 'test-token', DISCORD_APPLICATION_ID: '123456789012345678', DISCORD_GUILD_ID: '123456789012345679' };
const makeStore = () => ({ count: 0, reserve(limit) { if (!limit) throw new UserError('limit'); this.count++; return 'day'; }, recordUsage(day, usage) { this.usage = usage; } });
const input = { text: 'QA 이후 공격해', sourceLanguage: 'ko', targets: ['en', 'ja', 'zh-CN'] };
const result = { en: 'Attack after Quick Assist', ja: 'クイック支援の後に攻撃して', 'zh-CN': '快速支援后攻击' };
const response = data => ({ ok: true, json: async () => data });
const model = { details: { family: 'qwen3' }, model_info: { 'general.architecture': 'qwen3' } };

test('community style selects registered shorthand in all providers, with official fallback and full-name mode', async () => {
  for (const provider of ['gemini','openai','ollama']) for (const style of ['community','official']) {
    let calls=0;
    const config=settings({...creds,TRANSLATION_PROVIDER:provider,TRANSLATION_STYLE:style,GEMINI_API_KEY:'test',OPENAI_API_KEY:'test',OLLAMA_CONTEXT_LENGTH:'32768'});
    const translator=new Translator(config,makeStore(),path,async(url,init)=>{
      if(url.endsWith('/api/show'))return response(model);
      calls++;
      const body=JSON.parse(init.body);
      const payload=JSON.parse(provider==='gemini'?body.contents[0].parts[0].text:provider==='openai'?body.input:body.messages[1].content);
      const terms=new Map(payload.glossary.map(e=>[e.id,e]));
      const qa=terms.get('combat:quick-assist');
      assert.equal(qa.preferred.ko,'빠른 지원');
      assert.equal(qa.outputPreferred.ko,style==='community'?'빠지':'빠른 지원');
      assert.equal(qa.outputPreferred.en,style==='community'?'QA':'Quick Assist');
      assert.equal(qa.outputPreferred.ja,'クイック支援'); // No invented Japanese abbreviation.
      assert.equal(terms.get('stat-percent-atk').outputPreferred.ko,style==='community'?'공퍼':'공격력%');
      assert.equal(terms.get('character:1431').outputPreferred.en,style==='community'?'YSG':'Ye Shunguang');
      assert.equal(terms.get('community:ex-ex-basic-combo').outputPreferred.en,style==='community'?'EX → EX → BA':'EX Special Attack → EX Special Attack → Basic Attack');
      assert.equal(terms.get('effect:1431:culmination').outputPreferred.en,'Culmination');
      assert.equal(terms.get('community:preserve-san-z').outputPreferred.ko,'san-z');
      const content=JSON.stringify({ko:'검사용 번역'});
      return response(provider==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:content}]}}]}:provider==='openai'?{status:'completed',output:[{content:[{type:'output_text',text:content}]}]}:{done:true,done_reason:'stop',message:{content}});
    });
    await translator.translate({text:'Quick Assist 공퍼 YSG 강강평 극치 san-z',sourceLanguage:'en',targets:['ko']});
    assert.equal(calls,1);
  }
});

test('English combat notation, plural stacks and distinct timers reach every provider with Korean output names', async () => {
  for (const provider of ['gemini','openai','ollama']) {
    const config=settings({...creds,TRANSLATION_PROVIDER:provider,TRANSLATION_STYLE:'community',GEMINI_API_KEY:'test',OPENAI_API_KEY:'test',OLLAMA_CONTEXT_LENGTH:'32768'});
    const translator=new Translator(config,makeStore(),path,async(url,init)=>{
      if(url.endsWith('/api/show'))return response(model);
      const body=JSON.parse(init.body);
      const payload=JSON.parse(provider==='gemini'?body.contents[0].parts[0].text:provider==='openai'?body.input:body.messages[1].content);
      const terms=new Map(payload.glossary.map(e=>[e.id,e]));
      for (const [id,ko] of Object.entries({
        'combat:ex-special-attack':'강특','combat:basic-attack':'평타',
        'community:ex-ex-basic-combo':'강강평','community:hold-ex-special':'강꾹',
        'effect:1431:culmination':'극치','community:notorious-label':'노토리우스',
        'mode:deadly-assault':'강습'
      })) assert.equal(terms.get(id)?.outputPreferred.ko,ko,id);
      assert(terms.has('combat:dash-attack')); // Still retain DA's other meaning for contextual resolution.
      const content=JSON.stringify({ko:'강강평과 강꾹의 극치 소모를 비교한다. 노토리우스 타이머와 강습 타이머는 별개다.'});
      return response(provider==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:content}]}}]}:provider==='openai'?{status:'completed',output:[{content:[{type:'output_text',text:content}]}]}:{done:true,done_reason:'stop',message:{content}});
    });
    await translator.translate({text:'Compare consuming Culminations with an EX → EX → BA combo and holding EX. Does the Notorious timer behave like the DA timer?',sourceLanguage:'en',targets:['ko']});
  }
});

test('named Shunguang skills reach each provider as distinct skills, with full and shorthand outputs', async () => {
  for(const provider of ['gemini','openai','ollama'])for(const style of ['community','official']) {
    const config=settings({...creds,TRANSLATION_PROVIDER:provider,TRANSLATION_STYLE:style,GEMINI_API_KEY:'test',OPENAI_API_KEY:'test',OLLAMA_CONTEXT_LENGTH:'32768'});
    const translator=new Translator(config,makeStore(),path,async(url,init)=>{
      if(url.endsWith('/api/show'))return response(model);
      const body=JSON.parse(init.body);
      const payload=JSON.parse(provider==='gemini'?body.contents[0].parts[0].text:provider==='openai'?body.input:body.messages[1].content);
      const terms=new Map(payload.glossary.map(e=>[e.id,e]));
      for(const [index,en] of [[3,'Soaring Light'],[4,'Return to Dust']]) {
        const skill=terms.get(`skill:1431:special:${index}`);
        assert(skill);
        assert.equal(skill.outputPreferred.en,style==='community'?en:`EX Special Attack: Enlightened Mind - ${en}`);
      }
      const content=JSON.stringify({en:'Compare the first hit of Soaring Light with the first hit of Return to Dust.'});
      return response(provider==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:content}]}}]}:provider==='openai'?{status:'completed',output:[{content:[{type:'output_text',text:content}]}]}:{done:true,done_reason:'stop',message:{content}});
    });
    await translator.translate({text:'명심경 섬광의 첫 타격과 명심경 귀결의 첫 타격을 비교해.',sourceLanguage:'ko',targets:['en']});
  }
});

test('Trial and Adversity are sent as distinct difficulties to every provider with official and community output names', async () => {
  for(const provider of ['gemini','openai','ollama'])for(const style of ['community','official']) {
    const config=settings({...creds,TRANSLATION_PROVIDER:provider,TRANSLATION_STYLE:style,GEMINI_API_KEY:'test',OPENAI_API_KEY:'test',OLLAMA_CONTEXT_LENGTH:'32768'});
    const translator=new Translator(config,makeStore(),path,async(url,init)=>{
      if(url.endsWith('/api/show'))return response(model);
      const body=JSON.parse(init.body);
      const payload=JSON.parse(provider==='gemini'?body.contents[0].parts[0].text:provider==='openai'?body.input:body.messages[1].content);
      const terms=new Map(payload.glossary.map(e=>[e.id,e]));
      const difficulty=terms.get('mode:deadly-assault-adversity');
      assert(difficulty);
      assert.equal(difficulty.outputPreferred.en,'Adversity Mode');
      assert.equal(difficulty.outputPreferred.ko,style==='community'?'절망':'절망 모드');
      const trial=terms.get('mode:deadly-assault-trial');
      assert(trial);
      assert.equal(trial.outputPreferred.en,'Trial Mode');
      assert.equal(trial.outputPreferred.ko,style==='community'?'시련':'시련 모드');
      assert.equal(terms.get('mode:deadly-assault').preferred.en,'Deadly Assault');
      const content=JSON.stringify({en:'I reached 30,000 points in Adversity Mode.'});
      return response(provider==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:content}]}}]}:provider==='openai'?{status:'completed',output:[{content:[{type:'output_text',text:content}]}]}:{done:true,done_reason:'stop',message:{content}});
    });
    await translator.translate({text:'이번 강습 시련모드는 9별이고 절망모드는 3만점이야.',sourceLanguage:'ko',targets:['en']});
  }
});

test('all-M0W1 team scope reaches each provider with the target-language shorthand', async () => {
  for(const provider of ['gemini','openai','ollama'])for(const style of ['community','official']) {
    const config=settings({...creds,TRANSLATION_PROVIDER:provider,TRANSLATION_STYLE:style,GEMINI_API_KEY:'test',OPENAI_API_KEY:'test',OLLAMA_CONTEXT_LENGTH:'32768'});
    const translator=new Translator(config,makeStore(),path,async(url,init)=>{
      if(url.endsWith('/api/show'))return response(model);
      const body=JSON.parse(init.body);
      const payload=JSON.parse(provider==='gemini'?body.contents[0].parts[0].text:provider==='openai'?body.input:body.messages[1].content);
      const terms=new Map(payload.glossary.map(e=>[e.id,e]));
      const single=terms.get('community:m0w1-build'),team=terms.get('community:all-m0w1-team');
      assert(single);assert(team);
      assert.equal(single.outputPreferred.en,style==='community'?'M0W1':single.preferred.en);
      assert.equal(team.outputPreferred.en,style==='community'?'full M0W1':team.preferred.en);
      const content=JSON.stringify({en:'Is this team full M0W1?'});
      return response(provider==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:content}]}}]}:provider==='openai'?{status:'completed',output:[{content:[{type:'output_text',text:content}]}]}:{done:true,done_reason:'stop',message:{content}});
    });
    await translator.translate({text:'올명전 팀과 한 명만 명전인 팀을 비교해.',sourceLanguage:'ko',targets:['en']});
  }
});

test('explicit combat attributes reject missing or substituted names while ordinary wind and code remain unaffected', () => {
  const text='The boss is fire weak, but not wind weak.';
  assert.doesNotThrow(()=>validateCombatAttributes(text,{ko:'보스는 불 약점이지만 바람 약점은 아니다.',ja:'炎が弱点ですが風は弱点ではない。','zh-CN':'弱火但不弱风。',en:'Weak to Fire, but not Wind.'}));
  assert.doesNotThrow(()=>validateCombatAttributes(text,{ko:'화염 약점이지만 바람 약점은 아니다.'}));
  assert.throws(()=>validateCombatAttributes(text,{ko:'화염 약점이지만 빙결 약점은 아니다.'}),error=>error.code==='TRANSLATION_ATTRIBUTE_MISMATCH');
  assert.throws(()=>validateCombatAttributes(text,{ko:'보스는 불 약점이다.'}),error=>error.code==='TRANSLATION_ATTRIBUTE_MISMATCH');
  assert.doesNotThrow(()=>validateCombatAttributes('Wind the clock. It is a windy day.',{ko:'시계를 감아. 바깥 공기가 쌀쌀해.'}));
  assert.doesNotThrow(()=>validateCombatAttributes('code: `wind weak` https://example.com/fire-damage',{ko:'코드와 링크'}));
  assert.doesNotThrow(()=>validateCombatAttributes('Use the phrase "wind weakness".',{ko:'"wind weakness"라는 표현을 써.'}));
});

test('every provider receives Wind and AP, and a wrong Wind result is blocked after one request', async () => {
  for(const provider of ['gemini','openai','ollama'])for(const bad of [false,true]) {
    let calls=0;
    const config=settings({...creds,TRANSLATION_PROVIDER:provider,TRANSLATION_STYLE:'community',GEMINI_API_KEY:'test',OPENAI_API_KEY:'test',OLLAMA_CONTEXT_LENGTH:'32768'});
    const translator=new Translator(config,makeStore(),path,async(url,init)=>{
      if(url.endsWith('/api/show'))return response(model);
      calls++;
      const body=JSON.parse(init.body);
      const payload=JSON.parse(provider==='gemini'?body.contents[0].parts[0].text:provider==='openai'?body.input:body.messages[1].content);
      const terms=new Map(payload.glossary.map(e=>[e.id,e]));
      assert.equal(terms.get('attribute:wind')?.outputPreferred.ko,'바람');
      assert.equal(terms.get('attribute:fire')?.outputPreferred.ko,'불');
      assert.equal(terms.get('stat:31300')?.outputPreferred.ko,'이상마');
      const content=JSON.stringify({ko:bad?'화염 약점이지만 빙결 약점은 아니다. 이상마도 챙겨.':'불 약점이지만 바람 약점은 아니다. 이상마도 챙겨.'});
      return response(provider==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:content}]}}]}:provider==='openai'?{status:'completed',output:[{content:[{type:'output_text',text:content}]}]}:{done:true,done_reason:'stop',message:{content}});
    });
    const promise=translator.translate({text:'The boss is fire weak, not wind weak. Build more AP.',sourceLanguage:'en',targets:['ko']});
    if(bad)await assert.rejects(()=>promise,error=>error.code==='TRANSLATION_ATTRIBUTE_MISMATCH');
    else assert((await promise).ko.includes('바람'));
    assert.equal(calls,1);
  }
});

test('boss slang and an unbracketed barrier reach every provider with canonical output names', async () => {
  for(const provider of ['gemini','openai','ollama']){
    const config=settings({...creds,TRANSLATION_PROVIDER:provider,TRANSLATION_STYLE:'community',GEMINI_API_KEY:'test',OPENAI_API_KEY:'test',OLLAMA_CONTEXT_LENGTH:'32768'});
    const translator=new Translator(config,makeStore(),path,async(url,init)=>{
      if(url.endsWith('/api/show'))return response(model);
      const body=JSON.parse(init.body);
      const payload=JSON.parse(provider==='gemini'?body.contents[0].parts[0].text:provider==='openai'?body.input:body.messages[1].content);
      const terms=new Map(payload.glossary.map(e=>[e.id,e]));
      assert.equal(terms.get('monster:30009')?.outputPreferred.ko,'미지의 복합 침식체');
      assert.equal(terms.get('community:typhon-family-name')?.outputPreferred.ko,'티폰');
      assert.equal(terms.get('community:scorched-horizon-base-name')?.outputPreferred.ko,'태양의 잔불');
      assert.equal(terms.get('community:shill-buff')?.outputPreferred.ko,'접대');
      assert.equal(terms.get('noun:2000001')?.outputPreferred.en,'Corruptive Barrier');
      const content=JSON.stringify({ko:'미지의 복합 침식체, 티폰, 태양의 잔불의 접대 버프와 침식 장벽.'});
      return response(provider==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:content}]}}]}:provider==='openai'?{status:'completed',output:[{content:[{type:'output_text',text:content}]}]}:{done:true,done_reason:'stop',message:{content}});
    });
    await translator.translate({text:'UCC, typhon, scorched horizon and shill buffs. 침식 장벽',sourceLanguage:'en',targets:['ko']});
  }
});

test('layout restores paragraphs, numbered lists, indentation and blank lines even when AI flattens whitespace', () => {
  const source = '1) 첫 번째\n\n2) 두 번째\n    - 항목\n\n끝';
  const layout = protectLayout(source);
  const output = layout.text.replace('첫 번째', 'First').replace('두 번째', 'Second').replace('항목', 'Item').replace('끝', 'End').replace(/\s+/g, ' ');
  assert.equal(layout.restore(output), '1) First\n\n2) Second\n    - Item\n\nEnd');
  const code = '```\r\n  item\r\n\r\n```';
  assert.equal(protectLayout(code).restore(protectLayout(code).text), code);
  const collision = 'literal [[ZZZ_BREAK_0]]\nnext';
  assert.equal(protectLayout(collision).restore(protectLayout(collision).text), collision);
  assert.equal(protectLayout('one line').restore('one translated line'), 'one translated line');
});

test('layout rejects missing, repeated and reordered breaks rather than publishing a misleading flattened translation', () => {
  const layout = protectLayout('First\nSecond\nThird');
  for (const output of ['First Second Third', 'First [[ZZZ_BREAK_0]] Second',
    'First [[ZZZ_BREAK_0]] Second [[ZZZ_BREAK_0]] Third [[ZZZ_BREAK_1]]',
    'First [[ZZZ_BREAK_1]] Second [[ZZZ_BREAK_0]] Third']) assert.throws(() => layout.restore(output), UserError);
});

test('all providers preserve logical lines and emoji in one generation for multiple targets', async () => {
  for (const provider of ['gemini', 'openai', 'ollama']) {
    let generations = 0;
    const store = makeStore();
    const translator = new Translator(settings({ ...creds, TRANSLATION_PROVIDER: provider, GEMINI_API_KEY: 'test', OPENAI_API_KEY: 'test' }), store, path,
      async (url, init) => {
        if (url.endsWith('/api/show')) return response(model);
        generations++;
        const body = JSON.parse(init.body);
        const payload = JSON.parse(provider === 'gemini' ? body.contents[0].parts[0].text : provider === 'openai' ? body.input : body.messages[1].content);
        const text = payload.message.text.replace('첫 번째', 'First').replace('두 번째', 'Second').replace(/\s+/g, ' ');
        const content = JSON.stringify({ en: text, ko: payload.message.text });
        return response(provider === 'gemini' ? { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: content }] } }] }
          : provider === 'openai' ? { status: 'completed', output: [{ content: [{ type: 'output_text', text: content }] }] }
          : { done: true, done_reason: 'stop', message: { content } });
      });
    const output = await translator.translate({ text: '1) 첫 번째 😀\n\n2) 두 번째', sourceLanguage: 'ko', targets: ['en', 'ko'] });
    assert.equal(output.en, '1) First 😀\n\n2) Second');
    assert.equal(output.ko, '1) 첫 번째 😀\n\n2) 두 번째');
    assert.equal(generations, 1); assert.equal(store.count, 1);
  }
});

test('all providers receive verified character, stack and combo terminology before generation', async () => {
  // Synthetic input, with a mocked provider: this checks request construction,
  // not the quality of a real model and never sends submitted reports externally.
  for (const provider of ['gemini','openai','ollama']) {
    const translator=new Translator(settings({...creds,TRANSLATION_PROVIDER:provider,GEMINI_API_KEY:'test',OPENAI_API_KEY:'test'}),makeStore(),path,async(url,init)=>{
      if(url.endsWith('/api/show')) return response(model);
      const body=JSON.parse(init.body);
      const payload=JSON.parse(provider==='gemini'?body.contents[0].parts[0].text:provider==='openai'?body.input:body.messages[1].content);
      const glossary=new Map(payload.glossary.map(e=>[e.id,e]));
      assert.equal(glossary.get('character:1431').preferred.en,'Ye Shunguang');
      assert.equal(glossary.get('effect:1431:culmination').preferred.en,'Culmination');
      assert.equal(glossary.get('community:ex-ex-basic-combo').preferred.en,'EX Special Attack → EX Special Attack → Basic Attack');
      assert.equal(glossary.get('community:hold-ex-special').preferred.en,'hold EX Special Attack');
      const content=JSON.stringify({en:'Ye Shunguang: Culmination; EX Special Attack → EX Special Attack → Basic Attack; hold EX Special Attack.'});
      return response(provider==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:content}]}}]}:provider==='openai'?{status:'completed',output:[{content:[{type:'output_text',text:content}]}]}:{done:true,done_reason:'stop',message:{content}});
    });
    await translator.translate({text:'빛나 YSG 극치 강강평 강꾹',sourceLanguage:'ko',targets:['en']});
  }
});

test('Gemini timeouts and connection errors report a safe reason without retrying or exposing secrets', async () => {
  for (const error of [new DOMException('secret-key', 'TimeoutError'), Object.assign(new TypeError('secret-key'), { cause: { code: 'ECONNRESET' } })]) {
    let calls = 0;
    await assert.rejects(() => geminiTranslation({ timeoutMs: 30000, model: 'gemini-3.5-flash-lite', apiKey: 'secret-key' }, 'translate', {}, {}, async () => { calls++; throw error; }), failure => {
      assert(failure instanceof UserError); assert(!failure.message.includes('secret-key'));
      assert.equal(failure.code, error.cause?.code ?? error.name);
      assert.equal(failure.phase, 'request');
      assert(Number.isSafeInteger(failure.elapsedMs) && failure.elapsedMs >= 0);
      if (error.name === 'TimeoutError') assert(failure.message.includes('30초'));
      return true;
    });
    assert.equal(calls, 1);
  }
});

test('Gemini deadlines also identify interruptions while reading a successful response, without a second request', async () => {
  for (const error of [new DOMException('secret-key', 'TimeoutError'), Object.assign(new TypeError('secret-key'), {cause: {code: 'ECONNRESET'}})]) {
    let calls=0;
    await assert.rejects(() => geminiTranslation({timeoutMs:60000,model:'gemini-3.1-flash-lite',apiKey:'secret-key'},'translate',{}, {}, async()=>{
      calls++;
      return {ok:true,status:200,json:async()=>{throw error;}};
    }), failure=>{
      assert(failure instanceof UserError);
      assert.equal(failure.phase,'response');
      assert.equal(failure.code,error.cause?.code??error.name);
      assert(Number.isSafeInteger(failure.elapsedMs) && failure.elapsedMs>=0);
      assert(!failure.message.includes('secret-key'));
      if(error.name==='TimeoutError')assert(failure.message.includes('60초'));
      return true;
    });
    assert.equal(calls,1);
  }
});

test('Gemini retries an explicit temporary server failure once with backoff, preserving request and key', async () => {
  const calls = [], waits = []; let reservations = 0, cancelled = false;
  const config = { timeoutMs: 30000, model: 'gemini-3.1-flash-lite', apiKey: 'secret-key', maxOutputTokens: 600 };
  const value = await geminiTranslation(config, 'translate', { message: { text: 'QA' } }, { type: 'object' }, async (url, init) => {
    calls.push({ url, body: init.body });
    if (calls.length === 1) return { ok: false, status: 503, body: { async cancel() { cancelled = true; } } };
    return response({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"ko":"빠른 지원"}' }] } }] });
  }, { onRetry: () => { reservations++; }, wait: async ms => { waits.push(ms); } });
  assert.equal(calls.length, 2); assert.deepEqual(calls[0], calls[1]);
  assert.equal(reservations, 1); assert.equal(cancelled, true);
  assert.equal(waits.length, 1); assert(waits[0] >= 1000 && waits[0] < 1500);
  assert.equal(value.output, '{"ko":"빠른 지원"}');
});

test('Gemini bounds unavailable-server retries and never retries quota, bad keys or invalid models', async () => {
  for (const status of [503, 429, 400, 401, 403, 404]) {
    let calls = 0;
    await assert.rejects(() => geminiTranslation({ timeoutMs: 30000, model: 'gemini-3.1-flash-lite', apiKey: 'secret-key' }, '', {}, {}, async () => {
      calls++; return { ok: false, status, json: async () => ({ secret: 'secret-key' }) };
    }, { wait: async () => {} }), error => error instanceof UserError && !error.message.includes('secret-key'));
    assert.equal(calls, status === 503 ? 2 : 1);
  }
});

test('Gemini retry reserves a second guild-budget request and stops before sending when exhausted', async () => {
  for (const limit of [1, 2]) {
    let calls = 0; const usage = makeStore();
    const translator = new Translator(settings({ ...creds, TRANSLATION_PROVIDER: 'gemini', GEMINI_API_KEY: 'test', DAILY_REQUEST_LIMIT: String(limit) }), {
      ...usage, reserve(max) { if (this.count >= max) throw new UserError('오늘의 AI 요청 한도에 도달했습니다.'); this.count++; return 'day'; },
    }, path, async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 503 };
      return response({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }] });
    });
    if (limit === 1) await assert.rejects(() => translator.translate(input), /요청 한도/);
    else assert.deepEqual(await translator.translate(input), result);
    assert.equal(calls, limit);
    assert.equal(translator.store.count, limit);
  }
});

test('English prose cannot be published unchanged or paraphrased into a CJK channel', async () => {
  const original = 'i remember back in his 1.3 event if you hold dodge he will do the taunt and if enemy attacks during it he will auto parry';
  for (const provider of ['ollama', 'gemini', 'openai']) {
    const config = settings({ ...creds, TRANSLATION_PROVIDER: provider, GEMINI_API_KEY: 'test', OPENAI_API_KEY: 'test' });
    let calls = 0;
    const translator = new Translator(config, makeStore(), path, async url => {
      calls++;
      if (url.endsWith('/api/show')) return response(model);
      const content = JSON.stringify({ ko: original });
      return response(provider === 'ollama' ? { done: true, done_reason: 'stop', message: { content } } :
        provider === 'gemini' ? { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: content }] } }] } :
        { status: 'completed', output: [{ content: [{ type: 'output_text', text: content }] }] });
    });
    await assert.rejects(() => translator.translate({ text: original, sourceLanguage: 'en', targets: ['ko'] }), /영문을 반환/);
    assert.equal(calls, provider === 'ollama' ? 2 : 1);
  }
  assert.throws(() => validateTranslationLanguages(original, { ja: 'Hold dodge to taunt and parry attacks automatically.' }), UserError);
});

test('language check permits translated sentences, short names, code, links, and actual Korean input', () => {
  const english = 'Use Quick Assist after the EX Special Attack.';
  assert.doesNotThrow(() => validateTranslationLanguages(english, { ko: '강화 특수 스킬 이후 빠른 지원을 써.', ja: '強化特殊スキルの後にクイック支援を使って。', 'zh-CN': '强化特殊技后使用快速支援。' }));
  for (const text of ['QA', 'Anby Demara', 'https://example.com/a/b/c/d/e/f', '`one two three four five six`', '빠른 지원을 쓰고 다음 공격을 이어가면 돼.']) {
    assert.doesNotThrow(() => validateTranslationLanguages(text, { ko: text }));
  }
});

test('local default needs no API key; each external provider requires only its own key', () => {
  assert.equal(settings(creds).provider, 'ollama');
  assert.equal(settings({ ...creds, OPENAI_API_KEY: 'unused' }).apiKey, undefined);
  for (const [provider, key] of [['gemini', 'GEMINI_API_KEY'], ['openai', 'OPENAI_API_KEY']]) {
    assert.throws(() => settings({ ...creds, TRANSLATION_PROVIDER: provider }), new RegExp(key));
    assert.equal(settings({ ...creds, TRANSLATION_PROVIDER: provider, [key]: 'key' }).apiKey, 'key');
    assert.doesNotThrow(() => settings({ ...creds, TRANSLATION_PROVIDER: provider }, { requireTranslation: false }));
  }
  assert.throws(() => settings({ ...creds, TRANSLATION_PROVIDER: 'typo' }), UserError);
});

test('local mode rejects remote hosts, credentials, paths and cloud model names', () => {
  for (const url of ['https://ollama.com', 'http://example.com', 'http://localhost@evil.com', 'http://user:pass@localhost:11434', 'http://localhost:11434/api', 'http://localhost:11434?remote=1']) {
    assert.throws(() => settings({ ...creds, OLLAMA_URL: url }), UserError);
  }
  assert.throws(() => settings({ ...creds, OLLAMA_MODEL: 'qwen3:cloud' }), UserError);
});

test('local translator sends glossary and three targets in one generation without authorization', async () => {
  const calls = []; const store = makeStore();
  const translator = new Translator(settings(creds), store, path, async (url, init) => {
    calls.push(url); assert.equal(init.headers.Authorization, undefined); assert.equal(init.redirect, 'error');
    if (url.endsWith('/api/show')) return response(model);
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(init.body);
    assert.equal(body.think, false); assert.equal(body.stream, false);
    assert.deepEqual(body.format.required, input.targets);
    const payload = JSON.parse(body.messages[1].content);
    assert.equal(payload.glossary[0].id, 'combat:quick-assist');
    return response({ done: true, done_reason: 'stop', message: { content: JSON.stringify(result) }, prompt_eval_count: 100, eval_count: 20 });
  });
  assert.deepEqual(await translator.translate(input), result);
  assert.equal(calls.length, 2); assert.equal(store.count, 1);
  assert.deepEqual(store.usage, { input_tokens: 100, output_tokens: 20 });
});

test('renamed cloud model is rejected before any chat or cloud request', async () => {
  let count = 0;
  const translator = new Translator(settings(creds), makeStore(), path, async url => {
    count++; assert(url.endsWith('/api/show'));
    return response({ ...model, remote_model: 'cloud-model', remote_host: 'https://ollama.com' });
  });
  await assert.rejects(() => translator.translate(input), /클라우드/);
  assert.equal(count, 1);
});

test('local failures and incomplete or malformed output never invoke external providers', async () => {
  for (const data of [null, { done: false }, { done: true, done_reason: 'length', message: { content: '{}' } }, { done: true, done_reason: 'stop', message: { content: 'null' } }]) {
    const translator = new Translator(settings(creds), makeStore(), path, async url => {
      assert(url.startsWith('http://127.0.0.1:11434/'));
      return response(url.endsWith('/api/show') ? model : data);
    });
    await assert.rejects(() => translator.translate(input), UserError);
  }
});

test('oversized local context is reduced without changing the message', async () => {
  const config = settings(creds);
  const payload = { message: { text: 'QA' }, context: [{ text: 'x'.repeat(30000) }], reply: null, glossary: [{ id: 'qa' }] };
  await localTranslation(config, 'Translate', payload, { type: 'object' }, async (url, init) => {
    if (url.endsWith('/api/show')) return response(model);
    const sent = JSON.parse(JSON.parse(init.body).messages[1].content);
    assert.equal(sent.message.text, 'QA'); assert.equal(sent.context.length, 0); assert.equal(sent.glossary.length, 1);
    return response({ done: true, done_reason: 'stop', message: { content: '{}' } });
  });
  assert.equal(payload.context.length, 1);
});

test('Gemini batches targets, uses header key and schema, excludes reasoning from translation', async () => {
  const config = settings({ ...creds, TRANSLATION_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-secret' });
  const store = makeStore(); let calls = 0;
  const translator = new Translator(config, store, path, async (url, init) => {
    calls++; assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent');
    assert.equal(init.headers['x-goog-api-key'], 'test-secret'); assert(!url.includes('test-secret'));
    const body = JSON.parse(init.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.deepEqual(body.generationConfig.responseJsonSchema.required, input.targets);
    assert.equal(JSON.parse(body.contents[0].parts[0].text).glossary[0].id, 'combat:quick-assist');
    return response({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'reasoning', thought: true }, { text: JSON.stringify(result) }] } }], usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 20, thoughtsTokenCount: 3 } });
  });
  assert.deepEqual(await translator.translate(input), result); assert.equal(calls, 1);
  assert.deepEqual(store.usage, { input_tokens: 40, output_tokens: 23 });
});

test('Gemini quota failure does not retry, expose errors, or fall back to paid services', async () => {
  let calls = 0;
  const config = settings({ ...creds, TRANSLATION_PROVIDER: 'gemini', GEMINI_API_KEY: 'test', OPENAI_API_KEY: 'not-used' });
  const store = makeStore();
  const translator = new Translator(config, store, path, async url => {
    calls++; assert(url.startsWith('https://generativelanguage.googleapis.com/'));
    return { ok: false, status: 429, json: async () => ({ secret: 'SECRET' }) };
  });
  await assert.rejects(() => translator.translate(input), error => error instanceof UserError && /한도/.test(error.message) && !error.message.includes('SECRET'));
  assert.equal(calls, 1); assert.equal(store.count, 1);
});

test('Gemini blocked, truncated and invalid translations are never published', async () => {
  const config = settings({ ...creds, TRANSLATION_PROVIDER: 'gemini', GEMINI_API_KEY: 'test' });
  for (const data of [null, { promptFeedback: { blockReason: 'SAFETY' } }, { candidates: [{ finishReason: 'MAX_TOKENS' }] }, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"en":"only one"}' }] } }] }]) {
    const translator = new Translator(config, makeStore(), path, async () => response(data));
    await assert.rejects(() => translator.translate(input), UserError);
  }
});
