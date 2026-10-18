import {UserError} from './config.js';

const attributes = [
  {en:'Wind',ko:'바람',ja:'風','zh-CN':'风'},
  {en:'Fire',ko:'불',ja:'炎','zh-CN':'火'},
  {en:'Ice',ko:'얼음',ja:'氷','zh-CN':'冰'},
  {en:'Electric',ko:'전기',ja:'電気','zh-CN':'电'},
  {en:'Ether',ko:'에테르',ja:'エーテル','zh-CN':'以太'},
  {en:'Physical',ko:'물리',ja:'物理','zh-CN':'物理'},
];
const prose = text => text.replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g,' ');

// A narrow check for explicit English combat-attribute phrases, not a general
// semantic verifier. It preserves quoted English labels and does not infer
// attributes from character names, stories, plain adjectives or URLs.
export function validateCombatAttributes(source, translations) {
  const text=prose(source);
  for(const attribute of attributes) {
    const name=attribute.en;
    const explicit=new RegExp(`\\b${name}[ -]+(?:weak(?:ness)?|resistan(?:t|ce)|(?:dmg|damage))\\b|\\b(?:weak|resistant)\\s+to\\s+${name}\\b|\\b(?:weakness|resistance)\\s+to\\s+${name}\\b`,'i');
    if(!explicit.test(text))continue;
    for(const [target,output] of Object.entries(translations)) {
      const rendering=attribute[target];
      const body=prose(output);
      if(!rendering || body.includes(rendering) || new RegExp(`\\b${name}\\b`,'i').test(body))continue;
      // Common Korean names for the same Fire/Electric attribute remain valid.
      if(target==='ko' && ((name==='Fire' && /화염|화속/.test(body)) || (name==='Electric' && /전격|번개/.test(body))))continue;
      const error=new UserError(`AI 번역에서 ${attribute.ko} 속성 표기가 누락되거나 달라졌습니다. 잘못된 결과는 전송하지 않았습니다. 잠시 후 다시 보내주세요.`);
      error.code='TRANSLATION_ATTRIBUTE_MISMATCH';
      throw error;
    }
  }
}
