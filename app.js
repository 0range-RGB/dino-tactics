/* =========================================================
   白垩纪战术 · 界面与交互
   ========================================================= */
(function () {
  'use strict';

  var E = window.DinoEngine;
  var SPECIES = E.SPECIES;
  var ORDER = E.SPECIES_ORDER;
  var TEAM_INFO = E.TEAM_INFO;
  var BOARD_SIZE = E.BOARD_SIZE;
  var DIRECTIONS = E.DIRECTIONS;
  var FACING_ORDER = E.FACING_ORDER;
  var FACING_ANGLE = { N: -90, E: 0, S: 90, W: 180 };
  var CAN_HOVER = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  var DEFAULT_SETUP = {
    blue: { trike: 1, trex: 0, leso: 0, stego: 1, anky: 1, velo: 0 },
    red: { trike: 0, trex: 1, leso: 1, stego: 0, anky: 0, velo: 0 }
  };

  var DINO_SVG = {
    trike: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M9 40c1-7 6-11 13-13l2-7 5 5 10 1c8 1 13 5 14 12l-1 9H39l-3 9h-7l3-9H20l-4 8-6-2 3-8c-3-1-4-3-4-5z"/><path fill="currentColor" opacity=".62" d="M23 25l-8-11 4 13L8 21l8 10-7 9 11-6 5 4 3-11z"/><path fill="currentColor" d="M30 17l-4-9 7 6 7-2-5 8z"/><circle cx="46" cy="34" r="1.6" fill="#081310"/></svg>',
    trex: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M4 48c7-1 10-4 12-9l4-10 8-6 9 1 5-5 9 3 1 6-5 4 1 5-7 6-3 12h-7l2-11-8 4-4 9h-7l4-11-9-2z"/><path fill="currentColor" d="M43 25l8-3 6 2-4 3z" opacity=".72"/><path fill="currentColor" d="M47 30l3 2-3 1zM44 33l3 2-3 1z" opacity=".8"/><path fill="currentColor" d="M34 39l5 1-2 5-4-1z" opacity=".8"/><circle cx="53" cy="25" r="1.4" fill="#081310"/></svg>',
    leso: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M6 48c8-1 15-7 19-14l-1-8 4-10 7 3-2 10 7 6 12 2-1 8-15 1-5 9-6-1 2-8-12 8-6-2 4-8-7 1z"/><path fill="currentColor" d="M28 19l-2-9 6 5 5-3-2 9z" opacity=".65"/><path fill="currentColor" d="M40 45l5 2-1 7-5-1z" opacity=".7"/><circle cx="30" cy="17" r="1.4" fill="#081310"/></svg>',
    stego: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M7 46c2-6 7-10 14-11l5-8 8 5 8-1-2 7 6 6-6 6-2 9-7-4-2 5-7-6-10 2z"/><path fill="currentColor" opacity=".72" d="M21 28l4-11 4 9zM30 23l4-10 4 9zM39 23l4-9 4 8z"/><path fill="currentColor" d="M9 45l-6-6 1 9-5 1 7 3z"/><path fill="currentColor" d="M14 29l-4-7 7 2 1 6z" opacity=".65"/><circle cx="48" cy="39" r="1.4" fill="#081310"/></svg>',
    anky: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M5 48c1-6 5-9 11-10l10-7 10 3 6-2 6 5 5 1 5 4-4 4-1 7-7 1-3-5-13 4-6 7-6-1 3-8-8 1z"/><path fill="currentColor" d="M4 50c-1-3 1-6 4-7 3-1 5 1 4 4-1 2-5 4-8 3z"/><path fill="currentColor" opacity=".7" d="M24 33l4-5 4 5zM33 32l4-5 4 5zM42 33l4-5 4 5z"/><path fill="currentColor" d="M48 42l5-1-1 7-5 1z" opacity=".65"/><circle cx="40" cy="37" r="1.4" fill="#081310"/></svg>',
    velo: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M7 47c8-1 14-5 18-11l-2-8 4-9 7 2-2 10 7 6 12 3-1 8-15-1-5 9-6-1 2-8-13 8-6-2 4-8-7 1z"/><path fill="currentColor" d="M31 20l-3-10 7 6 6-4-2 10z" opacity=".6"/><path fill="currentColor" d="M43 45l6 2-2 8-5-1zM47 40l4 3-4 2z" opacity=".8"/><circle cx="34" cy="18" r="1.4" fill="#081310"/></svg>'
  };

  var state = {
    game: null,
    mode: 'ai',
    setup: cloneSetup(DEFAULT_SETUP),
    selectedId: null,
    skillMode: null,
    busy: false,
    aiBusy: false,
    aiScheduled: false,
    started: false,
    sound: true,
    boardZoom: false,
    deployPreview: null,
    deployHover: null,
    toastTimer: null,
    rulesTab: 'basics',
    epoch: 0,
    logCount: 0,
    online: {
      socket: null,
      status: 'idle',
      connected: false,
      team: null,
      code: null,
      token: null,
      name: '',
      room: null,
      lineupCounts: null,
      pending: false,
      intentional: false,
      reconnectAttempts: 0,
      reconnectTimer: null,
      actionTimer: null,
      queue: Promise.resolve(),
      pendingQueue: [],
      presetRoom: null,
      lastVersion: 0,
      lastToast: '',
      rematch: null,
      testMode: false,
      debugMessages: []
    }
  };

  var els = {};
  var Sound = {
    ctx: null,
    init: function () {
      if (this.ctx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch (err) { this.ctx = null; }
    },
    tone: function (freq, dur, type, gain, delay) {
      if (!state.sound) return;
      this.init();
      if (!this.ctx) return;
      var ctx = this.ctx;
      if (ctx.state === 'suspended') ctx.resume();
      var t0 = ctx.currentTime + (delay || 0);
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.035, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    click: function () { this.tone(520, 0.05, 'triangle', 0.018); },
    move: function () { this.tone(210, 0.08, 'sine', 0.022); },
    hit: function () {
      this.tone(92, 0.16, 'sawtooth', 0.035);
      this.tone(48, 0.18, 'sine', 0.04, 0.01);
    },
    heal: function () {
      this.tone(520, 0.16, 'sine', 0.024);
      this.tone(780, 0.2, 'sine', 0.018, 0.08);
    },
    guard: function () {
      this.tone(330, 0.2, 'triangle', 0.026);
      this.tone(660, 0.12, 'sine', 0.018, 0.06);
    },
    crit: function () {
      this.tone(180, 0.08, 'square', 0.03);
      this.tone(110, 0.3, 'sawtooth', 0.034, 0.06);
    },
    death: function () {
      this.tone(120, 0.4, 'sawtooth', 0.032);
      this.tone(70, 0.45, 'sine', 0.03, 0.08);
    },
    victory: function () {
      var self = this;
      [392, 523, 659, 784].forEach(function (f, i) { self.tone(f, 0.4, 'sine', 0.03, i * 0.12); });
    },
    defeat: function () {
      var self = this;
      [330, 247, 196, 147].forEach(function (f, i) { self.tone(f, 0.36, 'triangle', 0.024, i * 0.13); });
    }
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    makeSpores();
    buildGrid();
    injectHeroIcons();
    bindEvents();
    renderBuilder();
    if (isStaticOnlyHost()) {
      var staticOnlineCard = document.querySelector('.mode-card[data-mode="online"]');
      if (staticOnlineCard) staticOnlineCard.remove();
    }
    autoSelectForTurn();
    initOnlineDefaults();
    initBoardZoomPreference();
    updateStartCTA();
    try {
      var params = new URLSearchParams(location.search);
      if (params.get('play') === '1') {
        startGame();
      } else if (params.get('room')) {
        // 只有邀请链接才自动打开大厅；旧会话不再劫持首页。
        state.online.presetRoom = String(params.get('room')).toUpperCase().slice(0, 5);
        openOnlineLobby();
      }
    } catch (err) {}
  }

  function cacheElements() {
    [
      'battleApp', 'startScreen', 'roundNum', 'turnPill', 'turnBanner', 'turnTitle', 'turnSub',
      'blueTeamPanel', 'redTeamPanel', 'blueKills', 'redKills', 'board', 'grid', 'tokenLayer',
      'corpseLayer', 'effectLayer', 'moveLayer', 'boardHint', 'detailPanel', 'actionPanel', 'logList', 'logMeta',
      'boardViewport', 'btnZoomBoard',
      'btnEndTurnTop', 'btnSound', 'btnRules', 'btnRestart', 'btnStart', 'btnStartBottom', 'btnRulesStart',
      'btnRandom', 'btnDefault', 'buildTeams', 'startWarning', 'modeSelect', 'rulesModal',
      'rulesTabs', 'rulesBody', 'btnCloseRules', 'confirmModal', 'btnConfirmLeave', 'btnCancelLeave',
      'gameOver', 'resultSigil', 'resultTitle', 'resultSub', 'resultStats', 'rematchStatus', 'btnRematch', 'btnAdjust',
      'toast', 'spores', 'onlineBadge', 'onlineLobby', 'onlineConnect', 'onlineRoomPanel', 'onlineReconnect',
      'onlineName', 'onlineCode', 'onlineConnectHint', 'btnCreateRoom', 'btnJoinRoom', 'btnCloseOnline',
      'onlineRoomCode', 'btnCopyCode', 'btnCopyLink', 'onlineConnState', 'roomPlayers', 'onlineLineup',
      'onlineCap', 'btnOnlineDefault', 'btnOnlineRandom', 'btnReady', 'btnLeaveRoom', 'onlineRoomHint',
      'confirmTitle', 'confirmText'
    ].forEach(function (id) { els[id] = document.getElementById(id); });
  }

  function setBoardZoom(on, persist) {
    state.boardZoom = !!on;
    if (persist !== false && !state.online.testMode) {
      try { localStorage.setItem('dino-board-zoom', state.boardZoom ? '1' : '0'); } catch (err) {}
    }
    if (!els.boardViewport || !els.btnZoomBoard) return;
    els.boardViewport.classList.toggle('zoomed', state.boardZoom);
    els.btnZoomBoard.setAttribute('aria-pressed', state.boardZoom ? 'true' : 'false');
    els.btnZoomBoard.setAttribute('aria-label', state.boardZoom ? '缩小棋盘' : '放大棋盘');
    els.btnZoomBoard.title = state.boardZoom ? '缩小棋盘' : '放大棋盘';
    var icon = els.btnZoomBoard.querySelector('.zoom-icon');
    var text = els.btnZoomBoard.querySelector('.zoom-text');
    if (icon) icon.textContent = state.boardZoom ? '⤡' : '⤢';
    if (text) text.textContent = state.boardZoom ? '缩小' : '放大';
    if (state.boardZoom) {
      setTimeout(centerBoardViewportOnSelection, 60);
    } else {
      els.boardViewport.scrollLeft = 0;
      els.boardViewport.scrollTop = 0;
    }
  }

  function centerBoardViewportOnSelection() {
    var vp = els.boardViewport;
    if (!vp || !els.board) return;
    var board = els.board;
    var vr = vp.getBoundingClientRect();
    var br = board.getBoundingClientRect();
    var cx = 0.5, cy = 0.5;
    var unit = state.game && state.game.getUnit(state.selectedId);
    if (unit && unit.alive) {
      var b = state.game.getUnitBounds(unit);
      cx = (b.minX + b.maxX + 1) / 2 / BOARD_SIZE;
      cy = (b.minY + b.maxY + 1) / 2 / BOARD_SIZE;
    }
    var boardLeft = br.left - vr.left + vp.scrollLeft;
    var boardTop = br.top - vr.top + vp.scrollTop;
    var left = boardLeft + cx * br.width - vp.clientWidth / 2;
    var top = boardTop + cy * br.height - vp.clientHeight / 2;
    vp.scrollTo({
      left: Math.max(0, left),
      top: Math.max(0, top),
      behavior: 'smooth'
    });
  }

  function initBoardZoomPreference() {
    if (state.online.testMode || window.innerWidth > 860) return;
    var saved = null;
    try { saved = localStorage.getItem('dino-board-zoom'); } catch (err) {}
    if (saved === '1') setBoardZoom(true, false);
  }

  function maybeShowZoomHint() {
    if (state.boardZoom || window.innerWidth > 860 || state.online.testMode) return;
    try {
      if (localStorage.getItem('dino-board-zoom') !== null) return;
      if (localStorage.getItem('dino-board-zoom-hint') === '1') return;
      localStorage.setItem('dino-board-zoom-hint', '1');
    } catch (err) { return; }
    setTimeout(function () {
      toast('小屏可点棋盘上方「放大」，设置会记住');
    }, 900);
  }

  function afterBoardShown() {
    if (state.boardZoom) setTimeout(centerBoardViewportOnSelection, 120);
    maybeShowZoomHint();
  }

  function makeSpores() {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 20; i++) {
      var s = document.createElement('span');
      s.className = 'spore';
      s.style.left = (Math.random() * 100).toFixed(2) + '%';
      s.style.top = (50 + Math.random() * 55).toFixed(2) + '%';
      s.style.animationDuration = (12 + Math.random() * 20).toFixed(1) + 's';
      s.style.animationDelay = (-Math.random() * 18).toFixed(1) + 's';
      s.style.opacity = (0.2 + Math.random() * 0.5).toFixed(2);
      frag.appendChild(s);
    }
    els.spores.appendChild(frag);
  }

  function injectHeroIcons() {
    document.querySelectorAll('.hero-dino[data-icon]').forEach(function (node) {
      node.innerHTML = '<span class="dino-icon">' + dinoSvg(node.dataset.icon) + '</span>';
    });
  }

  function buildGrid() {
    var frag = document.createDocumentFragment();
    for (var y = 0; y < E.BOARD_SIZE; y++) {
      for (var x = 0; x < E.BOARD_SIZE; x++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        if (y < BOARD_SIZE / 2) cell.classList.add('home-red');
        else cell.classList.add('home-blue');
        if (y === BOARD_SIZE / 2 - 1 || y === BOARD_SIZE / 2) cell.classList.add('center-row');
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.setAttribute('role', 'gridcell');
        cell.title = '坐标 (' + (x + 1) + ', ' + (y + 1) + ')';
        frag.appendChild(cell);
      }
    }
    els.grid.appendChild(frag);
  }

  function cloneSetup(src) {
    var out = { blue: {}, red: {} };
    ['blue', 'red'].forEach(function (team) {
      ORDER.forEach(function (type) { out[team][type] = (src[team] && src[team][type]) || 0; });
    });
    return out;
  }

  function dinoSvg(type) { return DINO_SVG[type] || DINO_SVG.trike; }
  function fmt(n) { return Math.abs(n - Math.round(n)) < 0.001 ? String(Math.round(n)) : Number(n).toFixed(1); }
  function capacityOf(counts) { return ORDER.reduce(function (sum, type) { return sum + counts[type] * SPECIES[type].size; }, 0); }
  function lineupOf(counts) {
    var list = [];
    ORDER.forEach(function (type) {
      for (var i = 0; i < counts[type]; i++) list.push(type);
    });
    return list;
  }

  function bindEvents() {
    els.modeSelect.addEventListener('click', function (e) {
      var card = e.target.closest('.mode-card');
      if (!card) return;
      state.mode = card.dataset.mode;
      els.modeSelect.querySelectorAll('.mode-card').forEach(function (c) { c.classList.toggle('active', c === card); });
      renderBuilder();
      Sound.click();
    });

    els.buildTeams.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-team][data-type]');
      if (!btn) return;
      var team = btn.dataset.team;
      var type = btn.dataset.type;
      var action = btn.dataset.action;
      var counts = state.setup[team];
      if (action === 'inc') {
        if (capacityOf(counts) + SPECIES[type].size <= E.TEAM_CAPACITY) counts[type] += 1;
      } else if (action === 'dec') {
        if (counts[type] > 0) counts[type] -= 1;
      }
      Sound.click();
      renderBuilder();
    });

    els.btnDefault.addEventListener('click', function () {
      state.setup = cloneSetup(DEFAULT_SETUP);
      Sound.click();
      renderBuilder();
    });
    els.btnRandom.addEventListener('click', function () {
      state.setup = { blue: randomCounts(), red: randomCounts() };
      Sound.click();
      renderBuilder();
    });
    els.btnStart.addEventListener('click', handleStartPressed);
    if (els.btnStartBottom) els.btnStartBottom.addEventListener('click', handleStartPressed);

    els.btnCreateRoom.addEventListener('click', createOnlineRoom);
    els.btnJoinRoom.addEventListener('click', joinOnlineRoom);
    els.btnCloseOnline.addEventListener('click', closeOnlineLobby);
    els.btnLeaveRoom.addEventListener('click', leaveOnlineRoom);
    els.btnReady.addEventListener('click', toggleOnlineReady);
    els.btnOnlineDefault.addEventListener('click', function () { setOnlineLineup(defaultCountsForTeam(state.online.team), true); });
    els.btnOnlineRandom.addEventListener('click', function () { setOnlineLineup(randomCounts(), true); });
    els.btnCopyCode.addEventListener('click', copyRoomCode);
    els.btnCopyLink.addEventListener('click', copyInviteLink);
    els.onlineLineup.addEventListener('click', onOnlineLineupClick);
    els.onlineName.addEventListener('change', function () {
      state.online.name = els.onlineName.value.trim();
      if (!state.online.testMode) { try { localStorage.setItem('dino-online-name', state.online.name); } catch (err) {} }
    });
    els.onlineCode.addEventListener('keydown', function (e) { if (e.key === 'Enter') joinOnlineRoom(); });
    els.onlineName.addEventListener('keydown', function (e) { if (e.key === 'Enter') createOnlineRoom(); });

    [els.btnRules, els.btnRulesStart].forEach(function (btn) {
      if (btn) btn.addEventListener('click', function () { openRules(); });
    });
    els.btnCloseRules.addEventListener('click', closeRules);
    els.rulesModal.addEventListener('click', function (e) { if (e.target === els.rulesModal) closeRules(); });
    els.rulesTabs.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      state.rulesTab = btn.dataset.tab;
      renderRules();
    });

    els.btnSound.addEventListener('click', function () {
      state.sound = !state.sound;
      els.btnSound.innerHTML = '<span class="' + (state.sound ? 'sound-on' : 'sound-off') + '">♪</span>';
      try { localStorage.setItem('dino-sound', state.sound ? '1' : '0'); } catch (err) {}
      if (state.sound) Sound.click();
      toast(state.sound ? '音效已开启' : '音效已关闭');
    });

    els.btnRestart.addEventListener('click', function () {
      if (state.mode === 'online' && state.online.code) {
        if (state.game && state.game.phase === 'battle') {
          els.confirmTitle.textContent = '离开联网对局？';
          els.confirmText.textContent = '离开会立即判负，对手将获胜。确定要退出吗？';
          els.confirmModal.classList.remove('hidden');
        } else if (state.game && state.game.phase === 'deploy') {
          els.confirmTitle.textContent = '离开布阵阶段？';
          els.confirmText.textContent = '当前房间会关闭，对手将返回联网大厅。确定要退出吗？';
          els.confirmModal.classList.remove('hidden');
        } else {
          exitOnlineToStart(true);
        }
        return;
      }
      if (!state.game) { showStartScreen(); return; }
      if (state.game.phase === 'gameover') { showStartScreen(); return; }
      els.confirmTitle.textContent = '要离开这场战斗吗？';
      els.confirmText.textContent = '当前战局不会保留。你将返回阵容配置界面，可以重新编队再战。';
      els.confirmModal.classList.remove('hidden');
    });
    els.btnCancelLeave.addEventListener('click', function () { els.confirmModal.classList.add('hidden'); });
    els.btnConfirmLeave.addEventListener('click', function () {
      els.confirmModal.classList.add('hidden');
      if (state.mode === 'online' && state.online.code) exitOnlineToStart(true);
      else showStartScreen();
    });
    els.confirmModal.addEventListener('click', function (e) { if (e.target === els.confirmModal) els.confirmModal.classList.add('hidden'); });

    els.btnZoomBoard.addEventListener('click', function () {
      setBoardZoom(!state.boardZoom);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && state.boardZoom) setBoardZoom(false, false);
    });

    els.btnEndTurnTop.addEventListener('click', function () { endTeamTurn(); });
    els.board.addEventListener('click', onBoardClick);
    if (CAN_HOVER) {
      els.board.addEventListener('pointermove', onBoardPointerMove);
      els.board.addEventListener('pointerleave', function () {
        if (state.deployHover) { state.deployHover = null; renderDeployOverlay(); }
      });
    }
    els.blueTeamPanel.addEventListener('click', onRosterClick);
    els.redTeamPanel.addEventListener('click', onRosterClick);
    els.actionPanel.addEventListener('click', onActionClick);

    els.btnRematch.addEventListener('click', function () {
      if (state.mode === 'online' && state.online.code) {
        var rematch = state.online.rematch || {};
        if (rematch[state.online.team]) {
          toast('已发送再战请求，正在等待对手');
          return;
        }
        sendOnline({ type: 'rematch-request' });
        toast('已发送再战请求');
        return;
      }
      els.gameOver.classList.add('hidden');
      startGame();
    });
    els.btnAdjust.addEventListener('click', function () {
      els.gameOver.classList.add('hidden');
      if (state.mode === 'online' && state.online.code) exitOnlineToStart(true);
      else showStartScreen();
    });

    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'Escape') {
        if (!els.rulesModal.classList.contains('hidden')) { closeRules(); return; }
        if (!els.confirmModal.classList.contains('hidden')) { els.confirmModal.classList.add('hidden'); return; }
        if (state.skillMode) { state.skillMode = null; renderAll(); return; }
        if (state.deployPreview) {
          state.deployPreview = null;
          state.deployHover = null;
          renderAll();
          toast('已取消落位预览');
          return;
        }
      }
      if ((e.key === 'e' || e.key === 'E') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (state.game && state.game.phase === 'battle' && isHumanTurn() && !isModalOpen()) {
          e.preventDefault();
          endTeamTurn();
        }
      }
    });

    var savedSound = null;
    try { savedSound = localStorage.getItem('dino-sound'); } catch (err) {}
    if (savedSound === '0') {
      state.sound = false;
      els.btnSound.innerHTML = '<span class="sound-off">♪</span>';
    }
  }

  function isModalOpen() {
    return !els.rulesModal.classList.contains('hidden') || !els.confirmModal.classList.contains('hidden') || !els.gameOver.classList.contains('hidden');
  }

  function randomCounts() {
    var counts = {};
    ORDER.forEach(function (type) { counts[type] = 0; });
    var budget = E.TEAM_CAPACITY;
    var types = ORDER.slice().sort(function () { return Math.random() - 0.5; });
    types.forEach(function (type) {
      if (Math.random() < 0.62 && SPECIES[type].size <= budget) {
        counts[type] += 1;
        budget -= SPECIES[type].size;
      }
    });
    var mediums = ORDER.filter(function (type) { return SPECIES[type].size === 2; });
    var guard = 0;
    while (budget >= 2 && guard++ < 20) {
      var pick = mediums[Math.floor(Math.random() * mediums.length)];
      counts[pick] += 1;
      budget -= 2;
    }
    if (capacityOf(counts) === 0) counts.trike += 1;
    return counts;
  }

  function renderBuilder() {
    var html = '';
    ['blue', 'red'].forEach(function (team) {
      var info = TEAM_INFO[team];
      var counts = state.setup[team];
      var cap = capacityOf(counts);
      var block = '<div class="build-team ' + team + '">' +
        '<div class="build-team-head">' +
          '<span class="faction-dot"></span>' +
          '<strong>' + info.name + '</strong>' +
          '<span class="capacity-line"><span class="cap-track"><span class="cap-fill" style="width:' + Math.min(100, cap / E.TEAM_CAPACITY * 100) + '%"></span></span><span class="cap-text">' + cap + '/6</span></span>' +
        '</div>';
      ORDER.forEach(function (type) {
        var def = SPECIES[type];
        var count = counts[type];
        var canAdd = cap + def.size <= E.TEAM_CAPACITY;
        block += '<div class="build-unit">' +
          '<span class="mini-icon"><span class="dino-icon">' + dinoSvg(type) + '</span></span>' +
          '<span class="unit-meta"><strong>' + def.name + ' <span class="size-badge">占 ' + def.size + ' 格</span></strong><small>' + def.role + ' · HP ' + def.hp + ' / 甲 ' + def.armor + ' / 攻 ' + def.attack + ' / 行 ' + def.move + '</small></span>' +
          '<span class="stepper">' +
            '<button type="button" data-team="' + team + '" data-type="' + type + '" data-action="dec" aria-label="减少一只' + def.name + '"' + (count <= 0 ? ' disabled' : '') + '>−</button>' +
            '<span>' + count + '</span>' +
            '<button type="button" data-team="' + team + '" data-type="' + type + '" data-action="inc" aria-label="增加一只' + def.name + '"' + (!canAdd ? ' disabled' : '') + '>+</button>' +
          '</span>' +
        '</div>';
      });
      block += '</div>';
      html += block;
    });
    els.buildTeams.innerHTML = html;

    var blueCap = capacityOf(state.setup.blue);
    var redCap = capacityOf(state.setup.red);
    var valid = blueCap > 0 && redCap > 0 && blueCap <= E.TEAM_CAPACITY && redCap <= E.TEAM_CAPACITY;
    if (state.mode === 'online') {
      var canOnline = onlineAvailable();
      els.btnStart.disabled = !canOnline;
      if (els.btnStartBottom) els.btnStartBottom.disabled = !canOnline;
      els.startWarning.textContent = canOnline ? '' : '联网对战需要通过 node server.js 启动';
    } else {
      els.btnStart.disabled = !valid;
      if (els.btnStartBottom) els.btnStartBottom.disabled = !valid;
      if (!valid) {
        if (blueCap === 0 || redCap === 0) els.startWarning.textContent = '双方都至少需要一只恐龙';
        else els.startWarning.textContent = '队伍容量超过上限';
      } else {
        els.startWarning.textContent = '';
      }
    }
    updateStartCTA();
  }

  function startGame() {
    var blueCap = capacityOf(state.setup.blue);
    var redCap = capacityOf(state.setup.red);
    if (blueCap === 0 || redCap === 0) { toast('双方都至少需要一只恐龙'); return; }
    if (blueCap > E.TEAM_CAPACITY || redCap > E.TEAM_CAPACITY) { toast('队伍容量超过 6'); return; }
    state.deployPreview = null;
    state.deployHover = null;

    try {
      state.game = new E.Game({
        blueTeam: lineupOf(state.setup.blue),
        redTeam: lineupOf(state.setup.red),
        rng: Math.random,
        deployOnly: true
      });
    } catch (err) {
      toast(err.message || '阵容无效');
      return;
    }

    state.epoch += 1;
    state.started = true;
    state.busy = false;
    state.aiBusy = false;
    state.aiScheduled = false;
    state.skillMode = null;
    state.selectedId = null;
    state.logCount = 0;
    els.logList.innerHTML = '';
    els.tokenLayer.innerHTML = '';
    els.corpseLayer.innerHTML = '';
    els.effectLayer.innerHTML = '';
    els.startScreen.classList.add('hidden');
    els.onlineLobby.classList.add('hidden');
    els.gameOver.classList.add('hidden');
    els.battleApp.classList.remove('hidden');
    els.startScreen.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });

    autoSelectForTurn();
    renderAll();
    appendEvents(state.game.startupEvents || []);
    afterBoardShown();
    Sound.click();
    setTimeout(function () {
      if (!state.game) return;
      if (state.game.phase === 'deploy') toast('布阵阶段 · 布置你的恐龙');
      else if (state.game.phase === 'battle') toast('第 ' + state.game.round + ' 回合 · 苍林盟约行动');
    }, 520);
  }

  function showStartScreen() {
    state.epoch += 1;
    state.game = null;
    state.busy = false;
    state.aiBusy = false;
    state.aiScheduled = false;
    state.started = false;
    state.selectedId = null;
    state.skillMode = null;
    state.deployPreview = null;
    state.deployHover = null;
    state.online.rematch = null;
    if (state.mode === 'online') state.mode = 'ai';
    if (els.modeSelect) {
      els.modeSelect.querySelectorAll('.mode-card').forEach(function (card) {
        card.classList.toggle('active', card.dataset.mode === state.mode);
      });
    }
    updateStartCTA();
    els.battleApp.classList.add('hidden');
    els.gameOver.classList.add('hidden');
    els.onlineLobby.classList.add('hidden');
    els.startScreen.classList.remove('hidden');
    els.confirmModal.classList.add('hidden');
    renderBuilder();
    els.startScreen.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ---------------- 渲染 ---------------- */
  function renderAll() {
    if (!state.game) return;
    renderHeader();
    renderTeams();
    renderBoard();
    renderDetail();
    renderActions();
    updateLogMeta();
  }

  function renderHeader() {
    var g = state.game;
    els.roundNum.textContent = g.phase === 'deploy' ? '布阵' : String(g.round).padStart(2, '0');
    // 击杀数：敌方阵亡数
    els.blueKills.textContent = g.getTeamUnits('red').filter(function (u) { return !u.alive; }).length;
    els.redKills.textContent = g.getTeamUnits('blue').filter(function (u) { return !u.alive; }).length;

    var pill = els.turnPill;
    pill.className = 'turn-pill';
    if (g.phase === 'gameover') {
      pill.classList.add('gold');
      pill.innerHTML = '<i></i>战斗结束';
    } else if (g.phase === 'deploy') {
      pill.classList.add('gold');
      pill.innerHTML = '<i></i>布阵阶段';
    } else if (state.mode === 'online') {
      pill.classList.add(g.activeTeam);
      var onlineLabel = g.activeTeam === state.online.team ? '你的行动' : '对手行动';
      pill.innerHTML = '<i></i>' + onlineLabel;
    } else {
      pill.classList.add(g.activeTeam);
      var label = g.activeTeam === 'blue' ? '苍林行动' : '赤焰行动';
      if (g.activeTeam === 'red' && state.mode === 'ai' && state.aiBusy) label = '赤焰思考中';
      pill.innerHTML = '<i></i>' + label;
    }

    if (state.mode === 'online' && state.online.code) {
      els.onlineBadge.classList.remove('hidden');
      els.onlineBadge.innerHTML = '联机 <b>' + state.online.code + '</b>';
    } else {
      els.onlineBadge.classList.add('hidden');
    }

    var banner = els.turnBanner;
    banner.className = 'turn-banner ' + (g.phase === 'gameover' || g.phase === 'deploy' ? 'gold' : g.activeTeam);
    if (g.phase === 'gameover') {
      els.turnTitle.textContent = '战斗结束';
      els.turnSub.textContent = g.winner === 'draw' ? '双方同归于尽' : TEAM_INFO[g.winner].name + ' 取得胜利';
    } else if (g.phase === 'deploy') {
      if (state.mode === 'online') {
        var roomLabel2 = state.online.code ? '房间 ' + state.online.code + ' · ' : '';
        var ready = state.online.room && state.online.room.deployReady && state.online.room.deployReady[state.online.team];
        els.turnTitle.textContent = '布阵阶段 · 选择初始位置';
        els.turnSub.textContent = roomLabel2 + (ready ? '布阵已提交，等待对手完成……' : '点击己方恐龙，再点击本方半场空格放置');
      } else {
        els.turnTitle.textContent = '布阵阶段 · 部署你的恐龙';
        els.turnSub.textContent = state.mode === 'pvp' ? '双方可分别调整各自半场，完成后开始战斗' : '点击蓝色恐龙，在本方半场选择位置；红色为敌方自动布阵';
      }
    } else {
      els.turnTitle.textContent = '第 ' + g.round + ' 回合 · ' + TEAM_INFO[g.activeTeam].name + '行动';
      if (state.mode === 'ai' && g.activeTeam === 'red') {
        els.turnSub.textContent = '敌方正在部署战术，请稍候……';
      } else if (state.mode === 'online') {
        var roomLabel = state.online.code ? '房间 ' + state.online.code + ' · ' : '';
        if (state.online.connected === false) {
          els.turnSub.textContent = roomLabel + '连接已断开，正在重连……';
        } else if (g.activeTeam === state.online.team) {
          var selected = g.getUnit(state.selectedId);
          els.turnSub.textContent = roomLabel + (selected && selected.team === g.activeTeam ? '你的回合 · 已选择 ' + selected.name : '你的回合 · 选择一只恐龙行动');
        } else {
          var opp = onlinePlayer(g.activeTeam);
          els.turnSub.textContent = roomLabel + '等待 ' + (opp ? opp.name : '对手') + ' 行动…';
        }
      } else {
        var selected2 = g.getUnit(state.selectedId);
        els.turnSub.textContent = selected2 && selected2.team === g.activeTeam ? '已选择 ' + selected2.name + ' · 点击高亮格行动' : '选择一只恐龙开始行动';
      }
      if (g.round >= 15) {
        banner.classList.add('attrition');
        els.turnSub.textContent += ' · 环境侵蚀：每回合 -1 生命';
      }
    }

    var canEnd = g.phase === 'battle' && isHumanTurn() && !state.busy;
    els.btnEndTurnTop.disabled = !canEnd;
    els.btnEndTurnTop.querySelector('span').textContent = g.phase === 'gameover' ? '战斗结束' : g.phase === 'deploy' ? '布阵中' : '结束回合';
    var endKbd = els.btnEndTurnTop.querySelector('kbd');
    if (endKbd) endKbd.style.visibility = g.phase === 'battle' ? 'visible' : 'hidden';
  }

  function renderTeams() {
    renderTeamPanel(els.blueTeamPanel, 'blue');
    renderTeamPanel(els.redTeamPanel, 'red');
  }

  function renderTeamPanel(panel, team) {
    var g = state.game;
    var info = TEAM_INFO[team];
    var units = g.getTeamUnits(team);
    var alive = units.filter(function (u) { return u.alive; }).length;
    var secretDeploy = state.mode === 'online' && g.phase === 'deploy' &&
      state.online.team && team !== state.online.team;
    var subline = team === 'blue' ? 'VERDANT COVENANT' : 'EMBER CLAN';
    if (state.mode === 'online') {
      var op = onlinePlayer(team);
      subline = op ? op.name + (op.team === state.online.team ? ' · 你' : '') + (op.connected ? '' : ' · 已掉线') : '等待加入';
    }
    panel.className = 'team-panel team-' + team + (g.activeTeam === team && g.phase === 'battle' ? ' active' : '');
    var html = '<div class="team-head">' +
      '<div class="faction-mark">' + (team === 'blue' ? '❖' : '✦') + '</div>' +
      '<div class="team-head-copy"><strong>' + info.name + '</strong><span>' + subline + '</span></div>' +
      '<div class="team-alive"><b>' + alive + '<span style="font-size:9px;color:var(--muted-2)">/' + units.length + '</span></b><span>存活</span></div>' +
    '</div><div class="roster">';
    if (secretDeploy) {
      html += '<div class="secret-roster"><strong>对手正在布阵</strong><span>位置与朝向保密，开战后公开</span></div>';
    } else if (!units.length) {
      html += '<div class="empty-roster">暂无单位</div>';
    } else {
      units.forEach(function (unit) {
        html += unitCardHTML(unit);
      });
    }
    html += '</div>';
    panel.innerHTML = html;
  }

  function unitCardHTML(unit) {
    var g = state.game;
    var hpPct = Math.max(0, unit.hp / unit.maxHp * 100);
    var statuses = g.getStatusList(unit);
    var ready = g.round >= unit.skillReadyRound;
    var cardStatus = '';
    if (unit.alive && statuses.length) {
      statuses.slice(0, 2).forEach(function (st) {
        cardStatus += '<span class="status-chip ' + st.key + '">' + st.label + '</span>';
      });
    }
    return '<button type="button" class="unit-card ' + (unit.alive ? '' : 'is-dead ') + (unit.turn && unit.turn.done && unit.alive ? 'is-done ' : '') + (state.selectedId === unit.id ? 'selected' : '') + '" data-unit="' + unit.id + '" aria-label="查看 ' + unit.name + '">' +
      '<span class="card-icon"><span class="dino-icon">' + dinoSvg(unit.type) + '</span></span>' +
      '<span class="card-main">' +
        '<span class="card-title"><strong>' + unit.name + '</strong><span class="card-size">占 ' + unit.size + ' 格</span></span>' +
        '<span class="card-bars"><span class="mini-bar"><i style="width:' + hpPct + '%"></i></span><span class="card-hp">' + fmt(unit.hp) + '/' + unit.maxHp + '</span></span>' +
        (cardStatus ? '<span class="card-status">' + cardStatus + '</span>' : '') +
      '</span>' +
      '<span class="card-side">' +
        '<span class="card-armor">甲 ' + fmt(unit.armor) + '</span>' +
        '<span class="card-cd ' + (unit.alive && ready ? 'ready' : '') + '">' + (unit.alive ? (ready ? '就绪' : 'R' + unit.skillReadyRound) : '阵亡') + '</span>' +
      '</span>' +
    '</button>';
  }

  function renderBoard() {
    var g = state.game;
    var selected = g.getUnit(state.selectedId);
    var deploying = g.phase === 'deploy';
    var canControl = selected && isHumanTurn() && selected.alive && selected.team === g.activeTeam &&
      !selected.turn.done && !selected.turn.actionUsed && !(selected.status.devour && selected.status.devour.active);

    var reachable = [];
    var attackTargets = [];
    var skillTargets = [];
    var deployCells = [];
    if (deploying && selected && canDeployUnit(selected) && !state.busy) {
      deployCells = g.getDeployCells(selected);
    } else if (canControl && !state.busy) {
      reachable = g.getReachable(selected);
      attackTargets = g.getAttackTargets(selected);
      if (state.skillMode === 'anky') {
        var skill = g.getSkillStatus(selected);
        skillTargets = skill.targets || [];
      }
    }
    if (deploying) {
      if (state.deployPreview && !deployCells.some(function (c) { return c.x === state.deployPreview.x && c.y === state.deployPreview.y; })) state.deployPreview = null;
      if (state.deployHover && !deployCells.some(function (c) { return c.x === state.deployHover.x && c.y === state.deployHover.y; })) state.deployHover = null;
    }
    var deployMap = {};
    deployCells.forEach(function (c) { deployMap[c.x + ',' + c.y] = true; });
    var reachMap = {};
    reachable.forEach(function (r) { reachMap[r.x + ',' + r.y] = true; });
    var attackMap = {};
    attackTargets.forEach(function (t) {
      g.getFootprint(t).forEach(function (c) { attackMap[c.x + ',' + c.y] = true; });
    });
    var skillMap = {};
    skillTargets.forEach(function (t) {
      g.getFootprint(t).forEach(function (c) { skillMap[c.x + ',' + c.y] = true; });
    });
    var selectedMap = {};
    if (selected && !selected.hidden) g.getFootprint(selected).forEach(function (c) { selectedMap[c.x + ',' + c.y] = true; });

    var cells = els.grid.children;
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var x = Number(cell.dataset.x);
      var y = Number(cell.dataset.y);
      var k = x + ',' + y;
      cell.classList.remove('move-range', 'attack-range', 'skill-range', 'selected-cell', 'corpse-cell', 'deploy-range', 'deploy-zone');

      // 尸体标记在独立图层，这里只给底色。
      for (var c = 0; c < g.corpses.length; c++) {
        if (g.corpses[c].x === x && g.corpses[c].y === y) cell.classList.add('corpse-cell');
      }
      if (selectedMap[k]) cell.classList.add('selected-cell');
      if (deploying && selected && canDeployUnit(selected)) {
        var inDeployHalf = selected.team === 'blue' ? y >= BOARD_SIZE / 2 : y < BOARD_SIZE / 2;
        if (inDeployHalf) cell.classList.add('deploy-zone');
      }
      if (deployMap[k]) cell.classList.add('deploy-range');
      if (attackMap[k]) cell.classList.add('attack-range');
      if (skillMap[k]) cell.classList.add('skill-range');
    }

    renderCorpses();
    renderTokens();
    if (deploying) renderDeployOverlay(selected, deployCells);
    else renderMoveOverlay(selected, reachable);

    if (deploying) {
      var readyOnline = state.mode === 'online' && state.online.room && state.online.room.deployReady && state.online.room.deployReady[state.online.team];
      if (readyOnline) els.boardHint.textContent = '布阵已提交，等待对手完成……';
      else if (state.deployPreview) els.boardHint.textContent = '已预览落位：虚线框为整只恐龙将占据的格子，确认后放置。';
      else els.boardHint.textContent = '布阵阶段：点击己方恐龙，再点高亮格预览整只恐龙的落位。';
    } else if (state.skillMode === 'anky') {
      els.boardHint.textContent = '尾槌重击：点击紫色标记的敌人。按 Esc 取消。';
    } else if (selected && canControl) {
      if (attackTargets.length) els.boardHint.textContent = '虚线框是整只恐龙移动后的占位，点击虚线内任意格整体移动；红色敌人可攻击。';
      else els.boardHint.textContent = '虚线框是整只恐龙移动后的占位，点击虚线内任意格整体移动。';
    } else if (g.phase === 'gameover') {
      els.boardHint.textContent = '战斗已经结束。';
    } else if (!isHumanTurn()) {
      els.boardHint.textContent = '赤焰部族正在行动，观察战场。';
    } else {
      els.boardHint.textContent = '点击左侧单位或棋盘上的己方恐龙。';
    }
  }

  function renderDeployOverlay(selected, cells) {
    if (!els.moveLayer) return;
    els.moveLayer.innerHTML = '';
    if (!state.game || state.game.phase !== 'deploy' || state.busy) return;
    selected = selected || state.game.getUnit(state.selectedId);
    if (!selected || !canDeployUnit(selected)) return;
    cells = cells || state.game.getDeployCells(selected);
    var target = state.deployPreview || state.deployHover;
    if (!target) return;
    if (!cells.some(function (c) { return c.x === target.x && c.y === target.y; })) return;
    var foot = state.game.getFootprint(selected, target.x, target.y, selected.facing);
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    foot.forEach(function (c) {
      if (c.x < b.minX) b.minX = c.x;
      if (c.y < b.minY) b.minY = c.y;
      if (c.x > b.maxX) b.maxX = c.x;
      if (c.y > b.maxY) b.maxY = c.y;
    });
    var ghost = document.createElement('span');
    ghost.className = 'move-ghost deploy-ghost' + (state.deployPreview ? ' preview' : '');
    ghost.style.left = (b.minX / BOARD_SIZE * 100) + '%';
    ghost.style.top = (b.minY / BOARD_SIZE * 100) + '%';
    ghost.style.width = ((b.maxX - b.minX + 1) / BOARD_SIZE * 100) + '%';
    ghost.style.height = ((b.maxY - b.minY + 1) / BOARD_SIZE * 100) + '%';
    els.moveLayer.appendChild(ghost);
    var dot = document.createElement('span');
    dot.className = 'deploy-anchor-dot';
    dot.style.left = ((target.x + 0.5) / BOARD_SIZE * 100) + '%';
    dot.style.top = ((target.y + 0.5) / BOARD_SIZE * 100) + '%';
    els.moveLayer.appendChild(dot);
  }

  function onBoardPointerMove(e) {
    if (!state.game || state.game.phase !== 'deploy' || state.busy) return;
    var cellEl = e.target.closest('.cell');
    if (!cellEl) {
      if (state.deployHover) { state.deployHover = null; renderDeployOverlay(); }
      return;
    }
    var x = Number(cellEl.dataset.x);
    var y = Number(cellEl.dataset.y);
    var selected = state.game.getUnit(state.selectedId);
    if (!canDeployUnit(selected)) return;
    var cells = state.game.getDeployCells(selected);
    var valid = cells.some(function (c) { return c.x === x && c.y === y; });
    if (!valid) {
      if (state.deployHover) { state.deployHover = null; renderDeployOverlay(); }
      return;
    }
    if (!state.deployHover || state.deployHover.x !== x || state.deployHover.y !== y) {
      state.deployHover = { x: x, y: y };
      renderDeployOverlay(selected, cells);
    }
  }

  function renderMoveOverlay(selected, reachable) {
    if (!els.moveLayer) return;
    els.moveLayer.innerHTML = '';
    if (!selected || !reachable || !reachable.length) return;
    var current = state.game.getUnitBounds(selected);
    var frag = document.createDocumentFragment();
    reachable.forEach(function (dest) {
      var cells = state.game.getFootprint(selected, dest.x, dest.y, selected.facing);
      var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      cells.forEach(function (c) {
        if (c.x < b.minX) b.minX = c.x;
        if (c.y < b.minY) b.minY = c.y;
        if (c.x > b.maxX) b.maxX = c.x;
        if (c.y > b.maxY) b.maxY = c.y;
      });
      var overlapsSelf = !(b.maxX < current.minX || b.minX > current.maxX || b.maxY < current.minY || b.minY > current.maxY);
      var ghost = document.createElement('span');
      ghost.className = 'move-ghost' + (overlapsSelf ? ' covered' : '');
      ghost.style.left = (b.minX / BOARD_SIZE * 100) + '%';
      ghost.style.top = (b.minY / BOARD_SIZE * 100) + '%';
      ghost.style.width = ((b.maxX - b.minX + 1) / BOARD_SIZE * 100) + '%';
      ghost.style.height = ((b.maxY - b.minY + 1) / BOARD_SIZE * 100) + '%';
      frag.appendChild(ghost);

      var marker = document.createElement('span');
      marker.className = 'move-marker' + (overlapsSelf ? ' covered' : '');
      marker.style.left = ((b.minX + b.maxX + 1) / 2 / BOARD_SIZE * 100) + '%';
      marker.style.top = ((b.minY + b.maxY + 1) / 2 / BOARD_SIZE * 100) + '%';
      marker.textContent = String(dest.dist);
      frag.appendChild(marker);
    });
    els.moveLayer.appendChild(frag);
  }

  function renderCorpses() {
    var g = state.game;
    var html = '';
    g.corpses.forEach(function (corpse) {
      html += '<span class="corpse" style="left:' + ((corpse.x + 0.5) / BOARD_SIZE * 100) + '%;top:' + ((corpse.y + 0.5) / BOARD_SIZE * 100) + '%;" title="' + corpse.name + '的尸体"><span>☠</span></span>';
    });
    els.corpseLayer.innerHTML = html;
  }

  function renderTokens() {
    var g = state.game;
    var aliveIds = {};
    g.units.forEach(function (unit) {
      if (!unit.alive) return;
      if (unit.hidden) {
        var hiddenToken = els.tokenLayer.querySelector('.token[data-id="' + unit.id + '"]');
        if (hiddenToken && hiddenToken.parentNode) hiddenToken.parentNode.removeChild(hiddenToken);
        return;
      }
      aliveIds[unit.id] = true;
      var token = els.tokenLayer.querySelector('.token[data-id="' + unit.id + '"]');
      if (!token) {
        token = document.createElement('div');
        token.className = 'token';
        token.dataset.id = unit.id;
        token.setAttribute('role', 'button');
        token.tabIndex = 0;
        els.tokenLayer.appendChild(token);
      }
      var bounds = g.getUnitBounds(unit);
      token.style.left = (bounds.minX / BOARD_SIZE * 100) + '%';
      token.style.top = (bounds.minY / BOARD_SIZE * 100) + '%';
      token.style.width = (bounds.w / BOARD_SIZE * 100) + '%';
      token.style.height = (bounds.h / BOARD_SIZE * 100) + '%';
      token.classList.toggle('team-blue', unit.team === 'blue');
      token.classList.toggle('team-red', unit.team === 'red');
      token.classList.toggle('shape-small', bounds.w === 1 && bounds.h === 1);
      token.classList.toggle('shape-medium', unit.size === 2);
      token.classList.toggle('shape-large', unit.size >= 4);
      token.classList.toggle('footprint-vertical', bounds.w === 1 && bounds.h === 2);
      token.classList.toggle('footprint-horizontal', bounds.w === 2 && bounds.h === 1);
      token.classList.toggle('footprint-square', bounds.w === 2 && bounds.h === 2);
      token.classList.toggle('selected', state.selectedId === unit.id);
      token.classList.toggle('is-done', !!(unit.turn && unit.turn.done));
      token.classList.toggle('deploy-locked', g.phase === 'deploy' && !canDeployUnit(unit));
      token.classList.toggle('active-team', g.activeTeam === unit.team && g.phase === 'battle');
      token.classList.remove('dead');
      token.style.setProperty('--team-glow', TEAM_INFO[unit.team].color);
      token.setAttribute('aria-label', unit.name + '，生命 ' + fmt(unit.hp) + '，护甲 ' + fmt(unit.armor));
      token.title = buildTokenTitle(unit);

      var hpPct = Math.max(0, unit.hp / unit.maxHp * 100);
      var facing = DIRECTIONS[unit.facing];
      var angle = unit.facing === 'N' ? 0 : unit.facing === 'E' ? 90 : unit.facing === 'S' ? 180 : 270;
      var statuses = g.getStatusList(unit);
      var badge = '';
      if (statuses.length) {
        var first = statuses[0];
        var label = first.short;
        if (first.key === 'bleed') label = '血' + unit.status.bleed.length;
        if (first.key === 'devour' || first.key === 'devour-pause') label = '食';
        var badgeClass = first.key === 'bleed' ? 'bleed' : first.key === 'guard' ? 'guard' : first.key === 'devour' || first.key === 'devour-pause' ? 'devour' : first.key === 'assault' ? 'assault' : first.key === 'hook' ? 'hook' : first.key === 'hook-received' ? 'hook-received' : first.key === 'hook-cooldown' ? 'hook-cooldown' : '';
        badge = '<span class="token-status ' + badgeClass + '">' + label + '</span>';
      }
      var icon = dinoSvg(unit.type);
      var anchorLeft = ((unit.x - bounds.minX + 0.5) / bounds.w * 100);
      var anchorTop = ((unit.y - bounds.minY + 0.5) / bounds.h * 100);
      var iconCells = unit.size >= 4 ? 1.2 : 0.72;
      var iconW = (iconCells / bounds.w * 100);
      var iconH = (iconCells / bounds.h * 100);
      var iconAngle = FACING_ANGLE[unit.facing] || 0;
      var inner = '<div class="token-inner">' +
        badge +
        '<span class="facing-arrow" style="left:' + anchorLeft + '%;top:' + anchorTop + '%;transform:translate(-50%,-50%) rotate(' + angle + 'deg)">↑</span>' +
        '<span class="token-face"><span class="dino-icon" style="width:' + iconW + '%;height:' + iconH + '%;transform:rotate(' + iconAngle + 'deg)">' + icon + '</span></span>' +
        '<span class="token-hp"><i style="width:' + hpPct + '%"></i></span>' +
      '</div>';
      if (token.dataset.render !== inner) {
        token.innerHTML = inner;
        token.dataset.render = inner;
      }
    });

    Array.prototype.forEach.call(els.tokenLayer.querySelectorAll('.token'), function (token) {
      if (aliveIds[token.dataset.id]) return;
      if (token.classList.contains('dead')) return;
      token.classList.add('dead');
      setTimeout(function () { if (token.parentNode) token.parentNode.removeChild(token); }, 520);
    });
  }

  function buildTokenTitle(unit) {
    var statuses = state.game.getStatusList(unit);
    var text = unit.name + ' · 生命 ' + fmt(unit.hp) + '/' + unit.maxHp + ' · 护甲 ' + fmt(unit.armor) + '/' + unit.armorMax + ' · 朝向 ' + DIRECTIONS[unit.facing].label;
    if (statuses.length) text += ' · ' + statuses.map(function (s) { return s.label; }).join(' / ');
    return text;
  }

  function renderDetail() {
    var g = state.game;
    var unit = g.getUnit(state.selectedId);
    if (unit && unit.hidden) {
      els.detailPanel.innerHTML = '<div class="detail-empty"><span class="empty-glyph">◇</span><strong>对手布阵中</strong><p>布阵阶段不会显示对手的占位与朝向，开战后公开。</p></div>';
      return;
    }
    if (!unit) {
      els.detailPanel.innerHTML = '<div class="detail-empty"><span class="empty-glyph">◇</span><strong>未选择单位</strong><p>点击棋盘上的恐龙或左侧队伍栏，查看生命、护甲、技能与状态。</p></div>';
      return;
    }
    var info = TEAM_INFO[unit.team];
    var skill = g.getSkillStatus(unit);
    var formActive = g.isFormActive(unit);
    var attack = g.getAttack(unit);
    var statuses = g.getStatusList(unit);
    var faction = info.color;
    var hpPct = Math.max(0, unit.hp / unit.maxHp * 100);
    var readyText = g.round >= unit.skillReadyRound ? '就绪' : '第 ' + unit.skillReadyRound + ' 回合';
    var statusHtml = statuses.map(function (st) { return '<span class="status-chip ' + st.key + '">' + st.label + '</span>'; }).join('');

    var html = '<div style="--faction:' + faction + '">' +
      '<div class="detail-head">' +
        '<div class="detail-portrait"><span class="dino-icon">' + dinoSvg(unit.type) + '</span></div>' +
        '<div class="detail-title">' +
          '<div class="detail-kicker"><i></i>' + info.name + ' · ' + (unit.alive ? '存活' : '已阵亡') + '</div>' +
          '<h3>' + unit.name + '</h3>' +
          '<p>' + SPECIES[unit.type].role + ' · ' + SPECIES[unit.type].latin + '</p>' +
        '</div>' +
        '<div class="detail-size"><b>' + unit.size + '</b>占格</div>' +
      '</div>' +
      '<div class="detail-stats">' +
        '<div class="detail-stat"><span>生命</span><b>' + fmt(unit.hp) + '<em>/' + unit.maxHp + '</em></b></div>' +
        '<div class="detail-stat"><span>护甲</span><b>' + fmt(unit.armor) + '<em>/' + unit.armorMax + '</em></b></div>' +
        '<div class="detail-stat"><span>攻击</span><b>' + attack + (formActive ? '<em>+1</em>' : '') + '</b></div>' +
        '<div class="detail-stat"><span>行动</span><b>' + (unit.turn ? g.getMoveLeft(unit) : unit.move) + '<em>/' + unit.move + '</em></b></div>' +
      '</div>' +
      (statusHtml ? '<div class="detail-status">' + statusHtml + '</div>' : '') +
      '<div class="detail-section">' +
        '<div class="skill-line"><span class="skill-dot"></span><span class="skill-name">' + SPECIES[unit.type].skillName + '</span><span class="skill-cd ' + (g.round >= unit.skillReadyRound ? 'ready' : '') + '">' + readyText + '</span></div>' +
        '<p class="skill-desc">' + SPECIES[unit.type].skillDesc + '</p>' +
      '</div>' +
      '<div class="detail-section">' +
        '<div class="skill-line"><span class="skill-dot passive"></span><span class="skill-name passive-label">' + SPECIES[unit.type].passiveName + '</span></div>' +
        '<p class="skill-desc">' + SPECIES[unit.type].passiveDesc + '</p>' +
      '</div>' +
      (unit.status.devour ? '<div class="detail-section"><div class="skill-line"><span class="skill-dot" style="background:var(--amber)"></span><span class="skill-name">吞食进度</span><span class="skill-cd">' + unit.status.devour.progress + '/' + unit.status.devour.needed + '</span></div><p class="skill-desc">' + (unit.status.devour.active ? '正在进餐，无法攻击、移动或使用主动技能。' : '吞食被打断，进度保留。靠近尸体后可继续吞食。') + '</p></div>' : '') +
      '<div style="height:2px;background:rgba(255,255,255,.04);margin-top:2px"><span style="display:block;height:100%;width:' + hpPct + '%;background:' + faction + ';opacity:.55"></span></div>' +
    '</div>';
    els.detailPanel.innerHTML = html;
  }

  function renderActions() {
    var g = state.game;
    var selected = g.getUnit(state.selectedId);
    var human = isHumanTurn();

    if (g.phase === 'deploy') {
      renderDeployActions(selected);
      return;
    }
    if (g.phase === 'gameover') {
      els.actionPanel.innerHTML = '<div class="action-head"><strong>战斗结束</strong><span>AFTER ACTION</span></div><div class="no-actions">查看战报，或重新开始一场战斗。</div><div class="action-footer"><button class="btn btn-ghost" type="button" data-action="adjust">调整阵容</button><button class="btn btn-primary" type="button" data-action="rematch">再战一局</button></div>';
      return;
    }
    if (!human) {
      var waitText;
      var waitTag;
      if (state.mode === 'online') {
        var opp = state.game.activeTeam ? onlinePlayer(state.game.activeTeam) : null;
        waitText = state.online.connected === false ? '连接断开，正在重新连接…' : '等待 ' + (opp ? opp.name : '对手') + ' 行动…';
        waitTag = 'ONLINE';
      } else if (state.mode === 'ai') {
        waitText = '赤焰部族正在部署战术……';
        waitTag = 'AUTO';
      } else {
        waitText = '等待红方下达指令';
        waitTag = 'P2';
      }
      els.actionPanel.innerHTML = '<div class="action-head"><strong>' + (state.mode === 'online' ? '对手回合' : '敌方行动') + '</strong><span>' + waitTag + '</span></div><div class="wait-state"><span class="spinner"></span><span>' + waitText + '</span></div>';
      return;
    }
    if (!selected) {
      els.actionPanel.innerHTML = '<div class="action-head"><strong>行动指令</strong><span>STANDBY</span></div><div class="no-actions">选择一只己方恐龙。点击棋盘上的单位或左侧队伍栏即可选中。</div>';
      return;
    }
    if (selected.team !== g.activeTeam) {
      els.actionPanel.innerHTML = '<div class="action-head"><strong>观察模式</strong><span>ENEMY</span></div><div class="no-actions">这是敌方单位。选择己方恐龙下达指令。</div>';
      return;
    }
    if (!selected.alive) {
      els.actionPanel.innerHTML = '<div class="action-head"><strong>已阵亡</strong><span>FALLEN</span></div><div class="no-actions">这只恐龙已经退出战场。</div>';
      return;
    }
    if (selected.status.devour && selected.status.devour.active) {
      els.actionPanel.innerHTML = '<div class="action-head"><strong>吞食中</strong><span>FEEDING</span></div><div class="no-actions">霸王龙正在吞食猎物：进度 <b style="color:var(--amber-soft)">' + selected.status.devour.progress + '/' + selected.status.devour.needed + '</b>。每回合恢复 1 点生命，期间无法行动。</div><div class="action-footer"><button class="btn btn-ghost" type="button" data-action="end-unit">结束观察</button></div>';
      return;
    }

    var skill = g.getSkillStatus(selected);
    var targets = g.getAttackTargets(selected);
    var moveLeft = g.getMoveLeft(selected);
    var corpseResume = canResumeDevour(selected);
    var done = selected.turn.done;
    var controlsLocked = state.busy || (state.mode === 'online' && !state.online.connected);
    var hookStacks = g.getHookStacks(selected);
    var sourceHook = selected.status.hook;
    var escapeCheck = hookStacks.length ? g.canEscapeHook(selected.id) : { allowed: false };
    var releaseCheck = sourceHook ? g.canReleaseHook(selected.id) : { allowed: false };
    var skillLabel = state.skillMode === 'anky' ? '选择尾槌目标…' : '发动「' + skill.name + '」';
    var skillSmall = skill.ready ? (selected.type === 'anky' ? '点击后选择相邻敌人' : selected.type === 'velo' ? '对朝向一格内的敌人使用' : '本回合可用') : skill.reason;
    var facingButtons = FACING_ORDER.map(function (dir) {
      return '<button type="button" data-facing="' + dir + '" class="' + (selected.facing === dir ? 'active' : '') + '"' + (done || controlsLocked ? ' disabled' : '') + ' title="朝向' + DIRECTIONS[dir].label + '">' + DIRECTIONS[dir].symbol + '</button>';
    }).join('');

    var note = '';
    if (sourceHook) note = '钩挂中：无法移动，攻击 +2；技能不充能。持续 1 回合后可手动解除，3 回合后自动解除。';
    else if (hookStacks.length) note = '受钩挂 ' + hookStacks.length + ' 层：行动力降低，不能攻击施加者；可尝试摆脱。';
    else if (done) note = '该单位本回合已结束行动。选择其他单位，或结束回合。';
    else if (selected.type === 'trex' && selected.turn.extraMove > 0) note = '突袭生效：行动力已增加，下一次攻击 +1，移动后仍可攻击。';
    else if (selected.type === 'trex' && selected.status.assaultBonus) note = '突袭蓄力：下一次攻击伤害 +1。';
    else if (moveLeft > 0 && targets.length) note = '可移动 <b>' + moveLeft + '</b> 格；相邻敌人可直接攻击。';
    else if (moveLeft > 0) note = '可移动 <b>' + moveLeft + '</b> 格，移动后仍可攻击或发动技能。';
    else if (targets.length) note = '行动力已耗尽，仍可攻击或发动技能。';
    else note = '没有相邻敌人。可以移动、发动技能，或结束该单位行动。';

    var html = '<div class="action-head"><strong>行动指令</strong><span>' + selected.name + '</span></div>' +
      '<p class="action-note">' + note + '</p>' +
      '<div class="action-buttons">' +
        '<button type="button" class="action-btn devour" data-action="skill" ' + (!skill.ready || controlsLocked ? 'disabled' : '') + '>' +
          '<span class="action-icon">' + (state.skillMode === 'anky' ? '◎' : '✦') + '</span>' +
          '<span class="action-copy"><b>' + skillLabel + '</b><small>' + skillSmall + '</small></span>' +
          '<span class="action-key">CD ' + SPECIES[selected.type].skillCd + '</span>' +
        '</button>' +
        (state.skillMode === 'anky' ? '<button type="button" class="action-btn" data-action="cancel-skill"><span class="action-icon">×</span><span class="action-copy"><b>取消选择</b><small>退出尾槌目标模式</small></span></button>' : '') +
        (escapeCheck.allowed ? '<button type="button" class="action-btn" data-action="escape-hook" ' + (controlsLocked ? 'disabled' : '') + '><span class="action-icon">解</span><span class="action-copy"><b>摆脱受钩挂</b><small>成功率 ' + Math.round(g.getHookEscapeChance(selected) * 100) + '%，成功失去一层</small></span></button>' : '') +
        (releaseCheck.allowed ? '<button type="button" class="action-btn" data-action="release-hook" ' + (controlsLocked ? 'disabled' : '') + '><span class="action-icon">收</span><span class="action-copy"><b>解除钩挂</b><small>结束自身钩挂，消耗本回合行动</small></span></button>' : '') +
        (corpseResume ? '<button type="button" class="action-btn devour" data-action="resume-devour"><span class="action-icon">食</span><span class="action-copy"><b>继续吞食</b><small>消耗本回合，恢复 1 点生命</small></span></button>' : '') +
        (targets.length ? '<div class="action-btn attack" style="cursor:default"><span class="action-icon">⚔</span><span class="action-copy"><b>攻击 · ' + targets.length + ' 个目标</b><small>点击棋盘上红色高亮的敌人</small></span><span class="action-key">相邻</span></div>' : '') +
      '</div>' +
      '<div class="facing-control"><span class="facing-label">朝向</span><span class="facing-pad">' + facingButtons + '</span><span class="facing-current">' + DIRECTIONS[selected.facing].label + ' · 正面减伤/侧刺判定</span></div>' +
      '<div class="action-footer"><button type="button" class="btn btn-ghost" data-action="end-unit" ' + (done || controlsLocked ? 'disabled' : '') + '>结束该单位</button><button type="button" class="btn btn-primary" data-action="end-turn" ' + (controlsLocked ? 'disabled' : '') + '>结束回合</button></div>' +
      '<div class="cooldown-note">' + (skill.ready ? '技能已就绪' : skill.reason) + ' · 每回合结束恢复护甲</div>';
    els.actionPanel.innerHTML = html;
  }


  function renderDeployActions(selected) {
    var g = state.game;
    var online = state.mode === 'online';
    var meReady = !!(online && state.online.room && state.online.room.deployReady && state.online.room.deployReady[state.online.team]);
    var oppTeam = state.online.team === 'blue' ? 'red' : 'blue';
    var oppReady = !!(online && state.online.room && state.online.room.deployReady && state.online.room.deployReady[oppTeam]);
    var opp = online ? onlinePlayer(oppTeam) : null;
    var canEdit = selected && canDeployUnit(selected) && !state.busy;
    var facingButtons = FACING_ORDER.map(function (dir) {
      return '<button type="button" data-facing="' + dir + '" class="' + (selected && selected.facing === dir ? 'active' : '') + '"' + (!canEdit ? ' disabled' : '') + ' title="朝向' + DIRECTIONS[dir].label + '">' + DIRECTIONS[dir].symbol + '</button>';
    }).join('');
    var note = '';
    if (online && meReady) note = '你的布阵已提交，等待对手完成。';
    else if (online) note = '点击你的恐龙，再点高亮格预览整只恐龙的落位；确认后放置。双方都提交后自动开战。';
    else if (state.mode === 'pvp') note = '双方可分别调整自己半场；点击高亮格预览整只恐龙落位，确认后放置。';
    else note = '点击蓝色恐龙，在本方半场选择高亮格预览整只恐龙落位；红色为敌方自动布阵。';
    if (selected && !canDeployUnit(selected) && selected.alive) note += ' 当前选中的是观察单位。';

    var actionButton = '';
    if (online) {
      actionButton = '<button type="button" class="btn ' + (meReady ? 'btn-ghost' : 'btn-primary') + '" data-action="deploy-ready">' + (meReady ? '取消布阵完成' : '布阵完成') + '</button>';
    } else {
      actionButton = '<button type="button" class="btn btn-primary" data-action="deploy-start">开始战斗</button>';
    }
    var status = '';
    if (online) {
      status = '<div class="deploy-status">' +
        '<span class="status-chip ' + (meReady ? 'guard' : '') + '">你：' + (meReady ? '已提交' : '布阵中') + '</span>' +
        '<span class="status-chip ' + (oppReady ? 'guard' : '') + '">' + escapeHtml(opp ? opp.name : '对手') + '：' + (oppReady ? '已提交' : '布阵中') + '</span>' +
      '</div>';
    }
    var preview = state.deployPreview;
    var previewBlock = '';
    if (preview && canEdit) {
      previewBlock = '<div class="deploy-preview">' +
        '<div class="deploy-preview-copy"><strong>落位预览</strong><span>虚线框是整只恐龙将占据的格子</span></div>' +
        '<div class="deploy-preview-actions">' +
          '<button type="button" class="btn btn-primary" data-action="deploy-confirm">确认放置</button>' +
          '<button type="button" class="btn btn-ghost" data-action="deploy-cancel-preview">取消</button>' +
        '</div>' +
      '</div>';
    }
    var html = '<div class="action-head"><strong>布阵阶段</strong><span>DEPLOY</span></div>' +
      '<p class="action-note">' + note + '</p>' +
      status +
      previewBlock +
      (selected ? '<div class="deploy-selected"><span class="dino-icon">' + dinoSvg(selected.type) + '</span><strong>' + selected.name + '</strong><small>' + DIRECTIONS[selected.facing].label + ' · 生命 ' + fmt(selected.hp) + ' · 护甲 ' + fmt(selected.armor) + '</small></div>' : '') +
      '<div class="facing-control"><span class="facing-label">朝向</span><span class="facing-pad">' + facingButtons + '</span><span class="facing-current">选择恐龙后可调整</span></div>' +
      '<div class="action-footer deploy-actions">' + actionButton + '</div>' +
      '<div class="cooldown-note">布阵阶段不消耗行动力；进入战斗后按正常回合进行</div>';
    els.actionPanel.innerHTML = html;
  }

  function canResumeDevour(unit) {
    if (!unit.status.devour || unit.status.devour.active || unit.hp < 4) return false;
    for (var i = 0; i < state.game.corpses.length; i++) {
      var c = state.game.corpses[i];
      if (c.id === unit.status.devour.corpseId && E.distance(unit, c) <= 1) return true;
    }
    return false;
  }

  function updateLogMeta() {
    if (!state.game) return;
    els.logMeta.textContent = state.game.phase === 'deploy' ? 'DEPLOY' : 'ROUND ' + String(state.game.round).padStart(2, '0');
  }

  /* ---------------- 事件 / 日志 ---------------- */
  function appendEvents(events) {
    if (!events || !events.length) return;
    events.forEach(function (ev) {
      if (ev.type !== 'log' || !ev.text) return;
      addLog(ev.text, ev.tone);
    });
    updateLogMeta();
    setTimeout(function () { els.logList.scrollTop = els.logList.scrollHeight; }, 20);
  }

  function addLog(text, tone) {
    var line = document.createElement('div');
    line.className = 'log-line ' + (tone || 'system');
    line.textContent = text;
    els.logList.appendChild(line);
    state.logCount += 1;
    while (els.logList.children.length > 160) els.logList.removeChild(els.logList.firstChild);
  }

  async function perform(action, opts) {
    opts = opts || {};
    if (state.busy || !state.game) return null;
    state.busy = true;
    var epoch = state.epoch;
    var result;
    try {
      result = action();
    } catch (err) {
      console.error(err);
      result = { ok: false, error: '行动执行失败。' };
    }
    if (!result || !result.ok) {
      state.busy = false;
      toast(result && result.error ? result.error : '无法执行该行动');
      renderAll();
      return result;
    }
    appendEvents(result.events);
    renderAll();
    await playEvents(result.events);
    if (epoch !== state.epoch) return result;
    state.busy = false;
    if (state.game.phase === 'gameover') {
      setTimeout(showResult, 480);
      return result;
    }
    if (opts.turnEnd) {
      state.selectedId = null;
      state.skillMode = null;
    }
    if (isHumanTurn()) autoSelectForTurn();
    renderAll();
    scheduleAI();
    return result;
  }


  /* ---------------- 联网对战客户端 ---------------- */
  function actionToFunction(action) {
    var g = state.game;
    if (!g || !action) return null;
    switch (action.type) {
      case 'move': return function () { return g.moveUnit(action.unitId, action.x, action.y); };
      case 'attack': return function () { return g.attack(action.unitId, action.targetId); };
      case 'skill': return function () { return g.useSkill(action.unitId, action.targetId); };
      case 'rotate': return function () { return g.rotateUnit(action.unitId, action.facing); };
      case 'endUnit': return function () { return g.endUnit(action.unitId); };
      case 'endTurn': return function () { return g.endTeamTurn(); };
      case 'resumeDevour': return function () { return g.resumeDevour(action.unitId); };
      case 'releaseHook': return function () { return g.releaseHook(action.unitId); };
      case 'escapeHook': return function () { return g.escapeHook(action.unitId); };
      default: return null;
    }
  }

  function submitAction(action, opts) {
    if (state.mode === 'online') {
      submitOnlineAction(action, opts);
      return;
    }
    var fn = actionToFunction(action);
    if (!fn) { toast('未知行动'); return; }
    perform(fn, opts);
  }

  function submitOnlineAction(action, opts) {
    if (!state.game || state.game.phase !== 'battle' || state.busy || !isHumanTurn()) return;
    if (!state.online.connected || !state.online.socket || state.online.socket.readyState !== 1) {
      toast('连接尚未恢复，请稍候');
      return;
    }
    state.busy = true;
    state.online.pending = true;
    state.skillMode = null;
    renderAll();
    sendRaw({ type: 'action', action: action });
    clearTimeout(state.online.actionTimer);
    state.online.actionTimer = setTimeout(function () {
      if (!state.online.pending) return;
      state.online.pending = false;
      state.busy = false;
      toast('服务器响应超时，请重试');
      renderAll();
    }, 9000);
  }

  function isStaticOnlyHost() {
    return /(^|\.)github\.io$/i.test(location.hostname);
  }

  function onlineAvailable() {
    if (isStaticOnlyHost()) return false;
    return location.protocol === 'http:' || location.protocol === 'https:';
  }

  function initOnlineDefaults() {
    try { state.online.testMode = new URLSearchParams(location.search).get('test') === '1'; } catch (err) {}
    var savedName = '';
    if (!state.online.testMode) {
      try { savedName = localStorage.getItem('dino-online-name') || ''; } catch (err) {}
    }
    state.online.name = savedName || '驯龙师';
    if (els.onlineName) els.onlineName.value = state.online.name;

    var session = readOnlineSession();
    if (session) {
      state.online.code = session.code;
      state.online.token = session.token;
    }
    var roomParam = null;
    try { roomParam = new URLSearchParams(location.search).get('room'); } catch (err) {}
    if (roomParam) {
      state.online.presetRoom = String(roomParam).toUpperCase().slice(0, 5);
      // 邀请链接指向另一个房间时，丢弃当前标签页里不相关的旧会话。
      if (state.online.code && state.online.code !== state.online.presetRoom) {
        state.online.code = null;
        state.online.token = null;
        state.online.team = null;
        clearOnlineSession();
      }
    }
    if (!state.online.lineupCounts) state.online.lineupCounts = defaultCountsForTeam('blue');
  }

  function readOnlineSession() {
    if (state.online.testMode) return null;
    try {
      // 清理旧版共享会话，避免升级后仍被旧房间劫持。
      localStorage.removeItem('dino-online-session');
      var raw = sessionStorage.getItem('dino-online-session');
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (s && s.code && s.token) return s;
    } catch (err) {}
    return null;
  }

  function writeOnlineSession() {
    if (state.online.testMode) return;
    try {
      // sessionStorage 按标签页隔离：同浏览器双标签不会互相顶号。
      sessionStorage.setItem('dino-online-session', JSON.stringify({ code: state.online.code, token: state.online.token }));
    } catch (err) {}
  }

  function clearOnlineSession() {
    if (state.online.testMode) return;
    try { sessionStorage.removeItem('dino-online-session'); } catch (err) {}
    try { localStorage.removeItem('dino-online-session'); } catch (err) {}
  }

  function defaultCountsForTeam(team) {
    var src = team === 'red' ? DEFAULT_SETUP.red : DEFAULT_SETUP.blue;
    var counts = {};
    ORDER.forEach(function (type) { counts[type] = src[type] || 0; });
    return counts;
  }

  function countsFromLineup(lineup) {
    var counts = {};
    ORDER.forEach(function (type) { counts[type] = 0; });
    (lineup || []).forEach(function (type) { if (counts[type] !== undefined) counts[type] += 1; });
    return counts;
  }

  function updateStartCTA() {
    if (!els.btnStart) return;
    var label = state.mode === 'online' ? '进入联机大厅 <span>↗</span>' : '进入战场 <span>→</span>';
    els.btnStart.innerHTML = label;
    if (els.btnStartBottom) els.btnStartBottom.innerHTML = label;
    if (state.mode === 'online') {
      if (!onlineAvailable()) {
        els.btnStart.disabled = true;
        if (els.btnStartBottom) els.btnStartBottom.disabled = true;
        if (els.startWarning) els.startWarning.textContent = '联机模式需要通过 node server.js 打开';
      } else if (!state.online.token && !state.online.code) {
        els.btnStart.disabled = false;
        if (els.btnStartBottom) els.btnStartBottom.disabled = false;
      }
    }
  }

  function handleStartPressed() {
    if (state.mode === 'online') {
      if (!onlineAvailable()) { toast('联网对战需要通过 node server.js 启动'); return; }
      openOnlineLobby();
      return;
    }
    startGame();
  }

  function openOnlineLobby() {
    if (!onlineAvailable()) { toast('联网对战需要通过 node server.js 启动'); return; }
    state.mode = 'online';
    state.online.intentional = false;
    if (els.onlineName) els.onlineName.value = state.online.name || '驯龙师';
    if (state.online.presetRoom && els.onlineCode) els.onlineCode.value = state.online.presetRoom;
    else if (state.online.code && !els.onlineCode.value) els.onlineCode.value = state.online.code;
    els.startScreen.classList.add('hidden');
    els.battleApp.classList.add('hidden');
    els.gameOver.classList.add('hidden');
    els.onlineLobby.classList.remove('hidden');
    els.onlineReconnect.classList.add('hidden');
    renderOnlineLobby();
    connectOnline();
  }

  function closeOnlineLobby() {
    if (state.online.code) {
      toast('请先点击「离开房间」');
      return;
    }
    resetOnlineConnection();
    els.onlineLobby.classList.add('hidden');
    showStartScreen();
  }

  function exitOnlineToStart(sendLeave) {
    if (sendLeave && state.online.code && state.online.socket && state.online.socket.readyState === 1) {
      sendRaw({ type: 'leave' });
    }
    resetOnlineConnection();
    els.onlineLobby.classList.add('hidden');
    els.onlineReconnect.classList.add('hidden');
    showStartScreen();
  }

  function resetOnlineConnection() {
    state.online.intentional = true;
    state.online.connected = false;
    state.online.status = 'idle';
    state.online.pending = false;
    clearTimeout(state.online.reconnectTimer);
    clearTimeout(state.online.actionTimer);
    state.online.reconnectTimer = null;
    state.online.actionTimer = null;
    if (state.online.socket) {
      try { state.online.socket.close(); } catch (err) {}
    }
    state.online.socket = null;
    state.online.room = null;
    state.online.code = null;
    state.online.token = null;
    state.online.team = null;
    state.online.rematch = null;
    state.online.pendingQueue = [];
    state.online.reconnectAttempts = 0;
    state.online.queue = Promise.resolve();
    state.online.lastVersion = 0;
    state.online.presetRoom = null;
    clearOnlineSession();
  }

  function connectOnline() {
    if (!onlineAvailable()) return;
    if (state.online.socket && (state.online.socket.readyState === 0 || state.online.socket.readyState === 1)) return;
    clearTimeout(state.online.reconnectTimer);
    state.online.intentional = false;
    state.online.status = 'connecting';
    state.online.connected = false;
    renderOnlineLobby();
    var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var ws;
    try {
      ws = new WebSocket(protocol + '//' + location.host + '/ws');
    } catch (err) {
      state.online.status = 'error';
      renderOnlineLobby();
      return;
    }
    state.online.socket = ws;
    ws.onopen = function () {
      if (state.online.socket !== ws) return;
      state.online.connected = true;
      state.online.status = 'connected';
      state.online.reconnectAttempts = 0;
      if (state.online.token && state.online.code) {
        state.online.status = 'reconnecting';
        sendRaw({ type: 'reconnect', code: state.online.code, token: state.online.token });
      } else {
        flushOnlineQueue();
      }
      renderOnlineLobby();
      if (state.game) renderAll();
    };
    ws.onmessage = function (event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch (err) { return; }
      handleOnlineMessage(msg);
    };
    ws.onerror = function () {
      if (!state.online.connected) state.online.status = 'error';
      renderOnlineLobby();
    };
    ws.onclose = function () {
      if (state.online.socket !== ws) return;
      state.online.socket = null;
      state.online.connected = false;
      state.online.pending = false;
      state.busy = false;
      clearTimeout(state.online.actionTimer);
      if (state.online.intentional) return;
      state.online.status = 'reconnecting';
      if (state.game && state.game.phase === 'battle') { toast('连接断开，正在重连…'); renderAll(); }
      renderOnlineLobby();
      if (state.online.code || state.online.token) scheduleOnlineReconnect();
    };
  }

  function scheduleOnlineReconnect() {
    if (state.online.intentional) return;
    state.online.reconnectAttempts += 1;
    if (state.online.reconnectAttempts > 8) {
      // 放弃无法恢复的旧会话，回到新建/加入房间界面。
      state.online.code = null;
      state.online.token = null;
      state.online.team = null;
      state.online.room = null;
      clearOnlineSession();
      state.online.status = 'error';
      state.online.reconnectAttempts = 0;
      if (state.game) {
        state.game = null;
        els.battleApp.classList.add('hidden');
        els.gameOver.classList.add('hidden');
        els.onlineLobby.classList.remove('hidden');
        state.mode = 'online';
      }
      renderOnlineLobby();
      toast('无法连接服务器，请稍后刷新重试');
      return;
    }
    clearTimeout(state.online.reconnectTimer);
    state.online.reconnectTimer = setTimeout(function () {
      if (state.online.intentional) return;
      connectOnline();
    }, Math.min(6000, 900 * state.online.reconnectAttempts));
  }

  function sendRaw(payload) {
    if (!state.online.socket || state.online.socket.readyState !== 1) return false;
    try {
      state.online.socket.send(JSON.stringify(payload));
      return true;
    } catch (err) { return false; }
  }

  function sendOnline(payload) {
    if (sendRaw(payload)) return true;
    state.online.pendingQueue.push(payload);
    connectOnline();
    return false;
  }

  function flushOnlineQueue() {
    var queue = state.online.pendingQueue.slice();
    state.online.pendingQueue = [];
    queue.forEach(function (payload) { sendRaw(payload); });
  }


  function confirmDeployPreview() {
    if (!state.game || state.game.phase !== 'deploy' || state.busy) return;
    var unit = state.game.getUnit(state.selectedId);
    var p = state.deployPreview;
    if (!unit || !canDeployUnit(unit) || !p) return;
    var cells = state.game.getDeployCells(unit);
    if (!cells.some(function (c) { return c.x === p.x && c.y === p.y; })) {
      state.deployPreview = null;
      state.deployHover = null;
      renderAll();
      toast('该落点已不可用，请重新选择');
      return;
    }
    var target = { x: p.x, y: p.y };
    state.deployPreview = null;
    state.deployHover = null;
    submitDeployAction({ type: 'deployMove', unitId: unit.id, x: target.x, y: target.y });
  }

  function submitDeployAction(action) {
    if (!state.game || state.game.phase !== 'deploy') return;
    if (state.busy) return;
    var unit = state.game.getUnit(action.unitId);
    if (!canDeployUnit(unit)) return;
    if (state.mode === 'online') {
      if (!state.online.connected || !state.online.socket || state.online.socket.readyState !== 1) {
        toast('连接尚未恢复，请稍候');
        return;
      }
      state.busy = true;
      state.online.pending = true;
      renderAll();
      sendRaw({ type: 'action', action: action });
      clearTimeout(state.online.actionTimer);
      state.online.actionTimer = setTimeout(function () {
        if (!state.online.pending) return;
        state.online.pending = false;
        state.busy = false;
        toast('服务器响应超时，请重试');
        renderAll();
      }, 9000);
      return;
    }
    perform(function () {
      if (action.type === 'deployMove') return state.game.deployMove(action.unitId, action.x, action.y);
      if (action.type === 'deployRotate') return state.game.deployRotate(action.unitId, action.facing);
      return { ok: false, error: '未知布阵操作。', events: [] };
    });
  }

  function startLocalBattle() {
    if (!state.game || state.game.phase !== 'deploy' || state.mode === 'online') return;
    state.skillMode = null;
    state.deployPreview = null;
    state.deployHover = null;
    perform(function () { return state.game.beginBattle(); });
  }

  function toggleDeployReady() {
    if (state.mode !== 'online' || !state.game || state.game.phase !== 'deploy' || !state.online.room) return;
    state.deployPreview = null;
    state.deployHover = null;
    var current = !!(state.online.room.deployReady && state.online.room.deployReady[state.online.team]);
    sendOnline({ type: 'deploy-ready', ready: !current });
  }

  function createOnlineRoom() {
    if (!state.online.connected) { toast('正在连接服务器…'); connectOnline(); return; }
    if (state.online.code) return;
    var name = (els.onlineName.value || '').trim() || '驯龙师';
    state.online.name = name;
    if (!state.online.testMode) { try { localStorage.setItem('dino-online-name', name); } catch (err) {} }
    var lineup = lineupOf(state.setup.blue);
    if (capacityOf(state.setup.blue) <= 0) lineup = ['trike', 'stego', 'anky'];
    sendOnline({ type: 'create', name: name, lineup: lineup });
    state.online.lineupCounts = countsFromLineup(lineup);
    els.onlineConnectHint.textContent = '正在创建房间…';
    els.onlineConnectHint.className = 'online-hint';
  }

  function joinOnlineRoom() {
    if (!state.online.connected) { toast('正在连接服务器…'); connectOnline(); return; }
    if (state.online.code) return;
    var code = (els.onlineCode.value || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) { toast('请输入 5 位房间码'); return; }
    var name = (els.onlineName.value || '').trim() || '驯龙师';
    state.online.name = name;
    if (!state.online.testMode) { try { localStorage.setItem('dino-online-name', name); } catch (err) {} }
    var lineup = lineupOf(state.setup.red);
    if (capacityOf(state.setup.red) <= 0) lineup = ['trex', 'leso'];
    sendOnline({ type: 'join', code: code, name: name, lineup: lineup });
    state.online.lineupCounts = countsFromLineup(lineup);
    els.onlineConnectHint.textContent = '正在加入房间…';
    els.onlineConnectHint.className = 'online-hint';
  }

  function leaveOnlineRoom() {
    exitOnlineToStart(true);
  }

  function setOnlineLineup(counts, send) {
    state.online.lineupCounts = cloneSetup({ blue: counts, red: counts }).blue;
    if (send && state.online.room && state.online.room.phase === 'lobby') {
      sendOnline({ type: 'update-lineup', lineup: lineupOf(state.online.lineupCounts) });
    }
    renderOnlineLobby();
  }

  function onOnlineLineupClick(e) {
    var btn = e.target.closest('button[data-online-type]');
    if (!btn) return;
    if (!state.online.room || state.online.room.phase !== 'lobby') return;
    var type = btn.dataset.onlineType;
    var action = btn.dataset.onlineAction;
    var counts = state.online.lineupCounts || defaultCountsForTeam(state.online.team || 'blue');
    if (action === 'inc') {
      if (capacityOf(counts) + SPECIES[type].size <= E.TEAM_CAPACITY) counts[type] += 1;
    } else if (action === 'dec') {
      if (counts[type] > 0) counts[type] -= 1;
    }
    Sound.click();
    setOnlineLineup(counts, true);
  }

  function toggleOnlineReady() {
    if (!state.online.room || state.online.room.phase !== 'lobby') return;
    var me = onlinePlayer(state.online.team);
    if (!me) return;
    var valid = capacityOf(state.online.lineupCounts) > 0;
    if (!valid) { toast('至少需要一只恐龙'); return; }
    sendOnline({ type: 'ready', ready: !me.ready });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制'); }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('已复制');
    } catch (err) { toast('复制失败，请手动选择'); }
  }

  function copyRoomCode() {
    if (state.online.code) copyText(state.online.code);
  }

  function copyInviteLink() {
    if (!state.online.code) return;
    var url = new URL(location.href);
    url.search = '?room=' + state.online.code;
    url.hash = '';
    copyText(url.toString());
  }


  function handleOnlineMessage(msg) {
    if (!msg || !msg.type) return;
    state.online.debugMessages.push({ type: msg.type, at: Date.now(), room: !!(msg.room || msg.state) });
    if (state.online.debugMessages.length > 50) state.online.debugMessages.shift();
    if (msg.type === 'welcome') {
      if (state.online.status === 'connecting' && !state.online.code) renderOnlineLobby();
      return;
    }
    if (msg.type === 'session') {
      state.online.code = msg.code;
      state.online.token = msg.token;
      state.online.team = msg.team;
      state.online.name = msg.name || state.online.name;
      state.online.connected = true;
      writeOnlineSession();
      if (els.onlineName) els.onlineName.value = state.online.name;
      state.online.presetRoom = msg.code;
      renderOnlineLobby();
      return;
    }
    if (msg.type === 'lobby') {
      handleOnlineLobby(msg);
      return;
    }
    if (msg.type === 'started') {
      startOnlineBattle(msg, false);
      return;
    }
    if (msg.type === 'resume') {
      startOnlineBattle(msg, true);
      return;
    }
    if (msg.type === 'state') {
      enqueueOnlineState(msg);
      return;
    }
    if (msg.type === 'presence') {
      var oldRoom = state.online.room;
      var oldOpp = oldRoom && onlinePlayer(state.online.team === 'blue' ? 'red' : 'blue');
      var oldConnected = oldOpp ? oldOpp.connected : null;
      state.online.room = msg.room;
      var newOpp = onlinePlayer(state.online.team === 'blue' ? 'red' : 'blue');
      if (newOpp && oldConnected === true && !newOpp.connected) toast('对手已掉线，等待重连…');
      if (newOpp && oldConnected === false && newOpp.connected) toast('对手已重新连接');
      if (state.game) renderAll(); else renderOnlineLobby();
      return;
    }
    if (msg.type === 'rematch') {
      state.online.rematch = msg.rematch || null;
      renderRematchStatus();
      return;
    }
    if (msg.type === 'error') {
      handleOnlineError(msg.message || '联网操作失败');
      return;
    }
    if (msg.type === 'room-closed') {
      handleRoomClosed(msg.reason || '房间已关闭。');
      return;
    }
    if (msg.type === 'chat') {
      addLog('【聊天】' + msg.name + '：' + msg.text, 'system');
      return;
    }
    if (msg.type === 'pong') return;
  }

  function handleOnlineLobby(msg) {
    state.online.room = msg.room;
    state.online.team = msg.yourTeam || state.online.team;
    state.online.status = 'lobby';
    state.online.connected = true;
    state.online.pending = false;
    clearTimeout(state.online.actionTimer);
    var me = onlinePlayer(state.online.team);
    if (me) state.online.lineupCounts = countsFromLineup(me.lineup);
    state.mode = 'online';
    state.online.rematch = null;
    state.game = null;
    state.busy = false;
    state.started = false;
    state.selectedId = null;
    state.skillMode = null;
    els.startScreen.classList.add('hidden');
    els.battleApp.classList.add('hidden');
    els.gameOver.classList.add('hidden');
    els.onlineLobby.classList.remove('hidden');
    els.onlineReconnect.classList.add('hidden');
    renderOnlineLobby();
  }

  function startOnlineBattle(msg, resume) {
    if (!msg || !msg.state) return;
    if (!state.online.team) state.online.team = msg.yourTeam;
    state.online.team = msg.yourTeam || state.online.team;
    state.online.room = msg.room || state.online.room;
    state.online.connected = true;
    state.online.status = msg.state.phase === 'gameover' ? 'finished' : 'playing';
    state.online.pending = false;
    state.online.lastVersion = msg.version || 0;
    state.online.rematch = null;
    clearTimeout(state.online.actionTimer);
    state.mode = 'online';
    state.epoch += 1;
    state.busy = false;
    state.aiBusy = false;
    state.selectedId = null;
    state.deployPreview = null;
    state.deployHover = null;
    state.skillMode = null;
    state.started = true;
    state.game = E.Game.fromSnapshot(msg.state);
    els.startScreen.classList.add('hidden');
    els.onlineLobby.classList.add('hidden');
    els.gameOver.classList.add('hidden');
    els.battleApp.classList.remove('hidden');
    els.logList.innerHTML = '';
    state.logCount = 0;
    els.tokenLayer.innerHTML = '';
    els.corpseLayer.innerHTML = '';
    els.effectLayer.innerHTML = '';
    if (resume) appendEvents(msg.log || []);
    else appendEvents(msg.events || []);
    autoSelectForTurn();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (state.game.phase !== 'gameover') afterBoardShown();
    if (state.game.phase === 'deploy' && !resume) toast('布阵阶段 · 布置你的恐龙');
    else if (resume) toast('已恢复联网对局');
    if (state.game.phase === 'gameover') setTimeout(showResult, 500);
  }

  function enqueueOnlineState(msg) {
    state.online.queue = state.online.queue.then(function () {
      return applyOnlineState(msg);
    }).catch(function (err) {
      console.error(err);
      state.busy = false;
      state.online.pending = false;
      clearTimeout(state.online.actionTimer);
      toast('同步战局失败，请刷新页面重连');
    });
  }

  async function applyOnlineState(msg) {
    if (!msg || !msg.state) return;
    if (msg.version && state.online.lastVersion && msg.version < state.online.lastVersion) return;
    if (!state.game) {
      startOnlineBattle(msg, false);
      return;
    }
    state.busy = true;
    state.online.pending = false;
    state.online.connected = true;
    if (msg.room) state.online.room = msg.room;
    if (msg.yourTeam) state.online.team = msg.yourTeam;
    clearTimeout(state.online.actionTimer);
    state.online.lastVersion = msg.version || state.online.lastVersion;
    state.game = E.Game.fromSnapshot(msg.state);
    var sel = state.game.getUnit(state.selectedId);
    if (!sel || !sel.alive) state.selectedId = null;
    appendEvents(msg.events || []);
    renderAll();
    await playEvents(msg.events || []);
    state.busy = false;
    if (state.game.phase === 'gameover') {
      state.online.status = 'finished';
      showResult();
      return;
    }
    autoSelectForTurn();
    renderAll();
  }

  function handleOnlineError(message) {
    state.busy = false;
    state.online.pending = false;
    clearTimeout(state.online.actionTimer);
    if (!state.online.room && els.onlineConnectHint) {
      els.onlineConnectHint.textContent = message;
      els.onlineConnectHint.className = 'online-hint error';
    } else if (els.onlineRoomHint) {
      els.onlineRoomHint.textContent = message;
      els.onlineRoomHint.className = 'online-hint error';
    }
    toast(message);
    if (/房间已不存在|身份已失效|无法恢复/.test(message)) {
      clearOnlineSession();
      state.online.code = null;
      state.online.token = null;
      state.online.team = null;
      state.online.room = null;
      state.online.status = 'idle';
      if (state.game) {
        state.game = null;
        els.battleApp.classList.add('hidden');
        els.gameOver.classList.add('hidden');
        els.onlineLobby.classList.remove('hidden');
      } else {
        els.onlineLobby.classList.remove('hidden');
      }
      state.mode = 'online';
      renderOnlineLobby();
    } else {
      renderAll();
    }
  }

  function handleRoomClosed(reason) {
    toast(reason);
    clearOnlineSession();
    state.online.code = null;
    state.online.token = null;
    state.online.team = null;
    state.online.room = null;
    state.online.rematch = null;
    state.online.status = 'idle';
    state.online.pending = false;
    state.game = null;
    state.started = false;
    state.mode = 'online';
    els.battleApp.classList.add('hidden');
    els.gameOver.classList.add('hidden');
    els.startScreen.classList.add('hidden');
    els.onlineLobby.classList.remove('hidden');
    els.onlineReconnect.classList.add('hidden');
    renderOnlineLobby();
  }

  function renderOnlineLobby() {
    if (!els.onlineLobby || els.onlineLobby.classList.contains('hidden')) return;
    var room = state.online.room;
    var hasRoom = !!(room && (room.phase === 'lobby' || state.online.status === 'lobby' || state.online.status === 'reconnecting' || state.online.status === 'finished'));
    if (hasRoom) {
      els.onlineConnect.classList.add('hidden');
      els.onlineRoomPanel.classList.remove('hidden');
      renderOnlineRoom(room);
    } else {
      els.onlineConnect.classList.remove('hidden');
      els.onlineRoomPanel.classList.add('hidden');
      renderOnlineConnect();
    }
    var reconnecting = state.online.status === 'reconnecting';
    els.onlineReconnect.classList.toggle('hidden', !reconnecting);
  }

  function renderOnlineConnect() {
    if (els.onlineName && document.activeElement !== els.onlineName) {
      els.onlineName.value = state.online.name || '驯龙师';
    }
    if (els.onlineCode && !els.onlineCode.value) {
      els.onlineCode.value = state.online.presetRoom || state.online.code || '';
    }
    var hint = '正在连接服务器…';
    var hintClass = 'online-hint';
    if (state.online.status === 'connected' || state.online.status === 'lobby') {
      hint = '服务器已连接。创建房间或输入朋友的房间码。';
      hintClass = 'online-hint ok';
    } else if (state.online.status === 'reconnecting') {
      hint = '连接断开，正在恢复…';
    } else if (state.online.status === 'error') {
      hint = '无法连接服务器。联网模式需要运行 node server.js。';
      hintClass = 'online-hint error';
    }
    if (els.onlineConnectHint && !/正在创建|正在加入/.test(els.onlineConnectHint.textContent)) {
      els.onlineConnectHint.textContent = hint;
      els.onlineConnectHint.className = hintClass;
    }
    var can = !state.online.code;
    els.btnCreateRoom.disabled = !can;
    els.btnJoinRoom.disabled = !can;
    els.onlineCode.disabled = !can;
    els.onlineName.disabled = state.online.status === 'reconnecting';
  }

  function renderOnlineRoom(room) {
    if (!room) return;
    els.onlineRoomCode.textContent = room.code;
    var online = state.online.connected && state.online.status !== 'reconnecting';
    els.onlineConnState.className = 'online-state' + (online ? '' : ' offline');
    els.onlineConnState.innerHTML = '<i></i>' + (online ? '已连接' : '重连中');

    var html = '';
    ['blue', 'red'].forEach(function (team) {
      var p = null;
      for (var i = 0; i < room.players.length; i++) if (room.players[i].team === team) p = room.players[i];
      if (!p || p.empty) {
        html += '<div class="room-player empty ' + team + '"><div class="rp-head"><span class="rp-faction">' + (team === 'blue' ? '❖' : '✦') + '</span><span class="rp-name"><strong>等待玩家加入</strong><span>' + (team === 'blue' ? '苍林盟约' : '赤焰部族') + '</span></span></div><div class="rp-empty">把房间码发给朋友，对方即可加入。</div></div>';
        return;
      }
      var units = p.lineup.map(function (type) {
        return '<span class="rp-unit"><span class="dino-icon">' + dinoSvg(type) + '</span>' + SPECIES[type].name + '</span>';
      }).join('');
      html += '<div class="room-player ' + team + '">' +
        '<div class="rp-head"><span class="rp-faction">' + (team === 'blue' ? '❖' : '✦') + '</span><span class="rp-name"><strong>' + escapeHtml(p.name) + '</strong><span>' + (team === 'blue' ? '苍林盟约' : '赤焰部族') + ' · 容量 ' + p.capacity + '/6</span></span>' +
        '<span class="rp-ready ' + (!p.connected ? 'off' : p.ready ? 'on' : '') + '">' + (!p.connected ? '掉线' : p.ready ? '已准备' : '未准备') + '</span></div>' +
        '<div class="rp-lineup">' + units + '</div>' +
        (p.team === state.online.team ? '<span class="rp-you">YOU</span>' : '') +
      '</div>';
    });
    els.roomPlayers.innerHTML = html;

    var me = onlinePlayer(state.online.team);
    var other = onlinePlayer(state.online.team === 'blue' ? 'red' : 'blue');
    var cap = capacityOf(state.online.lineupCounts || defaultCountsForTeam(state.online.team || 'blue'));
    els.onlineCap.textContent = cap + '/6';
    renderOnlineLineup();
    var meReady = !!(me && me.ready);
    if (meReady) {
      // 已准备时始终允许取消，哪怕对手掉线。
      els.btnReady.disabled = !online;
    } else {
      els.btnReady.disabled = !online || !me || !other || !other.connected || cap <= 0;
    }
    els.btnReady.textContent = meReady ? '取消准备' : '准备';
    if (meReady) els.btnReady.classList.add('btn-ready-on'); else els.btnReady.classList.remove('btn-ready-on');
    var hint = '';
    if (state.online.status === 'reconnecting') hint = '连接已断开，正在重连……';
    else if (!other) hint = '等待朋友加入房间。把房间码或邀请链接发给对方。';
    else if (!other.connected) hint = '对手已掉线，等待重新连接……' + (meReady ? ' 可点击「取消准备」。' : '');
    else if (me && me.ready && other.ready) hint = '双方已准备，正在进入战场……';
    else if (me && me.ready) hint = '已准备。等待对手点击准备。';
    else hint = '双方都准备好后，房间会自动开始对战。';
    els.onlineRoomHint.textContent = hint;
    els.onlineRoomHint.className = 'online-hint' + (state.online.status === 'reconnecting' || (other && !other.connected) ? ' error' : '');
  }

  function renderOnlineLineup() {
    var counts = state.online.lineupCounts || defaultCountsForTeam(state.online.team || 'blue');
    var cap = capacityOf(counts);
    var team = state.online.team || 'blue';
    var info = TEAM_INFO[team];
    var disabled = !state.online.connected || state.online.status === 'reconnecting' || !state.online.room || state.online.room.phase !== 'lobby';
    var html = '<div class="build-team ' + team + '">';
    html += '<div class="build-team-head"><span class="faction-dot"></span><strong>' + info.name + '</strong><span class="capacity-line"><span class="cap-track"><span class="cap-fill" style="width:' + Math.min(100, cap / 6 * 100) + '%"></span></span><span class="cap-text">' + cap + '/6</span></span></div>';
    ORDER.forEach(function (type) {
      var def = SPECIES[type];
      var count = counts[type];
      var canAdd = cap + def.size <= E.TEAM_CAPACITY;
      html += '<div class="build-unit">' +
        '<span class="mini-icon"><span class="dino-icon">' + dinoSvg(type) + '</span></span>' +
        '<span class="unit-meta"><strong>' + def.name + ' <span class="size-badge">占 ' + def.size + ' 格</span></strong><small>' + def.role + ' · HP ' + def.hp + ' / 甲 ' + def.armor + ' / 攻 ' + def.attack + ' / 行 ' + def.move + '</small></span>' +
        '<span class="stepper">' +
          '<button type="button" data-online-type="' + type + '" data-online-action="dec"' + (count <= 0 || disabled ? ' disabled' : '') + '>−</button>' +
          '<span>' + count + '</span>' +
          '<button type="button" data-online-type="' + type + '" data-online-action="inc"' + (!canAdd || disabled ? ' disabled' : '') + '>+</button>' +
        '</span></div>';
    });
    html += '</div>';
    els.onlineLineup.innerHTML = html;
    els.onlineCap.textContent = cap + '/6';
    els.btnOnlineDefault.disabled = disabled;
    els.btnOnlineRandom.disabled = disabled;
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  async function playEvents(events) {
    var hits = 0;
    var heals = 0;
    var crits = 0;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.type === 'damage') {
        if (ev.amount > 0) {
          hits += 1;
          var cls = ev.hpDamage === 0 ? 'armor' : '';
          if (ev.kind === 'bleed') cls = 'damage';
          floatAt(ev.x, ev.y, '-' + fmt(ev.amount), cls);
          ringAt(ev.x, ev.y, cls === 'armor' ? 'armor' : 'damage');
          flashToken(ev.unitId, 'hit');
          if (ev.kind === 'bleed') Sound.hit();
          else Sound.hit();
        } else if (ev.armorDamage > 0) {
          floatAt(ev.x, ev.y, '-' + fmt(ev.armorDamage) + ' 甲', 'armor');
          flashToken(ev.unitId, 'hit');
        }
      } else if (ev.type === 'heal') {
        heals += 1;
        floatAt(ev.x, ev.y, '+' + fmt(ev.amount), 'heal');
        ringAt(ev.x, ev.y, 'heal');
        flashToken(ev.unitId, 'healed');
        Sound.heal();
      } else if (ev.type === 'guard') {
        floatAt(ev.x, ev.y, '格挡', 'guard');
        ringAt(ev.x, ev.y, 'guard');
        Sound.guard();
      } else if (ev.type === 'crit') {
        crits += 1;
        var critTarget = state.game && state.game.getUnit(ev.targetId);
        if (critTarget) floatAt(critTarget.x, critTarget.y, '穿刺！', 'crit');
        Sound.crit();
      } else if (ev.type === 'miss') {
        floatAt(ev.x, ev.y, 'MISS', 'guard');
      } else if (ev.type === 'move') {
        flashPath(ev.path || []);
        Sound.move();
      } else if (ev.type === 'hook_created') {
        toast('钩挂已建立');
        Sound.click();
      } else if (ev.type === 'hook_ended') {
        toast(ev.reason === 'expired' ? '钩挂自动解除' : ev.reason === 'escaped' ? '目标摆脱了钩挂' : '钩挂已解除');
        Sound.click();
      } else if (ev.type === 'escape_resolved') {
        toast(ev.success ? '摆脱成功' : '摆脱失败');
        Sound.click();
      } else if (ev.type === 'death') {
        Sound.death();
        if (els.battleApp) {
          els.battleApp.classList.remove('screen-shake');
          void els.battleApp.offsetWidth;
          els.battleApp.classList.add('screen-shake');
        }
      } else if (ev.type === 'gameover') {
        if (state.mode === 'pvp') {
          // PvP 同屏没有单一“我方”，不播放胜利/失败音。
        } else {
          var myTeam = state.mode === 'online' ? state.online.team : 'blue';
          if (ev.winner === 'draw') { /* 平局不播放胜负音 */ }
          else if (ev.winner === myTeam) Sound.victory();
          else Sound.defeat();
        }
      }
    }
    if (hits || crits) {
      els.battleApp.classList.remove('screen-shake');
      void els.battleApp.offsetWidth;
      els.battleApp.classList.add('screen-shake');
      if (crits) {
        els.board.classList.remove('crit-flash');
        void els.board.offsetWidth;
        els.board.classList.add('crit-flash');
      }
    }
    var delay = 180;
    if (hits || heals || crits) delay = Math.min(560, 220 + (hits + heals) * 55);
    if (events.some(function (e) { return e.type === 'gameover'; })) delay += 380;
    await sleep(delay);
  }

  function floatAt(x, y, text, cls) {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    var node = document.createElement('span');
    node.className = 'float-effect ' + (cls || '');
    node.textContent = text;
    node.style.left = ((x + 0.5) / BOARD_SIZE * 100) + '%';
    node.style.top = ((y + 0.3) / BOARD_SIZE * 100) + '%';
    els.effectLayer.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1000);
  }

  function ringAt(x, y, kind) {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    var node = document.createElement('span');
    node.className = 'hit-ring ' + (kind === 'heal' ? 'heal' : '');
    node.style.left = ((x + 0.5) / BOARD_SIZE * 100) + '%';
    node.style.top = ((y + 0.5) / BOARD_SIZE * 100) + '%';
    els.effectLayer.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 520);
  }

  function flashToken(id, cls) {
    if (!id) return;
    var token = els.tokenLayer.querySelector('.token[data-id="' + id + '"]');
    if (!token) return;
    token.classList.remove(cls);
    void token.offsetWidth;
    token.classList.add(cls);
    setTimeout(function () { token.classList.remove(cls); }, 480);
  }

  function flashPath(path) {
    for (var i = 0; i < path.length; i++) {
      var cell = els.grid.querySelector('.cell[data-x="' + path[i].x + '"][data-y="' + path[i].y + '"]');
      if (!cell) continue;
      cell.classList.add('path-trail');
      (function (c) { setTimeout(function () { c.classList.remove('path-trail'); }, 520); })(cell);
    }
  }

  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  /* ---------------- 玩家操作 ---------------- */
  function isDeployPhase() {
    return !!(state.game && state.game.phase === 'deploy');
  }

  function deployTeamControllable(team) {
    if (!isDeployPhase()) return false;
    if (state.mode === 'ai') return team === 'blue';
    if (state.mode === 'pvp') return true;
    if (state.mode === 'online') {
      if (!state.online.connected || state.online.status === 'reconnecting' || team !== state.online.team) return false;
      var room = state.online.room;
      if (room && room.deployReady && room.deployReady[team]) return false;
      return true;
    }
    return false;
  }

  function canDeployUnit(unit) {
    return !!(unit && unit.alive && deployTeamControllable(unit.team));
  }

  function isHumanTurn() {
    if (!state.game || state.game.phase !== 'battle') return false;
    if (state.mode === 'online') {
      return !!state.online.connected && state.online.status !== 'reconnecting' && state.game.activeTeam === state.online.team;
    }
    if (state.mode === 'pvp') return true;
    return state.game.activeTeam === 'blue';
  }

  function onlinePlayer(team) {
    if (!state.online.room || !state.online.room.players) return null;
    for (var i = 0; i < state.online.room.players.length; i++) {
      if (state.online.room.players[i].team === team && !state.online.room.players[i].empty) return state.online.room.players[i];
    }
    return null;
  }

  function autoSelectForTurn() {
    if (!state.game) return;
    if (state.game.phase === 'deploy') {
      var selected = state.game.getUnit(state.selectedId);
      if (!selected || !selected.alive || !canDeployUnit(selected)) {
        var controllable = state.game.units.filter(function (u) { return u.alive && canDeployUnit(u); });
        if (controllable.length) state.selectedId = controllable[0].id;
        else {
          var own = state.game.units.filter(function (u) {
            return u.alive && (state.mode !== 'online' || u.team === state.online.team) && (state.mode !== 'ai' || u.team === 'blue');
          });
          state.selectedId = own.length ? own[0].id : (state.game.units.find(function (u) { return u.alive; }) || {}).id || null;
        }
      }
      return;
    }
    if (!isHumanTurn()) {
      var aiUnits = state.game.getAlive(state.game.activeTeam);
      if (aiUnits.length && (!state.selectedId || !state.game.getUnit(state.selectedId) || !state.game.getUnit(state.selectedId).alive)) {
        state.selectedId = aiUnits[0].id;
      }
      return;
    }
    var active = state.game.getAlive(state.game.activeTeam);
    var selected = state.game.getUnit(state.selectedId);
    var usable = active.filter(function (u) { return !u.turn.done && !(u.status.devour && u.status.devour.active); });
    if (!selected || !selected.alive || selected.team !== state.game.activeTeam || selected.turn.done) {
      state.selectedId = usable.length ? usable[0].id : (active.length ? active[0].id : null);
    }
  }

  function onRosterClick(e) {
    var card = e.target.closest('[data-unit]');
    if (!card) return;
    selectUnit(card.dataset.unit);
  }

  function selectUnit(id) {
    var unit = state.game.getUnit(id);
    if (!unit) return;
    state.selectedId = id;
    state.skillMode = null;
    if (state.game && state.game.phase === 'deploy') {
      state.deployPreview = null;
      state.deployHover = null;
    }
    renderAll();
    Sound.click();
  }

  function onBoardClick(e) {
    if (!state.game || state.busy || (state.game.phase !== 'battle' && state.game.phase !== 'deploy')) return;
    var tokenEl = e.target.closest('.token');
    var cellEl = e.target.closest('.cell');
    var unit = null;
    var x = null;
    var y = null;
    if (tokenEl) {
      unit = state.game.getUnit(tokenEl.dataset.id);
      if (unit) { x = unit.x; y = unit.y; }
    } else if (cellEl) {
      x = Number(cellEl.dataset.x);
      y = Number(cellEl.dataset.y);
      unit = state.game.unitAt(x, y);
    } else {
      return;
    }

    if (state.game.phase === 'deploy') {
      var deploySelected = state.game.getUnit(state.selectedId);
      if (deploySelected && canDeployUnit(deploySelected) && !state.busy) {
        var deployCells = state.game.getDeployCells(deploySelected);
        var canPlace = deployCells.some(function (c) { return c.x === x && c.y === y; });
        if (canPlace) {
          if (state.deployPreview && state.deployPreview.x === x && state.deployPreview.y === y) {
            confirmDeployPreview();
          } else {
            state.deployPreview = { x: x, y: y };
            state.deployHover = null;
            renderAll();
            toast('已预览落位，点击「确认放置」或再次点击该格');
          }
          return;
        }
      }
      if (unit) {
        selectUnit(unit.id);
        return;
      }
      if (!deploySelected || !canDeployUnit(deploySelected) || state.busy) return;
      var hadPreview = !!state.deployPreview;
      if (hadPreview) {
        state.deployPreview = null;
        state.deployHover = null;
        renderAll();
      }
      if (state.game.unitAt(x, y)) {
        toast('该格已被占用');
      } else {
        toast(hadPreview ? '已取消预览：该位置不可放置' : '该位置不可放置');
      }
      return;
    }


    var selectedSelf = state.game.getUnit(state.selectedId);
    if (selectedSelf && isHumanTurn() && state.game.phase === 'battle' &&
      selectedSelf.alive && !selectedSelf.turn.done && !(selectedSelf.status.devour && selectedSelf.status.devour.active)) {
      var moveDest = state.game.findMoveDestinationAt(selectedSelf, x, y);
      if (moveDest) {
        state.skillMode = null;
        submitAction({ type: 'move', unitId: selectedSelf.id, x: moveDest.x, y: moveDest.y });
        return;
      }
    }

    if (unit && isHumanTurn() && unit.team === state.game.activeTeam) {
      if (state.skillMode) state.skillMode = null;
      selectUnit(unit.id);
      return;
    }

    if (unit && unit.team !== state.game.activeTeam) {
      var selected = state.game.getUnit(state.selectedId);
      if (selected && selected.alive && selected.team === state.game.activeTeam && isHumanTurn() && !selected.turn.done && !(selected.status.devour && selected.status.devour.active)) {
        if (state.skillMode === 'anky') {
          var skill = state.game.getSkillStatus(selected);
          if (skill.targets.some(function (t) { return t.id === unit.id; })) {
            state.skillMode = null;
            submitAction({ type: 'skill', unitId: selected.id, targetId: unit.id });
          } else {
            toast('该目标不在尾槌范围内');
          }
          return;
        }
        var attackTargets = state.game.getAttackTargets(selected);
        if (attackTargets.some(function (t) { return t.id === unit.id; })) {
          state.skillMode = null;
          submitAction({ type: 'attack', unitId: selected.id, targetId: unit.id });
        } else {
          toast('目标不在攻击范围（需与自身占格相邻）');
        }
      } else {
        selectUnit(unit.id);
      }
      return;
    }

    if (!unit) {
      if (!isHumanTurn()) return;
      var sel = state.game.getUnit(state.selectedId);
      if (state.skillMode) {
        state.skillMode = null;
        renderAll();
        return;
      }
      if (sel && sel.alive && sel.team === state.game.activeTeam && !sel.turn.done && !(sel.status.devour && sel.status.devour.active)) {
        var reachable = state.game.getReachable(sel);
        var canMove = reachable.some(function (r) { return r.x === x && r.y === y; });
        if (canMove) submitAction({ type: 'move', unitId: sel.id, x: x, y: y });
        else if (state.game.unitAt(x, y) === null) toast('该格不在移动范围内');
      }
      return;
    }

    selectUnit(unit.id);
  }

  function onActionClick(e) {
    var btn = e.target.closest('[data-action]');
    if (btn) {
      var action = btn.dataset.action;
      var g = state.game;
      if (!g) return;
      if (action === 'end-turn') { endTeamTurn(); return; }
      if (action === 'adjust') {
        els.gameOver.classList.add('hidden');
        if (state.mode === 'online' && state.online.code) exitOnlineToStart(true);
        else showStartScreen();
        return;
      }
      if (action === 'rematch') {
        if (state.mode === 'online' && state.online.code) { sendOnline({ type: 'rematch-request' }); return; }
        els.gameOver.classList.add('hidden');
        startGame();
        return;
      }
      if (g.phase === 'deploy') {
        if (action === 'deploy-confirm') { confirmDeployPreview(); return; }
        if (action === 'deploy-cancel-preview') { state.deployPreview = null; state.deployHover = null; renderAll(); return; }
        if (action === 'deploy-start' && state.mode !== 'online') { startLocalBattle(); return; }
        if (action === 'deploy-ready' && state.mode === 'online') { toggleDeployReady(); return; }
        return;
      }
      if (!isHumanTurn() || state.busy) return;
      var unit = g.getUnit(state.selectedId);
      if (!unit || unit.team !== g.activeTeam || !unit.alive) return;

      if (action === 'skill') {
        var skill = g.getSkillStatus(unit);
        if (!skill.ready) { toast(skill.reason); return; }
        if (unit.type === 'anky') {
          state.skillMode = 'anky';
          renderAll();
          toast('选择一个相邻敌人作为尾槌目标');
          return;
        }
        submitAction({ type: 'skill', unitId: unit.id });
      } else if (action === 'cancel-skill') {
        state.skillMode = null;
        renderAll();
      } else if (action === 'release-hook') {
        submitAction({ type: 'releaseHook', unitId: unit.id });
      } else if (action === 'escape-hook') {
        submitAction({ type: 'escapeHook', unitId: unit.id });
      } else if (action === 'resume-devour') {
        submitAction({ type: 'resumeDevour', unitId: unit.id });
      } else if (action === 'end-unit') {
        submitAction({ type: 'endUnit', unitId: unit.id });
      }
      return;
    }

    var facingBtn = e.target.closest('[data-facing]');
    if (facingBtn && state.game.phase === 'deploy') {
      var deployUnit = state.game.getUnit(state.selectedId);
      if (!canDeployUnit(deployUnit) || state.busy) return;
      state.deployPreview = null;
      state.deployHover = null;
      submitDeployAction({ type: 'deployRotate', unitId: deployUnit.id, facing: facingBtn.dataset.facing });
      return;
    }
    if (facingBtn && isHumanTurn() && !state.busy) {
      var u = state.game.getUnit(state.selectedId);
      if (!u || u.team !== state.game.activeTeam || u.turn.done) return;
      if (state.mode === 'online') {
        submitAction({ type: 'rotate', unitId: u.id, facing: facingBtn.dataset.facing });
        return;
      }
      var result = state.game.rotateUnit(u.id, facingBtn.dataset.facing);
      if (result.ok) {
        Sound.click();
        renderAll();
      } else {
        toast(result.error);
      }
    }
  }

  function endTeamTurn() {
    if (!state.game || state.game.phase !== 'battle' || !isHumanTurn() || state.busy) return;
    state.skillMode = null;
    state.selectedId = null;
    if (state.mode === 'online') {
      submitAction({ type: 'endTurn' }, { turnEnd: true });
      return;
    }
    perform(function () { return state.game.endTeamTurn(); }, { turnEnd: true });
  }

  /* ---------------- AI ---------------- */
  function scheduleAI() {
    if (!state.game || state.game.phase !== 'battle') return;
    if (state.mode !== 'ai' || state.game.activeTeam !== 'red') return;
    if (state.aiBusy || state.aiScheduled) return;
    state.aiScheduled = true;
    var epoch = state.epoch;
    setTimeout(function () {
      state.aiScheduled = false;
      if (epoch !== state.epoch) return;
      runAITurn();
    }, 720);
  }

  async function runAITurn() {
    if (!state.game || state.mode !== 'ai' || state.game.activeTeam !== 'red' || state.game.phase !== 'battle' || state.aiBusy) return;
    state.aiBusy = true;
    var epoch = state.epoch;
    renderAll();
    await sleep(520);
    if (epoch !== state.epoch) { state.aiBusy = false; return; }

    var actions = 0;
    while (state.game && state.game.phase === 'battle' && state.game.activeTeam === 'red' && actions < 24) {
      if (epoch !== state.epoch) { state.aiBusy = false; return; }
      var candidates = state.game.getAlive('red').filter(function (u) {
        return !u.turn.done && !(u.status.devour && u.status.devour.active);
      });
      if (!candidates.length) break;
      var unit = candidates[0];
      state.selectedId = unit.id;
      state.skillMode = null;
      renderAll();
      await sleep(320);
      if (epoch !== state.epoch) { state.aiBusy = false; return; }
      await aiActUnit(unit, epoch);
      if (epoch !== state.epoch) { state.aiBusy = false; return; }
      if (state.game.phase !== 'battle') break;
      await sleep(280);
      actions += 1;
    }

    if (epoch !== state.epoch) { state.aiBusy = false; return; }
    if (state.game && state.game.phase === 'battle' && state.game.activeTeam === 'red') {
      state.selectedId = null;
      await perform(function () { return state.game.endTeamTurn(); });
    }
    state.aiBusy = false;
    if (epoch !== state.epoch) return;
    autoSelectForTurn();
    renderAll();
    if (state.game && state.game.phase === 'battle' && state.game.activeTeam === 'blue') {
      scheduleAI();
    }
  }

  async function aiActUnit(unit, epoch) {
    if (!unit || !unit.alive) return;
    var g = state.game;

    // 受钩挂时优先尝试摆脱。
    if (g.getHookStacks(unit).length && g.canEscapeHook(unit.id).allowed) {
      await perform(function () { return g.escapeHook(unit.id); });
      return;
    }

    // 被中断的吞食：如果尸体就在旁边且生命足够，优先恢复吞食。
    if (unit.status.devour && !unit.status.devour.active) {
      var corpse = findCorpse(unit.status.devour.corpseId);
      if (corpse && E.distance(unit, corpse) <= 1 && unit.hp >= 4) {
        await perform(function () { return g.resumeDevour(unit.id); });
        return;
      }
    }

    var target = chooseAITarget(unit);
    if (!target) {
      await perform(function () { return g.endUnit(unit.id); });
      return;
    }

    // 先使用不需要选择目标的技能，或可以在当前位置发挥的技能。
    if (unit.type === 'velo' && g.getSkillStatus(unit).ready) {
      await perform(function () { return g.useSkill(unit.id); });
      if (!unit.alive || state.game.phase !== 'battle' || unit.turn.done) return;
    }

    if (unit.type === 'trex' && g.getSkillStatus(unit).ready) {
      var tRexResult = await perform(function () { return g.useSkill(unit.id); });
      if (!unit.alive || state.game.phase !== 'battle') return;
      if (unit.turn.done) return;
    }

    if (unit.type === 'stego' && g.getSkillStatus(unit).ready) {
      var distToTarget = E.distance(unit, target);
      if (distToTarget <= 3) {
        await perform(function () { return g.useSkill(unit.id); });
        if (!unit.alive || state.game.phase !== 'battle') return;
        if (unit.turn.done) return;
      }
    }

    if (unit.type === 'leso' && g.getSkillStatus(unit).ready) {
      var sides = g.getSideTargets(unit);
      if (!sides.length) {
        var adjacent = g.getAttackTargets(unit);
        if (adjacent.length) {
          var facing = facingToPutOnSide(unit, adjacent[0]);
          if (facing && facing !== unit.facing) {
            g.rotateUnit(unit.id, facing);
            renderAll();
          }
          sides = g.getSideTargets(unit);
        }
      }
      if (sides.length) {
        await perform(function () { return g.useSkill(unit.id); });
        if (!unit.alive || state.game.phase !== 'battle') return;
        if (unit.turn.done) return;
      }
    }

    if (unit.type === 'anky' && g.getSkillStatus(unit).ready) {
      var ankyTargets = g.getAttackTargets(unit);
      if (ankyTargets.length) {
        ankyTargets.sort(function (a, b) { return a.hp - b.hp; });
        await perform(function () { return g.useSkill(unit.id, ankyTargets[0].id); });
        if (!unit.alive || state.game.phase !== 'battle') return;
        if (unit.turn.done) return;
      }
    }

    if (unit.type === 'trike' && g.getSkillStatus(unit).ready) {
      var adjacentEnemies = g.getEnemies(unit.team).filter(function (e) { return E.distance(unit, e) <= 1; }).length;
      var nearbyEnemies = g.getEnemies(unit.team).filter(function (e) { return E.distance(unit, e) <= 2; }).length;
      if (adjacentEnemies >= 2 || (unit.hp <= 3 && nearbyEnemies >= 1)) {
        await perform(function () { return g.useSkill(unit.id); });
        return;
      }
    }

    // 重新选择目标（技能可能改变局面）。
    target = chooseAITarget(unit);
    if (!target) {
      if (!unit.turn.done) await perform(function () { return g.endUnit(unit.id); });
      return;
    }

    var inRange = g.getAttackTargets(unit).some(function (t) { return t.id === target.id; });
    if (!inRange) {
      var dest = chooseAIMove(unit, target);
      if (dest && (dest.x !== unit.x || dest.y !== unit.y)) {
        await perform(function () { return g.moveUnit(unit.id, dest.x, dest.y); });
        if (!unit.alive || state.game.phase !== 'battle') return;
      }
    }

    // 面向威胁，兼顾三角龙方阵。
    if (!unit.turn.done) {
      var face = chooseFacing(unit, target);
      if (face && face !== unit.facing) {
        g.rotateUnit(unit.id, face);
        renderAll();
      }
    }

    // 移动后可以再次尝试需要邻接的技能（甲龙 / 勒苏维斯龙）。
    if (unit.type === 'anky' && g.getSkillStatus(unit).ready) {
      var ankyAfter = g.getAttackTargets(unit);
      if (ankyAfter.length) {
        ankyAfter.sort(function (a, b) { return a.hp - b.hp; });
        await perform(function () { return g.useSkill(unit.id, ankyAfter[0].id); });
        if (!unit.alive || state.game.phase !== 'battle' || unit.turn.done) return;
      }
    }
    if (unit.type === 'leso' && g.getSkillStatus(unit).ready) {
      if (g.getSideTargets(unit).length) {
        await perform(function () { return g.useSkill(unit.id); });
        if (!unit.alive || state.game.phase !== 'battle' || unit.turn.done) return;
      }
    }

    var targets = g.getAttackTargets(unit);
    if (targets.length) {
      targets.sort(function (a, b) {
        var ak = a.hp + a.armor * 0.45;
        var bk = b.hp + b.armor * 0.45;
        return ak - bk;
      });
      await perform(function () { return g.attack(unit.id, targets[0].id); });
      return;
    }

    if (unit.type === 'trike' && g.getSkillStatus(unit).ready) {
      var enemiesNear = g.getEnemies(unit.team).some(function (e) { return E.distance(unit, e) <= 2; });
      if (enemiesNear) {
        await perform(function () { return g.useSkill(unit.id); });
        return;
      }
    }

    if (!unit.turn.done) await perform(function () { return g.endUnit(unit.id); });
  }

  function chooseAITarget(unit) {
    var g = state.game;
    var sources = g.getHookSourceIds(unit);
    var enemies = g.getEnemies(unit.team).filter(function (e) { return sources.indexOf(e.id) < 0 && !g.isLockedFromAttacking(unit, e); });
    if (!enemies.length) return null;
    var atk = g.getAttack(unit);
    enemies.sort(function (a, b) {
      var da = E.distance(unit, a);
      var db = E.distance(unit, b);
      var sa = da * 3.6 + a.hp * 1.05 + a.armor * 0.55;
      var sb = db * 3.6 + b.hp * 1.05 + b.armor * 0.55;
      if (a.hp <= atk) sa -= 8;
      if (b.hp <= atk) sb -= 8;
      if (a.status.guard) sa += 5;
      if (b.status.guard) sb += 5;
      if (a.type === 'trex') sa -= 2.5;
      if (b.type === 'trex') sb -= 2.5;
      return sa - sb;
    });
    return enemies[0];
  }

  function chooseAIMove(unit, target) {
    var g = state.game;
    var reachable = g.getReachable(unit);
    var options = [{ x: unit.x, y: unit.y }].concat(reachable);
    var best = options[0];
    var bestScore = -Infinity;
    var allies = g.getAlive(unit.team);
    for (var i = 0; i < options.length; i++) {
      var cell = options[i];
      var d = E.distance(cell, target);
      var score = -d * 8;
      if (d <= 1) score += 58;
      if (unit.type === 'leso' && g.round >= unit.skillReadyRound && d <= 2) score += 6;
      var enemies = g.getEnemies(unit.team);
      var threats = 0;
      for (var j = 0; j < enemies.length; j++) {
        if (E.distance(cell, enemies[j]) <= 1) threats += 1;
      }
      score -= threats * (unit.hp <= 3 ? 9 : 4);
      for (var k = 0; k < allies.length; k++) {
        if (allies[k].id !== unit.id && E.distance(cell, allies[k]) <= 1) score += 2;
        if (unit.type === 'trike' && allies[k].type === 'trike' && allies[k].id !== unit.id && E.distance(cell, allies[k]) === 1 && allies[k].facing === unit.facing) score += 4;
      }
      score += Math.random() * 1.8;
      if (cell.x === unit.x && cell.y === unit.y) score += 2;
      if (score > bestScore) { bestScore = score; best = cell; }
    }
    return best;
  }

  function chooseFacing(unit, target) {
    if (!target) return unit.facing;
    var dx = target.x - unit.x;
    var dy = target.y - unit.y;
    if (dx === 0 && dy === 0) return unit.facing;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'E' : 'W';
    return dy > 0 ? 'S' : 'N';
  }

  function facingToPutOnSide(unit, target) {
    var dx = target.x - unit.x;
    var dy = target.y - unit.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
    if (dx !== 0) return 'N';
    return 'E';
  }

  function findCorpse(id) {
    for (var i = 0; i < state.game.corpses.length; i++) if (state.game.corpses[i].id === id) return state.game.corpses[i];
    return null;
  }

  /* ---------------- 结算 / 弹窗 ---------------- */
  function renderRematchStatus() {
    if (!els.rematchStatus) return;
    var r = state.online.rematch;
    var onlineResult = state.mode === 'online' && state.game && state.game.phase === 'gameover';
    var active = !!(onlineResult && r && (r.blue || r.red));
    if (!active) {
      els.rematchStatus.classList.add('hidden');
      if (onlineResult && els.btnRematch) {
        els.btnRematch.textContent = '再来一局';
        els.btnRematch.disabled = false;
      }
      return;
    }
    var me = state.online.team;
    var opp = me === 'blue' ? 'red' : 'blue';
    var meVote = !!r[me];
    var oppVote = !!r[opp];
    var name = (onlinePlayer(opp) || {}).name || '对手';
    var text;
    if (meVote && oppVote) text = '双方已同意再战，正在返回房间…';
    else if (meVote) text = '已发送再战请求，等待 ' + name + '…';
    else text = name + ' 想再来一局，点击按钮接受。';
    if (r.deadline) {
      var left = Math.max(0, Math.ceil((r.deadline - Date.now()) / 1000));
      text += ' ' + left + ' 秒内有效。';
    }
    els.rematchStatus.textContent = text;
    els.rematchStatus.classList.remove('hidden');
    if (els.btnRematch) {
      if (meVote) {
        els.btnRematch.textContent = '等待对手…';
        els.btnRematch.disabled = true;
      } else {
        els.btnRematch.textContent = '接受再战';
        els.btnRematch.disabled = false;
      }
    }
  }

  function showResult() {
    if (!state.game || state.game.phase !== 'gameover') return;
    if (!els.gameOver.classList.contains('hidden')) return;
    var g = state.game;
    var title = '平局';
    var sub = '两支军团同归于尽，没有人从这场远古战争中归来。';
    var defeat = false;
    if (state.mode === 'online') {
      var myTeam = state.online.team;
      if (g.winner === myTeam) {
        title = '胜利';
        sub = '对手的军团已被逐出盆地。你的恐龙在晨雾中发出胜利的嘶鸣。';
      } else if (g.winner === 'draw') {
        title = '平局';
        sub = '双方同归于尽，盆地重归寂静。';
      } else {
        title = '败北';
        sub = '你的最后一只恐龙倒下了。对手赢得了这场远古战争。';
        defeat = true;
      }
      if (state.online.code) sub += ' 房间 ' + state.online.code + '。';
    } else if (g.winner === 'blue') {
      if (state.mode === 'ai') { title = '胜利'; sub = '赤焰部族已被逐出盆地。苍林盟约的旗帜仍在晨雾中飘扬。'; }
      else { title = '苍林胜利'; sub = '赤焰部族全军覆没，苍林盟约赢得了这场远古战争。'; }
    } else if (g.winner === 'red') {
      if (state.mode === 'ai') { title = '败北'; sub = '苍林盟约的最后一只恐龙倒下了。赤焰部族占领了盆地。'; defeat = true; }
      else { title = '赤焰胜利'; sub = '苍林盟约全军覆没，赤焰部族赢得了这场远古战争。'; defeat = state.mode !== 'pvp'; }
    }
    els.resultTitle.textContent = title;
    els.resultSub.textContent = sub;
    els.resultSigil.className = 'result-sigil' + (defeat ? ' defeat' : '');
    els.resultSigil.textContent = defeat ? '✕' : (g.winner === 'draw' ? '◐' : '✦');
    els.btnRematch.textContent = state.mode === 'online' ? '再来一局' : '再战一局';
    els.btnAdjust.textContent = state.mode === 'online' ? '退出联机' : '调整阵容';
    var blueDead = g.getTeamUnits('blue').filter(function (u) { return !u.alive; }).length;
    var redDead = g.getTeamUnits('red').filter(function (u) { return !u.alive; }).length;
    els.resultStats.innerHTML =
      '<div class="result-stat"><b>' + g.round + '</b><span>战斗回合</span></div>' +
      '<div class="result-stat"><b>' + redDead + '</b><span>赤焰损失</span></div>' +
      '<div class="result-stat"><b>' + blueDead + '</b><span>苍林损失</span></div>';
    els.gameOver.classList.remove('hidden');
    renderRematchStatus();
  }

  function openRules() {
    els.rulesModal.classList.remove('hidden');
    state.rulesTab = state.rulesTab || 'basics';
    renderRules();
    Sound.click();
  }

  function closeRules() {
    els.rulesModal.classList.add('hidden');
    Sound.click();
  }

  function renderRules() {
    els.rulesTabs.querySelectorAll('button[data-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === state.rulesTab);
    });
    var html = '';
    if (state.rulesTab === 'basics') {
      html = '<h3>在方格盆地中活到最后</h3>' +
        '<p>双方各有一支容量为 <b>6</b> 的恐龙军团，在 10 × 10 的方格战场上轮流行动。开局先在各自半场布阵，再进入战斗；消灭对方全部恐龙即可获胜。</p>' +
        '<div class="rule-grid">' +
          '<div class="rule-box"><strong>开局布阵</strong><span>开局时双方可在本方半场任意空格放置恐龙并调整朝向，不消耗行动力。双方完成布阵后，蓝方先手进入第 1 回合。</span></div>' +
          '<div class="rule-box"><strong>队伍容量与占格</strong><span>小型恐龙占 1 格、消耗 1 容量；中型占 2 格 / 2 容量；霸王龙占 4 格 / 4 容量。可重复编入同种恐龙，但每队总容量不能超过 6。</span></div>' +
          '<div class="rule-box"><strong>行动流程</strong><span>每只恐龙每回合可移动，然后攻击或发动技能；也可以不移动。攻击或结束行动后该单位本回合结束。</span></div>' +
          '<div class="rule-box"><strong>整体移动</strong><span>恐龙占据的格子视为一个整体，按前后左右整体平移，不拆分；平移不会改变朝向，转向仍用朝向按钮单独操作。虚线框显示移动后的完整占位，点击框内任意格即可整体移动。</span></div>' +
          '<div class="rule-box"><strong>攻击范围</strong><span>自身占格外围一圈的相邻方格。大型 2×2、中型 2 格长条都按整个身体计算攻击范围；移动后可攻击，攻击后不能再移动。</span></div>' +
          '<div class="rule-box"><strong>伤害结算</strong><span>除流血外，所有伤害先扣除护甲，再扣除生命。护甲不足时溢出伤害进入生命。</span></div>' +
          '<div class="rule-box"><strong>击杀恢复</strong><span>战胜敌人恢复其最大生命值的 1/4（小数取 0.5）：中型 1.5，霸王龙 3，甲龙 1。</span></div>' +
          '<div class="rule-box"><strong>回合结束</strong><span>双方各行动一次为一回合。回合结束时所有存活恐龙恢复 1 点护甲；连续 3 回合未受攻击伤害则恢复 1 点生命。</span></div>' +
          '<div class="rule-box"><strong>技能冷却</strong><span>每只恐龙拥有一个主动技能，冷却按技能标注。游戏开始即进入冷却，冷却结束后可再次发动。</span></div>' +
          '<div class="rule-box"><strong>胜利条件</strong><span>任意一方的恐龙全部被消灭时，另一方立即获胜。双方同时全灭则平局。</span></div>' +
        '</div>' +
        '<h4>操作提示</h4><ul><li>开局布阵：点击己方恐龙，再点高亮格预览整只恐龙的落位，确认后放置。</li><li>战斗阶段：点击己方恐龙，再点击虚线框内任意格；整只恐龙会按占格整体平移过去。</li><li>相邻敌人会以红色高亮，点击即可攻击。</li><li>按 <b>E</b> 结束当前回合，按 <b>Esc</b> 取消技能选择。</li><li>朝向可在行动前自由调整，不消耗行动力；恐龙图标和朝向箭头会同步旋转。它影响希腊方阵与侧刺反击。</li></ul>';
    } else if (state.rulesTab === 'status') {
      html = '<h3>异常状态与特殊形态</h3><div class="rule-grid">' +
        '<div class="rule-box"><strong>流血</strong><span>持续 4 回合。每层在倒计时结束后直接损失 1 点生命（无视护甲），并移除该层；最多叠加 2 层。连续 3 回合未受攻击伤害时，也会失去 1 层。</span></div>' +
        '<div class="rule-box"><strong>防御反击</strong><span>三角龙完全挡下下一次受到的攻击，并立即对攻击者造成 4 点伤害。挡下后形态消失。</span></div>' +
        '<div class="rule-box"><strong>反击形态</strong><span>剑龙开启后持续 2 回合：攻击力 +1，命中时 25% 流血、12.5% 穿刺。穿刺造成双倍伤害后形态结束，护甲上限 -1、攻击力 -1，本局无法再次穿刺。</span></div>' +
        '<div class="rule-box"><strong>吞食</strong><span>霸王龙击杀敌人后进入吞食，按猎物容量需要 1 / 2 / 3 回合，每回合恢复 1 点生命。期间不能攻击、移动或使用主动技能。受到 ≥3 点伤害会打断吞食，进度保留。生命低于 4 时改为普通击杀恢复。</span></div>' +
        '<div class="rule-box"><strong>尾槌重击</strong><span>2/3 命中，造成 3 点伤害。若未破除护甲，再造成 2 点护甲伤害；若破甲，再造成 1 点生命伤害。另有 50% 概率使目标在 1 回合内无法攻击甲龙。</span></div>' +
        '<div class="rule-box"><strong>甲壳反伤</strong><span>甲龙护甲受到攻击时，攻击者受到 1 点伤害；护甲存在时，甲龙受到的伤害降低 15%。</span></div>' +
      '</div>' +
      '<h4>结算顺序</h4><p>回合结束时：护甲恢复 → 流血倒计时与发作 → 连续未受伤恢复/流血消退。流血伤害不会重置“连续未受伤”计数。</p>';
    } else if (state.rulesTab === 'codex') {
      html = '<h3>恐龙图鉴</h3><div class="codex-grid">';
      ORDER.forEach(function (type) {
        var d = SPECIES[type];
        html += '<div class="codex-card" style="--accent:' + d.accent + '">' +
          '<div class="codex-head">' +
            '<span class="codex-icon"><span class="dino-icon">' + dinoSvg(type) + '</span></span>' +
            '<span class="codex-name"><strong>' + d.name + '</strong><span>' + d.role + ' · ' + d.latin + '</span></span>' +
            '<span class="codex-size">占 ' + d.size + ' 格</span>' +
          '</div>' +
          '<div class="codex-stats"><span>生命 <b>' + d.hp + '</b></span><span>护甲 <b>' + d.armor + '</b></span><span>攻击 <b>' + d.attack + '</b></span><span>行动 <b>' + d.move + '</b></span><span>冷却 <b>' + d.skillCd + '</b></span></div>' +
          '<div class="codex-skill"><strong>主动 · ' + d.skillName + '</strong><p>' + d.skillDesc + '</p></div>' +
          '<div class="codex-skill passive"><strong>被动 · ' + d.passiveName + '</strong><p>' + d.passiveDesc + '</p></div>' +
        '</div>';
      });
      html += '</div>';
    } else {
      html = '<h3>规则裁定</h3>' +
        '<div class="ruling-note"><p>原始规则未明确的部分，采用以下一致裁定，以保证游戏可完整进行。</p></div>' +
        '<div class="rule-grid">' +
          '<div class="rule-box"><strong>占格与形状</strong><span>小型占 1×1 格；中型占 2 格长条，身体沿朝向前后排列，转向会改变占格；大型占 2×2 共 4 格。队伍容量等于总占格数。</span></div>' +
          '<div class="rule-box"><strong>回合与冷却</strong><span>“回合”指双方各行动一次的大回合。技能冷却从游戏开始时计算，冷却 N 回合表示需要经过 N 个完整回合才能再次发动。</span></div>' +
          '<div class="rule-box"><strong>朝向</strong><span>转向不消耗行动力，可在攻击/技能前自由调整；每只单位每回合在行动结束后不能再转向。正面为所朝方向 ±45° 的扇形。</span></div>' +
          '<div class="rule-box"><strong>剑龙行动力</strong><span>剑龙的行动力为 2；开启尾刃鞭刺后仍可移动和攻击，但反击形态只持续 2 回合。</span></div>' +
          '<div class="rule-box"><strong>甲龙减伤</strong><span>“减少 15%”按四舍五入取整；护甲为 0 时不再生效。</span></div>' +
          '<div class="rule-box"><strong>方阵判定</strong><span>两只及以上同队、同朝向三角龙在同一行/列上相邻，形成方阵；同一只只计一次，敌方不参与。来自正面扇形的攻击减少“数量”点伤害，最多 5 点。</span></div>' +
          '<div class="rule-box"><strong>流血击杀</strong><span>流血造成的击杀会把恢复奖励归于施加流血的单位。霸王龙通过流血远程击杀时使用普通恢复，不进入吞食。</span></div>' +
          '<div class="rule-box"><strong>吞食打断</strong><span>受到 3 点及以上实际伤害会打断吞食，保留进度。之后可消耗一回合在尸体旁继续吞食。</span></div>' +
          '<div class="rule-box"><strong>布阵保密</strong><span>联网布阵阶段，双方看不到对手的占位与朝向，也收不到对手的布阵移动事件；开战后自动公开。</span></div>' +
          '<div class="rule-box"><strong>环境侵蚀</strong><span>从第 15 回合起，所有存活单位在每回合结束时失去 1 点生命；该伤害无视护甲，也不会触发护甲、防御或反伤。</span></div>' +
          '<div class="rule-box"><strong>同归于尽</strong><span>若双方最后单位同时被消灭，判定为平局。</span></div>' +
          '<div class="rule-box"><strong>随机概率</strong><span>技能概率每次独立判定；攻击必定命中（尾槌与穿刺等特殊概率除外）。</span></div>' +
        '</div>';
    }
    els.rulesBody.innerHTML = html;
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2200);
  }

  // 初始默认音效状态
  state.sound = true;

  // 供本地调试与自动化测试使用的公开接口。
  window.DinoTactics = {
    getState: function () { return state; },
    startGame: startGame,
    renderAll: renderAll,
    selectUnit: selectUnit,
    endTeamTurn: endTeamTurn,
    showResult: showResult
  };
})();
