import {en,km} from './lib/locale.js';
import {track} from './analytics.js';
const dictionaries = {en,km};
const fallback = {loading: 'Loading the latest updates…', empty: 'Nothing here yet. Check back soon.', error: 'Updates could not be loaded. Please try again later.', languageError: 'Language could not be loaded. Please try again.'};
let lang = 'en';
const listeners = new Set();
export const getLang = () => lang;
export const t = key => dictionaries[lang]?.[key] ?? dictionaries.en?.[key] ?? fallback[key] ?? key;
export const onLangChange = callback => { listeners.add(callback); return () => listeners.delete(callback); };
export async function setLang(next, report = true) {
  next = next === 'km' ? 'km' : 'en';
  if (!dictionaries[next]) {
    const response = await fetch(new URL(`../i18n/${next}.json`, import.meta.url));
    if (!response.ok) throw new Error('Translation unavailable');
    dictionaries[next] = await response.json();
  }
  lang = next;
  document.documentElement.lang = lang;
  try { localStorage.setItem('lang', lang); } catch { /* Storage may be disabled. */ }
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(';').forEach(binding => {
      const [attribute, key] = binding.split(':');
      el.setAttribute(attribute, t(key));
    });
  });
  document.title = t('title');
  document.querySelector('#language-toggle')?.setAttribute('aria-pressed', String(lang === 'km'));
  listeners.forEach(callback => callback(lang));
  if (report) track('lang_switch', {to: lang});
}
export async function initI18n() {
  let saved;
  try { saved = localStorage.getItem('lang'); } catch { /* Use English. */ }
  const query = new URLSearchParams(location.search).get('lang');
  await setLang('en', false);
  if ((query ?? saved) === 'km') await setLang('km', false);
}
