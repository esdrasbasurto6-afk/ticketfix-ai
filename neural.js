const tf = require('@tensorflow/tfjs');
const fs = require('fs');

let vocabulario = [];
let modeloCategoria;
let modeloPrioridad;

// 1. PREPROCESAMIENTO: Stop words básicas en español
const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'de', 'del', 'a', 'en', 'con', 'por', 'para', 'que', 'mi', 'su', 'se', 'es', 'al']);

function tokenizar(texto) {
    // Convertir a minúsculas, extraer palabras y filtrar stop words
    const tokens = texto.toLowerCase().match(/\b\w+\b/g) || [];
    return tokens.filter(palabra => !stopWords.has(palabra));
}

// 2. VECTORIZACIÓN: Usando frecuencia en lugar de solo 1 y 0
function textoAVector(texto) {
    const tokens = tokenizar(texto);
    return vocabulario.map(palabra => {
        // Cuenta cuántas veces aparece la palabra en el texto del usuario
        return tokens.filter(t => t === palabra).length; 
    });
}

async function entrenarRedes() {
    console.log("🧠 Iniciando ciclo de entrenamiento de la Red Neuronal...");
    
    const datos = JSON.parse(fs.readFileSync('./dataset.json', 'utf8'));

    const todasLasPalabras = new Set();
    datos.forEach(item => tokenizar(item.texto).forEach(p => todasLasPalabras.add(p)));
    vocabulario = Array.from(todasLasPalabras);

    const entradasX = tf.tensor2d(datos.map(item => textoAVector(item.texto)));
    const salidasYCategoria = tf.oneHot(tf.tensor1d(datos.map(item => item.categoria), 'int32'), 5); 
    const salidasYPrioridad = tf.oneHot(tf.tensor1d(datos.map(item => item.prioridad), 'int32'), 4);

    // 3. ARQUITECTURA OPTIMIZADA CON DROPOUT
    modeloCategoria = tf.sequential();
    modeloCategoria.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [vocabulario.length] }));
    modeloCategoria.add(tf.layers.dropout({ rate: 0.3 })); // Previene el overfitting apagando el 30% de neuronas
    modeloCategoria.add(tf.layers.dense({ units: 5, activation: 'softmax' }));
    modeloCategoria.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

    modeloPrioridad = tf.sequential();
    modeloPrioridad.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [vocabulario.length] }));
    modeloPrioridad.add(tf.layers.dropout({ rate: 0.3 }));
    modeloPrioridad.add(tf.layers.dense({ units: 4, activation: 'softmax' }));
    modeloPrioridad.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

   // 4. ENTRENAMIENTO — con callback explícito para ver accuracy y val_accuracy sin depender del logger automático
function crearCallbackLog(nombreModelo) {
    return {
        onEpochEnd: (epoch, logs) => {
            // Solo mostramos cada 10 epochs para no saturar la consola, más el primero
            if ((epoch + 1) % 10 === 0 || epoch === 0) {
                const acc = logs.acc ?? logs.accuracy;
                const valAcc = logs.val_acc ?? logs.val_accuracy;
                console.log(
                    `[${nombreModelo}] Epoch ${epoch + 1}/120 — accuracy: ${acc?.toFixed(3)} | val_accuracy: ${valAcc?.toFixed(3)}`
                );
            }
        }
    };
}

const historyCategoria = await modeloCategoria.fit(entradasX, salidasYCategoria, {
    epochs: 120,
    validationSplit: 0.15,
    callbacks: crearCallbackLog('Categoria')
});

const historyPrioridad = await modeloPrioridad.fit(entradasX, salidasYPrioridad, {
    epochs: 120,
    validationSplit: 0.15,
    callbacks: crearCallbackLog('Prioridad')
});

// Resumen final claro, para comparar antes/después de agregar más datos
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

mostrarResumenFinal('Categoria', historyCategoria);
mostrarResumenFinal('Prioridad', historyPrioridad);
}

// 5. PREDICCIÓN
function predecirTicket(texto) {
    const vectorCrudo = textoAVector(texto);
    
    // Si la suma del vector es 0, no reconoció ninguna palabra clave
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

    // Limpieza de memoria (importante en TF.js)
    vectorEntrada.dispose();
    prediccionCat.dispose();
    prediccionPrio.dispose();

    return {
        categoria: nombresCategorias[indiceCat],
        prioridad: nombresPrioridades[indicePrio]
    };
}

module.exports = { entrenarRedes, predecirTicket };