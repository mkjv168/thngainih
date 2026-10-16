import {readFileSync} from 'node:fs';
import {ictToday,parseDate,addDays,isoDate,khmerDay,nextSil,nextHoliday,gregorian,lunarEnglish} from '../site/js/lib/khmercal.js';
const read=name=>JSON.parse(readFileSync(new URL(`../site/data/${name}.json`,import.meta.url),'utf8'));
const holidays=read('holidays'),colors=read('day-colors');
const start=process.argv[2]?parseDate(process.argv[2]):ictToday(),days=Number(process.argv[3]||9);
if(!Number.isInteger(days)||days<1||days>3660)throw new Error('days must be 1..3660');
console.log(JSON.stringify(Array.from({length:days},(_,i)=>{const date=addDays(start,i),iso=isoDate(date),k=khmerDay(date);return {date:iso,...k,gregorianEn:gregorian(date),gregorianKm:gregorian(date,'km'),lunarEn:lunarEnglish(k),colour:colors.weekdays[new Date(iso+'T00:00:00Z').getUTCDay()],nextHoliday:nextHoliday(holidays,date),nextSil:nextSil(date)};})));
