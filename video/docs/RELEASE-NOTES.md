# ZZZ Subtitle Studio 0.6.1

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

왼쪽 메뉴와 화면 조작이 반응하지 않던 배포 파일 누락을 수정했습니다.

용어집 카드의 언어 수는 현재 설치된 DB에서 계산합니다. 화면 언어는 메뉴 표시용 4개이고, 영상의 원어·번역 언어는 13개입니다. 유튜브 음성을 새로 받아쓰는 옵션은 기본 켜짐이며, 끄면 기존 원어 자막(자동 생성 포함)을 먼저 사용하고 없을 때 음성을 인식합니다. ‘번역 없이 원어 자막만 저장하기’는 기본 꺼짐입니다. 이 옵션을 켜면 번역 API 호출·요금 없이 원문을 저장하며, 음성·화면 인식은 선택한 옵션대로 진행합니다.

## English

Restored sidebar navigation and screen controls by including a missing browser module in the portable release.

The glossary card counts languages from the currently installed DB. Menu text has four languages; video source and translation choices have 13. Fresh YouTube audio transcription is on by default. Turn it off to prefer existing source-language captions, including auto-generated ones, with speech recognition as fallback. “Save source subtitles without translating” is off by default. Enabling it saves the original text without translation API calls or charges; selected speech/screen recognition still runs.

## 日本語

配布版の画面用ファイル不足を修正し、左メニューと画面操作を復旧しました。

用語集カードの言語数は現在のDBから計算します。メニュー表示は4言語、動画の原語・翻訳先は13言語です。YouTube音声の新規書き起こしは標準でオンです。オフにすると既存の原語字幕（自動生成を含む）を優先し、なければ音声認識します。「翻訳せず原語字幕だけを保存」は標準でオフです。オンにすると翻訳APIの呼び出し・料金なしで原文を保存し、選択した音声・画面認識は行います。

## 简体中文

修复便携版缺少界面文件的问题，恢复左侧菜单及界面操作。

术语表卡片根据当前安装的数据库计算语言数量。菜单显示有4种语言，视频原文和目标语言有13种。从YouTube音频重新转写默认开启；关闭后优先使用既有原文字幕（含自动生成字幕），没有时再识别音频。“仅保存原文字幕，不翻译”默认关闭。开启后保存原文，不调用翻译API也不产生翻译API费用；语音和屏幕识别仍按所选设置进行。
