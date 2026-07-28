// corregir_inconsistencias.js
const fs = require('fs');
const dataset = JSON.parse(fs.readFileSync('./dataset.json', 'utf8'));

// Mapa texto exacto -> nueva prioridad
const correcciones = {
    "señal del wifi llega muy debil hasta la ultima oficina del pasillo": 1,
    "el cable de red se sale del conector cada vez que me muevo": 1,
    "la señal del wifi llega muy debil hasta la ultima oficina del pasillo": 1,
    "mi teclado numerico dejo de escribir de la nada": 1,
};

let corregidos = 0;
dataset.forEach(item => {
    // Búsqueda flexible por substring, ya que arriba puse versiones abreviadas
    for (const [textoParcial, nuevaPrioridad] of Object.entries(correcciones)) {
        if (item.texto.includes(textoParcial.slice(0, 30)) && item.prioridad !== nuevaPrioridad) {
            console.log(`Corrigiendo: "${item.texto}" | ${item.prioridad} → ${nuevaPrioridad}`);
            item.prioridad = nuevaPrioridad;
            corregidos++;
        }
    }
});

console.log(`✅ Total corregidos: ${corregidos}`);
fs.writeFileSync('./dataset.json', JSON.stringify(dataset, null, 2));