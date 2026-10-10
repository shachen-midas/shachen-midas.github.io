/* First-party and embedded contexts via HTTPBin's documented HTML response API. */
(() => {
'use strict';
const version = '20261010-7';
const kinds = ['embedded', 'https', 'http'];

// This landing page returns results through a same-origin, ephemeral channel.
// Popup windows never receive an opener reference; nothing is put in storage.
if (location.pathname.endsWith('/context-probe.html')) {
  const fragment = location.hash.slice(1);
  history.replaceState(null, '', location.pathname + location.search);
  try {
    if (fragment.length > 8192) throw new Error('Invalid report');
    const data = JSON.parse(atob(fragment));
    if (data.version !== version || !/^[a-f0-9]{32}$/.test(data.nonce || '') || !kinds.includes(data.kind)) throw new Error('Invalid report');
    if (data.kind === 'embedded' && window.parent !== window) window.parent.postMessage(data, location.origin);
    else {
      const channel = new BroadcastChannel(`ip-observatory:${data.nonce}`);
      channel.postMessage(data);
      setTimeout(() => channel.close(), 250);
    }
    document.getElementById('context-status').textContent = '结果已返回原检测页面，可以关闭此页。';
    if (data.kind !== 'embedded') setTimeout(() => window.close(), 600);
  } catch (_) { document.getElementById('context-status').textContent = '本轮结果未能返回，请回到原页面重新对照。'; }
  return;
}

function remoteDiagnostic(config) {
  // This function is serialized into an intentionally generated diagnostic HTML response.
  const controller = new AbortController(); const timer = setTimeout(function () { controller.abort(); }, 8000);
  const output = { version: config.version, nonce: config.nonce, kind: config.kind,
    documentScheme: location.protocol, requestScheme: null, addresses: [] };
  function finish() {
    clearTimeout(timer);
    location.replace(config.returnURL + '#' + btoa(JSON.stringify(output)));
  }
  fetch('/ip', { signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP response unavailable');
      const url = new URL(response.url);
      if (url.hostname !== 'httpbin.org' || !['http:', 'https:'].includes(url.protocol)) throw new Error('Unexpected destination');
      output.requestScheme = url.protocol;
      return response.text();
    }).then(function (text) {
      if (text.length > 4096) throw new Error('Response too large');
      const data = JSON.parse(text);
      if (typeof data.origin !== 'string') throw new Error('No origin address');
      output.addresses = data.origin.split(',').slice(0, 16).map(function (ip) { return ip.trim(); });
      // Only ASCII address data is transferred in the URL fragment.
      if (output.addresses.some(function (ip) { return !/^[0-9a-fA-F:.]{2,45}$/.test(ip); })) throw new Error('Invalid address');
      finish();
    }).catch(function () { output.addresses = []; output.error = true; finish(); });
}

function run(source, context) {
  const { cleanup, active, randomID } = context;
  const kind = source.contextKind || 'embedded';
  if (!kinds.includes(kind)) throw new Error('未知页面对照方式');
  if (kind !== 'embedded' && !window.BroadcastChannel) { const error = new Error('当前浏览器不支持跨页面结果回传'); error.unsupported = true; throw error; }
  const nonce = randomID();
  const returnURL = new URL(`./context-probe.html?v=${version}`, location.href).href;
  const config = { nonce, version, kind, returnURL };
  const code = `(${remoteDiagnostic.toString()})(${JSON.stringify(config).replace(/</g, '\\u003c')});`;
  // HTTPBin supports a text/html body at /base64/. No other site's script is copied or injected.
  const html = '<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; connect-src \'self\' https://httpbin.org; base-uri \'none\'; form-action \'none\'">' +
    '<title>IP Observatory context comparison</title><p>Measuring this page context and returning the result...</p><script>' + code + '</script>';
  // The route accepts base64url; an encoded slash in ordinary Base64 produces a 404.
  const encoded = btoa(unescape(encodeURIComponent(html))).replace(/\+/g, '-').replace(/\//g, '_');
  const url = `${kind === 'http' ? 'http' : 'https'}://httpbin.org/base64/${encoded}`;
  return new Promise((resolve, reject) => {
    let frame = null;
    const accept = data => {
      if (!active()) return;
      if (!data || data.nonce !== nonce || data.version !== version || data.kind !== kind) return;
      if (data.error || !Array.isArray(data.addresses) || data.addresses.length > 16) { reject(new Error('对照页面未返回地址')); return; }
      if (!['http:', 'https:'].includes(data.documentScheme) || !['http:', 'https:'].includes(data.requestScheme)) { reject(new Error('对照页面未返回有效协议')); return; }
      const contextName = kind === 'embedded' ? '第三方 iframe 内同源请求' : '第一方页面内同源请求';
      const upgraded = kind === 'http' && (data.documentScheme !== 'http:' || data.requestScheme !== 'http:');
      resolve({ status: 'ok', addresses: data.addresses.map(ip => ({ ip, role: 'reported', header: 'origin', via: contextName })),
        context: { kind, requestedScheme: kind === 'http' ? 'http:' : 'https:', documentScheme: data.documentScheme, requestScheme: data.requestScheme },
        detail: `${contextName}；页面 ${data.documentScheme} / 查询 ${data.requestScheme}${upgraded ? '；HTTP 入口已升级或重定向，不计作明文 HTTP 观测' : ''}` });
    };
    const channel = kind !== 'embedded' ? new BroadcastChannel(`ip-observatory:${nonce}`) : null;
    if (channel) {
      cleanup.push(() => channel.close());
      channel.onmessage = event => { if (event.origin === location.origin) accept(event.data); };
    }
    const receive = event => { if (frame && event.source === frame.contentWindow && event.origin === location.origin) accept(event.data); };
    window.addEventListener('message', receive); cleanup.push(() => window.removeEventListener('message', receive));
    if (kind === 'embedded') {
      frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'HTTP 页面上下文对照';
      frame.sandbox = 'allow-scripts allow-same-origin'; frame.referrerPolicy = 'no-referrer'; frame.credentialless = true;
      cleanup.push(() => frame.remove()); frame.src = url; document.body.append(frame);
    } else {
      // Keep a control handle, then detach the opener before any third-party navigation.
      const popup = window.open('about:blank', '_blank');
      if (!popup) { reject(new Error('新窗口被拦截；请允许本站弹窗后重试')); return; }
      cleanup.push(() => { try { popup.close(); } catch (_) {} });
      try {
        popup.opener = null;
        const policy = popup.document.createElement('meta'); policy.name = 'referrer'; policy.content = 'no-referrer';
        popup.document.head.append(policy);
        popup.location.replace(url);
      } catch (_) { reject(new Error('无法启动第一方对照窗口')); }
    }
  });
}
window.IPObservatoryContext = Object.freeze({ version, run });
})();
