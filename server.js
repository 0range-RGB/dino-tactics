/* =========================================================
   白垩纪战术 · 静态站点 + 联网对战服务器
   运行：node server.js   → http://127.0.0.1:4173
   WebSocket：/ws
   ========================================================= */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const Engine = require('./engine.js');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_ROOMS = 500;
const ROOM_TTL = 2 * 60 * 60 * 1000;
const DISCONNECT_FORFEIT_MS = 90 * 1000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const rooms = new Map();

function send(ws, payload) {
  if (!ws || ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(payload)); } catch (err) { /* ignore */ }
}

function sendError(ws, message) {
  send(ws, { type: 'error', message: message });
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) code += chars[bytes[i] % chars.length];
    if (!rooms.has(code)) return code;
  }
  return 'R' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

function cleanName(value) {
  const name = String(value || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 12);
  return name || '无名驯龙师';
}

function cleanText(value, max) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max || 120);
}

function normalizeLineup(lineup) {
  if (!Array.isArray(lineup) || lineup.length < 1 || lineup.length > 6) return null;
  let capacity = 0;
  const out = [];
  for (const type of lineup) {
    const def = Engine.SPECIES[type];
    if (!def) return null;
    capacity += def.size;
    if (capacity > Engine.TEAM_CAPACITY) return null;
    out.push(type);
  }
  return out;
}

function capacityOfLineup(lineup) {
  return (lineup || []).reduce((sum, type) => sum + (Engine.SPECIES[type] ? Engine.SPECIES[type].size : 0), 0);
}

function defaultLineup(team) {
  return team === 'blue'
    ? ['trike', 'stego', 'anky']
    : ['trex', 'leso'];
}

function publicRoom(room, forTeam) {
  const playerView = (team) => {
    const p = room.players[team];
    if (!p) return { team, empty: true, name: '', ready: false, connected: false, lineup: [], capacity: 0 };
    return {
      team,
      empty: false,
      name: p.name,
      ready: !!p.ready,
      connected: !!p.connected,
      lineup: p.lineup.slice(),
      capacity: capacityOfLineup(p.lineup)
    };
  };
  const blue = playerView('blue');
  const red = playerView('red');
  return {
    code: room.code,
    phase: room.phase,
    players: [blue, red],
    youAre: forTeam || null,
    deployReady: {
      blue: !!(room.deployReady && room.deployReady.blue),
      red: !!(room.deployReady && room.deployReady.red)
    },
    canStart: room.phase === 'lobby' && !blue.empty && !red.empty && blue.ready && red.ready && blue.connected && red.connected
  };
}

function broadcastLobby(room) {
  for (const team of ['blue', 'red']) {
    const p = room.players[team];
    if (p && p.ws) send(p.ws, { type: 'lobby', room: publicRoom(room, team), yourTeam: team });
  }
}

function broadcastPresence(room) {
  for (const team of ['blue', 'red']) {
    const p = room.players[team];
    if (p && p.ws) send(p.ws, { type: 'presence', room: publicRoom(room, team) });
  }
}

function broadcastState(room, events, actorTeam) {
  const payloadBase = {
    type: 'state',
    state: room.game.snapshot(),
    events: events || [],
    room: publicRoom(room, null),
    version: room.version,
    actor: actorTeam,
    phase: room.phase
  };
  for (const team of ['blue', 'red']) {
    const p = room.players[team];
    if (!p || !p.ws) continue;
    send(p.ws, Object.assign({}, payloadBase, { yourTeam: team, room: publicRoom(room, team) }));
  }
}

function addRoomLog(room, events) {
  for (const ev of events || []) {
    if (ev.type === 'log') room.log.push(ev);
  }
  if (room.log.length > 400) room.log = room.log.slice(-400);
}

function attachPlayerSocket(room, player, ws) {
  if (player.ws && player.ws !== ws) {
    try { player.ws.close(4001, '另一个窗口已连接'); } catch (err) { /* ignore */ }
  }
  player.ws = ws;
  player.connected = true;
  if (player.disconnectTimer) {
    clearTimeout(player.disconnectTimer);
    player.disconnectTimer = null;
  }
  ws.meta = ws.meta || {};
  ws.meta.roomCode = room.code;
  ws.meta.token = player.token;
  room.updatedAt = Date.now();
}

function sendSession(ws, room, player) {
  send(ws, {
    type: 'session',
    code: room.code,
    token: player.token,
    team: player.team,
    name: player.name,
    phase: room.phase
  });
}

function startRoom(room) {
  if (room.phase !== 'lobby') return;
  const blue = room.players.blue;
  const red = room.players.red;
  if (!blue || !red || !blue.connected || !red.connected || !blue.ready || !red.ready) return;
  if (!normalizeLineup(blue.lineup) || !normalizeLineup(red.lineup)) return;
  try {
    room.game = new Engine.Game({
      blueTeam: blue.lineup,
      redTeam: red.lineup,
      rng: Math.random,
      deployOnly: true
    });
  } catch (err) {
    broadcastLobby(room);
    return;
  }
  room.phase = 'playing';
  room.version = 1;
  room.deployReady = { blue: false, red: false };
  room.log = [];
  addRoomLog(room, room.game.startupEvents);
  room.updatedAt = Date.now();
  for (const team of ['blue', 'red']) {
    const p = room.players[team];
    if (!p || !p.ws) continue;
    send(p.ws, {
      type: 'started',
      state: room.game.snapshot(),
      events: room.game.startupEvents,
      room: publicRoom(room, team),
      yourTeam: team,
      version: room.version
    });
  }
}

function applyGameAction(game, action) {
  const type = action && action.type;
  if (!type) return { ok: false, error: '无效的行动。' };
  const intCoord = (value) => Number.isInteger(value) && value >= 0 && value < Engine.BOARD_SIZE;
  try {
    switch (type) {
      case 'move':
        if (!intCoord(action.x) || !intCoord(action.y)) return { ok: false, error: '无效的移动坐标。' };
        return game.moveUnit(String(action.unitId || ''), action.x, action.y);
      case 'attack':
        return game.attack(String(action.unitId || ''), String(action.targetId || ''));
      case 'skill':
        return game.useSkill(String(action.unitId || ''), action.targetId ? String(action.targetId) : undefined);
      case 'rotate':
        return game.rotateUnit(String(action.unitId || ''), String(action.facing || ''));
      case 'endUnit':
        return game.endUnit(String(action.unitId || ''));
      case 'endTurn':
        return game.endTeamTurn();
      case 'resumeDevour':
        return game.resumeDevour(String(action.unitId || ''));
      case 'deployMove':
        if (!intCoord(action.x) || !intCoord(action.y)) return { ok: false, error: '无效的布阵坐标。' };
        return game.deployMove(String(action.unitId || ''), action.x, action.y);
      case 'deployRotate':
        return game.deployRotate(String(action.unitId || ''), String(action.facing || ''));
      default:
        return { ok: false, error: '未知的行动类型。' };
    }
  } catch (err) {
    return { ok: false, error: '行动处理失败。' };
  }
}

function roomOf(ws) {
  if (!ws.meta || !ws.meta.roomCode) return null;
  return rooms.get(ws.meta.roomCode) || null;
}

function playerOf(room, ws) {
  if (!room || !ws.meta || !ws.meta.token) return null;
  for (const team of ['blue', 'red']) {
    const p = room.players[team];
    if (p && p.token === ws.meta.token) return p;
  }
  return null;
}

function closeRoom(room, reason) {
  if (!room) return;
  room.phase = 'closed';
  for (const team of ['blue', 'red']) {
    const p = room.players[team];
    if (p && p.disconnectTimer) clearTimeout(p.disconnectTimer);
    if (p && p.ws) {
      send(p.ws, { type: 'room-closed', reason: reason || '房间已关闭。' });
    }
  }
  rooms.delete(room.code);
}

function forfeit(room, loserTeam, reason) {
  if (!room || room.phase !== 'playing' || !room.game) return;
  const winner = loserTeam === 'blue' ? 'red' : 'blue';
  const loser = room.players[loserTeam];
  const winnerPlayer = room.players[winner];
  room.game.phase = 'gameover';
  room.game.winner = winner;
  room.game.activeTeam = null;
  const logEvent = {
    type: 'log',
    text: (loser ? loser.name : '对手') + (reason || '掉线') + '，' + Engine.TEAM_INFO[winner].name + ' 获胜。',
    tone: 'victory',
    round: room.game.round
  };
  if (winnerPlayer) winnerPlayer.ready = false;
  if (loser) loser.ready = false;
  room.log.push(logEvent);
  room.phase = 'finished';
  room.version += 1;
  room.updatedAt = Date.now();
  broadcastState(room, [logEvent, { type: 'gameover', winner: winner, text: logEvent.text }], null);
}

function handleDisconnect(ws) {
  const room = roomOf(ws);
  if (!room) return;
  const player = playerOf(room, ws);
  if (!player) return;
  if (player.ws !== ws) return;
  player.ws = null;
  player.connected = false;
  room.updatedAt = Date.now();
  broadcastPresence(room);
  if (room.phase === 'playing' && room.game && (room.game.phase === 'battle' || room.game.phase === 'deploy')) {
    if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
    player.disconnectTimer = setTimeout(() => {
      const current = rooms.get(room.code);
      if (!current || current.phase !== 'playing' || !current.game) return;
      const p = current.players[player.team];
      if (p && !p.connected) forfeit(current, player.team, '掉线超时');
    }, DISCONNECT_FORFEIT_MS);
  }
}

function handleMessage(ws, msg) {
  if (!msg || typeof msg.type !== 'string') return;
  const type = msg.type;
  const now = Date.now();
  const room = roomOf(ws);

  if (type === 'create') {
    if (room) return sendError(ws, '你已经在一个房间里。');
    const name = cleanName(msg.name);
    const lineup = normalizeLineup(msg.lineup) || defaultLineup('blue');
    if (rooms.size >= MAX_ROOMS) return sendError(ws, '服务器房间已满，请稍后再试。');
    const code = randomCode();
    const player = {
      token: randomToken(),
      name: name,
      team: 'blue',
      lineup: lineup,
      ready: false,
      connected: true,
      ws: ws,
      disconnectTimer: null
    };
    const newRoom = {
      code: code,
      phase: 'lobby',
      players: { blue: player, red: null },
      game: null,
      version: 0,
      log: [],
      createdAt: now,
      updatedAt: now,
      hostId: player.token
    };
    rooms.set(code, newRoom);
    attachPlayerSocket(newRoom, player, ws);
    sendSession(ws, newRoom, player);
    send(ws, { type: 'lobby', room: publicRoom(newRoom, 'blue'), yourTeam: 'blue' });
    return;
  }

  if (type === 'join') {
    if (room) return sendError(ws, '你已经在一个房间里。');
    const code = String(msg.code || '').trim().toUpperCase();
    const target = rooms.get(code);
    if (!target) return sendError(ws, '找不到这个房间，请检查房间码。');
    if (target.phase !== 'lobby') return sendError(ws, '该房间已经开始对战，无法加入。');
    if (target.players.red) return sendError(ws, '房间已满。');
    const name = cleanName(msg.name);
    const lineup = normalizeLineup(msg.lineup) || defaultLineup('red');
    const player = {
      token: randomToken(),
      name: name,
      team: 'red',
      lineup: lineup,
      ready: false,
      connected: true,
      ws: ws,
      disconnectTimer: null
    };
    target.players.red = player;
    target.updatedAt = now;
    attachPlayerSocket(target, player, ws);
    sendSession(ws, target, player);
    broadcastLobby(target);
    return;
  }

  if (type === 'reconnect') {
    const code = String(msg.code || '').trim().toUpperCase();
    const token = String(msg.token || '');
    const target = rooms.get(code);
    if (!target) return sendError(ws, '房间已不存在，可能已经结束。');
    let player = null;
    for (const team of ['blue', 'red']) {
      const p = target.players[team];
      if (p && p.token === token) player = p;
    }
    if (!player) return sendError(ws, '无法恢复对局：身份已失效。');
    attachPlayerSocket(target, player, ws);
    sendSession(ws, target, player);
    if (target.phase === 'lobby') {
      send(ws, { type: 'lobby', room: publicRoom(target, player.team), yourTeam: player.team });
    } else if (target.game) {
      send(ws, {
        type: 'resume',
        state: target.game.snapshot(),
        room: publicRoom(target, player.team),
        yourTeam: player.team,
        log: target.log.slice(-200),
        version: target.version,
        phase: target.phase
      });
    }
    broadcastPresence(target);
    return;
  }

  if (!room) return sendError(ws, '你还没有加入房间。');
  const player = playerOf(room, ws);
  if (!player) return sendError(ws, '身份校验失败，请重新加入。');

  if (type === 'update-lineup') {
    if (room.phase !== 'lobby') return sendError(ws, '对战已经开始，无法修改阵容。');
    const lineup = normalizeLineup(msg.lineup);
    if (!lineup) return sendError(ws, '阵容无效：至少 1 只恐龙，总容量不超过 6。');
    player.lineup = lineup;
    player.ready = false;
    room.updatedAt = now;
    broadcastLobby(room);
    return;
  }

  if (type === 'ready') {
    if (room.phase !== 'lobby') return sendError(ws, '对战已经开始。');
    if (!normalizeLineup(player.lineup)) return sendError(ws, '请先配置有效阵容。');
    if (!room.players.blue || !room.players.red) return sendError(ws, '需要两名玩家才能开始。');
    player.ready = !!msg.ready;
    room.updatedAt = now;
    broadcastLobby(room);
    if (room.players.blue.ready && room.players.red.ready) startRoom(room);
    return;
  }

  if (type === 'deploy-ready') {
    if (room.phase !== 'playing' || !room.game || room.game.phase !== 'deploy') {
      return sendError(ws, '当前不在布阵阶段。');
    }
    room.deployReady[player.team] = !!msg.ready;
    room.updatedAt = now;
    broadcastPresence(room);
    if (room.deployReady.blue && room.deployReady.red) {
      const result = room.game.beginBattle();
      if (result.ok) {
        addRoomLog(room, result.events);
        room.version += 1;
        room.updatedAt = Date.now();
        broadcastState(room, result.events, null);
      }
    }
    return;
  }

  if (type === 'action') {
    if (room.phase !== 'playing' || !room.game) {
      return sendError(ws, '当前没有进行中的战斗。');
    }
    if (room.game.phase === 'deploy') {
      if (room.deployReady && room.deployReady[player.team]) {
        return sendError(ws, '你已提交布阵，请先取消布阵完成。');
      }
      if (msg.action && msg.action.type !== 'deployMove' && msg.action.type !== 'deployRotate') {
        return sendError(ws, '布阵阶段只能调整位置和朝向。');
      }
      const deployUnit = room.game.getUnit(String((msg.action && msg.action.unitId) || ''));
      if (!deployUnit || deployUnit.team !== player.team) {
        return sendError(ws, '只能调整自己的恐龙。');
      }
      const deployResult = applyGameAction(room.game, msg.action || {});
      if (!deployResult || !deployResult.ok) {
        return sendError(ws, (deployResult && deployResult.error) || '布阵操作无效。');
      }
      room.version += 1;
      room.updatedAt = now;
      broadcastState(room, deployResult.events || [], player.team);
      return;
    }
    if (room.game.phase !== 'battle') {
      return sendError(ws, '当前没有进行中的战斗。');
    }
    if (player.team !== room.game.activeTeam) {
      return sendError(ws, '还没轮到你行动。');
    }
    const result = applyGameAction(room.game, msg.action || {});
    if (!result || !result.ok) {
      return sendError(ws, (result && result.error) || '行动无效。');
    }
    const events = result.events || [];
    addRoomLog(room, events);
    room.version += 1;
    room.updatedAt = now;
    if (room.game.phase === 'gameover') room.phase = 'finished';
    broadcastState(room, events, player.team);
    return;
  }

  if (type === 'back-to-lobby') {
    if (room.phase !== 'finished') return sendError(ws, '当前不能返回房间。');
    room.phase = 'lobby';
    room.game = null;
    room.deployReady = { blue: false, red: false };
    room.log = [];
    room.version += 1;
    room.updatedAt = now;
    for (const team of ['blue', 'red']) {
      if (room.players[team]) room.players[team].ready = false;
    }
    broadcastLobby(room);
    return;
  }

  if (type === 'chat') {
    const text = cleanText(msg.text, 100);
    if (!text) return;
    const payload = { type: 'chat', name: player.name, team: player.team, text: text, ts: now };
    for (const team of ['blue', 'red']) {
      const p = room.players[team];
      if (p && p.ws) send(p.ws, payload);
    }
    room.log.push({ type: 'log', text: '【聊天】' + player.name + '：' + text, tone: 'system', round: room.game ? room.game.round : 0 });
    if (room.log.length > 400) room.log = room.log.slice(-400);
    return;
  }

  if (type === 'leave') {
    if (room.phase === 'playing' && room.game && room.game.phase === 'battle') {
      forfeit(room, player.team, '离开了对局');
      player.ws = null;
      player.connected = false;
      broadcastPresence(room);
    } else if (room.phase === 'lobby') {
      player.ws = null;
      player.connected = false;
      closeRoom(room, player.name + ' 离开了房间。');
    } else if (room.phase === 'playing' && room.game && room.game.phase === 'deploy') {
      // 布阵阶段尚未开战：直接关闭房间，避免对手卡在等待开战。
      player.ws = null;
      player.connected = false;
      closeRoom(room, player.name + ' 在布阵阶段离开了房间。');
    } else if (room.phase === 'finished') {
      player.ws = null;
      player.connected = false;
      broadcastPresence(room);
    } else {
      player.ws = null;
      player.connected = false;
      closeRoom(room, player.name + ' 离开了房间。');
    }
    // 不要在这里清空 ws.meta：close 事件仍需要用它定位房间；
    // 各分支已把 player.ws 置空，handleDisconnect 会安全地跳过。
    try { ws.close(1000, '离开房间'); } catch (err) {}
    return;
  }

  if (type === 'ping') {
    send(ws, { type: 'pong', t: now });
    return;
  }
}

/* ---------- HTTP 静态站点 ---------- */
// 只暴露浏览器运行所需的四个前端文件；源码、依赖、测试、配置一律 404。
const PUBLIC_FILES = new Map([
  ['/index.html', 'index.html'],
  ['/app.js', 'app.js'],
  ['/engine.js', 'engine.js'],
  ['/styles.css', 'styles.css']
]);

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }
  let url;
  let pathname;
  try {
    url = new URL(req.url || '/', 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }
  if (pathname === '/health') {
    const body = JSON.stringify({ ok: true, rooms: rooms.size, online: true, uptime: process.uptime() });
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': Buffer.byteLength(body)
    });
    res.end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const publicFile = PUBLIC_FILES.get(pathname);
  if (!publicFile) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Not found');
    return;
  }
  const filePath = path.join(ROOT, publicFile);
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Not found');
      return;
    }
    const headers = {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': stat.size
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});


const wss = new WebSocketServer({
  server: server,
  path: '/ws',
  maxPayload: 64 * 1024,
  perMessageDeflate: false
});

wss.on('connection', (ws) => {
  ws.meta = {};
  ws.isAlive = true;
  ws.rate = { start: Date.now(), count: 0 };
  ws.on('pong', () => { ws.isAlive = true; });
  send(ws, { type: 'welcome', online: true, server: 'cretaceous-tactics', version: 1 });
  ws.on('message', (raw) => {
    const now = Date.now();
    if (now - ws.rate.start > 10000) { ws.rate.start = now; ws.rate.count = 0; }
    ws.rate.count += 1;
    if (ws.rate.count > 120) { try { ws.close(4008, 'too many messages'); } catch (err) {} return; }
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (err) { return sendError(ws, '消息格式错误。'); }
    try { handleMessage(ws, msg); } catch (err) { console.error('message error', err); sendError(ws, '服务器处理失败。'); }
  });
  ws.on('close', () => { handleDisconnect(ws); });
  ws.on('error', () => { /* close will follow */ });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch (err) {}
  });
}, 25000);

const cleaner = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const times = [room.updatedAt || room.createdAt || 0];
    for (const team of ['blue', 'red']) {
      if (room.players[team]) times.push(room.players[team].lastSeen || 0);
    }
    if (now - Math.max.apply(null, times) > ROOM_TTL) {
      if (room.players.blue && room.players.blue.disconnectTimer) clearTimeout(room.players.blue.disconnectTimer);
      if (room.players.red && room.players.red.disconnectTimer) clearTimeout(room.players.red.disconnectTimer);
      rooms.delete(code);
    }
  }
}, 60000);

server.listen(PORT, HOST, () => {
  console.log('Dino Tactics: http://' + HOST + ':' + PORT);
  console.log('Online WebSocket: ws://' + HOST + ':' + PORT + '/ws');
});

process.on('SIGINT', () => {
  clearInterval(heartbeat);
  clearInterval(cleaner);
  server.close(() => process.exit(0));
});
