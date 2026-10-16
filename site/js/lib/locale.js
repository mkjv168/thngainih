// Calendar display helpers also run in the offline Node build and tests.
async function load(lang) {
  const url=new URL(`../../i18n/${lang}.json`,import.meta.url);
  if(typeof process!=='undefined' && process.versions?.node) {
    const {readFileSync}=await import('node:fs');return JSON.parse(readFileSync(url,'utf8'));
  }
  const response=await fetch(url);if(!response.ok)throw new Error('Translation unavailable');return response.json();
}
export const [en,km]=await Promise.all(['en','km'].map(load));
