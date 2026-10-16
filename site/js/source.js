const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
let source;
export function getSource() {
  if (source !== undefined) return source;
  const query = new URLSearchParams(location.search);
  source = '';
  for (const key of ['src', 's', 'utm_source', 'ref']) {
    const value = clean(query.get(key));
    if (value) { source = value; break; }
  }
  try {
    if (source) sessionStorage.setItem('source', source);
    else source = clean(sessionStorage.getItem('source'));
  } catch { /* Storage disabled: query still works. */ }
  return source;
}
