import {initI18n, t, getLang, setLang, onLangChange} from './i18n.js';
import {pageview, track} from './analytics.js';
import {getSource} from './source.js';
const base = new URL('../', import.meta.url);
const root = document.querySelector('[data-result]');
const id = root.dataset.result;
const source = getSource();
pageview();
const shareURL = new URL(`r/${id}/`, (window.SITE_CONFIG && window.SITE_CONFIG.siteUrl) || base);
shareURL.search = new URLSearchParams({src: 'share', vs: id}).toString();
const today = new URL(base);
if (source) today.searchParams.set('src', source);
document.querySelector('#today-link').href = today.href;
const retake = new URL('quiz/', base);
if (source) retake.searchParams.set('src', source);
// Preserve the challenge when a friend follows a shared result page.
const vs = new URLSearchParams(location.search).get('vs');
if (vs) retake.searchParams.set('vs', vs);
document.querySelector('#retake').href = retake.href;
  const tr=(key,...args)=>t(key).replace(/\{(\d+)\}/g,(_,i)=>args[i]);
const local=v=>typeof v==='string'?t(v):v?.[getLang()] || v?.en || '';
let result, results;
function render() {
  if (!result) return;
  document.title = t('quiz.resultHeadline').replace('{dish}',local(result.name));
  document.querySelector('#tagline').textContent=local(result.blurb || result.tagline);
  document.querySelector('#description').textContent=local(result.fact || result.description);
  document.querySelector('#today-link').textContent=t('quiz.bridge');
  const text=local(result.share || `quiz.r.${id}.share`).replace('{dish}',local(result.name));
  document.querySelector('#telegram').href='https://t.me/share/url?'+new URLSearchParams({url:shareURL.href,text});
  document.querySelector('#native-share').textContent = local(result.cta || 'quiz.shareButton');
  document.querySelector('#copy-link').textContent = tr('ui.result.3');
  document.querySelector('#retake').textContent = t('result.playAgain');
  // Toasts belong to the language they were shown in: clear them on every (re)render / toggle.
  for (const sel of ['#feedback', '#story-feedback']) { const n = document.querySelector(sel); if (n) n.textContent = ''; }
  const friend = results.find(item => item.id === vs && item.id !== id);
  const comparison = document.querySelector('#comparison');
  comparison.hidden = !friend;
  if (friend) comparison.textContent = tr('ui.result.5',local(result.name),local(friend.name));
}
onLangChange(render);
document.querySelector('#language-toggle').onclick = () => setLang(getLang() === 'km' ? 'en' : 'km').catch(() => {});
async function copy() {
  track('share_tapped', {channel: 'copy'});
  try {
    await navigator.clipboard.writeText(shareURL.href);
  } catch {
    const area = document.createElement('textarea');
    area.value = shareURL.href; document.body.append(area); area.select();
    const copied = document.execCommand('copy'); area.remove();
    if (!copied) { window.prompt(tr('ui.result.6'), shareURL.href); return; }
  }
  document.querySelector('#feedback').textContent = tr('ui.result.7');
}
document.querySelector('#copy-link').onclick = copy;
for (const link of document.querySelectorAll('[data-channel]')) {
  link.onclick = () => { track('share_tapped', {channel: link.dataset.channel}); };
}
document.querySelector('#facebook').href = 'https://www.facebook.com/sharer/sharer.php?'+new URLSearchParams({u: shareURL.href});
document.querySelector('#telegram').href = 'https://t.me/share/url?'+new URLSearchParams({url: shareURL.href, text: document.title});
if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  const messenger = document.querySelector('#messenger'); messenger.hidden = false;
  messenger.href = 'fb-messenger://share/?link='+encodeURIComponent(shareURL.href);
}
if (true) {
  const native = document.querySelector('#native-share'); native.hidden = false;
  native.onclick = async () => {
    if(!navigator.share){await copy();return;}
    track('share_tapped', {channel: 'native'});
    try { await navigator.share({title: document.title, url: shareURL.href,text:local(result.share || `quiz.r.${id}.share`).replace('{dish}',local(result.name))}); }
    catch (error) { if (error.name !== 'AbortError') await copy(); }
  };
}
try {
  const response = await fetch(new URL('r/index.json', base));
  if (!response.ok) throw new Error('Results unavailable');
  ({results} = await response.json()); result = results.find(item => item.id === id);
  await initI18n(); render();
} catch { /* The static English result remains usable. */ }

function fitName(){
  const node=document.querySelector('.result-name');node.style.fontSize='46px';
  const max=Math.min(300,root.clientWidth-80);let size=46;
  while(node.scrollWidth>max&&size>46*.6){size-=2;node.style.fontSize=size+'px';}
}
document.fonts.ready.then(fitName);window.addEventListener('resize',fitName);
document.querySelector('#save-story').onclick=async event=>{
  event.preventDefault();
  const download=()=>{const a=document.createElement('a');a.href='story.png';a.download=`thngainih-${id}-story.png`;document.body.append(a);a.click();a.remove();track('story_saved',{channel:'download'});};
  try{
    const response=await fetch('story.png');if(!response.ok)throw new Error('Story unavailable');
    const file=new File([await response.blob()],`thngainih-${id}-story.png`,{type:'image/png'});
    if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:document.title});track('story_saved',{channel:'share'});}else download();
    document.querySelector('#story-feedback').textContent=t('result.storySaved');
  }catch(error){if(error.name!=='AbortError'){download();document.querySelector('#story-feedback').textContent=t('result.storySaved');}}
};
