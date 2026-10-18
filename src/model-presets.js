import { UserError } from './config.js';

// Model IDs checked against the providers' official model pages on 2026-10-08.
// Availability, free quotas and billing remain properties of the user's project.
export const API_MODEL_PRESETS = {
  gemini: [
    { label: 'Gemini 3.1 Flash-Lite (기본)', value: 'gemini-3.1-flash-lite', description: '이 봇에서 채팅 번역을 확인한 모델' },
    { label: 'Gemini 3.5 Flash-Lite', value: 'gemini-3.5-flash-lite', description: '이 봇에서 채팅 번역을 확인한 Flash-Lite 모델' },
    { label: 'Gemini 3 Flash (Preview)', value: 'gemini-3-flash-preview', description: 'Flash 프리뷰 모델 · 사용 한도는 프로젝트에서 확인' },
  ],
  openai: [
    { label: 'GPT-4.1 mini (기본)', value: 'gpt-4.1-mini', description: '기존 OpenAI 기본 모델 · API 별도 과금' },
    { label: 'GPT-4.1', value: 'gpt-4.1', description: 'GPT-4.1 계열의 전체 모델 · API 별도 과금' },
  ],
};
export const API_MODELS = Object.fromEntries(Object.entries(API_MODEL_PRESETS).map(([provider, presets]) => [provider, presets[0].value]));

export function modelPresetOptions(provider, currentModel = API_MODELS[provider]) {
  const presets = API_MODEL_PRESETS[provider];
  if (!presets) throw new UserError('Gemini 또는 OpenAI를 선택하세요.');
  const known = presets.some(preset => preset.value === currentModel);
  return [
    ...presets.map(preset => ({ ...preset, default: preset.value === currentModel })),
    { label: '직접 입력', value: 'custom', description: '목록에 없는 텍스트 모델의 이름을 아래에 입력', default: !known },
  ];
}

export function resolveModelChoice(provider, selected, customModel) {
  if (selected === 'custom') {
    const model = typeof customModel === 'string' ? customModel.trim() : '';
    if (!model) throw new UserError('직접 입력을 선택했다면 「직접 입력할 모델 이름」도 입력하세요.');
    return model;
  }
  if (!API_MODEL_PRESETS[provider]?.some(preset => preset.value === selected)) {
    throw new UserError('선택한 서비스의 모델 목록에서 하나를 고르거나 직접 입력을 선택하세요.');
  }
  return selected;
}
