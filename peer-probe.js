/* A bounded, data-only connection to the public Janus EchoTest demo. */
(() => {
'use strict';
const version = '20261010-7';
const endpoint = 'https://janus.conf.meetecho.com/janus';

async function run(context) {
  const { signal, cleanup, active, partial, requestJSON, randomID } = context;
  if (!window.RTCPeerConnection) { const error = new Error('浏览器不支持 WebRTC'); error.unsupported = true; throw error; }
  let session = null; let pc = null; let channel = null;
  const addresses = [];
  const remember = candidate => {
    if (!active()) return;
    const words = String(candidate.candidate || '').trim().split(/\s+/);
    const type = candidate.type || words[7] || 'unknown';
    const relatedIndex = words.indexOf('raddr');
    const values = [
      { ip: candidate.address || words[4], role: 'candidate' },
      { ip: candidate.relatedAddress || (relatedIndex >= 0 ? words[relatedIndex + 1] : null), role: 'related' },
    ];
    values.forEach(value => {
      if (typeof value.ip !== 'string' || !/^[0-9a-f:.]+$/i.test(value.ip)) return;
      const via = candidate.selected ? 'Janus / selected local candidate' : 'Janus / local ICE candidate';
      if (addresses.length < 128 && !addresses.some(x => x.ip === value.ip && x.role === value.role && x.type === type && x.via === via)) {
        addresses.push({ ...value, type, via, selected: !!candidate.selected, protocol: candidate.protocol || words[2] || null });
      }
    });
    partial(addresses, '保留本地 ICE 候选；尚未确认真实对端回声');
  };
  const release = () => {
    if (channel) { channel.onopen = channel.onmessage = channel.onerror = null; try { channel.close(); } catch (_) {} }
    if (pc) { pc.onicecandidate = null; try { pc.close(); } catch (_) {} }
    if (session !== null) {
      const closingSession = session; session = null;
      // The public demo expires abandoned sessions too. Never persist its IDs.
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000);
      fetch(`${endpoint}/${closingSession}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ janus: 'destroy', transaction: randomID() }), credentials: 'omit',
        referrerPolicy: 'no-referrer', keepalive: true, signal: controller.signal,
      }).catch(() => {}).finally(() => clearTimeout(timer));
    }
  };
  cleanup.push(release);
  const post = async (path, body) => {
    const transaction = randomID();
    const response = await fetch(endpoint + path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, transaction }), signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    const data = JSON.parse(await window.IPObservatoryProbes.readText(response));
    if (data.transaction !== transaction || data.janus === 'error') throw new Error('Janus 信令服务未接受请求');
    return data;
  };
  const created = await post('', { janus: 'create' });
  if (!created.data || !Number.isSafeInteger(created.data.id) || created.data.id <= 0) throw new Error('Janus 未返回有效会话');
  session = created.data.id;
  if (!active()) { release(); throw new Error('真实对端检测已停止'); }
  const attached = await post(`/${session}`, { janus: 'attach', plugin: 'janus.plugin.echotest' });
  if (!attached.data || !Number.isSafeInteger(attached.data.id) || attached.data.id <= 0) throw new Error('Janus EchoTest 不可用');
  if (!active()) throw new Error('真实对端检测已停止');
  const handle = attached.data.id;
  pc = new RTCPeerConnection({ iceServers: [
    { urls: 'stun:stun.chat.bilibili.com:3478' }, { urls: 'stun:stun.cloudflare.com:3478' },
  ], iceCandidatePoolSize: 0 });
  pc.onicecandidate = event => { if (event.candidate) remember(event.candidate); };
  channel = pc.createDataChannel('ip-observatory');
  const challenge = `ip-observatory:${randomID()}`;
  let echoReceived = false; let resolveEcho;
  const echoed = new Promise(resolve => { resolveEcho = resolve; });
  cleanup.push(() => resolveEcho());
  channel.onopen = () => { if (active()) { try { channel.send(challenge); } catch (_) {} } };
  channel.onmessage = event => {
    if (!active() || typeof event.data !== 'string' || event.data.length > 256) return;
    const message = event.data.trim();
    if (message !== challenge && message !== `Janus EchoTest here! You wrote: ${challenge}`) return;
    echoReceived = true; resolveEcho();
  };
  await pc.setLocalDescription(await pc.createOffer());
  if (pc.iceGatheringState !== 'complete') await new Promise(resolve => {
    const finish = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', changed); resolve(); };
    const changed = () => { if (pc.iceGatheringState === 'complete') finish(); };
    const timer = setTimeout(finish, 3500);
    pc.addEventListener('icegatheringstatechange', changed); cleanup.push(finish); changed();
  });
  if (!active()) throw new Error('真实对端检测已停止');
  const accept = async event => {
    if (event.sender && event.sender !== handle) return;
    if (event.janus === 'hangup' || event.janus === 'error' || event.plugindata && event.plugindata.data && event.plugindata.data.error) throw new Error('Janus 对端未接受数据通道');
    if (event.jsep && !pc.remoteDescription) {
      if (event.jsep.type !== 'answer' || typeof event.jsep.sdp !== 'string' || event.jsep.sdp.length > 65536) throw new Error('Janus 返回的协商信息无效');
      await pc.setRemoteDescription({ type: 'answer', sdp: event.jsep.sdp });
    }
  };
  const offerResult = await post(`/${session}/${handle}`, { janus: 'message', body: { audio: false, video: false, record: false },
    jsep: { type: pc.localDescription.type, sdp: pc.localDescription.sdp, trickle: false } });
  await accept(offerResult);
  while (active() && !pc.remoteDescription) {
    const events = await requestJSON(`${endpoint}/${session}?rid=${randomID()}&maxev=10`, signal);
    if (!active()) throw new Error('真实对端检测已停止');
    for (const event of Array.isArray(events) ? events : [events]) await accept(event);
  }
  await echoed;
  if (!active() || !echoReceived) throw new Error('未确认真实对端回声');
  if (typeof pc.getStats === 'function') {
    let timer;
    try {
      const stats = await Promise.race([pc.getStats(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Stats timeout')), 1000); })]);
      const selected = new Set();
      stats.forEach(stat => {
        if (stat.type === 'transport' && stat.selectedCandidatePairId) {
          const pair = stats.get(stat.selectedCandidatePairId); if (pair) selected.add(pair.localCandidateId);
        }
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated) selected.add(stat.localCandidateId);
      });
      stats.forEach(stat => { if (stat.type === 'local-candidate') remember({ address: stat.address || stat.ip, type: stat.candidateType, protocol: stat.protocol, selected: selected.has(stat.id) }); });
    } catch (_) { /* The verified data echo remains useful when statistics are hidden. */ }
    finally { clearTimeout(timer); }
  }
  return { status: addresses.length ? 'ok' : 'reachable', addresses, protocol: 'webrtc/sctp',
    detail: '真实 Janus 对端的数据回声已确认；显示本地候选及选中路径，不把远端服务器地址算作访客 IP' };
}
window.IPObservatoryPeer = Object.freeze({ version, run });
})();
