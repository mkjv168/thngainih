const base = new URL('../../', import.meta.url);
export async function mount(root, {getLang, onLangChange, track, source}) {
  const response = await fetch(new URL('quiz/quiz.json', base));
  if (!response.ok) throw new Error('Quiz unavailable');
  const quiz = await response.json();
  let step = -1, busy = false;
  const answers = [];
  const vs = new URLSearchParams(location.search).get('vs');
  const local = value => value[getLang()] || value.en;
  const word = (en, km) => getLang() === 'km' ? km : en;
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
    const scores = Object.fromEntries(quiz.results.map(result => [result.id, 0]));
    answers.forEach(answer => Object.entries(answer.scores).forEach(([id, points]) => { scores[id] += points; }));
    const winner = quiz.tiebreak.reduce((best, id) => scores[id] > scores[best] ? id : best, quiz.tiebreak[0]);
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
      if (friend) root.append(el('p', word(`Your friend got ${local(friend.name)} — what are you?`, `មិត្តរបស់អ្នកបាន ${local(friend.name)} — ចុះអ្នកវិញ?`)));
      root.append(el('h1', local(quiz.title)), el('p', local(quiz.intro)));
      button(word('Start', 'ចាប់ផ្ដើម'), () => { track('quiz_started'); step = 0; render(true); }, true);
    } else {
      const question = quiz.questions[step];
      root.append(el('p', `${step + 1} / ${quiz.questions.length}`));
      const progress = document.createElement('progress'); progress.max = quiz.questions.length; progress.value = step + 1;
      progress.setAttribute('aria-label', word('Progress', 'វឌ្ឍនភាព')); root.append(progress);
      root.append(el('h2', local(question.text)));
      question.answers.forEach(answer => button(local(answer.text), () => {
        answers[step] = answer;
        if (step + 1 === quiz.questions.length) finish();
        else { step++; render(true); }
      }));
      button(word('Back', 'ត្រឡប់ក្រោយ'), () => { step--; render(true); });
    }
    const heading = root.querySelector('h1,h2');
    if (focus && heading) { heading.tabIndex = -1; heading.focus(); }
  }
  onLangChange(() => render()); render();
}
