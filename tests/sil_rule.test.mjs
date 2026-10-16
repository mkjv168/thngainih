import assert from 'node:assert/strict';
import {parseDate,addDays,isoDate,khmerDay,ictToday} from '../site/js/lib/khmercal.js';
assert.deepEqual(ictToday(new Date('2026-10-16T17:00:00Z')),{y:2026,m:10,d:17});
const halves=[];let half;
for(let date=parseDate('2026-01-01');isoDate(date)<='2028-12-31';date=addDays(date,1)){
 const k=khmerDay(date),next=khmerDay(addDays(date,1));
 if(!half||k.lunarDay===1){half={complete:k.lunarDay===1,phase:k.phase,days:[],holy:[]};halves.push(half);}
 half.days.push(k.lunarDay);if(k.isSil)half.holy.push(k.lunarDay);
 const last=k.phase==='waning'&&next.phase==='waxing'&&next.lunarDay===1;
 assert.equal(k.isSil,k.lunarDay===8||(k.phase==='waxing'&&k.lunarDay===15)||last,isoDate(date));
 if(k.silKind==='last-waning'){assert.ok([14,15].includes(k.lunarDay));assert.equal(next.lunarDay,1);assert.equal(next.phase,'waxing');}
 if(k.phase!==next.phase){half.ended=true;assert.equal(k.daysInPhase,k.lunarDay);}
}
for(const h of halves.filter(h=>h.complete&&h.ended)){assert.equal(h.holy.length,2);assert.deepEqual(h.holy,[8,h.days.at(-1)]);}
console.log('PASS: 2026–2028 holy-day rule and two holy days per complete lunar half');
