/* Экономический движок: производные показатели, симуляция дня, действия игрока. */
(function (g) {
  'use strict';
  var CC = g.CC = g.CC || {};
  var D = CC.data, S = CC.state, R = CC.rng, U = CC.util;
  var byId = S.byId;

  function seatDef(id) { return byId(D.seats, id); }
  function staffDef(id) { return byId(D.staff, id); }
  function modProduct(state, kind) {
    var p = 1;
    state.modifiers.forEach(function (m) { if (m.kind === kind) p *= m.value; });
    return p;
  }
  function hasMod(state, kind) { return state.modifiers.some(function (m) { return m.kind === kind; }); }
  function campaignActive(state, id) { return state.campaigns.some(function (c) { return c.id === id; }); }

  function slotsMax(state) {
    var loc = byId(D.locations, state.location);
    if (!loc) return 0;
    var mult = state.expanded > 0 ? D.expansion[state.expanded - 1].slotMult : 1;
    return Math.round(loc.slots * mult);
  }
  function rentMonthly(state) {
    var loc = byId(D.locations, state.location);
    if (!loc) return 0;
    var mult = state.expanded > 0 ? D.expansion[state.expanded - 1].rentMult : 1;
    return loc.rent * mult;
  }
  function slotsUsed(state) {
    var t = 0;
    D.seats.forEach(function (s) { t += state.zones[s.id].n * s.slots; });
    return t;
  }
  function seatsTotal(state) {
    var t = 0;
    D.seats.forEach(function (s) { t += state.zones[s.id].n; });
    return t;
  }
  function isUnlocked(state, seat) {
    if (!seat.unlockGoal) return true;
    if (state.concept === 'family') return true;
    return state.goalIndex >= seat.unlockGoal;
  }
  function wagesMonthly(state) {
    var t = 0;
    D.staff.forEach(function (s) { t += (state.staff[s.id] || 0) * s.wage; });
    return t;
  }
  function loanDebt(state) {
    return state.loans.reduce(function (a, l) { return a + l.balance; }, 0);
  }
  function netCapital(state) { return state.cash - loanDebt(state); }

  /* ---------- Производные показатели ---------- */
  function derive(state) {
    var loc = byId(D.locations, state.location) || { traffic: 0, priceMult: 1, slots: 0, rent: 0 };
    var legal = byId(D.legal, state.legal) || D.legal[0];
    var concept = byId(D.concepts, state.concept) || D.concepts[0];
    var working = 0, workingSlots = 0, multSum = 0, qSum = 0, condSum = 0, kwhSum = 0, topWorking = 0, famWorking = 0;
    D.seats.forEach(function (s) {
      var z = state.zones[s.id];
      var w = Math.max(0, z.n - z.broken);
      working += w; workingSlots += w * s.slots;
      multSum += w * s.mult; qSum += w * s.q; condSum += w * z.cond; kwhSum += w * s.kwh;
      if (s.id === 'top') topWorking += w;
      if (s.id === 'console' || s.id === 'vr') famWorking += w;
    });
    var used = slotsUsed(state);
    var adminSeats = (state.staff.admin || 0) * staffDef('admin').cover;
    var adminFactor = working > 0 ? Math.min(1, adminSeats / working) : 0;
    var served = working * adminFactor;
    var capacity = Math.floor(served * D.SESSIONS_PER_SEAT);
    var avgMult = working ? multSum / working : 1;
    var tier = working ? qSum / working : 0;
    var cond = working ? condSum / working : 100;
    var avgKwh = working ? kwhSum / working : 0.4;
    var condF = 0.55 + 0.45 * cond / 100;
    var furn = D.furniture[state.furniture] || D.furniture[0];
    var topShare = working ? topWorking / working : 0;
    var attraction = (0.6 + 0.2 * tier) * condF * (1 + furn.bonus) * (1 + concept.topBonus * topShare);
    var fairPrice = D.BASE_FAIR_PRICE * loc.priceMult * concept.fairMult * (0.8 + 0.2 * condF) * (1 + furn.bonus * 0.5);
    var price = U.clamp(state.price, D.PRICE_MIN, D.PRICE_MAX);
    var priceFactor = U.clamp(Math.pow(fairPrice / price, D.ELASTICITY), 0.03, 2.2);
    var repF = 0.2 + 0.18 * state.rating;
    var smm = (state.staff.smm || 0) > 0;
    var rawC = 0;
    state.campaigns.forEach(function (c) {
      var def = byId(D.campaigns, c.id); if (!def) return;
      var r = def.reach;
      if (def.tournament) r *= (concept.id === 'esport' ? 1.5 : 1) * (state.upgrades.stream ? 1.15 : 1);
      rawC += r;
    });
    state.modifiers.forEach(function (m) { if (m.kind === 'reach') rawC += m.value; });
    if (smm) rawC *= 1.3;
    var effC = rawC / (1 + rawC / (3 * Math.max(10, loc.traffic)));
    var reach = loc.traffic + state.community + effC;
    var tech = state.staff.tech || 0, cleaner = state.staff.cleaner || 0;
    var techCov = used ? Math.min(1, tech * staffDef('tech').cover / used) : (tech ? 1 : 0);
    var cleanCov = used ? Math.min(1, cleaner * staffDef('cleaner').cover / used) : (cleaner ? 1 : 0);
    var inet = D.internet[state.internet] || D.internet[0];
    var internetOk = used <= inet.capacity;
    return {
      loc: loc, legal: legal, concept: concept, working: working, workingSlots: workingSlots,
      slotsUsed: used, slotsMax: slotsMax(state), seats: seatsTotal(state),
      adminFactor: adminFactor, capacity: capacity, avgMult: avgMult, tier: tier, cond: cond, condF: condF,
      avgKwh: avgKwh, attraction: attraction, fairPrice: fairPrice, price: price, priceFactor: priceFactor,
      repF: repF, campaignReach: effC, reach: reach, techCov: techCov, cleanCov: cleanCov,
      internet: inet, internetOk: internetOk, famShare: working ? famWorking / working : 0,
      rentMonthly: rentMonthly(state), wagesMonthly: wagesMonthly(state)
    };
  }

  function dayFactor(state, date, concept) {
    var wd = date.getUTCDay();
    var f = S.WEEKDAY[wd];
    if (concept && concept.familyBonus) f *= (wd === 0 || wd === 6) ? 1 + concept.familyBonus : 0.95;
    return f;
  }

  // Ожидаемый спрос в «средний» день (без шума и событий дня) — для прогноза цены
  function demandAt(state, price, d) {
    d = d || derive(state);
    var pf = U.clamp(Math.pow(d.fairPrice / U.clamp(price, D.PRICE_MIN, D.PRICE_MAX), D.ELASTICITY), 0.03, 2.2);
    return d.reach * d.repF * d.attraction * pf * state.competitor * 1.03;
  }
  function forecast(state, price) {
    var d = derive(state);
    var p = price === undefined ? d.price : price;
    var demand = demandAt(state, p, d);
    var visitors = Math.min(demand, d.capacity);
    var hoursRev = visitors * D.HOURS_PER_VISIT * p * d.avgMult * (state.loyalty ? 1 - D.LOYALTY_DISCOUNT : 1);
    var bar = state.upgrades.bar ? visitors * D.BAR_SPEND : 0;
    var revenue = hoursRev + bar;
    var fixed = fixedDaily(state, d);
    var variable = electricity(state, d, visitors) + bar * (1 - D.BAR_MARGIN);
    var tax = taxFor(d.legal, revenue, fixed + variable);
    return { demand: demand, visitors: visitors, revenue: revenue, costs: fixed + variable + tax,
             profit: revenue - fixed - variable - tax,
             costPerHour: visitors > 0 ? (fixed + variable + tax) / (visitors * D.HOURS_PER_VISIT) : 0 };
  }
  function fixedDaily(state, d) {
    return d.rentMonthly / 30 + d.wagesMonthly / 30 + d.internet.monthly / 30 + d.legal.accountingMonthly / 30
      + d.slotsUsed * 2.5 * D.KWH_PRICE * state.tariffMult;
  }
  function electricity(state, d, visitors) {
    return (visitors * D.HOURS_PER_VISIT * d.avgKwh + d.slotsUsed * 2.5) * D.KWH_PRICE * state.tariffMult;
  }
  function taxFor(legal, revenue, expenses) {
    if (legal.id === 'ooo') return Math.max(0.01 * revenue, 0.15 * Math.max(0, revenue - expenses));
    return 0.06 * revenue;
  }

  /* ---------- Симуляция одного дня ---------- */
  function simulateDay(state) {
    if (state.phase !== 'running') return { ok: false, msg: 'Клуб не работает' };
    if (state.pendingEvent) return { ok: false, msg: 'Сначала примите решение по событию' };
    var d = derive(state);
    var date = S.dateOf(state.day);
    var season = S.seasonInfo(date);
    var dayF = dayFactor(state, date, d.concept);
    var wd = date.getUTCDay(), weekday = wd >= 1 && wd <= 5;
    var noise = R.range(state.rng, 0.88, 1.12);
    var closed = modProduct(state, 'open'); // 0 — закрыто, 0.5 — частично
    var demand = d.reach * d.repF * d.attraction * d.priceFactor * dayF * season.f
      * modProduct(state, 'demand') * state.competitor * noise;
    var happy = campaignActive(state, 'happy');
    if (happy && weekday) demand *= 1.25;
    demand = Math.max(0, demand);
    var cap = Math.floor(d.capacity * closed);
    var visitors = Math.min(Math.floor(demand), cap);
    var turned = Math.max(0, demand - cap);
    var util = d.capacity > 0 ? visitors / d.capacity : 0;

    var discount = (state.loyalty ? 1 - D.LOYALTY_DISCOUNT : 1) * (happy && weekday ? 0.85 : 1);
    var hoursRevenue = visitors * D.HOURS_PER_VISIT * d.price * d.avgMult * discount;
    var barRevenue = state.upgrades.bar ? visitors * D.BAR_SPEND : 0;
    var otherIncome = state.pending.income || 0;
    var revenue = hoursRevenue + barRevenue;

    var rent = d.rentMonthly / 30;
    var wages = d.wagesMonthly / 30;
    var power = electricity(state, d, visitors) * (closed < 1 ? 0.6 + 0.4 * closed : 1);
    var inet = d.internet.monthly / 30;
    var accounting = d.legal.accountingMonthly / 30;
    var barCost = barRevenue * (1 - D.BAR_MARGIN);
    var interest = 0, principal = 0;
    state.loans.forEach(function (l) {
      var i = l.balance * l.rate / 365;
      var p = Math.min(l.balance, Math.max(0, l.payment - i));
      l.daysLeft -= 1;
      if (l.daysLeft <= 0) p = l.balance;
      l.balance = Math.max(0, l.balance - p);
      interest += i; principal += p;
    });
    var repaid = state.loans.filter(function (l) { return l.balance <= 0.5; });
    if (repaid.length) {
      state.stats.loansRepaid += repaid.length;
      repaid.forEach(function (l) { S.addLog(state, 'Кредит «' + l.name + '» полностью погашен.', 'good'); });
      state.loans = state.loans.filter(function (l) { return l.balance > 0.5; });
    }
    var pend = state.pending;
    var opexNoTax = rent + wages + power + inet + accounting + barCost + interest + pend.marketing + pend.repairs + pend.fines + pend.other;
    var tax = taxFor(d.legal, revenue + otherIncome, opexNoTax);
    var expenses = opexNoTax + tax;
    var profit = revenue + otherIncome - expenses;
    // Наличные: разовые траты уже списаны в момент действия
    state.cash += revenue - (rent + wages + power + inet + accounting + barCost + tax + interest + principal);

    var report = {
      day: state.day, date: date.getTime(), season: season.label, demand: demand, visitors: visitors,
      capacity: cap, turned: turned, util: util, price: d.price,
      revenue: revenue, hoursRevenue: hoursRevenue, barRevenue: barRevenue, otherIncome: otherIncome,
      costs: { rent: rent, wages: wages, power: power, internet: inet, accounting: accounting, bar: barCost,
               interest: interest, tax: tax, marketing: pend.marketing, repairs: pend.repairs, fines: pend.fines, other: pend.other },
      expenses: expenses, profit: profit, principal: principal, capex: pend.capex,
      costPerHour: visitors > 0 ? expenses / (visitors * D.HOURS_PER_VISIT) : 0
    };
    state.pending = { marketing: 0, repairs: 0, fines: 0, capex: 0, other: 0, income: 0 };

    /* --- Износ и поломки --- */
    var wearMult = 1 - 0.55 * d.techCov;
    D.seats.forEach(function (s) {
      var z = state.zones[s.id];
      if (!z.n) return;
      z.cond = Math.max(0, z.cond - (0.12 + 0.34 * util) * wearMult);
      var p = (z.cond < 40 ? 0.003 + (40 - z.cond) * 0.0009 : 0.0006) * (1 - 0.6 * d.techCov);
      var w = z.n - z.broken, b = 0;
      for (var i = 0; i < w; i++) if (R.next(state.rng) < p) b++;
      if (b) {
        z.broken += b;
        S.addLog(state, 'Сломалось: ' + s.name.toLowerCase() + ' — ' + b + ' шт. Нужен ремонт в разделе «Зал».', 'bad');
      }
    });

    /* --- Рейтинг --- */
    var t = 3.0 + (d.tier - 1.5) * 0.35 + (d.condF - 0.8) * 2.5 + (-0.25 + 0.6 * d.cleanCov)
      + (D.furniture[state.furniture] || D.furniture[0]).bonus * 2.5
      + (d.internetOk ? 0.1 : -0.6) + (d.adminFactor < 1 ? -0.5 : 0)
      + (state.loyalty ? 0.15 : 0) + (state.upgrades.bar ? 0.1 : 0);
    var ratio = d.price / Math.max(1, d.fairPrice);
    if (ratio > 1.3) t -= (ratio - 1.3) * 1.5; else if (ratio < 0.8) t += 0.15;
    var turnedRatio = demand > 0 ? turned / demand : 0;
    t -= 0.6 * turnedRatio;
    if (d.working === 0) t = 1;
    t = U.clamp(t, 1, 5);
    state.rating = U.clamp(state.rating + (t - state.rating) * 0.04, 1, 5);
    report.ratingTarget = t;

    /* --- Сообщество (сарафанное радио) --- */
    var growth = visitors * 0.006 * (state.rating - 2.8) * (d.concept.communityMult) * ((state.staff.smm || 0) ? 1.5 : 1);
    if (state.upgrades.stream) growth += 1;
    var commCap = Math.max(10, d.loc.traffic * 2.2 * (state.loyalty ? 1.25 : 1));
    if (growth > 0) growth *= Math.max(0, 1 - state.community / commCap);
    state.community = Math.max(0, state.community + growth - state.community * (state.loyalty ? 0.006 : 0.012));

    /* --- Таймеры --- */
    state.campaigns.forEach(function (c) { c.daysLeft -= 1; });
    state.campaigns.filter(function (c) { return c.daysLeft <= 0; }).forEach(function (c) {
      var def = byId(D.campaigns, c.id);
      S.addLog(state, 'Кампания «' + (def ? def.name : c.id) + '» завершилась.', 'info');
    });
    state.campaigns = state.campaigns.filter(function (c) { return c.daysLeft > 0; });
    state.modifiers.forEach(function (m) { m.daysLeft -= 1; });
    state.modifiers.filter(function (m) { return m.daysLeft <= 0 && m.kind === 'tariff'; }).forEach(function () { state.tariffMult = 1; });
    state.modifiers = state.modifiers.filter(function (m) { return m.daysLeft > 0; });
    if (state.competitor < 1) state.competitor = Math.min(1, state.competitor + (state.rating >= 4.3 ? 0.005 : 0.0025));

    /* --- Статистика --- */
    var st = state.stats;
    st.totalRevenue += revenue + otherIncome;
    st.totalVisitors += visitors;
    st.totalProfit += profit;
    st.profitStreak = profit > 0 ? st.profitStreak + 1 : 0;
    st.maxVisitors = Math.max(st.maxVisitors, visitors);
    state.history.push({ day: state.day, cash: Math.round(state.cash), revenue: Math.round(revenue + otherIncome),
      expenses: Math.round(expenses), profit: Math.round(profit), visitors: visitors, net: Math.round(netCapital(state)) });
    if (state.history.length > 400) state.history.splice(0, state.history.length - 400);
    state.lastReport = report;
    state.day += 1;

    /* --- Банкротство --- */
    if (state.cash < 0) {
      state.negDays += 1;
      if (state.negDays === 1) S.addLog(state, 'Кассовый разрыв! Счёт ушёл в минус. Через 21 день в минусе или при долге больше ' + CC.fmt.money(d.legal.overdraft) + ' — банкротство.', 'bad');
    } else state.negDays = 0;
    if (state.cash < -d.legal.overdraft || state.negDays > 21) {
      state.phase = 'over';
      state.gameOver = { day: state.day, reason: state.cash < -d.legal.overdraft ? 'Долг превысил допустимый минус по счёту' : 'Счёт был в минусе больше 21 дня' };
      S.addStory(state, 'БАНКРОТСТВО', 'Клуб закрыт: ' + state.gameOver.reason.toLowerCase() + '. Начните новую игру и попробуйте другую стратегию.', 'bankrupt');
      S.addLog(state, 'Банкротство. Игра окончена.', 'bad');
    }
    if (state.phase === 'running') {
      if (CC.quests) CC.quests.check(state, report);
      if (CC.events) CC.events.roll(state);
    }
    return { ok: true, report: report };
  }

  /* ---------- Действия игрока ---------- */
  function pay(state, amount, bucket) {
    state.cash -= amount;
    state.pending[bucket] = (state.pending[bucket] || 0) + amount;
    if (state.phase === 'setup') state.stats.setupSpent += amount;
  }
  function fail(msg) { return { ok: false, msg: msg }; }
  function ok(msg, extra) { var r = { ok: true, msg: msg }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }

  function seatPrice(state, id) {
    var s = seatDef(id); if (!s) return 0;
    return Math.round(s.cost * (hasMod(state, 'discount') ? 0.8 : 1));
  }
  function buySeats(state, id, n) {
    n = Math.floor(n || 1);
    var s = seatDef(id);
    if (!s || n < 1) return fail('Неизвестное оборудование');
    if (!state.location) return fail('Сначала арендуйте помещение');
    if (!isUnlocked(state, s)) return fail('Откроется после цели №' + s.unlockGoal);
    if (slotsUsed(state) + n * s.slots > slotsMax(state)) return fail('Не хватает места в помещении');
    var cost = seatPrice(state, id) * n;
    if (state.cash < cost) return fail('Недостаточно денег: нужно ' + CC.fmt.money(cost));
    var z = state.zones[id];
    z.cond = (z.n * z.cond + n * 100) / (z.n + n);
    z.n += n;
    pay(state, cost, 'capex');
    return ok('Куплено: ' + s.name.toLowerCase() + ' × ' + n, { cost: cost });
  }
  function sellValue(state, id, n) {
    var s = seatDef(id), z = state.zones[id];
    if (!s || !z) return 0;
    if (state.phase === 'setup') return n * s.cost; // до открытия — отмена покупки без потерь
    n = Math.min(n, z.n);
    var broken = Math.min(n, z.broken), good = n - broken;
    return Math.round(broken * s.cost * 0.1 + good * s.cost * 0.4 * (z.cond / 100));
  }
  function sellSeats(state, id, n) {
    n = Math.floor(n || 1);
    var s = seatDef(id), z = state.zones[id];
    if (!s || !z || n < 1) return fail('Неизвестное оборудование');
    if (z.n < n) return fail('Столько нет');
    var value = sellValue(state, id, n);
    var broken = Math.min(n, z.broken);
    z.broken -= broken; z.n -= n;
    if (z.n === 0) { z.cond = 100; z.broken = 0; }
    state.cash += value;
    state.pending.capex -= value;
    if (state.phase === 'setup') state.stats.setupSpent -= value;
    return ok('Продано за ' + CC.fmt.money(value), { value: value });
  }
  function repairCost(state, id) {
    var s = seatDef(id), z = state.zones[id];
    if (!s || !z || !z.n) return 0;
    var d = derive(state);
    var k = 1 - 0.3 * d.techCov;
    return Math.round((z.n * s.cost * 0.25 * (100 - z.cond) / 100 + z.broken * s.cost * 0.12) * k);
  }
  function repairZone(state, id) {
    var cost = repairCost(state, id), z = state.zones[id];
    if (!z || !z.n) return fail('Нечего ремонтировать');
    if (cost <= 0) return fail('Всё в идеальном состоянии');
    if (state.cash < cost) return fail('Недостаточно денег: нужно ' + CC.fmt.money(cost));
    z.cond = 100; z.broken = 0;
    pay(state, cost, 'repairs');
    return ok('Отремонтировано за ' + CC.fmt.money(cost), { cost: cost });
  }
  function repairAllCost(state) { return D.seats.reduce(function (a, s) { return a + repairCost(state, s.id); }, 0); }
  function repairAll(state) {
    var cost = repairAllCost(state);
    if (cost <= 0) return fail('Всё в идеальном состоянии');
    if (state.cash < cost) return fail('Недостаточно денег: нужно ' + CC.fmt.money(cost));
    D.seats.forEach(function (s) { if (state.zones[s.id].n) repairZone(state, s.id); });
    return ok('Весь зал отремонтирован за ' + CC.fmt.money(cost), { cost: cost });
  }
  function setFurniture(state, level) {
    var f = D.furniture[level];
    if (!f) return fail('Нет такого варианта');
    if (level <= state.furniture) return fail('У вас уже такой или лучше');
    if (state.cash < f.cost) return fail('Недостаточно денег');
    pay(state, f.cost, 'capex');
    state.furniture = level;
    return ok('Интерьер обновлён: ' + f.name);
  }
  function setInternet(state, level) {
    var t = D.internet[level];
    if (!t) return fail('Нет такого тарифа');
    if (level === state.internet) return fail('Уже подключено');
    var cost = state.phase === 'setup' ? 0 : D.INTERNET_SWITCH_COST;
    if (state.cash < cost) return fail('Недостаточно денег');
    if (cost) pay(state, cost, 'other');
    state.internet = level;
    return ok('Интернет: ' + t.name);
  }
  function hire(state, id) {
    var s = staffDef(id); if (!s) return fail('Нет такой должности');
    if ((state.staff[id] || 0) >= s.max) return fail('Больше не нужно');
    state.staff[id] = (state.staff[id] || 0) + 1;
    return ok('Нанят: ' + s.name.toLowerCase());
  }
  function fire(state, id) {
    var s = staffDef(id); if (!s) return fail('Нет такой должности');
    if (!(state.staff[id] > 0)) return fail('Некого увольнять');
    var sev = state.phase === 'setup' ? 0 : Math.round(s.wage * 0.5);
    state.staff[id] -= 1;
    if (sev) pay(state, sev, 'other');
    return ok(sev ? 'Уволен, выходное пособие ' + CC.fmt.money(sev) : 'Должность убрана из плана');
  }
  function campaignCost(state, id) { var c = byId(D.campaigns, id); return c ? c.cost : 0; }
  function startCampaign(state, id) {
    var c = byId(D.campaigns, id); if (!c) return fail('Нет такой кампании');
    if (campaignActive(state, id)) return fail('Кампания уже идёт');
    if (state.cash < c.cost) return fail('Недостаточно денег');
    pay(state, c.cost, 'marketing');
    var days = c.days;
    if (c.school) { var si = S.seasonInfo(S.dateOf(state.day)); if (si.label) days = Math.ceil(days * 0.5); }
    state.campaigns.push({ id: id, daysLeft: days });
    if (c.community) state.community += c.community * ((state.staff.smm || 0) ? 1.3 : 1);
    if (c.rating) state.rating = U.clamp(state.rating + c.rating, 1, 5);
    return ok('Запущено: ' + c.name);
  }
  function toggleLoyalty(state) {
    if (state.loyalty) { state.loyalty = false; return ok('Программа лояльности отключена'); }
    if (state.cash < D.LOYALTY_SETUP) return fail('Недостаточно денег');
    pay(state, D.LOYALTY_SETUP, 'marketing');
    state.loyalty = true;
    return ok('Программа лояльности запущена');
  }
  function buyUpgrade(state, id) {
    var u = byId(D.upgrades, id); if (!u) return fail('Нет такого улучшения');
    if (state.upgrades[id]) return fail('Уже есть');
    if (u.needGoal && state.goalIndex < u.needGoal) return fail('Откроется после цели №' + u.needGoal);
    if (state.cash < u.cost) return fail('Недостаточно денег');
    pay(state, u.cost, 'capex');
    state.upgrades[id] = true;
    return ok('Установлено: ' + u.name);
  }
  function expand(state) {
    var e = D.expansion[state.expanded];
    if (!e) return fail('Помещение уже максимального размера');
    if (state.goalIndex < e.needGoal) return fail('Откроется после цели №' + e.needGoal);
    if (state.cash < e.cost) return fail('Недостаточно денег');
    pay(state, e.cost, 'capex');
    state.expanded += 1;
    return ok('Помещение расширено до ' + slotsMax(state) + ' мест');
  }
  function relocateCost(state, id) {
    var loc = byId(D.locations, id); if (!loc) return 0;
    return loc.rent + 250000;
  }
  function relocate(state, id) {
    var loc = byId(D.locations, id); if (!loc) return fail('Нет такого помещения');
    if (id === state.location) return fail('Вы уже здесь');
    if (slotsUsed(state) > loc.slots) return fail('Оборудование не поместится: продайте лишнее');
    var cost = relocateCost(state, id);
    if (state.cash < cost) return fail('Недостаточно денег: нужно ' + CC.fmt.money(cost));
    pay(state, cost, 'capex');
    state.location = id; state.expanded = 0;
    state.community *= 0.5;
    state.modifiers.push({ kind: 'open', value: 0, daysLeft: 2, label: 'Переезд' });
    return ok('Переезд: ' + loc.name + '. Два дня уйдёт на монтаж.');
  }
  function setPrice(state, p) {
    p = Math.round(Number(p));
    if (!isFinite(p)) return fail('Некорректная цена');
    state.price = U.clamp(p, D.PRICE_MIN, D.PRICE_MAX);
    return ok('Цена часа: ' + CC.fmt.money(state.price));
  }

  /* ---------- Кредиты ---------- */
  function avgRevenue(state, n) {
    var h = state.history.slice(-n);
    if (!h.length) return 0;
    return h.reduce(function (a, x) { return a + x.revenue; }, 0) / h.length;
  }
  function loanLimit(state) {
    var legal = byId(D.legal, state.legal) || D.legal[0];
    var lim = legal.loanBase * (0.5 + state.rating / 10) + 25 * avgRevenue(state, 14);
    return Math.max(0, Math.round((lim - loanDebt(state)) / 10000) * 10000);
  }
  function loanRate(state, id) {
    var l = byId(D.loans, id), legal = byId(D.legal, state.legal) || D.legal[0];
    return l ? l.rate + legal.loanRateAdd : 0;
  }
  function annuity(amount, rate, term) {
    var r = rate / 365;
    return amount * r / (1 - Math.pow(1 + r, -term));
  }
  function loanAvailable(state, id) {
    var l = byId(D.loans, id); if (!l) return { ok: false, msg: 'Нет такого кредита' };
    if (state.phase !== 'running') return { ok: false, msg: 'Банк ждёт открытия клуба' };
    if (l.needDays && state.day < l.needDays) return { ok: false, msg: 'Нужно проработать ' + l.needDays + ' дн.' };
    if (l.needRating && state.rating < l.needRating) return { ok: false, msg: 'Нужен рейтинг от ' + CC.fmt.num1(l.needRating) };
    if (state.loans.some(function (x) { return x.id === id; })) return { ok: false, msg: 'Такой кредит уже есть' };
    var max = Math.min(l.max, loanLimit(state));
    if (max < l.min) return { ok: false, msg: 'Банк не одобрит: лимит ' + CC.fmt.money(Math.max(0, max)) };
    return { ok: true, min: l.min, max: max };
  }
  function takeLoan(state, id, amount) {
    var a = loanAvailable(state, id);
    if (!a.ok) return fail(a.msg);
    amount = Math.round(Number(amount) / 10000) * 10000;
    if (!(amount >= a.min && amount <= a.max)) return fail('Сумма должна быть от ' + CC.fmt.money(a.min) + ' до ' + CC.fmt.money(a.max));
    var l = byId(D.loans, id), rate = loanRate(state, id);
    state.loans.push({ id: id, name: l.name, balance: amount, rate: rate, payment: annuity(amount, rate, l.term), daysLeft: l.term });
    state.cash += amount;
    return ok('Получен кредит ' + CC.fmt.money(amount) + ' под ' + Math.round(rate * 100) + '% годовых');
  }
  function repayLoan(state, index) {
    var l = state.loans[index]; if (!l) return fail('Нет такого кредита');
    var total = Math.round(l.balance * (1 + D.LOAN_EARLY_FEE));
    if (state.cash < total) return fail('Нужно ' + CC.fmt.money(total));
    state.cash -= total;
    state.pending.other += total - l.balance;
    state.loans.splice(index, 1);
    state.stats.loansRepaid += 1;
    return ok('Кредит погашен досрочно: ' + CC.fmt.money(total));
  }

  CC.economy = {
    derive: derive, forecast: forecast, demandAt: demandAt, simulateDay: simulateDay, taxFor: taxFor, annuity: annuity,
    slotsMax: slotsMax, slotsUsed: slotsUsed, seatsTotal: seatsTotal, rentMonthly: rentMonthly, wagesMonthly: wagesMonthly,
    isUnlocked: isUnlocked, loanDebt: loanDebt, netCapital: netCapital, loanLimit: loanLimit, loanRate: loanRate,
    loanAvailable: loanAvailable, takeLoan: takeLoan, repayLoan: repayLoan, avgRevenue: avgRevenue,
    seatPrice: seatPrice, buySeats: buySeats, sellSeats: sellSeats, sellValue: sellValue,
    repairCost: repairCost, repairZone: repairZone, repairAll: repairAll, repairAllCost: repairAllCost,
    setFurniture: setFurniture, setInternet: setInternet, hire: hire, fire: fire,
    startCampaign: startCampaign, campaignCost: campaignCost, campaignActive: campaignActive, toggleLoyalty: toggleLoyalty,
    buyUpgrade: buyUpgrade, expand: expand, relocate: relocate, relocateCost: relocateCost, setPrice: setPrice,
    pay: pay, hasMod: hasMod
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
