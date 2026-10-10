/* IP Observatory: browser-only observations, no application telemetry or storage. */
'use strict';

const sources = [
  { id: 'v4', name: 'ipify · IPv4', channel: 'HTTPS / IPv4', url: 'https://api.ipify.org?format=json', format: 'json' },
  { id: 'v6', name: 'ipify · IPv6', channel: 'HTTPS / IPv6', url: 'https://api6.ipify.org?format=json', format: 'json' },
  { id: 'dual', name: 'ipify · 自动选路', channel: 'HTTPS / DUAL STACK', url: 'https://api64.ipify.org?format=json', format: 'json' },
  { id: 'cf', name: 'Cloudflare', channel: 'HTTPS / TRACE', url: 'https://www.cloudflare.com/cdn-cgi/trace', format: 'trace' },
  { id: 'ican', name: 'icanhazip', channel: 'HTTPS / TEXT', url: 'https://icanhazip.com/', format: 'text' },
];
const stunSources = [
  { id: 'google', name: 'Google · STUN', channel: 'WEBRTC / ICE', url: 'stun:stun.l.google.com:19302' },
  { id: 'cloudflare', name: 'Cloudflare · STUN', channel: 'WEBRTC / ICE', url: 'stun:stun.cloudflare.com:3478' },
];
const byId = id => document.getElementById(id);
let results = [];
let rtcResults = [];
let busy = false;
let rtcBusy = false;
let measuredAt = null;

function normalizeIP(value) {
  if (typeof value !== 'string') return null;
  const ip = value.trim();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split('.').every(x => Number(x) <= 255 && String(Number(x)) === x) ? ip : null;
  }
  if (!ip.includes(':') || !/^[a-fA-F0-9:.]+$/.test(ip)) return null;
  try { return new URL(`http://[${ip}]/`).hostname.slice(1, -1).toLowerCase(); }
  catch (_) { return null; }
}

function addressScope(ip) {
  if (ip.includes(':')) {
    if (ip === '::' || ip === '::1' || /^(f[cd]|fe[89ab]|ff)/i.test(ip)) return 'local';
    // IPv4-mapped IPv6 candidates need the embedded address classification.
    if (ip.startsWith('::ffff:')) {
      const tail = ip.slice(7).split(':');
      if (tail.length === 2) {
        const n = tail.map(x => parseInt(x, 16));
        return addressScope(`${n[0] >> 8}.${n[0] & 255}.${n[1] >> 8}.${n[1] & 255}`);
      }
    }
    return 'public';
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ? 'local' : 'public';
}

function setText(id, value) { byId(id).textContent = value; }
function makeCell(value) { const td = document.createElement('td'); td.textContent = value; return td; }

function render() {
  const tbody = byId('source-rows');
  tbody.replaceChildren();
  [...results, ...rtcResults].forEach(result => {
    const row = document.createElement('tr');
    const name = makeCell(result.name);
    const channel = document.createElement('small'); channel.textContent = result.channel; name.append(channel);
    const addresses = result.addresses || [];
    const address = makeCell(addresses.length ? addresses.map(x => x.ip + (x.scope === 'local' ? '（本地/共享地址）' : '')).join(' · ') : (result.detail || '—'));
    const state = makeCell('');
    const badge = document.createElement('span'); badge.className = `status ${result.status}`;
    badge.textContent = { pending: '◌ 检测中', idle: '○ 未开始', ok: '● 已观测', error: '— 不可用' }[result.status];
    state.append(badge);
    row.append(name, address, state, makeCell(result.ms == null ? '—' : `${result.ms} ms`)); tbody.append(row);
  });
  const httpIPs = [...new Set(results.flatMap(x => (x.addresses || []).map(a => a.ip)))];
  const v4 = httpIPs.filter(ip => !ip.includes(':'));
  const v6 = httpIPs.filter(ip => ip.includes(':'));
  const primary = v4[0] || v6[0];
  setText('primary-ip', primary || (busy ? '正在寻找出口…' : '暂未获取地址'));
  setText('ipv4', v4.join(' · ') || (busy ? '检测中…' : '未观测到'));
  setText('ipv6', v6.join(' · ') || (busy ? '检测中…' : '未观测到'));
  byId('copy').disabled = !primary;
  byId('copy').dataset.ip = primary || '';
  const ok = results.filter(x => x.status === 'ok').length;
  setText('primary-note', primary ? `${ok} / ${sources.length} 个 HTTPS 来源已响应 · ${measuredAt.toLocaleTimeString('zh-CN', { hour12: false })} · 下表保留全部观察结果` : '连接失败可能来自断网、服务限制、浏览器拦截或 IPv6 不可用。可重试或运行扩展检测。');
  setText('run-status', busy || rtcBusy ? '检测进行中' : ok ? '本轮检测完成' : 'HTTPS 暂不可用');
  const rtcAddresses = [...new Set(rtcResults.flatMap(x => (x.addresses || []).filter(a => a.scope === 'public').map(a => a.ip)))];
  const rtcDone = rtcResults.some(x => x.status !== 'idle');
  setText('rtc-summary', rtcBusy ? '检测中…' : rtcAddresses.join(' · ') || (rtcDone ? '未观测到公网候选' : '待手动检测'));
  let comparison = busy ? '正在对照各来源的观测结果…' : !ok ? 'HTTPS 来源均未返回有效地址；这不表示你没有公网出口。' : v4.length > 1 || v6.length > 1 ? '同一地址族出现多个 HTTPS 出口，可能与网络分流、代理或路径变化有关。' : '已响应的 HTTPS 来源在同一地址族内结果一致；这不能排除 VPN 或代理。';
  if (!busy && !v6.length) comparison += ' 本轮没有观察到 IPv6，不能据此断定设备不支持 IPv6。';
  if (rtcAddresses.some(ip => !httpIPs.includes(ip))) comparison += ' WebRTC 观察到不同的公网候选地址；请结合网络配置判断，不能直接认定为原始 IP。';
  setText('comparison', comparison);
  byId('refresh').disabled = busy || rtcBusy;
  byId('rtc').disabled = busy || rtcBusy;
  byId('export').disabled = busy || rtcBusy || !measuredAt;
}

async function probeHTTP(source) {
  const result = results.find(x => x.id === source.id);
  const controller = new AbortController();
  const start = performance.now();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const url = new URL(source.url); url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url.href, { signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let value;
    if (source.format === 'json') value = (await response.json()).ip;
    else {
      const body = await response.text();
      value = source.format === 'trace' ? (body.match(/^ip=(.+)$/m) || [])[1] : body;
    }
    const ip = normalizeIP(value);
    if (!ip || addressScope(ip) !== 'public') throw new Error('返回值不是有效公网 IP');
    if (source.id === 'v4' && ip.includes(':') || source.id === 'v6' && !ip.includes(':')) throw new Error('地址族与检测通道不符');
    result.addresses = [{ ip, scope: 'public' }]; result.status = 'ok';
  } catch (error) {
    result.status = 'error';
    result.detail = error.name === 'AbortError' ? '超时（9 秒）' : error instanceof TypeError ? '网络 / CORS / 浏览器限制' : error.message;
  } finally { clearTimeout(timeout); result.ms = Math.round(performance.now() - start); render(); }
}

async function refresh() {
  if (busy || rtcBusy) return;
  busy = true; measuredAt = new Date();
  results = sources.map(x => ({ ...x, status: 'pending', addresses: [] }));
  rtcResults = stunSources.map(x => ({ ...x, status: 'idle', addresses: [], detail: '点击「扩展检测」开始' }));
  setText('notice', ''); render();
  await Promise.all(sources.map(probeHTTP));
  busy = false; render();
}

function probeSTUN(source) {
  const result = rtcResults.find(x => x.id === source.id);
  result.status = 'pending'; result.addresses = []; result.detail = '';
  if (!window.RTCPeerConnection) { result.status = 'error'; result.detail = '浏览器不支持 WebRTC'; return Promise.resolve(); }
  return new Promise(resolve => {
    const start = performance.now(); let pc; let done = false; let hidden = false;
    const finish = message => {
      if (done) return; done = true; clearTimeout(timer);
      if (pc) { pc.onicecandidate = null; pc.onicegatheringstatechange = null; pc.close(); }
      result.status = result.addresses.length ? 'ok' : 'error';
      result.detail = message || (hidden ? '候选地址受 mDNS 隐藏，未取得数字 IP' : '未取得候选 IP；可能受 UDP / 隐私设置限制');
      result.ms = Math.round(performance.now() - start); render(); resolve();
    };
    const timer = setTimeout(() => finish(), 10000);
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: source.url }], iceCandidatePoolSize: 0 });
      pc.onicecandidate = event => {
        if (!event.candidate) { finish(); return; }
        const candidate = event.candidate;
        const parts = candidate.candidate.trim().split(/\s+/);
        const raw = candidate.address || parts[4] || '';
        if (raw.endsWith('.local')) hidden = true;
        const ip = normalizeIP(raw);
        const type = candidate.type || parts[7] || 'unknown';
        if (ip && !result.addresses.some(x => x.ip === ip && x.type === type)) {
          result.addresses.push({ ip, type, scope: addressScope(ip) }); render();
        }
      };
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') finish(); };
      pc.createDataChannel('ip-observation');
      pc.createOffer().then(offer => { if (!done) return pc.setLocalDescription(offer); }).catch(() => finish('WebRTC 建连被阻止或失败'));
    } catch (_) { finish('WebRTC 初始化被阻止或失败'); }
  });
}

async function runRTC() {
  if (busy || rtcBusy) return;
  rtcBusy = true; render();
  await Promise.all(stunSources.map(probeSTUN));
  rtcBusy = false; render();
}

byId('refresh').addEventListener('click', refresh);
byId('rtc').addEventListener('click', runRTC);
byId('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(byId('copy').dataset.ip); setText('notice', '地址已复制。'); }
  catch (_) { setText('notice', '浏览器未允许复制，请选中地址手动复制。'); }
});
byId('export').addEventListener('click', () => {
  const report = { measuredAt: measuredAt.toISOString(), note: 'Observed network addresses; not proof of an underlying IP or VPN leak.', results: [...results, ...rtcResults].map(({ name, channel, status, addresses, ms, detail }) => ({ name, channel, status, addresses, ms, detail })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'ip-observation.json'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setText('notice', '报告已导出到你的设备，包含本次观察到的 IP 地址。');
});
refresh();
