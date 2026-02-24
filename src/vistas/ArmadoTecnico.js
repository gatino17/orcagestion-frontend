import React, { useEffect, useMemo, useState, useCallback } from "react";
import DataTable from "react-data-table-component";
import { jwtDecode } from "jwt-decode";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
    cargarArmados,
    agregarArmado,
    cargarParticipaciones,
    transferirArmado,
    cargarMateriales,
    guardarMateriales,
    cargarMovimientos,
    cargarMovimientosRecientes
} from "../controllers/armadosControllers";
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

const ORDEN_EQUIPOS = [
    "pc nvr",
    "monitor",
    "mouse",
    "teclado",
    "switch cisco + adaptador",
    "router mikrotik + trafo",
    "rack 9u + tuercas + tornillos",
    "zapatilla rack",
    "switch rack",
    "parlantes",
    "sensor magnetico",
    "sensor magnético"
];

const SINONIMOS_EQUIPOS = {
    "ip pc": "pc nvr"
};

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
    const [tabPlanilla, setTabPlanilla] = useState("equipos"); // 'equipos' | 'materiales'
    const [cajas, setCajas] = useState(["Caja 1"]);
    const [userNombre, setUserNombre] = useState("");
    const [movimientos, setMovimientos] = useState([]);
    const [movimientosRecientes, setMovimientosRecientes] = useState([]);
    const [movsLimit, setMovsLimit] = useState(10);
    const [movsPage, setMovsPage] = useState(1);
    const [movsTotal, setMovsTotal] = useState(0);
    const [scanTarget, setScanTarget] = useState(null);
    const [scanOpen, setScanOpen] = useState(false);
    const [scanMsg, setScanMsg] = useState("Apunta la cámara al código (solo números)");
    const [scanError, setScanError] = useState("");
    const videoRef = React.useRef(null);
    const controlsRef = React.useRef(null);
    const readerRef = React.useRef(null);
    const scanTimeoutRef = React.useRef(null);
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

    const normalizarEquipos = useCallback((lista = []) => {
        return (lista || []).map((eq) => ({
            ...eq,
            caja: eq.caja || "Caja 1"
        }));
    }, []);

    const prioridadEquipo = useCallback((nombre = "") => {
        let n = nombre.toLowerCase().trim();
        if (SINONIMOS_EQUIPOS[n]) n = SINONIMOS_EQUIPOS[n];
        const idx = ORDEN_EQUIPOS.findIndex((o) => o === n);
        if (idx >= 0) return idx;
        // buscar por contiene cuando no es coincidencia exacta
        const idxContains = ORDEN_EQUIPOS.findIndex((o) => n.includes(o));
        return idxContains >= 0 ? idxContains : ORDEN_EQUIPOS.length + 100; // enviar al final
    }, []);

    const soloNumeros = useCallback((txt = "") => txt.replace(/\D+/g, ""), []);

    const handleScanManual = (idx) => {
        const raw = window.prompt("Ingresa o escanea el código (solo números)", "");
        if (raw === null) return;
        const numeros = soloNumeros(raw);
        if (!numeros) return;
        const codigo5 = numeros.slice(0, 5);
        setEquipos((prev) =>
            prev.map((eq, i) => (i === idx ? { ...eq, numero_serie: numeros, codigo: codigo5 || eq.codigo } : eq))
        );
    };

    const stopLiveScan = useCallback(() => {
        if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
        }
        if (readerRef.current?.reset) {
            readerRef.current.reset();
        }
        if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
        }
        setScanOpen(false);
        setScanTarget(null);
        setScanError("");
        setScanMsg("Apunta la cámara al código (solo números)");
    }, []);

    const startLiveScan = async (idx) => {
        if (!navigator.mediaDevices?.getUserMedia) {
            handleScanManual(idx);
            return;
        }
        try {
            readerRef.current = readerRef.current || new BrowserMultiFormatReader();
            setScanMsg("Apunta la cámara al código (solo números)");
            setScanError("");
            setScanTarget(idx);
            setScanOpen(true);
            controlsRef.current?.stop();
            controlsRef.current = await readerRef.current.decodeFromVideoDevice(
                undefined,
                videoRef.current,
                (result, err) => {
                    if (result) {
                        const numeros = soloNumeros(result.getText() || "");
                        if (numeros) {
                            const codigo5 = numeros.slice(0, 5);
                            setEquipos((prev) =>
                                prev.map((eq, i) =>
                                    i === idx ? { ...eq, numero_serie: numeros, codigo: codigo5 || eq.codigo } : eq
                                )
                            );
                            stopLiveScan();
                        }
                    } else if (err) {
                        setScanError("No se pudo leer el código, intenta ajustar el enfoque.");
                    }
                }
            );
            // si en 10s no se detecta nada, mostrar mensaje
            scanTimeoutRef.current = setTimeout(() => {
                setScanError("No se detectó el código. Acerca la cámara o ingresa manualmente.");
            }, 10000);
        } catch (err) {
            console.error("No se pudo abrir cámara:", err);
            setScanError("No se pudo acceder a la cámara. Revisa permisos o ingresa manualmente.");
            handleScanManual(idx);
        }
    };

    useEffect(() => () => stopLiveScan(), [stopLiveScan]);

    const equiposOrdenados = useMemo(
        () =>
            equipos
                .map((eq, index) => ({ ...eq, __idx: index }))
                .sort((a, b) => prioridadEquipo(a.nombre) - prioridadEquipo(b.nombre)),
        [equipos, prioridadEquipo]
    );
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

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            setRol(decoded.rol || "");
            setUserId(decoded.id || decoded.user_id || decoded.sub || null);
            setUserNombre(decoded.name || "");
        } catch (err) {
            console.error("Error al decodificar token:", err);
        }
    }, []);

    // Historial global de movimientos recientes (se recarga cada 60s)
    useEffect(() => {
        cargarMovimientosRecientes(setMovimientosRecientes, movsLimit, movsPage, (meta) => {
            setMovsTotal(meta.total || 0);
            setMovsPage(meta.page || 1);
            setMovsLimit(meta.limit || movsLimit);
        });
        const interval = setInterval(
            () => cargarMovimientosRecientes(setMovimientosRecientes, movsLimit, movsPage, (meta) => {
                setMovsTotal(meta.total || 0);
                setMovsPage(meta.page || 1);
                setMovsLimit(meta.limit || movsLimit);
            }),
            60000
        );
        return () => clearInterval(interval);
    }, [movsLimit, movsPage]);

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

    const fetchArmados = useCallback(async () => {
        if (!rol) return;
        setLoading(true);
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
            setLoading(false);
        }
    }, [rol, userId, filtroEstado, filtroTecnico]);

    useEffect(() => {
        fetchArmados();
    }, [fetchArmados]);

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
            width: "140px",
            cell: (row) => renderEstado(row.estado)
        },
        {
            name: "Asignado",
            selector: (row) => row.fecha_asignacion || row.created_at,
            sortable: true,
            width: "120px",
            cell: (row) => formatearFecha(row.fecha_asignacion || row.created_at)
        },
        {
            name: "Inicio armado",
            selector: (row) => row.fecha_inicio,
            sortable: true,
            width: "130px",
            cell: (row) => formatearFecha(row.fecha_inicio)
        },
        {
            name: "Cierre",
            selector: (row) => row.fecha_cierre,
            sortable: true,
            width: "120px",
            cell: (row) => formatearFecha(row.fecha_cierre)
        },
        {
            name: "Total cajas",
            selector: (row) => row.total_cajas || 0,
            sortable: true,
            width: "120px",
            cell: (row) => row.total_cajas ?? 0
        },
        {
            name: "Planilla",
            width: "120px",
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
        try {
            const nombreCentro = armado?.centro?.nombre || armado?.centro_nombre;
            if (!nombreCentro) throw new Error("Centro sin nombre");
            const detalles = await cargarDetallesCentro(nombreCentro);
            const equiposNorm = normalizarEquipos(detalles?.equipos || []);
            setEquipos(equiposNorm);
            await cargarParticipaciones(armado.id_armado, setParticipaciones);
            await cargarMateriales(armado.id_armado, async (lista) => {
                const merged = mergeMateriales(lista);
                const cajasMateriales = merged.map((m) => (m.caja || "Caja 1").trim());
                const cajasEquipos = equiposNorm.map((e) => (e.caja || "Caja 1").trim());
                const cajasDetectadas = Array.from(new Set([...cajasMateriales, ...cajasEquipos]));
                setMateriales(merged);
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
            const equiposNorm = normalizarEquipos(detalles?.equipos || []);
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
            prev.map((eq, i) => (i === index ? { ...eq, [field]: value } : eq))
        );
    };

    const handleGuardarEquipo = async (equipo) => {
        if (!armadoActivo?.centro?.id_centro && !armadoActivo?.centro_id) {
            alert("Centro no disponible.");
            return;
        }
        try {
            if (equipo.id_equipo) {
                await modificarEquipo(equipo.id_equipo, {
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
            await recargarPlanilla();
            await fetchArmados();
            setEditingId(null);
        } catch (err) {
            console.error("Error al guardar equipo:", err);
            alert("No se pudo guardar el equipo.");
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
            <div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
                <div>
                    <p className="text-muted mb-1">Armado técnico</p>
                    <h3 className="mb-0">Asignaciones de armado</h3>
                </div>
                <div className="d-flex gap-2">
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

            <div className="card mb-3">
                <div className="card-body d-flex flex-wrap align-items-end gap-3">
                    <div>
                        <small className="text-muted text-uppercase d-block mb-1">Estado</small>
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
                            <small className="text-muted text-uppercase d-block mb-1">Técnico</small>
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
            </div>

            <div className="card">
                <div className="card-body">
                    {error && <div className="alert alert-danger mb-3">{error}</div>}
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
                                                            {equiposOrdenados.map((eq) => {
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
                                                                                    <span
                                                                                        className="badge badge-light"
                                                                                        style={{
                                                                                            border: `1px solid ${colorTecnico(eq.caja_tecnico_nombre || eq.caja_tecnico_id)}`,
                                                                                            color: colorTecnico(eq.caja_tecnico_nombre || eq.caja_tecnico_id)
                                                                                        }}
                                                                                    >
                                                                                        {eq.caja || "Caja 1"}
                                                                                    </span>
                                                                                    {eq.caja_tecnico_nombre && (
                                                                                        <small
                                                                                            className="d-block"
                                                                                            style={{ color: colorTecnico(eq.caja_tecnico_nombre || eq.caja_tecnico_id) }}
                                                                                        >
                                                                                            por {eq.caja_tecnico_nombre}
                                                                                        </small>
                                                                                    )}
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
                                                                        <div className="d-flex">
                                                                            <input
                                                                                className="form-control"
                                                                                value={eq.numero_serie || ""}
                                                                                onChange={(e) =>
                                                                                    handleEquipoChange(eq.__idx, "numero_serie", e.target.value)
                                                                                }
                                                                            />
                                                                            {esMovil && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn btn-sm btn-outline-secondary ml-1"
                                                                                    title="Escanear código"
                                                                                    onClick={() => startLiveScan(eq.__idx)}
                                                                                >
                                                                                    <i className="fas fa-camera" />
                                                                                </button>
                                                                            )}
                                                                        </div>
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
                                                            const payload = materiales.map((m) => ({
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
                                                                        const cajasMateriales = merged.map((m) => (m.caja || "Caja 1").trim());
                                                                        const cajasEquipos = (equipos || []).map((e) => (e.caja || "Caja 1").trim());
                                                                        setCajas((prev = []) => {
                                                                            const union = Array.from(new Set([...prev, ...cajasMateriales, ...cajasEquipos]));
                                                                            return union.length ? union : ["Caja 1"];
                                                                        });
                                                                    });
                                                                    await cargarMovimientos(armadoActivo.id_armado, setMovimientos);
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
                                                                    <span
                                                                        className="badge badge-light d-inline-block"
                                                                        style={{
                                                                            border: `1px solid ${colorTecnico(mat.caja_tecnico_nombre || mat.caja_tecnico_id)}`,
                                                                            color: colorTecnico(mat.caja_tecnico_nombre || mat.caja_tecnico_id)
                                                                        }}
                                                                    >
                                                                        {mat.caja || "Caja 1"}
                                                                    </span>
                                                                    {mat.caja_tecnico_nombre && (
                                                                        <small
                                                                            className="d-block"
                                                                            style={{ color: colorTecnico(mat.caja_tecnico_nombre || mat.caja_tecnico_id) }}
                                                                        >
                                                                            por {mat.caja_tecnico_nombre}
                                                                        </small>
                                                                    )}
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
                                                                                    i === idx ? { ...m, caja: e.target.value } : m
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
                                                                                    i === idx ? { ...m, cantidad: e.target.value } : m
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
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Ítem</th>
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
                                            <td>{mov.caja}</td>
                                            <td>{mov.cantidad}</td>
                                            <td style={{ color: colorTecnico(mov.tecnico_nombre || mov.tecnico_id) }}>
                                                {mov.tecnico_nombre || `ID ${mov.tecnico_id || "-"}`}
                                            </td>
                                        </tr>
                                    ))}
                                    {movimientos.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center text-muted">
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
                            <div className="d-flex align-items-center">
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
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Ítem</th>
                                        <th>Caja</th>
                                        <th>Cant.</th>
                                        <th>Armado</th>
                                        <th>Técnico</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientosRecientes.slice(0, movsLimit).map((mov) => (
                                        <tr key={`g-${mov.id_movimiento}`}>
                                            <td>{formatearFecha(mov.fecha)}</td>
                                            <td className="text-capitalize">{mov.tipo}</td>
                                            <td>{mov.nombre_item}</td>
                                            <td>{mov.caja}</td>
                                            <td>{mov.cantidad}</td>
                                            <td>{mov.centro_nombre || `Armado #${mov.armado_id}`}</td>
                                            <td style={{ color: colorTecnico(mov.tecnico_nombre || mov.tecnico_id) }}>
                                                {mov.tecnico_nombre || `ID ${mov.tecnico_id || "-"}`}
                                            </td>
                                        </tr>
                                    ))}
                                    {movimientosRecientes.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted">
                                                Sin movimientos registrados todavía.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <small className="text-muted">
                                Página {movsPage} — {(movsTotal ? Math.ceil(movsTotal / movsLimit) : 1)} en total
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
                                    disabled={movsTotal && movsPage >= Math.ceil(movsTotal / movsLimit)}
                                    onClick={() => setMovsPage((p) => p + 1)}
                                >
                                    Siguiente
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

            {scanOpen && (
                <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: "#00000055" }}>
                    <div className="modal-dialog modal-sm" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h6 className="modal-title">Escanear N° Serie</h6>
                                <button type="button" className="close" onClick={stopLiveScan}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <video ref={videoRef} className="w-100 live-scan-video" autoPlay muted playsInline />
                                <p className="text-muted small mt-2 mb-0">{scanMsg}</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary btn-sm" onClick={stopLiveScan}>
                                    Cancelar
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



