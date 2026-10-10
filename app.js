/* IP Observatory: browser-only observations, no application telemetry or storage. */
(() => {
'use strict';

const ASSET_VERSION = '20261010-7';

function showStartupFailure() {
  const setIfPresent = (id, text) => { const node = document.getElementById(id); if (node) node.textContent = text; };
  setIfPresent('run-status', '页面需要重新加载');
  setIfPresent('notice', '页面资源版本不一致或检测程序运行失败。请点击「重新加载页面」获取最新版本。');
  ['ipv4', 'ipv6', 'rtc-summary'].forEach(id => setIfPresent(id, '检测未完成'));
  const refreshButton = document.getElementById('refresh');
  if (refreshButton) {
    refreshButton.disabled = false;
    refreshButton.textContent = '重新加载页面 ↻';
    // Replace listeners from any partially completed initialization.
    const reloadButton = refreshButton.cloneNode(true);
    refreshButton.replaceWith(reloadButton);
    reloadButton.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('v', ASSET_VERSION);
      url.searchParams.set('reload', String(Date.now()));
      window.location.replace(url.href);
    });
  }
}

// A cached HTML document must never initialize an incompatible application.
if (document.documentElement.dataset.assetVersion !== ASSET_VERSION ||
    ![window.IPObservatoryProbes, window.IPObservatoryPeer, window.IPObservatoryContext].every(module => module && module.version === ASSET_VERSION)) {
  showStartupFailure();
  return;
}

const sources = [
  { id: 'v4', name: 'ipify · IPv4', channel: 'HTTPS / IPv4', url: 'https://api.ipify.org?format=json', format: 'json' },
  { id: 'v6', name: 'ipify · IPv6', channel: 'HTTPS / IPv6', url: 'https://api6.ipify.org?format=json', format: 'json' },
  { id: 'dual', name: 'ipify · 自动选路', channel: 'HTTPS / DUAL STACK', url: 'https://api64.ipify.org?format=json', format: 'json' },
  { id: 'cf', name: 'Cloudflare', channel: 'HTTPS / TRACE', url: 'https://www.cloudflare.com/cdn-cgi/trace', format: 'trace' },
  { id: 'ican', name: 'icanhazip', channel: 'HTTPS / TEXT', url: 'https://icanhazip.com/', format: 'text' },
  { id: 'ican4', name: 'icanhazip · IPv4', channel: 'HTTPS / IPv4', url: 'https://ipv4.icanhazip.com/', format: 'text', family: 4 },
  { id: 'ican6', name: 'icanhazip · IPv6', channel: 'HTTPS / IPv6', url: 'https://ipv6.icanhazip.com/', format: 'text', family: 6 },
  { id: 'aws', name: 'Amazon CheckIP', channel: 'HTTPS / TEXT', url: 'https://checkip.amazonaws.com/', format: 'text' },
  { id: 'literal4a', name: 'Cloudflare · IP 直访 A', channel: 'HTTPS / LITERAL IPv4', url: 'https://1.1.1.1/cdn-cgi/trace', format: 'trace', family: 4, direct: true },
  { id: 'literal4b', name: 'Cloudflare · IP 直访 B', channel: 'HTTPS / LITERAL IPv4', url: 'https://1.0.0.1/cdn-cgi/trace', format: 'trace', family: 4, direct: true },
  { id: 'literal6a', name: 'Cloudflare · IPv6 直访 A', channel: 'HTTPS / LITERAL IPv6', url: 'https://[2606:4700:4700::1111]/cdn-cgi/trace', format: 'trace', family: 6, direct: true },
  { id: 'literal6b', name: 'Cloudflare · IPv6 直访 B', channel: 'HTTPS / LITERAL IPv6', url: 'https://[2606:4700:4700::1001]/cdn-cgi/trace', format: 'trace', family: 6, direct: true },
  { id: 'bingo', name: 'HTTPBingo · 来源 / 转发头', channel: 'HTTPS / ECHO', url: 'https://httpbingo.org/get', format: 'echo' },
  { id: 'bin', name: 'HTTPBin · 来源链', channel: 'HTTPS / ECHO', url: 'https://httpbin.org/ip', format: 'echo' },
  { id: 'zxinc', name: '纯真 · HTTPS', channel: 'HTTPS / ZXINC', url: 'https://ip.zxinc.org/api.php?type=json', format: 'zxinc' },
  { id: 'ipsb', name: 'IP.SB · HTTPS', channel: 'HTTPS / TEXT', url: 'https://api.ip.sb/ip', format: 'text' },
  { id: 'netokay', name: 'NetOkay · 协议 / 出口', channel: 'HTTPS / PROTOCOL', url: 'https://netokay.net/v1/control/self', format: 'netokay' },
  { id: 'cf8443', name: 'Cloudflare · HTTPS 8443', channel: 'HTTPS / PORT 8443', url: 'https://www.cloudflare.com:8443/cdn-cgi/trace', format: 'trace' },
  { id: 'cf2087', name: 'Cloudflare · HTTPS 2087', channel: 'HTTPS / PORT 2087', url: 'https://www.cloudflare.com:2087/cdn-cgi/trace', format: 'trace' },
];
const stunSources = [
  { id: 'bilibili', name: 'Bilibili · STUN', channel: 'STUN / CN ROUTE', url: 'stun:stun.chat.bilibili.com:3478' },
  { id: 'hitv', name: '芒果 · STUN', channel: 'STUN / CN ROUTE', url: 'stun:stun.hitv.com:3478' },
  { id: 'miwifi', name: '小米 · STUN', channel: 'STUN / CN ROUTE', url: 'stun:stun.miwifi.com:3478' },
  { id: 'reference', name: 'IPPure 配置对照', channel: 'STUN / MIXED ROUTES', timeout: 3000, iceServers: [
    { urls: 'stun:stun.chat.bilibili.com:3478' },
    { urls: 'stun:stun.hitv.com:3478' },
    { urls: 'stun:stun.miwifi.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ] },
  { id: 'host', name: 'WebRTC · 本地接口', channel: 'ICE / HOST ONLY' },
  { id: 'google', name: 'Google · STUN', channel: 'WEBRTC / ICE', url: 'stun:stun.l.google.com:19302' },
  { id: 'cloudflare', name: 'Cloudflare · STUN', channel: 'WEBRTC / ICE', url: 'stun:stun.cloudflare.com:3478' },
  { id: 'cf53', name: 'Cloudflare · STUN 53', channel: 'STUN / UDP 53', url: 'stun:stun.cloudflare.com:53' },
  { id: 'google4', name: 'Google · STUN IPv4', channel: 'STUN / EXPLICIT IPv4', host: 'stun.l.google.com', port: 19302, family: 4 },
  { id: 'google6', name: 'Google · STUN IPv6', channel: 'STUN / EXPLICIT IPv6', host: 'stun.l.google.com', port: 19302, family: 6 },
  { id: 'cf4', name: 'Cloudflare · STUN IPv4', channel: 'STUN / EXPLICIT IPv4', host: 'stun.cloudflare.com', port: 3478, family: 4 },
  { id: 'cf6', name: 'Cloudflare · STUN IPv6', channel: 'STUN / EXPLICIT IPv6', host: 'stun.cloudflare.com', port: 3478, family: 6 },
  { id: 'media', name: 'WebRTC · 接收通道', channel: 'ICE / RECVONLY', url: 'stun:stun.l.google.com:19302', media: true },
  { id: 'bilibili4', name: 'Bilibili · STUN IPv4', channel: 'STUN / EXPLICIT IPv4', host: 'stun.chat.bilibili.com', port: 3478, family: 4 },
  { id: 'hitv4', name: '芒果 · STUN IPv4', channel: 'STUN / EXPLICIT IPv4', host: 'stun.hitv.com', port: 3478, family: 4 },
  { id: 'hitv6', name: '芒果 · STUN IPv6', channel: 'STUN / EXPLICIT IPv6', host: 'stun.hitv.com', port: 3478, family: 6 },
  { id: 'miwifi4', name: '小米 · STUN IPv4', channel: 'STUN / EXPLICIT IPv4', host: 'stun.miwifi.com', port: 3478, family: 4 },
  { id: 'turn-udp', name: 'Open Relay · TURN UDP', channel: 'TURN / UDP 80', turn: true, url: 'turn:staticauth.openrelay.metered.ca:80?transport=udp' },
  { id: 'turn-tcp', name: 'Open Relay · TURN TCP', channel: 'TURN / TCP 80', turn: true, url: 'turn:staticauth.openrelay.metered.ca:80?transport=tcp' },
  { id: 'turn-tls', name: 'Open Relay · TURN TLS', channel: 'TURN / TLS 443', turn: true, url: 'turns:staticauth.openrelay.metered.ca:443?transport=tcp' },
];
const networkSources = window.IPObservatoryProbes.sources;
const byId = id => document.getElementById(id);
let results = [];
let rtcResults = [];
let networkResults = [];
let busy = false;
let rtcBusy = false;
let networkBusy = false;
let contextBusy = false;
let runController = null;
let measuredAt = null;
const countries = new Map();
const countryQueue = [];
const countryControllers = new Set();
let countryWorkers = 0;

function countryFlag(code) {
  return Array.from(code, char => String.fromCodePoint(127397 + char.charCodeAt(0))).join('');
}

function countryInfo(ip) {
  if (ip === '0.0.0.0' || ip === '::') return { flag: '⚪', label: '占位地址，无国家' };
  if (addressScope(ip) !== 'public') return { flag: '🏠', label: '本地 / 共享 / 保留地址，无国家' };
  const entry = countries.get(ip);
  if (!entry || entry.status === 'pending') return { flag: '🌐', label: '国家查询中…' };
  if (!entry.code) return { flag: '🌐', label: '国家未知 / 查询不可用' };
  let label = entry.code;
  try { label = new Intl.DisplayNames(['zh-CN'], { type: 'region' }).of(entry.code); } catch (_) { /* Country code is a readable fallback. */ }
  return { flag: countryFlag(entry.code), label, code: entry.code };
}

function displayIP(ip) { const country = countryInfo(ip); return `${country.flag} ${ip}（${country.label}）`; }

function addressLabel(address) {
  if (address.role === 'dns') return 'DNS 解析器（非访客地址）';
  if (address.role === 'ecs') return 'ECS 网段线索（前缀长度未提供）';
  if (address.role === 'embedded') return `${address.encoding} 编码中的 IPv4（推导线索）`;
  if (address.role === 'connection') return '该连接观察到的出口';
  if (address.role === 'forwarded') return `${address.header} 转发头线索（未验证）`;
  if (address.role === 'reported') return '服务报告的来源链（未验证）';
  if (address.role === 'related') return `${address.type} 关联地址`;
  if (address.type === 'relay') return 'TURN 中继服务器（非访客地址）';
  if (address.type === 'srflx') return 'STUN 映射地址';
  if (address.type === 'prflx') return '对端反射候选地址';
  if (address.type === 'host') return '浏览器接口地址';
  return address.type || 'HTTPS 出口';
}

function allResults() { return [...results, ...rtcResults, ...networkResults]; }
function isClue(address) { return ['dns', 'ecs', 'embedded'].includes(address.role) || address.type === 'relay' && address.role !== 'related'; }
function running() { return busy || rtcBusy || networkBusy || contextBusy; }

function embeddedIPv4(ip) {
  if (!ip.includes(':')) return null;
  const halves = ip.split('::'); const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const parts = (halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left).map(x => parseInt(x, 16));
  if (parts.length !== 8) return null;
  let a; let b; let encoding;
  if (parts[0] === 0x2002) { a = parts[1]; b = parts[2]; encoding = '6to4 网关'; }
  else if (parts[0] === 0x2001 && parts[1] === 0) { a = (~parts[6]) & 0xffff; b = (~parts[7]) & 0xffff; encoding = 'Teredo 客户端映射'; }
  else if (parts.slice(0, 5).every(x => x === 0) && parts[5] === 0xffff) { a = parts[6]; b = parts[7]; encoding = 'IPv4-mapped IPv6'; }
  else return null;
  const value = `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  return { ip: value, scope: addressScope(value), role: 'embedded', via: 'IPv6 address encoding', encoding, derivedFrom: ip };
}

function allAddresses() {
  const unique = new Map();
  const add = (result, address) => {
    const group = isClue(address) ? 'clue' : 'connection';
    const key = `${group}:${address.role === 'ecs' ? 'ecs:' : ''}${address.ip}`;
    if (!unique.has(key)) unique.set(key, { ...address, group, sources: [], evidence: [] });
    const label = `${result.name} / ${addressLabel(address)}`;
    const entry = unique.get(key);
    if (!entry.sources.includes(label)) entry.sources.push(label);
    entry.evidence.push({ source: result.id, channel: result.channel, role: address.role || 'https', type: address.type || null, via: address.via || 'response', protocol: address.protocol || result.protocol || null, direct: !!result.direct, selected: !!address.selected, context: result.context || null, derivedFrom: address.derivedFrom || null, encoding: address.encoding || null });
  };
  allResults().forEach(result => (result.addresses || []).forEach(address => {
    add(result, address);
    if (!isClue(address) && !['forwarded', 'reported'].includes(address.role)) {
      const derived = embeddedIPv4(address.ip); if (derived) add(result, derived);
    }
  }));
  return [...unique.values()];
}

function scheduleCountries() {
  allAddresses().forEach(({ ip, scope }) => {
    if (scope !== 'public' || countries.has(ip)) return;
    countries.set(ip, { status: 'pending' }); countryQueue.push(ip);
  });
  while (countryWorkers < 3 && countryQueue.length) {
    countryWorkers++;
    lookupCountry(countryQueue.shift());
  }
}

async function lookupCountry(ip) {
  const controller = new AbortController();
  countryControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Country lookup unavailable');
    const data = await response.json();
    if (normalizeIP(data.ip) !== ip || !/^[A-Z]{2}$/.test(data.country || '') || ['XX', 'ZZ'].includes(data.country)) throw new Error('Unknown country');
    countries.set(ip, { status: 'ok', code: data.country });
  } catch (_) { countries.set(ip, { status: 'error' }); }
  finally {
    clearTimeout(timeout); countryControllers.delete(controller); countryWorkers--; scheduleCountries(); render();
  }
}

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
    if (ip === '::' || ip === '::1' || ip.startsWith('2001:db8:') || /^(f[cd]|fe[89ab]|ff)/i.test(ip)) return 'local';
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
  const [a, b, c] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) || (a === 198 && (b === 18 || b === 19)) ? 'local' : 'public';
}

function setText(id, value) { byId(id).textContent = value; }
function makeCell(value) { const td = document.createElement('td'); td.textContent = value; return td; }

function renderCards(node, entries, emptyText) {
  node.replaceChildren();
  if (!entries.length) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = emptyText; node.append(empty); }
  entries.forEach(entry => {
    const card = document.createElement('article'); card.className = 'address-card';
    const value = document.createElement('strong'); value.textContent = displayIP(entry.ip);
    const provenance = document.createElement('p'); provenance.textContent = entry.sources.join(' · ');
    const kinds = document.createElement('span'); kinds.className = 'evidence-tag';
    const labels = [];
    if (entry.evidence.some(x => x.direct)) labels.push('IP 直访');
    if (entry.evidence.some(x => x.type === 'srflx' && x.role !== 'related')) labels.push('STUN 映射');
    if (entry.evidence.some(x => x.type === 'host' && x.role !== 'related')) labels.push('接口候选');
    if (entry.evidence.some(x => x.type === 'relay' && x.role !== 'related')) labels.push('TURN 中继服务器');
    if (entry.evidence.some(x => x.role === 'related')) labels.push('关联地址');
    if (entry.evidence.some(x => x.role === 'forwarded')) labels.push('转发头线索');
    if (entry.evidence.some(x => x.role === 'reported')) labels.push('来源链线索');
    if (entry.evidence.some(x => x.role === 'dns')) labels.push('DNS 解析器 · 非访客地址');
    if (entry.evidence.some(x => x.role === 'ecs')) labels.push('ECS 网段 · 非完整客户端地址');
    if (entry.evidence.some(x => x.role === 'embedded')) labels.push('IPv6 编码推导 · 尚未独立观测');
    if (entry.evidence.some(x => x.role === 'connection')) labels.push('连接出口');
    if (entry.evidence.some(x => x.selected)) labels.push('真实对端选中路径');
    kinds.textContent = labels.join(' / ');
    card.append(value, kinds, provenance); node.append(card);
  });
}

function render() {
  const tbody = byId('source-rows');
  tbody.replaceChildren();
  allResults().forEach(result => {
    const row = document.createElement('tr');
    const name = makeCell(result.name);
    const channel = document.createElement('small'); channel.textContent = result.channel; name.append(channel);
    const addresses = result.addresses || [];
    const address = makeCell('');
    if (!addresses.length) address.textContent = result.detail || '—';
    addresses.forEach(x => {
      const line = document.createElement('div'); line.className = 'source-address';
      line.textContent = displayIP(x.ip);
      const type = document.createElement('small'); type.textContent = `${addressLabel(x)}${x.via ? ` / ${x.via}` : ''}`;
      line.append(type); address.append(line);
    });
    if (addresses.length && result.detail) { const detail = document.createElement('small'); detail.textContent = result.detail; address.append(detail); }
    if (result.protocol) { const protocol = document.createElement('small'); protocol.textContent = `实际协议：${result.protocol}`; address.append(protocol); }
    const state = makeCell('');
    const badge = document.createElement('span'); badge.className = `status ${result.status}`;
    badge.textContent = { queued: '○ 排队中', pending: '◌ 检测中', idle: '○ 未开始', ok: '● 已观测', partial: '◐ 部分结果', reachable: '◇ 可达 / 无 IP', unsupported: '— 不支持', cancelled: '— 已停止', error: '— 不可用' }[result.status];
    state.append(badge);
    row.append(name, address, state, makeCell(result.ms == null ? '—' : `${result.ms} ms`)); tbody.append(row);
  });
  const httpIPs = [...new Set(results.filter(x => x.format !== 'echo').flatMap(x => (x.addresses || []).filter(a => a.scope === 'public').map(a => a.ip)))];
  const v4 = httpIPs.filter(ip => !ip.includes(':'));
  const v6 = httpIPs.filter(ip => ip.includes(':'));
  setText('ipv4', v4.map(displayIP).join(' · ') || (busy ? '检测中…' : '未观测到'));
  setText('ipv6', v6.map(displayIP).join(' · ') || (busy ? '检测中…' : '未观测到'));
  const ok = results.filter(x => x.status === 'ok').length;
  const observedHTTP = results.filter(x => x.format !== 'echo' && x.status === 'ok').length;
  const observed = allAddresses();
  byId('copy').disabled = !observed.length;
  byId('copy').dataset.ips = [...new Set(observed.map(x => x.ip))].join('\n');
  const completed = allResults().filter(x => !['queued', 'pending', 'idle'].includes(x.status)).length;
  setText('observation-note', `${completed} / ${allResults().length} 项已结束 · ${ok} 个 HTTPS 来源已响应 · ${measuredAt.toLocaleTimeString('zh-CN', { hour12: false })} · 默认 ${sources.length + stunSources.length + networkSources.length} 项自动运行`);
  const geoPending = observed.some(x => countries.has(x.ip) && countries.get(x.ip).status === 'pending');
  setText('run-status', running() ? '全面检测中' : geoPending ? '国家查询中' : runController && runController.signal.aborted ? '本轮已停止' : observed.length ? '本轮检测完成' : '暂未取得地址');
  const connections = observed.filter(x => x.group === 'connection'); const clues = observed.filter(x => x.group === 'clue');
  setText('address-count', `${connections.length} 个连接地址 · 全部保留来源`);
  renderCards(byId('all-addresses'), connections, running() ? '正在收集各条连接的地址…' : '本轮未取得连接地址。');
  setText('network-address-count', `${clues.length} 条 DNS / ECS / 中继 / 编码线索`);
  renderCards(byId('network-addresses'), clues, running() ? '正在观察 DNS、中继及地址编码…' : '本轮未取得网络线索。');
  const peerResults = networkResults.filter(x => x.kind === 'peer');
  const rtcAddresses = [...new Set([...rtcResults, ...peerResults].flatMap(x => (x.addresses || []).filter(a => a.scope === 'public' && !isClue(a)).map(a => a.ip)))];
  const rtcDone = rtcResults.some(x => x.status !== 'idle');
  setText('rtc-summary', rtcAddresses.map(displayIP).join(' · ') || (rtcBusy || peerResults.some(x => ['queued', 'pending'].includes(x.status)) ? '检测中…' : rtcDone ? '未观测到公网候选' : '准备检测'));
  let comparison = busy ? '正在对照各来源的观测结果…' : !observedHTTP ? '常规 HTTPS 暂未返回可直接对照的出口地址。' : v4.length > 1 || v6.length > 1 ? '同一地址族出现多个 HTTPS 出口，可结合来源观察分流情况。' : '本轮已响应的常规 HTTPS 来源在同一地址族内结果一致。';
  if (!busy && !v6.length) comparison += ' 本轮未观察到 HTTPS IPv6 出口。';
  if (rtcAddresses.some(ip => !httpIPs.includes(ip))) comparison += ' WebRTC 还观察到了不同的公网候选地址。';
  setText('comparison', comparison);
  const baseline = [...new Set(results.filter(x => !x.direct && x.format !== 'echo').flatMap(x => (x.addresses || []).map(a => a.ip)))];
  const extras = connections.filter(entry => entry.scope === 'public' && !baseline.includes(entry.ip) && baseline.some(ip => ip.includes(':') === entry.ip.includes(':')) && entry.evidence.some(x => x.direct || x.role === 'connection' || (x.type === 'srflx' && x.role !== 'related')));
  setText('path-summary', extras.length ? `发现 ${extras.length} 个与常规 HTTPS 同地址族、但地址不同的出口：${extras.map(x => displayIP(x.ip)).join('；')}。来源见上方证据标签。` : running() ? '正在对照 HTTP、资源请求、后台请求与 ICE 路径…' : '本轮未发现与常规 HTTPS 同地址族的额外出口；其他地址线索均已保留。');
  const protocols = [...new Set(allResults().map(x => x.protocol).filter(Boolean))];
  const reachable = networkResults.filter(x => x.status === 'reachable').length;
  setText('protocol-summary', `已确认协议：${protocols.join(' / ') || (running() ? '等待响应' : '未观测到协议')}。${reachable ? ` ${reachable} 条回声通道已连通但未回传来源 IP。` : ''} HTTP/3 只在实际观测到 h3 时标记；不从服务名称推断。`);
  byId('refresh').disabled = running(); byId('stop').disabled = !running() && !geoPending;
  byId('export').disabled = running() || geoPending || !measuredAt;
  ['context-https', 'context-http'].forEach(id => { byId(id).disabled = contextBusy || !runController || runController.signal.aborted; });
  const contextRows = [results.find(x => x.id === 'bin'), ...networkResults.filter(x => x.kind === 'context')].filter(Boolean);
  setText('context-summary', contextRows.map(result => {
    const values = [...new Set(result.addresses.map(x => x.ip))].map(displayIP).join(' / ');
    return `${result.id === 'bin' ? '第三方 Fetch 基准' : result.name}：${values || (['queued', 'pending'].includes(result.status) ? '等待结果' : '未取得地址')}`;
  }).join('；') || '页面上下文对照准备中');
}

function httpProtocol(value) {
  const normalized = String(value || '').toLowerCase();
  return ({ 'http/3': 'h3', 'http/2': 'h2', 'http/2.0': 'h2', 'h3': 'h3', 'h2': 'h2', 'http/1.1': 'http/1.1', 'http/1.0': 'http/1.0' })[normalized] || null;
}

async function probeHTTP(source, signal) {
  const result = results.find(x => x.id === source.id);
  if (signal.aborted) { result.status = 'cancelled'; result.detail = '本轮已停止'; render(); return; }
  result.status = 'pending'; render();
  const controller = new AbortController();
  const cancel = () => controller.abort(); signal.addEventListener('abort', cancel, { once: true });
  const start = performance.now();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const url = new URL(source.url); url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url.href, { signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    const body = await window.IPObservatoryProbes.readText(response);
    const timing = performance.getEntriesByName ? performance.getEntriesByName(url.href).slice(-1)[0] : null;
    result.protocol = httpProtocol(timing && timing.nextHopProtocol);
    let value;
    if (['json', 'zxinc', 'netokay'].includes(source.format)) {
      const data = JSON.parse(body);
      value = source.format === 'zxinc' ? data.data && data.data.myip : source.format === 'netokay' ? data.client_ip : data.ip;
      if (source.format === 'netokay') result.protocol = httpProtocol(data.http_protocol) || result.protocol;
    }
    else if (source.format === 'echo') {
      const data = JSON.parse(body);
      const add = (raw, role, header) => {
        const ip = reportedIP(raw);
        if (ip && !result.addresses.some(x => x.ip === ip && x.role === role && x.header === header)) result.addresses.push({ ip, scope: addressScope(ip), role, header });
      };
      if (typeof data.origin === 'string') data.origin.split(',').forEach(raw => add(raw, 'reported', 'origin'));
      Object.entries(data.headers || {}).forEach(([key, values]) => {
        const header = key.toLowerCase();
        if (!['forwarded', 'x-forwarded-for', 'x-real-ip', 'true-client-ip', 'cf-connecting-ip', 'x-client-ip'].includes(header)) return;
        (Array.isArray(values) ? values : [values]).forEach(value => {
          if (typeof value !== 'string') return;
          if (header === 'forwarded') {
            for (const match of value.matchAll(/(?:^|[;,])\s*for=("[^"]*"|[^;,\s]+)/gi)) add(match[1], 'forwarded', header);
          } else value.split(',').forEach(raw => add(raw, 'forwarded', header));
        });
      });
      if (!result.addresses.length) throw new Error('未返回有效地址线索');
      result.status = 'ok'; scheduleCountries(); return;
    }
    else {
      value = source.format === 'trace' ? (body.match(/^ip=(.+)$/m) || [])[1] : body;
      if (source.format === 'trace') result.protocol = httpProtocol((body.match(/^http=(.+)$/m) || [])[1]) || result.protocol;
    }
    const ip = normalizeIP(value);
    if (!ip || addressScope(ip) !== 'public') throw new Error('返回值不是有效公网 IP');
    const family = source.family || (source.id === 'v4' ? 4 : source.id === 'v6' ? 6 : null);
    if (family === 4 && ip.includes(':') || family === 6 && !ip.includes(':')) throw new Error('地址族与检测通道不符');
    result.addresses = [{ ip, scope: 'public' }]; result.status = 'ok'; scheduleCountries();
  } catch (error) {
    result.status = signal.aborted ? 'cancelled' : 'error';
    result.detail = signal.aborted ? '本轮已停止' : error.name === 'AbortError' ? '超时（9 秒）' : error instanceof TypeError ? '网络 / CORS / 浏览器限制' : error.message;
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); result.ms = Math.round(performance.now() - start); render(); }
}

function reportedIP(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().replace(/^"|"$/g, '');
  return normalizeIP(value) || normalizeIP((value.match(/^\[([^\]]+)\](?::\d+)?$/) || [])[1]) || normalizeIP((value.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/) || [])[1]);
}

async function runLimited(items, task, concurrency) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) await task(items[next++]);
  }));
}

async function refresh() {
  if (running()) return;
  busy = true; rtcBusy = true; networkBusy = true; measuredAt = new Date();
  runController = new AbortController(); const signal = runController.signal;
  countries.forEach((entry, ip) => { if (entry.status === 'error') countries.delete(ip); });
  results = sources.map(x => ({ ...x, status: 'queued', addresses: [] }));
  rtcResults = stunSources.map(x => ({ ...x, status: 'queued', addresses: [] }));
  networkResults = networkSources.map(x => ({ ...x, status: 'queued', addresses: [] }));
  setText('notice', ''); render();
  await Promise.all([
    runLimited(sources, source => probeHTTP(source, signal), 4).finally(() => { busy = false; render(); }),
    runLimited(stunSources, source => probeSTUN(source, signal), 4).finally(() => { rtcBusy = false; render(); }),
    runLimited(networkSources, source => probeNetwork(source, signal), 2).finally(() => { networkBusy = false; render(); }),
  ]);
}

async function probeNetwork(source, signal) {
  const result = networkResults.find(x => x.id === source.id);
  if (signal.aborted) { result.status = 'cancelled'; result.detail = '本轮已停止'; render(); return; }
  const start = performance.now(); result.status = 'pending'; render();
  try {
    const observed = await window.IPObservatoryProbes.run(source, signal);
    result.detail = observed.detail || ''; result.protocol = observed.protocol || null;
    result.context = observed.context || null;
    const seen = new Set();
    result.addresses = (observed.addresses || []).flatMap(address => {
      const ip = normalizeIP(address.ip); if (!ip) return [];
      if (source.family && ip.includes(':') !== (source.family === 6)) return [];
      const key = `${address.role}:${address.via}:${ip}`; if (seen.has(key)) return []; seen.add(key);
      return [{ ...address, ip, scope: addressScope(ip) }];
    });
    result.status = observed.status;
    if (['ok', 'partial'].includes(result.status) && !result.addresses.length) {
      result.status = 'error'; result.detail = '服务未返回有效地址线索';
    }
    scheduleCountries();
  } catch (_) { result.status = 'error'; result.detail = '该检测路径执行失败'; }
  finally { result.ms = Math.round(performance.now() - start); render(); }
}

function collectCandidate(result, candidate, via = 'ICE event') {
  const parts = (candidate.candidate || '').trim().split(/\s+/);
  const type = candidate.type || parts[7] || 'unknown';
  const relatedIndex = parts.indexOf('raddr', 8);
  const values = [
    { value: candidate.address, role: 'candidate' },
    { value: parts[4], role: 'candidate' },
    { value: candidate.relatedAddress, role: 'related' },
    { value: relatedIndex >= 0 ? parts[relatedIndex + 1] : null, role: 'related' },
  ];
  values.forEach(({ value, role }) => {
    const ip = normalizeIP(value);
    if (ip && !result.addresses.some(x => x.ip === ip && x.type === type && x.role === role && x.via === via)) {
      result.addresses.push({ ip, type, role, via, protocol: candidate.protocol || parts[2] || null, scope: addressScope(ip) });
    }
  });
  scheduleCountries();
  return values.some(x => typeof x.value === 'string' && x.value.endsWith('.local'));
}

async function publicTurnServer(url) {
  if (!crypto.subtle) throw new Error('Web Crypto 不可用');
  // This is the provider's intentionally public demo shared secret, not an account key.
  // https://www.metered.ca/tools/openrelay/#static-auth
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('openrelayprojectsecret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const username = `${Math.floor(Date.now() / 1000) + 600}:ip-observatory`;
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(username));
  return { urls: url, username, credential: btoa(String.fromCharCode(...new Uint8Array(signed))) };
}

async function probeSTUN(source, signal) {
  const result = rtcResults.find(x => x.id === source.id);
  if (signal.aborted) { result.status = 'cancelled'; result.detail = '本轮已停止'; render(); return; }
  const start = performance.now();
  result.status = 'pending'; result.addresses = []; result.detail = '';
  render();
  if (!window.RTCPeerConnection) { result.status = 'error'; result.detail = '浏览器不支持 WebRTC'; result.ms = Math.round(performance.now() - start); render(); return; }
  let urls = source.url ? [source.url] : [];
  let iceServers = source.iceServers;
  if (source.turn) {
    let timer;
    try {
      iceServers = [await Promise.race([publicTurnServer(source.url), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('TURN 凭据生成超时')), 2000); })])];
    } catch (_) { result.status = signal.aborted ? 'cancelled' : 'error'; result.detail = signal.aborted ? '本轮已停止' : '无法生成公开 TURN 服务的临时凭据'; result.ms = Math.round(performance.now() - start); render(); return; }
    finally { clearTimeout(timer); }
  }
  if (source.host) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5000);
    const cancel = () => controller.abort(); signal.addEventListener('abort', cancel, { once: true });
    try {
      result.detail = `准备 IPv${source.family} STUN 目标`; render();
      const type = source.family === 6 ? 28 : 1;
      const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(source.host)}&type=${type}`, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('STUN 地址解析失败');
      const data = await response.json();
      // These are public STUN service endpoints, never visitor observations.
      const endpoints = [...new Set((data.Answer || []).filter(x => x.type === type).map(x => normalizeIP(x.data)).filter(ip => ip && addressScope(ip) === 'public' && ip.includes(':') === (source.family === 6)))];
      if (!endpoints.length) throw new Error(`未解析到 IPv${source.family} STUN 目标`);
      urls = endpoints.map(ip => `stun:${source.family === 6 ? `[${ip}]` : ip}:${source.port}`);
    } catch (_) { result.status = signal.aborted ? 'cancelled' : 'error'; result.detail = signal.aborted ? '本轮已停止' : `IPv${source.family} STUN 目标解析不可用`; result.ms = Math.round(performance.now() - start); render(); return; }
    finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); }
  }
  if (signal.aborted) { result.status = 'cancelled'; result.detail = '本轮已停止'; result.ms = Math.round(performance.now() - start); render(); return; }
  return new Promise(resolve => {
    let pc; let done = false; let hidden = false; let finishing = false;
    const finish = async message => {
      if (done || finishing) return; finishing = true; clearTimeout(timer);
      let statsTimer;
      const notes = [];
      try { if (pc && !signal.aborted) {
        // Also inspect the final local SDP so candidate event timing cannot omit addresses.
        try {
          const sdp = pc.localDescription ? pc.localDescription.sdp || '' : '';
          sdp.split(/\r?\n/).filter(line => line.startsWith('a=candidate:')).forEach(line => {
            hidden = collectCandidate(result, { candidate: line.slice(2) }, 'SDP') || hidden;
          });
        } catch (_) { notes.push('SDP 读取不可用'); }
        try {
          const transports = new Set();
          if (pc.sctp && pc.sctp.transport) transports.add(pc.sctp.transport.iceTransport);
          if (typeof pc.getTransceivers === 'function') pc.getTransceivers().forEach(t => {
            [t.sender, t.receiver].forEach(endpoint => { if (endpoint && endpoint.transport) transports.add(endpoint.transport.iceTransport); });
          });
          transports.forEach(transport => {
            try { if (transport && typeof transport.getLocalCandidates === 'function') transport.getLocalCandidates().forEach(candidate => { hidden = collectCandidate(result, candidate, 'ICE transport') || hidden; }); }
            catch (_) { notes.push('部分传输候选不可用'); }
          });
        } catch (_) { notes.push('传输接口不可用'); }
        try { if (typeof pc.getStats === 'function') {
          const stats = await Promise.race([pc.getStats(), new Promise(resolveStats => { statsTimer = setTimeout(() => resolveStats(null), 1000); })]);
          if (stats && !signal.aborted) stats.forEach(stat => {
            if (stat.type !== 'local-candidate') return;
            hidden = collectCandidate(result, { address: stat.address || stat.ip, type: stat.candidateType, protocol: stat.protocol }, 'getStats') || hidden;
          });
          else notes.push('连接统计读取超时');
        } } catch (_) { notes.push('连接统计不可用'); }
      } }
      finally {
        clearTimeout(statsTimer); signal.removeEventListener('abort', cancel); done = true;
        if (pc) { pc.onicecandidate = null; pc.onicegatheringstatechange = null; pc.onicecandidateerror = null; try { pc.close(); } catch (_) { /* Already closed. */ } }
      }
      result.status = result.addresses.length ? 'ok' : 'error';
      result.detail = [message || (result.addresses.length ? (hidden ? '部分候选地址受 mDNS 隐藏' : '') : hidden ? '候选地址受 mDNS 隐藏，未取得数字 IP' : '未取得候选 IP；可能受 UDP / 隐私设置限制'), ...notes].filter(Boolean).join('；');
      if (source.turn) {
        const allocated = result.addresses.some(x => x.type === 'relay' && x.role !== 'related');
        result.status = allocated ? 'ok' : result.addresses.length ? 'partial' : 'error';
        result.detail = [allocated ? 'TURN 已分配中继；中继地址单独展示' : '未确认 TURN 分配；保留已取得的其他候选', ...notes].join('；');
      }
      if (signal.aborted) { result.status = 'cancelled'; result.detail = '本轮已停止；保留已观测结果'; }
      result.ms = Math.round(performance.now() - start);
      try { render(); } finally { resolve(); }
    };
    const cancel = () => finish('本轮已停止');
    const timer = setTimeout(() => finish(), source.timeout || 10000);
    signal.addEventListener('abort', cancel, { once: true });
    try {
      pc = new RTCPeerConnection({ iceServers: iceServers || (urls.length ? [{ urls }] : []), iceCandidatePoolSize: 0, iceTransportPolicy: 'all' });
      pc.onicecandidate = event => {
        if (!event.candidate) { finish(); return; }
        if (!done && !finishing && !signal.aborted) { hidden = collectCandidate(result, event.candidate) || hidden; render(); }
      };
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') finish(); };
      pc.createDataChannel('ip-observation');
      if (source.media && typeof pc.addTransceiver === 'function') {
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
      }
      pc.createOffer().then(offer => { if (!done && !finishing && !signal.aborted) return pc.setLocalDescription(offer); }).catch(() => finish('WebRTC 建连被阻止或失败'));
    } catch (_) { finish('WebRTC 初始化被阻止或失败'); }
  });
}

try {
byId('refresh').addEventListener('click', () => refresh().catch(showStartupFailure));
['https', 'http'].forEach(kind => byId(`context-${kind}`).addEventListener('click', () => {
  if (contextBusy || !runController || runController.signal.aborted) return;
  contextBusy = true;
  const source = { id: `context-${kind}`, name: `HTTPBin · ${kind.toUpperCase()} 第一方对照`,
    channel: 'TOP-LEVEL / USER NAVIGATION', kind: 'context', contextKind: kind, timeout: 30000, manual: true };
  const previous = networkResults.findIndex(result => result.id === source.id);
  const result = { ...source, status: 'queued', addresses: [] };
  if (previous >= 0) networkResults[previous] = result; else networkResults.push(result);
  setText('notice', '已请求打开第一方诊断页；结果将自动回传。若浏览器拦截新窗口，请允许此站点弹窗后重试。');
  probeNetwork(source, runController.signal).finally(() => { contextBusy = false; render(); }).catch(showStartupFailure);
}));
byId('stop').addEventListener('click', () => {
  if (runController) runController.abort();
  countryQueue.length = 0;
  countries.forEach((value, ip) => { if (value.status === 'pending') countries.set(ip, { status: 'error' }); });
  countryControllers.forEach(controller => controller.abort());
  setText('notice', '已停止本轮检测，保留已返回的结果。'); render();
});
window.addEventListener('pagehide', () => {
  if (runController) runController.abort();
  countryQueue.length = 0;
  countries.forEach((value, ip) => { if (value.status === 'pending') countries.set(ip, { status: 'error' }); });
  countryControllers.forEach(controller => controller.abort());
});
byId('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(byId('copy').dataset.ips); setText('notice', '全部观测地址已复制，包含解析器 / 网段 / 中继线索；类别见页面和报告。'); }
  catch (_) { setText('notice', '浏览器未允许复制，请选中地址手动复制。'); }
});
byId('export').addEventListener('click', () => {
  const report = { schemaVersion: 2, assetVersion: ASSET_VERSION, measuredAt: measuredAt.toISOString(), note: 'Connection observations, DNS resolvers, ECS network hints and relay servers have separate roles. Reachable echo services do not report a client IP. Countries are IP database assignments.', addresses: allAddresses().map(address => ({ ...address, country: countryInfo(address.ip) })), results: allResults().map(({ id, name, channel, status, addresses, ms, detail, protocol, context, manual }) => ({ id, name, channel, status, addresses: addresses.map(address => ({ ...address, country: countryInfo(address.ip) })), ms, detail, protocol, context, manual: !!manual })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'ip-observation.json'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setText('notice', '报告已导出到你的设备，包含本次观察到的 IP 地址。');
});
refresh().catch(showStartupFailure);
} catch (_) { showStartupFailure(); }
})();
