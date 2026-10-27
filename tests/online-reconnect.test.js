/* 联网布阵阶段刷新/重连回归测试：node tests/online-reconnect.test.js */
'use strict';
const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 43000 + Math.floor(Math.random() * 1000);
const HTTP = 'http://127.0.0.1:' + PORT;
const WS_URL = 'ws://127.0.0.1:' + PORT + '/ws';

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function client() {
  const ws = new WebSocket(WS_URL);
  const queue = [];
  const waiters = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (waiters.length) waiters.shift()(msg);
    else queue.push(msg);
  });
  function next(ms = 6000) {
    return new Promise((resolve, reject) => {
      if (queue.length) return resolve(queue.shift());
      const timer = setTimeout(() => reject(new Error('WebSocket timeout')), ms);
      waiters.push((msg) => { clearTimeout(timer); resolve(msg); });
    });
  }
  async function type(name, ms = 6000) {
    for (let i = 0; i < 30; i++) {
      const msg = await next(ms);
      if (msg.type === name) return msg;
    }
    throw new Error('Missing message: ' + name);
  }
  return {
    ws,
    next,
    type,
    send: (obj) => ws.send(JSON.stringify(obj)),
    open: () => new Promise((resolve, reject) => {
      if (ws.readyState === 1) return resolve();
      ws.once('open', resolve);
      ws.once('error', reject);
    }),
    close: () => ws.close()
  };
}

function visibleUnit(state, id) {
  return state.units.find((u) => u.id === id);
}

async function waitHealth(ms = 10000) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    try {
      const res = await fetch(HTTP + '/health');
      if (res.ok) return;
    } catch (err) { /* retry */ }
    await sleep(150);
  }
  throw new Error('Server did not start');
}

(async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1' }),
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (buf) => { stderr += buf.toString(); });

  let a = null;
  let b = null;
  let a2 = null;
  try {
    await waitHealth();

    a = client();
    await a.open();
    await a.type('welcome');
    a.send({ type: 'create', name: 'Alice', lineup: ['trex', 'leso'] });
    const session = await a.type('session');
    await a.type('lobby');

    b = client();
    await b.open();
    await b.type('welcome');
    b.send({ type: 'join', code: session.code, name: 'Bob', lineup: ['trike', 'stego', 'anky'] });
    await b.type('session');
    await b.type('lobby');
    await a.type('lobby');

    a.send({ type: 'ready', ready: true });
    await a.type('lobby');
    await b.type('lobby');
    b.send({ type: 'ready', ready: true });
    await a.type('lobby');
    await b.type('lobby');

    const startedA = await a.type('started');
    await b.type('started');
    assert.strictEqual(startedA.state.phase, 'deploy');
    assert.ok(startedA.state.units.some((u) => u.team === 'blue' && !u.hidden));
    assert.ok(startedA.state.units.filter((u) => u.team === 'red').every((u) => u.hidden && u.x === -1 && u.y === -1));

    // 模拟布阵阶段刷新：旧 WebSocket 直接断开，不发送 leave。
    a.close();
    a = null;
    for (let i = 0; i < 20; i++) {
      const msg = await b.next();
      if (msg.type === 'presence' && msg.room.players.some((p) => p.team === 'blue' && !p.connected)) break;
    }

    // 新标签页/新连接用 token 恢复同一场布阵。
    a2 = client();
    await a2.open();
    await a2.type('welcome');
    a2.send({ type: 'reconnect', code: session.code, token: session.token });
    const resumedSession = await a2.type('session');
    const resumed = await a2.type('resume');
    assert.strictEqual(resumedSession.code, session.code);
    assert.strictEqual(resumed.state.phase, 'deploy');
    assert.ok(resumed.state.units.filter((u) => u.team === 'red').every((u) => u.hidden && u.x === -1));
    assert.ok(resumed.state.units.some((u) => u.team === 'blue' && !u.hidden));

    // 重连后仍可继续布阵，且对手仍然看不到真实坐标。
    const mine = resumed.state.units.find((u) => u.team === 'blue' && !u.hidden);
    a2.send({ type: 'action', action: { type: 'deployMove', unitId: mine.id, x: mine.x - 1, y: mine.y } });
    const moved = await a2.type('state');
    const opponentView = await b.type('state');
    assert.strictEqual(moved.state.units.find((u) => u.id === mine.id).x, mine.x - 1);
    assert.ok(opponentView.state.units.filter((u) => u.team === 'blue').every((u) => u.hidden && u.x === -1));

    console.log('  ok  布阵阶段刷新后重连并保持布局保密');
  } finally {
    if (a2) a2.close();
    if (b) b.close();
    if (a) a.close();
    child.kill();
    if (stderr && process.env.DEBUG_ONLINE_TEST) console.error(stderr);
  }
})().catch((err) => {
  console.error('FAIL 布阵阶段刷新后重连');
  console.error(err && err.stack || err);
  process.exitCode = 1;
});
