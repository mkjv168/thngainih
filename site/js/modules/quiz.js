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
  const el = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
  function button(text, action, primary = false) {
    const node = el('button', text);
    node.type = 'button'; node.className = primary ? 'primary' : 'answer';
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
      if (friend) root.append(el('p', tr('ui.quiz.1',local(friend.name))));
      root.append(el('h1', local(quiz.title)), el('p', local(quiz.intro)));
      button(local(quiz.start || 'quiz.start'), () => { track('quiz_started'); step = 0; render(true); }, true);
    } else {
      const question = quiz.questions[step];
      root.append(el('p', `${step + 1} / ${quiz.questions.length}`));
      const progress = document.createElement('progress'); progress.max = quiz.questions.length; progress.value = step + 1;
      progress.setAttribute('aria-label', tr('ui.quiz.3')); root.append(progress);
      root.append(el('h2', local(question.text)));
      question.answers.forEach(answer => button(local(answer.text), () => {
        answers[step] = answer;
        if (step + 1 === quiz.questions.length) finish();
        else { step++; render(true); }
      }));
      button(tr('ui.quiz.4'), () => { step--; render(true); });
    }
    const heading = root.querySelector('h1,h2');
    if (focus && heading) { heading.tabIndex = -1; heading.focus(); }
  }
  onLangChange(() => render()); render();
}
