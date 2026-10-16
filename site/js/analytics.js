const config = window.ANALYTICS_CONFIG || {};
const blocked = config.provider !== 'goatcounter' || !config.goatcounterCode ||
  !/^[a-z0-9-]+$/i.test(config.goatcounterCode) || location.protocol === 'file:' ||
  ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || navigator.globalPrivacyControl ||
  (config.respectDNT !== false && [navigator.doNotTrack, window.doNotTrack].some(v => v === '1' || v === 'yes'));
let ready = false, started = false;
const queue = [];
function send(payload) {
  if (blocked) {
    if (config.debug) console.debug('[analytics disabled]', payload);
    return;
  }
  if (ready) window.goatcounter.count(payload);
  else {
    queue.push(payload);
    if (started) return;
    started = true;
    const script = document.createElement('script');
    script.dataset.goatcounter = `https://${config.goatcounterCode}.goatcounter.com/count`;
    script.dataset.goatcounterSettings = '{"no_onload":true}';
    script.async = true;
    script.src = '//gc.zgo.at/count.js';
    script.onload = () => {
      if (!window.goatcounter?.count) return;
      ready = true;
      queue.splice(0).forEach(item => window.goatcounter.count(item));
    };
    script.onerror = () => { queue.length = 0; };
    document.head.append(script);
  }
}
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
export function track(eventName, props) {
  const details = props ? Object.entries(props).map(([key, value]) => `${slug(key)}-${slug(value)}`).join('-') : '';
  send({path: `evt-${eventName}${details ? '-' + details : ''}`, title: eventName, event: true});
}
export function pageview(path = location.pathname) { send({path}); }
document.addEventListener('click', event => {
  const target = event.target.closest?.('[data-track]');
  if (target) track(target.dataset.track);
});
