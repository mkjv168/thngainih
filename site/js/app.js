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
  const name = document.querySelector('[data-module]')?.dataset.module || window.SITE_CONFIG?.module || 'today';
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid module');
  const module = await import(`./modules/${name}.js`);
  await module.mount(root, {t, getLang, onLangChange, track, source: getSource()});
} catch { root.textContent = t('error'); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});
