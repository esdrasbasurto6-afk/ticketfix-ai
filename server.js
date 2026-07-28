// server.js

require('dotenv').config();
const express = require('express');
const path = require('path');
const { entrenarRedes, predecirTicket } = require('./neural.js');
const { clasificarConfirmacion } = require('./utils/confirmacion');
const { calcularSimilitud } = require('./utils/similitud');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5';
const systemPrompt = require('./prompt');

const LOG_TICKETS_PATH = path.join(__dirname, 'logs', 'tickets_cerrados.jsonl');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------
// ESTADO POR SESIÓN (en memoria — para producción usar Redis)
// ---------------------------------------------------------
// sessionId -> { pasosDeSolucionDados: number, pasosTextos: string[], dispositivoConfirmado: string|null, clasificacionInicial: {categoria, prioridad}|null }
const estadosPorSesion = new Map();

function obtenerOCrearEstado(sessionId) {
    if (!estadosPorSesion.has(sessionId)) {
        estadosPorSesion.set(sessionId, {
            pasosDeSolucionDados: 0,
            pasosTextos: [], // guarda el texto de cada paso ya dado, para detectar repeticiones
            dispositivoConfirmado: null,
            clasificacionInicial: null
        });
    }
    return estadosPorSesion.get(sessionId);
}

// Limpieza simple de sesiones viejas (evita fuga de memoria en correr indefinido)
setInterval(() => {
    // Si quieres expirar sesiones inactivas, aquí podrías guardar un timestamp por sesión y filtrar.
    // Por ahora, con volumen bajo de un demo/interno, un Map simple es suficiente.
}, 1000 * 60 * 60);

// Función simple: agrega una línea al archivo de logs (formato JSONL = un JSON por línea)
function registrarTicketCerrado(datos) {
    try {
        const carpetaLogs = path.dirname(LOG_TICKETS_PATH);
        if (!fs.existsSync(carpetaLogs)) {
            fs.mkdirSync(carpetaLogs, { recursive: true });
        }
        const linea = JSON.stringify(datos) + '\n';
        fs.appendFileSync(LOG_TICKETS_PATH, linea, 'utf8');
    } catch (err) {
        console.error('⚠️ No se pudo guardar el log del ticket:', err);
    }
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, model: OLLAMA_MODEL });
});

app.post('/api/agent', async (req, res) => {
    try {
        const historialUser = req.body.historial || [];
        const mensajeSuelto = req.body.message || req.body.mensaje;
        const sessionId = req.body.sessionId || 'sesion-default';
        const estado = obtenerOCrearEstado(sessionId);

        if (historialUser.length === 0 && !mensajeSuelto) {
            return res.status(400).json({ ok: false, error: "El mensaje es requerido." });
        }

        if (historialUser.length === 0 && mensajeSuelto) {
            historialUser.push({ role: 'user', content: mensajeSuelto });
        }

        // ---------------------------------------------------------
        // CLASIFICACIÓN DE CONFIRMACIÓN — se calcula DESPUÉS de normalizar
        // historialUser, para que también funcione con el formato legacy
        // { message: "..." } y no solo con { historial: [...] }.
        // ---------------------------------------------------------
        const ultimoMensajeUsuario = [...historialUser].reverse().find(m => m.role === 'user')?.content || "";
        const tipoConfirmacion = clasificarConfirmacion(ultimoMensajeUsuario);
        console.log(`🔍 Clasificación de confirmación: "${ultimoMensajeUsuario}" → ${tipoConfirmacion}`);

        let pistaConfirmacion = "";
        if (tipoConfirmacion === 'RESULTADO_CONFIRMADO') {
            pistaConfirmacion = `- PISTA DEL SISTEMA: El último mensaje del usuario SÍ confirma que el problema original se resolvió (detectado por análisis automático). Es válido usar estado_ticket "Resuelto" si corresponde.`;
        } else if (tipoConfirmacion === 'SOLO_EJECUCION') {
            pistaConfirmacion = `- PISTA DEL SISTEMA: El último mensaje del usuario SOLO confirma que ejecutó la acción pedida (ej. "ya lo hice"), NO confirma que el problema esté resuelto. TIENES PROHIBIDO usar estado_ticket "Resuelto" en este turno. Debes preguntar por el resultado o dar el siguiente paso, preguntando explícitamente si el problema original ya se solucionó.`;
        }

        // ---------------------------------------------------------
        // FASE 1: RED NEURONAL — clasificamos SOLO en el primer mensaje de la sesión
        // y luego la tratamos como fuente de verdad (no dejamos que el LLM la cambie).
        // ---------------------------------------------------------
        if (!estado.clasificacionInicial) {
            const primerMensaje = historialUser.find(m => m.role === 'user')?.content || "";
            estado.clasificacionInicial = predecirTicket(primerMensaje);
            console.log("🧠 Predicción Red Neuronal (Contexto Inicial):", estado.clasificacionInicial);
        }
        const clasificacion = estado.clasificacionInicial;

        // ---------------------------------------------------------
        // FASE 2: LLM OLLAMA — usamos el contador de estado real, no mensajes de usuario
        // ---------------------------------------------------------
        const listaPasosPrevios = estado.pasosTextos.length > 0
            ? estado.pasosTextos.map((p, i) => `  ${i + 1}. "${p}"`).join('\n')
            : '  (ninguno todavía)';

        const messagesParaOllama = [
            { role: 'system', content: systemPrompt },
            {
                role: 'system',
                content: `INSTRUCCIÓN INTERNA ESTRICTA (no negociable, no la contradigas en tu salida):
- Categoría FIJA (determinada por clasificador, NO la cambies): "${clasificacion.categoria}"
- Prioridad FIJA (determinada por clasificador, NO la cambies): "${clasificacion.prioridad}"
- Dispositivo ya confirmado en esta sesión: ${estado.dispositivoConfirmado || "NINGUNO - si el usuario no lo ha dicho aún en este mensaje, tu única acción es preguntarlo"}
- PASOS DE SOLUCIÓN REALES YA DADOS (sin contar preguntas de diagnóstico): ${estado.pasosDeSolucionDados}
- PASOS YA INTENTADOS (NO repitas ninguno de estos, ni siquiera reformulado con sinónimos o cambiando detalles menores como "segundos" por "minutos"):
${listaPasosPrevios}
- REGLA MATEMÁTICA: Si pasosDeSolucionDados < 3, TIENES PROHIBIDO usar estado_ticket "Escalado"; da un nuevo paso DISTINTO a los ya intentados. Si pasosDeSolucionDados >= 3 y el usuario sigue sin resolver, DEBES usar "Escalado".
${pistaConfirmacion}
- Recuerda incluir SIEMPRE "es_paso_de_solucion" (true solo si diste una instrucción técnica accionable en este turno; false si preguntaste el equipo, rechazaste el tema, cerraste el ticket, o pediste confirmación de éxito) y "dispositivo_detectado" (string con el equipo si el usuario lo mencionó en su ÚLTIMO mensaje, o null).`
            },
            ...historialUser
        ];

        let respuestaJSON;
        try {
            const response = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    messages: messagesParaOllama,
                    stream: false,
                    format: 'json',
                    options: { temperature: 0.2 }
                })
            });

            if (!response.ok) throw new Error("Error en Ollama");

            const data = await response.json();
            let textoRespuesta = data.message.content.trim();

            if (textoRespuesta.startsWith('```')) {
                textoRespuesta = textoRespuesta.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
            }

            respuestaJSON = JSON.parse(textoRespuesta);
        } catch (ollamaErr) {
            console.error("❌ Advertencia: No se pudo conectar con Ollama o parsear JSON:", ollamaErr);
            respuestaJSON = {
                categoria: clasificacion.categoria,
                prioridad: clasificacion.prioridad,
                departamento: "Soporte General",
                respuesta_chat: "El motor de lenguaje está fuera de línea temporalmente. Su ticket ha sido enviado a la cola de soporte.",
                requiere_tecnico: true,
                estado_ticket: "Escalado",
                es_paso_de_solucion: false,
                dispositivo_detectado: null
            };
        }

        // ---------------------------------------------------------
        // FASE 3: ACTUALIZAR ESTADO DE SESIÓN CON LO QUE DIJO EL LLM
        // ---------------------------------------------------------
        if (respuestaJSON.dispositivo_detectado && !estado.dispositivoConfirmado) {
            estado.dispositivoConfirmado = respuestaJSON.dispositivo_detectado;
        }

        const yaTeniamos3OMasPasos = estado.pasosDeSolucionDados >= 3;

        // Detectamos si el paso que el LLM acaba de dar es muy parecido a uno anterior
        let esRepeticion = false;
        if (respuestaJSON.estado_ticket === "Abierto" && respuestaJSON.es_paso_de_solucion === true) {
            esRepeticion = estado.pasosTextos.some(
                pasoAnterior => calcularSimilitud(pasoAnterior, respuestaJSON.respuesta_chat) >= 0.55
            );
        }

        if (esRepeticion) {
            console.log("⚠️ Auditor: el LLM repitió un paso ya intentado (alta similitud con uno anterior). Forzando escalamiento.");
            respuestaJSON.estado_ticket = "Escalado";
            respuestaJSON.requiere_tecnico = true;
            respuestaJSON.es_paso_de_solucion = false;
            respuestaJSON.respuesta_chat = "No encontramos una alternativa distinta que puedas hacer desde tu equipo para este problema. Voy a derivar tu caso a un técnico humano para que lo revise a fondo.";
        } else if (yaTeniamos3OMasPasos &&
                respuestaJSON.estado_ticket === "Abierto" &&
                respuestaJSON.es_paso_de_solucion === true) {
            console.log("⚠️ Auditor: ya había 3+ pasos previos y el LLM intentó dar otro en vez de escalar. Forzando escalamiento.");
            respuestaJSON.estado_ticket = "Escalado";
            respuestaJSON.requiere_tecnico = true;
            respuestaJSON.es_paso_de_solucion = false;
            respuestaJSON.respuesta_chat = "Ya intentamos varias alternativas desde tu equipo sin éxito. Voy a derivar tu caso a un técnico humano para que lo revise a fondo.";
        } else if (respuestaJSON.estado_ticket === "Abierto" && respuestaJSON.es_paso_de_solucion === true) {
            estado.pasosDeSolucionDados += 1;
            estado.pasosTextos.push(respuestaJSON.respuesta_chat);
        }

        // AUDITOR: si detectamos "SOLO_EJECUCION" pero el LLM de todos modos marcó "Resuelto", lo corregimos
        if (tipoConfirmacion === 'SOLO_EJECUCION' && respuestaJSON.estado_ticket === "Resuelto") {
            console.log("⚠️ Auditor: el LLM marcó 'Resuelto' pero el usuario solo confirmó ejecución, no resultado. Corrigiendo.");
            respuestaJSON.estado_ticket = "Abierto";
            respuestaJSON.es_paso_de_solucion = false;
            respuestaJSON.requiere_tecnico = false;
            respuestaJSON.respuesta_chat = "Perfecto, gracias por confirmar que hiciste el paso. Ahora dime: ¿el problema ya quedó resuelto, o todavía sigue igual?";
        }

        // ---------------------------------------------------------
        // FASE 4: SANITIZACIÓN FINAL
        // ---------------------------------------------------------
        if (!respuestaJSON.respuesta_chat || respuestaJSON.respuesta_chat.trim() === "") {
            console.log("⚠️ Auditor: La IA devolvió un mensaje vacío. Forzando escalamiento.");
            respuestaJSON.respuesta_chat = "Tuve un pequeño problema de conexión interna. Derivaré tu caso a un especialista humano para que te asista de inmediato.";
            respuestaJSON.requiere_tecnico = true;
            respuestaJSON.departamento = respuestaJSON.departamento || "Soporte Técnico";
            respuestaJSON.estado_ticket = "Escalado";
        }

        // FRANCOTIRADOR: si el ticket se cierra, elimina cualquier pregunta rebelde de la IA
        if (respuestaJSON.estado_ticket === "Resuelto" || respuestaJSON.estado_ticket === "Escalado") {
            respuestaJSON.respuesta_chat = respuestaJSON.respuesta_chat.replace(/¿[^?]*\?/g, '').trim();

            if (respuestaJSON.respuesta_chat === "") {
                respuestaJSON.respuesta_chat = respuestaJSON.estado_ticket === "Resuelto"
                    ? "¡Excelente! Me alegra que hayamos podido solucionarlo. Que tengas un gran día."
                    : "No te preocupes, un técnico humano tomará el control de este caso en breve.";
            }
        }

        // LIMPIADOR DE CARACTERES
        if (respuestaJSON.respuesta_chat) {
            respuestaJSON.respuesta_chat = respuestaJSON.respuesta_chat
                .replace(/\\n/g, ' ')
                .replace(/\\t/g, ' ')
                .replace(/\n/g, ' ')
                .replace(/\t/g, ' ');
        }

        // Guardamos el ticket cerrado como futuro dato de entrenamiento
        if (respuestaJSON.estado_ticket === "Resuelto" || respuestaJSON.estado_ticket === "Escalado") {
            const primerMensajeUsuario = historialUser.find(m => m.role === 'user')?.content || "";
            registrarTicketCerrado({
                timestamp: new Date().toISOString(),
                sessionId,
                primerMensaje: primerMensajeUsuario,
                categoriaAsignada: respuestaJSON.categoria,
                prioridadAsignada: respuestaJSON.prioridad,
                estadoFinal: respuestaJSON.estado_ticket,
                totalMensajesUsuario: historialUser.filter(m => m.role === 'user').length
            });
        }

        // Si el ticket se cerró, liberamos el estado de sesión (opcional — o consérvalo para logs/analytics)
        if (respuestaJSON.estado_ticket === "Resuelto" || respuestaJSON.estado_ticket === "Escalado") {
            estadosPorSesion.delete(sessionId);
        }

        return res.json({
            ok: true,
            result: respuestaJSON,
            meta: { timestamp: new Date().toISOString(), model: OLLAMA_MODEL, sessionId },
            technical: respuestaJSON
        });

    } catch (error) {
        console.error("❌ Error general en el servidor híbrido:", error);
        res.status(500).json({ ok: false, error: "Ocurrió un error crítico procesando el reporte." });
    }
});

app.listen(PORT, async () => {
    console.log("Inicializando sistema TicketFix AI conversacional...");
    await entrenarRedes();
    console.log(`🚀 Servidor híbrido corriendo y escuchando en http://localhost:${PORT}`);
});