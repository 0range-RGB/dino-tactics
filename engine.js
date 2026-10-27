/* =========================================================
   白垩纪战术 · 核心规则引擎
   纯 JavaScript，无依赖，可在浏览器和 Node 中运行。
   ========================================================= */
(function (global) {
  'use strict';

  var BOARD_SIZE = 10;
  var TEAM_CAPACITY = 6;
  var DIRECTIONS = {
    N: { x: 0, y: -1, label: '北', symbol: '↑' },
    E: { x: 1, y: 0, label: '东', symbol: '→' },
    S: { x: 0, y: 1, label: '南', symbol: '↓' },
    W: { x: -1, y: 0, label: '西', symbol: '←' }
  };
  var FACING_ORDER = ['N', 'E', 'S', 'W'];

  var TEAM_INFO = {
    blue: { name: '苍林盟约', short: '苍林', color: '#4fd1b5', dark: '#0d3b38' },
    red: { name: '赤焰部族', short: '赤焰', color: '#ff8263', dark: '#3b1814' }
  };

  var SPECIES = {
    trike: {
      type: 'trike',
      name: '三角龙',
      latin: 'Triceratops',
      size: 2,
      role: '重装先锋',
      tags: ['防御反击', '希腊方阵'],
      hp: 6,
      armor: 4,
      attack: 3,
      move: 1,
      skillCd: 2,
      accent: '#61d4b3',
      emblem: '角',
      skillName: '防御反击',
      skillDesc: '完全防御下一次受到的攻击，并反击攻击者，造成 4 点伤害。',
      passiveName: '希腊方阵',
      passiveDesc: '两只或以上同队三角龙在同一直线上相邻且朝向相同，形成方阵；同一只三角龙只计一次。来自所朝正面的攻击伤害减少“方阵数量”，至多减少 5 点。',
      skillType: 'active'
    },
    trex: {
      type: 'trex',
      name: '霸王龙',
      latin: 'Tyrannosaurus',
      size: 4,
      role: '顶级掠食者',
      tags: ['突袭', '温血供应'],
      hp: 12,
      armor: 2,
      attack: 7,
      move: 1,
      skillCd: 3,
      accent: '#ff9b63',
      emblem: '王',
      skillName: '突袭',
      skillDesc: '本回合增加 2 点行动力；下一次攻击伤害 +1；发动后仍可进行攻击。',
      passiveName: '温血供应',
      passiveDesc: '击杀敌人后不立即恢复生命，而是吞食尸体：小型 1 回合、中型 2 回合、大型 3 回合，每回合恢复 1 点生命。吞食期间无法行动；受到 ≥3 点伤害会被打断，进度保留。生命低于 4 时改为普通击杀恢复。',
      skillType: 'active'
    },
    leso: {
      type: 'leso',
      name: '勒苏维斯龙',
      latin: 'Lesothosaurus',
      size: 2,
      role: '侧翼游猎者',
      tags: ['侧刺反击', '流血'],
      hp: 6,
      armor: 3,
      attack: 2,
      move: 2,
      skillCd: 2,
      accent: '#67b7ff',
      emblem: '刺',
      skillName: '侧刺反击',
      skillDesc: '对自身两侧方向的敌方单位各攻击一次（每侧至多 1 只），造成 3 点伤害，并有 50% 概率造成流血。',
      passiveName: '无被动',
      passiveDesc: '无被动技能。',
      skillType: 'active'
    },
    stego: {
      type: 'stego',
      name: '剑龙',
      latin: 'Stegosaurus',
      size: 2,
      role: '尾刺守卫',
      tags: ['尾刃鞭刺', '穿刺'],
      hp: 6,
      armor: 2,
      attack: 3,
      move: 2,
      skillCd: 3,
      accent: '#c58cff',
      emblem: '刃',
      skillName: '尾刃鞭刺',
      skillDesc: '开启反击形态，持续 2 回合；攻击力 +1，命中时有 25% 概率造成流血，有 12.5% 概率造成穿刺（双倍伤害）。穿刺后形态结束，本局护甲上限 -1、攻击力 -1，且无法再次穿刺。发动后仍可攻击。',
      passiveName: '无被动',
      passiveDesc: '无被动技能。',
      skillType: 'active'
    },
    anky: {
      type: 'anky',
      name: '甲龙',
      latin: 'Ankylosaurus',
      size: 2,
      role: '铁壁重甲',
      tags: ['尾槌重击', '甲壳反伤'],
      hp: 4,
      armor: 5,
      attack: 3,
      move: 1,
      skillCd: 3,
      accent: '#f6c65b',
      emblem: '甲',
      skillName: '尾槌重击',
      skillDesc: '对一名相邻敌人发动尾槌：66.7% 命中，造成 3 点伤害；若未破除其护甲，再造成 2 点护甲伤害；若破甲，再造成 1 点生命伤害。另有 50% 概率使其 1 回合内无法攻击甲龙。',
      passiveName: '甲壳壁垒',
      passiveDesc: '护甲存在时，受到的伤害降低 15%；护甲受到攻击时，攻击者受到 1 点伤害。',
      skillType: 'active'
    },
    velo: {
      type: 'velo',
      name: '伶盗龙',
      latin: 'Velociraptor',
      size: 1,
      role: '钩挂猎手',
      tags: ['钩挂', '猎手'],
      hp: 3,
      armor: 1,
      attack: 1,
      move: 4,
      skillCd: 1,
      accent: '#c6e36b',
      emblem: '钩',
      skillName: '镰锯扑钩',
      skillDesc: '对朝向一格内的敌人施加一层「受钩挂」，并对自身施加「钩挂」。若目标受钩挂层数已满则无法发动。钩挂期间攻击 +2、无法移动、技能不充能；目标失去受钩挂时钩挂结束。',
      passiveName: '脆弱之爪',
      passiveDesc: '攻击只对护甲造成 50% 的伤害。',
      skillType: 'active'
    }
  };

  var SPECIES_ORDER = ['trike', 'trex', 'leso', 'stego', 'anky', 'velo'];

  var HOOK_MAX_STACKS = { small: 2, medium: 3 };
  var HOOK_ESCAPE_RANGE = { small: [0.25, 0.45], medium: [0.45, 0.75] };

  function hookSizeKey(unit) {
    if (!unit) return null;
    if (unit.size === 1) return 'small';
    if (unit.size === 2) return 'medium';
    return 'large';
  }

  function key(x, y) { return x + ',' + y; }
  function isUnitLike(obj) {
    return !!(obj && obj.type && obj.team && obj.facing && typeof obj.size === 'number');
  }

  function footprintCells(unit, x, y, facing) {
    x = typeof x === 'number' ? x : unit.x;
    y = typeof y === 'number' ? y : unit.y;
    facing = facing || unit.facing;
    if (unit.size >= 4) {
      // 大型单位：2 × 2 方格，锚点为左上角。
      return [{ x: x, y: y }, { x: x + 1, y: y }, { x: x, y: y + 1 }, { x: x + 1, y: y + 1 }];
    }
    if (unit.size === 2) {
      // 中型单位：2 格长条，锚点为头部，身体沿朝向后延。
      if (facing === 'N') return [{ x: x, y: y }, { x: x, y: y + 1 }];
      if (facing === 'S') return [{ x: x, y: y }, { x: x, y: y - 1 }];
      if (facing === 'E') return [{ x: x, y: y }, { x: x - 1, y: y }];
      return [{ x: x, y: y }, { x: x + 1, y: y }];
    }
    return [{ x: x, y: y }];
  }

  function cellsFor(obj) {
    if (!obj) return [];
    if (isUnitLike(obj)) return footprintCells(obj);
    if (typeof obj.x === 'number' && typeof obj.y === 'number') return [{ x: obj.x, y: obj.y }];
    return [];
  }

  function boundsFor(cells) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cells.forEach(function (c) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  function distance(a, b) {
    var ca = cellsFor(a);
    var cb = cellsFor(b);
    if (!ca.length || !cb.length) return Infinity;
    var best = Infinity;
    ca.forEach(function (u) {
      cb.forEach(function (v) {
        var d = Math.max(Math.abs(u.x - v.x), Math.abs(u.y - v.y));
        if (d < best) best = d;
      });
    });
    return best;
  }

  function centerFor(obj) {
    var cells = cellsFor(obj);
    if (!cells.length) return null;
    var sx = 0, sy = 0;
    cells.forEach(function (c) { sx += c.x; sy += c.y; });
    return { x: sx / cells.length, y: sy / cells.length };
  }

  function inBoard(x, y) { return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE; }
  function roundHalf(v) { return Math.round(v * 2) / 2; }
  function teamName(team) { return TEAM_INFO[team] ? TEAM_INFO[team].name : team; }

  function Game(config) {
    config = config || {};
    this.rng = typeof config.rng === 'function' ? config.rng : Math.random;
    this.round = 1;
    this.activeTeam = config.deployOnly ? null : 'blue';
    this.phase = config.deployOnly ? 'deploy' : 'battle';
    this.deployOnly = !!config.deployOnly;
    this.winner = null;
    this.units = [];
    this.corpses = [];
    this.nextUnitId = 1;
    this.nextCorpseId = 1;
    this.startupEvents = [];

    this.buildTeam('blue', config.blueTeam || ['trike', 'stego', 'anky']);
    this.buildTeam('red', config.redTeam || ['trex', 'leso']);
    this.deployTeams();

    if (config.deployOnly) {
      this.pushLog(this.startupEvents, '双方进入布阵阶段：可在我方半场自由放置恐龙。', 'system');
    } else {
      this.pushLog(this.startupEvents, '两支军团在白垩纪盆地相遇，战斗开始！', 'system');
      this.startTeamTurn('blue', this.startupEvents, true);
    }
  }

  Game.prototype.buildTeam = function (team, types) {
    if (!Array.isArray(types) || types.length === 0) {
      throw new Error('每支队伍至少需要一只恐龙。');
    }
    var capacity = 0;
    for (var i = 0; i < types.length; i++) {
      var def = SPECIES[types[i]];
      if (!def) throw new Error('未知恐龙：' + types[i]);
      capacity += def.size;
    }
    if (capacity > TEAM_CAPACITY) throw new Error('队伍容量超过 6。');

    for (var j = 0; j < types.length; j++) {
      var d = SPECIES[types[j]];
      var unit = {
        id: team + '-' + (this.nextUnitId++),
        type: d.type,
        name: d.name,
        team: team,
        size: d.size,
        maxHp: d.hp,
        hp: d.hp,
        armor: d.armor,
        armorMax: d.armor,
        attack: d.attack,
        move: d.move,
        x: 0,
        y: 0,
        facing: team === 'blue' ? 'N' : 'S',
        alive: true,
        skillReadyRound: 1 + d.skillCd,
        lastHitRound: 0,
        status: {
          guard: false,
          bleed: [],
          formUntil: 0,
          atkPenalty: 0,
          pierceUsed: false,
          ankyLock: null,
          devour: null,
          assaultBonus: 0,
          hook: null,
          hookReceived: [],
          hookEscapeRound: 0
        },
        turn: {
          moveLeft: d.move,
          extraMove: 0,
          moved: false,
          actionUsed: false,
          done: false,
          skillUsed: false
        }
      };
      this.units.push(unit);
    }
  };

  Game.prototype.deployTeams = function () {
    var self = this;
    ['blue', 'red'].forEach(function (team) {
      var list = self.getTeamUnits(team);
      var half = BOARD_SIZE / 2;
      var row = team === 'blue' ? half + 1 : half - 2;
      var n = list.length;
      var cols = list.map(function (_, i) {
        return Math.max(1, Math.min(BOARD_SIZE - 2, Math.round(((i + 1) * BOARD_SIZE) / (n + 1))));
      });
      list.forEach(function (unit, i) {
        unit.x = cols[i];
        // 大型单位锚点是左上角：红方需再上移 1 格，才能和蓝方形成镜像。
        unit.y = (team === 'red' && unit.size >= 4) ? row - 1 : row;
        unit.facing = team === 'blue' ? 'N' : 'S';
      });
    });
  };


  Game.prototype.getFootprint = function (unit, x, y, facing) {
    if (!unit) return [];
    return footprintCells(unit, x, y, facing);
  };

  Game.prototype.getUnitBounds = function (unit) {
    return boundsFor(this.getFootprint(unit));
  };

  Game.prototype.canPlaceUnit = function (unit, x, y, facing, ignoreSelf) {
    if (!unit || !unit.alive) return false;
    var cells = footprintCells(unit, x, y, facing || unit.facing);
    for (var i = 0; i < cells.length; i++) {
      if (!inBoard(cells[i].x, cells[i].y)) return false;
      var other = this.unitAt(cells[i].x, cells[i].y, ignoreSelf ? unit.id : null);
      if (other) return false;
    }
    return true;
  };

  Game.prototype.getDeployCells = function (unit) {
    if (!unit || !unit.alive || this.phase !== 'deploy') return [];
    var halfMin = unit.team === 'blue' ? BOARD_SIZE / 2 : 0;
    var halfMax = unit.team === 'blue' ? BOARD_SIZE - 1 : BOARD_SIZE / 2 - 1;
    var cells = [];
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        if (x === unit.x && y === unit.y) continue;
        var footprint = footprintCells(unit, x, y, unit.facing);
        var insideHalf = footprint.every(function (c) { return c.y >= halfMin && c.y <= halfMax; });
        // 布阵时也允许整只恐龙平移 1 格；新占位可以与旧占位重叠，但不能与其他单位重叠。
        if (insideHalf && this.canPlaceUnit(unit, x, y, unit.facing, true)) {
          cells.push({ x: x, y: y });
        }
      }
    }
    return cells;
  };

  Game.prototype.deployMove = function (unitId, x, y) {
    var events = [];
    if (this.phase !== 'deploy') return { ok: false, error: '当前不是布阵阶段。', events: events };
    var unit = this.getUnit(unitId);
    if (!unit || !unit.alive) return { ok: false, error: '找不到该单位。', events: events };
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return { ok: false, error: '无效的位置。', events: events };
    var halfMin = unit.team === 'blue' ? BOARD_SIZE / 2 : 0;
    var halfMax = unit.team === 'blue' ? BOARD_SIZE - 1 : BOARD_SIZE / 2 - 1;
    var footprint = footprintCells(unit, x, y, unit.facing);
    if (!footprint.every(function (c) { return c.y >= halfMin && c.y <= halfMax; })) {
      return { ok: false, error: '整只恐龙都必须放在本方半场。', events: events };
    }
    if (!this.canPlaceUnit(unit, x, y, unit.facing, true)) return { ok: false, error: '该位置空间不足或已被占用。', events: events };
    var from = { x: unit.x, y: unit.y };
    unit.x = x;
    unit.y = y;
    events.push({ type: 'move', unitId: unit.id, from: from, to: { x: x, y: y }, path: [{ x: x, y: y }], deploy: true });
    return { ok: true, events: events };
  };

  Game.prototype.deployRotate = function (unitId, facing) {
    var events = [];
    if (this.phase !== 'deploy') return { ok: false, error: '当前不是布阵阶段。', events: events };
    var unit = this.getUnit(unitId);
    if (!unit || !unit.alive) return { ok: false, error: '找不到该单位。', events: events };
    if (!DIRECTIONS[facing]) return { ok: false, error: '无效的朝向。', events: events };
    var halfMin = unit.team === 'blue' ? BOARD_SIZE / 2 : 0;
    var halfMax = unit.team === 'blue' ? BOARD_SIZE - 1 : BOARD_SIZE / 2 - 1;
    var footprint = footprintCells(unit, unit.x, unit.y, facing);
    if (!footprint.every(function (c) { return c.y >= halfMin && c.y <= halfMax; })) {
      return { ok: false, error: '转向后身体会越出本方半场。', events: events };
    }
    if (!this.canPlaceUnit(unit, unit.x, unit.y, facing, true)) return { ok: false, error: '周围空间不足，无法转向。', events: events };
    if (unit.facing !== facing) {
      unit.facing = facing;
      events.push({ type: 'facing', unitId: unit.id, facing: facing });
    }
    return { ok: true, events: events };
  };

  Game.prototype.beginBattle = function () {
    var events = [];
    if (this.phase !== 'deploy') return { ok: false, error: '当前不是布阵阶段。', events: events };
    this.phase = 'battle';
    this.round = 1;
    this.activeTeam = 'blue';
    this.pushLog(events, '双方布阵完成，战斗开始！', 'system');
    this.startTeamTurn('blue', events, true);
    return { ok: true, events: events };
  };

  Game.prototype.getUnit = function (id) {
    for (var i = 0; i < this.units.length; i++) if (this.units[i].id === id) return this.units[i];
    return null;
  };

  Game.prototype.getTeamUnits = function (team) {
    return this.units.filter(function (u) { return u.team === team; });
  };

  Game.prototype.getAlive = function (team) {
    return this.units.filter(function (u) { return u.team === team && u.alive; });
  };

  Game.prototype.getEnemies = function (team) {
    var other = team === 'blue' ? 'red' : 'blue';
    return this.getAlive(other);
  };

  Game.prototype.unitAt = function (x, y, ignoreId) {
    for (var i = 0; i < this.units.length; i++) {
      var u = this.units[i];
      if (!u.alive || (ignoreId && u.id === ignoreId)) continue;
      var cells = footprintCells(u);
      for (var j = 0; j < cells.length; j++) {
        if (cells[j].x === x && cells[j].y === y) return u;
      }
    }
    return null;
  };

  Game.prototype.pushLog = function (events, text, tone) {
    events.push({ type: 'log', text: text, tone: tone || 'system', round: this.round });
  };

  Game.prototype.startTeamTurn = function (team, events, initial) {
    if (this.phase !== 'battle') return;
    var self = this;
    this.activeTeam = team;

    if (team === 'blue') this.expireRoundStatuses(events);

    this.getTeamUnits(team).forEach(function (unit) {
      if (!unit.alive) return;
      unit.turn = {
        moveLeft: unit.move,
        extraMove: 0,
        moved: false,
        actionUsed: false,
        done: false,
        skillUsed: false
      };
    });

    this.pushLog(events, '第 ' + this.round + ' 回合 · ' + teamName(team) + ' 行动', team);
    events.push({ type: 'turn', team: team, round: this.round, initial: !!initial });

    this.getTeamUnits(team).forEach(function (unit) {
      if (!unit.alive) return;
      if (unit.status.devour && unit.status.devour.active) {
        self.progressDevour(unit, events, true);
      }
    });
    this.checkVictory(events);
  };

  Game.prototype.expireRoundStatuses = function (events) {
    var self = this;
    this.units.forEach(function (unit) {
      if (!unit.alive) return;
      if (unit.status.formUntil && self.round > unit.status.formUntil) {
        unit.status.formUntil = 0;
        self.pushLog(events, unit.name + ' 的反击形态结束。', 'status');
        events.push({ type: 'status', unitId: unit.id, status: 'form-end' });
      }
      var lock = unit.status.ankyLock;
      if (lock && self.round > lock.untilRound) {
        unit.status.ankyLock = null;
        self.pushLog(events, unit.name + ' 摆脱了尾槌压制。', 'status');
        events.push({ type: 'status', unitId: unit.id, status: 'lock-end' });
      }
      if (unit.status.devour && !unit.status.devour.active && unit.hp >= 4) {
        // 被打断的吞食可以稍后手动恢复，这里只保持记录。
      }
    });
  };

  Game.prototype.endTeamTurn = function () {
    var events = [];
    if (this.phase !== 'battle') return { ok: false, error: '战斗已经结束。', events: events };
    if (!this.activeTeam) return { ok: false, error: '当前没有行动方。', events: events };
    var team = this.activeTeam;
    this.advanceHookStatus(team, events);
    // 尾槌压制只持续到目标下一次行动结束。
    this.getTeamUnits(team).forEach(function (unit) {
      if (unit.status.ankyLock) unit.status.ankyLock = null;
    });
    this.pushLog(events, teamName(team) + ' 结束行动。', 'system');
    if (team === 'blue') {
      this.startTeamTurn('red', events);
    } else {
      this.endRound(events);
    }
    return { ok: true, events: events };
  };

  Game.prototype.endRound = function (events) {
    var self = this;
    this.pushLog(events, '—— 第 ' + this.round + ' 回合结束 ——', 'round');
    events.push({ type: 'round-end', round: this.round });

    var armorCount = 0;
    this.units.forEach(function (unit) {
      if (!unit.alive) return;
      if (unit.armor < unit.armorMax) {
        unit.armor += 1;
        armorCount += 1;
      }
    });
    if (armorCount > 0) {
      this.pushLog(events, '战后休整：' + armorCount + ' 只恐龙的护甲恢复 1 点。', 'heal');
    }

    this.units.forEach(function (unit) {
      if (!unit.alive || self.phase !== 'battle') return;
      self.tickBleed(unit, events);
    });

    this.units.forEach(function (unit) {
      if (!unit.alive || self.phase !== 'battle') return;
      self.checkNaturalRecovery(unit, events);
    });

    this.units.forEach(function (unit) {
      if (!unit.alive || self.phase !== 'battle') return;
      if (!unit.status.hook) return;
      if (unit.skillReadyRound <= self.round) return;
      unit.skillReadyRound += 1;
      events.push({ type: 'status', unitId: unit.id, status: 'cooldown-paused' });
    });

    if (this.round >= 15) {
      this.pushLog(events, '环境侵蚀：第 15 回合起，所有恐龙每回合失去 1 点生命。', 'damage');
      this.units.forEach(function (unit) {
        if (!unit.alive || self.phase !== 'battle') return;
        self._damage(unit, 1, {
          source: null,
          kind: 'attrition',
          isAttack: false,
          ignoreArmor: true,
          canBeGuarded: false,
          countsAsHit: false,
          allowDevour: false,
          creditKill: false,
          noThorns: true,
          skipPhalanx: true,
          deferVictory: true
        }, events);
      });
      this.checkVictory(events);
    }

    this.checkVictory(events);

    if (this.phase !== 'battle') return;

    this.round += 1;
    events.push({ type: 'round', round: this.round });
    this.startTeamTurn('blue', events);
  };

  Game.prototype.checkNaturalRecovery = function (unit, events) {
    if (this.round - unit.lastHitRound < 3) return;
    this.pushLog(events, unit.name + ' 已连续 3 回合未受到攻击伤害，恢复 1 点生命。', 'heal');
    this.healUnit(unit, 1, events, '自然恢复');
    if (unit.status.bleed.length > 0) {
      unit.status.bleed.shift();
      this.pushLog(events, unit.name + ' 的流血消退 1 层。', 'status');
      events.push({ type: 'status', unitId: unit.id, status: 'bleed-fade' });
    }
    unit.lastHitRound = this.round;
  };

  Game.prototype.healUnit = function (unit, amount, events, reason) {
    if (!unit.alive || amount <= 0) return 0;
    var actual = Math.min(unit.maxHp - unit.hp, amount);
    if (actual <= 0) return 0;
    unit.hp = roundHalf(unit.hp + actual);
    events.push({ type: 'heal', unitId: unit.id, amount: actual, x: unit.x, y: unit.y, reason: reason || '' });
    return actual;
  };

  Game.prototype.getAttack = function (unit) {
    var form = this.isFormActive(unit) ? 1 : 0;
    return Math.max(0, unit.attack + form - unit.status.atkPenalty);
  };

  Game.prototype.getMoveLeft = function (unit) {
    var base = unit.turn ? Math.max(0, unit.turn.moveLeft) : unit.move;
    if (unit.move >= 2 && this.getHookStacks(unit).length) base = Math.max(0, base - 1);
    return base;
  };

  Game.prototype.isFormActive = function (unit) {
    return !!(unit && unit.status.formUntil && this.round <= unit.status.formUntil);
  };

  Game.prototype.getPhalanxSize = function (unit) {
    if (!unit || unit.type !== 'trike' || !unit.alive) return 0;
    var self = this;
    var own = {};
    this.getFootprint(unit).forEach(function (c) { own[key(c.x, c.y)] = true; });
    var best = 0;
    var axes = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 }
    ];
    axes.forEach(function (axis) {
      var count = 1;
      var seen = {};
      seen[unit.id] = true;
      for (var sign = -1; sign <= 1; sign += 2) {
        var x = unit.x + axis.dx * sign;
        var y = unit.y + axis.dy * sign;
        while (inBoard(x, y)) {
          // 自己身体的第二格不是“另一只三角龙”，跳过但继续沿同一直线检查。
          if (own[key(x, y)]) {
            x += axis.dx * sign;
            y += axis.dy * sign;
            continue;
          }
          var other = self.unitAt(x, y, unit.id);
          if (!other) break;
          if (other.team !== unit.team || other.type !== 'trike' || other.facing !== unit.facing || !other.alive) break;
          // 同一只三角龙的头和尾可能都落在这条线上，按单位去重，只计一次。
          if (!seen[other.id]) {
            seen[other.id] = true;
            count += 1;
          }
          x += axis.dx * sign;
          y += axis.dy * sign;
        }
      }
      if (count > best) best = count;
    });
    return best >= 2 ? best : 0;
  };


  Game.prototype.isInFacingArc = function (target, source) {
    if (!target || !source) return false;
    var dir = DIRECTIONS[target.facing];
    if (!dir) return false;
    var tc = centerFor(target);
    var sc = centerFor(source);
    if (!tc || !sc) return false;
    var vx = sc.x - tc.x;
    var vy = sc.y - tc.y;
    var len = Math.sqrt(vx * vx + vy * vy);
    if (len === 0) return false;
    var dot = (vx * dir.x + vy * dir.y) / len;
    return dot >= Math.SQRT1_2 - 1e-9;
  };

  Game.prototype.isAdjacent = function (a, b) {
    return distance(a, b) === 1;
  };

  Game.prototype.isLockedFromAttacking = function (unit, target) {
    var lock = unit.status.ankyLock;
    return !!(lock && target && lock.sourceId === target.id && this.round <= lock.untilRound);
  };

  Game.prototype.getAttackTargets = function (unit) {
    var self = this;
    if (this.phase !== 'battle' || !unit || !unit.alive) return [];
    var sources = this.getHookSourceIds(unit);
    return this.getEnemies(unit.team).filter(function (enemy) {
      if (sources.indexOf(enemy.id) >= 0) return false;
      return self.isAdjacent(unit, enemy) && !self.isLockedFromAttacking(unit, enemy);
    });
  };

  Game.prototype.getSideCells = function (unit) {
    var dir = DIRECTIONS[unit.facing];
    // 朝向的左右两侧，即与朝向垂直的两个正交方向。
    var left = { x: -dir.y, y: dir.x };
    var right = { x: dir.y, y: -dir.x };
    return [left, right];
  };

  Game.prototype.getSideTargets = function (unit) {
    var self = this;
    var footprint = this.getFootprint(unit);
    var seen = {};
    return this.getSideCells(unit).map(function (side) {
      for (var i = 0; i < footprint.length; i++) {
        var target = self.unitAt(footprint[i].x + side.x, footprint[i].y + side.y);
        if (target && target.alive && target.team !== unit.team && !seen[target.id] && !self.isLockedFromAttacking(unit, target) && self.getHookSourceIds(unit).indexOf(target.id) < 0) {
          seen[target.id] = true;
          return target;
        }
      }
      return null;
    }).filter(Boolean);
  };

  Game.prototype.getSkillStatus = function (unit) {
    var def = SPECIES[unit.type];
    var result = {
      name: def.skillName,
      desc: def.skillDesc,
      readyRound: unit.skillReadyRound,
      cooldownReady: this.round >= unit.skillReadyRound,
      ready: false,
      reason: '',
      targets: []
    };
    if (this.phase === 'deploy') { result.reason = '布阵阶段，尚未开始战斗'; return result; }
    if (this.phase !== 'battle') { result.reason = '战斗已经结束'; return result; }
    if (!unit.alive) { result.reason = '本单位已被击败'; return result; }
    if (unit.team !== this.activeTeam) { result.reason = '当前不是本方行动回合'; return result; }
    if (unit.status.devour && unit.status.devour.active) { result.reason = '正在吞食，无法行动'; return result; }
    if (unit.turn.done || unit.turn.actionUsed) { result.reason = '本单位本回合已结束行动'; return result; }
    if (unit.turn.skillUsed) { result.reason = '本回合已经发动过技能'; return result; }
    if (!result.cooldownReady) {
      result.reason = '冷却中 · 第 ' + unit.skillReadyRound + ' 回合可用';
      return result;
    }

    if (unit.type === 'leso') {
      result.targets = this.getSideTargets(unit);
      if (result.targets.length === 0) { result.reason = '两侧没有可攻击的敌人'; return result; }
    } else if (unit.type === 'anky') {
      result.targets = this.getAttackTargets(unit);
      if (result.targets.length === 0) { result.reason = '攻击范围内没有敌人'; return result; }
    } else if (unit.type === 'velo') {
      var hookCheck = this.canUseHook(unit);
      if (!hookCheck.allowed) { result.reason = hookCheck.reason; return result; }
      result.targets = [hookCheck.target];
    } else if (unit.type === 'stego') {
      if (this.isFormActive(unit)) { result.reason = '反击形态已开启'; return result; }
    } else if (unit.type === 'trike') {
      if (unit.status.guard) { result.reason = '防御反击已经处于待发状态'; return result; }
    }

    result.ready = true;
    return result;
  };

  Game.prototype.useSkill = function (unitId, targetId) {
    var events = [];
    var unit = this.getUnit(unitId);
    if (!unit) return { ok: false, error: '找不到该单位。', events: events };
    var status = this.getSkillStatus(unit);
    if (!status.ready) return { ok: false, error: status.reason, events: events };

    var ankyTarget = null;
    if (unit.type === 'anky') {
      ankyTarget = this.getUnit(targetId);
      if (!ankyTarget || !this.getAttackTargets(unit).some(function (t) { return t.id === ankyTarget.id; })) {
        return { ok: false, error: '请选择一个攻击范围内的敌人。', events: events };
      }
    }

    var def = SPECIES[unit.type];
    this.pushLog(events, unit.name + ' 发动技能「' + def.skillName + '」。', 'skill');
    events.push({ type: 'skill', unitId: unit.id, name: def.skillName, x: unit.x, y: unit.y });

    if (unit.type === 'trike') {
      unit.status.guard = true;
      unit.skillReadyRound = this.round + def.skillCd + 1;
      this.consumeAction(unit);
      this.pushLog(events, unit.name + ' 架起防御姿态，等待下一次攻击。', 'status');
      events.push({ type: 'status', unitId: unit.id, status: 'guard-on' });
    } else if (unit.type === 'trex') {
      unit.turn.moveLeft += 2;
      unit.turn.extraMove += 2;
      unit.turn.skillUsed = true;
      unit.status.assaultBonus = 1;
      unit.skillReadyRound = this.round + def.skillCd + 1;
      this.pushLog(events, unit.name + ' 进入突袭状态：本回合行动力 +2，下一次攻击伤害 +1，仍可攻击。', 'status');
      events.push({ type: 'status', unitId: unit.id, status: 'assault' });
    } else if (unit.type === 'stego') {
      unit.status.formUntil = this.round + 1;
      unit.turn.skillUsed = true;
      unit.skillReadyRound = this.round + def.skillCd + 1;
      this.pushLog(events, unit.name + ' 挥动尾刃，进入反击形态（持续至第 ' + (this.round + 1) + ' 回合结束）。', 'status');
      events.push({ type: 'status', unitId: unit.id, status: 'form-on' });
    } else if (unit.type === 'leso') {
      unit.turn.skillUsed = true;
      unit.skillReadyRound = this.round + def.skillCd + 1;
      this.consumeAction(unit);
      // getSideTargets 每侧至多一个，直接顺序处理。
      var sideTargets = this.getSideTargets(unit);
      for (var i = 0; i < sideTargets.length; i++) {
        var target = sideTargets[i];
        if (!unit.alive || !target.alive || this.phase !== 'battle') break;
        this.pushLog(events, unit.name + ' 的侧刺扫向 ' + target.name + '！', 'skill');
        var res = this._damage(target, 3, {
          source: unit,
          kind: 'skill',
          isAttack: true,
          skillName: def.skillName,
          allowDevour: false
        }, events);
        if (!unit.alive) break;
        if (!res.blocked && target.alive && this.rng() < 0.5) {
          this.addBleed(target, unit, events);
        }
      }
    } else if (unit.type === 'velo') {
      unit.turn.skillUsed = true;
      var hookResult = this.useHook(unit, events);
      if (!hookResult.ok) return { ok: false, error: hookResult.error, events: events };
      unit.skillReadyRound = this.round + def.skillCd + 1;
      this.consumeAction(unit);
    } else if (unit.type === 'anky') {
      unit.turn.skillUsed = true;
      unit.skillReadyRound = this.round + def.skillCd + 1;
      this.consumeAction(unit);
      this.pushLog(events, unit.name + ' 抡起尾槌砸向 ' + ankyTarget.name + '！', 'skill');
      if (this.rng() < 2 / 3) {
        var hit = this._damage(ankyTarget, 3, {
          source: unit,
          kind: 'skill',
          isAttack: true,
          skillName: def.skillName,
          allowDevour: false
        }, events);
        if (!hit.blocked && unit.alive && ankyTarget.alive) {
          if (ankyTarget.armor > 0) {
            var extra = Math.min(2, ankyTarget.armor);
            ankyTarget.armor -= extra;
            this.pushLog(events, '尾槌震荡：' + ankyTarget.name + ' 的护甲再受 ' + extra + ' 点伤害。', 'attack');
            events.push({ type: 'damage', unitId: ankyTarget.id, amount: 0, armorDamage: extra, hpDamage: 0, x: ankyTarget.x, y: ankyTarget.y, kind: 'armor', sourceId: unit.id });
          } else {
            this.pushLog(events, '尾槌破甲：' + ankyTarget.name + ' 再失去 1 点生命。', 'attack');
            this._damage(ankyTarget, 1, {
              source: unit,
              kind: 'skill',
              isAttack: true,
              ignoreArmor: true,
              canBeGuarded: false,
              skipPhalanx: true,
              noThorns: true,
              allowDevour: true,
              creditKill: true
            }, events);
          }
        }
        if (!hit.blocked && unit.alive && ankyTarget.alive && this.rng() < 0.5) {
          ankyTarget.status.ankyLock = { sourceId: unit.id, untilRound: this.round + 1 };
          this.pushLog(events, ankyTarget.name + ' 被尾槌震晕，1 回合内无法攻击 ' + unit.name + '。', 'status');
          events.push({ type: 'status', unitId: ankyTarget.id, status: 'anky-lock' });
        }
      } else {
        this.pushLog(events, '尾槌落空，' + ankyTarget.name + ' 躲开了攻击。', 'system');
        events.push({ type: 'miss', unitId: ankyTarget.id, x: ankyTarget.x, y: ankyTarget.y });
      }
    }
    this.checkVictory(events);
    return { ok: true, events: events };
  };

  Game.prototype.consumeAction = function (unit) {
    unit.turn.actionUsed = true;
    unit.turn.done = true;
  };

  Game.prototype.attack = function (unitId, targetId) {
    var events = [];
    var unit = this.getUnit(unitId);
    if (!unit) return { ok: false, error: '找不到该单位。', events: events };
    if (this.phase !== 'battle') return { ok: false, error: '战斗已经结束。', events: events };
    if (!unit.alive) return { ok: false, error: '本单位已被击败。', events: events };
    if (unit.team !== this.activeTeam) return { ok: false, error: '当前不是本方行动回合。', events: events };
    if (unit.status.devour && unit.status.devour.active) return { ok: false, error: '正在吞食，无法攻击。', events: events };
    if (unit.turn.done || unit.turn.actionUsed) return { ok: false, error: '本单位本回合已结束行动。', events: events };
    var target = this.getUnit(targetId);
    if (!target || !target.alive || target.team === unit.team) return { ok: false, error: '请选择敌方单位。', events: events };
    if (this.getHookSourceIds(unit).indexOf(target.id) >= 0) return { ok: false, error: '受钩挂影响，无法攻击施加者。', events: events };
    if (!this.isAdjacent(unit, target)) return { ok: false, error: '目标不在攻击范围内。', events: events };
    if (this.isLockedFromAttacking(unit, target)) return { ok: false, error: '你被尾槌压制，无法攻击这只甲龙。', events: events };

    this.consumeAction(unit);
    var def = SPECIES[unit.type];
    this.pushLog(events, unit.name + ' 攻击 ' + target.name + '。', 'attack');
    events.push({ type: 'attack', unitId: unit.id, targetId: target.id, from: { x: unit.x, y: unit.y }, to: { x: target.x, y: target.y } });

    var raw = this.getAttack(unit);
    if (unit.type === 'velo' && unit.status.hook) {
      raw += 2;
      this.pushLog(events, unit.name + ' 处于钩挂状态，攻击 +2。', 'hook');
      events.push({ type: 'status', unitId: unit.id, status: 'hook-attack' });
    }
    if (unit.type === 'trex' && unit.status.assaultBonus) {
      var bonus = unit.status.assaultBonus;
      unit.status.assaultBonus = 0;
      raw += bonus;
      this.pushLog(events, unit.name + ' 的突袭蓄力生效，本次攻击伤害 +' + bonus + '。', 'status');
      events.push({ type: 'status', unitId: unit.id, status: 'assault-used' });
    }
    var pierce = false;
    var formAtHit = this.isFormActive(unit);
    if (formAtHit && !unit.status.pierceUsed && this.rng() < 1 / 8) {
      pierce = true;
      raw *= 2;
      this.pushLog(events, '尾刃刺穿铠甲！' + unit.name + ' 本次伤害翻倍！', 'crit');
      events.push({ type: 'crit', unitId: unit.id, targetId: target.id, kind: 'pierce' });
    }

    var res = this._damage(target, raw, {
      source: unit,
      kind: 'attack',
      isAttack: true,
      allowDevour: true,
      armorDamageMultiplier: unit.type === 'velo' ? 0.5 : 1
    }, events);

    if (!res.blocked) {
      if (formAtHit && target.alive && unit.alive && this.rng() < 0.25) {
        this.addBleed(target, unit, events);
      }
      if (pierce && unit.alive) {
        this.applyPierceBreak(unit, events);
      }
    }
    return { ok: true, events: events };
  };

  Game.prototype.addBleed = function (target, source, events) {
    if (!target.alive) return;
    var stack = { remaining: 4, sourceId: source ? source.id : null };
    if (target.status.bleed.length >= 2) {
      var idx = 0;
      for (var i = 1; i < target.status.bleed.length; i++) {
        if (target.status.bleed[i].remaining < target.status.bleed[idx].remaining) idx = i;
      }
      target.status.bleed[idx] = stack;
      this.pushLog(events, target.name + ' 流血已满 2 层，刷新持续时间。', 'status');
    } else {
      target.status.bleed.push(stack);
      this.pushLog(events, target.name + ' 陷入流血（' + target.status.bleed.length + '/2 层）。', 'status');
    }
    events.push({ type: 'status', unitId: target.id, status: 'bleed', stacks: target.status.bleed.length });
  };

  Game.prototype.applyPierceBreak = function (unit, events) {
    unit.status.pierceUsed = true;
    unit.status.formUntil = 0;
    unit.status.atkPenalty += 1;
    unit.armorMax = Math.max(0, unit.armorMax - 1);
    if (unit.armor > unit.armorMax) unit.armor = unit.armorMax;
    this.pushLog(events, '穿刺耗尽尾刃：' + unit.name + ' 护甲上限 -1、攻击力 -1，反击形态结束，本局无法再次穿刺。', 'crit');
    events.push({ type: 'status', unitId: unit.id, status: 'pierce-break' });
  };

  Game.prototype.tickBleed = function (unit, events) {
    if (!unit.status.bleed.length) return;
    for (var i = unit.status.bleed.length - 1; i >= 0; i--) {
      if (!unit.alive) break;
      var stack = unit.status.bleed[i];
      stack.remaining -= 1;
      if (stack.remaining <= 0) {
        unit.status.bleed.splice(i, 1);
        var source = stack.sourceId ? this.getUnit(stack.sourceId) : null;
        this.pushLog(events, unit.name + ' 的流血发作，失去 1 点生命。', 'bleed');
        this._damage(unit, 1, {
          source: source && source.alive ? source : null,
          kind: 'bleed',
          isAttack: false,
          ignoreArmor: true,
          canBeGuarded: false,
          countsAsHit: false,
          allowDevour: false,
          creditKill: true,
          noThorns: true
        }, events);
      }
    }
  };

  Game.prototype._damage = function (target, raw, opts, events) {
    opts = opts || {};
    if (!target || !target.alive || raw <= 0) {
      return { blocked: false, applied: 0, armorDamage: 0, hpDamage: 0, zero: true };
    }

    if (target.status.guard && opts.canBeGuarded !== false) {
      target.status.guard = false;
      this.pushLog(events, target.name + ' 的防御姿态完全挡下了这次攻击！', 'guard');
      events.push({ type: 'guard', unitId: target.id, x: target.x, y: target.y, sourceId: opts.source ? opts.source.id : null });
      if (opts.source && opts.source.alive) {
        this.pushLog(events, target.name + ' 发动防御反击，对 ' + opts.source.name + ' 造成 4 点伤害！', 'counter');
        this._damage(opts.source, 4, {
          source: target,
          kind: 'counter',
          isAttack: true,
          canBeGuarded: false,
          allowDevour: false,
          creditKill: true,
          skipPhalanx: true
        }, events);
      }
      return { blocked: true, applied: 0, armorDamage: 0, hpDamage: 0 };
    }

    var amount = raw;
    var notes = [];
    if (opts.isAttack && opts.source && target.type === 'trike' && !opts.skipPhalanx) {
      var phalanx = this.getPhalanxSize(target);
      if (phalanx >= 2 && this.isInFacingArc(target, opts.source)) {
        var reduction = Math.min(5, phalanx);
        amount = Math.max(0, amount - reduction);
        notes.push('方阵减伤 ' + reduction);
        this.pushLog(events, target.name + ' 的希腊方阵削减了 ' + reduction + ' 点伤害。', 'guard');
      }
    }

    if (target.type === 'anky' && target.armor > 0 && amount > 0 && !opts.ignoreArmor) {
      var reduced = Math.max(1, Math.round(amount * 0.85));
      if (reduced < amount) notes.push('甲壳减伤 ' + (amount - reduced));
      amount = reduced;
    }

    if (amount <= 0) {
      this.pushLog(events, '攻击被完全化解，未造成伤害。', 'guard');
      events.push({ type: 'damage', unitId: target.id, amount: 0, armorDamage: 0, hpDamage: 0, x: target.x, y: target.y, kind: opts.kind || 'attack', sourceId: opts.source ? opts.source.id : null, note: notes.join('，') });
      return { blocked: false, applied: 0, armorDamage: 0, hpDamage: 0, zero: true };
    }

    var armorDamage = 0;
    var hpDamage = 0;
    if (opts.ignoreArmor) {
      hpDamage = amount;
      target.hp -= hpDamage;
    } else {
      if (opts.armorDamageMultiplier != null && opts.armorDamageMultiplier !== 1) {
        armorDamage = Math.min(target.armor, Math.max(0, Math.round(amount * opts.armorDamageMultiplier)));
        if (armorDamage < Math.min(target.armor, amount)) notes.push('脆弱之爪');
      } else {
        armorDamage = Math.min(target.armor, amount);
      }
      target.armor -= armorDamage;
      hpDamage = amount - armorDamage;
      target.hp -= hpDamage;
    }
    target.hp = roundHalf(target.hp);
    var total = armorDamage + hpDamage;
    if (total > 0 && opts.countsAsHit !== false) target.lastHitRound = this.round;

    var detail = [];
    if (armorDamage > 0) detail.push('护甲 -' + armorDamage);
    if (hpDamage > 0) detail.push('生命 -' + hpDamage);
    if (notes.length) detail.push(notes.join('，'));
    this.pushLog(events, target.name + ' 受到 ' + total + ' 点伤害' + (detail.length ? '（' + detail.join('；') + '）' : '') + '。', opts.kind === 'bleed' ? 'bleed' : 'damage');
    events.push({
      type: 'damage',
      unitId: target.id,
      amount: total,
      raw: raw,
      armorDamage: armorDamage,
      hpDamage: hpDamage,
      x: target.x,
      y: target.y,
      kind: opts.kind || 'attack',
      sourceId: opts.source ? opts.source.id : null,
      note: notes.join('，')
    });

    if (target.type === 'anky' && target.hp > 0 && armorDamage > 0 && opts.source && opts.source.alive && !opts.noThorns) {
      this.pushLog(events, target.name + ' 的甲壳反伤，对 ' + opts.source.name + ' 造成 1 点伤害。', 'counter');
      this._damage(opts.source, 1, {
        source: target,
        kind: 'thorns',
        isAttack: false,
        canBeGuarded: false,
        countsAsHit: true,
        creditKill: true,
        allowDevour: false,
        noThorns: true,
        skipPhalanx: true
      }, events);
    }

    if (target.alive && target.type === 'trex' && target.status.devour) {
      var dev = target.status.devour;
      if (dev.active && total >= 3) {
        dev.active = false;
        dev.interrupted = true;
        this.pushLog(events, target.name + ' 的吞食被 ' + total + ' 点伤害打断，进度保留。', 'status');
        events.push({ type: 'status', unitId: target.id, status: 'devour-interrupt' });
      }
      if (target.hp < 4) {
        dev.active = false;
        dev.interrupted = true;
        this.pushLog(events, target.name + ' 生命垂危，停止吞食。', 'status');
      }
    }

    if (target.hp <= 0) {
      this.killUnit(target, opts.source, opts, events);
    }
    return { blocked: false, applied: total, armorDamage: armorDamage, hpDamage: hpDamage };
  };

  Game.prototype.killUnit = function (target, killer, opts, events) {
    if (!target.alive) return;
    target.alive = false;
    target.hp = 0;
    target.status.guard = false;
    target.status.devour = null;
    this.pushLog(events, '☠ ' + target.name + ' 被击败！', 'death');
    events.push({ type: 'death', unitId: target.id, x: target.x, y: target.y, team: target.team });

    var self = this;
    this.units.forEach(function (source) {
      if (source.alive && source.status.hook && source.status.hook.targetId === target.id) {
        self.endHook(source, 'target_removed', events);
      }
    });
    if (target.status.hook) self.endHook(target, 'source_removed', events);
    this.units.forEach(function (unit) {
      if (!unit.status.hookReceived || !unit.status.hookReceived.length) return;
      unit.status.hookReceived = unit.status.hookReceived.filter(function (stack) { return stack.sourceId !== target.id; });
    });

    this.units.forEach(function (u) {
      if (u.status.ankyLock && u.status.ankyLock.sourceId === target.id) u.status.ankyLock = null;
    });

    if (killer && killer.alive && killer.team !== target.team && opts.creditKill !== false) {
      this.rewardKill(killer, target, opts, events);
    }
    if (!opts.deferVictory) this.checkVictory(events);
  };

  Game.prototype.rewardKill = function (killer, target, opts, events) {
    var directKill = opts.kind === 'attack' || opts.kind === 'skill';
    var canDevour = killer.type === 'trex' && directKill && killer.hp >= 4 && !killer.status.devour;
    if (canDevour) {
      var corpse = {
        id: 'corpse-' + (this.nextCorpseId++),
        unitId: target.id,
        name: target.name,
        species: target.type,
        team: target.team,
        x: target.x,
        y: target.y,
        size: target.size
      };
      this.corpses.push(corpse);
      var devourRounds = target.size >= 4 ? 3 : target.size;
      killer.status.devour = {
        corpseId: corpse.id,
        progress: 0,
        needed: devourRounds,
        active: true,
        interrupted: false
      };
      this.pushLog(events, killer.name + ' 开始吞食 ' + target.name + '（需 ' + devourRounds + ' 回合）。', 'heal');
      events.push({ type: 'corpse', corpse: corpse, unitId: killer.id, status: 'devour-start' });
    } else {
      var amount = roundHalf(target.maxHp / 4);
      var healed = this.healUnit(killer, amount, events, 'kill');
      this.pushLog(events, killer.name + ' 战胜了 ' + target.name + '，恢复 ' + amount + ' 点生命' + (healed < amount ? '（已达上限）' : '') + '。', 'heal');
      events.push({ type: 'status', unitId: killer.id, status: 'kill-heal', amount: amount });
    }
  };

  Game.prototype.progressDevour = function (unit, events, automatic) {
    var dev = unit.status.devour;
    if (!dev) return;
    var corpse = null;
    for (var i = 0; i < this.corpses.length; i++) if (this.corpses[i].id === dev.corpseId) corpse = this.corpses[i];
    if (!corpse) {
      unit.status.devour = null;
      this.pushLog(events, unit.name + ' 失去了吞食目标。', 'status');
      return;
    }
    if (unit.hp < 4) {
      dev.active = false;
      dev.interrupted = true;
      this.pushLog(events, unit.name + ' 生命值低于 4，无法继续吞食。', 'status');
      return;
    }
    dev.active = true;
    dev.progress += 1;
    this.healUnit(unit, 1, events, 'devour');
    this.pushLog(events, unit.name + ' 吞食 ' + corpse.name + '：进度 ' + dev.progress + '/' + dev.needed + '，恢复 1 点生命。', 'heal');
    events.push({ type: 'status', unitId: unit.id, status: 'devour-progress', progress: dev.progress, needed: dev.needed });
    if (dev.progress >= dev.needed) {
      this.corpses = this.corpses.filter(function (c) { return c.id !== corpse.id; });
      unit.status.devour = null;
      this.pushLog(events, '吞食完成！' + unit.name + ' 获得了完整的猎物养分。', 'heal');
      events.push({ type: 'corpse', corpse: corpse, unitId: unit.id, status: 'devour-done' });
    }
    if (unit.turn) unit.turn.done = true;
  };

  Game.prototype.resumeDevour = function (unitId) {
    var events = [];
    var unit = this.getUnit(unitId);
    if (!unit || !unit.alive) return { ok: false, error: '找不到该单位。', events: events };
    if (this.phase !== 'battle') return { ok: false, error: '战斗已经结束。', events: events };
    if (unit.team !== this.activeTeam) return { ok: false, error: '当前不是本方行动回合。', events: events };
    if (!unit.status.devour || unit.status.devour.active) return { ok: false, error: '当前没有可恢复的吞食。', events: events };
    if (unit.hp < 4) return { ok: false, error: '生命值低于 4，无法吞食。', events: events };
    if (unit.turn.done || unit.turn.actionUsed) return { ok: false, error: '本单位本回合已结束行动。', events: events };
    var corpse = null;
    for (var i = 0; i < this.corpses.length; i++) if (this.corpses[i].id === unit.status.devour.corpseId) corpse = this.corpses[i];
    if (!corpse) return { ok: false, error: '尸体已不存在。', events: events };
    if (distance(unit, corpse) > 1) return { ok: false, error: '需要靠近尸体才能继续吞食。', events: events };

    this.pushLog(events, unit.name + ' 重新开始吞食 ' + corpse.name + '。', 'heal');
    this.consumeAction(unit);
    this.progressDevour(unit, events, false);
    this.checkVictory(events);
    return { ok: true, events: events };
  };

  Game.prototype.findMoveDestinationAt = function (unit, x, y) {
    if (!unit || !unit.alive || this.phase !== 'battle') return null;
    var reachable = this.getReachable(unit);
    var candidates = [];
    for (var i = 0; i < reachable.length; i++) {
      var dest = reachable[i];
      var cells = footprintCells(unit, dest.x, dest.y, unit.facing);
      for (var j = 0; j < cells.length; j++) {
        if (cells[j].x === x && cells[j].y === y) {
          candidates.push(dest);
          break;
        }
      }
    }
    if (!candidates.length) return null;
    for (var k = 0; k < candidates.length; k++) {
      if (candidates[k].x === x && candidates[k].y === y) return candidates[k];
    }
    candidates.sort(function (a, b) { return a.dist - b.dist; });
    return candidates[0];
  };

  Game.prototype.getReachable = function (unit) {
    if (this.phase !== 'battle') return [];
    if (!unit || !unit.alive || !unit.turn || unit.turn.done || unit.turn.actionUsed) return [];
    if (unit.status.hook) return [];
    if (unit.status.devour && unit.status.devour.active) return [];
    var maxSteps = this.getMoveLeft(unit);
    if (maxSteps === 0) return [];
    var startKey = key(unit.x, unit.y);
    var queue = [{ x: unit.x, y: unit.y, dist: 0, path: [] }];
    var seen = {};
    seen[startKey] = true;
    var result = [];
    var dirs = [DIRECTIONS.N, DIRECTIONS.E, DIRECTIONS.S, DIRECTIONS.W];
    while (queue.length) {
      var cur = queue.shift();
      if (cur.dist >= maxSteps) continue;
      for (var i = 0; i < dirs.length; i++) {
        var nx = cur.x + dirs[i].x;
        var ny = cur.y + dirs[i].y;
        var k = key(nx, ny);
        if (!inBoard(nx, ny) || seen[k]) continue;
        if (!this.canPlaceUnit(unit, nx, ny, unit.facing, true)) continue;
        seen[k] = true;
        var step = { x: nx, y: ny, dist: cur.dist + 1 };
        var path = cur.path.concat([{ x: nx, y: ny }]);
        result.push({ x: nx, y: ny, dist: step.dist, path: path });
        queue.push({ x: nx, y: ny, dist: step.dist, path: path });
      }
    }
    return result;
  };

  Game.prototype.moveUnit = function (unitId, x, y) {
    var events = [];
    var unit = this.getUnit(unitId);
    if (!unit || !unit.alive) return { ok: false, error: '找不到该单位。', events: events };
    if (this.phase !== 'battle') return { ok: false, error: '战斗已经结束。', events: events };
    if (unit.team !== this.activeTeam) return { ok: false, error: '当前不是本方行动回合。', events: events };
    if (unit.turn.done || unit.turn.actionUsed) return { ok: false, error: '本单位本回合已结束行动。', events: events };
    if (unit.status.devour && unit.status.devour.active) return { ok: false, error: '正在吞食，无法移动。', events: events };
    if (!this.canPlaceUnit(unit, x, y, unit.facing, true)) return { ok: false, error: '目标位置空间不足。', events: events };
    var reachable = this.getReachable(unit);
    var dest = null;
    for (var i = 0; i < reachable.length; i++) {
      if (reachable[i].x === x && reachable[i].y === y) { dest = reachable[i]; break; }
    }
    if (!dest) return { ok: false, error: '该格不在移动范围内。', events: events };
    var from = { x: unit.x, y: unit.y };
    unit.x = x;
    unit.y = y;
    unit.turn.moveLeft -= dest.dist;
    unit.turn.moved = true;
    this.pushLog(events, unit.name + ' 移动到 (' + (x + 1) + ', ' + (y + 1) + ')。', 'move');
    events.push({ type: 'move', unitId: unit.id, from: from, to: { x: x, y: y }, path: dest.path });
    this.followHookTarget(unit, from.x, from.y, events);
    return { ok: true, events: events };
  };

  Game.prototype.rotateUnit = function (unitId, facing) {
    var events = [];
    var unit = this.getUnit(unitId);
    if (!unit || !unit.alive) return { ok: false, error: '找不到该单位。', events: events };
    if (this.phase !== 'battle' || unit.team !== this.activeTeam) return { ok: false, error: '当前不是本方行动回合。', events: events };
    if (unit.turn.done || unit.turn.actionUsed) return { ok: false, error: '本单位本回合已结束行动。', events: events };
    if (unit.status.devour && unit.status.devour.active) return { ok: false, error: '正在吞食，无法转向。', events: events };
    if (!DIRECTIONS[facing]) return { ok: false, error: '无效的朝向。', events: events };
    if (unit.facing === facing) return { ok: true, events: events };
    if (!this.canPlaceUnit(unit, unit.x, unit.y, facing, true)) return { ok: false, error: '周围空间不足，无法转向。', events: events };
    unit.facing = facing;
    events.push({ type: 'facing', unitId: unit.id, facing: facing });
    return { ok: true, events: events };
  };

  Game.prototype.endUnit = function (unitId) {
    var events = [];
    var unit = this.getUnit(unitId);
    if (!unit || !unit.alive) return { ok: false, error: '找不到该单位。', events: events };
    if (this.phase !== 'battle' || unit.team !== this.activeTeam) return { ok: false, error: '当前不是本方行动回合。', events: events };
    if (unit.turn.done) return { ok: true, events: events };
    unit.turn.done = true;
    this.pushLog(events, unit.name + ' 结束行动。', 'system');
    return { ok: true, events: events };
  };

  Game.prototype.checkVictory = function (events) {
    if (this.phase !== 'battle') return;
    var blue = this.getAlive('blue').length;
    var red = this.getAlive('red').length;
    if (blue > 0 && red > 0) return;
    this.phase = 'gameover';
    this.winner = blue === 0 && red === 0 ? 'draw' : (blue === 0 ? 'red' : 'blue');
    this.activeTeam = null;
    var text = this.winner === 'draw'
      ? '两支军团同归于尽，战斗以平局告终。'
      : teamName(this.winner) + ' 消灭了全部敌人，赢得胜利！';
    this.pushLog(events, '★ ' + text, 'victory');
    events.push({ type: 'gameover', winner: this.winner, text: text });
  };


  Game.prototype.getHookFrontTarget = function (unit) {
    if (!unit || !unit.alive) return null;
    var dir = DIRECTIONS[unit.facing];
    if (!dir) return null;
    var target = this.unitAt(unit.x + dir.x, unit.y + dir.y);
    if (!target || !target.alive || target.team === unit.team) return null;
    return target;
  };

  Game.prototype.getHookStacks = function (unit) {
    return (unit && unit.status && Array.isArray(unit.status.hookReceived)) ? unit.status.hookReceived : [];
  };

  Game.prototype.getHookMaxStacks = function (target) {
    return HOOK_MAX_STACKS[hookSizeKey(target)] || 0;
  };

  Game.prototype.getHookSourceIds = function (unit) {
    var seen = {};
    return this.getHookStacks(unit).map(function (stack) { return stack.sourceId; }).filter(function (id) {
      if (seen[id]) return false;
      seen[id] = true;
      return true;
    });
  };

  Game.prototype.canUseHook = function (unit) {
    if (!unit || !unit.alive) return { allowed: false, reason: '找不到该单位。' };
    if (this.phase !== 'battle') return { allowed: false, reason: '战斗已经结束。' };
    if (unit.team !== this.activeTeam) return { allowed: false, reason: '当前不是本方行动回合。' };
    if (unit.turn.done || unit.turn.actionUsed) return { allowed: false, reason: '本单位本回合已结束行动。' };
    if (unit.status.devour && unit.status.devour.active) return { allowed: false, reason: '正在吞食，无法行动。' };
    if (unit.status.hook) return { allowed: false, reason: '钩挂中，技能不充能。' };
    if (unit.skillReadyRound > this.round) return { allowed: false, reason: '冷却中 · 第 ' + unit.skillReadyRound + ' 回合可用' };
    var target = this.getHookFrontTarget(unit);
    if (!target) return { allowed: false, reason: '朝向一格内没有敌人。' };
    if (target.size < 4 && this.getHookStacks(target).length >= this.getHookMaxStacks(target)) {
      return { allowed: false, reason: '目标受钩挂层数已满。' };
    }
    return { allowed: true, target: target };
  };

  Game.prototype.useHook = function (unit, events) {
    var check = this.canUseHook(unit);
    if (!check.allowed) return { ok: false, error: check.reason, events: events };
    var target = check.target;
    if (target.size >= 4) {
      this.pushLog(events, unit.name + ' 的镰锯扑钩被 ' + target.name + ' 的巨大身躯弹开！', 'hook');
      this._damage(unit, 3, { source: target, kind: 'hook', isAttack: false, allowDevour: false }, events);
      if (target.alive) {
        this._damage(target, 1, { source: unit, kind: 'hook', isAttack: false, allowDevour: false, ignoreArmor: true }, events);
      }
      var dir = DIRECTIONS[unit.facing];
      var bx = unit.x - (dir ? dir.x : 0);
      var by = unit.y - (dir ? dir.y : 0);
      if (unit.alive && this.canPlaceUnit(unit, bx, by, unit.facing, true)) {
        var from = { x: unit.x, y: unit.y };
        unit.x = bx;
        unit.y = by;
        this.pushLog(events, unit.name + ' 被反震后退一格。', 'hook');
        events.push({ type: 'move', unitId: unit.id, from: from, to: { x: bx, y: by }, path: [{ x: bx, y: by }], forced: true });
      } else if (unit.alive) {
        this.pushLog(events, unit.name + ' 退路被阻挡，额外受到 1 点伤害。', 'hook');
        this._damage(unit, 1, { source: target, kind: 'hook', isAttack: false, allowDevour: false }, events);
      }
      return { ok: true, events: events, large: true };
    }
    target.status.hookReceived.push({ sourceId: unit.id, createdTurn: this.round });
    unit.status.hook = { targetId: target.id, turnsHeld: 0 };
    this.pushLog(events, unit.name + ' 对 ' + target.name + ' 施加受钩挂，并进入钩挂状态。', 'hook');
    events.push({ type: 'hook_created', sourceId: unit.id, targetId: target.id, stacks: target.status.hookReceived.length });
    if (target.status.hookReceived.length === 1) {
      events.push({ type: 'status', unitId: target.id, status: 'hook-received', stacks: 1 });
    }
    return { ok: true, events: events, target: target };
  };

  Game.prototype.endHook = function (unit, reason, events) {
    if (!unit || !unit.status.hook) return false;
    var target = this.getUnit(unit.status.hook.targetId);
    if (target) {
      for (var i = target.status.hookReceived.length - 1; i >= 0; i--) {
        if (target.status.hookReceived[i].sourceId === unit.id) {
          target.status.hookReceived.splice(i, 1);
          break;
        }
      }
    }
    unit.status.hook = null;
    unit.skillReadyRound = this.round + SPECIES[unit.type].skillCd + 1;
    var reasonLabels = {
      expired: '自动松脱',
      escaped: '目标摆脱',
      manual: '手动解除',
      dispelled: '被驱散',
      source_removed: '来源离场',
      target_removed: '目标离场',
      blocked: '退路被阻挡'
    };
    this.pushLog(events || [], unit.name + ' 的钩挂状态结束（' + (reasonLabels[reason] || '解除') + '）。', 'hook');
    (events || []).push({ type: 'hook_ended', sourceId: unit.id, reason: reason });
    return true;
  };

  Game.prototype.canReleaseHook = function (unitId) {
    var unit = this.getUnit(unitId);
    if (!unit || !unit.alive || !unit.status.hook) return { allowed: false, reason: '当前没有钩挂。' };
    if (this.phase !== 'battle' || unit.team !== this.activeTeam) return { allowed: false, reason: '当前不是本方行动回合。' };
    if (unit.turn.done || unit.turn.actionUsed) return { allowed: false, reason: '本单位本回合已结束行动。' };
    if (unit.status.hook.turnsHeld < 1) return { allowed: false, reason: '钩挂持续 1 回合后才能手动解除。' };
    return { allowed: true };
  };

  Game.prototype.releaseHook = function (unitId) {
    var events = [];
    var unit = this.getUnit(unitId);
    var check = this.canReleaseHook(unitId);
    if (!check.allowed) return { ok: false, error: check.reason, events: events };
    this.consumeAction(unit);
    this.endHook(unit, 'manual', events);
    return { ok: true, events: events };
  };

  Game.prototype.getHookEscapeChance = function (unit) {
    var key = hookSizeKey(unit);
    var range = HOOK_ESCAPE_RANGE[key];
    var max = HOOK_MAX_STACKS[key];
    var stacks = this.getHookStacks(unit).length;
    if (!range || !max || !stacks) return 0;
    if (max <= 1) return range[1];
    return range[0] + (range[1] - range[0]) * (stacks - 1) / (max - 1);
  };

  Game.prototype.canEscapeHook = function (unitId) {
    var unit = this.getUnit(unitId);
    if (!unit || !unit.alive) return { allowed: false, reason: '找不到该单位。' };
    if (!this.getHookStacks(unit).length) return { allowed: false, reason: '没有受钩挂效果。' };
    if (this.phase !== 'battle' || unit.team !== this.activeTeam) return { allowed: false, reason: '当前不是本方行动回合。' };
    if (unit.turn.done || unit.turn.actionUsed) return { allowed: false, reason: '本单位本回合已结束行动。' };
    if (unit.status.hookEscapeRound === this.round) return { allowed: false, reason: '本回合已经尝试过摆脱。' };
    return { allowed: true };
  };

  Game.prototype.escapeHook = function (unitId) {
    var events = [];
    var unit = this.getUnit(unitId);
    var check = this.canEscapeHook(unitId);
    if (!check.allowed) return { ok: false, error: check.reason, events: events };
    var chance = this.getHookEscapeChance(unit);
    var stacks = this.getHookStacks(unit);
    var stack = stacks[stacks.length - 1];
    var sourceId = stack ? stack.sourceId : null;
    var source = sourceId ? this.getUnit(sourceId) : null;
    this.consumeAction(unit);
    unit.status.hookEscapeRound = this.round;
    var success = this.rng() < chance;
    this.pushLog(events, unit.name + ' 尝试摆脱受钩挂（成功率 ' + Math.round(chance * 100) + '%）。', 'hook');
    if (success) {
      unit.status.hookReceived.pop();
      if (source && source.status.hook && source.status.hook.targetId === unit.id) {
        source.status.hook = null;
        source.skillReadyRound = this.round + SPECIES[source.type].skillCd + 1;
      }
      if (!unit.status.hookReceived.length) {
        if (source && source.alive) {
          this._damage(source, 2, { source: unit, kind: 'hook', isAttack: false, allowDevour: false }, events);
        }
      }
      this.pushLog(events, unit.name + ' 摆脱成功，失去一层受钩挂。', 'hook');
      events.push({ type: 'hook_ended', sourceId: sourceId, reason: 'escaped' });
    } else {
      this.pushLog(events, unit.name + ' 摆脱失败。', 'hook');
    }
    events.push({ type: 'escape_resolved', unitId: unit.id, success: success, removedLinkId: undefined, stacks: unit.status.hookReceived.length });
    return { ok: true, events: events, success: success };
  };

  Game.prototype.advanceHookStatus = function (team, events) {
    var self = this;
    this.units.forEach(function (unit) {
      if (!unit.alive || !unit.status.hook) return;
      var target = self.getUnit(unit.status.hook.targetId);
      var hasStack = target && target.alive && target.status.hookReceived.some(function (s) { return s.sourceId === unit.id; });
      if (!hasStack) { unit.status.hook = null; return; }
      if (unit.team !== team) return;
      unit.status.hook.turnsHeld += 1;
      if (unit.status.hook.turnsHeld >= 3) {
        self.endHook(unit, 'expired', events);
      }
    });
  };

  Game.prototype.followHookTarget = function (target, fromX, fromY, events) {
    var self = this;
    var dx = target.x - fromX;
    var dy = target.y - fromY;
    if (!dx && !dy) return;
    this.units.forEach(function (source) {
      if (!source.alive || !source.status.hook || source.team === target.team) return;
      if (source.status.hook.targetId !== target.id) return;
      var from = { x: source.x, y: source.y };
      var moved = false;
      var exactX = source.x + dx;
      var exactY = source.y + dy;
      if (self.canPlaceUnit(source, exactX, exactY, source.facing, true)) {
        source.x = exactX;
        source.y = exactY;
        moved = true;
      } else {
        // 终点被占时，拖到目标周围最近的可放置相邻格；没有则断钩。
        var cells = self.getFootprint(target);
        var seen = {};
        var candidates = [];
        cells.forEach(function (cell) {
          [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }].forEach(function (dir) {
            var nx = cell.x + dir.x;
            var ny = cell.y + dir.y;
            var k = nx + ',' + ny;
            if (seen[k] || !self.canPlaceUnit(source, nx, ny, source.facing, true)) return;
            seen[k] = true;
            candidates.push({ x: nx, y: ny, d: Math.max(Math.abs(nx - source.x), Math.abs(ny - source.y)) });
          });
        });
        candidates.sort(function (a, b) { return a.d - b.d; });
        if (candidates.length) {
          source.x = candidates[0].x;
          source.y = candidates[0].y;
          moved = true;
        }
      }
      if (moved) {
        self.pushLog(events, source.name + ' 被钩挂牵引，跟随 ' + target.name + ' 移动。', 'hook');
        events.push({ type: 'move', unitId: source.id, from: from, to: { x: source.x, y: source.y }, path: [{ x: source.x, y: source.y }], follow: true });
      } else if (distance(source, target) > 1) {
        self.pushLog(events, source.name + ' 的跟随落点被阻挡，钩挂断裂。', 'hook');
        self.endHook(source, 'blocked', events);
      }
    });
  };

  Game.prototype.getStatusList = function (unit) {
    var list = [];
    if (!unit || !unit.alive) return list;
    if (unit.status.guard) list.push({ key: 'guard', label: '防御反击待发', short: '盾' });
    if (unit.status.hook) {
      var hookedTarget = this.getUnit(unit.status.hook.targetId);
      list.push({ key: 'hook', label: '钩挂 · ' + (hookedTarget ? hookedTarget.name : '目标'), short: '钩' });
      if (unit.skillReadyRound > this.round) list.push({ key: 'hook-cooldown', label: '钩挂 · 技能不充能', short: '滞' });
    }
    var received = this.getHookStacks(unit);
    if (received.length) list.push({ key: 'hook-received', label: '受钩挂 ' + received.length + ' 层', short: '受' });
    if (unit.status.bleed.length) list.push({ key: 'bleed', label: '流血 ' + unit.status.bleed.length + ' 层', short: '血' });
    if (this.isFormActive(unit)) list.push({ key: 'form', label: '反击形态', short: '刃' });
    if (unit.status.ankyLock) list.push({ key: 'lock', label: '被尾槌压制', short: '晕' });
    if (unit.status.assaultBonus) list.push({ key: 'assault', label: '下次攻击 +1', short: '+1' });
    if (unit.status.devour) {
      if (unit.status.devour.active) list.push({ key: 'devour', label: '吞食 ' + unit.status.devour.progress + '/' + unit.status.devour.needed, short: '食' });
      else list.push({ key: 'devour-pause', label: '吞食中断 ' + unit.status.devour.progress + '/' + unit.status.devour.needed, short: '停' });
    }
    if (unit.status.pierceUsed) list.push({ key: 'pierce-used', label: '穿刺已耗尽', short: '损' });
    return list;
  };

  Game.prototype.isPlayerTeam = function () {
    return this.activeTeam === 'blue';
  };

  Game.prototype.snapshot = function () {
    return {
      round: this.round,
      activeTeam: this.activeTeam,
      phase: this.phase,
      winner: this.winner,
      units: JSON.parse(JSON.stringify(this.units)),
      corpses: JSON.parse(JSON.stringify(this.corpses)),
      nextUnitId: this.nextUnitId,
      nextCorpseId: this.nextCorpseId
    };
  };

  Game.fromSnapshot = function (snapshot) {
    if (!snapshot || !Array.isArray(snapshot.units)) throw new Error('无效的对局快照。');
    var g = Object.create(Game.prototype);
    g.rng = Math.random;
    g.round = snapshot.round || 1;
    g.activeTeam = Object.prototype.hasOwnProperty.call(snapshot, 'activeTeam') ? snapshot.activeTeam : 'blue';
    g.phase = snapshot.phase || 'battle';
    g.winner = snapshot.winner || null;
    g.units = JSON.parse(JSON.stringify(snapshot.units));
    g.corpses = JSON.parse(JSON.stringify(snapshot.corpses || []));
    g.nextUnitId = snapshot.nextUnitId || (g.units.length + 1);
    g.nextCorpseId = snapshot.nextCorpseId || (g.corpses.length + 1);
    g.startupEvents = [];
    return g;
  };

  var ENGINE = {
    Game: Game,
    SPECIES: SPECIES,
    SPECIES_ORDER: SPECIES_ORDER,
    TEAM_INFO: TEAM_INFO,
    TEAM_CAPACITY: TEAM_CAPACITY,
    BOARD_SIZE: BOARD_SIZE,
    DIRECTIONS: DIRECTIONS,
    FACING_ORDER: FACING_ORDER,
    teamName: teamName,
    distance: distance
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
  else global.DinoEngine = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
