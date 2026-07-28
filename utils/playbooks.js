// utils/playbooks.js

/**
 * Normaliza las categorías para evitar discrepancias con la Red Neuronal o LLM
 */
const MAPA_CATEGORIAS = {
    "Redes": "Redes",
    "Conectividad": "Redes",
    "Wi-Fi": "Redes",
    "Internet": "Redes",
    "Hardware": "Hardware",
    "Periféricos": "Hardware",
    "Dispositivos": "Hardware",
    "Software": "Software",
    "Sistemas": "Software",
    "Acceso": "Software"
};

/**
 * Catálogo Maestro de Playbooks Deterministas por Categoria::Dispositivo
 */
const PLAYBOOKS = {
    // ==========================================
    // CATEGORÍA: REDES / CONECTIVIDAD
    // ==========================================
    "Redes::windows": [
        {
            icono: "fa-wifi",
            texto: "Haz clic en el ícono de Wi-Fi junto al reloj (esquina inferior derecha). Haz clic derecho o despliega tu red actual y selecciona 'Olvidar red'. Búscala de nuevo en la lista e ingresa la contraseña.",
            pregunta: "¿Ya tienes acceso a internet?"
        },
        {
            icono: "fa-rotate",
            texto: "Abre el menú de Inicio, escribe 'Configuración de red' y presiona Enter. Busca la opción 'Restablecimiento de red', haz clic en 'Restablecer ahora' y confirma. El equipo no perderá tus archivos.",
            pregunta: "¿Ya te conecta correctamente a internet?"
        },
        {
            icono: "fa-terminal",
            texto: "Presiona la tecla Windows, escribe 'cmd', haz clic derecho sobre 'Símbolo del sistema' y selecciona 'Ejecutar como administrador'. Escribe 'ipconfig /flushdns' y presiona Enter. Luego escribe 'netsh winsock reset' y vuelve a presionar Enter.",
            pregunta: "¿Ya te permite navegar en internet?"
        }
    ],

    "Redes::mac": [
        {
            icono: "fa-wifi",
            texto: "Haz clic en el ícono del Wi-Fi en la barra superior (esquina superior derecha) y desactívalo durante 10 segundos. Vuelve a activarlo y selecciona tu red corporativa.",
            pregunta: "¿Ya te conecta a internet?"
        },
        {
            icono: "fa-sliders",
            texto: "Abre 'Ajustes del Sistema' (ícono de manzana > Ajustes del Sistema), ve a 'Red', selecciona 'Wi-Fi' y haz clic en 'Avanzado'. Selecciona tu red de la lista, presiona el botón '—' para eliminarla y vuelve a agregarla ingresando la clave.",
            pregunta: "¿Ya navegaste con éxito?"
        },
        {
            icono: "fa-rotate",
            texto: "Ve a 'Ajustes del Sistema' > 'Red'. En la esquina inferior derecha haz clic en los tres puntos (...), selecciona 'Restablecer servicio de red' y reinicia el equipo.",
            pregunta: "¿Ya recuperaste la conexión a internet?"
        }
    ],

    "Redes::android": [
        {
            icono: "fa-toggle-on",
            texto: "Desliza la barra de notificaciones hacia abajo. Apaga la casilla de Wi-Fi, espera 10 segundos y vuelve a encenderla.",
            pregunta: "¿Ya funciona tu conexión a internet?"
        },
        {
            icono: "fa-wifi",
            texto: "Ve a Ajustes > Conexiones > Wi-Fi. Mantén presionado el nombre de la red de la oficina y selecciona 'Olvidar red'. Selecciónala de nuevo en la lista y vuelve a escribir la contraseña.",
            pregunta: "¿Ya te permite navegar?"
        },
        {
            icono: "fa-plane",
            texto: "Activa el 'Modo Avión' desde el panel rápido por 10 segundos y desactívalo. Esto fuerzo el reinicio de las antenas del celular.",
            pregunta: "¿Ya se restableció la señal y el internet?"
        }
    ],

    "Redes::iphone": [
        {
            icono: "fa-wifi",
            texto: "Ve a Ajustes > Wi-Fi, toca el ícono de información '(i)' al lado de la red corporativa y selecciona 'Olvidar esta red'. Vuelve a conectarte escribiendo la clave.",
            pregunta: "¿Ya te conecta a internet?"
        },
        {
            icono: "fa-plane",
            texto: "Desliza desde la esquina superior derecha para abrir el Centro de Control. Activa el 'Modo Avión' (ícono de avión) por 10 segundos y desactívalo.",
            pregunta: "¿Ya volvió la conexión a internet?"
        },
        {
            icono: "fa-gear",
            texto: "Ve a Ajustes > General > Transferir o Restablecer iPhone > Restablecer > Restablecer ajustes de red. Esto reiniciará la configuración de conexiones sin borrar fotos ni apps.",
            pregunta: "¿Ya funciona la red de internet?"
        }
    ],

    // ==========================================
    // CATEGORÍA: HARDWARE Y PERIFÉRICOS
    // ==========================================
    "Hardware::impresora": [
        {
            icono: "fa-plug",
            texto: "Verifica que el cable de energía esté firme tanto en la parte trasera de la impresora como en el tomacorriente. Si la pantalla o luces están apagadas, presiona el botón físico de encendido.",
            pregunta: "¿La impresora ya muestra luces encendidas o pantalla activa?"
        },
        {
            icono: "fa-power-off",
            texto: "Apaga la impresora desde su botón, retira el cable de corriente por 15 segundos y vuelve a conectarlo. Aprovecha para abrir la bandeja frontal e inspeccionar si hay papel atascado o atasco de carro.",
            pregunta: "¿La impresora ya está lista para imprimir?"
        },
        {
            icono: "fa-usb",
            texto: "Si está conectada por cable USB a tu equipo, desconéctalo de ambos extremos y vuelve a conectarlo en un puerto USB diferente de tu computadora. Si es Wi-Fi, verifica que el ícono de red en la pantalla de la impresora no esté parpadeando.",
            pregunta: "¿Ya logró imprimir la hoja de prueba?"
        }
    ],

    "Hardware::monitor": [
        {
            icono: "fa-display",
            texto: "Revisa que el cable de video (HDMI o DisplayPort) esté bien presionado y ajustado tanto detrás del monitor como en la laptop o torre de escritorio.",
            pregunta: "¿El monitor ya muestra imagen en pantalla?"
        },
        {
            icono: "fa-power-off",
            texto: "Desconecta el cable de alimentación eléctrica del monitor durante 10 segundos, vuélvelo a conectar y asegúrate de presionar el botón de encendido frontal/inferior.",
            pregunta: "¿La pantalla encendió o cambió la luz de estado?"
        },
        {
            icono: "fa-keyboard",
            texto: "En tu teclado Windows, presiona la combinación de teclas 'Windows + P'. Te aparecerá un menú lateral; selecciona la opción 'Duplicar' o 'Extender'.",
            pregunta: "¿Ya lograste ver la pantalla de tu equipo en el monitor?"
        }
    ],

    "Hardware::periferico": [
        {
            icono: "fa-usb",
            texto: "Desconecta el cable o receptor USB del teclado/mouse/audífonos de la computadora y vuélvelo a conectar en un puerto distinto (preferiblemente directamente a la computadora, no a un concentrador o HUB).",
            pregunta: "¿El equipo ya reconoce el dispositivo?"
        },
        {
            icono: "fa-battery-half",
            texto: "Si el periférico es inalámbrico, verifica si requiere baterías/pilas nuevas o si cuenta con un interruptor 'ON/OFF' en la parte inferior para volver a encenderlo.",
            pregunta: "¿Encendió la luz indicadora del dispositivo?"
        },
        {
            icono: "fa-cubes",
            texto: "En Windows, abre 'Administrador de dispositivos' (haz clic derecho sobre el botón de Inicio y selecciónalo). Despliega la categoría de tu periférico, haz clic derecho sobre el dispositivo y selecciona 'Desinstalar el dispositivo'. Luego reinicia el equipo para que se vuelva a instalar automáticamente.",
            pregunta: "¿Ya funciona el periférico?"
        }
    ],

    // ==========================================
    // CATEGORÍA: SOFTWARE Y ACCESOS
    // ==========================================
    "Software::vpn": [
        {
            icono: "fa-key",
            texto: "Abre tu cliente de VPN (ej. FortiClient, Cisco AnyConnect o GlobalProtect), verifica que tu usuario esté bien escrito y asegúrate de no estar copiando espacios en blanco en la contraseña.",
            pregunta: "¿Pudiste conectar la VPN correctamente?"
        },
        {
            icono: "fa-rotate",
            texto: "Desconecta cualquier otra red (como el hotspot de tu celular), apaga la conexión Wi-Fi del equipo por 10 segundos, vuelve a conectarte a tu red Wi-Fi y abre nuevamente la VPN.",
            pregunta: "¿Ya te permite establecer el túnel VPN?"
        },
        {
            icono: "fa-gear",
            texto: "Cierra la aplicación de la VPN desde el ícono pequeño al lado del reloj (haz clic derecho > Salir/Exit). Vuelve a abrir la aplicación desde el menú de inicio y reintenta la conexión.",
            pregunta: "¿Te conecta la VPN ahora?"
        }
    ]
};

/**
 * Expresiones regulares para detección precisa de dispositivos
 * (Listados por prioridad: marcas/sistemas específicos primero)
 */
const DETECTORES_DISPOSITIVO = [
    { tipo: "mac", regex: /\b(mac|macbook|imac|macos|apple)\b/i },
    { tipo: "iphone", regex: /\b(iphone|ios|ipad)\b/i },
    { tipo: "android", regex: /\b(android|samsung|xiaomi|motorola|huawei|oppo)\b/i },
    { tipo: "windows", regex: /\b(windows|win10|win11|laptop|pc|computadora|escritorio|thinkpad|dell|hp|lenovo)\b/i },
    { tipo: "impresora", regex: /\b(impresora|multifuncional|scanner|escáner|epson|hp deskjet|laserjet|canon|brother)\b/i },
    { tipo: "monitor", regex: /\b(monitor|pantalla|proyector|display|segunda pantalla)\b/i },
    { tipo: "periferico", regex: /\b(teclado|mouse|ratón|audífonos|diadema|auriculares|webcam|cámara)\b/i },
    { tipo: "vpn", regex: /\b(vpn|forticlient|anyconnect|globalprotect)\b/i }
];

/**
 * Detecta el tipo de dispositivo basándose en prioridades de patrones
 */
function detectarTipoDispositivo(texto) {
    if (!texto) return null;
    for (const detector of DETECTORES_DISPOSITIVO) {
        if (detector.regex.test(texto)) {
            return detector.tipo;
        }
    }
    return null;
}

/**
 * Busca un playbook activo normalizando la categoría y el dispositivo
 */
function buscarPlaybook(categoria, tipoDispositivo) {
    if (!categoria || !tipoDispositivo) return null;

    // Normalizar la categoría usando el mapa de sinónimos
    const catEstandar = MAPA_CATEGORIAS[categoria] || categoria;
    const clave = `${catEstandar}::${tipoDispositivo}`;

    return PLAYBOOKS[clave] || null;
}

module.exports = { 
    buscarPlaybook, 
    detectarTipoDispositivo, 
    PLAYBOOKS, 
    MAPA_CATEGORIAS 
};