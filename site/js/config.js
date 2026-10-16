// Replace placeholders before publishing; analytics is disabled by default.
window.ANALYTICS_CONFIG = {
  provider: 'none', // 'goatcounter' or 'none'
  goatcounterCode: '', // Site code, not a URL.
  respectDNT: true,
  allowLocal: false,
  debug: false
};
window.SITE_CONFIG = {
  name: 'Today in Khmer',
  module: 'today',
  siteUrl: 'https://example.github.io/REPO/',
  url: 'https://SITE_URL/',
  contentUrl: './data/content.json'
};
