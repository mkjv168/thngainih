import {km} from '../lib/locale.js';
import {ictToday,khmerDay,nextSil,nextHoliday,khmerDigits,isoDate,parseDate,gregorian,lunarEnglish} from '../lib/khmercal.js';
const base=new URL('../../',import.meta.url);
let installEvent;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;window.dispatchEvent(new Event('install-ready'));});
export async function mount(root,{t,getLang,onLangChange,track,source}) {
  const tr=(key,...args)=>t(key).replace(/\{(\d+)\}/g,(_,i)=>args[i]);
  const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
  root.classList.add('today-card'); root.setAttribute('aria-busy','true');
  root.replaceChildren(el('p',t('loading'),'today-loading'));
  const [holidays,colors]=await Promise.all(['holidays','day-colors'].map(async name=>{const r=await fetch(new URL(`data/${name}.json`,base));if(!r.ok)throw new Error('Daily data unavailable');return r.json();}));
  let override; try {override=parseDate(new URLSearchParams(location.search).get('date'));} catch { /* Use ICT today. */ }
  let current;
  const num=n=>getLang()==='km'?khmerDigits(n):n;
  function render() {
    const date=override||ictToday();current=isoDate(date);
    const k=khmerDay(date),sil=nextSil(date),holiday=nextHoliday(holidays,date),color=colors.weekdays[new Date(current+'T00:00:00Z').getUTCDay()];
    root.replaceChildren();root.setAttribute('aria-busy','false');
    document.title=tr('ui.today.1');
    root.append(el('p',tr('ui.today.2'),'today-eyebrow'),el('h1',gregorian(date,getLang()),'today-date'));
    const lunar=el('p',k.formattedKm);lunar.lang='km';lunar.className='lunar';root.append(lunar);if(getLang()!=='km')root.append(el('p',lunarEnglish(k),'lunar-en'));
    const badge=el('p',sil.daysAway===0?tr('ui.today.3'):sil.daysAway===1?tr('ui.today.4'):tr('ui.today.5',gregorian(sil.date,getLang()),num(sil.daysAway)));badge.className='sil';root.append(badge);
    const colour=el('p',tr('ui.today.6',t(color.color)),'today-colour'),swatch=el('span','');swatch.className='swatch';swatch.style.backgroundColor=color.hex;colour.prepend(swatch);root.append(colour,el('small',tr('ui.today.7'),'today-note'));
    if(holiday){const h=holiday.holiday;root.append(el('p',holiday.daysAway===0?tr('ui.today.8',t(h.name)):tr('ui.today.9',t(h.name),num(holiday.daysAway),gregorian(parseDate(h.date),getLang())),'today-holiday'));if(h.note)root.append(el('small',t(h.note),'today-holiday-note'));}
    else root.append(el('p',tr('ui.today.11'),'today-holiday'));
    const actions=el('div','');actions.className='daily-actions';root.append(actions);
    const button=(text,fn)=>{const b=el('button',text,'today-action');b.type='button';b.onclick=fn;actions.append(b);return b;};
    const shareURL=new URL(`d/${current}/?src=share`,(window.SITE_CONFIG&&window.SITE_CONFIG.siteUrl)||base),text=`${gregorian(date)} · ${lunarEnglish(k)}`;
    const feedback=el('p','','today-feedback');feedback.role='status';
    function fallback(){
      if(actions.querySelector('[data-fallback]'))return;
      for(const [channel,url] of [['telegram','https://t.me/share/url?'+new URLSearchParams({url:shareURL.href,text})],['facebook','https://www.facebook.com/sharer/sharer.php?'+new URLSearchParams({u:shareURL.href})]]){const a=el('a',channel==='telegram'?'Telegram':'Facebook','today-share-link');a.dataset.fallback='true';a.href=url;a.target='_blank';a.rel='noopener';a.onclick=()=>track('share_tapped',{channel});actions.append(a);}
      const copy=button(tr('ui.today.12'),async()=>{track('share_tapped',{channel:'copy'});try{await navigator.clipboard.writeText(shareURL.href);feedback.textContent=tr('ui.today.13');}catch{window.prompt(tr('ui.today.14'),shareURL.href);}});copy.classList.add('today-copy');copy.dataset.fallback='true';
    }
    async function png(){
      try{const r=await fetch(new URL(`d/${current}/og.png`,base));if(!r.ok)throw new Error('Missing card');return await r.blob();}catch{
        await document.fonts.load('700 48px "Kantumruy Pro"');
        const c=document.createElement('canvas');c.width=1200;c.height=630;const g=c.getContext('2d');g.fillStyle='#f5f4ed';g.fillRect(0,0,1200,630);g.fillStyle=color.hex;g.fillRect(0,0,1200,32);g.fillStyle='#123d35';g.font='700 48px "Kantumruy Pro", sans-serif';
        const lines=[km.name,k.formattedKm,gregorian(date),t('colour.label')+': '+t(color.color)];
        lines.forEach((line,i)=>{let size=48;while(g.measureText(line).width>1080&&size>18)g.font=`700 ${--size}px "Kantumruy Pro", sans-serif`;g.fillText(line,60,120+i*120);g.font='700 48px "Kantumruy Pro", sans-serif';});
        return await new Promise(resolve=>c.toBlob(resolve,'image/png'));
      }
    }
    button(tr('ui.today.15'),async()=>{
      if(!navigator.share){fallback();return;}
      try {const probe=new File([''],current+'.png',{type:'image/png'});let data={url:shareURL.href,text};if(navigator.canShare?.({files:[probe]})){const blob=await png();if(blob){const file=new File([blob],current+'.png',{type:'image/png'});if(navigator.canShare({files:[file]}))data.files=[file];}}await navigator.share(data);track('share_tapped',{channel:'native'});}catch(e){if(e.name!=='AbortError')fallback();}
    }).className='primary today-share';
    const quiz=el('a',tr('ui.today.16'),'today-quiz');const q=new URL('quiz/',base);if(source)q.searchParams.set('src',source);quiz.href=q.href;quiz.onclick=()=>track('quiz_cta');actions.append(quiz);
    const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
    if(!standalone){if(installEvent)button(tr('ui.today.17'),async()=>{track('install_prompt');const e=installEvent;installEvent=null;await e.prompt();if((await e.userChoice).outcome==='accepted')track('install_accepted');render();}).classList.add('today-install');else if(/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))root.append(el('p',tr('ui.today.18'),'today-install-note'));}
    const credit=el('small','','today-credit');const citation=el('a','Sub-Decree 167/198 ANKr.BK','today-citation');citation.href=holidays.holidays[0].sources[1];credit.append(citation);root.append(feedback,credit);
  }
  onLangChange(render);window.addEventListener('install-ready',render);window.addEventListener('appinstalled',render);
  const rollover=()=>{if(!override&&isoDate(ictToday())!==current)render();};document.addEventListener('visibilitychange',rollover);setInterval(rollover,60000);
  render();track('card_view');
}
