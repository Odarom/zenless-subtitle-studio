import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalog, glossaryHash, githubRepository } from '../video/glossary-updates.mjs';
import { DEFAULT_GLOSSARY_REPOSITORY } from '../video/distribution.mjs';
import { buildCatalogBrowser, databaseGuides } from './glossary-browse.mjs';

export function buildGlossaryRelease(root = resolve(import.meta.dirname, '..'), output = join(root, 'dist', 'glossary-github'), repository = DEFAULT_GLOSSARY_REPOSITORY) {
  githubRepository(repository);
  const bytes = readFileSync(join(root, 'glossary', 'zzz.json')), catalog = validateCatalog(JSON.parse(bytes)), sha256 = glossaryHash(bytes);
  const version = `${catalog.retrievedAt || 'reviewed'}-${sha256.slice(0, 12)}`;
  mkdirSync(join(output, 'releases'), { recursive: true }); mkdirSync(join(output, 'catalog'), { recursive: true });
  mkdirSync(join(output, '.github', 'ISSUE_TEMPLATE'), { recursive: true });
  for (const file of ['config.yml', 'glossary-ko.yml', 'glossary-en.yml', 'glossary-ja.yml', 'glossary-zh-CN.yml']) copyFileSync(join(root, 'glossary', 'issue-templates', file), join(output, '.github', 'ISSUE_TEMPLATE', file));
  writeFileSync(join(output, 'releases', `${sha256}.json`), bytes);
  for (const file of ['zzz.json', 'sources.json', 'community.json', 'curated.json', 'reviewed-mechanics.json', 'localizations.json', 'README.md', 'ABBREVIATIONS.md', 'LIFECYCLE.md', 'classification.json', 'TAGS.md']) copyFileSync(join(root, 'glossary', file), join(output, 'catalog', file));
  const manifest = { schema: 1, version, sha256, bytes: bytes.length, count: catalog.entries.length, file: `releases/${sha256}.json`, sourceVersion: catalog.sourceVersion || null, languages: catalog.textLanguages || ['ko', 'en', 'ja', 'zh-CN'], coverage: catalog.localizationCoverage || null };
  writeFileSync(join(output, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const browseFiles = buildCatalogBrowser(catalog, output);
  const guides = databaseGuides(catalog, repository);
  const reportUrl = `https://github.com/${repository}/issues/new/choose`;
  const reporting = {
    ko: `[**프로그램 없이 용어·약어 오류 신고하기**](${reportUrl}) — 약어·입력 별칭, 커뮤니티 출력, 공식 명칭 오류, 누락 용어, 적용 규칙을 직접 작성할 수 있습니다. GitHub 로그인은 필요하며 신고 내용과 계정 이름은 공개됩니다. 개인정보·API 키·비공개 자료는 올리지 마세요. Discord·영상 신고와 같은 검토 목록으로 수집하며 제출만으로 DB가 바뀌지는 않습니다.`,
    en: `[**Report names or shorthand without installing a program**](${reportUrl}) — Report aliases, community output, official-name errors, missing terms or usage rules manually. GitHub login is required; the report and account name are public. Do not post personal information, API keys or private material. Reports join the Discord/video review queue; submission does not automatically change the DB.`,
    ja: `[**アプリなしで用語・略語の誤りを報告**](${reportUrl}) — 入力別名、コミュニティ出力、正式名の誤り、未登録用語、適用ルールを記入できます。GitHubログインが必要で、内容とアカウント名は公開されます。個人情報・APIキー・非公開資料は投稿しないでください。Discord・動画報告と同じ一覧で確認し、送信だけでDBは変更されません。`,
    'zh-CN': `[**无需程序，举报术语及简称错误**](${reportUrl}) — 可手动提交输入别名、社区输出、官方名称错误、缺失术语或适用规则。需要GitHub登录，内容和账号名公开。请勿发布个人信息、API密钥或非公开资料。与Discord及视频举报汇总审核，提交不会自动修改DB。`
  };
  for (const [locale, guide] of Object.entries(guides)) { guides[locale] = guide.replace(/^(# [^\n]*\n)/, '$1\n' + reporting[locale] + '\n'); writeFileSync(join(output, `README-${locale}.md`), guides[locale]); }
  const languages = ['한국어', 'English', '日本語', '简体中文'];
  const navigation = languages.map(label => `[${label}](#${label.toLowerCase()})`).join(' · ');
  const sections = Object.values(guides).map((guide, index) => `## ${languages[index]}\n\n${guide.replace(/^# .*\n\n/, '')}`);
  writeFileSync(join(output, 'README.md'), '# ZZZ translation database\n\n[카탈로그 둘러보기 · Browse · 用語一覧 · 浏览目录](catalog/BROWSE.md)\n\n' + navigation + '\n\n' + sections.join('\n---\n\n'));
  return { output, repository, manifest, browseFiles };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(buildGlossaryRelease(), null, 2));
