/* Bounded foreground resampling; no persistent storage or background worker. */
(() => {
'use strict';
const version = '20261010-9';
function create({ available, collect, changed }) {
  let enabled = false; let timer = null; let until = 0; let lastRun = 0;
  let scheduled = []; let pending = ''; let periodic = 0; let events = 0;
  const state = () => ({ enabled, until, periodic, events, pending,
    paused: document.hidden || navigator.onLine === false });
  const notify = () => changed(state());
  function stop() {
    enabled = false; clearTimeout(timer); timer = null; pending = ''; scheduled = []; notify();
  }
  function wake() {
    clearTimeout(timer); timer = null;
    if (!enabled) return;
    const now = Date.now();
    if (now >= until || periodic >= 2 && events >= 3) { stop(); return; }
    if (document.hidden || navigator.onLine === false || !available()) {
      timer = setTimeout(wake, Math.min(2000, until - now)); notify(); return;
    }
    const due = scheduled.length && scheduled[0] <= now;
    if ((due || pending) && now - lastRun >= 15000) {
      const reason = pending || '定时补采';
      if (pending) { events++; pending = ''; }
      // One observation can cover a simultaneous timer and network event.
      if (due) { scheduled.shift(); periodic++; }
      lastRun = now;
      Promise.resolve().then(() => collect(reason)).catch(() => { stop(); }).finally(wake);
      notify(); return;
    }
    const next = due || pending ? Math.max(now + 100, lastRun + 15000) : scheduled[0] || until;
    timer = setTimeout(wake, Math.max(100, Math.min(next - now, until - now)));
    notify();
  }
  function start() {
    clearTimeout(timer); enabled = true; periodic = 0; events = 0; pending = ''; lastRun = Date.now();
    until = lastRun + 300000; scheduled = [lastRun + 30000, lastRun + 90000]; wake();
  }
  function networkChanged(reason) {
    if (!enabled || events >= 3 || Date.now() >= until) return;
    pending = reason; wake();
  }
  return Object.freeze({ start, stop, wake, networkChanged, state });
}
window.IPObservatorySampling = Object.freeze({ version, create });
})();
