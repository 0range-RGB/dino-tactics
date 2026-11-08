/* 核心规则自动测试：node tests/engine.test.js */
'use strict';
const assert = require('assert');
const E = require('../engine.js');

// 仅测试用木桩：替代已删除的三角龙作为通用多格目标。
E.SPECIES.dummy = {
  type: 'dummy', name: '测试木桩', latin: 'Dummy', size: 2, role: 'fixture', tags: [],
  diet: 'herbivore', hp: 6, armor: 4, attack: 3, move: 1, skillCd: 2,
  accent: '#888', emblem: '桩', skillName: '无', skillDesc: '',
  passiveName: '无', passiveDesc: '', skillType: 'active'
};
assert.strictEqual(E.BOARD_SIZE, 10, '测试套件版本不匹配：请确认 engine.js 是 10×10 版本');
console.log('\n测试套件：10×10 棋盘 · 56 项');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ok  ' + name);
  } catch (err) {
    console.error('FAIL  ' + name);
    console.error(err && err.stack || err);
    process.exitCode = 1;
  }
}
function seq(values, fallback) {
  let i = 0;
  return function () {
    if (i < values.length) return values[i++];
    return typeof fallback === 'number' ? fallback : 0.5;
  };
}
function make(blue, red, rng) {
  return new E.Game({ blueTeam: blue, redTeam: red, rng: rng || (() => 0.5) });
}
function place(unit, x, y, facing) {
  unit.x = x; unit.y = y;
  if (facing) unit.facing = facing;
}
function toRed(g) {
  const res = g.endTeamTurn();
  assert.ok(res.ok, res.error);
  assert.strictEqual(g.activeTeam, 'red');
}
function toNextRound(g) {
  const res = g.endTeamTurn();
  assert.ok(res.ok, res.error);
}

console.log('\n基础');
test('队伍容量与初始技能冷却', () => {
  const g = make(['dummy', 'stego', 'anky'], ['trex', 'leso']);
  assert.strictEqual(g.units.length, 5);
  assert.strictEqual(g.getTeamUnits('blue').length, 3);
  assert.strictEqual(g.getTeamUnits('red').length, 2);
  assert.strictEqual(g.getUnit('blue-1').skillReadyRound, 3);
  assert.strictEqual(g.getUnit('red-4').skillReadyRound, 4);
  assert.strictEqual(g.getSkillStatus(g.getUnit('blue-1')).ready, false);
});

test('剑龙行动力为 2', () => {
  const g = make(['stego'], ['dummy']);
  const s = g.getUnit('blue-1');
  assert.strictEqual(E.SPECIES.stego.move, 2);
  assert.strictEqual(s.move, 2);
  assert.strictEqual(s.turn.moveLeft, 2);
});

test('多格单位按整体占位平移并以整块落点选择', () => {
  const g = make(['trex'], ['leso']);
  const rex = g.getUnit('blue-1');
  const l = g.getUnit('red-2');
  place(rex, 5, 5, 'S'); place(l, 0, 0, 'N');
  const east = g.getReachable(rex).find(d => d.x === 6 && d.y === 5);
  assert.ok(east);
  const picked = g.findMoveDestinationAt(rex, 7, 5);
  assert.ok(picked);
  assert.strictEqual(picked.x, 6); assert.strictEqual(picked.y, 5);
  assert.ok(g.moveUnit(rex.id, picked.x, picked.y).ok);
  assert.deepStrictEqual(g.getFootprint(rex).map(c => c.x + ',' + c.y).sort(), ['6,5', '6,6', '7,5', '7,6']);

  const g2 = make(['dummy'], ['leso']);
  const tr = g2.getUnit('blue-1');
  const l2 = g2.getUnit('red-2');
  place(tr, 5, 5, 'N'); place(l2, 0, 0, 'N');
  const south = g2.getReachable(tr).find(d => d.x === 5 && d.y === 6);
  assert.ok(south);
  const picked2 = g2.findMoveDestinationAt(tr, 5, 6);
  assert.ok(picked2);
  assert.strictEqual(picked2.x, 5); assert.strictEqual(picked2.y, 6);
  assert.ok(g2.moveUnit(tr.id, picked2.x, picked2.y).ok);
  assert.deepStrictEqual(g2.getFootprint(tr).map(c => c.x + ',' + c.y).sort(), ['5,6', '5,7']);
});

test('开局布阵阶段可自由放置并对半场校验', () => {
  const g = new E.Game({ blueTeam: ['dummy', 'stego'], redTeam: ['leso'], deployOnly: true });
  assert.strictEqual(g.phase, 'deploy');
  assert.strictEqual(g.activeTeam, null);
  const t = g.getUnit('blue-1');
  const s = g.getUnit('blue-2');
  const l = g.getUnit('red-3');
  assert.strictEqual(E.BOARD_SIZE, 10);
  const cells = g.getDeployCells(t);
  assert.ok(cells.length > 0);
  assert.ok(cells.every(c => c.x >= 0 && c.x < 10 && c.y >= 5 && c.y < 10));
  assert.ok(g.deployMove(t.id, 0, 6).ok);
  assert.strictEqual(t.x, 0); assert.strictEqual(t.y, 6);
  assert.strictEqual(g.deployMove(t.id, 0, 0).ok, false);
  assert.strictEqual(g.deployMove(t.id, s.x, s.y).ok, false);
  assert.ok(g.deployRotate(t.id, 'W').ok);
  assert.strictEqual(t.facing, 'W');
  // 敌方单位仍可独立放在上半场。
  assert.ok(g.deployMove(l.id, 7, 1).ok);
  const started = g.beginBattle();
  assert.ok(started.ok, started.error);
  assert.strictEqual(g.phase, 'battle');
  assert.strictEqual(g.round, 1);
  assert.strictEqual(g.activeTeam, 'blue');
});

test('布阵阶段多格单位可整体平移 1 格', () => {
  const g = new E.Game({ blueTeam: ['trex', 'leso'], redTeam: ['anky'], deployOnly: true });
  const rex = g.getUnit('blue-1');
  const le = g.getUnit('blue-2');
  place(rex, 1, 5, 'N');
  place(le, 6, 5, 'N');
  const rexCells = g.getDeployCells(rex);
  assert.ok(rexCells.some(c => c.x === rex.x + 1 && c.y === rex.y));
  assert.ok(g.deployMove(rex.id, rex.x + 1, rex.y).ok);
  assert.strictEqual(rex.x, 2);
  // 仍不能平移叠到其他单位身上。
  assert.strictEqual(g.deployMove(le.id, rex.x, rex.y).ok, false);

  const g2 = new E.Game({ blueTeam: ['dummy'], redTeam: ['leso'], deployOnly: true });
  const tr = g2.getUnit('blue-1');
  const cells = g2.getDeployCells(tr);
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
    assert.ok(cells.some(c => c.x === tr.x + dx && c.y === tr.y + dy), 'missing ' + dx + ',' + dy);
  });
  assert.ok(g2.deployMove(tr.id, tr.x, tr.y + 1).ok);
  assert.strictEqual(tr.y, 7);
});

test('10×10 默认布阵镜像，红色大型单位上移一格', () => {
  const g = new E.Game({ blueTeam: ['trex', 'leso'], redTeam: ['trex', 'leso'], deployOnly: true });
  const bt = g.getUnit('blue-1');
  const bl = g.getUnit('blue-2');
  const rt = g.getUnit('red-3');
  const rl = g.getUnit('red-4');
  assert.strictEqual(E.BOARD_SIZE, 10);
  assert.strictEqual(bt.y, 6);
  assert.strictEqual(rt.y, 2);
  assert.strictEqual(bl.y, 6);
  assert.strictEqual(rl.y, 3);
  const mirror = g.getFootprint(bt).map(c => c.x + ',' + (9 - c.y)).sort();
  assert.deepStrictEqual(g.getFootprint(rt).map(c => c.x + ',' + c.y).sort(), mirror);
  const mirror2 = g.getFootprint(bl).map(c => c.x + ',' + (9 - c.y)).sort();
  assert.deepStrictEqual(g.getFootprint(rl).map(c => c.x + ',' + c.y).sort(), mirror2);
});

test('占格：中型 2 格、大型 4 格且不能重叠', () => {
  const g = new E.Game({ blueTeam: ['stego'], redTeam: ['trex'], deployOnly: true });
  const s = g.getUnit('blue-1');
  const rex = g.getUnit('red-2');
  assert.strictEqual(g.getFootprint(s).length, 2);
  assert.strictEqual(g.getFootprint(rex).length, 4);
  assert.strictEqual(g.unitAt(s.x, s.y + 1).id, s.id);
  assert.strictEqual(g.deployMove(s.id, rex.x, rex.y).ok, false);
});

test('攻击范围按整个占格计算', () => {
  const g = make(['trex'], ['leso']);
  const rex = g.getUnit('blue-1');
  const l = g.getUnit('red-2');
  place(rex, 5, 5, 'S');
  place(l, 7, 4, 'E');
  // 霸王龙占 x5-6 / y5-6，勒苏维斯龙占 x6-7 / y4；锚点相距 2，但身体相邻。
  assert.strictEqual(g.isAdjacent(rex, l), true);
  assert.ok(g.getAttackTargets(rex).some(u => u.id === l.id));
});

test('容量 8 可用，超出容量的阵容会被拒绝', () => {
  assert.strictEqual(E.TEAM_CAPACITY, 8);
  assert.ok(make(['trex', 'leso', 'stego'], ['leso']));
  assert.throws(() => make(['trex', 'trex', 'leso'], ['leso']), /容量/);
});

console.log('\n移动与攻击');
test('移动消耗行动力且不能穿过单位', () => {
  const g = make(['leso'], ['dummy']);
  const u = g.getUnit('blue-1');
  place(u, 6, 6, 'N');
  place(g.getUnit('red-2'), 0, 1, 'S');
  const before = g.getReachable(u).length;
  assert.ok(before > 0);
  const dest = g.getReachable(u).find(r => r.dist === 2);
  assert.ok(dest);
  const res = g.moveUnit(u.id, dest.x, dest.y);
  assert.ok(res.ok, res.error);
  assert.strictEqual(u.turn.moveLeft, 0);
  assert.strictEqual(g.moveUnit(u.id, 8, 8).ok, false);
});

test('攻击先扣护甲再扣生命，击杀恢复 1.5', () => {
  const g = make(['dummy'], ['leso']);
  const t = g.getUnit('blue-1');
  const l = g.getUnit('red-2');
  place(t, 5, 5, 'N'); place(l, 6, 5, 'N');
  t.hp = 4;
  l.armor = 0; l.hp = 1;
  const res = g.attack(t.id, l.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(l.alive, false);
  assert.strictEqual(t.hp, 5.5);
  assert.strictEqual(g.phase, 'gameover');
  assert.strictEqual(g.winner, 'blue');
});

console.log('\n被动');
test('甲龙护甲减伤与反伤', () => {
  const g = make(['anky'], ['leso']);
  const a = g.getUnit('blue-1');
  const l = g.getUnit('red-2');
  place(a, 5, 5, 'N'); place(l, 6, 5, 'N');
  toRed(g);
  const res = g.attack(l.id, a.id);
  assert.ok(res.ok, res.error);
  // 2 点伤害经 15% 减伤后仍为 2，护甲 4 - 2；反伤 1。
  assert.strictEqual(a.armor, 2);
  assert.strictEqual(l.armor, 2);
});

test('甲龙被致命一击时不会触发反伤复活', () => {
  const g = make(['anky', 'stego'], ['leso']);
  const a = g.getUnit('blue-1');
  const st = g.getUnit('blue-2');
  const l = g.getUnit('red-3');
  place(a, 5, 5, 'N'); place(l, 6, 5, 'N'); place(st, 0, 0, 'N');
  a.hp = 1; a.armor = 1;
  toRed(g);
  const res = g.attack(l.id, a.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(a.alive, false);
  assert.strictEqual(a.hp, 0);
  assert.strictEqual(l.armor, 3);
  assert.strictEqual(g.phase, 'battle');
});

test('尾槌压制只持续目标下一次行动', () => {
  const g = make(['anky', 'stego'], ['leso']);
  const a = g.getUnit('blue-1');
  const st = g.getUnit('blue-2');
  const l = g.getUnit('red-3');
  place(a, 5, 5, 'N'); place(l, 6, 5, 'N'); place(st, 0, 0, 'N');
  g.round = 4; a.skillReadyRound = 4;
  g.rng = seq([0, 0, 0, 0]);
  assert.ok(g.useSkill(a.id, l.id).ok);
  assert.ok(l.status.ankyLock);
  toRed(g); // 红方第 4 回合：被压制
  assert.ok(l.status.ankyLock);
  toNextRound(g); // 红方结束 -> 第 5 回合蓝方，压制解除
  assert.strictEqual(l.status.ankyLock, null);
  toNextRound(g); // 蓝方结束 -> 红方第 5 回合
  assert.strictEqual(g.activeTeam, 'red');
  assert.strictEqual(l.status.ankyLock, null);
});

test('甲龙尾槌破甲时追加 1 点生命伤害并施加压制', () => {
  const g = make(['anky'], ['leso']);
  const a = g.getUnit('blue-1');
  const l = g.getUnit('red-2');
  place(a, 5, 5, 'N'); place(l, 6, 5, 'N');
  g.round = 4; a.skillReadyRound = 4;
  // 命中、两次荆棘背刺、压制各消耗一次随机数。
  g.rng = seq([0, 0, 0, 0]);
  const res = g.useSkill(a.id, l.id);
  assert.ok(res.ok, res.error);
  // 3 点伤害击破 3 点护甲，再追加 1 点生命伤害。
  assert.strictEqual(l.armor, 0);
  assert.strictEqual(l.hp, 5);
  assert.ok(l.status.ankyLock);
  toRed(g);
  assert.strictEqual(g.getAttackTargets(l).some(u => u.id === a.id), false);
  assert.strictEqual(g.attack(l.id, a.id).ok, false);
});

test('甲龙尾槌未破甲时追加 2 点护甲伤害', () => {
  const g = make(['anky'], ['dummy']);
  const a = g.getUnit('blue-1');
  const t = g.getUnit('red-2');
  place(a, 5, 5, 'N'); place(t, 6, 5, 'N');
  g.round = 4; a.skillReadyRound = 4;
  g.rng = seq([0, 0.2]);
  const res = g.useSkill(a.id, t.id);
  assert.ok(res.ok, res.error);
  // 3 点伤害把 4 点护甲打到 1，未破甲，再造成 2 点护甲伤害。
  assert.strictEqual(t.armor, 0);
  assert.strictEqual(t.hp, 6);
  assert.ok(t.status.ankyLock);
});

test('甲龙尾槌未命中时不造成伤害', () => {
  const g = make(['anky'], ['leso']);
  const a = g.getUnit('blue-1');
  const l = g.getUnit('red-2');
  place(a, 5, 5, 'N'); place(l, 6, 5, 'N');
  g.round = 4; a.skillReadyRound = 4;
  g.rng = seq([0.9]);
  const res = g.useSkill(a.id, l.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(l.armor, 3);
  assert.strictEqual(l.hp, 6);
  assert.strictEqual(l.status.ankyLock, null);
  assert.strictEqual(a.turn.done, true);
  assert.strictEqual(a.skillReadyRound, 8);
});

console.log('\n技能与状态');
test('侧刺同时攻击两侧并附加流血', () => {
  const g = make(['leso'], ['dummy', 'anky']);
  const le = g.getUnit('blue-1');
  const tr = g.getUnit('red-2');
  const an = g.getUnit('red-3');
  place(le, 5, 5, 'N');
  place(tr, 6, 5, 'N');
  place(an, 4, 5, 'N');
  g.round = 3; le.skillReadyRound = 3;
  g.rng = seq([0, 0.9]);
  const res = g.useSkill(le.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(tr.armor, 1);
  assert.strictEqual(tr.status.bleed.length, 1);
  assert.strictEqual(an.armor, 1);
  assert.strictEqual(an.hp, 4);
  assert.strictEqual(le.turn.done, true);
});

test('剑龙反击形态穿刺造成双倍伤害并永久削弱', () => {
  const g = make(['stego'], ['trex']);
  const s = g.getUnit('blue-1');
  const rex = g.getUnit('red-2');
  place(s, 5, 5, 'N'); place(rex, 6, 5, 'S');
  g.round = 4; s.skillReadyRound = 4;
  assert.ok(g.useSkill(s.id).ok);
  assert.strictEqual(g.isFormActive(s), true);
  // 第一次 rng 触发穿刺，第二次 rng 触发流血。
  g.rng = seq([0, 0]);
  const res = g.attack(s.id, rex.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(rex.hp, 6);
  assert.strictEqual(rex.armor, 0);
  assert.strictEqual(rex.status.bleed.length, 1);
  assert.strictEqual(s.status.pierceUsed, true);
  assert.strictEqual(s.status.atkPenalty, 1);
  assert.strictEqual(s.armorMax, 1);
  assert.strictEqual(g.isFormActive(s), false);
  assert.strictEqual(g.getAttack(s), 2);
});

test('霸王龙突袭 +2 行动力且仍可攻击', () => {
  const g = make(['dummy'], ['trex']);
  const rex = g.getUnit('red-2');
  const t = g.getUnit('blue-1');
  place(rex, 3, 2, 'S');
  place(t, 6, 4, 'N');
  g.round = 4; rex.skillReadyRound = 4;
  assert.strictEqual(rex.armor, 2);
  toRed(g);
  assert.ok(g.useSkill(rex.id).ok);
  assert.strictEqual(rex.status.assaultBonus, 1);
  assert.strictEqual(rex.turn.moveLeft, 3);
  assert.ok(g.moveUnit(rex.id, 4, 2).ok);
  assert.strictEqual(rex.turn.moveLeft, 2);
  const res = g.attack(rex.id, t.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(t.hp, 2);
  assert.strictEqual(t.armor, 0);
  assert.strictEqual(rex.status.assaultBonus, 0);
  assert.strictEqual(rex.turn.done, true);
  assert.strictEqual(rex.skillReadyRound, 8);
});

test('突袭攻击加成保留到下一次攻击', () => {
  const g = make(['dummy'], ['trex']);
  const rex = g.getUnit('red-2');
  const t = g.getUnit('blue-1');
  place(rex, 3, 2, 'S');
  place(t, 6, 4, 'N');
  g.round = 4; rex.skillReadyRound = 4;
  toRed(g);
  assert.ok(g.useSkill(rex.id).ok);
  assert.strictEqual(rex.status.assaultBonus, 1);
  // 本回合不攻击，结束红方与蓝方回合后再攻击。
  toNextRound(g);
  toNextRound(g);
  assert.strictEqual(g.activeTeam, 'red');
  assert.strictEqual(rex.status.assaultBonus, 1);
  assert.ok(g.moveUnit(rex.id, 4, 2).ok);
  const res = g.attack(rex.id, t.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(t.hp, 2);
  assert.strictEqual(rex.status.assaultBonus, 0);
});

console.log('\n吞食');
test('霸王龙击杀后分回合吞食并恢复生命', () => {
  const g = make(['anky', 'stego'], ['trex']);
  const a = g.getUnit('blue-1');
  const st = g.getUnit('blue-2');
  const rex = g.getUnit('red-3');
  place(a, 7, 5, 'N'); place(rex, 5, 5, 'S'); place(st, 0, 0, 'N');
  g.round = 2;
  a.armor = 0; a.hp = 4;
  rex.hp = 8;
  toRed(g);
  const res = g.attack(rex.id, a.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(a.alive, false);
  assert.ok(rex.status.devour);
  assert.strictEqual(rex.status.devour.needed, 2);
  assert.strictEqual(g.corpses.length, 1);
  // 红方结束 -> 第 3 回合蓝方；蓝方结束 -> 红方开始，吞食 +1。
  toNextRound(g);
  assert.strictEqual(g.round, 3);
  assert.strictEqual(g.activeTeam, 'blue');
  rex.lastHitRound = 2;
  toNextRound(g);
  assert.strictEqual(g.activeTeam, 'red');
  assert.strictEqual(rex.status.devour.progress, 1);
  assert.strictEqual(rex.hp, 9);
  assert.strictEqual(rex.turn.done, true);
  // 红方结束 -> 第 4 回合；蓝方结束 -> 红方开始，吞食完成。
  toNextRound(g);
  toNextRound(g);
  assert.strictEqual(rex.status.devour, null);
  assert.strictEqual(g.corpses.length, 0);
  assert.ok(rex.hp >= 10);
});

test('吞食大型猎物的所需回合为 3', () => {
  const g = make(['trex', 'leso'], ['trex']);
  const bt = g.getUnit('blue-1');
  const bl = g.getUnit('blue-2');
  const rt = g.getUnit('red-3');
  place(bt, 7, 5, 'N'); place(rt, 5, 5, 'S'); place(bl, 0, 0, 'N');
  bt.armor = 0; bt.hp = 5;
  toRed(g);
  const res = g.attack(rt.id, bt.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(bt.alive, false);
  assert.ok(rt.status.devour);
  assert.strictEqual(rt.status.devour.needed, 3);
});

test('受到 3 点伤害会打断吞食并保留进度', () => {
  const g = make(['anky', 'stego'], ['trex']);
  const a = g.getUnit('blue-1');
  const st = g.getUnit('blue-2');
  const rex = g.getUnit('red-3');
  place(a, 7, 5, 'N'); place(rex, 5, 5, 'S'); place(st, 4, 6, 'N');
  g.round = 2;
  a.armor = 0; a.hp = 4;
  rex.hp = 8;
  toRed(g);
  assert.ok(g.attack(rex.id, a.id).ok);
  assert.ok(rex.status.devour.active);
  toNextRound(g); // 红结束 -> 第3回合蓝
  assert.strictEqual(g.activeTeam, 'blue');
  rex.lastHitRound = 3;
  const atk = g.attack(st.id, rex.id);
  assert.ok(atk.ok, atk.error);
  assert.strictEqual(rex.status.devour.active, false);
  assert.strictEqual(rex.status.devour.interrupted, true);
  assert.strictEqual(rex.status.devour.progress, 0);
  toNextRound(g); // 蓝结束 -> 红开始，不应自动推进
  assert.strictEqual(g.activeTeam, 'red');
  assert.strictEqual(rex.turn.done, false);
  assert.strictEqual(rex.status.devour.progress, 0);
  // 尸体相邻，可以消耗回合继续吞食。
  const resume = g.resumeDevour(rex.id);
  assert.ok(resume.ok, resume.error);
  assert.strictEqual(rex.status.devour.progress, 1);
  assert.strictEqual(rex.turn.done, true);
});

test('生命值低于 4 时改为普通击杀恢复', () => {
  const g = make(['anky', 'stego'], ['trex']);
  const a = g.getUnit('blue-1');
  const st = g.getUnit('blue-2');
  const rex = g.getUnit('red-3');
  place(a, 7, 5, 'N'); place(rex, 5, 5, 'S'); place(st, 0, 0, 'N');
  a.armor = 0; a.hp = 4;
  rex.hp = 3;
  toRed(g);
  assert.ok(g.attack(rex.id, a.id).ok);
  assert.strictEqual(rex.status.devour, null);
  assert.strictEqual(g.corpses.length, 0);
  // 甲龙最大生命值为 4，击杀恢复 1 点。
  assert.strictEqual(rex.hp, 4);
});

console.log('\n回合结算');
test('回合结束恢复护甲、连续 3 回合未受伤恢复生命', () => {
  const g = make(['anky'], ['leso']);
  const a = g.getUnit('blue-1');
  a.hp = 3; a.armor = 0; a.lastHitRound = 0;
  g.round = 3;
  g.endRound([]);
  assert.strictEqual(a.armor, 1);
  assert.strictEqual(a.hp, 4);
  assert.strictEqual(a.lastHitRound, 3);
});

test('流血倒计时结束后直接损失 1 点生命', () => {
  const g = make(['dummy'], ['leso']);
  const l = g.getUnit('red-2');
  l.hp = 6; l.armor = 3; l.lastHitRound = 1;
  l.status.bleed = [{ remaining: 1, sourceId: 'blue-1' }];
  g.round = 1;
  g.endRound([]);
  assert.strictEqual(l.hp, 5);
  assert.strictEqual(l.armor, 3);
  assert.strictEqual(l.status.bleed.length, 0);
});

test('连续 3 回合未受伤会消退一层流血', () => {
  const g = make(['dummy'], ['leso']);
  const l = g.getUnit('red-2');
  l.hp = 6; l.armor = 3; l.lastHitRound = 0;
  l.status.bleed = [{ remaining: 4, sourceId: 'blue-1' }];
  g.round = 3;
  g.endRound([]);
  assert.strictEqual(l.status.bleed.length, 0);
  assert.strictEqual(l.hp, 6);
});

test('流血最多两层，超出时刷新最短层', () => {
  const g = make(['leso'], ['dummy']);
  const le = g.getUnit('blue-1');
  const tr = g.getUnit('red-2');
  const events = [];
  g.addBleed(tr, le, events);
  tr.status.bleed[0].remaining = 2;
  g.addBleed(tr, le, events);
  assert.strictEqual(tr.status.bleed.length, 2);
  g.addBleed(tr, le, events);
  assert.strictEqual(tr.status.bleed.length, 2);
  assert.ok(tr.status.bleed.some(s => s.remaining === 4));
});

test('第15回合起所有单位每回合失去1点生命', () => {
  const g = make(['dummy'], ['anky']);
  const tr = g.getUnit('blue-1');
  const an = g.getUnit('red-2');
  g.round = 14;
  g.units.forEach(u => { u.lastHitRound = 14; });
  const trHp = tr.hp, anHp = an.hp, trArmor = tr.armor;
  g.endRound([]);
  assert.strictEqual(g.round, 15);
  assert.strictEqual(tr.hp, trHp);
  assert.strictEqual(an.hp, anHp);

  g.units.forEach(u => { u.lastHitRound = 15; });
  g.endRound([]);
  assert.strictEqual(tr.hp, trHp - 1);
  assert.strictEqual(an.hp, anHp - 1);
  assert.strictEqual(tr.armor, trArmor);
  assert.strictEqual(g.round, 16);
});

test('环境侵蚀同时击杀双方时判平局', () => {
  const g = make(['dummy'], ['leso']);
  g.round = 15;
  g.units.forEach(u => { u.hp = 1; u.lastHitRound = 15; });
  g.endRound([]);
  assert.strictEqual(g.phase, 'gameover');
  assert.strictEqual(g.winner, 'draw');
});

test('双方全灭判定平局', () => {
  const g = make(['anky'], ['leso']);
  g.getUnit('blue-1').alive = false;
  g.getUnit('red-2').alive = false;
  g.checkVictory([]);
  assert.strictEqual(g.phase, 'gameover');
  assert.strictEqual(g.winner, 'draw');
});



test('伶盗龙镰锯扑钩施加受钩挂并限制双方', () => {
  const g = make(['velo'], ['leso']);
  const v = g.getUnit('blue-1');
  const t = g.getUnit('red-2');
  place(v, 5, 5, 'E'); place(t, 6, 5, 'W');
  g.round = 1; v.skillReadyRound = 1; v.turn.actionUsed = false; v.turn.done = false;
  const res = g.useSkill(v.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(g.getHookStacks(t).length, 1);
  assert.ok(v.status.hook);
  assert.strictEqual(g.getReachable(v).length, 0);
  assert.strictEqual(g.getMoveLeft(t), t.move - 1);
  assert.ok(!g.getAttackTargets(t).some(u => u.id === v.id));
  assert.strictEqual(g.attack(t.id, v.id).ok, false);

  v.turn.actionUsed = false; v.turn.done = false;
  const beforeHp = t.hp, beforeArmor = t.armor;
  assert.ok(g.attack(v.id, t.id).ok);
  assert.strictEqual((beforeHp - t.hp) + (beforeArmor - t.armor), 3);
});

test('受钩挂层数上限与摆脱', () => {
  const g = make(['velo', 'velo', 'velo'], ['velo'], () => 0);
  const target = g.getUnit('red-4');
  const a = g.getUnit('blue-1'), b = g.getUnit('blue-2'), c = g.getUnit('blue-3');
  place(target, 5, 5, 'W');
  place(a, 4, 5, 'E'); place(b, 6, 5, 'W'); place(c, 5, 4, 'S');
  g.round = 1;
  [a, b, c].forEach(u => { u.skillReadyRound = 1; u.turn.actionUsed = false; u.turn.done = false; });
  assert.ok(g.useSkill(a.id).ok);
  assert.ok(g.useSkill(b.id).ok);
  assert.strictEqual(g.getHookStacks(target).length, 2);
  assert.strictEqual(g.canUseHook(c).allowed, false);

  g.activeTeam = 'red';
  target.turn.actionUsed = false; target.turn.done = false;
  const source = g.getUnit(g.getHookStacks(target)[0].sourceId);
  const source2 = g.getUnit(g.getHookStacks(target)[1].sourceId);
  const esc = g.escapeHook(target.id);
  assert.ok(esc.ok);
  assert.strictEqual(esc.success, true);
  assert.strictEqual(g.getHookStacks(target).length, 1);
  assert.strictEqual(source.status.hook, null);
  assert.ok(source2.status.hook);
});

test('钩挂手动解除与自动解除', () => {
  const g = make(['velo'], ['dummy']);
  const v = g.getUnit('blue-1');
  const t = g.getUnit('red-2');
  place(v, 5, 5, 'E'); place(t, 6, 5, 'W');
  g.round = 1; v.skillReadyRound = 1; v.turn.actionUsed = false; v.turn.done = false;
  assert.ok(g.useSkill(v.id).ok);
  g.advanceHookStatus('blue', []);
  v.turn.actionUsed = false; v.turn.done = false;
  assert.ok(g.canReleaseHook(v.id).allowed);
  assert.ok(g.releaseHook(v.id).ok);
  assert.strictEqual(g.getHookStacks(t).length, 0);
  assert.strictEqual(v.status.hook, null);

  const g2 = make(['velo'], ['dummy']);
  const v2 = g2.getUnit('blue-1');
  const t2 = g2.getUnit('red-2');
  place(v2, 5, 5, 'E'); place(t2, 6, 5, 'W');
  g2.round = 1; v2.skillReadyRound = 1; v2.turn.actionUsed = false; v2.turn.done = false;
  assert.ok(g2.useSkill(v2.id).ok);
  g2.advanceHookStatus('blue', []);
  g2.advanceHookStatus('blue', []);
  g2.advanceHookStatus('blue', []);
  assert.strictEqual(v2.status.hook, null);
  assert.strictEqual(g2.getHookStacks(t2).length, 0);
});

test('大型目标反震、后退与退路阻挡', () => {
  const g = make(['velo'], ['trex']);
  const v = g.getUnit('blue-1');
  const t = g.getUnit('red-2');
  place(v, 5, 5, 'E'); place(t, 6, 5, 'W');
  g.round = 1; v.skillReadyRound = 1; v.turn.actionUsed = false; v.turn.done = false;
  const vHp = v.hp, vArmor = v.armor;
  const res = g.useSkill(v.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(v.x, 4);
  assert.strictEqual(v.armor, 0);
  assert.strictEqual(v.hp, vHp - 2);
  assert.strictEqual(t.armor, 2);
  assert.strictEqual(t.hp, 11);
  assert.strictEqual(g.getHookStacks(t).length, 0);
  assert.ok(res.events.some(e => e.type === 'hook_created' && e.failed && e.large));
});

test('钩挂期间技能暂停充能，目标移动会牵引来源', () => {
  const g = make(['velo'], ['dummy']);
  const v = g.getUnit('blue-1');
  const t = g.getUnit('red-2');
  place(v, 5, 5, 'E'); place(t, 6, 5, 'W');
  g.round = 1; v.skillReadyRound = 1; v.turn.actionUsed = false; v.turn.done = false;
  assert.ok(g.useSkill(v.id).ok);
  const beforeCd = v.skillReadyRound;
  g.endRound([]);
  assert.strictEqual(v.skillReadyRound, beforeCd + 1);

  g.activeTeam = 'red';
  t.turn.actionUsed = false; t.turn.done = false; t.turn.moveLeft = t.move;
  const move = g.moveUnit(t.id, 7, 5);
  assert.ok(move.ok, move.error);
  assert.strictEqual(v.x, 6);
});

test('跟随落点被占时来源被拖到最近相邻格', () => {
  const g = make(['velo', 'stego'], ['velo']);
  const v = g.getUnit('blue-1');
  const block = g.getUnit('blue-2');
  const t = g.getUnit('red-3');
  place(v, 1, 5, 'E'); place(t, 2, 5, 'W'); place(block, 1, 7, 'N');
  g.round = 1; v.skillReadyRound = 1; v.turn.actionUsed = false; v.turn.done = false;
  assert.ok(g.useSkill(v.id).ok);
  g.activeTeam = 'red';
  t.turn.actionUsed = false; t.turn.done = false; t.turn.moveLeft = t.move;
  const move = g.moveUnit(t.id, 2, 7);
  assert.ok(move.ok, move.error);
  assert.ok(v.status.hook);
  assert.strictEqual(Math.max(Math.abs(v.x - t.x), Math.abs(v.y - t.y)) <= 1, true);
  const followEvent = move.events.find(e => e.type === 'move' && e.unitId === v.id && e.follow);
  assert.ok(followEvent);
  assert.ok(followEvent.path.length >= 2);
});

test('击杀钩挂目标或来源时日志使用离场原因', () => {
  const g1 = make(['velo'], ['leso']);
  const v1 = g1.getUnit('blue-1');
  const t1 = g1.getUnit('red-2');
  place(v1, 1, 5, 'E'); place(t1, 2, 5, 'W');
  g1.round = 1; v1.skillReadyRound = 1; v1.turn.actionUsed = false; v1.turn.done = false;
  assert.ok(g1.useSkill(v1.id).ok);
  const events1 = [];
  g1._damage(t1, 99, { ignoreArmor: true, source: v1, kind: 'attack', isAttack: true }, events1);
  assert.ok(events1.some(e => e.type === 'log' && e.text.includes('目标离场')));

  const g2 = make(['velo'], ['leso']);
  const v2 = g2.getUnit('blue-1');
  const t2 = g2.getUnit('red-2');
  place(v2, 1, 5, 'E'); place(t2, 2, 5, 'W');
  g2.round = 1; v2.skillReadyRound = 1; v2.turn.actionUsed = false; v2.turn.done = false;
  assert.ok(g2.useSkill(v2.id).ok);
  const events2 = [];
  g2._damage(v2, 99, { ignoreArmor: true, source: t2, kind: 'attack', isAttack: true }, events2);
  assert.ok(events2.some(e => e.type === 'log' && e.text.includes('来源离场')));
});

test('三角龙物莫能陷格挡攻击并消耗格挡', () => {
  const g = make(['trike'], ['leso']);
  const t = g.getUnit('blue-1');
  const l = g.getUnit('red-2');
  place(t, 5, 5, 'N'); place(l, 7, 5, 'W');
  g.round = 3; t.skillReadyRound = 3;
  assert.strictEqual(t.hp, 12);
  assert.strictEqual(t.armor, 4);
  assert.strictEqual(t.attack, 5);
  assert.strictEqual(t.move, 1);
  assert.ok(g.useSkill(t.id).ok);
  assert.strictEqual(t.status.guard, true);
  assert.strictEqual(t.skillReadyRound, 7);
  toRed(g);
  const res = g.attack(l.id, t.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(t.hp, 12);
  assert.strictEqual(t.armor, 4);
  assert.strictEqual(t.status.guard, false);
});

test('三角龙物莫能陷也能格挡攻击性技能', () => {
  const g = make(['anky'], ['trike']);
  const a = g.getUnit('blue-1');
  const t = g.getUnit('red-2');
  place(a, 5, 5, 'N'); place(t, 6, 5, 'W');
  g.round = 4; t.skillReadyRound = 4; a.skillReadyRound = 4;
  g.activeTeam = 'red'; t.turn.actionUsed = false; t.turn.done = false;
  assert.ok(g.useSkill(t.id).ok);
  g.activeTeam = 'blue'; a.turn.actionUsed = false; a.turn.done = false;
  g.rng = seq([0, 0.2]);
  const res = g.useSkill(a.id, t.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(t.hp, 12);
  assert.strictEqual(t.armor, 4);
  assert.strictEqual(t.status.guard, false);
});

test('吾盾之坚只减免前方与斜前方伤害', () => {
  const g1 = make(['trike'], ['trex']);
  const t1 = g1.getUnit('blue-1');
  const rex1 = g1.getUnit('red-2');
  place(t1, 5, 5, 'N'); place(rex1, 5, 2, 'S');
  g1._damage(t1, 5, { source: rex1, kind: 'attack', isAttack: true }, []);
  assert.strictEqual(t1.armor, 0);
  assert.strictEqual(t1.hp, 11.5);

  const gLow = make(['trike'], ['trex']);
  const tLow = gLow.getUnit('blue-1');
  const rexLow = gLow.getUnit('red-2');
  place(tLow, 5, 5, 'N'); place(rexLow, 5, 2, 'S');
  gLow._damage(tLow, 3, { source: rexLow, kind: 'attack', isAttack: true }, []);
  assert.strictEqual(tLow.armor, 1.5);
  assert.strictEqual(tLow.hp, 12);

  const g2 = make(['trike'], ['trex']);
  const t2 = g2.getUnit('blue-1');
  const rex2 = g2.getUnit('red-2');
  place(t2, 5, 5, 'N'); place(rex2, 7, 5, 'S');
  g2._damage(t2, 5, { source: rex2, kind: 'attack', isAttack: true }, []);
  assert.strictEqual(t2.armor, 0);
  assert.strictEqual(t2.hp, 11);
});

test('荆棘背刺按伤害概率对攻击者施加流血', () => {
  const g1 = make(['leso'], ['dummy']);
  const l1 = g1.getUnit('blue-1');
  const a1 = g1.getUnit('red-2');
  g1.rng = () => 0.2;
  g1._damage(l1, 1, { source: a1, kind: 'attack', isAttack: true }, []);
  assert.strictEqual(a1.status.bleed.length, 1);

  const g2 = make(['leso'], ['dummy']);
  const l2 = g2.getUnit('blue-1');
  const a2 = g2.getUnit('red-2');
  g2.rng = () => 0.8;
  g2._damage(l2, 5, { source: a2, kind: 'attack', isAttack: true }, []);
  assert.strictEqual(a2.status.bleed.length, 1);

  const g3 = make(['leso'], ['dummy']);
  const l3 = g3.getUnit('blue-1');
  const a3 = g3.getUnit('red-2');
  g3.rng = () => 0.9;
  g3._damage(l3, 1, { source: a3, kind: 'attack', isAttack: true }, []);
  assert.strictEqual(a3.status.bleed.length, 0);
});

test('侧刺对流血目标额外造成 2 点伤害', () => {
  const g = make(['leso'], ['dummy', 'dummy']);
  const le = g.getUnit('blue-1');
  const bleeding = g.getUnit('red-2');
  const clean = g.getUnit('red-3');
  place(le, 5, 5, 'N');
  place(bleeding, 6, 5, 'N');
  place(clean, 4, 5, 'N');
  g.round = 3; le.skillReadyRound = 3;
  g.addBleed(bleeding, le, []);
  const res = g.useSkill(le.id);
  assert.ok(res.ok, res.error);
  assert.strictEqual(bleeding.armor, 0);
  assert.strictEqual(bleeding.hp, 5);
  assert.strictEqual(clean.armor, 1);
  assert.strictEqual(clean.hp, 6);
});

test('抽刀断水对流血目标追加生命伤害', () => {
  const g0 = make(['stego'], ['dummy']);
  const s0 = g0.getUnit('blue-1');
  const t0 = g0.getUnit('red-2');
  place(s0, 5, 5, 'N'); place(t0, 6, 5, 'N');
  g0.activeTeam = 'blue'; s0.turn.done = false;
  assert.ok(g0.attack(s0.id, t0.id).ok);
  assert.strictEqual(t0.armor, 1);
  assert.strictEqual(t0.hp, 6);

  const g1 = make(['stego'], ['dummy']);
  const s1 = g1.getUnit('blue-1');
  const t1 = g1.getUnit('red-2');
  place(s1, 5, 5, 'N'); place(t1, 6, 5, 'N');
  g1.addBleed(t1, s1, []);
  g1.activeTeam = 'blue'; s1.turn.done = false;
  assert.ok(g1.attack(s1.id, t1.id).ok);
  assert.strictEqual(t1.armor, 1);
  assert.strictEqual(t1.hp, 5.5);

  const g2 = make(['stego'], ['dummy']);
  const s2 = g2.getUnit('blue-1');
  const t2 = g2.getUnit('red-2');
  place(s2, 5, 5, 'N'); place(t2, 6, 5, 'N');
  g2.addBleed(t2, s2, []);
  g2.addBleed(t2, s2, []);
  g2.activeTeam = 'blue'; s2.turn.done = false;
  assert.ok(g2.attack(s2.id, t2.id).ok);
  assert.strictEqual(t2.armor, 1);
  assert.strictEqual(t2.hp, 5);
});

test('7–8 个单位默认布阵不会重叠', () => {
  const lineups = [
    Array(8).fill('velo'),
    ['velo', 'velo', 'velo', 'velo', 'velo', 'velo', 'anky']
  ];
  lineups.forEach((lineup) => {
    const g = new E.Game({ blueTeam: lineup, redTeam: lineup, deployOnly: true });
    ['blue', 'red'].forEach((team) => {
      const occupied = new Set();
      g.getTeamUnits(team).forEach((unit) => {
        g.getFootprint(unit).forEach((cell) => {
          const key = cell.x + ',' + cell.y;
          assert.strictEqual(occupied.has(key), false, team + ' 在 ' + key + ' 重叠');
          occupied.add(key);
        });
      });
    });
  });
});

test('地狱溪组地图为 10×10 四类地形', () => {
  assert.strictEqual(E.MAP.name, '地狱溪组');
  assert.strictEqual(E.MAP.terrain.length, 10);
  E.MAP.terrain.forEach((row) => {
    assert.strictEqual(row.length, 10);
    assert.ok(/^[FSGW]+$/.test(row));
  });
  assert.deepStrictEqual(E.MAP.terrain, [
    'WSSFFFFFFF',
    'WSGFFFFFFF',
    'WGFFFFFGFF',
    'WSGFFFGWGF',
    'SSGFFFFWWG',
    'SSGFFFGWWG',
    'WSSFFFGWFF',
    'WSFFFFFGFF',
    'WGGFFFFFFF',
    'WSGFFFFFFF'
  ]);
});

test('草地与杉树林地按概率在开局生长植物', () => {
  const g = new E.Game({ blueTeam: ['dummy'], redTeam: ['dummy'], deployOnly: true, rng: () => 0 });
  assert.strictEqual(g.plants.length, 62);
  g.plants.forEach((plant) => {
    assert.strictEqual(plant.charges, 2);
    const terrain = E.MAP.terrain[plant.y][plant.x];
    assert.ok(terrain === 'G' || E.MAP.trees.some(([x, y]) => x === plant.x && y === plant.y));
  });
  const empty = new E.Game({ blueTeam: ['dummy'], redTeam: ['dummy'], deployOnly: true, rng: () => 1 });
  assert.strictEqual(empty.plants.length, 0);
});

test('可食植物必须位于朝向一格，并需要一回合完成', () => {
  const g = make(['dummy'], ['leso']);
  g.plants = [{ id: 'plant-front', x: 4, y: 4, kind: 'grass', charges: 2 }];
  const u = g.getUnit('blue-1');
  place(u, 4, 5, 'N');
  u.hp = 4;
  g.activeTeam = 'blue'; u.turn.done = false; u.turn.actionUsed = false;
  assert.strictEqual(g.canEatPlant(u.id, 4, 4).allowed, true);
  const started = g.eatPlant(u.id, 4, 4);
  assert.ok(started.ok, started.error);
  assert.strictEqual(u.status.eating.completeRound, 2);
  assert.strictEqual(u.hp, 4);
  assert.strictEqual(g.getPlantAt(4, 4).charges, 2);
  assert.strictEqual(u.status.eatBuff, 0);

  g.round = 2;
  g.startTeamTurn('blue', []);
  assert.strictEqual(u.status.eating, null);
  assert.strictEqual(u.hp, 5);
  assert.strictEqual(g.getPlantAt(4, 4).charges, 1);
  assert.strictEqual(u.status.eatBuff, 1);
  assert.strictEqual(g.getMoveLeft(u), u.move + 1);

  u.hp = 4; u.turn.done = false; u.turn.actionUsed = false;
  assert.strictEqual(g.canEatPlant(u.id, 4, 4).allowed, true);
  assert.ok(g.eatPlant(u.id, 4, 4).ok);
  g.round = 3;
  g.startTeamTurn('blue', []);
  assert.strictEqual(u.hp, 5);
  assert.strictEqual(g.getPlantAt(4, 4), null);
  assert.strictEqual(u.status.eatBuff, 2);
  u.turn.done = false; u.turn.actionUsed = false;
  assert.strictEqual(g.eatPlant(u.id, 4, 4).ok, false);

  const g2 = make(['dummy'], ['leso']);
  g2.plants = [{ id: 'plant-side', x: 5, y: 5, kind: 'grass', charges: 2 }];
  const u2 = g2.getUnit('blue-1');
  place(u2, 4, 5, 'N');
  g2.activeTeam = 'blue'; u2.turn.done = false;
  assert.strictEqual(g2.canEatPlant(u2.id, 5, 5).allowed, false);
});

test('进食完毕叠加、行动力加成与结束恢复', () => {
  const g = make(['dummy'], ['leso']);
  g.plants = [{ id: 'buff-plant', x: 4, y: 4, kind: 'grass', charges: 2 }];
  const u = g.getUnit('blue-1');
  place(u, 4, 5, 'N');
  u.hp = 2;
  g.activeTeam = 'blue'; u.turn.done = false; u.turn.actionUsed = false;
  assert.ok(g.eatPlant(u.id, 4, 4).ok);
  g.round = 2; g.completeEating(u, []);
  assert.strictEqual(u.status.eatBuff, 1);
  assert.strictEqual(u.status.eatBuffUntil, 5);
  assert.strictEqual(u.hp, 3);
  g.round = 5; g.expireRoundStatuses([]);
  assert.strictEqual(u.status.eatBuff, 0);
  assert.strictEqual(u.hp, 3);

  const g2 = make(['dummy'], ['leso']);
  g2.plants = [{ id: 'buff-plant-2', x: 4, y: 4, kind: 'grass', charges: 2 }];
  const u2 = g2.getUnit('blue-1');
  place(u2, 4, 5, 'N');
  u2.hp = 1;
  g2.activeTeam = 'blue'; u2.turn.done = false;
  assert.ok(g2.eatPlant(u2.id, 4, 4).ok);
  g2.round = 2; g2.completeEating(u2, []);
  u2.turn.done = false; u2.turn.actionUsed = false;
  assert.ok(g2.eatPlant(u2.id, 4, 4).ok);
  g2.round = 3; g2.completeEating(u2, []);
  assert.strictEqual(u2.status.eatBuff, 2);
  assert.strictEqual(u2.status.eatBuffUntil, 7);
  assert.strictEqual(u2.hp, 3);
  g2.round = 7; g2.expireRoundStatuses([]);
  assert.strictEqual(u2.status.eatBuff, 0);
  assert.strictEqual(u2.hp, 5);
});

test('只有植食性恐龙可以食用植物', () => {
  const herbivores = ['trike', 'stego', 'anky', 'leso'];
  herbivores.forEach((type) => assert.strictEqual(E.SPECIES[type].diet, 'herbivore'));
  assert.strictEqual(E.SPECIES.trex.diet, 'carnivore');
  assert.strictEqual(E.SPECIES.velo.diet, 'carnivore');

  const g = make(['velo'], ['leso']);
  g.plants = [{ id: 'meat-test', x: 6, y: 5, kind: 'grass', charges: 2 }];
  const v = g.getUnit('blue-1');
  place(v, 5, 5, 'N');
  v.hp = 1;
  g.activeTeam = 'blue'; v.turn.done = false;
  assert.strictEqual(g.canEatPlant(v.id, 6, 5).allowed, false);
  assert.strictEqual(g.eatPlant(v.id, 6, 5).ok, false);
});

test('进食期间多受 20% 伤害，受攻击会打断', () => {
  const g = make(['dummy'], ['leso']);
  g.plants = [{ id: 'interrupt-plant', x: 4, y: 4, kind: 'grass', charges: 2 }];
  const u = g.getUnit('blue-1');
  const attacker = g.getUnit('red-2');
  place(u, 4, 5, 'N');
  u.hp = 6; u.armor = 4;
  g.activeTeam = 'blue'; u.turn.done = false; u.turn.actionUsed = false;
  assert.ok(g.eatPlant(u.id, 4, 4).ok);
  assert.ok(u.status.eating);
  const events = [];
  g._damage(u, 5, { source: attacker, kind: 'attack', isAttack: true }, events);
  assert.strictEqual(u.hp, 4);
  assert.strictEqual(u.status.eating, null);
  assert.strictEqual(u.status.eatBuff, 0);
  assert.strictEqual(g.getPlantAt(4, 4).charges, 2);
});

test('视觉格按体型与朝向计算', () => {
  const g = make(['velo', 'leso', 'trike'], ['dummy']);
  const v = g.getUnit('blue-1');
  const l = g.getUnit('blue-2');
  const t = g.getUnit('blue-3');
  place(v, 5, 5, 'N');
  assert.deepStrictEqual(g.getVisionCells(v), [{ x: 5, y: 5 }]);
  place(l, 4, 5, 'N');
  assert.deepStrictEqual(g.getVisionCells(l), [{ x: 4, y: 5 }]);
  place(l, 4, 5, 'E');
  assert.deepStrictEqual(g.getVisionCells(l), [{ x: 4, y: 5 }]);
  place(t, 5, 5, 'N');
  assert.deepStrictEqual(g.getVisionCells(t), [{ x: 5, y: 5 }, { x: 6, y: 5 }]);
  place(t, 5, 5, 'E');
  assert.deepStrictEqual(g.getVisionCells(t), [{ x: 6, y: 5 }, { x: 6, y: 6 }]);
});

test('杉树隐藏格按上下左右连通分组', () => {
  const g = make(['dummy'], ['dummy']);
  g.plants = [];
  const zones = g.getHiddenZones();
  assert.strictEqual(zones.length, 4);
  assert.deepStrictEqual(zones.map(z => z.cells.length), [35, 5, 1, 5]);
  const treeKeys = new Set(E.MAP.trees.map(([x, y]) => x + ',' + y));
  zones.forEach((zone) => {
    zone.cells.forEach((cell) => {
      assert.ok(treeKeys.has(cell.x + ',' + cell.y));
      assert.strictEqual(g.getHiddenZoneAt(cell.x, cell.y).id, zone.id);
    });
  });
  assert.strictEqual(g.getHiddenZoneAt(0, 0), null);
});

test('隐藏格不被敌方看见，视觉格进入隐藏区后揭示周围', () => {
  const g = new E.Game({ blueTeam: ['velo'], redTeam: ['velo'], deployOnly: true, rng: () => 1 });
  g.plants = [];
  const viewer = g.getUnit('blue-1');
  const target = g.getUnit('red-2');
  place(viewer, 4, 5, 'N');
  place(target, 3, 0, 'N');
  g.phase = 'battle';
  let hidden = g.getHiddenCellsForTeam('blue');
  assert.ok(hidden.some((c) => c.unitId === target.id && c.x === 3 && c.y === 0));

  place(viewer, 4, 0, 'N');
  hidden = g.getHiddenCellsForTeam('blue');
  assert.strictEqual(hidden.some((c) => c.unitId === target.id && c.x === 3 && c.y === 0), false);
});

test('隐藏只作用于位于隐藏格的单位占格，而不是整只单位', () => {
  const g = new E.Game({ blueTeam: ['velo'], redTeam: ['leso'], deployOnly: true, rng: () => 1 });
  g.plants = [];
  const viewer = g.getUnit('blue-1');
  const target = g.getUnit('red-2');
  place(viewer, 0, 0, 'N');
  place(target, 2, 7, 'N');
  g.phase = 'battle';
  const hidden = g.getHiddenCellsForTeam('blue').filter((c) => c.unitId === target.id);
  assert.deepStrictEqual(hidden, [{ unitId: target.id, x: 2, y: 7 }]);
  assert.strictEqual(hidden.some((c) => c.x === 2 && c.y === 8), false);
});

console.log('\n通过 ' + passed + ' 项测试' + (process.exitCode ? '，存在失败' : '。'));
