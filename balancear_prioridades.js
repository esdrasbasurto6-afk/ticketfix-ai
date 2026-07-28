// balancear_prioridades.js
const fs = require('fs');

const nuevosEjemplos = [
  // ===== REDES (0) — Baja =====
  {"texto": "quisiera que me cambien el canal wifi porque hay interferencia", "categoria": 0, "prioridad": 0},
  {"texto": "necesito saber la ip de la impresora de red para configurarla", "categoria": 0, "prioridad": 0},
  {"texto": "quiero solicitar un cable de red mas largo para mi escritorio", "categoria": 0, "prioridad": 0},
  {"texto": "podrian revisar si mi equipo esta en la vlan correcta", "categoria": 0, "prioridad": 0},
  {"texto": "quisiera acceso al portal cautivo para invitados", "categoria": 0, "prioridad": 0},
  {"texto": "necesito que agreguen mi direccion mac a la lista permitida", "categoria": 0, "prioridad": 0},
  {"texto": "quiero programar un mantenimiento preventivo del switch de mi area", "categoria": 0, "prioridad": 0},
  {"texto": "podrian ayudarme a configurar el proxy en mi navegador", "categoria": 0, "prioridad": 0},
  {"texto": "quisiera aumentar el ancho de banda asignado a mi equipo", "categoria": 0, "prioridad": 0},
  {"texto": "necesito documentacion de como conectarme a la vpn", "categoria": 0, "prioridad": 0},
  // ===== REDES (0) — Alta =====
  {"texto": "se cayo la vpn de toda la empresa y nadie puede trabajar remoto", "categoria": 0, "prioridad": 2},
  {"texto": "el servidor principal de red no responde y todos los sistemas estan caidos", "categoria": 0, "prioridad": 2},
  {"texto": "la red completa del call center dejo de funcionar hace una hora", "categoria": 0, "prioridad": 2},
  {"texto": "perdimos conexion con la sucursal principal y no podemos facturar", "categoria": 0, "prioridad": 2},
  {"texto": "todo el datacenter se quedo sin conectividad de un momento a otro", "categoria": 0, "prioridad": 2},
  {"texto": "el firewall principal se cayo y nadie tiene acceso a internet", "categoria": 0, "prioridad": 2},
  {"texto": "la caida de red esta afectando las llamadas de todo el call center", "categoria": 0, "prioridad": 2},
  {"texto": "se cayo la red del hospital y no podemos acceder a los expedientes", "categoria": 0, "prioridad": 2},
  {"texto": "toda la empresa perdio acceso a internet durante la presentacion importante", "categoria": 0, "prioridad": 2},
  {"texto": "el enlace principal con el proveedor de internet esta caido hace horas", "categoria": 0, "prioridad": 2},

  // ===== HARDWARE (1) — Baja =====
  {"texto": "quisiera un mouse pad nuevo porque el mio ya esta gastado", "categoria": 1, "prioridad": 0},
  {"texto": "necesito un soporte para laptop mas ergonomico", "categoria": 1, "prioridad": 0},
  {"texto": "podrian revisar si mi silla tiene algun cable suelto de corriente", "categoria": 1, "prioridad": 0},
  {"texto": "quiero solicitar audifonos con cancelacion de ruido para llamadas", "categoria": 1, "prioridad": 0},
  {"texto": "necesito una segunda pantalla para mi puesto de trabajo", "categoria": 1, "prioridad": 0},
  {"texto": "quisiera que revisen si mi laptop necesita mas memoria ram", "categoria": 1, "prioridad": 0},
  {"texto": "podrian limpiar el polvo del interior de mi cpu cuando puedan", "categoria": 1, "prioridad": 0},
  {"texto": "necesito un teclado en español, el mio esta en ingles", "categoria": 1, "prioridad": 0},
  {"texto": "quiero pedir una base refrigerante para mi laptop", "categoria": 1, "prioridad": 0},
  {"texto": "podrian revisar el estado de la bateria de mi laptop antes de que falle", "categoria": 1, "prioridad": 0},
  // ===== HARDWARE (1) — Alta =====
  {"texto": "mi laptop se apago por completo y no enciende ni con otro cargador", "categoria": 1, "prioridad": 2},
  {"texto": "el servidor fisico del area de sistemas dejo de encender", "categoria": 1, "prioridad": 2},
  {"texto": "se incendio parcialmente el cargador de mi equipo, hay olor a quemado", "categoria": 1, "prioridad": 2},
  {"texto": "la impresora principal de facturacion no enciende y hay clientes esperando", "categoria": 1, "prioridad": 2},
  {"texto": "mi computadora no prende y tengo una entrega urgente en una hora", "categoria": 1, "prioridad": 2},
  {"texto": "el disco duro del servidor de archivos esta fallando y se pierde informacion", "categoria": 1, "prioridad": 2},
  {"texto": "la pantalla de la sala de juntas exploto durante la presentacion", "categoria": 1, "prioridad": 2},
  {"texto": "mi laptop se cayo y la pantalla quedo completamente rota", "categoria": 1, "prioridad": 2},
  {"texto": "el equipo de la recepcion no enciende y no podemos atender visitas", "categoria": 1, "prioridad": 2},
  {"texto": "se daño el unico escaner del area legal y hay documentos urgentes", "categoria": 1, "prioridad": 2},

  // ===== SOFTWARE (2) — Baja =====
  {"texto": "quisiera que instalen photoshop en mi equipo cuando se pueda", "categoria": 2, "prioridad": 0},
  {"texto": "necesito que actualicen mi navegador a la ultima version", "categoria": 2, "prioridad": 0},
  {"texto": "podrian agregar un acceso directo del sistema en mi escritorio", "categoria": 2, "prioridad": 0},
  {"texto": "quiero solicitar una licencia adicional de office para mi equipo", "categoria": 2, "prioridad": 0},
  {"texto": "necesito ayuda para personalizar la barra de tareas", "categoria": 2, "prioridad": 0},
  {"texto": "quisiera que instalen la nueva version del lector de pdf", "categoria": 2, "prioridad": 0},
  {"texto": "podrian configurarme el fondo de pantalla corporativo", "categoria": 2, "prioridad": 0},
  {"texto": "necesito que me agreguen a la lista de distribucion del boletin", "categoria": 2, "prioridad": 0},
  {"texto": "quiero aprender a usar mejor las tablas dinamicas de excel", "categoria": 2, "prioridad": 0},
  {"texto": "podrian revisar si hay una actualizacion pendiente para mi software de diseño", "categoria": 2, "prioridad": 0},
  // ===== SOFTWARE (2) — Alta =====
  {"texto": "el sistema de facturacion completo se cayo y no podemos cobrar a nadie", "categoria": 2, "prioridad": 2},
  {"texto": "se perdio toda la base de datos de clientes de un momento a otro", "categoria": 2, "prioridad": 2},
  {"texto": "el sistema de nomina fallo y hoy es dia de pago a todos los empleados", "categoria": 2, "prioridad": 2},
  {"texto": "un virus esta bloqueando archivos de toda la red y pide un rescate", "categoria": 2, "prioridad": 2},
  {"texto": "el sistema de produccion se detuvo por completo y la fabrica esta parada", "categoria": 2, "prioridad": 2},
  {"texto": "se corrompio la base de datos principal y nadie puede acceder al sistema", "categoria": 2, "prioridad": 2},
  {"texto": "el software del punto de venta no funciona en ninguna sucursal", "categoria": 2, "prioridad": 2},
  {"texto": "el sistema critico de logistica esta caido y no podemos despachar pedidos", "categoria": 2, "prioridad": 2},
  {"texto": "la aplicacion de citas medicas se cayo y hay pacientes esperando", "categoria": 2, "prioridad": 2},
  {"texto": "el servidor de correo dejo de funcionar y nadie recibe ni envia mensajes", "categoria": 2, "prioridad": 2},

  // ===== CUENTAS/ACCESOS (3) — Baja =====
  {"texto": "quisiera saber como activar la verificacion en dos pasos en mi cuenta", "categoria": 3, "prioridad": 0},
  {"texto": "necesito que agreguen mi correo a un grupo de distribucion nuevo", "categoria": 3, "prioridad": 0},
  {"texto": "quiero solicitar acceso de solo lectura al sistema de reportes", "categoria": 3, "prioridad": 0},
  {"texto": "podrian darme de alta en el directorio telefonico interno", "categoria": 3, "prioridad": 0},
  {"texto": "necesito ayuda para configurar mi firma de correo corporativa", "categoria": 3, "prioridad": 0},
  {"texto": "quisiera cambiar mi correo de recuperacion en el sistema", "categoria": 3, "prioridad": 0},
  {"texto": "podrian darme acceso al calendario compartido del area", "categoria": 3, "prioridad": 0},
  {"texto": "necesito una cuenta de invitado temporal para un proveedor", "categoria": 3, "prioridad": 0},
  {"texto": "quiero saber si puedo tener dos dispositivos con la misma sesion activa", "categoria": 3, "prioridad": 0},
  {"texto": "podrian revisar si puedo tener acceso al portal de capacitaciones", "categoria": 3, "prioridad": 0},
  // ===== CUENTAS/ACCESOS (3) — Alta =====
  {"texto": "detectamos que la cuenta del director fue comprometida y estan robando informacion", "categoria": 3, "prioridad": 2},
  {"texto": "un ex empleado todavia tiene acceso a todos los sistemas y esto es grave", "categoria": 3, "prioridad": 2},
  {"texto": "se filtraron las contraseñas de todo el equipo de finanzas", "categoria": 3, "prioridad": 2},
  {"texto": "alguien esta usando mi cuenta para enviar correos que yo no envie", "categoria": 3, "prioridad": 2},
  {"texto": "el acceso maestro del sistema de nomina fue comprometido", "categoria": 3, "prioridad": 2},
  {"texto": "detectamos accesos no autorizados a la cuenta del gerente general", "categoria": 3, "prioridad": 2},
  {"texto": "se bloquearon las cuentas de toda el area de contabilidad al mismo tiempo", "categoria": 3, "prioridad": 2},
  {"texto": "la cuenta de administrador principal fue hackeada esta madrugada", "categoria": 3, "prioridad": 2},
  {"texto": "todos los usuarios del sistema financiero perdieron acceso a la vez", "categoria": 3, "prioridad": 2},
  {"texto": "se detecto un inicio de sesion desde el extranjero en la cuenta de finanzas", "categoria": 3, "prioridad": 2}
];

const dataset = JSON.parse(fs.readFileSync('./dataset.json', 'utf8'));
const textosExistentes = new Set(dataset.map(d => d.texto));

let agregados = 0;
let omitidos = 0;

for (const ejemplo of nuevosEjemplos) {
    if (textosExistentes.has(ejemplo.texto)) {
        omitidos++;
        continue;
    }
    dataset.push(ejemplo);
    textosExistentes.add(ejemplo.texto);
    agregados++;
}

fs.writeFileSync('./dataset.json', JSON.stringify(dataset, null, 2));
console.log(`✅ Agregados: ${agregados} | Omitidos (ya existian): ${omitidos} | Total dataset ahora: ${dataset.length}`);