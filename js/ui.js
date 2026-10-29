/* UI-примитивы: безопасный DOM-конструктор, модальные окна, уведомления, шапка, плитки, цель, управление. */
(function (g) {
  'use strict';
  const CC = g.CC = g.CC || {};
  const D = CC.data, F = CC.fmt;

  /* ---------- Безопасный конструктор DOM (только textContent, без innerHTML) ---------- */
  function append(el, kids) {
    if (kids === null || kids === undefined || kids === false) return el;
    if (!Array.isArray(kids)) kids = [kids];
    kids.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) append(el, c);
      else if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
      else el.appendChild(c);
    });
    return el;
  }
  function h(tag, attrs, kids) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = String(v);
        else if (k === 'key') el.setAttribute('data-key', v);
        else if (k === 'style') el.setAttribute('style', v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      });
    }
    return append(el, kids);
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, kids) {
    const el = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, String(attrs[k])); });
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c === null || c === undefined) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  const icon = function (n, c) { return CC.icon(n, c); };

  function btn(label, onclick, opts) {
    opts = opts || {};
    return h('button', {
      type: 'button', class: 'btn' + (opts.cls ? ' ' + opts.cls : ''), onclick: onclick, disabled: !!opts.disabled,
      key: opts.key, 'aria-label': opts.aria, 'data-autofocus': (opts.autofocus || opts['data-autofocus']) ? true : null, title: opts.title, 'aria-pressed': opts.pressed === undefined ? null : String(!!opts.pressed)
    }, [opts.icon ? icon(opts.icon) : null, label]);
  }
  function kv(label, value, cls) { return h('div', { class: 'kv' + (cls ? ' ' + cls : '') }, [h('span', null, label), h('b', null, value)]); }
  function stars(rating) {
    const wrap = h('span', { class: 'stars', role: 'img', 'aria-label': 'Рейтинг ' + F.num1(rating) + ' из 5' });
    for (let i = 1; i <= 5; i++) {
      const on = rating >= i - 0.25;
      wrap.appendChild(icon(on ? 'starFill' : 'star', on ? '' : 'off'));
    }
    return wrap;
  }
  function minibar(frac, cls, label) {
    const pct = Math.max(0, Math.min(1, frac || 0));
    return h('div', { class: 'minibar' + (cls ? ' ' + cls : ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct * 100), 'aria-label': label || null },
      h('i', { style: 'width:' + (pct * 100).toFixed(1) + '%' }));
  }
  function condClass(c) { return c >= 70 ? 'k' : c >= 40 ? 'warn' : 'badc'; }

  /* ---------- Уведомления ---------- */
  function toast(text, kind) {
    const box = document.getElementById('toast');
    if (!box) return;
    const t = h('div', { class: 't' + (kind ? ' ' + kind : '') }, text);
    box.appendChild(t);
    while (box.children.length > 2) box.removeChild(box.firstChild);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  /* ---------- Модальные окна с ловушкой фокуса ---------- */
  const modalStack = [];
  function openModal(opts) {
    const root = document.getElementById('modal-root');
    const prevFocus = document.activeElement;
    const titleId = 'm-title-' + Math.random().toString(36).slice(2, 8);
    const close = function () {
      const i = modalStack.indexOf(entry);
      if (i >= 0) modalStack.splice(i, 1);
      if (back.parentNode) back.parentNode.removeChild(back);
      if (opts.onClose) opts.onClose();
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
      if (CC.app) CC.app.onModalChange();
    };
    const body = typeof opts.body === 'function' ? opts.body(close) : opts.body;
    const modal = h('div', { class: 'modal', role: opts.alert ? 'alertdialog' : 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
      opts.noClose ? null : h('button', { type: 'button', class: 'icon-btn mclose', 'aria-label': 'Закрыть', onclick: close }, icon('close')),
      h('h2', { id: titleId }, [opts.icon ? icon(opts.icon) : null, opts.title]),
      body
    ]);
    const back = h('div', { class: 'backdrop' }, modal);
    back.addEventListener('mousedown', function (e) { if (e.target === back && !opts.noClose) close(); });
    back.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !opts.noClose) { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        const f = Array.prototype.filter.call(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    const entry = { close: close, el: back, kind: opts.kind || null };
    modalStack.push(entry);
    root.appendChild(back);
    const focusEl = modal.querySelector('[data-autofocus]') || modal.querySelector('.btn.primary') || modal.querySelector('button, input, select');
    if (focusEl) focusEl.focus({ preventScroll: true });
    if (CC.app) CC.app.onModalChange();
    return entry;
  }
  function anyModal() { return modalStack.length > 0; }
  function closeAllModals() { modalStack.slice().forEach(function (m) { m.close(); }); }
  function hasModal(kind) { return modalStack.some(function (m) { return m.kind === kind; }); }
  function confirmModal(title, text, okLabel, onOk, extra) {
    return openModal({
      title: title, icon: 'warn', alert: true,
      body: function (close) {
        return h('div', null, [
          h('p', null, text), extra || null,
          h('div', { class: 'btn-row' }, [
            btn('Отмена', close, { 'data-autofocus': true }),
            btn(okLabel, function () { close(); onOk(); }, { cls: 'danger' })
          ])
        ]);
      }
    });
  }

  /* ---------- Плитки показателей ---------- */
  function statsData(st) {
    const E = CC.economy;
    const d = E.derive(st);
    const r = st.lastReport;
    const fc = E.forecast(st);
    const debt = E.loanDebt(st);
    const avg7 = st.history.slice(-7);
    const avgProfit = avg7.length ? avg7.reduce(function (a, x) { return a + x.profit; }, 0) / avg7.length : fc.profit;
    const profit = r ? r.profit : fc.profit;
    const cph = r && r.visitors > 0 ? r.costPerHour : fc.costPerHour;
    return [
      { id: 'capital', icon: 'capital', label: 'Капитал', value: F.moneyShort(st.cash), neg: st.cash < 0,
        info: function () {
          return [h('p', null, 'Деньги на расчётном счёте клуба. Если счёт уходит в минус больше чем на ' + F.money(d.legal.overdraft) + ' или остаётся в минусе дольше 21 дня — банкротство.'),
            kv('На счёте', F.money(st.cash)), kv('Долг по кредитам', F.money(debt)), kv('Чистый капитал', F.money(st.cash - debt), 'total'),
            h('p', { class: 'muted' }, 'Цели считаются по чистому капиталу: деньги минус долги. Взять кредит ради цели не получится.')];
        } },
      { id: 'income', icon: 'income', label: 'Доход/день', value: (profit > 0 ? '+' : '') + F.moneyShort(profit), neg: profit < 0,
        info: function () {
          return [h('p', null, r ? 'Прибыль за последний день: выручка минус все расходы, включая налоги, проценты, рекламу и ремонт.' : 'Прогноз прибыли в обычный день при текущих настройках.'),
            r ? kv('Выручка', F.money(r.revenue + r.otherIncome)) : kv('Прогноз выручки', F.money(fc.revenue)),
            r ? kv('Расходы', F.money(r.expenses)) : kv('Прогноз расходов', F.money(fc.costs)),
            kv('Среднее за 7 дней', F.money(avgProfit), 'total'),
            h('p', { class: 'muted' }, 'Покупки оборудования не входят в прибыль — это вложения, они сразу уменьшают капитал.')];
        } },
      { id: 'power', icon: 'power', label: 'Мощность', value: F.num(d.working) + ' / ' + F.num(d.seats) + ' мест',
        info: function () {
          return [h('p', null, 'Сколько мест работает и сколько гостей клуб может принять за день: каждое место — до ' + D.SESSIONS_PER_SEAT + ' сеансов по ' + D.HOURS_PER_VISIT + ' часа.'),
            kv('Работает мест', F.num(d.working) + ' из ' + F.num(d.seats)),
            kv('Занято площади', F.num(d.slotsUsed) + ' из ' + F.num(d.slotsMax)),
            kv('Обслуживают администраторы', F.pct(d.adminFactor)),
            kv('Интернет', d.internet.name + (d.internetOk ? '' : ' — не хватает!')),
            kv('Гостей в день максимум', F.num(d.capacity), 'total')];
        } },
      { id: 'reach', icon: 'reach', label: 'Охват аудитории', value: F.num(d.reach) + ' чел.',
        info: function () {
          return [h('p', null, 'Сколько людей в день узнают о клубе и могут прийти. Сколько из них придут — зависит от цены, качества железа, состояния зала и рейтинга.'),
            kv('Поток у помещения', F.num(d.loc.traffic)), kv('Сообщество (сарафанное радио)', F.num(st.community)),
            kv('Реклама', F.num(d.campaignReach)), kv('Охват', F.num(d.reach), 'total'),
            h('div', { class: 'kv' }, [h('span', null, 'Рейтинг'), h('b', null, [stars(st.rating), ' ', F.num1(st.rating)])]),
            kv('Ожидаемый спрос', F.num(fc.demand) + ' гостей/день')];
        } },
      { id: 'cost', icon: 'cost', label: 'Себестоимость', value: cph > 0 ? F.money(cph) + '/ч' : '—',
        info: function () {
          const c = r ? r.costs : null;
          return [h('p', null, 'Во сколько клубу обходится один проданный час: все расходы дня, делённые на проданные часы. Если себестоимость выше цены часа — клуб работает в убыток.'),
            c ? [kv('Аренда', F.money(c.rent)), kv('Зарплаты', F.money(c.wages)), kv('Электричество', F.money(c.power)), kv('Интернет и бухгалтерия', F.money(c.internet + c.accounting)),
              kv('Налоги', F.money(c.tax)), kv('Проценты по кредитам', F.money(c.interest)), kv('Реклама, ремонт, штрафы, прочее', F.money(c.marketing + c.repairs + c.fines + c.other + c.bar)),
              kv('Проданных часов', F.num(r.visitors * D.HOURS_PER_VISIT), 'total')] : h('p', { class: 'muted' }, 'Подробная раскладка появится после первого рабочего дня.')];
        } },
      { id: 'price', icon: 'price', label: 'Цена часа', value: F.money(st.price), action: true,
        info: function () {
          return [h('p', null, 'Цена часа игры за обычным игровым ПК. Офисные места стоят 60% от неё, топовые — 160%, консоли — 120%, VR — 200%.'),
            kv('Справедливая цена для вашего клуба', F.money(d.fairPrice)),
            h('p', { class: 'muted' }, 'Выше справедливой — гостей меньше и рейтинг падает (если дороже на 30%+). Ниже — гостей больше, но с каждого меньше денег. Нажмите на цену, чтобы изменить её.')];
        } }
    ];
  }
  function renderStats(st) {
    const box = clear(document.getElementById('stats'));
    statsData(st).forEach(function (t, i) {
      const alt = Math.floor(i / 2) === 1;
      const value = t.action
        ? h('button', { type: 'button', class: 'tval', key: 'price-tile', style: 'border:0;background:none;padding:0;text-decoration:underline dotted;text-underline-offset:4px;color:inherit;font-family:inherit;max-width:100%', 'aria-label': 'Цена часа ' + t.value + ', изменить', onclick: function () { CC.views.priceModal(); } }, t.value)
        : h('div', { class: 'tval' + (t.neg ? ' neg' : '') }, t.value);
      box.appendChild(h('div', { class: 'tile' + (alt ? ' alt' : '') }, [
        h('div', { class: 'tico' }, [icon(t.icon),
          h('button', { type: 'button', class: 'ibtn', key: 'info-' + t.id, 'aria-label': 'Подробнее: ' + t.label, onclick: function () { openModal({ title: t.label, icon: t.icon, body: h('div', null, t.info()) }); } }, 'i')]),
        h('div', { class: 'tbody' }, [value, h('div', { class: 'tlab' }, t.label)])
      ]));
    });
  }

  function renderGoal(st) {
    const box = clear(document.getElementById('goal'));
    const goal = CC.quests.currentGoal(st);
    const n = D.goals.length;
    if (!goal) {
      box.appendChild(h('button', { type: 'button', class: 'glab', key: 'goal', style: 'border:0;background:none;color:inherit;font:inherit;cursor:pointer', onclick: function () { CC.views.goalsModal(); } }, 'Все цели выполнены!'));
      box.appendChild(h('div', { class: 'bar' }, [h('div', { class: 'fill', style: 'width:100%' }), h('div', { class: 'btxt' }, 'Победа · ' + F.num(st.day) + ' дн.')]));
      return;
    }
    const val = CC.quests.goalValue(st, goal);
    const frac = Math.max(0, Math.min(1, val / goal.target));
    box.appendChild(h('button', { type: 'button', class: 'glab', key: 'goal', 'aria-label': 'Цель ' + (st.goalIndex + 1) + ' из ' + n + ': ' + goal.title + '. Открыть список целей', style: 'border:0;background:none;color:inherit;cursor:pointer;font-family:var(--font-head);font-weight:900;text-transform:uppercase;font-size:15px', onclick: function () { CC.views.goalsModal(); } }, 'Цель ' + (st.goalIndex + 1) + ' из ' + n));
    box.appendChild(h('div', { class: 'gtitle' }, goal.title + ' — ' + goal.reward));
    box.appendChild(h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': goal.target, 'aria-valuenow': Math.max(0, Math.round(val)), 'aria-label': 'Прогресс цели' }, [
      h('div', { class: 'fill', style: 'width:' + (frac * 100).toFixed(1) + '%' }),
      h('div', { class: 'btxt' }, F.moneyShort(Math.max(0, val)) + ' / ' + F.moneyShort(goal.target))
    ]));
  }

  /* ---------- Управление временем ---------- */
  const SPEEDS = [{ label: 'Пауза', icon: 'pause' }, { label: '1×' }, { label: '2×' }, { label: '4×' }];
  function renderControls(st) {
    const box = clear(document.getElementById('controls'));
    const running = st.phase === 'running';
    const date = CC.state.dateOf(st.day);
    const season = CC.state.seasonInfo(date);
    let sub = F.date(date);
    if (season.label) sub += ' · ' + season.label;
    let head;
    if (st.phase === 'setup') { head = 'Подготовка: шаг ' + (st.setupStep + 1) + ' из 6'; sub = 'Открытие ' + F.date(date); }
    else if (st.phase === 'over') head = 'Клуб закрыт · день ' + F.num(st.day);
    else head = 'День ' + F.num(st.day + 1);
    box.appendChild(h('div', { class: 'when' }, [h('div', { class: 'dnum' }, head), h('div', { class: 'ddate' }, st.pendingEvent ? 'Ждёт вашего решения!' : sub)]));
    const seg = h('div', { class: 'speed', role: 'group', 'aria-label': 'Скорость автоигры' });
    SPEEDS.forEach(function (sp, i) {
      seg.appendChild(h('button', { type: 'button', key: 'speed-' + i, 'aria-pressed': String(st.settings.speed === i), disabled: !running, 'aria-label': i === 0 ? 'Пауза' : 'Скорость ' + sp.label, title: i === 0 ? 'Пауза (P)' : 'Автоигра ' + sp.label, onclick: function () { CC.app.setSpeed(i); } },
        sp.icon ? icon(sp.icon) : sp.label));
    });
    box.appendChild(seg);
    box.appendChild(btn('Следующий день', function () { CC.app.nextDay(); }, { cls: 'primary', icon: 'next', key: 'next-day', disabled: !running || !!st.pendingEvent, title: 'Следующий день (N)' }));
  }

  /* ---------- Нижняя навигация ---------- */
  const TABS = [
    { id: 'overview', label: 'Обзор', icon: 'overview' },
    { id: 'hall', label: 'Зал', icon: 'hall' },
    { id: 'staff', label: 'Персонал', icon: 'staff' },
    { id: 'marketing', label: 'Маркетинг', icon: 'marketing' },
    { id: 'finance', label: 'Финансы', icon: 'finance' }
  ];
  function renderTabs(st, current) {
    const box = clear(document.getElementById('tabbar'));
    box.setAttribute('role', 'tablist');
    const setup = st.phase === 'setup';
    TABS.forEach(function (t, i) {
      const sel = t.id === current;
      const alert = (t.id === 'hall' && CC.economy.derive(st).working < CC.economy.seatsTotal(st)) || (t.id === 'overview' && st.pendingEvent);
      const b = h('button', { type: 'button', role: 'tab', id: 'tab-' + t.id, key: 'tab-' + t.id, 'aria-selected': String(sel), 'aria-controls': 'view', tabindex: sel ? '0' : '-1',
        disabled: setup && t.id !== 'overview' ? true : null, title: setup && t.id !== 'overview' ? 'Доступно после открытия клуба' : null,
        onclick: function () { CC.app.setTab(t.id); },
        onkeydown: function (e) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (setup) return;
            const ni = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
            CC.app.setTab(TABS[ni].id); const nb = document.getElementById('tab-' + TABS[ni].id); if (nb) nb.focus();
          }
        } }, [icon(t.icon), h('span', null, t.label), alert ? h('span', { class: 'tdot', 'aria-hidden': 'true' }) : null]);
      box.appendChild(b);
    });
    const view = document.getElementById('view');
    view.setAttribute('role', 'tabpanel');
    view.setAttribute('aria-labelledby', 'tab-' + current);
  }

  CC.ui = {
    h: h, s: s, clear: clear, append: append, icon: icon, btn: btn, kv: kv, stars: stars, minibar: minibar, condClass: condClass,
    toast: toast, openModal: openModal, anyModal: anyModal, closeAllModals: closeAllModals, hasModal: hasModal, confirmModal: confirmModal,
    renderStats: renderStats, renderGoal: renderGoal, renderControls: renderControls, renderTabs: renderTabs, TABS: TABS, SPEEDS: SPEEDS
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
