// Public, deliberately small wire format. Discord identity and credentials
// never belong in the project maintainer's copy.
const languages = ['ko', 'en', 'ja', 'zh-CN'];
const types = ['term', 'missing', 'meaning', 'wording', 'other'];
export function normalizeSharedDiscordReport(input) {
  const text = (value, max, required = false) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Invalid shared report field');
    return value.trim();
  };
  if (input?.platform !== 'discord' || !/^R-\d{8}-[a-f0-9]{12}$/.test(input.id || '')) throw new Error('Invalid shared report');
  if (!languages.includes(input.target?.language) || (input.source?.language != null && !languages.includes(input.source.language)) || !types.includes(input.issue?.type)) throw new Error('Invalid shared report language or type');
  const metadata = {};
  for (const key of ['provider', 'model', 'style']) if (typeof input.metadata?.[key] === 'string') metadata[key] = text(input.metadata[key], 80);
  for (const key of ['glossaryHash', 'promptHash']) if (/^[a-f0-9]{64}$/.test(input.metadata?.[key] || '')) metadata[key] = input.metadata[key];
  const result = { version: 1, platform: 'discord', id: input.id,
    source: { text: text(input.source.text, 2000, true), language: input.source.language ?? null, provenance: 'user-provided', matchesTranslationSource: null },
    target: { text: text(input.target.text, 2000, true), language: input.target.language }, metadata,
    issue: { type: input.issue.type, fragment: text(input.issue.fragment ?? '', 200), explanation: text(input.issue.explanation, 1000, true), suggestion: text(input.issue.suggestion ?? '', 2000) },
  };
  if (result.issue.fragment && !result.target.text.includes(result.issue.fragment)) throw new Error('Invalid shared report fragment');
  // Reject common pasted credentials rather than sending them to the receiver.
  if (/(?:AIza[\w-]{30,}|sk-[\w-]{20,}|[\w-]{24,}\.[\w-]{6}\.[\w-]{25,})/.test(JSON.stringify(result))) throw new Error('Remove credentials before sharing');
  return result;
}
