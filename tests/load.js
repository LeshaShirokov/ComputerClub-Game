// Загружает игровые модули в Node (они пишут в globalThis.CC).
'use strict';
const path = require('path');
const files = ['core', 'data', 'state', 'economy', 'events', 'quests', 'storage'];
function load() {
  for (const f of files) {
    const p = path.join(__dirname, '..', 'js', f + '.js');
    delete require.cache[require.resolve(p)];
  }
  delete globalThis.CC;
  for (const f of files) require(path.join(__dirname, '..', 'js', f + '.js'));
  return globalThis.CC;
}
module.exports = load;
