# Translation database developer guide

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

| File | Purpose |
|---|---|
| [catalog/concepts.json](../catalog/concepts.json) | Current complete concept records; no joins required |
| [catalog.schema.json](catalog.schema.json) | JSON Schema for consumer format version 1 |
| [index.mjs](index.mjs) | Dependency-free query module and `GLOSSARY_INSTRUCTIONS` guidance |
| [examples/query.mjs](examples/query.mjs) | Local query and translation-input example |
| [latest.json](latest.json) | Concept snapshot hash and immutable release path |
| [catalog/zzz.json](../catalog/zzz.json) | Existing format, retained for current applications |

From a downloaded database repository, with Node.js 24.17 or newer:

```sh
node database/examples/query.mjs "Deadly Assault" ko en
```

No package installation, API key or translation request is needed. The example prints `instructions`, source text and a prepared glossary. Include `GLOSSARY_INSTRUCTIONS` as glossary-use guidance in your own translation request. It explains how preserved rules referring to legacy fields apply to the new fields; selected spellings never override context conditions. Read the guide in your language before using candidates in translation: matching does not resolve ambiguous meanings or apply context rules.
