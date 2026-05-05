import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  crearAbonoRendicion,
  obtenerActasEntrega,
  obtenerAbonosRendicion,
  obtenerCentros,
  obtenerClientes,
  obtenerMantencionesTerreno,
  obtenerSaldosRendicion,
  obtenerRendiciones,
  obtenerRetirosTerreno,
} from "../api";
import "./Rendiciones.css";

const CATEGORIAS = ["movilizacion", "alimentacion", "peaje", "materiales", "hospedaje", "otro"];
const TIPOS_ACTIVIDAD_BASE = ["instalacion", "reapuntamiento", "mantencion", "retiro"];

const formatMoney = (value) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const formatDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CL");
};

const formatDateTime = (v) => {
  if (!v) return "-";
  const raw = String(v).trim();
  // Backend guarda timestamps UTC sin zona; si viene sin offset, lo tratamos como UTC.
  const hasTz = /([zZ]|[+\-]\d{2}:\d{2})$/.test(raw);
  const d = new Date(hasTz ? raw : `${raw}Z`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  });
};

const escHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const parseMontoTexto = (txt) => {
  const raw = String(txt || "").replace(/[^\d,.-]/g, "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const buildDescripcionRows = (rendicion) => {
  const descripcion = String(rendicion?.descripcion || "").trim();
  if (!descripcion) return { rows: [], saldo: null };

  try {
    const parsed = JSON.parse(descripcion);
    if (Array.isArray(parsed)) {
      const rows = parsed
        .map((x) => ({
          descripcion: String(x?.descripcion || x?.detalle || "").trim(),
          monto: Number(x?.monto || x?.valor || 0) || 0,
          fecha: String(x?.fecha || "").trim(),
          documento: String(x?.documento || x?.n_documento || "").trim(),
        }))
        .filter((x) => x.descripcion);
      return { rows, saldo: null };
    }
  } catch (_) {
    // descripcion no es json, seguimos con parse por lineas
  }

  const lines = descripcion
    .split(/\r?\n/)
    .map((l) => String(l || "").trim())
    .filter(Boolean);

  if (!lines.length) return { rows: [], saldo: null };

  let saldo = null;
  let inDetalle = false;
  const rows = [];
  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith("tecnicos asociados json:")) return;
    if (lower.startsWith("saldo:")) {
      saldo = parseMontoTexto(line.split(":").slice(1).join(":"));
      return;
    }
    if (lower === "detalle:" || lower === "detalle") {
      inDetalle = true;
      return;
    }
    if (!inDetalle) return;

    const mDetalle = line.match(/^(.+?)\s*\|\s*Doc:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*([\d\.\,\-]+)\s*$/i);
    if (mDetalle) {
      rows.push({
        fecha: String(mDetalle[1] || "").trim(),
        documento: String(mDetalle[2] || "").trim(),
        descripcion: String(mDetalle[3] || "").trim(),
        monto: parseMontoTexto(mDetalle[4]),
      });
      return;
    }

    const m = line.match(/(.+?)\s+(\$?\s*[\d\.\,]+)\s*$/);
    if (m) {
      rows.push({ descripcion: m[1].trim(), monto: parseMontoTexto(m[2]), fecha: "", documento: "" });
      return;
    }
    rows.push({ descripcion: line, monto: 0, fecha: "", documento: "" });
  });
  return { rows, saldo };
};

const extractResumenCampos = (rendicion) => {
  const txt = String(rendicion?.descripcion || "");
  const lines = txt.split(/\r?\n/).map((l) => String(l || "").trim());
  const read = (prefix) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(prefix));
    if (!line) return null;
    const value = line.split(":").slice(1).join(":").trim();
    return value || null;
  };
  return {
    totalRendir: read("total a rendir:"),
    totalGastos: read("total gastos:"),
    saldo: read("saldo:"),
    actividades: read("actividades:"),
  };
};

const extractTecnicosAsociados = (rendicion) => {
  const fromNombre = String(rendicion?.tecnico_nombre || "").trim();
  const descripcion = String(rendicion?.descripcion || "");
  const line = descripcion
    .split(/\r?\n/)
    .map((l) => String(l || "").trim())
    .find((l) => l.toLowerCase().startsWith("tecnicos asociados:"));
  const fromLinea = line
    ? line
        .split(":")
        .slice(1)
        .join(":")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  const all = [fromNombre, ...fromLinea].filter(Boolean);
  return Array.from(new Set(all));
};

const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const keyCliente = (clienteId, clienteNombre) => {
  const id = Number(clienteId || 0) || 0;
  if (id > 0) return `id-${id}`;
  const n = normalizeText(clienteNombre);
  return n ? `nom-${n}` : "sin-cliente";
};

const normalizarTipo = (v) => {
  const s = normalizeText(v);
  if (s.startsWith("reap")) return "instalacion";
  if (s.startsWith("instal")) return "instalacion";
  if (s.startsWith("manten")) return "mantencion";
  if (s.startsWith("retir")) return "retiro";
  return s;
};

const toIsoDate = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getPeriodRange = (periodo, fechaDesdeCustom, fechaHastaCustom) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (periodo === "mes_actual") {
    return {
      desde: toIsoDate(new Date(year, month, 1)),
      hasta: toIsoDate(new Date(year, month + 1, 0)),
    };
  }
  if (periodo === "mes_anterior") {
    return {
      desde: toIsoDate(new Date(year, month - 1, 1)),
      hasta: toIsoDate(new Date(year, month, 0)),
    };
  }
  if (periodo === "anio_actual") {
    return {
      desde: toIsoDate(new Date(year, 0, 1)),
      hasta: toIsoDate(new Date(year, 11, 31)),
    };
  }
  if (periodo === "anio_anterior") {
    return {
      desde: toIsoDate(new Date(year - 1, 0, 1)),
      hasta: toIsoDate(new Date(year - 1, 11, 31)),
    };
  }
  return {
    desde: fechaDesdeCustom || "",
    hasta: fechaHastaCustom || "",
  };
};

export default function Rendiciones() {
  const [loading, setLoading] = useState(false);
  const [rendiciones, setRendiciones] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [saldosTecnico, setSaldosTecnico] = useState([]);
  const [guardandoAbono, setGuardandoAbono] = useState(false);
  const [trabajosPendientes, setTrabajosPendientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [centros, setCentros] = useState([]);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [rendicionDetalle, setRendicionDetalle] = useState(null);
  const [mostrarPreviewRendicion, setMostrarPreviewRendicion] = useState(false);
  const [detalleClosing, setDetalleClosing] = useState(false);
  const detalleCloseTimerRef = useRef(null);

  const [clienteId, setClienteId] = useState("");
  const [centroId, setCentroId] = useState("");
  const [estado, setEstado] = useState("");
  const [tipoActividad, setTipoActividad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [periodo, setPeriodo] = useState("mes_actual");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [buscarTecnicoAbono, setBuscarTecnicoAbono] = useState("");
  const [showAbonosModal, setShowAbonosModal] = useState(false);
  const [abonosPageSize, setAbonosPageSize] = useState(10);
  const [abonosPage, setAbonosPage] = useState(1);
  const [abonoTecnico, setAbonoTecnico] = useState("");
  const [abonoFecha, setAbonoFecha] = useState(toIsoDate(new Date()));
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoTransferidoPor, setAbonoTransferidoPor] = useState("");

  const cargarBase = async () => {
    try {
      const [clientesData, centrosData] = await Promise.all([obtenerClientes(), obtenerCentros({ page: 1, per_page: 0 })]);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setCentros(Array.isArray(centrosData?.centros) ? centrosData.centros : []);
    } catch (error) {
      console.error(error);
    }
  };

  const cargarRendiciones = async () => {
    setLoading(true);
    try {
      const rango = getPeriodRange(periodo, fechaDesde, fechaHasta);
      const data = await obtenerRendiciones({
        ...(clienteId ? { cliente_id: Number(clienteId) } : {}),
        ...(centroId ? { centro_id: Number(centroId) } : {}),
        ...(estado ? { estado } : {}),
        ...(rango.desde ? { fecha_desde: rango.desde } : {}),
        ...(rango.hasta ? { fecha_hasta: rango.hasta } : {}),
        top: 1000,
      });
      setRendiciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRendiciones([]);
      alert("No se pudieron cargar las rendiciones.");
    } finally {
      setLoading(false);
    }
  };

  const cargarTrabajosPendientes = async () => {
    try {
      const [actas, mants, rets] = await Promise.all([
        obtenerActasEntrega().catch(() => []),
        obtenerMantencionesTerreno().catch(() => []),
        obtenerRetirosTerreno().catch(() => []),
      ]);
      const trabajos = [
        ...(Array.isArray(actas) ? actas : []).map((x) => ({
          tipo: normalizarTipo(x?.tipo_instalacion || "instalacion"),
          record_id: Number(x?.id_acta_entrega || 0) || 0,
          cliente_id: Number(x?.cliente_id || 0) || 0,
          cliente_nombre: x?.cliente || x?.empresa || "",
          centro_nombre: x?.centro || "",
          fecha: x?.fecha_registro || x?.created_at || null,
        })),
        ...(Array.isArray(mants) ? mants : []).map((x) => ({
          tipo: "mantencion",
          record_id: Number(x?.id_mantencion_terreno || 0) || 0,
          cliente_id: Number(x?.cliente_id || 0) || 0,
          cliente_nombre: x?.cliente || x?.empresa || "",
          centro_nombre: x?.centro || "",
          fecha: x?.fecha_ingreso || x?.created_at || null,
        })),
        ...(Array.isArray(rets) ? rets : []).map((x) => ({
          tipo: "retiro",
          record_id: Number(x?.id_retiro_terreno || 0) || 0,
          cliente_id: Number(x?.cliente_id || 0) || 0,
          cliente_nombre: x?.cliente || x?.empresa || "",
          centro_nombre: x?.centro || "",
          fecha: x?.fecha_retiro || x?.created_at || null,
        })),
      ].filter((t) => t.record_id > 0 && !!t.tipo);

      const rendidas = new Set(
        (Array.isArray(rendiciones) ? rendiciones : []).map(
          (r) => `${normalizarTipo(r?.actividad_tipo)}-${Number(r?.actividad_id || 0) || 0}`
        )
      );

      const unique = new Map();
      trabajos.forEach((t) => {
        const k = `${t.tipo}-${t.record_id}`;
        if (!unique.has(k)) unique.set(k, t);
      });
      const pendientes = Array.from(unique.values()).filter(
        (t) => !rendidas.has(`${t.tipo}-${t.record_id}`)
      );
      setTrabajosPendientes(pendientes);
    } catch (error) {
      console.error(error);
      setTrabajosPendientes([]);
    }
  };

  useEffect(() => {
    cargarBase();
  }, []);

  useEffect(() => {
    cargarRendiciones();
    cargarAbonosYSaldos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, centroId, estado, periodo, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargarTrabajosPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendiciones]);

  const centrosFiltrados = useMemo(() => {
    if (!clienteId) return centros;
    const clienteNombre = (clientes.find((c) => Number(c.id_cliente) === Number(clienteId))?.nombre || "").toLowerCase();
    return centros.filter((c) => String(c.cliente || "").toLowerCase() === clienteNombre);
  }, [centros, clienteId, clientes]);

  const tiposActividadDisponibles = useMemo(() => {
    const set = new Set(TIPOS_ACTIVIDAD_BASE);
    (
      Array.isArray(rendiciones) ? rendiciones : []
    ).forEach((r) => {
      const tipo = String(r?.actividad_tipo || "").trim().toLowerCase();
      if (tipo) set.add(tipo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [rendiciones]);

  const rendicionesFiltradas = useMemo(() => {
    return rendiciones.filter((r) => {
      const okCategoria = categoria ? String(r.categoria || "").toLowerCase() === categoria : true;
      const okTipo = tipoActividad
        ? String(r.actividad_tipo || "").toLowerCase() === String(tipoActividad).toLowerCase()
        : true;
      return okCategoria && okTipo;
    });
  }, [rendiciones, categoria, tipoActividad]);

  const tecnicosDisponibles = useMemo(() => {
    const out = new Map();
    (Array.isArray(saldosTecnico) ? saldosTecnico : []).forEach((s) => {
      const nombre = String(s?.tecnico_nombre || "").trim();
      if (!nombre) return;
      out.set(normalizeText(nombre), nombre);
    });
    (Array.isArray(rendiciones) ? rendiciones : []).forEach((r) => {
      const nombre = String(r?.tecnico_nombre || "").trim();
      if (!nombre) return;
      out.set(normalizeText(nombre), nombre);
    });
    return Array.from(out.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [saldosTecnico, rendiciones]);

  const kpiAbonosPeriodo = useMemo(
    () => (Array.isArray(abonos) ? abonos : []).reduce((acc, a) => acc + Number(a?.monto || 0), 0),
    [abonos]
  );
  const saldoGlobalTecnicos = useMemo(
    () => (Array.isArray(saldosTecnico) ? saldosTecnico : []).reduce((acc, s) => acc + Number(s?.saldo || 0), 0),
    [saldosTecnico]
  );
  const tecnicosConSaldoNegativo = useMemo(
    () => (Array.isArray(saldosTecnico) ? saldosTecnico : []).filter((s) => Number(s?.saldo || 0) < 0).length,
    [saldosTecnico]
  );

  const resumenClientes = useMemo(() => {
    const map = new Map();
    (Array.isArray(rendicionesFiltradas) ? rendicionesFiltradas : []).forEach((r) => {
      const key = keyCliente(r?.cliente_id, r?.cliente_nombre);
      const prev = map.get(key) || {
        key,
        cliente_nombre: r?.cliente_nombre || "Sin cliente",
        total_gasto: 0,
        rendiciones: 0,
        pendientes: 0,
      };
      prev.total_gasto += Number(r?.monto || 0);
      prev.rendiciones += 1;
      map.set(key, prev);
    });
    (Array.isArray(trabajosPendientes) ? trabajosPendientes : []).forEach((t) => {
      const key = keyCliente(t?.cliente_id, t?.cliente_nombre);
      const prev = map.get(key) || {
        key,
        cliente_nombre: t?.cliente_nombre || "Sin cliente",
        total_gasto: 0,
        rendiciones: 0,
        pendientes: 0,
      };
      prev.pendientes += 1;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (b.pendientes !== a.pendientes) return b.pendientes - a.pendientes;
      return b.total_gasto - a.total_gasto;
    });
  }, [rendicionesFiltradas, trabajosPendientes]);

  const detalleRendicionesCliente = useMemo(() => {
    if (!clienteDetalle) return [];
    return rendicionesFiltradas.filter(
      (r) => keyCliente(r?.cliente_id, r?.cliente_nombre) === clienteDetalle.key
    );
  }, [clienteDetalle, rendicionesFiltradas]);

  const detallePendientesCliente = useMemo(() => {
    if (!clienteDetalle) return [];
    return trabajosPendientes.filter(
      (t) => keyCliente(t?.cliente_id, t?.cliente_nombre) === clienteDetalle.key
    );
  }, [clienteDetalle, trabajosPendientes]);

  const hoy = useMemo(() => new Date(), []);
  const totalMesActual = useMemo(() => {
    const y = hoy.getFullYear();
    const m = hoy.getMonth();
    return rendiciones.reduce((acc, r) => {
      const d = new Date(r?.fecha_gasto || r?.created_at || 0);
      if (Number.isNaN(d.getTime())) return acc;
      if (d.getFullYear() === y && d.getMonth() === m) return acc + Number(r?.monto || 0);
      return acc;
    }, 0);
  }, [rendiciones, hoy]);

  const clientesSinRendicion = useMemo(
    () => resumenClientes.filter((c) => c.pendientes > 0).length,
    [resumenClientes]
  );

  const rendicionesRecientes = useMemo(
    () =>
      [...rendicionesFiltradas]
        .sort((a, b) => new Date(b?.created_at || b?.fecha_gasto || 0) - new Date(a?.created_at || a?.fecha_gasto || 0))
        .slice(0, 8),
    [rendicionesFiltradas]
  );

  const abonosFiltradosTecnico = useMemo(() => {
    const q = normalizeText(buscarTecnicoAbono);
    if (!q) return abonos;
    return (Array.isArray(abonos) ? abonos : []).filter((a) =>
      normalizeText(a?.tecnico_nombre).includes(q)
    );
  }, [abonos, buscarTecnicoAbono]);

  const abonosPreview = useMemo(
    () => (Array.isArray(abonosFiltradosTecnico) ? abonosFiltradosTecnico : []).slice(0, 5),
    [abonosFiltradosTecnico]
  );

  const abonosTotalPages = useMemo(() => {
    const size = Number(abonosPageSize || 10);
    return Math.max(1, Math.ceil((abonosFiltradosTecnico.length || 0) / size));
  }, [abonosFiltradosTecnico.length, abonosPageSize]);

  const abonosPaginados = useMemo(() => {
    const size = Number(abonosPageSize || 10);
    const page = Math.min(Math.max(1, Number(abonosPage || 1)), abonosTotalPages);
    const start = (page - 1) * size;
    return abonosFiltradosTecnico.slice(start, start + size);
  }, [abonosFiltradosTecnico, abonosPage, abonosPageSize, abonosTotalPages]);

  useEffect(() => {
    setAbonosPage(1);
  }, [buscarTecnicoAbono, abonosPageSize]);

  useEffect(() => {
    if (abonosPage > abonosTotalPages) setAbonosPage(abonosTotalPages);
  }, [abonosPage, abonosTotalPages]);

  useEffect(() => {
    if (!rendicionesFiltradas.length) {
      setRendicionDetalle(null);
      setDetalleClosing(false);
      return;
    }
    setRendicionDetalle((prev) => {
      if (!prev) return null;
      const vigente = rendicionesFiltradas.find((r) => r.id_rendicion === prev.id_rendicion);
      return vigente || null;
    });
  }, [rendicionesFiltradas]);

  const cancelarCierreDetalle = () => {
    if (detalleCloseTimerRef.current) {
      clearTimeout(detalleCloseTimerRef.current);
      detalleCloseTimerRef.current = null;
    }
  };

  const cargarAbonosYSaldos = async () => {
    try {
      const rango = getPeriodRange(periodo, fechaDesde, fechaHasta);
      const [abonosData, saldosData] = await Promise.all([
        obtenerAbonosRendicion({
          ...(rango.desde ? { fecha_desde: rango.desde } : {}),
          ...(rango.hasta ? { fecha_hasta: rango.hasta } : {}),
          top: 1000,
        }).catch(() => []),
        obtenerSaldosRendicion().catch(() => []),
      ]);
      setAbonos(Array.isArray(abonosData) ? abonosData : []);
      setSaldosTecnico(Array.isArray(saldosData) ? saldosData : []);
    } catch (error) {
      console.error(error);
      setAbonos([]);
      setSaldosTecnico([]);
    }
  };

  const cerrarDetalleSuave = () => {
    if (!rendicionDetalle) return;
    cancelarCierreDetalle();
    setDetalleClosing(true);
    detalleCloseTimerRef.current = setTimeout(() => {
      setRendicionDetalle(null);
      setDetalleClosing(false);
      detalleCloseTimerRef.current = null;
    }, 180);
  };

  useEffect(() => () => cancelarCierreDetalle(), []);

  const descripcionDetalle = useMemo(
    () => (rendicionDetalle ? buildDescripcionRows(rendicionDetalle) : { rows: [], saldo: null }),
    [rendicionDetalle]
  );
  const descripcionDetalleRows = descripcionDetalle.rows;
  const saldoDetalle = descripcionDetalle.saldo;
  const descripcionFallback = useMemo(() => {
    const txt = String(rendicionDetalle?.descripcion || "");
    return txt
      .split(/\r?\n/)
      .map((x) => String(x || "").trim())
      .filter((x) => x && !x.toLowerCase().startsWith("tecnicos asociados json:"))
      .join("\n");
  }, [rendicionDetalle]);
  const resumenDescripcion = useMemo(
    () => (rendicionDetalle ? extractResumenCampos(rendicionDetalle) : { totalRendir: null, totalGastos: null, saldo: null, actividades: null }),
    [rendicionDetalle]
  );

  const imprimirPreviewRendicion = () => {
    if (!rendicionDetalle) return;
    const w = window.open("", "_blank", "width=1100,height=900");
    if (!w) {
      alert("No se pudo abrir la vista de impresion. Habilita ventanas emergentes.");
      return;
    }

    const rowsHtml = descripcionDetalleRows.length
      ? descripcionDetalleRows
          .map(
            (row) => `
              <tr>
                <td>${escHtml(row.fecha || "-")}</td>
                <td>${escHtml(row.documento || "-")}</td>
                <td>${escHtml(row.descripcion || "-")}</td>
                <td>${escHtml(row.monto > 0 ? formatMoney(row.monto) : "-")}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="4">${escHtml(descripcionFallback || "-")}</td></tr>`;

    const adjuntosHtml = adjuntosDetalle
      .map((adj) => {
        const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(adj.url || "") || String(adj.url || "").startsWith("data:image/");
        return `
          <div class="adj-item">
            <div class="adj-meta">Doc: ${escHtml(adj.documento || "-")} | Fecha: ${escHtml(adj.fecha || "-")}</div>
            ${isImg ? `<img src="${escHtml(adj.url)}" alt="${escHtml(adj.label || "Adjunto")}" />` : `<div class="adj-empty">Adjunto no visual</div>`}
          </div>
        `;
      })
      .join("");

    const totalRendirPrint = resumenDescripcion.totalRendir ? formatMoney(parseMontoTexto(resumenDescripcion.totalRendir)) : "-";
    const totalGastosPrint = resumenDescripcion.totalGastos
      ? formatMoney(parseMontoTexto(resumenDescripcion.totalGastos))
      : formatMoney(rendicionDetalle.monto);
    const saldoPrint = resumenDescripcion.saldo
      ? formatMoney(parseMontoTexto(resumenDescripcion.saldo))
      : saldoDetalle !== null
      ? formatMoney(saldoDetalle)
      : "-";

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Rendicion #${escHtml(rendicionDetalle.id_rendicion)}</title>
        <style>
          body{font-family:Arial,sans-serif;color:#0f172a;margin:18px}
          .head{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #dbe5f1;padding-bottom:10px;margin-bottom:10px}
          .orca-logo{border:1px solid #dbe7ff;border-radius:8px;padding:6px;background:#fff;min-width:112px}
          .orca-row{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-bottom:4px}
          .orca-cell{width:23px;height:23px;background:#245b98 !important;color:#fff !important;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .orca-sub{text-align:center;color:#245b98 !important;font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          .title{text-align:right}
          .title h2{margin:0 0 4px;font-size:15px}
          .meta{font-size:12px;color:#334155}
          .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}
          .field{border:1px solid #dbe5f1;border-radius:8px;padding:6px 8px;background:#f8fbff}
          .field b{display:block;font-size:11px;color:#4b6281;text-transform:uppercase}
          .line{font-size:12px;margin-bottom:8px}
          table{width:100%;border-collapse:collapse}
          th{background:#315783;color:#fff;font-size:11px;text-transform:uppercase;padding:7px;border:1px solid #315783}
          td{padding:7px;border:1px solid #e2e8f0;font-size:12px;vertical-align:top}
          .totales{margin-top:10px;margin-left:auto;width:320px;border:1px solid #dbe5f1;border-radius:8px;overflow:hidden}
          .totales .r{display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:8px;padding:7px 10px;border-top:1px solid #e2e8f0;font-size:12px}
          .totales .r:first-child{border-top:0}
          .totales .r span{text-align:right;font-weight:700}
          .adj-title{margin-top:12px;font-size:12px;font-weight:700;color:#4b6281;text-transform:uppercase}
          .adj-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
          .adj-item{border:1px solid #dbe5f1;border-radius:8px;padding:8px}
          .adj-meta{font-size:11px;color:#475569;margin-bottom:4px;font-weight:600}
          .adj-item img{width:100%;max-height:220px;object-fit:cover;border:1px solid #dbe5f1;border-radius:8px}
          .adj-empty{font-size:11px;color:#64748b}
        </style>
      </head>
      <body>
        <div class="head">
          <div class="orca-logo">
            <div class="orca-row"><div class="orca-cell">O</div><div class="orca-cell">R</div><div class="orca-cell">C</div><div class="orca-cell">A</div></div>
            <div class="orca-sub">Tecnologia</div>
          </div>
          <div class="title">
            <h2>RENDICION DE GASTOS</h2>
            <div class="meta">Nro gasto: #${escHtml(rendicionDetalle.id_rendicion)}</div>
            <div class="meta">Fecha: ${escHtml(formatDate(rendicionDetalle.fecha_gasto))}</div>
            <div class="meta">Tipo: ${escHtml(rendicionDetalle.actividad_tipo || "-")}</div>
          </div>
        </div>
        <div class="grid">
          <div class="field"><b>Tecnico</b>${escHtml(rendicionDetalle.tecnico_nombre || "-")}</div>
          <div class="field"><b>Cliente</b>${escHtml(rendicionDetalle.cliente_nombre || "-")}</div>
          <div class="field"><b>Centro</b>${escHtml(rendicionDetalle.centro_nombre || "-")}</div>
          <div class="field"><b>Estado</b>${escHtml(rendicionDetalle.estado || "-")}</div>
        </div>
        ${
          tecnicosAsociadosDetalle.length
            ? `<div class="line"><b>Tecnicos asociados:</b> ${escHtml(tecnicosAsociadosDetalle.join(", "))}</div>`
            : ""
        }
        ${resumenDescripcion.actividades ? `<div class="line"><b>Actividades:</b> ${escHtml(resumenDescripcion.actividades)}</div>` : ""}
        <table>
          <thead><tr><th>Fecha</th><th>N documento</th><th>Descripcion</th><th>Valor $</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="totales">
          <div class="r"><b>Total a rendir</b><span>${escHtml(totalRendirPrint)}</span></div>
          <div class="r"><b>Total gastos</b><span>${escHtml(totalGastosPrint)}</span></div>
          <div class="r"><b>Saldo</b><span>${escHtml(saldoPrint)}</span></div>
        </div>
        ${
          adjuntosHtml
            ? `<div class="adj-title">Adjuntado</div><div class="adj-grid">${adjuntosHtml}</div>`
            : ""
        }
      </body>
      </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };
  const tecnicosAsociadosDetalle = useMemo(
    () => (rendicionDetalle ? extractTecnicosAsociados(rendicionDetalle) : []),
    [rendicionDetalle]
  );

  const adjuntosDetalle = useMemo(() => {
    if (!rendicionDetalle || !Array.isArray(rendicionDetalle.adjuntos)) return [];
    return rendicionDetalle.adjuntos
      .map((item, idx) => {
        const ref = descripcionDetalleRows[idx] || {};
        if (typeof item === "string") {
          return {
            key: `adj-${idx}`,
            label: `Adjunto ${idx + 1}`,
            url: item,
            fecha: ref.fecha || "",
            documento: ref.documento || "",
          };
        }
        if (item && typeof item === "object") {
          const rawUrl = item.url || item.uri || item.path || item.download_url || "";
          const label = item.nombre || item.name || item.file_name || `Adjunto ${idx + 1}`;
          return {
            key: `adj-${idx}`,
            label,
            url: rawUrl,
            fecha: item.fecha || ref.fecha || "",
            documento: item.documento || ref.documento || "",
          };
        }
        return null;
      })
      .filter((x) => x && x.url);
  }, [rendicionDetalle, descripcionDetalleRows]);

  const saldoTecnicoDetalle = useMemo(() => {
    if (!rendicionDetalle) return null;
    const byId = (Array.isArray(saldosTecnico) ? saldosTecnico : []).find(
      (s) => Number(s?.tecnico_user_id || 0) > 0 && Number(s?.tecnico_user_id || 0) === Number(rendicionDetalle?.tecnico_user_id || 0)
    );
    if (byId) return byId;
    const nom = normalizeText(rendicionDetalle?.tecnico_nombre);
    if (!nom) return null;
    return (Array.isArray(saldosTecnico) ? saldosTecnico : []).find(
      (s) => normalizeText(s?.tecnico_nombre) === nom
    ) || null;
  }, [rendicionDetalle, saldosTecnico]);

  const registrarAbono = async (e) => {
    e.preventDefault();
    const tecnicoNombre = String(abonoTecnico || "").trim();
    const transferidoPor = String(abonoTransferidoPor || "").trim();
    const monto = parseMontoTexto(abonoMonto);
    if (!tecnicoNombre) {
      alert("Debes seleccionar un tecnico.");
      return;
    }
    if (!abonoFecha) {
      alert("Debes indicar la fecha del abono.");
      return;
    }
    if (!(monto > 0)) {
      alert("El monto del abono debe ser mayor a 0.");
      return;
    }
    if (!transferidoPor) {
      alert("Debes indicar quien transfirio el abono.");
      return;
    }
    setGuardandoAbono(true);
    try {
      await crearAbonoRendicion({
        tecnico_nombre: tecnicoNombre,
        fecha_abono: abonoFecha,
        monto,
        transferido_por: transferidoPor,
      });
      setAbonoMonto("");
      setAbonoTransferidoPor("");
      await cargarAbonosYSaldos();
      alert("Abono registrado correctamente.");
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar el abono.");
    } finally {
      setGuardandoAbono(false);
    }
  };

  return (
    <div className="container-fluid py-3 rendiciones-page">
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <div>
            <h4 className="mb-1">Rendiciones</h4>
            <p className="mb-0 text-muted">Gastos registrados desde mobile.</p>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-xl-5">
          <div className="card border-0 shadow-sm h-100 abono-card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  <i className="fas fa-wallet mr-2" />
                  Abono a tecnico
                </h6>
                <span className="badge badge-primary">Caja tecnica</span>
              </div>
              <form className="abono-form-grid" onSubmit={registrarAbono}>
                <div>
                  <label className="form-label mb-1">Tecnico</label>
                  <select
                    className="form-control"
                    value={abonoTecnico}
                    onChange={(e) => setAbonoTecnico(e.target.value)}
                  >
                    <option value="">Seleccionar tecnico</option>
                    {tecnicosDisponibles.map((nombre) => (
                      <option key={`tec-abono-${nombre}`} value={nombre}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label mb-1">Fecha abono</label>
                  <input
                    className="form-control"
                    type="date"
                    value={abonoFecha}
                    onChange={(e) => setAbonoFecha(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label mb-1">Monto</label>
                  <input
                    className="form-control"
                    value={abonoMonto}
                    onChange={(e) => setAbonoMonto(e.target.value)}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <label className="form-label mb-1">Transferido por</label>
                  <input
                    className="form-control"
                    value={abonoTransferidoPor}
                    onChange={(e) => setAbonoTransferidoPor(e.target.value)}
                    placeholder="Nombre responsable"
                  />
                </div>
                <div className="abono-form-actions">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={guardandoAbono}>
                    {guardandoAbono ? "Guardando..." : "Registrar abono"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-xl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Historial de transferencias / abonos</h6>
                <div className="d-flex align-items-center" style={{ gap: 8 }}>
                  <input
                    className="form-control form-control-sm abono-search-input"
                    placeholder="Buscar tecnico..."
                    value={buscarTecnicoAbono}
                    onChange={(e) => setBuscarTecnicoAbono(e.target.value)}
                  />
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowAbonosModal(true)}>
                    Expandir
                  </button>
                  <span className="badge badge-primary">{abonosFiltradosTecnico.length}</span>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-sm mb-0 abonos-historial-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tecnico</th>
                      <th>Transferido por</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!abonosPreview.length && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">Sin abonos registrados para el periodo.</td>
                      </tr>
                    )}
                    {abonosPreview.map((a) => (
                      <tr key={`abono-hist-${a.id_abono}`}>
                        <td>{formatDateTime(a.created_at || a.fecha_abono)}</td>
                        <td>{a.tecnico_nombre || "-"}</td>
                        <td>{a.transferido_por || "-"}</td>
                        <td>{formatMoney(a.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body filtros-card-body">
          <div className="rend-filtros-linea">
            <div className="filtro-item filtro-cliente">
              <label className="form-label"><i className="fas fa-building mr-1" /> Cliente</label>
              <select className="form-control" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setCentroId(""); }}>
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="filtro-item filtro-centro">
              <label className="form-label"><i className="fas fa-map-marker-alt mr-1" /> Centro</label>
              <select className="form-control" value={centroId} onChange={(e) => setCentroId(e.target.value)}>
                <option value="">Todos</option>
                {centrosFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="filtro-item filtro-estado">
              <label className="form-label"><i className="fas fa-traffic-light mr-1" /> Estado</label>
              <select className="form-control" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="borrador">Borrador</option>
                <option value="enviado">Enviado</option>
              </select>
            </div>
            <div className="filtro-item filtro-tipo">
              <label className="form-label"><i className="fas fa-tasks mr-1" /> Tipo</label>
              <select className="form-control" value={tipoActividad} onChange={(e) => setTipoActividad(e.target.value)}>
                <option value="">Todos</option>
                {tiposActividadDisponibles.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
            <div className="filtro-item filtro-categoria">
              <label className="form-label"><i className="fas fa-tags mr-1" /> Categoria</label>
              <select className="form-control" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas</option>
                {CATEGORIAS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="filtro-item filtro-periodo">
              <label className="form-label"><i className="far fa-calendar-alt mr-1" /> Periodo</label>
              <select className="form-control" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                <option value="mes_actual">Mes actual</option>
                <option value="mes_anterior">Mes anterior</option>
                <option value="anio_actual">Ano actual</option>
                <option value="anio_anterior">Ano anterior</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            {periodo === "personalizado" && (
              <>
                <div className="filtro-item filtro-fecha">
                  <label className="form-label"><i className="far fa-calendar-plus mr-1" /> Desde</label>
                  <input type="date" className="form-control" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                </div>
                <div className="filtro-item filtro-fecha">
                  <label className="form-label"><i className="far fa-calendar-minus mr-1" /> Hasta</label>
                  <input type="date" className="form-control" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 kpi-card kpi-card-blue">
            <div className="card-body d-flex align-items-center">
              <span className="kpi-icon">CLP</span>
              <div>
                <div className="kpi-title">Gasto mes actual</div>
                <div className="kpi-value">{formatMoney(totalMesActual)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 kpi-card kpi-card-indigo">
            <div className="card-body d-flex align-items-center">
              <span className="kpi-icon">ABO</span>
              <div>
                <div className="kpi-title">Abonos periodo</div>
                <div className="kpi-value">{formatMoney(kpiAbonosPeriodo)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 kpi-card kpi-card-red">
            <div className="card-body d-flex align-items-center">
              <span className="kpi-icon">NEG</span>
              <div>
                <div className="kpi-title">Tecnicos en negativo</div>
                <div className="kpi-value">{tecnicosConSaldoNegativo}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 kpi-card kpi-card-green">
            <div className="card-body d-flex align-items-center">
              <span className="kpi-icon">SAL</span>
              <div>
                <div className="kpi-title">Saldo global tecnicos</div>
                <div className="kpi-value">{formatMoney(saldoGlobalTecnicos)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-xl-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Rendiciones faltantes</h6>
                <div className="d-flex" style={{ gap: 8 }}>
                  <span className="badge badge-warning">Pendientes: {trabajosPendientes.length}</span>
                  <span className="badge badge-danger">Clientes con faltantes: {clientesSinRendicion}</span>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-sm mb-0 resumen-rendiciones-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Centro</th>
                      <th>Tipo</th>
                      <th>Fecha trabajo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!trabajosPendientes.length && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-3">No hay rendiciones faltantes para los filtros actuales.</td>
                      </tr>
                    )}
                    {trabajosPendientes.map((t) => (
                      <tr key={`pend-${t.tipo}-${t.record_id}`}>
                        <td>{t.cliente_nombre || "-"}</td>
                        <td>{t.centro_nombre || "-"}</td>
                        <td><span className="actividad-chip">{t.tipo || "-"}</span></td>
                        <td>{formatDate(t.fecha)}</td>
                        <td><span className="badge badge-danger">Sin rendir</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Rendiciones recientes</h6>
                <span className="badge badge-primary">{rendicionesRecientes.length}</span>
              </div>
              {!rendicionesRecientes.length && <div className="text-muted small">Sin rendiciones para el periodo actual.</div>}
              {rendicionesRecientes.map((r) => (
                <div
                  key={`rec-${r.id_rendicion}`}
                  className={`resumen-line ${String(r?.estado || "").toLowerCase() === "enviado" ? "resumen-line-ok" : ""}`}
                >
                  {formatDate(r.fecha_gasto)} | {r.cliente_nombre || "Sin cliente"} | {r.centro_nombre || "-"} | {formatMoney(r.monto)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className={rendicionDetalle ? "col-xl-8" : "col-12"}>
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0 rendiciones-table">
                  <thead>
                    <tr>
                      <th>N° gasto</th>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Tecnico</th>
                      <th>Cliente</th>
                      <th>Centro</th>
                      <th>Descripcion</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th>Adj.</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && rendicionesFiltradas.map((r) => (
                      <tr key={r.id_rendicion}>
                        <td>
                          <div className="gasto-id-cell">
                            <strong>#{r.id_rendicion}</strong>
                          </div>
                        </td>
                        <td><span className="actividad-chip">{r.actividad_tipo || "-"}</span></td>
                        <td>{formatDate(r.fecha_gasto)}</td>
                        <td>{r.tecnico_nombre || "-"}</td>
                        <td>{r.cliente_nombre || "-"}</td>
                        <td>{r.centro_nombre || "-"}</td>
                        <td className="text-truncate" style={{ maxWidth: 220 }}>{r.descripcion || "-"}</td>
                        <td>{formatMoney(r.monto)}</td>
                        <td>
                          <span className={`badge ${String(r.estado) === "enviado" ? "badge-success" : "badge-secondary"}`}>
                            {r.estado || "-"}
                          </span>
                        </td>
                        <td>{Array.isArray(r.adjuntos) ? r.adjuntos.length : 0}</td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${rendicionDetalle?.id_rendicion === r.id_rendicion ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => {
                              if (rendicionDetalle?.id_rendicion === r.id_rendicion && !detalleClosing) {
                                cerrarDetalleSuave();
                                return;
                              }
                              cancelarCierreDetalle();
                              setDetalleClosing(false);
                              setRendicionDetalle(r);
                            }}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loading && !rendicionesFiltradas.length && (
	                      <tr><td colSpan={11} className="text-center text-muted py-4">Sin rendiciones para los filtros seleccionados.</td></tr>
                    )}
                    {loading && (
	                      <tr><td colSpan={11} className="text-center text-muted py-4">Cargando...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {rendicionDetalle && (
        <div className={`col-xl-4 ${detalleClosing ? "detalle-panel-closing" : "detalle-panel-enter"}`}>
          <div className="card border-0 shadow-sm rendicion-detalle-card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Detalle rendicion</h6>
                <div className="d-flex align-items-center" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setMostrarPreviewRendicion(true)}
                  >
                    Vista previa
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={cerrarDetalleSuave}
                  >
                    Cerrar
                  </button>
                  <span className="badge badge-info">#{rendicionDetalle.id_rendicion}</span>
                  <span className="actividad-chip">{rendicionDetalle.actividad_tipo || "-"}</span>
                </div>
              </div>
                <>
                  <div className="detalle-grid mb-2">
                    <div><strong>Fecha</strong><span>{formatDate(rendicionDetalle.fecha_gasto)}</span></div>
                    <div><strong>Tecnico</strong><span>{rendicionDetalle.tecnico_nombre || "-"}</span></div>
                    <div><strong>Cliente</strong><span>{rendicionDetalle.cliente_nombre || "-"}</span></div>
                    <div><strong>Centro</strong><span>{rendicionDetalle.centro_nombre || "-"}</span></div>
                    <div><strong>Actividad</strong><span>{rendicionDetalle.actividad_tipo || "-"}</span></div>
                    <div><strong>Categoria</strong><span>{rendicionDetalle.categoria || "-"}</span></div>
                    <div><strong>Estado</strong><span>{rendicionDetalle.estado || "-"}</span></div>
                    <div><strong>Monto</strong><span>{formatMoney(rendicionDetalle.monto)}</span></div>
                  </div>
                  {!!saldoTecnicoDetalle && (
                    <div className="detalle-box mb-2 detalle-box-saldo">
                      <div className="detalle-box-title">Saldo tecnico</div>
                      <div className="saldo-tecnico-grid">
                        <div><strong>Total abonos</strong><span>{formatMoney(saldoTecnicoDetalle.total_abonos)}</span></div>
                        <div><strong>Total rendido</strong><span>{formatMoney(saldoTecnicoDetalle.total_rendido)}</span></div>
                        <div><strong>Saldo actual</strong><span>{formatMoney(saldoTecnicoDetalle.saldo)}</span></div>
                      </div>
                    </div>
                  )}

                  <div className="detalle-box mb-2">
                    <div className="detalle-box-title">Tecnicos asociados</div>
                    {!!tecnicosAsociadosDetalle.length ? (
                      <div className="tecnicos-chip-wrap">
                        {tecnicosAsociadosDetalle.map((t, idx) => (
                          <span key={`tec-det-${idx}`} className="tecnico-chip">{t}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted small">Sin tecnicos asociados.</div>
                    )}
                  </div>

                  <div className="detalle-box mb-2 detalle-box-descripcion">
                    <div className="detalle-box-title">Descripcion de gastos</div>
                    {descripcionDetalleRows.length ? (
                      <div className="detalle-descripcion-table">
                        {descripcionDetalleRows.map((row, idx) => (
                          <div key={`desc-${idx}`} className="detalle-descripcion-row">
                            <span>{`${row.fecha || "-"} | Doc:${row.documento || "-"} | ${row.descripcion}`}</span>
                            <span>{row.monto > 0 ? formatMoney(row.monto) : "-"}</span>
                          </div>
                        ))}
                        <div className="detalle-descripcion-total-bottom">
                          <span>Total gastos</span>
                          <strong>{formatMoney(rendicionDetalle.monto)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="descripcion-fallback" style={{ whiteSpace: "pre-line" }}>
                        {descripcionFallback || "-"}
                      </div>
                    )}
                    {saldoDetalle !== null && (
                      <div className={`saldo-chip ${saldoDetalle >= 0 ? "saldo-ok" : "saldo-warn"}`}>
                        Saldo: {formatMoney(saldoDetalle)}
                      </div>
                    )}
                  </div>

                  <div className="detalle-box">
                    <div className="detalle-box-title">Adjuntado</div>
                    {!adjuntosDetalle.length && <div className="text-muted small">Sin adjuntos.</div>}
                    {adjuntosDetalle.map((adj) => (
                      <div key={adj.key} className="adjunto-item">
                        <div className="adjunto-label">
                          Documento: {adj.documento || "-"} | Fecha: {adj.fecha || "-"}
                        </div>
                        {/\.(jpg|jpeg|png|webp|gif)$/i.test(adj.url || "") || String(adj.url || "").startsWith("data:image/") ? (
                          <img src={adj.url} alt={adj.label} className="adjunto-preview" />
                        ) : (
                          <div className="text-muted small">Adjunto no visual (archivo)</div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
            </div>
          </div>
        </div>
        )}
      </div>

      {showAbonosModal && (
        <div className="rendiciones-overlay" onClick={() => setShowAbonosModal(false)}>
          <div className="rendiciones-modal abonos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Historial completo de transferencias / abonos</h6>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAbonosModal(false)}>
                Cerrar
              </button>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="d-flex align-items-center" style={{ gap: 8 }}>
                <label className="mb-0 small text-muted">Mostrar</label>
                <select
                  className="form-control form-control-sm abonos-page-size"
                  value={abonosPageSize}
                  onChange={(e) => setAbonosPageSize(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <label className="mb-0 small text-muted">registros</label>
              </div>
              <div className="d-flex align-items-center" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={abonosPage <= 1}
                  onClick={() => setAbonosPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span className="badge badge-light">Pag. {abonosPage} / {abonosTotalPages}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={abonosPage >= abonosTotalPages}
                  onClick={() => setAbonosPage((p) => Math.min(abonosTotalPages, p + 1))}
                >
                  Siguiente
                </button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0 abonos-historial-table">
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Tecnico</th>
                    <th>Transferido por</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {!abonosPaginados.length && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">Sin abonos para los filtros actuales.</td>
                    </tr>
                  )}
                  {abonosPaginados.map((a) => (
                    <tr key={`abono-modal-${a.id_abono}`}>
                      <td>{formatDateTime(a.created_at || a.fecha_abono)}</td>
                      <td>{a.tecnico_nombre || "-"}</td>
                      <td>{a.transferido_por || "-"}</td>
                      <td>{formatMoney(a.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {clienteDetalle && (
        <div className="rendiciones-overlay" onClick={() => setClienteDetalle(null)}>
          <div className="rendiciones-modal" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Detalle: {clienteDetalle.cliente_nombre}</h6>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setClienteDetalle(null)}>
                Cerrar
              </button>
            </div>
            <div className="mb-3">
              <h6 className="small text-muted mb-2">Rendiciones registradas</h6>
              {!detalleRendicionesCliente.length && <div className="text-muted small">Sin rendiciones registradas.</div>}
              {detalleRendicionesCliente.map((r) => (
                <div key={`det-r-${r.id_rendicion}`} className="resumen-line">
                  {formatDate(r.fecha_gasto)} | {r.centro_nombre || "-"} | {r.actividad_tipo || "-"} | {formatMoney(r.monto)}
                </div>
              ))}
            </div>
            <div>
              <h6 className="small text-muted mb-2">Trabajos sin rendicion</h6>
              {!detallePendientesCliente.length && <div className="text-muted small">Todo rendido para este cliente.</div>}
              {detallePendientesCliente.map((t) => (
                <div key={`det-p-${t.tipo}-${t.record_id}`} className="resumen-line">
                  {formatDate(t.fecha)} | {t.tipo} | {t.centro_nombre || "-"}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mostrarPreviewRendicion && rendicionDetalle && (
        <div className="rendiciones-overlay" onClick={() => setMostrarPreviewRendicion(false)}>
          <div className="rendicion-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Vista previa - Rendicion de gastos</h6>
              <div className="d-flex align-items-center" style={{ gap: 6 }}>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={imprimirPreviewRendicion}>
                  Imprimir / PDF
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setMostrarPreviewRendicion(false)}>
                  Cerrar
                </button>
              </div>
            </div>

            <div className="preview-doc">
              <div className="preview-head">
                <div className="preview-orca-logo">
                  <div className="preview-orca-row">
                    <div className="preview-orca-cell">O</div>
                    <div className="preview-orca-cell">R</div>
                    <div className="preview-orca-cell">C</div>
                    <div className="preview-orca-cell">A</div>
                  </div>
                  <div className="preview-orca-sub">Tecnologia</div>
                </div>
                <div className="preview-title-block">
                  <div className="preview-title">RENDICION DE GASTOS</div>
                  <div className="preview-meta">Nro gasto: #{rendicionDetalle.id_rendicion}</div>
                  <div className="preview-meta">Fecha: {formatDate(rendicionDetalle.fecha_gasto)}</div>
                  <div className="preview-meta">Tipo: {rendicionDetalle.actividad_tipo || "-"}</div>
                </div>
              </div>

              <div className="preview-grid">
                <div><b>Tecnico</b><span>{rendicionDetalle.tecnico_nombre || "-"}</span></div>
                <div><b>Cliente</b><span>{rendicionDetalle.cliente_nombre || "-"}</span></div>
                <div><b>Centro</b><span>{rendicionDetalle.centro_nombre || "-"}</span></div>
                <div><b>Estado</b><span>{rendicionDetalle.estado || "-"}</span></div>
              </div>

              {!!tecnicosAsociadosDetalle.length && (
                <div className="preview-line">
                  <b>Tecnicos asociados:</b> {tecnicosAsociadosDetalle.join(", ")}
                </div>
              )}
              {!!resumenDescripcion.actividades && (
                <div className="preview-line">
                  <b>Actividades:</b> {resumenDescripcion.actividades}
                </div>
              )}

              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>N documento</th>
                      <th>Descripcion</th>
                      <th>Valor $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {descripcionDetalleRows.length ? (
                      descripcionDetalleRows.map((row, idx) => (
                        <tr key={`pre-row-${idx}`}>
                          <td>{row.fecha || "-"}</td>
                          <td>{row.documento || "-"}</td>
                          <td>{row.descripcion || "-"}</td>
                          <td>{row.monto > 0 ? formatMoney(row.monto) : "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ whiteSpace: "pre-line" }}>{descripcionFallback || "-"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="preview-totales">
                <div><b>Total a rendir</b><span>{resumenDescripcion.totalRendir ? formatMoney(parseMontoTexto(resumenDescripcion.totalRendir)) : "-"}</span></div>
                <div><b>Total gastos</b><span>{resumenDescripcion.totalGastos ? formatMoney(parseMontoTexto(resumenDescripcion.totalGastos)) : formatMoney(rendicionDetalle.monto)}</span></div>
                <div><b>Saldo</b><span>{resumenDescripcion.saldo ? formatMoney(parseMontoTexto(resumenDescripcion.saldo)) : saldoDetalle !== null ? formatMoney(saldoDetalle) : "-"}</span></div>
              </div>

              {!!adjuntosDetalle.length && (
                <div className="preview-adjuntos">
                  <div className="preview-adj-title">Adjuntado</div>
                  <div className="preview-adj-grid">
                    {adjuntosDetalle.map((adj) => (
                      <div key={`pre-${adj.key}`} className="preview-adj-item">
                        <div className="preview-adj-meta">Doc: {adj.documento || "-"} | Fecha: {adj.fecha || "-"}</div>
                        {/\.(jpg|jpeg|png|webp|gif)$/i.test(adj.url || "") || String(adj.url || "").startsWith("data:image/") ? (
                          <img src={adj.url} alt={adj.label} className="preview-adj-img" />
                        ) : (
                          <div className="text-muted small">Adjunto no visual</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


