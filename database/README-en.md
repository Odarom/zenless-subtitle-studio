# Translation database developer guide

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[concepts.json](../catalog/concepts.json) keeps each concept's names, input aliases, selected outputs and usage conditions together. No joins are required. Existing [zzz.json](../catalog/zzz.json) and the root [latest.json](../latest.json) remain available for current applications.

## Quick start

Download the public database repository and run this from its root with Node.js 24.17 or newer. No package installation or API key is needed.

```sh
node database/examples/query.mjs "Deadly Assault" ko en
```

Arguments are source text, target language and source language. The example prints candidates prepared for a translation request. It sends no translation request and leaves the source text unchanged. Paths in this guide refer to the distributed DB repository. In the maintainer workspace, run the example inside the built database distribution.

Read the JSON once and reuse the query object in your application:

```js
import { readFile } from 'node:fs/promises';
import { createDatabase, GLOSSARY_INSTRUCTIONS } from './database/index.mjs';

const catalog = JSON.parse(await readFile('./catalog/concepts.json', 'utf8'));
const db = createDatabase(catalog);
const text = 'Deadly Assault';
const candidates = db.search(text);
const instructions = GLOSSARY_INSTRUCTIONS;
const glossary = db.prompt(candidates, {
  text,
  languages: ['en', 'ko'],
  style: 'official',
});
```

Include `instructions` as glossary-use guidance in your own translation request, with `text` and `glossary` as data. This example makes no API call. In preserved rule text, legacy `preferred` refers to the new `names`, and `communityPreferred` refers to the selected community outputs. The guidance explains this mapping without rewriting the original rules. Selected spellings never override context, exception or subject conditions.

## Queries

| Call | Result and purpose |
|---|---|
| `db.get(id)` | The complete concept, or `undefined` for an unknown ID. Direct lookup also exposes disabled and prerelease records. |
| `db.lookup(alias)` | All concepts whose alias matches the entire input, ignoring case. |
| `db.search(text)` | All candidates matching aliases within text, with ASCII word boundaries and longer-name overlap handling. |
| `db.prompt(candidates, { text, languages, style })` | An array containing matched aliases, requested names/outputs and preserved meanings, rules and context. |

`lookup` and `search` exclude `autoUse: false` and `prerelease` by default. For review, explicitly pass `{ includeDisabled: true, includePrerelease: true }`. These records remain in the full catalog. Queries do not normalize whitespace or full-width characters, infer spelling/speech corrections, or join OCR fragments.

All meanings sharing an alias remain candidates. Do not select the first result as the answer or replace aliases blindly. Use surrounding text, characters, skills and the conditions in `usage`; preserve the source expression when its meaning is unclear. The caller must provide any context needed for retrieval.

Pass candidates returned by this database object to `prompt`. Required `text` contains the unchanged source text and relevant context used for retrieval. Each result's `matchedAliases` includes only aliases actually matched in that text; a concept passed through `get` with no textual match receives an empty array. `languages` is a required, nonempty array of supported language codes. `style` is `official` or `community`. Community style uses only existing `communityOutputs`, falling back to that language's `names`. It does not invent a name for a missing language. Official style is not a filter guaranteeing that every name is official; consult `classification` for that status.

The prompt result places `meaning`, `rule`, `communityRule` and context fields at the top level of each record. It includes `outputPreferred` only when the selected output differs from `names`; read the rendering as `outputPreferred?.[language] ?? names[language]`. `prompt` does not filter supplied candidates again, so the caller must decide whether to use disabled or prerelease records added directly through `get`.

## Record format

The top-level `format` is `zzz-translation-concepts` and `schemaVersion` is `1`. `languages` lists supported codes; `source` identifies the legacy DB hash, version and retrieval date used to produce this file. Records are in `concepts`. See the [JSON Schema](catalog.schema.json) for the full contract.

Language codes: `ko`, `en`, `ja`, `zh-CN`, `zh-Hant`, `de`, `fr`, `es`, `pt`, `ru`, `th`, `vi`, `id`.

| Field | Meaning |
|---|---|
| `id`, `category` | Concept identifier and category. Do not regenerate IDs from names. |
| `names` | One language map combining four base and nine additional languages. Coverage varies by language. |
| `aliases` | Forms recognized in input, not an ordered list of output choices. |
| `communityOutputs` | User-selected community output per language. Unapproved drafts are excluded. |
| `usage` | `meaning`, `rule`, optional `communityRule`; preserves meaning and conditions on use. |
| `context` | Optional `characterId` and language maps `characterName`/`relatedSkills`, distinguishing subjects and skills. |
| `availability` | `releaseStatus`, `autoUse`, optional `releaseVersion`/`sourceVersion`. |
| `classification` | Classifies names, aliases and selected outputs separately as `official`, `unofficial` or `needs-review`. |
| `tags` | Union of expression classifications in the concept. Use `classification` for individual expressions. |

`live` does not imply official naming or publisher review. `prerelease` identifies existing unreleased material; `unspecified` means no release status was supplied. Preserve the source when a language has no name instead of inventing one. Meanings and rules retain their editorial language, currently mostly Korean.

## Request size and updates

`prompt` restricts names and outputs to requested languages and omits full aliases, classifications and administrative metadata. It preserves meanings, negation, exceptions, subjects and skill restrictions. If `characterName` or `relatedSkills` has none of the requested languages, it retains English context if available, otherwise the first available language in `catalog.languages` order. These are context clues, not synthesized translations; empty context maps remain omitted. It cannot restore context omitted by retrieval or guarantee translation quality. Validate context retention separately when splitting a video into smaller requests.

Use [database/latest.json](latest.json) for the new format. Its `file` path is relative to the **repository root** and identifies an immutable release. Verify the file bytes against `sha256` and `bytes` before use. `sourceSha256` identifies the legacy DB, not the new file. Pin the SDK and JSON to the same Git commit and check `schemaVersion`. `catalog/concepts.json` is a convenient path to the current snapshot.

This repository contains distribution files. Maintenance and rebuilding commands in `catalog` require the separate maintainer workspace; do not assume those commands are available here. Suggest changes through the [report form](https://github.com/Odarom/zenless-translation-database/issues/new/choose). Selected outputs require user review rather than arbitrary choice.
