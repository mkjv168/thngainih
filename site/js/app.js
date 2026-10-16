import {initI18n, t, setLang, getLang, onLangChange} from './i18n.js';
import {pageview, track} from './analytics.js';
import {getSource} from './source.js';
const root = document.querySelector('#content');
document.querySelector('#language-toggle').onclick = async () => {
  try { await setLang(getLang() === 'en' ? 'km' : 'en'); }
  catch { root.textContent = t('languageError'); }
};
try { await initI18n(); } catch { /* English fallback. */ }
pageview();
try {
  const name = window.SITE_CONFIG?.module || 'content';
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid module');
  const module = await import(`./modules/${name}.js`);
  await module.mount(root, {t, getLang, onLangChange, track, source: getSource()});
} catch { root.textContent = t('error'); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
