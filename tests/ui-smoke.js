// UI-смоук в headless Chrome: онбординг, несколько дней, вкладки, модалки, без ошибок в консоли.
// Запуск: CHROME_PATH=/usr/bin/google-chrome node tests/ui-smoke.js [--shots]
'use strict';
const path = require('path');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { puppeteer = require(path.join(process.env.TOOLS_DIR || '/workspace/ccg-tools', 'node_modules', 'puppeteer-core')); }
const { start } = require('./serve');
const SHOTS = process.argv.includes('--shots');
const OUT = process.env.SHOTS_DIR || path.join(__dirname, '..', '..', 'ccg-shots');

(async function main() {
  const srv = await start(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const errors = [];
  let failed = false;
  function check(cond, msg) { if (!cond) { failed = true; console.error('FAIL: ' + msg); } else console.log('ok - ' + msg); }
  try {
    const page = await browser.newPage();
    page.on('console', function (m) { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
    page.on('dialog', function (d) { errors.push('unexpected dialog: ' + d.message()); d.dismiss(); });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(function () { localStorage.clear(); });
    await page.reload({ waitUntil: 'load' });
    const fs = require('fs');
    if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
    const shot = async function (name) { if (SHOTS) await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }); };
    const overflow = async function () { return page.evaluate(function () { return document.documentElement.scrollWidth > window.innerWidth + 1; }); };
    const click = async function (sel) { await page.waitForSelector(sel, { timeout: 4000 }); await page.click(sel); await new Promise(function (r) { setTimeout(r, 60); }); };

    check(await page.$eval('.title', function (e) { return e.textContent; }) === 'Мой компьютерный клуб', 'заголовок');
    check((await page.$$('.tile')).length === 6, '6 плиток показателей');
    await shot('01-plan');
    // инфо-попап
    await click('[data-key="info-capital"]');
    check(!!(await page.$('.modal')), 'попап «i» открывается');
    await page.keyboard.press('Escape');
    check(!(await page.$('.modal')), 'попап закрывается Esc');
    // онбординг
    await click('[data-key="c-esport"]');
    await click('[data-key="l-ip"]');
    await shot('02-rent');
    await click('[data-key="loc-campus"]');
    for (let i = 0; i < 12; i++) await click('[data-key="seat-gaming-p"]');
    await click('[data-key="furn-1"]');
    await shot('03-equip');
    await click('[data-key="finish-equip"]');
    await click('[data-key="staff-admin-p"]');
    await click('[data-key="staff-cleaner-p"]');
    await click('[data-key="finish-staff"]');
    await click('[data-key="camp-social"]');
    await click('[data-key="open-club"]');
    let st = await page.evaluate(function () { return { phase: CC.app.state.phase, seats: CC.economy.seatsTotal(CC.app.state), cash: CC.app.state.cash }; });
    check(st.phase === 'running' && st.seats === 12, 'клуб открыт с 12 ПК, денег ' + Math.round(st.cash));
    // дни
    for (let i = 0; i < 12; i++) {
      const ev = await page.$('.modal');
      if (ev) { const b = await page.$('.modal .opt:not([disabled])'); if (b) await b.click(); else await page.keyboard.press('Escape'); await new Promise(function (r) { setTimeout(r, 60); }); }
      const btn = await page.$('[data-key="next-day"]:not([disabled])');
      if (btn) { await btn.click(); await new Promise(function (r) { setTimeout(r, 40); }); }
      else { await page.evaluate(function () { if (CC.app.state.pendingEvent) CC.events.autoResolve(CC.app.state); CC.app.render(); }); }
    }
    await page.evaluate(function () { CC.ui.closeAllModals(); });
    st = await page.evaluate(function () { return { day: CC.app.state.day, hist: CC.app.state.history.length }; });
    check(st.day >= 10, 'прошло дней: ' + st.day);
    await page.evaluate(function () { window.scrollTo(0, 0); });
    await shot('04-overview');
    check(!(await overflow()), 'нет горизонтальной прокрутки (обзор)');
    // автоигра 4x
    await click('[data-key="speed-3"]');
    await new Promise(function (r) { setTimeout(r, 5800); });
    await page.evaluate(function () { CC.ui.closeAllModals(); if (CC.app.state.pendingEvent) CC.events.autoResolve(CC.app.state); });
    await click('[data-key="speed-0"]');
    const d2 = await page.evaluate(function () { return CC.app.state.day; });
    check(d2 > st.day, 'автоигра продвигает дни (' + st.day + ' → ' + d2 + ')');
    for (const tab of ['hall', 'staff', 'marketing', 'finance']) {
      await click('#tab-' + tab);
      await page.evaluate(function () { window.scrollTo(0, 0); });
      check(!(await overflow()), 'нет горизонтальной прокрутки: ' + tab);
      await shot('05-' + tab);
    }
    // ползунок цены
    await page.evaluate(function () { const r = document.getElementById('price-range'); r.value = '200'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); });
    check(await page.evaluate(function () { return CC.app.state.price; }) === 200, 'цена меняется ползунком');
    // меню и модалки
    await click('#burger');
    check(await page.$eval('#drawer', function (e) { return !e.hidden; }), 'меню открывается');
    await shot('06-menu');
    await page.keyboard.press('Escape');
    await click('[data-key="goal"]');
    await shot('07-goals');
    await page.keyboard.press('Escape');
    // сохранение и перезагрузка
    const before = await page.evaluate(function () { return JSON.stringify({ d: CC.app.state.day, c: Math.round(CC.app.state.cash), s: CC.app.state.rng.s }); });
    await page.reload({ waitUntil: 'load' });
    const after = await page.evaluate(function () { return JSON.stringify({ d: CC.app.state.day, c: Math.round(CC.app.state.cash), s: CC.app.state.rng.s }); });
    check(before === after, 'автосохранение переживает перезагрузку');
    // повреждённое сохранение
    await page.evaluateOnNewDocument(function () {
      if (!sessionStorage.getItem('corrupt-once')) { sessionStorage.setItem('corrupt-once', '1'); localStorage.setItem('computerClubGame.save.v1', '{"version":1,"cash":"<img src=x onerror=alert(1)>"'); }
    });
    await page.reload({ waitUntil: 'load' });
    await new Promise(function (r) { setTimeout(r, 400); });
    check(await page.evaluate(function () { return /повреждено/.test(document.getElementById('toast').textContent); }), 'показано сообщение о повреждённом сохранении');
    check(await page.evaluate(function () { return CC.app.state.phase === 'setup' && CC.app.state.day === 0; }), 'повреждённое сохранение → новая игра');
    // импорт: вредоносные строки не исполняются
    const ok = await page.evaluate(function () {
      const s = CC.state.createState('xss'); s.seed = '<img src=x onerror="window.__xss=1">';
      s.log.push({ day: 0, text: '<img src=x onerror="window.__xss=1">', kind: 'info' });
      return CC.app.loadText(JSON.stringify(s));
    });
    await new Promise(function (r) { setTimeout(r, 200); });
    check(ok && !(await page.evaluate(function () { return window.__xss; })), 'импорт с HTML-строками безопасен');
    // тёмная тема
    await page.evaluate(function () { CC.app.setTheme('dark'); });
    await shot('08-dark-setup');
    // ширина 320
    await page.setViewport({ width: 320, height: 700, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluate(function () { CC.app.setTheme('light'); });
    check(!(await overflow()), 'нет горизонтальной прокрутки на 320px');
    await shot('09-320');
    // десктоп
    await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
    await page.evaluate(function () {
      const s = CC.state.createState('desk');
      const Q = CC.quests, E = CC.economy;
      Q.chooseConcept(s, 'esport'); Q.chooseLegal(s, 'ip'); Q.chooseLocation(s, 'campus');
      E.buySeats(s, 'gaming', 16); Q.finishEquipment(s); E.hire(s, 'admin'); E.hire(s, 'admin'); Q.finishStaff(s); Q.openClub(s);
      for (let i = 0; i < 40; i++) { if (s.pendingEvent) CC.events.autoResolve(s); E.simulateDay(s); }
      if (s.pendingEvent) CC.events.autoResolve(s);
      CC.app.loadText(JSON.stringify(s));
    });
    await page.evaluate(function () { CC.ui.closeAllModals(); });
    await shot('10-desktop');
    await click('#tab-finance');
    await shot('11-desktop-finance');
  } catch (e) { failed = true; console.error(e); }
  await browser.close();
  srv.close();
  const real = errors.filter(function (e) { return !/favicon/.test(e); });
  if (real.length) { failed = true; console.error('Ошибки консоли:\n' + real.join('\n')); } else console.log('ok - консоль без ошибок');
  process.exit(failed ? 1 : 0);
})();
