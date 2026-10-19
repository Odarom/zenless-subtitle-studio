import { readFileSync, writeFileSync, mkdirSync, copyFileSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { checkManifest, composeCatalog, glossaryDigest } from '../src/glossary-lifecycle.js';
import { loadGlossary } from '../src/translator.js';
import { sourceText } from './source-fetch.mjs';
import { applyLocalizations, applyCommunityDrafts } from '../src/glossary-localizations.js';
import { applyTermTags } from '../src/glossary-tags.js';

const root = resolve('glossary/updates');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
const candidatePath = resolve(root, 'candidate.json');
const reviewPath = resolve(root, 'review.json');
const inputFiles = ['community.json', 'curated.json', 'reviewed-mechanics.json', 'localizations.json', 'classification.json'];
const classify = catalog => applyTermTags(catalog, read('glossary/community.json'), read('glossary/classification.json'));
async function stage() {
  mkdirSync(root, { recursive: true });
  const checkedAt = new Date().toISOString(); const previousBytes = readFileSync('glossary/zzz.json', 'utf8');
  const previous = JSON.parse(previousBytes);
  const inputHashes = Object.fromEntries(inputFiles.map(file => [file, glossaryDigest(readFileSync(`glossary/${file}`, 'utf8'))]));
  const classificationEngineHash = glossaryDigest(readFileSync('src/glossary-tags.js', 'utf8'));
  const localizations = read('glossary/localizations.json');
  if (process.argv.includes('--classifications-only')) {
    const catalog = classify(previous), sources = readFileSync('glossary/sources.json', 'utf8');
    write(candidatePath, catalog); loadGlossary(candidatePath); writeFileSync(resolve(root, 'candidate-sources.json'), sources);
    const changed = catalog.entries.filter((entry, index) => JSON.stringify([entry.tags, entry.classification]) !== JSON.stringify([previous.entries[index].tags, previous.entries[index].classification])).map(entry => entry.id);
    const changes = { added: [], changed: [], promoted: [], removed: [], betaDifferences: [], classifications: changed };
    write(reviewPath, { version: 1, mode: 'classifications-only', checkedAt, inputHashes, classificationEngineHash, baselineHash: glossaryDigest(previousBytes), candidateHash: glossaryDigest(readFileSync(candidatePath, 'utf8')), sourcesHash: glossaryDigest(sources), changes });
    writeFileSync(resolve(root, 'review.md'), '# 용어 태그 분류 후보\n\n기존 명칭·입력 별칭·대표 출력·의미·규칙·출시 상태·추가 언어는 변경하지 않습니다. 원본 자료의 추가 수집 없이 현재 스냅샷에 분류만 덧붙입니다.\n\n' + JSON.stringify(catalog.classificationCounts, null, 2) + '\n\n분류 변경 ' + changed.length + '개\n' + changed.join('\n') + '\n');
    console.log(JSON.stringify({ mode: 'classifications-only', changed: changed.length, counts: catalog.classificationCounts })); return;
  }
  if (process.argv.includes('--localizations-only')) {
    const merged = applyLocalizations(applyCommunityDrafts(previous, read('glossary/community.json')), localizations);
    const catalog = classify({ ...merged.catalog, checkedAt });
    write(candidatePath, catalog); loadGlossary(candidatePath);
    const sources = readFileSync('glossary/sources.json', 'utf8');
    writeFileSync(resolve(root, 'candidate-sources.json'), sources);
    const changes = { added: [], changed: [], promoted: [], removed: [], betaDifferences: [], localizations: merged.report.applied, localizationHeld: merged.report.held };
    write(reviewPath, { version: 1, mode: 'localizations-only', checkedAt, inputHashes, classificationEngineHash, baselineHash: glossaryDigest(previousBytes), candidateHash: glossaryDigest(readFileSync(candidatePath, 'utf8')), sourcesHash: glossaryDigest(sources), changes });
    writeFileSync(resolve(root, 'review.md'), `# 기존 항목의 언어 추가 후보\n\n기존 네 언어 일치 및 live 항목에만 추가합니다. 기존 명칭·규칙·신규 ID는 변경하지 않습니다.\n\n적용 후보 ${merged.report.applied.length}개, 보류 ${merged.report.held.length}개.\n\n` + merged.report.applied.map(row => `${row.id}: ${row.languages.join(', ')}`).join('\n') + '\n');
    console.log(JSON.stringify({ mode: 'localizations-only', applied: merged.report.applied.length, held: merged.report.held.length, coverage: catalog.localizationCoverage }));
    return;
  }
  console.log('공개 자료의 정식·미출시 버전 목록을 확인하고 있습니다.');
  const manifest = JSON.parse(await sourceText('https://static.nanoka.cc/manifest.json')); const observedVersions = checkManifest(manifest);
  // A reviewed report correction need not import a newly published beta build.
  // Still observe the public manifest, and keep source selection explicit in
  // the review/metadata rather than pretending the previous beta is latest.
  const existingVersions = process.argv.includes('--existing-versions');
  const versions = existingVersions ? { ...observedVersions, live: previous.sourceVersion, beta: previous.betaVersion } : observedVersions;
  if (existingVersions && !/^\d+\.\d+(?:\.\d+)?(?:\+\d+)?$/.test(versions.live || '')) throw new Error('기존 자료 버전이 올바르지 않습니다.');
  function build(version, prerelease) {
    const output = resolve(root, prerelease ? 'beta.json' : 'live.json');
    const sources = resolve(root, prerelease ? 'beta-sources.json' : 'live-sources.json');
    const args = ['scripts/build-glossary.js', '--version', version, '--output', output, '--sources-output', sources];
    if (!process.argv.includes('--cached')) args.push('--download');
    if (prerelease) args.push('--prerelease');
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 900000, maxBuffer: 2 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`Could not build ${prerelease ? 'prerelease' : 'live'} sources: ${result.stderr?.slice(-800) ?? 'timed out'}`);
    loadGlossary(output);
    return { catalog: read(output), sources: read(sources) };
  }
  console.log(`출처 버전 확인: 정식 ${versions.live}, 미출시 ${versions.beta ?? '없음'}`);
  const live = build(versions.live, false), beta = versions.beta ? build(versions.beta, true) : null;
  const composed = composeCatalog(live.catalog, beta?.catalog, previous, checkedAt);
  const localized = applyLocalizations(applyCommunityDrafts(composed.catalog, read('glossary/community.json')), localizations);
  const catalog = classify(localized.catalog), changes = { ...composed.changes, localizations: localized.report.applied, localizationHeld: localized.report.held };
  write(candidatePath, catalog); loadGlossary(candidatePath);
  const sources = { version: versions.live, betaVersion: versions.beta, retrievedAt: live.sources.retrievedAt,
    manifest: { url: 'https://static.nanoka.cc/manifest.json', observedLive: observedVersions.live, observedLatest: observedVersions.latest, checkedAt, ...(existingVersions ? { selection: 'existing-versions', selectedLive: versions.live, selectedBeta: versions.beta } : {}) },
    sources: [...live.sources.sources, ...(beta?.sources.sources ?? [])], excluded: [...live.sources.excluded, ...(beta?.sources.excluded ?? [])] };
  const sourceBytes = JSON.stringify(sources, null, 2) + '\n'; writeFileSync(resolve(root, 'candidate-sources.json'), sourceBytes);
  const review = { version: 1, checkedAt, existingVersions, observedVersions, classificationEngineHash, liveVersionChanged: previous.sourceVersion !== versions.live,
    previousLive: previous.sourceVersion, versions, inputHashes, baselineHash: glossaryDigest(previousBytes),
    candidateHash: glossaryDigest(readFileSync(candidatePath, 'utf8')), sourcesHash: glossaryDigest(sourceBytes), changes };
  write(reviewPath, review);
  const lines = ['# 용어집 버전 갱신 검토', '', '출처의 정식·미출시 표시이며 제작사 공식 검수 완료를 뜻하지 않습니다. 아래 명칭은 검토할 데이터입니다.', '',
    `확인: ${checkedAt}`, `정식: ${review.previousLive} → ${versions.live}`, `미출시: ${versions.beta ?? '없음'}`, ''];
  for (const [key, items] of Object.entries(changes)) {
    lines.push(`## ${key} (${items.length})`, '');
    for (const item of items) lines.push(`    ${JSON.stringify(item)}`);
    lines.push('');
  }
  writeFileSync(resolve(root, 'review.md'), lines.join('\n'));
  console.log(`추가 ${changes.added.length}, 변경 ${changes.changed.length}, 출시 전환 ${changes.promoted.length}, 누락 ${changes.removed.length}, 정식·베타 이름 차이 ${changes.betaDifferences.length}`);
  console.log('검토 파일: glossary/updates/review.md. 후보 생성만 완료했으며 봇 용어집은 변경하지 않았습니다.');
}
function apply() {
  const review = read(reviewPath), candidate = readFileSync(candidatePath, 'utf8');
  const sourceBytes = readFileSync(resolve(root, 'candidate-sources.json'), 'utf8');
  const baseline = readFileSync('glossary/zzz.json', 'utf8');
  if (review.version !== 1 || glossaryDigest(baseline) !== review.baselineHash || glossaryDigest(candidate) !== review.candidateHash
    || glossaryDigest(sourceBytes) !== review.sourcesHash) throw new Error('검토 후 자료가 변경되었습니다. sync를 다시 실행하고 확인하세요.');
  for (const file of inputFiles) if (review.inputHashes?.[file] !== glossaryDigest(readFileSync(`glossary/${file}`, 'utf8'))) {
    throw new Error('검토 후 커뮤니티·보완 용어가 변경되었습니다. sync를 다시 실행하세요.');
  }
  if (review.classificationEngineHash !== glossaryDigest(readFileSync('src/glossary-tags.js', 'utf8'))) throw new Error('검토 후 용어 분류 코드가 변경되었습니다. sync를 다시 실행하세요.');
  loadGlossary(candidatePath);
  const backup = resolve('glossary/history', `${review.checkedAt.replace(/[^0-9A-Za-z]/g, '-')}-${review.baselineHash.slice(0, 12)}`);
  mkdirSync(backup, { recursive: true });
  for (const file of ['zzz.json', 'sources.json']) copyFileSync(`glossary/${file}`, resolve(backup, file));
  copyFileSync(candidatePath, 'glossary/zzz.json.tmp');
  copyFileSync(resolve(root, 'candidate-sources.json'), 'glossary/sources.json.tmp');
  try { renameSync('glossary/zzz.json.tmp', 'glossary/zzz.json'); renameSync('glossary/sources.json.tmp', 'glossary/sources.json'); }
  catch (error) { for (const file of ['zzz.json', 'sources.json']) copyFileSync(resolve(backup, file), `glossary/${file}`); throw error; }
  console.log('검토한 후보를 용어집에 반영했습니다. 이전 자료는 glossary/history에 보관했습니다. 오라클 반영은 별도로 수행하세요.');
}
try {
  const action = process.argv[2] ?? 'sync';
  if (action === 'sync') await stage(); else if (action === 'apply') apply(); else throw new Error('Use sync or apply');
} catch (error) { console.error(error.message); process.exitCode = 1; }
