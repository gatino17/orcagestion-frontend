import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import DataTable from "react-data-table-component";
import { jwtDecode } from "jwt-decode";
import { io } from "socket.io-client";
import {
    cargarArmados,
    agregarArmado,
    modificarArmado,
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
import { obtenerDetallesCentro, obtenerMaterialesArmado } from "../api";
import { cargarUsuarios } from "../controllers/usuariosControllers";
import { obtenerClientes, obtenerCentrosPorCliente } from "../controllers/consultaCentroControllers";
import { cargarDetallesCentro } from "../controllers/centrosControllers";
import { agregarEquipo, modificarEquipo, borrarEquipo } from "../controllers/equiposControllers";
import "./ArmadoTecnico.css";

const estadosOptions = [
    { value: "", label: "Todos" },
    { value: "pendiente", label: "Pendiente" },
    { value: "en_proceso", label: "En proceso" },
    { value: "finalizado", label: "Finalizado" }
];

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

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
    "bandeja rack - tornillos",
    "zapatilla rack (pdu)",
    "rack 9u + tuercas + tornillos",
    "zapatilla rack",
    "parlantes",
    "sensor magnetico",
    "sensor magnÃ©tico",
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
            "Bandeja Rack - tornillos",
            "Zapatilla Rack (PDU)"
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
    "Bandeja Rack - tornillos",
    "Zapatilla Rack (PDU)",
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
    "Platina o ángulo (Tira)",
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
    "Perno Pasado"
];

const ArmadoTecnico = () => {
    const [rol, setRol] = useState("");
    const [userId, setUserId] = useState(null);
    const [userNombre, setUserNombre] = useState("");
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
    const [estadoAsignacion, setEstadoAsignacion] = useState("pendiente");
    const [observacion, setObservacion] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [planillaOpen, setPlanillaOpen] = useState(false);
    const [armadoActivo, setArmadoActivo] = useState(null);
    const [equipos, setEquipos] = useState([]);
    const [loadingPlanilla, setLoadingPlanilla] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [participaciones, setParticipaciones] = useState([]);
    const [transferTecSel, setTransferTecSel] = useState("");
    const [transferNota, setTransferNota] = useState("");
    const [materiales, setMateriales] = useState([]);
    const [materialesSnapshot, setMaterialesSnapshot] = useState({});
    const [tabPlanilla, setTabPlanilla] = useState("equipos"); // 'equipos' | 'materiales'
    const [cajas, setCajas] = useState(["Caja 1"]);
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
    const [historialTab, setHistorialTab] = useState("resumen");
    const lastSeenMovIdRef = useRef(0);
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
            (listaBackend || []).map((m) => [String(m.nombre || "").toLowerCase(), m])
        );
        const base = MATERIALES_PREDEF.map((nombre) => {
            const found = mapa.get(nombre.toLowerCase());
            const cantidad = found && found.cantidad !== undefined && found.cantidad !== null ? found.cantidad : "";
            const caja = found?.caja || "Caja 1";
            const caja_tecnico_id = found?.caja_tecnico_id;
            const caja_tecnico_nombre = found?.caja_tecnico_nombre;
            return { nombre, cantidad, caja, caja_tecnico_id, caja_tecnico_nombre };
        });
        const extras = (listaBackend || []).filter(
            (m) => !MATERIALES_PREDEF.some((p) => p.toLowerCase() === String(m.nombre || "").toLowerCase())
        );
        const extrasNormalizados = extras.map((m) => ({
            nombre: m.nombre,
            cantidad: m.cantidad ?? "",
            caja: m.caja || "Caja 1",
            caja_tecnico_id: m.caja_tecnico_id,
            caja_tecnico_nombre: m.caja_tecnico_nombre
        }));
        return [...base, ...extrasNormalizados];
    }, []);

    const socketBaseUrl = useMemo(() => {
        const env = process.env.REACT_APP_API_BASE_URL;
        if (env && /^https?:\/\//i.test(env)) return env.replace(/\/api\/?$/i, "");
        if (window.location.hostname === "localhost") return "http://localhost:5000";
        return `${window.location.protocol}//${window.location.host}`;
    }, []);

    const socketTransports = useMemo(() => {
        const forcePolling = process.env.REACT_APP_SOCKET_POLLING_ONLY === "1";
        if (forcePolling || window.location.hostname === "localhost") return ["polling"];
        return ["websocket", "polling"];
    }, []);

    const materialKey = useCallback((m = {}) => String(m.nombre || "").trim().toLowerCase(), []);
    const materialHash = useCallback((m = {}) => {
        const cantidad = Number(m.cantidad) || 0;
        const caja = String(m.caja || "Caja 1").trim();
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

    const mergeEquiposPredef = useCallback((lista = []) => {
        const mapa = new Map(
            (lista || []).map((e) => [normalizarNombreEquipo(e.nombre || ""), e])
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
                caja: found?.caja || "Caja 1",
                id_equipo: found?.id_equipo,
                centro_id: found?.centro_id
            };
        });
        const extras = (lista || []).filter(
            (e) => !EQUIPOS_PREDEF.some((p) => normalizarNombreEquipo(p) === normalizarNombreEquipo(e.nombre || ""))
        );
        const extrasNorm = extras.map((e) => ({
            ...e,
            caja: e.caja || "Caja 1",
            nombre: e.nombre
        }));
        return [...base, ...extrasNorm];
    }, [normalizarNombreEquipo]);

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

    // Arma una lista combinada con filas de título + filas de ítems para mostrar secciones
    const equiposConTitulos = useMemo(() => {
        const lista = [];
        const usado = new Set();
        const pushGrupo = (titulo, items) => {
            const itemsNorm = items.map((n) => normalizarNombreEquipo(n));
            const presentes = equiposOrdenados.filter(
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
        const extras = equiposOrdenados.filter((eq) => !usado.has(eq.__idx));
        if (extras.length) {
            lista.push({ tipo: "titulo", titulo: "Otros" });
            extras.forEach((eq) => lista.push({ tipo: "item", data: eq }));
        }
        return lista;
    }, [equiposOrdenados, normalizarNombreEquipo]);
    const esMovil = useMemo(
        () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || ""),
        []
    );

    // Mantener vivas las cajas usadas históricamente (movimientos) para que no se pierdan al recargar.
    useEffect(() => {
        if (!movimientos.length) return;
        const cajasMovs = movimientos
            .map((m) => (m.caja || "Caja 1").trim())
            .filter(Boolean);
        setCajas((prev = []) => {
            const union = Array.from(new Set([...prev, ...cajasMovs]));
            return union.length ? union : ["Caja 1"];
        });
    }, [movimientos]);

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
        } catch (err) {
            console.error("Error al decodificar token:", err);
        }
    }, []);

    const recargarMovimientosRecientes = useCallback(() => {
        const filtros = {};
        if (movArmadoFiltro) filtros.armado_id = movArmadoFiltro;
        if (movClienteFiltro) filtros.cliente = movClienteFiltro;
        if ((movSerieFiltro || "").trim()) filtros.numero_serie = movSerieFiltro.trim();
        cargarMovimientosRecientes(setMovimientosRecientes, movsLimit, movsPage, (meta) => {
            setMovsTotal(meta.total || 0);
            setMovsPage(meta.page || 1);
            setMovsLimit(meta.limit || movsLimit);
        }, filtros);
    }, [movArmadoFiltro, movClienteFiltro, movSerieFiltro, movsLimit, movsPage]);

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

    const historialResumen = useMemo(() => (Array.isArray(historialData?.resumen) ? historialData.resumen : []), [historialData]);
    const historialEventos = useMemo(() => (Array.isArray(historialData?.eventos) ? historialData.eventos : []), [historialData]);

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
        const equiposConCambios = historialResumen.filter((r) => Number(r?.cambios || 0) > 0).length;
        const cambiosTotales = historialResumen.reduce((acc, r) => acc + Number(r?.cambios || 0), 0);
        const ultimoCambio = historialEventos.length ? historialEventos[0]?.fecha : null;
        return { equiposConCambios, cambiosTotales, ultimoCambio };
    }, [historialResumen, historialEventos]);

    const historialResumenConCambios = useMemo(
        () => historialResumen.filter((r) => Number(r?.cambios || 0) > 0),
        [historialResumen]
    );

    // Historial global: fallback polling (si websocket no conecta)
    useEffect(() => {
        recargarMovimientosRecientes();
        const interval = setInterval(recargarMovimientosRecientes, 30000);
        const onFocus = () => recargarMovimientosRecientes();
        const onVisible = () => {
            if (document.visibilityState === "visible") recargarMovimientosRecientes();
        };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [recargarMovimientosRecientes]);

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
        if (rol !== "admin") return;
        cargarUsuarios((lista) => {
            const soloTecnicos = (lista || []).filter((u) => u.rol === "tecnico");
            setTecnicos(soloTecnicos);
        });
        obtenerClientes(setClientes, () => {});
    }, [rol]);

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
        } else if (userId) {
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
            recargarMovimientosRecientes();
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
    }, [rol, socketBaseUrl, socketTransports, fetchArmados, recargarMovimientosRecientes, planillaOpen, armadoActivo, mergeMateriales]);

    const renderEstado = (estado) => {
        const normalizado = (estado || "pendiente").toLowerCase();
        const map = {
            pendiente: { clase: "badge badge-pill badge-warning", label: "Pendiente" },
            en_proceso: { clase: "badge badge-pill badge-info", label: "En proceso" },
            finalizado: { clase: "badge badge-pill badge-success", label: "Finalizado" }
        };
        const { clase, label } = map[normalizado] || map.pendiente;
        return <span className={clase}>{label}</span>;
    };

    const formatearFecha = (valor) => {
        if (!valor) return "-";
        const fecha = new Date(valor);
        if (Number.isNaN(fecha.getTime())) return "-";
        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    };

    const formatearFechaHora = (valor) => {
        if (!valor) return "-";
        const fecha = new Date(valor);
        if (Number.isNaN(fecha.getTime())) return "-";
        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const anio = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, "0");
        const minutos = String(fecha.getMinutes()).padStart(2, "0");
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
    };

    const columnas = [
        {
            name: "Centro",
            selector: (row) => row.centro?.nombre || row.centro_nombre || "-",
            sortable: true,
            wrap: true,
            grow: 1.4
        },
        {
            name: "Cliente",
            selector: (row) => row.centro?.cliente || row.cliente || "-",
            sortable: true,
            wrap: true,
            grow: 1.1
        },
        {
            name: "Técnico",
            selector: (row) => row.tecnico?.nombre || row.tecnico_nombre || "-",
            sortable: true,
            wrap: true,
            grow: 1.1,
            cell: (row) => (
                <div>
                    <div>{row.tecnico?.nombre || row.tecnico_nombre || "-"}</div>
                    {row.tecnicos_historial && row.tecnicos_historial.length > 1 && (
                        <small className="text-muted">
                            Previos: {row.tecnicos_historial.slice(0, -1).join(", ")}
                        </small>
                    )}
                </div>
            )
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
                    finalizado: { bg: "#22c55e", text: "#fff" }
                };
                const { bg, text } = colorMap[normalizado] || colorMap.pendiente;

                return rol === "admin" ? (
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
            name: "Cierre",
            selector: (row) => row.fecha_cierre,
            sortable: true,
            grow: 0.5,
            wrap: true,
            cell: (row) => formatearFecha(row.fecha_cierre)
        },
        {
            name: "Excel",
            grow: 0.45,
            minWidth: "95px",
            wrap: true,
            cell: (row) => {
                const esFinalizado = (row.estado || "").toLowerCase() === "finalizado";
                if (!esFinalizado) return <span className="text-muted">—</span>;
                return (
                    <button className="btn btn-sm btn-outline-success" onClick={() => descargarExcelArmado(row)}>
                        <i className="fas fa-file-excel mr-1" />
                        Excel
                    </button>
                );
            }
        },
        {
            name: "Total cajas",
            selector: (row) => row.total_cajas || 0,
            sortable: true,
            grow: 0.5,
            wrap: true,
            cell: (row) => row.total_cajas ?? 0
        },
        {
            name: "Planilla",
            grow: 0.4,
            minWidth: "100px",
            wrap: true,
            cell: (row) => (
                <button className="btn btn-sm btn-outline-primary" onClick={() => handleAbrirPlanilla(row)}>
                    <i className="fas fa-list-alt mr-1" />
                    Abrir
                </button>
            )
        }
    ];

    const handleAbrirModal = () => {
        setClienteSel("");
        setCentroSel("");
        setTecnicoSel("");
        setEstadoAsignacion("pendiente");
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
                const cajasMateriales = merged.map((m) => (m.caja || "Caja 1").trim());
                const cajasEquipos = equiposNorm.map((e) => (e.caja || "Caja 1").trim());
                const cajasDetectadas = Array.from(new Set([...cajasMateriales, ...cajasEquipos]));
                setMateriales(merged);
                setMaterialesSnapshot(crearSnapshotMateriales(merged));
                setCajas((prev) => {
                    const union = Array.from(new Set([...(prev || []), ...cajasDetectadas]));
                    return union.length ? union : ["Caja 1"];
                });
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
        const propuesta = `Caja ${cajas.length + 1}`;
        const nueva = window.prompt("Nombre de la caja", propuesta);
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
            const cajasEquipos = equiposNorm.map((e) => (e.caja || "Caja 1").trim());
            const cajasMateriales = materiales.map((m) => (m.caja || "Caja 1").trim());
            const cajasDetectadas = Array.from(new Set([...cajasEquipos, ...cajasMateriales]));
            setCajas((prev = []) => {
                const union = Array.from(new Set([...prev, ...cajasDetectadas]));
                return union.length ? union : ["Caja 1"];
            });
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
        if (rol !== "admin") return;
        const id = row.id_armado || row.id;
        if (!id) return;
        try {
            const hoy = new Date().toISOString().slice(0, 10);
            const payload = { estado: nuevoEstado };
            if (nuevoEstado === "finalizado") {
                payload.fecha_cierre = hoy;
            }
            await modificarArmado(id, payload);
            await fetchArmados();
        } catch (err) {
            console.error("No se pudo actualizar estado:", err);
            alert("No se pudo actualizar el estado.");
        }
    };

    const descargarExcelArmado = async (row) => {
        try {
            const idArmado = row.id_armado || row.id;
            const nombreCentro = row?.centro?.nombre || row?.centro_nombre || "-";
            const cliente = row?.centro?.cliente || row?.cliente || "-";
            const tecnico = row?.tecnico?.nombre || row?.tecnico_nombre || "-";

            const [detalles, materiales] = await Promise.all([
                obtenerDetallesCentro(nombreCentro),
                obtenerMaterialesArmado(idArmado)
            ]);
            const equipos = Array.isArray(detalles?.equipos) ? detalles.equipos : [];
            const mats = Array.isArray(materiales) ? materiales : [];

            const equiposConIdx = (equipos || []).map((e, idx) => ({ ...e, __idx: idx }));
            const usados = new Set();
            const bloquesEquipos = [];
            const pushBloque = (titulo, lista) => {
                bloquesEquipos.push(`<tr class="section-row"><td colspan="4">${escapeHtml(titulo)}</td></tr>`);
                if (!lista.length) {
                    bloquesEquipos.push(`<tr><td colspan="4" class="empty-row">Sin registros</td></tr>`);
                    return;
                }
                lista.forEach((e) => {
                    bloquesEquipos.push(
                        `<tr><td>${escapeHtml(e.nombre || "-")}</td><td>${escapeHtml(e.caja || "-")}</td><td>${escapeHtml(
                            e.numero_serie || "-"
                        )}</td><td>${escapeHtml(e.codigo || "-")}</td></tr>`
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

            const filasEquipos = bloquesEquipos.join("");

            const filasMateriales = mats
                .map(
                    (m) =>
                        `<tr><td>${escapeHtml(m.nombre || "-")}</td><td>${escapeHtml(
                            m.cantidad ?? 0
                        )}</td><td>${escapeHtml(m.caja || "-")}</td></tr>`
                )
                .join("");

            const html = `
                <html>
                <head>
                    <meta charset="UTF-8" />
                    <style>
                        body { font-family: "Segoe UI", Arial, sans-serif; color:#0f172a; padding:18px; }
                        h3 { margin: 14px 0 8px 0; }
                        table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
                        .header-table td { border: 1px solid #b8c7d9; vertical-align: top; }
                        .brand-cell { width: 220px; background:#173a6a; color:#fff; text-align:center; padding: 16px 10px; }
                        .brand-orca { font-size: 38px; letter-spacing: 6px; font-weight: 800; line-height: 1; }
                        .brand-sub { font-size: 15px; letter-spacing: 2px; font-weight: 700; margin-top: 8px; }
                        .company-cell { padding: 8px 12px; min-width: 380px; }
                        .company-title { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
                        .company-line { font-size: 12px; line-height: 1.5; }
                        .head-side td, .head-side th { border: 1px solid #b8c7d9; padding: 6px 8px; font-size: 12px; }
                        .head-side th { background:#eef2f7; text-align:left; width: 150px; }
                        .meta-table th, .meta-table td { border: 1px solid #b8c7d9; padding: 6px 8px; font-size: 12px; }
                        .meta-table th { width: 140px; background: #eef2f7; font-weight: 700; text-transform: uppercase; }
                        .items-table th, .items-table td { border: 1px solid #b8c7d9; padding: 6px 8px; font-size: 12px; }
                        .items-table thead th { background:#dbe7f5; text-align:left; text-transform: uppercase; font-weight: 700; }
                        .section-row td { background:#0f2d57; color:#fff; font-weight:700; text-transform: uppercase; }
                        .empty-row { color:#64748b; font-style: italic; }
                    </style>
                </head>
                <body>
                    <table class="header-table">
                        <tr>
                            <td class="brand-cell">
                                <div class="brand-orca">ORCA</div>
                                <div class="brand-sub">TECNOLOGIA</div>
                            </td>
                            <td class="company-cell">
                                <div class="company-title">Inventario de equipos</div>
                                <div class="company-line"><strong>SOCIEDAD ORCA TECNOLOGIA SPA.</strong></div>
                                <div class="company-line">Tel. (065)2753524</div>
                                <div class="company-line">www.orcatecnologia.cl</div>
                                <div class="company-line">E-mail: ioyarzun@orcatecnologia.cl</div>
                            </td>
                            <td>
                                <table class="head-side" style="width:100%; margin:0;">
                                    <tr><th>Total cajas</th><td>${escapeHtml(row.total_cajas ?? 0)}</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <table class="meta-table">
                        <tr>
                            <th>Centro</th><td>${escapeHtml(nombreCentro)}</td>
                            <th>Asignado</th><td>${escapeHtml(formatearFecha(row.fecha_asignacion || row.created_at))}</td>
                        </tr>
                        <tr>
                            <th>Cliente</th><td>${escapeHtml(cliente)}</td>
                            <th>Inicio armado</th><td>${escapeHtml(formatearFecha(row.fecha_inicio))}</td>
                        </tr>
                        <tr>
                            <th>Tecnico</th><td>${escapeHtml(tecnico)}</td>
                            <th>Cierre</th><td>${escapeHtml(formatearFecha(row.fecha_cierre))}</td>
                        </tr>
                        <tr>
                            <th>Estado</th><td>${escapeHtml(row.estado || "-")}</td>
                            <th></th><td></td>
                        </tr>
                    </table>

                    <h3>Equipos</h3>
                    <table class="items-table">
                        <thead><tr><th>Equipo</th><th>Caja</th><th>Nro Serie</th><th>Codigo</th></tr></thead>
                        <tbody>${filasEquipos || "<tr><td colspan='4'>Sin equipos</td></tr>"}</tbody>
                    </table>

                    <h3>Materiales</h3>
                    <table class="items-table">
                        <thead><tr><th>Material</th><th>Cantidad</th><th>Caja</th></tr></thead>
                        <tbody>${filasMateriales || "<tr><td colspan='3'>Sin materiales</td></tr>"}</tbody>
                    </table>
                </body>
                </html>
            `;

            const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const centroArchivo = String(nombreCentro || "centro")
                .trim()
                .replace(/[\\/:*?"<>|]/g, "")
                .replace(/\s+/g, "_");
            a.download = `armado_${centroArchivo}_${idArmado}_${new Date().toISOString().slice(0, 10)}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("No se pudo generar el Excel:", error);
            alert("No se pudo generar el Excel del armado.");
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
            alert("Selecciona centro y tÃ©cnico.");
            return;
        }
        const payload = {
            centro_id: Number(centroSel),
            tecnico_id: Number(tecnicoSel),
            estado: estadoAsignacion,
            fecha_asignacion: new Date().toISOString().slice(0, 10),
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
        if (!transferTecSel) {
            alert("Selecciona el nuevo tÃ©cnico.");
            return;
        }
        await transferirArmado(
            armadoActivo.id_armado,
            { tecnico_id: Number(transferTecSel), nota: transferNota },
            async () => {
                await cargarParticipaciones(armadoActivo.id_armado, setParticipaciones);
                setTransferNota("");
                setTransferTecSel("");
                await fetchArmados();
            }
        );
    };

    const resumen = useMemo(() => {
        const base = { total: armados.length, pendientes: 0, enProceso: 0, finalizados: 0 };
        armados.forEach((a) => {
            const estado = (a.estado || "").toLowerCase();
            if (estado === "finalizado") base.finalizados += 1;
            else if (estado === "en_proceso") base.enProceso += 1;
            else base.pendientes += 1;
        });
        return base;
    }, [armados]);

    return (
        <div className="container-fluid armado-page">
            <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 responsive-header">
                <div>
                    <p className="text-muted mb-1">Armado técnico</p>
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

                        {rol === "admin" && (
                            <div>
                                <small className="text-muted text-uppercase d-block mb-1">Técnico (filtro)</small>
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

                        {rol === "admin" && (
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
                                    Planilla de armado · {armadoActivo?.centro?.nombre || armadoActivo?.centro_nombre || "Centro"}{" "}
                                    <span className="badge badge-primary ml-2" title="Total de cajas detectadas">
                                        {cajas.length} cajas
                                    </span>
                                    {armadoActivo && (
                                        <span
                                            className="badge ml-2"
                                            style={{
                                                backgroundColor: `${colorTecnico(armadoActivo?.tecnico?.nombre || armadoActivo?.tecnico?.name || armadoActivo?.tecnico_nombre)}22`,
                                                color: colorTecnico(armadoActivo?.tecnico?.nombre || armadoActivo?.tecnico?.name || armadoActivo?.tecnico_nombre),
                                                border: `1px solid ${colorTecnico(armadoActivo?.tecnico?.nombre || armadoActivo?.tecnico?.name || armadoActivo?.tecnico_nombre)}`
                                            }}
                                            title="Técnico actual"
                                        >
                                            Técnico: {armadoActivo?.tecnico?.nombre || armadoActivo?.tecnico?.name || armadoActivo?.tecnico_nombre || "—"}
                                        </span>
                                    )}
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
                                            <button
                                                className="btn btn-sm btn-outline-primary ml-auto"
                                                onClick={handleAgregarCaja}
                                            >
                                                <i className="fas fa-box-open mr-1" />
                                                Agregar caja
                                            </button>
                                        </div>

                                        {tabPlanilla === "equipos" && (
                                            <>
                                                <div className="row mb-3">
                                                    <div className="col-md-6">
                                                        <h6 className="d-flex align-items-center mb-2">
                                                            <i className="fas fa-user-friends mr-2 text-primary" />
                                                            Historial de técnicos
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
                                                    {rol === "admin" && (
                                                        <div className="col-md-6">
                                                            <h6>Transferir armado</h6>
                                                            <div className="form-group">
                                                        <label>Nuevo técnico</label>
                                                                <select
                                                                    className="form-control"
                                                                    value={transferTecSel}
                                                                    onChange={(e) => setTransferTecSel(e.target.value)}
                                                                >
                                                                    <option value="">Seleccione</option>
                                                                    {tecnicos.map((tec) => (
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
                                                            <th style={{ minWidth: esMovil ? "50px" : "75px" }}>Caja</th>
                                                            {!esMovil && <th>IP</th>}
                                                            {!esMovil && <th>Observación</th>}
                                                            {!esMovil && <th>Código</th>}
                                                            <th>N Serie</th>
                                                            {!esMovil && <th>Estado</th>}
                                                            <th>Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
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
                                                                return (
                                                                    <tr key={rowKey}>
                                                                        <td>{eq.nombre}</td>
                                                                            <td style={{ minWidth: "110px" }}>
                                                                                {enEdicion ? (
                                                                                    <select
                                                                                        className="form-control form-control-sm"
                                                                                        value={eq.caja || "Caja 1"}
                                                                                    onChange={(e) => handleEquipoChange(eq.__idx, "caja", e.target.value)}
                                                                                >
                                                                                    {cajas.map((caja) => (
                                                                                        <option key={caja} value={caja}>
                                                                                            {caja}
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
                                                                                        return (
                                                                                            <>
                                                                                                <span
                                                                                                    className="badge badge-light"
                                                                                                    style={{ border: `1px solid ${border}`, color }}
                                                                                                >
                                                                                                    {eq.caja || "Caja 1"}
                                                                                                </span>
                                                                                                {hasTec && displayName && (
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
                                                                                    eq.ip || "—"
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
                                                                                    eq.observacion || "—"
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
                                                                                    eq.codigo || "—"
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
                                                                        eq.numero_serie || "—"
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
                                                                                    eq.estado || "—"
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
                                                                caja: m.caja || "Caja 1"
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
                                                                        const cajasMateriales = merged.map((m) => (m.caja || "Caja 1").trim());
                                                                        const cajasEquipos = (equipos || []).map((e) => (e.caja || "Caja 1").trim());
                                                                        setCajas((prev = []) => {
                                                                            const union = Array.from(new Set([...prev, ...cajasMateriales, ...cajasEquipos]));
                                                                            return union.length ? union : ["Caja 1"];
                                                                        });
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
                                            <div className="row">
                                                {materiales.map((mat, idx) => (
                                                    <div className="col-md-6 col-lg-6 mb-2" key={mat.nombre}>
                                                        <div className="material-card">
                                                            <div className="material-head">
                                                                <div className="material-name">{mat.nombre}</div>
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
                                                                                    style={{ border: `1px solid ${border}`, color }}
                                                                                >
                                                                                    {mat.caja || "Caja 1"}
                                                                                </span>
                                                                                {hasTec && displayName && (
                                                                                    <small className="d-block" style={{ color }}>
                                                                                        por {displayName}
                                                                                    </small>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div className="material-assign">
                                                                <div className="mr-2">
                                                                    <label className="text-muted small mb-1">Caja</label>
                                                                    <select
                                                                        className="form-control form-control-sm"
                                                                        value={mat.caja || "Caja 1"}
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
                                                                                {caja}
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
                                                ))}
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
                                        <th>Ítem</th>
                                        <th>N° Serie</th>
                                        <th>Caja</th>
                                        <th>Cant.</th>
                                        <th>Técnico</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientos.slice(0, 10).map((mov) => (
                                        <tr key={mov.id_movimiento}>
                                            <td>{formatearFecha(mov.fecha)}</td>
                                            <td className="text-capitalize">{mov.tipo}</td>
                                            <td>{mov.nombre_item}</td>
                                            <td>{mov.numero_serie || "-"}</td>
                                            <td>{mov.caja}</td>
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

            {/* Historial global solo para admin */}
            {rol === "admin" && (
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
                                    placeholder="Buscar N° serie..."
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
                                    className="btn btn-sm btn-outline-danger"
                                    disabled={!movSeleccionados.length || eliminandoSeleccion}
                                    onClick={handleEliminarSeleccionados}
                                    title="Eliminar seleccionados"
                                >
                                    <i className="fas fa-trash-alt mr-1" />
                                    {eliminandoSeleccion ? "Eliminando..." : `Eliminar seleccionados (${movSeleccionados.length})`}
                                </button>
                                <small className="text-muted mr-2">Mostrar</small>
                                <select
                                    className="form-control form-control-sm"
                                    style={{ width: 90 }}
                                    value={movsLimit}
                                    onChange={(e) => setMovsLimit(Number(e.target.value))}
                                >
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                    <option value={20}>20</option>
                                </select>
                            </div>
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
                                        <th>Ítem</th>
                                        <th>N° Serie</th>
                                        <th>Caja</th>
                                        <th>Cant.</th>
                                        <th>Armado</th>
                                        <th>Técnico</th>
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
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={movSeleccionados.includes(Number(mov.id_movimiento))}
                                                    onChange={() => toggleSeleccionMovimiento(mov.id_movimiento)}
                                                />
                                            </td>
                                            <td>{formatearFechaHora(mov.fecha)}</td>
                                            <td className="text-capitalize">{mov.tipo}</td>
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
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        title="Eliminar movimiento"
                                                        onClick={() => handleEliminarMovimientoGlobal(mov)}
                                                    >
                                                        <i className="fas fa-trash-alt" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {movimientosVisibles.length === 0 && (
                                        <tr>
                                            <td colSpan="9" className="text-center text-muted">
                                                Sin movimientos registrados todavía.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <small className="text-muted">
                                Página {Math.min(movsPage, movsTotalPaginasVista)} — {movsTotalPaginasVista} en total
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
                                    {historialData?.armado?.centro_nombre ? ` - ${historialData.armado.centro_nombre}` : ""}
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
                                                <strong style={{ color: "#0f172a" }}>{historialData?.armado?.centro_nombre || "-"}</strong>
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
                                                    const color = cambios > 0 ? "#fff7ed" : "#f8fafc";
                                                    const borde = cambios > 0 ? "#fdba74" : "#e2e8f0";
                                                    return (
                                                        <div className="col-md-6 mb-2" key={`card-${r.item_id}`}>
                                                            <div className="p-2 border rounded" style={{ background: color, borderColor: borde }}>
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <strong>{r.nombre_item || "-"}</strong>
                                                                    <span className={`badge ${cambios > 0 ? "badge-warning" : "badge-secondary"}`}>{cambios > 0 ? `${cambios} cambios` : "Sin cambios"}</span>
                                                                </div>
                                                                <div className="small text-muted mt-1">{cambios > 0 ? "Anterior -> Actual" : "Inicial -> Actual"}</div>
                                                                <div>{cambios > 0 ? (r.serie_anterior_actual || "-") : (r.serie_inicial || "-")} -&gt; {r.serie_actual || "-"}</div>
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
                                                            return (
                                                                <tr key={`h-item-${row.key}-${idx}`}>
                                                                    <td
                                                                        style={
                                                                            tieneCambios
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
                                                                        <div style={tieneCambios ? { color: "#c2410c", fontWeight: 700 } : undefined}>{r?.serie_anterior_actual || "-"}</div>
                                                                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                                            {formatearFecha(r?.serie_anterior_actual_fecha)}
                                                                        </small>
                                                                    </td>
                                                                    <td>
                                                                        <div style={tieneCambios ? { color: "#c2410c", fontWeight: 700 } : undefined}>{r?.serie_actual || "-"}</div>
                                                                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                                            {formatearFecha(r?.serie_actual_fecha)}
                                                                            {r?.correlativo_ultimo ? ` · N${r.correlativo_ultimo}` : ""}
                                                                        </small>
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
                                    <label>Técnico</label>
                                    <select className="form-control" value={tecnicoSel} onChange={(e) => setTecnicoSel(e.target.value)}>
                                        <option value="">Selecciona tÃ©cnico</option>
                                        {tecnicos.map((tec) => (
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
                                        <option value="finalizado">Finalizado</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Observación</label>
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
                                    Guardar asignaciÃ³n
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





