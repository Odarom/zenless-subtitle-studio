(() => {
  if (globalThis.__zzzSubtitlesInstalled) return;
  globalThis.__zzzSubtitlesInstalled = true;
  const geometry = globalThis.__zzzGeometry;
  const position = globalThis.__zzzSpeechPosition;
  let speech, moveHandle, cancelDrag;
  let cues = [], speechIndex, screenIndex, videoId = null, jobId = null, host, label, screenLayer, menuRoot, lastText = null, nextCheck = 0, player, video, menu, visibleSpeech = [];
  const screenNodes = new Map();
  const settings = { mode: 'translated', offsetMs: 0, fontSize: 28, showSpeech: true, showScreen: true, maskScreen: true, uiLanguage: 'ko', speechHeight: 0.11 };
  const t = (key, values = {}) => (globalThis.__zzzOverlayI18n?.[settings.uiLanguage]?.[key] || key).replace(/\{(\w+)\}/g, (match,name) => values[name] ?? match);
  const currentId = () => { const url = new URL(location.href); return url.pathname === '/watch' ? url.searchParams.get('v') : /^\/shorts\/([^/]+)/.exec(url.pathname)?.[1]; };
  const cueText = cue => settings.mode === 'source' ? cue.sourceText : settings.mode === 'bilingual' && cue.translatedText !== cue.sourceText ? `${cue.sourceText}\n${cue.translatedText || ''}` : cue.translatedText || cue.sourceText;
  function clear() { cancelDrag?.(); closeMenu(false); cues = []; videoId = null; jobId = null; lastText = null; screenNodes.clear(); host?.remove(); host = null; menuRoot = null; label = null; speech = null; }
  function indexCues() { speechIndex = geometry?.buildCueIndex(cues.filter(cue => !cue.excluded && cue.kind !== 'screen')); screenIndex = geometry?.buildCueIndex(cues.filter(cue => !cue.excluded && cue.kind === 'screen')); lastText = null; }
  function block(event) { event.preventDefault(); event.stopPropagation(); }
  function clickable(element, callback) {
    element.style.pointerEvents = 'auto'; element.tabIndex = 0; element.setAttribute('role','button'); element.setAttribute('aria-label',t('자막 메뉴'));
    for(const name of ['onpointerdown','onmousedown','onmouseup','ondblclick'])element[name]=event=>event.stopPropagation();
    element.onclick=event=>{block(event);callback();};
    element.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){block(event);callback();}};
  }
  function closeMenu(resume=true) {
    if(!menu)return;const old=menu;menu=null;old.dialog.close();old.dialog.remove();
    if(resume&&old.playing&&video===old.video&&currentId()===videoId)video.play()?.catch(()=>{});
  }
  function openMenu(targets) {
    if(!targets.length||!host||!video)return;
    closeMenu(false);const playing=!video.paused;video.pause();
    const el=(tag,text,props={})=>{const value=document.createElement(tag);if(text!==undefined)value.textContent=text;Object.assign(value,props);return value;};
    const dialog=el('dialog'); dialog.setAttribute('aria-label',t('자막 메뉴'));
    const title=el('h2',t('자막 메뉴')),source=el('p'),translated=el('p'),status=el('p',undefined,{role:'status'}),buttons=el('div'),form=el('form',undefined,{hidden:true});
    dialog.append(title,source,translated,buttons,form,status);
    menu={dialog,playing,video};let cue=targets[0],reportId=null,fingerprint=null;
    const select=targets.length>1?el('select'):null;
    if(select){targets.forEach((item,i)=>select.append(el('option',`#${item.id} · ${cueText(item).slice(0,90)}`,{value:String(i)})));select.onchange=()=>{cue=targets[Number(select.value)];form.hidden=true;reportId=null;fingerprint=null;render();};dialog.prepend(select);}
    const close=el('button',t('닫기'),{type:'button'}),exclude=el('button',undefined,{type:'button'}),report=el('button',t('오역 신고'),{type:'button'});
    close.onclick=()=>closeMenu();buttons.append(close,exclude,report);
    const render=()=>{source.textContent=cue.sourceText;translated.textContent=cue.translatedText||cue.sourceText;exclude.textContent=t(cue.excluded?'자막 복원':'자막 삭제');};render();
    const action=async (payload,target=cue)=>{
      if(!jobId)throw new Error(t('PC 작업을 연결해 적용하면 신고·제외를 사용할 수 있습니다.'));
      const result=await chrome.runtime.sendMessage({type:'ZZZ_CUE_ACTION',jobId,videoId,cueId:target.id,...payload});
      if(!result)throw new Error(t('PC 연결을 확인하세요.'));return result;
    };
    exclude.onclick=async()=>{const target=cue;exclude.disabled=true;if(select)select.disabled=true;try{const result=await action({action:'exclude',excluded:!target.excluded},target);if(result.error)throw new Error(result.error);target.excluded=result.excluded;indexCues();render();status.textContent=t(target.excluded?'자막을 삭제했습니다. 삭제한 자막 탭에서 복원할 수 있습니다.':'자막을 복원했습니다.');}catch(error){status.textContent=t(error.message);}finally{exclude.disabled=false;if(select)select.disabled=false;}};
    const field=(label,input)=>{const wrapper=el('label',t(label));wrapper.append(input);form.append(wrapper);return input;};
    const type=field('문제 유형',el('select'));for(const [value,text]of[['term','게임 용어 오류'],['missing','내용 누락'],['meaning','의미가 달라짐'],['wording','어색한 표현'],['other','기타']])type.append(el('option',t(text),{value}));
    const explanation=field('문제 설명',el('textarea',undefined,{required:true,maxLength:1000})),suggestion=field('수정 제안',el('textarea',undefined,{maxLength:2000}));
    const includeUrl=field('유튜브 영상 주소 포함',el('input',undefined,{type:'checkbox',checked:false}));
    const privacy=el('p',t('원문·번역문·설명과 선택한 영상 주소를 운영자 서버로 비공개 전송합니다. API 키·로컬 경로는 제외하며, 신고와 남용 방지용 임의 식별자는 최대 90일 보관합니다.'));
    form.append(privacy);const submit=el('button',t('신고 보내기'),{type:'submit'});form.append(submit);
    report.onclick=()=>{form.hidden=false;explanation.focus();};
    form.onsubmit=async event=>{block(event);if(submit.disabled)return;submit.disabled=true;if(select)select.disabled=true;status.textContent=t('신고를 전송하고 있습니다.');
      try{const issue={type:type.value,explanation:explanation.value,suggestion:suggestion.value,includeVideoUrl:includeUrl.checked};const current=JSON.stringify(issue);if(current!==fingerprint){reportId=null;fingerprint=current;}
        const result=await action({action:'report',reportId,issue});if(result.reportId)reportId=result.reportId;if(result.error)throw new Error(result.error);status.textContent=t('비공개 신고를 접수했습니다. 접수 번호: {id}',{id:result.receiptId});
      }catch(error){status.textContent=t(error.message);submit.disabled=false;}finally{if(select)select.disabled=false;}};
    dialog.oncancel=event=>{event.preventDefault();closeMenu();};
    for(const name of ['onclick','onmousedown','onmouseup','onpointerdown','onkeydown'])dialog[name]=event=>event.stopPropagation();
    if(!jobId){exclude.disabled=true;report.disabled=true;status.textContent=t('PC 작업을 연결해 적용하면 신고·제외를 사용할 수 있습니다.');}
    menuRoot.append(dialog);dialog.showModal();
  }
  function setSettings(input = {}) {
    if (Number.isFinite(input.speechHeight)) { cancelDrag?.(); settings.speechHeight = position.speechHeight(input.speechHeight); }
    if (['source', 'translated', 'bilingual'].includes(input.mode)) settings.mode = input.mode;
    if (Number.isFinite(input.offsetMs) && Math.abs(input.offsetMs) <= 3600000) settings.offsetMs = input.offsetMs;
    if (Number.isFinite(input.fontSize) && input.fontSize >= 16 && input.fontSize <= 48) settings.fontSize = input.fontSize;
    for (const key of ['showSpeech', 'showScreen', 'maskScreen']) if (typeof input[key] === 'boolean') settings[key] = input[key];
    if(['ko','en','ja','zh-CN'].includes(input.uiLanguage))settings.uiLanguage=input.uiLanguage;
    if (label) label.style.fontSize = `${settings.fontSize}px`; lastText = null;
    if (moveHandle) { moveHandle.textContent = t('↕ 이동'); moveHandle.title = t('끌어서 음성 자막 높이 조절 · ↑↓ 키로 이동 · Home 키로 초기화'); moveHandle.setAttribute('aria-label', moveHandle.title); }
  }
  async function savePosition() {
    const result = await chrome.runtime.sendMessage({type:'ZZZ_SPEECH_POSITION',videoId,...(jobId ? {jobId} : {}),speechHeight:settings.speechHeight});
    if (!result?.ok) throw new Error(t('자막 위치를 저장하지 못했습니다. 다음에 열면 기본 위치로 표시될 수 있습니다.'));
  }
  function visibleRect() {
    const rect = video.getBoundingClientRect(), fit = typeof getComputedStyle === 'function' ? getComputedStyle(video).objectFit : 'contain';
    const content = geometry.videoContentRect(rect, video.videoWidth, video.videoHeight, fit), outer = player.getBoundingClientRect();
    let controlsHeight = 64, controlsVisible = false;
    for (const control of player.querySelectorAll?.('.ytp-chrome-bottom, .ytp-progress-bar-container') || []) {
      const area = control.getBoundingClientRect(), css = getComputedStyle(control);
      if (!area.height || css.display === 'none' || area.top < outer.top + outer.height * 0.5) continue;
      controlsHeight = Math.max(controlsHeight, outer.top + outer.height - area.top + 8);
      if (css.visibility !== 'hidden' && Number(css.opacity) !== 0 && !player.classList.contains('ytp-autohide')) controlsVisible = true;
    }
    return { content, outer, controlsHeight, controlsVisible };
  }
  function placeSpeech() {
    if (!position || !speech || speech.hidden) return;
    const { content, outer, controlsHeight } = visibleRect();
    const area = position.speechPlacement(content, outer, settings.speechHeight, 0, controlsHeight);
    speech.style.left = `${area.left}px`; speech.style.width = `${area.width}px`; speech.style.maxHeight = `${area.height}px`;
    speech.style.top = `${position.speechPlacement(content, outer, settings.speechHeight, speech.getBoundingClientRect().height, controlsHeight).top}px`;
  }
  function attach() {
    player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player'); video = player?.querySelector('video');
    if (!player || !video || host?.parentNode === player) return;
    cancelDrag?.();closeMenu(false);host?.remove(); screenNodes.clear(); host = document.createElement('div'); host.hidden = true; host.setAttribute('data-zzz-subtitles', '');
    const shadow = host.attachShadow({ mode: 'closed' }), style = document.createElement('style');
    style.textContent = ':host{position:absolute;inset:0;z-index:2147483647;pointer-events:none;overflow:hidden}.speech{position:absolute;left:5%;right:5%;bottom:11%;margin:0;text-align:center;line-height:1.5;white-space:pre-line;color:#fff;font-family:system-ui,sans-serif;font-weight:600;text-shadow:0 2px 4px #000}.speech span{background:rgba(0,0,0,.76);padding:3px 9px;box-decoration-break:clone;-webkit-box-decoration-break:clone}.screen{position:absolute;inset:0}.screen-text{position:absolute;color:#fff;line-height:1.15;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;font-family:system-ui,sans-serif;font-weight:600;padding:2px 3px;box-sizing:border-box;text-shadow:0 1px 2px #000;border-radius:2px}';
    speech = document.createElement('p'); speech.className = 'speech'; label = document.createElement('span'); speech.append(label);
    if (position) {
      style.textContent += '.speech{right:auto;bottom:auto;box-sizing:border-box;padding:27px 0 4px;overflow:auto;overflow-wrap:anywhere;pointer-events:none}.speech .speech-move{position:absolute;top:0;left:50%;transform:translateX(-50%);padding:3px 10px;border:1px solid #76894c;border-radius:5px;background:#18200de6;color:#d9fd68;font:12px/18px system-ui,sans-serif;cursor:ns-resize;pointer-events:auto;touch-action:none;user-select:none}.speech-move:hover,.speech-move:focus-visible,.speech-move[data-dragging]{background:#d9fd68;color:#18200d;outline:2px solid #fff}';
      moveHandle = document.createElement('button'); moveHandle.type = 'button'; moveHandle.className = 'speech-move'; speech.append(moveHandle);
      style.textContent += '.speech::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:120px;height:32px;pointer-events:auto}.speech .speech-move{opacity:0;transition:opacity .12s .25s}.speech:hover .speech-move,.speech .speech-move:focus-visible,.speech .speech-move[data-dragging]{opacity:1;transition-delay:0s}@media(hover:none){.speech .speech-move{opacity:1}}';
      cancelDrag = position.bindSpeechDrag(moveHandle, { getHeight: () => settings.speechHeight,
        getRect: () => { const { content, outer, controlsHeight } = visibleRect(); return { height: position.speechPlacement(content, outer, settings.speechHeight, 0, controlsHeight).travel }; },
        setHeight: value => { settings.speechHeight = value; placeSpeech(); },
        commit: async () => { try { await savePosition(); }
          catch { moveHandle.title = t('자막 위치를 저장하지 못했습니다. 다음에 열면 기본 위치로 표시될 수 있습니다.'); } }
      });
    }
    style.textContent += 'dialog{pointer-events:auto;box-sizing:border-box;position:fixed;inset:0;margin:auto;max-width:580px;width:calc(100vw - 40px);max-height:85vh;overflow:auto;background:#171c18;color:#f2f5ec;border:1px solid #a6c938;border-radius:14px;padding:24px;font:14px/1.5 system-ui,sans-serif}dialog::backdrop{background:#0008}dialog p{white-space:pre-wrap;overflow-wrap:anywhere}dialog button{cursor:pointer;background:#d9fd68;color:#14200c;border:0;border-radius:6px;padding:10px;margin:4px}dialog select,dialog textarea{box-sizing:border-box;display:block;width:100%;background:#252d27;color:#fff;border:1px solid #728365;padding:8px;margin:5px 0 12px}dialog textarea{min-height:70px}dialog label{display:block}dialog input[type=checkbox]{margin:8px}dialog [role=status]{color:#d9fd68}.speech span,.screen-text{cursor:pointer}';
    style.textContent += '.screen-text{pointer-events:none!important}.screen-text::after{content:"";position:absolute;inset:0;pointer-events:auto;clip-path:inset(0 0 var(--zzz-hit-cut,0px) 0)}';
    menuRoot=shadow;screenLayer = document.createElement('div'); screenLayer.className = 'screen'; shadow.append(style, speech, screenLayer); player.append(host);
    clickable(label,()=>openMenu(visibleSpeech));
    setSettings(); lastText = null;
  }
  function drawScreen(time, safe) {
    const active = settings.showScreen && geometry ? geometry.activeCuesAt(screenIndex, time) : [], keep = new Set();
    if (active.length) {
      const playerRect = player.getBoundingClientRect(), rect = video.getBoundingClientRect();
      const fit = typeof getComputedStyle === 'function' ? getComputedStyle(video).objectFit : 'contain';
      const content = geometry.videoContentRect(rect, video.videoWidth, video.videoHeight, fit);
      for (const cue of active) {
        keep.add(cue.id); let element = screenNodes.get(cue.id);
        if (!element) { element = document.createElement('div'); element.className = 'screen-text'; clickable(element,()=>openMenu([cue])); screenLayer.append(element); screenNodes.set(cue.id, element); }
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
    for (const element of screenNodes.values()) {
      const height = element.getBoundingClientRect().height, controlsTop = safe?.outer.height - safe?.controlsHeight;
      const cut = safe?.controlsVisible ? Math.min(height, Math.max(0, parseFloat(element.style.top) + height - controlsTop)) : 0;
      element.style.setProperty?.('--zzz-hit-cut', `${cut}px`);
    }
    return active.length;
  }
  function tick(now) {
    if (cues.length) {
      if (now >= nextCheck) { nextCheck = now + 400; if (currentId() !== videoId) clear(); else attach(); }
      if (host && video && label) {
        const time = video.currentTime * 1000 - settings.offsetMs;
        const ads = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
        const active = settings.showSpeech ? geometry ? geometry.activeCuesAt(speechIndex, time, 6) : cues.filter(cue => !cue.excluded && cue.kind !== 'screen' && cue.startMs <= time && cue.endMs > time).slice(-6) : [];
        visibleSpeech=active;if(ads)closeMenu(false);
        const text = ads ? '' : active.map(cueText).join('\n');
        if (text !== lastText) { label.textContent = text; lastText = text; }
        speech.hidden = !text;
        if (!text) cancelDrag?.();
        const safe = geometry ? visibleRect() : null;
        const screenCount = ads ? 0 : drawScreen(time, safe);
        if (ads) for (const element of screenNodes.values()) element.hidden = true;
        else for (const element of screenNodes.values()) element.hidden = false;
        host.hidden = ads || !text && !screenCount && !menu;
        if (!host.hidden) placeSpeech();
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
        const ids=new Set();const normalized = message.cues.map((cue, index) => {
          if (!Number.isSafeInteger(cue.startMs) || !Number.isSafeInteger(cue.endMs) || cue.startMs < 0 || cue.endMs <= cue.startMs || typeof cue.sourceText !== 'string' || cue.sourceText.length > 6000 || cue.translatedText !== undefined && (typeof cue.translatedText !== 'string' || cue.translatedText.length > 12000) || index && cue.startMs < message.cues[index - 1].startMs) throw new Error('자막 내용이나 시간 순서를 확인하세요.');
          if (cue.kind === 'screen' && (!geometry?.validRegion(cue.region) || cue.positions && (!Array.isArray(cue.positions) || cue.positions.length > 30000 || cue.positions.some((p, i) => !geometry.validRegion(p) || !Number.isSafeInteger(p.timeMs) || p.timeMs < cue.startMs || p.timeMs >= cue.endMs || i && p.timeMs <= cue.positions[i - 1].timeMs)))) throw new Error('화면 글자의 위치와 시간 정보를 확인하세요.');
          const id=typeof cue.id==='string'&&/^\d{1,8}$/.test(cue.id)?cue.id:String(index+1);if(ids.has(id))throw new Error('자막 구간 형식을 확인하세요.');ids.add(id);
          return { id, startMs: cue.startMs, endMs: cue.endMs, sourceText: cue.sourceText, translatedText: cue.translatedText, excluded:cue.excluded===true,...(cue.kind === 'screen' ? { kind: 'screen', region: cue.region, positions: cue.positions } : {}) };
        });
        clear(); cues = normalized; videoId = message.videoId;jobId=/^[a-f0-9-]{36}$/.test(message.jobId||'')?message.jobId:null;
        indexCues();
        setSettings(message.settings); attach(); nextCheck = 0;
      } else if (message.type === 'ZZZ_SUBTITLES_SETTINGS') {
        setSettings(message.settings);
        if (Number.isFinite(message.settings?.speechHeight) && videoId) { savePosition().then(() => respond({ok:true}), error => respond({error:error.message})); return true; }
      }
      else if (message.type === 'ZZZ_SUBTITLES_HIDE') clear();
      respond({ ok: true });
    } catch (error) { respond({ error: error.message }); }
  });
  requestAnimationFrame(tick);
})();
