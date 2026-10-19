// Use provider error text only for classification; never store/display the raw
// body, which may echo submitted text, keys, project IDs or local filenames.
export async function geminiRequestError(response) {
  let data; try { data = await response.json(); } catch {}
  const message = typeof data?.error?.message === 'string' ? data.error.message.slice(0, 32000) : '';
  const status = Number(response.status), fields = (Array.isArray(data?.error?.details) ? data.error.details : [])
    .flatMap(item => Array.isArray(item?.fieldViolations) ? item.fieldViolations : [])
    .map(item => typeof item?.field === 'string' ? item.field : '').join(' ');
  let category = 'request', text;
  if (/response[_ .]?(?:json[_ .]?)?schema|schema.*(?:complex|constraint|state|nest|large)|constraint.*too many states|minItems|maxItems|enum/i.test(message + ' ' + fields)) {
    category = 'schema'; text = 'Gemini가 번역 응답 형식 제약을 거절했습니다. 프로그램의 요청 형식 문제일 수 있습니다. 키를 바꾸거나 같은 요청을 반복하지 마세요.';
  } else if (/input.*tokens?.*(?:exceed|limit)|request.*(?:payload|size).*(?:exceed|too large)/i.test(message)) {
    category = 'input'; text = 'Gemini가 입력 크기를 초과한 요청으로 거절했습니다. 영상과 용어집의 전송 범위를 확인하세요. 자동 재요청하지 않았습니다.';
  } else if (status === 401 || /API[_ ]KEY[_ ]INVALID|API key (?:not valid|is invalid|expired)/i.test(message)) {
    category = 'key'; text = 'Gemini가 API 키를 유효하지 않은 것으로 반환했습니다. 등록한 키와 키의 사용 제한을 확인하세요.';
  } else if (status === 403) {
    category = 'permission'; text = 'Gemini 접근 권한이 거절되었습니다. 프로젝트·모델·지역의 사용 권한을 확인하세요.';
  } else if (status === 404) {
    category = 'model'; text = 'Gemini에서 요청한 모델을 찾지 못했습니다. 모델 이름과 사용 가능 여부를 확인하세요.';
  } else text = `Gemini가 요청을 거절했습니다(HTTP ${status}). 응답에서 원인을 분류하지 못했습니다. 요청 형식이나 모델 옵션을 확인하세요. 자동 재요청하지 않았습니다.`;
  const error = new Error(text); error.code = 'GEMINI_REQUEST_REJECTED'; error.apiRequestError = { provider: 'gemini', status, category };
  return error;
}
