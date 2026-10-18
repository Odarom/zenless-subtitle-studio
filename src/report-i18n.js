// Only interface text is localized. Report snapshots and user-written notes
// remain verbatim; localization never invokes a translation API.
const messages = {
  launch: ['신고 시작', 'Start report', '報告を開始', '开始举报'],
  launchNotice: ['요청한 사용자만 아래 버튼으로 신고를 시작할 수 있습니다. 이후 신고 내용은 본인에게만 표시됩니다.', 'Only the requesting user can start with this button. The report form is then shown privately.', 'このボタンは依頼したユーザーのみ使用できます。その後の報告内容は本人だけに表示されます。', '仅发起请求的用户可以使用此按钮。后续举报内容仅本人可见。'],
  replyHelp: ['번역 메시지에 답장으로 `!신고` 또는 `!report`를 보내세요. `!신고 메시지링크`도 가능합니다.', 'Reply to the translation with `!report`, or send `!report MESSAGE_LINK`.', '訳文に返信して `!report` と送信してください。`!report メッセージリンク` も使えます。', '请回复译文并发送 `!report`，也可以发送 `!report 消息链接`。'],
  title: ['오역 신고', 'Report translation', '誤訳を報告', '举报误译'],
  preview: ['오역 신고 전 확인', 'Check before reporting', '報告内容の確認', '举报前确认'],
  notice: ['제출하면 아래 원문·번역문과 작성한 설명이 봇 운영자에게 전달되어 이 프로젝트에서 검토됩니다. 신고 자료는 최대 90일 보관합니다. AI를 자동 호출하지 않습니다.',
    'Submitting shares the original, translation and your explanation with the bot operator for review. Reports are kept for up to 90 days. No AI is called automatically.',
    '送信すると原文・訳文・説明がボット運営者に共有され、確認されます。報告は最大90日間保存されます。AIは自動呼び出しされません。',
    '提交后，原文、译文及说明将发送给机器人运营者审核。举报资料最多保留90天，不会自动调用AI。'],
  source: ['원문', 'Original', '原文', '原文'],
  target: ['신고할 번역문', 'Translation being reported', '報告する訳文', '要举报的译文'],
  check: ['확인', 'Check', '確認', '确认'],
  manual: ['(직접 입력 필요)', '(Enter manually)', '（手動入力が必要）', '（需要手动输入）'],
  missing: ['원문을 읽지 못했습니다. 다음 창에서 원문을 직접 입력해 주세요.', 'The original could not be read. Enter it in the next form.', '原文を取得できませんでした。次のフォームに入力してください。', '无法读取原文，请在下一个表单中手动输入。'],
  verified: ['번역에 사용한 원문과 일치합니다.', 'Matches the original used for this translation.', '翻訳時の原文と一致しています。', '与翻译时使用的原文一致。'],
  unverified: ['신고 시점의 원문입니다. 이전에 수정되었을 수 있으니 확인해 주세요.', 'This is the current original. It may have been edited; please check.', '現在の原文です。編集されている可能性があるため確認してください。', '这是举报时的原文，可能已被修改，请核对。'],
  write: ['신고 작성', 'Write report', '報告を作成', '填写举报'],
  type: ['문제 유형', 'Issue type', '問題の種類', '问题类型'],
  confirm: ['원문 확인', 'Check the original', '原文を確認', '确认原文'],
  confirmHelp: ['원문이 수정되거나 보이지 않으면 해당 번역에 사용된 원문을 입력하세요.', 'If missing or edited, enter the original used for this translation.', '原文が編集・削除されている場合は、翻訳時の原文を入力してください。', '如果原文已修改或不可见，请输入翻译时使用的原文。'],
  fragment: ['문제 부분 (선택)', 'Incorrect part (optional)', '誤訳箇所（任意）', '错误部分（选填）'],
  fragmentHelp: ['번역문에서 잘못된 단어나 구절을 그대로 복사하세요.', 'Copy the incorrect word or phrase exactly from the translation.', '訳文の誤った単語や表現をそのままコピーしてください。', '请从译文中原样复制错误的词语或短句。'],
  explanation: ['어떤 점이 잘못됐나요?', 'What is wrong?', 'どこが間違っていますか？', '哪里有问题？'],
  explanationHelp: ['모르는 부분도 적어 주세요. 신고 내용은 운영자에게 전달됩니다.', 'You may describe uncertainties too. Your report is shared with the operator.', '不明な点も記入できます。内容は運営者に共有されます。', '不确定的地方也可以说明，举报内容将发送给运营者。'],
  suggestion: ['올바른 번역 제안 (선택)', 'Suggested translation (optional)', '修正案（任意）', '建议译文（选填）'],
  suggestionHelp: ['아는 경우에만 작성하세요.', 'Fill in only if you have a suggestion.', '修正案がある場合のみ入力してください。', '有建议时再填写。'],
  received: ['오역 신고를 접수했습니다.', 'Your report has been received.', '報告を受け付けました。', '已收到您的举报。'],
  duplicate: ['이미 접수한 신고입니다.', 'You already submitted this report.', 'すでに受け付けた報告です。', '您已提交过此举报。'],
  id: ['신고 번호', 'Report ID', '報告番号', '举报编号'],
  state: ['상태', 'Status', '状態', '状态'],
  statusHelp: ['`/zzz-report status id:{id}`에서 처리 상태를 확인하세요.', 'Check progress with `/zzz-report status id:{id}`.', '`/zzz-report status id:{id}`で状態を確認できます。', '使用`/zzz-report status id:{id}`查看处理状态。'],
  noAuto: ['신고만으로 번역문이나 공용 용어집이 자동 변경되지는 않습니다.', 'Submitting does not automatically change the translation or shared glossary.', '報告だけで訳文や共通用語集が自動変更されることはありません。', '提交举报不会自动修改译文或共享术语表。'],
  empty: ['최근 90일 동안 접수한 신고가 없습니다.', 'You have no reports from the last 90 days.', '過去90日間の報告はありません。', '过去90天内没有提交的举报。'],
  review: ['검토 결과', 'Review result', '確認結果', '审核结果'],
  noReview: ['검토 결과가 아직 등록되지 않았습니다.', 'No review result has been recorded yet.', '確認結果はまだ登録されていません。', '尚未记录审核结果。'],
  failure: ['신고를 처리하지 못했습니다. 잠시 후 다시 시도하세요.', 'Could not process the report. Please try again later.', '報告を処理できませんでした。しばらくしてから再試行してください。', '无法处理举报，请稍后重试。'],
  validation: ['신고 입력의 길이와 내용을 확인하세요.', 'Check the report fields and their lengths.', '入力内容と文字数を確認してください。', '请检查举报内容和长度。'],
};
const statuses = {
  pending: ['접수', 'Received', '受付済み', '已接收'], reviewing: ['검토 중', 'Under review', '確認中', '审核中'],
  'needs-info': ['추가 확인 필요', 'More information needed', '追加確認が必要', '需要补充信息'],
  resolved: ['처리 완료', 'Resolved', '対応済み', '已处理'], rejected: ['반영하지 않음', 'Not adopted', '反映なし', '不予采纳'],
};
const types = {
  term: ['게임 용어 오류', 'Incorrect game term', 'ゲーム用語の誤り', '游戏术语错误'],
  meaning: ['의미·조건 왜곡', 'Meaning or condition changed', '意味・条件の誤り', '含义或条件错误'],
  missing: ['내용 누락', 'Missing content', '内容の欠落', '内容遗漏'],
  wording: ['어색한 표현', 'Unnatural wording', '不自然な表現', '表达不自然'],
  other: ['기타', 'Other', 'その他', '其他'],
};
const errors = [
  ['이 신고 버튼은 요청한 사용자만 사용할 수 있습니다. 본인은 번역 메시지에 답장으로 !report를 보내세요.', 'Only the requesting user can use this button. Reply to the translation with !report to start your own.', 'このボタンは依頼したユーザー専用です。訳文に !report と返信して新しく開始してください。', '此按钮仅限发起请求的用户使用。请回复译文并发送 !report 发起自己的举报。'],
  ['서버 안에서 사용하세요.', 'Use this in a server.', 'サーバー内で使用してください。', '请在服务器内使用。'],
  ['이 채널을 볼 수 있는 사용자만 신고할 수 있습니다.', 'You must be able to view this channel to report.', 'このチャンネルを閲覧できる必要があります。', '您需要有权查看此频道才能举报。'],
  ['신고 창이 만료되었거나 본인의 요청이 아닙니다. 번역 메시지에서 오역 신고를 다시 선택하세요.', 'The form expired or belongs to someone else. Start a new report from the translation.', 'フォームが期限切れか他のユーザーのものです。訳文から再度報告してください。', '表单已过期或属于其他用户，请从译文重新发起举报。'],
  ['이 메시지의 채널 연결이 변경되었습니다. 오역 신고를 다시 선택하세요.', 'The channel link changed. Start a new report.', 'チャンネルの接続が変更されました。再度報告してください。', '频道连接已改变，请重新举报。'],
  ['신고 창은 3초에 한 번 열 수 있습니다. 잠시 후 다시 시도하세요.', 'You can open a report once every 3 seconds. Please wait.', '報告フォームは3秒に1回開けます。少しお待ちください。', '每3秒只能打开一次举报表单，请稍等。'],
  ['신고 작성 요청이 많습니다. 잠시 후 다시 시도하세요.', 'Too many reports are being written. Please try again later.', '報告の作成が混み合っています。後で再試行してください。', '当前举报请求较多，请稍后重试。'],
  ['번역 메시지를 우클릭 → 메시지 링크 복사한 주소를 message 항목에 넣으세요.', 'Right-click the translation, copy its message link and paste it into message.', '訳文を右クリックし「メッセージリンクをコピー」で取得したURLをmessageに入力してください。', '右键译文，复制消息链接并粘贴到message中。'],
  ['이 서버 안의 번역 메시지 링크를 사용하세요.', 'Use a translation message link from this server.', 'このサーバー内の訳文のリンクを使用してください。', '请使用本服务器内的译文消息链接。'],
  ['연결된 언어 채널의 봇 번역 메시지 링크를 사용하세요.', 'Use a bot translation link from a linked language channel.', '接続済み言語チャンネルのボット訳文のリンクを使用してください。', '请使用已连接语言频道中的机器人译文链接。'],
  ['번역 채널을 확인하지 못했습니다. 잠시 후 다시 시도하세요.', 'Could not check the translation channel. Please try again later.', '翻訳チャンネルを確認できませんでした。後で再試行してください。', '无法确认翻译频道，请稍后重试。'],
  ['해당 번역 채널을 볼 수 있고 메시지 기록을 읽을 수 있어야 신고할 수 있습니다.', 'You need View Channel and Read Message History access to the translation channel.', '翻訳チャンネルの閲覧とメッセージ履歴の閲覧権限が必要です。', '需要有权查看翻译频道及读取消息历史。'],
  ['번역 메시지를 찾지 못했습니다. 삭제 여부와 메시지 링크를 확인하세요.', 'Translation not found. Check whether it was deleted and verify the link.', '訳文が見つかりません。削除されていないか、リンクが正しいか確認してください。', '找不到译文，请检查是否已删除及链接是否正确。'],
  ['번역 메시지 링크를 확인하세요.', 'Check the translation message link.', '訳文のリンクを確認してください。', '请检查译文消息链接。'],
  ['연결된 언어 채널의 봇 번역 메시지에서 신고하세요. 이미지·이모지만 공유한 메시지는 대상이 아닙니다.', 'Report a bot translation in a linked language channel. Image-only and emoji-only shares are not eligible.', '接続済み言語チャンネルのボット訳文を報告してください。画像・絵文字のみの共有は対象外です。', '请举报已连接语言频道中的机器人译文。仅含图片或表情的分享不适用。'],
  ['이 번역 메시지의 연결 정보를 확인할 수 없습니다.', 'Could not verify the translation link information.', 'この訳文の接続情報を確認できません。', '无法确认此译文的连接信息。'],
  ['이미지·이모지만 공유한 메시지는 오역 신고 대상이 아닙니다.', 'Image-only and emoji-only shares cannot be reported as mistranslations.', '画像・絵文字のみの共有は誤訳報告の対象外です。', '仅含图片或表情的分享不适用误译举报。'],
  ['다른 신고 창이 열렸습니다. 가장 최근 창에서 작성하세요.', 'Another form was opened. Use the latest report form.', '別のフォームが開かれました。最新のフォームを使用してください。', '已打开另一个举报表单，请使用最新表单。'],
  ['원문 확인이 끝난 뒤 신고를 작성하세요.', 'Wait for the original check to finish before writing.', '原文の確認が終わってから作成してください。', '请等原文确认完成后再填写。'],
  ['원문 확인이 끝나지 않았습니다. 다시 신고하세요.', 'The original check was not completed. Start a new report.', '原文の確認が完了していません。再度報告してください。', '原文确认尚未完成，请重新举报。'],
  ['문제 유형을 하나 선택하세요.', 'Select one issue type.', '問題の種類を1つ選んでください。', '请选择一种问题类型。'],
  ['문제 유형을 선택하세요.', 'Select an issue type.', '問題の種類を選んでください。', '请选择问题类型。'],
  ['신고 조회 명령을 확인하세요.', 'Check the report command.', '報告コマンドを確認してください。', '请检查举报命令。'],
  ['신고 메시지 연결 정보를 확인하세요.', 'Check the reported message information.', '報告対象のメッセージ情報を確認してください。', '请检查举报消息的连接信息。'],
  ['신고 언어 정보를 확인하세요.', 'Check the report language information.', '報告の言語情報を確認してください。', '请检查举报的语言信息。'],
  ['문제 부분에는 번역문에 실제로 있는 글자를 입력하세요.', 'The incorrect part must be copied exactly from the translation.', '誤訳箇所は訳文の文字をそのまま入力してください。', '错误部分必须原样复制自译文。'],
  ['신고 번호를 확인하세요. 예: R-20261008-xxxxxxxxxxxx', 'Check the report ID, e.g. R-20261008-xxxxxxxxxxxx.', '報告番号を確認してください。例: R-20261008-xxxxxxxxxxxx', '请检查举报编号，例如R-20261008-xxxxxxxxxxxx。'],
  ['이 서버에서 본인이 접수한 신고만 확인할 수 있습니다.', 'You can only view reports you submitted in this server.', 'このサーバーで自分が送信した報告のみ確認できます。', '只能查看您在本服务器提交的举报。'],
  ['서버와 신고자 정보를 확인하세요.', 'Check the server and reporter information.', 'サーバーと報告者の情報を確認してください。', '请检查服务器和举报者信息。'],
  ['신고는 한 사람당 시간당 5건, 하루 20건까지 접수합니다. 잠시 후 다시 시도하세요.', 'Each user can submit up to 5 reports per hour and 20 per day. Please try later.', '1人につき1時間5件、1日20件までです。後で再試行してください。', '每人每小时最多5次、每天最多20次，请稍后重试。'],
  ['신고 저장 한도에 도달했습니다. 운영자에게 확인하세요.', 'Report storage is full. Contact the bot operator.', '報告の保存上限に達しました。ボット運営者に確認してください。', '举报存储已满，请联系机器人运营者。'],
];

export function reportLanguage(locale = 'ko') {
  return locale.startsWith('ko') ? 0 : locale.startsWith('ja') ? 2 : locale.startsWith('zh') ? 3 : 1;
}
export function reportText(interaction, key, values = {}) {
  const row = messages[key];
  if (!row) throw new Error(`Unknown report UI key: ${key}`);
  return row[reportLanguage(interaction.locale)].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`);
}
export function reportStatus(interaction, status) { return statuses[status][reportLanguage(interaction.locale)]; }
export function reportType(interaction, type) { return types[type][reportLanguage(interaction.locale)]; }
export function reportError(interaction, message) {
  const row = errors.find(entry => entry[0] === message) ?? Object.values(messages).find(entry => entry[0] === message);
  return row?.[reportLanguage(interaction.locale)] ?? reportText(interaction, 'failure');
}
