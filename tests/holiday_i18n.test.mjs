import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {khmerDay,parseDate,nextHoliday} from '../site/js/lib/khmercal.js';
import {km} from '../site/js/lib/locale.js';
const data=JSON.parse(readFileSync(new URL('../site/data/holidays.json',import.meta.url)));
assert.equal(data.schemaVersion,2);assert.equal(data.holidays.length,28);
for(const lang of ['en','km']){
 const d=JSON.parse(readFileSync(new URL(`../site/i18n/${lang}.json`,import.meta.url)));
 for(const h of data.holidays){assert.ok(d[h.name]);if(h.note)assert.ok(d[h.note]);}
}
for(const [from,expected] of [['2026-11-10','2026-11-23'],['2027-04-01','2027-04-14'],['2027-09-25','2027-09-29']])assert.equal(nextHoliday(data,parseDate(from)).holiday.date,expected);
assert.ok(nextHoliday(data,parseDate('2026-11-20')).holiday.note);
const k=khmerDay(parseDate('2026-11-01'));
assert.equal(k.monthKm,km[`lunar.month.${k.monthIndex}`]);
assert.equal(km['lunar.month.11'],'\u1780\u178f\u17d2\u178f\u17b7\u1780');
assert.ok(k.formattedKm.includes(k.monthKm));
console.log('PASS: 28 official holiday keys, festival first days, notes, calendar display from km.json');

for(const date of ['2027-04-14','2027-04-15','2027-05-20','2027-05-21','2027-05-22'])assert.equal(khmerDay(parseDate(date)).animalEn,'Goat',date);
assert.equal(khmerDay(parseDate('2027-04-13')).animalEn,'Horse');
assert.ok(nextHoliday(data,parseDate('2026-11-24')).holiday.note);
