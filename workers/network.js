/* One fixed-purpose script for dedicated and temporary service workers. */
'use strict';
const VERSION = '20261010-9';
const ENDPOINTS = {
  ipify: 'https://api64.ipify.org?format=json',
  cloudflare: 'https://www.cloudflare.com/cdn-cgi/trace',
};
const serviceWorker = typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
const pending = new Map();
if (serviceWorker) self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));

async function observe(target, controllers) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 7000);
  controllers.add(controller);
  try {
    const url = new URL(ENDPOINTS[target]); url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url.href, { signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('查询源未响应');
    const text = await response.text();
    if (text.length > 16384) throw new Error('响应过大');
    const ip = target === 'ipify' ? JSON.parse(text).ip : (text.match(/^ip=(.+)$/m) || [])[1];
    return { ip, role: 'connection', via: `${serviceWorker ? 'Service Worker' : 'Worker'} / ${target}` };
  } finally { clearTimeout(timer); controllers.delete(controller); }
}

self.addEventListener('message', event => {
  const data = event.data;
  if (data && data.type === 'cancel' && pending.has(data.id)) {
    pending.get(data.id).forEach(controller => controller.abort()); return;
  }
  if (!data || data.type !== 'observe' || !Array.isArray(data.targets) || data.targets.length > 2 || !data.targets.every(x => Object.prototype.hasOwnProperty.call(ENDPOINTS, x))) return;
  const port = serviceWorker ? event.ports[0] : self;
  if (!port) return;
  const controllers = new Set(); if (data.id) pending.set(data.id, controllers);
  const task = Promise.allSettled(data.targets.map(target => observe(target, controllers))).then(results => {
    const addresses = results.filter(x => x.status === 'fulfilled').map(x => x.value);
    port.postMessage({ version: VERSION, addresses, partial: addresses.length < data.targets.length, error: addresses.length ? null : 'Worker 查询均不可用' });
    if (serviceWorker) port.close();
  }).catch(() => {}).finally(() => { if (data.id) pending.delete(data.id); });
  if (serviceWorker) event.waitUntil(task);
});
