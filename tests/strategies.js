// Скриптовые стратегии для балансной симуляции.
'use strict';
const load = require('./load');

function setup(CC, st, o) {
  const Q = CC.quests, E = CC.economy;
  Q.chooseConcept(st, o.concept);
  Q.chooseLegal(st, o.legal);
  Q.chooseLocation(st, o.location);
  for (const [id, n] of Object.entries(o.seats)) { const r = E.buySeats(st, id, n); if (!r.ok) throw new Error(r.msg); }
  if (o.furniture) E.setFurniture(st, o.furniture);
  E.setInternet(st, o.internet);
  Q.finishEquipment(st);
  for (const [id, n] of Object.entries(o.staff)) for (let i = 0; i < n; i++) E.hire(st, id);
  const fr = Q.finishStaff(st); if (!fr.ok) throw new Error(fr.msg);
  for (const c of (o.campaigns || [])) E.startCampaign(st, c);
  Q.openClub(st);
}

function bestPrice(CC, st) {
  let best = st.price, bestP = -Infinity;
  for (let p = 60; p <= 600; p += 10) {
    const f = CC.economy.forecast(st, p);
    if (f.profit > bestP) { bestP = f.profit; best = p; }
  }
  // не задираем цену сильно выше справедливой (рейтинг)
  const fair = CC.economy.derive(st).fairPrice;
  return Math.min(best, Math.round(fair * 1.25 / 10) * 10);
}

const strategies = {
  doNothing: {
    setup: { concept: 'budget', legal: 'ip', location: 'campus', seats: { gaming: 15 }, internet: 1, staff: { admin: 2 } },
    daily() {}
  },
  reasonable: {
    setup: { concept: 'esport', legal: 'ip', location: 'campus', seats: { gaming: 16 }, internet: 1, furniture: 0,
             staff: { admin: 2, cleaner: 1 }, campaigns: ['social', 'target'] },
    daily(CC, st) {
      const E = CC.economy, D = CC.data;
      const d = E.derive(st);
      if (st.day % 7 === 0) E.setPrice(st, bestPrice(CC, st));
      for (const s of D.seats) { const z = st.zones[s.id]; if (z.n && (z.cond < 65 || z.broken > 0) && st.cash > E.repairCost(st, s.id) + 150000) E.repairZone(st, s.id); }
      const used = E.slotsUsed(st);
      while (st.staff.admin * 14 < E.seatsTotal(st) && st.staff.admin < 8) E.hire(st, 'admin');
      if (used >= 14 && st.staff.tech * 40 < used && st.staff.tech < 3) E.hire(st, 'tech');
      if (st.staff.cleaner * 30 < used && st.staff.cleaner < 3) E.hire(st, 'cleaner');
      if (used >= 30 && !st.staff.smm) E.hire(st, 'smm');
      const util = st.lastReport ? st.lastReport.util : 0;
      if (util < 0.9 && st.cash > 300000) { E.startCampaign(st, 'social'); E.startCampaign(st, 'target'); }
      if (util < 0.8 && st.cash > 1200000) E.startCampaign(st, 'blogger');
      if (st.cash > 800000 && st.day % 30 === 15) E.startCampaign(st, 'tournament');
      if (!st.loyalty && st.cash > 600000) E.toggleLoyalty(st);
      for (const u of ['bar', 'cctv', 'fire', 'generator', 'stream']) if (!st.upgrades[u] && st.cash > D.upgrades.find(x => x.id === u).cost + 500000) E.buyUpgrade(st, u);
      if (st.furniture < 1 && st.cash > 900000) E.setFurniture(st, 1);
      if (st.furniture < 2 && st.cash > 3000000) E.setFurniture(st, 2);
      if (!d.internetOk || (used > d.internet.capacity * 0.9)) E.setInternet(st, Math.min(3, st.internet + 1));
      // расширение
      const avgUtil = st.history.slice(-14).reduce((a, h) => a + h.visitors, 0) / Math.max(1, Math.min(14, st.history.length)) / Math.max(1, d.capacity);
      if (avgUtil > 0.8 && st.cash > 700000) {
        const free = E.slotsMax(st) - used;
        if (free > 0) {
          const type = st.cash > 2500000 ? 'top' : 'gaming';
          const n = Math.max(1, Math.min(free, Math.floor((st.cash - 500000) / E.seatPrice(st, type)), 6));
          if (n > 0) E.buySeats(st, type, n);
        } else if (st.expanded < 2 && st.cash > D.expansion[st.expanded].cost + 800000) {
          E.expand(st);
        } else if (st.location !== 'center' && st.cash > 3000000 && used <= 64) {
          E.relocate(st, 'center');
        }
      }
      if (st.goalIndex >= 1 && st.zones.console.n < 6 && st.cash > 2000000 && E.slotsMax(st) - used > 0) E.buySeats(st, 'console', 2);
    }
  },
  aggressiveDebt: {
    setup: { concept: 'esport', legal: 'ip', location: 'center', seats: { top: 8 }, internet: 2,
             staff: { admin: 1 }, campaigns: ['blogger'] },
    daily(CC, st) {
      const E = CC.economy;
      if (st.day === 0 || st.day % 10 === 0) for (const id of ['micro', 'business', 'invest']) {
        const a = E.loanAvailable(st, id); if (a.ok) E.takeLoan(st, id, a.max);
      }
      const free = E.slotsMax(st) - E.slotsUsed(st);
      if (free > 0 && st.cash > 210000) E.buySeats(st, 'top', Math.min(free, Math.floor(st.cash / 210000)));
      while (st.staff.admin * 14 < E.seatsTotal(st) && st.staff.admin < 8) E.hire(st, 'admin');
      E.startCampaign(st, 'blogger'); E.startCampaign(st, 'target');
      E.setPrice(st, 300);
    }
  }
};

function run(name, seed, maxDays = 1000) {
  const CC = load();
  const strat = strategies[name];
  const st = CC.state.createState(seed);
  setup(CC, st, strat.setup);
  const goalDays = [];
  let minCash = st.cash;
  for (let i = 0; i < maxDays && st.phase === 'running'; i++) {
    strat.daily(CC, st);
    if (st.pendingEvent) CC.events.autoResolve(st, name === 'doNothing' ? 'cheap' : undefined);
    const before = st.goalIndex;
    CC.economy.simulateDay(st);
    if (st.pendingEvent && name === 'doNothing') CC.events.autoResolve(st, 'cheap');
    if (st.goalIndex > before) for (let k = before; k < st.goalIndex; k++) goalDays[k] = st.day;
    minCash = Math.min(minCash, st.cash);
    if (st.won && name !== 'doNothing') break;
  }
  return { name, seed, day: st.day, phase: st.phase, won: st.won, goalDays, cash: Math.round(st.cash),
           net: Math.round(CC.economy.netCapital(st)), rating: +st.rating.toFixed(2), seats: CC.economy.seatsTotal(st),
           location: st.location, minCash: Math.round(minCash), gameOver: st.gameOver, state: st };
}

module.exports = { run, strategies, setup, bestPrice };
