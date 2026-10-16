let momentkh = globalThis.momentkh;
if (typeof process !== 'undefined' && process.versions?.node) {
  const {createRequire} = await import('node:module');
  momentkh = createRequire(import.meta.url)('../vendor/momentkh.js');
}
if (!momentkh) throw new Error('MomentKH must load before the calendar');
const months = 'Migasir Boss Meak Phalkun Cheit Pisakh Jesth Asadh Srap Phatrabot Assoch Kadeuk Pathamasadh Tutiyasadh'.split(' ');
const animals = 'Rat Ox Tiger Rabbit Dragon Snake Horse Goat Monkey Rooster Dog Pig'.split(' ');
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
  const phase = k.moonPhase === 0 ? 'waxing' : 'waning';
  let daysInPhase = k.day;
  for (let n=1;n<=16;n++) { const next=raw(addDays(date,n)); if(next.moonPhase!==k.moonPhase || next.day===1) break; daysInPhase=next.day; }
  const next=raw(addDays(date,1));
  const last=phase==='waning' && next.moonPhase===0 && next.day===1;
  const silKind = k.day===8 ? `8-${phase}` : phase==='waxing' && k.day===15 ? '15-waxing' : last ? 'last-waning' : null;
  return {lunarDay:k.day,phase,phaseKm:phase==='waxing'?'កើត':'រោច',monthIndex:k.monthIndex,monthKm:k.monthName,monthEn:months[k.monthIndex],beYear:k.beYear,animalKm:k.animalYearName,animalEn:animals[k.animalYear],sakKm:k.sakName,dowKm:k.dayOfWeekName,formattedKm:momentkh.format(result),isSil:!!silKind,silKind,daysInPhase};
}
export function nextSil(from,maxDays=20) { for(let n=0;n<=maxDays;n++){const date=addDays(from,n),k=khmerDay(date); if(k.isSil)return {date,daysAway:n,kind:k.silKind};} return null; }
export function nextHoliday(holidays,from) {
  const start=isoDate(from), list=Array.isArray(holidays)?holidays:holidays.holidays;
  const holiday=[...list].filter(h=>h.date>=start).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return holiday ? {holiday,daysAway:Math.round((Date.parse(holiday.date)-Date.parse(start))/86400000)} : null;
}
export const khmerDigits = n => String(n).replace(/[0-9]/g,d=>'០១២៣៤៥៦៧៨៩'[+d]);
export function gregorian(date,lang='en',short=false) {
  const dt=new Date(Date.UTC(date.y,date.m-1,date.d));
  if(lang==='km') return `ថ្ងៃ${khmerDay(date).dowKm} ទី${khmerDigits(date.d)} ខែ${momentkh.constants.SolarMonthNames[date.m-1]} ឆ្នាំ${khmerDigits(date.y)}`;
  return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:short?'short':'long',day:'numeric',month:short?'short':'long',...(!short && {year:'numeric'})}).format(dt);
}
export function lunarEnglish(k) { const n=k.lunarDay, suffix=n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'); return `${n}${suffix} ${k.phase} day of ${k.monthEn} · Year of the ${k.animalEn} · B.E. ${k.beYear}`; }
