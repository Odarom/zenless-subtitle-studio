import { UserError } from '../src/config.js';

export async function geminiLimitError(response, model) {
  let data; try { data = await response.json(); } catch {}
  const limits = [];
  let retryAfterSeconds;
  for (const detail of (Array.isArray(data?.error?.details) ? data.error.details : []).slice(0, 20)) {
    if (detail?.['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure') {
      for (const row of (Array.isArray(detail.violations) ? detail.violations : []).slice(0, 20)) {
        const metric = /^[A-Za-z0-9_./-]{1,200}$/.test(row.quotaMetric || '') ? row.quotaMetric : '';
        const quotaId = /^[A-Za-z0-9_.-]{1,200}$/.test(row.quotaId || '') ? row.quotaId : '';
        if (!metric && !quotaId) continue;
        const name = metric + ' ' + quotaId;
        const type = /input.?token/i.test(name) ? 'input-tokens-minute' : /requests.*(?:perday|daily)|(?:perday|daily).*requests/i.test(name) ? 'requests-day' : /requests.*(?:perminute)|(?:perminute).*requests/i.test(name) ? 'requests-minute' : 'other';
        const value = typeof row.quotaValue === 'number' || typeof row.quotaValue === 'string' && /^\d{1,15}$/.test(row.quotaValue) ? Number(row.quotaValue) : undefined;
        const limit = Number.isSafeInteger(value) && value >= 0 ? value : null;
        if (!limits.some(item => item.metric === metric && item.quotaId === quotaId && item.limit === limit)) limits.push({ type, limit, metric, quotaId });
      }
    } else if (detail?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && /^\d{1,6}(?:\.\d{1,3})?s$/.test(detail.retryDelay || '')) {
      const seconds = Number(detail.retryDelay.slice(0, -1)); if (seconds <= 604800) retryAfterSeconds = seconds;
    }
  }
  const type = limits.find(item => item.limit === 0)?.type || limits[0]?.type;
  const message = limits.some(item => item.limit === 0) ? 'Gemini가 이 프로젝트·모델의 할당량을 0으로 반환했습니다. AI Studio에서 모델 사용 가능 여부와 사용률 한도를 확인하세요.'
    : type === 'input-tokens-minute' ? 'Gemini 분당 입력 토큰 한도에 도달했습니다. 요청 1회에 보낸 텍스트도 이 한도에 포함됩니다.'
    : type === 'requests-day' ? 'Gemini 하루 요청 한도에 도달했습니다. AI Studio에서 한도 초기화 시점을 확인하세요.'
    : type === 'requests-minute' ? 'Gemini 분당 요청 횟수 한도에 도달했습니다. 같은 프로젝트의 다른 호출도 함께 계산됩니다.'
    : 'Gemini 사용량 제한(HTTP 429)입니다. 어떤 한도인지 응답에 표시되지 않았습니다. AI Studio의 모델별 사용률 한도를 확인하세요.';
  const error = new UserError(message);
  error.apiLimit = { provider: 'gemini', model, limits, ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}) };
  // Deliberately omit raw messages, project numbers, credentials and dimensions.
  return error;
}
