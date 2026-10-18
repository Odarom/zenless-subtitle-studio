import { UserError } from './config.js';

export async function checkLocalModel(config, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(`${config.ollamaUrl}/api/show`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model }),
    });
  } catch { throw new UserError('로컬 AI에 연결할 수 없습니다. local-ai.cmd를 실행해 두세요.'); }
  if (!response.ok) throw new UserError(`로컬 모델 확인 실패(HTTP ${response.status}). local-ai.cmd에서 모델을 준비하세요.`);
  let data;
  try { data = await response.json(); } catch { throw new UserError('로컬 AI의 모델 정보를 읽지 못했습니다.'); }
  if (!data || data.remote_model || data.remote_host) throw new UserError('클라우드 모델은 사용할 수 없습니다. 다운로드한 로컬 모델을 선택하세요.');
  if (!data.details || !data.model_info) throw new UserError('로컬 모델의 정보를 확인하지 못했습니다. Ollama와 모델 설치를 확인하세요.');
  return data;
}

export async function localTranslation(config, instructions, payload, schema, fetcher = fetch) {
  await checkLocalModel(config, fetcher);
  // Reserve ample space for the schema, chat template and generated text. UTF-8 byte
  // count is a conservative input budget; discard older context before glossary.
  const input = structuredClone(payload);
  const fits = () => Buffer.byteLength(instructions + JSON.stringify(input) + JSON.stringify(schema), 'utf8') < config.localContext - config.maxOutputTokens - 1024;
  while (!fits() && input.context.length) input.context.shift();
  if (!fits()) input.reply = null;
  while (!fits() && input.glossary.length) input.glossary.pop();
  if (!fits()) throw new UserError('로컬 모델의 문맥 한도를 넘었습니다. 메시지를 줄이거나 OLLAMA_CONTEXT_LENGTH를 늘리세요.');
  let response;
  try {
    response = await fetcher(`${config.ollamaUrl}/api/chat`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(config.timeoutMs),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model, stream: false, think: false, format: schema, keep_alive: '5m',
        messages: [{ role: 'system', content: instructions }, { role: 'user', content: JSON.stringify(input) }],
        options: { temperature: 0, num_ctx: config.localContext, num_predict: config.maxOutputTokens },
      }),
    });
  } catch { throw new UserError('로컬 AI 응답 시간이 초과되었거나 연결이 끊겼습니다. 실행 창을 확인하세요. 자동 재요청하지 않았습니다.'); }
  if (!response.ok) throw new UserError(`로컬 번역 실패(HTTP ${response.status}). 모델 설치와 메모리 여유를 확인하세요.`);
  let data;
  try { data = await response.json(); } catch { throw new UserError('로컬 AI 응답을 읽지 못했습니다.'); }
  if (data?.done !== true || data.done_reason !== 'stop' || typeof data.message?.content !== 'string') throw new UserError('로컬 번역이 끝까지 생성되지 않았습니다. 문장을 줄이거나 출력 한도를 확인하세요.');
  return { output: data.message.content, usage: { input_tokens: data.prompt_eval_count, output_tokens: data.eval_count } };
}
