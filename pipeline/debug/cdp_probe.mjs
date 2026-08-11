/**
 * cdp_probe.mjs — temporary headless-Chrome probe for pipeline/debug/smr_assembly.html
 *
 * Launches nothing itself; expects Chrome already running with --remote-debugging-port=9333
 * and the debug page open. Attaches via CDP, streams console/network events and polls the
 * HUD until the FRAME_RENDERED marker appears (or a timeout elapses). Real-time, no
 * virtual-time tricks. Requires Node >= 22 (global WebSocket).
 *
 * Usage: node pipeline/debug/cdp_probe.mjs [timeoutSeconds]
 */
const WS = new WebSocket(globalThis.WebSocket ? 'ws://x' : 'ws://x');
const pageTargetsUrl = 'http://localhost:9333/json/list';
const timeoutMs = (parseInt(process.argv[2] ?? '360', 10)) * 1000;

let target = null;
for (let i = 0; i < 20 && !target; i++) {
  try {
    const list = await (await fetch(pageTargetsUrl)).json();
    target = list.find((t) => t.type === 'page' && /smr_assembly/.test(t.url));
  } catch {
    /* chrome not ready yet */
  }
  if (!target) await new Promise((r) => setTimeout(r, 500));
}
if (!target) {
  console.error('PROBE: no smr_assembly page target found on port 9333');
  process.exit(1);
}
console.log(`PROBE: attached to ${target.url}`);

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = () => reject(new Error('ws connect failed'));
});
let msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    console.log(`  [console.${msg.params.type}] ${text}`);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    console.log(`  [EXCEPTION] ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description ?? ''}`);
  } else if (msg.method === 'Network.loadingFailed') {
    console.log(`  [NET-FAIL] ${msg.params.requestId} ${msg.params.errorText}`);
  } else if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (r.status >= 400) console.log(`  [NET-${r.status}] ${r.url}`);
  }
};

await send('Runtime.enable');
await send('Network.enable');

const start = Date.now();
let finalHud = '';
while (Date.now() - start < timeoutMs) {
  const { result } = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ marker: !!document.getElementById('status-marker'), hud: document.getElementById('hud')?.innerText ?? '' })`,
    returnByValue: true,
  });
  try {
    const state = JSON.parse(result.value);
    if (state.hud) finalHud = state.hud;
    if (state.marker) {
      console.log('PROBE: FRAME_RENDERED marker present — page completed.');
      console.log('--- final HUD ---');
      console.log(finalHud);
      process.exit(0);
    }
  } catch {
    /* page still booting */
  }
  await new Promise((r) => setTimeout(r, 2000));
}

console.log(`PROBE: TIMEOUT after ${timeoutMs / 1000}s — page did not reach FRAME_RENDERED.`);
console.log('--- last HUD ---');
console.log(finalHud || '(hud not populated)');
ws.close();
process.exit(2);
