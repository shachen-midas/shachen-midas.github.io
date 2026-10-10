/* Fixed public diagnostic endpoints. No account keys or visitor persistence. */
(() => {
'use strict';
const version = '20261010-6';
const sources = [
  { id: 'dns-edns', name: 'IP-API · DNS / ECS', channel: 'DNS / RANDOM NAME', kind: 'edns' },
  { id: 'dns-bash', name: 'bash.ws · DNS 多次采样', channel: 'DNS / FETCH + IMAGE + PREFETCH', kind: 'dns' },
  { id: 'xhr-dual', name: 'XHR · 双栈出口', channel: 'HTTPS / XHR', kind: 'xhr', url: 'https://api64.ipify.org?format=json', format: 'json' },
  { id: 'xhr-zxinc', name: 'XHR · 纯真查询', channel: 'HTTPS / XHR', kind: 'xhr', url: 'https://ip.zxinc.org/api.php?type=json', format: 'zxinc' },
  { id: 'script4', name: '脚本资源 · IPv4', channel: 'HTTPS / SANDBOXED JSONP', kind: 'script', target: 'v4', family: 4 },
  { id: 'script6', name: '脚本资源 · IPv6', channel: 'HTTPS / SANDBOXED JSONP', kind: 'script', target: 'v6', family: 6 },
  { id: 'script-dual', name: '脚本资源 · 双栈', channel: 'HTTPS / SANDBOXED JSONP', kind: 'script', target: 'dual' },
  { id: 'worker-dual', name: 'Worker · 双栈出口', channel: 'HTTPS / WORKER', kind: 'worker', target: 'ipify' },
  { id: 'worker-cf', name: 'Worker · Cloudflare', channel: 'HTTPS / WORKER', kind: 'worker', target: 'cloudflare' },
  { id: 'service-worker', name: 'Service Worker · 出口对照', channel: 'HTTPS / SERVICE WORKER', kind: 'service-worker' },
  { id: 'ws-echo', name: 'WebSocket.org · WSS', channel: 'WSS / ECHO', kind: 'websocket', url: 'wss://echo.websocket.org/' },
  { id: 'ws-netokay', name: 'NetOkay · WSS', channel: 'WSS / ECHO', kind: 'websocket', url: 'wss://netokay.net/v1/control/ws' },
  { id: 'wt-standard', name: 'WebTransport · UDP 443', channel: 'HTTP/3 / DATAGRAM', kind: 'webtransport', url: 'https://echo.semantic-ui.com/echo' },
  { id: 'wt-legacy', name: 'WebTransport · UDP 4438', channel: 'HTTP/3 / COMPATIBILITY', kind: 'webtransport', url: 'https://echo.semantic-ui.com:4438/echo' },
];

function randomID() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
}

async function readText(response, limit = 131072) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body || !response.body.getReader) {
    const text = await response.text();
    if (text.length > limit) throw new Error('响应超出读取上限');
    return text;
  }
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  let text = ''; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) throw new Error('响应超出读取上限');
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

async function requestJSON(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  return JSON.parse(await readText(response));
}

function missing(message) { const error = new Error(message); error.unsupported = true; return error; }

// Each operation owns a deadline, abort signal, and cleanup, including late replies.
function run(source, outerSignal) {
  return new Promise(resolve => {
    const controller = new AbortController(); const cleanup = [];
    let ended = false;
    const finish = value => {
      if (ended) return; ended = true;
      clearTimeout(timer); outerSignal.removeEventListener('abort', cancel);
      controller.abort(); cleanup.forEach(fn => { try { fn(); } catch (_) {} });
      resolve(value);
    };
    const cancel = () => finish({ status: 'cancelled', detail: '本轮已停止', addresses: [] });
    const timer = setTimeout(() => finish({ status: 'error', detail: '检测超时（15 秒）', addresses: [] }), 15000);
    outerSignal.addEventListener('abort', cancel, { once: true });
    if (outerSignal.aborted) { cancel(); return; }
    const context = { signal: controller.signal, cleanup, active: () => !ended };
    Promise.resolve().then(() => execute(source, context)).then(finish, error => finish({
      status: error.unsupported ? 'unsupported' : 'error', addresses: [],
      detail: error.name === 'AbortError' ? '检测已中止' : error instanceof TypeError ? '网络 / 跨域 / 浏览器限制' : error.message,
    }));
  });
}

async function execute(source, context) {
  const { signal, cleanup, active } = context;
  if (!active()) throw new Error('检测已中止');
  if (source.kind === 'edns') {
    const data = await requestJSON(`https://${randomID()}.edns.ip-api.com/json`, signal);
    const addresses = [];
    if (data.dns && data.dns.ip) addresses.push({ ip: data.dns.ip, role: 'dns', via: 'authoritative DNS observation' });
    if (data.edns && data.edns.ip) addresses.push({ ip: data.edns.ip, role: 'ecs', via: 'EDNS Client Subnet', prefix: null });
    return { status: 'ok', addresses, detail: data.edns ? '解析器及 ECS 网段线索；接口未提供前缀长度' : '已取得解析器地址；服务未报告 ECS' };
  }
  if (source.kind === 'dns') return dnsProbe(context);
  if (source.kind === 'xhr') return new Promise((resolve, reject) => {
    if (!window.XMLHttpRequest) { reject(missing('浏览器不支持 XMLHttpRequest')); return; }
    const xhr = new XMLHttpRequest();
    cleanup.push(() => { xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null; xhr.abort(); });
    const url = new URL(source.url); url.searchParams.set('_', randomID());
    xhr.open('GET', url.href); xhr.timeout = 9000; xhr.withCredentials = false;
    xhr.onload = () => {
      if (!active()) return;
      try {
        if (xhr.status < 200 || xhr.status >= 300) throw new Error(`HTTP ${xhr.status}`);
        if (xhr.responseText.length > 131072) throw new Error('响应超出读取上限');
        const data = JSON.parse(xhr.responseText);
        const ip = source.format === 'zxinc' ? data.data && data.data.myip : data.ip;
        resolve({ status: 'ok', addresses: [{ ip, role: 'connection', via: 'XMLHttpRequest' }], detail: '' });
      } catch (error) { reject(error); }
    };
    xhr.onerror = () => reject(new Error('XHR 网络或跨域限制'));
    xhr.ontimeout = () => reject(new Error('XHR 超时（9 秒）'));
    xhr.onabort = () => reject(new Error('XHR 已中止'));
    xhr.send();
  });
  if (source.kind === 'script') return new Promise((resolve, reject) => {
    const nonce = randomID(); const frame = document.createElement('iframe');
    frame.hidden = true; frame.title = 'IP 脚本资源检测'; frame.sandbox = 'allow-scripts'; frame.referrerPolicy = 'no-referrer';
    const handler = event => {
      if (!active() || event.source !== frame.contentWindow || event.origin !== 'null') return;
      const data = event.data;
      if (!data || data.type !== 'ip-observatory-resource' || data.nonce !== nonce || data.version !== version) return;
      if (data.error) { reject(new Error('脚本资源未返回地址')); return; }
      resolve({ status: 'ok', addresses: [{ ip: data.ip, role: 'connection', via: 'sandboxed script / iframe' }], detail: '脚本在独立沙箱内运行' });
    };
    window.addEventListener('message', handler);
    cleanup.push(() => { window.removeEventListener('message', handler); frame.remove(); });
    frame.src = `./resource-probe.html?v=${version}&target=${source.target}&nonce=${nonce}`;
    document.body.append(frame);
  });
  if (source.kind === 'worker') return new Promise((resolve, reject) => {
    if (!window.Worker) { reject(missing('浏览器不支持 Worker')); return; }
    const worker = new Worker(`./workers/network.js?v=${version}`);
    cleanup.push(() => worker.terminate());
    worker.onerror = () => reject(new Error('Worker 被浏览器阻止或执行失败'));
    worker.onmessage = event => {
      if (!active()) return;
      if (!event.data || event.data.version !== version) { reject(new Error('Worker 版本不一致')); return; }
      if (event.data.error) { reject(new Error(event.data.error)); return; }
      resolve({ status: 'ok', addresses: event.data.addresses, detail: '' });
    };
    worker.postMessage({ type: 'observe', targets: [source.target] });
  });
  if (source.kind === 'service-worker') return serviceWorkerProbe(context);
  if (source.kind === 'websocket') return new Promise((resolve, reject) => {
    if (!window.WebSocket) { reject(missing('浏览器不支持 WebSocket')); return; }
    const socket = new WebSocket(source.url); const message = `ip-observatory:${randomID()}`;
    cleanup.push(() => {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      try { socket.close(1000, 'Observation complete'); } catch (_) {}
    });
    socket.onopen = () => { try { socket.send(message); } catch (error) { reject(error); } };
    socket.onmessage = event => {
      if (event.data !== message) return; // A greeting/server hostname is not a client IP.
      resolve({ status: 'reachable', addresses: [], detail: 'WSS 回声成功；该公开服务不回传连接来源 IP', protocol: 'wss' });
    };
    socket.onerror = () => reject(new Error('WSS 连接不可用'));
    socket.onclose = () => reject(new Error('WSS 在回声完成前关闭'));
  });
  if (source.kind === 'webtransport') {
    if (!window.WebTransport) throw missing('当前浏览器不支持 WebTransport');
    const transport = new WebTransport(source.url, { requireUnreliable: true });
    transport.closed.catch(() => {});
    cleanup.push(() => { try { transport.close(); } catch (_) {} });
    await transport.ready;
    if (!active()) throw new Error('WebTransport 已中止');
    const datagrams = transport.datagrams;
    const writable = typeof datagrams.createWritable === 'function' ? datagrams.createWritable() : datagrams.writable;
    if (!writable) throw missing('浏览器未提供可用的数据报写入接口');
    const writer = writable.getWriter(); const reader = datagrams.readable.getReader();
    cleanup.push(() => { writer.abort().catch(() => {}); reader.cancel().catch(() => {}); });
    const message = `ip-observatory:${randomID()}`;
    await writer.write(new TextEncoder().encode(message));
    const reply = await reader.read();
    if (reply.done || new TextDecoder().decode(reply.value) !== message) throw new Error('WebTransport 未返回匹配的回声');
    return { status: 'reachable', addresses: [], protocol: 'h3', detail: 'QUIC 数据报回声成功；该公开服务不回传连接来源 IP' };
  }
  throw new Error('未知检测通道');
}

async function dnsProbe(context) {
  const { signal, cleanup, active } = context;
  const idResponse = await fetch(`https://bash.ws/id?_=${randomID()}`, { signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
  const id = (await readText(idResponse, 256)).trim();
  if (!/^[a-zA-Z0-9]{8,64}$/.test(id)) throw new Error('DNS 服务未返回有效的独立会话');
  if (!active()) throw new Error('DNS 检测已中止');
  const endpoints = Array.from({ length: 4 }, () => `https://${randomID().slice(0, 10)}.${id}.bash.ws/css/z.css`);
  // These names are owned by the public DNS test service. No LAN discovery.
  const image = new Image(); image.referrerPolicy = 'no-referrer';
  const hint = document.createElement('link'); hint.rel = 'dns-prefetch'; hint.href = new URL(endpoints[3]).origin;
  cleanup.push(() => { image.removeAttribute('src'); hint.remove(); });
  image.src = endpoints[2]; document.head.append(hint);
  const triggerController = new AbortController();
  const stopTriggers = () => triggerController.abort(); signal.addEventListener('abort', stopTriggers, { once: true });
  const triggerTimer = setTimeout(stopTriggers, 2500);
  cleanup.push(() => { clearTimeout(triggerTimer); stopTriggers(); signal.removeEventListener('abort', stopTriggers); });
  await Promise.all(endpoints.slice(0, 2).map(url => fetch(url, {
    mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: triggerController.signal,
  }).then(response => { if (response.body) response.body.cancel().catch(() => {}); }).catch(() => {})));
  await new Promise(resolve => { const timer = setTimeout(resolve, 1500); cleanup.push(() => { clearTimeout(timer); resolve(); }); });
  if (!active()) throw new Error('DNS 检测已中止');
  const records = await requestJSON(`https://bash.ws/dnsleak/test/${encodeURIComponent(id)}?json`, signal);
  if (!Array.isArray(records)) throw new Error('DNS 服务结果格式不匹配');
  const addresses = records.filter(x => x && (x.type === 'dns' || x.type === 'ip')).map(x => ({
    ip: x.ip, role: x.type === 'dns' ? 'dns' : 'connection', via: x.type === 'dns' ? 'authoritative DNS observation' : 'DNS service HTTPS connection',
  }));
  return { status: 'ok', addresses, detail: '4 个独立域名；解析器地址单独标注，预解析提示由浏览器决定是否执行' };
}

async function serviceWorkerProbe(context) {
  const { signal, cleanup, active } = context;
  if (!navigator.serviceWorker || !window.isSecureContext) throw missing('当前环境不支持 Service Worker 检测');
  const scope = new URL('./workers/', location.href).href;
  const scriptPath = new URL('./workers/network.js', location.href).pathname;
  const previous = await navigator.serviceWorker.getRegistration(scope);
  if (previous && previous.scope === scope && [previous.installing, previous.waiting, previous.active].some(worker => worker && new URL(worker.scriptURL).pathname !== scriptPath)) throw new Error('该作用域已有其他 Service Worker，已跳过');
  if (!active()) throw new Error('Service Worker 已中止');
  const registration = await navigator.serviceWorker.register(`./workers/network.js?v=${version}`, { scope: './workers/', updateViaCache: 'none' });
  // A registration may resolve after the overall deadline; remove it in either case.
  const unregister = () => registration.unregister().catch(() => {});
  if (!active()) { await unregister(); throw new Error('Service Worker 已中止'); }
  cleanup.push(unregister);
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) throw new Error('Service Worker 未能启动');
  if (worker.state !== 'activated') await new Promise((resolve, reject) => {
    const changed = () => {
      if (worker.state === 'activated') resolve();
      else if (worker.state === 'redundant') reject(new Error('Service Worker 启动失败'));
    };
    const abort = () => reject(new Error('Service Worker 已中止'));
    worker.addEventListener('statechange', changed); signal.addEventListener('abort', abort, { once: true });
    cleanup.push(() => { worker.removeEventListener('statechange', changed); signal.removeEventListener('abort', abort); });
    changed();
  });
  if (!active()) throw new Error('Service Worker 已中止');
  return new Promise((resolve, reject) => {
    const id = randomID(); const channel = new MessageChannel();
    cleanup.push(() => { try { worker.postMessage({ type: 'cancel', id }); } catch (_) {} channel.port1.close(); channel.port2.close(); });
    channel.port1.onmessage = event => {
      if (!active()) return;
      const data = event.data;
      if (!data || data.version !== version) { reject(new Error('Service Worker 版本不一致')); return; }
      if (data.error) { reject(new Error(data.error)); return; }
      resolve({ status: data.partial ? 'partial' : 'ok', addresses: data.addresses, detail: '临时独立作用域；检测结束后注销，不接管主页面或保存结果' });
    };
    worker.postMessage({ type: 'observe', id, targets: ['ipify', 'cloudflare'] }, [channel.port2]);
  });
}

window.IPObservatoryProbes = Object.freeze({ version, sources, run, readText });
})();
