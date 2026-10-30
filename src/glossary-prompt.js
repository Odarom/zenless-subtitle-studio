import { matchedAliases } from './glossary-match.js';

// One projection for the public concept reader and the apps' legacy DB adapter.
// Selection happens before this function; it never removes candidate concepts.
export function projectPromptConcept(concept, { languages, style = 'official', text, fallbackLanguages = [] }) {
  const select = names => Object.fromEntries(languages.filter(language => Object.hasOwn(names, language)).map(language => [language, names[language]]));
  const names = select(concept.names);
  const output = style === 'community' ? { ...names, ...select(concept.communityOutputs) } : names;
  const result = { id: concept.id, category: concept.category, names, matchedAliases: matchedAliases(concept, text) };
  if (Object.entries(output).some(([language, value]) => names[language] !== value)) result.outputPreferred = output;
  result.meaning = concept.usage.meaning;
  result.rule = concept.usage.rule;
  if (concept.usage.communityRule !== undefined) result.communityRule = concept.usage.communityRule;
  if (concept.context.characterId !== undefined) result.characterId = concept.context.characterId;
  for (const field of ['characterName', 'relatedSkills']) {
    if (concept.context[field] !== undefined) {
      const labels = concept.context[field];
      const values = select(labels);
      if (!Object.keys(values).length) {
        const fallback = ['en', ...fallbackLanguages].find(language => typeof labels[language] === 'string' && labels[language].trim());
        if (fallback !== undefined) values[fallback] = labels[fallback];
      }
      if (Object.keys(values).length) result[field] = values;
    }
  }
  result.releaseStatus = concept.availability.releaseStatus;
  result.autoUse = concept.availability.autoUse;
  for (const field of ['releaseVersion', 'sourceVersion']) {
    if (concept.availability[field] !== undefined) result[field] = concept.availability[field];
  }
  return result;
}

// Keep the established preferred/aliases wire format and update feeds. No new
// classifications or output choices are written back to the authoring catalog.
export function legacyPromptEntries(entries, { languages, style = 'official', text, fallbackLanguages = [] }) {
  const contextNames = value => Object.fromEntries(Object.entries(value || {}).filter(([, name]) => typeof name === 'string' && name.trim()));
  return entries.map(entry => {
    const concept = {
      id: entry.id, category: entry.category, aliases: entry.aliases,
      names: { ...entry.preferred, ...entry.localizedNames }, communityOutputs: entry.communityPreferred || {},
      usage: { meaning: entry.meaning, rule: entry.rule, communityRule: entry.communityRule },
      context: {
        characterId: entry.characterId,
        ...(entry.characterName !== undefined ? { characterName: contextNames(entry.characterName) } : {}),
        ...(entry.relatedSkills !== undefined ? { relatedSkills: contextNames(entry.relatedSkills) } : {})
      },
      availability: { releaseStatus: entry.releaseStatus, autoUse: entry.autoUse, releaseVersion: entry.releaseVersion, sourceVersion: entry.sourceVersion }
    };
    const { names, matchedAliases: aliases, ...row } = projectPromptConcept(concept, { languages, style, text, fallbackLanguages });
    return { ...row, preferred: names, aliases };
  });
}
