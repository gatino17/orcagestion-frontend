import React, { useEffect, useMemo, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import {
  fetchClientes,
  fetchCentrosPorCliente,
  obtenerRetirosTerreno,
  recepcionarRetiroEnBodega,
  obtenerDetallesCentro,
  crearOrdenRevisionEquipos,
  obtenerOrdenesRevisionEquipos,
  obtenerInventarioBodegaEquipos,
  crearInventarioBodegaEquipos,
  actualizarInventarioBodegaEquipo,
  eliminarInventarioBodegaEquipo,
  obtenerUsuarios,
  asignarInventarioBodegaATecnico,
  devolverInventarioBodegaDesdeTecnico,
  obtenerArmados,
  obtenerActasEntrega,
  obtenerPermisosTrabajo,
  obtenerMantencionesTerreno,
  actualizarActaEntrega,
  actualizarEstadoCambioEquipoMantencion,
  obtenerMaterialesArmado,
  obtenerEquipos,
  obtenerMovimientosArmado,
  obtenerHistorialEquiposArmado,
  obtenerGuiasSalidaArmado,
  crearGuiaSalidaArmado,
  actualizarGuiaSalidaArmadoPorId,
  marcarRecepcionCentroGuiaArmado,
  marcarRecepcionCentroGuiaArmadoPorId,
  eliminarGuiaSalidaArmado,
  eliminarGuiaSalidaArmadoPorId,
} from "../api";
import "./BodegaRetiros.css";

function formatDate(value) {
  if (!value) return "-";
  const raw = String(value).trim();
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    // Evita desfase por zona horaria cuando la API envía fecha o fecha+hora ISO.
    return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const usarUTC = /(?:gmt|utc|z|[+\-]\d{2}:?\d{2})/i.test(raw);
  const dd = String(usarUTC ? d.getUTCDate() : d.getDate()).padStart(2, "0");
  const mm = String((usarUTC ? d.getUTCMonth() : d.getMonth()) + 1).padStart(2, "0");
  const yyyy = usarUTC ? d.getUTCFullYear() : d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CATALOGO_EQUIPOS_ARMADO = [
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
];


export default function BodegaRetiros() {
  const [activeTab, setActiveTab] = useState("logistica");
  const [clientes, setClientes] = useState([]);
  const [centros, setCentros] = useState([]);
  const [retiros, setRetiros] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [centroId, setCentroId] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [observacionBodega, setObservacionBodega] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [equiposRecepcion, setEquiposRecepcion] = useState([]);
  const [usuario, setUsuario] = useState({ id: null, nombre: "Bodega", rol: "" });
  const [tecnicosSistema, setTecnicosSistema] = useState([]);
  const [asignandoEquipoId, setAsignandoEquipoId] = useState(null);
  const [tecnicoAsignacionId, setTecnicoAsignacionId] = useState("");
  const [obsAsignacion, setObsAsignacion] = useState("");
  const [equipoAsignacionModal, setEquipoAsignacionModal] = useState(null);
  const [showAsignacionDirectaModal, setShowAsignacionDirectaModal] = useState(false);
  const [equipoAsignacionDirectaId, setEquipoAsignacionDirectaId] = useState("");
  const [mostrarTablaTransito, setMostrarTablaTransito] = useState(false);
  const [mostrarTablaBodega, setMostrarTablaBodega] = useState(false);
  const [mostrarTablaAsignaciones, setMostrarTablaAsignaciones] = useState(false);
  const [mostrarTablaBajas, setMostrarTablaBajas] = useState(false);
  const [mostrarTablaDespachos, setMostrarTablaDespachos] = useState(false);
  const [mostrarTablaCentros, setMostrarTablaCentros] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState("");
  const [filtroInventario, setFiltroInventario] = useState("");
  const [filtroSerieBodega, setFiltroSerieBodega] = useState("");
  const [filtroSerieBaja, setFiltroSerieBaja] = useState("");
  const [filtroTecnicoAsignacion, setFiltroTecnicoAsignacion] = useState("");
  const [filtroDespachoCentro, setFiltroDespachoCentro] = useState("");
  const [filtroEquiposCentro, setFiltroEquiposCentro] = useState("");
  const [equiposCentroPage, setEquiposCentroPage] = useState(1);
  const [equiposCentroPageSize, setEquiposCentroPageSize] = useState(10);
  const [inventarioManual, setInventarioManual] = useState([]);
  const [showIngresoInventario, setShowIngresoInventario] = useState(false);
  const [inventarioEditandoId, setInventarioEditandoId] = useState(null);
  const [equipoEsNuevo, setEquipoEsNuevo] = useState(false);
  const [showSeriesConfirm, setShowSeriesConfirm] = useState(false);
  const [seriesPendientes, setSeriesPendientes] = useState([]);
  const [seriesSeleccionadas, setSeriesSeleccionadas] = useState([]);
  const [codigosAdicionales, setCodigosAdicionales] = useState([]);
  const [bodega2Nombre, setBodega2Nombre] = useState("Bodega 2");
  const [nuevoEquipo, setNuevoEquipo] = useState({
    numero_serie: "",
    codigo: "",
    equipo_nombre: "",
    descripcion_producto: "",
    fecha_ingreso: new Date().toISOString().slice(0, 10),
    orden_compra: "",
    valor: "",
    cantidad: 1,
    modelo: "",
    estado_equipo: "Operativo",
    ubicacion: "Bodega central",
    imagen_base64: "",
    imagen_nombre: "",
  });
  const [historialCentro, setHistorialCentro] = useState(null);
  const [historialCentroLoading, setHistorialCentroLoading] = useState(false);
  const [historialEquipo, setHistorialEquipo] = useState(null);
  const [retiroRevision, setRetiroRevision] = useState(null);
  const [revisionEquiposArea, setRevisionEquiposArea] = useState([]);
  const [asignandoRevision, setAsignandoRevision] = useState(false);
  const [ordenesRevision, setOrdenesRevision] = useState([]);
  const [armadosFinalizados, setArmadosFinalizados] = useState([]);
  const [armadosSeguimiento, setArmadosSeguimiento] = useState([]);
  const [guiasSalida, setGuiasSalida] = useState([]);
  const [actasEntrega, setActasEntrega] = useState([]);
  const [permisosTrabajo, setPermisosTrabajo] = useState([]);
  const [mantencionesTerreno, setMantencionesTerreno] = useState([]);
  const [showGuiaModal, setShowGuiaModal] = useState(false);
  const [armadoGuia, setArmadoGuia] = useState(null);
  const [guiaSeleccionadaId, setGuiaSeleccionadaId] = useState(null);
  const [verCodigoGuia, setVerCodigoGuia] = useState(false);
  const [modoEdicionGuia, setModoEdicionGuia] = useState(false);
  const [formGuia, setFormGuia] = useState({
    numero_guia: "",
    fecha_salida: new Date().toISOString().slice(0, 10),
    observacion: "",
    modalidad_salida: "transportista_externo",
  });
  const [guiaCajasDetalle, setGuiaCajasDetalle] = useState([]);
  const [cajasDisponiblesGuia, setCajasDisponiblesGuia] = useState([]);
  const [cajasSeleccionadasGuia, setCajasSeleccionadasGuia] = useState([]);
  const [loadingGuiaCajas, setLoadingGuiaCajas] = useState(false);
  const [pendientesDetalleModal, setPendientesDetalleModal] = useState(null);
  const guiaDetalleCacheRef = useRef(new Map());

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const esCajaValida = (valor) => {
    const raw = String(valor || "").trim();
    const norm = normalizeText(raw);
    if (!raw || !norm || norm === "sin caja") return false;
    return /^caja\s*\d+/i.test(raw);
  };

  const normalizarModalidadSalida = (value) => {
    const raw = normalizeText(String(value || "").replace(/_/g, " "));
    if (raw.includes("mano")) return "por_mano";
    return "transportista_externo";
  };

  const obtenerEtiquetaModalidadSalida = (value) =>
    normalizarModalidadSalida(value) === "por_mano"
      ? "Envio por mano"
      : "Envio por transportista externo";

  const obtenerClaveCaja = (valor) => {
    const raw = String(valor || "").trim();
    const norm = normalizeText(raw);
    if (!raw || !norm || norm === "sin caja") return "";
    const match = norm.match(/^caja\s*(\d+)/i);
    return match ? `caja_${Number(match[1])}` : norm;
  };

  const obtenerClaveEquipoActa = (item) => {
    const equipoId = Number(item?.equipo_id || 0);
    if (equipoId > 0) return `id:${equipoId}`;
    return `raw:${normalizeText(item?.nombre || "")}|${normalizeText(item?.numero_serie || "")}|${normalizeText(item?.codigo || "")}`;
  };

  const elegirEtiquetaCaja = (actual, candidata) => {
    const a = String(actual || "").trim();
    const c = String(candidata || "").trim();
    if (!a) return c;
    if (!c) return a;
    return c.length > a.length ? c : a;
  };

  const catalogoEquiposInventario = useMemo(() => {
    const base = new Set(CATALOGO_EQUIPOS_ARMADO);
    const actual = String(nuevoEquipo.equipo_nombre || "").trim();
    if (actual) base.add(actual);
    return Array.from(base).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [nuevoEquipo.equipo_nombre]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setUsuario({
        id: decoded.id || decoded.user_id || decoded.sub || null,
        nombre: decoded.name || decoded.nombre || decoded.email || "Bodega",
        rol: String(decoded.role || decoded.rol || "").toLowerCase(),
      });
    } catch {
      setUsuario({ id: null, nombre: "Bodega", rol: "" });
    }
  }, []);

  useEffect(() => {
    try {
      const name = localStorage.getItem("orcagest_bodega2_nombre_v1");
      if (String(name || "").trim()) setBodega2Nombre(String(name).trim());
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("orcagest_bodega2_nombre_v1", String(bodega2Nombre || "Bodega 2").trim() || "Bodega 2");
  }, [bodega2Nombre]);

  const cargarInventarioManual = async () => {
    try {
      const data = await obtenerInventarioBodegaEquipos();
      setInventarioManual(Array.isArray(data) ? data : []);
    } catch {
      setInventarioManual([]);
    }
  };

  const cargarClientes = async () => {
    try {
      const data = await fetchClientes();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setClientes([]);
    }
  };

  const cargarTecnicos = async () => {
    try {
      const data = await obtenerUsuarios();
      const lista = (Array.isArray(data) ? data : []).filter((u) => {
        const rol = normalizeText(u?.rol || u?.role || "");
        return rol === "tecnico" || rol === "supervisor";
      });
      setTecnicosSistema(lista);
    } catch {
      setTecnicosSistema([]);
    }
  };

  const cargarArmadosFinalizados = async () => {
    try {
      const [data, guias] = await Promise.all([obtenerArmados(), obtenerGuiasSalidaArmado()]);
      setArmadosSeguimiento(Array.isArray(data) ? data : []);
      const lista = (Array.isArray(data) ? data : []).filter(
        (a) => normalizeText(a?.estado || "") === "finalizado"
      );
      setArmadosFinalizados(lista);
      setGuiasSalida(Array.isArray(guias) ? guias : []);
    } catch {
      setArmadosSeguimiento([]);
      setArmadosFinalizados([]);
      setGuiasSalida([]);
    }
  };

  const cargarCentros = async (idCliente) => {
    if (!idCliente) {
      setCentros([]);
      return;
    }
    try {
      const data = await fetchCentrosPorCliente(idCliente);
      setCentros(Array.isArray(data) ? data : []);
    } catch {
      setCentros([]);
    }
  };

  const cargarRetiros = async () => {
    setLoading(true);
    try {
      const [data, ordenes, actas, permisos, mantenciones] = await Promise.all([
        obtenerRetirosTerreno({
          cliente_id: clienteId || undefined,
          centro_id: centroId || undefined,
        }),
        obtenerOrdenesRevisionEquipos(),
        obtenerActasEntrega({
          cliente_id: clienteId || undefined,
          centro_id: centroId || undefined,
        }),
        obtenerPermisosTrabajo({
          cliente_id: clienteId || undefined,
          centro_id: centroId || undefined,
        }),
        obtenerMantencionesTerreno({
          cliente_id: clienteId || undefined,
          centro_id: centroId || undefined,
        }),
      ]);
      setRetiros(Array.isArray(data) ? data : []);
      setOrdenesRevision(Array.isArray(ordenes) ? ordenes : []);
      setActasEntrega(Array.isArray(actas) ? actas : []);
      setPermisosTrabajo(Array.isArray(permisos) ? permisos : []);
      setMantencionesTerreno(Array.isArray(mantenciones) ? mantenciones : []);
    } catch {
      setRetiros([]);
      setOrdenesRevision([]);
      setActasEntrega([]);
      setPermisosTrabajo([]);
      setMantencionesTerreno([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
    cargarInventarioManual();
    cargarTecnicos();
    cargarArmadosFinalizados();
  }, []);

  useEffect(() => {
    setCentroId("");
    cargarCentros(clienteId);
  }, [clienteId]);

  useEffect(() => {
    cargarRetiros();
  }, [clienteId, centroId]);

  useEffect(() => {
    setEquiposCentroPage(1);
  }, [filtroEquiposCentro, equiposCentroPageSize, clienteId, centroId]);

  const enTransito = useMemo(
    () => retiros.filter((r) => String(r.estado_logistico || "") === "en_transito"),
    [retiros]
  );
  const permisosPorActaId = useMemo(() => {
    const map = new Map();
    (Array.isArray(permisosTrabajo) ? permisosTrabajo : []).forEach((permiso) => {
      const actaId = Number(permiso?.acta_entrega_id || 0);
      if (!actaId) return;
      const previo = map.get(actaId);
      if (!previo || Number(permiso?.id_permiso_trabajo || 0) > Number(previo?.id_permiso_trabajo || 0)) {
        map.set(actaId, permiso);
      }
    });
    return map;
  }, [permisosTrabajo]);
  const devolucionesInstalacionEnTransito = useMemo(() => {
    return (Array.isArray(actasEntrega) ? actasEntrega : []).flatMap((acta) => {
      const equipos = Array.isArray(acta?.armado_equipos) ? acta.armado_equipos : [];
      const devueltos = equipos.filter(
        (item) =>
          normalizeText(item?.estado_uso || "") === "devuelto_bodega" &&
          normalizeText(item?.estado_logistico || "") === "en_transito_bodega"
      );
      if (!devueltos.length) return [];
      return [
        {
          tipoFila: "instalacion_devuelta",
          rowKey: `acta-dev-${acta?.id_acta_entrega || Math.random()}`,
          acta,
          permiso: permisosPorActaId.get(Number(acta?.id_acta_entrega || 0)) || null,
          equipos: devueltos,
        },
      ];
    });
  }, [actasEntrega, permisosPorActaId]);
  const devolucionesInstalacionEnBodega = useMemo(() => {
    return (Array.isArray(actasEntrega) ? actasEntrega : []).flatMap((acta) => {
      const equipos = Array.isArray(acta?.armado_equipos) ? acta.armado_equipos : [];
      const devueltos = equipos.filter(
        (item) =>
          normalizeText(item?.estado_uso || "") === "devuelto_bodega" &&
          normalizeText(item?.estado_logistico || "") === "recepcionado_bodega"
      );
      if (!devueltos.length) return [];
      return [
        {
          tipoFila: "instalacion_bodega",
          rowKey: `acta-bodega-${acta?.id_acta_entrega || Math.random()}`,
          acta,
          permiso: permisosPorActaId.get(Number(acta?.id_acta_entrega || 0)) || null,
          equipos: devueltos,
        },
      ];
    });
  }, [actasEntrega, permisosPorActaId]);
  const devolucionesInstalacionBaja = useMemo(() => {
    return (Array.isArray(actasEntrega) ? actasEntrega : []).flatMap((acta) => {
      const equipos = Array.isArray(acta?.armado_equipos) ? acta.armado_equipos : [];
      const devueltos = equipos.filter(
        (item) =>
          normalizeText(item?.estado_uso || "") === "devuelto_bodega" &&
          normalizeText(item?.estado_logistico || "") === "baja_bodega"
      );
      if (!devueltos.length) return [];
      return devueltos.map((item, idx) => ({
        tipoFila: "instalacion_baja",
        rowKey: `acta-baja-${acta?.id_acta_entrega || "0"}-${idx}`,
        acta,
        equipo: item,
      }));
    });
  }, [actasEntrega]);
  const devolucionesMantencionEnTransito = useMemo(() => {
    return (Array.isArray(mantencionesTerreno) ? mantencionesTerreno : []).flatMap((mantencion) => {
      const cambios = Array.isArray(mantencion?.cambios_equipo) ? mantencion.cambios_equipo : [];
      return cambios
        .filter((item) => normalizeText(item?.estado_logistico || "en_transito_bodega") === "en_transito_bodega")
        .map((item) => ({
          tipoFila: "mantencion_devuelta",
          rowKey: `mant-dev-${item?.id_cambio_equipo_mantencion || Math.random()}`,
          mantencion,
          cambio: item,
        }));
    });
  }, [mantencionesTerreno]);
  const devolucionesMantencionEnBodega = useMemo(() => {
    return (Array.isArray(mantencionesTerreno) ? mantencionesTerreno : []).flatMap((mantencion) => {
      const cambios = Array.isArray(mantencion?.cambios_equipo) ? mantencion.cambios_equipo : [];
      return cambios
        .filter((item) => normalizeText(item?.estado_logistico || "") === "recepcionado_bodega")
        .map((item) => ({
          tipoFila: "mantencion_bodega",
          rowKey: `mant-bodega-${item?.id_cambio_equipo_mantencion || Math.random()}`,
          mantencion,
          cambio: item,
        }));
    });
  }, [mantencionesTerreno]);
  const devolucionesMantencionBaja = useMemo(() => {
    return (Array.isArray(mantencionesTerreno) ? mantencionesTerreno : []).flatMap((mantencion) => {
      const cambios = Array.isArray(mantencion?.cambios_equipo) ? mantencion.cambios_equipo : [];
      return cambios
        .filter((item) => normalizeText(item?.estado_logistico || "") === "baja_bodega")
        .map((item) => ({
          tipoFila: "mantencion_baja",
          rowKey: `mant-baja-${item?.id_cambio_equipo_mantencion || Math.random()}`,
          mantencion,
          cambio: item,
        }));
    });
  }, [mantencionesTerreno]);
  const enBodega = useMemo(
    () => retiros.filter((r) => String(r.estado_logistico || "") === "en_bodega"),
    [retiros]
  );
  const revisionResumenPorRetiro = useMemo(() => {
    const map = new Map();
    (Array.isArray(ordenesRevision) ? ordenesRevision : []).forEach((o) => {
      const rid = Number(o?.retiro_terreno_id || 0);
      if (!rid) return;
      const prev = map.get(rid) || {
        enviadoRevision: false,
        areas: new Set(),
        disponibles: 0,
      };
      prev.enviadoRevision = true;
      if (o?.area) prev.areas.add(String(o.area));
      (Array.isArray(o?.detalles) ? o.detalles : []).forEach((d) => {
        if (d?.disponible_bodega) prev.disponibles += 1;
      });
      map.set(rid, prev);
    });
    return map;
  }, [ordenesRevision]);
  const revisionActivaPorRetiro = useMemo(() => {
    const map = new Map();
    (Array.isArray(ordenesRevision) ? ordenesRevision : []).forEach((o) => {
      if (String(o?.estado || "").toLowerCase() === "cerrado") return;
      const rid = Number(o?.retiro_terreno_id || 0);
      if (!rid) return;
      const areas = map.get(rid) || { porEquipo: new Map(), porArea: new Set() };
      const area = String(o?.area || "").toLowerCase();
      if (area) areas.porArea.add(area);
      (Array.isArray(o?.detalles) ? o.detalles : []).forEach((d) => {
        if (d?.retiro_equipo_id) {
          areas.porEquipo.set(Number(d.retiro_equipo_id), area || "");
        }
      });
      map.set(rid, areas);
    });
    return map;
  }, [ordenesRevision]);
  const enBodegaDisponibles = useMemo(
    () =>
      enBodega.filter((r) => {
        const resumen = revisionResumenPorRetiro.get(Number(r?.id_retiro_terreno || 0));
        return (resumen?.disponibles || 0) > 0;
      }).length,
    [enBodega, revisionResumenPorRetiro]
  );

  const enBodegaRows = useMemo(
    () => [
      ...(enBodega || []).map((retiro) => ({ tipoFila: "retiro_bodega", rowKey: `ret-bod-${retiro.id_retiro_terreno}`, retiro })),
      ...devolucionesInstalacionEnBodega,
      ...devolucionesMantencionEnBodega,
    ],
    [enBodega, devolucionesInstalacionEnBodega, devolucionesMantencionEnBodega]
  );

  const enBodegaFiltrados = useMemo(() => {
    const qSerie = normalizeText(filtroSerieBodega);
    return (enBodegaRows || []).filter((row) => {
      if (!qSerie) return true;
      if (row.tipoFila === "instalacion_bodega") {
        return (Array.isArray(row?.equipos) ? row.equipos : []).some((eq) =>
          normalizeText(`${eq?.numero_serie || ""} ${eq?.codigo || ""} ${eq?.nombre || ""}`).includes(qSerie)
        );
      }
      if (row.tipoFila === "mantencion_bodega") {
        const cambio = row?.cambio || {};
        return normalizeText(`${cambio?.serie_anterior || ""} ${cambio?.codigo_anterior || ""} ${cambio?.equipo || ""}`).includes(qSerie);
      }
      const r = row.retiro;
      return (Array.isArray(r?.equipos) ? r.equipos : []).some((eq) =>
        normalizeText(`${eq?.numero_serie || ""} ${eq?.codigo || ""}`).includes(qSerie)
      );
    });
  }, [enBodegaRows, filtroSerieBodega]);
  const totalPendienteTransito =
    enTransito.length + devolucionesInstalacionEnTransito.length + devolucionesMantencionEnTransito.length;
  const transitoRows = useMemo(
    () => [
      ...(enTransito || []).map((retiro) => ({ tipoFila: "retiro", rowKey: `ret-${retiro.id_retiro_terreno}`, retiro })),
      ...devolucionesInstalacionEnTransito,
      ...devolucionesMantencionEnTransito,
    ],
    [enTransito, devolucionesInstalacionEnTransito, devolucionesMantencionEnTransito]
  );
  const totalEquiposRetirados = (retiro) =>
    Array.isArray(retiro?.equipos) ? retiro.equipos.filter((e) => !!e.retirado).length : 0;
  const labelArea = (area) => {
    const a = String(area || "").toLowerCase();
    if (a === "camaras") return "Cámaras";
    if (a === "pc") return "PC";
    if (a === "energia") return "Energía";
    return "-";
  };

  const historialLogistico = useMemo(() => {
    const areaLabel = (area) => {
      const a = String(area || "").toLowerCase();
      if (a === "camaras") return "Cámaras";
      if (a === "pc") return "PC";
      if (a === "energia") return "Energía";
      return area || "-";
    };
    const flujoRevisionByRetiro = new Map();
    (Array.isArray(ordenesRevision) ? ordenesRevision : []).forEach((o) => {
      const rid = Number(o?.retiro_terreno_id || 0);
      if (!rid) return;
      const keyBase = `r-${rid}`;
      const prev = flujoRevisionByRetiro.get(keyBase);
      const prevTs = prev ? new Date(prev.fecha_asignacion || 0).getTime() : -1;
      const currTs = new Date(o?.fecha_asignacion || 0).getTime();
      if (!prev || currTs >= prevTs) {
        flujoRevisionByRetiro.set(keyBase, {
          area: areaLabel(o?.area),
          estado: String(o?.estado || "").toLowerCase(),
          fecha_asignacion: o?.fecha_asignacion,
        });
      }
      (Array.isArray(o?.detalles) ? o.detalles : []).forEach((d) => {
        const k = `d-${rid}-${normalizeText(d?.equipo_nombre)}-${normalizeText(d?.numero_serie || "")}-${normalizeText(d?.codigo || "")}`;
        const p = flujoRevisionByRetiro.get(k);
        const pTs = p ? new Date(p.fecha_asignacion || 0).getTime() : -1;
        if (!p || currTs >= pTs) {
          flujoRevisionByRetiro.set(k, {
            area: areaLabel(o?.area),
            estado: String(o?.estado || "").toLowerCase(),
            fecha_asignacion: o?.fecha_asignacion,
            disponible_bodega: !!d?.disponible_bodega,
          });
        }
      });
    });
    const q = String(filtroHistorial || "").trim().toLowerCase();
    const rows = [];
    (retiros || []).forEach((r) => {
      const equipos = Array.isArray(r?.equipos) ? r.equipos : [];
      equipos
        .filter((eq) => !!eq.retirado)
        .forEach((eq) => {
      const rid = Number(r?.id_retiro_terreno || 0);
      const keyDet = `d-${rid}-${normalizeText(eq?.equipo_nombre)}-${normalizeText(eq?.numero_serie || "")}-${normalizeText(eq?.codigo || "")}`;
      const flujoRevision =
        flujoRevisionByRetiro.get(keyDet) || flujoRevisionByRetiro.get(`r-${rid}`) || null;
      const flujoTxt = flujoRevision
        ? flujoRevision.disponible_bodega
          ? `Bodega -> Revision (${flujoRevision.area}) -> Bodega disponible`
          : `Bodega -> Revision (${flujoRevision.area})`
        : "Bodega";
          const row = {
            id_retiro_terreno: r.id_retiro_terreno,
            centro_id: r.centro_id,
            cliente: r.empresa || r.cliente || "-",
            centro: r.centro || "-",
            tecnico: r.tecnico_1 || r.tecnico_2 || "-",
            fecha_retiro: r.fecha_retiro,
            estado_logistico: r.estado_logistico || "retirado_centro",
            recepcion_bodega_por: r.recepcion_bodega_por || "-",
            fecha_recepcion_bodega: r.fecha_recepcion_bodega,
            equipo_nombre: eq.equipo_nombre || "-",
            numero_serie: eq.numero_serie || "-",
            codigo: eq.codigo || "-",
            recibido_bodega: !!eq.recibido_bodega,
            flujo_revision: flujoTxt,
            revision_estado: flujoRevision?.estado || null,
          };
          rows.push(row);
        });
    });
    const filtradas = !q
      ? rows
      : rows.filter((r) =>
          [
            r.cliente,
            r.centro,
            r.tecnico,
            r.equipo_nombre,
            r.numero_serie,
            r.codigo,
            r.flujo_revision,
            `n${r.id_retiro_terreno || ""}`,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)
        );
    return filtradas.sort((a, b) => {
      const fa = new Date(a.fecha_retiro || 0).getTime();
      const fb = new Date(b.fecha_retiro || 0).getTime();
      if (fb !== fa) return fb - fa;
      return Number(b.id_retiro_terreno || 0) - Number(a.id_retiro_terreno || 0);
    });
  }, [retiros, filtroHistorial, ordenesRevision]);

  const inventarioEquiposBase = useMemo(() => {
    const detalleRevisionPorEquipo = new Map();
    (Array.isArray(ordenesRevision) ? ordenesRevision : []).forEach((o) => {
      const area = String(o?.area || "").toLowerCase();
      const estadoOrden = String(o?.estado || "").toLowerCase();
      (Array.isArray(o?.detalles) ? o.detalles : []).forEach((d) => {
        const key = Number(d?.retiro_equipo_id || 0);
        if (!key) return;
        const prev = detalleRevisionPorEquipo.get(key);
        const prevTs = prev ? new Date(prev.updated_at || prev.created_at || 0).getTime() : -1;
        const currTs = new Date(d?.updated_at || d?.created_at || o?.updated_at || o?.created_at || 0).getTime();
        if (!prev || currTs >= prevTs) {
          detalleRevisionPorEquipo.set(key, {
            area,
            estadoOrden,
            resultado: String(d?.resultado || "").toLowerCase(),
            disponible_bodega: !!d?.disponible_bodega,
            updated_at: d?.updated_at || d?.created_at || o?.updated_at || o?.created_at || null
          });
        }
      });
    });

    const rows = [];
    (retiros || []).forEach((r) => {
      const estadoLog = String(r?.estado_logistico || "");
      (Array.isArray(r?.equipos) ? r.equipos : [])
        .filter((eq) => !!eq?.retirado)
        .forEach((eq) => {
          const rev = detalleRevisionPorEquipo.get(Number(eq?.id_retiro_equipo || 0));
          let ubicacion = `Centro: ${r?.centro || "-"}`;
          if (estadoLog === "en_transito") ubicacion = "En tránsito a bodega central";
          if (estadoLog === "en_bodega") ubicacion = "Bodega central";
          if (rev?.area && !rev?.disponible_bodega && rev?.estadoOrden !== "cerrado") {
            ubicacion = `En revisión (${labelArea(rev.area)})`;
          } else if (rev?.disponible_bodega) {
            ubicacion = "Bodega central";
          }

          let estadoEquipo = "Sin diagnostico";
          if (rev?.resultado === "operativo") estadoEquipo = "Operativo";
          else if (rev?.resultado === "no_operativo_baja") estadoEquipo = "No operativo / baja";
          else if (rev?.resultado === "requiere_repuesto") estadoEquipo = "Requiere repuesto";

          rows.push({
            id_retiro_equipo: eq?.id_retiro_equipo,
            id_retiro_terreno: r?.id_retiro_terreno,
            numero_serie: eq?.numero_serie || "-",
            codigo: eq?.codigo || "-",
            equipo_nombre: eq?.equipo_nombre || "-",
            modelo: eq?.modelo || "-",
            centro: r?.centro || "-",
            cliente: r?.empresa || r?.cliente || "-",
            estado_equipo: estadoEquipo,
            ubicacion,
            updated_at: rev?.updated_at || r?.fecha_recepcion_bodega || r?.fecha_retiro || r?.updated_at || r?.created_at
          });
        });
    });

    return rows.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
  }, [retiros, ordenesRevision]);

  const inventarioEquipos = useMemo(() => {
    const normalizarUbicacion = (ubicacion) => {
      const val = String(ubicacion || "").trim();
      if (!val) return "Bodega central";
      if (val.toLowerCase() === "bodega 2") return bodega2Nombre;
      return val;
    };

    const manual = (inventarioManual || []).map((r, idx) => ({
      id_retiro_equipo: r.id || `manual-${idx}`,
      id_retiro_terreno: null,
      numero_serie: r.numero_serie || "-",
      codigo: r.codigo || "-",
      equipo_nombre: r.equipo_nombre || "-",
      modelo: r.modelo || "-",
      centro: "-",
      cliente: "-",
      estado_equipo: r.estado_equipo || "Operativo",
      ubicacion: normalizarUbicacion(r.ubicacion),
      updated_at: r.updated_at || new Date().toISOString(),
      es_manual: true,
      estado_asignacion: r.estado_asignacion || "en_bodega",
      tecnico_asignado_id: r.tecnico_asignado_id || null,
      tecnico_asignado_nombre: r.tecnico_asignado_nombre || "",
      asignado_por_nombre: r.asignado_por_nombre || "",
      fecha_asignacion: r.fecha_asignacion || null,
      fecha_devolucion: r.fecha_devolucion || null,
      observacion_asignacion: r.observacion_asignacion || "",
      observacion_devolucion: r.observacion_devolucion || "",
    }));

    const base = (inventarioEquiposBase || []).map((r) => ({
      ...r,
      ubicacion: normalizarUbicacion(r.ubicacion),
      es_manual: false,
    }));

    const rows = [...manual, ...base];
    const q = normalizeText(filtroInventario);
    const filtradas = !q
      ? rows
      : rows.filter((x) =>
          normalizeText(
            `${x.numero_serie} ${x.codigo} ${x.equipo_nombre} ${x.modelo} ${x.centro} ${x.cliente} ${x.estado_equipo} ${x.ubicacion}`
          ).includes(q)
        );
    return filtradas.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
  }, [inventarioManual, inventarioEquiposBase, bodega2Nombre, filtroInventario]);

  const resumenInventario = useMemo(() => {
    const bCentral = (inventarioEquipos || []).filter((x) => String(x.ubicacion || "").toLowerCase() === "bodega central").length;
    const bBaja = (inventarioEquipos || []).filter((x) => {
      const u = String(x.ubicacion || "").toLowerCase();
      if (u === "bodega baja" || u === "bodega de baja") return true;
      return String(x.estado_equipo || "").toLowerCase() === "no operativo / baja";
    }).length;
    const b2 = (inventarioEquipos || []).filter(
      (x) => String(x.ubicacion || "").toLowerCase() === String(bodega2Nombre || "Bodega 2").toLowerCase()
    ).length;
    return { bCentral, bBaja, b2 };
  }, [inventarioEquipos, bodega2Nombre]);

  const equiposAsignadosTecnicos = useMemo(
    () =>
      (inventarioEquipos || []).filter(
        (x) => String(x?.estado_asignacion || "en_bodega").toLowerCase() === "asignado_tecnico"
      ),
    [inventarioEquipos]
  );

  const equiposAsignadosTecnicosFiltrados = useMemo(() => {
    const q = normalizeText(filtroTecnicoAsignacion);
    if (!q) return equiposAsignadosTecnicos;
    return equiposAsignadosTecnicos.filter((x) =>
      normalizeText(`${x?.tecnico_asignado_nombre || ""} ${x?.asignado_por_nombre || ""}`).includes(q)
    );
  }, [equiposAsignadosTecnicos, filtroTecnicoAsignacion]);

  const equiposDisponiblesParaAsignar = useMemo(
    () =>
      (inventarioEquipos || []).filter(
        (x) =>
          !!x?.es_manual &&
          Number(x?.id_bodega_equipo || 0) > 0 &&
          String(x?.estado_asignacion || "en_bodega").toLowerCase() !== "asignado_tecnico"
      ),
    [inventarioEquipos]
  );

  const equiposTrabajandoRows = useMemo(() => {
    const latestBySerie = new Map();
    (Array.isArray(actasEntrega) ? actasEntrega : []).forEach((acta) => {
      const cliente = acta?.empresa || acta?.cliente || "-";
      const centro = acta?.centro || "-";
      const fechaInstalacion = acta?.fecha_registro || null;
      const fechaOrden = new Date(acta?.updated_at || acta?.created_at || acta?.fecha_registro || 0).getTime();
      const tecnicos = [acta?.tecnico_1, acta?.tecnico_2]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(", ");
      const equipos = Array.isArray(acta?.armado_equipos) ? acta.armado_equipos : [];
      equipos.forEach((eq, idx) => {
        const serie = String(eq?.numero_serie || "").trim();
        if (!serie) return;
        const estadoUso = normalizeText(eq?.estado_uso || "instalado");
        const estadoLogistico = normalizeText(eq?.estado_logistico || "sin_movimiento");
        const key = serie.toUpperCase();
        const previo = latestBySerie.get(key);
        if (previo && Number(previo.fechaOrden || 0) > fechaOrden) return;
        latestBySerie.set(key, {
          rowKey: `trabajo-${acta?.id_acta_entrega || "0"}-${idx}-${key}`,
          serie,
          codigo: String(eq?.codigo || "").trim() || "-",
          equipo: String(eq?.nombre || "Equipo").trim() || "Equipo",
          cliente,
          centro,
          fechaInstalacion,
          fechaOrden,
          tecnico: tecnicos || "-",
          estadoUso,
          estadoLogistico,
        });
      });
    });

    (Array.isArray(mantencionesTerreno) ? mantencionesTerreno : []).forEach((mantencion) => {
      const cliente = mantencion?.empresa || mantencion?.cliente || "-";
      const centro = mantencion?.centro || "-";
      const fechaInstalacion = mantencion?.fecha_ingreso || null;
      const fechaOrden = new Date(mantencion?.updated_at || mantencion?.created_at || mantencion?.fecha_ingreso || 0).getTime();
      const tecnicos = [mantencion?.tecnico_1, mantencion?.tecnico_2]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(", ");
      const cambios = Array.isArray(mantencion?.cambios_equipo) ? mantencion.cambios_equipo : [];

      cambios.forEach((cambio, idx) => {
        const serieAnterior = String(cambio?.serie_anterior || "").trim();
        if (serieAnterior) {
          latestBySerie.delete(serieAnterior.toUpperCase());
        }
        const serieNueva = String(cambio?.serie_nueva || "").trim();
        if (!serieNueva) return;
        const key = serieNueva.toUpperCase();
        const previo = latestBySerie.get(key);
        if (previo && Number(previo.fechaOrden || 0) > fechaOrden) return;
        latestBySerie.set(key, {
          rowKey: `trabajo-mant-${mantencion?.id_mantencion_terreno || "0"}-${idx}-${key}`,
          serie: serieNueva,
          codigo: String(cambio?.codigo_nuevo || "").trim() || "-",
          equipo: String(cambio?.equipo || "Equipo").trim() || "Equipo",
          cliente,
          centro,
          fechaInstalacion,
          fechaOrden,
          tecnico: tecnicos || "-",
          estadoUso: "instalado",
          estadoLogistico: "sin_movimiento",
        });
      });
    });

    return Array.from(latestBySerie.values())
      .filter((item) => item.estadoUso !== "devuelto_bodega")
      .sort((a, b) => Number(b.fechaOrden || 0) - Number(a.fechaOrden || 0));
  }, [actasEntrega, mantencionesTerreno]);

  const equiposTrabajandoFiltrados = useMemo(() => {
    const q = normalizeText(filtroEquiposCentro);
    return equiposTrabajandoRows.filter((item) => {
      if (!q) return true;
      return normalizeText(`${item.serie} ${item.codigo} ${item.equipo} ${item.cliente} ${item.centro}`).includes(q);
    });
  }, [equiposTrabajandoRows, filtroEquiposCentro]);

  const totalEquiposCentroPages = useMemo(
    () => Math.max(1, Math.ceil(equiposTrabajandoFiltrados.length / equiposCentroPageSize)),
    [equiposTrabajandoFiltrados.length, equiposCentroPageSize]
  );

  const equiposTrabajandoPaginados = useMemo(() => {
    const start = (equiposCentroPage - 1) * equiposCentroPageSize;
    return equiposTrabajandoFiltrados.slice(start, start + equiposCentroPageSize);
  }, [equiposTrabajandoFiltrados, equiposCentroPage, equiposCentroPageSize]);

  const totalEquiposEnCentros = useMemo(() => equiposTrabajandoRows.length, [equiposTrabajandoRows]);

  useEffect(() => {
    if (equiposCentroPage > totalEquiposCentroPages) {
      setEquiposCentroPage(totalEquiposCentroPages);
    }
  }, [equiposCentroPage, totalEquiposCentroPages]);

  const totalEquiposBaja = useMemo(
    () =>
      (inventarioEquipos || []).filter((x) => {
        const estado = normalizeText(x?.estado_equipo || "");
        const ubicacion = normalizeText(x?.ubicacion || "");
        return estado.includes("baja") || ubicacion.includes("baja");
      }).length + devolucionesInstalacionBaja.length,
    [inventarioEquipos, devolucionesInstalacionBaja]
  );

  const equiposBaja = useMemo(
    () =>
      (inventarioEquipos || []).filter((x) => {
        const estado = normalizeText(x?.estado_equipo || "");
        const ubicacion = normalizeText(x?.ubicacion || "");
        return estado.includes("baja") || ubicacion.includes("baja");
      }),
    [inventarioEquipos]
  );

  const equiposBajaRows = useMemo(
    () => [
      ...equiposBaja.map((x) => ({ tipoFila: "inventario_baja", rowKey: `inv-baja-${x.id_bodega_equipo || x.codigo || x.numero_serie}`, item: x })),
      ...devolucionesInstalacionBaja.map((x) => ({
        tipoFila: "instalacion_baja",
        rowKey: x.rowKey,
        item: {
          numero_serie: x?.equipo?.numero_serie || "-",
          codigo: x?.equipo?.codigo || "-",
          equipo_nombre: x?.equipo?.nombre || "-",
          modelo: "-",
          cliente: x?.acta?.empresa || x?.acta?.cliente || "-",
          centro: x?.acta?.centro || "-",
          ubicacion: x?.acta?.centro || "-",
          estado_equipo: "Devuelto / baja",
          updated_at: x?.equipo?.fecha_recepcion_bodega || x?.acta?.updated_at || null,
        },
      })),
      ...devolucionesMantencionBaja.map((x) => ({
        tipoFila: "mantencion_baja",
        rowKey: x.rowKey,
        item: {
          numero_serie: x?.cambio?.serie_anterior || "-",
          codigo: x?.cambio?.codigo_anterior || "-",
          equipo_nombre: x?.cambio?.equipo || "-",
          modelo: "-",
          cliente: x?.mantencion?.empresa || x?.mantencion?.cliente || "-",
          centro: x?.mantencion?.centro || "-",
          ubicacion: x?.mantencion?.centro || "-",
          estado_equipo: "Devuelto / baja",
          updated_at: x?.cambio?.updated_at || x?.cambio?.fecha_recepcion_bodega || null,
        },
      })),
    ],
    [equiposBaja, devolucionesInstalacionBaja, devolucionesMantencionBaja]
  );

  const equiposBajaFiltrados = useMemo(() => {
    const q = normalizeText(filtroSerieBaja);
    const clienteSel = clientes.find((c) => String(c.id_cliente ?? c.id) === String(clienteId || ""));
    const centroSel = centros.find((c) => String(c.id_centro ?? c.id) === String(centroId || ""));
    const clienteNombreSel = normalizeText(clienteSel?.nombre || clienteSel?.razon_social || "");
    const centroNombreSel = normalizeText(centroSel?.nombre || "");

    return equiposBajaRows.filter((row) => {
      const x = row.item;
      const clienteTxt = normalizeText(x?.cliente || x?.empresa || "");
      const centroTxt = normalizeText(x?.centro || "");
      const pasaCliente = !clienteId || (clienteNombreSel && clienteTxt.includes(clienteNombreSel));
      const pasaCentro = !centroId || (centroNombreSel && centroTxt.includes(centroNombreSel));
      const pasaSerie =
        !q ||
        normalizeText(`${x?.numero_serie || ""} ${x?.codigo || ""} ${x?.equipo_nombre || ""}`).includes(q);
      return pasaCliente && pasaCentro && pasaSerie;
    });
  }, [equiposBajaRows, filtroSerieBaja, clientes, centros, clienteId, centroId]);

  const guiasPorArmado = useMemo(() => {
    const map = new Map();
    (guiasSalida || []).forEach((g) => {
      const id = Number(g?.armado_id || 0);
      if (!id) return;
      const lista = map.get(id) || [];
      lista.push(g);
      map.set(id, lista);
    });
    map.forEach((lista, id) => {
      map.set(
        id,
        [...lista].sort((a, b) => {
          const fechaA = new Date(a?.updated_at || a?.created_at || 0).getTime();
          const fechaB = new Date(b?.updated_at || b?.created_at || 0).getTime();
          if (fechaA !== fechaB) return fechaB - fechaA;
          return Number(b?.id_guia_salida || 0) - Number(a?.id_guia_salida || 0);
        })
      );
    });
    return map;
  }, [guiasSalida]);

  const armadosSeguimientoVisibles = useMemo(() => {
    const lista = Array.isArray(armadosSeguimiento) ? armadosSeguimiento : [];
    return lista.filter((a) => {
      const finalizado = normalizeText(a?.estado || "") === "finalizado";
      const porcentajeArmado = Math.max(0, Math.min(100, Number(a?.porcentaje_armado || 0)));
      const pendientesArmado = Math.max(0, Number(a?.armado_equipos_pendientes || 0));
      const totalCajas = Math.max(0, Number(a?.total_cajas || 0));
      const guiasArmado = Array.isArray(guiasPorArmado.get(Number(a?.id_armado || 0)))
        ? guiasPorArmado.get(Number(a?.id_armado || 0))
        : [];
      const cajasDespachadas = new Set();
      guiasArmado.forEach((guia) => {
        (Array.isArray(guia?.cajas) ? guia.cajas : []).forEach((caja) => {
          const valor = String(caja || "").trim();
          const clave = obtenerClaveCaja(valor); if (clave) cajasDespachadas.add(clave);
        });
      });
      const cajasPendientesDespacho = Math.max(totalCajas - cajasDespachadas.size, 0);
      const estaCompletamenteCerrado =
        finalizado &&
        porcentajeArmado >= 100 &&
        pendientesArmado <= 0 &&
        cajasPendientesDespacho <= 0;
      return !estaCompletamenteCerrado;
    });
  }, [armadosSeguimiento, guiasPorArmado]);


  const armadosDespachoFiltrados = useMemo(() => {
    const q = normalizeText(filtroDespachoCentro);
    return (armadosFinalizados || []).filter((a) => {
      if (!q) return true;
      const txt = normalizeText(`${a?.centro?.nombre || ""} ${a?.centro?.cliente || ""} ${a?.id_armado || ""}`);
      return txt.includes(q);
    });
  }, [armadosFinalizados, filtroDespachoCentro]);

  const totalDespachosEnTransitoCentro = useMemo(
    () => (guiasSalida || []).filter((g) => normalizeText(g?.estado || "") === "en_transito_centro").length,
    [guiasSalida]
  );

  const guiaCajasDetalleVisible = useMemo(() => {
    const seleccion = new Set((cajasSeleccionadasGuia || []).map((item) => String(item || "").trim()));
    return (guiaCajasDetalle || []).filter((row) => seleccion.has(String(row?.caja || "").trim()));
  }, [guiaCajasDetalle, cajasSeleccionadasGuia]);

  const totalCajasGuiaModal = Math.max(0, (guiaCajasDetalle || []).length);
  const cajasDisponiblesGuiaModal = Math.max(0, (cajasDisponiblesGuia || []).length);
  const cajasYaEnviadasGuiaModal = Math.max(0, totalCajasGuiaModal - cajasDisponiblesGuiaModal);
  const cajasPendientesGuiaModal = Math.max(0, cajasDisponiblesGuiaModal - (cajasSeleccionadasGuia || []).length);

  const despachoRows = useMemo(() => {
    const contarCajasGuia = (cajas = []) => {
      const unicas = new Set();
      (Array.isArray(cajas) ? cajas : []).forEach((caja) => {
        const valor = String(caja || "").trim();
        const clave = obtenerClaveCaja(valor); if (clave) unicas.add(clave);
      });
      return unicas.size;
    };
    return (armadosDespachoFiltrados || []).flatMap((armado) => {
      const armadoId = Number(armado?.id_armado || 0);
      const guiasArmado = Array.isArray(guiasPorArmado.get(armadoId)) ? guiasPorArmado.get(armadoId) : [];
      const cajasDespachadas = new Set();
      guiasArmado.forEach((guia) => {
        (Array.isArray(guia?.cajas) ? guia.cajas : []).forEach((caja) => {
          const valor = String(caja || "").trim();
          const clave = obtenerClaveCaja(valor); if (clave) cajasDespachadas.add(clave);
        });
      });
      const totalCajas = Number(armado?.total_cajas || 0);
      const cajasPendientes = Math.max(totalCajas - cajasDespachadas.size, 0);
      const rows = guiasArmado.map((guia) => ({
        tipoFila: "guia",
        rowKey: `desp-${armadoId}-${guia?.id_guia_salida || guia?.numero_guia || Math.random()}`,
        armado,
        guia,
        totalCajas,
        cajasFila: contarCajasGuia(guia?.cajas),
      }));
      if (!guiasArmado.length || cajasPendientes > 0) {
        rows.unshift({
          tipoFila: "pendiente",
          rowKey: `desp-pend-${armadoId}`,
          armado,
          guia: null,
          totalCajas,
          cajasFila: cajasPendientes || totalCajas,
        });
      }
      return rows;
    });
  }, [armadosDespachoFiltrados, guiasPorArmado]);

  const algunToggleLogisticaActivo =
    mostrarTablaTransito || mostrarTablaBodega || mostrarTablaAsignaciones || mostrarTablaBajas || mostrarTablaDespachos || mostrarTablaCentros;

  const armadosSeguimientoResumen = useMemo(() => {
    const lista = Array.isArray(armadosSeguimientoVisibles) ? armadosSeguimientoVisibles : [];
    const enPreparacion = lista.filter((a) => normalizeText(a?.estado || "") !== "finalizado");
    const listos = lista.filter((a) => normalizeText(a?.estado || "") === "finalizado");
    return { enPreparacion, listos };
  }, [armadosSeguimientoVisibles]);

  const canGestionarAsignaciones = useMemo(() => {
    const rol = String(usuario?.rol || "").toLowerCase();
    return ["admin", "superadmin", "bodega", "operaciones", "almacen", "logistica", "logístico"].includes(rol);
  }, [usuario]);
  const esAdminBodega = useMemo(() => {
    const rol = String(usuario?.rol || "").toLowerCase();
    return ["admin", "superadmin"].includes(rol);
  }, [usuario]);

  const codigosExistentesSet = useMemo(() => {
    const set = new Set();
    (inventarioEquiposBase || []).forEach((x) => {
      const c = String(x.codigo || "").trim().toUpperCase();
      if (c) set.add(c);
    });
    (inventarioManual || []).forEach((x) => {
      const c = String(x.codigo || "").trim().toUpperCase();
      if (c) set.add(c);
    });
    return set;
  }, [inventarioEquiposBase, inventarioManual]);

  const seriesExistentesSet = useMemo(() => {
    const set = new Set();
    (inventarioEquiposBase || []).forEach((x) => {
      const s = String(x.numero_serie || "").trim().toUpperCase();
      if (s) set.add(s);
    });
    (inventarioManual || []).forEach((x) => {
      const s = String(x.numero_serie || "").trim().toUpperCase();
      if (s) set.add(s);
    });
    return set;
  }, [inventarioEquiposBase, inventarioManual]);

  const extraerInfoCodigo = (codigoRaw) => {
    const codigo = String(codigoRaw || "").trim();
    const m = codigo.match(/^(.*?)(\d+)$/);
    if (!m) return null;
    return {
      prefix: m[1] || "",
      number: Number(m[2]),
      width: String(m[2]).length,
    };
  };

  const codigoExiste = (codigoRaw) => codigosExistentesSet.has(String(codigoRaw || "").trim().toUpperCase());

  const ultimoCodigoRegistrado = (codigoBase) => {
    const info = extraerInfoCodigo(codigoBase);
    if (!info) return "";
    const re = new RegExp(`^${info.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d{${info.width}})$`, "i");
    let max = info.number;
    codigosExistentesSet.forEach((c) => {
      const mm = String(c).match(re);
      if (mm?.[1]) {
        const n = Number(mm[1]);
        if (n > max) max = n;
      }
    });
    return `${info.prefix}${String(max).padStart(info.width, "0")}`;
  };

  const generarCodigosDisponibles = (codigoBase, cantidad) => {
    const qty = Math.max(1, Number(cantidad || 1));
    const base = String(codigoBase || "").trim();
    const usados = codigosExistentesSet;
    const out = [];
    if (!base) return out;

    const info = extraerInfoCodigo(base);
    if (!info) {
      if (qty === 1 && !usados.has(base.toUpperCase())) return [base];
      if (qty === 1 && usados.has(base.toUpperCase())) return [];
      let i = 1;
      while (out.length < qty) {
        const candidate = `${base}-${i}`;
        if (!usados.has(candidate.toUpperCase())) out.push(candidate);
        i += 1;
      }
      return out;
    }

    const build = (n) => `${info.prefix}${String(n).padStart(info.width, "0")}`;
    let cursor = info.number;
    if (usados.has(base.toUpperCase())) cursor += 1;

    while (out.length < qty) {
      const candidate = build(cursor);
      if (!usados.has(candidate.toUpperCase()) && !out.includes(candidate)) out.push(candidate);
      cursor += 1;
    }
    return out;
  };

  const esCodigoFamilia = (codigoRaw) => /^\d{3,}$/.test(String(codigoRaw || "").trim());

  const generarSeriesDisponiblesPorCodigo = (codigoBase, cantidad) => {
    const qty = Math.max(1, Number(cantidad || 1));
    const base = String(codigoBase || "").trim();
    if (!base) return [];
    const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d{4})$`, "i");
    let max = 0;
    seriesExistentesSet.forEach((serie) => {
      const mm = String(serie).match(re);
      if (mm?.[1]) {
        const n = Number(mm[1]);
        if (n > max) max = n;
      }
    });
    const out = [];
    let curr = max + 1;
    while (out.length < qty) {
      out.push(`${base}${String(curr).padStart(4, "0")}`);
      curr += 1;
    }
    return out;
  };

  const codigosSugeridosIngreso = useMemo(
    () =>
      esCodigoFamilia(nuevoEquipo.codigo)
        ? generarSeriesDisponiblesPorCodigo(nuevoEquipo.codigo, nuevoEquipo.cantidad)
        : generarCodigosDisponibles(nuevoEquipo.codigo, nuevoEquipo.cantidad),
    [nuevoEquipo.codigo, nuevoEquipo.cantidad, codigosExistentesSet, seriesExistentesSet]
  );

  const totalRevisionActiva = useMemo(() => {
    let total = 0;
    (Array.isArray(ordenesRevision) ? ordenesRevision : []).forEach((o) => {
      if (String(o?.estado || "").toLowerCase() !== "cerrado") total += 1;
    });
    return total;
  }, [ordenesRevision]);

  const getBadgeEstado = (estado) => {
    const e = String(estado || "");
    if (e === "en_bodega") return <span className="badge badge-success">En bodega</span>;
    if (e === "en_transito") return <span className="badge badge-warning">En transito</span>;
    return <span className="badge badge-secondary">Retirado del centro</span>;
  };

  const getBadgeEstadoUsoInstalacion = (estado) => {
    const e = normalizeText(estado || "instalado");
    if (e === "devuelto_bodega") return <span className="badge badge-warning">Devuelto a bodega</span>;
    return <span className="badge badge-success">Instalado</span>;
  };

  const getBadgeLogisticaInstalacion = (estadoLogistico, estadoUso = "instalado") => {
    const uso = normalizeText(estadoUso || "instalado");
    const estado = normalizeText(estadoLogistico || "sin_movimiento");
    if (uso !== "devuelto_bodega") return <span className="badge badge-success">Operativo en centro</span>;
    if (estado === "en_transito_bodega") return <span className="badge badge-warning">En transito a bodega</span>;
    if (estado === "recepcionado_bodega") return <span className="badge badge-success">Recepcionado en bodega</span>;
    if (estado === "revision_bodega") return <span className="badge badge-info">En revision</span>;
    if (estado === "baja_bodega") return <span className="badge badge-danger">Baja</span>;
    return <span className="badge badge-secondary">Sin movimiento</span>;
  };

  const confirmarRecepcion = async () => {
    if (!seleccionado?.id_retiro_terreno) return;
    setSavingId(seleccionado.id_retiro_terreno);
    try {
      await recepcionarRetiroEnBodega(seleccionado.id_retiro_terreno, {
        recepcion_bodega_por: usuario.nombre,
        recepcion_bodega_user_id: usuario.id,
        observacion_bodega: observacionBodega || null,
        equipos: equiposRecepcion.map((eq) => ({
          id_retiro_equipo: eq.id_retiro_equipo,
          recibido_bodega: !!eq.recibido_bodega,
        })),
      });
      setSeleccionado(null);
      setObservacionBodega("");
      setEquiposRecepcion([]);
      await cargarRetiros();
    } catch {
      alert("No se pudo recepcionar en bodega.");
    } finally {
      setSavingId(null);
    }
  };

  const confirmarRecepcionDevolucionInstalacion = async (row) => {
    const actaId = Number(row?.acta?.id_acta_entrega || 0);
    if (!actaId) return;
    setSavingId(`acta-${actaId}`);
    try {
      const equiposActuales = Array.isArray(row?.acta?.armado_equipos) ? row.acta.armado_equipos : [];
      const equiposRecepcionados = equiposActuales.map((item) => {
        if (
          normalizeText(item?.estado_uso || "") === "devuelto_bodega" &&
          normalizeText(item?.estado_logistico || "") === "en_transito_bodega"
        ) {
          return {
            ...item,
            estado_logistico: "recepcionado_bodega",
            recepcion_bodega_por: usuario.nombre || "Bodega",
            fecha_recepcion_bodega: new Date().toISOString(),
          };
        }
        return item;
      });
      await actualizarActaEntrega(actaId, { armado_equipos: equiposRecepcionados });
      await cargarRetiros();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo recepcionar la devolucion en bodega.");
    } finally {
      setSavingId(null);
    }
  };

  const confirmarRecepcionDevolucionMantencion = async (row) => {
    const cambioId = Number(row?.cambio?.id_cambio_equipo_mantencion || 0);
    if (!cambioId) return;
    setSavingId(`mant-${cambioId}`);
    try {
      await actualizarEstadoCambioEquipoMantencion(cambioId, {
        estado_logistico: "recepcionado_bodega",
        recepcion_bodega_por: usuario.nombre || "Bodega",
      });
      await cargarRetiros();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo recepcionar la devolución de mantención.");
    } finally {
      setSavingId(null);
    }
  };

  const actualizarEstadoDevolucionInstalacion = async (row, transformador) => {
    const actaId = Number(row?.acta?.id_acta_entrega || 0);
    if (!actaId) return;
    const equiposActuales = Array.isArray(row?.acta?.armado_equipos) ? row.acta.armado_equipos : [];
    const clavesObjetivo = new Set((Array.isArray(row?.equipos) ? row.equipos : []).map((item) => obtenerClaveEquipoActa(item)));
    const actualizados = equiposActuales.map((item) => {
      if (!clavesObjetivo.has(obtenerClaveEquipoActa(item))) return item;
      return transformador(item);
    });
    await actualizarActaEntrega(actaId, { armado_equipos: actualizados });
  };

  const abrirRevisionDevolucionInstalacion = (row) => {
    const equipos = (Array.isArray(row?.equipos) ? row.equipos : []).map((eq, idx) => ({
      id_retiro_equipo: `acta-${row?.acta?.id_acta_entrega || 0}-${idx}`,
      equipo_nombre: eq?.nombre || "-",
      numero_serie: eq?.numero_serie || "",
      codigo: eq?.codigo || "",
      area: "",
      bloqueado: false,
    }));
    setRevisionEquiposArea(equipos);
    setRetiroRevision({
      tipoFuente: "instalacion_bodega",
      id_acta_entrega: row?.acta?.id_acta_entrega || null,
      acta: row?.acta || null,
      centro: row?.acta?.centro || "-",
      empresa: row?.acta?.empresa || row?.acta?.cliente || "-",
      row,
    });
  };

  const abrirRevisionDevolucionMantencion = (row) => {
    const cambio = row?.cambio || {};
    setRevisionEquiposArea([
      {
        id_retiro_equipo: `mant-${cambio?.id_cambio_equipo_mantencion || 0}`,
        equipo_nombre: cambio?.equipo || "-",
        numero_serie: cambio?.serie_anterior || "",
        codigo: cambio?.codigo_anterior || "",
        area: "",
        bloqueado: false,
      },
    ]);
    setRetiroRevision({
      tipoFuente: "mantencion_bodega",
      mantencion: row?.mantencion || null,
      cambio,
      centro: row?.mantencion?.centro || "-",
      empresa: row?.mantencion?.empresa || row?.mantencion?.cliente || "-",
      row,
    });
  };

  const enviarDevolucionInstalacionABaja = async (row) => {
    const actaId = Number(row?.acta?.id_acta_entrega || 0);
    if (!actaId) return;
    if (!window.confirm("Enviar estos equipos a baja?")) return;
    setSavingId(`acta-baja-${actaId}`);
    try {
      await actualizarEstadoDevolucionInstalacion(row, (item) => ({
        ...item,
        estado_logistico: "baja_bodega",
      }));
      await cargarRetiros();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo enviar la devolucion a baja.");
    } finally {
      setSavingId(null);
    }
  };

  const volverDevolucionInstalacionATransito = async (row) => {
    const actaId = Number(row?.acta?.id_acta_entrega || 0);
    if (!actaId) return;
    if (!window.confirm("Volver estos equipos a transito hacia bodega?")) return;
    setSavingId(`acta-trans-${actaId}`);
    try {
      await actualizarEstadoDevolucionInstalacion(row, (item) => ({
        ...item,
        estado_logistico: "en_transito_bodega",
      }));
      await cargarRetiros();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo volver la devolucion a transito.");
    } finally {
      setSavingId(null);
    }
  };

  const enviarDevolucionMantencionABaja = async (row) => {
    const cambioId = Number(row?.cambio?.id_cambio_equipo_mantencion || 0);
    if (!cambioId) return;
    if (!window.confirm("Enviar este equipo a baja?")) return;
    setSavingId(`mant-baja-${cambioId}`);
    try {
      await actualizarEstadoCambioEquipoMantencion(cambioId, {
        estado_logistico: "baja_bodega",
      });
      await cargarRetiros();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo enviar la devolución de mantención a baja.");
    } finally {
      setSavingId(null);
    }
  };

  const volverDevolucionMantencionATransito = async (row) => {
    const cambioId = Number(row?.cambio?.id_cambio_equipo_mantencion || 0);
    if (!cambioId) return;
    if (!window.confirm("Volver este equipo a transito hacia bodega?")) return;
    setSavingId(`mant-trans-${cambioId}`);
    try {
      await actualizarEstadoCambioEquipoMantencion(cambioId, {
        estado_logistico: "en_transito_bodega",
      });
      await cargarRetiros();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo volver la devolución de mantención a tránsito.");
    } finally {
      setSavingId(null);
    }
  };

  const eliminarDevolucionInstalacionEnBodega = async (row) => {
    const actaId = Number(row?.acta?.id_acta_entrega || 0);
    if (!actaId) return;
    if (!window.confirm("Cancelar esta devolucion y dejar los equipos como instalados?")) return;
    setSavingId(`acta-cancel-${actaId}`);
    try {
      await actualizarEstadoDevolucionInstalacion(row, (item) => ({
        ...item,
        estado_uso: "instalado",
        estado_logistico: "sin_movimiento",
        recepcion_bodega_por: null,
        fecha_recepcion_bodega: null,
      }));
      await cargarRetiros();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo cancelar la devolucion de bodega.");
    } finally {
      setSavingId(null);
    }
  };
  const cancelarDevolucionInstalacionEnBodega = eliminarDevolucionInstalacionEnBodega;

  const eliminarDevolucionMantencionEnBodega = async (row) => {
    const cambioId = Number(row?.cambio?.id_cambio_equipo_mantencion || 0);
    if (!cambioId) return;
    if (!window.confirm("Eliminar este registro logístico de bodega para el equipo devuelto?")) return;
    setSavingId(`mant-del-${cambioId}`);
    try {
      await actualizarEstadoCambioEquipoMantencion(cambioId, {
        estado_logistico: "eliminado",
      });
      await cargarRetiros();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo eliminar la devolución de mantención.");
    } finally {
      setSavingId(null);
    }
  };
  const asignarEquipoATecnico = async (row) => {
    const id = Number(row?.id_bodega_equipo || 0);
    const tecnicoId = Number(tecnicoAsignacionId || 0);
    if (!id || !tecnicoId) {
      alert("Selecciona un tecnico.");
      return;
    }
    setAsignandoEquipoId(id);
    try {
      await asignarInventarioBodegaATecnico(id, {
        tecnico_id: tecnicoId,
        observacion: obsAsignacion || null,
      });
      setTecnicoAsignacionId("");
      setObsAsignacion("");
      await cargarInventarioManual();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo asignar el equipo.");
    } finally {
      setAsignandoEquipoId(null);
    }
  };

  const devolverEquipoABodega = async (row) => {
    const id = Number(row?.id_bodega_equipo || 0);
    if (!id) return;
    if (!window.confirm("Confirmar devolucion del equipo a bodega?")) return;
    setAsignandoEquipoId(id);
    try {
      await devolverInventarioBodegaDesdeTecnico(id, {});
      await cargarInventarioManual();
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo devolver el equipo.");
    } finally {
      setAsignandoEquipoId(null);
    }
  };

  const toggleSoloTransito = () => {
    setMostrarTablaTransito((prev) => {
      const next = !prev;
      setMostrarTablaBodega(false);
      setMostrarTablaAsignaciones(false);
      setMostrarTablaBajas(false);
      setMostrarTablaDespachos(false);
      setMostrarTablaCentros(false);
      return next;
    });
  };

  const toggleSoloBodega = () => {
    setMostrarTablaBodega((prev) => {
      const next = !prev;
      setMostrarTablaTransito(false);
      setMostrarTablaAsignaciones(false);
      setMostrarTablaBajas(false);
      setMostrarTablaDespachos(false);
      setMostrarTablaCentros(false);
      return next;
    });
  };

  const toggleSoloAsignaciones = () => {
    setMostrarTablaAsignaciones((prev) => {
      const next = !prev;
      setMostrarTablaTransito(false);
      setMostrarTablaBodega(false);
      setMostrarTablaBajas(false);
      setMostrarTablaDespachos(false);
      setMostrarTablaCentros(false);
      return next;
    });
  };

  const toggleSoloBajas = () => {
    setMostrarTablaBajas((prev) => {
      const next = !prev;
      setMostrarTablaTransito(false);
      setMostrarTablaBodega(false);
      setMostrarTablaAsignaciones(false);
      setMostrarTablaDespachos(false);
      setMostrarTablaCentros(false);
      return next;
    });
  };

  const toggleSoloDespachos = () => {
    setMostrarTablaDespachos((prev) => {
      const next = !prev;
      setMostrarTablaTransito(false);
      setMostrarTablaBodega(false);
      setMostrarTablaAsignaciones(false);
      setMostrarTablaBajas(false);
      setMostrarTablaCentros(false);
      return next;
    });
  };

  const toggleSoloCentros = () => {
    setMostrarTablaCentros((prev) => {
      const next = !prev;
      setMostrarTablaTransito(false);
      setMostrarTablaBodega(false);
      setMostrarTablaAsignaciones(false);
      setMostrarTablaBajas(false);
      setMostrarTablaDespachos(false);
      return next;
    });
  };

  const abrirHistorialEquipoTrabajo = (item) => {
    const serieClave = String(item?.serie || "").trim().toUpperCase();
    if (!serieClave) return;

    const rows = (Array.isArray(actasEntrega) ? actasEntrega : [])
      .flatMap((acta) => {
        const equipos = Array.isArray(acta?.armado_equipos) ? acta.armado_equipos : [];
        const permiso = permisosPorActaId.get(Number(acta?.id_acta_entrega || 0)) || null;
        return equipos
          .filter((eq) => String(eq?.numero_serie || "").trim().toUpperCase() === serieClave)
          .map((eq, idx) => ({
            rowKey: `hist-eq-${acta?.id_acta_entrega || "0"}-${idx}-${serieClave}`,
            fecha: acta?.fecha_registro || acta?.updated_at || acta?.created_at || null,
            cliente: acta?.empresa || acta?.cliente || "-",
            centro: acta?.centro || "-",
            actaId: acta?.id_acta_entrega || null,
            permisoId: permiso?.id_permiso_trabajo || null,
            tipoInstalacion:
              normalizeText(acta?.tipo_instalacion || "") === "reapuntamiento" ? "Reapuntamiento" : "Instalacion",
            tecnico: [acta?.tecnico_1, acta?.tecnico_2]
              .map((value) => String(value || "").trim())
              .filter(Boolean)
              .join(", ") || "-",
            estado_uso: eq?.estado_uso || "instalado",
            estado_logistico: eq?.estado_logistico || "sin_movimiento",
            recepcion_bodega_por: eq?.recepcion_bodega_por || "-",
            fecha_recepcion_bodega: eq?.fecha_recepcion_bodega || null,
          }));
      })
      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());

    const instalaciones = rows.filter((row) => normalizeText(row?.estado_uso || "") !== "devuelto_bodega").length;
    const devoluciones = rows.filter((row) => normalizeText(row?.estado_uso || "") === "devuelto_bodega").length;
    const pasoBodega = rows.some((row) => normalizeText(row?.estado_logistico || "") !== "sin_movimiento");

    setHistorialEquipo({
      serie: item?.serie || "-",
      equipo: item?.equipo || "Equipo",
      codigo: item?.codigo || "-",
      clienteActual: item?.cliente || "-",
      centroActual: item?.centro || "-",
      fechaInstalacionActual: item?.fechaInstalacion || null,
      instalaciones,
      devoluciones,
      pasoBodega,
      rows,
    });
  };

  const aplicarDetalleGuiaEnModal = (armado, rows, guiaExistente = null, modoEdicion = false) => {
    setGuiaCajasDetalle(rows);
    const cajasPropias = new Set(
      (Array.isArray(guiaExistente?.cajas) ? guiaExistente.cajas : [])
        .map((caja) => obtenerClaveCaja(caja))
        .filter(Boolean)
    );
    const cajasOcupadas = new Set();
    (Array.isArray(guiasPorArmado.get(Number(armado?.id_armado || 0))) ? guiasPorArmado.get(Number(armado?.id_armado || 0)) : [])
      .filter((item) => Number(item?.id_guia_salida || 0) !== Number(guiaExistente?.id_guia_salida || 0))
      .forEach((item) => {
        (Array.isArray(item?.cajas) ? item.cajas : []).forEach((caja) => {
          const valor = obtenerClaveCaja(caja);
          if (valor) cajasOcupadas.add(valor);
        });
      });
    const disponibles = rows
      .filter((row) => row?.caja && (!cajasOcupadas.has(row.cajaClave) || cajasPropias.has(row.cajaClave)))
      .map((row) => row.caja);
    const seleccionInicial = modoEdicion
      ? cajasPropias.size
        ? rows.filter((row) => disponibles.includes(row.caja) && cajasPropias.has(row.cajaClave)).map((row) => row.caja)
        : [...disponibles]
      : cajasPropias.size
        ? rows.filter((row) => cajasPropias.has(row.cajaClave)).map((row) => row.caja)
        : [...disponibles];
    setCajasDisponiblesGuia(disponibles);
    setCajasSeleccionadasGuia(seleccionInicial);
  };

  const abrirModalGuia = async (armado, guiaExistente = null, modoEdicion = false) => {
    setArmadoGuia(armado);
    setGuiaSeleccionadaId(Number(guiaExistente?.id_guia_salida || 0) || null);
    setVerCodigoGuia(false);
    setModoEdicionGuia(modoEdicion);
    setFormGuia({
      numero_guia:
        String(guiaExistente?.numero_guia || "").trim() ||
        `GS-${String(armado?.id_armado || "").padStart(4, "0")}-${((Array.isArray(guiasPorArmado.get(Number(armado?.id_armado || 0))) ? guiasPorArmado.get(Number(armado?.id_armado || 0)).length : 0) + 1)
          .toString()
          .padStart(2, "0")}`,
      fecha_salida:
        String(guiaExistente?.fecha_salida || "").trim() ||
        new Date().toISOString().slice(0, 10),
      observacion: String(guiaExistente?.observacion || "").trim(),
      modalidad_salida: normalizarModalidadSalida(guiaExistente?.modalidad_salida || "transportista_externo"),
    });
    setLoadingGuiaCajas(true);
    const armadoId = Number(armado?.id_armado || 0);
    const rowsCache = guiaDetalleCacheRef.current.get(armadoId);
    if (Array.isArray(rowsCache) && rowsCache.length) {
      aplicarDetalleGuiaEnModal(armado, rowsCache, guiaExistente, modoEdicion);
      setLoadingGuiaCajas(false);
      setShowGuiaModal(true);
      return;
    }
    try {
      const [materiales, movimientos, equiposCentro, historialEquipos] = await Promise.all([
        obtenerMaterialesArmado(Number(armado?.id_armado || 0)),
        obtenerMovimientosArmado(Number(armado?.id_armado || 0)),
        obtenerEquipos(Number(armado?.centro_id || armado?.centro?.id_centro || 0)),
        obtenerHistorialEquiposArmado(Number(armado?.id_armado || 0)).catch(() => null),
      ]);
      const seriesPorNombre = new Map();
      (Array.isArray(historialEquipos?.resumen) ? historialEquipos.resumen : []).forEach((r) => {
        const nombre = String(r?.nombre_item || "").trim();
        const serie = String(r?.serie_actual || "").trim();
        if (!nombre || !serie || serie === "-") return;
        const key = normalizeText(nombre);
        if (!seriesPorNombre.has(key)) seriesPorNombre.set(key, []);
        seriesPorNombre.get(key).push(serie);
      });
      const tomarSerieHistorial = (nombre) => {
        const key = normalizeText(String(nombre || ""));
        const lista = seriesPorNombre.get(key);
        if (!Array.isArray(lista) || !lista.length) return "";
        return String(lista.shift() || "").trim();
      };
      const grouped = {};
      (Array.isArray(materiales) ? materiales : []).forEach((m) => {
        const cajaRaw = String(m?.caja || "").trim();
        if (!esCajaValida(cajaRaw)) return;
        const qty = Number(m?.cantidad || 0);
        if (qty <= 0) return;
        const cajaClave = obtenerClaveCaja(cajaRaw);
        if (!cajaClave) return;
        if (!grouped[cajaClave]) grouped[cajaClave] = { caja: cajaRaw, cajaClave, materiales: [], equipos: [] };
        grouped[cajaClave].caja = elegirEtiquetaCaja(grouped[cajaClave].caja, cajaRaw);
        grouped[cajaClave].materiales.push({
          nombre: m?.nombre || "Item",
          cantidad: qty,
          serie: "",
        });
      });
      // Equipos del armado: prioriza movimientos con caja valida (evita arrastrar "sin caja").
      const vistos = new Set();
      (Array.isArray(movimientos) ? movimientos : [])
        .filter((m) => String(m?.tipo || "").toLowerCase() === "equipo" && Number(m?.cantidad || 0) > 0)
        .forEach((m) => {
          const cajaRaw = String(m?.caja || "").trim();
          if (!esCajaValida(cajaRaw)) return;
          const nombre = String(m?.nombre_item || "Equipo").trim();
          let serie = String(m?.numero_serie || m?.serie || m?.n_serie || "").trim();
          if (!serie) serie = tomarSerieHistorial(nombre);
          const key = `${cajaRaw}|${nombre}|${serie}`;
          if (vistos.has(key)) return;
          vistos.add(key);
          const cajaClave = obtenerClaveCaja(cajaRaw);
          if (!cajaClave) return;
          if (!grouped[cajaClave]) grouped[cajaClave] = { caja: cajaRaw, cajaClave, materiales: [], equipos: [] };
          grouped[cajaClave].caja = elegirEtiquetaCaja(grouped[cajaClave].caja, cajaRaw);
          grouped[cajaClave].equipos.push({
            nombre,
            cantidad: Number(m?.cantidad || 0) || 1,
            serie,
            codigo: String(m?.codigo || "").trim(),
          });
        });
      // Fallback: si no hay movimientos, usa equipos actuales del centro con caja valida.
      if (!Object.values(grouped).some((x) => (x.equipos || []).length > 0)) {
        (Array.isArray(equiposCentro) ? equiposCentro : []).forEach((e) => {
          const cajaRaw = String(e?.caja || "").trim();
          if (!esCajaValida(cajaRaw)) return;
          const cajaClave = obtenerClaveCaja(cajaRaw);
          if (!cajaClave) return;
          if (!grouped[cajaClave]) grouped[cajaClave] = { caja: cajaRaw, cajaClave, materiales: [], equipos: [] };
          grouped[cajaClave].caja = elegirEtiquetaCaja(grouped[cajaClave].caja, cajaRaw);
          let serie = String(e?.numero_serie || e?.serie || e?.n_serie || "").trim();
          if (!serie) serie = tomarSerieHistorial(e?.nombre || "Equipo");
          grouped[cajaClave].equipos.push({
            nombre: e?.nombre || "Equipo",
            cantidad: 1,
            serie,
            codigo: String(e?.codigo || "").trim(),
          });
        });
      }
      const rows = Object.values(grouped)
        .sort((a, b) => String(a?.caja || "").localeCompare(String(b?.caja || ""), "es", { numeric: true }))
        .map((row) => ({
          caja: String(row?.caja || "").trim(),
          cajaClave: row?.cajaClave || obtenerClaveCaja(row?.caja || ""),
          materiales: row?.materiales || [],
          equipos: row?.equipos || [],
        }));
      guiaDetalleCacheRef.current.set(armadoId, rows);
      aplicarDetalleGuiaEnModal(armado, rows, guiaExistente, modoEdicion);
    } catch {
      setGuiaCajasDetalle([]);
      setCajasDisponiblesGuia([]);
      setCajasSeleccionadasGuia([]);
    } finally {
      setLoadingGuiaCajas(false);
    }
    setShowGuiaModal(true);
  };

  const eliminarGuiaSalida = async (guia) => {
    if (!esAdminBodega) return;
    if (!window.confirm("¿Eliminar este despacho? Se quitará la guía guardada del armado.")) return;
    try {
      const idGuia = Number(guia?.id_guia_salida || 0);
      if (idGuia) {
        await eliminarGuiaSalidaArmadoPorId(idGuia);
        setGuiasSalida((prev) => (prev || []).filter((g) => Number(g?.id_guia_salida || 0) !== idGuia));
      } else {
        const armadoId = Number(guia?.armado_id || 0);
        await eliminarGuiaSalidaArmado(armadoId);
        setGuiasSalida((prev) => (prev || []).filter((g) => Number(g?.armado_id || 0) !== armadoId));
      }
    } catch {
      alert("No se pudo eliminar el despacho.");
    }
  };

  const guardarGuiaSalida = async () => {
    if (!armadoGuia?.id_armado) return;
    const armadoId = Number(armadoGuia.id_armado);
    const cajasDisponiblesMap = new Map();
    (cajasDisponiblesGuia || []).forEach((caja) => {
      const nombre = String(caja || "").trim();
      const clave = obtenerClaveCaja(nombre);
      if (nombre && clave && !cajasDisponiblesMap.has(clave)) {
        cajasDisponiblesMap.set(clave, nombre);
      }
    });
    const cajas = [];
    const cajasVistas = new Set();
    (cajasSeleccionadasGuia || []).forEach((caja) => {
      const nombre = String(caja || "").trim();
      const clave = obtenerClaveCaja(nombre);
      if (!nombre || !clave || cajasVistas.has(clave)) return;
      const disponible = cajasDisponiblesMap.get(clave);
      if (!disponible) return;
      cajas.push(disponible);
      cajasVistas.add(clave);
    });
    if (!cajas.length) {
      alert("Debes seleccionar al menos una caja para el despacho.");
      return;
    }
    const payload = {
      armado_id: armadoId,
      numero_guia: String(formGuia.numero_guia || "").trim() || `GS-${String(armadoId).padStart(4, "0")}`,
      fecha_salida: formGuia.fecha_salida || new Date().toISOString().slice(0, 10),
      observacion: String(formGuia.observacion || "").trim(),
      estado: "en_transito_centro",
      tipo_despacho: cajas.length === cajasDisponiblesGuiaModal && cajasYaEnviadasGuiaModal === 0 ? "total" : "parcial",
      modalidad_salida: normalizarModalidadSalida(formGuia.modalidad_salida || "transportista_externo"),
      cajas,
      centro: armadoGuia?.centro?.nombre || "",
      cliente: armadoGuia?.centro?.cliente || "",
      updated_at: new Date().toISOString(),
    };
    try {
      const guardada = guiaSeleccionadaId
        ? await actualizarGuiaSalidaArmadoPorId(guiaSeleccionadaId, payload)
        : await crearGuiaSalidaArmado(payload);
      setGuiasSalida((prev) => {
        const lista = prev || [];
        if (guiaSeleccionadaId) {
          return lista.map((g) => (Number(g?.id_guia_salida || 0) === guiaSeleccionadaId ? guardada : g));
        }
        return [guardada, ...lista];
      });
      setShowGuiaModal(false);
      setArmadoGuia(null);
      setGuiaSeleccionadaId(null);
    } catch (error) {
      const mensaje =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "No se pudo guardar la guía de despacho.";
      alert(mensaje);
    }
  };
  const marcarRecepcionCentro = async (guia) => {
    try {
      const idGuia = Number(guia?.id_guia_salida || 0);
      const actualizada = idGuia
        ? await marcarRecepcionCentroGuiaArmadoPorId(idGuia, {
            fecha_recepcion_centro: new Date().toISOString(),
          })
        : await marcarRecepcionCentroGuiaArmado(Number(guia?.armado_id || 0), {
        fecha_recepcion_centro: new Date().toISOString(),
      });
      setGuiasSalida((prev) =>
        (prev || []).map((g) =>
          Number(g?.id_guia_salida || 0) === Number(actualizada?.id_guia_salida || 0) ||
          (!idGuia && Number(g?.armado_id || 0) === Number(guia?.armado_id || 0))
            ? actualizada
            : g
        )
      );
    } catch {
      alert("No se pudo marcar la recepción en centro.");
    }
  };

  const imprimirGuiaSalida = () => {
    if (!armadoGuia) return;
    const numeroGuia = String(formGuia.numero_guia || `GS-${String(armadoGuia.id_armado || "").padStart(4, "0")}`);
    const fechaSalida = formGuia.fecha_salida || new Date().toISOString().slice(0, 10);
    const cliente = armadoGuia?.centro?.cliente || "-";
    const centro = armadoGuia?.centro?.nombre || "-";
    const tecnicoPrincipal = armadoGuia?.tecnico?.nombre || "-";
    const tecnicoApoyo = Array.isArray(armadoGuia?.tecnicos_asignados)
      ? armadoGuia.tecnicos_asignados.filter((tec) => !tec?.principal).map((tec) => tec?.nombre).filter(Boolean).join(", ")
      : "";
    const tecnico = tecnicoApoyo ? `${tecnicoPrincipal} | Apoyo: ${tecnicoApoyo}` : tecnicoPrincipal;
    const totalCajas = Number((guiaCajasDetalleVisible || []).length || 0);
    const observacion = String(formGuia.observacion || "").trim() || "-";
    const detalleCajasHtml = (guiaCajasDetalleVisible || []).length
      ? guiaCajasDetalleVisible
          .map((row) => {
            const mats = (row.materiales || []).map((it) => `<li>${escHtml(it.nombre)} x${escHtml(it.cantidad)}</li>`).join("");
            const eqs = (row.equipos || [])
              .map((it) => {
                const serieTxt = String(it?.serie || "").trim();
                return `<li>${escHtml(it.nombre)} x${escHtml(it.cantidad)}${serieTxt ? ` - N Serie: ${escHtml(serieTxt)}` : ""}</li>`;
              })
              .join("");
            const totalEquipos = (row.equipos || []).reduce((acc, it) => acc + Number(it.cantidad || 0), 0);
            const totalMateriales = (row.materiales || []).reduce((acc, it) => acc + Number(it.cantidad || 0), 0);
            const totalItems = totalEquipos + totalMateriales;
            return `<tr>
              <td>${escHtml(row.caja)}</td>
              <td>
                <div><b>Total:</b> ${escHtml(totalItems)}</div>
                <div><b>Equipos:</b> ${escHtml(totalEquipos)}</div>
                <div><b>Materiales:</b> ${escHtml(totalMateriales)}</div>
              </td>
              <td>
                <div><b>Equipos:</b>${eqs ? `<ul style="margin:4px 0 0 16px;padding:0;">${eqs}</ul>` : " -"}</div>
                ${mats ? `<div style="margin-top:6px;"><b>Materiales:</b><ul style="margin:4px 0 0 16px;padding:0;">${mats}</ul></div>` : ""}
              </td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="3">Sin detalle de contenido registrado.</td></tr>`;
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Guia de salida ${escHtml(numeroGuia)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 26px; color: #0f172a; }
          .doc { border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
          .head { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; padding: 14px 16px; background: #eff6ff; border-bottom: 1px solid #cbd5e1; align-items: center; }
          .title { font-weight: 800; font-size: 18px; color: #1e3a8a; }
          .meta { font-size: 12px; color: #334155; margin-top: 3px; }
          .orca { font-size: 12px; text-align: right; line-height: 1.3; }
          .orca-logo { display: inline-flex; flex-direction: column; align-items: center; gap: 4px; }
          .orca-row { display: inline-flex; border-radius: 4px; overflow: hidden; border: 1px solid #93c5fd; }
          .orca-cell { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; background: #2563eb; color: #fff; font-weight: 800; font-size: 11px; border-right: 1px solid rgba(255,255,255,0.35); }
          .orca-cell:last-child { border-right: 0; }
          .orca-sub { font-size: 10px; letter-spacing: .14em; color: #1e40af; font-weight: 700; text-transform: uppercase; }
          .body { padding: 14px 16px; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; }
          .field { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
          .field b { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 3px; }
          .section-title { margin: 14px 0 8px; font-weight: 700; color: #1e3a8a; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; }
          th { background: #f1f5f9; color: #334155; }
          .foot { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .sign { min-height: 110px; display: flex; flex-direction: column; justify-content: flex-end; text-align: center; font-size: 12px; color: #475569; }
          .sign::before { content: ""; display: block; border-top: 1px solid #94a3b8; margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="doc">
          <div class="head">
            <div class="orca-logo">
              <div class="orca-row">
                <div class="orca-cell">O</div>
                <div class="orca-cell">R</div>
                <div class="orca-cell">C</div>
                <div class="orca-cell">A</div>
              </div>
              <div class="orca-sub">Tecnologia</div>
            </div>
            <div>
              <div class="title">GUIA DE SALIDA A CENTRO</div>
              <div class="meta">N guia: ${escHtml(numeroGuia)}</div>
              <div class="meta">Fecha salida: ${escHtml(formatDate(fechaSalida))}</div>
            </div>
            <div class="orca">
              <b>Orca Tecnologia</b><br/>
              Via Azul N° 1051<br/>
              Puerto Montt
            </div>
          </div>
          <div class="body">
            <div class="grid">
              <div class="field"><b>ID armado</b>${escHtml(armadoGuia.id_armado)}</div>
              <div class="field"><b>Total cajas con contenido</b>${escHtml(totalCajas)}</div>
              <div class="field"><b>Cliente</b>${escHtml(cliente)}</div>
              <div class="field"><b>Centro destino</b>${escHtml(centro)}</div>
              <div class="field"><b>Tecnico encargado</b>${escHtml(tecnico)}</div>
              <div class="field"><b>Estado</b>En transito a centro</div>
            </div>
            <div class="section-title">Observacion de despacho</div>
            <div class="field">${escHtml(observacion)}</div>
            <div class="section-title">Detalle</div>
            <table>
              <thead>
                <tr>
                  <th>Caja</th>
                  <th>Cantidad</th>
                  <th>Contenido</th>
                </tr>
              </thead>
              <tbody>
                ${detalleCajasHtml}
              </tbody>
            </table>
            <div class="foot">
              <div class="sign">Firma bodega</div>
              <div class="sign">Recepción centro</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {
            // noop
          }
        }, 800);
      }
    }, 250);
  };

  return (
    <div className="container-fluid py-3 bodega-page">
      <div className="card shadow-sm border-0 mb-3 bodega-hero">
        <div className="card-body d-flex justify-content-between align-items-start flex-wrap" style={{ gap: 10 }}>
          <div>
            <h4 className="mb-2">Bodega</h4>
            <p className="text-muted mb-0">
              Flujo: retirado del centro ? en tránsito ? en bodega ? revisión.
            </p>
          </div>
          <div className="bodega-kpis-inline bodega-hero-kpis">
            <span className="bodega-kpi-chip bodega-kpi-transito">
              <i className="fas fa-route" />
              En tránsito: {totalPendienteTransito}
            </span>
            <span className="bodega-kpi-chip bodega-kpi-hoy">
              <i className="fas fa-check-circle" />
              En bodega: {enBodegaRows.length}
            </span>
            <span className="bodega-kpi-chip">
              <i className="fas fa-stethoscope" />
              En revisión: {totalRevisionActiva}
            </span>
            <span className="bodega-kpi-chip">
              <i className="fas fa-box-open" />
              Disponibles: {enBodegaDisponibles}
            </span>
            <span className="bodega-kpi-chip">
              <i className="fas fa-microchip" />
              Inventario: {inventarioEquipos.length}
            </span>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-3 bodega-tabs-card">
        <div className="card-body py-2">
          <div className="btn-group btn-group-sm bodega-tabs" role="group" aria-label="Tabs bodega">
            <button
              type="button"
              className={`btn ${activeTab === "logistica" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTab("logistica")}
            >
              <i className="fas fa-random mr-1" />
              Logistica
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "inventario" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTab("inventario")}
            >
              <i className="fas fa-boxes mr-1" />
              Inventario
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "historial" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTab("historial")}
            >
              <i className="fas fa-history mr-1" />
              Historial
            </button>
          </div>
        </div>
      </div>
      {activeTab === "logistica" && (
      <>
      <div className="row g-3 mb-3 bodega-toggle-grid">
        <div className="col-12 col-md-6 col-lg">
          <button
            type="button"
            className={`btn w-100 text-left bodega-toggle-card bodega-toggle-transito ${mostrarTablaTransito ? "active" : ""}`}
            onClick={toggleSoloTransito}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-uppercase text-muted">Logistica</div>
                <div className="h5 mb-0">
                  <i className="fas fa-truck-loading mr-2 text-primary" />
                  En transito
                </div>
              </div>
              <div className="text-right">
                <div className="h4 mb-0">{totalPendienteTransito}</div>
                <small className="text-muted">{mostrarTablaTransito ? "Ocultar tabla" : "Ver tabla"}</small>
              </div>
            </div>
          </button>
        </div>
        <div className="col-12 col-md-6 col-lg">
          <button
            type="button"
            className={`btn w-100 text-left bodega-toggle-card bodega-toggle-despacho ${mostrarTablaDespachos ? "active" : ""}`}
            onClick={toggleSoloDespachos}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-uppercase text-muted">Despachos</div>
                <div className="h5 mb-0">
                  <i className="fas fa-shipping-fast mr-2 text-primary" />
                  A centro
                </div>
              </div>
              <div className="text-right">
                <div className="h4 mb-0">{totalDespachosEnTransitoCentro}</div>
                <small className="text-muted">{mostrarTablaDespachos ? "Ocultar tabla" : "Ver tabla"}</small>
              </div>
            </div>
          </button>
        </div>
        <div className="col-12 col-md-6 col-lg">
          <button
            type="button"
            className={`btn w-100 text-left bodega-toggle-card bodega-toggle-asignacion ${mostrarTablaAsignaciones ? "active" : ""}`}
            onClick={toggleSoloAsignaciones}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-uppercase text-muted">Asignaciones</div>
                <div className="h5 mb-0">
                  <i className="fas fa-user-cog mr-2 text-info" />
                  Tecnicos
                </div>
              </div>
              <div className="text-right">
                <div className="h4 mb-0">{equiposAsignadosTecnicos.length}</div>
                <small className="text-muted">{mostrarTablaAsignaciones ? "Ocultar tabla" : "Ver tabla"}</small>
              </div>
            </div>
          </button>
        </div>
        <div className="col-12 col-md-6 col-lg">
          <button
            type="button"
            className={`btn w-100 text-left bodega-toggle-card bodega-toggle-centros ${mostrarTablaCentros ? "active" : ""}`}
            onClick={toggleSoloCentros}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-uppercase text-muted">Equipos</div>
                <div className="h5 mb-0">
                  <i className="fas fa-broadcast-tower mr-2 text-primary" />
                  Instalados
                </div>
              </div>
              <div className="text-right">
                <div className="h4 mb-0">{totalEquiposEnCentros}</div>
                <small className="text-muted">{mostrarTablaCentros ? "Ocultar tabla" : "Ver tabla"}</small>
              </div>
            </div>
          </button>
        </div>
        <div className="col-12 col-md-6 col-lg">
          <button
            type="button"
            className={`btn w-100 text-left bodega-toggle-card bodega-toggle-bodega ${mostrarTablaBodega ? "active" : ""}`}
            onClick={toggleSoloBodega}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-uppercase text-muted">Recepción</div>
                <div className="h5 mb-0">
                  <i className="fas fa-warehouse mr-2 text-success" />
                  En bodega
                </div>
              </div>
              <div className="text-right">
                <div className="h4 mb-0">{enBodegaRows.length}</div>
                <small className="text-muted">{mostrarTablaBodega ? "Ocultar tabla" : "Ver tabla"}</small>
              </div>
            </div>
          </button>
        </div>
        <div className="col-12 col-md-6 col-lg">
          <button
            type="button"
            className={`btn w-100 text-left bodega-toggle-card bodega-toggle-baja ${mostrarTablaBajas ? "active" : ""}`}
            onClick={toggleSoloBajas}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-uppercase text-muted">Control</div>
                <div className="h5 mb-0">
                  <i className="fas fa-exclamation-triangle mr-2 text-danger" />
                  Equipos de baja
                </div>
              </div>
              <div className="text-right">
                <div className="h4 mb-0">{totalEquiposBaja}</div>
                <small className="text-muted">{mostrarTablaBajas ? "Ocultar tabla" : "Ver tabla"}</small>
              </div>
            </div>
          </button>
        </div>
      </div>

      {!algunToggleLogisticaActivo ? (
      <div className="card shadow-sm border-0 mb-3 bodega-tabla bodega-seguimiento-armado">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-tools mr-2 text-primary" />
            Armados en seguimiento
          </strong>
          <div className="d-flex align-items-center" style={{ gap: 8 }}>
            <span className="badge badge-info">En preparación: {armadosSeguimientoResumen.enPreparacion.length}</span>
            <span className="badge badge-success">Listos despacho: {armadosSeguimientoResumen.listos.length}</span>
            <button className="btn btn-outline-primary btn-sm" onClick={cargarArmadosFinalizados}>
              <i className="fas fa-sync-alt mr-1" />
              Actualizar
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>ID armado</th>
                  <th>Cliente</th>
                  <th>Centro</th>
                  <th>Tecnico encargado</th>
                  <th>Inicio</th>
                  <th>Término</th>
                  <th>Armado</th>
                  <th>% armado</th>
                  <th>Despacho</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {!armadosSeguimientoVisibles.length ? (
                  <tr>
	                    <td colSpan={10} className="text-center py-3 text-muted">
                      Sin armados pendientes de seguimiento.
                    </td>
                  </tr>
                ) : (
                  armadosSeguimientoVisibles.slice(0, 8).map((a) => {
                    const finalizado = normalizeText(a?.estado || "") === "finalizado";
                    const pendientesArmado = Math.max(0, Number(a?.armado_equipos_pendientes || 0));
                    const revision = Math.max(0, Math.min(100, Number(a?.porcentaje_armado || 0)));
                    const badgeArmado = finalizado
                      ? pendientesArmado > 0
                        ? { className: "badge badge-warning", label: "Finalizado incompleto" }
                        : { className: "badge badge-success", label: "Finalizado completo" }
                      : { className: "badge badge-info", label: "En preparación" };
                    const guiasArmadoSeguimiento = Array.isArray(guiasPorArmado.get(Number(a?.id_armado || 0))) ? guiasPorArmado.get(Number(a?.id_armado || 0)) : [];
                    const cajasDespachadasSeguimiento = new Set();
                    guiasArmadoSeguimiento.forEach((guia) => {
                      (Array.isArray(guia?.cajas) ? guia.cajas : []).forEach((caja) => {
                        const valor = String(caja || "").trim();
                        const clave = obtenerClaveCaja(valor); if (clave) cajasDespachadasSeguimiento.add(clave);
                      });
                    });
                    const totalCajasDespacho = Math.max(0, Number(a?.total_cajas || 0), cajasDespachadasSeguimiento.size);
                    const cajasEnviadas = Math.min(cajasDespachadasSeguimiento.size, totalCajasDespacho);
                    const cajasPendientesDespacho = Math.max(totalCajasDespacho - cajasEnviadas, 0);
                    const badgeDespacho = cajasEnviadas <= 0
                      ? { className: "badge badge-secondary", label: "Sin despacho" }
                      : cajasPendientesDespacho > 0
                        ? { className: "badge badge-warning", label: "Despacho parcial" }
                        : { className: "badge badge-success", label: "Despacho completo" };
                    return (
                      <tr key={`seg-arm-${a.id_armado}`}>
                        <td>{a.id_armado}</td>
                        <td>{a?.centro?.cliente || "-"}</td>
                        <td>{a?.centro?.nombre || "-"}</td>
                        <td>
                          <div>{a?.tecnico?.nombre || "-"}</div>
                          {Array.isArray(a?.tecnicos_asignados) && a.tecnicos_asignados.filter((tec) => !tec?.principal).length ? (
                            <small className="text-muted">
                              Apoyo: {a.tecnicos_asignados.filter((tec) => !tec?.principal).map((tec) => tec?.nombre).filter(Boolean).join(", ")}
                            </small>
                          ) : null}
                        </td>
                        <td>{formatDate(a?.fecha_inicio || a?.fecha_asignacion)}</td>
                        <td>{formatDate(a?.fecha_cierre)}</td>
                        <td>
                          <div className="d-flex flex-column" style={{ gap: 4 }}>
                            <span className={badgeArmado.className}>{badgeArmado.label}</span>
                            {pendientesArmado > 0 ? (
                              <>
                                <small style={{ color: "#c2410c", fontWeight: 600 }}>
                                  Pendientes: {pendientesArmado}
                                </small>
                                {String(a?.armado_pendientes_resumen || "").trim() ? (
                                  <small
                                    style={{ color: "#b45309", lineHeight: 1.25 }}
                                    title={(Array.isArray(a?.armado_pendientes_detalle) ? a.armado_pendientes_detalle : [])
                                      .map((item) => item?.observacion ? `${item?.nombre || "Pendiente"}: ${item.observacion}` : (item?.nombre || "Pendiente"))
                                      .join("\n")}
                                  >
                                    {a.armado_pendientes_resumen}
                                  </small>
                                ) : null}
                                {Array.isArray(a?.armado_pendientes_detalle) && a.armado_pendientes_detalle.length ? (
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 text-left align-self-start"
                                    style={{ color: "#0f4aa3", fontWeight: 600, textDecoration: "none" }}
                                    onClick={() => setPendientesDetalleModal(a)}
                                  >
                                    <i className="fas fa-eye mr-1" />
                                    Ver pendientes
                                  </button>
                                ) : null}
                              </>
                            ) : finalizado ? (
                              <small className="text-success font-weight-bold">Sin pendientes</small>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          {revision >= 100 ? (
                            <span className="badge badge-success">{revision}%</span>
                          ) : (
                            <span className="badge badge-danger">{revision}%</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex flex-column" style={{ gap: 4 }}>
                            <span className={badgeDespacho.className}>{badgeDespacho.label}</span>
                            <small><strong>Total:</strong> {totalCajasDespacho}</small>
                            <small><strong>Enviadas:</strong> {cajasEnviadas}</small>
                            <small style={{ color: "#b91c1c" }}><strong>Pendientes:</strong> {cajasPendientesDespacho}</small>
                          </div>
                        </td>
                        <td className="text-center">
                          {finalizado ? (
                            <button className="btn btn-sm btn-outline-primary" onClick={toggleSoloDespachos}>
                              <i className="fas fa-shipping-fast mr-1" />
                              Ir a despachos
                            </button>
                          ) : (
                            <span className="text-muted">Seguimiento</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : null}


      {mostrarTablaTransito ? (
      <div className="card shadow-sm border-0 mb-3 bodega-tabla bodega-tabla-transito">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-truck-loading mr-2 text-primary" />
            En transito ({transitoRows.length})
          </strong>
          <div className="d-flex align-items-center" style={{ gap: 6 }}>
            <select className="form-control form-control-sm d-inline-block" style={{ width: 190 }} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Cliente: todos</option>
              {clientes.map((c) => {
                const id = c.id_cliente ?? c.id;
                return (
                  <option key={id} value={id}>
                    {c.nombre || c.razon_social || `Cliente ${id}`}
                  </option>
                );
              })}
            </select>
            <select
              className="form-control form-control-sm d-inline-block"
              style={{ width: 190 }}
              value={centroId}
              onChange={(e) => setCentroId(e.target.value)}
              disabled={!clienteId}
            >
              <option value="">Centro: todos</option>
              {centros.map((c) => {
                const id = c.id_centro ?? c.id;
                return (
                  <option key={id} value={id}>
                    {c.nombre || `Centro ${id}`}
                  </option>
                );
              })}
            </select>
            <button className="btn btn-outline-primary btn-sm" onClick={cargarRetiros}>
              <i className="fas fa-sync-alt mr-1" />
              Recargar
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N�</th>
                  <th>Correlativo</th>
                  <th>Fecha retiro</th>
                  <th>Cliente</th>
                  <th>Centro</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Equipos / detalle</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3">
                      Cargando...
                    </td>
                  </tr>
                ) : !transitoRows.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3 text-muted">
                      Sin movimientos en transito.
                    </td>
                  </tr>
                ) : (
                  transitoRows.map((row) => {
                    if (row.tipoFila === "instalacion_devuelta") {
                      const acta = row.acta || {};
                      const permiso = row.permiso || {};
                      const equipos = Array.isArray(row.equipos) ? row.equipos : [];
                      return (
                        <tr key={row.rowKey}>
                          <td>{permiso?.id_permiso_trabajo || acta?.id_acta_entrega || "-"}</td>
                          <td>
                            {permiso?.id_permiso_trabajo
                              ? `N${permiso.id_permiso_trabajo}`
                              : `ACTA-${acta?.id_acta_entrega || "-"}`}
                          </td>
                          <td>{formatDate(acta?.updated_at || acta?.fecha_registro)}</td>
                          <td>{acta?.empresa || acta?.cliente || "-"}</td>
                          <td>{acta?.centro || "-"}</td>
                          <td>Vuelta instalacion</td>
                          <td>
                            <span className="badge badge-warning">En transito a bodega</span>
                          </td>
                          <td>
                            <div className="d-flex flex-column" style={{ gap: 4 }}>
                              <small className="font-weight-bold">{equipos.length} equipo(s)</small>
                              {equipos.map((eq, idx) => (
                                <small key={`${row.rowKey}-${idx}`} style={{ lineHeight: 1.25 }}>
                                  {eq?.nombre || "Equipo"}{eq?.numero_serie ? ` - N Serie: ${eq.numero_serie}` : eq?.codigo ? ` - Codigo: ${eq.codigo}` : ""}
                                </small>
                              ))}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => confirmarRecepcionDevolucionInstalacion(row)}
                              disabled={savingId === `acta-${acta?.id_acta_entrega || 0}`}
                            >
                              <i className="fas fa-check mr-1" />
                              Recepcionar
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    if (row.tipoFila === "mantencion_devuelta") {
                      const mantencion = row.mantencion || {};
                      const cambio = row.cambio || {};
                      return (
                        <tr key={row.rowKey}>
                          <td>{mantencion?.id_mantencion_terreno || "-"}</td>
                          <td>{`MANT-${mantencion?.id_mantencion_terreno || "-"}`}</td>
                          <td>{formatDate(cambio?.created_at || mantencion?.fecha_ingreso)}</td>
                          <td>{mantencion?.empresa || mantencion?.cliente || "-"}</td>
                          <td>{mantencion?.centro || "-"}</td>
                          <td>Cambio mantencion</td>
                          <td>
                            <span className="badge badge-warning">En transito a bodega</span>
                          </td>
                          <td>
                            <div className="d-flex flex-column" style={{ gap: 4 }}>
                              <small className="font-weight-bold">{cambio?.equipo || "Equipo"}</small>
                              <small style={{ lineHeight: 1.25 }}>
                                {cambio?.serie_anterior ? `N Serie: ${cambio.serie_anterior}` : cambio?.codigo_anterior ? `Codigo: ${cambio.codigo_anterior}` : "-"}
                              </small>
                              {cambio?.serie_nueva ? (
                                <small className="text-muted" style={{ lineHeight: 1.25 }}>
                                  Reemplazado por: {cambio.serie_nueva}
                                </small>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => confirmarRecepcionDevolucionMantencion(row)}
                              disabled={savingId === `mant-${cambio?.id_cambio_equipo_mantencion || 0}`}
                            >
                              <i className="fas fa-check mr-1" />
                              Recepcionar
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    const r = row.retiro;
                    return (
                      <tr key={row.rowKey}>
                        <td>{r.id_retiro_terreno}</td>
                        <td>{`N${r.id_retiro_terreno || "-"}`}</td>
                        <td>{formatDate(r.fecha_retiro)}</td>
                        <td>{r.empresa || r.cliente || "-"}</td>
                        <td>{r.centro || "-"}</td>
                        <td>{r.tipo_retiro === "completo" ? "Completo" : "Parcial"}</td>
                        <td>
                          <span className="badge badge-warning">En transito</span>
                        </td>
                        <td>{totalEquiposRetirados(r)}</td>
                        <td>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              setSeleccionado(r);
                              setEquiposRecepcion(
                                (Array.isArray(r.equipos) ? r.equipos : [])
                                  .filter((eq) => !!eq.retirado)
                                  .map((eq) => ({
                                    ...eq,
                                    recibido_bodega: !!eq.recibido_bodega,
                                  }))
                              );
                            }}
                            disabled={savingId === r.id_retiro_terreno}
                          >
                            <i className="fas fa-check mr-1" />
                            Recepcionar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : null}
      {mostrarTablaCentros ? (
      <div className="card shadow-sm border-0 mb-3 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-broadcast-tower mr-2 text-primary" />
            Instalados ({equiposTrabajandoFiltrados.length})
          </strong>
          <div className="d-flex align-items-center flex-wrap" style={{ gap: 6 }}>
            <input
              className="form-control form-control-sm"
              style={{ width: 290 }}
              placeholder="Buscar por N serie, equipo, cliente o centro"
              value={filtroEquiposCentro}
              onChange={(e) => setFiltroEquiposCentro(e.target.value)}
            />
            <button className="btn btn-outline-primary btn-sm" onClick={cargarRetiros}>
              <i className="fas fa-sync-alt mr-1" />
              Recargar
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N</th>
                  <th>N serie</th>
                  <th>Equipo</th>
                  <th>Codigo</th>
                  <th>Cliente</th>
                  <th>Centro actual</th>
                  <th>Fecha instalacion</th>
                  <th>Tecnico</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3">
                      Cargando...
                    </td>
                  </tr>
                ) : !equiposTrabajandoFiltrados.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3 text-muted">
                      No hay equipos instalados para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  equiposTrabajandoPaginados.map((item, index) => (
                    <tr key={item.rowKey}>
                      <td>{(equiposCentroPage - 1) * equiposCentroPageSize + index + 1}</td>
                      <td>{item.serie || "-"}</td>
                      <td>{item.equipo || "-"}</td>
                      <td>{item.codigo || "-"}</td>
                      <td>{item.cliente || "-"}</td>
                      <td>{item.centro || "-"}</td>
                      <td>{formatDate(item.fechaInstalacion)}</td>
                      <td>{item.tecnico || "-"}</td>
                      <td>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => abrirHistorialEquipoTrabajo(item)}>
                          <i className="fas fa-history mr-1" />
                          Ver historial
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 10 }}>
          <div className="d-flex align-items-center" style={{ gap: 6 }}>
            <span className="text-muted small">Ver</span>
            <select
              className="form-control form-control-sm d-inline-block"
              style={{ width: 88 }}
              value={equiposCentroPageSize}
              onChange={(e) => setEquiposCentroPageSize(Number(e.target.value) || 10)}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
            <span className="text-muted small">registros</span>
          </div>
          <small className="text-muted">
            Mostrando {equiposTrabajandoFiltrados.length ? (equiposCentroPage - 1) * equiposCentroPageSize + 1 : 0}
            -
            {Math.min(equiposCentroPage * equiposCentroPageSize, equiposTrabajandoFiltrados.length)} de {equiposTrabajandoFiltrados.length}
          </small>
          <div className="d-flex align-items-center" style={{ gap: 6 }}>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={equiposCentroPage <= 1}
              onClick={() => setEquiposCentroPage((prev) => Math.max(1, prev - 1))}
            >
              <i className="fas fa-chevron-left mr-1" />
              Anterior
            </button>
            <span className="small text-muted">
              Pagina {equiposCentroPage} / {totalEquiposCentroPages}
            </span>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={equiposCentroPage >= totalEquiposCentroPages}
              onClick={() => setEquiposCentroPage((prev) => Math.min(totalEquiposCentroPages, prev + 1))}
            >
              Siguiente
              <i className="fas fa-chevron-right ml-1" />
            </button>
          </div>
        </div>
      </div>
      ) : null}
      {mostrarTablaBodega ? (
      <div className="card shadow-sm border-0 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-warehouse mr-2 text-success" />
            En bodega ({enBodegaFiltrados.length})
          </strong>
          <div className="d-flex align-items-center" style={{ gap: 6 }}>
            <select className="form-control form-control-sm d-inline-block" style={{ width: 190 }} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Cliente: todos</option>
              {clientes.map((c) => {
                const id = c.id_cliente ?? c.id;
                return (
                  <option key={id} value={id}>
                    {c.nombre || c.razon_social || `Cliente ${id}`}
                  </option>
                );
              })}
            </select>
            <select
              className="form-control form-control-sm d-inline-block"
              style={{ width: 190 }}
              value={centroId}
              onChange={(e) => setCentroId(e.target.value)}
              disabled={!clienteId}
            >
              <option value="">Centro: todos</option>
              {centros.map((c) => {
                const id = c.id_centro ?? c.id;
                return (
                  <option key={id} value={id}>
                    {c.nombre || `Centro ${id}`}
                  </option>
                );
              })}
            </select>
            <input
              className="form-control form-control-sm d-inline-block"
              style={{ width: 190 }}
              placeholder="Buscar N° serie / código"
              value={filtroSerieBodega}
              onChange={(e) => setFiltroSerieBodega(e.target.value)}
            />
            <button className="btn btn-outline-primary btn-sm" onClick={cargarRetiros}>
              <i className="fas fa-sync-alt mr-1" />
              Recargar
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N°</th>
                  <th>Correlativo</th>
                  <th>Fecha retiro</th>
                  <th>Centro</th>
                  <th>Estado</th>
                  <th>Recepcionado por</th>
                  <th>Fecha recepcion</th>
                  <th>Equipo / serie</th>
                  <th className="text-center">Accion</th>
                </tr>
              </thead>
              <tbody>
                {!enBodegaFiltrados.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3 text-muted">
                      Sin retiros recepcionados en bodega para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  enBodegaFiltrados.map((row) => {
                    if (row.tipoFila === "instalacion_bodega") {
                      const acta = row.acta || {};
                      const permiso = row.permiso || {};
                      const equipos = Array.isArray(row.equipos) ? row.equipos : [];
                      const recepcionPor = equipos[0]?.recepcion_bodega_por || "-";
                      const fechaRecepcion = equipos[0]?.fecha_recepcion_bodega || acta?.updated_at || null;
                      return (
                        <tr key={row.rowKey}>
                          <td>{permiso?.id_permiso_trabajo || acta?.id_acta_entrega || "-"}</td>
                          <td>
                            {permiso?.id_permiso_trabajo
                              ? `N${permiso.id_permiso_trabajo}`
                              : `ACTA-${acta?.id_acta_entrega || "-"}`}
                          </td>
                          <td>{formatDate(acta?.fecha_registro)}</td>
                          <td>{acta?.centro || "-"}</td>
                          <td>
                            <span className="badge badge-secondary">En bodega desde instalacion</span>
                          </td>
                          <td>{recepcionPor}</td>
                          <td>{formatDate(fechaRecepcion)}</td>
                          <td>
                            <div className="d-flex flex-column" style={{ gap: 4 }}>
                              {equipos.map((eq, idx) => (
                                <small key={`${row.rowKey}-bod-${idx}`} style={{ lineHeight: 1.25 }}>
                                  <strong>{eq?.nombre || "Equipo"}</strong>
                                  {eq?.numero_serie ? ` - ${eq.numero_serie}` : eq?.codigo ? ` - ${eq.codigo}` : ""}
                                </small>
                              ))}
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center flex-wrap" style={{ gap: 6 }}>
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => abrirRevisionDevolucionInstalacion(row)}
                                disabled={String(savingId || "").startsWith(`acta-${acta?.id_acta_entrega || 0}`)}
                              >
                                <i className="fas fa-stethoscope mr-1" />
                                Revision
                              </button>
                              <button
                                className="btn btn-outline-warning btn-sm"
                                onClick={() => enviarDevolucionInstalacionABaja(row)}
                                disabled={savingId === `acta-baja-${acta?.id_acta_entrega || 0}`}
                              >
                                <i className="fas fa-exclamation-triangle mr-1" />
                                Baja
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => volverDevolucionInstalacionATransito(row)}
                                disabled={savingId === `acta-trans-${acta?.id_acta_entrega || 0}`}
                              >
                                <i className="fas fa-truck-loading mr-1" />
                                Anular recepcion
                              </button>
                              {usuario?.rol === "admin" ? (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => cancelarDevolucionInstalacionEnBodega(row)}
                                  disabled={savingId === `acta-cancel-${acta?.id_acta_entrega || 0}`}
                                >
                                  <i className="fas fa-trash-alt mr-1" />
                                  Eliminar
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    if (row.tipoFila === "mantencion_bodega") {
                      const mantencion = row.mantencion || {};
                      const cambio = row.cambio || {};
                      return (
                        <tr key={row.rowKey}>
                          <td>{mantencion?.id_mantencion_terreno || "-"}</td>
                          <td>{`MANT-${mantencion?.id_mantencion_terreno || "-"}`}</td>
                          <td>{formatDate(cambio?.created_at || mantencion?.fecha_ingreso)}</td>
                          <td>{mantencion?.centro || "-"}</td>
                          <td>
                            <span className="badge badge-secondary">En bodega desde mantencion</span>
                          </td>
                          <td>{cambio?.recepcion_bodega_por || "-"}</td>
                          <td>{formatDate(cambio?.fecha_recepcion_bodega)}</td>
                          <td>
                            <div className="d-flex flex-column" style={{ gap: 4 }}>
                              <small style={{ lineHeight: 1.25 }}>
                                <strong>{cambio?.equipo || "Equipo"}</strong>
                              </small>
                              <small style={{ lineHeight: 1.25 }}>
                                {cambio?.serie_anterior ? `N Serie: ${cambio.serie_anterior}` : cambio?.codigo_anterior ? `Codigo: ${cambio.codigo_anterior}` : "-"}
                              </small>
                              {cambio?.serie_nueva ? (
                                <small className="text-muted" style={{ lineHeight: 1.25 }}>
                                  Serie nueva instalada: {cambio.serie_nueva}
                                </small>
                              ) : null}
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center flex-wrap" style={{ gap: 6 }}>
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => abrirRevisionDevolucionMantencion(row)}
                                disabled={String(savingId || "").startsWith(`mant-${cambio?.id_cambio_equipo_mantencion || 0}`)}
                              >
                                <i className="fas fa-stethoscope mr-1" />
                                Revision
                              </button>
                              <button
                                className="btn btn-outline-warning btn-sm"
                                onClick={() => enviarDevolucionMantencionABaja(row)}
                                disabled={savingId === `mant-baja-${cambio?.id_cambio_equipo_mantencion || 0}`}
                              >
                                <i className="fas fa-exclamation-triangle mr-1" />
                                Baja
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => volverDevolucionMantencionATransito(row)}
                                disabled={savingId === `mant-trans-${cambio?.id_cambio_equipo_mantencion || 0}`}
                              >
                                <i className="fas fa-truck-loading mr-1" />
                                Anular recepcion
                              </button>
                              {usuario?.rol === "admin" ? (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => eliminarDevolucionMantencionEnBodega(row)}
                                  disabled={savingId === `mant-del-${cambio?.id_cambio_equipo_mantencion || 0}`}
                                >
                                  <i className="fas fa-trash-alt mr-1" />
                                  Eliminar
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const r = row.retiro;
                    return (
                      <tr key={row.rowKey}>
                        <td>{r.id_retiro_terreno}</td>
                        <td>{`N${r.id_retiro_terreno || "-"}`}</td>
                        <td>{formatDate(r.fecha_retiro)}</td>
                        <td>{r.centro || "-"}</td>
                        <td>
                          {(() => {
                            const resumen = revisionResumenPorRetiro.get(Number(r?.id_retiro_terreno || 0));
                            if ((resumen?.disponibles || 0) > 0) {
                              return <span className="badge badge-success">Bodega disponible</span>;
                            }
                            if (resumen?.enviadoRevision) {
                              const areas = Array.from(resumen.areas || []).join(", ");
                              return <span className="badge badge-warning">En revision ({areas || "-"})</span>;
                            }
                            return <span className="badge badge-secondary">En bodega (sin revision)</span>;
                          })()}
                        </td>
                        <td>{r.recepcion_bodega_por || "-"}</td>
                        <td>{formatDate(r.fecha_recepcion_bodega)}</td>
                        <td>
                          <div className="d-flex flex-column" style={{ gap: 4 }}>
                            {(Array.isArray(r?.equipos) ? r.equipos : [])
                              .filter((eq) => !!eq?.retirado)
                              .map((eq, idx) => (
                                <small key={`${row.rowKey}-eq-${idx}`} style={{ lineHeight: 1.25 }}>
                                  <strong>{eq?.equipo_nombre || "Equipo"}</strong>
                                  {eq?.numero_serie ? ` - ${eq.numero_serie}` : eq?.codigo ? ` - ${eq.codigo}` : ""}
                                </small>
                              ))}
                          </div>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            title="Asignar a revision"
                            onClick={() => {
                              const rid = Number(r?.id_retiro_terreno || 0);
                              const activos = revisionActivaPorRetiro.get(rid);
                              const equipos = (Array.isArray(r?.equipos) ? r.equipos : [])
                                .filter((eq) => !!eq?.retirado)
                                .map((eq) => {
                                  const areaActiva = activos?.porEquipo?.get(Number(eq?.id_retiro_equipo || 0)) || "";
                                  return {
                                    id_retiro_equipo: eq.id_retiro_equipo,
                                    equipo_nombre: eq.equipo_nombre || "-",
                                    numero_serie: eq.numero_serie || "",
                                    codigo: eq.codigo || "",
                                    area: areaActiva || "",
                                    bloqueado: !!areaActiva,
                                  };
                                });
                              setRevisionEquiposArea(equipos);
                              setRetiroRevision(r);
                            }}
                          >
                            <i className="fas fa-stethoscope mr-1" />
                            Revisar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : null}

      {mostrarTablaAsignaciones ? (
      <div className="card shadow-sm border-0 mt-3 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-user-cog mr-2 text-info" />
            Asignaciones a tecnicos ({equiposAsignadosTecnicos.length})
          </strong>
          <div className="d-flex align-items-center flex-wrap" style={{ gap: 6 }}>
            <input
              className="form-control form-control-sm d-inline-block"
              style={{ width: 220 }}
              placeholder="Buscar por tecnico"
              value={filtroTecnicoAsignacion}
              onChange={(e) => setFiltroTecnicoAsignacion(e.target.value)}
            />
            {canGestionarAsignaciones ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEquipoAsignacionDirectaId("");
                  setTecnicoAsignacionId("");
                  setObsAsignacion("");
                  setShowAsignacionDirectaModal(true);
                }}
              >
                <i className="fas fa-user-plus mr-1" />
                Asignar equipos a tecnicos
              </button>
            ) : null}
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N° serie</th>
                  <th>Código</th>
                  <th>Equipo</th>
                  <th>Tecnico</th>
                  <th>Fecha asignacion</th>
                  <th>Asignado por</th>
                  <th>Observacion</th>
                  <th className="text-center">Accion</th>
                </tr>
              </thead>
              <tbody>
                {!equiposAsignadosTecnicosFiltrados.length ? (
                  <tr>
                    <td colSpan={8} className="text-center py-3 text-muted">
                      Sin equipos asignados para el filtro actual.
                    </td>
                  </tr>
                ) : (
                  equiposAsignadosTecnicosFiltrados.map((x, idx) => (
                    <tr key={`asg-${x.id_bodega_equipo || idx}`}>
                      <td>{x.numero_serie || "-"}</td>
                      <td>{x.codigo || "-"}</td>
                      <td>{x.equipo_nombre || "-"}</td>
                      <td>{x.tecnico_asignado_nombre || "-"}</td>
                      <td>{formatDateTime(x.fecha_asignacion)}</td>
                      <td>{x.asignado_por_nombre || "-"}</td>
                      <td>{x.observacion_asignacion || "-"}</td>
                      <td className="text-center">
                        {canGestionarAsignaciones ? (
                          <button
                            className="btn btn-outline-success btn-sm"
                            disabled={asignandoEquipoId === Number(x.id_bodega_equipo || 0)}
                            onClick={() => devolverEquipoABodega(x)}
                          >
                            <i className="fas fa-undo mr-1" />
                            Devolver
                          </button>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : null}

      {mostrarTablaBajas ? (
      <div className="card shadow-sm border-0 mt-3 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-exclamation-triangle mr-2 text-danger" />
            Equipos de baja ({equiposBajaFiltrados.length})
          </strong>
          <div className="d-flex align-items-center" style={{ gap: 6 }}>
            <select className="form-control form-control-sm d-inline-block" style={{ width: 190 }} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Cliente: todos</option>
              {clientes.map((c) => {
                const id = c.id_cliente ?? c.id;
                return (
                  <option key={id} value={id}>
                    {c.nombre || c.razon_social || `Cliente ${id}`}
                  </option>
                );
              })}
            </select>
            <select
              className="form-control form-control-sm d-inline-block"
              style={{ width: 190 }}
              value={centroId}
              onChange={(e) => setCentroId(e.target.value)}
              disabled={!clienteId}
            >
              <option value="">Centro: todos</option>
              {centros.map((c) => {
                const id = c.id_centro ?? c.id;
                return (
                  <option key={id} value={id}>
                    {c.nombre || `Centro ${id}`}
                  </option>
                );
              })}
            </select>
            <input
              className="form-control form-control-sm d-inline-block"
              style={{ width: 190 }}
              placeholder="Buscar N° serie / código"
              value={filtroSerieBaja}
              onChange={(e) => setFiltroSerieBaja(e.target.value)}
            />
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N° serie</th>
                  <th>Código</th>
                  <th>Equipo</th>
                  <th>Modelo</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Últ. actualización</th>
                </tr>
              </thead>
              <tbody>
                {!equiposBajaFiltrados.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-3 text-muted">
                      Sin equipos de baja para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  equiposBajaFiltrados.map((row, idx) => {
                    const x = row.item || {};
                    return (
                    <tr key={row.rowKey || `baja-${x.id_bodega_equipo || x.id_retiro_equipo || idx}`}>
                      <td>{x.numero_serie || "-"}</td>
                      <td>{x.codigo || "-"}</td>
                      <td>{x.equipo_nombre || "-"}</td>
                      <td>{x.modelo || "-"}</td>
                      <td>{x.ubicacion || "-"}</td>
                      <td><span className="badge badge-danger">{x.estado_equipo || "No operativo / baja"}</span></td>
                      <td>{formatDateTime(x.updated_at)}</td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : null}

      {mostrarTablaDespachos ? (
      <div className="card shadow-sm border-0 mt-3 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-shipping-fast mr-2 text-primary" />
            Despachos a centro ({despachoRows.length})
          </strong>
          <div className="d-flex align-items-center flex-wrap" style={{ gap: 6 }}>
            <input
              className="form-control form-control-sm d-inline-block"
              style={{ width: 260 }}
              placeholder="Buscar centro / cliente / ID armado"
              value={filtroDespachoCentro}
              onChange={(e) => setFiltroDespachoCentro(e.target.value)}
            />
            <button className="btn btn-outline-primary btn-sm" onClick={cargarArmadosFinalizados}>
              <i className="fas fa-sync-alt mr-1" />
              Recargar
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
	                <tr>
	                  <th>ID armado</th>
	                  <th>Cliente</th>
	                  <th>Centro</th>
	                  <th>Fecha cierre</th>
	                  <th>Fecha despacho</th>
	                  <th>Fecha recepción</th>
	                  <th>Cajas despacho</th>
	                  <th>Guía salida</th>
                    <th>Tipo</th>
	                  <th>Estado despacho</th>
	                  <th className="text-center">Acción</th>
	                </tr>
              </thead>
              <tbody>
                {!despachoRows.length ? (
                  <tr>
	                    <td colSpan={11} className="text-center py-3 text-muted">
	                      Sin armados finalizados para despacho.
	                    </td>
	                  </tr>
                ) : (
                  despachoRows.map((row) => {
                    const a = row.armado;
                    const guia = row.guia;
                    const estado = normalizeText(guia?.estado || "");
                    return (
                      <tr key={row.rowKey}>
                        <td>{a.id_armado}</td>
	                        <td>{a?.centro?.cliente || "-"}</td>
	                        <td>{a?.centro?.nombre || "-"}</td>
	                        <td>{formatDate(a.fecha_cierre || a.fecha_inicio || a.fecha_asignacion)}</td>
	                        <td>{formatDate(guia?.fecha_salida)}</td>
	                        <td>{formatDate(guia?.fecha_recepcion_centro)}</td>
	                        <td>{row.cajasFila || 0}</td>
	                        <td>{guia?.numero_guia || "-"}</td>
                        <td>
                          {guia ? (
                            <span className={`badge ${normalizeText(guia?.tipo_despacho || "") === "parcial" ? "badge-warning" : "badge-info"}`}>
                              {normalizeText(guia?.tipo_despacho || "") === "parcial" ? "Parcial" : "Total"}
                            </span>
                          ) : (
                            <span className="badge badge-secondary">Pendiente</span>
                          )}
                        </td>
                        <td>
                          {!guia ? (
                            <span className="badge badge-secondary">Pendiente despacho</span>
                          ) : estado === "recepcionado_en_centro" ? (
                            <span className="badge badge-success">Recepción en centro</span>
                          ) : (
                            <span className="badge badge-warning">En tránsito hacia centro</span>
                          )}
                        </td>
                        <td className="text-center">
                          {!guia ? (
                            <button className="btn btn-sm btn-primary" onClick={() => abrirModalGuia(a, null, true)}>
                              <i className="fas fa-file-export mr-1" />
                              {Array.isArray(guiasPorArmado.get(Number(a?.id_armado || 0))) && guiasPorArmado.get(Number(a?.id_armado || 0)).length
                                ? "Nuevo despacho"
                                : "Generar guía"}
                            </button>
                          ) : estado !== "recepcionado_en_centro" ? (
                            <div className="d-flex justify-content-center" style={{ gap: 6, flexWrap: "wrap" }}>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => abrirModalGuia(a, guia, false)}>
                                <i className="fas fa-eye mr-1" />
                                Ver despacho
                              </button>
                              <button className="btn btn-sm btn-outline-success" onClick={() => marcarRecepcionCentro(guia)}>
                                <i className="fas fa-check mr-1" />
                                Recepción en centro
                              </button>
                              {esAdminBodega ? (
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => abrirModalGuia(a, guia, true)}
                                  title="Editar despacho"
                                >
                                  <i className="fas fa-pen" />
                                </button>
                              ) : null}
                              {esAdminBodega ? (
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => eliminarGuiaSalida(guia)}
                                  title="Eliminar despacho"
                                >
                                  <i className="fas fa-trash-alt" />
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <div className="d-flex justify-content-center" style={{ gap: 6, flexWrap: "wrap" }}>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => abrirModalGuia(a, guia, false)}>
                                <i className="fas fa-eye mr-1" />
                                Ver despacho
                              </button>
                              {esAdminBodega ? (
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => abrirModalGuia(a, guia, true)}
                                  title="Editar despacho"
                                >
                                  <i className="fas fa-pen" />
                                </button>
                              ) : null}
                              {esAdminBodega ? (
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => eliminarGuiaSalida(guia)}
                                  title="Eliminar despacho"
                                >
                                  <i className="fas fa-trash-alt" />
                                </button>
                              ) : null}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : null}
      </>
      )}

      {activeTab === "inventario" && (
      <div className="card shadow-sm border-0 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-boxes mr-2 text-primary" />
            Inventario de equipos ({inventarioEquipos.length})
          </strong>
          <div className="d-flex align-items-center flex-wrap" style={{ gap: 8 }}>
            <input
              className="form-control form-control-sm"
              style={{ maxWidth: 360 }}
              placeholder="Buscar por N serie, codigo, equipo, centro o estado"
              value={filtroInventario}
              onChange={(e) => setFiltroInventario(e.target.value)}
            />
            <button
              className="btn btn-sm btn-success"
              onClick={() => {
                setInventarioEditandoId(null);
                setEquipoEsNuevo(false);
                setCodigosAdicionales([]);
                setSeriesPendientes([]);
                setSeriesSeleccionadas([]);
                setNuevoEquipo({
                  numero_serie: "",
                  codigo: "",
                  equipo_nombre: "",
                  descripcion_producto: "",
                  fecha_ingreso: new Date().toISOString().slice(0, 10),
                  orden_compra: "",
                  valor: "",
                  cantidad: 1,
                  modelo: "",
                  estado_equipo: "Operativo",
                  ubicacion: "Bodega central",
                  imagen_base64: "",
                  imagen_nombre: "",
                });
                setShowIngresoInventario(true);
              }}
            >
              <i className="fas fa-plus mr-1" />
              Ingreso de equipos
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="px-3 pt-3">
            <div className="row">
              <div className="col-md-4 mb-2">
                <div className="bodega-inv-kpi bodega-inv-kpi-central">
                  <div className="small text-muted">Bodega central</div>
                  <div className="h5 mb-0">{resumenInventario.bCentral}</div>
                </div>
              </div>
              <div className="col-md-4 mb-2">
                <div className="bodega-inv-kpi bodega-inv-kpi-baja">
                  <div className="small text-muted">Bodega de baja</div>
                  <div className="h5 mb-0">{resumenInventario.bBaja}</div>
                </div>
              </div>
              <div className="col-md-4 mb-2">
                <div className="bodega-inv-kpi bodega-inv-kpi-sec">
                  <div className="d-flex align-items-center justify-content-between" style={{ gap: 8 }}>
                    <div className="small text-muted">{bodega2Nombre}</div>
                    <input
                      className="form-control form-control-sm"
                      style={{ maxWidth: 150 }}
                      value={bodega2Nombre}
                      onChange={(e) => setBodega2Nombre(e.target.value)}
                    />
                  </div>
                  <div className="h5 mb-0 mt-1">{resumenInventario.b2}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N° serie</th>
                  <th>Código</th>
                  <th>Equipo</th>
                  <th>Cliente</th>
                  <th>Centro</th>
                  <th>Estado equipo</th>
                  <th>Asignación</th>
                  <th>Ubicación actual</th>
                  <th>Últ. actualización</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {!inventarioEquipos.length ? (
                  <tr>
                    <td colSpan={10} className="text-center py-3 text-muted">
                      Sin equipos para el filtro actual.
                    </td>
                  </tr>
                ) : (
                  inventarioEquipos.map((r, idx) => (
                    <tr key={`${r.id_retiro_equipo || idx}-${r.numero_serie}-${r.codigo}`}>
                      <td>{r.numero_serie || "-"}</td>
                      <td>{r.codigo || "-"}</td>
                      <td>{r.equipo_nombre || "-"}</td>
                      <td>{r.cliente || "-"}</td>
                      <td>{r.centro || "-"}</td>
                      <td>
                        {r.estado_equipo === "Operativo" ? (
                          <span className="badge badge-success">{r.estado_equipo}</span>
                        ) : r.estado_equipo === "No operativo / baja" ? (
                          <span className="badge badge-danger">{r.estado_equipo}</span>
                        ) : r.estado_equipo === "Requiere repuesto" ? (
                          <span className="badge badge-warning">{r.estado_equipo}</span>
                        ) : (
                          <span className="badge badge-secondary">{r.estado_equipo}</span>
                        )}
                      </td>
                      <td>
                        {String(r.estado_asignacion || "en_bodega").toLowerCase() === "asignado_tecnico" ? (
                          <span className="badge badge-info">
                            Asignado: {r.tecnico_asignado_nombre || "Tecnico"}
                          </span>
                        ) : (
                          <span className="badge badge-secondary">En bodega</span>
                        )}
                      </td>
                      <td>{r.ubicacion || "-"}</td>
                      <td>{formatDateTime(r.updated_at)}</td>
                      <td className="text-center">
                        {r.es_manual ? (
                          <div className="d-inline-flex" style={{ gap: 6 }}>
                            {canGestionarAsignaciones && Number(r.id_bodega_equipo || 0) > 0 && String(r.estado_asignacion || "en_bodega").toLowerCase() !== "asignado_tecnico" ? (
                              <button
                                className="btn btn-sm btn-primary"
                                title="Asignar a tecnico"
                                onClick={() => {
                                  setEquipoAsignacionModal(r);
                                  setTecnicoAsignacionId("");
                                  setObsAsignacion("");
                                }}
                              >
                                <i className="fas fa-user-plus mr-1" />
                                Asignar
                              </button>
                            ) : null}
                            {canGestionarAsignaciones && String(r.estado_asignacion || "en_bodega").toLowerCase() === "asignado_tecnico" ? (
                              <button
                                className="btn btn-outline-success btn-sm"
                                title="Devolver a bodega"
                                onClick={() => devolverEquipoABodega(r)}
                              >
                                <i className="fas fa-undo mr-1" />
                                Devolver
                              </button>
                            ) : null}
                            <button
                              className="btn btn-outline-warning btn-sm"
                              title="Editar"
                              onClick={() => {
                                const equipoActual = String(r.equipo_nombre || "").trim();
                                setInventarioEditandoId(r.id_bodega_equipo || r.id_retiro_equipo || null);
                                setNuevoEquipo({
                                  numero_serie: r.numero_serie || "",
                                  codigo: r.codigo || "",
                                  equipo_nombre: equipoActual,
                                  descripcion_producto: r.descripcion_producto || "",
                                  fecha_ingreso: String(r.fecha_ingreso || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
                                  orden_compra: r.orden_compra || "",
                                  valor: r.valor ?? "",
                                  cantidad: 1,
                                  modelo: r.modelo || "",
                                  estado_equipo: r.estado_equipo || "Operativo",
                                  ubicacion: r.ubicacion || "Bodega central",
                                  imagen_base64: r.imagen_base64 || "",
                                  imagen_nombre: r.imagen_nombre || "",
                                });
                                setEquipoEsNuevo(equipoActual ? !CATALOGO_EQUIPOS_ARMADO.includes(equipoActual) : false);
                                setCodigosAdicionales([]);
                                setSeriesPendientes([]);
                                setSeriesSeleccionadas([]);
                                setShowIngresoInventario(true);
                              }}
                            >
                              <i className="fas fa-edit" />
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              title="Eliminar"
                              onClick={async () => {
                                const id = r.id_bodega_equipo || r.id_retiro_equipo;
                                if (!id) return;
                                if (!window.confirm("¿Eliminar este equipo del inventario?")) return;
                                try {
                                  await eliminarInventarioBodegaEquipo(id);
                                  await cargarInventarioManual();
                                } catch (e) {
                                  alert(e?.response?.data?.error || "No se pudo eliminar.");
                                }
                              }}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {activeTab === "historial" && (
      <div className="card shadow-sm border-0 mt-3 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap">
          <strong>
            <i className="fas fa-history mr-2 text-info" />
            Historial logístico de equipos
          </strong>
          <input
            className="form-control form-control-sm"
            style={{ maxWidth: 360 }}
            placeholder="Buscar por centro, equipo, técnico, N serie o correlativo"
            value={filtroHistorial}
            onChange={(e) => setFiltroHistorial(e.target.value)}
          />
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>Fecha</th>
                  <th>N correlativo</th>
                  <th>Equipo</th>
                  <th>N serie</th>
                  <th>Centro</th>
                  <th>Tecnico</th>
                  <th>Flujo</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {!historialLogistico.length ? (
                  <tr>
                    <td colSpan={8} className="text-center py-3 text-muted">
                      Sin movimientos logisticos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  historialLogistico.map((r, idx) => (
                    <tr key={`${r.id_retiro_terreno}-${r.equipo_nombre}-${r.numero_serie}-${idx}`}>
                      <td>{formatDateTime(r.fecha_retiro)}</td>
                      <td>{`N${r.id_retiro_terreno || "-"}`}</td>
                      <td>{r.equipo_nombre}</td>
                      <td>{r.numero_serie || "-"}</td>
                      <td>{r.centro}</td>
                      <td>{r.tecnico || "-"}</td>
                      <td>
                        <span className="badge badge-light border">{r.flujo_revision || "Bodega"}</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={async () => {
                            const rowsCentro = historialLogistico.filter(
                              (x) => Number(x.centro_id || 0) === Number(r.centro_id || 0)
                            );
                            setHistorialCentroLoading(true);
                            try {
                              const detalles = await obtenerDetallesCentro({ centro_id: r.centro_id });
                              const equiposActuales = Array.isArray(detalles?.equipos) ? detalles.equipos : [];
                              const rows = rowsCentro.map((row) => {
                                const actual = equiposActuales.find(
                                  (eq) => normalizeText(eq?.nombre) === normalizeText(row?.equipo_nombre)
                                );
                                const serieActual = String(actual?.numero_serie || "").trim() || "-";
                                let estadoCambio = "Sin información";
                                let estadoCambioTipo = "sin-info";
                                if (serieActual === "-") {
                                  estadoCambio = "Equipo retirado, sin serie actual en el centro.";
                                  estadoCambioTipo = "sin-actual";
                                } else if (String(row?.numero_serie || "-").trim() === serieActual) {
                                  estadoCambio = "Este equipo no tuvo modificación desde su instalación inicial.";
                                  estadoCambioTipo = "sin-cambio";
                                } else {
                                  estadoCambio = "Equipo con modificación de serie respecto al retiro.";
                                  estadoCambioTipo = "modificado";
                                }
                                return {
                                  ...row,
                                  serie_actual: serieActual,
                                  estado_cambio: estadoCambio,
                                  estado_cambio_tipo: estadoCambioTipo,
                                };
                              });
                              setHistorialCentro({
                                cliente: r.cliente,
                                centro: r.centro,
                                rows,
                              });
                            } catch (e) {
                              setHistorialCentro({
                                cliente: r.cliente,
                                centro: r.centro,
                                rows: rowsCentro.map((row) => ({
                                  ...row,
                                  serie_actual: "-",
                                  estado_cambio: "No se pudo comparar con planilla actual.",
                                  estado_cambio_tipo: "sin-info",
                                })),
                              });
                            } finally {
                              setHistorialCentroLoading(false);
                            }
                          }}
                        >
                          <i className="fas fa-search mr-1" />
	                          Ver centro
	                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {seleccionado ? (
        <div className="modal d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Recepcionar en bodega</h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => {
                    setSeleccionado(null);
                    setEquiposRecepcion([]);
                  }}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ maxHeight: "72vh", overflowY: "auto" }}>
                <p className="mb-2">
                  <strong>{seleccionado.centro || "-"}</strong> ({seleccionado.empresa || seleccionado.cliente || "-"})
                </p>
                <p className="text-muted mb-2">
                  Equipos retirados: {totalEquiposRetirados(seleccionado)}
                </p>
                <label className="form-label">Checklist equipos (equipo / código)</label>
                <div className="border rounded p-2 mb-3" style={{ maxHeight: 220, overflowY: "auto" }}>
                  {!equiposRecepcion.length ? (
                    <div className="text-muted small">Sin equipos retirados para validar.</div>
                  ) : (
                    equiposRecepcion.map((eq) => (
                      <label
                        key={eq.id_retiro_equipo || `${eq.equipo_nombre}-${eq.numero_serie}`}
                        className="d-flex align-items-start mb-2"
                        style={{ gap: 10 }}
                      >
                        <input
                          type="checkbox"
                          checked={!!eq.recibido_bodega}
                          onChange={(e) =>
                            setEquiposRecepcion((prev) =>
                              prev.map((row) =>
                                row.id_retiro_equipo === eq.id_retiro_equipo
                                  ? { ...row, recibido_bodega: e.target.checked }
                                  : row
                              )
                            )
                          }
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>{eq.equipo_nombre || "-"}</div>
                          <div className="small text-muted">
                            Serie: {eq.numero_serie || "-"} | Código: {eq.codigo || "-"}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <label className="form-label">Observacion bodega (opcional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={observacionBodega}
                  onChange={(e) => setObservacionBodega(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-light"
                  onClick={() => {
                    setSeleccionado(null);
                    setEquiposRecepcion([]);
                  }}
                >
                  Cancelar
                </button>
                <button className="btn btn-success" onClick={confirmarRecepcion} disabled={!!savingId}>
                  {savingId ? "Guardando..." : "Confirmar recepción"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

	      {retiroRevision ? (
	        <div className="modal d-block" tabIndex="-1" role="dialog">
	          <div className="modal-dialog modal-lg" role="document">
	            <div className="modal-content">
	              <div className="modal-header">
		                <h5 className="modal-title">{["instalacion_bodega", "mantencion_bodega"].includes(String(retiroRevision?.tipoFuente || "")) ? "Enviar devolucion a revision" : "Asignar a revision"}</h5>
                <button type="button" className="close" onClick={() => setRetiroRevision(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  <strong>{retiroRevision.centro || "-"}</strong> ({retiroRevision.empresa || retiroRevision.cliente || "-"})
                </p>
	                <p className="text-muted small mb-2">
	                  Selecciona el área por equipo. Se crea una orden por cada área con equipos asignados.
	                </p>
                <div className="table-responsive border rounded">
                  <table className="table table-sm mb-0">
                    <thead className="thead-light">
                      <tr>
                        <th>Equipo</th>
                        <th>N° serie</th>
                        <th>Código</th>
                        <th>Área revisión</th>
                      </tr>
                    </thead>
                    <tbody>
	                      {!revisionEquiposArea.length ? (
	                        <tr>
	                          <td colSpan={4} className="text-center text-muted py-3">
	                            No hay equipos disponibles para asignar.
	                          </td>
	                        </tr>
                      ) : (
                        revisionEquiposArea.map((eq) => (
                          <tr key={eq.id_retiro_equipo || `${eq.equipo_nombre}-${eq.numero_serie}`}>
                            <td>{eq.equipo_nombre || "-"}</td>
                            <td>{eq.numero_serie || "-"}</td>
                            <td>{eq.codigo || "-"}</td>
                            <td style={{ minWidth: 180 }}>
                              {eq.bloqueado ? (
                                <span className="badge badge-warning">
                                  Ya asignado ({labelArea(eq.area)})
                                </span>
                              ) : (
                                <select
                                  className="form-control form-control-sm"
                                  value={eq.area}
                                  onChange={(e) =>
                                    setRevisionEquiposArea((prev) =>
                                      prev.map((row) =>
                                        row.id_retiro_equipo === eq.id_retiro_equipo
                                          ? { ...row, area: e.target.value }
                                          : row
                                      )
                                    )
                                  }
                                >
                                  <option value="">Sin asignar</option>
                                  <option value="camaras">Cámaras</option>
                                  <option value="pc">PC</option>
                                  <option value="energia">Energía</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setRetiroRevision(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  disabled={asignandoRevision}
		                  onClick={async () => {
		                    const esBodegaDirecta = ["instalacion_bodega", "mantencion_bodega"].includes(String(retiroRevision?.tipoFuente || ""));
		                    const esInstalacionBodega = retiroRevision?.tipoFuente === "instalacion_bodega";
		                    const esMantencionBodega = retiroRevision?.tipoFuente === "mantencion_bodega";
		                    const retiroId = Number(retiroRevision?.id_retiro_terreno || 0);
		                    const activos = esBodegaDirecta ? null : revisionActivaPorRetiro.get(retiroId);
		                    if (!esBodegaDirecta && !retiroId) return;
	                    const areasActivas = activos?.porArea || new Set();
	                    const pendientesSinArea = revisionEquiposArea.filter(
	                      (eq) => !eq.bloqueado && !["camaras", "pc", "energia"].includes(String(eq.area || "").toLowerCase())
	                    );
                    if (pendientesSinArea.length) {
                      const nombres = pendientesSinArea
                        .slice(0, 4)
                        .map((eq) => eq.equipo_nombre || "Equipo")
                        .join(", ");
                      const extra = pendientesSinArea.length > 4 ? ` y ${pendientesSinArea.length - 4} más` : "";
                      alert(`Debes asignar área a todos los equipos retirados. Pendientes: ${nombres}${extra}.`);
                      return;
                    }
                    const seleccionados = revisionEquiposArea.filter(
                      (eq) => !eq.bloqueado && ["camaras", "pc", "energia"].includes(String(eq.area || "").toLowerCase())
                    );
                    const grupos = seleccionados.reduce((acc, eq) => {
                      const area = String(eq.area || "").toLowerCase();
                      if (!acc[area]) acc[area] = [];
                      acc[area].push(eq);
                      return acc;
                    }, {});
                    const areasDuplicadas = Object.keys(grupos).filter((a) => areasActivas.has(a));
                    if (areasDuplicadas.length) {
                      alert(`Ya existe una orden activa para: ${areasDuplicadas.map(labelArea).join(", ")}.`);
                      return;
                    }
	                    try {
		                      setAsignandoRevision(true);
		                      for (const [area, equipos] of Object.entries(grupos)) {
		                        await crearOrdenRevisionEquipos({
		                          ...(esBodegaDirecta
		                            ? {
		                                centro_id: Number(
		                                  retiroRevision?.acta?.centro_id ||
		                                    retiroRevision?.acta?.centro?.id_centro ||
		                                    retiroRevision?.mantencion?.centro_id ||
		                                    0
		                                ),
		                              }
		                            : { retiro_terreno_id: retiroId }),
		                          area,
		                          detalles: equipos.map((eq) => ({
		                            ...(esBodegaDirecta ? {} : { retiro_equipo_id: eq.id_retiro_equipo }),
		                            equipo_nombre: eq.equipo_nombre,
		                            numero_serie: eq.numero_serie,
		                            codigo: eq.codigo,
		                          })),
		                        });
		                      }
		                      if (esInstalacionBodega && retiroRevision?.row) {
		                        await actualizarEstadoDevolucionInstalacion(retiroRevision.row, (item) => ({
		                          ...item,
		                          estado_logistico: "revision_bodega",
		                        }));
		                      } else if (esMantencionBodega && retiroRevision?.row?.cambio?.id_cambio_equipo_mantencion) {
		                        await actualizarEstadoCambioEquipoMantencion(
		                          Number(retiroRevision.row.cambio.id_cambio_equipo_mantencion),
		                          { estado_logistico: "revision_bodega" }
		                        );
		                      }
	                      alert("Orden(es) de revision creada(s).");
	                      setRetiroRevision(null);
	                      setRevisionEquiposArea([]);
	                      await cargarRetiros();
                    } catch (e) {
                      alert(e?.response?.data?.error || "No se pudo crear la orden de revision.");
                    } finally {
                      setAsignandoRevision(false);
                    }
                  }}
                >
                  {asignandoRevision ? "Asignando..." : "Asignar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {historialCentro ? (
        <div className="modal d-block bodega-historial-modal" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl" role="document">
            <div className="modal-content">
              <div className="modal-header bodega-historial-header">
                <h5 className="modal-title">
                  <i className="fas fa-microscope mr-2" />
                  Historial por centro - {historialCentro.centro}
                </h5>
                <button type="button" className="close" onClick={() => setHistorialCentro(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="bodega-historial-meta mb-3">
                  <div className="bodega-historial-chip">
                    <i className="fas fa-building" />
                    {historialCentro.cliente}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-map-marker-alt" />
                    {historialCentro.centro}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-list" />
                    Registros: {Array.isArray(historialCentro.rows) ? historialCentro.rows.length : 0}
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm mb-0 bodega-table">
                    <thead className="thead-light">
                      <tr>
                        <th>Correlativo</th>
                        <th>Fecha retiro</th>
                        <th>Equipo</th>
                        <th>Serie retirada</th>
                        <th>Serie actual</th>
                        <th>Resultado</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialCentroLoading ? (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-3">Comparando equipos...</td>
                        </tr>
                      ) : historialCentro.rows.map((x, i) => (
                        <tr key={`${x.id_retiro_terreno}-${x.equipo_nombre}-${i}`}>
                          <td>{`N${x.id_retiro_terreno || "-"}`}</td>
                          <td>{formatDate(x.fecha_retiro)}</td>
                          <td>{x.equipo_nombre}</td>
                          <td
                            className={
                              x.estado_cambio_tipo === "modificado"
                                ? "bodega-serie-cambio"
                                : x.estado_cambio_tipo === "sin-cambio"
                                ? "bodega-serie-ok"
                                : "bodega-serie-neutral"
                            }
                          >
                            {x.numero_serie || "-"}
                          </td>
                          <td
                            className={
                              x.estado_cambio_tipo === "modificado"
                                ? "bodega-serie-cambio"
                                : x.estado_cambio_tipo === "sin-cambio"
                                ? "bodega-serie-ok"
                                : "bodega-serie-neutral"
                            }
                          >
                            {x.serie_actual || "-"}
                          </td>
                          <td
                            style={{ minWidth: 260 }}
                            className={
                              x.estado_cambio_tipo === "modificado"
                                ? "bodega-resultado bodega-resultado-cambio"
                                : x.estado_cambio_tipo === "sin-cambio"
                                ? "bodega-resultado bodega-resultado-ok"
                                : "bodega-resultado bodega-resultado-neutral"
                            }
                          >
                            {x.estado_cambio || "-"}
                          </td>
                          <td>{getBadgeEstado(x.estado_logistico)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setHistorialCentro(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {historialEquipo ? (
        <div className="modal d-block bodega-historial-modal" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl" role="document">
            <div className="modal-content">
              <div className="modal-header bodega-historial-header">
                <h5 className="modal-title">
                  <i className="fas fa-microscope mr-2" />
                  Historial de equipo - {historialEquipo.equipo}
                </h5>
                <button type="button" className="close" onClick={() => setHistorialEquipo(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="bodega-historial-meta mb-3">
                  <div className="bodega-historial-chip">
                    <i className="fas fa-barcode" />
                    Serie: {historialEquipo.serie}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-building" />
                    {historialEquipo.clienteActual}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-map-marker-alt" />
                    {historialEquipo.centroActual}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-calendar-alt" />
                    Instalado: {formatDate(historialEquipo.fechaInstalacionActual)}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-list" />
                    Registros: {Array.isArray(historialEquipo.rows) ? historialEquipo.rows.length : 0}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-exchange-alt" />
                    Devueltos: {historialEquipo.devoluciones || 0}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-warehouse" />
                    {historialEquipo.pasoBodega ? "Paso por bodega" : "Sin paso por bodega"}
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm mb-0 bodega-table">
                    <thead className="thead-light">
                      <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Centro</th>
                        <th>Acta</th>
                        <th>Permiso</th>
                        <th>Tipo</th>
                        <th>Tecnico</th>
                        <th>Estado uso</th>
                        <th>Logistica</th>
                        <th>Recepcion bodega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!historialEquipo.rows.length ? (
                        <tr>
                          <td colSpan={10} className="text-center text-muted py-3">
                            No hay historial disponible para esta serie.
                          </td>
                        </tr>
                      ) : historialEquipo.rows.map((row) => (
                        <tr key={row.rowKey}>
                          <td>{formatDate(row.fecha)}</td>
                          <td>{row.cliente || "-"}</td>
                          <td>{row.centro || "-"}</td>
                          <td>{row.actaId ? `N${row.actaId}` : "-"}</td>
                          <td>{row.permisoId ? `N${row.permisoId}` : "-"}</td>
                          <td>{row.tipoInstalacion || "-"}</td>
                          <td>{row.tecnico || "-"}</td>
                          <td>{getBadgeEstadoUsoInstalacion(row.estado_uso)}</td>
                          <td>{getBadgeLogisticaInstalacion(row.estado_logistico, row.estado_uso)}</td>
                          <td>
                            {normalizeText(row.estado_logistico || "") === "recepcionado_bodega"
                              ? `${row.recepcion_bodega_por || "Bodega"} · ${formatDate(row.fecha_recepcion_bodega)}`
                              : row.fecha_recepcion_bodega
                                ? formatDate(row.fecha_recepcion_bodega)
                                : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setHistorialEquipo(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showIngresoInventario ? (
        <div className="modal d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content bodega-inv-modal">
              <div className="modal-header bodega-inv-modal-header">
                <h5 className="modal-title bodega-inv-modal-title">
                  <i className="bi bi-box-seam mr-2" />
                  {inventarioEditandoId ? "Editar equipo de inventario" : "Ingreso de equipo a inventario"}
                </h5>
                <button type="button" className="close" onClick={() => {
                  setShowIngresoInventario(false);
                  setInventarioEditandoId(null);
                  setEquipoEsNuevo(false);
                  setCodigosAdicionales([]);
                  setSeriesPendientes([]);
                  setSeriesSeleccionadas([]);
                }}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body bodega-inv-modal-body">
                <div className="bodega-inv-block">
                  <div className="bodega-inv-block-title">
                    <i className="bi bi-receipt-cutoff mr-1" />
                    Compra y producto
                  </div>
                  <div className="form-row">
                    <div className="form-group col-md-3">
                      <label>Fecha</label>
                      <input
                        type="date"
                        className="form-control"
                        value={nuevoEquipo.fecha_ingreso}
                        onChange={(e) => setNuevoEquipo((prev) => ({ ...prev, fecha_ingreso: e.target.value }))}
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label>Orden de compra</label>
                      <input
                        className="form-control"
                        value={nuevoEquipo.orden_compra}
                        onChange={(e) => setNuevoEquipo((prev) => ({ ...prev, orden_compra: e.target.value }))}
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label>Valor</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={nuevoEquipo.valor}
                        onChange={(e) => setNuevoEquipo((prev) => ({ ...prev, valor: e.target.value }))}
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label className="bodega-file-label">
                        <i className="bi bi-camera2 mr-1" />
                        Adjuntar imagen
                      </label>
                      <div className="bodega-file-picker">
                        <label className="bodega-file-btn mb-0">
                          <i className="bi bi-upload mr-1" />
                          Seleccionar
                          <input
                            type="file"
                            accept="image/*"
                            className="d-none"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () =>
                                setNuevoEquipo((prev) => ({
                                  ...prev,
                                  imagen_base64: String(reader.result || ""),
                                  imagen_nombre: file.name || "",
                                  ubicacion: "Bodega central",
                                }));
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <span className="bodega-file-name" title={nuevoEquipo.imagen_nombre || ""}>
                          {nuevoEquipo.imagen_nombre || "Sin archivo"}
                        </span>
                      </div>
                      <small className="text-muted d-block mt-1">Ubicación fija: Bodega central</small>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group col-md-8">
                      <label>Descripción del producto</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={nuevoEquipo.descripcion_producto}
                        onChange={(e) => setNuevoEquipo((prev) => ({ ...prev, descripcion_producto: e.target.value }))}
                      />
                    </div>
                    <div className="form-group col-md-4 d-flex align-items-end">
                      {!!nuevoEquipo.imagen_base64 ? (
                        <img
                          src={nuevoEquipo.imagen_base64}
                          alt={nuevoEquipo.imagen_nombre || "Imagen equipo"}
                          className="bodega-inv-preview"
                        />
                      ) : (
                        <div className="bodega-inv-preview-empty">Sin imagen seleccionada</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bodega-inv-block">
                  <div className="bodega-inv-block-title">
                    <i className="bi bi-geo-alt mr-1" />
                    Estado, ubicación e identificación
                  </div>
                  <div className="form-row">
                    <div className="form-group col-md-8">
                      <label>Equipo</label>
                      <div className="bodega-equipo-mode">
                        <button
                          type="button"
                          className={`btn btn-sm ${!equipoEsNuevo ? "btn-primary" : "btn-outline-primary"}`}
                          onClick={() => setEquipoEsNuevo(false)}
                        >
                          <i className="bi bi-list-ul mr-1" />
                          Lista de Armado
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${equipoEsNuevo ? "btn-primary" : "btn-outline-primary"}`}
                          onClick={() => setEquipoEsNuevo(true)}
                        >
                          <i className="bi bi-plus-circle mr-1" />
                          Equipo nuevo
                        </button>
                      </div>
                      <div className="input-group bodega-equipo-field mt-2">
                        <div className="input-group-prepend">
                          <span className="input-group-text">
                            <i className={`bi ${equipoEsNuevo ? "bi-plus-square-dotted" : "bi-hdd-network"}`} />
                          </span>
                        </div>
                        <input
                          list={equipoEsNuevo ? undefined : "catalogo-equipos-armado"}
                          className="form-control"
                          placeholder={
                            equipoEsNuevo
                              ? "Nuevo equipo (ej: Convertidor RS485)"
                              : "Buscar o seleccionar de la lista de Armado"
                          }
                          value={nuevoEquipo.equipo_nombre}
                          onChange={(e) => setNuevoEquipo((prev) => ({ ...prev, equipo_nombre: e.target.value }))}
                        />
                      </div>
                      {!equipoEsNuevo ? (
                        <datalist id="catalogo-equipos-armado">
                          {catalogoEquiposInventario.map((item) => (
                            <option key={`inv-eq-opt-${item}`} value={item} />
                          ))}
                        </datalist>
                      ) : null}
                      <small className="text-muted d-block mt-1">
                        {equipoEsNuevo
                          ? "Modo: equipo nuevo. No usa la lista existente."
                          : "Modo: lista de Armado. Escribe para buscar en los equipos existentes."}
                      </small>
                    </div>
                    <div className="form-group col-md-4">
                      <label>Código</label>
                      <input
                        className="form-control"
                        value={nuevoEquipo.codigo}
                        onChange={(e) => setNuevoEquipo((prev) => ({ ...prev, codigo: e.target.value }))}
                      />
                    </div>
                  </div>
                  {!inventarioEditandoId ? (
                    <div className="bodega-inv-extra-codes">
                      <div className="d-flex justify-content-between align-items-center mb-2" style={{ gap: 8 }}>
                        <small className="font-weight-bold text-muted mb-0">
                          Códigos adicionales (mismo ingreso)
                        </small>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() =>
                            setCodigosAdicionales((prev) => [
                              ...prev,
                              { id: Date.now() + Math.random(), codigo: "", cantidad: 1 },
                            ])
                          }
                        >
                          <i className="bi bi-plus-circle mr-1" />
                          Agregar código
                        </button>
                      </div>
                      {codigosAdicionales.map((row, idx) => (
                        <div className="form-row align-items-end" key={`extra-cod-${row.id}`}>
                          <div className="form-group col-md-7 mb-2">
                            <label className="mb-1">Código adicional #{idx + 1}</label>
                            <input
                              className="form-control"
                              value={row.codigo}
                              onChange={(e) =>
                                setCodigosAdicionales((prev) =>
                                  prev.map((x) => (x.id === row.id ? { ...x, codigo: e.target.value } : x))
                                )
                              }
                              placeholder="Ej: 31309"
                            />
                          </div>
                          <div className="form-group col-md-3 mb-2">
                            <label className="mb-1">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              className="form-control"
                              value={row.cantidad}
                              onChange={(e) =>
                                setCodigosAdicionales((prev) =>
                                  prev.map((x) => (x.id === row.id ? { ...x, cantidad: e.target.value } : x))
                                )
                              }
                            />
                          </div>
                          <div className="form-group col-md-2 mb-2 text-right">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() =>
                                setCodigosAdicionales((prev) => prev.filter((x) => x.id !== row.id))
                              }
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="bodega-inv-divider" />
                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Modelo</label>
                      <input
                        className="form-control"
                        value={nuevoEquipo.modelo}
                        onChange={(e) => setNuevoEquipo((prev) => ({ ...prev, modelo: e.target.value }))}
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label>Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={nuevoEquipo.cantidad}
                        onChange={(e) => {
                          const nextQty = e.target.value;
                          setNuevoEquipo((prev) => ({ ...prev, cantidad: nextQty }));
                          const qty = Math.max(1, Number(nextQty || 1));
                          if (inventarioEditandoId || !esCodigoFamilia(nuevoEquipo.codigo) || qty < 1) return;
                          const sugeridas = generarSeriesDisponiblesPorCodigo(nuevoEquipo.codigo, qty);
                          if (!sugeridas.length) return;
                          setSeriesPendientes(sugeridas);
                          setSeriesSeleccionadas(sugeridas);
                          setShowSeriesConfirm(true);
                        }}
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label>N° serie</label>
                      <div className="input-group">
                        <input
                          className="form-control"
                          value={nuevoEquipo.numero_serie}
                          onChange={(e) => setNuevoEquipo((prev) => ({ ...prev, numero_serie: e.target.value }))}
                        />
                        {esCodigoFamilia(nuevoEquipo.codigo) && codigosSugeridosIngreso.length ? (
                          <div className="input-group-append">
                            <button
                              type="button"
                              className="btn btn-outline-success"
                              title="Usar primera serie sugerida"
                              onClick={() =>
                                setNuevoEquipo((prev) => ({
                                  ...prev,
                                  numero_serie: String(codigosSugeridosIngreso[0] || ""),
                                }))
                              }
                            >
                              <i className="bi bi-check2-circle mr-1" />
                              Usar sugerida
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {esCodigoFamilia(nuevoEquipo.codigo) && codigosSugeridosIngreso.length ? (
                        <small className="text-muted d-block mt-1">
                          Sugeridas:{" "}
                          {codigosSugeridosIngreso.slice(0, 3).map((s, idx) => (
                            <button
                              key={`serie-sugerida-${s}-${idx}`}
                              type="button"
                              className="btn btn-link btn-sm p-0 mr-2 align-baseline"
                              onClick={() => setNuevoEquipo((prev) => ({ ...prev, numero_serie: s }))}
                            >
                              {s}
                            </button>
                          ))}
                          {codigosSugeridosIngreso.length > 3 ? "..." : ""}
                        </small>
                      ) : null}
                      {esCodigoFamilia(nuevoEquipo.codigo) && Array.isArray(seriesSeleccionadas) && seriesSeleccionadas.length ? (
                        <div className="alert alert-success py-2 px-2 mt-2 mb-0">
                          <small className="d-block font-weight-bold">
                            Se incorporarán {seriesSeleccionadas.length} equipo{seriesSeleccionadas.length === 1 ? "" : "s"}.
                          </small>
                          <small className="d-block">
                            N° serie seleccionados:{" "}
                            <strong>
                              {seriesSeleccionadas.slice(0, 6).join(", ")}
                              {seriesSeleccionadas.length > 6 ? " ..." : ""}
                            </strong>
                          </small>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {String(nuevoEquipo.codigo || "").trim() &&
                  !esCodigoFamilia(nuevoEquipo.codigo) &&
                  codigoExiste(nuevoEquipo.codigo) ? (
                    <small className="text-warning d-block mt-1">
                      Este código ya existe. Último registro: <strong>{ultimoCodigoRegistrado(nuevoEquipo.codigo)}</strong>
                    </small>
                  ) : null}
                </div>

                {!!codigosSugeridosIngreso.length && (
                  <div className="alert alert-light border py-2 bodega-inv-codes">
                    <small className="d-block">
                      {esCodigoFamilia(nuevoEquipo.codigo) ? "Series a crear" : "Códigos a crear"} ({codigosSugeridosIngreso.length}):{" "}
                      <strong>
                        {codigosSugeridosIngreso.slice(0, 6).join(", ")}
                        {codigosSugeridosIngreso.length > 6 ? " ..." : ""}
                      </strong>
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer bodega-inv-modal-footer">
                <button className="btn btn-light" onClick={() => {
                  setShowIngresoInventario(false);
                  setInventarioEditandoId(null);
                  setEquipoEsNuevo(false);
                  setCodigosAdicionales([]);
                  setSeriesPendientes([]);
                  setSeriesSeleccionadas([]);
                }}>
                  <i className="bi bi-x-circle mr-1" />
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const serie = String(nuevoEquipo.numero_serie || "").trim();
                    const codigo = String(nuevoEquipo.codigo || "").trim();
                    const equipo = String(nuevoEquipo.equipo_nombre || "").trim();
                    const usaSeriesPorCodigo = esCodigoFamilia(codigo);
                    if ((!serie && !usaSeriesPorCodigo) || !codigo || !equipo) {
                      alert("Completa codigo y equipo. Si el codigo no es de familia numerica, tambien debes ingresar N° serie.");
                      return;
                    }
                    try {
                      if (inventarioEditandoId) {
                        await actualizarInventarioBodegaEquipo(inventarioEditandoId, {
                          ...nuevoEquipo,
                          numero_serie: serie,
                          codigo,
                          equipo_nombre: equipo,
                        });
                      } else {
                        const qty = Math.max(1, Number(nuevoEquipo.cantidad || 1));
                        const adicionales = (codigosAdicionales || [])
                          .map((x) => ({
                            codigo: String(x.codigo || "").trim(),
                            cantidad: Math.max(1, Number(x.cantidad || 1)),
                          }))
                          .filter((x) => x.codigo);
                        const codigosRepetidos = new Set();
                        [codigo, ...adicionales.map((x) => x.codigo)].forEach((c) => {
                          const k = String(c || "").toUpperCase();
                          if (!k) return;
                          if (codigosRepetidos.has(k)) codigosRepetidos.add(`dup:${k}`);
                          codigosRepetidos.add(k);
                        });
                        const hayDuplicado = Array.from(codigosRepetidos).some((x) => String(x).startsWith("dup:"));
                        if (hayDuplicado) {
                          alert("Hay códigos repetidos en este ingreso. Usa códigos distintos.");
                          return;
                        }
                        if (adicionales.some((x) => !esCodigoFamilia(x.codigo))) {
                          alert("Los códigos adicionales deben ser numéricos de familia (ej: 31308).");
                          return;
                        }

                        const payloadItems = [];
                        const principalCodigos = usaSeriesPorCodigo ? [codigo] : generarCodigosDisponibles(codigo, qty);
                        const principalSeries = usaSeriesPorCodigo
                          ? (Array.isArray(seriesSeleccionadas) && seriesSeleccionadas.length
                              ? seriesSeleccionadas
                              : generarSeriesDisponiblesPorCodigo(codigo, qty))
                          : [];
                        if ((!usaSeriesPorCodigo && !principalCodigos.length) || (usaSeriesPorCodigo && !principalSeries.length)) {
                          alert(
                            usaSeriesPorCodigo
                              ? "No se pudo generar serie disponible. Ajusta el codigo base."
                              : "No se pudo generar código disponible. Ajusta el código base."
                          );
                          return;
                        }
                        const totalPrincipal = usaSeriesPorCodigo ? principalSeries.length : qty;
                        for (let idx = 0; idx < totalPrincipal; idx += 1) {
                          payloadItems.push({
                            ...nuevoEquipo,
                            numero_serie: usaSeriesPorCodigo
                              ? principalSeries[idx]
                              : qty > 1
                                ? `${serie}-${idx + 1}`
                                : serie,
                            codigo: usaSeriesPorCodigo ? codigo : principalCodigos[idx],
                            equipo_nombre: equipo,
                          });
                        }

                        for (const add of adicionales) {
                          const seriesAdd = generarSeriesDisponiblesPorCodigo(add.codigo, add.cantidad);
                          if (!seriesAdd.length) {
                            alert(`No se pudieron generar series para el código adicional ${add.codigo}.`);
                            return;
                          }
                          seriesAdd.forEach((serieAdd) => {
                            payloadItems.push({
                              ...nuevoEquipo,
                              codigo: add.codigo,
                              numero_serie: serieAdd,
                              equipo_nombre: equipo,
                            });
                          });
                        }

                        await crearInventarioBodegaEquipos({ items: payloadItems });
                      }
                      await cargarInventarioManual();
                      setNuevoEquipo({
                        numero_serie: "",
                        codigo: "",
                        equipo_nombre: "",
                        descripcion_producto: "",
                        fecha_ingreso: new Date().toISOString().slice(0, 10),
                        orden_compra: "",
                        valor: "",
                        cantidad: 1,
                        modelo: "",
                        estado_equipo: "Operativo",
                        ubicacion: "Bodega central",
                        imagen_base64: "",
                        imagen_nombre: "",
                      });
                      setEquipoEsNuevo(false);
                      setCodigosAdicionales([]);
                      setSeriesPendientes([]);
                      setSeriesSeleccionadas([]);
                      setShowIngresoInventario(false);
                      setInventarioEditandoId(null);
                    } catch (e) {
                      alert(e?.response?.data?.error || "No se pudo guardar en inventario.");
                    }
                  }}
                >
                  <i className={`bi ${inventarioEditandoId ? "bi-save2" : "bi-plus-circle"} mr-1`} />
                  {inventarioEditandoId ? "Guardar cambios" : "Guardar equipo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {equipoAsignacionModal ? (
        <div className="modal d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content bodega-inv-modal">
              <div className="modal-header bodega-inv-modal-header">
                <h5 className="modal-title bodega-inv-modal-title">
                  <i className="fas fa-user-plus" />
                  Asignar equipo a tecnico
                </h5>
                <button type="button" className="close" onClick={() => setEquipoAsignacionModal(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body bodega-inv-modal-body">
                <div className="bodega-inv-block">
                  <div className="small text-muted mb-2">
                    <strong>{equipoAsignacionModal.equipo_nombre || "-"}</strong> · Serie:{" "}
                    {equipoAsignacionModal.numero_serie || "-"} · Código: {equipoAsignacionModal.codigo || "-"}
                  </div>
                  <div className="form-group">
                    <label>Tecnico</label>
                    <select
                      className="form-control"
                      value={tecnicoAsignacionId}
                      onChange={(e) => setTecnicoAsignacionId(e.target.value)}
                    >
                      <option value="">Seleccionar tecnico...</option>
                      {tecnicosSistema.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.nombre || u.email || `User ${u.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label>Observacion (opcional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={obsAsignacion}
                      onChange={(e) => setObsAsignacion(e.target.value)}
                      placeholder="Motivo de entrega o uso"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer bodega-inv-modal-footer">
                <button className="btn btn-light" onClick={() => setEquipoAsignacionModal(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!tecnicoAsignacionId || asignandoEquipoId === Number(equipoAsignacionModal?.id_bodega_equipo || 0)}
                  onClick={async () => {
                    await asignarEquipoATecnico(equipoAsignacionModal);
                    setEquipoAsignacionModal(null);
                  }}
                >
                  <i className="fas fa-check mr-1" />
                  Confirmar asignacion
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendientesDetalleModal ? (
        <div className="modal d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-scrollable" role="document">
            <div className="modal-content bodega-inv-modal">
              <div className="modal-header bodega-inv-modal-header">
                <h5 className="modal-title bodega-inv-modal-title">
                  <i className="fas fa-exclamation-circle" />
                  Pendientes del armado #{pendientesDetalleModal?.id_armado}
                </h5>
                <button type="button" className="close" onClick={() => setPendientesDetalleModal(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body bodega-inv-modal-body">
                <div className="mb-3">
                  <div><strong>Cliente:</strong> {pendientesDetalleModal?.centro?.cliente || "-"}</div>
                  <div><strong>Centro:</strong> {pendientesDetalleModal?.centro?.nombre || "-"}</div>
                </div>
                {Array.isArray(pendientesDetalleModal?.armado_pendientes_detalle) && pendientesDetalleModal.armado_pendientes_detalle.length ? (
                  <div className="list-group">
                    {pendientesDetalleModal.armado_pendientes_detalle.map((item, idx) => (
                      <div key={`pend-${idx}`} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start" style={{ gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "#7c2d12" }}>{item?.nombre || "Pendiente"}</div>
                            <small className="text-muted text-uppercase">{item?.tipo || "equipo"}</small>
                          </div>
                          <span className="badge badge-warning">Pendiente</span>
                        </div>
                        {String(item?.observacion || "").trim() ? (
                          <div className="mt-2 small" style={{ color: "#9a3412" }}>
                            Observacion: {item.observacion}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted">No hay detalle disponible.</div>
                )}
              </div>
              <div className="modal-footer bodega-inv-modal-footer">
                <button className="btn btn-light" onClick={() => setPendientesDetalleModal(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAsignacionDirectaModal ? (
        <div className="modal d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content bodega-inv-modal">
              <div className="modal-header bodega-inv-modal-header">
                <h5 className="modal-title bodega-inv-modal-title">
                  <i className="fas fa-user-plus" />
                  Asignar equipos a tecnicos
                </h5>
                <button type="button" className="close" onClick={() => setShowAsignacionDirectaModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body bodega-inv-modal-body">
                <div className="bodega-inv-block">
                  <div className="form-group">
                    <label>Equipo disponible</label>
                    <select
                      className="form-control"
                      value={equipoAsignacionDirectaId}
                      onChange={(e) => setEquipoAsignacionDirectaId(e.target.value)}
                    >
                      <option value="">Seleccionar equipo...</option>
                      {equiposDisponiblesParaAsignar.map((x) => (
                        <option key={`disp-asg-${x.id_bodega_equipo}`} value={x.id_bodega_equipo}>
                          {`${x.equipo_nombre || "-"} | ${x.numero_serie || "-"} | ${x.codigo || "-"}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tecnico</label>
                    <select
                      className="form-control"
                      value={tecnicoAsignacionId}
                      onChange={(e) => setTecnicoAsignacionId(e.target.value)}
                    >
                      <option value="">Seleccionar tecnico...</option>
                      {tecnicosSistema.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.nombre || u.email || `User ${u.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label>Observacion (opcional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={obsAsignacion}
                      onChange={(e) => setObsAsignacion(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer bodega-inv-modal-footer">
                <button className="btn btn-light" onClick={() => setShowAsignacionDirectaModal(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!equipoAsignacionDirectaId || !tecnicoAsignacionId}
                  onClick={async () => {
                    const row = equiposDisponiblesParaAsignar.find(
                      (x) => String(x.id_bodega_equipo || "") === String(equipoAsignacionDirectaId)
                    );
                    if (!row) return;
                    await asignarEquipoATecnico(row);
                    setShowAsignacionDirectaModal(false);
                  }}
                >
                  <i className="fas fa-check mr-1" />
                  Confirmar asignacion
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showGuiaModal && armadoGuia ? (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document">
            <div
              className="modal-content"
              style={{
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid #dbeafe",
                boxShadow: "0 24px 60px rgba(15,23,42,.24)",
              }}
            >
              <div
                className="modal-header"
                style={{
                  background: "linear-gradient(135deg,#eff6ff,#dbeafe 52%,#f8fbff)",
                  borderBottom: "1px solid #bfdbfe",
                  padding: "18px 22px",
                }}
              >
                <div className="d-flex align-items-center justify-content-between w-100" style={{ gap: 16 }}>
                  <div className="d-flex align-items-center" style={{ gap: 14 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        background: "linear-gradient(135deg,#1d4ed8,#60a5fa)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 12px 24px rgba(37,99,235,.25)",
                      }}
                    >
                      <i className="fas fa-file-export" />
                    </div>
                    <div>
                      <h5 className="modal-title mb-1" style={{ color: "#0f172a", fontWeight: 800 }}>
                        Guia de salida a centro
                      </h5>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        Revisa el despacho, valida cajas y prepara el PDF.
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center" style={{ gap: 10 }}>
                    <span
                      className="badge px-3 py-2"
                      style={{ background: "#fff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 999 }}
                    >
                      {formGuia.numero_guia || "Sin numero"}
                    </span>
                    <button
                      type="button"
                      className="close d-flex align-items-center justify-content-center"
                      style={{ width: 38, height: 38, borderRadius: 12, background: "#ffffff", border: "1px solid #bfdbfe", opacity: 1 }}
                      onClick={() => {
                        setShowGuiaModal(false);
                        setArmadoGuia(null);
                        setGuiaSeleccionadaId(null);
                      }}
                    >
                      <span style={{ fontSize: 24, lineHeight: 1, color: "#334155" }}>&times;</span>
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="modal-body"
                style={{
                  maxHeight: "72vh",
                  overflowY: "auto",
                  background: "linear-gradient(180deg,#f8fafc,#f1f5f9)",
                  padding: "22px",
                }}
              >
                <div className="row">
                  <div className="col-lg-4 mb-3 mb-lg-0">
                    <div
                      className="h-100 p-3"
                      style={{
                        background: "linear-gradient(180deg,#ffffff,#eef4ff)",
                        border: "1px solid #dbeafe",
                        borderRadius: 22,
                        boxShadow: "0 14px 32px rgba(15,23,42,.06)",
                      }}
                    >
                      <div className="d-flex flex-wrap mb-3" style={{ gap: 8 }}>
                        <span className="badge px-3 py-2" style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 999 }}>
                          Armado #{armadoGuia.id_armado}
                        </span>
                        <span className="badge px-3 py-2" style={{ background: "#ecfeff", color: "#0f766e", borderRadius: 999 }}>
                          {cajasSeleccionadasGuia.length} cajas
                        </span>
                      </div>

                      <div className="mb-2 p-2 rounded" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                        <strong>Armado:</strong> {armadoGuia.id_armado}
                      </div>
                      <div className="mb-2 p-2 rounded" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                        <strong>Cliente:</strong> {armadoGuia?.centro?.cliente || "-"}
                      </div>
                      <div className="mb-3 p-2 rounded" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                        <strong>Centro:</strong> {armadoGuia?.centro?.nombre || "-"}
                      </div>

                      <div className="form-group">
                        <label className="small text-muted mb-1">N guia</label>
                        <input
                          className="form-control"
                          value={formGuia.numero_guia}
                          readOnly={!modoEdicionGuia}
                          onChange={(e) => setFormGuia((p) => ({ ...p, numero_guia: e.target.value }))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="small text-muted mb-1">Fecha salida</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formGuia.fecha_salida}
                          disabled={!modoEdicionGuia}
                          onChange={(e) => setFormGuia((p) => ({ ...p, fecha_salida: e.target.value }))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="small text-muted mb-1">Modalidad de salida</label>
                        <select
                          className="form-control"
                          value={formGuia.modalidad_salida}
                          disabled={!modoEdicionGuia}
                          onChange={(e) => setFormGuia((p) => ({ ...p, modalidad_salida: e.target.value }))}
                        >
                          <option value="transportista_externo">Envio por transportista externo</option>
                          <option value="por_mano">Envio por mano</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="small text-muted mb-1">
                          {modoEdicionGuia ? "Cajas para este despacho" : "Cajas incluidas"}
                        </label>
                        <div
                          className="border rounded p-2"
                          style={{
                            maxHeight: 220,
                            overflowY: "auto",
                            background: "linear-gradient(180deg,#ffffff,#f8fbff)",
                            borderColor: "#cfe0ff",
                            borderRadius: 16,
                          }}
                        >
                          {loadingGuiaCajas ? (
                            <div className="text-muted small">Cargando cajas...</div>
                          ) : !cajasDisponiblesGuia.length && !cajasSeleccionadasGuia.length ? (
                            <div className="text-muted small">No hay cajas disponibles para despachar.</div>
                          ) : (
                            (modoEdicionGuia ? cajasDisponiblesGuia : cajasSeleccionadasGuia).map((caja) => {
                              const checked = cajasSeleccionadasGuia.includes(caja);
                              return (
                                <label
                                  key={`caja-sel-${caja}`}
                                  className="d-flex align-items-center justify-content-between mb-2 px-3 py-2 rounded"
                                  style={{
                                    background: checked ? "linear-gradient(135deg,rgba(37,99,235,.14),rgba(96,165,250,.18))" : "#fff",
                                    border: checked ? "1px solid #60a5fa" : "1px solid #dbeafe",
                                    borderRadius: 14,
                                    cursor: modoEdicionGuia ? "pointer" : "default",
                                    boxShadow: checked ? "0 10px 20px rgba(37,99,235,.10)" : "none",
                                  }}
                                >
                                  <span className="font-weight-600">{caja}</span>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!modoEdicionGuia}
                                    onChange={() =>
                                      setCajasSeleccionadasGuia((prev) =>
                                        checked
                                          ? prev.filter((item) => item !== caja)
                                          : [...prev, caja].sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
                                      )
                                    }
                                  />
                                </label>
                              );
                            })
                          )}
                        </div>

                        <div className="d-flex flex-wrap mt-2" style={{ gap: 8 }}>
                          <span className="badge px-3 py-2" style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 999 }}>
                            {modoEdicionGuia ? "Seleccionadas" : "Enviadas"}: {cajasSeleccionadasGuia.length}
                          </span>
                          <span className="badge px-3 py-2" style={{ background: "#dcfce7", color: "#166534", borderRadius: 999 }}>
                            Ya enviadas: {cajasYaEnviadasGuiaModal}
                          </span>
                          <span className="badge px-3 py-2" style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 999 }}>
                            Pendientes: {cajasPendientesGuiaModal}
                          </span>
                        </div>
                      </div>

                      <div className="form-group mb-3">
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            borderRadius: 12,
                            padding: "10px 14px",
                            fontWeight: 800,
                            border: verCodigoGuia ? "none" : "1px solid #93c5fd",
                            background: verCodigoGuia ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "#eff6ff",
                            color: verCodigoGuia ? "#fff" : "#1d4ed8",
                            boxShadow: verCodigoGuia ? "0 10px 20px rgba(37,99,235,.22)" : "none",
                          }}
                          onClick={() => setVerCodigoGuia((v) => !v)}
                        >
                          <i className="fas fa-barcode mr-1" />
                          {verCodigoGuia ? "Ocultar N serie" : "Ver N serie"}
                        </button>
                      </div>

                      <div className="form-group mb-0">
                        <label className="small text-muted mb-1">Observacion</label>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={formGuia.observacion}
                          readOnly={!modoEdicionGuia}
                          onChange={(e) => setFormGuia((p) => ({ ...p, observacion: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-8">
                    <div
                      className="p-3 border rounded"
                      style={{
                        background: "linear-gradient(180deg,#ffffff,#f8fbff)",
                        borderColor: "#bfdbfe",
                        borderRadius: 22,
                        boxShadow: "0 18px 38px rgba(37,99,235,.12)",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3" style={{ gap: 12 }}>
                        <div>
                          <strong style={{ color: "#1e3a8a", fontSize: 16 }}>
                            <i className="fas fa-file-alt mr-2" />
                            Vista previa guia
                          </strong>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                            Documento previo del despacho con el contenido consolidado.
                          </div>
                        </div>
                        <div className="d-flex flex-wrap justify-content-end" style={{ gap: 8 }}>
                          <span className="badge px-3 py-2" style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 999 }}>
                            {formGuia.numero_guia || "-"}
                          </span>
                          <span
                            className="badge px-3 py-2"
                            style={{
                              background: cajasSeleccionadasGuia.length === (guiaCajasDetalle || []).length ? "#dcfce7" : "#fef3c7",
                              color: cajasSeleccionadasGuia.length === (guiaCajasDetalle || []).length ? "#166534" : "#92400e",
                              borderRadius: 999,
                            }}
                          >
                            {cajasSeleccionadasGuia.length === (guiaCajasDetalle || []).length ? "Despacho total" : "Despacho parcial"}
                          </span>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <small className="text-muted d-block">Cliente</small>
                          <strong>{armadoGuia?.centro?.cliente || "-"}</strong>
                        </div>
                        <div className="col-md-6 mb-2">
                          <small className="text-muted d-block">Centro destino</small>
                          <strong>{armadoGuia?.centro?.nombre || "-"}</strong>
                        </div>
                        <div className="col-md-6 mb-2">
                          <small className="text-muted d-block">Tecnico encargado</small>
                          <strong>{armadoGuia?.tecnico?.nombre || "-"}</strong>
                          {Array.isArray(armadoGuia?.tecnicos_asignados) &&
                          armadoGuia.tecnicos_asignados.filter((tec) => !tec?.principal).length ? (
                            <small className="d-block text-muted">
                              Apoyo:{" "}
                              {armadoGuia.tecnicos_asignados
                                .filter((tec) => !tec?.principal)
                                .map((tec) => tec?.nombre)
                                .filter(Boolean)
                                .join(", ")}
                            </small>
                          ) : null}
                        </div>
                        <div className="col-md-6 mb-2">
                          <small className="text-muted d-block">Fecha salida</small>
                          <strong>{formatDate(formGuia.fecha_salida)}</strong>
                        </div>
                        <div className="col-md-6 mb-2">
                          <small className="text-muted d-block">Modalidad</small>
                          <strong>{obtenerEtiquetaModalidadSalida(formGuia.modalidad_salida)}</strong>
                        </div>
                        <div className="col-md-6 mb-2">
                          <small className="text-muted d-block">Tipo</small>
                          <strong>{cajasSeleccionadasGuia.length === (guiaCajasDetalle || []).length ? "Total" : "Parcial"}</strong>
                        </div>
                        <div className="col-12">
                          <small className="text-muted d-block">Observacion</small>
                          <strong>{formGuia.observacion || "-"}</strong>
                        </div>
                      </div>

                      <hr />

                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong style={{ color: "#1e3a8a" }}>Detalle de cajas y contenido</strong>
                        <span className="badge badge-info">Cajas despacho: {guiaCajasDetalleVisible.length}</span>
                      </div>

                      {loadingGuiaCajas ? (
                        <div className="text-muted small">Cargando contenido...</div>
                      ) : !guiaCajasDetalleVisible.length ? (
                        <div className="text-muted small">Sin detalle de contenido registrado.</div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm mb-0">
                            <thead>
                              <tr>
                                <th>Caja</th>
                                <th>Cantidad</th>
                                <th>Contenido</th>
                              </tr>
                            </thead>
                            <tbody>
                              {guiaCajasDetalleVisible.map((row) => {
                                const totalEquipos = (row.equipos || []).reduce((acc, it) => acc + Number(it.cantidad || 0), 0);
                                const totalMateriales = (row.materiales || []).reduce((acc, it) => acc + Number(it.cantidad || 0), 0);
                                const totalItems = totalEquipos + totalMateriales;
                                return (
                                  <tr key={`caja-prev-${row.caja}`}>
                                    <td>{row.caja}</td>
                                    <td>
                                      <div><strong>Total:</strong> {totalItems}</div>
                                      <div><strong>Equipos:</strong> {totalEquipos}</div>
                                      <div><strong>Materiales:</strong> {totalMateriales}</div>
                                    </td>
                                    <td>
                                      <div>
                                        <strong>Equipos:</strong>
                                        {(row.equipos || []).length ? (
                                          <ul className="mb-1 mt-1 pl-3">
                                            {(row.equipos || []).map((it, idx) => (
                                              <li key={`eq-${row.caja}-${idx}`}>
                                                {it.nombre} x{it.cantidad}
                                                {verCodigoGuia && it.serie ? ` - N Serie: ${it.serie}` : ""}
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <span> -</span>
                                        )}
                                      </div>
                                      {(row.materiales || []).length ? (
                                        <div className="mt-1">
                                          <strong>Materiales:</strong>
                                          <ul className="mb-0 mt-1 pl-3">
                                            {(row.materiales || []).map((it, idx) => (
                                              <li key={`mat-${row.caja}-${idx}`}>{it.nombre} x{it.cantidad}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ background: "#f8fafc", borderTop: "1px solid #dbeafe", padding: "16px 22px" }}>
                <div className="d-flex w-100 justify-content-between align-items-center flex-wrap" style={{ gap: 12 }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                    {cajasSeleccionadasGuia.length} cajas listas para este despacho.
                  </div>
                  <div className="d-flex flex-wrap" style={{ gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-light"
                      style={{ borderRadius: 12, border: "1px solid #cbd5e1", padding: "10px 16px", fontWeight: 700 }}
                      onClick={() => {
                        setShowGuiaModal(false);
                        setArmadoGuia(null);
                        setGuiaSeleccionadaId(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn text-white"
                      style={{
                        background: "linear-gradient(135deg,#dc2626,#ef4444)",
                        border: "none",
                        borderRadius: 12,
                        boxShadow: "0 12px 24px rgba(220,38,38,.22)",
                        padding: "10px 16px",
                        fontWeight: 800,
                      }}
                      onClick={imprimirGuiaSalida}
                    >
                      <i className="fas fa-print mr-1" />
                      Imprimir / PDF
                    </button>
                    {modoEdicionGuia ? (
                      <button
                        type="button"
                        className="btn text-white"
                        style={{
                          background: "linear-gradient(135deg,#1d4ed8,#2563eb)",
                          border: "none",
                          borderRadius: 12,
                          boxShadow: "0 12px 24px rgba(37,99,235,.22)",
                          padding: "10px 16px",
                          fontWeight: 800,
                        }}
                        onClick={guardarGuiaSalida}
                      >
                        <i className="fas fa-save mr-1" />
                        Guardar guia
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showSeriesConfirm ? (
        <div className="modal d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-sm" role="document">
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title mb-0">
                  <i className="bi bi-check2-square mr-1" />
                  Series disponibles
                </h6>
                <button type="button" className="close" onClick={() => setShowSeriesConfirm(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body py-2">
                {!seriesPendientes.length ? (
                  <small className="text-muted">No hay series sugeridas.</small>
                ) : (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted mb-0">Selecciona las series a crear:</small>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={() => {
                          if (seriesSeleccionadas.length === seriesPendientes.length) {
                            setSeriesSeleccionadas([]);
                          } else {
                            setSeriesSeleccionadas([...seriesPendientes]);
                          }
                        }}
                      >
                        {seriesSeleccionadas.length === seriesPendientes.length ? "Quitar todas" : "Marcar todas"}
                      </button>
                    </div>
                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                      {seriesPendientes.map((s) => (
                        <label
                          key={`serie-confirm-${s}`}
                          className="d-flex align-items-center mb-1"
                          style={{ gap: 8, cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            checked={seriesSeleccionadas.includes(s)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSeriesSeleccionadas((prev) =>
                                checked ? [...prev, s] : prev.filter((x) => x !== s)
                              );
                            }}
                          />
                          <code>{s}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer py-2">
                <button className="btn btn-light btn-sm" onClick={() => setShowSeriesConfirm(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => {
                    const elegidas = Array.isArray(seriesSeleccionadas) ? seriesSeleccionadas : [];
                    if (elegidas.length) {
                      setNuevoEquipo((prev) => ({
                        ...prev,
                        numero_serie: String(elegidas[0] || ""),
                        cantidad: elegidas.length,
                      }));
                    }
                    setShowSeriesConfirm(false);
                  }}
                  disabled={!seriesSeleccionadas.length}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}













