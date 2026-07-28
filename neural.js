const tf = require('@tensorflow/tfjs');
const fs = require('fs');

let vocabulario = [];
let modeloCategoria;
let modeloPrioridad;

const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'de', 'del', 'a', 'en', 'con', 'por', 'para', 'que', 'mi', 'su', 'se', 'es', 'al']);

function tokenizar(texto) {
    const tokens = texto.toLowerCase().match(/\b\w+\b/g) || [];
    return tokens.filter(palabra => !stopWords.has(palabra));
}

function textoAVector(texto) {
    const tokens = tokenizar(texto);
    return vocabulario.map(palabra => tokens.filter(t => t === palabra).length);
}

function calcularPesosPorClase(etiquetas, numClases) {
    const conteos = new Array(numClases).fill(0);
    etiquetas.forEach(e => conteos[e]++);
    const total = etiquetas.length;
    const pesos = conteos.map(conteo => conteo > 0 ? total / (numClases * conteo) : 0);
    console.log('⚖️  Pesos por clase calculados:', pesos.map(p => p.toFixed(2)));
    return pesos;
}

function crearCallbackLog(nombreModelo) {
    return {
        onEpochEnd: (epoch, logs) => {
            if ((epoch + 1) % 10 === 0 || epoch === 0) {
                const acc = logs.acc ?? logs.accuracy;
                const valAcc = logs.val_acc ?? logs.val_accuracy;
                console.log(`[${nombreModelo}] Epoch ${epoch + 1}/120 — accuracy: ${acc?.toFixed(3)} | val_accuracy: ${valAcc?.toFixed(3)}`);
            }
        }
    };
}

function mostrarResumenFinal(nombreModelo, history) {
    const acc = history.history.acc ?? history.history.accuracy;
    const valAcc = history.history.val_acc ?? history.history.val_accuracy;
    const ultimo = acc.length - 1;
    console.log(`\n📊 RESUMEN FINAL [${nombreModelo}]`);
    console.log(`   accuracy final (entrenamiento): ${acc[ultimo].toFixed(3)}`);
    console.log(`   val_accuracy final (validación): ${valAcc[ultimo].toFixed(3)}`);
    if (acc[ultimo] - valAcc[ultimo] > 0.15) {
        console.log(`   ⚠️ Brecha grande entre accuracy y val_accuracy → señal de sobreajuste (overfitting)`);
    }
}

async function entrenarRedes() {
    console.log("🧠 Iniciando ciclo de entrenamiento de la Red Neuronal...");

    const datos = JSON.parse(fs.readFileSync('./dataset.json', 'utf8'));

    const todasLasPalabras = new Set();
    datos.forEach(item => tokenizar(item.texto).forEach(p => todasLasPalabras.add(p)));
    vocabulario = Array.from(todasLasPalabras);

    // ---------------------------------------------------------
    // MEZCLA MANUAL antes de partir train/validación.
    // validationSplit de tfjs toma el ÚLTIMO % del array tal cual está,
    // y como agregamos datos en bloques por categoría, ese tramo final
    // quedaba sesgado. Mezclamos los índices primero para que la partición
    // sea una muestra representativa real.
    // ---------------------------------------------------------
    const indices = datos.map((_, i) => i);
    tf.util.shuffle(indices);

    const datosOrdenAleatorio = indices.map(i => datos[i]);

    const vectores = datosOrdenAleatorio.map(item => textoAVector(item.texto));
    const etiquetasCategoria = datosOrdenAleatorio.map(item => item.categoria);
    const etiquetasPrioridad = datosOrdenAleatorio.map(item => item.prioridad);

    const corte = Math.floor(datosOrdenAleatorio.length * 0.85);

    // --- Partición de entrenamiento ---
    const vectoresTrain = vectores.slice(0, corte);
    const catTrain = etiquetasCategoria.slice(0, corte);
    const prioTrain = etiquetasPrioridad.slice(0, corte);

    // --- Partición de validación ---
    const vectoresVal = vectores.slice(corte);
    const catVal = etiquetasCategoria.slice(corte);
    const prioVal = etiquetasPrioridad.slice(corte);

    console.log(`📦 Entrenamiento: ${vectoresTrain.length} ejemplos | Validación: ${vectoresVal.length} ejemplos`);

    const xTrain = tf.tensor2d(vectoresTrain);
    const xVal = tf.tensor2d(vectoresVal);

    const yCatTrain = tf.oneHot(tf.tensor1d(catTrain, 'int32'), 5);
    const yCatVal = tf.oneHot(tf.tensor1d(catVal, 'int32'), 5);
    const yPrioTrain = tf.oneHot(tf.tensor1d(prioTrain, 'int32'), 4);
    const yPrioVal = tf.oneHot(tf.tensor1d(prioVal, 'int32'), 4);

    const pesosPrioridad = calcularPesosPorClase(prioTrain, 4);
    const classWeightPrioridad = {};
    pesosPrioridad.forEach((peso, indice) => {
        classWeightPrioridad[indice] = peso;
    });

    modeloCategoria = tf.sequential();
    modeloCategoria.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [vocabulario.length] }));
    modeloCategoria.add(tf.layers.dropout({ rate: 0.3 }));
    modeloCategoria.add(tf.layers.dense({ units: 5, activation: 'softmax' }));
    modeloCategoria.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

    modeloPrioridad = tf.sequential();
    modeloPrioridad.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [vocabulario.length] }));
    modeloPrioridad.add(tf.layers.dropout({ rate: 0.3 }));
    modeloPrioridad.add(tf.layers.dense({ units: 4, activation: 'softmax' }));
    modeloPrioridad.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

    const historyCategoria = await modeloCategoria.fit(xTrain, yCatTrain, {
        epochs: 120,
        validationData: [xVal, yCatVal],
        callbacks: crearCallbackLog('Categoria')
    });

    const historyPrioridad = await modeloPrioridad.fit(xTrain, yPrioTrain, {
        epochs: 120,
        validationData: [xVal, yPrioVal],
        classWeight: classWeightPrioridad,
        callbacks: crearCallbackLog('Prioridad')
    });

    mostrarResumenFinal('Categoria', historyCategoria);
    mostrarResumenFinal('Prioridad', historyPrioridad);

    xTrain.dispose();
    xVal.dispose();
    yCatTrain.dispose();
    yCatVal.dispose();
    yPrioTrain.dispose();
    yPrioVal.dispose();

    console.log("✅ Redes Neuronales entrenadas y listas para predecir.");
}

function predecirTicket(texto) {
    const vectorCrudo = textoAVector(texto);

    if (vectorCrudo.reduce((a, b) => a + b, 0) === 0) {
        return { categoria: 'Desconocido', prioridad: 'Ninguna' };
    }

    const vectorEntrada = tf.tensor2d([vectorCrudo]);

    const prediccionCat = modeloCategoria.predict(vectorEntrada);
    const prediccionPrio = modeloPrioridad.predict(vectorEntrada);

    const indiceCat = prediccionCat.argMax(-1).dataSync()[0];
    const indicePrio = prediccionPrio.argMax(-1).dataSync()[0];

    const nombresCategorias = ['Redes', 'Hardware', 'Software', 'Cuentas/Accesos', 'Desconocido'];
    const nombresPrioridades = ['Baja', 'Media', 'Alta', 'Ninguna'];

    vectorEntrada.dispose();
    prediccionCat.dispose();
    prediccionPrio.dispose();

    return {
        categoria: nombresCategorias[indiceCat],
        prioridad: nombresPrioridades[indicePrio]
    };
}

module.exports = { entrenarRedes, predecirTicket };