// utils/confirmacion.js

// Palabras/frases que indican que el PROBLEMA se resolvió (resultado real)
const PATRONES_RESULTADO_POSITIVO = [
    /ya (funciona|imprime|enciende|conecta|prende|carga|abre|anda)/i,
    /(sí|si) (funciona|imprime|enciende|conecta|prende)/i,
    /(se resolvi[oó]|qued[oó] resuelto|qued[oó] listo|est[aá] resuelto)/i,
    /gracias.*(funciona|resuelto|listo|arregl[oó])/i,
    /(funciona|imprime|enciende|conecta) (perfecto|bien|correctamente)/i
];

// Frases que solo confirman EJECUCIÓN de la acción, sin decir si el problema se resolvió
const PATRONES_SOLO_EJECUCION = [
    /^ya (lo )?hice$/i,
    /^ya (est[aá]|qued[oó])$/i,
    /^listo$/i,
    /^ya lo intent[eé]$/i,
    /^hecho$/i,
    /^ya segu[ií] los pasos$/i,
    /^ya (lo )?probé$/i
];

function clasificarConfirmacion(mensaje) {
    const texto = mensaje.trim();

    const tieneResultadoPositivo = PATRONES_RESULTADO_POSITIVO.some(regex => regex.test(texto));
    if (tieneResultadoPositivo) {
        return 'RESULTADO_CONFIRMADO'; // el problema real se solucionó
    }

    const esSoloEjecucion = PATRONES_SOLO_EJECUCION.some(regex => regex.test(texto));
    if (esSoloEjecucion) {
        return 'SOLO_EJECUCION'; // hizo la acción, pero no dijo si funcionó
    }

    return 'INDETERMINADO'; // no coincide con ningún patrón conocido, dejamos que el LLM decida
}

module.exports = { clasificarConfirmacion };