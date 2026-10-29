/* Экраны игры: Обзор (сюжет и отчёт), Зал, Персонал, Маркетинг, Финансы, модальные окна. */
(function (g) {
  'use strict';
  const CC = g.CC = g.CC || {};
  const D = CC.data, F = CC.fmt, UI = CC.ui, h = UI.h, s = UI.s, icon = UI.icon, btn = UI.btn, kv = UI.kv;
  const E = function () { return CC.economy; };
  const Q = function () { return CC.quests; };
  const byId = CC.state.byId;
  const act = function (fn, sound) { return CC.app.act(fn, sound); };
  const st = function () { return CC.app.state; };
  // Черновики ползунков сохраняются между перерисовками
  const drafts = { price: null, loans: {} };

  /* ---------- Окупаемость: прогноз прибыли «до» и «после» на облегчённой копии ---------- */
  function lite(state) {
    const c = Object.assign({}, state);
    c.zones = JSON.parse(JSON.stringify(state.zones));
    c.staff = Object.assign({}, state.staff);
    c.upgrades = Object.assign({}, state.upgrades);
    c.campaigns = state.campaigns.slice();
    c.modifiers = state.modifiers.slice();
    c.history = []; c.log = []; c.story = [];
    return c;
  }
  function delta(state, mut) {
    const base = E().forecast(state).profit;
    const c = lite(state); mut(c);
    return E().forecast(c).profit - base;
  }
  function payback(cost, d, protective) {
    if (d > 50) return h('div', { class: 'muted good' }, '≈ +' + F.money(d) + ' в день · окупится примерно за ' + F.num(Math.max(1, Math.ceil(cost / d))) + ' ' + F.plural(Math.ceil(cost / d), 'день', 'дня', 'дней'));
    if (protective) return h('div', { class: 'muted' }, protective);
    return h('div', { class: 'muted' }, 'Сейчас прибыль почти не вырастет — проверьте, хватает ли гостей и персонала.');
  }

  function card(title, iconName, kids, cls) {
    return h('section', { class: 'card' + (cls ? ' ' + cls : '') }, [title ? h('h2', null, [iconName ? icon(iconName) : null, title]) : null, kids]);
  }
  function stepper(label, value, onMinus, onPlus, opts) {
    opts = opts || {};
    return h('div', { class: 'stepper', role: 'group', 'aria-label': label }, [
      btn('', onMinus, { icon: 'minus', cls: 'small', aria: 'Уменьшить: ' + label, disabled: opts.minusDisabled, key: opts.key ? opts.key + '-m' : null, title: opts.minusTitle }),
      h('span', { class: 'val', 'aria-live': 'polite' }, String(value)),
      btn('', onPlus, { icon: 'plus', cls: 'small', aria: 'Увеличить: ' + label, disabled: opts.plusDisabled, key: opts.key ? opts.key + '-p' : null, title: opts.plusTitle })
    ]);
  }
  function opt(title, cost, desc, onclick, o) {
    o = o || {};
    return h('button', { type: 'button', class: 'opt', onclick: onclick, disabled: !!o.disabled, key: o.key, 'aria-pressed': o.pressed === undefined ? null : String(!!o.pressed) }, [
      h('div', { class: 'oh' }, [h('span', null, title), cost !== null && cost !== undefined ? h('span', { class: 'oc' }, cost) : null]),
      o.facts ? h('div', { class: 'facts' }, o.facts.map(function (f) { return h('span', null, f); })) : null,
      desc ? h('div', { class: 'od' }, desc) : null,
      o.extra || null
    ]);
  }

  /* ================= ОБЗОР ================= */
  const STEP_ICONS = ['plan', 'legal', 'rent', 'equip', 'staff', 'marketing'];

  function setupView(state, root) {
    const steps = Q().steps, idx = state.setupStep;
    const chips = h('div', { class: 'step-done', 'aria-label': 'Этапы открытия' });
    steps.forEach(function (sp, i) {
      chips.appendChild(h('span', { class: 'chip' + (i < idx ? ' on' : ''), 'aria-current': i === idx ? 'step' : null }, [i < idx ? icon('check') : h('b', null, String(i + 1)), sp.id === 'plan' ? 'План' : sp.id === 'legal' ? 'Регистрация' : sp.id === 'rent' ? 'Аренда' : sp.id === 'equip' ? 'Железо' : sp.id === 'staff' ? 'Команда' : 'Реклама']));
    });
    root.appendChild(chips);
    const step = steps[idx];
    if (!step) return;
    const body = h('div', null);
    root.appendChild(h('section', { class: 'card hl step', 'aria-labelledby': 'step-title' }, [
      h('div', { class: 'badge', 'aria-label': 'Шаг ' + (idx + 1) }, String(idx + 1)),
      h('div', { class: 'row', style: 'margin-bottom:8px' }, [h('span', { class: 'sicon' }, icon(STEP_ICONS[idx])), h('h2', { id: 'step-title', style: 'margin:0' }, step.title)]),
      h('p', null, step.text),
      CC.art(step.art),
      body
    ]));
    body.appendChild(h('div', { class: 'kv total' }, [h('span', null, 'Осталось денег'), h('b', { class: state.cash < 0 ? 'bad' : '' }, F.money(state.cash))]));
    const opts = h('div', { class: 'options' });
    body.appendChild(opts);
    if (step.kind === 'concept') {
      D.concepts.forEach(function (c) { opts.appendChild(opt(c.name, null, c.desc, function () { act(function () { return Q().chooseConcept(st(), c.id); }, 'ok'); }, { key: 'c-' + c.id, facts: [c.short] })); });
    } else if (step.kind === 'legal') {
      D.legal.forEach(function (l) { opts.appendChild(opt(l.name, F.money(l.regCost), l.desc, function () { act(function () { return Q().chooseLegal(st(), l.id); }, 'ok'); }, { key: 'l-' + l.id, facts: [l.taxName, 'Бухгалтерия ' + F.money(l.accountingMonthly) + '/мес'] })); });
    } else if (step.kind === 'location') {
      D.locations.forEach(function (l) {
        opts.appendChild(opt(l.name, F.money(l.rent) + '/мес', l.desc, function () { act(function () { return Q().chooseLocation(st(), l.id); }, 'ok'); },
          { key: 'loc-' + l.id, disabled: state.cash < l.rent, facts: ['до ' + l.slots + ' мест', 'поток ~' + l.traffic + ' чел./день', 'цены ×' + F.num1(l.priceMult).replace(',0', '')] }));
      });
    } else if (step.kind === 'equipment') {
      body.removeChild(opts);
      body.appendChild(seatsBlock(state, true));
      body.appendChild(h('h3', { style: 'margin-top:14px' }, [icon('sofa'), 'Мебель и интерьер']));
      body.appendChild(furnitureBlock(state, true));
      body.appendChild(h('h3', { style: 'margin-top:14px' }, [icon('wifi'), 'Интернет']));
      body.appendChild(internetBlock(state, true));
      const fixed = E().rentMonthly(state) + E().wagesMonthly(state) + D.internet[state.internet].monthly;
      body.appendChild(h('p', { class: 'muted' }, 'Совет: оставьте запас хотя бы на 1–2 месяца аренды и зарплат — первые недели гостей будет немного. Аренда и интернет: ' + F.money(fixed) + ' в месяц.'));
      body.appendChild(h('div', { class: 'btn-row' }, btn('Оборудование готово', function () { act(function () { return Q().finishEquipment(st()); }, 'ok'); }, { cls: 'primary block', icon: 'check', key: 'finish-equip', disabled: E().seatsTotal(state) < 5 })));
      if (E().seatsTotal(state) < 5) body.appendChild(h('p', { class: 'muted' }, 'Нужно минимум 5 мест.'));
    } else if (step.kind === 'staff') {
      body.removeChild(opts);
      body.appendChild(staffBlock(state, true));
      body.appendChild(h('div', { class: 'btn-row' }, btn('Команда собрана', function () { act(function () { return Q().finishStaff(st()); }, 'ok'); }, { cls: 'primary block', icon: 'check', key: 'finish-staff', disabled: !(state.staff.admin > 0) })));
    } else if (step.kind === 'marketing') {
      body.removeChild(opts);
      body.appendChild(campaignsBlock(state, true));
      body.appendChild(h('div', { class: 'btn-row' }, btn('Открыть клуб!', function () { act(function () { return Q().openClub(st()); }, 'win'); }, { cls: 'primary block', icon: 'play', key: 'open-club' })));
    }
    storyFeed(state, root, 'Что уже сделано');
  }

  function storyFeed(state, root, title, limit) {
    const items = state.story.slice(0, limit || 30);
    if (!items.length) return;
    root.appendChild(h('div', { class: 'section-title' }, title));
    items.forEach(function (it, i) {
      root.appendChild(h('article', { class: 'card step' }, [
        h('div', { class: 'badge', 'aria-hidden': 'true' }, String(items.length - i)),
        h('h3', null, it.title),
        h('div', { class: 'muted' }, it.day > 0 ? 'День ' + F.num(it.day) : 'До открытия'),
        h('p', null, it.text),
        i === 0 && state.phase !== 'setup' ? CC.art(it.art) : null
      ]));
    });
  }

  function hints(state) {
    const d = E().derive(state), r = state.lastReport, out = [];
    if (state.negDays > 0) out.push(['bad', 'Счёт в минусе ' + state.negDays + ' ' + F.plural(state.negDays, 'день', 'дня', 'дней') + ' из 21 допустимых. Сократите расходы, поднимите выручку или возьмите кредит в «Финансах».']);
    if (d.adminFactor < 1 && d.working > 0) out.push(['bad', 'Администраторов не хватает: работает только ' + F.pct(d.adminFactor) + ' зала. Наймите ещё в «Персонале».']);
    if (!d.internetOk) out.push(['bad', 'Интернет не тянет столько мест — рейтинг падает. Смените тариф в «Зале».']);
    if (d.working < d.seats) out.push(['bad', 'Сломано мест: ' + (d.seats - d.working) + '. Отремонтируйте их в «Зале».']);
    else if (d.cond < 60 && d.seats) out.push(['warn', 'Состояние техники ' + F.num(d.cond) + '%: гости это замечают. Пора на плановый ремонт.']);
    if (r && r.demand > 0) {
      if (r.turned > Math.max(5, r.visitors * 0.15)) out.push(['warn', 'Вчера ' + F.num(r.turned) + ' ' + F.plural(r.turned, 'гость ушёл', 'гостя ушли', 'гостей ушли') + ' без места. Поднимите цену или добавьте мест.']);
      else if (r.util < 0.45 && state.day > 5) out.push(['warn', 'Зал загружен лишь на ' + F.pct(r.util) + '. Запустите рекламу или снизьте цену.']);
    }
    if (d.price > d.fairPrice * 1.3) out.push(['warn', 'Цена заметно выше справедливой (' + F.money(d.fairPrice) + ') — рейтинг будет снижаться.']);
    return out;
  }

  function reportCard(state) {
    const r = state.lastReport;
    if (!r) return card('Первый день', 'calendar', h('p', null, 'Нажмите «Следующий день» или включите автоигру (1×, 2×, 4×). Отчёт о дне появится здесь.'));
    const c = r.costs;
    return card('Итоги дня ' + F.num(r.day + 1), 'chart', [
      h('div', { class: 'grid2' }, [
        metric('Гостей', F.num(r.visitors) + ' / ' + F.num(r.capacity)),
        metric('Загрузка зала', F.pct(r.util)),
        metric('Выручка', F.money(r.revenue + r.otherIncome)),
        metric('Прибыль', F.money(r.profit), r.profit < 0 ? 'bad' : 'good')
      ]),
      r.turned >= 1 ? h('p', { class: 'muted' }, 'Не хватило мест: ' + F.num(r.turned) + ' гостей.') : null,
      r.season ? h('p', { class: 'muted' }, 'Сезон: ' + r.season + '.') : null,
      h('details', null, [h('summary', null, 'Расходы дня: ' + F.money(r.expenses)),
        kv('Аренда', F.money(c.rent)), kv('Зарплаты', F.money(c.wages)), kv('Электричество', F.money(c.power)), kv('Интернет', F.money(c.internet)),
        kv('Бухгалтерия', F.money(c.accounting)), c.bar ? kv('Закупка для бара', F.money(c.bar)) : null, kv('Налог', F.money(c.tax)),
        c.interest ? kv('Проценты', F.money(c.interest)) : null, c.marketing ? kv('Реклама', F.money(c.marketing)) : null,
        c.repairs ? kv('Ремонт', F.money(c.repairs)) : null, c.fines ? kv('Штрафы', F.money(c.fines)) : null, c.other ? kv('Прочее', F.money(c.other)) : null,
        r.capex ? kv('Вложения в оборудование (не в расходах)', F.money(r.capex)) : null])
    ]);
  }
  function metric(label, value, cls) { return h('div', { class: 'metric' }, [h('div', { class: 'mv' + (cls ? ' ' + cls : '') }, value), h('div', { class: 'ml' }, label)]); }

  function eventBody(state, close) {
    const ev = state.pendingEvent;
    return h('div', null, [
      CC.art('event'),
      h('p', null, ev.text),
      h('div', { class: 'options' }, ev.choices.map(function (c) {
        return opt(c.label, c.cost ? F.money(c.cost) : 'бесплатно', c.cost > state.cash ? 'Не хватает денег' : null, function () {
          const res = act(function () { return CC.events.resolve(st(), c.id); }, 'ok');
          if (res && res.ok && close) close();
        }, { disabled: c.cost > state.cash, key: 'ev-' + c.id });
      }))
    ]);
  }
  function eventModal() {
    const state = st();
    if (!state.pendingEvent || UI.hasModal('event')) return;
    UI.openModal({ kind: 'event', title: state.pendingEvent.title, icon: 'event', body: function (close) { return eventBody(state, close); } });
  }

  function overview(state, root) {
    if (state.phase === 'setup') return setupView(state, root);
    if (state.gameOver) {
      root.appendChild(h('section', { class: 'banner', role: 'alert' }, [h('h2', null, 'Банкротство'), h('p', null, state.gameOver.reason + '. Клуб проработал ' + F.num(state.gameOver.day) + ' ' + F.plural(state.gameOver.day, 'день', 'дня', 'дней') + '.'), CC.art('bankrupt'),
        h('div', { class: 'btn-row' }, btn('Новая игра', function () { CC.app.askNewGame(); }, { cls: 'primary', icon: 'refresh', key: 'go-new' }))]));
    } else if (state.won) {
      root.appendChild(h('section', { class: 'banner' }, [h('h2', null, 'Победа!'), h('p', null, 'Вы построили лучший компьютерный клуб города. Можно продолжать играть и ставить рекорды.')]));
    }
    if (state.pendingEvent) {
      root.appendChild(h('section', { class: 'card hl step' }, [h('div', { class: 'badge' }, '!'), h('h2', null, [icon('event'), state.pendingEvent.title]), eventBody(state, null)]));
    }
    const hs = hints(state);
    if (hs.length && !state.gameOver) {
      root.appendChild(card('Советы управляющего', 'warn', h('ul', { class: 'log' }, hs.map(function (x) { return h('li', { class: x[0] === 'bad' ? 'bad' : 'goal' }, x[1]); }))));
    }
    root.appendChild(reportCard(state));
    storyFeed(state, root, 'История клуба', 4);
    root.appendChild(h('div', { class: 'section-title' }, 'Журнал'));
    root.appendChild(card(null, null, h('ul', { class: 'log' }, state.log.slice(0, 25).map(function (l) {
      return h('li', { class: l.kind }, [h('div', { class: 'ld' }, 'День ' + F.num(l.day + 1)), l.text]);
    }))));
  }

  /* ================= ЗАЛ ================= */
  function seatsBlock(state, setup) {
    const wrap = h('div', null);
    const used = E().slotsUsed(state), max = E().slotsMax(state);
    wrap.appendChild(h('div', { class: 'kv' }, [h('span', null, 'Занято площади'), h('b', null, used + ' из ' + max + ' мест')]));
    wrap.appendChild(UI.minibar(max ? used / max : 0, '', 'Занято площади'));
    D.seats.forEach(function (sd) {
      const z = state.zones[sd.id];
      const unlocked = E().isUnlocked(state, sd);
      const price = E().seatPrice(state, sd.id);
      const canBuy = unlocked && state.cash >= price && used + sd.slots <= max;
      const sellV = z.n ? E().sellValue(state, sd.id, 1) : 0;
      const item = h('div', { class: 'item' + (unlocked ? '' : ' locked') }, [
        h('div', { class: 'ihead' }, [
          h('div', { class: 'iico' }, icon(unlocked ? sd.id : 'lock')),
          h('div', { class: 'grow', style: 'min-width:0' }, [h('div', { class: 'iname' }, sd.name), h('div', { class: 'isub' }, F.money(price) + ' за ' + sd.unit + (sd.slots > 1 ? ' · занимает ' + sd.slots + ' места' : '') + ' · час ×' + String(sd.mult).replace('.', ','))]),
          unlocked ? stepper(sd.name, z.n, function () { act(function () { return E().sellSeats(st(), sd.id, 1); }, 'ok'); }, function () { act(function () { return E().buySeats(st(), sd.id, 1); }, 'coin'); },
            { key: 'seat-' + sd.id, minusDisabled: !z.n, plusDisabled: !canBuy, minusTitle: z.n ? (setup ? 'Отменить покупку' : 'Продать за ' + F.money(sellV)) : null }) : null
        ]),
        h('p', { class: 'muted', style: 'margin:8px 0 0' }, unlocked ? sd.desc : 'Откроется после цели №' + sd.unlockGoal + ' (' + D.goals[sd.unlockGoal - 1].title + ').')
      ]);
      if (unlocked && !setup && z.n) {
        const rc = E().repairCost(state, sd.id);
        item.appendChild(h('div', { class: 'row', style: 'margin-top:8px;flex-wrap:wrap' }, [
          h('div', { class: 'grow', style: 'min-width:140px' }, [h('div', { class: 'isub' }, 'Состояние ' + F.num(z.cond) + '%' + (z.broken ? ' · сломано ' + z.broken : '')), UI.minibar(z.cond / 100, UI.condClass(z.cond), 'Состояние: ' + sd.name)]),
          btn(rc > 0 ? 'Ремонт ' + F.money(rc) : 'Исправно', function () { act(function () { return E().repairZone(st(), sd.id); }, 'ok'); }, { cls: 'small', icon: 'wrench', disabled: rc <= 0 || state.cash < rc, key: 'rep-' + sd.id })
        ]));
      }
      if (unlocked && !setup && canBuy) item.appendChild(payback(price, delta(state, function (c) { c.zones[sd.id].n += 1; })));
      if (!setup && z.n) item.appendChild(h('div', { class: 'muted' }, 'Продать одно: ' + F.money(sellV)));
      wrap.appendChild(item);
    });
    return wrap;
  }
  function furnitureBlock(state, setup) {
    return h('div', { class: 'options' }, D.furniture.map(function (f) {
      const owned = state.furniture >= f.id;
      return opt(f.name, owned ? (state.furniture === f.id ? 'установлено' : '—') : F.money(f.cost), f.bonus ? '+' + Math.round(f.bonus * 100) + '% к привлекательности, выше справедливая цена и рейтинг.' : 'Базовый вариант.',
        function () { act(function () { return E().setFurniture(st(), f.id); }, 'coin'); },
        { disabled: owned || state.cash < f.cost, pressed: state.furniture === f.id, key: 'furn-' + f.id,
          extra: !owned && !setup && state.cash >= f.cost ? payback(f.cost, delta(state, function (c) { c.furniture = f.id; })) : null });
    }));
  }
  function internetBlock(state, setup) {
    const used = E().slotsUsed(state);
    return h('div', { class: 'options' }, D.internet.map(function (t) {
      const cur = state.internet === t.id;
      const cost = setup ? 0 : D.INTERNET_SWITCH_COST;
      return opt(t.name, F.money(t.monthly) + '/мес', 'Тянет до ' + t.capacity + ' мест' + (t.outageMult < 1 ? ', реже падает' : '') + (used > t.capacity ? ' — вам не хватит!' : '') + (cur ? '' : cost ? '. Переключение: ' + F.money(cost) : ''),
        function () { act(function () { return E().setInternet(st(), t.id); }, 'ok'); }, { pressed: cur, disabled: cur || state.cash < cost, key: 'net-' + t.id });
    }));
  }
  function hall(state, root) {
    const d = E().derive(state);
    const all = E().repairAllCost(state);
    root.appendChild(card('Состояние зала', 'hall', [
      h('div', { class: 'grid2' }, [metric('Работает мест', d.working + ' / ' + d.seats), metric('Состояние техники', F.num(d.cond) + '%'), metric('Гостей в день макс.', F.num(d.capacity)), metric('Площадь', d.slotsUsed + ' / ' + d.slotsMax)]),
      h('p', { class: 'muted' }, 'Техника изнашивается от загрузки. Ниже 40% — резко растёт шанс поломок. Техники в штате замедляют износ и удешевляют ремонт.'),
      h('div', { class: 'btn-row' }, btn(all > 0 ? 'Отремонтировать всё за ' + F.money(all) : 'Всё исправно', function () { act(function () { return E().repairAll(st()); }, 'ok'); }, { icon: 'wrench', cls: 'dark', disabled: all <= 0 || state.cash < all, key: 'rep-all' }))
    ]));
    root.appendChild(card('Оборудование', 'equip', seatsBlock(state, false)));
    root.appendChild(card('Мебель и интерьер', 'sofa', furnitureBlock(state, false)));
    root.appendChild(card('Интернет', 'wifi', internetBlock(state, false)));
    root.appendChild(card('Улучшения', 'bolt', h('div', { class: 'options' }, D.upgrades.map(function (u) {
      const has = !!state.upgrades[u.id];
      const locked = u.needGoal && state.goalIndex < u.needGoal;
      const prot = { generator: 'Защита от отключений света: клуб не теряет дни.', fire: 'Пожарные проверки — без штрафов и закрытий.', cctv: 'Защищает от краж и вандализма.' }[u.id];
      return opt(u.name, has ? 'есть' : F.money(u.cost), locked ? 'Откроется после цели №' + u.needGoal + '.' : u.desc, function () { act(function () { return E().buyUpgrade(st(), u.id); }, 'coin'); },
        { disabled: has || locked || state.cash < u.cost, pressed: has, key: 'up-' + u.id,
          extra: !has && !locked ? payback(u.cost, delta(state, function (c) { c.upgrades[u.id] = true; }), prot || (u.id === 'stream' ? 'Растит сообщество каждый день — эффект накапливается.' : null)) : null });
    }))));
    // Помещение
    const loc = byId(D.locations, state.location);
    const exp = D.expansion[state.expanded];
    const prem = [kv('Сейчас', loc.name), kv('Аренда', F.money(E().rentMonthly(state)) + '/мес'), kv('Вместимость', E().slotsMax(state) + ' мест')];
    if (exp) {
      const locked = state.goalIndex < exp.needGoal;
      prem.push(opt('Расширить помещение', F.money(exp.cost), locked ? 'Откроется после цели №' + exp.needGoal + '.' : 'Вместимость ' + Math.round(loc.slots * exp.slotMult) + ' мест, аренда станет ' + F.money(loc.rent * exp.rentMult) + '/мес.',
        function () { act(function () { return E().expand(st()); }, 'coin'); }, { disabled: locked || state.cash < exp.cost, key: 'expand' }));
    }
    prem.push(h('h3', { style: 'margin-top:12px' }, 'Переезд'));
    prem.push(h('p', { class: 'muted' }, 'Переезд: залог за новое помещение + 250 000 ₽ на монтаж, 2 дня без работы, половина сообщества теряется. Расширение не переносится.'));
    prem.push(h('div', { class: 'options' }, D.locations.filter(function (l) { return l.id !== state.location; }).map(function (l) {
      const cost = E().relocateCost(state, l.id);
      const fits = E().slotsUsed(state) <= l.slots;
      return opt(l.name, F.money(cost), fits ? l.desc : 'Не поместится: у вас ' + E().slotsUsed(state) + ' мест, здесь — ' + l.slots + '.',
        function () { UI.confirmModal('Переехать?', 'Переезд в «' + l.name + '» стоит ' + F.money(cost) + ' и займёт 2 дня.', 'Переехать', function () { act(function () { return E().relocate(st(), l.id); }, 'coin'); }); },
        { disabled: !fits || state.cash < cost, key: 'reloc-' + l.id, facts: ['до ' + l.slots + ' мест', 'поток ~' + l.traffic, 'аренда ' + F.money(l.rent)] });
    })));
    root.appendChild(card('Помещение', 'rent', prem));
  }

  /* ================= ПЕРСОНАЛ ================= */
  function staffBlock(state, setup) {
    const d = E().derive(state);
    const need = {
      admin: Math.ceil(d.seats / 14) || 1,
      tech: Math.ceil(d.slotsUsed / 40) || 0,
      cleaner: Math.ceil(d.slotsUsed / 30) || 0,
      smm: 0
    };
    const wrap = h('div', null);
    D.staff.forEach(function (sd) {
      const n = state.staff[sd.id] || 0;
      const sev = setup ? 0 : Math.round(sd.wage * 0.5);
      let note = null;
      if (sd.id === 'admin') note = n < need.admin ? 'Для ' + d.seats + ' мест нужно администраторов: ' + need.admin + '.' : 'Администраторов достаточно.';
      if (sd.id === 'tech' && need.tech) note = 'Полное покрытие зала: ' + need.tech + ' чел. Сейчас ' + F.pct(d.techCov) + '.';
      if (sd.id === 'cleaner' && need.cleaner) note = 'Полное покрытие зала: ' + need.cleaner + ' чел. Сейчас ' + F.pct(d.cleanCov) + '.';
      wrap.appendChild(h('div', { class: 'item' }, [
        h('div', { class: 'ihead' }, [
          h('div', { class: 'iico' }, icon(sd.id)),
          h('div', { class: 'grow', style: 'min-width:0' }, [h('div', { class: 'iname' }, sd.name), h('div', { class: 'isub' }, F.money(sd.wage) + ' в месяц · до ' + sd.max)]),
          stepper(sd.name, n,
            function () {
              if (sev) UI.confirmModal('Уволить?', 'Сотруднику положено выходное пособие ' + F.money(sev) + '.', 'Уволить', function () { act(function () { return E().fire(st(), sd.id); }, 'ok'); });
              else act(function () { return E().fire(st(), sd.id); }, 'ok');
            },
            function () { act(function () { return E().hire(st(), sd.id); }, 'ok'); },
            { key: 'staff-' + sd.id, minusDisabled: !n, plusDisabled: n >= sd.max })
        ]),
        h('p', { class: 'muted', style: 'margin:8px 0 0' }, sd.desc),
        note ? h('div', { class: 'isub', style: 'font-weight:700' }, note) : null,
        !setup && n < sd.max ? payback(sd.wage, delta(state, function (c) { c.staff[sd.id] = n + 1; }) * 30, sd.id === 'tech' ? 'Окупается через медленный износ, меньше поломок и дешёвый ремонт.' : sd.id === 'cleaner' ? 'Окупается через рейтинг и проверки.' : sd.id === 'smm' ? 'Усиливает рекламу и сарафанное радио.' : null) : null
      ]));
    });
    wrap.appendChild(h('div', { class: 'kv total' }, [h('span', null, 'Фонд оплаты труда'), h('b', null, F.money(E().wagesMonthly(state)) + '/мес')]));
    return wrap;
  }
  function staff(state, root) {
    root.appendChild(card('Команда', 'staff', [h('p', { class: 'muted' }, 'Зарплата начисляется каждый день (1/30 месячной). При увольнении после открытия — выходное пособие в полмесяца.'), staffBlock(state, false)]));
  }

  /* ================= МАРКЕТИНГ ================= */
  function campaignsBlock(state, setup) {
    return h('div', { class: 'options' }, D.campaigns.map(function (c) {
      const active = state.campaigns.filter(function (x) { return x.id === c.id; })[0];
      let extra = null;
      if (!setup && !active && c.reach) {
        const dl = delta(state, function (x) { x.campaigns = x.campaigns.concat([{ id: c.id, daysLeft: c.days }]); });
        extra = h('div', { class: 'muted ' + (dl * c.days > c.cost ? 'good' : '') }, 'Прогноз: ≈ ' + (dl >= 0 ? '+' : '') + F.money(dl) + ' прибыли в день, за ' + c.days + ' дн. — ' + F.money(dl * c.days) + (c.community ? ' + рост сообщества' : ''));
      }
      return opt(c.name, active ? 'идёт, ещё ' + active.daysLeft + ' дн.' : F.money(c.cost), c.desc + ' Длительность: ' + c.days + ' дн.' + (c.reach ? ' Охват +' + c.reach + '.' : ''),
        function () { act(function () { return E().startCampaign(st(), c.id); }, 'coin'); }, { disabled: !!active || state.cash < c.cost, pressed: !!active, key: 'camp-' + c.id, extra: extra });
    }));
  }
  function marketing(state, root) {
    const d = E().derive(state), fc = E().forecast(state);
    root.appendChild(card('Аудитория', 'reach', [
      h('div', { class: 'kv' }, [h('span', null, 'Рейтинг'), h('b', null, [UI.stars(state.rating), ' ', F.num1(state.rating)])]),
      state.lastReport ? kv('Куда движется рейтинг', F.num1(state.lastReport.ratingTarget) + (state.lastReport.ratingTarget > state.rating + 0.05 ? ' ↑' : state.lastReport.ratingTarget < state.rating - 0.05 ? ' ↓' : '')) : null,
      kv('Поток у помещения', F.num(d.loc.traffic) + ' чел.'), kv('Сообщество', F.num(state.community) + ' чел.'), kv('Реклама', '+' + F.num(d.campaignReach) + ' чел.'),
      kv('Охват в день', F.num(d.reach) + ' чел.', 'total'), kv('Ожидаемый спрос', F.num(fc.demand) + ' гостей'),
      state.competitor < 0.999 ? h('p', { class: 'bad' }, 'Конкурент рядом отбирает ' + F.pct(1 - state.competitor) + ' гостей. Высокий рейтинг помогает вернуть их быстрее.') : null,
      h('p', { class: 'muted' }, 'Рейтинг растёт от хорошего железа, чистоты, интерьера, бара, лояльности и честной цены. Падает от поломок, нехватки мест, админов и интернета. Довольные гости приводят друзей — так растёт сообщество.')
    ]));
    const mods = state.modifiers.filter(function (m) { return m.label; });
    if (mods.length) root.appendChild(card('Сейчас действует', 'event', h('ul', { class: 'log' }, mods.map(function (m) { return h('li', null, m.label + ' — ещё ' + m.daysLeft + ' дн.'); }))));
    root.appendChild(card('Рекламные кампании', 'marketing', campaignsBlock(state, false)));
    root.appendChild(card('Программа лояльности', 'star', [
      h('p', null, 'Карты постоянного гостя: скидка ' + Math.round(D.LOYALTY_DISCOUNT * 100) + '%, сообщество растёт больше и медленнее забывает клуб, +0,15 к рейтингу. Запуск ' + F.money(D.LOYALTY_SETUP) + '.'),
      btn(state.loyalty ? 'Отключить программу' : 'Запустить за ' + F.money(D.LOYALTY_SETUP), function () { act(function () { return E().toggleLoyalty(st()); }, 'ok'); }, { cls: state.loyalty ? '' : 'primary', disabled: !state.loyalty && state.cash < D.LOYALTY_SETUP, key: 'loyalty', pressed: state.loyalty })
    ]));
  }

  /* ================= ФИНАНСЫ ================= */
  function bestPrice(state) {
    let best = state.price, bp = -Infinity;
    for (let p = D.PRICE_MIN; p <= D.PRICE_MAX; p += 10) {
      const f = E().forecast(state, p);
      const d = E().derive(state);
      const penalty = p > d.fairPrice * 1.3 ? 0.9 : 1; // аналитик учитывает недовольство гостей
      if (f.profit * penalty > bp) { bp = f.profit * penalty; best = p; }
    }
    return best;
  }
  function priceBlock(state, idp) {
    const d = E().derive(state);
    const val = drafts.price !== null ? drafts.price : state.price;
    const out = { demand: h('div', { class: 'mv' }), visitors: h('div', { class: 'mv' }), revenue: h('div', { class: 'mv' }), profit: h('div', { class: 'mv' }) };
    const big = h('output', { class: 'price-big', for: idp }, F.money(val));
    function upd(p) {
      const f = E().forecast(st(), p);
      big.textContent = F.money(p) + ' / час';
      out.demand.textContent = F.num(f.demand);
      out.visitors.textContent = F.num(f.visitors);
      out.revenue.textContent = F.money(f.revenue);
      out.profit.textContent = F.money(f.profit);
      out.profit.className = 'mv ' + (f.profit < 0 ? 'bad' : 'good');
    }
    const range = h('input', { type: 'range', id: idp, min: D.PRICE_MIN, max: D.PRICE_MAX, step: 10, value: val, 'aria-label': 'Цена часа', 'aria-valuetext': F.money(val) + ' в час' });
    range.addEventListener('pointerdown', function () { CC.app.interacting = true; });
    range.addEventListener('input', function () { const p = Number(range.value); drafts.price = p; range.setAttribute('aria-valuetext', F.money(p) + ' в час'); upd(p); });
    range.addEventListener('change', function () { CC.app.interacting = false; const p = Number(range.value); drafts.price = null; act(function () { return E().setPrice(st(), p); }); });
    range.addEventListener('blur', function () { CC.app.interacting = false; });
    const wrap = h('div', null, [
      h('label', { for: idp, class: 'muted' }, 'Цена часа за игровым ПК'),
      h('div', null, big),
      range,
      h('div', { class: 'row muted', style: 'justify-content:space-between' }, [h('span', null, F.money(D.PRICE_MIN)), h('span', null, 'справедливая ≈ ' + F.money(d.fairPrice)), h('span', null, F.money(D.PRICE_MAX))]),
      h('div', { class: 'section-title', style: 'margin-top:8px' }, 'Прогноз на обычный день'),
      h('div', { class: 'grid2' }, [
        h('div', { class: 'metric' }, [out.demand, h('div', { class: 'ml' }, 'Спрос, гостей')]),
        h('div', { class: 'metric' }, [out.visitors, h('div', { class: 'ml' }, 'Примем гостей')]),
        h('div', { class: 'metric' }, [out.revenue, h('div', { class: 'ml' }, 'Выручка')]),
        h('div', { class: 'metric' }, [out.profit, h('div', { class: 'ml' }, 'Прибыль')])
      ]),
      h('div', { class: 'btn-row' }, [
        btn('Совет аналитика', function () { const p = bestPrice(st()); drafts.price = null; act(function () { return E().setPrice(st(), p); }, 'ok'); }, { icon: 'chart', key: 'best-price', title: 'Подобрать цену с максимальной прогнозной прибылью' }),
        btn('−10 ₽', function () { act(function () { return E().setPrice(st(), st().price - 10); }); }, { key: 'pm10' }),
        btn('+10 ₽', function () { act(function () { return E().setPrice(st(), st().price + 10); }); }, { key: 'pp10' })
      ]),
      h('p', { class: 'muted' }, 'Прогноз без учёта дня недели, сезона и событий. Если цена выше справедливой на 30%+, рейтинг будет снижаться.')
    ]);
    upd(val);
    return wrap;
  }
  function chart(state) {
    const hist = state.history.slice(-60);
    if (hist.length < 2) return h('p', { class: 'muted' }, 'График появится после пары рабочих дней.');
    const W = 320, H = 170, top = 10, lineH = 90, barTop = 115, barH = 45, left = 4, right = 4;
    const nets = hist.map(function (x) { return x.net; });
    let mn = Math.min.apply(null, nets), mx = Math.max.apply(null, nets);
    if (mx - mn < 1) { mx += 1; mn -= 1; }
    const step = (W - left - right) / (hist.length - 1);
    const y = function (v) { return top + lineH - (v - mn) / (mx - mn) * lineH; };
    let path = '', area = '';
    hist.forEach(function (x, i) { const px = left + i * step, py = y(x.net); path += (i ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1); });
    area = path + 'L' + (left + (hist.length - 1) * step).toFixed(1) + ' ' + (top + lineH) + 'L' + left + ' ' + (top + lineH) + 'Z';
    const pmax = Math.max.apply(null, hist.map(function (x) { return Math.abs(x.profit); })) || 1;
    const mid = barTop + barH / 2;
    const bars = hist.map(function (x, i) {
      const bh = Math.abs(x.profit) / pmax * (barH / 2);
      return s('rect', { x: (left + i * step - step * 0.35).toFixed(1), y: (x.profit >= 0 ? mid - bh : mid).toFixed(1), width: Math.max(1, step * 0.7).toFixed(1), height: Math.max(0.5, bh).toFixed(1), fill: x.profit >= 0 ? 'var(--good)' : 'var(--bad)' });
    });
    const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'График чистого капитала и ежедневной прибыли за последние ' + hist.length + ' дней' }, [
      s('rect', { x: 0, y: 0, width: W, height: H, rx: 10, fill: 'var(--soft)' }),
      s('path', { d: area, fill: 'rgba(255,196,0,.35)' }),
      s('path', { d: path, fill: 'none', stroke: 'var(--text)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }),
      s('line', { x1: 0, x2: W, y1: mid, y2: mid, stroke: 'var(--line)', 'stroke-width': 1 }),
      s('text', { x: 8, y: 22, 'font-size': 10, fill: 'var(--muted)' }, F.moneyShort(mx)),
      s('text', { x: 8, y: top + lineH - 4, 'font-size': 10, fill: 'var(--muted)' }, F.moneyShort(mn)),
      s('text', { x: 8, y: barTop - 3, 'font-size': 10, fill: 'var(--muted)' }, 'Прибыль за день, макс. ' + F.moneyShort(pmax))
    ].concat(bars));
    return h('div', { class: 'chart' }, [svg, h('div', { class: 'legend' }, [h('span', null, [h('i', { style: 'background:var(--text)' }), 'Чистый капитал']), h('span', null, [h('i', { style: 'background:var(--good)' }), 'Прибыль']), h('span', null, [h('i', { style: 'background:var(--bad)' }), 'Убыток'])])]);
  }
  function loansBlock(state) {
    const wrap = h('div', null);
    const debt = E().loanDebt(state);
    wrap.appendChild(kv('Долг всего', F.money(debt)));
    wrap.appendChild(kv('Кредитный лимит банка', F.money(E().loanLimit(state))));
    state.loans.forEach(function (l, i) {
      const total = Math.round(l.balance * (1 + D.LOAN_EARLY_FEE));
      wrap.appendChild(h('div', { class: 'item' }, [
        h('div', { class: 'ihead' }, [h('div', { class: 'iico' }, icon('loan')), h('div', { class: 'grow' }, [h('div', { class: 'iname' }, l.name), h('div', { class: 'isub' }, Math.round(l.rate * 100) + '% годовых · платёж ' + F.money(l.payment) + '/день · ещё ' + l.daysLeft + ' дн.')]), h('b', null, F.money(l.balance))]),
        h('div', { class: 'btn-row' }, btn('Погасить досрочно: ' + F.money(total), function () { act(function () { return E().repayLoan(st(), i); }, 'ok'); }, { cls: 'small', disabled: state.cash < total, key: 'repay-' + i }))
      ]));
    });
    D.loans.forEach(function (ld) {
      const a = E().loanAvailable(state, ld.id);
      const rate = E().loanRate(state, ld.id);
      const item = h('div', { class: 'item' + (a.ok ? '' : ' locked') }, [
        h('div', { class: 'ihead' }, [h('div', { class: 'iico' }, icon(a.ok ? 'loan' : 'lock')), h('div', { class: 'grow' }, [h('div', { class: 'iname' }, ld.name), h('div', { class: 'isub' }, Math.round(rate * 100) + '% годовых · ' + ld.term + ' дн.')])]),
        h('p', { class: 'muted', style: 'margin:6px 0' }, ld.desc)
      ]);
      if (a.ok) {
        let amt = drafts.loans[ld.id];
        if (!(amt >= a.min && amt <= a.max)) amt = a.min;
        const id = 'loan-' + ld.id;
        const outAmt = h('b', null, F.money(amt));
        const outPay = h('span', { class: 'muted' }, '');
        const setOut = function (v) { outAmt.textContent = F.money(v); outPay.textContent = 'Платёж ≈ ' + F.money(E().annuity(v, rate, ld.term)) + ' в день, переплата ≈ ' + F.money(E().annuity(v, rate, ld.term) * ld.term - v); };
        const r = h('input', { type: 'range', id: id, min: a.min, max: a.max, step: 10000, value: amt, 'aria-label': 'Сумма кредита: ' + ld.name });
        r.addEventListener('pointerdown', function () { CC.app.interacting = true; });
        r.addEventListener('input', function () { drafts.loans[ld.id] = Number(r.value); setOut(Number(r.value)); r.setAttribute('aria-valuetext', F.money(Number(r.value))); });
        r.addEventListener('change', function () { CC.app.interacting = false; });
        r.addEventListener('blur', function () { CC.app.interacting = false; });
        setOut(amt);
        item.appendChild(h('div', { class: 'kv' }, [h('label', { for: id }, 'Сумма'), outAmt]));
        item.appendChild(r);
        item.appendChild(outPay);
        item.appendChild(h('div', { class: 'btn-row' }, btn('Взять кредит', function () {
          const v = drafts.loans[ld.id] || a.min;
          UI.confirmModal('Взять кредит?', ld.name + ': ' + F.money(v) + ' под ' + Math.round(rate * 100) + '% годовых на ' + ld.term + ' дн. Платёж списывается каждый день.', 'Взять', function () { delete drafts.loans[ld.id]; act(function () { return E().takeLoan(st(), ld.id, v); }, 'coin'); });
        }, { cls: 'primary', key: 'take-' + ld.id })));
      } else item.appendChild(h('div', { class: 'isub' }, a.msg));
      wrap.appendChild(item);
    });
    return wrap;
  }
  function finance(state, root) {
    root.appendChild(card('Цена', 'price', priceBlock(state, 'price-range')));
    root.appendChild(card('Динамика за 60 дней', 'chart', chart(state)));
    const legal = byId(D.legal, state.legal) || D.legal[0];
    const totals = state.history.slice(-30).reduce(function (a, x) { a.r += x.revenue; a.e += x.expenses; a.p += x.profit; return a; }, { r: 0, e: 0, p: 0 });
    root.appendChild(card('Последние 30 дней', 'finance', [kv('Выручка', F.money(totals.r)), kv('Расходы', F.money(totals.e)), kv('Прибыль', F.money(totals.p), 'total'),
      kv('Всего гостей за игру', F.num(state.stats.totalVisitors)), kv('Налоговый режим', legal.name + ' · ' + legal.taxName)]));
    const rows = state.history.slice(-14).reverse();
    root.appendChild(card('Журнал операций', 'cost', rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'ledger' }, [
      h('caption', { class: 'sr' }, 'Доходы и расходы по дням'),
      h('thead', null, h('tr', null, ['День', 'Гости', 'Выручка', 'Расходы', 'Прибыль'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, rows.map(function (x) { return h('tr', null, [h('td', null, String(x.day + 1)), h('td', null, F.num(x.visitors)), h('td', null, F.money(x.revenue)), h('td', null, F.money(x.expenses)), h('td', { class: x.profit < 0 ? 'bad' : 'good' }, F.money(x.profit))]); }))
    ])) : h('p', { class: 'muted' }, 'Пока нет операций.')));
    root.appendChild(card('Кредиты', 'loan', [h('p', { class: 'muted' }, 'Кредит — способ ускориться, но проценты съедают прибыль. Досрочное погашение — с комиссией ' + Math.round(D.LOAN_EARLY_FEE * 100) + '%. Допустимый минус по счёту: ' + F.money(legal.overdraft) + ', не дольше 21 дня.'), loansBlock(state)]));
  }

  /* ================= Модальные окна ================= */
  function priceModal() {
    const state = st();
    if (state.phase === 'over') return;
    UI.openModal({ title: 'Цена часа', icon: 'price', body: function () { return priceBlock(state, 'price-range-modal'); }, onClose: function () { drafts.price = null; CC.app.render(); } });
  }
  function goalsModal() {
    const state = st();
    UI.openModal({ title: 'Цели и достижения', icon: 'trophy', body: h('div', null, [
      h('ol', { class: 'log', style: 'list-style:none' }, D.goals.map(function (gl, i) {
        const done = i < state.goalIndex, cur = i === state.goalIndex;
        const val = cur ? Q().goalValue(state, gl) : 0;
        return h('li', { class: done ? 'good' : cur ? 'goal' : '' }, [h('b', null, (done ? '✓ ' : (i + 1) + '. ') + gl.title), h('div', { class: 'muted' }, 'Награда: ' + gl.reward), cur ? UI.minibar(val / gl.target, '', 'Прогресс') : null]);
      })),
      h('div', { class: 'section-title' }, 'Достижения: ' + Object.keys(state.achievements).length + ' из ' + D.achievements.length),
      h('div', { class: 'ach' }, D.achievements.map(function (a) {
        const on = state.achievements[a.id] !== undefined;
        return h('div', { class: 'a' + (on ? ' on' : '') }, [h('b', null, a.name), a.desc, on ? h('div', { class: 'muted', style: 'color:inherit' }, 'День ' + F.num(state.achievements[a.id] + 1)) : null]);
      }))
    ]) });
  }
  function helpModal() {
    UI.openModal({ title: 'Как играть', icon: 'help', body: h('div', null, [
      h('p', null, 'Вы открываете компьютерный клуб со стартовым капиталом 3 000 000 ₽. Пройдите шаги открытия: концепция, регистрация, аренда, оборудование, персонал и реклама.'),
      h('p', null, 'После открытия каждый день гости приходят, играют и платят. Жмите «Следующий день» или включите автоигру 1× / 2× / 4×. Игра ставится на паузу, когда нужно принять решение.'),
      h('p', null, h('b', null, 'Спрос'), ' = охват (поток у помещения + сообщество + реклама) × рейтинг × привлекательность зала × влияние цены × день недели × сезон × события.'),
      h('p', null, h('b', null, 'Вместимость'), ' = работающие места × 4 сеанса по 3 часа. Один администратор обслуживает 14 мест.'),
      h('p', null, h('b', null, 'Расходы'), ': аренда, зарплаты, электричество, интернет, бухгалтерия, налоги, износ и ремонт, реклама, проценты.'),
      h('p', null, h('b', null, 'Цель'), ': чистый капитал 30 млн ₽ (деньги минус кредиты). Банкротство — если минус по счёту превышает лимит или держится больше 21 дня.'),
      h('p', null, h('b', null, 'Клавиши'), ': N — следующий день, P — пауза, 1–3 — скорость, Esc — закрыть окно.'),
      h('p', { class: 'muted' }, 'Нажимайте «i» на плитках, чтобы увидеть формулы и цифры.')
    ]) });
  }
  function settingsModal() {
    const state = st();
    UI.openModal({ title: 'Настройки', icon: 'settings', body: function () {
      const themes = [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']];
      return h('div', null, [
        h('h3', null, [icon('theme'), 'Тема']),
        h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Тема' }, themes.map(function (t) {
          return btn(t[1], function (e) { CC.app.setTheme(t[0]); e.currentTarget.parentNode.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('primary'); }); e.currentTarget.setAttribute('aria-pressed', 'true'); e.currentTarget.classList.add('primary'); }, { pressed: state.settings.theme === t[0], cls: 'small' + (state.settings.theme === t[0] ? ' primary' : '') });
        })),
        h('h3', { style: 'margin-top:14px' }, [icon('sound'), 'Звук']),
        h('label', { class: 'row', style: 'gap:8px;cursor:pointer' }, [
          h('input', { type: 'checkbox', checked: state.settings.sound ? true : null, onchange: function (e) { CC.app.setSound(e.target.checked); }, style: 'width:22px;height:22px' }),
          'Звуковые эффекты'
        ]),
        h('h3', { style: 'margin-top:14px' }, [icon('play'), 'Скорость автоигры']),
        h('select', { 'aria-label': 'Скорость автоигры', onchange: function (e) { CC.app.setSpeed(Number(e.target.value)); } }, UI.SPEEDS.map(function (sp, i) {
          return h('option', { value: i, selected: state.settings.speed === i ? true : null }, i === 0 ? 'Пауза' : sp.label + ' (' + [0, 3, 1.5, 0.7][i].toString().replace('.', ',') + ' с на день)');
        })),
        h('h3', { style: 'margin-top:14px' }, [icon('download'), 'Сохранения']),
        h('p', { class: 'muted' }, 'Игра сохраняется автоматически в этом браузере. Зерно случайности: ' + state.seed + '.'),
        h('div', { class: 'btn-row' }, [btn('Экспорт', function () { CC.app.exportSave(); }, { icon: 'download', cls: 'small' }), btn('Импорт', function () { CC.app.importSave(); }, { icon: 'upload', cls: 'small' })]),
        h('h3', { style: 'margin-top:14px' }, [icon('warn'), 'Сброс']),
        btn('Сбросить прогресс', function () { CC.app.askNewGame(); }, { cls: 'danger', icon: 'refresh' })
      ]);
    } });
  }

  const RENDER = { overview: overview, hall: hall, staff: staff, marketing: marketing, finance: finance };
  function renderView(state, tab, root) {
    UI.clear(root);
    (RENDER[tab] || overview)(state, root);
  }

  CC.views = { renderView: renderView, eventModal: eventModal, priceModal: priceModal, goalsModal: goalsModal, helpModal: helpModal, settingsModal: settingsModal, bestPrice: bestPrice, drafts: drafts, delta: delta };
})(typeof globalThis !== 'undefined' ? globalThis : this);
