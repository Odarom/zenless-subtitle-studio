(() => {
  if (globalThis.__zzzSubtitlesInstalled) return;
  globalThis.__zzzSubtitlesInstalled = true;
  const geometry = globalThis.__zzzGeometry;
  let cues = [], speechIndex, screenIndex, videoId = null, host, label, screenLayer, lastText = null, nextCheck = 0, player, video;
  const screenNodes = new Map();
  const settings = { mode: 'translated', offsetMs: 0, fontSize: 28, showSpeech: true, showScreen: true, maskScreen: true };
  const currentId = () => { const url = new URL(location.href); return url.pathname === '/watch' ? url.searchParams.get('v') : /^\/shorts\/([^/]+)/.exec(url.pathname)?.[1]; };
  const cueText = cue => settings.mode === 'source' ? cue.sourceText : settings.mode === 'bilingual' && cue.translatedText !== cue.sourceText ? `${cue.sourceText}\n${cue.translatedText || ''}` : cue.translatedText || cue.sourceText;
  function clear() { cues = []; videoId = null; lastText = null; screenNodes.clear(); host?.remove(); host = null; label = null; }
  function setSettings(input = {}) {
    if (['source', 'translated', 'bilingual'].includes(input.mode)) settings.mode = input.mode;
    if (Number.isFinite(input.offsetMs) && Math.abs(input.offsetMs) <= 3600000) settings.offsetMs = input.offsetMs;
    if (Number.isFinite(input.fontSize) && input.fontSize >= 16 && input.fontSize <= 48) settings.fontSize = input.fontSize;
    for (const key of ['showSpeech', 'showScreen', 'maskScreen']) if (typeof input[key] === 'boolean') settings[key] = input[key];
    if (label) label.style.fontSize = `${settings.fontSize}px`; lastText = null;
  }
  function attach() {
    player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player'); video = player?.querySelector('video');
    if (!player || !video || host?.parentNode === player) return;
    host?.remove(); screenNodes.clear(); host = document.createElement('div'); host.hidden = true; host.setAttribute('data-zzz-subtitles', '');
    const shadow = host.attachShadow({ mode: 'closed' }), style = document.createElement('style');
    style.textContent = ':host{position:absolute;inset:0;z-index:2147483647;pointer-events:none;overflow:hidden}.speech{position:absolute;left:5%;right:5%;bottom:11%;margin:0;text-align:center;line-height:1.5;white-space:pre-line;color:#fff;font-family:system-ui,sans-serif;font-weight:600;text-shadow:0 2px 4px #000}.speech span{background:rgba(0,0,0,.76);padding:3px 9px;box-decoration-break:clone;-webkit-box-decoration-break:clone}.screen{position:absolute;inset:0}.screen-text{position:absolute;color:#fff;line-height:1.15;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;font-family:system-ui,sans-serif;font-weight:600;padding:2px 3px;box-sizing:border-box;text-shadow:0 1px 2px #000;border-radius:2px}';
    const speech = document.createElement('p'); speech.className = 'speech'; label = document.createElement('span'); speech.append(label);
    screenLayer = document.createElement('div'); screenLayer.className = 'screen'; shadow.append(style, speech, screenLayer); player.append(host);
    label.style.fontSize = `${settings.fontSize}px`; lastText = null;
  }
  function drawScreen(time) {
    const active = settings.showScreen && geometry ? geometry.activeCuesAt(screenIndex, time) : [], keep = new Set();
    if (active.length) {
      const playerRect = player.getBoundingClientRect(), rect = video.getBoundingClientRect();
      const fit = typeof getComputedStyle === 'function' ? getComputedStyle(video).objectFit : 'contain';
      const content = geometry.videoContentRect(rect, video.videoWidth, video.videoHeight, fit);
      for (const cue of active) {
        keep.add(cue.id); let element = screenNodes.get(cue.id);
        if (!element) { element = document.createElement('div'); element.className = 'screen-text'; screenLayer.append(element); screenNodes.set(cue.id, element); }
        const region = geometry.cueRegionAt(cue, time), text = cueText(cue), width = region.w * content.width, height = region.h * content.height;
        element.textContent = text;
        const lines = text.split('\n'), units = Math.max(...lines.map(line => [...line].reduce((sum, char) => sum + (/[\x20-\x7e]/.test(char) ? 0.6 : 1), 0)), 1);
        const font = Math.max(10, Math.min(settings.fontSize, height / (lines.length * 1.2), width / units));
        element.style.left = `${content.left - playerRect.left + region.x * content.width}px`;
        element.style.top = `${content.top - playerRect.top + region.y * content.height}px`;
        element.style.width = `${Math.max(width, 15)}px`; element.style.minHeight = `${height}px`;
        element.style.fontSize = `${font}px`; element.style.background = settings.maskScreen ? 'rgba(12,14,12,.95)' : 'rgba(0,0,0,.35)';
      }
    }
    for (const [id, element] of screenNodes) if (!keep.has(id)) { element.remove(); screenNodes.delete(id); }
    return active.length;
  }
  function tick(now) {
    if (cues.length) {
      if (now >= nextCheck) { nextCheck = now + 400; if (currentId() !== videoId) clear(); else attach(); }
      if (host && video && label) {
        const time = video.currentTime * 1000 - settings.offsetMs;
        const ads = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
        const active = settings.showSpeech ? geometry ? geometry.activeCuesAt(speechIndex, time, 6) : cues.filter(cue => cue.kind !== 'screen' && cue.startMs <= time && cue.endMs > time).slice(-6) : [];
        const text = ads ? '' : active.map(cueText).join('\n');
        if (text !== lastText) { label.textContent = text; lastText = text; }
        const screenCount = ads ? 0 : drawScreen(time);
        if (ads) for (const element of screenNodes.values()) element.hidden = true;
        else for (const element of screenNodes.values()) element.hidden = false;
        host.hidden = ads || !text && !screenCount;
      }
    }
    requestAnimationFrame(tick);
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || !message?.type?.startsWith('ZZZ_SUBTITLES_')) return;
    try {
      if (message.type === 'ZZZ_SUBTITLES_LOAD') {
        if (!currentId() || message.videoId !== currentId()) throw new Error('이 영상에 연결된 자막을 선택하세요.');
        if (!Array.isArray(message.cues) || !message.cues.length || message.cues.length > 50000) throw new Error('자막 구간 형식을 확인하세요.');
        const normalized = message.cues.map((cue, index) => {
          if (!Number.isSafeInteger(cue.startMs) || !Number.isSafeInteger(cue.endMs) || cue.startMs < 0 || cue.endMs <= cue.startMs || typeof cue.sourceText !== 'string' || cue.sourceText.length > 6000 || cue.translatedText !== undefined && (typeof cue.translatedText !== 'string' || cue.translatedText.length > 12000) || index && cue.startMs < message.cues[index - 1].startMs) throw new Error('자막 내용이나 시간 순서를 확인하세요.');
          if (cue.kind === 'screen' && (!geometry?.validRegion(cue.region) || cue.positions && (!Array.isArray(cue.positions) || cue.positions.length > 30000 || cue.positions.some((p, i) => !geometry.validRegion(p) || !Number.isSafeInteger(p.timeMs) || p.timeMs < cue.startMs || p.timeMs >= cue.endMs || i && p.timeMs <= cue.positions[i - 1].timeMs)))) throw new Error('화면 글자의 위치와 시간 정보를 확인하세요.');
          return { id: String(index), startMs: cue.startMs, endMs: cue.endMs, sourceText: cue.sourceText, translatedText: cue.translatedText, ...(cue.kind === 'screen' ? { kind: 'screen', region: cue.region, positions: cue.positions } : {}) };
        });
        clear(); cues = normalized; videoId = message.videoId;
        speechIndex = geometry?.buildCueIndex(cues.filter(cue => cue.kind !== 'screen')); screenIndex = geometry?.buildCueIndex(cues.filter(cue => cue.kind === 'screen'));
        setSettings(message.settings); attach(); nextCheck = 0;
      } else if (message.type === 'ZZZ_SUBTITLES_SETTINGS') setSettings(message.settings);
      else if (message.type === 'ZZZ_SUBTITLES_HIDE') clear();
      respond({ ok: true });
    } catch (error) { respond({ error: error.message }); }
  });
  requestAnimationFrame(tick);
})();
