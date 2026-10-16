import {getSource} from './source.js';
const config = window.ANALYTICS_CONFIG || {};
const blocked = config.provider !== 'goatcounter' || !/^[a-z0-9-]+$/i.test(config.goatcounterCode || '') ||
  location.protocol === 'file:' ||
  (!config.allowLocal && config.host && location.hostname !== config.host) || (!config.allowLocal && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) ||
  navigator.globalPrivacyControl || [navigator.doNotTrack, window.doNotTrack].some(v => v === '1' || v === 'yes');
let ready = false, started = false;
const queue = [];
function send(payload) {
  const source = getSource();
  payload.referrer = source ? `src:${source}` : document.referrer;
  if (blocked) return Promise.resolve();
  return new Promise(resolve => {
    const deliver = () => { try { window.goatcounter.count(payload); } finally { resolve(); } };
    if (ready) { deliver(); return; }
    queue.push(deliver);
    if (started) return;
    started = true;
    const script = document.createElement('script');
    script.dataset.goatcounter = `https://${config.goatcounterCode}.goatcounter.com/count`;
    script.dataset.goatcounterSettings = JSON.stringify({no_onload: true, allow_local: !!config.allowLocal});
    script.async = true;
    script.src = 'https://gc.zgo.at/count.js';
    script.onload = () => {
      if (!window.goatcounter?.count) return;
      ready = true;
      queue.splice(0).forEach(fn => fn());
    };
    script.onerror = () => { queue.length = 0; resolve(); };
    document.head.append(script);
  });
}
export function track(name, {channel} = {}) {
  return send({path: name + (channel ? '/' + channel : ''), title: name, event: true});
}
export function pageview(path = location.pathname) { return send({path}); }
document.addEventListener('click', event => {
  const target = event.target.closest?.('[data-track]');
  if (target) track(target.dataset.track);
});
