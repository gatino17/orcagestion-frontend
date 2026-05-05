import React, { useEffect, useMemo, useState } from "react";
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
} from "../api";
import "./BodegaRetiros.css";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
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
  const [usuario, setUsuario] = useState({ id: null, nombre: "Bodega" });
  const [filtroHistorial, setFiltroHistorial] = useState("");
  const [filtroInventario, setFiltroInventario] = useState("");
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
  const [retiroRevision, setRetiroRevision] = useState(null);
  const [revisionEquiposArea, setRevisionEquiposArea] = useState([]);
  const [asignandoRevision, setAsignandoRevision] = useState(false);
  const [ordenesRevision, setOrdenesRevision] = useState([]);

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

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
      });
    } catch {
      setUsuario({ id: null, nombre: "Bodega" });
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
      const [data, ordenes] = await Promise.all([
        obtenerRetirosTerreno({
          cliente_id: clienteId || undefined,
          centro_id: centroId || undefined,
        }),
        obtenerOrdenesRevisionEquipos(),
      ]);
      setRetiros(Array.isArray(data) ? data : []);
      setOrdenesRevision(Array.isArray(ordenes) ? ordenes : []);
    } catch {
      setRetiros([]);
      setOrdenesRevision([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
    cargarInventarioManual();
  }, []);

  useEffect(() => {
    setCentroId("");
    cargarCentros(clienteId);
  }, [clienteId]);

  useEffect(() => {
    cargarRetiros();
  }, [clienteId, centroId]);

  const enTransito = useMemo(
    () => retiros.filter((r) => String(r.estado_logistico || "") === "en_transito"),
    [retiros]
  );
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
  const totalPendienteTransito = enTransito.length;

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

  return (
    <div className="container-fluid py-3 bodega-page">
      <div className="card shadow-sm border-0 mb-3 bodega-hero">
        <div className="card-body d-flex justify-content-between align-items-start flex-wrap" style={{ gap: 10 }}>
          <div>
            <h4 className="mb-2">Bodega</h4>
            <p className="text-muted mb-0">
              Flujo: retirado del centro → en tránsito → en bodega → revisión.
            </p>
          </div>
          <div className="bodega-kpis-inline bodega-hero-kpis">
            <span className="bodega-kpi-chip bodega-kpi-transito">
              <i className="fas fa-route" />
              En tránsito: {totalPendienteTransito}
            </span>
            <span className="bodega-kpi-chip bodega-kpi-hoy">
              <i className="fas fa-check-circle" />
              En bodega: {enBodega.length}
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
      <div className="card shadow-sm border-0 mb-3 bodega-filtros">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label">Cliente</label>
              <select className="form-control" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Todos</option>
                {clientes.map((c) => {
                  const id = c.id_cliente ?? c.id;
                  return (
                    <option key={id} value={id}>
                      {c.nombre || c.razon_social || `Cliente ${id}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Centro</label>
              <select
                className="form-control"
                value={centroId}
                onChange={(e) => setCentroId(e.target.value)}
                disabled={!clienteId}
              >
                <option value="">Todos</option>
                {centros.map((c) => {
                  const id = c.id_centro ?? c.id;
                  return (
                    <option key={id} value={id}>
                      {c.nombre || `Centro ${id}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button className="btn btn-outline-primary w-100" onClick={cargarRetiros}>
                Recargar
              </button>
            </div>
          </div>
        </div>
      </div>


      <div className="card shadow-sm border-0 mb-3 bodega-tabla bodega-tabla-transito">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-truck-loading mr-2 text-primary" />
            En transito ({enTransito.length})
          </strong>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N°</th>
                  <th>Correlativo</th>
                  <th>Fecha retiro</th>
                  <th>Cliente</th>
                  <th>Centro</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Equipos retirados</th>
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
                ) : !enTransito.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3 text-muted">
                      Sin retiros en transito.
                    </td>
                  </tr>
                ) : (
                  enTransito.map((r) => (
                    <tr key={r.id_retiro_terreno}>
                      <td>{r.id_retiro_terreno}</td>
                      <td>{`N${r.id_retiro_terreno || "-"}`}</td>
                      <td>{formatDate(r.fecha_retiro)}</td>
                      <td>{r.empresa || r.cliente || "-"}</td>
                      <td>{r.centro || "-"}</td>
                      <td>{r.tipo_retiro === "completo" ? "Completo" : "Parcial"}</td>
                      <td>
                        <span className="badge badge-warning">En tránsito</span>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-warehouse mr-2 text-success" />
            En bodega ({enBodega.length})
          </strong>
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
                  <th className="text-center">Accion</th>
                </tr>
              </thead>
              <tbody>
                {!enBodega.length ? (
                  <tr>
                    <td colSpan={8} className="text-center py-3 text-muted">
                      Sin retiros recepcionados en bodega.
                    </td>
                  </tr>
                ) : (
                  enBodega.map((r) => (
                    <tr key={r.id_retiro_terreno}>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
                  <th>Ubicación actual</th>
                  <th>Últ. actualización</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {!inventarioEquipos.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3 text-muted">
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
                      <td>{r.ubicacion || "-"}</td>
                      <td>{formatDateTime(r.updated_at)}</td>
                      <td className="text-center">
                        {r.es_manual ? (
                          <div className="d-inline-flex" style={{ gap: 6 }}>
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
                  <th>Técnico</th>
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
          <div className="modal-dialog" role="document">
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
              <div className="modal-body">
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
                  {savingId ? "Guardando..." : "Confirmar recepcion"}
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
                <h5 className="modal-title">Asignar a revision</h5>
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
                            No hay equipos retirados para asignar.
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
                    const retiroId = Number(retiroRevision?.id_retiro_terreno || 0);
                    if (!retiroId) return;
                    const activos = revisionActivaPorRetiro.get(retiroId);
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
                          retiro_terreno_id: retiroId,
                          area,
                          detalles: equipos.map((eq) => ({
                            retiro_equipo_id: eq.id_retiro_equipo,
                            equipo_nombre: eq.equipo_nombre,
                            numero_serie: eq.numero_serie,
                            codigo: eq.codigo,
                          })),
                        });
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

