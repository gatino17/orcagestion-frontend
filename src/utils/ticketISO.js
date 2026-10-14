/* global BigInt */
const ZONA_HORARIA = "America/Santiago";
export const ORIGENES_TICKET_ISO = {
    auditoria: "Auditoria", ticket_iso: "Ticket ISO", revision_direccion: "Revision por la direccion",
    reclamo_cliente_ticket: "Reclamo de cliente ticket", salida_no_conforme: "Salida no conforme",
    sugerencia_mejora: "Sugerencia de mejora", otros: "Otros",
};
export const CATEGORIAS_TICKET_ISO = {
    "001_gestion_comercial": "001 Gestion comercial", "002_levantamiento": "002 Levantamiento",
    armado_sistema: "003 Armado sistema", instalacion_sistema: "004 Instalacion de sistema",
    soporte_posventa: "005 Soporte y posventa", bodega: "006 Bodega",
    mantencion_reacondicionamiento: "007 Mantencion y reacondicionamiento", retiro: "008 Retiro", otros: "009 Otros",
};
const formatoInput = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export const fechaHoraTicketISOParaInput = (valor = new Date()) => {
    if (valor === null || valor === undefined || valor === "") return "";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "";
    const partes = Object.fromEntries(formatoInput.formatToParts(fecha).map((parte) => [parte.type, parte.value]));
    return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
};

export const fechaHoraTicketISOParaAPI = (valor) => {
    const match = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) throw new Error("Indica una fecha y hora validas.");
    const [, anio, mes, dia, hora, minuto] = match.map(Number);
    const esperado = Date.UTC(anio, mes - 1, dia, hora, minuto);
    let instante = esperado;
    // Interpreta la hora del formulario en Chile, incluyendo sus cambios de horario.
    for (let intento = 0; intento < 4; intento += 1) {
        const partes = Object.fromEntries(formatoInput.formatToParts(new Date(instante)).map((parte) => [parte.type, Number(parte.value)]));
        const representado = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute);
        instante += esperado - representado;
    }
    if (fechaHoraTicketISOParaInput(instante) !== valor) {
        throw new Error("Esa fecha u hora no es valida en Chile. Revisa el cambio de horario.");
    }
    return new Date(instante).toISOString();
};

export const formatearFechaHoraTicketISO = (valor) => {
    if (!valor) return "-";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "-";
    return new Intl.DateTimeFormat("es-CL", {
        timeZone: ZONA_HORARIA, dateStyle: "short", timeStyle: "short", hourCycle: "h23",
    }).format(fecha);
};

export const crearFormularioTicketISO = (ticket) => ({
    numero_ticket: ticket?.numero_ticket || "",
    fecha_recepcion: fechaTicketISOParaInput(ticket ? ticket.fecha_recepcion : new Date()),
    asunto_procedimiento: ticket?.asunto_procedimiento || "",
    origen: ticket?.origen || "",
    categoria_procedimiento: ticket?.categoria_procedimiento || "",
    problema: ticket?.problema || "",
    estado: ticket?.estado || "pendiente",
    fecha_cierre: ticket?.fecha_cierre ? fechaTicketISOParaInput(ticket.fecha_cierre) : "",
    responsable_id: String(ticket?.responsable_id || ""),
    observaciones: ticket?.observaciones || "",
});

export const fechaTicketISOParaInput = (valor) => {
    if (valor === null || valor === undefined || valor === "") return "";
    return /^\d{4}-\d{2}-\d{2}$/.test(String(valor)) ? valor : fechaHoraTicketISOParaInput(valor).slice(0, 10);
};

export const formatearFechaTicketISO = (valor) => {
    const fecha = fechaTicketISOParaInput(valor);
    return fecha ? fecha.split("-").reverse().join("/") : "-";
};

export const sugerirNumeroTicketISO = (tickets, proximoNumero, fecha = new Date()) => {
    const sugerido = String(proximoNumero || "").trim().toUpperCase();
    if (/^ISO-\d{4}-[0-9]+$/.test(sugerido)) return sugerido;
    const secuencia = (valor) => {
        const numero = String(valor || "").trim().toUpperCase();
        const match = numero.match(/^(?:ISO-\d{4}-)?([0-9]{1,18})$/);
        return match ? BigInt(match[1]) : 0n;
    };
    const maximo = (tickets || []).reduce((actual, ticket) => {
        const numero = secuencia(ticket.numero_ticket);
        return numero > actual ? numero : actual;
    }, 0n);
    const catalogo = secuencia(sugerido);
    const siguiente = catalogo > maximo ? catalogo : maximo + 1n;
    return `ISO-${fechaTicketISOParaInput(fecha).slice(0, 4)}-${String(siguiente).padStart(3, "0")}`;
};

export const normalizarBusquedaTicketISO = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export const agruparEstadoTicketISO = (estado) => {
    const normalizado = normalizarBusquedaTicketISO(estado).replace(/[\s-]+/g, "_");
    if (["pendiente", "pendientes"].includes(normalizado)) return "pendiente";
    if (["en_seguimiento", "con_seguimiento", "en_transito", "en_proceso"].includes(normalizado)) return "seguimiento";
    if (["resuelto", "resuelta", "resueltos", "cerrado", "cerrada", "cerrados"].includes(normalizado)) return "resuelto";
    return "sin_estado";
};

export const resumirTicketsISO = (tickets, anio) => {
    const meses = Array.from({ length: 12 }, (_, index) => ({
        mes: `${anio}-${String(index + 1).padStart(2, "0")}`,
        total: 0, pendiente: 0, seguimiento: 0, resuelto: 0, sin_estado: 0,
    }));
    let sinFecha = 0;
    (tickets || []).forEach((ticket) => {
        if (!ticket.fecha_recepcion) {
            sinFecha += 1;
            return;
        }
        const fecha = fechaTicketISOParaInput(ticket.fecha_recepcion);
        const dia = new Date(`${fecha}T12:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(dia.getTime()) || dia.toISOString().slice(0, 10) !== fecha) {
            sinFecha += 1;
            return;
        }
        const mes = meses.find((item) => item.mes === fecha.slice(0, 7));
        if (!mes) return;
        mes.total += 1;
        mes[agruparEstadoTicketISO(ticket.estado)] += 1;
    });
    const totales = meses.reduce((actual, mes) => ({
        total: actual.total + mes.total, pendiente: actual.pendiente + mes.pendiente,
        seguimiento: actual.seguimiento + mes.seguimiento, resuelto: actual.resuelto + mes.resuelto,
        sin_estado: actual.sin_estado + mes.sin_estado,
    }), { total: 0, pendiente: 0, seguimiento: 0, resuelto: 0, sin_estado: 0 });
    return { meses, totales, sinFecha };
};
