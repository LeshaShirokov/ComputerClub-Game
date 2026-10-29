/* Ядро: пространство имён, детерминированный ГСЧ, форматирование, утилиты. */
(function (g) {
  'use strict';
  var CC = g.CC = g.CC || {};

  /* ---------- ГСЧ mulberry32: состояние хранится в сохранении ---------- */
  function next(st) {
    var t = (st.s = (st.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function hashSeed(seed) {
    var str = String(seed), h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  CC.rng = {
    next: next,
    hashSeed: hashSeed,
    range: function (st, a, b) { return a + (b - a) * next(st); },
    int: function (st, a, b) { return a + Math.floor(next(st) * (b - a + 1)); },
    chance: function (st, p) { return next(st) < p; },
    pick: function (st, arr) { return arr[Math.floor(next(st) * arr.length)]; },
    weighted: function (st, items) { // items: [{w, v}]
      var total = 0, i;
      for (i = 0; i < items.length; i++) total += Math.max(0, items[i].w);
      if (total <= 0) return null;
      var r = next(st) * total;
      for (i = 0; i < items.length; i++) { r -= Math.max(0, items[i].w); if (r < 0) return items[i].v; }
      return items[items.length - 1].v;
    }
  };

  /* ---------- Форматирование (ru-RU) ---------- */
  var money0 = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0, minimumFractionDigits: 0 });
  var num0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  var num1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  var pct0 = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 0 });
  var dateF = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  CC.fmt = {
    money: function (v) { return money0.format(Math.round(v || 0)); },
    moneyShort: function (v) {
      var a = Math.abs(v), s = v < 0 ? '−' : '';
      if (a >= 1e9) return s + num1.format(a / 1e9) + ' млрд ₽';
      if (a >= 1e7) return s + num1.format(a / 1e6) + ' млн ₽';
      return money0.format(Math.round(v || 0));
    },
    num: function (v) { return num0.format(Math.round(v || 0)); },
    num1: function (v) { return num1.format(v || 0); },
    pct: function (v) { return pct0.format(v || 0); },
    date: function (d) { return dateF.format(d); },
    plural: function (n, one, few, many) {
      n = Math.abs(Math.round(n)) % 100; var n1 = n % 10;
      if (n > 10 && n < 20) return many;
      if (n1 > 1 && n1 < 5) return few;
      if (n1 === 1) return one;
      return many;
    }
  };

  CC.util = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    round2: function (v) { return Math.round(v * 100) / 100; },
    isNum: function (v) { return typeof v === 'number' && isFinite(v); },
    deepClone: function (o) { return JSON.parse(JSON.stringify(o)); }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
