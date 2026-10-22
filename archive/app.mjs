import {copy} from './i18n.mjs';
const API='https://reports.140-238-54-74.sslip.io/api/archive',languages={ko:'한국어',en:'English',ja:'日本語','zh-CN':'简体中文','zh-TW':'繁體中文',de:'Deutsch',fr:'Français',es:'Español',pt:'Português',ru:'Русский',th:'ไทย',vi:'Tiếng Việt',id:'Bahasa Indonesia'};
const $=id=>document.getElementById(id);let locale='ko',entries=[],next=null,serial=0;
try{const saved=localStorage.getItem('zzz-archive-locale');locale=copy[saved]?saved:(navigator.language.startsWith('zh')?'zh-CN':Object.keys(copy).find(k=>navigator.language.startsWith(k))||'en');}catch{}
const t=k=>copy[locale][k];const el=(tag,text,className)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(className)x.className=className;return x;};
for(const[code,label]of Object.entries(languages)){$('language').append(new Option(label,code));}
function render(){
 document.documentElement.lang=locale;document.title=t('title')+' · ZZZ';$('locale').value=locale;document.querySelectorAll('[data-i18n]').forEach(x=>x.textContent=t(x.dataset.i18n));$('query').placeholder=t('search');$('entries').replaceChildren();$('count').textContent=entries.length?String(entries.length)+(next===null?'':'+'):'';
 for(const item of entries){
  if(!/^[a-f0-9]{32}$/.test(item.id||'')||!/^[-\w]{11}$/.test(item.videoId||''))continue;
  const card=el('article',undefined,'entry'),image=el('img',undefined,'thumbnail');image.src='https://i.ytimg.com/vi/'+item.videoId+'/hqdefault.jpg';image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';
  const body=el('div',undefined,'entry-body'),tags=el('div',undefined,'tags');tags.append(el('span',(languages[item.sourceLanguage]||item.sourceLanguage)+' → '+(languages[item.targetLanguage]||item.targetLanguage),'tag'),el('span',t(item.style==='community'?'community':'official'),'tag'));
  const title=el('h3',item.title),author=el('p',item.author,'author'),meta=el('p',undefined,'meta'),display=item.display||{};
  meta.append(el('span',t('speech')+' '+item.speechCount+' · '+t('screen')+' '+item.screenCount),el('br'),el('span',t('height')+' '+Math.round((display.speechHeight??.11)*100)+'% · '+(display.fontSize||28)+'px'),el('br'),el('span',t('background')+': '+t('speech')+' '+t(display.maskSpeech===false?'off':'on')+' / '+t('screen')+' '+t(display.maskScreen===false?'off':'on')),el('br'),el('time',new Date(item.updatedAt).toLocaleDateString(locale)));
  const watch=el('a',t('watch'),'watch');watch.href='https://www.youtube.com/watch?v='+item.videoId+'&zzzArchive='+item.id;watch.target='_blank';watch.rel='noopener noreferrer';body.append(tags,title,author,meta,watch);card.append(image,body);$('entries').append(card);
 }
 $('more').hidden=next===null;
}
async function load(append=false){const current=++serial;$('status').className='';$('status').textContent=t('loading');$('more').disabled=true;
 try{const url=new URL(API+'/entries');url.searchParams.set('q',$('query').value.trim());url.searchParams.set('language',$('language').value);if(append&&next!==null)url.searchParams.set('offset',String(next));const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const value=await r.json();if(!Array.isArray(value.entries))throw Error();if(current!==serial)return;entries=append?entries.concat(value.entries):value.entries;next=Number.isSafeInteger(value.nextOffset)?value.nextOffset:null;render();$('status').textContent=entries.length?'':t($('query').value||$('language').value?'noResults':'empty');}
 catch{if(current===serial){$('status').textContent=t('failed');$('status').className='error';}}finally{if(current===serial)$('more').disabled=false;}
}
$('locale').onchange=()=>{locale=$('locale').value;try{localStorage.setItem('zzz-archive-locale',locale);}catch{}render();if(!entries.length)void load();};$('searchForm').onsubmit=e=>{e.preventDefault();void load();};$('language').onchange=()=>void load();$('more').onclick=()=>void load(true);render();void load();
