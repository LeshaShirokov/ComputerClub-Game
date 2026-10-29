/* Сохранение/загрузка: localStorage, экспорт/импорт JSON, валидация схемы. */
(function (g) {
  'use strict';
  var CC = g.CC = g.CC || {};
  var D = CC.data, S = CC.state, U = CC.util;
  var KEY = 'computerClubGame.save.v1';

  function num(v, def, min, max) {
    if (!U.isNum(v)) return def;
    return U.clamp(v, min === undefined ? -1e15 : min, max === undefined ? 1e15 : max);
  }
  function int(v, def, min, max) { return Math.round(num(v, def, min, max)); }
  function str(v, def, maxLen) { return typeof v === 'string' ? v.slice(0, maxLen || 200) : def; }
  function oneOf(v, list, def) { return list.indexOf(v) >= 0 ? v : def; }
  function ids(list) { return list.map(function (x) { return x.id; }); }
  function bool(v) { return v === true; }
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  // Возвращает {ok, state} или {ok:false, error}
  function validate(raw) {
    if (!isObj(raw)) return { ok: false, error: 'Файл не похож на сохранение игры' };
    if (raw.version !== S.SCHEMA_VERSION) return { ok: false, error: 'Неподдерживаемая версия сохранения: ' + String(raw.version).slice(0, 10) };
    if (!U.isNum(raw.cash) || !U.isNum(raw.day) || !isObj(raw.zones) || !isObj(raw.staff)) return { ok: false, error: 'Сохранение повреждено: нет ключевых полей' };
    var s = S.createState(str(raw.seed, 'restored', 40));
    s.rng.s = isObj(raw.rng) ? (int(raw.rng.s, s.rng.s, 0, 4294967295) >>> 0) : s.rng.s;
    s.phase = oneOf(raw.phase, ['setup', 'running', 'over'], 'setup');
    s.setupStep = int(raw.setupStep, 0, 0, 6);
    s.day = int(raw.day, 0, 0, 100000);
    s.concept = oneOf(raw.concept, ids(D.concepts), null);
    s.legal = oneOf(raw.legal, ids(D.legal), null);
    s.location = oneOf(raw.location, ids(D.locations), null);
    s.expanded = int(raw.expanded, 0, 0, D.expansion.length);
    s.cash = num(raw.cash, D.START_CASH, -1e10, 1e12);
    s.price = int(raw.price, D.BASE_FAIR_PRICE, D.PRICE_MIN, D.PRICE_MAX);
    D.seats.forEach(function (seat) {
      var z = isObj(raw.zones[seat.id]) ? raw.zones[seat.id] : {};
      var n = int(z.n, 0, 0, 1000);
      s.zones[seat.id] = { n: n, cond: num(z.cond, 100, 0, 100), broken: int(z.broken, 0, 0, n) };
    });
    s.furniture = int(raw.furniture, 0, 0, D.furniture.length - 1);
    s.internet = int(raw.internet, 1, 0, D.internet.length - 1);
    D.staff.forEach(function (st) { s.staff[st.id] = int(raw.staff[st.id], 0, 0, st.max); });
    s.campaigns = (Array.isArray(raw.campaigns) ? raw.campaigns : []).filter(function (c) {
      return isObj(c) && ids(D.campaigns).indexOf(c.id) >= 0;
    }).slice(0, 20).map(function (c) { return { id: c.id, daysLeft: int(c.daysLeft, 1, 1, 365) }; });
    s.loyalty = bool(raw.loyalty);
    if (isObj(raw.upgrades)) D.upgrades.forEach(function (u) { if (raw.upgrades[u.id] === true) s.upgrades[u.id] = true; });
    s.rating = num(raw.rating, 3.5, 1, 5);
    s.community = num(raw.community, 0, 0, 100000);
    s.competitor = num(raw.competitor, 1, 0.3, 1);
    s.tariffMult = num(raw.tariffMult, 1, 1, 2);
    s.loans = (Array.isArray(raw.loans) ? raw.loans : []).filter(function (l) {
      return isObj(l) && ids(D.loans).indexOf(l.id) >= 0 && U.isNum(l.balance) && l.balance > 0;
    }).slice(0, 5).map(function (l) {
      var def = S.byId(D.loans, l.id);
      return { id: l.id, name: def.name, balance: num(l.balance, 0, 0, 1e9), rate: num(l.rate, def.rate, 0, 1),
               payment: num(l.payment, 0, 0, 1e9), daysLeft: int(l.daysLeft, 1, 1, 2000) };
    });
    s.modifiers = (Array.isArray(raw.modifiers) ? raw.modifiers : []).filter(function (m) {
      return isObj(m) && ['demand', 'open', 'reach', 'discount', 'tariff'].indexOf(m.kind) >= 0;
    }).slice(0, 30).map(function (m) {
      return { kind: m.kind, value: num(m.value, 1, 0, 200), daysLeft: int(m.daysLeft, 1, 1, 365), label: str(m.label, '', 80) };
    });
    if (isObj(raw.cooldowns)) CC.events.defs.forEach(function (d) { if (U.isNum(raw.cooldowns[d.id])) s.cooldowns[d.id] = int(raw.cooldowns[d.id], 0, 0, 200000); });
    var pe = raw.pendingEvent;
    if (isObj(pe) && S.byId(CC.events.defs, pe.id) && Array.isArray(pe.choices)) {
      var def = S.byId(CC.events.defs, pe.id);
      var data = {};
      if (isObj(pe.data)) {
        if (ids(D.seats).indexOf(pe.data.zone) >= 0) data.zone = pe.data.zone;
        if (U.isNum(pe.data.cost)) data.cost = int(pe.data.cost, 0, 0, 1e7);
      }
      if (def.id !== 'pcBreak' || data.zone) {
        s.pendingEvent = { id: def.id, title: def.title, text: str(pe.text, '', 600), data: data,
          choices: (def.choices || []).map(function (c) { return { id: c.id, label: c.label, cost: c.cost ? c.cost(s, data) : 0 }; }) };
        if (!s.pendingEvent.choices.length) s.pendingEvent = null;
      }
    }
    if (isObj(raw.pending)) ['marketing', 'repairs', 'fines', 'capex', 'other', 'income'].forEach(function (k) { s.pending[k] = num(raw.pending[k], 0, -1e10, 1e10); });
    s.goalIndex = int(raw.goalIndex, 0, 0, D.goals.length);
    s.won = bool(raw.won);
    s.gameOver = isObj(raw.gameOver) ? { day: int(raw.gameOver.day, 0, 0, 100000), reason: str(raw.gameOver.reason, 'Банкротство', 200) } : null;
    s.negDays = int(raw.negDays, 0, 0, 1000);
    if (isObj(raw.stats)) Object.keys(s.stats).forEach(function (k) { s.stats[k] = num(raw.stats[k], 0, -1e12, 1e12); });
    if (isObj(raw.achievements)) D.achievements.forEach(function (a) { if (U.isNum(raw.achievements[a.id])) s.achievements[a.id] = int(raw.achievements[a.id], 0, 0, 100000); });
    s.history = (Array.isArray(raw.history) ? raw.history : []).filter(isObj).slice(-400).map(function (h) {
      return { day: int(h.day, 0, 0, 100000), cash: num(h.cash, 0), revenue: num(h.revenue, 0), expenses: num(h.expenses, 0),
               profit: num(h.profit, 0), visitors: int(h.visitors, 0, 0, 100000), net: num(h.net, 0) };
    });
    var kinds = ['info', 'good', 'bad', 'goal', 'achievement'];
    s.log = (Array.isArray(raw.log) ? raw.log : []).filter(isObj).slice(0, 80).map(function (l) {
      return { day: int(l.day, 0, 0, 100000), text: str(l.text, '', 400), kind: oneOf(l.kind, kinds, 'info') };
    });
    var arts = ['plan', 'legal', 'rent', 'equip', 'staff', 'marketing', 'open', 'goal', 'win', 'event', 'bankrupt', 'chart'];
    s.story = (Array.isArray(raw.story) ? raw.story : []).filter(isObj).slice(0, 30).map(function (l) {
      return { day: int(l.day, 0, 0, 100000), title: str(l.title, '', 120), text: str(l.text, '', 800), art: oneOf(l.art, arts, 'chart') };
    });
    s.lastReport = isObj(raw.lastReport) && U.isNum(raw.lastReport.revenue) ? sanitizeReport(raw.lastReport) : null;
    if (isObj(raw.settings)) {
      s.settings.speed = int(raw.settings.speed, 0, 0, 3);
      s.settings.sound = bool(raw.settings.sound);
      s.settings.theme = oneOf(raw.settings.theme, ['auto', 'light', 'dark'], 'auto');
    }
    // логическая согласованность
    if (s.phase !== 'setup') s.setupStep = 6;
    if (s.phase === 'running' && (!s.location || !s.legal || !s.concept)) return { ok: false, error: 'Сохранение повреждено: клуб открыт без помещения' };
    return { ok: true, state: s };
  }
  function sanitizeReport(r) {
    var out = {};
    ['day', 'date', 'demand', 'visitors', 'capacity', 'turned', 'util', 'price', 'revenue', 'hoursRevenue', 'barRevenue', 'otherIncome',
     'expenses', 'profit', 'principal', 'capex', 'costPerHour', 'ratingTarget'].forEach(function (k) { out[k] = num(r[k], 0); });
    out.season = typeof r.season === 'string' ? r.season.slice(0, 60) : null;
    out.costs = {};
    var c = isObj(r.costs) ? r.costs : {};
    ['rent', 'wages', 'power', 'internet', 'accounting', 'bar', 'interest', 'tax', 'marketing', 'repairs', 'fines', 'other'].forEach(function (k) { out.costs[k] = num(c[k], 0); });
    return out;
  }

  function serialize(state) { return JSON.stringify(state); }
  function parse(text) {
    var raw;
    try { raw = JSON.parse(text); } catch (e) { return { ok: false, error: 'Файл повреждён: это не JSON' }; }
    return validate(raw);
  }
  function storage() {
    try { return g.localStorage || null; } catch (e) { return null; }
  }
  function save(state) {
    var ls = storage(); if (!ls) return false;
    try { ls.setItem(KEY, serialize(state)); return true; } catch (e) { return false; }
  }
  function load() {
    var ls = storage(); if (!ls) return { ok: false, error: 'Хранилище недоступно' };
    var t;
    try { t = ls.getItem(KEY); } catch (e) { return { ok: false, error: 'Хранилище недоступно' }; }
    if (!t) return { ok: false, error: 'Нет сохранения', empty: true };
    return parse(t);
  }
  function clear() { var ls = storage(); if (ls) try { ls.removeItem(KEY); } catch (e) { /* ignore */ } }

  CC.storage = { KEY: KEY, validate: validate, serialize: serialize, parse: parse, save: save, load: load, clear: clear };
})(typeof globalThis !== 'undefined' ? globalThis : this);
