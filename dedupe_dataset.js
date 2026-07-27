// dedupe_dataset.js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./dataset.json', 'utf8'));
const vistos = new Set();
const limpio = data.filter(item => {
    if (vistos.has(item.texto)) return false;
    vistos.add(item.texto);
    return true;
});
console.log(`Original: ${data.length} → Limpio: ${limpio.length} (se quitaron ${data.length - limpio.length} duplicados)`);
fs.writeFileSync('./dataset.json', JSON.stringify(limpio, null, 2));