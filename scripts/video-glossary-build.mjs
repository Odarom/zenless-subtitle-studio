import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalog, glossaryHash, githubRepository } from '../video/glossary-updates.mjs';
import { DEFAULT_GLOSSARY_REPOSITORY } from '../video/distribution.mjs';
import { buildCatalogBrowser, databaseGuides } from './glossary-browse.mjs';
import { buildConceptRelease } from './database-export.mjs';

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
  const conceptRelease = buildConceptRelease(root, output, catalog, sha256);
  // Maintenance instructions belong to the authoring workspace. The public
  // database checkout has its own standalone consumer guide and example.
  const consumerNote = '[외부 개발자 시작하기](../database/README-ko.md) · [Developer quickstart](../database/README-en.md) · [開発者向け](../database/README-ja.md) · [开发者指南](../database/README-zh-CN.md)\n\n'
    + '> 아래의 갱신 명령은 관리용 작업 폴더에서만 실행합니다. 공개 DB 저장소에는 해당 관리 도구가 없습니다.\n'
    + '> Maintenance commands below require the authoring workspace; they are not included in this distribution.\n'
    + '> 以下の更新コマンドは管理用作業フォルダー専用です。この配布には管理ツールを含みません。\n'
    + '> 下方维护命令仅适用于维护工作区，本发布仓库不含这些管理工具。\n\n';
  writeFileSync(join(output, 'catalog/README.md'), consumerNote + readFileSync(join(root, 'glossary/README.md'), 'utf8'));
  const browseFiles = buildCatalogBrowser(catalog, output);
  const guides = databaseGuides(catalog, repository);
  const reportUrl = `https://github.com/${repository}/issues/new/choose`;
  const reporting = {
    ko: `[**프로그램 없이 용어·약어 오류 신고하기**](${reportUrl}) — 약어·입력 별칭, 커뮤니티 출력, 공식 명칭 오류, 누락 용어, 적용 규칙을 직접 작성할 수 있습니다. GitHub 로그인은 필요하며 신고 내용과 계정 이름은 공개됩니다. 개인정보·API 키·비공개 자료는 올리지 마세요. Discord·영상 신고와 같은 검토 목록으로 수집하며 제출만으로 DB가 바뀌지는 않습니다.`,
    en: `[**Report names or shorthand without installing a program**](${reportUrl}) — Report aliases, community output, official-name errors, missing terms or usage rules manually. GitHub login is required; the report and account name are public. Do not post personal information, API keys or private material. Reports join the Discord/video review queue; submission does not automatically change the DB.`,
    ja: `[**アプリなしで用語・略語の誤りを報告**](${reportUrl}) — 入力別名、コミュニティ出力、正式名の誤り、未登録用語、適用ルールを記入できます。GitHubログインが必要で、内容とアカウント名は公開されます。個人情報・APIキー・非公開資料は投稿しないでください。Discord・動画報告と同じ一覧で確認し、送信だけでDBは変更されません。`,
    'zh-CN': `[**无需程序，举报术语及简称错误**](${reportUrl}) — 可手动提交输入别名、社区输出、官方名称错误、缺失术语或适用规则。需要GitHub登录，内容和账号名公开。请勿发布个人信息、API密钥或非公开资料。与Discord及视频举报汇总审核，提交不会自动修改DB。`
  };
  const developerGuide = {
    ko: '[**외부 프로그램에서 DB 사용하기**](database/README-ko.md) — 개념별 JSON, 형식 명세, 독립 조회 도구와 실행 예제를 제공합니다. 기존 앱용 `zzz.json`과 업데이트 주소는 유지합니다.',
    en: '[**Use this DB in your own program**](database/README-en.md) — Complete concept JSON, a schema, standalone query helpers and a runnable example. Existing app `zzz.json` and update URLs remain compatible.',
    ja: '[**外部プログラムでDBを使う**](database/README-ja.md) — 概念別JSON、スキーマ、独立した検索ツールと実行例。既存アプリ用の `zzz.json` と更新URLは維持します。',
    'zh-CN': '[**在自己的程序中使用DB**](database/README-zh-CN.md) — 提供完整概念JSON、格式规范、独立查询工具及可运行示例；保留既有程序的 `zzz.json` 与更新地址。'
  };
  for (const [locale, guide] of Object.entries(guides)) { guides[locale] = guide.replace(/^(# [^\n]*\n)/, '$1\n' + reporting[locale] + '\n\n' + developerGuide[locale] + '\n'); writeFileSync(join(output, `README-${locale}.md`), guides[locale]); }
  const languages = ['한국어', 'English', '日本語', '简体中文'];
  const navigation = languages.map(label => `[${label}](#${label.toLowerCase()})`).join(' · ');
  const sections = Object.values(guides).map((guide, index) => `## ${languages[index]}\n\n${guide.replace(/^# .*\n\n/, '')}`);
  writeFileSync(join(output, 'README.md'), '# ZZZ translation database\n\n[카탈로그 둘러보기 · Browse · 用語一覧 · 浏览目录](catalog/BROWSE.md)\n\n' + navigation + '\n\n' + sections.join('\n---\n\n'));
  return { output, repository, manifest, browseFiles, conceptRelease };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(buildGlossaryRelease(), null, 2));
