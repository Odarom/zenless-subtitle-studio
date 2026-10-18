import { createHash } from 'node:crypto';

export const glossaryDigest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const releaseVersion = value => value.match(/^\d+\.\d+/)?.[0];
export function checkManifest(manifest) {
  const data = manifest?.zzz;
  const valid = value => typeof value === 'string' && /^\d+\.\d+(?:\.\d+)?(?:\+\d+)?$/.test(value);
  if (!data || !valid(data.live) || !valid(data.latest) || !Array.isArray(data.available)
    || !data.available.includes(data.live) || !data.available.includes(data.latest)) throw new Error('Invalid ZZZ version manifest');
  return { live: data.live, latest: data.latest, beta: data.latest === data.live ? null : data.latest };
}
const comparable = entry => JSON.stringify({ preferred: entry.preferred, communityPreferred: entry.communityPreferred, rule: entry.rule, communityRule: entry.communityRule,
  aliases: [...entry.aliases].sort(), releaseStatus: entry.releaseStatus ?? 'live', autoUse: entry.autoUse !== false, relatedSkills: entry.relatedSkills });

export function composeCatalog(live, beta, previous, checkedAt) {
  if (live.version !== 1 || !Array.isArray(live.entries) || (beta && (beta.version !== 1 || !Array.isArray(beta.entries)))) throw new Error('Invalid glossary candidate');
  const old = new Map(previous.entries.map(entry => [entry.id, entry]));
  const entries = live.entries.map(entry => ({ ...entry, releaseStatus: 'live', releaseVersion: releaseVersion(live.sourceVersion) }));
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const changes = { added: [], changed: [], promoted: [], removed: [], betaDifferences: [] };
  if (beta) for (const entry of beta.entries) {
    if (byId.has(entry.id)) {
      const existing = byId.get(entry.id);
      if (JSON.stringify(existing.preferred) !== JSON.stringify(entry.preferred)) changes.betaDifferences.push({ id: entry.id, live: existing.preferred, beta: entry.preferred });
      continue; // Published names win; beta data cannot overwrite live concepts.
    }
    const added = { ...entry, releaseStatus: 'prerelease', releaseVersion: releaseVersion(beta.sourceVersion), status: 'prerelease-source-matched' };
    entries.push(added); byId.set(added.id, added);
  }
  for (const entry of entries) {
    const previousEntry = old.get(entry.id);
    if (!previousEntry) { changes.added.push({ id: entry.id, preferred: entry.preferred, releaseStatus: entry.releaseStatus }); continue; }
    if (JSON.stringify(previousEntry.preferred) !== JSON.stringify(entry.preferred)) {
      entry.nameHistory = [...(previousEntry.nameHistory ?? []), { preferred: previousEntry.preferred, sourceVersion: previousEntry.sourceVersion, checkedAt }].slice(-10);
      entry.aliases = [...new Set([...entry.aliases, ...Object.values(previousEntry.preferred ?? {})])];
    } else if (previousEntry.nameHistory) entry.nameHistory = previousEntry.nameHistory;
    if (entry.nameHistory) entry.aliases = [...new Set([...entry.aliases, ...entry.nameHistory.flatMap(item => Object.values(item.preferred ?? {}))])];
    if (previousEntry.releaseStatus === 'prerelease' && entry.releaseStatus === 'live') {
      changes.promoted.push({ id: entry.id, previous: previousEntry.preferred, current: entry.preferred, nameChanged: JSON.stringify(previousEntry.preferred) !== JSON.stringify(entry.preferred) });
    }
    if (comparable(previousEntry) !== comparable(entry)) changes.changed.push({ id: entry.id, previous: previousEntry.preferred, current: entry.preferred,
      previousStatus: previousEntry.releaseStatus ?? 'live', currentStatus: entry.releaseStatus,
      previousCommunityPreferred: previousEntry.communityPreferred, currentCommunityPreferred: entry.communityPreferred });
  }
  for (const previousEntry of previous.entries) {
    if (byId.has(previousEntry.id)) continue;
    const retired = { ...previousEntry, releaseStatus: 'needs-review', autoUse: false };
    entries.push(retired);
    changes.removed.push({ id: retired.id, preferred: retired.preferred });
  }
  const counts = Object.fromEntries([...new Set(entries.map(entry => entry.category))].map(category => [category, entries.filter(entry => entry.category === category).length]));
  return { catalog: { ...live, betaVersion: beta?.sourceVersion ?? null, checkedAt,
    description: '출처의 정식·미출시 버전을 동일 ID로 대조. 미출시 항목과 누락 항목은 별도 상태로 기록하며 팬 자료를 제작사 확정 명칭으로 단정하지 않음.', counts, entries }, changes };
}
