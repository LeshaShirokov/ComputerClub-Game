// Юнит-тесты движка: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load');
const { setup, strategies, run } = require('./strategies');

function opened(CC, seed) {
  const st = CC.state.createState(seed || 'unit');
  setup(CC, st, strategies.reasonable.setup);
  return st;
}
function play(CC, st, n) {
  for (let i = 0; i < n && st.phase === 'running'; i++) { if (st.pendingEvent) CC.events.autoResolve(st); CC.economy.simulateDay(st); }
}

test('ГСЧ детерминирован и зерно хранится в сохранении', () => {
  const CC = load();
  const a = { s: CC.rng.hashSeed('abc') }, b = { s: CC.rng.hashSeed('abc') }, c = { s: CC.rng.hashSeed('abd') };
  const xa = [], xb = [], xc = [];
  for (let i = 0; i < 50; i++) { xa.push(CC.rng.next(a)); xb.push(CC.rng.next(b)); xc.push(CC.rng.next(c)); }
  assert.deepEqual(xa, xb);
  assert.notDeepEqual(xa, xc);
  xa.forEach(v => assert.ok(v >= 0 && v < 1));
  const s1 = opened(CC, 'same'), s2 = opened(load(), 'same');
  const CC2 = globalThis.CC;
  play(CC2, s1, 120); play(CC2, s2, 120);
  assert.equal(s1.cash, s2.cash);
  assert.equal(s1.seed, 'same');
  const restored = CC2.storage.parse(CC2.storage.serialize(s1)).state;
  play(CC2, restored, 30); play(CC2, s1, 30);
  assert.equal(restored.cash, s1.cash, 'игра после загрузки продолжается так же');
});

test('спрос в разумных пределах и падает с ростом цены', () => {
  const CC = load(), E = CC.economy;
  const st = opened(CC);
  play(CC, st, 60);
  let prev = Infinity;
  for (let p = 50; p <= 600; p += 25) {
    const d = E.demandAt(st, p);
    assert.ok(Number.isFinite(d) && d >= 0, 'спрос конечен и неотрицателен');
    assert.ok(d <= prev + 1e-9, 'спрос не растёт с ценой');
    prev = d;
  }
  const d = E.derive(st);
  assert.ok(E.demandAt(st, 50) <= d.reach * d.repF * d.attraction * 2.2 * 1.03 + 1e-6, 'верхняя граница эластичности');
  for (let i = 0; i < 200; i++) {
    play(CC, st, 1);
    const r = st.lastReport;
    assert.ok(r.visitors >= 0 && r.visitors <= r.capacity, 'гостей не больше вместимости');
    assert.ok(st.rating >= 1 && st.rating <= 5, 'рейтинг 1–5');
  }
  // экстремальная цена
  E.setPrice(st, 100000);
  assert.ok(st.price <= CC.data.PRICE_MAX);
});

test('аренда, зарплаты и налоги считаются верно', () => {
  const CC = load(), E = CC.economy, D = CC.data;
  const st = opened(CC);
  const loc = D.locations.find(l => l.id === st.location);
  assert.equal(E.rentMonthly(st), loc.rent);
  const wages = D.staff.reduce((a, s) => a + (st.staff[s.id] || 0) * s.wage, 0);
  assert.equal(E.wagesMonthly(st), wages);
  play(CC, st, 1);
  const r = st.lastReport;
  assert.ok(Math.abs(r.costs.rent - loc.rent / 30) < 1e-6, 'аренда списывается по 1/30 в день');
  assert.ok(Math.abs(r.costs.wages - wages / 30) < 1e-6, 'зарплата по 1/30 в день');
  const ip = D.legal.find(l => l.id === 'ip'), ooo = D.legal.find(l => l.id === 'ooo');
  assert.equal(E.taxFor(ip, 100000, 90000), 6000);
  assert.equal(E.taxFor(ooo, 100000, 50000), 7500);
  assert.equal(E.taxFor(ooo, 100000, 120000), 1000, 'минимальный налог 1% при убытке');
  assert.ok(Math.abs(r.costs.tax - 0.06 * (r.revenue + r.otherIncome)) < 1e-6, 'ИП платит 6% с выручки');
});

test('кредит: аннуитет, проценты и досрочное погашение', () => {
  const CC = load(), E = CC.economy;
  const pay = E.annuity(1000000, 0.2, 365);
  // сумма платежей больше тела, но не больше тела + полной годовой ставки
  assert.ok(pay * 365 > 1000000 && pay * 365 < 1200000);
  const st = CC.state.createState('x');
  assert.equal(E.loanAvailable(st, 'micro').ok, false, 'до открытия клуба кредиты не выдаются');
});

test('кредит выдаётся, проценты начисляются, гасится досрочно с комиссией', () => {
  const CC = load(), E = CC.economy, D = CC.data;
  const st = opened(CC);
  play(CC, st, 20);
  const id = D.loans.find(l => !l.needDays || l.needDays <= 20).id;
  const a = E.loanAvailable(st, id);
  assert.ok(a.ok, a.msg);
  const cash0 = st.cash;
  assert.ok(E.takeLoan(st, id, a.min).ok);
  assert.equal(st.cash, cash0 + a.min);
  assert.equal(E.takeLoan(st, id, a.min).ok, false, 'второй такой же кредит не дают');
  const loan = st.loans[0], bal0 = loan.balance;
  const expInterest = bal0 * loan.rate / 365;
  if (st.pendingEvent) CC.events.autoResolve(st);
  E.simulateDay(st);
  assert.ok(Math.abs(st.lastReport.costs.interest - expInterest) < 1e-6, 'проценты за день = остаток × ставка / 365');
  assert.ok(st.loans[0].balance < bal0, 'тело долга уменьшается');
  const bal = st.loans[0].balance, c = st.cash;
  assert.ok(E.repayLoan(st, 0).ok);
  assert.equal(st.loans.length, 0);
  assert.equal(c - st.cash, Math.round(bal * (1 + D.LOAN_EARLY_FEE)));
  assert.equal(E.takeLoan(st, 'nope', 1).ok, false);
  assert.equal(E.takeLoan(st, id, 1e12).ok, false, 'больше лимита нельзя');
});

test('банкротство при глубоком минусе и при долгом минусе', () => {
  let CC = load();
  let st = opened(CC);
  const od = CC.data.legal.find(l => l.id === st.legal).overdraft;
  st.cash = -od - 300000;
  if (st.pendingEvent) CC.events.autoResolve(st);
  CC.economy.simulateDay(st);
  assert.equal(st.phase, 'over');
  assert.ok(st.gameOver && st.gameOver.reason);
  assert.equal(CC.economy.simulateDay(st).ok, false, 'после банкротства дни не идут');
  CC = load();
  st = opened(CC);
  st.negDays = 21; st.cash = -10000; // небольшой, но затяжной минус
  // гарантированно убыточный день: убрать всех гостей
  st.zones.gaming.broken = st.zones.gaming.n;
  if (st.pendingEvent) CC.events.autoResolve(st);
  CC.economy.simulateDay(st);
  assert.equal(st.phase, 'over');
});

test('бездействие проигрывает, разумная стратегия выигрывает', () => {
  const a = run('doNothing', 'unit-a');
  assert.equal(a.phase, 'over');
  const b = run('reasonable', 'unit-b');
  assert.ok(b.won, 'разумная стратегия должна выигрывать');
  assert.ok(b.day > 250 && b.day < 700, 'победа за разумное число дней: ' + b.day);
});

test('сохранение: круговой проход и валидация', () => {
  const CC = load(), S = CC.storage;
  const st = opened(CC);
  play(CC, st, 40);
  const r = S.parse(S.serialize(st));
  assert.ok(r.ok, r.error);
  assert.deepEqual(JSON.parse(S.serialize(r.state)), JSON.parse(S.serialize(st)));
});

test('повреждённые и вредоносные сохранения отклоняются или очищаются', () => {
  const CC = load(), S = CC.storage;
  for (const bad of ['', 'not json', '{"version":1,', 'null', '[]', '42', '{"version":999}', '{"version":1}', JSON.stringify({ version: 1, cash: 'x' })]) {
    const r = S.parse(bad);
    assert.equal(r.ok, false, 'должно отклоняться: ' + bad);
    assert.equal(typeof r.error, 'string');
  }
  const st = opened(CC);
  const raw = JSON.parse(S.serialize(st));
  raw.cash = 1e30; raw.rating = 99; raw.zones.gaming.n = -5; raw.location = '<script>';
  raw.staff.admin = 1e9; raw.__proto__x = 1; raw.log = [{ day: 'a', text: { evil: 1 }, kind: 'x' }];
  const r = S.parse(JSON.stringify(raw));
  if (r.ok) {
    assert.ok(r.state.rating >= 1 && r.state.rating <= 5);
    assert.ok(r.state.zones.gaming.n >= 0);
    assert.ok(Math.abs(r.state.cash) <= 1e15);
    assert.ok(CC.data.locations.some(l => l.id === r.state.location) || r.state.location === null);
    assert.ok(r.state.staff.admin <= 1000);
    r.state.log.forEach(l => assert.equal(typeof l.text, 'string'));
    // можно играть дальше
    play(CC, r.state, 5);
  }
});
