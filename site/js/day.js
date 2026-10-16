import {getSource} from './source.js';
const link=document.querySelector('#see-today'),url=new URL(link.href),source=getSource();
if(source)url.searchParams.set('src',source);
link.href=url.href;
