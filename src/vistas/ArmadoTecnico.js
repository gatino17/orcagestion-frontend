import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import DataTable from "react-data-table-component";
import { jwtDecode } from "jwt-decode";
import { io } from "socket.io-client";
import { useLocation, useNavigate } from "react-router-dom";
import {
    cargarArmados,
    agregarArmado,
    modificarArmado,
    borrarArmado,
    cargarParticipaciones,
    transferirArmado,
    cargarMateriales,
    guardarMateriales,
    cargarMovimientos,
    cargarMovimientosRecientes,
    borrarParticipacion,
    borrarMovimientoGlobal,
    cargarHistorialEquiposArmado
} from "../controllers/armadosControllers";
import { obtenerHistorialEquiposArmado, obtenerMovimientosArmado, validarSerieEquipo } from "../api";
import { cargarUsuarios } from "../controllers/usuariosControllers";
import { obtenerClientes, obtenerCentrosPorCliente } from "../controllers/consultaCentroControllers";
import { cargarDetallesCentro } from "../controllers/centrosControllers";
import { agregarEquipo, modificarEquipo, borrarEquipo } from "../controllers/equiposControllers";
import "./ArmadoTecnico.css";

const estadosOptions = [
    { value: "", label: "Todos" },
    { value: "pendiente", label: "Pendiente" },
    { value: "en_proceso", label: "En proceso" },
    { value: "prefinalizado", label: "Prefinalizado" },
    { value: "finalizado", label: "Finalizado" }
];

const DEFAULT_PENDING_BOX = "Pendiente de caja";
const DEFAULT_FIRST_BOX = "Caja 1";

const nombreCajaSeguro = (value) => {
    const limpio = String(value ?? "").trim();
    return limpio || DEFAULT_PENDING_BOX;
};

const etiquetaBulto = (value) => {
    const limpio = String(value ?? "").trim();
    if (!limpio) return "Pendiente de bulto";
    if (limpio.toLowerCase() === DEFAULT_PENDING_BOX.toLowerCase()) return "Pendiente de bulto";
    const match = limpio.match(/^Caja(\s*\d+(?:\s*-\s*.*)?)$/i);
    if (match) return `Bulto${match[1]}`;
    return limpio;
};

const normalizarCajaEquipoInicial = (caja, equipo = {}) => {
    const limpio = String(caja ?? "").trim();
    if (!limpio) return DEFAULT_PENDING_BOX;
    if (limpio !== DEFAULT_FIRST_BOX) return limpio;
    const tieneContenido = Boolean(
        String(equipo?.numero_serie || "").trim() ||
        String(equipo?.codigo || "").trim() ||
        String(equipo?.ip || "").trim() ||
        String(equipo?.observacion || "").trim() ||
        String(equipo?.estado || "").trim()
    );
    return tieneContenido ? DEFAULT_FIRST_BOX : DEFAULT_PENDING_BOX;
};

const normalizarCajaMaterialInicial = (caja, material = {}) => {
    const limpio = String(caja ?? "").trim();
    if (!limpio) return DEFAULT_PENDING_BOX;
    if (limpio !== DEFAULT_FIRST_BOX) return limpio;
    return Number(material?.cantidad ?? 0) > 0 ? DEFAULT_FIRST_BOX : DEFAULT_PENDING_BOX;
};

const obtenerCajasDetectadas = (...listas) =>
    Array.from(
        new Set(
            listas
                .flat()
                .map((value) => nombreCajaSeguro(value))
                .filter(Boolean)
        )
    );

const siguienteNombreCaja = (lista = []) => {
    const numeros = obtenerCajasDetectadas(lista)
        .map((nombre) => {
            const match = /^Caja\s+(\d+)$/i.exec(nombre);
            return match ? Number(match[1]) : 0;
        })
        .filter((numero) => Number.isFinite(numero) && numero > 0);
    return `Caja ${numeros.length ? Math.max(...numeros) + 1 : 1}`;
};

const contarCajasReales = (lista = []) => obtenerCajasDetectadas(lista).filter((nombre) => nombre !== DEFAULT_PENDING_BOX).length;

const esCajaVirtualOEspecial = (value) => {
    const limpio = String(value ?? "").trim().toLowerCase();
    return !limpio || limpio === DEFAULT_PENDING_BOX.toLowerCase() || limpio === "n/a" || limpio === "pendiente";
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const labelAccionMovimientoMaterial = (mov) => {
    const accion = String(mov?.accion || "").toLowerCase().trim();
    if (accion === "creacion") return "Material";
    if (accion === "ajuste") return "Cantidad ajustada";
    if (accion === "incremento") return "Cantidad agregada";
    return String(mov?.tipo || "");
};

const renderTipoMovimiento = (mov) => {
    const tipo = String(mov?.tipo || "").toLowerCase().trim();
    if (tipo === "equipo") {
        const accionEquipo = String(mov?.accion || "").toLowerCase().trim();
        if (accionEquipo === "devuelto_bodega") {
            return <span style={{ color: "#c2410c", fontWeight: 700 }}>Devuelto a bodega</span>;
        }
        return <span className="text-capitalize">{mov?.tipo || "-"}</span>;
    }
    if (tipo !== "material") return <span className="text-capitalize">{mov?.tipo || "-"}</span>;

    const accion = String(mov?.accion || "").toLowerCase().trim();
    const anterior = Number(mov?.cantidad_anterior ?? 0);
    const nueva = Number(mov?.cantidad_nueva ?? 0);
    const delta = nueva - anterior;
    const label = labelAccionMovimientoMaterial(mov);

    if (accion === "ajuste") {
        const subio = delta > 0;
        const bajo = delta < 0;
        return (
            <span style={{ color: "#ca8a04" }}>
                {label}
                {subio ? <i className="fas fa-arrow-up" style={{ marginLeft: 6, color: "#15803d", fontWeight: 900 }} /> : null}
                {bajo ? <i className="fas fa-arrow-down" style={{ marginLeft: 6, color: "#dc2626", fontWeight: 900 }} /> : null}
            </span>
        );
    }

    if (accion === "incremento") {
        return (
            <span style={{ color: "#2563eb" }}>
                {label}
                <i className="fas fa-arrow-up" style={{ marginLeft: 6, color: "#15803d", fontWeight: 900 }} />
            </span>
        );
    }

    if (accion === "creacion") {
        return <span style={{ fontWeight: 800, color: "#475569" }}>{label}</span>;
    }

    return <span className="text-capitalize">{label}</span>;
};

const ORDEN_EQUIPOS = [
    "pc",
    "monitor",
    "mouse",
    "teclado",
    "router",
    "switch",
    "switch cisco + adaptador",
    "switch raqueable",
    "switch poe",
    "router mikrotik + trafo",
    "switch rack",
    "rack 9u - tuercas - tornillos",
    "zapatilla rack (pdu)",
    "rack 9u + tuercas + tornillos",
    "zapatilla rack",
    "parlantes",
    "sensor magnetico",
    "sensor magnético",
    "tablero 500x400x200",
    "baliza interior",
    "bocina interior",
    "baliza exterior 1",
    "baliza exterior 2",
    "bocina exterior 1",
    "bocina exterior 2",
    "foco led 1 150w",
    "foco led 2 150w",
    "foco led 1 50w",
    "foco led 2 50w",
    "fuente poder 12v",
    "axis p8221",
    "mastil",
    "brazo ubiquiti",
    "riel u",
    "perno pasado",
    "omega 1",
    "tablero 1200x800x300",
    "tablero 1000x600x300",
    "tablero 750x500x250",
    "inversor cargador victron",
    "panel victron",
    "bateria 1",
    "bateria 2",
    "bateria 3",
    "bateria 4",
    "bateria 5",
    "bateria 6",
    "sensor magnetico respaldo",
    "sensor magnetico cargador",
    "cargador 1",
    "cargador 2",
    "tablero cargador 750x500x250",
    "camara ptz termal",
    "camara ptz laser",
    "camara ptz laser 2",
    "camara modulo",
    "camara ensinerador",
    "ensilaje interior",
    "ensilaje exterior",
    "camara popa"
];

const SINONIMOS_EQUIPOS = {
    "ip pc": "pc",
    "ip pc nvr": "pc",
    "puerta de enlace": "router",
    "router (puerta de enlace)": "router",
    "mástil": "mastil",
    "switch cisco + adaptador": "switch (cisco)",
    "switch cisco": "switch (cisco)"
};

const GRUPOS_EQUIPOS = [
    {
        titulo: "Oficina",
        items: [
            "PC",
            "Monitor",
            "Mouse",
            "Teclado",
            "Router",
            "Switch",
            "Switch (Cisco)",
            "Switch raqueable",
            "Camara Interior",
            "Parlantes",
            "Sensor Magnetico",
            "Rack 9U - tuercas - tornillos",
            "Zapatilla Rack (PDU)"
        ]
    },
    {
        titulo: "Base tierra",
        items: [
            "PC cliente",
            "Rack 2",
            "Ubiquiti TX",
            "Ubiquiti RX",
            "Pantalla"
        ]
    },
    {
        titulo: "Tablero Alarma",
        items: [
            "Tablero 500x400x200",
            "Baliza Interior",
            "Bocina Interior",
            "Baliza Exterior 1",
            "Baliza Exterior 2",
            "Bocina Exterior 1",
            "Bocina Exterior 2",
            "Foco led 1 150W",
            "Foco led 2 150W",
            "Foco led 1 50W",
            "Foco led 2 50W",
            "Fuente poder 12V",
            "Axis P8221"
        ]
    },
    {
        titulo: "Tablero Respaldo",
        items: [
            "Tablero 1200x800x300",
            "Tablero 1000x600x300",
            "Inversor cargador Victron",
            "Panel Victron",
            "Bateria 1",
            "Bateria 2",
            "Bateria 3",
            "Bateria 4",
            "Bateria 5",
            "Bateria 6",
            "UPS online",
            "Switch POE",
            "Sensor magnetico respaldo",
            "Sensor magnetico cargador",
            "Cargador 1",
            "Cargador 2",
            "Tablero Cargador 750x500x250"
        ]
    },
    {
        titulo: "Mastil",
        items: [
            "Tablero Derivacion (400x300x200)",
            "Radar 1",
            "Radar 2",
            "Cable rj radar 1",
            "Cable rj radar 2",
            "Soporte radar 1",
            "Soporte radar 2",
            "Camara PTZ termal",
            "Camara PTZ Laser",
            "Camara PTZ Laser 2",
            "Camara Modulo",
            "Camara Silo 1",
            "Camara Silo 2",
            "Camara Ensinerador",
            "Ensilaje interior",
            "Ensilaje exterior",
            "Camara Popa",
            "Camara acceso 1",
            "Camara acceso 2",
            "Camara acceso 3",
            "Camara acceso 4",
            "Enlace Ubiquiti"
        ]
    },
    {
        titulo: "Tablero Camara",
        items: [
            "Tablero Camara (500x700x250)",
            "Poe Power 1",
            "Poe Power 2",
            "Poe Power 3",
            "Poe Power 4",
            "Poe Power 5",
            "Switch POE 1",
            "Switch POE 2",
            "Mass",
            "Tablero 750x500x250",
            "Switch 1",
            "Switch 2",
            "Switch 3",
            "Switch 4",
            "Netio"
        ]
    }
];

const EQUIPOS_PREDEF = [
    "PC",
    "Router",
    "Switch",
    "Switch (Cisco)",
    "Switch raqueable",
    "Switch POE",
    "Mass",
    "Netio",
    "Monitor",
    "Rack 9U - tuercas - tornillos",
    "Zapatilla Rack (PDU)",
    "PC cliente",
    "Rack 2",
    "Ubiquiti TX",
    "Ubiquiti RX",
    "Pantalla",
    "Parlantes",
    "Sensor Magnetico",
    "Mouse",
    "Teclado",
    "Tablero 1200x800x300",
    "Tablero 1000x600x300",
    "Tablero 750x500x250",
    "Inversor cargador Victron",
    "Panel Victron",
    "Bateria 1",
    "Bateria 2",
    "Bateria 3",
    "Bateria 4",
    "Bateria 5",
    "Bateria 6",
    "Sensor magnetico respaldo",
    "Sensor magnetico cargador",
    "Cargador 1",
    "Cargador 2",
    "Tablero Cargador 750x500x250",
    "Tablero 500x400x200",
    "Baliza Interior",
    "Bocina Interior",
    "Baliza Exterior 1",
    "Baliza Exterior 2",
    "Bocina Exterior 1",
    "Bocina Exterior 2",
    "Foco led 1 150W",
    "Foco led 2 150W",
    "Foco led 1 50W",
    "Foco led 2 50W",
    "Fuente poder 12V",
    "Axis P8221",
    "Tablero Derivacion (400x300x200)",
    "Radar 1",
    "Radar 2",
    "Cable rj radar 1",
    "Cable rj radar 2",
    "Soporte radar 1",
    "Soporte radar 2",
    "Camara PTZ Laser",
    "Camara PTZ Laser 2",
    "Camara Modulo",
    "Camara Silo 1",
    "Camara Silo 2",
    "Camara Ensinerador",
    "Ensilaje interior",
    "Ensilaje exterior",
    "Camara Popa",
    "Camara acceso 1",
    "Camara acceso 2",
    "Camara acceso 3",
    "Camara acceso 4",
    "Enlace Ubiquiti",
    "UPS online",
    "Tablero Camara (500x700x250)",
    "Poe Power 1",
    "Poe Power 2",
    "Poe Power 3",
    "Poe Power 4",
    "Poe Power 5",
    "Switch POE 1",
    "Camara Interior",
    "Switch 1",
    "Switch 2",
    "Switch 3",
    "Switch POE 2",
    "Switch 4",
];
const EQUIPOS_MIGRADOS_A_MATERIALES = new Set(["bandeja rack - tornillos"]);
const MATERIALES_PREDEF = [
    "Cable Eléctrico 3 x 1,5mm",
    "Cable Eléctrico 3 x 0,75mm",
    "Cable Eléctrico 2 x 0,75mm",
    "Cable UTP CAT 5e",
    "CABLE UTP BLINDADO",
    "Enchufes Macho",
    "Enchufes Hembra",
    "Automático 16A",
    "Cinta Aislante Super 33",
    "Cinta Engomada",
    "Cable Power",
    "Cable UPS",
    "Bandeja Rack - tornillos",
    "Regleta 6-8mm",
    "Amarras Plásticas 4,5x300mm (med)",
    "Amarras Plásticas 7,5x500mm (gran)",
    "Pernos M8 Cámara",
    "Pernos M6 Platina",
    "Pernos M5 tablero interior",
    'Corrugado 1"',
    'Terminales Rectos 1"',
    'Terminal curvo 1"',
    'Abrazaderas 2"',
    'Abrazaderas 2"1/2',
    'Abrazaderas 3"',
    'Autoperforantes 1"',
    'Autoperforantes 1"1/2',
    'Autoperforantes 2"',
    'Autoperforantes 2 1/2"',
    'Autoperforantes 3"',
    'Tornillos lata madera 1"',
    'Tornillos lata madera 1"1/2',
    'Tornillos lata madera 23"',
    'Tornillos lata madera 2"1/2',
    "Tornillos vulcanita",
    "Kit de Soporte a Poste 300mm",
    "Kit de Soporte a Poste 400mm",
    "Kit de Soporte a Poste 500mm",
    'Omega 1"',
    'Cadie 1"',
    "Orejas tableros",
    "Piola 3mm",
    "Piola engomada",
    "Tensores 3/8",
    "Grilletes",
    "Guardacabos",
    "Tirafondos",
    "Prensas",
    "Cáncamo",
    "Platina",
    "Angulo",
    "Disco Corte",
    "PG 21",
    "PG 16",
    "Cinta doble contacto",
    "Caja de Unión Foco 89x89x52",
    "Caja de Cámara Interior 153x110x65",
    "Caja interior 175x151x95",
    "Caja de Panel Victron 184x255x99",
    "Canaletas 40x16x2000 (chicas)",
    "Canaletas 100x50x2000 (grandes)",
    "Pernos de rack (tuerca enjaulada)",
    "Extensión USB",
    "Cable HDMI",
    "Conectores RJ45",
    "Conector hembra red (RJ45)",
    "Cables VGA",
    "Copla VGA",
    "Soporte LED",
    "Spray",
    "Tapagoteras",
    "Cinta espiral",
    "Tarjeta de Memoria microSD 8GB",
    "Grampas para cable (Paquete)",
    "PatchCore 90 Cms (2MTS)",
    "PatchCore 5 Mts.",
    "PatchCore 10 Mts.",
    "Sellos",
    "Puente batería",
    "Bolsas de Basura Grandes",
    "Cajas (fondo + tapa)",
    "Cinta embalaje",
    "Logos",
    "Brazo Ubiquiti",
    "Mástil",
    "Riel U",
    "Perno Pasado",
    "Planza",
    "Mesa respaldo",
    "utp planza",
    "conector planza a corrugado",
    "copla planza"
];

const MATERIAL_CATEGORY_OPTIONS = ["Todas", "Electricidad", "Redes", "Montaje", "Canalizacion", "Otros"];

const normalizarNombreMaterialCategoria = (value = "") =>
    String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .replace(/\bmesa rack\b/g, "mesa respaldo");

const canonizarNombreMaterial = (value = "") => {
    const texto = String(value || "").trim();
    if (!texto) return "";
    return normalizarNombreMaterialCategoria(texto) === "mesa respaldo" ? "Mesa respaldo" : texto;
};

const obtenerCategoriaMaterial = (nombre = "") => {
    const n = normalizarNombreMaterialCategoria(nombre);
    if (
        n.startsWith("cable electrico") ||
        ["enchufes macho", "enchufes hembra", "automatico 16a", "cinta aislante super 33", "cable power", "cable ups", "puente bateria"].includes(n)
    ) {
        return "Electricidad";
    }
    if (
        n.includes("utp") ||
        n.includes("rj45") ||
        n.includes("patchcore") ||
        n.includes("hdmi") ||
        n.includes("vga") ||
        n.includes("usb") ||
        n.includes("microsd") ||
        n.includes("conector hembra red")
    ) {
        return "Redes";
    }
    if (
        n.includes("corrugado") ||
        n.includes("canaleta") ||
        n === "pg 16" ||
        n === "pg 21" ||
        n.startsWith("terminales rectos") ||
        n.startsWith("terminal curvo") ||
        n.includes("omega") ||
        n.includes("cadie") ||
        n.includes("planza") ||
        n.includes("copla planza") ||
        n.includes("conector planza a corrugado") ||
        n.includes("regleta") ||
        n.includes("caja de union") ||
        n.includes("caja de camara") ||
        n.includes("caja interior") ||
        n.includes("caja de panel") ||
        n.includes("cajas (fondo + tapa)")
    ) {
        return "Canalizacion";
    }
    if (
        n.includes("bandeja rack") ||
        n.includes("mesa respaldo") ||
        n.includes("amarras") ||
        n.includes("pernos") ||
        n.includes("perno pasado") ||
        n.includes("tornillos") ||
        n.includes("abrazaderas") ||
        n.includes("autoperforantes") ||
        n.includes("tirafondos") ||
        n.includes("prensas") ||
        n.includes("grilletes") ||
        n.includes("guardacabos") ||
        n.includes("kit de soporte") ||
        n.includes("orejas tableros") ||
        n.includes("mastil") ||
        n.includes("riel u") ||
        n === "platina" ||
        n === "angulo" ||
        n.includes("brazo ubiquiti") ||
        n.includes("soporte led") ||
        n.includes("grampas para cable") ||
        n.includes("cinta doble contacto")
    ) {
        return "Montaje";
    }
    return "Otros";
};

const normalizarEstadoRegistroEquipo = (value = "") => {
    const estado = String(value || "").trim().toLowerCase();
    if (estado === "no_aplica") return "no_aplica";
    if (estado === "pendiente") return "pendiente";
    return "normal";
};

const labelEstadoRegistroEquipo = (value = "") => {
    const estado = normalizarEstadoRegistroEquipo(value);
    if (estado === "no_aplica") return "No aplica";
    if (estado === "pendiente") return "Pendiente";
    return "Normal";
};

const normalizarEstadoRegistroMaterial = (value = "") => normalizarEstadoRegistroEquipo(value);
const labelEstadoRegistroMaterial = (value = "") => labelEstadoRegistroEquipo(value);

const CHECKLIST_ARMADO_SECCIONES = [
    {
        titulo: "1. PC/NVR",
        items: [
            "PC/NVR funciona",
            "PC/NVR con planilla de inicio",
            "Licencia VMS Digifort permanente",
            "Licencia VMS Digifort demo",
            "TeamViewer instalado",
            "Rustdesk instalado",
            "Reinicio de PC/NVR ante perdida de energia",
        ],
    },
    {
        titulo: "2. Designio de listado IP",
        items: ["Designio de listado IP para equipos"],
    },
    {
        titulo: "3. Configuracion en Victron",
        items: [
            "Ingreso de codigo de camara",
            "Creacion de perfiles de visualizacion",
            "Ingreso de dispositivo / alarmas",
            "Cresion maps de silos",
            "Agregar web de radar",
            "Creacion de matriz local",
        ],
    },
    {
        titulo: "4. Tablero de camaras",
        items: [
            "Configuracion switch mikrotik 1",
            "Configuracion switch mikrotik 2",
            "Configuracion switch poe 1",
            "Configuracion switch poe 2",
            "Configuracion de netio",
            "PC/Nuc mass server",
            "TeamViewer instalado",
            "Mass server con licencia permanente",
            "Mass server con licencia demo",
        ],
    },
    {
        titulo: "5. Tablero alarma",
        items: [
            "Configuracion de dispositivo I/O Axis",
            "Configuracion de alarmas",
            "Conexion de sensores",
        ],
    },
    {
        titulo: "6. Prueba 1",
        items: [
            "Envio de mail encargado de investigacion y desarrollo",
            "Verificacion dias de grabacion en cada camara",
            "Configuracion de Mass server y VMS",
            "Verificacion de perfiles de visualizacion",
            "Configuracion de firewall y seguridad en PC/NVR",
            "Aplicacion estado de centros instalada",
            "Mail de respuesta a soporte tecnico",
        ],
    },
    {
        titulo: "7. Prueba 2",
        items: [
            "Verificacion de salida alarma y sensores",
            "Activa / desactiva bocina interior",
            "Activa / desactiva baliza interior",
            "Activa / desactiva foco Led",
            "Activa / desactiva bocina exterior",
            "Activa / desactiva baliza exterior",
            "Activa / desactiva sensor 1",
            "Activa / desactiva sensor 2",
            "Simulacion perdida suministro de energia",
            "Retorno todos los equipos correctamente",
            "Mail de entrega al supervisor de operaciones",
        ],
    },
    {
        titulo: "8. Equipos de energia",
        items: [
            "Inversor nuevo",
            "Inversor cargador - pruebas realizadas",
            "Inversor cargador - con mantencion",
            "Panel Victron nuevo",
            "Panel Victron - color control GX",
            "Panel Victron - Cerbo GX",
            "Entrega panel Victron con fuente energia",
            "Baterias nuevas",
            "Baterias - pruebas realizadas",
            "UPS nueva",
            "UPS - pruebas realizadas",
            "UPS - mantencion realizada",
            "Envio mail a supervisor de operaciones",
        ],
    },
];

const CHECKLIST_ARMADO_ITEMS = CHECKLIST_ARMADO_SECCIONES.flatMap((sec, secIdx) =>
    sec.items.map((label, itemIdx) => ({
        key: `s${secIdx + 1}-i${itemIdx + 1}`,
        seccion: sec.titulo,
        item: `${secIdx + 1}.${itemIdx + 1}`,
        label,
    }))
);

const CHECKLIST_ARMADO_AREAS = [
    { key: "pc", label: "PC", secciones: [1, 6] },
    { key: "camaras", label: "Camaras", secciones: [2, 3, 4, 5, 7] },
    { key: "energia", label: "Energia", secciones: [8] },
];

const CHECKLIST_AREA_BY_SECCION = CHECKLIST_ARMADO_AREAS.reduce((acc, area) => {
    (area.secciones || []).forEach((sec) => {
        acc[Number(sec)] = area.key;
    });
    return acc;
}, {});

const calcularProgresoChecklistAreas = (checks = {}) => {
    const areaPorSeccion = CHECKLIST_ARMADO_AREAS.reduce((acc, area) => {
        (area.secciones || []).forEach((sec) => {
            acc[Number(sec)] = area.key;
        });
        return acc;
    }, {});

    const base = CHECKLIST_ARMADO_AREAS.reduce((acc, area) => {
        acc[area.key] = { done: 0, total: 0, pct: 0, label: area.label };
        return acc;
    }, {});

    CHECKLIST_ARMADO_ITEMS.forEach((item) => {
        const secNum = Number(String(item.item || "").split(".")[0] || 0);
        const areaKey = areaPorSeccion[secNum];
        if (!areaKey || !base[areaKey]) return;
        base[areaKey].total += 1;
        const row = checks?.[item.key];
        const estado = String(row?.estado || "").trim().toLowerCase();
        if (estado) base[areaKey].done += 1;
    });

    Object.values(base).forEach((row) => {
        row.pct = row.total ? Math.round((row.done / row.total) * 100) : 0;
    });
    return base;
};

const ArmadoTecnico = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [rol, setRol] = useState("");
    const [userId, setUserId] = useState(null);
    const [userNombre, setUserNombre] = useState("");
    const [supervisorAreas, setSupervisorAreas] = useState([]);
    const [armados, setArmados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [filtroTecnico, setFiltroTecnico] = useState("");
    const [tecnicos, setTecnicos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [centros, setCentros] = useState([]);
    const [clienteSel, setClienteSel] = useState("");
    const [centroSel, setCentroSel] = useState("");
    const [tecnicoSel, setTecnicoSel] = useState("");
    const [tecnicoSecundarioSel, setTecnicoSecundarioSel] = useState("");
    const [estadoAsignacion, setEstadoAsignacion] = useState("pendiente");
    const [fechaInicioAsignacion, setFechaInicioAsignacion] = useState("");
    const [fechaTerminoAsignacion, setFechaTerminoAsignacion] = useState("");
    const [observacion, setObservacion] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [planillaOpen, setPlanillaOpen] = useState(false);
    const [armadoActivo, setArmadoActivo] = useState(null);
    const [equipos, setEquipos] = useState([]);
    const [loadingPlanilla, setLoadingPlanilla] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [participaciones, setParticipaciones] = useState([]);
    const [transferTecSel, setTransferTecSel] = useState("");
    const [transferObjetivoSel, setTransferObjetivoSel] = useState("");
    const [transferNota, setTransferNota] = useState("");
    const [materiales, setMateriales] = useState([]);
    const [materialesSnapshot, setMaterialesSnapshot] = useState({});
    const [categoriaMaterialPlanilla, setCategoriaMaterialPlanilla] = useState("Todas");
    const [tabPlanilla, setTabPlanilla] = useState("equipos"); // 'equipos' | 'materiales'
    const [filtroVistaEquiposPlanilla, setFiltroVistaEquiposPlanilla] = useState("todo");
    const [filtroVistaMaterialesPlanilla, setFiltroVistaMaterialesPlanilla] = useState("todo");
    const [cajas, setCajas] = useState([DEFAULT_PENDING_BOX]);
    const [movimientos, setMovimientos] = useState([]);
    const [movimientosRecientes, setMovimientosRecientes] = useState([]);
    const [movsLimit, setMovsLimit] = useState(10);
    const [movsPage, setMovsPage] = useState(1);
    const [movsTotal, setMovsTotal] = useState(0);
    const [movClienteFiltro, setMovClienteFiltro] = useState("");
    const [movArmadoFiltro, setMovArmadoFiltro] = useState("");
    const [movSerieFiltro, setMovSerieFiltro] = useState("");
    const [movimientosNuevos, setMovimientosNuevos] = useState({});
    const [parpadeoOn, setParpadeoOn] = useState(false);
    const [movSeleccionados, setMovSeleccionados] = useState([]);
    const [eliminandoSeleccion, setEliminandoSeleccion] = useState(false);
    const [historialOpen, setHistorialOpen] = useState(false);
    const [historialLoading, setHistorialLoading] = useState(false);
    const [historialData, setHistorialData] = useState({ armado: null, resumen: [], eventos: [] });
    const [cajasResumenOpen, setCajasResumenOpen] = useState(false);
    const [cajasResumenLoading, setCajasResumenLoading] = useState(false);
    const [cajasResumenError, setCajasResumenError] = useState("");
    const [cajasResumenData, setCajasResumenData] = useState([]);
    const [observacionDetalle, setObservacionDetalle] = useState({ open: false, armadoId: null, centro: "", texto: "", saving: false });
    const [historialTab, setHistorialTab] = useState("resumen");
    const [checklistOpen, setChecklistOpen] = useState(false);
    const [checklistArmado, setChecklistArmado] = useState(null);
    const [checklistEstado, setChecklistEstado] = useState({});
    const [checklistObs, setChecklistObs] = useState("");
    const [checklistAreaActiva, setChecklistAreaActiva] = useState("");
    const [checklistVersion, setChecklistVersion] = useState(0);
    const lastSeenMovIdRef = useRef(0);
    const movsRequestRef = useRef(0);
    const recargarMovimientosRecientesRef = useRef(() => {});
    const esAdmin = rol === "admin";
    const esTecnico = rol === "tecnico";
    const puedeGestionarArmados = !esTecnico;
    const puedeVerObservacionArmado = !esTecnico;
    const puedeVerHistorialGlobal = !esTecnico;
    const tecnicosActivosPlanilla = useMemo(() => {
        const activos = Array.isArray(armadoActivo?.tecnicos_asignados) ? armadoActivo.tecnicos_asignados : [];
        if (activos.length) return activos;
        const tecnicoBaseId = Number(armadoActivo?.tecnico?.id || armadoActivo?.tecnico_id || 0);
        const tecnicoBaseNombre = armadoActivo?.tecnico?.nombre || armadoActivo?.tecnico?.name || armadoActivo?.tecnico_nombre || "";
        if (!tecnicoBaseId && !tecnicoBaseNombre) return [];
        return [{ id: tecnicoBaseId || null, nombre: tecnicoBaseNombre || "—", principal: true }];
    }, [armadoActivo]);
    const tecnicoPrincipalPlanilla = useMemo(
        () => tecnicosActivosPlanilla.find((tec) => tec?.principal) || tecnicosActivosPlanilla[0] || null,
        [tecnicosActivosPlanilla]
    );
    const totalCajasRealesPlanilla = useMemo(() => contarCajasReales(cajas), [cajas]);
    const resumenArmadoPlanilla = useMemo(() => {
        const total = Array.isArray(equipos) ? equipos.length : 0;
        const conSerie = (equipos || []).filter((eq) => String(eq?.numero_serie || "").trim()).length;
        const noAplica = (equipos || []).filter((eq) => normalizarEstadoRegistroEquipo(eq?.estado_registro) === "no_aplica").length;
        const pendientes = (equipos || []).filter((eq) => normalizarEstadoRegistroEquipo(eq?.estado_registro) === "pendiente").length;
        const resueltos = conSerie + noAplica;
        const porcentaje = total ? Math.round((resueltos / total) * 100) : 0;
        return { total, conSerie, noAplica, pendientes, resueltos, porcentaje };
    }, [equipos]);
    const tecnicosApoyoPlanilla = useMemo(
        () => tecnicosActivosPlanilla.filter((tec) => !tec?.principal),
        [tecnicosActivosPlanilla]
    );
    const tecnicosDisponiblesTransferencia = useMemo(() => {
        const activosIds = new Set(
            tecnicosActivosPlanilla
                .map((tec) => Number(tec?.id || 0))
                .filter((id) => Number.isFinite(id) && id > 0)
        );
        return (tecnicos || []).filter((tec) => !activosIds.has(Number(tec?.id || 0)));
    }, [tecnicosActivosPlanilla, tecnicos]);
    const colorTecnico = useCallback((valor) => {
        if (!valor) return "#4b5563";
        const key = String(valor);
        let hash = 0;
        for (let i = 0; i < key.length; i += 1) {
            hash = key.charCodeAt(i) + ((hash << 5) - hash);
            hash &= hash; // to 32bit
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 65%, 50%)`;
    }, []);

    const mergeMateriales = useCallback((listaBackend = []) => {
        const mapa = new Map(
            (listaBackend || []).map((m) => [
                normalizarNombreMaterialCategoria(m.nombre || ""),
                m
            ])
        );
        const base = MATERIALES_PREDEF.map((nombre) => {
            const found = mapa.get(normalizarNombreMaterialCategoria(nombre));
            const cantidad = found && found.cantidad !== undefined && found.cantidad !== null ? found.cantidad : "";
            const caja = normalizarCajaMaterialInicial(found?.caja, found || {});
            const caja_tecnico_id = found?.caja_tecnico_id;
            const caja_tecnico_nombre = found?.caja_tecnico_nombre;
            return {
                nombre: canonizarNombreMaterial(nombre),
                cantidad,
                caja,
                caja_tecnico_id,
                caja_tecnico_nombre,
                estado_registro: normalizarEstadoRegistroMaterial(found?.estado_registro),
                observacion_registro: found?.observacion_registro || ""
            };
        });
        const extras = (listaBackend || []).filter(
            (m) =>
                !MATERIALES_PREDEF.some(
                    (p) =>
                        normalizarNombreMaterialCategoria(p) ===
                        normalizarNombreMaterialCategoria(m.nombre || "")
                )
        );
        const extrasNormalizados = extras.map((m) => ({
            nombre: canonizarNombreMaterial(m.nombre),
            cantidad: m.cantidad ?? "",
            caja: normalizarCajaMaterialInicial(m.caja, m),
            caja_tecnico_id: m.caja_tecnico_id,
            caja_tecnico_nombre: m.caja_tecnico_nombre,
            estado_registro: normalizarEstadoRegistroMaterial(m?.estado_registro),
            observacion_registro: m?.observacion_registro || ""
        }));
        return [...base, ...extrasNormalizados];
    }, []);

    const materialesFiltradosPlanilla = useMemo(
        () =>
            (materiales || []).filter((mat) => {
                const estadoRegistro = normalizarEstadoRegistroMaterial(mat?.estado_registro);
                const cumpleEstado =
                    filtroVistaMaterialesPlanilla === "todo" ||
                    (filtroVistaMaterialesPlanilla === "no_aplica" && estadoRegistro === "no_aplica") ||
                    (filtroVistaMaterialesPlanilla === "pendiente" && estadoRegistro === "pendiente");
                const cumpleCategoria =
                    categoriaMaterialPlanilla === "Todas" ||
                    obtenerCategoriaMaterial(mat?.nombre || "") === categoriaMaterialPlanilla;
                return cumpleEstado && cumpleCategoria;
            }),
        [categoriaMaterialPlanilla, filtroVistaMaterialesPlanilla, materiales]
    );

    const socketBaseUrl = useMemo(() => {
        const env = process.env.REACT_APP_API_BASE_URL;
        if (env && /^https?:\/\//i.test(env)) return env.replace(/\/api\/?$/i, "");
        if (window.location.hostname === "localhost") return "http://localhost:5000";
        return `${window.location.protocol}//${window.location.host}`;
    }, []);

    const socketTransports = useMemo(() => {
        const forcePolling = process.env.REACT_APP_SOCKET_POLLING_ONLY === "1";
        if (forcePolling) return ["polling"];
        return ["websocket", "polling"];
    }, []);

    const materialKey = useCallback((m = {}) => String(m.nombre || "").trim().toLowerCase(), []);
    const materialHash = useCallback((m = {}) => {
        const cantidad = Number(m.cantidad) || 0;
        const caja = nombreCajaSeguro(m.caja);
        return `${cantidad}|${caja}`;
    }, []);
    const crearSnapshotMateriales = useCallback((lista = []) => {
        const snap = {};
        (lista || []).forEach((m) => {
            const key = materialKey(m);
            if (key) snap[key] = materialHash(m);
        });
        return snap;
    }, [materialHash, materialKey]);

    const normalizarNombreEquipo = useCallback((nombre = "") => {
        let n = String(nombre || "")
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        if (SINONIMOS_EQUIPOS[n]) n = SINONIMOS_EQUIPOS[n];
        return n;
    }, []);

    const esEquipoMigradoAMaterial = useCallback(
        (nombre = "") => EQUIPOS_MIGRADOS_A_MATERIALES.has(normalizarNombreEquipo(nombre)),
        [normalizarNombreEquipo]
    );

    const mergeEquiposPredef = useCallback((lista = []) => {
        const listaFiltrada = (lista || []).filter((e) => !esEquipoMigradoAMaterial(e?.nombre || ""));
        const mapa = new Map(
            listaFiltrada.map((e) => [normalizarNombreEquipo(e.nombre || ""), e])
        );
        const base = EQUIPOS_PREDEF.map((nombre) => {
            const key = normalizarNombreEquipo(nombre);
            const found = mapa.get(key);
            return {
                nombre,
                ip: found?.ip || "",
                observacion: found?.observacion || "",
                codigo: found?.codigo || "",
                numero_serie: found?.numero_serie || "",
                estado: found?.estado || "",
                caja: normalizarCajaEquipoInicial(found?.caja, found || {}),
                id_equipo: found?.id_equipo,
                centro_id: found?.centro_id,
                estado_registro: normalizarEstadoRegistroEquipo(found?.estado_registro),
                observacion_registro: found?.observacion_registro || ""
            };
        });
        const extras = listaFiltrada.filter(
            (e) => !EQUIPOS_PREDEF.some((p) => normalizarNombreEquipo(p) === normalizarNombreEquipo(e.nombre || ""))
        );
        const extrasNorm = extras.map((e) => ({
            ...e,
            caja: normalizarCajaEquipoInicial(e.caja, e),
            nombre: e.nombre,
            estado_registro: normalizarEstadoRegistroEquipo(e?.estado_registro),
            observacion_registro: e?.observacion_registro || ""
        }));
        return [...base, ...extrasNorm];
    }, [esEquipoMigradoAMaterial, normalizarNombreEquipo]);

    const prioridadEquipo = useCallback((nombre = "") => {
        let n = nombre.toLowerCase().trim();
        if (SINONIMOS_EQUIPOS[n]) n = SINONIMOS_EQUIPOS[n];
        const idx = ORDEN_EQUIPOS.findIndex((o) => o === n);
        if (idx >= 0) return idx;
        // buscar por contiene cuando no es coincidencia exacta
        const idxContains = ORDEN_EQUIPOS.findIndex((o) => n.includes(o));
        return idxContains >= 0 ? idxContains : ORDEN_EQUIPOS.length + 100; // enviar al final
    }, []);

    // Escáner desactivado: N° serie se ingresa manualmente

    const equiposOrdenados = useMemo(
        () =>
            equipos
                .map((eq, index) => ({ ...eq, __idx: index }))
                .sort((a, b) => prioridadEquipo(a.nombre) - prioridadEquipo(b.nombre)),
        [equipos, prioridadEquipo]
    );

    const equiposOrdenadosFiltradosPlanilla = useMemo(() => {
        if (filtroVistaEquiposPlanilla === "todo") return equiposOrdenados;
        return equiposOrdenados.filter((eq) => {
            const estadoRegistro = normalizarEstadoRegistroEquipo(eq?.estado_registro);
            if (filtroVistaEquiposPlanilla === "no_aplica") return estadoRegistro === "no_aplica";
            if (filtroVistaEquiposPlanilla === "pendiente") return estadoRegistro === "pendiente";
            return true;
        });
    }, [equiposOrdenados, filtroVistaEquiposPlanilla]);

    // Arma una lista combinada con filas de título + filas de ítems para mostrar secciones
    const equiposConTitulos = useMemo(() => {
        const lista = [];
        const usado = new Set();
        const pushGrupo = (titulo, items) => {
            const itemsNorm = items.map((n) => normalizarNombreEquipo(n));
            const presentes = equiposOrdenadosFiltradosPlanilla.filter(
                (eq) =>
                    !usado.has(eq.__idx) &&
                    itemsNorm.includes(normalizarNombreEquipo(eq.nombre || ""))
            );
            if (presentes.length === 0) return;
            lista.push({ tipo: "titulo", titulo });
            presentes.forEach((eq) => {
                lista.push({ tipo: "item", data: eq });
                usado.add(eq.__idx);
            });
        };
        GRUPOS_EQUIPOS.forEach((g) => pushGrupo(g.titulo, g.items));
        // Extras no agrupados
        const extras = equiposOrdenadosFiltradosPlanilla.filter((eq) => !usado.has(eq.__idx));
        if (extras.length) {
            lista.push({ tipo: "titulo", titulo: "Otros" });
            extras.forEach((eq) => lista.push({ tipo: "item", data: eq }));
        }
        return lista;
    }, [equiposOrdenadosFiltradosPlanilla, normalizarNombreEquipo]);
    const esMovil = useMemo(
        () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || ""),
        []
    );

    // Nota: no se usan cajas historicas para el contador visible de planilla.
    // El total debe reflejar solo cajas activas detectadas en equipos/materiales actuales.

    const tecnicoRecientePorEquipo = useMemo(() => {
        const mapa = new Map();
        (movimientos || [])
            .filter((m) => m.tipo === "equipo")
            .forEach((m) => {
                const key = String(m.item_id || "");
                if (!key || mapa.has(key)) return;
                const nombre = m.tecnico_nombre || (m.tecnico_id ? `ID ${m.tecnico_id}` : "");
                if (nombre) mapa.set(key, nombre);
            });
        return mapa;
    }, [movimientos]);

    const tecnicoRecientePorMaterial = useMemo(() => {
        const mapa = new Map();
        (movimientos || [])
            .filter((m) => m.tipo === "material")
            .forEach((m) => {
                const key = String(m.nombre_item || "").toLowerCase().trim();
                if (!key || mapa.has(key)) return;
                const nombre = m.tecnico_nombre || (m.tecnico_id ? `ID ${m.tecnico_id}` : "");
                if (nombre) mapa.set(key, nombre);
            });
        return mapa;
    }, [movimientos]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            setRol(decoded.rol || "");
            setUserId(decoded.id || decoded.user_id || decoded.sub || null);
            setUserNombre(decoded.name || decoded.nombre || decoded.username || decoded.email || "usuario");
            const areas = Array.isArray(decoded.supervisor_areas)
                ? decoded.supervisor_areas
                      .map((x) => String(x || "").trim().toLowerCase())
                      .filter((x) => ["camaras", "pc", "energia"].includes(x))
                : [];
            setSupervisorAreas(Array.from(new Set(areas)));
        } catch (err) {
            console.error("Error al decodificar token:", err);
        }
    }, []);

    useEffect(() => {
        if (!location.state?.openAssignModal) return;
        setEditingId(null);
        setClienteSel("");
        setCentroSel("");
        setTecnicoSel("");
        setEstadoAsignacion("pendiente");
        setObservacion("");
        setShowModal(true);
        navigate(location.pathname, { replace: true, state: null });
    }, [location, navigate]);

    const recargarMovimientosRecientes = useCallback((pageObjetivo = movsPage) => {
        const requestId = movsRequestRef.current + 1;
        movsRequestRef.current = requestId;
        const filtros = {};
        if (movArmadoFiltro) filtros.armado_id = movArmadoFiltro;
        if (movClienteFiltro) filtros.cliente = movClienteFiltro;
        if ((movSerieFiltro || "").trim()) filtros.numero_serie = movSerieFiltro.trim();
        cargarMovimientosRecientes((items) => {
            if (movsRequestRef.current !== requestId) return;
            setMovimientosRecientes(items);
        }, movsLimit, pageObjetivo, (meta) => {
            if (movsRequestRef.current !== requestId) return;
            setMovsTotal(meta.total || 0);
            setMovsLimit(meta.limit || movsLimit);
            if (Number(meta.page || pageObjetivo) !== Number(pageObjetivo)) {
                setMovsPage(meta.page || 1);
            }
        }, filtros);
    }, [movArmadoFiltro, movClienteFiltro, movSerieFiltro, movsLimit, movsPage]);

    useEffect(() => {
        recargarMovimientosRecientesRef.current = recargarMovimientosRecientes;
    }, [recargarMovimientosRecientes]);

    useEffect(() => {
        const targetId = String(tecnicoPrincipalPlanilla?.id || tecnicosActivosPlanilla[0]?.id || "");
        setTransferObjetivoSel(targetId);
        setTransferTecSel("");
        setTransferNota("");
    }, [tecnicoPrincipalPlanilla, tecnicosActivosPlanilla, armadoActivo?.id_armado]);

    const handleEliminarMovimientoGlobal = useCallback(async (mov) => {
        const id = Number(mov?.id_movimiento || 0);
        if (!id) return;
        if (!window.confirm("Quieres eliminar este movimiento del historial global?")) return;
        try {
            await borrarMovimientoGlobal(id);
            await recargarMovimientosRecientes();
            if (armadoActivo?.id_armado && Number(armadoActivo.id_armado) === Number(mov?.armado_id)) {
                await cargarMovimientos(armadoActivo.id_armado, setMovimientos);
                const nombreCentro = armadoActivo?.centro?.nombre || armadoActivo?.centro_nombre;
                if (nombreCentro) {
                    const detalles = await cargarDetallesCentro(nombreCentro);
                    const equiposNorm = mergeEquiposPredef(detalles?.equipos || []);
                    setEquipos(equiposNorm);
                }
            }
        } catch (error) {
            const status = error?.response?.status;
            const msg = error?.response?.data?.message || error?.message;
            if (status === 403) {
                alert("Solo un administrador puede eliminar movimientos.");
            } else {
                alert(`No se pudo eliminar el movimiento.${msg ? ` (${msg})` : ""}`);
            }
        }
    }, [armadoActivo, recargarMovimientosRecientes, mergeEquiposPredef]);

    const handleVerHistorialCentro = useCallback(async () => {
        if (!movArmadoFiltro) return;
        setHistorialLoading(true);
        setHistorialOpen(true);
        setHistorialTab("resumen");
        try {
            const data = await cargarHistorialEquiposArmado(movArmadoFiltro);
            setHistorialData({
                armado: data?.armado || null,
                resumen: Array.isArray(data?.resumen) ? data.resumen : [],
                eventos: Array.isArray(data?.eventos) ? data.eventos : []
            });
        } catch (error) {
            setHistorialData({ armado: null, resumen: [], eventos: [] });
            alert("No se pudo cargar el historial del centro.");
        } finally {
            setHistorialLoading(false);
        }
    }, [movArmadoFiltro]);

    const armadoHistorialSeleccionado = useMemo(
        () => (armados || []).find((a) => String(a?.id_armado) === String(movArmadoFiltro)) || null,
        [armados, movArmadoFiltro]
    );

    const cajasEstadoHistorial = useMemo(() => {
        const raw = armadoHistorialSeleccionado?.cajas_estado;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
        const estadoMap = {};
        Object.entries(raw).forEach(([nombre, estado]) => {
            const cajaNombre = String(nombre || "").trim();
            if (!cajaNombre) return;
            estadoMap[cajaNombre] = String(estado || "").trim().toLowerCase() === "cerrada" ? "cerrada" : "abierta";
        });
        return estadoMap;
    }, [armadoHistorialSeleccionado]);

    const construirResumenCajas = useCallback((listaMovimientos = []) => {
        const porCaja = new Map();
        const asegurarCaja = (nombreCaja) => {
            const limpio = nombreCajaSeguro(nombreCaja);
            if (esCajaVirtualOEspecial(limpio)) return null;
            if (!porCaja.has(limpio)) {
                porCaja.set(limpio, {
                    nombre: limpio,
                    estado: cajasEstadoHistorial[limpio] || "abierta",
                    equipos: 0,
                    materiales: 0,
                    ultimaFecha: null,
                    items: []
                });
            }
            return porCaja.get(limpio);
        };

        Object.keys(cajasEstadoHistorial).forEach((nombreCaja) => asegurarCaja(nombreCaja));

        const ultimosItems = new Map();
        [...(Array.isArray(listaMovimientos) ? listaMovimientos : [])]
            .sort((a, b) => {
                const fechaA = new Date(a?.fecha || 0).getTime();
                const fechaB = new Date(b?.fecha || 0).getTime();
                if (fechaB !== fechaA) return fechaB - fechaA;
                return Number(b?.id_movimiento || 0) - Number(a?.id_movimiento || 0);
            })
            .forEach((mov) => {
                const tipo = String(mov?.tipo || "").trim().toLowerCase();
                const nombreCaja = nombreCajaSeguro(mov?.caja);
                if (esCajaVirtualOEspecial(nombreCaja)) return;
                const itemBase = tipo === "material"
                    ? String(mov?.nombre_item || "").trim().toLowerCase()
                    : String(mov?.item_id || mov?.numero_serie || mov?.nombre_item || "").trim().toLowerCase();
                const itemKey = `${tipo}:${itemBase}`;
                if (!itemBase || ultimosItems.has(itemKey)) return;
                ultimosItems.set(itemKey, { ...mov, tipo, caja: nombreCaja });
            });

        ultimosItems.forEach((mov) => {
            const caja = asegurarCaja(mov.caja);
            const fechaMov = mov?.fecha || null;
            if (fechaMov && (!caja.ultimaFecha || new Date(fechaMov).getTime() > new Date(caja.ultimaFecha).getTime())) {
                caja.ultimaFecha = fechaMov;
            }

            if (mov.tipo === "material") {
                const cantidad = Number(mov?.cantidad || 0);
                if (cantidad <= 0) return;
                caja.materiales += 1;
                caja.items.push({
                    key: `material-${mov?.id_movimiento || mov?.nombre_item || caja.items.length}`,
                    tipo: "material",
                    nombre: mov?.nombre_item || "Material",
                    detalle: `Cantidad: ${cantidad}`
                });
                return;
            }

            const esPendiente = String(mov?.caja || "").trim().toLowerCase() === DEFAULT_PENDING_BOX.toLowerCase();
            const numeroSerie = String(mov?.numero_serie || "").trim();
            if (esPendiente && !numeroSerie) return;

            caja.equipos += 1;
            caja.items.push({
                key: `equipo-${mov?.id_movimiento || mov?.item_id || caja.items.length}`,
                tipo: "equipo",
                nombre: mov?.nombre_item || "Equipo",
                detalle: numeroSerie ? `N Serie: ${numeroSerie}` : "Sin N Serie"
            });
        });

        return Array.from(porCaja.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: "base" }));
    }, [cajasEstadoHistorial]);

    const cajasResumenOrdenado = useMemo(() => {
        const lista = Array.isArray(cajasResumenData) ? [...cajasResumenData] : [];
        return lista.sort((a, b) =>
            String(a?.nombre || "").localeCompare(String(b?.nombre || ""), undefined, { numeric: true, sensitivity: "base" })
        );
    }, [cajasResumenData]);

    const cajasResumenMeta = useMemo(() => {
        const cerradas = cajasResumenOrdenado.filter((caja) => String(caja?.estado || "").trim().toLowerCase() === "cerrada").length;
        const abiertas = cajasResumenOrdenado.length - cerradas;
        return {
            totalReal: cajasResumenOrdenado.length,
            abiertas,
            cerradas
        };
    }, [cajasResumenOrdenado]);

    const handleVerResumenCajas = useCallback(async () => {
        if (!movArmadoFiltro) return;
        setCajasResumenOpen(true);
        setCajasResumenLoading(true);
        setCajasResumenError("");
        try {
            const data = await obtenerMovimientosArmado(movArmadoFiltro);
            setCajasResumenData(construirResumenCajas(Array.isArray(data) ? data : []));
        } catch (error) {
            setCajasResumenData([]);
            setCajasResumenError("No se pudo cargar el detalle de cajas.");
        } finally {
            setCajasResumenLoading(false);
        }
    }, [movArmadoFiltro, construirResumenCajas]);
    const historialResumen = useMemo(() => (Array.isArray(historialData?.resumen) ? historialData.resumen : []), [historialData]);
    const historialEventos = useMemo(() => (Array.isArray(historialData?.eventos) ? historialData.eventos : []), [historialData]);
    const totalEquiposHistorial = useMemo(() => {
        const totalReferencia = Number(historialData?.armado?.total_equipos_referencia || 0);
        return totalReferencia > 0 ? totalReferencia : historialResumen.length;
    }, [historialData, historialResumen]);
    const totalEquiposInstaladosHistorial = useMemo(
        () => {
            const instaladosReferencia = Number(historialData?.armado?.equipos_instalados_referencia || 0);
            if (instaladosReferencia > 0) return instaladosReferencia;
            return historialResumen.filter((r) => {
                const serieActual = String(r?.serie_actual || "").trim();
                return serieActual && serieActual !== "-" && !r?.devuelto_bodega;
            }).length;
        },
        [historialData, historialResumen]
    );

    const normalizarNombreHistorial = useCallback((nombre = "") => {
        const base = String(nombre || "").replace(/\s*\(reemplazo_mantencion_N\d+\)\s*$/i, "").trim();
        return normalizarNombreEquipo(base);
    }, [normalizarNombreEquipo]);

    const historialResumenPorNombre = useMemo(() => {
        const map = new Map();
        historialResumen.forEach((r) => {
            const key = normalizarNombreHistorial(r?.nombre_item || "");
            if (!key) return;
            map.set(key, r);
        });
        return map;
    }, [historialResumen, normalizarNombreHistorial]);

    const historialDetalleFilas = useMemo(() => {
        const filas = [];
        const usados = new Set();
        GRUPOS_EQUIPOS.forEach((g) => {
            filas.push({ tipo: "titulo", titulo: g.titulo });
            g.items.forEach((nombre) => {
                const key = normalizarNombreEquipo(nombre);
                usados.add(key);
                filas.push({ tipo: "item", nombre, key, data: historialResumenPorNombre.get(key) || null });
            });
        });
        historialResumen.forEach((r) => {
            const key = normalizarNombreHistorial(r?.nombre_item || "");
            if (!key || usados.has(key)) return;
            if (!filas.some((f) => f.tipo === "titulo" && f.titulo === "Otros")) {
                filas.push({ tipo: "titulo", titulo: "Otros" });
            }
            filas.push({ tipo: "item", nombre: r.nombre_item || "-", key, data: r });
        });
        return filas;
    }, [historialResumen, historialResumenPorNombre, normalizarNombreEquipo, normalizarNombreHistorial]);

    const metricasHistorial = useMemo(() => {
        const equiposConCambios = historialResumen.filter((r) => Number(r?.cambios || 0) > 0 || !!r?.devuelto_bodega).length;
        const cambiosTotales = historialResumen.reduce((acc, r) => acc + Number(r?.cambios || 0), 0);
        const ultimoCambio = historialEventos.length ? historialEventos[0]?.fecha : null;
        return { equiposConCambios, cambiosTotales, ultimoCambio };
    }, [historialResumen, historialEventos]);

    const historialResumenConCambios = useMemo(
        () => historialResumen.filter((r) => Number(r?.cambios || 0) > 0 || !!r?.devuelto_bodega),
        [historialResumen]
    );

    // Historial global: recarga inmediata al cambiar pagina, limite o filtros.
    useEffect(() => {
        recargarMovimientosRecientes();
    }, [recargarMovimientosRecientes]);

    // Historial global: fallback polling (si websocket no conecta)
    useEffect(() => {
        const interval = setInterval(() => recargarMovimientosRecientesRef.current?.(), 30000);
        const onFocus = () => recargarMovimientosRecientesRef.current?.();
        const onVisible = () => {
            if (document.visibilityState === "visible") recargarMovimientosRecientesRef.current?.();
        };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);

    // Detectar nuevos registros para resaltarlos temporalmente en la parte superior.
    useEffect(() => {
        if (movsPage !== 1) return;
        const idsActuales = (movimientosRecientes || [])
            .map((m) => Number(m.id_movimiento || 0))
            .filter((n) => Number.isFinite(n) && n > 0);
        if (!idsActuales.length) return;

        const maxActual = Math.max(...idsActuales);
        if (!lastSeenMovIdRef.current) {
            lastSeenMovIdRef.current = maxActual;
            return;
        }
        const nuevos = idsActuales.filter((id) => id > lastSeenMovIdRef.current);
        if (nuevos.length) {
            nuevos.forEach((id) => {
                const key = String(id);
                setMovimientosNuevos((prev) => ({ ...prev, [key]: true }));
                setTimeout(() => {
                    setMovimientosNuevos((prev) => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                    });
                }, 9000);
            });
        }
        lastSeenMovIdRef.current = Math.max(lastSeenMovIdRef.current, maxActual);
    }, [movimientosRecientes, movsPage]);

    useEffect(() => {
        if (!Object.keys(movimientosNuevos).length) return;
        const interval = setInterval(() => setParpadeoOn((v) => !v), 450);
        return () => clearInterval(interval);
    }, [movimientosNuevos]);

    const movimientosRecientesOrdenados = useMemo(() => {
        return [...(movimientosRecientes || [])].sort((a, b) => {
            const fa = new Date(a.fecha || 0).getTime();
            const fb = new Date(b.fecha || 0).getTime();
            if (fb !== fa) return fb - fa;
            return Number(b.id_movimiento || 0) - Number(a.id_movimiento || 0);
        });
    }, [movimientosRecientes]);

    const clienteArmado = useCallback((a = {}) => {
        return a?.centro?.cliente || a?.cliente || a?.cliente_nombre || "";
    }, []);

    const clientesMovimientos = useMemo(() => {
        const set = new Set();
        (armados || []).forEach((a) => {
            const c = String(clienteArmado(a) || "").trim();
            if (c) set.add(c);
        });
        return Array.from(set).sort((x, y) => x.localeCompare(y));
    }, [armados, clienteArmado]);

    const armadosFiltroCliente = useMemo(() => {
        if (!movClienteFiltro) return armados || [];
        return (armados || []).filter((a) => String(clienteArmado(a) || "").trim() === movClienteFiltro);
    }, [armados, movClienteFiltro, clienteArmado]);

    const movimientosRecientesFiltrados = useMemo(
        () => movimientosRecientesOrdenados,
        [movimientosRecientesOrdenados]
    );

    const movimientosVisibles = useMemo(
        () => movimientosRecientesFiltrados.slice(0, movsLimit),
        [movimientosRecientesFiltrados, movsLimit]
    );
    const idsVisibles = useMemo(
        () => movimientosVisibles.map((m) => Number(m.id_movimiento)).filter((n) => Number.isFinite(n)),
        [movimientosVisibles]
    );
    const allVisibleSelected = idsVisibles.length > 0 && idsVisibles.every((id) => movSeleccionados.includes(id));

    const toggleSeleccionMovimiento = useCallback((idMov) => {
        const id = Number(idMov);
        if (!id) return;
        setMovSeleccionados((prev) => (
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        ));
    }, []);

    const toggleSeleccionVisibles = useCallback(() => {
        if (!idsVisibles.length) return;
        setMovSeleccionados((prev) => {
            if (allVisibleSelected) return prev.filter((id) => !idsVisibles.includes(id));
            return Array.from(new Set([...prev, ...idsVisibles]));
        });
    }, [idsVisibles, allVisibleSelected]);

    const handleEliminarSeleccionados = useCallback(async () => {
        if (!movSeleccionados.length || eliminandoSeleccion) return;
        if (!window.confirm(`Quieres eliminar ${movSeleccionados.length} movimiento(s)?`)) return;
        setEliminandoSeleccion(true);
        let ok = 0;
        let ultimoError = null;
        for (const id of movSeleccionados) {
            try {
                await borrarMovimientoGlobal(id);
                ok += 1;
            } catch (err) {
                ultimoError = err;
            }
        }
        setEliminandoSeleccion(false);
        setMovSeleccionados([]);
        await recargarMovimientosRecientes();
        if (armadoActivo?.id_armado) {
            await cargarMovimientos(armadoActivo.id_armado, setMovimientos);
        }
        if (ok < movSeleccionados.length) {
            const msg = ultimoError?.response?.data?.message || ultimoError?.message || "";
            alert(`Se eliminaron ${ok} de ${movSeleccionados.length}.${msg ? ` (${msg})` : ""}`);
        }
    }, [movSeleccionados, eliminandoSeleccion, recargarMovimientosRecientes, armadoActivo, cargarMovimientos]);

    const movsTotalVista = movsTotal || 0;
    const movsTotalPaginasVista = movsTotalVista ? Math.ceil(movsTotalVista / movsLimit) : 1;

    useEffect(() => {
        if (!movArmadoFiltro) return;
        const exists = (armadosFiltroCliente || []).some((a) => String(a.id_armado) === String(movArmadoFiltro));
        if (!exists) setMovArmadoFiltro("");
    }, [movArmadoFiltro, armadosFiltroCliente]);

    useEffect(() => {
        if (movsPage > movsTotalPaginasVista) {
            setMovsPage(movsTotalPaginasVista);
        }
    }, [movsPage, movsTotalPaginasVista]);

    useEffect(() => {
        setMovSeleccionados([]);
    }, [movClienteFiltro, movArmadoFiltro, movSerieFiltro, movsPage, movsLimit]);

    useEffect(() => {
        if (!puedeGestionarArmados) return;
        cargarUsuarios((lista) => {
            const soloTecnicos = (lista || []).filter((u) => u.rol === "tecnico");
            setTecnicos(soloTecnicos);
        });
        obtenerClientes(setClientes, () => {});
    }, [puedeGestionarArmados]);

    const handleClienteChange = async (idCliente) => {
        setClienteSel(idCliente);
        setCentroSel("");
        if (!idCliente) {
            setCentros([]);
            return;
        }
        await obtenerCentrosPorCliente(idCliente, setCentros, () => {});
    };

    const fetchArmados = useCallback(async ({ silent = false } = {}) => {
        if (!rol) return;
        if (!silent) setLoading(true);
        setError("");
        const params = {};
        if (filtroEstado) params.estado = filtroEstado;
        if (rol === "admin") {
            if (filtroTecnico) params.tecnico_id = filtroTecnico;
        } else if (rol === "tecnico" && userId) {
            params.tecnico_id = userId;
        }
        try {
            await cargarArmados(setArmados, params);
        } catch (err) {
            setError("No se pudieron cargar los armados.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [rol, userId, filtroEstado, filtroTecnico]);

    useEffect(() => {
        fetchArmados();
    }, [fetchArmados]);

    // Refresco automatico de asignaciones para reflejar cambios remotos (ej. mobile).
    useEffect(() => {
        const interval = setInterval(() => {
            fetchArmados({ silent: true });
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchArmados]);

    // Realtime por Socket.IO (opcion principal para escalar).
    useEffect(() => {
        if (!rol) return undefined;
        const socket = io(socketBaseUrl, {
            transports: socketTransports,
            reconnection: true
        });
        const onArmadoUpdated = (evt = {}) => {
            fetchArmados({ silent: true });
            recargarMovimientosRecientesRef.current?.();
            if (planillaOpen && armadoActivo && Number(evt.armado_id) === Number(armadoActivo.id_armado)) {
                cargarMovimientos(armadoActivo.id_armado, setMovimientos);
                cargarMateriales(armadoActivo.id_armado, (lista) => {
                    const merged = mergeMateriales(lista);
                    setMateriales(merged);
                });
            }
        };
        socket.on("armado_updated", onArmadoUpdated);
        return () => {
            socket.off("armado_updated", onArmadoUpdated);
            socket.disconnect();
        };
    }, [rol, socketBaseUrl, socketTransports, fetchArmados, planillaOpen, armadoActivo, mergeMateriales]);

    const renderEstado = (estado) => {
        const normalizado = (estado || "pendiente").toLowerCase();
        const map = {
            pendiente: { clase: "badge badge-pill badge-warning", label: "Pendiente" },
            en_proceso: { clase: "badge badge-pill badge-info", label: "En proceso" },
            prefinalizado: { clase: "badge badge-pill", label: "Prefinalizado" },
            finalizado: { clase: "badge badge-pill badge-success", label: "Finalizado" }
        };
        const { clase, label } = map[normalizado] || map.pendiente;
        return <span className={clase} style={normalizado === "prefinalizado" ? { backgroundColor: "#7c3aed", color: "#fff" } : undefined}>{label}</span>;
    };

    const formatearFecha = (valor) => {
        if (!valor) return "-";
        const raw = String(valor).trim();
        const soloFecha = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (soloFecha) {
            const [, anio, mes, dia] = soloFecha;
            return `${dia}/${mes}/${anio}`;
        }
        const fecha = new Date(valor);
        if (Number.isNaN(fecha.getTime())) return "-";
        const usarUTC = /(?:gmt|utc|z|[+\-]\d{2}:?\d{2})/i.test(raw);
        const dia = String(usarUTC ? fecha.getUTCDate() : fecha.getDate()).padStart(2, "0");
        const mes = String((usarUTC ? fecha.getUTCMonth() : fecha.getMonth()) + 1).padStart(2, "0");
        const anio = usarUTC ? fecha.getUTCFullYear() : fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    };

    const parseFechaHoraBackend = (valor) => {
        if (!valor) return null;
        const raw = String(valor).trim();
        if (!raw) return null;
        const sinZona = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw);
        const fecha = new Date(sinZona ? `${raw}Z` : raw);
        return Number.isNaN(fecha.getTime()) ? null : fecha;
    };

    const formatearFechaHora = (valor) => {
        if (!valor) return "-";
        const fecha = parseFechaHoraBackend(valor);
        if (!fecha) return "-";
        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const anio = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, "0");
        const minutos = String(fecha.getMinutes()).padStart(2, "0");
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
    };

    const checklistStorageKey = useCallback((armadoId) => `orcagest_armado_checklist_v1_${armadoId}`, []);

    const leerChecklistGuardado = useCallback(
        (armadoId) => {
            if (!armadoId) return { checks: {}, observacion: "" };
            try {
                const raw = localStorage.getItem(checklistStorageKey(armadoId));
                if (!raw) return { checks: {}, observacion: "" };
                const parsed = JSON.parse(raw);
                return {
                    checks: parsed?.checks && typeof parsed.checks === "object" ? parsed.checks : {},
                    observacion: String(parsed?.observacion || ""),
                };
            } catch (err) {
                console.error("No se pudo leer checklist de armado:", err);
                return { checks: {}, observacion: "" };
            }
        },
        [checklistStorageKey]
    );

    const obtenerProgresoChecklist = useCallback(
        (armadoId) => {
            const saved = leerChecklistGuardado(armadoId);
            const done = CHECKLIST_ARMADO_ITEMS.filter((it) => {
                const row = saved.checks?.[it.key];
                return !!String(row?.estado || "").trim();
            }).length;
            return { done, total: CHECKLIST_ARMADO_ITEMS.length };
        },
        [leerChecklistGuardado, checklistVersion]
    );

    const abrirChecklistArmado = useCallback(
        (armado) => {
            const armadoId = Number(armado?.id_armado || armado?.id || 0) || 0;
            const saved = leerChecklistGuardado(armadoId);
            setChecklistArmado(armado);
            setChecklistEstado(saved.checks || {});
            setChecklistObs(saved.observacion || "");
            setChecklistAreaActiva("");
            setChecklistOpen(true);
        },
        [leerChecklistGuardado]
    );

    const checklistSeccionesVisibles = useMemo(() => {
        if (!checklistAreaActiva) return CHECKLIST_ARMADO_SECCIONES;
        const area = CHECKLIST_ARMADO_AREAS.find((a) => a.key === checklistAreaActiva);
        if (!area) return CHECKLIST_ARMADO_SECCIONES;
        const seccionesPermitidas = new Set(area.secciones || []);
        return CHECKLIST_ARMADO_SECCIONES.filter((_, idx) => seccionesPermitidas.has(idx + 1));
    }, [checklistAreaActiva]);

    const actualizarChecklistItem = useCallback((itemKey, patch) => {
        setChecklistEstado((prev) => {
            const curr = prev?.[itemKey] && typeof prev[itemKey] === "object" ? prev[itemKey] : { estado: "", fecha: "", observacion: "" };
            return {
                ...prev,
                [itemKey]: {
                    ...curr,
                    ...patch,
                },
            };
        });
    }, []);

    const guardarChecklistArmado = useCallback(() => {
        const armadoId = Number(checklistArmado?.id_armado || checklistArmado?.id || 0) || 0;
        if (!armadoId) return;
        try {
            localStorage.setItem(
                checklistStorageKey(armadoId),
                JSON.stringify({
                    checks: checklistEstado,
                    observacion: checklistObs,
                    updated_at: new Date().toISOString(),
                })
            );
            setChecklistVersion((v) => v + 1);
            alert("Checklist guardado correctamente.");
        } catch (err) {
            console.error("No se pudo guardar checklist de armado:", err);
            alert("No se pudo guardar el checklist.");
        }
    }, [checklistArmado, checklistEstado, checklistObs, checklistStorageKey]);

    const progresoChecklistAreas = useMemo(
        () => calcularProgresoChecklistAreas(checklistEstado || {}),
        [checklistEstado]
    );

    const puedeEditarChecklistItem = useCallback(
        (seccionNumero) => {
            if (rol !== "supervisor") return true;
            const area = CHECKLIST_AREA_BY_SECCION[Number(seccionNumero) || 0];
            if (!area) return false;
            return (supervisorAreas || []).includes(area);
        },
        [rol, supervisorAreas]
    );

    const columnas = [
        {
            name: "Centro",
            selector: (row) => row.centro?.nombre || row.centro_nombre || "-",
            sortable: true,
            wrap: false,
            grow: 0.9,
            minWidth: "150px",
            style: {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
            }
        },
        {
            name: "Cliente",
            selector: (row) => row.centro?.cliente || row.cliente || "-",
            sortable: true,
            wrap: false,
            grow: 0.8,
            minWidth: "130px",
            style: {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
            }
        },
        {
            name: "Tecnico",
            selector: (row) => row.tecnico?.nombre || row.tecnico_nombre || "-",
            sortable: true,
            wrap: false,
            grow: 0.8,
            minWidth: "135px",
            cell: (row) => {
                const activos = Array.isArray(row.tecnicos_asignados) ? row.tecnicos_asignados : [];
                const apoyo = activos
                    .filter((tec) => !tec?.principal)
                    .map((tec) => tec?.nombre)
                    .filter(Boolean);
                return (
                    <div>
                        <div>{row.tecnico?.nombre || row.tecnico_nombre || "-"}</div>
                        {apoyo.length ? (
                            <small className="text-muted">Apoyo: {apoyo.join(", ")}</small>
                        ) : row.tecnicos_historial && row.tecnicos_historial.length > 1 ? (
                            <small className="text-muted">
                                Previos: {row.tecnicos_historial.slice(0, -1).join(", ")}
                            </small>
                        ) : null}
                    </div>
                );
            }
        },
        {
            name: "Estado",
            selector: (row) => row.estado || "pendiente",
            sortable: true,
            grow: 0.5,
            wrap: true,
            style: { paddingRight: "4px" },
            cell: (row) => {
                const normalizado = (row.estado || "pendiente").toLowerCase();
                const colorMap = {
                    pendiente: { bg: "#f59e0b", text: "#fff" },
                    en_proceso: { bg: "#0ea5e9", text: "#fff" },
                    prefinalizado: { bg: "#7c3aed", text: "#fff" },
                    finalizado: { bg: "#22c55e", text: "#fff" }
                };
                const { bg, text } = colorMap[normalizado] || colorMap.pendiente;

                return puedeGestionarArmados ? (
                    <div style={{ width: "80px", maxWidth: "100%", overflow: "hidden" }}>
                        <select
                            className="form-control form-control-sm"
                            value={normalizado}
                            onChange={(e) => handleEstadoRapido(row, e.target.value)}
                            style={{
                                backgroundColor: bg,
                                color: text,
                                fontWeight: 700,
                                border: "none",
                                padding: "0 2px",
                                lineHeight: "1.05",
                                height: "22px",
                                width: "100%",
                                maxWidth: "100%",
                                fontSize: "0.72rem",
                                whiteSpace: "nowrap",
                                appearance: "none",
                                WebkitAppearance: "none",
                                MozAppearance: "none"
                            }}
                            size={1}
                        >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En proceso</option>
                            <option value="prefinalizado">Prefinalizado</option>
                            <option value="finalizado">Finalizado</option>
                        </select>
                                            </div>
                ) : (
                    renderEstado(row.estado)
                );
            }
        },
        {
            name: "Asignado",
            selector: (row) => row.fecha_asignacion || row.created_at,
            sortable: true,
            grow: 0.6,
            wrap: true,
            cell: (row) => formatearFecha(row.fecha_asignacion || row.created_at)
        },
        {
            name: "Inicio armado",
            selector: (row) => row.fecha_inicio,
            sortable: true,
            grow: 0.6,
            wrap: true,
            cell: (row) => formatearFecha(row.fecha_inicio)
        },
        {
            name: "Check tecnico",
            selector: (row) => row.check_tecnico_fecha,
            sortable: true,
            grow: 0.65,
            wrap: true,
            cell: (row) => <span style={{ color: "#15803d", fontWeight: 700 }}>{formatearFecha(row.check_tecnico_fecha)}</span>
        },
        {
            name: "Cierre",
            selector: (row) => row.fecha_cierre,
            sortable: true,
            grow: 0.5,
            wrap: true,
            cell: (row) => formatearFecha(row.fecha_cierre)
        },
        {
            name: "Total bultos",
            selector: (row) => row.total_cajas || 0,
            sortable: true,
            grow: 0.5,
            wrap: true,
            cell: (row) => row.total_cajas ?? 0
        },
        {
            name: "Armado",
            selector: (row) => Number(row?.porcentaje_armado || 0),
            sortable: true,
            grow: 0.55,
            wrap: true,
            cell: (row) => {
                const porcentaje = Math.max(0, Math.min(100, Number(row?.porcentaje_armado || 0)));
                const color = porcentaje >= 100 ? "#15803d" : "#b91c1c";
                const fondo = porcentaje >= 100 ? "#dcfce7" : "#fee2e2";
                const borde = porcentaje >= 100 ? "#86efac" : "#fca5a5";
                return (
                    <span
                        className="badge badge-pill"
                        style={{ background: fondo, color, border: `1px solid ${borde}`, fontWeight: 700 }}
                    >
                        {porcentaje}%
                    </span>
                );
            }
        },
        {
            name: "Pendientes",
            selector: (row) => Number(row?.armado_equipos_pendientes || 0),
            sortable: true,
            grow: 0.55,
            wrap: true,
            cell: (row) => {
                const pendientes = Math.max(0, Number(row?.armado_equipos_pendientes || 0));
                return (
                    <span
                        className="badge badge-pill"
                        style={{
                            background: pendientes > 0 ? "#fff7ed" : "#f0fdf4",
                            color: pendientes > 0 ? "#c2410c" : "#166534",
                            border: `1px solid ${pendientes > 0 ? "#fdba74" : "#86efac"}`,
                            fontWeight: 700
                        }}
                    >
                        {pendientes}
                    </span>
                );
            }
        },
        {
            name: "Checklist",
            selector: (row) => {
                const progreso = obtenerProgresoChecklist(row?.id_armado || row?.id);
                if (!progreso.total) return 0;
                return Math.round((progreso.done / progreso.total) * 100);
            },
            sortable: true,
            grow: 0.62,
            minWidth: "130px",
            wrap: true,
            cell: (row) => {
                const progreso = obtenerProgresoChecklist(row?.id_armado || row?.id);
                const pct = progreso.total ? Math.round((progreso.done / progreso.total) * 100) : 0;
                const color = pct >= 100 ? "#16a34a" : pct >= 60 ? "#f59e0b" : "#dc2626";
                return (
                    <div style={{ minWidth: 112 }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <small>{progreso.done}/{progreso.total || 0}</small>
                            <strong style={{ color }}>{pct}%</strong>
                                            </div>
                        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999 }}>
                            <div
                                style={{
                                    height: "100%",
                                    width: `${pct}%`,
                                    background: color,
                                    borderRadius: 999,
                                    transition: "width .25s ease"
                                }}
                            />
                                            </div>
                                            </div>
                );
            }
        },
        {
            name: "Planilla",
            grow: 1.1,
            minWidth: "285px",
            wrap: true,
            cell: (row) => {
                const progreso = obtenerProgresoChecklist(row?.id_armado || row?.id);
                const listo = progreso.total > 0 && progreso.done === progreso.total;
                const esFinalizado = (row.estado || "").toLowerCase() === "finalizado";
                return (
                    <div className="d-flex align-items-center" style={{ gap: 6, flexWrap: "wrap" }}>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleAbrirPlanilla(row)}>
                            <i className="fas fa-list-alt mr-1" />
                            Planilla
                        </button>
                        <button className={`btn btn-sm ${listo ? "btn-success" : "btn-outline-secondary"}`} onClick={() => abrirChecklistArmado(row)}>
                            <i className="fas fa-clipboard-check mr-1" />
                            Checklist
                        </button>
                        {esFinalizado && (
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => descargarPdfArmado(row)}
                                title="Descargar PDF"
                            >
                                <i className="fas fa-file-pdf" />
                            </button>
                        )}
                        {puedeVerObservacionArmado && (
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() =>
                                    setObservacionDetalle({
                                        open: true,
                                        armadoId: row?.id_armado || row?.id || null,
                                        centro: row?.centro?.nombre || row?.centro_nombre || "Armado",
                                        texto: String(row?.observacion || "").trim(),
                                        saving: false
                                    })
                                }
                                title="Ver observación"
                            >
                                <i className="fas fa-comment-alt" />
                            </button>
                        )}
                        {esAdmin && (
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleEliminarArmado(row)}
                                title="Eliminar armado"
                            >
                                <i className="fas fa-trash-alt" />
                            </button>
                        )}
                                            </div>
                );
            }
        }
    ];

    const handleAbrirModal = () => {
        setClienteSel("");
        setCentroSel("");
        setTecnicoSel("");
        setTecnicoSecundarioSel("");
        setEstadoAsignacion("pendiente");
        setFechaInicioAsignacion("");
        setFechaTerminoAsignacion("");
        setObservacion("");
        setShowModal(true);
    };

    const handleAbrirPlanilla = async (armado) => {
        setArmadoActivo(armado);
        setPlanillaOpen(true);
        setEquipos([]);
        setLoadingPlanilla(true);
        setEditingId(null);
        setParticipaciones([]);
        setTransferTecSel("");
        setTransferNota("");
        setMateriales(MATERIALES_PREDEF.map((m) => ({ nombre: m, cantidad: "" })));
        setMaterialesSnapshot({});
        try {
            const nombreCentro = armado?.centro?.nombre || armado?.centro_nombre;
            if (!nombreCentro) throw new Error("Centro sin nombre");
            const detalles = await cargarDetallesCentro(nombreCentro);
            const equiposNorm = mergeEquiposPredef(detalles?.equipos || []);
            setEquipos(equiposNorm);
            await cargarParticipaciones(armado.id_armado, setParticipaciones);
            await cargarMateriales(armado.id_armado, async (lista) => {
                const merged = mergeMateriales(lista);
                const cajasMateriales = merged.map((m) => nombreCajaSeguro(m.caja));
                const cajasEquipos = equiposNorm.map((e) => nombreCajaSeguro(e.caja));
                const cajasDetectadas = obtenerCajasDetectadas(cajasMateriales, cajasEquipos);
                setMateriales(merged);
                setMaterialesSnapshot(crearSnapshotMateriales(merged));
                setCajas(cajasDetectadas.length ? cajasDetectadas : [DEFAULT_PENDING_BOX]);
                await cargarMovimientos(armado.id_armado, setMovimientos);
            });
            setTabPlanilla("equipos");
        } catch (err) {
            console.error("Error al cargar planilla:", err);
            alert("No se pudo cargar la planilla del centro.");
        } finally {
            setLoadingPlanilla(false);
        }
    };

    const handleAgregarCaja = () => {
        const propuesta = siguienteNombreCaja(cajas);
        const nueva = window.prompt("Nombre del bulto", propuesta);
        if (!nueva) return;
        if (cajas.includes(nueva)) return;
        setCajas((prev) => [...prev, nueva]);
    };

    const recargarPlanilla = async () => {
        if (!armadoActivo) return;
        try {
            const nombreCentro = armadoActivo?.centro?.nombre || armadoActivo?.centro_nombre;
            if (!nombreCentro) return;
            const detalles = await cargarDetallesCentro(nombreCentro);
            const equiposNorm = mergeEquiposPredef(detalles?.equipos || []);
            setEquipos(equiposNorm);
            const cajasEquipos = equiposNorm.map((e) => nombreCajaSeguro(e.caja));
            const cajasMateriales = materiales.map((m) => nombreCajaSeguro(m.caja));
            const cajasDetectadas = obtenerCajasDetectadas(cajasEquipos, cajasMateriales);
            setCajas(cajasDetectadas.length ? cajasDetectadas : [DEFAULT_PENDING_BOX]);
        } catch (err) {
            console.error("Error al recargar planilla:", err);
        }
    };

    const handleEquipoChange = (index, field, value) => {
        setEquipos((prev) =>
            prev.map((eq, i) => {
                if (i !== index) return eq;
                if (field === "numero_serie") {
                    const digitos = (value || "").replace(/\D+/g, "");
                    return { ...eq, numero_serie: value, codigo: digitos.slice(0, 5) };
                }
                // si se cambia algo relevante, asigna técnico actual para colorear
                const updated = { ...eq, [field]: value };
                if (["numero_serie", "codigo", "ip", "observacion", "caja"].includes(field)) {
                    updated.caja_tecnico_id = userId;
                    updated.caja_tecnico_nombre = userNombre || eq.caja_tecnico_nombre || `ID ${userId || ""}`;
                }
                return updated;
            })
        );
    };

    const handleEstadoRapido = async (row, nuevoEstado) => {
        if (!puedeGestionarArmados) return;
        const id = row.id_armado || row.id;
        if (!id) return;
        try {
            const hoy = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
            const payload = { estado: nuevoEstado };
            if (nuevoEstado === "finalizado") {
                payload.fecha_cierre = hoy;
            }
            await modificarArmado(id, payload);
            if (nuevoEstado === "finalizado") {
                window.dispatchEvent(
                    new CustomEvent("orcagest-notif-armado-finalizado", {
                        detail: {
                            id_armado: id,
                            centro_nombre: row?.centro?.nombre || row?.centro_nombre || "centro",
                            tecnico_name: row?.tecnico?.nombre || row?.tecnico_nombre || userNombre || "Tecnico",
                            fecha_cierre: hoy,
                            fecha_evento: new Date().toISOString(),
                        },
                    })
                );
            }
            await fetchArmados();
        } catch (err) {
            console.error("No se pudo actualizar estado:", err);
            alert("No se pudo actualizar el estado.");
        }
    };

    const handleGuardarObservacionArmado = async () => {
        const armadoId = Number(observacionDetalle?.armadoId || 0);
        if (!armadoId) return;
        try {
            setObservacionDetalle((prev) => ({ ...prev, saving: true }));
            await modificarArmado(armadoId, { observacion: observacionDetalle.texto || "" });
            setArmados((prev) =>
                prev.map((item) =>
                    Number(item?.id_armado || item?.id || 0) === armadoId
                        ? { ...item, observacion: observacionDetalle.texto || "" }
                        : item
                )
            );
            setArmadoActivo((prev) =>
                Number(prev?.id_armado || prev?.id || 0) === armadoId
                    ? { ...prev, observacion: observacionDetalle.texto || "" }
                    : prev
            );
            setObservacionDetalle({ open: false, armadoId: null, centro: "", texto: "", saving: false });
        } catch (err) {
            console.error("Error al guardar observación del armado:", err);
            alert("No se pudo guardar la observación.");
            setObservacionDetalle((prev) => ({ ...prev, saving: false }));
        }
    };

    const handleEliminarArmado = async (row) => {
        if (rol !== "admin") return;
        const id = row?.id_armado || row?.id;
        if (!id) return;

        const centro = row?.centro?.nombre || row?.centro_nombre || "este centro";
        const ok = window.confirm(`¿Eliminar la asignación de armado para ${centro}? Esta acción no se puede deshacer.`);
        if (!ok) return;

        try {
            await borrarArmado(id, async () => {
                if (Number(armadoActivo?.id_armado || 0) === Number(id)) {
                    setPlanillaOpen(false);
                    setArmadoActivo(null);
                }
                await fetchArmados();
            });
        } catch (err) {
            console.error("No se pudo eliminar el armado:", err);
            alert("No se pudo eliminar el armado.");
        }
    };

    const descargarPdfArmado = async (row) => {
        try {
            const idArmado = row.id_armado || row.id;
            const nombreCentro = row?.centro?.nombre || row?.centro_nombre || "-";
            const cliente = row?.centro?.cliente || row?.cliente || "-";
            const tecnicosAsignados = Array.isArray(row?.tecnicos_asignados)
                ? row.tecnicos_asignados
                    .map((tec) => String(tec?.nombre || "").trim())
                    .filter(Boolean)
                : [];
            const tecnico = tecnicosAsignados.length
                ? tecnicosAsignados.join(" / ")
                : (row?.tecnico?.nombre || row?.tecnico_nombre || "-");
            const historial = await obtenerHistorialEquiposArmado(idArmado);
            const equiposConIdx = (Array.isArray(historial?.resumen) ? historial.resumen : [])
                .filter((e) => {
                    const serieActual = String(e?.serie_actual || "").trim();
                    return serieActual && serieActual !== "-" && !e?.devuelto_bodega;
                })
                .map((e, idx) => ({
                    nombre: e?.nombre_item || "-",
                    numero_serie: e?.serie_actual || "-",
                    __idx: idx
                }));
            const usados = new Set();
            const bloquesEquipos = [];
            const pushBloque = (titulo, lista) => {
                if (!lista.length) {
                    return;
                }
                bloquesEquipos.push(`<tr class="section-row"><td colspan="2">${escapeHtml(titulo)}</td></tr>`);
                lista.forEach((e) => {
                    bloquesEquipos.push(
                        `<tr><td>${escapeHtml(e.nombre || "-")}</td><td>${escapeHtml(
                            e.numero_serie || "-"
                        )}</td></tr>`
                    );
                });
            };

            GRUPOS_EQUIPOS.forEach((g) => {
                const itemsNorm = (g.items || []).map((n) => normalizarNombreEquipo(n));
                const presentes = equiposConIdx.filter((e) => {
                    if (usados.has(e.__idx)) return false;
                    return itemsNorm.includes(normalizarNombreEquipo(e.nombre || ""));
                });
                presentes.forEach((e) => usados.add(e.__idx));
                pushBloque(g.titulo, presentes);
            });

            const extras = equiposConIdx.filter((e) => !usados.has(e.__idx));
            pushBloque("Otros", extras);

            const totalEquiposConSerie = equiposConIdx.length;
            const filasEquipos = bloquesEquipos.length
                ? bloquesEquipos.join("")
                : "<tr><td colspan='2' class='empty-row'>Sin equipos con serie</td></tr>";

            const doc = `<!doctype html>
                <html>
                <head>
                    <meta charset="UTF-8" />
                    <title>Armado ${escapeHtml(nombreCentro)} #${escapeHtml(idArmado)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; color:#0f172a; margin:0; background:#f8fafc; }
                        .wrap { max-width: 1080px; margin: 20px auto; background:#fff; border:1px solid #dbe7ff; border-radius:10px; overflow:hidden; }
                        .head { padding:14px 18px; background:linear-gradient(135deg,#1d4ed8,#2563eb); color:#fff; display:flex; justify-content:space-between; align-items:center; gap:16px; }
                        .head h1 { margin:0; font-size:20px; }
                        .toolbar { display:flex; gap:8px; }
                        .btn { border:0; border-radius:8px; padding:8px 12px; font-weight:700; cursor:pointer; }
                        .btn-print { background:#dc2626; color:#fff; }
                        .btn-close { background:#e2e8f0; color:#0f172a; }
                        .content { padding:16px 18px; }
                        .doc-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:12px; }
                        .doc-meta h2 { margin:0 0 6px; color:#1d4ed8; font-size:20px; }
                        .doc-meta .meta-line { color:#334155; font-weight:700; margin-bottom:4px; font-size:13px; }
                        .logo-wrap { display:flex; flex-direction:column; align-items:center; gap:6px; }
                        .orca-logo { border:1px solid #dbe7ff; border-radius:8px; padding:6px; background:#fff; min-width:112px; }
                        .orca-row { display:grid; grid-template-columns:repeat(4, 1fr); gap:0; margin-bottom:4px; }
                        .orca-cell { width:23px; height:23px; background:#245b98; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .orca-sub { text-align:center; color:#245b98; font-size:11px; font-weight:900; letter-spacing:0.14em; text-transform:uppercase; padding-left:1px; }
                        .logo-meta { color:#334155; font-weight:700; font-size:12px; text-align:center; }
                        .grid { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
                        .field { border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; background:#fff; }
                        .field b { display:block; font-size:11px; text-transform:uppercase; color:#64748b; margin-bottom:4px; letter-spacing:.04em; }
                        .wide { grid-column:1 / -1; }
                        .sec-title { margin: 12px 0 6px; color:#1d4ed8; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
                        table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:12px; }
                        th, td { border:1px solid #cbd5e1; padding:7px 8px; vertical-align:top; }
                        thead th { background:#dbeafe; color:#1e3a8a; text-transform:uppercase; font-size:11px; letter-spacing:.04em; text-align:left; }
                        .section-row td { background:#1e3a8a; color:#fff; font-weight:800; text-transform:uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .empty-row { color:#64748b; font-style:italic; }
                        @media print {
                            @page { margin: 12mm; }
                            body { background:#fff; }
                            .wrap { margin:0; border:0; border-radius:0; }
                            .toolbar { display:none; }
                            .orca-cell { background:#245b98 !important; color:#fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .orca-sub { color:#245b98 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .section-row td { background:#1e3a8a !important; color:#fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="wrap">
                        <div class="head">
                            <h1>Planilla de armado</h1>
                            <div class="toolbar">
                                <button class="btn btn-print" onclick="window.print()">Descargar PDF</button>
                                <button class="btn btn-close" onclick="window.close()">Cerrar</button>
                            </div>
                        </div>
                        <div class="content">
                            <div class="doc-top">
                                <div class="doc-meta">
                                    <h2>${escapeHtml(nombreCentro)}</h2>
                                    <div class="meta-line">Cliente: ${escapeHtml(cliente)}</div>
                                    <div class="meta-line">Total equipos: ${escapeHtml(totalEquiposConSerie)}</div>
                                    <div class="meta-line">Total bultos: ${escapeHtml(row.total_cajas ?? 0)}</div>
                                </div>
                                <div class="logo-wrap">
                                    <div class="orca-logo">
                                        <div class="orca-row">
                                            <div class="orca-cell">O</div><div class="orca-cell">R</div><div class="orca-cell">C</div><div class="orca-cell">A</div>
                                        </div>
                                        <div class="orca-sub">Tecnologia</div>
                                    </div>
                                    <div class="logo-meta">Armado Nro ${escapeHtml(idArmado)}</div>
                                </div>
                            </div>
                            <div class="grid">
                                <div class="field wide"><b>Tecnico</b>${escapeHtml(tecnico)}</div>
                                <div class="field"><b>Inicio armado</b>${escapeHtml(formatearFecha(row.fecha_inicio))}</div>
                                <div class="field"><b>Cierre</b>${escapeHtml(formatearFecha(row.fecha_cierre))}</div>
                            </div>

                            <div class="sec-title">Equipos</div>
                            <table>
                                <thead><tr><th>Equipo</th><th>Nro Serie</th></tr></thead>
                                <tbody>${filasEquipos}</tbody>
                            </table>
                        </div>
                    </div>
                </body>
                </html>`;

            const w = window.open("", "_blank", "width=1180,height=860");
            if (!w) {
                alert("El navegador bloqueo la ventana del PDF. Habilita pop-ups e intenta nuevamente.");
                return;
            }
            w.document.open();
            w.document.write(doc);
            w.document.close();
        } catch (error) {
            console.error("No se pudo generar el PDF:", error);
            alert("No se pudo generar el PDF del armado.");
        }
    };

    const handleGuardarEquipo = async (equipo) => {
        if (!armadoActivo?.centro?.id_centro && !armadoActivo?.centro_id) {
            alert("Centro no disponible.");
            return;
        }
        try {
            // Si ya existe un equipo con mismo nombre guardado, actualizamos para evitar duplicados
            const existente = equipos.find(
                (e) =>
                    e.id_equipo &&
                    String(e.nombre || "").toLowerCase().trim() === String(equipo.nombre || "").toLowerCase().trim()
            );

            const serie = String(equipo?.numero_serie || "").trim();
            if (serie) {
                const centroActual = armadoActivo?.centro?.id_centro || armadoActivo?.centro_id;
                const excludeId = equipo.id_equipo || existente?.id_equipo;
                const validacion = await validarSerieEquipo(serie, {
                    ...(excludeId ? { exclude_equipo_id: excludeId } : {}),
                    ...(centroActual ? { centro_id: centroActual } : {})
                });
                if (validacion?.duplicado) {
                    const centroDup = validacion?.equipo?.centro_nombre || "otro centro";
                    const equipoDup = validacion?.equipo?.nombre || "equipo";
                    alert(
                        `La serie ${serie} ya esta registrada en ${centroDup} (${equipoDup}).\n` +
                        "No se puede guardar en este armado. Solicita el cambio al responsable."
                    );
                    return;
                }
            }

            if (equipo.id_equipo || existente) {
                await modificarEquipo(equipo.id_equipo || existente.id_equipo, {
                    ...existente,
                    ...equipo,
                    caja_tecnico_id: userId,
                    armado_id: armadoActivo?.id_armado
                });
            } else {
                await agregarEquipo({
                    ...equipo,
                    centro_id: armadoActivo.centro?.id_centro || armadoActivo.centro_id,
                    caja_tecnico_id: userId,
                    armado_id: armadoActivo?.id_armado
                });
            }
            // marcar en estado local quién lo guardó para mostrar badge coloreado
            setEquipos((prev) =>
                prev.map((eq) =>
                    (eq.id_equipo && eq.id_equipo === (equipo.id_equipo || existente?.id_equipo)) || eq.__idx === equipo.__idx
                        ? { ...eq, caja_tecnico_id: userId, caja_tecnico_nombre: userNombre }
                        : eq
                )
            );
            await recargarPlanilla();
            await fetchArmados();
            recargarMovimientosRecientes();
            setEditingId(null);
        } catch (err) {
            console.error("Error al guardar equipo:", err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                (err?.response?.status === 409 ? "Ya existe un equipo con ese nombre." : "No se pudo guardar el equipo.");
            alert(msg);
        }
    };

    const handleEliminarEquipo = async (equipo) => {
        if (!equipo.id_equipo) return;
        if (!window.confirm("¿Eliminar este equipo?")) return;
        try {
            await borrarEquipo(equipo.id_equipo);
            setEquipos((prev) => prev.filter((e) => e.id_equipo !== equipo.id_equipo));
            setEditingId(null);
        } catch (err) {
            console.error("Error al eliminar equipo:", err);
            alert("No se pudo eliminar el equipo.");
        }
    };

    const handleGuardarAsignacion = async () => {
        if (!centroSel || !tecnicoSel) {
            alert("Selecciona centro y técnico.");
            return;
        }
        if (tecnicoSecundarioSel && tecnicoSecundarioSel === tecnicoSel) {
            alert("El segundo técnico no puede ser el mismo técnico principal.");
            return;
        }
        const payload = {
            centro_id: Number(centroSel),
            tecnico_id: Number(tecnicoSel),
            tecnico_secundario_id: tecnicoSecundarioSel ? Number(tecnicoSecundarioSel) : null,
            tecnicos_ids: [Number(tecnicoSel), tecnicoSecundarioSel ? Number(tecnicoSecundarioSel) : null].filter(Boolean),
            estado: estadoAsignacion,
            fecha_asignacion: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })(),
            fecha_inicio: fechaInicioAsignacion || null,
            fecha_cierre: fechaTerminoAsignacion || null,
            observacion,
            creado_por: userId
        };
        await agregarArmado(payload, async () => {
            setShowModal(false);
            await fetchArmados();
        });
    };

    const handleTransferir = async () => {
        if (!armadoActivo?.id_armado) return;
        if (!transferObjetivoSel) {
            alert("Selecciona el técnico actual a reemplazar.");
            return;
        }
        if (!transferTecSel) {
            alert("Selecciona el nuevo técnico.");
            return;
        }
        await transferirArmado(
            armadoActivo.id_armado,
            {
                tecnico_id: Number(transferTecSel),
                reemplaza_tecnico_id: Number(transferObjetivoSel),
                nota: transferNota
            },
            async () => {
                await cargarParticipaciones(armadoActivo.id_armado, setParticipaciones);
                setTransferNota("");
                setTransferTecSel("");
                setTransferObjetivoSel("");
                await fetchArmados();
            }
        );
    };

    const resumen = useMemo(() => {
        const base = { total: armados.length, pendientes: 0, enProceso: 0, prefinalizados: 0, finalizados: 0 };
        armados.forEach((a) => {
            const estado = (a.estado || "").toLowerCase();
            if (estado === "finalizado") base.finalizados += 1;
            else if (estado === "prefinalizado") base.prefinalizados += 1;
            else if (estado === "en_proceso") base.enProceso += 1;
            else base.pendientes += 1;
        });
        return base;
    }, [armados]);

    return (
        <div className="container-fluid armado-page">
            <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 responsive-header">
                <div>
                    <p className="text-muted mb-1">Armado tecnico</p>
                    <h3 className="mb-0">Asignaciones de armado</h3>
                                            </div>
                <div className="d-flex gap-2 summary-wrap">
                    <div className="summary-pill bg-light">
                        <small>Total</small>
                        <strong>{resumen.total}</strong>
                                            </div>
                    <div className="summary-pill bg-warning text-dark">
                        <small>Pendientes</small>
                        <strong>{resumen.pendientes}</strong>
                                            </div>
                    <div className="summary-pill bg-info text-white">
                        <small>En proceso</small>
                        <strong>{resumen.enProceso}</strong>
                                            </div>
                    <div className="summary-pill" style={{ backgroundColor: "#7c3aed", color: "#fff" }}>
                        <small>Prefinalizado</small>
                        <strong>{resumen.prefinalizados}</strong>
                                            </div>
                    <div className="summary-pill bg-success text-white">
                        <small>Finalizados</small>
                        <strong>{resumen.finalizados}</strong>
                                            </div>
                                            </div>
                                            </div>
            <div className="card">
                <div className="card-body filters-row">
                    {error && <div className="alert alert-danger mb-3">{error}</div>}
                    <div className="filters-controls">
                        <div>
                            <small className="text-muted text-uppercase d-block mb-1">Estado (filtro)</small>
                            <select
                                className="form-control"
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                            >
                                {estadosOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                                            </div>

                        {puedeGestionarArmados && (
                            <div>
                                <small className="text-muted text-uppercase d-block mb-1">Tecnico (filtro)</small>
                                <select
                                    className="form-control"
                                    value={filtroTecnico}
                                    onChange={(e) => setFiltroTecnico(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {tecnicos.map((tec) => (
                                        <option key={tec.id} value={tec.id}>
                                            {tec.name || tec.nombre || `ID ${tec.id}`}
                                        </option>
                                    ))}
                                </select>
                                            </div>
                        )}

                        {puedeGestionarArmados && (
                            <button className="btn btn-primary ml-auto" onClick={handleAbrirModal}>
                                <i className="fas fa-plus mr-2" />
                                Asignar armado
                            </button>
                        )}
                        <button className="btn btn-outline-primary ml-auto" onClick={fetchArmados}>
                            <i className="fas fa-sync mr-2" />
                            Actualizar
                        </button>
                                            </div>

                    <div className="table-responsive mt-3">
                        <DataTable
                            columns={columnas}
                            data={armados}
                            progressPending={loading}
                            pagination
                            highlightOnHover
                            pointerOnHover
                            dense
                            persistTableHead
                            noDataComponent="No hay armados para mostrar"
                        />
                                            </div>
                                            </div>
                                            </div>

            {planillaOpen && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog modal-xl" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Planilla de armado - {armadoActivo?.centro?.nombre || armadoActivo?.centro_nombre || "Centro"}{" "}
                                    <span className="badge badge-primary ml-2" title="Total de bultos reales">
                                        {totalCajasRealesPlanilla} bultos
                                    </span>
                                    <span
                                        className="badge ml-2"
                                        title={`${resumenArmadoPlanilla.resueltos} de ${resumenArmadoPlanilla.total} equipos resueltos`}
                                        style={{
                                            background: resumenArmadoPlanilla.porcentaje >= 100 ? "#16a34a" : "#2563eb",
                                            color: "#fff",
                                            border: "1px solid rgba(255,255,255,0.18)"
                                        }}
                                    >
                                        Armado {resumenArmadoPlanilla.porcentaje}%
                                    </span>
                                    <span
                                        className="badge ml-2"
                                        title="Total de equipos pendientes"
                                        style={{
                                            background: resumenArmadoPlanilla.pendientes > 0 ? "#fff7ed" : "#f0fdf4",
                                            color: resumenArmadoPlanilla.pendientes > 0 ? "#c2410c" : "#166534",
                                            border: `1px solid ${resumenArmadoPlanilla.pendientes > 0 ? "#fdba74" : "#86efac"}`
                                        }}
                                    >
                                        Pendientes {resumenArmadoPlanilla.pendientes}
                                    </span>
                                    {tecnicoPrincipalPlanilla && (
                                        <span
                                            className="badge ml-2"
                                            style={{
                                                backgroundColor: `${colorTecnico(tecnicoPrincipalPlanilla?.nombre || tecnicoPrincipalPlanilla?.id)}22`,
                                                color: colorTecnico(tecnicoPrincipalPlanilla?.nombre || tecnicoPrincipalPlanilla?.id),
                                                border: `1px solid ${colorTecnico(tecnicoPrincipalPlanilla?.nombre || tecnicoPrincipalPlanilla?.id)}`
                                            }}
                                            title="Tecnico principal actual"
                                        >
                                            Principal: {tecnicoPrincipalPlanilla?.nombre || "—"}
                                        </span>
                                    )}
                                    {tecnicosApoyoPlanilla.map((tec, idx) => (
                                        <span
                                            key={`head-apoyo-${tec?.id || idx}`}
                                            className="badge ml-2"
                                            style={{
                                                backgroundColor: `${colorTecnico(tec?.nombre || tec?.id)}22`,
                                                color: colorTecnico(tec?.nombre || tec?.id),
                                                border: `1px solid ${colorTecnico(tec?.nombre || tec?.id)}`
                                            }}
                                            title="Tecnico de apoyo actual"
                                        >
                                            {tecnicosApoyoPlanilla.length > 1 ? `Apoyo ${idx + 1}` : "Apoyo"}: {tec?.nombre || "—"}
                                        </span>
                                    ))}
                                </h5>
                                <button type="button" className="close" onClick={() => setPlanillaOpen(false)}>
                                    <span>&times;</span>
                                </button>
                                            </div>
                            <div className="modal-body">
                                {loadingPlanilla ? (
                                    <p>Cargando planilla...</p>
                                ) : (
                                    <>
                                        <div className="d-flex mb-3">
                                            <div className="btn-group btn-group-sm" role="group">
                                                <button
                                                    className={`btn btn-${tabPlanilla === "equipos" ? "primary" : "outline-primary"}`}
                                                    onClick={() => setTabPlanilla("equipos")}
                                                >
                                                    Equipos
                                                </button>
                                                <button
                                                    className={`btn btn-${tabPlanilla === "materiales" ? "primary" : "outline-primary"}`}
                                                    onClick={() => setTabPlanilla("materiales")}
                                                >
                                                    Materiales
                                                </button>
                                            </div>
                                            {tabPlanilla === "equipos" && (
                                                <div className="btn-group btn-group-sm ml-2" role="group" aria-label="Filtro equipos planilla">
                                                    <button
                                                        type="button"
                                                        className={`btn ${filtroVistaEquiposPlanilla === "todo" ? "btn-primary" : "btn-outline-primary"}`}
                                                        onClick={() => setFiltroVistaEquiposPlanilla("todo")}
                                                    >
                                                        Ver todo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn ${filtroVistaEquiposPlanilla === "no_aplica" ? "btn-secondary" : "btn-outline-secondary"}`}
                                                        onClick={() => setFiltroVistaEquiposPlanilla("no_aplica")}
                                                    >
                                                        No aplica
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn ${filtroVistaEquiposPlanilla === "pendiente" ? "btn-warning" : "btn-outline-warning"}`}
                                                        onClick={() => setFiltroVistaEquiposPlanilla("pendiente")}
                                                    >
                                                        Pendientes
                                                    </button>
                                                </div>
                                            )}
                                            <button
                                                className="btn btn-sm btn-outline-primary ml-auto"
                                                onClick={handleAgregarCaja}
                                            >
                                                <i className="fas fa-box-open mr-1" />
                                                Agregar bulto
                                            </button>
                                        </div>

                                        {tabPlanilla === "equipos" && (
                                            <>
                                                <div className="row mb-3">
                                                    <div className="col-md-6">
                                                        <h6 className="d-flex align-items-center mb-2">
                                                            <i className="fas fa-user-friends mr-2 text-primary" />
                                                            Historial de tecnicos
                                                        </h6>
                                                        {participaciones.length ? (
                                                            <div className="hist-tech-list">
                                                        {participaciones.map((p) => {
                                                            const color = colorTecnico(p.tecnico_nombre || p.tecnico_id);
                                                            return (
                                                                <div key={p.id_participacion} className="hist-tech-item">
                                                                    <div
                                                                        className="hist-tech-avatar"
                                                                        style={{ backgroundColor: `${color}22`, borderColor: color }}
                                                                    >
                                                                        <i className="fas fa-user" style={{ color }} />
                                            </div>
                                                                    <div className="flex-grow-1">
                                                                        <div className="d-flex justify-content-between">
                                                                            <strong>{p.tecnico_nombre || `Tec. ${p.tecnico_id}`}</strong>
                                                                            <small className="text-muted">
                                                                                {formatearFecha(p.fecha_inicio)} - {formatearFecha(p.fecha_fin) || "en curso"}
                                                                            </small>
                                            </div>
                                                                        {p.nota && <div className="text-muted small">{p.nota}</div>}
                                            </div>
                                                                    {rol === "admin" && (
                                                                        <button
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            title="Eliminar del historial"
                                                                            onClick={async () => {
                                                                                if (!window.confirm("¿Eliminar esta participación del historial?")) return;
                                                                                try {
                                                                                    await borrarParticipacion(
                                                                                        p.id_participacion,
                                                                                        { force: rol === "admin" }
                                                                                    );
                                                                                    const restantes = participaciones.filter(
                                                                                        (item) => item.id_participacion !== p.id_participacion
                                                                                    );
                                                                                    setParticipaciones(restantes);
                                                                                    if (!restantes.length) {
                                                                                        setPlanillaOpen(false);
                                                                                        setArmadoActivo(null);
                                                                                        await fetchArmados({ silent: true });
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.error("No se pudo eliminar participación:", err);
                                                                                    const msg =
                                                                                        err?.response?.data?.message ||
                                                                                        err?.response?.data?.detail ||
                                                                                        "No se pudo eliminar la participación.";
                                                                                    alert(msg);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <i className="fas fa-trash" />
                                                                        </button>
                                                                    )}
                                            </div>
                                                            );
                                                        })}
                                            </div>
                                                        ) : (
                                                            <p className="text-muted mb-0">Sin transferencias aún.</p>
                                                        )}
                                            </div>
                                                    {puedeGestionarArmados && (
                                                        <div className="col-md-6">
                                                            <h6>Observacion de asignacion</h6>
                                                            <div
                                                                className="mb-3 p-3"
                                                                style={{
                                                                    border: "1px solid #dbeafe",
                                                                    borderRadius: 12,
                                                                    background: "#f8fbff",
                                                                    color: "#334155",
                                                                    whiteSpace: "pre-wrap"
                                                                }}
                                                            >
                                                                {String(armadoActivo?.observacion || "").trim() || "Sin observacion registrada."}
                                                            </div>
                                                            <h6>Transferir armado</h6>
                                                            <div className="form-group">
                                                        <label>Tecnico actual</label>
                                                                <select
                                                                    className="form-control"
                                                                    value={transferObjetivoSel}
                                                                    onChange={(e) => setTransferObjetivoSel(e.target.value)}
                                                                >
                                                                    <option value="">Seleccione tecnico actual</option>
                                                                    {tecnicoPrincipalPlanilla && (
                                                                        <option value={tecnicoPrincipalPlanilla.id}>
                                                                            Principal actual: {tecnicoPrincipalPlanilla.nombre || `ID ${tecnicoPrincipalPlanilla.id}`}
                                                                        </option>
                                                                    )}
                                                                    {tecnicosApoyoPlanilla.map((tec, idx) => (
                                                                        <option key={`transfer-target-${tec?.id || idx}`} value={tec?.id || ""}>
                                                                            {tecnicosApoyoPlanilla.length > 1 ? `Apoyo ${idx + 1}` : "Apoyo actual"}: {tec?.nombre || `ID ${tec?.id || "-"}`}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                            </div>
                                                            <div className="form-group">
                                                        <label>Tecnico disponible</label>
                                                                <select
                                                                    className="form-control"
                                                                    value={transferTecSel}
                                                                    onChange={(e) => setTransferTecSel(e.target.value)}
                                                                >
                                                                    <option value="">Seleccione tecnico disponible</option>
                                                                    {tecnicosDisponiblesTransferencia.map((tec) => (
                                                                        <option key={tec.id} value={tec.id}>
                                                                            {tec.name || tec.nombre || `ID ${tec.id}`}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                            </div>
                                                            <div className="form-group">
                                                                <label>Nota / Avance</label>
                                                                <textarea
                                                                    className="form-control"
                                                                    rows="2"
                                                                    value={transferNota}
                                                                    onChange={(e) => setTransferNota(e.target.value)}
                                                                />
                                            </div>
                                                            <button className="btn btn-primary" onClick={handleTransferir}>
                                                                <i className="fas fa-random mr-2" />
                                                                Transferir
                                                            </button>
                                            </div>
                                                    )}
                                            </div>
                                                    <div className="table-responsive">
                                                <table className="table table-bordered arm-equip-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Equipo</th>
                                                            <th style={{ minWidth: esMovil ? "50px" : "75px" }}>Bulto</th>
                                                            {!esMovil && <th>IP</th>}
                                                            {!esMovil && <th>Observacion</th>}
                                                            {!esMovil && <th>Codigo</th>}
                                                            <th>N Serie</th>
                                                            {!esMovil && <th>Estado</th>}
                                                            <th>Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                            {equiposConTitulos.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={esMovil ? 4 : 8} className="text-center text-muted py-4">
                                                                        No hay equipos para este filtro.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            {equiposConTitulos.map((item, idx) => {
                                                                const colSpan = esMovil ? 4 : 8;
                                                                if (item.tipo === "titulo") {
                                                                    return (
                                                                        <tr key={`ttl-${idx}`} className="table-active">
                                                                            <td colSpan={colSpan}>
                                                                                <strong>{item.titulo}</strong>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                                const eq = item.data;
                                                                const rowKey = eq.id_equipo || `tmp-${eq.__idx}`;
                                                                const enEdicion = editingId === rowKey;
                                                                const estadoRegistro = normalizarEstadoRegistroEquipo(eq.estado_registro);
                                                                const esNoAplica = estadoRegistro === "no_aplica";
                                                                const esPendienteRegistro = estadoRegistro === "pendiente";
                                                                return (
                                                                    <tr key={rowKey}>
                                                                        <td>
                                                                            <div>{eq.nombre}</div>
                                                                        </td>
                                                                            <td style={{ minWidth: "110px" }}>
                                                                                {enEdicion ? (
                                                                                    <select
                                                                                        className="form-control form-control-sm"
                                                                                        value={nombreCajaSeguro(eq.caja)}
                                                                                    onChange={(e) => handleEquipoChange(eq.__idx, "caja", e.target.value)}
                                                                                >
                                                                                    {cajas.map((caja) => (
                                                                                        <option key={caja} value={caja}>
                                                                                            {etiquetaBulto(caja)}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                <div>
                                                                                    {(() => {
                                                                                        const tecnicoMov = tecnicoRecientePorEquipo.get(String(eq.id_equipo || ""));
                                                                                        const hasTec =
                                                                                            eq.caja_tecnico_nombre ||
                                                                                            eq.caja_tecnico_id ||
                                                                                            eq.numero_serie ||
                                                                                            eq.codigo ||
                                                                                            eq.ip ||
                                                                                            eq.observacion;
                                                                                        const displayName =
                                                                                            eq.caja_tecnico_nombre ||
                                                                                            (eq.caja_tecnico_id ? `ID ${eq.caja_tecnico_id}` : tecnicoMov || "");
                                                                                        const color = hasTec
                                                                                            ? colorTecnico(eq.caja_tecnico_nombre || eq.caja_tecnico_id || tecnicoMov || userId)
                                                                                            : "#6b7280";
                                                                                        const border = hasTec ? color : "#cbd5e1";
                                                                                        const cajaLabel = (esNoAplica || esPendienteRegistro) ? "-" : etiquetaBulto(nombreCajaSeguro(eq.caja));
                                                                                        return (
                                                                                            <>
                                                                                                <span
                                                                                                    className="badge badge-light"
                                                                                                    style={{
                                                                                                        border: esNoAplica ? "1px solid #d1d5db" : `1px solid ${border}`,
                                                                                                        color: esNoAplica ? "#4b5563" : color,
                                                                                                        background: esNoAplica ? "#f3f4f6" : undefined
                                                                                                    }}
                                                                                                >
                                                                                                    {cajaLabel}
                                                                                                </span>
                                                                                                {!esNoAplica && hasTec && displayName && (
                                                                                                    <small className="d-block" style={{ color }}>
                                                                                                        por {displayName}
                                                                                                    </small>
                                                                                                )}
                                                                                            </>
                                                                                        );
                                                                                    })()}
                                            </div>
                                                                            )}
                                                                        </td>
                                                                        {!esMovil && (
                                                                            <td>
                                                                                {enEdicion ? (
                                                                                    <input
                                                                                        className="form-control"
                                                                                        value={eq.ip || ""}
                                                                                        onChange={(e) => handleEquipoChange(eq.__idx, "ip", e.target.value)}
                                                                                    />
                                                                                ) : (
                                                                                    eq.ip || "-"
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        {!esMovil && (
                                                                            <td>
                                                                                {enEdicion ? (
                                                                                    <input
                                                                                        className="form-control"
                                                                                        value={eq.observacion || ""}
                                                                                        onChange={(e) => handleEquipoChange(eq.__idx, "observacion", e.target.value)}
                                                                                    />
                                                                                ) : (
                                                                                    esPendienteRegistro ? (
                                                                                        <span style={{ color: "#c2410c", fontWeight: 700 }}>
                                                                                            {eq.observacion_registro || eq.observacion || "-"}
                                                                                        </span>
                                                                                    ) : (
                                                                                        eq.observacion || "-"
                                                                                    )
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        {!esMovil && (
                                                                            <td>
                                                                                {enEdicion ? (
                                                                                    <input
                                                                                        className="form-control"
                                                                                        value={eq.codigo || ""}
                                                                                        onChange={(e) => handleEquipoChange(eq.__idx, "codigo", e.target.value)}
                                                                                    />
                                                                                ) : (
                                                                                    eq.codigo || "-"
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        <td>
                                                                    {enEdicion ? (
                                                                        <input
                                                                            className="form-control"
                                                                            value={eq.numero_serie || ""}
                                                                            onChange={(e) =>
                                                                                handleEquipoChange(eq.__idx, "numero_serie", e.target.value)
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        eq.numero_serie || "-"
                                                                    )}
                                                                        </td>
                                                                        {!esMovil && (
                                                                            <td>
                                                                                {enEdicion ? (
                                                                                    <input
                                                                                        className="form-control"
                                                                                        value={eq.estado || ""}
                                                                                        onChange={(e) => handleEquipoChange(eq.__idx, "estado", e.target.value)}
                                                                                    />
                                                                                ) : (
                                                                                    estadoRegistro !== "normal" ? (
                                                                                        <span
                                                                                            className="badge badge-light"
                                                                                            style={{
                                                                                                border: `1px solid ${esNoAplica ? "#d1d5db" : "#fdba74"}`,
                                                                                                color: esNoAplica ? "#4b5563" : "#b45309",
                                                                                                background: esNoAplica ? "#f3f4f6" : "#fff7ed",
                                                                                                fontWeight: 700
                                                                                            }}
                                                                                        >
                                                                                            {labelEstadoRegistroEquipo(estadoRegistro)}
                                                                                        </span>
                                                                                    ) : (
                                                                                        eq.estado || "-"
                                                                                    )
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        <td className="text-nowrap">
                                                                            {enEdicion ? (
                                                                                <>
                                                                                    <button
                                                                                        className="btn btn-sm btn-primary mr-2"
                                                                                        onClick={() => handleGuardarEquipo(eq)}
                                                                                    >
                                                                                        <i className="fas fa-save" />
                                                                                    </button>
                                                                                    <button
                                                                                        className="btn btn-sm btn-secondary"
                                                                                        onClick={() => {
                                                                                            setEditingId(null);
                                                                                            recargarPlanilla();
                                                                                        }}
                                                                                    >
                                                                                        Cancelar
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <button
                                                                                        className="btn btn-sm btn-outline-primary mr-2"
                                                                                        onClick={() => setEditingId(rowKey)}
                                                                                    >
                                                                                        <i className="fas fa-edit" />
                                                                                    </button>
                                                                                    <button
                                                                                        className="btn btn-sm btn-danger"
                                                                                        onClick={() => handleEliminarEquipo(eq)}
                                                                                        disabled={!eq.id_equipo}
                                                                                    >
                                                                                        <i className="fas fa-trash-alt" />
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                            </div>
                                            </>
                                        )}

                                        {tabPlanilla === "materiales" && (
                                        <div className="mt-2">
                                            <div className="d-flex align-items-center mb-2">
                                                <div>
                                                    <h6 className="mb-0">Materiales</h6>
                                                    <p className="text-muted mb-0">Registra cantidades usadas/pendientes para este armado.</p>
                                            </div>
                                                <div className="ml-auto">
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={async () => {
                                                            if (!armadoActivo?.id_armado) return;
                                                            const cambios = materiales.filter((m) => {
                                                                const key = materialKey(m);
                                                                if (!key) return false;
                                                                return materialesSnapshot[key] !== materialHash(m);
                                                            });
                                                            if (!cambios.length) return;
                                                            const payload = cambios.map((m) => ({
                                                                nombre: m.nombre,
                                                                cantidad: Number(m.cantidad) || 0,
                                                                caja: nombreCajaSeguro(m.caja)
                                                            }));
                                                            await guardarMateriales(
                                                                armadoActivo.id_armado,
                                                                payload.map((m) => ({ ...m, caja_tecnico_id: userId })),
                                                                async () => {
                                                                    // Refrescar materiales y cajas desde backend tras guardar
                                                                    await cargarMateriales(armadoActivo.id_armado, (lista) => {
                                                                        const merged = mergeMateriales(lista);
                                                                        setMateriales(merged);
                                                                        setMaterialesSnapshot(crearSnapshotMateriales(merged));
                                                                        const cajasMateriales = merged.map((m) => nombreCajaSeguro(m.caja));
                                                                        const cajasEquipos = (equipos || []).map((e) => nombreCajaSeguro(e.caja));
                                                                        const cajasDetectadas = obtenerCajasDetectadas(cajasMateriales, cajasEquipos);
                                                                        setCajas(cajasDetectadas.length ? cajasDetectadas : [DEFAULT_PENDING_BOX]);
                                                                    });
                                                                    await cargarMovimientos(armadoActivo.id_armado, setMovimientos);
                                                                    recargarMovimientosRecientes();
                                                                }
                                                            );
                                                        }}
                                                    >
                                                        <i className="fas fa-save mr-2" />
                                                        Guardar materiales
                                                    </button>
                                            </div>
                                            </div>
                                            <div className="d-flex flex-wrap align-items-center mb-2" style={{ gap: 8 }}>
                                                <div className="btn-group btn-group-sm" role="group" aria-label="Filtro materiales planilla">
                                                    <button
                                                        type="button"
                                                        className={`btn ${filtroVistaMaterialesPlanilla === "todo" ? "btn-primary" : "btn-outline-primary"}`}
                                                        onClick={() => setFiltroVistaMaterialesPlanilla("todo")}
                                                    >
                                                        Ver todo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn ${filtroVistaMaterialesPlanilla === "no_aplica" ? "btn-secondary" : "btn-outline-secondary"}`}
                                                        onClick={() => setFiltroVistaMaterialesPlanilla("no_aplica")}
                                                    >
                                                        No aplica
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn ${filtroVistaMaterialesPlanilla === "pendiente" ? "btn-warning" : "btn-outline-warning"}`}
                                                        onClick={() => setFiltroVistaMaterialesPlanilla("pendiente")}
                                                    >
                                                        Pendientes
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="d-flex flex-wrap align-items-center mb-3" style={{ gap: 8 }}>
                                                {MATERIAL_CATEGORY_OPTIONS.map((categoria) => {
                                                    const activa = categoriaMaterialPlanilla === categoria;
                                                    return (
                                                        <button
                                                            key={categoria}
                                                            type="button"
                                                            className={`btn btn-sm ${activa ? "btn-primary" : "btn-light"}`}
                                                            style={{
                                                                borderRadius: 999,
                                                                padding: "0.4rem 0.85rem",
                                                                border: activa ? "1px solid #0f4aa3" : "1px solid #dbeafe",
                                                                boxShadow: activa ? "0 10px 22px rgba(15, 74, 163, 0.18)" : "none",
                                                                color: activa ? "#fff" : "#31507a",
                                                                fontWeight: 700
                                                            }}
                                                            onClick={() => setCategoriaMaterialPlanilla(categoria)}
                                                        >
                                                            {categoria}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="row">
                                                {!materialesFiltradosPlanilla.length ? (
                                                    <div className="col-12">
                                                        <div className="alert alert-light border mb-0" style={{ color: "#475569" }}>
                                                            No hay materiales en esta categoria.
                                                        </div>
                                                    </div>
                                                ) : materialesFiltradosPlanilla.map((mat) => {
                                                    const idx = materiales.findIndex((item) => item === mat);
                                                    const estadoRegistro = normalizarEstadoRegistroMaterial(mat?.estado_registro);
                                                    const esNoAplica = estadoRegistro === "no_aplica";
                                                    const esPendienteRegistro = estadoRegistro === "pendiente";
                                                    const cajaLabel = (esNoAplica || esPendienteRegistro) ? "-" : etiquetaBulto(nombreCajaSeguro(mat.caja));
                                                    return (
                                                    <div className="col-md-6 col-lg-6 mb-2" key={mat.nombre}>
                                                        <div className="material-card">
                                                            <div className="material-head">
                                                                <div>
                                                                    <div className="material-name">{mat.nombre}</div>
                                                                    {esPendienteRegistro && String(mat?.observacion_registro || "").trim() ? (
                                                                        <small style={{ color: "#c2410c", fontWeight: 700 }}>
                                                                            {mat.observacion_registro}
                                                                        </small>
                                                                    ) : null}
                                                                </div>
                                                                <div className="material-badge">
                                                                    {(() => {
                                                                        const tecnicoMov = tecnicoRecientePorMaterial.get(
                                                                            String(mat.nombre || "").toLowerCase().trim()
                                                                        );
                                                                        const hasTec =
                                                                            mat.caja_tecnico_nombre ||
                                                                            mat.caja_tecnico_id ||
                                                                            mat.cantidad ||
                                                                            mat.caja;
                                                                        const displayName =
                                                                            mat.caja_tecnico_nombre ||
                                                                            (mat.caja_tecnico_id ? `ID ${mat.caja_tecnico_id}` : tecnicoMov || "");
                                                                        const color = hasTec
                                                                            ? colorTecnico(mat.caja_tecnico_nombre || mat.caja_tecnico_id || tecnicoMov || userId)
                                                                            : "#6b7280";
                                                                        const border = hasTec ? color : "#cbd5e1";
                                                                        return (
                                                                            <>
                                                                                <span
                                                                                    className="badge badge-light d-inline-block"
                                                                                    style={{
                                                                                        border: esNoAplica ? "1px solid #d1d5db" : esPendienteRegistro ? "1px solid #fdba74" : `1px solid ${border}`,
                                                                                        color: esNoAplica ? "#4b5563" : esPendienteRegistro ? "#b45309" : color,
                                                                                        background: esNoAplica ? "#f3f4f6" : esPendienteRegistro ? "#fff7ed" : undefined
                                                                                    }}
                                                                                >
                                                                                    {cajaLabel}
                                                                                </span>
                                                                                {(esNoAplica || esPendienteRegistro) ? (
                                                                                    <small className="d-block" style={{ color: esNoAplica ? "#4b5563" : "#b45309" }}>
                                                                                        {labelEstadoRegistroMaterial(estadoRegistro)}
                                                                                    </small>
                                                                                ) : hasTec && displayName ? (
                                                                                    <small className="d-block" style={{ color }}>
                                                                                        por {displayName}
                                                                                    </small>
                                                                                ) : null}
                                                                            </>
                                                                        );
                                                                    })()}
                                            </div>
                                            </div>
                                                            <div className="material-assign">
                                                                <div className="mr-2">
                                                                    <label className="text-muted small mb-1">Bulto</label>
                                                                    <select
                                                                        className="form-control form-control-sm"
                                                                        value={nombreCajaSeguro(mat.caja)}
                                                                        disabled={esNoAplica || esPendienteRegistro}
                            onChange={(e) =>
                                setMateriales((prev) =>
                                    prev.map((m, i) =>
                                        i === idx
                                            ? {
                                                  ...m,
                                                  caja: e.target.value,
                                                  caja_tecnico_id: userId,
                                                  caja_tecnico_nombre: userNombre || m.caja_tecnico_nombre || `ID ${userId || ""}`
                                              }
                                            : m
                                    )
                                )
                            }
                                                                    >
                                                                        {cajas.map((caja) => (
                                                                            <option key={caja} value={caja}>
                                                                                {etiquetaBulto(caja)}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                            </div>
                                                                <div className="material-qty">
                                                                    <label className="text-muted mr-2 mb-0">Cant.</label>
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm text-right"
                                                                        min="0"
                                                                        value={mat.cantidad}
                                                                        disabled={esNoAplica || esPendienteRegistro}
                                                                        onChange={(e) =>
                                                                            setMateriales((prev) =>
                                                                                prev.map((m, i) =>
                                                                                    i === idx
                                                                                        ? {
                                                                                              ...m,
                                                                                              cantidad: e.target.value,
                                                                                              caja_tecnico_id: userId,
                                                                                              caja_tecnico_nombre: userNombre || m.caja_tecnico_nombre || `ID ${userId || ""}`
                                                                                          }
                                                                                        : m
                                                                                    )
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                            </div>
                                            </div>
                                            </div>
                                            </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        )}
                                    </>
                                )}
                                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setPlanillaOpen(false)}>
                                    Cerrar
                                </button>
                                            </div>
                                            </div>
                                            </div>
                                            </div>
            )}
            {planillaOpen && (
                <div className="card mt-3">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Movimientos recientes (armado)</h6>
                            <small className="text-muted">Últimos 10</small>
                                            </div>
                        <div className="table-responsive">
                            <table className="table table-sm table-striped mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: 36 }}>
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={toggleSeleccionVisibles}
                                                title="Seleccionar visibles"
                                            />
                                        </th>
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Item</th>
                                        <th>N Serie</th>
                                        <th>Bulto</th>
                                        <th>Cant.</th>
                                        <th>Tecnico</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientos.slice(0, 10).map((mov) => (
                                        <tr key={mov.id_movimiento}>
                                            <td>{formatearFecha(mov.fecha)}</td>
                                            <td>{renderTipoMovimiento(mov)}</td>
                                            <td>{mov.nombre_item}</td>
                                            <td>{mov.numero_serie || "-"}</td>
                                            <td>{etiquetaBulto(mov.caja)}</td>
                                            <td>{mov.cantidad}</td>
                                            <td style={{ color: colorTecnico(mov.tecnico_nombre || mov.tecnico_id) }}>
                                                {mov.tecnico_nombre || `ID ${mov.tecnico_id || "-"}`}
                                            </td>
                                        </tr>
                                    ))}
                                    {movimientos.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted">
                                                Sin movimientos registrados todavía.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                                            </div>
                                            </div>
                                            </div>
            )}

            {/* Historial global para roles de gestion; eliminacion solo admin */}
            {puedeVerHistorialGlobal && (
                <div className="card mt-3">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Historial global de movimientos</h6>
                            <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                                <select
                                    className="form-control form-control-sm"
                                    style={{ width: 170 }}
                                    value={movClienteFiltro}
                                    onChange={(e) => {
                                        setMovClienteFiltro(e.target.value);
                                        setMovArmadoFiltro("");
                                        setMovsPage(1);
                                    }}
                                >
                                    <option value="">Todos los clientes</option>
                                    {clientesMovimientos.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="form-control form-control-sm"
                                    style={{ width: 160 }}
                                    value={movArmadoFiltro}
                                    onChange={(e) => {
                                        setMovArmadoFiltro(e.target.value);
                                        setMovsPage(1);
                                    }}
                                >
                                    <option value="">Todos los centros</option>
                                    {armadosFiltroCliente.map((a) => (
                                        <option key={a.id_armado} value={a.id_armado}>
                                            {a.centro?.nombre || a.centro_nombre || `Armado #${a.id_armado}`}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    className="form-control form-control-sm"
                                    style={{ width: 180 }}
                                    placeholder="Buscar N serie..."
                                    value={movSerieFiltro}
                                    onChange={(e) => {
                                        setMovSerieFiltro(e.target.value);
                                        setMovsPage(1);
                                    }}
                                />
                                <button
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={!movArmadoFiltro}
                                    onClick={handleVerHistorialCentro}
                                    title={movArmadoFiltro ? "Ver historial del centro seleccionado" : "Selecciona un centro primero"}
                                >
                                    <i className="fas fa-history mr-1" />
                                    Ver historial
                                </button>
                                <button
                                    className="btn btn-sm btn-outline-info"
                                    disabled={!movArmadoFiltro}
                                    onClick={handleVerResumenCajas}
                                    title={movArmadoFiltro ? "Ver cajas y contenido del armado seleccionado" : "Selecciona un centro primero"}
                                >
                                    <i className="fas fa-boxes mr-1" />
                                    Bultos
                                </button>
                                {esAdmin && (
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        disabled={!movSeleccionados.length || eliminandoSeleccion}
                                        onClick={handleEliminarSeleccionados}
                                        title="Eliminar seleccionados"
                                    >
                                        <i className="fas fa-trash-alt mr-1" />
                                        {eliminandoSeleccion ? "Eliminando..." : `Eliminar seleccionados (${movSeleccionados.length})`}
                                    </button>
                                )}
                                <small className="text-muted mr-2">Mostrar</small>
                                <select
                                    className="form-control form-control-sm"
                                    style={{ width: 90 }}
                                    value={movsLimit}
                                    onChange={(e) => {
                                        setMovsPage(1);
                                        setMovsLimit(Number(e.target.value));
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                    <option value={20}>20</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                </select>
                                            </div>
                                            </div>
                        <div className="table-responsive">
                            <table className="table table-sm table-striped mb-0">
                                <thead>
                                    <tr>
                                        {esAdmin && (
                                            <th style={{ width: 36 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    onChange={toggleSeleccionVisibles}
                                                    title="Seleccionar visibles"
                                                />
                                            </th>
                                        )}
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Item</th>
                                        <th>N Serie</th>
                                        <th>Bulto</th>
                                        <th>Cant.</th>
                                        <th>Armado</th>
                                        <th>Tecnico</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientosVisibles.map((mov) => (
                                        <tr
                                            key={`g-${mov.id_movimiento}`}
                                            style={
                                                movimientosNuevos[String(mov.id_movimiento)]
                                                    ? { backgroundColor: parpadeoOn ? "#fff3cd" : "#ffe8a1" }
                                                    : undefined
                                            }
                                        >
                                            {esAdmin && (
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={movSeleccionados.includes(Number(mov.id_movimiento))}
                                                        onChange={() => toggleSeleccionMovimiento(mov.id_movimiento)}
                                                    />
                                                </td>
                                            )}
                                            <td>{formatearFechaHora(mov.fecha)}</td>
                                            <td>{renderTipoMovimiento(mov)}</td>
                                            <td>{mov.nombre_item}</td>
                                            <td>{mov.numero_serie || "-"}</td>
                                            <td>{mov.caja}</td>
                                            <td>{mov.cantidad}</td>
                                            <td>{mov.centro_nombre || `Armado #${mov.armado_id}`}</td>
                                            <td>
                                                <div className="d-flex align-items-center justify-content-between" style={{ gap: "8px" }}>
                                                    <span style={{ color: colorTecnico(mov.tecnico_nombre || mov.tecnico_id) }}>
                                                        {mov.tecnico_nombre || `ID ${mov.tecnico_id || "-"}`}
                                                    </span>
                                                    {esAdmin && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            title="Eliminar movimiento"
                                                            onClick={() => handleEliminarMovimientoGlobal(mov)}
                                                        >
                                                            <i className="fas fa-trash-alt" />
                                                        </button>
                                                    )}
                                            </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {movimientosVisibles.length === 0 && (
                                        <tr>
                                            <td colSpan={esAdmin ? "9" : "8"} className="text-center text-muted">
                                                Sin movimientos registrados todavía.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                                            </div>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <small className="text-muted">
                                Pagina {Math.min(movsPage, movsTotalPaginasVista)} - {movsTotalPaginasVista} en total
                            </small>
                            <div>
                                <button
                                    className="btn btn-sm btn-outline-secondary mr-1"
                                    disabled={movsPage <= 1}
                                    onClick={() => setMovsPage((p) => Math.max(1, p - 1))}
                                >
                                    Anterior
                                </button>
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={movsPage >= movsTotalPaginasVista}
                                    onClick={() => setMovsPage((p) => p + 1)}
                                >
                                    Siguiente
                                </button>
                                            </div>
                                            </div>
                                            </div>
                                            </div>
            )}

            {historialOpen && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog modal-xl" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Historial de equipos
                                    {historialData?.armado?.centro_nombre
                                        ? ` - ${historialData.armado.centro_nombre} (${totalEquiposHistorial} equipos)`
                                        : ""}
                                </h5>
                                <button type="button" className="close" onClick={() => setHistorialOpen(false)}>
                                    <span>&times;</span>
                                </button>
                                            </div>
                            <div className="modal-body">
                                {historialLoading ? (
                                    <div className="text-muted">Cargando historial...</div>
                                ) : (
                                    <>
                                        <div
                                            className="mb-3 p-2 px-3 rounded"
                                            style={{
                                                background: "linear-gradient(90deg, rgba(37,99,235,0.12) 0%, rgba(14,116,144,0.08) 100%)",
                                                border: "1px solid rgba(37,99,235,0.2)",
                                            }}
                                        >
                                            <div className="d-flex flex-wrap align-items-center" style={{ gap: 10 }}>
                                                <span className="badge badge-pill" style={{ background: "#1e3a8a", color: "#fff" }}>
                                                    Cliente
                                                </span>
                                                <strong style={{ color: "#1e3a8a" }}>{historialData?.armado?.cliente_nombre || "-"}</strong>
                                                <span className="badge badge-pill" style={{ background: "#0ea5e9", color: "#fff" }}>
                                                    Centro
                                                </span>
                                                <strong style={{ color: "#0f172a" }}>
                                                    {historialData?.armado?.centro_nombre || "-"} ({totalEquiposInstaladosHistorial} equipos instalados de {totalEquiposHistorial} equipos)
                                                </strong>
                                            </div>
                                            </div>
                                        <div className="row mb-3">
                                            <div className="col-md-4 mb-2">
                                                <div
                                                    className="p-2 border rounded"
                                                    style={{ background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)", borderColor: "#93c5fd" }}
                                                >
                                                    <small className="d-block" style={{ color: "#1e40af", fontWeight: 600 }}>Equipos con cambios</small>
                                                    <strong style={{ color: "#1e3a8a", fontSize: "1.15rem" }}>{metricasHistorial.equiposConCambios}</strong>
                                            </div>
                                            </div>
                                            <div className="col-md-4 mb-2">
                                                <div
                                                    className="p-2 border rounded"
                                                    style={{ background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)", borderColor: "#fdba74" }}
                                                >
                                                    <small className="d-block" style={{ color: "#c2410c", fontWeight: 600 }}>Cambios totales</small>
                                                    <strong style={{ color: "#9a3412", fontSize: "1.15rem" }}>{metricasHistorial.cambiosTotales}</strong>
                                            </div>
                                            </div>
                                            <div className="col-md-4 mb-2">
                                                <div
                                                    className="p-2 border rounded"
                                                    style={{ background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)", borderColor: "#cbd5e1" }}
                                                >
                                                    <small className="d-block" style={{ color: "#475569", fontWeight: 600 }}>Ultimo cambio</small>
                                                    <strong style={{ color: "#334155", fontSize: "1.05rem" }}>{formatearFechaHora(metricasHistorial.ultimoCambio)}</strong>
                                            </div>
                                            </div>
                                            </div>

                                        <div className="btn-group mb-3" role="group" aria-label="Tabs historial">
                                            <button type="button" className={`btn btn-sm ${historialTab === "resumen" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setHistorialTab("resumen")}>Resumen</button>
                                            <button type="button" className={`btn btn-sm ${historialTab === "detalle" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setHistorialTab("detalle")}>Detalle tecnico</button>
                                            </div>

                                        {historialTab === "resumen" && (
                                            <div className="row">
                                                {historialResumenConCambios.map((r) => {
                                                    const cambios = Number(r?.cambios || 0);
                                                    const esDevueltoBodega = !!r?.devuelto_bodega;
                                                    const color = esDevueltoBodega ? "#fef2f2" : cambios > 0 ? "#fff7ed" : "#f8fafc";
                                                    const borde = esDevueltoBodega ? "#fca5a5" : cambios > 0 ? "#fdba74" : "#e2e8f0";
                                                    return (
                                                        <div className="col-md-6 mb-2" key={`card-${r.item_id}`}>
                                                            <div className="p-2 border rounded" style={{ background: color, borderColor: borde }}>
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <strong>{r.nombre_item || "-"}</strong>
                                                                    <span className={`badge ${esDevueltoBodega ? "badge-danger" : cambios > 0 ? "badge-warning" : "badge-secondary"}`}>
                                                                        {esDevueltoBodega ? "Devuelto a bodega" : cambios > 0 ? `${cambios} cambios` : "Sin cambios"}
                                                                    </span>
                                            </div>
                                                                <div className="small text-muted mt-1">{esDevueltoBodega ? "Ultima serie registrada" : cambios > 0 ? "Anterior -> Actual" : "Inicial -> Actual"}</div>
                                                                {esDevueltoBodega ? (
                                                                    <div>{(r.serie_devuelta_bodega || r.serie_anterior_actual || r.serie_inicial || "-")} -&gt; Devuelto a bodega</div>
                                                                ) : (
                                                                    <div>{cambios > 0 ? (r.serie_anterior_actual || "-") : (r.serie_inicial || "-")} -&gt; {r.serie_actual || "-"}</div>
                                                                )}
                                                                {esDevueltoBodega && (
                                                                    <div className="small mt-1" style={{ color: "#b91c1c", fontWeight: 600 }}>
                                                                        Fecha devolucion: {formatearFechaHora(r?.fecha_devuelto_bodega)}
                                                                    </div>
                                                                )}
                                                                <div className="small text-muted mt-1">Ultima actualizacion: {formatearFechaHora(r.ultima_actualizacion)}</div>
                                            </div>
                                            </div>
                                                    );
                                                })}
                                                {!historialResumenConCambios.length && <div className="col-12"><div className="text-muted">No hay equipos con cambios.</div></div>}
                                            </div>
                                        )}

                                        {historialTab === "detalle" && (
                                            <div className="table-responsive mb-3">
                                                <table
                                                    className="table table-sm table-striped table-bordered mb-0"
                                                    style={{
                                                        border: "1px solid #bfdbfe",
                                                        borderRadius: 10,
                                                        overflow: "hidden",
                                                        background: "#ffffff",
                                                    }}
                                                >
                                                    <thead>
                                                        <tr style={{ background: "linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)" }}>
                                                            <th style={{ color: "#fff", borderColor: "rgba(255,255,255,0.16)" }}>Equipo</th>
                                                            <th style={{ color: "#fff", borderColor: "rgba(255,255,255,0.16)" }}>Serie inicial</th>
                                                            <th style={{ color: "#fff", borderColor: "rgba(255,255,255,0.16)" }}>Serie anterior</th>
                                                            <th style={{ color: "#fff", borderColor: "rgba(255,255,255,0.16)" }}>Serie actual</th>
                                                            <th style={{ color: "#fff", borderColor: "rgba(255,255,255,0.16)" }}>Cambios</th>
                                                            <th style={{ color: "#fff", borderColor: "rgba(255,255,255,0.16)" }}>Ultima actualizacion</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {historialDetalleFilas.map((row, idx) => {
                                                            if (row.tipo === "titulo") {
                                                                return (
                                                                    <tr key={`h-title-${idx}`} style={{ background: "rgba(37, 99, 235, 0.12)" }}>
                                                                        <td colSpan="6" style={{ color: "#1e3a8a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                                            {row.titulo}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                            const r = row.data;
                                                            const tieneCambios = Number(r?.cambios || 0) > 0;
                                                            const esDevueltoBodega = !!r?.devuelto_bodega;
                                                            return (
                                                                <tr key={`h-item-${row.key}-${idx}`}>
                                                                    <td
                                                                        style={
                                                                            tieneCambios || esDevueltoBodega
                                                                                ? { color: "#c2410c", fontWeight: 700 }
                                                                                : undefined
                                                                        }
                                                                    >
                                                                        {row.nombre || "-"}
                                                                    </td>
                                                                    <td
                                                                        style={{
                                                                            background: "linear-gradient(180deg, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0.08) 100%)",
                                                                            borderLeft: "4px solid rgba(13, 148, 136, 0.75)",
                                                                            boxShadow: "inset 0 0 0 1px rgba(20,184,166,0.18)",
                                                                        }}
                                                                    >
                                                                        <div>{r?.serie_inicial || "-"}</div>
                                                                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                                            {formatearFecha(r?.serie_inicial_fecha)}
                                                                        </small>
                                                                    </td>
                                                                    <td>
                                                                        <div style={tieneCambios || esDevueltoBodega ? { color: "#c2410c", fontWeight: 700 } : undefined}>{r?.serie_anterior_actual || "-"}</div>
                                                                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                                            {formatearFecha(r?.serie_anterior_actual_fecha)}
                                                                        </small>
                                                                    </td>
                                                                    <td>
                                                                        {esDevueltoBodega ? (
                                                                            <>
                                                                                <div style={{ color: "#b91c1c", fontWeight: 700 }}>-</div>
                                                                                <small style={{ fontSize: "0.72rem", color: "#b91c1c", fontWeight: 600 }}>
                                                                                    Devuelto a bodega {formatearFecha(r?.fecha_devuelto_bodega)}
                                                                                </small>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div style={tieneCambios ? { color: "#c2410c", fontWeight: 700 } : undefined}>{r?.serie_actual || "-"}</div>
                                                                                <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                                                    {formatearFecha(r?.serie_actual_fecha)}
                                                                                    {r?.correlativo_ultimo ? ` · N${r.correlativo_ultimo}` : ""}
                                                                                </small>
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                    <td>{r?.cambios || 0}</td>
                                                                    <td>{formatearFechaHora(r?.ultima_actualizacion)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {!historialDetalleFilas.length && <tr><td colSpan="6" className="text-center text-muted">Sin datos para comparar.</td></tr>}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}
                                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setHistorialOpen(false)}>
                                    Cerrar
                                </button>
                                            </div>
                                            </div>
                                            </div>
                                            </div>
            )}

            {cajasResumenOpen && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog modal-lg" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-boxes mr-2" />
                                    Detalle de bultos
                                    {armadoHistorialSeleccionado?.centro?.nombre || armadoHistorialSeleccionado?.centro_nombre
                                        ? ` - ${armadoHistorialSeleccionado?.centro?.nombre || armadoHistorialSeleccionado?.centro_nombre}`
                                        : ""}
                                </h5>
                                <button type="button" className="close" onClick={() => setCajasResumenOpen(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div
                                    className="mb-3 p-2 px-3 rounded"
                                    style={{
                                        background: "linear-gradient(90deg, rgba(14,165,233,0.12) 0%, rgba(37,99,235,0.08) 100%)",
                                        border: "1px solid rgba(14,165,233,0.22)"
                                    }}
                                >
                                    <div className="d-flex flex-wrap align-items-center" style={{ gap: 10 }}>
                                        <span className="badge badge-pill" style={{ background: "#0284c7", color: "#fff" }}>
                                            Cliente
                                        </span>
                                        <strong style={{ color: "#0f172a" }}>
                                            {armadoHistorialSeleccionado?.centro?.cliente || armadoHistorialSeleccionado?.cliente || armadoHistorialSeleccionado?.cliente_nombre || "-"}
                                        </strong>
                                        <span className="badge badge-pill" style={{ background: "#1d4ed8", color: "#fff" }}>
                                            Total real
                                        </span>
                                        <strong style={{ color: "#1e3a8a" }}>{cajasResumenMeta.totalReal}</strong>
                                        <span className="badge badge-pill" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                                            Abiertas
                                        </span>
                                        <strong style={{ color: "#1d4ed8" }}>{cajasResumenMeta.abiertas}</strong>
                                        <span className="badge badge-pill" style={{ background: "#ffedd5", color: "#9a3412" }}>
                                            Cerradas
                                        </span>
                                        <strong style={{ color: "#9a3412" }}>{cajasResumenMeta.cerradas}</strong>
                                    </div>
                                </div>

                                {cajasResumenLoading ? (
                                    <div className="text-muted">Cargando bultos...</div>
                                ) : cajasResumenError ? (
                                    <div className="alert alert-warning mb-0">{cajasResumenError}</div>
                                ) : !cajasResumenOrdenado.length ? (
                                    <div className="text-muted">No hay bultos reales registrados para este armado.</div>
                                ) : (
                                    <div className="row">
                                        {cajasResumenOrdenado.map((caja) => {
                                            const cerrada = caja.estado === "cerrada";
                                            return (
                                                <div key={caja.nombre} className="col-md-6 mb-3">
                                                    <div
                                                        className="h-100 p-3 rounded border"
                                                        style={{
                                                            background: cerrada
                                                                ? "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)"
                                                                : "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                                                            borderColor: cerrada ? "#fdba74" : "#93c5fd",
                                                            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)"
                                                        }}
                                                    >
                                                        <div className="d-flex justify-content-between align-items-start mb-2" style={{ gap: 10 }}>
                                                            <div>
                                                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>{etiquetaBulto(caja.nombre)}</div>
                                                                <small className="text-muted">
                                                                    {caja.equipos} equipos / {caja.materiales} materiales
                                                                </small>
                                                            </div>
                                                            <span
                                                                className="badge badge-pill"
                                                                style={{
                                                                    background: cerrada ? "#fed7aa" : "#bfdbfe",
                                                                    color: cerrada ? "#9a3412" : "#1d4ed8",
                                                                    fontWeight: 700
                                                                }}
                                                            >
                                                                {cerrada ? "Cerrada" : "Abierta"}
                                                            </span>
                                                        </div>

                                                        <div className="small text-muted mb-2">
                                                            Ultimo movimiento: {caja.ultimaFecha ? formatearFechaHora(caja.ultimaFecha) : "Sin movimientos"}
                                                        </div>

                                                        <div className="border rounded bg-white px-2 py-2" style={{ maxHeight: 220, overflowY: "auto" }}>
                                                            {caja.items.length ? (
                                                                caja.items.map((item) => (
                                                                    <div
                                                                        key={item.key}
                                                                        className="d-flex justify-content-between align-items-start py-2"
                                                                        style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.18)", gap: 10 }}
                                                                    >
                                                                        <div>
                                                                            <div style={{ fontWeight: 700, color: "#1e293b" }}>
                                                                                <i className={`fas ${item.tipo === "material" ? "fa-tools" : "fa-desktop"} mr-2`} />
                                                                                {item.nombre}
                                                                            </div>
                                                                            <small className="text-muted">{item.detalle}</small>
                                                                        </div>
                                                                        <span
                                                                            className="badge badge-light"
                                                                            style={{ color: item.tipo === "material" ? "#1d4ed8" : "#0f766e", border: "1px solid rgba(148, 163, 184, 0.25)" }}
                                                                        >
                                                                            {item.tipo === "material" ? "Material" : "Equipo"}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-muted">Sin contenido actual en este bulto.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setCajasResumenOpen(false)}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Asignar armado</h5>
                                <button type="button" className="close" onClick={() => setShowModal(false)}>
                                    <span>&times;</span>
                                </button>
                                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Cliente</label>
                                    <select className="form-control" value={clienteSel} onChange={(e) => handleClienteChange(e.target.value)}>
                                        <option value="">Selecciona cliente</option>
                                        {clientes.map((cli) => (
                                            <option key={cli.id_cliente || cli.id} value={cli.id_cliente || cli.id}>
                                                {cli.nombre}
                                            </option>
                                        ))}
                                    </select>
                                            </div>
                                <div className="form-group">
                                    <label>Centro</label>
                                    <select className="form-control" value={centroSel} onChange={(e) => setCentroSel(e.target.value)} disabled={!clienteSel}>
                                        <option value="">{clienteSel ? "Selecciona centro" : "Primero elige cliente"}</option>
                                        {centros.map((cen) => (
                                            <option key={cen.id_centro || cen.id} value={cen.id_centro || cen.id}>
                                                {cen.nombre}
                                            </option>
                                        ))}
                                    </select>
                                            </div>
                                <div className="form-group">
                                    <label>Tecnico 1</label>
                                    <select className="form-control" value={tecnicoSel} onChange={(e) => setTecnicoSel(e.target.value)}>
                                        <option value="">Selecciona tecnico</option>
                                        {tecnicos.map((tec) => (
                                            <option key={tec.id} value={tec.id}>
                                                {tec.name || tec.nombre || `ID ${tec.id}`}
                                            </option>
                                        ))}
                                    </select>
                                            </div>
                                <div className="form-group">
                                    <label>Tecnico 2 (opcional)</label>
                                    <select className="form-control" value={tecnicoSecundarioSel} onChange={(e) => setTecnicoSecundarioSel(e.target.value)}>
                                        <option value="">Sin segundo tecnico</option>
                                        {tecnicos
                                            .filter((tec) => String(tec.id) !== String(tecnicoSel || ""))
                                            .map((tec) => (
                                                <option key={tec.id} value={tec.id}>
                                                    {tec.name || tec.nombre || `ID ${tec.id}`}
                                                </option>
                                            ))}
                                    </select>
                                            </div>
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select className="form-control" value={estadoAsignacion} onChange={(e) => setEstadoAsignacion(e.target.value)}>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_proceso">En proceso</option>
                            <option value="prefinalizado">Prefinalizado</option>
                            <option value="finalizado">Finalizado</option>
                                    </select>
                                            </div>
                                <div className="form-group">
                                    <label>Fecha inicio</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={fechaInicioAsignacion}
                                        onChange={(e) => setFechaInicioAsignacion(e.target.value)}
                                    />
                                            </div>
                                <div className="form-group">
                                    <label>Fecha término</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={fechaTerminoAsignacion}
                                        onChange={(e) => setFechaTerminoAsignacion(e.target.value)}
                                    />
                                            </div>
                                <div className="form-group">
                                    <label>Observacion</label>
                                    <textarea
                                        className="form-control"
                                        rows="2"
                                        value={observacion}
                                        onChange={(e) => setObservacion(e.target.value)}
                                    />
                                            </div>
                                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleGuardarAsignacion}>
                                    Guardar asignación
                                </button>
                                            </div>
                                            </div>
                                            </div>
                </div>
            )}

            {observacionDetalle.open && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-comment-alt mr-2" />
                                    Observacion - {observacionDetalle.centro || "Armado"}
                                </h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => setObservacionDetalle({ open: false, armadoId: null, centro: "", texto: "", saving: false })}
                                >
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <label className="mb-2 font-weight-bold">Texto de observacion</label>
                                <textarea
                                    className="form-control"
                                    rows="6"
                                    value={observacionDetalle.texto}
                                    onChange={(e) => setObservacionDetalle((prev) => ({ ...prev, texto: e.target.value }))}
                                    placeholder="Escribe la observacion del armado..."
                                />
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setObservacionDetalle({ open: false, armadoId: null, centro: "", texto: "", saving: false })}
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleGuardarObservacionArmado}
                                    disabled={observacionDetalle.saving}
                                >
                                    {observacionDetalle.saving ? "Guardando..." : "Guardar observacion"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {checklistOpen && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog modal-xl" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Checklist de armado - {checklistArmado?.centro?.nombre || checklistArmado?.centro_nombre || "Centro"}
                                </h5>
                                <button type="button" className="close" onClick={() => setChecklistOpen(false)}>
                                    <span>&times;</span>
                                </button>
                                            </div>
                            <div className="modal-body">
                                <div className="armado-checklist-head">
                                    <div>
                                        <strong>Armado N:</strong> {checklistArmado?.id_armado || "-"}
                                            </div>
                                    <div>
                                        <strong>Tecnico:</strong> {checklistArmado?.tecnico?.nombre || checklistArmado?.tecnico_nombre || "-"}
                                            </div>
                                    <div>
                                        <strong>Progreso:</strong>{" "}
                                        {(() => {
                                            const progreso = obtenerProgresoChecklist(checklistArmado?.id_armado || checklistArmado?.id);
                                            return `${progreso.done}/${progreso.total}`;
                                        })()}
                                            </div>
                                            </div>

                                <div className="armado-checklist-areas mb-3">
                                    {CHECKLIST_ARMADO_AREAS.map((area) => {
                                        const p = progresoChecklistAreas?.[area.key] || { done: 0, total: 0, pct: 0 };
                                        const color = p.pct >= 100 ? "#16a34a" : p.pct >= 60 ? "#f59e0b" : "#dc2626";
                                        return (
                                            <button
                                                type="button"
                                                key={`area-progress-${area.key}`}
                                                className={`armado-checklist-area-card ${checklistAreaActiva === area.key ? "is-active" : ""}`}
                                                onClick={() => setChecklistAreaActiva((prev) => (prev === area.key ? "" : area.key))}
                                            >
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <strong>{area.label}</strong>
                                                    <span style={{ color, fontWeight: 700 }}>{p.pct}%</span>
                                            </div>
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <small>{p.done}/{p.total}</small>
                                                    <small className="text-muted">
                                                        {area.secciones.map((n) => `Sec ${n}`).join(", ")}
                                                    </small>
                                            </div>
                                                <div style={{ height: 7, background: "#e5e7eb", borderRadius: 999 }}>
                                                    <div
                                                        style={{
                                                            height: "100%",
                                                            width: `${p.pct}%`,
                                                            background: color,
                                                            borderRadius: 999,
                                                            transition: "width .25s ease",
                                                        }}
                                                    />
                                            </div>
                                            </button>
                                        );
                                    })}
                                            </div>
                                {rol === "supervisor" && (
                                    <div className="alert alert-info py-2 px-3 mb-3">
                                        <i className="fas fa-user-shield mr-2" />
                                        Editas solo tus areas:{" "}
                                        <strong>
                                            {(supervisorAreas || []).length
                                                ? supervisorAreas.map((a) => a.toUpperCase()).join(", ")
                                                : "sin area asignada"}
                                        </strong>
                                            </div>
                                )}

                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered armado-checklist-table mb-0">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 90 }}>Item</th>
                                                <th>Punto de chequeo</th>
                                                <th style={{ width: 150 }}>Estado</th>
                                                <th style={{ width: 155 }}>Fecha</th>
                                                <th style={{ width: 260 }}>Observacion</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checklistSeccionesVisibles.map((sec) => (
                                                <React.Fragment key={`sec-${sec.titulo}`}>
                                                    <tr className="armado-checklist-section-row">
                                                        <td colSpan="5">{sec.titulo}</td>
                                                    </tr>
                                                    {sec.items.map((label, itemIdx) => {
                                                        const secNumero = CHECKLIST_ARMADO_SECCIONES.indexOf(sec) + 1;
                                                        const itemKey = `s${secNumero}-i${itemIdx + 1}`;
                                                        const editable = puedeEditarChecklistItem(secNumero);
                                                        const rowData =
                                                            checklistEstado?.[itemKey] && typeof checklistEstado[itemKey] === "object"
                                                                ? checklistEstado[itemKey]
                                                                : { estado: "", fecha: "", observacion: "" };
                                                        const estado = String(rowData.estado || "").toLowerCase();
                                                        return (
                                                            <tr key={itemKey} className={!editable ? "armado-checklist-row-readonly" : ""}>
                                                                <td>{`${secNumero}.${itemIdx + 1}`}</td>
                                                                <td>{label}</td>
                                                                <td>
                                                                    <select
                                                                        className={`form-control form-control-sm armado-check-estado ${
                                                                            estado === "correcto"
                                                                                ? "estado-correcto"
                                                                                : estado === "incorrecto"
                                                                                ? "estado-incorrecto"
                                                                                : ""
                                                                        }`}
                                                                        value={rowData.estado || ""}
                                                                        disabled={!editable}
                                                                        onChange={(e) =>
                                                                            actualizarChecklistItem(itemKey, {
                                                                                estado: e.target.value,
                                                                                fecha:
                                                                                    rowData.fecha ||
                                                                                    new Date().toISOString().slice(0, 10),
                                                                            })
                                                                        }
                                                                    >
                                                                        <option value="">Seleccionar</option>
                                                                        <option value="correcto">Correcto</option>
                                                                        <option value="incorrecto">Incorrecto</option>
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="date"
                                                                        className="form-control form-control-sm"
                                                                        value={rowData.fecha || ""}
                                                                        disabled={!editable}
                                                                        onChange={(e) => actualizarChecklistItem(itemKey, { fecha: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        value={rowData.observacion || ""}
                                                                        disabled={!editable}
                                                                        onChange={(e) =>
                                                                            actualizarChecklistItem(itemKey, { observacion: e.target.value })
                                                                        }
                                                                        placeholder="Observacion por item..."
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                            </div>

                                <div className="form-group mt-3 mb-0">
                                    <label>Observacion general</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={checklistObs}
                                        onChange={(e) => setChecklistObs(e.target.value)}
                                        placeholder="Notas de cierre del checklist..."
                                    />
                                            </div>
                                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setChecklistOpen(false)}>
                                    Cerrar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={guardarChecklistArmado}>
                                    Guardar checklist
                                </button>
                                            </div>
                                            </div>
                                            </div>
                                            </div>
            )}

                                            </div>
    );
};

export default ArmadoTecnico;






















