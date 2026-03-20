import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { cargarCentrosClientes, cargarDetallesCentro } from "../controllers/centrosControllers";
import { guardarMantencionPreventivaBulk, obtenerMantencionPreventiva } from "../api";
import "./MantencionPreventiva.css";

const OPCIONES_ESTADO = ["", "OK", "Observado", "Critico", "N/A"];
const MESES = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
];

const CAMPOS_REVISION = [
    { key: "versionRadar", label: "Version radar", bloque: "General" },
    { key: "sensor", label: "Sensor", bloque: "General" },
    { key: "calibracion", label: "Calibracion", bloque: "General" },
    { key: "pc", label: "PC", bloque: "Armado" },
    { key: "router", label: "Router", bloque: "Armado" },
    { key: "switch", label: "Switch", bloque: "Armado" },
    { key: "switchCisco", label: "Switch (Cisco)", bloque: "Armado" },
    { key: "switchRaqueable", label: "Switch raqueable", bloque: "Armado" },
    { key: "switchPoe", label: "Switch POE", bloque: "Armado" },
    { key: "axisP8221", label: "Axis P8221", bloque: "Armado" },
    { key: "camaraInterior", label: "Camara Interior", bloque: "Armado" },
    { key: "panelVictron", label: "Panel Victron", bloque: "Armado" },
    { key: "radar1", label: "Radar 1", bloque: "Armado" },
    { key: "camaraPtzLaser", label: "Camara PTZ Laser", bloque: "Armado" },
    { key: "camaraPtzLaser2", label: "Camara PTZ Laser 2", bloque: "Armado" },
    { key: "camaraPtzTermal", label: "Camara PTZ termal", bloque: "Armado" },
    { key: "camaraModulo", label: "Camara Modulo", bloque: "Armado" },
    { key: "camaraSilo1", label: "Camara Silo 1", bloque: "Armado" },
    { key: "camaraSilo2", label: "Camara Silo 2", bloque: "Armado" },
    { key: "camaraEnsinerador", label: "Camara Ensinerador", bloque: "Armado" },
    { key: "ensilajeInterior", label: "Ensilaje interior", bloque: "Armado" },
    { key: "ensilajeExterior", label: "Ensilaje exterior", bloque: "Armado" },
    { key: "camaraPopa", label: "Camara Popa", bloque: "Armado" },
    { key: "camaraAcceso1", label: "Camara acceso 1", bloque: "Armado" },
    { key: "camaraAcceso2", label: "Camara acceso 2", bloque: "Armado" },
    { key: "camaraAcceso3", label: "Camara acceso 3", bloque: "Armado" },
    { key: "camaraAcceso4", label: "Camara acceso 4", bloque: "Armado" },
    { key: "enlaceUbiquiti", label: "Enlace Ubiquiti", bloque: "Armado" },
    { key: "captura", label: "Captura", bloque: "General" },
    { key: "vpn", label: "VPN", bloque: "General" },
    { key: "any", label: "Any", bloque: "General" },
    { key: "tw", label: "TW", bloque: "General" },
    { key: "ipsCentral", label: "IPs central", bloque: "General" },
    { key: "telefono", label: "Telefono", bloque: "General" },
    { key: "netio", label: "Netio", bloque: "Armado" },
    { key: "puerto8090", label: "Puerto 8090", bloque: "General" },
    { key: "preset", label: "Preset", bloque: "General" },
    { key: "timeOutRadar", label: "Time out radar", bloque: "General" },
    { key: "fechaReinicio", label: "Fecha reinicio", bloque: "Reinicios" },
    { key: "diasFaltantesReinicio", label: "Dias faltantes", bloque: "Reinicios" },
    { key: "estadoReinicio", label: "Estado reinicio", bloque: "Reinicios" }
];
const CAMPOS_REVISION_MENSUAL = CAMPOS_REVISION
    .filter((campo) => campo.bloque !== "Reinicios")
    .map((campo) => campo.key);

const buildDefaultRevision = () => {
    const status = {};
    const base = {};
    CAMPOS_REVISION.forEach((campo) => {
        status[campo.key] = "";
        base[campo.key] = "";
    });
    return {
        status,
        base,
        observacion: "",
        fecha: hoyLocalYYYYMMDD()
    };
};

const normalizarVersionRadar = (valor) => {
    const soloPermitidos = String(valor || "").replace(/[^0-9.]/g, "");
    let digitos = 0;
    let salida = "";
    for (const char of soloPermitidos) {
        if (char >= "0" && char <= "9") {
            if (digitos >= 5) continue;
            digitos += 1;
        }
        salida += char;
    }
    return salida.slice(0, 12);
};
const hoyLocalYYYYMMDD = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const normalizarNombre = (valor = "") =>
    String(valor)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

const esCentroRetirado = (centro) => {
    const estado = String(centro?.estado || centro?.status || "").toLowerCase().trim();
    if (estado.includes("retir")) return true;
    if (estado.includes("baja")) return true;
    if (centro?.retirado === true) return true;
    return false;
};

const esCentroEnCese = (centro) => {
    const estado = String(centro?.estado || centro?.status || "").toLowerCase().trim();
    if (estado.includes("cese")) return true;
    if (estado.includes("inactivo")) return true;
    if (centro?.activo === false) return true;
    if (centro?.en_cese === true) return true;
    if (centro?.fecha_cese) return true;
    return false;
};
const esCentroCentral = (centro) => {
    if (centro?.es_central === true) return true;
    const raw = String(centro?.es_central ?? "").toLowerCase().trim();
    if (raw === "true" || raw === "1" || raw === "si" || raw === "sí") return true;
    // Fallback defensivo por datos antiguos/no migrados: si el nombre contiene "central".
    const nombre = String(centro?.nombre || "").toLowerCase();
    return nombre.includes("central");
};

const MantencionPreventiva = () => {
    const navigate = useNavigate();
    const [centros, setCentros] = useState([]);
    const [loadingCentros, setLoadingCentros] = useState(true);
    const [cliente, setCliente] = useState("");
    const [centroId, setCentroId] = useState("");
    const [mes, setMes] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
    const [anio, setAnio] = useState(String(new Date().getFullYear()));
    const [registros, setRegistros] = useState({});
    const [mostrarTodosCese, setMostrarTodosCese] = useState(false);
    const [editarDatosBase, setEditarDatosBase] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [guardandoReinicioPorCentro, setGuardandoReinicioPorCentro] = useState({});
    const [bloquesVisibles, setBloquesVisibles] = useState({
        General: true,
        Armado: true,
        Observaciones: true,
        Reinicios: true
    });
    const [baseOrigenAuto, setBaseOrigenAuto] = useState({});
    const [rolUsuario, setRolUsuario] = useState("");
    const aniosFiltro = useMemo(() => {
        const actual = new Date().getFullYear();
        return Array.from({ length: 8 }, (_, idx) => String(actual - 5 + idx));
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            setRolUsuario(String(decoded?.rol || "").toLowerCase());
        } catch (error) {
            console.error("No se pudo leer rol de usuario:", error);
        }
    }, []);

    const puedeEditarDatosBase = rolUsuario === "admin";

    useEffect(() => {
        const fetchCentros = async () => {
            setLoadingCentros(true);
            const data = await cargarCentrosClientes();
            setCentros(Array.isArray(data) ? data : []);
            setLoadingCentros(false);
        };
        fetchCentros();
    }, []);

    useEffect(() => {
        setCentroId("");
    }, [cliente]);

    const periodoKey = `${anio}-${mes}`;

    const clientesDisponibles = useMemo(() => {
        const nombres = centros
            .map((item) => item.cliente)
            .filter((value) => !!value);
        return Array.from(new Set(nombres)).sort((a, b) => a.localeCompare(b));
    }, [centros]);

    const centrosCliente = useMemo(() => {
        if (!cliente) return [];
        return centros
            .filter((item) => item.cliente === cliente)
            .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    }, [centros, cliente]);

    const centrosVisibles = useMemo(() => {
        if (!centroId) return centrosCliente;
        return centrosCliente.filter((item) => String(item.id) === String(centroId));
    }, [centrosCliente, centroId]);
    const centrosNoRetirados = useMemo(
        () => centrosVisibles.filter((item) => !esCentroRetirado(item)),
        [centrosVisibles]
    );
    const centrosCentrales = useMemo(
        () => centrosNoRetirados.filter((item) => esCentroCentral(item)),
        [centrosNoRetirados]
    );
    const centrosOperativosNoCentral = useMemo(
        () => centrosNoRetirados.filter((item) => !esCentroCentral(item)),
        [centrosNoRetirados]
    );
    const centrosActivosVisibles = useMemo(
        () => centrosOperativosNoCentral.filter((item) => !esCentroEnCese(item)),
        [centrosOperativosNoCentral]
    );
    const centrosCeseVisibles = useMemo(
        () => centrosOperativosNoCentral.filter((item) => esCentroEnCese(item)),
        [centrosOperativosNoCentral]
    );
    const centrosCeseRecientes = useMemo(() => {
        const sorted = [...centrosCeseVisibles].sort((a, b) => {
            const aId = Number(a.id) || 0;
            const bId = Number(b.id) || 0;
            return bId - aId;
        });
        return mostrarTodosCese ? sorted : sorted.slice(0, 5);
    }, [centrosCeseVisibles, mostrarTodosCese]);
    const extraerIpEquipo = useCallback((equipos = [], candidatos = []) => {
        if (!Array.isArray(equipos) || !equipos.length) return "";
        const candidatosNorm = candidatos.map((c) => normalizarNombre(c));
        const match = equipos.find((eq) => {
            const n = normalizarNombre(eq?.nombre);
            return candidatosNorm.some((cand) => n === cand || n.startsWith(cand));
        });
        return match?.ip || "";
    }, []);

    const extraerConexion = useCallback((conexiones = [], nombre) => {
        const objetivo = normalizarNombre(nombre);
        const conn = (conexiones || []).find((c) => normalizarNombre(c?.nombre).includes(objetivo));
        return conn?.numero_conexion || "";
    }, []);
    const camposPorBloque = useMemo(() => {
        const map = new Map();
        CAMPOS_REVISION.forEach((campo) => {
            if (!map.has(campo.bloque)) map.set(campo.bloque, []);
            map.get(campo.bloque).push(campo);
        });
        return Array.from(map.entries()).map(([bloque, campos]) => ({ bloque, campos }));
    }, []);
    const camposVisibles = useMemo(
        () => CAMPOS_REVISION.filter((campo) => bloquesVisibles[campo.bloque]),
        [bloquesVisibles]
    );

    useEffect(() => {
        const fetchRevisiones = async () => {
            if (!cliente || !centrosVisibles.length) return;
            try {
                const data = await obtenerMantencionPreventiva({
                    anio,
                    mes,
                    centros: centrosVisibles.map((item) => item.id)
                });
                setRegistros((prev) => {
                    const next = { ...prev };
                    (data || []).forEach((row) => {
                        const key = `${periodoKey}:${row.centro_id}`;
                        const seed = buildDefaultRevision();
                        next[key] = {
                            status: { ...seed.status, ...(row.estados || {}) },
                            base: { ...seed.base, ...(row.datos_base || {}) },
                            observacion: row.observacion || "",
                            fecha: row.fecha_revision || hoyLocalYYYYMMDD()
                        };
                    });
                    return next;
                });
            } catch (error) {
                console.error("Error cargando mantencion preventiva:", error);
            }
        };
        fetchRevisiones();
    }, [cliente, anio, mes, centroId, periodoKey, centrosVisibles]);

    useEffect(() => {
        const hidratarDatosBaseDesdeIp = async () => {
            if (!cliente || !centrosVisibles.length) return;
            const detallesCentros = await Promise.all(
                centrosVisibles.map(async (centroItem) => {
                    try {
                        const detalles = await cargarDetallesCentro({
                            centro_id: centroItem.id,
                            nombre: centroItem.nombre
                        });
                        return { centroItem, detalles };
                    } catch (error) {
                        return { centroItem, detalles: null };
                    }
                })
            );

            setRegistros((prev) => {
                let huboCambios = false;
                const next = { ...prev };
                const origenUpdates = {};

                const setSiVacio = (base, key, value) => {
                    const actual = String(base?.[key] || "").trim();
                    const nuevo = String(value || "").trim();
                    if (!actual && nuevo) {
                        base[key] = nuevo;
                        huboCambios = true;
                        return true;
                    }
                    return false;
                };

                detallesCentros.forEach(({ centroItem, detalles }) => {
                    const key = `${periodoKey}:${centroItem.id}`;
                    const actual = next[key] || buildDefaultRevision();
                    const base = { ...(actual.base || {}) };
                    const origenCampo = {};
                    const equipos = Array.isArray(detalles?.equipos) ? detalles.equipos : [];
                    const conexiones = Array.isArray(detalles?.conexiones) ? detalles.conexiones : [];

                    const setAuto = (campo, valor) => {
                        const cambiado = setSiVacio(base, campo, valor);
                        if (cambiado) origenCampo[campo] = true;
                    };

                    setAuto("pc", extraerIpEquipo(equipos, ["pc", "ip pc"]));
                    setAuto("router", extraerIpEquipo(equipos, ["router", "puerta de enlace"]));
                    setAuto("switch", extraerIpEquipo(equipos, ["switch"]));
                    setAuto("switchCisco", extraerIpEquipo(equipos, ["switch (cisco)"]));
                    setAuto("switchRaqueable", extraerIpEquipo(equipos, ["switch raqueable"]));
                    setAuto("switchPoe", extraerIpEquipo(equipos, ["switch poe", "switch poe 1", "switch poe 2"]));
                    setAuto("axisP8221", extraerIpEquipo(equipos, ["axis p8221", "axis"]));
                    setAuto("camaraInterior", extraerIpEquipo(equipos, ["camara interior"]));
                    setAuto("panelVictron", extraerIpEquipo(equipos, ["panel victron", "panel vrm"]));
                    setAuto("radar1", extraerIpEquipo(equipos, ["radar 1", "panel radar"]));
                    setAuto("camaraPtzLaser", extraerIpEquipo(equipos, ["camara ptz laser", "camara laser radar"]));
                    setAuto("camaraPtzLaser2", extraerIpEquipo(equipos, ["camara ptz laser 2"]));
                    setAuto("camaraPtzTermal", extraerIpEquipo(equipos, ["camara ptz termal", "camara laser"]));
                    setAuto("camaraModulo", extraerIpEquipo(equipos, ["camara modulo"]));
                    setAuto("camaraSilo1", extraerIpEquipo(equipos, ["camara silo 1"]));
                    setAuto("camaraSilo2", extraerIpEquipo(equipos, ["camara silo 2"]));
                    setAuto("camaraEnsinerador", extraerIpEquipo(equipos, ["camara ensinerador"]));
                    setAuto("ensilajeInterior", extraerIpEquipo(equipos, ["ensilaje interior"]));
                    setAuto("ensilajeExterior", extraerIpEquipo(equipos, ["ensilaje exterior"]));
                    setAuto("camaraPopa", extraerIpEquipo(equipos, ["camara popa"]));
                    setAuto("camaraAcceso1", extraerIpEquipo(equipos, ["camara acceso 1"]));
                    setAuto("camaraAcceso2", extraerIpEquipo(equipos, ["camara acceso 2"]));
                    setAuto("camaraAcceso3", extraerIpEquipo(equipos, ["camara acceso 3"]));
                    setAuto("camaraAcceso4", extraerIpEquipo(equipos, ["camara acceso 4"]));
                    setAuto("enlaceUbiquiti", extraerIpEquipo(equipos, ["enlace ubiquiti", "ubiquiti"]));
                    setAuto("netio", extraerIpEquipo(equipos, ["netio"]));
                    setAuto("any", extraerConexion(conexiones, "any"));
                    setAuto("tw", extraerConexion(conexiones, "team"));
                    setAuto(
                        "telefono",
                        centroItem?.telefono || detalles?.telefono || detalles?.centro?.telefono || ""
                    );

                    next[key] = { ...actual, base };
                    origenUpdates[key] = origenCampo;
                });

                if (Object.keys(origenUpdates).length) {
                    setBaseOrigenAuto((prevOrigen) => {
                        const merged = { ...prevOrigen };
                        Object.entries(origenUpdates).forEach(([idKey, campos]) => {
                            merged[idKey] = { ...(merged[idKey] || {}), ...campos };
                        });
                        return merged;
                    });
                }
                return huboCambios ? next : prev;
            });
        };

        hidratarDatosBaseDesdeIp();
    }, [cliente, centrosVisibles, periodoKey, extraerConexion, extraerIpEquipo]);

    const getRevision = useCallback((idCentro) => {
        const key = `${periodoKey}:${idCentro}`;
        return registros[key] || buildDefaultRevision();
    }, [periodoKey, registros]);

    const updateRevision = (idCentro, updater) => {
        const key = `${periodoKey}:${idCentro}`;
        setRegistros((prev) => {
            const actual = prev[key] || buildDefaultRevision();
            return { ...prev, [key]: updater(actual) };
        });
    };

    const updateCheck = (idCentro, campoKey, valor) => {
        updateRevision(idCentro, (actual) => ({
            ...actual,
            status: { ...actual.status, [campoKey]: valor }
        }));
    };
    const updateBaseField = (idCentro, campoKey, valor) => {
        const key = `${periodoKey}:${idCentro}`;
        setBaseOrigenAuto((prev) => ({
            ...prev,
            [key]: { ...(prev[key] || {}), [campoKey]: false }
        }));
        updateRevision(idCentro, (actual) => ({
            ...actual,
            base: { ...actual.base, [campoKey]: valor }
        }));
    };

    const updateField = (idCentro, campo, valor) => {
        updateRevision(idCentro, (actual) => ({ ...actual, [campo]: valor }));
    };
    const guardarRevisionCentro = async (idCentro, revision) => {
        setGuardandoReinicioPorCentro((prev) => ({ ...prev, [idCentro]: true }));
        try {
            await guardarMantencionPreventivaBulk({
                anio: Number(anio),
                mes: Number(mes),
                revisiones: [
                    {
                        centro_id: idCentro,
                        datos_base: revision.base,
                        estados: revision.status,
                        observacion: revision.observacion || "",
                        fecha_revision: revision.fecha || ""
                    }
                ]
            });
        } catch (error) {
            const nombreCentro =
                centrosVisibles.find((c) => String(c.id) === String(idCentro))?.nombre || `ID ${idCentro}`;
            console.error("Error guardando reinicio automatico:", error);
            window.alert(`No se pudo guardar el reinicio de ${nombreCentro}.`);
        } finally {
            setGuardandoReinicioPorCentro((prev) => ({ ...prev, [idCentro]: false }));
        }
    };
    const calcularEstadoReinicio = (fechaStr) => {
        if (!fechaStr) return { diasFaltantes: "", estado: "" };
        const fecha = new Date(`${fechaStr}T00:00:00`);
        if (Number.isNaN(fecha.getTime())) return { diasFaltantes: "", estado: "" };
        const hoyLocal = new Date();
        const hoy = new Date(hoyLocal.getFullYear(), hoyLocal.getMonth(), hoyLocal.getDate());
        const ms = hoy.getTime() - fecha.getTime();
        const diasTranscurridos = Math.max(0, Math.floor(ms / 86400000));
        const diasFaltantes = Math.max(0, 7 - diasTranscurridos);
        return {
            diasFaltantes: String(diasFaltantes),
            estado: diasFaltantes === 0 ? "Reiniciar" : "Normal"
        };
    };
    const updateFechaReinicio = (idCentro, fechaStr) => {
        const calc = calcularEstadoReinicio(fechaStr);
        const key = `${periodoKey}:${idCentro}`;
        setRegistros((prev) => {
            const actual = prev[key] || buildDefaultRevision();
            const nextRevision = {
                ...actual,
                base: {
                    ...actual.base,
                    fechaReinicio: fechaStr,
                    diasFaltantesReinicio: calc.diasFaltantes,
                    estadoReinicio: calc.estado
                }
            };
            // Reinicios se guarda en backend de forma inmediata (flujo semanal).
            guardarRevisionCentro(idCentro, nextRevision);
            return { ...prev, [key]: nextRevision };
        });
    };

    const estadoGeneral = (revision) => {
        const estadosMensuales = CAMPOS_REVISION_MENSUAL.map(
            (key) => revision?.status?.[key] || ""
        );
        const revisados = estadosMensuales.filter(Boolean).length;
        if (revisados === 0) return "Pendiente";
        if (revisados < estadosMensuales.length) return "Pendiente";
        if (estadosMensuales.some((item) => item === "Critico")) return "Critico";
        if (estadosMensuales.some((item) => item === "Observado")) return "Observado";
        if (estadosMensuales.some((item) => item === "OK")) return "OK";
        return "Pendiente";
    };

    const resumen = useMemo(() => {
        return centrosActivosVisibles.reduce(
            (acc, centroItem) => {
                const estado = estadoGeneral(getRevision(centroItem.id));
                if (estado === "OK") acc.ok += 1;
                else if (estado === "Observado") acc.observado += 1;
                else if (estado === "Critico") acc.critico += 1;
                else acc.pendiente += 1;
                return acc;
            },
            { pendiente: 0, ok: 0, observado: 0, critico: 0 }
        );
    }, [centrosActivosVisibles, getRevision]);
    const nombreMesSeleccionado = useMemo(
        () => MESES.find((m) => m.value === mes)?.label || mes,
        [mes]
    );
    const periodoSeleccionadoNum = Number(`${anio}${mes}`);
    const hoy = new Date();
    const periodoActualNum = Number(
        `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}`
    );
    const esPeriodoPasado = Number.isFinite(periodoSeleccionadoNum) && periodoSeleccionadoNum < periodoActualNum;
    const faltantesMes = esPeriodoPasado ? resumen.pendiente : 0;
    const claseAlertaFaltantes = faltantesMes > 5 ? "alert-danger" : "alert-warning";
    const resumenReinicios = useMemo(() => {
        return centrosActivosVisibles.reduce(
            (acc, centroItem) => {
                const revision = getRevision(centroItem.id);
                const calc = calcularEstadoReinicio(revision.base?.fechaReinicio || "");
                const dias = Number(calc.diasFaltantes);
                if (calc.estado === "Reiniciar") acc.vencidos += 1;
                else if (Number.isFinite(dias) && dias > 0 && dias <= 2) acc.proximos += 1;
                return acc;
            },
            { vencidos: 0, proximos: 0 }
        );
    }, [centrosActivosVisibles, getRevision]);

    const guardarRevision = async () => {
        if (!cliente || !centrosVisibles.length) {
            window.alert("Selecciona cliente y al menos un centro.");
            return;
        }
        setGuardando(true);
        try {
            const revisiones = centrosVisibles.map((centroItem) => {
                const revision = getRevision(centroItem.id);
                return {
                    centro_id: centroItem.id,
                    datos_base: revision.base,
                    estados: revision.status,
                    observacion: revision.observacion || "",
                    fecha_revision: revision.fecha || ""
                };
            });
            const resp = await guardarMantencionPreventivaBulk({
                anio: Number(anio),
                mes: Number(mes),
                revisiones
            });
            window.alert(`Revisiones guardadas (${resp?.guardadas || revisiones.length}).`);
        } catch (error) {
            console.error("Error guardando mantencion preventiva:", error);
            window.alert("No se pudo guardar la mantencion preventiva.");
        } finally {
            setGuardando(false);
        }
    };

    const renderTablaCentros = (listaCentros, tipo, centrales = []) => (
        <div className={`card checklist-card mb-3 ${tipo === "cese" ? "cese-card" : "activos-card"}`}>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
                    <h6 className="mb-0">
                        {tipo === "activos" ? "Centros activos" : "Centros en cese"} ({listaCentros.length})
                    </h6>
                    {tipo === "activos" && centrales.length > 0 && (
                        <div className="small text-muted text-right mt-1 mt-md-0">
                            {centrales.map((c) => (
                                <div key={`central-${c.id}`}>
                                    <strong className="text-danger">
                                        <i className="fas fa-broadcast-tower mr-1"></i>
                                        Central:
                                    </strong>{" "}
                                    <span className="font-weight-bold text-dark">{c.nombre || "-"}</span>{" "}
                                    {c.correo_centro && (
                                        <span className="ml-2">
                                            <i className="fas fa-envelope text-primary mr-1"></i>
                                            {c.correo_centro}
                                        </span>
                                    )}
                                    {c.telefono && (
                                        <span className="ml-2 text-success font-weight-bold">
                                            <i className="fas fa-phone-alt mr-1"></i>
                                            {c.telefono}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="mb-3 d-flex flex-wrap gap-2">
                    {camposPorBloque.map((grupo) => {
                        const activo = !!bloquesVisibles[grupo.bloque];
                        const esReinicios = grupo.bloque === "Reinicios";
                        return (
                            <button
                                key={`${tipo}-${grupo.bloque}`}
                                type="button"
                                className={`btn btn-sm ${
                                    esReinicios
                                        ? activo
                                            ? "btn-danger"
                                            : "btn-outline-danger"
                                        : activo
                                            ? "btn-primary"
                                            : "btn-outline-secondary"
                                }`}
                                onClick={() =>
                                    setBloquesVisibles((prev) => ({
                                        ...prev,
                                        [grupo.bloque]: !prev[grupo.bloque]
                                    }))
                                }
                            >
                                {grupo.bloque}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        className={`btn btn-sm ${bloquesVisibles.Observaciones ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() =>
                            setBloquesVisibles((prev) => ({
                                ...prev,
                                Observaciones: !prev.Observaciones
                            }))
                        }
                    >
                        Observaciones
                    </button>
                </div>
                <div className="table-responsive">
                    {(() => {
                        const mostrarObservaciones = !!bloquesVisibles.Observaciones;
                        const totalColumnas = 2 + camposVisibles.length + (mostrarObservaciones ? 3 : 0);
                        return (
                    <table
                        className={`table table-sm table-bordered align-middle mb-0 mantencion-table ${
                            tipo === "cese" ? "mantencion-table-cese" : "mantencion-table-activos"
                        }`}
                    >
                        <thead className="thead-dark">
                            <tr>
                                <th rowSpan={2} style={{ width: 60 }}>N</th>
                                <th rowSpan={2} style={{ minWidth: 200 }}>Centro</th>
                                {camposPorBloque.filter((grupo) => bloquesVisibles[grupo.bloque]).map((grupo) => (
                                    <th
                                        key={grupo.bloque}
                                        colSpan={grupo.campos.length}
                                        className={`bloque-header ${grupo.bloque === "Reinicios" ? "bloque-reinicios" : ""}`}
                                    >
                                        {grupo.bloque}
                                    </th>
                                ))}
                                {mostrarObservaciones && (
                                    <th colSpan={3} className="bloque-header">Observaciones</th>
                                )}
                            </tr>
                            <tr>
                                {camposVisibles.map((campo) => (
                                    <th
                                        key={campo.key}
                                        style={{
                                            minWidth:
                                                campo.bloque === "Armado" || campo.key === "ipsCentral"
                                                    ? 150
                                                    : 128
                                        }}
                                    >
                                        {campo.label}
                                    </th>
                                ))}
                                {mostrarObservaciones && (
                                    <>
                                        <th style={{ minWidth: 260 }}>Observacion</th>
                                        <th style={{ minWidth: 130 }}>Fecha</th>
                                        <th style={{ minWidth: 120 }}>Estado</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {!cliente && (
                                <tr>
                                    <td colSpan={totalColumnas} className="text-center text-muted">
                                        Selecciona un cliente para comenzar la revision mensual
                                    </td>
                                </tr>
                            )}
                            {cliente && !listaCentros.length && (
                                <tr>
                                    <td colSpan={totalColumnas} className="text-center text-muted">
                                        Sin centros en esta categoria para el filtro seleccionado
                                    </td>
                                </tr>
                            )}
                            {listaCentros.map((centroItem, idx) => {
                                const revision = getRevision(centroItem.id);
                                const estado = estadoGeneral(revision);
                                const origenCentro = baseOrigenAuto[`${periodoKey}:${centroItem.id}`] || {};
                                const reinicioCalc = calcularEstadoReinicio(revision.base?.fechaReinicio || "");
                                return (
                                    <tr key={centroItem.id}>
                                        <td>{idx + 1}</td>
                                        <td className="font-weight-semibold">{centroItem.nombre}</td>
                                            {camposVisibles.map((campo) => (
                                                <td key={`${centroItem.id}-${campo.key}`}>
                                                    {campo.key === "fechaReinicio" ? (
                                                        <div className="d-flex align-items-center">
                                                            <input
                                                                type="date"
                                                                className="form-control form-control-sm"
                                                                value={revision.base[campo.key] || ""}
                                                                disabled={!!guardandoReinicioPorCentro[centroItem.id]}
                                                                onChange={(e) =>
                                                                    updateFechaReinicio(centroItem.id, e.target.value)
                                                                }
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger ml-2"
                                                                disabled={!!guardandoReinicioPorCentro[centroItem.id]}
                                                                onClick={() =>
                                                                    updateFechaReinicio(
                                                                        centroItem.id,
                                                                        hoyLocalYYYYMMDD()
                                                                    )
                                                                }
                                                            >
                                                                Hoy
                                                            </button>
                                                            {guardandoReinicioPorCentro[centroItem.id] && (
                                                                <i className="fas fa-spinner fa-spin ml-2 text-danger"></i>
                                                            )}
                                                        </div>
                                                    ) : campo.key === "diasFaltantesReinicio" ? (
                                                        <span
                                                            className={`badge badge-pill ${
                                                                String(
                                                                    (revision.base?.fechaReinicio
                                                                        ? reinicioCalc.diasFaltantes
                                                                        : revision.base[campo.key]) || ""
                                                                ) === "0"
                                                                    ? "badge-danger"
                                                                    : "badge-secondary"
                                                            }`}
                                                        >
                                                            {(revision.base?.fechaReinicio
                                                                ? reinicioCalc.diasFaltantes
                                                                : revision.base[campo.key]) || "-"}
                                                        </span>
                                                    ) : campo.key === "estadoReinicio" ? (
                                                        <span
                                                            className={`badge badge-pill ${
                                                                ((revision.base?.fechaReinicio
                                                                    ? reinicioCalc.estado
                                                                    : revision.base[campo.key]) || "") === "Reiniciar"
                                                                    ? "badge-danger"
                                                                    : "badge-success"
                                                            }`}
                                                        >
                                                            {(revision.base?.fechaReinicio
                                                                ? reinicioCalc.estado
                                                                : revision.base[campo.key]) || "-"}
                                                        </span>
                                                    ) : campo.key === "versionRadar" ? (
                                                        <div className="d-flex flex-column cell-stack">
                                                            <div className="base-input-row">
                                                                <input
                                                                    className="form-control form-control-sm base-input"
                                                                    placeholder="Ej: 3.25.1"
                                                                    value={revision.base[campo.key]}
                                                                    title={revision.base[campo.key] || ""}
                                                                    disabled={!editarDatosBase || !puedeEditarDatosBase}
                                                                    onChange={(e) =>
                                                                        updateBaseField(
                                                                            centroItem.id,
                                                                            campo.key,
                                                                            normalizarVersionRadar(e.target.value)
                                                                        )
                                                                    }
                                                                />
                                                                <span
                                                                    className={`base-origin-inline ${
                                                                        String(revision.base[campo.key] || "").trim()
                                                                            ? origenCentro[campo.key]
                                                                                ? "base-origin-auto"
                                                                                : "base-origin-manual"
                                                                            : "base-origin-empty"
                                                                    }`}
                                                                    title={
                                                                        String(revision.base[campo.key] || "").trim()
                                                                            ? origenCentro[campo.key]
                                                                                ? "Autocompletado"
                                                                                : "Manual"
                                                                            : ""
                                                                    }
                                                                >
                                                                    <i className={`fas ${origenCentro[campo.key] ? "fa-magic" : "fa-user-edit"}`}></i>
                                                                </span>
                                                            </div>
                                                            <select
                                                                className="form-control form-control-sm"
                                                                value={revision.status[campo.key]}
                                                                onChange={(e) =>
                                                                    updateCheck(centroItem.id, campo.key, e.target.value)
                                                                }
                                                            >
                                                                {OPCIONES_ESTADO.map((opcion) => (
                                                                    <option key={opcion || "vacio"} value={opcion}>
                                                                        {opcion || "-"}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : campo.key === "captura" ? (
                                                        <div className="d-flex justify-content-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={revision.status[campo.key] === "OK"}
                                                                onChange={(e) =>
                                                                    updateCheck(
                                                                        centroItem.id,
                                                                        campo.key,
                                                                        e.target.checked ? "OK" : ""
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex flex-column cell-stack">
                                                            <div className="base-input-row">
                                                                <input
                                                                    className="form-control form-control-sm base-input"
                                                                    placeholder="Dato base"
                                                                    value={revision.base[campo.key]}
                                                                    title={revision.base[campo.key] || ""}
                                                                    disabled={!editarDatosBase || !puedeEditarDatosBase}
                                                                    onChange={(e) =>
                                                                        updateBaseField(
                                                                            centroItem.id,
                                                                            campo.key,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                />
                                                                <span
                                                                    className={`base-origin-inline ${
                                                                        String(revision.base[campo.key] || "").trim()
                                                                            ? origenCentro[campo.key]
                                                                                ? "base-origin-auto"
                                                                                : "base-origin-manual"
                                                                            : "base-origin-empty"
                                                                    }`}
                                                                    title={
                                                                        String(revision.base[campo.key] || "").trim()
                                                                            ? origenCentro[campo.key]
                                                                                ? "Autocompletado"
                                                                                : "Manual"
                                                                            : ""
                                                                    }
                                                                >
                                                                    <i className={`fas ${origenCentro[campo.key] ? "fa-magic" : "fa-user-edit"}`}></i>
                                                                </span>
                                                            </div>
                                                            <select
                                                                className="form-control form-control-sm"
                                                                value={revision.status[campo.key]}
                                                                onChange={(e) =>
                                                                    updateCheck(centroItem.id, campo.key, e.target.value)
                                                                }
                                                            >
                                                                {OPCIONES_ESTADO.map((opcion) => (
                                                                    <option key={opcion || "vacio"} value={opcion}>
                                                                        {opcion || "-"}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </td>
                                            ))}
                                        {mostrarObservaciones && (
                                            <>
                                                <td>
                                                    <input
                                                        className="form-control form-control-sm"
                                                        placeholder="Observacion general del centro"
                                                        value={revision.observacion}
                                                        onChange={(e) =>
                                                            updateField(centroItem.id, "observacion", e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="date"
                                                        className="form-control form-control-sm"
                                                        value={revision.fecha}
                                                        onChange={(e) =>
                                                            updateField(centroItem.id, "fecha", e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <span className={`badge badge-pill estado-${estado.toLowerCase()}`}>
                                                        {estado}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                        );
                    })()}
                </div>
            </div>
        </div>
    );

    return (
        <div className="container-fluid mantencion-page">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="section-title d-flex align-items-center mb-0">
                    <i className="fas fa-clipboard-check text-primary mr-2"></i>
                    Mantencion preventiva mensual
                </h3>
                <button className="btn btn-outline-secondary" onClick={() => navigate("/soporte")}>
                    <i className="fas fa-arrow-left mr-1"></i>
                    Volver
                </button>
            </div>

            <div className="card mb-3 filter-card">
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-3 mb-3">
                            <label>Cliente</label>
                            <select
                                className="form-control"
                                value={cliente}
                                onChange={(e) => setCliente(e.target.value)}
                                disabled={loadingCentros}
                            >
                                <option value="">
                                    {loadingCentros ? "Cargando clientes..." : "Seleccionar cliente"}
                                </option>
                                {clientesDisponibles.map((nombreCliente) => (
                                    <option key={nombreCliente} value={nombreCliente}>
                                        {nombreCliente}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3 mb-3">
                            <label>Centro</label>
                            <select
                                className="form-control"
                                value={centroId}
                                onChange={(e) => setCentroId(e.target.value)}
                                disabled={!cliente || loadingCentros}
                            >
                                <option value="">
                                    {!cliente
                                        ? "Selecciona cliente primero"
                                        : "Todos los centros del cliente"}
                                </option>
                                {centrosCliente.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2 mb-3">
                            <label>Mes</label>
                            <select
                                className="form-control"
                                value={mes}
                                onChange={(e) => setMes(e.target.value)}
                            >
                                {MESES.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2 mb-3">
                            <label>Anio</label>
                            <select
                                className="form-control"
                                value={anio}
                                onChange={(e) => setAnio(e.target.value)}
                            >
                                {aniosFiltro.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2 mb-3 d-flex align-items-end">
                            <button className="btn btn-primary w-100" onClick={guardarRevision} disabled={guardando}>
                                <i className="fas fa-save mr-2"></i>
                                {guardando ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                    <div className="resumen-row">
                        <span className="badge badge-pill badge-secondary px-3 py-2">Pendiente: {resumen.pendiente}</span>
                        <span className="badge badge-pill badge-success px-3 py-2">OK: {resumen.ok}</span>
                        <span className="badge badge-pill badge-warning px-3 py-2">Observado: {resumen.observado}</span>
                        <span className="badge badge-pill badge-danger px-3 py-2">Critico: {resumen.critico}</span>
                        {puedeEditarDatosBase ? (
                            <button
                                type="button"
                                className={`btn btn-sm ${editarDatosBase ? "btn-warning" : "btn-outline-primary"}`}
                                onClick={() => setEditarDatosBase((prev) => !prev)}
                            >
                                {editarDatosBase ? "Bloquear datos base" : "Editar datos base"}
                            </button>
                        ) : (
                            <span className="badge badge-pill badge-light px-3 py-2">
                                Datos base: solo admin
                            </span>
                        )}
                    </div>
                    {esPeriodoPasado && faltantesMes > 0 && (
                        <div className={`alert ${claseAlertaFaltantes} mt-3 mb-0 py-2`}>
                            En {nombreMesSeleccionado.toLowerCase()} de {anio} faltaron revisar {faltantesMes} centro
                            {faltantesMes === 1 ? "" : "s"}.
                        </div>
                    )}
                    {esPeriodoPasado && faltantesMes === 0 && (
                        <div className="alert alert-success mt-3 mb-0 py-2">
                            Revision mensual completa en {nombreMesSeleccionado.toLowerCase()} de {anio}.
                        </div>
                    )}
                    {(resumenReinicios.vencidos > 0 || resumenReinicios.proximos > 0) && (
                        <div className="alert alert-danger mt-2 mb-0 py-2">
                            Te faltan {resumenReinicios.vencidos} centro{resumenReinicios.vencidos === 1 ? "" : "s"} por reiniciar (7 dias cumplidos)
                            {resumenReinicios.proximos > 0
                                ? `, y ${resumenReinicios.proximos} por vencer en 1-2 dias`
                                : ""}.
                        </div>
                    )}
                </div>
            </div>

            {renderTablaCentros(centrosActivosVisibles, "activos", centrosCentrales)}
            {renderTablaCentros(centrosCeseRecientes, "cese")}
            {centrosCeseVisibles.length > 5 && (
                <div className="d-flex justify-content-center mb-3">
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setMostrarTodosCese((prev) => !prev)}
                    >
                        {mostrarTodosCese
                            ? "Ver menos centros en cese"
                            : `Ver mas centros en cese (${centrosCeseVisibles.length - 5} restantes)`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MantencionPreventiva;
