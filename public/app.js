"use strict";

// Aquí guardaremos la memoria de toda la charla
let historialConversacion = [];
let ticketActivo = true;
let sessionId = generarSessionId();

// Genera un identificador único de sesión (usa crypto.randomUUID si el navegador lo soporta)
function generarSessionId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    // Fallback simple para navegadores sin soporte de randomUUID
    return 'sesion-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

// Función para actualizar la etiqueta de conexión (arriba)
function setStatus(message, type = "info") {
    const statusEl = document.querySelector("#connection-status");
    if (!statusEl) return;
    statusEl.textContent = message;
    if (type === "error") {
        statusEl.style.borderColor = "#ef4444";
        statusEl.style.color = "#f87171";
    } else if (type === "success") {
        statusEl.style.borderColor = "#10b981";
        statusEl.style.color = "#34d399";
    } else {
        statusEl.style.borderColor = "#475569";
        statusEl.style.color = "#fbbf24";
    }
}

// Función para crear las burbujas de chat en la pantalla
function agregarMensajeAlChat(rol, texto) {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `mensaje ${rol}`; // 'user' o 'ai'
    
    const icon = rol === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
    const name = rol === 'user' ? 'Tú' : 'TicketFix AI';

    // Formateamos el texto reemplazando saltos de línea por <br>
    msgDiv.innerHTML = `
        <div class="msg-header">${icon} ${name}</div>
        <div class="msg-body">${texto.replace(/\n/g, '<br>')}</div>
    `;
    
    chatBox.appendChild(msgDiv);
    // Hacemos scroll automático hacia abajo
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Función principal que envía mensajes al backend
async function enviarMensaje() {
    if (!ticketActivo) return;

    const input = document.getElementById('ticket-input');
    const btn = document.getElementById('submit-btn');
    const mensaje = input.value.trim();
    
    if (!mensaje) return;

    // 1. Mostrar el mensaje del usuario en la pantalla y guardarlo en el historial
    agregarMensajeAlChat('user', mensaje);
    historialConversacion.push({ role: 'user', content: mensaje });
    
    // 2. Limpiar el cuadro de texto y prepararse para la respuesta
    input.value = '';
    btn.disabled = true;
    setStatus("Escribiendo...", "info");

    // Agregar indicador visual de "La IA está escribiendo..."
    const chatBox = document.getElementById('chat-box');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'typing-indicator';
    loadingDiv.className = 'mensaje ai';
    loadingDiv.innerHTML = `<div class="msg-header"><i class="fa-solid fa-robot"></i> TicketFix AI</div><div class="msg-body"><i class="fa-solid fa-ellipsis fa-fade"></i> Pensando...</div>`;
    if(chatBox) {
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    try {
        // 3. Enviar todo el historial de conversación al servidor local, junto con el sessionId
        const response = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ historial: historialConversacion, sessionId })
        });

        const data = await response.json();

        // Quitar indicador de "Pensando..."
        const indicator = document.getElementById('typing-indicator');
        if(indicator) indicator.remove();

        if (!response.ok || !data.ok) throw new Error(data?.error || "Error en el servidor");
        
        const res = data.result;

        // 4. Mostrar el mensaje de la IA en pantalla y agregarlo al historial
        agregarMensajeAlChat('ai', res.respuesta_chat);
        historialConversacion.push({ role: 'assistant', content: res.respuesta_chat });

        // 5. Actualizar el panel lateral con el estado del ticket y diagnósticos
        actualizarPanelTicket(res);
        setStatus("🟢 Servidor activo", "success");

        // 6. Verificar si el asistente decidió cerrar el ticket (Resuelto o Escalado)
        if (res.estado_ticket === "Resuelto" || res.estado_ticket === "Escalado") {
            ticketActivo = false;
            input.disabled = true;
            input.placeholder = `El ticket ha sido ${res.estado_ticket}. Usa el botón de Nuevo Chat.`;
            btn.disabled = true;
        }

    } catch (error) {
        console.error("Error:", error);
        const indicator = document.getElementById('typing-indicator');
        if(indicator) indicator.remove();
        
        setStatus("❌ Error en la conexión", "error");
        agregarMensajeAlChat('ai', "Lo siento, tuve un problema al procesar tu solicitud. Intenta de nuevo.");
    } finally {
        if (ticketActivo) btn.disabled = false;
        input.focus();
    }
}

// Actualiza las etiquetas (Red Neuronal) en tiempo real en la pantalla
function actualizarPanelTicket(res) {
    const resultsDiv = document.getElementById('results-panel');
    if (resultsDiv) resultsDiv.classList.remove('hidden');

    const elCategoria = document.getElementById('badge-categoria');
    if (elCategoria) elCategoria.textContent = `📂 ${res.categoria || "Desconocido"}`;
    
    const elPrioridad = document.getElementById('badge-prioridad');
    if (elPrioridad) {
        const prio = (res.prioridad || "Media").toLowerCase();
        elPrioridad.textContent = `🚨 Prioridad: ${res.prioridad || "Media"}`;
        elPrioridad.className = `badge ${prio.includes('alta') ? 'alta' : prio.includes('baja') ? 'baja' : 'media'}`;
    }

    const elEstado = document.getElementById('badge-estado');
    if (elEstado) {
        elEstado.textContent = `📌 Estado: ${res.estado_ticket || "Abierto"}`;
        elEstado.className = `badge ${res.estado_ticket === 'Resuelto' ? 'baja' : res.estado_ticket === 'Escalado' ? 'alta' : 'media'}`;
    }

    const elDepto = document.getElementById('res-departamento');
    if (elDepto) elDepto.textContent = res.departamento || "Mesa de Ayuda";
    
    const elTecnico = document.getElementById('res-tecnico');
    if (elTecnico) {
        elTecnico.textContent = res.requiere_tecnico ? "⚠️ SÍ, derivar a técnico." : "✅ NO, en auto-resolución.";
    }
}

// Reinicia la conversación por completo
function limpiarChat() {
    historialConversacion = [];
    ticketActivo = true;
    sessionId = generarSessionId(); // Nueva sesión = nuevo estado en el servidor

    const chatBox = document.getElementById('chat-box');
    if (chatBox) chatBox.innerHTML = '';
    
    const resultsDiv = document.getElementById('results-panel');
    if (resultsDiv) resultsDiv.classList.add('hidden');

    const input = document.getElementById('ticket-input');
    const btn = document.getElementById('submit-btn');
    
    if (input) {
        input.disabled = false;
        input.value = '';
        input.placeholder = "Escribe aquí tu problema técnico...";
        input.focus();
    }
    if (btn) btn.disabled = false;

    // Mensaje inicial del bot al limpiar la pantalla
    agregarMensajeAlChat('ai', "¡Hola! Soy TicketFix AI, tu ingeniero de soporte técnico. \n\n¿En qué puedo ayudarte el día de hoy?");
}

// Configuración de los eventos iniciales
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("submit-btn");
    if(btn) btn.addEventListener("click", enviarMensaje);
    
    const clearBtn = document.getElementById("clear-btn");
    if(clearBtn) clearBtn.addEventListener("click", limpiarChat);

    const input = document.getElementById("ticket-input");
    if(input) {
        // Enviar mensaje al presionar "Enter" sin shift
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
            }
        });
    }

    // Chequeo de servidor
    fetch("/api/health")
        .then(res => res.json())
        .then(data => {
            if (data.ok) setStatus(`🟢 Servidor activo (${data.model || "Ollama"})`, "success");
            else setStatus("⚠️ Servidor con problemas", "error");
        })
        .catch(() => setStatus("❌ Servidor desconectado", "error"));

    // Inicia el chat con el mensaje de bienvenida
    limpiarChat(); 
});