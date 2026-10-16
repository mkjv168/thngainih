import {en,km} from './locale.js';
let momentkh = globalThis.momentkh;
if (typeof process !== 'undefined' && process.versions?.node) {
  const {createRequire} = await import('node:module');
  momentkh = createRequire(import.meta.url)('../vendor/momentkh.js');
}
if (!momentkh) throw new Error('MomentKH must load before the calendar');
const months = Array.from({length:14},(_,i)=>en[`lunar.month.${i}`]);
const animals = Array.from({length:12},(_,i)=>en[`lunar.animal.${i}`]);
const format=(key,values)=>km[key].replace(/\{(\w+)\}/g,(_,k)=>values[k]);
export function ictToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Phnom_Penh', year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {y:+parts.year,m:+parts.month,d:+parts.day};
}
export const isoDate = ({y,m,d}) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
export function addDays(date, n) { const dt = new Date(Date.UTC(date.y,date.m-1,date.d+n)); return {y:dt.getUTCFullYear(),m:dt.getUTCMonth()+1,d:dt.getUTCDate()}; }
export function parseDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text || '')) throw new Error('Expected YYYY-MM-DD');
  const [y,m,d] = text.split('-').map(Number), date={y,m,d};
  if (isoDate(addDays(date,0)) !== text) throw new Error('Invalid date');
  return date;
}
const raw = date => momentkh.fromGregorian(date.y,date.m,date.d).khmer;
export function khmerDay(date) {
  const result = momentkh.fromGregorian(date.y,date.m,date.d), k=result.khmer;
  // A daily card labels the whole civil New Year date. Derive the animal
  // independently of BE to avoid the vendor's double increment at Visakha.
  const ny=momentkh.getNewYear(date.y);
  const animalYear=((date.y+547+(isoDate(date)>=isoDate({y:ny.year,m:ny.month,d:ny.day})?1:0))%12+12)%12;
  const phase = k.moonPhase === 0 ? 'waxing' : 'waning';
  let daysInPhase = k.day;
  for (let n=1;n<=16;n++) { const next=raw(addDays(date,n)); if(next.moonPhase!==k.moonPhase || next.day===1) break; daysInPhase=next.day; }
  const next=raw(addDays(date,1));
  const last=phase==='waning' && next.moonPhase===0 && next.day===1;
  const silKind = k.day===8 ? `8-${phase}` : phase==='waxing' && k.day===15 ? '15-waxing' : last ? 'last-waning' : null;
  return {lunarDay:k.day,phase,phaseKm:km[`lunar.phase.${k.moonPhase}`],monthIndex:k.monthIndex,monthKm:km[`lunar.month.${k.monthIndex}`],monthEn:months[k.monthIndex],beYear:k.beYear,animalKm:km[`lunar.animal.${animalYear}`],animalEn:animals[animalYear],sakKm:km[`lunar.sak.${k.sak}`] || k.sakName,dowKm:km[`lunar.weekday.${new Date(isoDate(date)).getUTCDay()}`],formattedKm:format('calendar.lunar',{day:khmerDigits(k.day),phase:km[`lunar.phase.${k.moonPhase}`],month:km[`lunar.month.${k.monthIndex}`],animal:km[`lunar.animal.${animalYear}`],sak:km[`lunar.sak.${k.sak}`] || k.sakName,year:khmerDigits(k.beYear)}),isSil:!!silKind,silKind,daysInPhase};
}
export function nextSil(from,maxDays=20) { for(let n=0;n<=maxDays;n++){const date=addDays(from,n),k=khmerDay(date); if(k.isSil)return {date,daysAway:n,kind:k.silKind};} return null; }
export function nextHoliday(holidays,from) {
  const start=isoDate(from), list=Array.isArray(holidays)?holidays:holidays.holidays;
  const sorted=[...list].sort((a,b)=>a.date.localeCompare(b.date));
  const name=h=>String(typeof h.name==='string' ? en[h.name] || h.name : h.name.en).split(/,? day \d/i)[0];
  const first=sorted.filter((h,i)=>!i || name(h)!==name(sorted[i-1]) || isoDate(addDays(parseDate(sorted[i-1].date),1))!==h.date);
  // During a festival, retain today's entry (and any suspension note).
  const active=sorted.find(h=>h.date===start);
  const holiday=active || first.filter(h=>h.date>=start).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return holiday ? {holiday,daysAway:Math.round((Date.parse(holiday.date)-Date.parse(start))/86400000)} : null;
}
export const khmerDigits = n => String(n).replace(/[0-9]/g,d=>km['static.khmercal.3'][+d]);
export function gregorian(date,lang='en',short=false) {
  const dt=new Date(Date.UTC(date.y,date.m-1,date.d));
  if(lang==='km') return format('calendar.gregorian',{weekday:khmerDay(date).dowKm,day:khmerDigits(date.d),month:km[`lunar.solar.${date.m-1}`],year:khmerDigits(date.y)});
  return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:short?'short':'long',day:'numeric',month:short?'short':'long',...(!short && {year:'numeric'})}).format(dt);
}
export function lunarEnglish(k) { const n=k.lunarDay, suffix=n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'); return `${n}${suffix} ${k.phase} day of ${k.monthEn} · Year of the ${k.animalEn} · B.E. ${k.beYear}`; }
