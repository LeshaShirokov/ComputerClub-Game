/* Контроллер: состояние, действия, автоигра, звук, тема, сохранения, меню. */
(function (g) {
  'use strict';
  const CC = g.CC;
  const UI = CC.ui, V = CC.views, F = CC.fmt, h = UI.h, icon = UI.icon;
  const INTERVALS = [0, 5000, 3500, 2500]; // мс на игровой день

  const app = CC.app = {
    state: null, tab: 'overview', collapsed: false, interacting: false, timer: null,
    act: act, nextDay: nextDay, setSpeed: setSpeed, setTab: setTab, render: render, setTheme: setTheme, setSound: setSound,
    exportSave: exportSave, importSave: importSave, askNewGame: askNewGame, newGame: newGame, onModalChange: onModalChange
  };

  /* ---------- Звук (WebAudio, синтез без файлов) ---------- */
  let actx = null;
  function beep(kind) {
    if (!app.state || !app.state.settings.sound) return;
    try {
      if (!actx) { const AC = g.AudioContext || g.webkitAudioContext; if (!AC) return; actx = new AC(); }
      if (actx.state === 'suspended') actx.resume();
      const seq = { day: [[660, 0.05]], coin: [[880, 0.06], [1320, 0.09]], ok: [[520, 0.07], [780, 0.08]], bad: [[220, 0.15], [160, 0.2]], event: [[440, 0.08], [440, 0.08], [660, 0.12]], win: [[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.25]] }[kind] || [[600, 0.05]];
      let t = actx.currentTime;
      seq.forEach(function (n) {
        const o = actx.createOscillator(), gn = actx.createGain();
        o.type = kind === 'bad' ? 'sawtooth' : 'square';
        o.frequency.value = n[0];
        gn.gain.setValueAtTime(0.0001, t);
        gn.gain.exponentialRampToValueAtTime(kind === 'day' ? 0.03 : 0.07, t + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + n[1]);
        o.connect(gn); gn.connect(actx.destination);
        o.start(t); o.stop(t + n[1] + 0.02);
        t += n[1] * 0.9;
      });
    } catch (e) { /* звук не обязателен */ }
  }

  /* ---------- Действия ---------- */
  function persist() { CC.storage.save(app.state); }
  function act(fn, sound) {
    const before = snapshot();
    let res;
    try { res = fn(); } catch (e) { console.error(e); res = { ok: false, msg: 'Ошибка: ' + e.message }; }
    if (res && res.msg) UI.toast(res.msg, res.ok ? (sound === 'coin' || sound === 'win' ? 'good' : '') : 'bad');
    if (res && res.ok) beep(sound || 'ok'); else if (res) beep('bad');
    persist();
    afterChange(before);
    render();
    return res;
  }
  function snapshot() { const s = app.state; return { goal: s.goalIndex, phase: s.phase, won: s.won, ev: !!s.pendingEvent }; }
  function afterChange(before) {
    const s = app.state;
    if (s.goalIndex > before.goal) {
      const gl = CC.data.goals[s.goalIndex - 1];
      if (s.won && !before.won) {
        setSpeed(0, true);
        beep('win');
        UI.openModal({ title: 'Победа!', icon: 'trophy', body: h('div', null, [CC.art('win'), h('p', null, 'Чистый капитал ' + F.money(CC.economy.netCapital(s)) + ' за ' + F.num(s.day) + ' ' + F.plural(s.day, 'день', 'дня', 'дней') + '. Вы построили лучший компьютерный клуб города!'), h('p', { class: 'muted' }, 'Можно продолжать играть или начать заново с другой стратегией.')]) });
      } else {
        beep('win');
        UI.toast('Цель выполнена: ' + gl.title + '. ' + gl.reward, 'good');
      }
    }
    if (s.phase === 'over' && before.phase !== 'over') {
      setSpeed(0, true);
      beep('bad');
      UI.openModal({ title: 'Банкротство', icon: 'warn', alert: true, body: function (close) {
        return h('div', null, [CC.art('bankrupt'), h('p', null, s.gameOver.reason + '. Клуб закрыт на ' + F.num(s.day) + '-й день.'),
          h('div', { class: 'btn-row' }, [UI.btn('Посмотреть итоги', close), UI.btn('Новая игра', function () { close(); askNewGame(); }, { cls: 'primary', icon: 'refresh' })])]);
      } });
    }
    if (s.pendingEvent && !before.ev) { beep('event'); V.eventModal(); }
  }
  function nextDay() {
    const s = app.state;
    if (s.phase !== 'running' || s.pendingEvent) return null;
    const before = snapshot();
    const res = CC.economy.simulateDay(s);
    if (!res.ok) { UI.toast(res.msg, 'bad'); render(); return res; }
    beep('day');
    persist();
    afterChange(before);
    render();
    return res;
  }

  /* ---------- Автоигра ---------- */
  function schedule() {
    clearTimeout(app.timer);
    const sp = app.state.settings.speed;
    if (!sp || app.state.phase !== 'running') return;
    app.timer = setTimeout(tick, INTERVALS[sp]);
  }
  function tick() {
    const s = app.state;
    if (s.settings.speed && s.phase === 'running' && !s.pendingEvent && !UI.anyModal() && !app.interacting && !document.hidden) nextDay();
    schedule();
  }
  function setSpeed(i, silent) {
    i = Math.max(0, Math.min(3, i | 0));
    app.state.settings.speed = i;
    persist();
    if (!silent) render();
    schedule();
  }
  function onModalChange() { /* автоигра сама ждёт, пока открыты окна */ }

  /* ---------- Тема и звук ---------- */
  function applyTheme() {
    const t = app.state.settings.theme;
    document.documentElement.setAttribute('data-theme', t);
    const dark = t === 'dark' || (t === 'auto' && g.matchMedia && g.matchMedia('(prefers-color-scheme: dark)').matches);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#151515' : '#FFC400');
  }
  function setTheme(t) { app.state.settings.theme = t; applyTheme(); persist(); }
  function setSound(on) { app.state.settings.sound = !!on; persist(); if (on) beep('ok'); }

  /* ---------- Отрисовка ---------- */
  function render() {
    const s = app.state;
    const active = document.activeElement;
    const key = active && active.getAttribute ? active.getAttribute('data-key') : null;
    const inModal = active && active.closest && active.closest('.modal');
    UI.renderStats(s);
    UI.renderGoal(s);
    UI.renderControls(s);
    if (s.phase === 'setup' && app.tab !== 'overview') app.tab = 'overview';
    UI.renderTabs(s, app.tab);
    if (!app.interacting) V.renderView(s, app.tab, document.getElementById('view'));
    if (key && !inModal) {
      const el = document.querySelector('#app [data-key="' + key.replace(/"/g, '') + '"]');
      if (el && !el.disabled) el.focus({ preventScroll: true });
      else if (el) { const v = document.getElementById('view'); if (v) v.focus({ preventScroll: true }); }
    }
    const dash = document.getElementById('dash'), col = document.getElementById('collapse');
    dash.classList.toggle('collapsed', app.collapsed);
    col.setAttribute('aria-expanded', String(!app.collapsed));
    col.setAttribute('aria-label', app.collapsed ? 'Показать показатели' : 'Свернуть показатели');
    UI.clear(col).appendChild(icon(app.collapsed ? 'chevronDown' : 'chevronUp'));
  }
  function setTab(id) {
    if (app.state.phase === 'setup' && id !== 'overview') return;
    app.tab = id;
    render();
    const v = document.getElementById('view');
    if (v && v.getBoundingClientRect().top < 0) v.scrollIntoView({ block: 'start' });
  }

  /* ---------- Сохранения ---------- */
  function exportSave() {
    try {
      const blob = new Blob([CC.storage.serialize(app.state)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: 'computer-club-save-day-' + (app.state.day + 1) + '.json' });
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      UI.toast('Сохранение выгружено в файл', 'good');
    } catch (e) { UI.toast('Не удалось выгрузить сохранение', 'bad'); }
  }
  function importSave() {
    const inp = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
    inp.addEventListener('change', function () {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (!f) return;
      if (f.size > 2000000) { UI.toast('Файл слишком большой для сохранения', 'bad'); return; }
      const rd = new FileReader();
      rd.onload = function () { loadText(String(rd.result)); };
      rd.onerror = function () { UI.toast('Не удалось прочитать файл', 'bad'); };
      rd.readAsText(f);
    });
    document.body.appendChild(inp);
    inp.click();
  }
  function loadText(text) {
    const r = CC.storage.parse(text);
    if (!r.ok) { UI.toast(r.error, 'bad'); beep('bad'); return false; }
    UI.closeAllModals();
    app.state = r.state;
    app.state.settings.speed = 0;
    app.tab = 'overview';
    applyTheme(); persist(); render(); schedule();
    UI.toast('Сохранение загружено: день ' + F.num(app.state.day + 1), 'good');
    return true;
  }
  app.loadText = loadText;
  function newGame(seed) {
    const prev = app.state ? app.state.settings : null;
    app.state = CC.state.createState(seed);
    if (prev) { app.state.settings.sound = prev.sound; app.state.settings.theme = prev.theme; }
    app.tab = 'overview';
    V.drafts.price = null; V.drafts.loans = {};
    applyTheme(); persist(); render(); schedule();
    const v = document.getElementById('view'); if (v) v.focus({ preventScroll: true });
    g.scrollTo && g.scrollTo(0, 0);
  }
  function askNewGame() {
    UI.closeAllModals();
    const seedInput = h('input', { type: 'text', id: 'seed-input', maxlength: 40, placeholder: 'случайное', autocomplete: 'off' });
    UI.confirmModal('Новая игра?', 'Текущий прогресс будет удалён. Если хотите сохранить его — сначала сделайте экспорт в меню.', 'Начать заново',
      function () { newGame(seedInput.value.trim() || undefined); UI.toast('Новая игра началась', 'good'); },
      h('div', { style: 'margin:10px 0' }, [h('label', { for: 'seed-input', class: 'muted' }, 'Зерно случайности (необязательно): одинаковое зерно — одинаковые события'), seedInput]));
  }

  /* ---------- Меню ---------- */
  function openDrawer() {
    const dr = document.getElementById('drawer'), burger = document.getElementById('burger');
    const close = function () { dr.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.focus(); document.removeEventListener('keydown', onKey, true); };
    const go = function (fn) { return function () { close(); fn(); }; };
    const item = function (ic, label, fn) { return h('button', { type: 'button', class: 'menu-item', onclick: go(fn) }, [icon(ic), label]); };
    UI.clear(dr).appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'phead' }, [h('span', null, 'Меню'), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Закрыть меню', onclick: close }, icon('close'))]),
      item('trophy', 'Цели и достижения', V.goalsModal),
      item('settings', 'Настройки', V.settingsModal),
      item('help', 'Как играть', V.helpModal),
      item('download', 'Экспорт сохранения', exportSave),
      item('upload', 'Импорт сохранения', importSave),
      item('refresh', 'Новая игра', askNewGame)
    ]));
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const f = dr.querySelectorAll('button');
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    dr.onclick = function (e) { if (e.target === dr) close(); };
    document.addEventListener('keydown', onKey, true);
    dr.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    dr.querySelector('.menu-item').focus();
  }

  /* ---------- Запуск ---------- */
  function boot() {
    const loaded = CC.storage.load();
    if (loaded.ok) app.state = loaded.state;
    else {
      app.state = CC.state.createState();
      if (!loaded.empty && loaded.error !== 'Хранилище недоступно') setTimeout(function () { UI.toast('Сохранение повреждено — начата новая игра. ' + loaded.error, 'bad'); }, 300);
    }
    app.state.settings.speed = 0; // после перезагрузки — пауза
    document.getElementById('logo').appendChild(icon('logo'));
    const burger = document.getElementById('burger');
    burger.appendChild(icon('menu'));
    burger.addEventListener('click', openDrawer);
    document.getElementById('collapse').addEventListener('click', function () { app.collapsed = !app.collapsed; render(); });
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (UI.anyModal() || !document.getElementById('drawer').hidden) return;
      const k = e.key.toLowerCase();
      if (k === 'n' || k === 'т') { e.preventDefault(); nextDay(); }
      else if (k === 'p' || k === 'з') { e.preventDefault(); setSpeed(0); }
      else if (k === '1' || k === '2' || k === '3') { if (app.state.phase === 'running') { e.preventDefault(); setSpeed(Number(k)); } }
    });
    document.addEventListener('pointerup', function () { if (app.interacting) { app.interacting = false; } });
    if (g.matchMedia) { const mq = g.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', applyTheme); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); });
    g.addEventListener('pagehide', persist);
    applyTheme();
    render();
    if (app.state.pendingEvent) V.eventModal();
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
