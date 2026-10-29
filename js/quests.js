/* Пошаговое открытие клуба (сюжет), цели и достижения. */
(function (g) {
  'use strict';
  var CC = g.CC = g.CC || {};
  var D = CC.data, S = CC.state, U = CC.util;

  var steps = [
    { id: 'plan', title: 'Вы написали бизнес-план!', art: 'plan', kind: 'concept',
      text: 'Расчёты готовы: стартовый капитал — 3 000 000 ₽. Теперь выберите концепцию клуба — она определит, кто будет вашими гостями. Дальше впереди юридические вопросы, аренда, оборудование и персонал. Это важные бизнес-процессы, от которых зависит успех вашего начинания.' },
    { id: 'legal', title: 'Юридические вопросы', art: 'legal', kind: 'legal',
      text: 'Пора зарегистрировать бизнес. ИП — проще и дешевле, ООО — солиднее для банков и платит налог только с прибыли. Выбор влияет на налоги, бухгалтерию и кредиты.' },
    { id: 'rent', title: 'Аренда помещения', art: 'rent', kind: 'location',
      text: 'Место решает многое: от него зависят поток людей, вместимость зала и сколько гости готовы платить за час. При заключении договора платится обеспечительный взнос — одна месячная аренда.' },
    { id: 'equip', title: 'Оборудование', art: 'equip', kind: 'equipment',
      text: 'Закупите компьютеры, мебель и выберите интернет-канал. Игровые ПК — золотая середина, топовые приносят больше с часа, офисные дешёвые, но гостям неинтересны. Минимум — 5 мест. Оставьте деньги на первые месяцы работы!' },
    { id: 'staff', title: 'Персонал', art: 'staff', kind: 'staff',
      text: 'Без администратора клуб не откроется: он обслуживает до 14 мест. Техник продлевает жизнь железу, уборщик держит рейтинг, SMM-менеджер усиливает рекламу. Зарплаты платятся каждый день (месячная ставка / 30).' },
    { id: 'marketing', title: 'Маркетинг и открытие', art: 'marketing', kind: 'marketing',
      text: 'О клубе пока никто не знает. Запустите стартовую рекламу или откройтесь «тихо». После открытия дни пойдут один за другим: следите за спросом, ценой и износом.' }
  ];

  function chooseConcept(state, id) {
    if (state.phase !== 'setup' || state.setupStep !== 0) return { ok: false, msg: 'Шаг уже пройден' };
    var c = S.byId(D.concepts, id); if (!c) return { ok: false, msg: 'Нет такой концепции' };
    state.concept = id; state.setupStep = 1;
    S.addStory(state, 'Концепция: ' + c.name, c.desc, 'plan');
    return { ok: true, msg: 'Концепция выбрана' };
  }
  function chooseLegal(state, id) {
    if (state.phase !== 'setup' || state.setupStep !== 1) return { ok: false, msg: 'Шаг недоступен' };
    var l = S.byId(D.legal, id); if (!l) return { ok: false, msg: 'Нет такой формы' };
    CC.economy.pay(state, l.regCost, 'other');
    state.legal = id; state.setupStep = 2;
    S.addStory(state, 'Зарегистрировано ' + l.name, 'Налоговый режим: ' + l.taxName + '.', 'legal');
    return { ok: true, msg: l.name + ' зарегистрировано' };
  }
  function chooseLocation(state, id) {
    if (state.phase !== 'setup' || state.setupStep !== 2) return { ok: false, msg: 'Шаг недоступен' };
    var loc = S.byId(D.locations, id); if (!loc) return { ok: false, msg: 'Нет такого помещения' };
    if (state.cash < loc.rent) return { ok: false, msg: 'Недостаточно денег' };
    CC.economy.pay(state, loc.rent, 'other');
    state.location = id; state.setupStep = 3;
    state.price = Math.round(D.BASE_FAIR_PRICE * loc.priceMult / 10) * 10;
    S.addStory(state, 'Договор аренды подписан', loc.name + ': до ' + loc.slots + ' мест, аренда ' + CC.fmt.money(loc.rent) + ' в месяц.', 'rent');
    return { ok: true, msg: 'Помещение арендовано' };
  }
  function finishEquipment(state) {
    if (state.phase !== 'setup' || state.setupStep !== 3) return { ok: false, msg: 'Шаг недоступен' };
    if (CC.economy.seatsTotal(state) < 5) return { ok: false, msg: 'Нужно минимум 5 мест' };
    state.setupStep = 4;
    S.addStory(state, 'Зал оборудован', 'Мест: ' + CC.economy.seatsTotal(state) + '. Интернет: ' + D.internet[state.internet].name + '.', 'equip');
    return { ok: true, msg: 'Оборудование закуплено' };
  }
  function finishStaff(state) {
    if (state.phase !== 'setup' || state.setupStep !== 4) return { ok: false, msg: 'Шаг недоступен' };
    if (!(state.staff.admin > 0)) return { ok: false, msg: 'Нужен хотя бы один администратор' };
    state.setupStep = 5;
    S.addStory(state, 'Команда собрана', 'Фонд оплаты труда: ' + CC.fmt.money(CC.economy.wagesMonthly(state)) + ' в месяц.', 'staff');
    return { ok: true, msg: 'Команда собрана' };
  }
  function openClub(state) {
    if (state.phase !== 'setup' || state.setupStep !== 5) return { ok: false, msg: 'Шаг недоступен' };
    state.phase = 'running'; state.setupStep = 6;
    state.community = 12;
    state.pending = { marketing: state.pending.marketing, repairs: 0, fines: 0, capex: 0, other: 0, income: 0 };
    unlock(state, 'open');
    S.addStory(state, 'Клуб открыт!', 'Двери открыты, мониторы светятся. Теперь жмите «Следующий день» или включите автоигру. Следите за загрузкой зала: если гостей больше, чем мест, — поднимайте цену или расширяйтесь; если зал пустует — рекламируйтесь или снижайте цену. Первая цель — выручка 700 000 ₽.', 'open');
    S.addLog(state, 'Клуб открыт! Удачи!', 'good');
    return { ok: true, msg: 'Клуб открыт!' };
  }

  function goalValue(state, goal) {
    if (!goal) return 0;
    if (goal.metric === 'revenue') return state.stats.totalRevenue;
    return CC.economy.netCapital(state);
  }
  function currentGoal(state) { return D.goals[state.goalIndex] || null; }

  function unlock(state, id) {
    if (state.achievements[id]) return false;
    var a = S.byId(D.achievements, id); if (!a) return false;
    state.achievements[id] = state.day;
    S.addLog(state, 'Достижение: «' + a.name + '» — ' + a.desc, 'achievement');
    return true;
  }

  function check(state, report) {
    var goal = currentGoal(state);
    while (goal && goalValue(state, goal) >= goal.target) {
      state.goalIndex += 1;
      if (goal.bonusCash) { state.cash += goal.bonusCash; state.pending.income += goal.bonusCash; }
      if (goal.bonusRating) state.rating = U.clamp(state.rating + goal.bonusRating, 1, 5);
      S.addStory(state, 'Цель выполнена: ' + goal.title, 'Награда: ' + goal.reward + '.', goal.win ? 'win' : 'goal');
      S.addLog(state, 'Цель выполнена: ' + goal.title + '. ' + goal.reward, 'goal');
      if (goal.win) { state.won = true; unlock(state, 'win'); }
      goal = currentGoal(state);
    }
    var E = CC.economy, z = state.zones;
    if (report) {
      if (report.visitors >= 100) unlock(state, 'v100');
      if (report.visitors >= 300) unlock(state, 'v300');
      if (report.capacity > 0 && report.visitors >= report.capacity) unlock(state, 'full');
    }
    if (state.rating >= 4.5) unlock(state, 'r45');
    var seats = E.seatsTotal(state);
    if (seats >= 30) unlock(state, 'pc30');
    if (seats >= 60) unlock(state, 'pc60');
    if (state.stats.profitStreak >= 30) unlock(state, 'streak30');
    if (state.history.length >= 30) {
      var sum = state.history.slice(-30).reduce(function (a, h) { return a + h.revenue; }, 0);
      if (sum >= 1000000) unlock(state, 'month1m');
    }
    if (state.stats.inspectionsPassed > 0) unlock(state, 'inspect');
    if (state.stats.loansRepaid > 0) unlock(state, 'debtfree');
    if (z.office.n && z.gaming.n && z.top.n && z.console.n && z.vr.n) unlock(state, 'allzones');
    if (state.day >= 365) unlock(state, 'day365');
  }

  CC.quests = {
    steps: steps, chooseConcept: chooseConcept, chooseLegal: chooseLegal, chooseLocation: chooseLocation,
    finishEquipment: finishEquipment, finishStaff: finishStaff, openClub: openClub,
    currentGoal: currentGoal, goalValue: goalValue, check: check, unlock: unlock
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
