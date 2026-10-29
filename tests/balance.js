// Балансная симуляция: node tests/balance.js [число зёрен]
// Реальное время до победы считается для автоигры 4× (2,5 с/день) и 2× (3,5 с/день).
'use strict';
const { run } = require('./strategies');
const n = Number(process.argv[2]) || 6;
const names = ['doNothing', 'reasonable', 'aggressiveDebt'];
let bad = 0;
for (const name of names) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(run(name, 'seed-' + i, 1000));
  console.log('\n== ' + name + ' ==');
  for (const r of rows) {
    console.log(`  ${r.seed}: ${r.won ? 'ПОБЕДА' : r.phase === 'over' ? 'БАНКРОТ' : 'идёт'} на день ${r.day}; капитал ${r.net.toLocaleString('ru-RU')} ₽; мин. касса ${r.minCash.toLocaleString('ru-RU')} ₽; рейтинг ${r.rating}; ПК ${r.seats}; цели: ${r.goalDays.join(', ')}`);
  }
  const wins = rows.filter(r => r.won);
  if (wins.length) {
    const avg = wins.reduce((a, r) => a + r.day, 0) / wins.length;
    console.log(`  побед ${wins.length}/${n}; средний день победы ${Math.round(avg)} ≈ ${Math.round(avg * 2.5 / 60)} мин на 4×, ${Math.round(avg * 3.5 / 60)} мин на 2×`);
  }
  if (name === 'doNothing' && rows.some(r => r.won || r.phase !== 'over')) { bad++; console.log('  !! бездействие не должно выигрывать'); }
  if (name === 'reasonable' && wins.length < n) { bad++; console.log('  !! разумная стратегия должна выигрывать'); }
  if (name === 'aggressiveDebt' && rows.some(r => r.won && r.day < 300)) { bad++; console.log('  !! агрессивные кредиты дают слишком быструю победу'); }
}
process.exit(bad ? 1 : 0);
