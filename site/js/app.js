import {initI18n, t, setLang, getLang, onLangChange} from './i18n.js';
import {pageview, track} from './analytics.js';
let content, state = 'loading';
const status = document.querySelector('#content-status');
function render() {
  const list = document.querySelector('#content-list');
  list.replaceChildren();
  status.hidden = state === 'ready' && content.items.length > 0;
  status.textContent = t(state === 'error' ? 'error' : state === 'ready' ? 'empty' : 'loading');
  if (!content) return;
  for (const item of content.items) {
    const li = document.createElement('li');
    let url;
    try { url = new URL(item.url, location.href); } catch { /* Render plain text. */ }
    const element = document.createElement(url && ['http:', 'https:'].includes(url.protocol) ? 'a' : 'span');
    if (element.tagName === 'A') element.href = url.href;
    element.textContent = getLang() === 'km' ? item.title_km || item.title : item.title;
    li.append(element);
    list.append(li);
  }
  const date = new Date(content.updated);
  const time = document.querySelector('#last-updated');
  if (!Number.isNaN(date.getTime())) {
    time.dateTime = date.toISOString();
    time.textContent = new Intl.DateTimeFormat(getLang() === 'km' ? 'km-KH' : 'en', {dateStyle: 'medium', timeStyle: 'short'}).format(date);
  }
}
onLangChange(render);
document.querySelector('#language-toggle').addEventListener('click', async () => {
  try { await setLang(getLang() === 'en' ? 'km' : 'en'); }
  catch { status.hidden = false; status.textContent = t('languageError'); }
});
document.querySelector('#cta').addEventListener('click', () => {
  track('cta_click');
  document.querySelector('#content').scrollIntoView();
  document.querySelector('#content-title').setAttribute('tabindex', '-1');
  document.querySelector('#content-title').focus({preventScroll: true});
});
try { await initI18n(); } catch { /* Static English remains available. */ }
pageview();
try {
  const response = await fetch(window.SITE_CONFIG?.contentUrl || './data/content.json');
  if (!response.ok) throw new Error('Content unavailable');
  const data = await response.json();
  if (!Array.isArray(data.items)) throw new Error('Invalid content');
  content = {updated: data.updated, items: data.items.filter(item => item && typeof item.title === 'string')};
  state = 'ready';
} catch { state = 'error'; }
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
