/* Случайные события и решения игрока. */
(function (g) {
  'use strict';
  var CC = g.CC = g.CC || {};
  var D = CC.data, S = CC.state, R = CC.rng, U = CC.util;
  var fm = function (v) { return CC.fmt.money(v); };

  function E() { return CC.economy; }
  function mod(state, kind, value, days, label) { state.modifiers.push({ kind: kind, value: value, daysLeft: days, label: label }); }
  function fine(state, amount) { E().pay(state, amount, 'fines'); }
  function workingZones(state) {
    return D.seats.filter(function (s) { var z = state.zones[s.id]; return z.n - z.broken > 0; });
  }

  var defs = [
    { id: 'cityTournament', w: 1.0, cd: 45, title: 'Турнир в городе',
      text: 'В городе проходит крупный киберспортивный турнир. Все хотят потренироваться — спрос +30% на 3 дня.',
      apply: function (st) { mod(st, 'demand', 1.3, 3, 'Турнир в городе'); return 'good'; } },
    { id: 'pcBreak', w: 1.4, cd: 12, title: 'Сгорел блок питания',
      when: function (st) { return workingZones(st).length > 0; },
      setup: function (st) {
        var s = R.pick(st.rng, workingZones(st));
        return { zone: s.id, cost: Math.round(s.cost * 0.15 * ((st.staff.tech || 0) ? 0.6 : 1.2)) };
      },
      text: function (st, data) {
        var s = S.byId(D.seats, data.zone);
        return 'В зоне «' + s.name + '» задымился компьютер. Можно заменить детали срочно (' + fm(data.cost) + ') или оставить место сломанным до планового ремонта.';
      },
      choices: [
        { id: 'fix', label: 'Срочно починить', cost: function (st, data) { return data.cost; },
          run: function (st, data) { E().pay(st, data.cost, 'repairs'); return 'Место снова работает.'; } },
        { id: 'wait', label: 'Оставить сломанным',
          run: function (st, data) { var z = st.zones[data.zone]; if (z && z.broken < z.n) z.broken += 1; return 'Одно место не работает до ремонта.'; } }
      ] },
    { id: 'rospotreb', w: 0.7, cd: 60, title: 'Проверка Роспотребнадзора',
      text: function (st) {
        return 'Пришли с проверкой санитарных норм. ' + ((st.staff.cleaner || 0) ? 'У вас есть уборщик — шансы хорошие.' : 'Уборщика в штате нет — инспектор хмурится.');
      },
      choices: [
        { id: 'asis', label: 'Встретить как есть',
          run: function (st) { return inspect(st, ((st.staff.cleaner || 0) ? 0.88 : 0.45), U.clamp(30000 + E().seatsTotal(st) * 1500, 30000, 120000), 'Роспотребнадзор'); } },
        { id: 'clean', label: 'Срочная генеральная уборка', cost: function () { return 25000; },
          run: function (st) { E().pay(st, 25000, 'other'); return inspect(st, ((st.staff.cleaner || 0) ? 0.98 : 0.8), 50000, 'Роспотребнадзор'); } }
      ] },
    { id: 'fireInspect', w: 0.6, cd: 90, title: 'Пожарная инспекция',
      text: function (st) {
        return st.upgrades.fire ? 'Инспектор проверил систему пожаротушения и остался доволен.' :
          'Пожарный инспектор нашёл, что в зале много техники и нет автоматического пожаротушения. Риск штрафа 150 000 ₽ и закрытия на 2 дня.';
      },
      apply: function (st) {
        if (!st.upgrades.fire) return null;
        st.stats.inspectionsPassed += 1; return 'good';
      },
      choices: [
        { id: 'install', label: 'Установить систему', cost: function () { var u = S.byId(D.upgrades, 'fire'); return u.cost; },
          run: function (st) { var u = S.byId(D.upgrades, 'fire'); E().pay(st, u.cost, 'capex'); st.upgrades.fire = true; st.stats.inspectionsPassed += 1; return 'Система установлена, проверка пройдена.'; } },
        { id: 'risk', label: 'Рискнуть',
          run: function (st) {
            if (R.chance(st.rng, 0.4)) { st.stats.inspectionsPassed += 1; return 'Повезло: инспектор ограничился предупреждением.'; }
            fine(st, 150000); mod(st, 'open', 0, 2, 'Закрыто пожарной инспекцией');
            return 'Штраф 150 000 ₽ и клуб закрыт на 2 дня.';
          } }
      ] },
    { id: 'blackout', w: 0.8, cd: 40, title: 'Отключение электричества',
      text: function (st) { return st.upgrades.generator ? 'В районе отключили свет, но генератор спас день: гости даже не заметили.' : 'В районе авария на подстанции. Завтра клуб почти весь день будет без света.'; },
      apply: function (st) {
        if (st.upgrades.generator) return 'good';
        mod(st, 'open', 0.25, 1, 'Отключение света'); st.rating = Math.max(1, st.rating - 0.05); return 'bad';
      } },
    { id: 'netDown', w: 0.7, cd: 30, title: 'Провайдер лежит',
      when: function (st) { return st.internet < 3; },
      text: 'У провайдера авария, интернет работает с перебоями. Завтра спрос упадёт вдвое. Резервный канал решил бы проблему.',
      apply: function (st) { mod(st, 'demand', 0.5, 1, 'Проблемы с интернетом'); return 'bad'; },
      weight: function (st) { return (D.internet[st.internet] || D.internet[0]).outageMult; } },
    { id: 'competitor', w: 0.5, cd: 120, title: 'Конкурент открыл клуб рядом',
      when: function (st) { return st.day > 30 && st.competitor > 0.85; },
      text: 'В двух кварталах открылся новый клуб с акциями на открытие. Часть гостей уйдёт попробовать (−18% спроса, со временем вернутся, быстрее при высоком рейтинге).',
      choices: [
        { id: 'promo', label: 'Ответная акция', cost: function () { return 60000; },
          run: function (st) { E().pay(st, 60000, 'marketing'); st.competitor = U.clamp(st.competitor * 0.9, 0.6, 1); mod(st, 'reach', 30, 21, 'Ответная акция'); return 'Акция смягчила удар.'; } },
        { id: 'ignore', label: 'Ничего не делать',
          run: function (st) { st.competitor = U.clamp(st.competitor * 0.82, 0.6, 1); return 'Часть гостей ушла к конкурентам.'; } }
      ] },
    { id: 'viral', w: 0.6, cd: 50, title: 'Вирусный пост',
      weight: function (st) { return (st.staff.smm || 0) ? 2 : 1; },
      when: function (st) { return st.rating >= 3.6; },
      text: 'Ролик гостя о вашем клубе набрал сотни тысяч просмотров! Охват +50 на 10 дней, сообщество растёт.',
      apply: function (st) { mod(st, 'reach', 50, 10, 'Вирусный пост'); st.community += 30; return 'good'; } },
    { id: 'tariff', w: 0.4, cd: 150, title: 'Тарифы на электричество выросли',
      when: function (st) { return st.tariffMult === 1; },
      text: 'Энергосбыт поднял тариф для бизнеса на 25% на два месяца.',
      apply: function (st) { st.tariffMult = 1.25; mod(st, 'tariff', 1, 60, 'Высокий тариф'); return 'bad'; } },
    { id: 'review', w: 0.6, cd: 35, title: 'Скандал в отзывах',
      text: 'Гость написал гневный отзыв: «Мышка не работала, а администратор нагрубил». Отзыв набирает лайки.',
      choices: [
        { id: 'sorry', label: 'Извиниться и подарить часы', cost: function () { return 8000; },
          run: function (st) { E().pay(st, 8000, 'marketing'); st.rating = Math.max(1, st.rating - 0.03); return 'Гость сменил гнев на милость.'; } },
        { id: 'ignore', label: 'Проигнорировать',
          run: function (st) { st.rating = Math.max(1, st.rating - 0.25); return 'Рейтинг просел.'; } }
      ] },
    { id: 'sponsor', w: 0.5, cd: 90, title: 'Предложение спонсора',
      when: function (st) { return st.rating >= 4 && (st.zones.top.n + st.zones.gaming.n) >= 12; },
      text: 'Бренд игровой периферии предлагает провести у вас турнир: заплатит 150 000 ₽, но на 2 дня часть зала будет занята (−30% мест).',
      choices: [
        { id: 'accept', label: 'Согласиться (+150 000 ₽)',
          run: function (st) { st.cash += 150000; st.pending.income += 150000; mod(st, 'open', 0.7, 2, 'Спонсорский турнир'); mod(st, 'reach', 40, 10, 'Спонсорский турнир'); st.community += 15; return 'Турнир прошёл громко.'; } },
        { id: 'decline', label: 'Отказаться', run: function () { return 'Спонсор ушёл к конкурентам.'; } }
      ] },
    { id: 'theft', w: 0.5, cd: 40, title: 'Кража периферии',
      weight: function (st) { return st.upgrades.cctv ? 0.1 : 1; },
      text: 'Кто-то унёс игровую гарнитуру и пару мышек. Видеонаблюдение помогло бы.',
      apply: function (st) { fine(st, 25000); return 'bad'; } },
    { id: 'streamer', w: 0.4, cd: 80, title: 'В клуб зашёл стример',
      when: function (st) { return st.rating >= 4.2; },
      text: 'Популярный стример провёл трансляцию из вашего клуба и хвалил атмосферу. Рейтинг и сообщество растут.',
      apply: function (st) { st.rating = Math.min(5, st.rating + 0.15); st.community += 25; return 'good'; } },
    { id: 'hwSale', w: 0.4, cd: 90, title: 'Распродажа у поставщика',
      text: 'Поставщик распродаёт склад: всё оборудование на 20% дешевле в течение 7 дней.',
      apply: function (st) { mod(st, 'discount', 0.8, 7, 'Скидка на оборудование'); return 'good'; } },
    { id: 'fight', w: 0.4, cd: 60, title: 'Конфликт в зале',
      when: function (st) { return st.lastReport && st.lastReport.util > 0.85; },
      text: function (st) { return 'Два игрока не поделили место. ' + (st.staff.admin >= 2 ? 'Администраторы быстро всё уладили.' : 'Одному администратору было тяжело, гости недовольны.'); },
      apply: function (st) { if (st.staff.admin >= 2) return 'info'; st.rating = Math.max(1, st.rating - 0.15); return 'bad'; } }
  ];

  function inspect(st, passP, fineAmount, who) {
    if (R.chance(st.rng, passP)) { st.stats.inspectionsPassed += 1; return 'Проверка пройдена без замечаний!'; }
    fine(st, fineAmount); st.rating = Math.max(1, st.rating - 0.1);
    return who + ': штраф ' + fm(fineAmount) + '.';
  }
  function txt(def, st, data) { return typeof def.text === 'function' ? def.text(st, data) : def.text; }

  function trigger(state, def) {
    var data = def.setup ? def.setup(state) : {};
    state.cooldowns[def.id] = state.day + def.cd;
    var auto = def.apply ? def.apply(state, data) : null;
    if (def.choices && !auto) {
      state.pendingEvent = {
        id: def.id, title: def.title, text: txt(def, state, data), data: data,
        choices: def.choices.map(function (c) { return { id: c.id, label: c.label, cost: c.cost ? c.cost(state, data) : 0 }; })
      };
      return state.pendingEvent;
    }
    var text = txt(def, state, data);
    S.addLog(state, def.title + ': ' + text, auto || 'info');
    S.addStory(state, def.title, text, 'event');
    return { id: def.id, title: def.title, text: text, auto: true };
  }

  function roll(state) {
    if (state.pendingEvent || state.phase !== 'running' || state.day < 4) return null;
    if (!R.chance(state.rng, 0.09)) return null;
    var items = defs.filter(function (d) {
      return (state.cooldowns[d.id] || 0) <= state.day && (!d.when || d.when(state));
    }).map(function (d) { return { w: d.w * (d.weight ? d.weight(state) : 1), v: d }; });
    var def = R.weighted(state.rng, items);
    return def ? trigger(state, def) : null;
  }

  function resolve(state, choiceId) {
    var ev = state.pendingEvent;
    if (!ev) return { ok: false, msg: 'Нет активного события' };
    var def = S.byId(defs, ev.id);
    var choice = def && def.choices ? S.byId(def.choices, choiceId) : null;
    if (!choice) return { ok: false, msg: 'Неизвестный вариант' };
    var cost = choice.cost ? choice.cost(state, ev.data || {}) : 0;
    if (cost > 0 && state.cash < cost) return { ok: false, msg: 'Недостаточно денег: нужно ' + fm(cost) };
    var res = choice.run(state, ev.data || {});
    state.pendingEvent = null;
    S.addLog(state, ev.title + ' — ' + choice.label + ': ' + res, 'info');
    S.addStory(state, ev.title, ev.text + ' Решение: «' + choice.label + '». ' + res, 'event');
    return { ok: true, msg: res };
  }

  // Безопасный «выбор по умолчанию» для автотестов и стратегий
  function autoResolve(state, prefer) {
    var ev = state.pendingEvent; if (!ev) return null;
    var choices = ev.choices.slice();
    var pick = null;
    if (prefer === 'cheap') pick = choices.filter(function (c) { return !c.cost; })[0];
    if (!pick) pick = choices.filter(function (c) { return !c.cost || c.cost <= state.cash; })[0] || choices[choices.length - 1];
    return resolve(state, pick.id);
  }

  CC.events = { defs: defs, roll: roll, resolve: resolve, trigger: trigger, autoResolve: autoResolve };
})(typeof globalThis !== 'undefined' ? globalThis : this);
