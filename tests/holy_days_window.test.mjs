// Asserts the exact Thngai Sil days in Research's 60-day window (17 Oct - 15 Dec 2026),
// including the 14th-waning holy day on 9 Nov 2026 (29-day month Assoch).
import {khmerDay} from '../site/js/lib/khmercal.js';
const expected = {'2026-10-19':'8-waxing','2026-10-26':'15-waxing','2026-11-03':'8-waning','2026-11-09':'last-waning',
  '2026-11-17':'8-waxing','2026-11-24':'15-waxing','2026-12-02':'8-waning','2026-12-09':'last-waning'};
let fail = 0, got = [];
for (let t = Date.UTC(2026, 9, 17); t <= Date.UTC(2026, 11, 15); t += 864e5) {
  const d = new Date(t), key = d.toISOString().slice(0, 10);
  const k = khmerDay({y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate()});
  if (k.isSil) got.push(key);
  if (!!expected[key] !== k.isSil || (k.isSil && expected[key] !== k.silKind)) { fail++; console.log('MISMATCH', key, k.isSil, k.silKind, expected[key]); }
}
const nov9 = khmerDay({y: 2026, m: 11, d: 9});
if (!(nov9.lunarDay === 14 && nov9.phase === 'waning' && nov9.isSil)) { fail++; console.log('9 Nov should be 14 waning holy day', nov9); }
console.log(`holy days in window: ${got.length} (expected 8) -> ${got.join(', ')}`);
if (fail || got.length !== 8) { console.log('FAIL'); process.exit(1); } else console.log('PASS: 8 holy days incl. 14-waning on 2026-11-09');
