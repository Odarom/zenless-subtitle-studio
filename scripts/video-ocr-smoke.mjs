import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { runProcess } from '../video/downloads.mjs';
import { tools, runTool } from '../video/media.mjs';
import { RapidOcr } from '../video/ocr-engine.mjs';
import { ensureOcr } from '../video/ocr-setup.mjs';
import { prepareVideoSource } from '../video/screen-source.mjs';
import { validateCues, serializeSubtitles, parseSubtitles } from '../video/subtitles.mjs';

const root = resolve(import.meta.dirname, '..'), directory = join(root, 'data', 'video', 'smoke', 'ocr'); mkdirSync(directory, { recursive: true });
await runProcess(join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$samples = @(@('en','Quick Assist','Arial',80), @('ja','クイック支援','Yu Gothic',80), @('ko','빠른 지원','Malgun Gothic',80), @('zh-CN','快速支援','Microsoft YaHei',80), @('moved','Quick Assist','Arial',120), @('blank','','Arial',80))
foreach ($sample in $samples) {
  $bitmap = New-Object System.Drawing.Bitmap(1000, 400)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font($sample[2], 48, [System.Drawing.FontStyle]::Regular)
  $graphics.DrawString($sample[1], $font, [System.Drawing.Brushes]::Black, [single]$sample[3], [single]100)
  $bitmap.Save([System.IO.Path]::Combine($env:ZZZ_OCR_FIXTURES, $sample[0] + '.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
`], { ZZZ_OCR_FIXTURES: directory });
const executable = await ensureOcr(root), languageResults = [];
for (const [language, expected] of [['en', 'QuickAssist'], ['ja', 'クイック支援'], ['ko', '빠른지원'], ['zh-CN', '快速支援']]) {
  const engine = new RapidOcr(executable, language);
  try {
    const result = await engine.recognize(readFileSync(join(directory, `${language}.png`)));
    assert(result.some(item => item.text.replace(/\s/g, '').includes(expected)), `${language}: ${JSON.stringify(result)}`);
    languageResults.push({ language, recognized: true, detections: result.length });
  } finally { engine.close(); }
}
const concat = join(directory, 'frames.txt');
writeFileSync(concat, ['blank', 'en', 'moved', 'blank'].map(name => `file '${join(directory, `${name}.png`).replace(/\\/g, '/')}'\nduration 1\n`).join('') + `file '${join(directory, 'blank.png').replace(/\\/g, '/')}'\n`);
const video = join(directory, 'position-test.mp4');
await runTool(tools(root).ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-vf', 'fps=10', '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
const work = join(directory, `run-${Date.now()}`); mkdirSync(work);
const job = { title: 'OCR position smoke', input: { fileId: 'fixture' }, options: { speech: false, screenText: true, screenLanguage: 'en', screenIntervalMs: 1000, sourceLanguage: 'en', targetLanguage: 'ko', transcribeOnly: true } };
const result = await prepareVideoSource(job, { root, directory: work, upload: { path: video, name: 'position-test.mp4' }, signal: new AbortController().signal, update: () => {} });
const context = { root, directory: work, upload: { path: video, name: 'position-test.mp4' }, signal: new AbortController().signal, update: () => {} };
const replay = await prepareVideoSource(job, context); assert.deepEqual(replay.cues, result.cues);
const interrupted = join(directory, `resume-${Date.now()}`); mkdirSync(interrupted);
const controller = new AbortController();
await assert.rejects(prepareVideoSource(job, { ...context, directory: interrupted, signal: controller.signal, update: value => { if (value.stage === 'ocr' && value.stageProgress >= 50) controller.abort(); } }));
const resumed = await prepareVideoSource(job, { ...context, directory: interrupted }); assert.deepEqual(resumed.cues, result.cues);
const cues = validateCues(result.cues);
const cue = cues.find(item => /Quick\s*Assist/i.test(item.sourceText)); assert(cue, JSON.stringify(cues));
assert.equal(cue.startMs, 1000); assert.equal(cue.endMs, 3000); assert(cue.positions.length >= 2); assert(cue.positions[1].x > cue.positions[0].x);
const vtt = serializeSubtitles(cues, { format: 'vtt', mode: 'source', positioned: true });
assert(vtt.includes('position:')); assert(parseSubtitles(vtt).every(item => item.kind === 'screen'));
writeFileSync(join(directory, 'position-test.vtt'), vtt);
const report = { languageResults, timing: { startMs: cue.startMs, endMs: cue.endMs }, normalizedRegion: cue.region, movementPositions: cue.positions.length, positionedVtt: true, completedCheckpointReplay: true, interruptedCheckpointResume: true, translationApiCalls: 0 };
writeFileSync(join(root, 'dist', 'video-ocr-qa.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
