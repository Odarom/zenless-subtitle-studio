import { UserError } from './config.js';

function connectionFailure(error, config, startedAt, phase) {
  const timedOut = ['TimeoutError', 'AbortError'].includes(error.name) || ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'].includes(error.cause?.code);
  const failure = new UserError(timedOut
    ? `Gemini가 ${Math.ceil(config.timeoutMs / 1000)}초 안에 응답하지 않아 이 메시지의 번역을 중단했습니다. 잠시 후 다시 보내주세요.`
    : 'Gemini 연결이 끊겨 이 메시지를 번역하지 못했습니다. 잠시 후 다시 보내주세요.');
  const code = error.cause?.code ?? error.name;
  if (typeof code === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(code)) failure.code = code;
  failure.phase = phase;
  failure.elapsedMs = Math.round(performance.now() - startedAt);
  return failure;
}

export async function geminiTranslation(config, instructions, payload, schema, fetcher = fetch, { onRetry = () => {}, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), maxAttempts = 2, rateLimitError, requestError } = {}) {
  let response;
  const startedAt = performance.now();
  const temporaryStatuses = new Set([500, 502, 503, 504]);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(config.timeoutMs),
        headers: { 'x-goog-api-key': config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
          generationConfig: {
            responseMimeType: 'application/json', responseJsonSchema: schema,
            maxOutputTokens: config.maxOutputTokens,
            // Gemini 3 Flash supports minimal reasoning; 2.5 Flash can disable it.
            ...(/^gemini-3.*flash/.test(config.model) ? { thinkingConfig: { thinkingLevel: 'MINIMAL' } } :
              /^gemini-2\.5-flash/.test(config.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      });
    } catch (error) {
      throw connectionFailure(error, config, startedAt, 'request');
    }
    if (temporaryStatuses.has(response.status) && attempt + 1 < maxAttempts) {
      // Retry only explicit server failures. A timeout may already have generated a billed result.
      try { await response.body?.cancel(); } catch {}
      onRetry(); // Reserve the second request against this server's quota before sending it.
      await wait(1000 + Math.floor(Math.random() * 500));
      continue;
    }
    break;
  }
  if (response.status === 429) {
    if (rateLimitError) throw await rateLimitError(response);
    throw new UserError('Gemini 사용 한도에 도달했습니다. AI Studio에서 무료 한도와 재사용 가능 시간을 확인하세요. 다른 API로 자동 전환하지 않았습니다.');
  }
  if (temporaryStatuses.has(response.status)) {
    const error = new UserError(maxAttempts === 1 ? `Gemini 서버가 일시적으로 요청을 처리하지 못했습니다(HTTP ${response.status}). 자동 재요청하지 않았습니다.` : `Gemini 서버가 일시적으로 요청을 처리하지 못했습니다(HTTP ${response.status}). 한 번 재시도했지만 실패했습니다. 잠시 후 다시 보내주세요.`);
    error.code = 'GEMINI_UNAVAILABLE';
    throw error;
  }
  if (!response.ok) {
    if (requestError) throw await requestError(response);
    throw new UserError(`Gemini 요청 실패(HTTP ${response.status}). API 키·모델·프로젝트의 사용 가능 여부를 확인하세요.`);
  }
  let data;
  try { data = await response.json(); } catch (error) {
    if (['TimeoutError', 'AbortError', 'TypeError'].includes(error.name) || error.cause?.code) throw connectionFailure(error, config, startedAt, 'response');
    throw new UserError('Gemini 응답을 읽지 못했습니다.');
  }
  const candidate = data?.candidates?.[0];
  if (data?.promptFeedback?.blockReason || candidate?.finishReason !== 'STOP') throw new UserError('Gemini가 번역을 완료하지 못했습니다. 문장을 줄이거나 출력 한도를 확인하세요.');
  const output = (candidate.content?.parts ?? []).filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
  const usage = data.usageMetadata ?? {};
  return { output, usage: { input_tokens: usage.promptTokenCount, output_tokens: (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0) } };
}
