import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { dirname } from 'node:path';
import { availableParallelism } from 'node:os';

const models = {
  en: ['rec_en_PP-OCRv3_infer.onnx', 'dict_en.txt'],
  ja: ['rec_japan_PP-OCRv3_infer.onnx', 'dict_japan.txt'],
  ko: ['rec_korean_PP-OCRv3_infer.onnx', 'dict_korean.txt'],
  'zh-CN': ['rec_ch_PP-OCRv4_infer.onnx', 'dict_chinese.txt']
};
export class RapidOcr {
  constructor(executable, language, { signal } = {}) {
    if (!models[language]) throw new Error('화면 글자의 언어를 선택하세요.');
    const [rec, keys] = models[language]; this.pending = null; this.stopped = false;
    this.ready = new Promise((resolve, reject) => { this.resolveReady = resolve; this.rejectReady = reject; });
    // Attach immediately so cancellation during initialization cannot leak a rejection.
    this.ready.catch(() => {});
    this.child = spawn(executable, ['--ensureAscii=1', '--models=models', '--det=ch_PP-OCRv4_det_infer.onnx', `--rec=${rec}`, `--keys=${keys}`, '--doAngle=0', '--mostAngle=0', '--maxSideLen=1280', `--numThread=${Math.min(4, availableParallelism())}`], { cwd: dirname(executable), windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    this.child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
    this.child.stdin.on('error', error => this.fail(error));
    this.lines = createInterface({ input: this.child.stdout });
    this.lines.on('line', line => {
      if (line.includes('OCR init completed.')) { clearTimeout(this.initTimer); this.resolveReady(); return; }
      if (!line.trim().startsWith('{')) return;
      try {
        const result = JSON.parse(line), pending = this.pending; if (!pending) return;
        this.pending = null; clearTimeout(pending.timer);
        if (result.code === 101) pending.resolve([]);
        else if (result.code === 100 && Array.isArray(result.data)) pending.resolve(result.data);
        else pending.reject(new Error(`OCR 인식 실패 (${result.code}).`));
      } catch (error) { this.fail(error); }
    });
    this.child.once('error', error => this.fail(error));
    this.child.once('close', code => { if (!this.stopped) this.fail(new Error(`OCR 도구가 종료되었습니다 (${code}). ${stderr}`)); });
    this.initTimer = setTimeout(() => { this.fail(new Error('OCR 도구 초기화 시간이 초과되었습니다.')); this.close(); }, 60000);
    this.abort = () => { this.fail(signal.reason || new DOMException('Aborted', 'AbortError')); this.close(); };
    this.signal = signal; signal?.addEventListener('abort', this.abort, { once: true });
    if (signal?.aborted) this.abort();
  }
  fail(error) { clearTimeout(this.initTimer); this.rejectReady(error); if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = null; } }
  async recognize(image) {
    await this.ready; this.signal?.throwIfAborted();
    if (this.stopped || this.pending) throw new Error('OCR 도구의 작업 상태를 확인하세요.');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.fail(new Error('OCR 인식 시간이 초과되었습니다.')); this.close(); }, 60000);
      this.pending = { resolve, reject, timer };
      this.child.stdin.write(`${JSON.stringify({ image_base64: image.toString('base64') })}\n`, error => { if (error) this.fail(error); });
    });
  }
  close() { this.stopped = true; clearTimeout(this.initTimer); this.signal?.removeEventListener('abort', this.abort); this.lines.close(); this.child.stdin.destroy(); this.child.kill(); }
}
