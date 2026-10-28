# 翻译数据库开发者指南

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[concepts.json](../catalog/concepts.json)将每个概念的名称、输入别名、选定输出及使用条件放在同一条记录中，无须关联其他文件。现有应用使用的[zzz.json](../catalog/zzz.json)和根目录[latest.json](../latest.json)保持可用。

## 快速运行

下载公开DB仓库，使用Node.js 24.17或更新版本，在仓库根目录运行以下命令。无须安装依赖或提供API密钥。

```sh
node database/examples/query.mjs "Deadly Assault" ko en
```

参数依次为原文、目标语言、原文语言。示例输出供翻译请求使用的候选资料，不发送翻译请求，也不修改原文。本指南的路径以发布的DB仓库为准；在维护工作区中，请进入构建生成的数据库目录运行。

在应用中读取一次JSON后重复使用查询对象：

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

请在自己的翻译请求中将`instructions`作为词库使用指南，并把`text`和`glossary`作为资料传入。此示例本身不调用API。保留的规则文本中，旧字段`preferred`指新格式的`names`，`communityPreferred`指已选定的社区输出。指南说明了这种对应关系，无须改写原始规则。选定译名不能覆盖语境、例外或对象条件。

## 查询方法

| 调用 | 返回值及用途 |
|---|---|
| `db.get(id)` | 完整概念；ID不存在时为`undefined`。可直接查看已禁用或未发布条目。 |
| `db.lookup(alias)` | 别名与整个输入一致的所有概念，不区分大小写。 |
| `db.search(text)` | 文中别名匹配的所有候选，处理ASCII单词边界和较长名称的重叠。 |
| `db.prompt(candidates, { text, languages, style })` | 包含实际匹配的别名、指定语言名称、输出及保留的含义、规则、语境条件的数组。 |

`lookup`和`search`默认排除`autoUse: false`及`prerelease`。审核时可明确传入`{ includeDisabled: true, includePrerelease: true }`查看；完整数据仍保留这些条目。查询不归一化空白或全角字符，不推测错字或语音纠错，也不合并OCR片段。

同一简称的多种含义均会返回。请勿将第一条当作正确答案或直接批量替换别名。应结合上下文、角色、技能以及`usage`中的条件判断；含义不明时保留原文。调用方负责提供检索所需的前后文。

传给`prompt`的候选须来自此查询对象。`text`必填，请原样提供检索使用的原文及相关上下文。每条结果的`matchedAliases`仅包含实际匹配该文本的别名；通过`get`加入的概念若未在文本中匹配，返回空数组。`languages`必填，且必须是非空的受支持语言代码数组。`style`为`official`或`community`。后者只使用已选定的`communityOutputs`，缺失时使用对应语言的`names`；不会编造未收录语言的名称。`official`也不保证每个名称均为官方名，请通过`classification`确认。

翻译请求用结果将`meaning`、`rule`、`communityRule`及语境字段放在每条记录的顶层。仅当选定输出与`names`不同时提供`outputPreferred`，可用`outputPreferred?.[language] ?? names[language]`读取译名。`prompt`不会再次过滤传入候选，因此调用方须判断是否使用通过`get`直接加入的禁用或未发布条目。

## 数据格式

顶层`format`为`zzz-translation-concepts`，`schemaVersion`为`1`。`languages`列出语言代码；`source`记录生成本文件所用旧版DB的哈希、版本及收集日期。概念位于`concepts`数组。完整格式见[JSON Schema](catalog.schema.json)。

语言代码：`ko`、`en`、`ja`、`zh-CN`、`zh-Hant`、`de`、`fr`、`es`、`pt`、`ru`、`th`、`vi`、`id`。

| 字段 | 含义 |
|---|---|
| `id`, `category` | 概念标识和分类，请勿按名称重新生成ID。 |
| `names` | 合并基础四种及额外九种语言名称的映射，各语言覆盖范围不同。 |
| `aliases` | 用于识别输入的表达，并非输出优先级列表。 |
| `communityOutputs` | 用户指定的各语言代表性社区输出，不含未批准候选。 |
| `usage` | `meaning`、`rule`及可选`communityRule`，保留含义与使用条件。 |
| `context` | 可选`characterId`及语言映射`characterName`、`relatedSkills`，用于区分主体与相关技能。 |
| `availability` | `releaseStatus`、`autoUse`及可选`releaseVersion`、`sourceVersion`。 |
| `classification` | 分别将名称、别名、当前代表输出标为`official`、`unofficial`或`needs-review`。 |
| `tags` | 概念中各种表达分类的并集；具体表达请查看`classification`。 |

`live`不表示名称为官方名称或本词典获制作方审核。`prerelease`表示已有未发布资料；`unspecified`表示未指定发布状态。某语言没有名称时保留原文，不编造名称。含义与规则保留DB原有编辑语言，目前主要为韩语。

## 请求大小与更新

`prompt`将名称和输出限定为所需语言，不传送完整别名、分类及管理资料，同时保留含义、否定、例外、对象和技能限制。若`characterName`或`relatedSkills`中没有任何所需语言，则优先保留英语语境；没有英语时，按`catalog.languages`顺序保留第一个已有语言的语境。这些只是语境线索，并非新编译名；空语境映射仍省略。它无法恢复检索遗漏的上下文，也不保证翻译质量；将视频拆分为较小请求时，应另行验证语境是否完整。

新格式使用[database/latest.json](latest.json)。`file`是相对**仓库根目录**的不可变发布文件路径。使用前请按`sha256`和`bytes`校验文件字节。`sourceSha256`是旧版DB的哈希，不是新文件的哈希。请将SDK与JSON固定到同一Git提交，并检查`schemaVersion`。`catalog/concepts.json`便于直接读取当前版本。

此仓库包含发布文件。`catalog`中的维护及重建命令需要单独的维护工作区，请勿假设它们可以在本仓库运行。修改建议可通过[举报表单](https://github.com/Odarom/zenless-translation-database/issues/new/choose)提交。代表输出须经用户确认，不可任意选择。
