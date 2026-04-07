import React, { useEffect, useMemo, useState } from "react";
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import {
    obtenerActasEntrega,
    crearActaEntrega,
    actualizarActaEntrega,
    eliminarActaEntrega,
    obtenerPermisosTrabajo,
    crearPermisoTrabajo,
    actualizarPermisoTrabajo,
    eliminarPermisoTrabajo
} from "../api";
import "./InformesCentros.css";

const SUBCATEGORIAS = [
    { value: "acta_entrega", label: "Actas de entrega" },
    { value: "intervencion", label: "Permisos de trabajo" },
    { value: "mantencion", label: "Mantenciones" },
    { value: "retiro", label: "Retiros" }
];


const toInputDate = (value) => {
    if (!value) return "";
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
};

const toDisplayDate = (value) => {
    const iso = toInputDate(value);
    if (!iso) return "-";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
};

const toDisplayHour = (value) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}hrs`;
};

const todayLocalInputDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const isSignatureImage = (value) => {
    return /^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(String(value || "").trim());
};

const esc = (v) =>
    String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const signatureHtml = (value, label = "Sin firma") => {
    if (!value) return `<div class="sig-empty">${esc(label)}</div>`;
    if (isSignatureImage(value)) {
        return `<img src="${value}" alt="Firma" class="sig-img" />`;
    }
    return `<div class="sig-text">${esc(value)}</div>`;
};

const parseGpsPoints = (value) => {
    const raw = String(value || "");
    if (!raw.trim()) return [{ lat: "", lng: "" }];
    const parts = raw
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);
    const points = parts
        .map((p) => {
            const [latRaw = "", lngRaw = ""] = p.split(",");
            return { lat: latRaw.trim(), lng: lngRaw.trim() };
        })
        .filter((p) => p.lat || p.lng);
    return points.length ? points : [{ lat: "", lng: "" }];
};

const normalizeMeasureInput = (value) => {
    let text = String(value ?? "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const firstDot = text.indexOf(".");
    if (firstDot !== -1) {
        text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, "");
    }
    return text;
};

const normalizeGpsPointInput = (value) => {
    let text = String(value ?? "").replace(/[^\d.\-]/g, "");
    const minusCount = (text.match(/-/g) || []).length;
    if (minusCount > 1) text = `-${text.replace(/-/g, "")}`;
    if (text.includes("-") && !text.startsWith("-")) text = `-${text.replace(/-/g, "")}`;
    const firstDot = text.indexOf(".");
    if (firstDot !== -1) {
        text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, "");
    }
    if (text && !text.startsWith("-")) text = `-${text}`;
    return text;
};

function InformesCentros() {
    const [centros, setCentros] = useState([]);
    const [loadingCentros, setLoadingCentros] = useState(true);
    const [loadingActas, setLoadingActas] = useState(false);
    const [savingActa, setSavingActa] = useState(false);
    const [subcategoria, setSubcategoria] = useState("acta_entrega");
    const [mostrarEditorActa, setMostrarEditorActa] = useState(false);
    const [mostrarEditorPermiso, setMostrarEditorPermiso] = useState(false);

    // filtros de listado actas
    const [filtroCentroId, setFiltroCentroId] = useState("");
    const [filtroCliente, setFiltroCliente] = useState("all");
    const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
    const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

    // formulario acta de entrega
    const [editandoId, setEditandoId] = useState(null);
    const [clienteIdForm, setClienteIdForm] = useState("");
    const [centroIdForm, setCentroIdForm] = useState("");
    const [fechaRegistro, setFechaRegistro] = useState("");
    const [region, setRegion] = useState("");
    const [localidad, setLocalidad] = useState("");
    const [tecnico1, setTecnico1] = useState("");
    const [firmaTecnico1, setFirmaTecnico1] = useState("");
    const [tecnico2, setTecnico2] = useState("");
    const [firmaTecnico2, setFirmaTecnico2] = useState("");
    const [recepcionaNombre, setRecepcionaNombre] = useState("");
    const [firmaRecepciona, setFirmaRecepciona] = useState("");
    const [equiposConsiderados, setEquiposConsiderados] = useState("");
    const [centroOrigenTraslado, setCentroOrigenTraslado] = useState("");

    const [actasEntrega, setActasEntrega] = useState([]);
    const [permisosTrabajo, setPermisosTrabajo] = useState([]);
    const [savingPermiso, setSavingPermiso] = useState(false);
    const [permisoEditandoId, setPermisoEditandoId] = useState(null);
    const [permisoClienteIdForm, setPermisoClienteIdForm] = useState("");
    const [permisoCentroIdForm, setPermisoCentroIdForm] = useState("");
    const [permisoFechaIngreso, setPermisoFechaIngreso] = useState("");
    const [permisoFechaSalida, setPermisoFechaSalida] = useState("");
    const [permisoCorreoCentro, setPermisoCorreoCentro] = useState("");
    const [permisoRegion, setPermisoRegion] = useState("");
    const [permisoLocalidad, setPermisoLocalidad] = useState("");
    const [permisoTecnico1, setPermisoTecnico1] = useState("");
    const [permisoTecnico2, setPermisoTecnico2] = useState("");
    const [permisoRecepcionaNombre, setPermisoRecepcionaNombre] = useState("");
    const [permisoPuntosGps, setPermisoPuntosGps] = useState([{ lat: "", lng: "" }]);
    const [permisoMedicionFaseNeutro, setPermisoMedicionFaseNeutro] = useState("");
    const [permisoMedicionNeutroTierra, setPermisoMedicionNeutroTierra] = useState("");
    const [permisoHertz, setPermisoHertz] = useState("");
    const [permisoDescripcionTrabajo, setPermisoDescripcionTrabajo] = useState("");

    const centrosOrdenados = useMemo(
        () => [...centros].sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""))),
        [centros]
    );

    const clientes = useMemo(() => {
        const set = new Set();
        centros.forEach((centro) => {
            if (centro?.cliente) set.add(centro.cliente);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [centros]);

    const centroSeleccionadoForm = useMemo(
        () => centros.find((c) => String(c.id || c.id_centro) === String(centroIdForm)),
        [centros, centroIdForm]
    );

    const getCentroClienteKey = (centro) => {
        if (!centro) return "";
        if (centro.cliente_id != null && centro.cliente_id !== "") return `id:${centro.cliente_id}`;
        if (centro.id_cliente != null && centro.id_cliente !== "") return `id:${centro.id_cliente}`;
        return `name:${String(centro.cliente || "").trim()}`;
    };

    const clientesForm = useMemo(() => {
        const map = new Map();
        centros.forEach((centro) => {
            const key = getCentroClienteKey(centro);
            if (!key) return;
            if (!map.has(key)) {
                map.set(key, { key, label: String(centro.cliente || "Cliente") });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [centros]);

    const centrosFormFiltrados = useMemo(() => {
        if (!clienteIdForm) return centrosOrdenados;
        return centrosOrdenados.filter((centro) => getCentroClienteKey(centro) === clienteIdForm);
    }, [centrosOrdenados, clienteIdForm]);

    const actasFiltradas = useMemo(() => {
        return actasEntrega.filter((acta) => {
            if (filtroCliente !== "all" && (acta.cliente || acta.empresa) !== filtroCliente) return false;
            return true;
        });
    }, [actasEntrega, filtroCliente]);

    const permisosFiltrados = useMemo(() => {
        return permisosTrabajo.filter((permiso) => {
            if (filtroCliente !== "all" && (permiso.cliente || permiso.empresa) !== filtroCliente) return false;
            return true;
        });
    }, [permisosTrabajo, filtroCliente]);

    const permisoCentroSeleccionadoForm = useMemo(
        () => centros.find((c) => String(c.id || c.id_centro) === String(permisoCentroIdForm)),
        [centros, permisoCentroIdForm]
    );

    const permisosCentrosFormFiltrados = useMemo(() => {
        if (!permisoClienteIdForm) return centrosOrdenados;
        return centrosOrdenados.filter((centro) => getCentroClienteKey(centro) === permisoClienteIdForm);
    }, [centrosOrdenados, permisoClienteIdForm]);

    const resetFormulario = () => {
        setEditandoId(null);
        setClienteIdForm("");
        setCentroIdForm("");
        setFechaRegistro("");
        setRegion("");
        setLocalidad("");
        setTecnico1("");
        setFirmaTecnico1("");
        setTecnico2("");
        setFirmaTecnico2("");
        setRecepcionaNombre("");
        setFirmaRecepciona("");
        setEquiposConsiderados("");
        setCentroOrigenTraslado("");
        setMostrarEditorActa(false);
    };

    const abrirNuevaActa = () => {
        setEditandoId(null);
        const clienteInicial = filtroCliente !== "all" ? clientesForm.find((c) => c.label === filtroCliente)?.key || "" : "";
        setClienteIdForm(clienteInicial);
        setCentroIdForm(filtroCentroId || "");
        setFechaRegistro(todayLocalInputDate());
        setRegion("");
        setLocalidad("");
        setTecnico1("");
        setFirmaTecnico1("");
        setTecnico2("");
        setFirmaTecnico2("");
        setRecepcionaNombre("");
        setFirmaRecepciona("");
        setEquiposConsiderados("");
        setCentroOrigenTraslado("");
        setMostrarEditorActa(true);
    };

    const resetFormularioPermiso = () => {
        setPermisoEditandoId(null);
        setPermisoClienteIdForm("");
        setPermisoCentroIdForm("");
        setPermisoFechaIngreso("");
        setPermisoFechaSalida("");
        setPermisoCorreoCentro("");
        setPermisoRegion("");
        setPermisoLocalidad("");
        setPermisoTecnico1("");
        setPermisoTecnico2("");
        setPermisoRecepcionaNombre("");
        setPermisoPuntosGps([{ lat: "", lng: "" }]);
        setPermisoMedicionFaseNeutro("");
        setPermisoMedicionNeutroTierra("");
        setPermisoHertz("");
        setPermisoDescripcionTrabajo("");
        setMostrarEditorPermiso(false);
    };

    const abrirNuevoPermiso = () => {
        setPermisoEditandoId(null);
        const clienteInicial = filtroCliente !== "all" ? clientesForm.find((c) => c.label === filtroCliente)?.key || "" : "";
        setPermisoClienteIdForm(clienteInicial);
        setPermisoCentroIdForm(filtroCentroId || "");
        setPermisoFechaIngreso(todayLocalInputDate());
        setPermisoFechaSalida("");
        setPermisoCorreoCentro("");
        setPermisoRegion("");
        setPermisoLocalidad("");
        setPermisoTecnico1("");
        setPermisoTecnico2("");
        setPermisoRecepcionaNombre("");
        setPermisoPuntosGps([{ lat: "", lng: "" }]);
        setPermisoMedicionFaseNeutro("");
        setPermisoMedicionNeutroTierra("");
        setPermisoHertz("");
        setPermisoDescripcionTrabajo("");
        setMostrarEditorPermiso(true);
    };

    useEffect(() => {
        if (!centroIdForm) {
            setRegion("");
            setLocalidad("");
            return;
        }
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(centroIdForm));
        if (!centro) return;
        const regionCentro = centro.area || centro.region || "";
        const localidadCentro = centro.ubicacion || centro.localidad || centro.direccion || "";
        setRegion(regionCentro);
        setLocalidad(localidadCentro);
        const clienteKey = getCentroClienteKey(centro);
        if (clienteKey) setClienteIdForm(clienteKey);
    }, [centroIdForm, centros]);

    useEffect(() => {
        if (!clienteIdForm || !centroIdForm) return;
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(centroIdForm));
        if (!centro) {
            setCentroIdForm("");
            return;
        }
        if (getCentroClienteKey(centro) !== clienteIdForm) {
            setCentroIdForm("");
        }
    }, [clienteIdForm, centroIdForm, centros]);

    useEffect(() => {
        if (!permisoCentroIdForm) {
            setPermisoRegion("");
            setPermisoLocalidad("");
            return;
        }
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(permisoCentroIdForm));
        if (!centro) return;
        setPermisoRegion(centro.area || centro.region || "");
        setPermisoLocalidad(centro.ubicacion || centro.localidad || centro.direccion || "");
        const clienteKey = getCentroClienteKey(centro);
        if (clienteKey) setPermisoClienteIdForm(clienteKey);
    }, [permisoCentroIdForm, centros]);

    useEffect(() => {
        if (!permisoClienteIdForm || !permisoCentroIdForm) return;
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(permisoCentroIdForm));
        if (!centro) {
            setPermisoCentroIdForm("");
            return;
        }
        if (getCentroClienteKey(centro) !== permisoClienteIdForm) {
            setPermisoCentroIdForm("");
        }
    }, [permisoClienteIdForm, permisoCentroIdForm, centros]);

    const cargarActas = async () => {
        if (subcategoria !== "acta_entrega") return;
        setLoadingActas(true);
        try {
            const data = await obtenerActasEntrega({
                centro_id: filtroCentroId || undefined,
                fecha_desde: filtroFechaDesde || undefined,
                fecha_hasta: filtroFechaHasta || undefined
            });
            setActasEntrega(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al cargar actas de entrega:", error);
            setActasEntrega([]);
        } finally {
            setLoadingActas(false);
        }
    };

    const cargarPermisos = async () => {
        if (subcategoria !== "intervencion") return;
        setLoadingActas(true);
        try {
            const data = await obtenerPermisosTrabajo({
                centro_id: filtroCentroId || undefined,
                fecha_desde: filtroFechaDesde || undefined,
                fecha_hasta: filtroFechaHasta || undefined
            });
            setPermisosTrabajo(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al cargar permisos de trabajo:", error);
            setPermisosTrabajo([]);
        } finally {
            setLoadingActas(false);
        }
    };

    useEffect(() => {
        const fetchCentros = async () => {
            setLoadingCentros(true);
            try {
                const data = await cargarCentrosClientes();
                setCentros(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error al cargar centros para informes:", error);
                setCentros([]);
            } finally {
                setLoadingCentros(false);
            }
        };
        fetchCentros();
    }, []);

    useEffect(() => {
        if (subcategoria === "acta_entrega") {
            cargarActas();
        } else if (subcategoria === "intervencion") {
            cargarPermisos();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subcategoria, filtroCentroId, filtroFechaDesde, filtroFechaHasta]);

    const handleGuardarActa = async () => {
        if (!centroIdForm || !fechaRegistro) {
            alert("Centro y fecha de registro son obligatorios.");
            return;
        }
        const payload = {
            centro_id: Number(centroIdForm),
            fecha_registro: fechaRegistro,
            region,
            localidad,
            tecnico_1: tecnico1,
            firma_tecnico_1: firmaTecnico1,
            tecnico_2: tecnico2,
            firma_tecnico_2: firmaTecnico2,
            recepciona_nombre: recepcionaNombre,
            firma_recepciona: firmaRecepciona,
            equipos_considerados: equiposConsiderados,
            centro_origen_traslado: centroOrigenTraslado
        };

        setSavingActa(true);
        try {
            if (editandoId) {
                await actualizarActaEntrega(editandoId, payload);
            } else {
                await crearActaEntrega(payload);
            }
            await cargarActas();
            resetFormulario();
        } catch (error) {
            console.error("Error al guardar acta:", error);
            alert("No se pudo guardar el acta de entrega.");
        } finally {
            setSavingActa(false);
        }
    };

    const handleEditarActa = (acta) => {
        setEditandoId(acta.id_acta_entrega);
        setCentroIdForm(String(acta.centro_id || ""));
        setFechaRegistro(toInputDate(acta.fecha_registro));
        setRegion(acta.region || "");
        setLocalidad(acta.localidad || "");
        setTecnico1(acta.tecnico_1 || "");
        setFirmaTecnico1(acta.firma_tecnico_1 || "");
        setTecnico2(acta.tecnico_2 || "");
        setFirmaTecnico2(acta.firma_tecnico_2 || "");
        setRecepcionaNombre(acta.recepciona_nombre || "");
        setFirmaRecepciona(acta.firma_recepciona || "");
        setEquiposConsiderados(acta.equipos_considerados || "");
        setCentroOrigenTraslado(acta.centro_origen_traslado || "");
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(acta.centro_id || ""));
        if (centro) {
            setClienteIdForm(getCentroClienteKey(centro));
        }
        setMostrarEditorActa(true);
    };

    const handleEliminarActa = async (id) => {
        if (!window.confirm("Quieres eliminar esta acta de entrega?")) return;
        try {
            await eliminarActaEntrega(id);
            await cargarActas();
            if (editandoId === id) resetFormulario();
        } catch (error) {
            console.error("Error al eliminar acta:", error);
            alert("No se pudo eliminar el acta.");
        }
    };

    const handleAbrirPermisoDesdeActa = async (acta) => {
        const centroId = Number(acta?.centro_id || 0);
        if (!centroId) {
            alert("Acta sin centro asociado.");
            return;
        }
        try {
            let permiso = permisosTrabajo.find((p) => Number(p.centro_id || 0) === centroId);
            if (!permiso) {
                const data = await obtenerPermisosTrabajo({ centro_id: centroId });
                const lista = Array.isArray(data) ? data : [];
                if (lista.length) {
                    permiso = lista[0];
                    setPermisosTrabajo((prev) => {
                        const ids = new Set(prev.map((x) => Number(x.id_permiso_trabajo || 0)));
                        const extra = lista.filter((x) => !ids.has(Number(x.id_permiso_trabajo || 0)));
                        return extra.length ? [...prev, ...extra] : prev;
                    });
                }
            }

            if (permiso) {
                handleEditarPermiso(permiso);
                return;
            }

            const centro = centros.find((c) => Number(c.id || c.id_centro || 0) === centroId);
            setPermisoEditandoId(null);
            setPermisoCentroIdForm(String(centroId));
            setPermisoFechaIngreso(todayLocalInputDate());
            setPermisoFechaSalida("");
            setPermisoCorreoCentro("");
            setPermisoRegion(centro?.area || centro?.region || acta.region || "");
            setPermisoLocalidad(centro?.ubicacion || centro?.localidad || centro?.direccion || acta.localidad || "");
            setPermisoTecnico1(acta.tecnico_1 || "");
            setPermisoTecnico2(acta.tecnico_2 || "");
            setPermisoRecepcionaNombre(acta.recepciona_nombre || "");
            setPermisoPuntosGps([{ lat: "", lng: "" }]);
            setPermisoMedicionFaseNeutro("");
            setPermisoMedicionNeutroTierra("");
            setPermisoHertz("");
            setPermisoDescripcionTrabajo("");
            if (centro) setPermisoClienteIdForm(getCentroClienteKey(centro));
            setMostrarEditorPermiso(true);
        } catch (error) {
            console.error("Error al abrir permiso desde acta:", error);
            alert("No se pudo abrir el permiso de trabajo.");
        }
    };

    const handleGuardarPermiso = async () => {
        if (!permisoCentroIdForm || !permisoFechaIngreso) {
            alert("Centro y fecha de ingreso son obligatorios.");
            return;
        }
        const gpsRows = permisoPuntosGps.map((p) => ({
            lat: String(p?.lat || "").trim(),
            lng: String(p?.lng || "").trim()
        }));
        const hasPartialGps = gpsRows.some((p) => (p.lat && !p.lng) || (!p.lat && p.lng));
        if (hasPartialGps) {
            alert("Completa latitud y longitud en cada punto GPS.");
            return;
        }
        const gpsSerialized = gpsRows
            .filter((p) => p.lat && p.lng)
            .map((p) => `${p.lat},${p.lng}`)
            .join(" | ");

        const payload = {
            centro_id: Number(permisoCentroIdForm),
            fecha_ingreso: permisoFechaIngreso,
            fecha_salida: permisoFechaSalida || null,
            correo_centro: permisoCorreoCentro || null,
            region: permisoRegion || null,
            localidad: permisoLocalidad || null,
            tecnico_1: permisoTecnico1 || null,
            tecnico_2: permisoTecnico2 || null,
            recepciona_nombre: permisoRecepcionaNombre || null,
            puntos_gps: gpsSerialized || null,
            medicion_fase_neutro: normalizeMeasureInput(permisoMedicionFaseNeutro) || null,
            medicion_neutro_tierra: normalizeMeasureInput(permisoMedicionNeutroTierra) || null,
            hertz: normalizeMeasureInput(permisoHertz) || null,
            descripcion_trabajo: permisoDescripcionTrabajo || null
        };

        setSavingPermiso(true);
        try {
            if (permisoEditandoId) {
                await actualizarPermisoTrabajo(permisoEditandoId, payload);
            } else {
                await crearPermisoTrabajo(payload);
            }
            await cargarPermisos();
            resetFormularioPermiso();
        } catch (error) {
            console.error("Error al guardar permiso de trabajo:", error);
            alert("No se pudo guardar el permiso de trabajo.");
        } finally {
            setSavingPermiso(false);
        }
    };

    const handleEditarPermiso = (permiso) => {
        setPermisoEditandoId(permiso.id_permiso_trabajo);
        setPermisoCentroIdForm(String(permiso.centro_id || ""));
        setPermisoFechaIngreso(toInputDate(permiso.fecha_ingreso));
        setPermisoFechaSalida(toInputDate(permiso.fecha_salida));
        setPermisoCorreoCentro(permiso.correo_centro || "");
        setPermisoRegion(permiso.region || "");
        setPermisoLocalidad(permiso.localidad || "");
        setPermisoTecnico1(permiso.tecnico_1 || "");
        setPermisoTecnico2(permiso.tecnico_2 || "");
        setPermisoRecepcionaNombre(permiso.recepciona_nombre || "");
        setPermisoPuntosGps(parseGpsPoints(permiso.puntos_gps));
        setPermisoMedicionFaseNeutro(normalizeMeasureInput(permiso.medicion_fase_neutro || ""));
        setPermisoMedicionNeutroTierra(normalizeMeasureInput(permiso.medicion_neutro_tierra || ""));
        setPermisoHertz(normalizeMeasureInput(permiso.hertz || ""));
        setPermisoDescripcionTrabajo(permiso.descripcion_trabajo || "");
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(permiso.centro_id || ""));
        if (centro) setPermisoClienteIdForm(getCentroClienteKey(centro));
        setMostrarEditorPermiso(true);
    };

    const handleEliminarPermiso = async (id) => {
        if (!window.confirm("Quieres eliminar este permiso de trabajo?")) return;
        try {
            await eliminarPermisoTrabajo(id);
            await cargarPermisos();
            if (permisoEditandoId === id) resetFormularioPermiso();
        } catch (error) {
            console.error("Error al eliminar permiso de trabajo:", error);
            alert("No se pudo eliminar el permiso de trabajo.");
        }
    };

    const openPreviewPdf = (title, bodyHtml) => {
        const w = window.open("", "_blank", "width=980,height=760");
        if (!w) {
            alert("No se pudo abrir la vista previa. Habilita ventanas emergentes.");
            return;
        }
        const doc = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color:#0f172a; margin:0; background:#f8fafc; }
    .wrap { max-width: 980px; margin: 20px auto; background:#fff; border:1px solid #dbe7ff; border-radius:10px; overflow:hidden; }
    .head { padding:14px 18px; background:linear-gradient(135deg,#1d4ed8,#2563eb); color:#fff; display:flex; justify-content:space-between; align-items:center; }
    .head h1 { margin:0; font-size:20px; }
    .toolbar { display:flex; gap:8px; }
    .btn { border:0; border-radius:8px; padding:8px 12px; font-weight:700; cursor:pointer; }
    .btn-print { background:#16a34a; color:#fff; }
    .btn-close { background:#e2e8f0; color:#0f172a; }
    .content { padding:16px 18px; }
    .grid { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:12px; break-inside: avoid; page-break-inside: avoid; }
    .field { border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; background:#fff; break-inside: avoid; page-break-inside: avoid; }
    .field b { display:block; font-size:11px; text-transform:uppercase; color:#64748b; margin-bottom:4px; letter-spacing:.04em; }
    .wide { grid-column:1 / -1; }
    .sig-box { border:1px solid #e2e8f0; border-radius:8px; padding:8px; background:#fff; min-height:84px; display:flex; align-items:center; justify-content:center; }
    .sig-img { max-width:100%; max-height:76px; object-fit:contain; }
    .sig-empty, .sig-text { color:#64748b; font-weight:600; font-size:12px; text-align:center; }
    .doc-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:12px; }
    .doc-meta h2 { margin:0 0 6px; color:#1d4ed8; font-size:20px; }
    .doc-meta .meta-line { color:#334155; font-weight:700; margin-bottom:4px; font-size:13px; }
    .orca-logo { border:1px solid #dbe7ff; border-radius:8px; padding:6px; background:#fff; min-width:112px; }
    .orca-row { display:grid; grid-template-columns:repeat(4, 1fr); gap:0; margin-bottom:4px; }
    .orca-cell { width:23px; height:23px; background:#245b98; color:#fff; border-radius:0; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .orca-sub { text-align:center; color:#245b98; font-size:11px; font-weight:900; letter-spacing:0.14em; text-transform:uppercase; padding-left:1px; }
    .sec-title { margin: 8px 0 5px; color:#1d4ed8; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.02em; break-after: avoid; page-break-after: avoid; }
    @media print { 
      @page { margin: 12mm; }
      body{background:#fff;} 
      .toolbar{display:none;} 
      .wrap{margin:0; border:0; border-radius:0;} 
      .head h1{font-size:15px;}
      .sec-title{font-size:10px; margin:6px 0 4px;}
      .field b{font-size:10px;}
      .orca-cell{background:#245b98 !important; color:#fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
      .orca-sub{color:#245b98 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1>${esc(title)}</h1>
      <div class="toolbar">
        <button class="btn btn-print" onclick="window.print()">Descargar PDF</button>
        <button class="btn btn-close" onclick="window.close()">Cerrar</button>
      </div>
    </div>
    <div class="content">${bodyHtml}</div>
  </div>
</body>
</html>`;
        w.document.open();
        w.document.write(doc);
        w.document.close();
    };

    const verActaPdf = (acta) => {
        const body = `
        <div class="doc-top">
          <div class="orca-logo">
            <div class="orca-row">
              <div class="orca-cell">O</div>
              <div class="orca-cell">R</div>
              <div class="orca-cell">C</div>
              <div class="orca-cell">A</div>
            </div>
            <div class="orca-sub">Tecnologias</div>
          </div>
          <div class="doc-meta">
            <div class="meta-line">N°: ${esc(acta.id_acta_entrega || "-")}</div>
            <div class="meta-line">Fecha y hora: ${esc(toDisplayDate(acta.fecha_registro))}, ${esc(toDisplayHour(acta.created_at))}</div>
            <div class="meta-line">Tecnico 1: ${esc(acta.tecnico_1 || "-")}</div>
            ${acta.tecnico_2 ? `<div class="meta-line">Tecnico 2: ${esc(acta.tecnico_2)}</div>` : ""}
            ${acta.recepciona_nombre ? `<div class="meta-line">Recepciona: ${esc(acta.recepciona_nombre)}</div>` : ""}
          </div>
        </div>

        <div class="sec-title">Datos del centro</div>
        <div class="grid">
          <div class="field"><b>Empresa</b>${esc(acta.empresa || acta.cliente || "-")}</div>
          <div class="field"><b>Centro</b>${esc(acta.centro || "-")}</div>
          <div class="field"><b>Codigo ponton</b>${esc(acta.codigo_ponton || "-")}</div>
          <div class="field"><b>Region</b>${esc(acta.region || "-")}</div>
          <div class="field"><b>Localidad</b>${esc(acta.localidad || "-")}</div>
          <div class="field"><b>Centro origen (traslado)</b>${esc(acta.centro_origen_traslado || "-")}</div>
        </div>

        <div class="sec-title">Detalle del acta</div>
        <div class="grid">
          <div class="field wide"><b>Los equipos considerados en este sistema, corresponden a</b>${esc(acta.equipos_considerados || "-")}</div>
        </div>

        <div class="sec-title">Firmas</div>
        <div class="grid">
          <div class="field">
            <b>Firma tecnico 1</b>
            <div class="sig-box">${signatureHtml(acta.firma_tecnico_1)}</div>
            <div style="margin-top:6px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${esc(acta.tecnico_1 || "Sin nombre")}</div>
          </div>
          <div class="field">
            <b>Firma tecnico 2</b>
            <div class="sig-box">${signatureHtml(acta.firma_tecnico_2)}</div>
            <div style="margin-top:6px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${esc(acta.tecnico_2 || "Sin nombre")}</div>
          </div>
          <div class="field wide">
            <b>Firma recepciona</b>
            <div class="sig-box">${signatureHtml(acta.firma_recepciona)}</div>
            <div style="margin-top:6px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${esc(acta.recepciona_nombre || "Sin nombre")}</div>
          </div>
        </div>`;
        openPreviewPdf("Acta de Entrega y Recepción", body);
    };

    const verPermisoPdf = (permiso) => {
        const gpsItems = String(permiso.puntos_gps || "")
            .split("|")
            .map((p) => p.trim())
            .filter(Boolean);
        const gpsHtml = gpsItems.length
            ? gpsItems
                  .map(
                      (p, idx) =>
                          `<div style="padding:6px 8px;border:1px solid #dbeafe;border-radius:8px;background:#f8fbff;margin-bottom:6px;"><b>Punto ${
                              idx + 1
                          }</b>: ${esc(p)}</div>`
                  )
                  .join("")
            : "-";

        let sellosItems = [];
        try {
            const parsed = JSON.parse(String(permiso.sellos || "[]"));
            if (Array.isArray(parsed)) sellosItems = parsed.filter((s) => s && (s.ubicacion || s.numero));
        } catch (_) {
            sellosItems = [];
        }
        const sellosHtml = sellosItems.length
            ? sellosItems
                  .map(
                      (s, idx) =>
                          `<div style="padding:6px 8px;border:1px solid #dbeafe;border-radius:8px;background:#f8fbff;margin-bottom:6px;"><b>Sello ${
                              idx + 1
                          }</b> - Ubicacion: ${esc(s.ubicacion || "-")} | Numero: ${esc(s.numero || "-")}</div>`
                  )
                  .join("")
            : "-";

        const baseTierraText =
            permiso.base_tierra === true ? "Si" : permiso.base_tierra === false ? "No" : esc(permiso.base_tierra || "-");

        const body = `
        <div class="doc-top">
          <div class="orca-logo">
            <div class="orca-row">
              <div class="orca-cell">O</div>
              <div class="orca-cell">R</div>
              <div class="orca-cell">C</div>
              <div class="orca-cell">A</div>
            </div>
            <div class="orca-sub">Tecnologias</div>
          </div>
          <div class="doc-meta">
            <div class="meta-line">N°: ${esc(permiso.id_permiso_trabajo || "-")}</div>
            <div class="meta-line">Fecha y hora: ${esc(toDisplayDate(permiso.fecha_ingreso))}, ${esc(toDisplayHour(permiso.created_at))}</div>
            <div class="meta-line">Tecnico 1: ${esc(permiso.tecnico_1 || "-")}</div>
            ${permiso.tecnico_2 ? `<div class="meta-line">Tecnico 2: ${esc(permiso.tecnico_2)}</div>` : ""}
          </div>
        </div>

        <div class="sec-title">Datos del centro</div>
        <div class="grid">
          <div class="field"><b>Empresa</b>${esc(permiso.empresa || permiso.cliente || "-")}</div>
          <div class="field"><b>Centro</b>${esc(permiso.centro || "-")}</div>
          <div class="field"><b>Codigo ponton</b>${esc(permiso.codigo_ponton || "-")}</div>
          <div class="field"><b>Region</b>${esc(permiso.region || "-")}</div>
          <div class="field"><b>Localidad</b>${esc(permiso.localidad || "-")}</div>
        </div>

        <div class="sec-title">Contacto del centro</div>
        <div class="grid">
          <div class="field"><b>Correo centro</b>${esc(permiso.correo_centro || "-")}</div>
          <div class="field"><b>Telefono centro</b>${esc(permiso.telefono_centro || "-")}</div>
        </div>

        <div class="sec-title">Datos operativos</div>
        <div class="grid">
          <div class="field"><b>Base tierra</b>${baseTierraText}</div>
          <div class="field"><b>Cantidad de radares</b>${esc(permiso.cantidad_radares ?? "-")}</div>
        </div>

        <div class="sec-title">Fechas de intervencion</div>
        <div class="grid">
          <div class="field"><b>Fecha ingreso</b>${esc(toDisplayDate(permiso.fecha_ingreso))}</div>
          <div class="field"><b>Fecha salida</b>${esc(toDisplayDate(permiso.fecha_salida))}</div>
        </div>

        <div class="sec-title">Puntos GPS</div>
        <div class="grid">
          <div class="field wide"><b>Detalle</b>${gpsHtml}</div>
        </div>

        <div class="sec-title">Mediciones de energia</div>
        <div class="grid">
          <div class="field"><b>Medicion fase/neutro</b>${esc(permiso.medicion_fase_neutro || "-")}</div>
          <div class="field"><b>Medicion neutro/tierra</b>${esc(permiso.medicion_neutro_tierra || "-")}</div>
          <div class="field"><b>Hertz</b>${esc(permiso.hertz || "-")}</div>
        </div>

        <div class="sec-title">Sellos</div>
        <div class="grid">
          <div class="field wide"><b>Detalle</b>${sellosHtml}</div>
        </div>

        <div class="sec-title">Cliente</div>
        <div class="grid">
          <div class="field"><b>Recepciona</b>${esc(permiso.recepciona_nombre || "-")}</div>
          <div class="field"><b>RUT recepciona</b>${esc(permiso.recepciona_rut || "-")}</div>
        </div>

        <div class="sec-title">Firmas</div>
        <div class="grid">
          <div class="field">
            <b>Firma tecnico 1</b>
            <div class="sig-box">${signatureHtml(permiso.firma_tecnico_1)}</div>
            <div style="margin-top:6px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${esc(permiso.tecnico_1 || "Sin nombre")}</div>
          </div>
          <div class="field">
            <b>Firma tecnico 2</b>
            <div class="sig-box">${signatureHtml(permiso.firma_tecnico_2)}</div>
            <div style="margin-top:6px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${esc(permiso.tecnico_2 || "Sin nombre")}</div>
          </div>
          <div class="field wide">
            <b>Firma recepciona</b>
            <div class="sig-box">${signatureHtml(permiso.firma_recepciona)}</div>
            <div style="margin-top:6px;font-size:12px;font-weight:700;color:#334155;text-align:center;">${esc(permiso.recepciona_nombre || "Sin nombre")}</div>
          </div>
        </div>

        <div class="sec-title">Descripcion del trabajo</div>
        <div class="grid">
          <div class="field wide"><b>Descripcion del trabajo</b>${esc(permiso.descripcion_trabajo || "-")}</div>
        </div>`;
        const correlativo = String(permiso.id_permiso_trabajo || "sin-numero");
        const centroNombre = String(permiso.centro || "sin-centro").trim();
        openPreviewPdf(
            `${correlativo} - Permiso de Trabajo - Informe de Intervencion y Recepcion ${centroNombre}`,
            body
        );
    };

    const verPermisoDesdeActaPdf = async (acta) => {
        const centroId = Number(acta?.centro_id || 0);
        let permiso = permisosTrabajo.find((p) => Number(p.centro_id || 0) === centroId);
        if (!permiso && centroId) {
            try {
                const data = await obtenerPermisosTrabajo({ centro_id: centroId });
                const lista = Array.isArray(data) ? data : [];
                permiso = lista[0] || null;
                if (lista.length) {
                    setPermisosTrabajo((prev) => {
                        const ids = new Set(prev.map((x) => Number(x.id_permiso_trabajo || 0)));
                        const extra = lista.filter((x) => !ids.has(Number(x.id_permiso_trabajo || 0)));
                        return extra.length ? [...prev, ...extra] : prev;
                    });
                }
            } catch (error) {
                console.error("Error al cargar permiso para vista previa:", error);
            }
        }
        if (!permiso) {
            alert("Este centro aun no tiene permiso de trabajo registrado.");
            return;
        }
        verPermisoPdf(permiso);
    };

    return (
        <div className="informes-centros-page container-fluid">
            <div className="card informes-centros-hero">
                <div className="informes-hero-content">
                    <span className="informes-hero-icon">
                        <i className="fas fa-chart-pie" />
                    </span>
                    <div>
                        <p className="informes-kicker">Reporteria</p>
                        <h2>Informes de centros</h2>
                        <p className="informes-subtitle">Instalacion, permisos de trabajo, mantenciones y retiros por centro.</p>
                    </div>
                </div>
            </div>

            <div className="card informes-centros-filtros">
                <div className="card-body informes-filtros-grid">
                    <div>
                        <label>Subcategoria</label>
                        <select className="form-control" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)}>
                            {SUBCATEGORIAS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Cliente</label>
                        <select className="form-control" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
                            <option value="all">Todos los clientes</option>
                            {clientes.map((cliente) => (
                                <option key={cliente} value={cliente}>
                                    {cliente}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Centro</label>
                        <select className="form-control" value={filtroCentroId} onChange={(e) => setFiltroCentroId(e.target.value)}>
                            <option value="">Todos los centros</option>
                            {centrosOrdenados.map((centro) => (
                                <option key={centro.id || centro.id_centro} value={centro.id || centro.id_centro}>
                                    {centro.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Fecha desde</label>
                        <input className="form-control" type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} />
                    </div>
                    <div>
                        <label>Fecha hasta</label>
                        <input className="form-control" type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} />
                    </div>
                </div>
            </div>

            {subcategoria === "acta_entrega" ? (
                <>
                    <div className="card informes-centros-filtros mb-3">
                        <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div>
                                <h5 className="mb-1">Actas de entrega</h5>
                                <p className="text-muted mb-0">Selecciona una fila para abrir el informe y completar datos.</p>
                            </div>
                            <button className="btn btn-primary" onClick={abrirNuevaActa}>
                                <i className="fas fa-plus mr-2" />
                                Nueva acta
                            </button>
                        </div>
                    </div>

                    <div className="card informes-centros-tabla">
                        <div className="card-body">
                            {loadingCentros || loadingActas ? (
                                <div className="informes-empty">Cargando informacion...</div>
                            ) : !actasFiltradas.length ? (
                                <div className="informes-empty">No hay actas de entrega para los filtros seleccionados.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover informes-table mb-0">
                                        <thead>
                                            <tr>
                                                <th>N</th>
                                                <th>Empresa</th>
                                                <th>Region / Localidad</th>
                                                <th>Centro</th>
                                                <th>Codigo Ponton</th>
                                                <th>Fecha registro</th>
                                                <th>Tecnico 1</th>
                                                <th>Tecnico 2</th>
                                                <th>Recepciona</th>
                                                <th>Equipos considerados en este sistema</th>
                                                <th>Centro origen (traslado)</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {actasFiltradas.map((acta, index) => (
                                                <tr key={acta.id_acta_entrega}>
                                                    <td>{index + 1}</td>
                                                    <td>{acta.empresa || "-"}</td>
                                                    <td>
                                                        <div>{acta.region || "-"}</div>
                                                        <small className="text-muted">{acta.localidad || "-"}</small>
                                                    </td>
                                                    <td>{acta.centro || "-"}</td>
                                                    <td>{acta.codigo_ponton || "-"}</td>
                                                    <td>{toDisplayDate(acta.fecha_registro)}</td>
                                                    <td>{acta.tecnico_1 || "-"}</td>
                                                    <td>{acta.tecnico_2 || "-"}</td>
                                                    <td>{acta.recepciona_nombre || "-"}</td>
                                                    <td className="equipos-col">{acta.equipos_considerados || "-"}</td>
                                                    <td>{acta.centro_origen_traslado || "-"}</td>
                                                    <td className="acciones-col">
                                                        <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => handleEditarActa(acta)}>
                                                            <i className="fas fa-folder-open mr-1" />
                                                            Acta
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-info mr-2" onClick={() => handleAbrirPermisoDesdeActa(acta)}>
                                                            <i className="fas fa-clipboard-list mr-1" />
                                                            Permiso
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-secondary mr-2" onClick={() => verActaPdf(acta)}>
                                                            <i className="fas fa-file-pdf mr-1" />
                                                            Ver acta
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-secondary mr-2" onClick={() => verPermisoDesdeActaPdf(acta)}>
                                                            <i className="fas fa-file-pdf mr-1" />
                                                            Ver permiso
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleEliminarActa(acta.id_acta_entrega)}>
                                                            <i className="fas fa-trash-alt" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {mostrarEditorActa ? (
                        <div className="informes-editor-overlay">
                            <div className="card informes-editor-card">
                                <div className="card-header d-flex justify-content-between align-items-center informes-editor-header">
                                    <div>
                                        <h5 className="mb-0">{editandoId ? "Editar acta de entrega" : "Nueva acta de entrega"}</h5>
                                        <small className="informes-editor-subtitle">Completa los datos del centro, equipo tecnico y recepcion.</small>
                                    </div>
                                    <button className="btn btn-sm btn-outline-secondary informes-editor-close-btn" onClick={resetFormulario}>
                                        <i className="fas fa-times" />
                                    </button>
                                </div>
                                <div className="card-body">
                                    <div className="informes-editor-section">
                                        <h6 className="informes-editor-section-title">Datos del centro</h6>
                                        <div className="informes-filtros-grid">
                                            <div>
                                                <label>Cliente</label>
                                                <select className="form-control" value={clienteIdForm} onChange={(e) => setClienteIdForm(e.target.value)}>
                                                    <option value="">Seleccionar cliente</option>
                                                    {clientesForm.map((cliente) => (
                                                        <option key={cliente.key} value={cliente.key}>
                                                            {cliente.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label>Centro (acta)</label>
                                                <select className="form-control" value={centroIdForm} onChange={(e) => setCentroIdForm(e.target.value)}>
                                                    <option value="">Seleccionar centro</option>
                                                    {centrosFormFiltrados.map((centro) => (
                                                        <option key={centro.id || centro.id_centro} value={centro.id || centro.id_centro}>
                                                            {centro.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label>Empresa (cliente)</label>
                                                <input className="form-control" value={centroSeleccionadoForm?.cliente || ""} disabled />
                                            </div>
                                            <div>
                                                <label>Centro</label>
                                                <input className="form-control" value={centroSeleccionadoForm?.nombre || ""} disabled />
                                            </div>
                                            <div>
                                                <label>Codigo ponton</label>
                                                <input className="form-control" value={centroSeleccionadoForm?.nombre_ponton || ""} disabled />
                                            </div>
                                            <div>
                                                <label>Fecha de registro</label>
                                                <input className="form-control" type="date" value={fechaRegistro} onChange={(e) => setFechaRegistro(e.target.value)} />
                                            </div>
                                            <div>
                                                <label>Region</label>
                                                <input className="form-control" value={region} disabled />
                                            </div>
                                            <div>
                                                <label>Localidad</label>
                                                <input className="form-control" value={localidad} disabled />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="informes-editor-section">
                                        <h6 className="informes-editor-section-title">Equipo tecnico y recepcion</h6>
                                        <div className="informes-filtros-grid">
                                            <div>
                                                <label>Tecnico 1</label>
                                                <input className="form-control" value={tecnico1} onChange={(e) => setTecnico1(e.target.value)} />
                                            </div>
                                            <div>
                                                <label>
                                                    Firma tecnico 1 {firmaTecnico1 ? <span className="firma-check">✓</span> : null}
                                                </label>
                                                {isSignatureImage(firmaTecnico1) ? (
                                                    <div className="signature-preview-box">
                                                        <img src={firmaTecnico1} alt="Firma tecnico 1" className="signature-preview-img" />
                                                    </div>
                                                ) : (
                                                    <input className="form-control" value={firmaTecnico1} onChange={(e) => setFirmaTecnico1(e.target.value)} />
                                                )}
                                            </div>
                                            <div>
                                                <label>Tecnico 2</label>
                                                <input className="form-control" value={tecnico2} onChange={(e) => setTecnico2(e.target.value)} />
                                            </div>
                                            <div>
                                                <label>
                                                    Firma tecnico 2 {firmaTecnico2 ? <span className="firma-check">✓</span> : null}
                                                </label>
                                                {isSignatureImage(firmaTecnico2) ? (
                                                    <div className="signature-preview-box">
                                                        <img src={firmaTecnico2} alt="Firma tecnico 2" className="signature-preview-img" />
                                                    </div>
                                                ) : (
                                                    <input className="form-control" value={firmaTecnico2} onChange={(e) => setFirmaTecnico2(e.target.value)} />
                                                )}
                                            </div>
                                            <div>
                                                <label>Recepciona sistema</label>
                                                <input className="form-control" value={recepcionaNombre} onChange={(e) => setRecepcionaNombre(e.target.value)} />
                                            </div>
                                            <div>
                                                <label>
                                                    Firma recepciona {firmaRecepciona ? <span className="firma-check">✓</span> : null}
                                                </label>
                                                {isSignatureImage(firmaRecepciona) ? (
                                                    <div className="signature-preview-box">
                                                        <img src={firmaRecepciona} alt="Firma recepciona" className="signature-preview-img" />
                                                    </div>
                                                ) : (
                                                    <input className="form-control" value={firmaRecepciona} onChange={(e) => setFirmaRecepciona(e.target.value)} />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="informes-editor-section">
                                        <h6 className="informes-editor-section-title">Detalle del acta</h6>
                                        <div className="informes-filtros-grid">
                                            <div className="informes-col-span-2">
                                                <label>Los equipos considerados en este sistema, corresponden a</label>
                                                <textarea
                                                    className="form-control"
                                                    rows={3}
                                                    value={equiposConsiderados}
                                                    onChange={(e) => setEquiposConsiderados(e.target.value)}
                                                    placeholder="Listado de equipos considerados en el sistema"
                                                />
                                            </div>
                                            <div className="informes-col-span-2">
                                                <label>En caso de ser traslado, indicar centro de origen</label>
                                                <input
                                                    className="form-control"
                                                    value={centroOrigenTraslado}
                                                    onChange={(e) => setCentroOrigenTraslado(e.target.value)}
                                                    placeholder="Centro de origen (solo traslados)"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="informes-col-span-2 d-flex gap-2 align-items-end">
                                        <button className="btn btn-primary" onClick={handleGuardarActa} disabled={savingActa}>
                                            {savingActa ? "Guardando..." : editandoId ? "Actualizar acta" : "Guardar acta"}
                                        </button>
                                        <button className="btn btn-outline-secondary" onClick={resetFormulario}>
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </>
            ) : subcategoria === "intervencion" ? (
                <>
                    <div className="card informes-centros-tabla">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                <div>
                                    <h5 className="mb-1">Permisos de trabajo</h5>
                                    <p className="text-muted mb-0">Registros creados desde mobile y web.</p>
                                </div>
                                <button className="btn btn-primary" onClick={abrirNuevoPermiso}>
                                    <i className="fas fa-plus mr-2" />
                                    Nuevo permiso
                                </button>
                            </div>
                            {loadingCentros || loadingActas ? (
                                <div className="informes-empty">Cargando informacion...</div>
                            ) : !permisosFiltrados.length ? (
                                <div className="informes-empty">No hay permisos de trabajo para los filtros seleccionados.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover informes-table mb-0">
                                        <thead>
                                            <tr>
                                                <th>N</th>
                                                <th>Empresa</th>
                                                <th>Centro</th>
                                                <th>Codigo Ponton</th>
                                                <th>Fecha ingreso</th>
                                                <th>Fecha salida</th>
                                                <th>Correo centro</th>
                                                <th>Region / Localidad</th>
                                                <th>Tecnico 1</th>
                                                <th>Tecnico 2</th>
                                                <th>Recepciona</th>
                                                <th>Puntos GPS</th>
                                                <th>Fase/Neutro</th>
                                                <th>Neutro/Tierra</th>
                                                <th>Hertz</th>
                                                <th>Descripcion</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {permisosFiltrados.map((permiso, index) => (
                                                <tr key={permiso.id_permiso_trabajo}>
                                                    <td>{index + 1}</td>
                                                    <td>{permiso.empresa || permiso.cliente || "-"}</td>
                                                    <td>{permiso.centro || "-"}</td>
                                                    <td>{permiso.codigo_ponton || "-"}</td>
                                                    <td>{toDisplayDate(permiso.fecha_ingreso)}</td>
                                                    <td>{toDisplayDate(permiso.fecha_salida)}</td>
                                                    <td>{permiso.correo_centro || "-"}</td>
                                                    <td>
                                                        <div>{permiso.region || "-"}</div>
                                                        <small className="text-muted">{permiso.localidad || "-"}</small>
                                                    </td>
                                                    <td>{permiso.tecnico_1 || "-"}</td>
                                                    <td>{permiso.tecnico_2 || "-"}</td>
                                                    <td>{permiso.recepciona_nombre || "-"}</td>
                                                    <td>{permiso.puntos_gps || "-"}</td>
                                                    <td>{permiso.medicion_fase_neutro || "-"}</td>
                                                    <td>{permiso.medicion_neutro_tierra || "-"}</td>
                                                    <td>{permiso.hertz || "-"}</td>
                                                    <td className="equipos-col">{permiso.descripcion_trabajo || "-"}</td>
                                                    <td className="acciones-col">
                                                        <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => handleEditarPermiso(permiso)}>
                                                            <i className="fas fa-folder-open mr-1" />
                                                            Abrir
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-secondary mr-2" onClick={() => verPermisoPdf(permiso)}>
                                                            <i className="fas fa-file-pdf mr-1" />
                                                            Ver
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleEliminarPermiso(permiso.id_permiso_trabajo)}>
                                                            <i className="fas fa-trash-alt" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {mostrarEditorPermiso ? (
                        <div className="informes-editor-overlay">
                            <div className="card informes-editor-card">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">{permisoEditandoId ? "Editar permiso de trabajo" : "Nuevo permiso de trabajo"}</h5>
                                    <button className="btn btn-sm btn-outline-secondary informes-editor-close-btn" onClick={resetFormularioPermiso}>
                                        <i className="fas fa-times" />
                                    </button>
                                </div>
                                <div className="card-body informes-filtros-grid">
                                    <div>
                                        <label>Cliente</label>
                                        <select className="form-control" value={permisoClienteIdForm} onChange={(e) => setPermisoClienteIdForm(e.target.value)}>
                                            <option value="">Seleccionar cliente</option>
                                            {clientesForm.map((cliente) => (
                                                <option key={cliente.key} value={cliente.key}>
                                                    {cliente.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Centro</label>
                                        <select className="form-control" value={permisoCentroIdForm} onChange={(e) => setPermisoCentroIdForm(e.target.value)}>
                                            <option value="">Seleccionar centro</option>
                                            {permisosCentrosFormFiltrados.map((centro) => (
                                                <option key={centro.id || centro.id_centro} value={centro.id || centro.id_centro}>
                                                    {centro.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Empresa (cliente)</label>
                                        <input className="form-control" value={permisoCentroSeleccionadoForm?.cliente || ""} disabled />
                                    </div>
                                    <div>
                                        <label>Codigo ponton</label>
                                        <input className="form-control" value={permisoCentroSeleccionadoForm?.nombre_ponton || ""} disabled />
                                    </div>
                                    <div>
                                        <label>Fecha ingreso</label>
                                        <input className="form-control" type="date" value={permisoFechaIngreso} onChange={(e) => setPermisoFechaIngreso(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Fecha salida</label>
                                        <input className="form-control" type="date" value={permisoFechaSalida} onChange={(e) => setPermisoFechaSalida(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Correo centro</label>
                                        <input className="form-control" value={permisoCorreoCentro} onChange={(e) => setPermisoCorreoCentro(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Region</label>
                                        <input className="form-control" value={permisoRegion} disabled />
                                    </div>
                                    <div>
                                        <label>Localidad</label>
                                        <input className="form-control" value={permisoLocalidad} disabled />
                                    </div>
                                    <div>
                                        <label>Tecnico 1</label>
                                        <input className="form-control" value={permisoTecnico1} onChange={(e) => setPermisoTecnico1(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Tecnico 2</label>
                                        <input className="form-control" value={permisoTecnico2} onChange={(e) => setPermisoTecnico2(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Recepciona</label>
                                        <input className="form-control" value={permisoRecepcionaNombre} onChange={(e) => setPermisoRecepcionaNombre(e.target.value)} />
                                    </div>
                                    <div className="informes-col-span-2">
                                        <label>Puntos GPS</label>
                                        <div className="d-flex flex-column gap-2">
                                            {permisoPuntosGps.map((punto, idx) => (
                                                <div key={`permiso-gps-${idx}`} className="d-flex gap-2 align-items-center">
                                                    <input
                                                        className="form-control"
                                                        placeholder={`Latitud ${idx + 1}`}
                                                        value={punto.lat}
                                                        onChange={(e) =>
                                                            setPermisoPuntosGps((prev) =>
                                                                prev.map((it, i) =>
                                                                    i === idx ? { ...it, lat: normalizeGpsPointInput(e.target.value) } : it
                                                                )
                                                            )
                                                        }
                                                    />
                                                    <input
                                                        className="form-control"
                                                        placeholder={`Longitud ${idx + 1}`}
                                                        value={punto.lng}
                                                        onChange={(e) =>
                                                            setPermisoPuntosGps((prev) =>
                                                                prev.map((it, i) =>
                                                                    i === idx ? { ...it, lng: normalizeGpsPointInput(e.target.value) } : it
                                                                )
                                                            )
                                                        }
                                                    />
                                                    {permisoPuntosGps.length > 1 ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary btn-sm"
                                                            onClick={() =>
                                                                setPermisoPuntosGps((prev) => prev.filter((_, i) => i !== idx))
                                                            }
                                                        >
                                                            ✕
                                                        </button>
                                                    ) : null}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary btn-sm align-self-start"
                                                onClick={() => setPermisoPuntosGps((prev) => [...prev, { lat: "", lng: "" }])}
                                            >
                                                + Agregar punto GPS
                                            </button>
                                        </div>
                                    </div>
                                    <div className="informes-col-span-2">
                                        <h6 className="mb-1">Mediciones de energia</h6>
                                    </div>
                                    <div>
                                        <label>Medicion fase/neutro</label>
                                        <input
                                            className="form-control"
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Ej: 220.5"
                                            value={permisoMedicionFaseNeutro}
                                            onChange={(e) => setPermisoMedicionFaseNeutro(normalizeMeasureInput(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label>Medicion neutro/tierra</label>
                                        <input
                                            className="form-control"
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Ej: 0.8"
                                            value={permisoMedicionNeutroTierra}
                                            onChange={(e) => setPermisoMedicionNeutroTierra(normalizeMeasureInput(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label>Hertz</label>
                                        <input
                                            className="form-control"
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Ej: 50.0"
                                            value={permisoHertz}
                                            onChange={(e) => setPermisoHertz(normalizeMeasureInput(e.target.value))}
                                        />
                                    </div>
                                    <div className="informes-col-span-2">
                                        <label>Descripcion del trabajo</label>
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            value={permisoDescripcionTrabajo}
                                            onChange={(e) => setPermisoDescripcionTrabajo(e.target.value)}
                                        />
                                    </div>
                                    <div className="informes-col-span-2 d-flex gap-2 align-items-end">
                                        <button className="btn btn-primary" onClick={handleGuardarPermiso} disabled={savingPermiso}>
                                            {savingPermiso ? "Guardando..." : permisoEditandoId ? "Actualizar permiso" : "Guardar permiso"}
                                        </button>
                                        <button className="btn btn-outline-secondary" onClick={resetFormularioPermiso}>
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </>
            ) : (
                <div className="card informes-centros-tabla">
                    <div className="card-body">
                        <div className="informes-empty">
                            Esta subcategoria aun no esta implementada. Continuamos con {SUBCATEGORIAS.find((s) => s.value === subcategoria)?.label}.
                        </div>
                    </div>
                </div>
            )}

            {subcategoria !== "intervencion" && mostrarEditorPermiso ? (
                <div className="informes-editor-overlay">
                    <div className="card informes-editor-card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">{permisoEditandoId ? "Editar permiso de trabajo" : "Nuevo permiso de trabajo"}</h5>
                            <button className="btn btn-sm btn-outline-secondary informes-editor-close-btn" onClick={resetFormularioPermiso}>
                                <i className="fas fa-times" />
                            </button>
                        </div>
                        <div className="card-body informes-filtros-grid">
                            <div>
                                <label>Cliente</label>
                                <select className="form-control" value={permisoClienteIdForm} onChange={(e) => setPermisoClienteIdForm(e.target.value)}>
                                    <option value="">Seleccionar cliente</option>
                                    {clientesForm.map((cliente) => (
                                        <option key={cliente.key} value={cliente.key}>
                                            {cliente.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Centro</label>
                                <select className="form-control" value={permisoCentroIdForm} onChange={(e) => setPermisoCentroIdForm(e.target.value)}>
                                    <option value="">Seleccionar centro</option>
                                    {permisosCentrosFormFiltrados.map((centro) => (
                                        <option key={centro.id || centro.id_centro} value={centro.id || centro.id_centro}>
                                            {centro.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Empresa (cliente)</label>
                                <input className="form-control" value={permisoCentroSeleccionadoForm?.cliente || ""} disabled />
                            </div>
                            <div>
                                <label>Codigo ponton</label>
                                <input className="form-control" value={permisoCentroSeleccionadoForm?.nombre_ponton || ""} disabled />
                            </div>
                            <div>
                                <label>Fecha ingreso</label>
                                <input className="form-control" type="date" value={permisoFechaIngreso} onChange={(e) => setPermisoFechaIngreso(e.target.value)} />
                            </div>
                            <div>
                                <label>Fecha salida</label>
                                <input className="form-control" type="date" value={permisoFechaSalida} onChange={(e) => setPermisoFechaSalida(e.target.value)} />
                            </div>
                            <div>
                                <label>Correo centro</label>
                                <input className="form-control" value={permisoCorreoCentro} onChange={(e) => setPermisoCorreoCentro(e.target.value)} />
                            </div>
                            <div>
                                <label>Region</label>
                                <input className="form-control" value={permisoRegion} disabled />
                            </div>
                            <div>
                                <label>Localidad</label>
                                <input className="form-control" value={permisoLocalidad} disabled />
                            </div>
                            <div>
                                <label>Tecnico 1</label>
                                <input className="form-control" value={permisoTecnico1} onChange={(e) => setPermisoTecnico1(e.target.value)} />
                            </div>
                            <div>
                                <label>Tecnico 2</label>
                                <input className="form-control" value={permisoTecnico2} onChange={(e) => setPermisoTecnico2(e.target.value)} />
                            </div>
                            <div>
                                <label>Recepciona</label>
                                <input className="form-control" value={permisoRecepcionaNombre} onChange={(e) => setPermisoRecepcionaNombre(e.target.value)} />
                            </div>
                            <div className="informes-col-span-2">
                                <label>Puntos GPS</label>
                                <div className="d-flex flex-column gap-2">
                                    {permisoPuntosGps.map((punto, idx) => (
                                        <div key={`permiso-gps-fallback-${idx}`} className="d-flex gap-2 align-items-center">
                                            <input
                                                className="form-control"
                                                placeholder={`Latitud ${idx + 1}`}
                                                value={punto.lat}
                                                onChange={(e) =>
                                                    setPermisoPuntosGps((prev) =>
                                                        prev.map((it, i) =>
                                                            i === idx ? { ...it, lat: normalizeGpsPointInput(e.target.value) } : it
                                                        )
                                                    )
                                                }
                                            />
                                            <input
                                                className="form-control"
                                                placeholder={`Longitud ${idx + 1}`}
                                                value={punto.lng}
                                                onChange={(e) =>
                                                    setPermisoPuntosGps((prev) =>
                                                        prev.map((it, i) =>
                                                            i === idx ? { ...it, lng: normalizeGpsPointInput(e.target.value) } : it
                                                        )
                                                    )
                                                }
                                            />
                                            {permisoPuntosGps.length > 1 ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary btn-sm"
                                                    onClick={() =>
                                                        setPermisoPuntosGps((prev) => prev.filter((_, i) => i !== idx))
                                                    }
                                                >
                                                    ✕
                                                </button>
                                            ) : null}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm align-self-start"
                                        onClick={() => setPermisoPuntosGps((prev) => [...prev, { lat: "", lng: "" }])}
                                    >
                                        + Agregar punto GPS
                                    </button>
                                </div>
                            </div>
                            <div className="informes-col-span-2">
                                <h6 className="mb-1">Mediciones de energia</h6>
                            </div>
                            <div>
                                <label>Medicion fase/neutro</label>
                                <input
                                    className="form-control"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Ej: 220.5"
                                    value={permisoMedicionFaseNeutro}
                                    onChange={(e) => setPermisoMedicionFaseNeutro(normalizeMeasureInput(e.target.value))}
                                />
                            </div>
                            <div>
                                <label>Medicion neutro/tierra</label>
                                <input
                                    className="form-control"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Ej: 0.8"
                                    value={permisoMedicionNeutroTierra}
                                    onChange={(e) => setPermisoMedicionNeutroTierra(normalizeMeasureInput(e.target.value))}
                                />
                            </div>
                            <div>
                                <label>Hertz</label>
                                <input
                                    className="form-control"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Ej: 50.0"
                                    value={permisoHertz}
                                    onChange={(e) => setPermisoHertz(normalizeMeasureInput(e.target.value))}
                                />
                            </div>
                            <div className="informes-col-span-2">
                                <label>Descripcion del trabajo</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={permisoDescripcionTrabajo}
                                    onChange={(e) => setPermisoDescripcionTrabajo(e.target.value)}
                                />
                            </div>
                            <div className="informes-col-span-2 d-flex gap-2 align-items-end">
                                <button className="btn btn-primary" onClick={handleGuardarPermiso} disabled={savingPermiso}>
                                    {savingPermiso ? "Guardando..." : permisoEditandoId ? "Actualizar permiso" : "Guardar permiso"}
                                </button>
                                <button className="btn btn-outline-secondary" onClick={resetFormularioPermiso}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default InformesCentros;
