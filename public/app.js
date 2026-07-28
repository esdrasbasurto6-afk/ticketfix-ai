"use strict";

// Aquí guardaremos la memoria de toda la charla
let historialConversacion = [];
let ticketActivo = true;
let sessionId = generarSessionId();

function generarSessionId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'sesion-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

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

// ---------------------------------------------------------
// Función para crear las burbujas de chat en la pantalla
// NUEVO: acepta un cuarto parámetro opcional `iconoPaso` (ej. "fa-wifi")
// que se muestra como badge visual arriba del texto, cuando el mensaje
// viene de un playbook con un paso ilustrado.
// ---------------------------------------------------------
function agregarMensajeAlChat(rol, texto, iconoPaso) {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `mensaje ${rol}`;

    const icon = rol === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
    const name = rol === 'user' ? 'Tú' : 'TicketFix AI';

    const badgeIcono = iconoPaso
        ? `<div class="paso-icono-badge"><i class="fa-solid ${iconoPaso}"></i></div>`
        : '';

    msgDiv.innerHTML = `
        <div class="msg-header">${icon} ${name}</div>
        ${badgeIcono}
        <div class="msg-body">${texto.replace(/\n/g, '<br>')}</div>
    `;

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------------------------------------------------------
// Botones de confirmación rápida (Sí/No) tras cada paso de solución
// ---------------------------------------------------------
function mostrarBotonesConfirmacion() {
    quitarBotonesConfirmacion();

    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    const contenedor = document.createElement('div');
    contenedor.id = 'confirmacion-rapida';
    contenedor.className = 'confirmacion-rapida';
    contenedor.innerHTML = `
        <button type="button" class="btn-confirm btn-confirm-si">
            <i class="fa-solid fa-check"></i> Sí, ya funciona
        </button>
        <button type="button" class="btn-confirm btn-confirm-no">
            <i class="fa-solid fa-xmark"></i> No, sigue el problema
        </button>
    `;
    chatBox.appendChild(contenedor);
    chatBox.scrollTop = chatBox.scrollHeight;

    contenedor.querySelector('.btn-confirm-si').addEventListener('click', () => {
        quitarBotonesConfirmacion();
        enviarMensaje('Sí, ya funciona correctamente.');
    });

    contenedor.querySelector('.btn-confirm-no').addEventListener('click', () => {
        quitarBotonesConfirmacion();
        enviarMensaje('No, el problema sigue igual.');
    });
}

function quitarBotonesConfirmacion() {
    const existente = document.getElementById('confirmacion-rapida');
    if (existente) existente.remove();
}

// ---------------------------------------------------------
// Función principal — acepta un mensaje manual opcional (para los botones)
// ---------------------------------------------------------
async function enviarMensaje(mensajeManual) {
    if (!ticketActivo) return;

    const input = document.getElementById('ticket-input');
    const btn = document.getElementById('submit-btn');
    const mensaje = mensajeManual !== undefined ? mensajeManual : input.value.trim();

    if (!mensaje) return;

    quitarBotonesConfirmacion();

    agregarMensajeAlChat('user', mensaje);
    historialConversacion.push({ role: 'user', content: mensaje });

    if (mensajeManual === undefined) {
        input.value = '';
    }
    btn.disabled = true;
    setStatus("Escribiendo...", "info");

    const chatBox = document.getElementById('chat-box');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'typing-indicator';
    loadingDiv.className = 'mensaje ai';
    loadingDiv.innerHTML = `<div class="msg-header"><i class="fa-solid fa-robot"></i> TicketFix AI</div><div class="msg-body"><i class="fa-solid fa-ellipsis fa-fade"></i> Pensando...</div>`;
    if (chatBox) {
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    try {
        const response = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ historial: historialConversacion, sessionId })
        });

        const data = await response.json();

        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();

        if (!response.ok || !data.ok) throw new Error(data?.error || "Error en el servidor");

        const res = data.result;

        // NUEVO: pasamos res.icono_paso como cuarto argumento
        agregarMensajeAlChat('ai', res.respuesta_chat, res.icono_paso);
        historialConversacion.push({ role: 'assistant', content: res.respuesta_chat });

        actualizarPanelTicket(res);
        setStatus("🟢 Servidor activo", "success");

        if (res.estado_ticket === "Abierto" && res.es_paso_de_solucion === true) {
            mostrarBotonesConfirmacion();
        }

        if (res.estado_ticket === "Resuelto" || res.estado_ticket === "Escalado") {
            ticketActivo = false;
            input.disabled = true;
            input.placeholder = `El ticket ha sido ${res.estado_ticket}. Usa el botón de Nuevo Chat.`;
            btn.disabled = true;
        }

    } catch (error) {
        console.error("Error:", error);
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();

        setStatus("❌ Error en la conexión", "error");
        agregarMensajeAlChat('ai', "Lo siento, tuve un problema al procesar tu solicitud. Intenta de nuevo.");
    } finally {
        if (ticketActivo) btn.disabled = false;
        input.focus();
    }
}

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

function limpiarChat() {
    historialConversacion = [];
    ticketActivo = true;
    sessionId = generarSessionId();

    quitarBotonesConfirmacion();

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

    agregarMensajeAlChat('ai', "¡Hola! Soy TicketFix AI, tu ingeniero de soporte técnico. \n\n¿En qué puedo ayudarte el día de hoy?");
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("submit-btn");
    if (btn) btn.addEventListener("click", () => enviarMensaje());

    const clearBtn = document.getElementById("clear-btn");
    if (clearBtn) clearBtn.addEventListener("click", limpiarChat);

    const input = document.getElementById("ticket-input");
    if (input) {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
            }
        });
    }

    fetch("/api/health")
        .then(res => res.json())
        .then(data => {
            if (data.ok) setStatus(`🟢 Servidor activo (${data.model || "Ollama"})`, "success");
            else setStatus("⚠️ Servidor con problemas", "error");
        })
        .catch(() => setStatus("❌ Servidor desconectado", "error"));

    limpiarChat();
});