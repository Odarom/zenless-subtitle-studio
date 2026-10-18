# 통신 구조 / Communication flow

## 기존 / Before

~~~mermaid
flowchart TD
  D[Discord channels] -->|Source and recent context| B[Bot on operator server]
  K[API key submitted to bot] -->|Encrypted storage; operator can decrypt| B
  G[Shared glossary on GitHub] -->|Database update| B
  B -->|Text + context + relevant terms + API key| A[Translation API]
  A -->|Translated text| B
  B -->|Translated message| D
  D -->|User-submitted report| R[Private report database]
  R -->|Maintainer review and correction| G
~~~

## 전환 후 / After

~~~mermaid
flowchart TD
  D[Discord channels] -->|Source message| B[Public broker on operator server]
  B -->|Text + recent context + target languages| P[Personal runner on user PC or personal server]
  G[Shared glossary on GitHub] -->|Automatic DB download and verification| P
  K[User API key] -->|Stored only on their own device| P
  P -->|Text + context + relevant terms + API key| A[Translation API]
  A -->|Translated text| P
  P -->|Translation results; no provider key| B
  B -->|Translated message| D
  D -->|User-submitted report after notice| R[Private project report database]
  R -->|Maintainer review and correction| G
~~~

공개 봇은 원문과 번역문을 읽고 중계합니다. 다른 사용자의 API 키를 받지 않는 구조이며, 대화 내용까지 운영자에게 숨기는 종단간 암호화는 아닙니다. 운영자 본인의 개인 연결 프로그램은 같은 Oracle 서버에서 별도 프로세스로 실행할 수 있습니다.

The public broker still sees source text and results. Provider keys remain on personal runners; this is not end-to-end encrypted messaging. The maintainer's own runner may run as a separate process on the same Oracle host.

## 영상 / Video

~~~mermaid
flowchart TD
  V[YouTube video or local file] --> L[User PC: speech recognition and optional OCR]
  G[Shared glossary] --> L
  L -->|Whole transcript + screen text + full glossary by default + user's key| A[Selected translation API]
  A -->|Cue IDs and translated text| C[Local code restores timing and screen positions]
  C --> O[SRT / VTT / project JSON / playback overlay]
  O -->|Consented error report| R[Private project report database]
  R -->|Review and corrected shared DB| G
~~~

관리용 출처·수정 이력은 영상 프롬프트에서 제외합니다. 작은 모델은 관련 용어만 직접 선택할 수 있습니다. DeepL은 LLM 프롬프트를 받지 않으므로 전체 DB를 로컬 용어 보호에 사용합니다. API마다 모델·계정의 입력·출력·분당·일일 한도가 적용됩니다.

Administrative provenance/history is omitted from the video prompt. Smaller models can explicitly use related terms only. DeepL uses the DB locally for term protection rather than receiving an LLM glossary prompt. Provider model/account context, output and rate quotas still apply.
