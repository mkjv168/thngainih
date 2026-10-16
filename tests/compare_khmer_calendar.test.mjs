import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {khmerDay,parseDate} from '../site/js/lib/khmercal.js';
const folder=new URL('./fixtures/khmer-calendar-com/',import.meta.url);
const files=existsSync(folder)?readdirSync(folder).filter(f=>f.endsWith('.json')):[];
if(!files.length){console.log('SKIP: no khmer-calendar.com fixtures; operator may add JSON files.');process.exit(0);}
const groups=['Kadeuk Kakdeuk Kartik','Migasir Mekasir Mikasar Mikh Meakasir','Boss Bos Pous','Asath Asadh Pathamasadh Pathamasath Tutiyasadh Tutiyasath','Phatrabot Photrobot','Srap Srapoan Srapon','Jesth Ches Jais','Pisakh Pisak Visak','Phalkun Phalgun','Cheit Chet','Meak Magha','Assoch'];
const aliases=new Map(groups.flatMap(g=>g.toLowerCase().split(' ').map(n=>[n,g.split(' ')[0].toLowerCase()])));
const norm=n=>{const value=String(n).trim().toLowerCase();if(!aliases.has(value))console.log('Unknown lunar month:',n);return aliases.get(value)||value;};
const colors=JSON.parse(readFileSync(new URL('../site/data/day-colors.json',import.meta.url))).weekdays;
let failed=0;
const en=JSON.parse(readFileSync(new URL('../site/i18n/en.json',import.meta.url)));
for(const file of files) {
const counts={};let colourMatches=0,colourDifferences=0;
for(const row of JSON.parse(readFileSync(new URL(file,folder))).days){
 const k=khmerDay(parseDate(row.date));
 for(const [field,actual,expected] of [['lunarDay',k.lunarDay,row.lunarDay],['phase',k.phase,row.phase],['month',norm(k.monthEn),norm(row.lunarMonth)],['beYear',k.beYear,row.beYear],['animal',k.animalEn.toLowerCase(),String(row.animalYear).toLowerCase()],['isSil',k.isSil,row.thngaiSil]]){
 const ok=actual===expected;counts[field]??={pass:0,fail:0};counts[field][ok?'pass':'fail']++;if(!ok){failed++;console.log(`${file} ${row.date} ${field}: ours=${actual}, fixture=${expected}`);}
 }
 const ours=colors[new Date(row.date+'T00:00:00Z').getUTCDay()].color;
 const colour=en[ours];
 if(row.luckyColorEn)(colour.toLowerCase()===row.luckyColorEn.toLowerCase()?colourMatches++:colourDifferences++);
}
console.log(`${file} colours (informational, different system): ${colourMatches} match, ${colourDifferences} differ`);
for(const [field,c]of Object.entries(counts))console.log(`${file} ${field}: ${c.pass} pass, ${c.fail} fail`);
}
process.exitCode=failed?1:0;
