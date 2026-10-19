import { TEXT_LANGUAGES } from './languages.js';

export const FORM_FIELDS = {
  ko: { category:'신고 종류', term:'대상 용어 또는 원문', sourceLanguage:'원문 언어', targetLanguage:'수정할 언어', current:'현재 표기 또는 약어', suggestion:'제안하는 명칭 또는 약어', explanation:'문제 설명과 사용 문맥', reference:'참고 링크 또는 스크린샷', consent:'공개 신고 안내 확인' },
  en: { category:'Report category', term:'Term or original text', sourceLanguage:'Source language', targetLanguage:'Language to correct', current:'Current name or shorthand', suggestion:'Suggested name or shorthand', explanation:'Problem and usage context', reference:'Reference links or screenshots', consent:'Public report notice' },
  ja: { category:'報告の種類', term:'対象用語または原文', sourceLanguage:'原文の言語', targetLanguage:'修正する言語', current:'現在の名称または略語', suggestion:'提案する名称または略語', explanation:'問題の説明と使用文脈', reference:'参考リンクまたはスクリーンショット', consent:'公開報告の確認' },
  'zh-CN': { category:'举报类型', term:'目标术语或原文', sourceLanguage:'原文语言', targetLanguage:'要修正的语言', current:'当前名称或简称', suggestion:'建议名称或简称', explanation:'问题说明及使用语境', reference:'参考链接或截图', consent:'公开举报确认' },
};
export const FORM_CATEGORIES = {
  abbreviation: ['약어·입력 별칭', 'Shorthand / input alias', '略語・入力別名', '简称及输入别名'],
  'community-output': ['커뮤니티 출력 약어', 'Community output shorthand', 'コミュニティ出力略語', '社区输出简称'],
  'official-name': ['공식 명칭 대응 오류', 'Official-name mapping error', '正式名称の対応誤り', '官方名称对应错误'],
  missing: ['누락된 용어', 'Missing term', '未登録の用語', '缺失术语'],
  rule: ['설명·적용 규칙 오류', 'Meaning / usage-rule error', '説明・適用ルールの誤り', '说明或适用规则错误'],
  other: ['기타 번역 오류', 'Other translation error', 'その他の翻訳誤り', '其他翻译错误'],
};
const labels=new Map(Object.values(FORM_FIELDS).flatMap(fields=>Object.entries(fields).map(([key,label])=>[label,key])));
const categories=new Map(Object.entries(FORM_CATEGORIES).flatMap(([key,values])=>values.map(value=>[value,key])));
const clean=value=>value==='_No response_'?'':value.trim();
export function parseGlossaryIssueBody(body) {
  if(typeof body!=='string'||body.length>65536)return null;
  const headings=[...body.matchAll(/^### ([^\r\n]+)\r?\n/gm)].filter(match=>labels.has(match[1].trim()));
  const fields={};
  for(let i=0;i<headings.length;i++){
    const match=headings[i],key=labels.get(match[1].trim());
    if(Object.hasOwn(fields,key))return null;
    fields[key]=clean(body.slice(match.index+match[0].length,headings[i+1]?.index??body.length).trim());
  }
  const category=categories.get(fields.category);
  const language=value=>{
    if(value==='Unknown / 不明 / 알 수 없음 / 未知')return null;
    const code=/\(([^()]+)\)$/.exec(value||'')?.[1];
    return Object.hasOwn(TEXT_LANGUAGES,code)?code:undefined;
  };
  const sourceLanguage=language(fields.sourceLanguage),targetLanguage=language(fields.targetLanguage);
  if(!category||!fields.term||fields.term.length>6000||!fields.explanation||fields.explanation.length>1000||sourceLanguage===undefined||!targetLanguage
    ||(fields.current||'').length>12000||(fields.suggestion||'').length>2000||(fields.reference||'').length>2000)return null;
  return {source:{text:fields.term,language:sourceLanguage,provenance:'user-submitted-glossary-report',matchesTranslationSource:null},
    target:{text:fields.current||fields.term,language:targetLanguage},
    issue:{type:['abbreviation','community-output','official-name'].includes(category)?'term':category==='rule'?'meaning':category,fragment:'',explanation:fields.explanation,suggestion:fields.suggestion||''},
    metadata:{reportCategory:category,...(fields.reference?{reference:fields.reference}:{})},review:{note:'',actor:''}};
}
