// Replace placeholders before publishing; analytics is disabled by default.
window.ANALYTICS_CONFIG = {
  provider: 'none', // 'goatcounter' or 'none'
  goatcounterCode: '', // Site code, not a URL.
  respectDNT: true,
  debug: false
};
window.SITE_CONFIG = {
  name: 'Seed',
  url: 'https://SITE_URL/',
  contentUrl: './data/content.json'
};
