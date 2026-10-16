import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseWinner} from '../site/js/modules/quiz.js';
const quiz=JSON.parse(readFileSync(new URL('../site/quiz/quiz.json',import.meta.url)));
const dictionaries=['en','km'].map(lang=>JSON.parse(readFileSync(new URL(`../site/i18n/${lang}.json`,import.meta.url))));
assert.equal(quiz.results.length,8);
for(const d of dictionaries)for(const value of [quiz.title,quiz.intro,...quiz.questions.flatMap(q=>[q.text,...q.answers.map(a=>a.text)]),...quiz.results.flatMap(r=>[r.name,r.blurb,r.fact,r.share])].filter(Boolean))assert.ok(d[value],`Missing translation: ${value}`);
const small={results:[{id:'a'},{id:'b'},{id:'c'}],tiebreak:{mode:'latest-answer',fallback:['a','b','c']}};
assert.equal(chooseWinner(small,[{scores:{a:1}},{scores:{b:1}}]),'b');
assert.equal(chooseWinner(small,[{scores:{a:1}},{scores:{b:1}},{scores:{c:0}}]),'b');
assert.equal(chooseWinner(small,[{scores:{a:1,b:1}}]),'a');
assert.equal(chooseWinner({...small,tiebreak:['a','b','c']},[{scores:{b:1}},{scores:{a:1}}]),'a');
const winners=new Set();
function walk(answers,i=0){if(i===quiz.questions.length){winners.add(chooseWinner(quiz,answers));return;}for(const answer of quiz.questions[i].answers)walk([...answers,answer],i+1);}
walk([]);assert.equal(winners.size,8,'Every dish must be reachable');
console.log('PASS: generic latest-answer/fallback tie-breaking, translations, all 8 results reachable');
