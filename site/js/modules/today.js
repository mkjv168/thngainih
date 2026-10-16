import {ictToday,khmerDay,nextSil,nextHoliday,khmerDigits,isoDate,parseDate,gregorian,lunarEnglish} from '../lib/khmercal.js';
const base=new URL('../../',import.meta.url);
let installEvent;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;window.dispatchEvent(new Event('install-ready'));});
export async function mount(root,{getLang,onLangChange,track,source}) {
  const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  root.classList.add('today-card'); root.setAttribute('aria-busy','true');
  root.replaceChildren(el('p','Loading today’s card… / កំពុងផ្ទុក…'));
  const [holidays,colors]=await Promise.all(['holidays','day-colors'].map(async name=>{const r=await fetch(new URL(`data/${name}.json`,base));if(!r.ok)throw new Error('Daily data unavailable');return r.json();}));
  let override; try {override=parseDate(new URLSearchParams(location.search).get('date'));} catch { /* Use ICT today. */ }
  let current;
  const word=(en,km)=>getLang()==='km'?km:en;
  const num=n=>getLang()==='km'?khmerDigits(n):n;
  function render() {
    const date=override||ictToday();current=isoDate(date);
    const k=khmerDay(date),sil=nextSil(date),holiday=nextHoliday(holidays,date),color=colors.weekdays[new Date(current+'T00:00:00Z').getUTCDay()];
    root.replaceChildren();root.setAttribute('aria-busy','false');
    document.title=word('Today in Khmer','ប្រតិទិនខ្មែរថ្ងៃនេះ');
    root.append(el('p',word('TODAY IN KHMER','ប្រតិទិនខ្មែរថ្ងៃនេះ')),el('h1',gregorian(date,getLang())));
    const lunar=el('p',k.formattedKm);lunar.lang='km';lunar.className='lunar';root.append(lunar,el('p',lunarEnglish(k)));
    const badge=el('p',sil.daysAway===0?word('Today is Thngai Sil (holy day)','ថ្ងៃនេះជាថ្ងៃសីល'):sil.daysAway===1?word('Tomorrow is Thngai Sil','ស្អែកជាថ្ងៃសីល'):word(`Next Thngai Sil: ${gregorian(sil.date,'en',true)} (in ${sil.daysAway} days)`,`ថ្ងៃសីលបន្ទាប់៖ ${gregorian(sil.date,'km')} (នៅសល់ ${num(sil.daysAway)} ថ្ងៃ)`));badge.className='sil';root.append(badge);
    const colour=el('p',word(`Lucky colour: ${color.color.en}`,`ពណ៌ប្រចាំថ្ងៃ៖ ${color.color.km}`)),swatch=el('span','');swatch.className='swatch';swatch.style.backgroundColor=color.hex;colour.prepend(swatch);root.append(colour,el('small',word('Traditional Khmer weekday colour','ពណ៌ប្រចាំថ្ងៃតាមប្រពៃណីខ្មែរ')));
    if(holiday){const h=holiday.holiday;root.append(el('p',holiday.daysAway===0?word(`Today is ${h.name.en}`,`ថ្ងៃនេះជា ${h.name.km}`):word(`Next public holiday: ${h.name.en} in ${holiday.daysAway} days (${gregorian(parseDate(h.date),'en',true)})`,`ថ្ងៃឈប់សម្រាកបន្ទាប់៖ ${h.name.km} នៅសល់ ${num(holiday.daysAway)} ថ្ងៃ (${gregorian(parseDate(h.date),'km')})`)));if(!h.verified)root.append(el('small',word('(unverified date)','(កាលបរិច្ឆេទមិនទាន់ផ្ទៀងផ្ទាត់)')));}
    else root.append(el('p',word('No upcoming holidays in the current data.','មិនមានថ្ងៃឈប់សម្រាកបន្ទាប់ក្នុងទិន្នន័យបច្ចុប្បន្ន។')));
    const actions=el('div','');actions.className='daily-actions';root.append(actions);
    const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;actions.append(b);return b;};
    const shareURL=new URL(`d/${current}/?src=share`,base),text=`${gregorian(date)} · ${lunarEnglish(k)}`;
    const feedback=el('p','');feedback.role='status';
    function fallback(){
      if(actions.querySelector('[data-fallback]'))return;
      for(const [channel,url] of [['telegram','https://t.me/share/url?'+new URLSearchParams({url:shareURL.href,text})],['facebook','https://www.facebook.com/sharer/sharer.php?'+new URLSearchParams({u:shareURL.href})]]){const a=el('a',channel==='telegram'?'Telegram':'Facebook');a.dataset.fallback='true';a.href=url;a.target='_blank';a.rel='noopener';a.onclick=()=>track('card_share',{channel});actions.append(a);}
      const copy=button(word('Copy link','ចម្លងតំណ'),async()=>{track('card_share',{channel:'copy'});try{await navigator.clipboard.writeText(shareURL.href);feedback.textContent=word('Link copied!','បានចម្លងតំណ!');}catch{window.prompt(word('Copy this link','ចម្លងតំណនេះ'),shareURL.href);}});copy.dataset.fallback='true';
    }
    async function png(){
      try{const r=await fetch(new URL(`d/${current}/og.png`,base));if(!r.ok)throw new Error('Missing card');return await r.blob();}catch{
        await document.fonts.load('700 48px "Kantumruy Pro"');
        const c=document.createElement('canvas');c.width=1200;c.height=630;const g=c.getContext('2d');g.fillStyle='#f5f4ed';g.fillRect(0,0,1200,630);g.fillStyle=color.hex;g.fillRect(0,0,1200,32);g.fillStyle='#123d35';g.font='700 48px "Kantumruy Pro", sans-serif';
        const lines=['Today in Khmer / ប្រតិទិនខ្មែរថ្ងៃនេះ',k.formattedKm,gregorian(date),`Lucky colour: ${color.color.en} / ${color.color.km}`];
        lines.forEach((line,i)=>{let size=48;while(g.measureText(line).width>1080&&size>18)g.font=`700 ${--size}px "Kantumruy Pro", sans-serif`;g.fillText(line,60,120+i*120);g.font='700 48px "Kantumruy Pro", sans-serif';});
        return await new Promise(resolve=>c.toBlob(resolve,'image/png'));
      }
    }
    button(word("Share today's card","ចែករំលែកកាតថ្ងៃនេះ"),async()=>{
      if(!navigator.share){fallback();return;}
      try {const probe=new File([''],current+'.png',{type:'image/png'});let data={url:shareURL.href,text};if(navigator.canShare?.({files:[probe]})){const blob=await png();if(blob){const file=new File([blob],current+'.png',{type:'image/png'});if(navigator.canShare({files:[file]}))data.files=[file];}}await navigator.share(data);track('card_share',{channel:'native'});}catch(e){if(e.name!=='AbortError')fallback();}
    }).className='primary';
    const quiz=el('a',word('Which Khmer dish are you? → take the quiz','តើអ្នកជាម្ហូបខ្មែរមួយណា? → លេងកម្រងសំណួរ'));const q=new URL('quiz/',base);if(source)q.searchParams.set('src',source);quiz.href=q.href;quiz.onclick=()=>track('quiz_cta');actions.append(quiz);
    const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
    if(!standalone){if(installEvent)button(word('Add to home screen','បន្ថែមទៅអេក្រង់ដើម'),async()=>{track('install_prompt');const e=installEvent;installEvent=null;await e.prompt();if((await e.userChoice).outcome==='accepted')track('install_accepted');render();});else if(/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))root.append(el('p',word("Tap Share ⎋ then 'Add to Home Screen'","ចុចចែករំលែក ⎋ រួចជ្រើស 'Add to Home Screen'")));}
    root.append(feedback);
  }
  onLangChange(render);window.addEventListener('install-ready',render);window.addEventListener('appinstalled',render);
  const rollover=()=>{if(!override&&isoDate(ictToday())!==current)render();};document.addEventListener('visibilitychange',rollover);setInterval(rollover,60000);
  render();track('card_view');
}
