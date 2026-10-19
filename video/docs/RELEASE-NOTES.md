# ZZZ Subtitle Studio 0.6.7

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

작업 기록을 삭제하면 해당 작업을 위해 프로그램 안에 보관된 영상·음성·업로드 자막 사본, 생성 자막과 중간 파일을 함께 지웁니다. 같은 사본을 다른 작업도 쓰면 마지막 기록을 삭제할 때 정리합니다. 업데이트 후 실행할 때에는 이전 버전에서 기록 없이 남겨진 업로드 사본과 정보 파일도 자동 정리합니다. 남아 있는 작업의 입력 파일, PC의 원본, 따로 다운로드한 영상·자막, API 키·설정·신고는 유지합니다. 정리 결과와 실패 안내는 작업 기록 화면에 표시됩니다. 완료된 유튜브 작업의 「유튜브 영상 저장 ↓」로 음성이 포함된 영상을 최대 1080p로 따로 저장할 수 있습니다. 번역 자막이 영상에 합쳐지는 기능은 아니며, 자막은 SRT/VTT 등으로 따로 저장하세요. 저장 위치는 브라우저의 다운로드 설정에 따릅니다.

여기서 **PC 작업실**은 `Start.cmd`를 실행하면 브라우저에 열리는 **ZZZ 자막 작업실** 페이지(`http://127.0.0.1:4318`)를 말합니다.

1. Chrome/Edge의 확장 관리 화면에서 개발자 모드를 켜고 **압축해제된 확장 프로그램 로드**로 함께 받은 `video-extension` 폴더를 선택합니다.
2. 프로그램 폴더의 **Start.cmd**를 실행하고, 브라우저에 열린 프로그램 페이지로 이동합니다.
3. 페이지 **왼쪽 메뉴의 「API 및 연결 설정」**을 누릅니다. 아래로 내려 **「유튜브 확장 프로그램 연결」** 카드의 **「PC 연결 코드 복사」**를 누릅니다.
4. 유튜브 영상을 열고 브라우저 오른쪽 위의 확장 프로그램 아이콘에서 **ZZZ 자막 작업실**을 엽니다. **「PC 연결 코드」** 칸에 붙여 넣고 **「연결」**을 누릅니다. 이 코드는 번역 API 키와 별개입니다.
5. **「완료된 자막」**에서 해당 영상의 작업을 고르고 **「선택한 자막 적용」**을 누릅니다. 사용하는 동안 `Start.cmd` 실행 창을 켜 두세요. 이 PC에서 처리하므로 별도 영상 처리 서버는 필요 없습니다.

## English

Deleting a job record also removes all video/audio/uploaded-subtitle copies, generated subtitles and intermediate files stored for that job in the app. Shared copies remain until their last job is deleted. Startup after updating also clears upload copies and metadata left without a job record by older versions. Inputs for retained jobs, original PC files, separate video/subtitle downloads, API keys, settings and reports stay. The history view shows cleanup results or failures. On a completed YouTube job, Save YouTube video ↓ downloads a separate video with audio, up to 1080p. Translated subtitles are not burned into the video; save SRT/VTT separately. The destination follows your browser’s download settings.

**PC Studio** means the **ZZZ Subtitle Studio** page opened in your browser by `Start.cmd` (`http://127.0.0.1:4318`).

1. In Chrome/Edge extension management, enable developer mode and load the included `video-extension` folder using **Load unpacked**.
2. Run **Start.cmd** in the program folder and open the program page that appears in your browser.
3. Click **API & connection in the left menu**. Scroll to the **Connect the YouTube extension** card and click **Copy PC connection code**.
4. Open a YouTube video, then open **ZZZ Subtitle Studio** from the browser’s extension icon at the top right. Paste into **PC connection code** and click **Connect**. This code is separate from your translation API key.
5. Choose the video’s job under **Finished subtitles** and click **Apply selected subtitles**. Keep the `Start.cmd` window open while using it. Processing runs on this PC; no separate video-processing server is needed.

## 日本語

履歴を削除すると、その作業用にアプリ内に保存した動画・音声・アップロード字幕のコピー、生成字幕、中間ファイルをすべて消去します。共有コピーは最後の作業履歴を削除するときに整理します。更新後の起動時には、旧版で履歴のないまま残ったアップロードコピーと情報ファイルも自動整理します。残っている作業の入力、PC上の元ファイル、別途ダウンロードした動画・字幕、APIキー・設定・報告は保持します。整理結果や失敗は作業履歴画面に表示します。完了したYouTube作業の「YouTube動画を保存 ↓」から、音声を含む最大1080pの動画を別途保存できます。翻訳字幕は動画に焼き込まれません。SRT/VTTなどで別途保存してください。保存先はブラウザのダウンロード設定に従います。

**PC作業室**は、`Start.cmd`を実行するとブラウザに開く**ZZZ字幕スタジオ**のページ（`http://127.0.0.1:4318`）です。

1. Chrome/Edgeの拡張機能管理でデベロッパーモードを有効にし、同梱の`video-extension`フォルダーを展開済み拡張機能として読み込みます。
2. プログラムのフォルダーにある**Start.cmd**を実行し、ブラウザに開いたプログラムのページへ移動します。
3. **左メニューの「API・接続設定」**を開き、下へスクロールして**「YouTube拡張機能を接続」**カードの**「PC接続コードをコピー」**を押します。
4. YouTube動画を開き、ブラウザ右上の拡張機能アイコンから**ZZZ字幕スタジオ**を開きます。**「PC接続コード」**欄に貼り付けて**「接続」**を押します。このコードは翻訳APIキーとは別です。
5. **「完成した字幕」**から動画の作業を選び、**「選択した字幕を適用」**を押します。使用中は`Start.cmd`のウィンドウを開いたままにします。このPCで処理するため、別の動画処理サーバーは不要です。

## 简体中文

删除任务记录时，同时删除应用为该任务保存的视频、音频、上传字幕副本、生成字幕及中间文件。共享副本在最后一条相关任务记录删除时清理。更新后启动时，也会自动清理旧版本遗留的无任务记录关联的上传副本及信息文件。保留现有任务的输入文件、电脑上的原始文件、另行下载的视频和字幕、API密钥、设置及举报。清理结果或失败提示显示在任务记录页面。已完成的YouTube任务新增“保存YouTube视频 ↓”，可另外下载最高1080p且包含声音的视频。译文字幕不会烧录进视频，请另存SRT/VTT等字幕。保存位置取决于浏览器的下载设置。

**PC工作室**是运行`Start.cmd`后在浏览器中打开的**ZZZ字幕工作室**页面（`http://127.0.0.1:4318`）。

1. 在Chrome/Edge扩展管理中开启开发者模式，加载随附的`video-extension`文件夹。
2. 运行程序文件夹内的**Start.cmd**，切换到浏览器中打开的程序页面。
3. 点击**左侧菜单“API 与连接设置”**，向下滚动，在**“连接 YouTube 扩展程序”**卡片中点击**“复制本机连接码”**。
4. 打开YouTube视频，从浏览器右上角扩展图标打开**ZZZ字幕工作室**，粘贴到**“本机连接码”**栏并点击**“连接”**。此连接码与翻译API密钥不同。
5. 在**“已完成字幕”**中选择该视频的任务，点击**“应用所选字幕”**。使用期间保持`Start.cmd`窗口开启，所有处理在此电脑进行，无需另设视频处理服务器。
