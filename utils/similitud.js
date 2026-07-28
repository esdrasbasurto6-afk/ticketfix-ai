// utils/similitud.js

const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'de', 'del', 'a', 'en', 'con', 'por', 'para', 'que', 'mi', 'su', 'se', 'es', 'al', 'vamos', 'intenta', 'intentar', 'prueba', 'probar', 'algo', 'diferente', 'distinto']);

function tokenizar(texto) {
    const tokens = texto.toLowerCase().match(/\b\w+\b/g) || [];
    return new Set(tokens.filter(t => !stopWords.has(t) && t.length > 2));
}

// Similitud de Jaccard: intersección / unión de palabras clave entre dos textos
function calcularSimilitud(textoA, textoB) {
    const a = tokenizar(textoA);
    const b = tokenizar(textoB);
    if (a.size === 0 || b.size === 0) return 0;

    let interseccion = 0;
    for (const palabra of a) {
        if (b.has(palabra)) interseccion++;
    }
    const union = new Set([...a, ...b]).size;
    return interseccion / union;
}

module.exports = { calcularSimilitud };