# ZZZ Discord Runner 0.3.2

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

PC에서는 압축을 풀었던 폴더의 **Start.cmd**를 다시 실행하면 설정 화면이 열립니다. 이미 실행 중이면 같은 프로그램의 화면만 다시 엽니다. 브라우저 창을 닫아도 실행 창은 켜 두어야 번역됩니다.

개인 서버에서 돌린다면 PC용 Start.cmd 대신 [HOSTING.md의 SSH 관리 화면](HOSTING.md#several-servers-and-private-management-ui)을 사용합니다. 관리할 때마다 SSH 연결을 열고 서버의 현재 개인 관리 링크를 여세요. 주소의 127.0.0.1은 지금 쓰는 PC를 뜻하므로 서버용 주소만 북마크하면 다른 PC에서는 열리지 않습니다.

키 변경: **서버 프로필 선택 → API 키 입력칸 옆 [설정 변경을 위해 중지] → 키 입력 → [API 키·설정 저장] → [번역 연결 시작]**. 키를 비워 두면 기존 키를 유지합니다. 다른 서버 프로필은 계속 실행됩니다. **지금 갱신 확인**은 번역 API 호출 없이 DB만 확인하며, 바로 아래에 확인 중·최신 여부·실패 결과를 표시합니다.

## English

On PC, run **Start.cmd** again from the extracted folder. If the program is already running, it reopens that instance’s settings. Keep its process window running to translate, even after closing the browser.

For a personal server, use the [private SSH management UI](HOSTING.md#several-servers-and-private-management-ui) instead of starting a second PC runner. Each time you manage it, establish the SSH tunnel and open the server’s current private management link. 127.0.0.1 refers to the PC you are using; bookmarking that address alone does not provide access from another PC.

To change a key: **select the server profile → Stop to change settings beside the key field → enter the key → Save API key and settings → Start translation**. Leave the key blank to keep it. Other profiles keep running. **Check for updates** checks only the DB, makes no translation API call, and shows progress, current/update status or failure directly below the button.

## 日本語

PCでは展開先の**Start.cmd**をもう一度実行します。起動済みの場合は同じプログラムの設定画面を再表示します。ブラウザを閉じても翻訳には実行ウィンドウを開いたままにしてください。

個人サーバーの場合はPC版を別起動せず、[SSH管理画面](HOSTING.md#several-servers-and-private-management-ui)を使います。管理のたびにSSH接続を開き、サーバーの現在の個人管理リンクを開いてください。127.0.0.1は操作中のPCを指すため、URLのブックマークだけでは別のPCから接続できません。

キー変更：**サーバープロファイル選択 → キー欄付近の［設定変更のため停止］→キー入力→［APIキー・設定を保存］→［翻訳接続を開始］**。空欄なら保存済みキーを保持し、他のプロファイルは動き続けます。**今すぐ更新を確認**は翻訳APIを呼び出さずDBだけを確認し、直下に確認中・最新・更新完了・失敗を表示します。

## 简体中文

PC用户从解压目录再次运行**Start.cmd**即可打开设置；若程序已运行，则重新打开同一实例的设置页面。关闭浏览器后，翻译仍需保持程序窗口运行。

个人服务器用户应使用[SSH私有管理界面](HOSTING.md#several-servers-and-private-management-ui)，不要另行启动PC连接程序。每次管理时建立SSH隧道并打开服务器当前的私人管理链接。127.0.0.1指当前使用的PC，仅收藏该地址无法从另一台PC访问服务器。

更换密钥：**选择服务器配置 → 密钥输入框旁“停止以修改设置” → 输入密钥 → 保存API密钥及设置 → 启动翻译连接**。密钥留空则保留原密钥，其他配置继续运行。**立即检查更新**仅检查数据库，不调用翻译API；按钮下方显示检查中、已是最新、更新完成或失败。
