import {getSource} from './source.js';
const link=document.querySelector('#see-today'),url=new URL(link.href),source=getSource();
if(source)url.searchParams.set('src',source);
link.href=url.href;

import {initI18n,setLang,getLang} from './i18n.js';
await initI18n();
document.querySelector('#language-toggle').onclick=()=>setLang(getLang()==='en'?'km':'en');
