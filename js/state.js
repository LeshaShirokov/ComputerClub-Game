/* Состояние игры: создание, календарь, справочные функции. */
(function (g) {
  'use strict';
  var CC = g.CC = g.CC || {};
  var D = CC.data;

  var SCHEMA_VERSION = 1;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function emptyZones() {
    var z = {};
    D.seats.forEach(function (s) { z[s.id] = { n: 0, cond: 100, broken: 0 }; });
    return z;
  }

  function createState(seed) {
    if (seed === undefined || seed === null || seed === '') seed = String(Date.now() % 1000000000);
    seed = String(seed).slice(0, 40);
    return {
      version: SCHEMA_VERSION,
      seed: seed,
      rng: { s: CC.rng.hashSeed(seed) },
      phase: 'setup',          // setup | running | over
      setupStep: 0,
      day: 0,
      concept: null, legal: null, location: null, expanded: 0,
      cash: D.START_CASH,
      price: D.BASE_FAIR_PRICE,
      zones: emptyZones(),
      furniture: 0, internet: 1,
      staff: { admin: 0, tech: 0, cleaner: 0, smm: 0 },
      campaigns: [],           // {id, daysLeft}
      loyalty: false,
      upgrades: {},            // id: true
      rating: 3.5,
      community: 0,
      competitor: 1,
      tariffMult: 1,
      loans: [],               // {id, name, balance, rate, payment, daysLeft}
      modifiers: [],           // {kind, value, daysLeft, label}
      cooldowns: {},           // eventId: day when allowed again
      pendingEvent: null,      // {id, title, text, choices:[{id,label}]}
      pending: { marketing: 0, repairs: 0, fines: 0, capex: 0, other: 0, income: 0 },
      goalIndex: 0,
      won: false,
      gameOver: null,
      negDays: 0,
      stats: { totalRevenue: 0, totalVisitors: 0, totalProfit: 0, profitStreak: 0, maxVisitors: 0,
               inspectionsPassed: 0, loansRepaid: 0, setupSpent: 0 },
      achievements: {},
      history: [],             // {day, cash, revenue, expenses, profit, visitors, net}
      log: [],                 // {day, text, kind}
      story: [],               // {day, title, text, art}
      lastReport: null,
      settings: { speed: 0, sound: false, theme: 'auto' }
    };
  }

  function dateOf(day) { return new Date(D.START_DATE_UTC + day * 86400000); }

  // Сезонность: каникулы и времена года
  function seasonInfo(date) {
    var m = date.getUTCMonth(), d = date.getUTCDate();
    if (m === 0 && d <= 11) return { f: 1.3, label: 'Новогодние каникулы' };
    if (m === 10 && d <= 9) return { f: 1.15, label: 'Осенние каникулы' };
    if (m === 2 && d >= 23) return { f: 1.15, label: 'Весенние каникулы' };
    if (m === 11 && d >= 20) return { f: 1.12, label: 'Предновогодние дни' };
    if (m >= 5 && m <= 7) return { f: 1.15, label: 'Летние каникулы' };
    var base = [1.0, 0.95, 1.0, 0.95, 0.92, 1, 1, 1, 0.92, 0.96, 1.0, 1.04][m];
    return { f: base, label: null };
  }
  var WEEKDAY = [1.2, 0.85, 0.85, 0.9, 0.95, 1.15, 1.35]; // вс..сб

  function addLog(state, text, kind) {
    state.log.unshift({ day: state.day, text: String(text), kind: kind || 'info' });
    if (state.log.length > 80) state.log.length = 80;
  }
  function addStory(state, title, text, art) {
    state.story.unshift({ day: state.day, title: String(title), text: String(text), art: art || 'chart' });
    if (state.story.length > 30) state.story.length = 30;
  }

  CC.state = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    byId: byId,
    createState: createState,
    emptyZones: emptyZones,
    dateOf: dateOf,
    seasonInfo: seasonInfo,
    WEEKDAY: WEEKDAY,
    addLog: addLog,
    addStory: addStory
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
