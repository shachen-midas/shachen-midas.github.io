/* Runs only inside an opaque-origin, allow-scripts sandbox. */
(() => {
'use strict';
const params = new URLSearchParams(location.search);
const nonce = params.get('nonce'); const target = params.get('target');
const urls = { v4: 'https://api.ipify.org', v6: 'https://api6.ipify.org', dual: 'https://api64.ipify.org' };
if (window.parent === window || !/^[a-f0-9]{32}$/.test(nonce || '') || !Object.prototype.hasOwnProperty.call(urls, target)) return;
let done = false;
const report = data => {
  if (done) return; done = true;
  // No incoming messages or access to the parent's other observations.
  parent.postMessage({ type: 'ip-observatory-resource', version: '20261010-6', nonce, ...data }, '*');
};
window.ipObservatoryResponse = data => report({ ip: data && data.ip });
const script = document.createElement('script');
script.crossOrigin = 'anonymous';
script.referrerPolicy = 'no-referrer';
script.src = `${urls[target]}?format=jsonp&callback=ipObservatoryResponse&_=${nonce}`;
script.onerror = () => report({ error: true });
document.head.append(script);
setTimeout(() => report({ error: true }), 9000);
})();
