export function chooseWinner(quiz,answers) {
  const order=Array.isArray(quiz.tiebreak)?quiz.tiebreak:quiz.tiebreak?.fallback || quiz.results.map(r=>r.id);
  const scores=Object.fromEntries(quiz.results.map(r=>[r.id,0]));
  for(const a of answers)for(const [id,n] of Object.entries(a.scores))scores[id]+=n;
  let tied=order.filter(id=>scores[id]===Math.max(...Object.values(scores)));
  if(quiz.tiebreak?.mode==='latest-answer')for(const a of [...answers].reverse()) {
    const max=Math.max(...tied.map(id=>a.scores[id]||0));
    tied=tied.filter(id=>(a.scores[id]||0)===max);if(tied.length===1)break;
  }
  return tied[0];
}
import {km} from '../lib/locale.js';
const khmerDigits=n=>String(n).replace(/\d/g,d=>km['static.khmercal.3'][Number(d)]);
const base = new URL('../../', import.meta.url);
export async function mount(root, {t,getLang, onLangChange, track, source}) {
  const tr=(key,...args)=>t(key).replace(/\{(\d+)\}/g,(_,i)=>args[i]);
  const response = await fetch(new URL('quiz/quiz.json', base));
  if (!response.ok) throw new Error('Quiz unavailable');
  const quiz = await response.json();
  let step = -1, busy = false;
  const answers = [];
  const vs = new URLSearchParams(location.search).get('vs');
  const local = value => typeof value==='string'?t(value):value[getLang()] || value.en;
  const el = (tag, text, cls) => { const node = document.createElement(tag); node.textContent = text; if(cls)node.className=cls; return node; };
  function button(text, action, primary = false, cls = 'quiz-option') {
    const node = el('button', text);
    node.type = 'button'; node.className = primary ? 'primary quiz-start' : 'answer '+cls;
    node.onclick = action; root.append(node);
  }
  async function finish() {
    if (busy) return;
    busy = true;
    root.querySelectorAll('button').forEach(node => { node.disabled = true; });
    const winner = chooseWinner(quiz,answers);
    const pending = track('quiz_finished');
    await Promise.race([pending, new Promise(resolve => setTimeout(resolve, 300))]);
    // Give the counter's beacon a chance to dispatch before navigation.
    const url = new URL(`r/${winner}/`, base);
    if (source) url.searchParams.set('src', source);
    if (vs) url.searchParams.set('vs', vs);
    location.assign(url.href);
  }
  function render(focus = false) {
    document.title = local(quiz.title);
    root.replaceChildren();
    if (step < 0) {
      const friend = quiz.results.find(result => result.id === vs);
      if (friend) root.append(el('p', tr('ui.quiz.1',local(friend.name)),'quiz-friend'));
      root.append(el('h1', local(quiz.title),'quiz-title'), el('p', local(quiz.intro),'quiz-intro'));
      button(local(quiz.start || 'quiz.start'), () => { track('quiz_started'); step = 0; render(true); }, true);
    } else {
      const question = quiz.questions[step];
      const progress=el('div','','quiz-progress');const pips=el('div','','pips');
      for(let i=0;i<quiz.questions.length;i++)pips.append(el('i','',i<=step?'on':''));
      pips.setAttribute('role','progressbar');pips.setAttribute('aria-valuemin','0');pips.setAttribute('aria-valuemax',quiz.questions.length);pips.setAttribute('aria-valuenow',step+1);pips.setAttribute('aria-label',tr('ui.quiz.3'));
      const number=n=>getLang()==='km'?khmerDigits(n):n;
      const back=el('button','← '+tr('ui.quiz.4'),'quiz-back');back.type='button';back.onclick=()=>{if(!busy){step--;render(true);}};
      progress.append(pips,el('span',`${number(step+1)} / ${number(quiz.questions.length)}`,'t13 quiz-counter'),back);root.append(progress);
      root.append(el('h2',local(question.text),'quiz-question t24'));
      const list=el('div','','quiz-answers');root.append(list);
      question.answers.forEach((answer,index)=>{
        const option=el('button','','answer quiz-option');option.type='button';
        option.append(el('span',km['quiz.letters'][index],'letter'),el('span',local(answer.text),'t17'));
        option.onclick=()=>{
          if(busy)return;busy=true;option.classList.add('selected');option.setAttribute('aria-pressed','true');
          setTimeout(()=>{answers[step]=answer;busy=false;if(step+1===quiz.questions.length)finish();else{step++;render(true);}},250);
        };list.append(option);
      });
    }
    root.append(el('div','','orn orn-divider rule'),el('p',t('quiz.footer'),'quiz-hint t13'));
    const heading = root.querySelector('h1,h2');
    if (focus && heading) { heading.tabIndex = -1; heading.focus(); }
  }
  onLangChange(() => render()); render();
}
