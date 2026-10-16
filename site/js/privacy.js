import {initI18n,setLang,getLang} from './i18n.js';
await initI18n();
document.querySelector('#language-toggle').onclick=()=>setLang(getLang()==='en'?'km':'en');
