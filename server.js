require('dotenv').config();
const express = require('express');
const path = require('path');
const { entrenarRedes, predecirTicket } = require('./neural.js');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5';
const systemPrompt = require('./prompt');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de verificación de salud para la interfaz
app.get('/api/health', (req, res) => {
    res.json({ ok: true, model: OLLAMA_MODEL });
});

app.post('/api/agent', async (req, res) => {
    try {
        // Ahora recibimos un historial de conversación completo o un mensaje único (para retrocompatibilidad)
        const historialUser = req.body.historial || [];
        const mensajeSuelto = req.body.message || req.body.mensaje;

        if (historialUser.length === 0 && !mensajeSuelto) {
            return res.status(400).json({ ok: false, error: "El mensaje es requerido." });
        }

        // Si mandaron un mensaje suelto, lo convertimos en formato historial
        if (historialUser.length === 0 && mensajeSuelto) {
            historialUser.push({ role: 'user', content: mensajeSuelto });
        }

        // ---------------------------------------------------------
        // FASE 1: RED NEURONAL (Clasificamos solo el primer reporte del usuario)
        // ---------------------------------------------------------
        const primerMensaje = historialUser.find(m => m.role === 'user')?.content || "";
        const clasificacion = predecirTicket(primerMensaje);
        console.log("🧠 Predicción Red Neuronal (Contexto Inicial):", clasificacion);

        // ---------------------------------------------------------
        // FASE 2: LLM OLLAMA (Generación Conversacional Paso a Paso)
        // ---------------------------------------------------------

        // 1. Contamos cuántos mensajes ha enviado el usuario en toda la conversación
        const numeroIntentos = historialUser.filter(msg => msg.role === 'user').length;

        // 2. Construimos el historial inyectando el contador exacto para controlar a la IA
        const messagesParaOllama = [
            { role: 'system', content: systemPrompt },
            { 
                role: 'system', 
                content: `INSTRUCCIÓN INTERNA ESTRICTA: 
- Clasificación de Red Neuronal -> Categoría: "${clasificacion.categoria}", Prioridad: "${clasificacion.prioridad}".
- INTENTOS REALIZADOS HASTA AHORA: ${numeroIntentos}
- REGLA MATEMÁTICA: Si los intentos son menores a 3, TIENES PROHIBIDO usar estado_ticket "Escalado". Debes dar un nuevo paso. Si los intentos son 3 o más y el usuario sigue sin poder, DEBES usar "Escalado" obligatoriamente.`
            },
            ...historialUser // Inyectamos toda la conversación pasada
        ];

        let response;
        let respuestaJSON;
        try {
            response = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    messages: messagesParaOllama, // Usamos messages en lugar de prompt
                    stream: false,
                    format: 'json'
                })
            });

            if (!response.ok) throw new Error("Error en Ollama");

            const data = await response.json();
            let textoRespuesta = data.message.content.trim(); // En /chat, la respuesta viene en message.content

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
                estado_ticket: "Escalado"
            };
        }

        // ---------------------------------------------------------
        // FASE 3: SANITIZACIÓN FINAL Y FRANCOTIRADOR DE PREGUNTAS
        // ---------------------------------------------------------
        if (!respuestaJSON.respuesta_chat || respuestaJSON.respuesta_chat.trim() === "") {
            console.log("⚠️ Auditor: La IA devolvió un mensaje vacío. Forzando escalamiento.");
            respuestaJSON.respuesta_chat = "Tuve un pequeño problema de conexión interna. Derivaré tu caso a un especialista humano para que te asista de inmediato.";
            respuestaJSON.requiere_tecnico = true;
            respuestaJSON.departamento = respuestaJSON.departamento || "Soporte Técnico";
            respuestaJSON.estado_ticket = "Escalado";
        }

        // FRANCOTIRADOR: Si el ticket se cierra, DESTRUYE cualquier pregunta rebelde de la IA
        if (respuestaJSON.estado_ticket === "Resuelto" || respuestaJSON.estado_ticket === "Escalado") {
            // Esta línea mágica busca oraciones de pregunta (¿...?) y las borra de la respuesta.
            respuestaJSON.respuesta_chat = respuestaJSON.respuesta_chat.replace(/¿[^?]*\?/g, '').trim();
            
            // Si la IA era tan terca que SU ÚNICA FRASE era una pregunta y quedó vacío, ponemos un texto por defecto
            if (respuestaJSON.respuesta_chat === "") {
                respuestaJSON.respuesta_chat = respuestaJSON.estado_ticket === "Resuelto" 
                    ? "¡Excelente! Me alegra que hayamos podido solucionarlo. Que tengas un gran día."
                    : "No te preocupes, un técnico humano tomará el control de este caso en breve.";
            }
        }
        // FRANCOTIRADOR: Si el ticket se cierra, DESTRUYE cualquier pregunta rebelde de la IA
        if (respuestaJSON.estado_ticket === "Resuelto" || respuestaJSON.estado_ticket === "Escalado") {
            respuestaJSON.respuesta_chat = respuestaJSON.respuesta_chat.replace(/¿[^?]*\?/g, '').trim();
            
            if (respuestaJSON.respuesta_chat === "") {
                respuestaJSON.respuesta_chat = respuestaJSON.estado_ticket === "Resuelto" 
                    ? "¡Excelente! Me alegra que hayamos podido solucionarlo. Que tengas un gran día."
                    : "No te preocupes, un técnico humano tomará el control de este caso en breve.";
            }
        }

        // LIMPIADOR DE CARACTERES: Elimina saltos de línea literales y tabulaciones del JSON
        if (respuestaJSON.respuesta_chat) {
            respuestaJSON.respuesta_chat = respuestaJSON.respuesta_chat
                .replace(/\\n/g, ' ')  // Cambia los \n por espacios
                .replace(/\\t/g, ' ')  // Cambia los \t por espacios
                .replace(/\n/g, ' ')   // Por si vienen sin la barra invertida
                .replace(/\t/g, ' ');
        }

        // Estructura exacta que app.js espera recibir
        return res.json({
            ok: true,
            result: respuestaJSON,
            meta: { timestamp: new Date().toISOString(), model: OLLAMA_MODEL },
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