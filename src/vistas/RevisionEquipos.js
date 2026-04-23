import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import {
  actualizarOrdenRevisionEquipos,
  devolverOperativosRevisionABodega,
  eliminarOrdenRevisionEquipos,
  obtenerOrdenRevisionEquipos,
  obtenerOrdenesRevisionEquipos,
} from "../api";
import "./RevisionEquipos.css";

const AREAS = [
  { value: "camaras", label: "Camaras" },
  { value: "pc", label: "PC" },
  { value: "energia", label: "Energia" },
];

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revision" },
  { value: "diagnosticado", label: "Diagnosticado" },
  { value: "cerrado", label: "Finalizado" },
];

const RESULTADOS = [
  { value: "", label: "Sin resultado" },
  { value: "operativo", label: "Operativo" },
  { value: "no_operativo", label: "No operativo / baja" },
  { value: "requiere_repuesto", label: "Requiere repuesto" },
];

const CHECKLIST_TEMPLATE_OPTIONS = [
  { value: "checklist1", label: "Checklist 1 (UPS)" },
  { value: "checklist2", label: "Checklist 2 (Inversor cargador)" },
  { value: "checklist3", label: "Checklist 3 (Baterias)" },
];
const CHECKLIST_TEMPLATE_OPTIONS_CAMARAS = [
  { value: "checklist_camaras", label: "Checklist camaras" },
];

const CHECKLIST3_CARGA_OPTIONS = [
  { value: "100% Carga: 12.8V - 13.0V o mas.", label: "100% Carga: 12.8V - 13.0V o mas." },
  { value: "75% Carga: 12.5V - 12.6V.", label: "75% Carga: 12.5V - 12.6V." },
  { value: "50% Carga (Limite saludable): 12.2V - 12.3V.", label: "50% Carga (Limite saludable): 12.2V - 12.3V." },
  { value: "25% Carga (Descarga profunda): 12.0V - 12.1V.", label: "25% Carga (Descarga profunda): 12.0V - 12.1V." },
  { value: "0% Carga (Danio/Sulfatacion): 11.8V o menos", label: "0% Carga (Danio/Sulfatacion): 11.8V o menos" },
];

const CHECKLIST_REVISION_TEMPLATE_1 = [
  { item: "1", descripcion: "Inspeccion visual", es_titulo: true },
  { item: "1.1", descripcion: "Estado fisico del gabinete (golpes, deformaciones)" },
  { item: "1.2", descripcion: "Limpieza general del equipo" },
  { item: "1.3", descripcion: "Ventilacion libre (rejillas sin obstruccion)" },
  { item: "1.4", descripcion: "Estado de ventiladores (ruido/anormalidad)" },
  { item: "1.5", descripcion: "Panel operativo (display funcional)" },
  { item: "1.6", descripcion: "Indicadores LED o display sin alarmas visibles" },
  { item: "2", descripcion: "Alimentacion y entrada", es_titulo: true },
  { item: "2.1", descripcion: "Tension de entrada dentro de rango (200Vac - 250Vac)" },
  { item: "2.2", descripcion: "Conexiones de entrada firmes" },
  { item: "2.3", descripcion: "Protecciones (breaker/fusibles) operativos" },
  { item: "2.4", descripcion: "Sistema de puesta a tierra conectado" },
  { item: "3", descripcion: "Banco de baterias", es_titulo: true },
  { item: "3.1", descripcion: "Voltaje del banco en rango con UPS apagado (36Vdc - 40Vdc)" },
  { item: "3.2", descripcion: "Voltaje del banco en rango con UPS cargando (40,5Vdc - 41,5Vdc)" },
  { item: "3.3", descripcion: "Bornes (terminales) limpios y firmes" },
  { item: "3.4", descripcion: "Autonomia de baterias" },
  { item: "3.5", descripcion: "Estado fisico de baterias (sin hinchazon/fugas)" },
  { item: "3.6", descripcion: "Temperatura adecuada" },
  { item: "4", descripcion: "Operacion del sistema", es_titulo: true },
  { item: "4.1", descripcion: "UPS en modo normal online (220Vac +/-1% --- 230Vac +/-1%)" },
  { item: "4.2", descripcion: "Transferencia a bateria operativa" },
  { item: "4.3", descripcion: "Retorno a red sin fallas" },
  { item: "4.4", descripcion: "Sin alarmas activas en display" },
  { item: "4.5", descripcion: "Parametros visibles en pantalla correctos" },
  { item: "5", descripcion: "Salida", es_titulo: true },
  { item: "5.1", descripcion: "Tension de salida estable (220Vac +/-1% --- 230Vac +/-1%)" },
  { item: "5.2", descripcion: "Frecuencia dentro de rango (50 Hz +/- 0.1 Hz)" },
  { item: "5.3", descripcion: "Carga conectada dentro de capacidad" },
  { item: "5.4", descripcion: "Conexiones de salida firmes" },
];

const CHECKLIST_REVISION_TEMPLATE_2 = [
  { item: "1", descripcion: "Inspeccion visual y entorno", es_titulo: true },
  { item: "1.1", descripcion: "Estado fisico gabinetes inversor (golpes/deformaciones)" },
  { item: "1.2", descripcion: "Limpieza general y rejillas de ventilacion despejadas" },
  { item: "1.3", descripcion: "Estado de ventiladores (ruido y flujo de aire)" },
  { item: "1.4", descripcion: "Verificacion de temperatura ambiente (<40 C)" },
  { item: "1.5", descripcion: "Indicadores LED (sin alarmas activas)" },
  { item: "2", descripcion: "Conexiones de potencia (DC/AC)", es_titulo: true },
  { item: "2.1", descripcion: "Tension de entrada AC Red/Generador (200Vac - 240Vac)" },
  { item: "2.2", descripcion: "Tension de salida AC (Modo inversor) (220Vac-230Vac +/-2%)" },
  { item: "2.3", descripcion: "Conexiones de bateria (DC) firmes" },
  { item: "2.4", descripcion: "Fusibles DC en buen estado" },
  { item: "2.5", descripcion: "Protecciones AC en buen estado" },
  { item: "2.6", descripcion: "Puesta a tierra (PE) conectada y continuidad verificada" },
  { item: "3", descripcion: "Comunicaciones Victron", es_titulo: true },
  { item: "3.1", descripcion: "Cables RJ45 (VE.Bus) conectados y verificados correctamente" },
  { item: "3.2", descripcion: "Lectura correcta de sensor de corriente AC y DC" },
  { item: "3.3", descripcion: "Lectura correcta de voltajes AC y DC" },
  { item: "3.4", descripcion: "Lectura correcta de sensor de temperatura" },
  { item: "4", descripcion: "Software y configuracion", es_titulo: true },
  { item: "4.1", descripcion: "Firmware MultiPlus actualizado (VE.Bus System)" },
  { item: "4.2", descripcion: "Configuracion de cargador (Voltaje Bulk/Float) segun bateria" },
  { item: "4.3", descripcion: "Asistente configurado VE Configure (inversor/cargador/relay)" },
  { item: "5", descripcion: "Pruebas operativas", es_titulo: true },
  { item: "5.1", descripcion: "Simulacion de corte de red (transferencia a baterias)" },
  { item: "5.2", descripcion: "Simulacion de retorno de red (sincronizacion y carga)" },
  { item: "5.3", descripcion: "Prueba con carga AC (verificacion de consumos)" },
  { item: "6", descripcion: "Panel Victron", es_titulo: true },
  { item: "6.1", descripcion: "Firmware Cerbo GX/CCGX actualizado" },
  { item: "6.2", descripcion: "Terminales RJ45 (VE.Bus) en buenas condiciones y verificados" },
  { item: "6.3", descripcion: "Sincronizacion con Portal VRM (conectividad internet)" },
  { item: "6.4", descripcion: "Comunicacion BMS de baterias activa (DVCC) (solo litio)" },
  { item: "6.5", descripcion: "Pantalla GX (sin alarmas activas)" },
  { item: "6.6", descripcion: "Conexion local (LAN)" },
  { item: "6.7", descripcion: "Conexion VE.Can configurado (si aplica, bateria de litio)" },
];

const CHECKLIST_REVISION_TEMPLATE_3 = [
  { item: "1.0", descripcion: "Inspeccion visual", es_titulo: true },
  { item: "1.1", descripcion: "Tiene codigo orca (buenas condiciones)" },
  { item: "1.2", descripcion: "Estado de carcasa (sin grietas ni abombamientos)" },
  { item: "1.3", descripcion: "Limpieza de bornes, puentes y terminales" },
  { item: "1.4", descripcion: "Ausencia de fugas o derrames de electrolito" },
  { item: "2.0", descripcion: "Conexiones electricas", es_titulo: true },
  { item: "2.1", descripcion: "Ajuste de torque en terminales y puentes" },
  { item: "2.2", descripcion: "Estado de cables y aislamiento termico" },
  { item: "2.3", descripcion: "Estado terminales (sin sulfatacion)" },
  { item: "3.0", descripcion: "Parametros de medicion y salud", es_titulo: true },
  { item: "3.1", descripcion: "Voltaje total del banco en reposo >= 12,8VDC" },
  { item: "3.2", descripcion: "Voltaje total del banco en carga >= 13,5Vdc <= 14,6Vdc" },
  { item: "3.3", descripcion: "Porcentaje de carga (SOC) para realizar pruebas" },
  { item: "3.4", descripcion: "Porcentaje de salud (SOH) / estado de vida (>= 80%)" },
  { item: "3.5", descripcion: "Equilibrio de voltaje entre monoblocks (<= 0.4Vdc)" },
  { item: "3.6", descripcion: "Temperatura terminales y bateria durante las pruebas" },
];

const CHECKLIST_REVISION_TEMPLATE_CAMARAS = [
  { item: "1", descripcion: "Inspeccion fisica y estructural (camaras)", es_titulo: true },
  { item: "1.1", descripcion: "Estado fisico de la carcasa/domo (golpes, grietas)" },
  { item: "1.2", descripcion: "Limpieza de lente o frontal (sin obstrucciones)" },
  { item: "1.3", descripcion: "Estado de pintura" },
  { item: "1.4", descripcion: "Estado de soportes y accesorios" },
  { item: "2", descripcion: "Conectividad y alimentacion", es_titulo: true },
  { item: "2.1", descripcion: "Tension de alimentacion estable (PoE dependiendo la camara)" },
  { item: "2.2", descripcion: "Tension de alimentacion estable (con transformador AC o DC)" },
  { item: "2.3", descripcion: "Estado de conectores y cableado" },
  { item: "3", descripcion: "Funcionalidad PTZ / bullet", es_titulo: true },
  { item: "3.1", descripcion: "Movimiento pan/tilt/zoom fluido y sin ruidos" },
  { item: "3.2", descripcion: "Funcionalidad de preset y ronda" },
  { item: "3.3", descripcion: "Vision nocturna e iluminadores IR operativos, laser modulo y termal" },
  { item: "4", descripcion: "Software y gestion", es_titulo: true },
  { item: "4.1", descripcion: "Grabacion en NVR continua y sin saltos" },
  { item: "4.2", descripcion: "Grabacion en VMS continua y sin saltos" },
  { item: "4.3", descripcion: "Grabacion en SD continua y sin saltos" },
  { item: "4.4", descripcion: "Sincronizacion de hora y firmware actualizado" },
  { item: "5", descripcion: "Radar de seguridad", es_titulo: true },
  { item: "5.1", descripcion: "Limpieza (frontal y cuerpo del radar)" },
  { item: "5.2", descripcion: "Deteccion por utilidad" },
  { item: "5.3", descripcion: "Sellado (estanqueidad de entradas y juntas)" },
  { item: "5.4", descripcion: "Estado de conector (RJ45 / alimentacion) y engrace conector" },
  { item: "5.5", descripcion: "Estado de carcaza (golpes, corrosion o danios)" },
  { item: "5.6", descripcion: "Verificacion de firmware" },
  { item: "5.7", descripcion: "Estado de ping (conectividad y latencia)" },
];

function getChecklistTemplateById(templateId) {
  if (templateId === "checklist_camaras") return CHECKLIST_REVISION_TEMPLATE_CAMARAS;
  if (templateId === "checklist2") return CHECKLIST_REVISION_TEMPLATE_2;
  if (templateId === "checklist3") return CHECKLIST_REVISION_TEMPLATE_3;
  return CHECKLIST_REVISION_TEMPLATE_1;
}

function getDefaultTemplateByArea(area) {
  return isCamarasArea(area) ? "checklist_camaras" : "checklist1";
}

function resolveChecklistTemplate(existing = [], area = "") {
  if (isCamarasArea(area)) return "checklist_camaras";
  const rows = Array.isArray(existing) ? existing : [];
  const meta = rows.find((r) => String(r?.item || "") === "__meta_template");
  const templateId = String(meta?.template_id || "");
  const validTemplates = ["checklist1", "checklist2", "checklist3", "checklist_camaras"];
  if (validTemplates.includes(templateId)) return templateId;
  return getDefaultTemplateByArea(area);
}

function buildChecklistDefault(existing = [], forcedTemplateId = null, area = "") {
  const templateId = forcedTemplateId || resolveChecklistTemplate(existing, area);
  const byItem = new Map(
    (Array.isArray(existing) ? existing : [])
      .filter((r) => String(r?.item || "") !== "__meta_template")
      .map((r) => [String(r?.item || ""), r])
  );
  const normalizeEstado = (v) => {
    const raw = String(v || "").trim();
    const s = raw.toLowerCase();
    if (s === "correcto" || s === "incorrecto") return s;
    return raw;
  };
  const items = getChecklistTemplateById(templateId).map((base) => {
    const row = byItem.get(String(base.item || ""));
    return {
      item: base.item,
      descripcion: base.descripcion,
      es_titulo: !!base.es_titulo,
      estado_inicial: normalizeEstado(row?.estado_inicial),
      observacion_especifica: row?.observacion_especifica || "",
      estado_final: normalizeEstado(row?.estado_final),
    };
  });
  return { templateId, items };
}

function getChecklistEstadoOptions(templateId, item) {
  if (templateId === "checklist3" && String(item) === "3.1") {
    return CHECKLIST3_CARGA_OPTIONS;
  }
  return [
    { value: "correcto", label: "Correcto" },
    { value: "incorrecto", label: "Incorrecto" },
  ];
}

function serializeChecklistItems(items = [], templateId = "checklist1") {
  const rows = Array.isArray(items) ? items : [];
  return [
    { item: "__meta_template", template_id: templateId },
    ...rows.map((r) => ({
      item: r.item,
      descripcion: r.descripcion,
      es_titulo: !!r.es_titulo,
      estado_inicial: r.estado_inicial || "",
      observacion_especifica: r.observacion_especifica || "",
      estado_final: r.estado_final || "",
    })),
  ];
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getEstadoClass(value) {
  const v = String(value || "").toLowerCase();
  if (v === "correcto") return "revision-estado-correcto";
  if (v === "incorrecto") return "revision-estado-incorrecto";
  return "";
}

function isEnergiaArea(area) {
  const normalized = String(area || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized.includes("energia");
}

function isCamarasArea(area) {
  const normalized = String(area || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized.includes("camara");
}

function formatEstadoLabel(value) {
  const v = String(value || "").toLowerCase();
  if (v === "cerrado") return "Finalizado";
  if (v === "en_revision") return "En revision";
  if (v === "diagnosticado") return "Diagnosticado";
  if (v === "pendiente") return "Pendiente";
  return value || "-";
}

function normalizeResultado(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "reparable" || v === "no_reparable") return "no_operativo";
  return v;
}

function formatResultadoLabel(value) {
  const v = normalizeResultado(value);
  if (v === "no_operativo") return "No operativo / baja";
  if (v === "requiere_repuesto") return "Requiere repuesto";
  if (v === "operativo") return "Operativo";
  return v || "-";
}

function getFlujoRevision(orden) {
  const detalles = Array.isArray(orden?.detalles) ? orden.detalles : [];
  const enviadoBodega = detalles.some((d) => !!d?.disponible_bodega);
  if (enviadoBodega) return "Enviado a bodega";
  const estado = String(orden?.estado || "").toLowerCase();
  if (estado === "cerrado") return "Finalizado (sin envio)";
  if (estado === "diagnosticado") return "Diagnosticado";
  return "En revisión";
}


function getResumenEstadoEquipo(orden) {
  const detalles = Array.isArray(orden?.detalles) ? orden.detalles : [];
  if (!detalles.length) return "-";
  const resultados = detalles
    .map((d) => normalizeResultado(d?.resultado))
    .filter(Boolean);
  if (!resultados.length) return "Sin estado";
  if (resultados.includes("requiere_repuesto")) return "Requiere repuesto";
  if (resultados.includes("no_operativo")) return "No operativo / baja";
  if (resultados.every((r) => r === "operativo")) return "Operativo";
  return "Mixto";
}

function getResumenEstadoClass(resumen) {
  const v = String(resumen || "").toLowerCase();
  if (v.includes("repuesto")) return "badge-warning";
  if (v.includes("no operativo") || v.includes("baja")) return "badge-danger";
  if (v.includes("operativo")) return "badge-success";
  if (v.includes("mixto")) return "badge-info";
  return "badge-light border";
}

export default function RevisionEquipos() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroEstadoEquipo, setFiltroEstadoEquipo] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes-actual");
  const [fechaInicioPersonalizada, setFechaInicioPersonalizada] = useState("");
  const [fechaFinPersonalizada, setFechaFinPersonalizada] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [tabEstado, setTabEstado] = useState("todos");
  const [verMasRecientes, setVerMasRecientes] = useState(false);
  const [verMasFallas, setVerMasFallas] = useState(false);
  const [paginaBandeja, setPaginaBandeja] = useState(1);
  const [rolUsuario, setRolUsuario] = useState("");

  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);

  const cargarBandeja = async () => {
    setLoading(true);
    try {
      const rows = await obtenerOrdenesRevisionEquipos({
        area: filtroArea || undefined,
        estado: filtroEstado || undefined,
      });
      setOrdenes(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setOrdenes([]);
      alert("No se pudo cargar la bandeja de revision.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarBandeja();
  }, [filtroArea, filtroEstado]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setRolUsuario(String(decoded?.rol || "").toLowerCase());
    } catch {
      setRolUsuario("");
    }
  }, []);

  const abrirDetalle = async (idOrden) => {
    try {
      const row = await obtenerOrdenRevisionEquipos(idOrden);
      const checklistBuilt = buildChecklistDefault(row?.checklist_items || [], null, row?.area || "");
      setOrdenDetalle(
        row
          ? {
              ...row,
              checklist_template: checklistBuilt.templateId,
              checklist_items: checklistBuilt.items,
              detalles: (row.detalles || []).map((d) => ({
                ...d,
                resultado: normalizeResultado(d?.resultado),
              })),
            }
          : null
      );
      setShowDetalle(true);
    } catch {
      alert("No se pudo abrir la orden.");
    }
  };

  const actualizarDetalle = (idDetalle, patch) => {
    setOrdenDetalle((prev) => {
      if (!prev) return prev;
      const resultadoSeleccionado = normalizeResultado(patch?.resultado);
      return {
        ...prev,
        estado: resultadoSeleccionado === "no_operativo" ? "cerrado" : (prev.estado || "pendiente"),
        detalles: (prev.detalles || []).map((d) =>
          d.id_revision_detalle === idDetalle ? { ...d, ...patch } : d
        ),
      };
    });
  };

  const actualizarChecklist = (itemKey, patch) => {
    setOrdenDetalle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklist_items: (prev.checklist_items || []).map((r) =>
          String(r?.item || "") === String(itemKey) ? { ...r, ...patch } : r
        ),
      };
    });
  };

  const cambiarChecklistTemplate = (templateId) => {
    setOrdenDetalle((prev) => {
      if (!prev) return prev;
      const built = buildChecklistDefault([], templateId);
      return {
        ...prev,
        checklist_template: templateId,
        checklist_items: built.items,
      };
    });
  };

  const guardarDiagnostico = async () => {
    if (!ordenDetalle?.id_revision_orden) return;
    setGuardando(true);
    try {
      const payload = {
        estado: ordenDetalle.estado,
        observacion: ordenDetalle.observacion,
        checklist_items: serializeChecklistItems(
          ordenDetalle.checklist_items || [],
          ordenDetalle.checklist_template || "checklist1"
        ),
        detalles: (ordenDetalle.detalles || []).map((d) => ({
          id_revision_detalle: d.id_revision_detalle,
                    diagnostico: d.diagnostico || null,
          // Compatibilidad con backends antiguos que aun no aceptan "no_operativo".
          resultado: (() => {
            const r = normalizeResultado(d.resultado) || "";
            return r === "no_operativo" ? "no_reparable" : r;
          })(),
        })),
      };
      const res = await actualizarOrdenRevisionEquipos(ordenDetalle.id_revision_orden, payload);
      setOrdenDetalle(res?.orden || ordenDetalle);
      await cargarBandeja();
      setShowDetalle(false);
      alert("Diagnostico guardado correctamente.");
    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "No se pudo guardar el diagnostico.";
      alert(msg);
    } finally {
      setGuardando(false);
    }
  };

  const resumen = useMemo(() => {
    const base = { pendiente: 0, en_revision: 0, diagnosticado: 0, cerrado: 0 };
    (ordenes || []).forEach((o) => {
      const k = String(o?.estado || "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(base, k)) base[k] += 1;
    });
    return base;
  }, [ordenes]);

  const resumenAvanzado = useMemo(() => {
    const base = {
      devueltos7d: 0,
      fallaCritica: 0,
    };
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    (ordenes || []).forEach((o) => {
      (o.detalles || []).forEach((d) => {
        if (d?.disponible_bodega && d?.fecha_disponible_bodega) {
          const fd = new Date(d.fecha_disponible_bodega);
          if (!Number.isNaN(fd.getTime()) && fd >= limite) base.devueltos7d += 1;
        }
        const r = normalizeResultado(d?.resultado);
        if (r === "no_operativo" || r === "requiere_repuesto") base.fallaCritica += 1;
      });
    });
    return base;
  }, [ordenes]);

  const recientesDevueltos = useMemo(() => {
    const rows = [];
    (ordenes || []).forEach((o) => {
      (o.detalles || [])
        .filter((d) => !!d?.disponible_bodega)
        .forEach((d) => {
          rows.push({
            id: `${o.id_revision_orden}-${d.id_revision_detalle}`,
            orden: o.id_revision_orden,
            centro: o.centro?.nombre || "-",
            cliente: o.cliente?.nombre || "-",
            equipo: d.equipo_nombre || "-",
            serie: d.numero_serie || "-",
            fecha: d.fecha_disponible_bodega || d.updated_at || o.fecha_asignacion,
          });
        });
    });
    const ordenados = rows
      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
    return verMasRecientes ? ordenados : ordenados.slice(0, 10);
  }, [ordenes, verMasRecientes]);

  const equiposConFalla = useMemo(() => {
    const rows = [];
    (ordenes || []).forEach((o) => {
      (o.detalles || []).forEach((d) => {
        if (d?.disponible_bodega) return;
        const r = normalizeResultado(d?.resultado);
        if (r !== "no_operativo" && r !== "requiere_repuesto") return;
        rows.push({
          id: `${o.id_revision_orden}-${d.id_revision_detalle}`,
          orden: o.id_revision_orden,
          centro: o.centro?.nombre || "-",
          cliente: o.cliente?.nombre || "-",
          equipo: d.equipo_nombre || "-",
          serie: d.numero_serie || "-",
          diagnostico: d.diagnostico || "-",
          resultado: r,
          fecha: d.updated_at || o.fecha_asignacion,
        });
      });
    });
    const ordenados = rows
      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
    return verMasFallas ? ordenados : ordenados.slice(0, 10);
  }, [ordenes, verMasFallas]);

  const rangoFechas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const parseFechaLocal = (valor, finDeDia = false) => {
      if (!valor) return null;
      const [y, m, d] = String(valor).split("-").map(Number);
      if (!y || !m || !d) return null;
      return finDeDia ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    switch (filtroPeriodo) {
      case "mes-actual":
        return {
          inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
          fin: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999),
        };
      case "mes-anterior":
        return {
          inicio: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
          fin: new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999),
        };
      case "anio-actual":
        return {
          inicio: new Date(hoy.getFullYear(), 0, 1),
          fin: new Date(hoy.getFullYear(), 11, 31, 23, 59, 59, 999),
        };
      case "anio-anterior":
        return {
          inicio: new Date(hoy.getFullYear() - 1, 0, 1),
          fin: new Date(hoy.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
        };
      case "personalizado":
        return {
          inicio: parseFechaLocal(fechaInicioPersonalizada),
          fin: parseFechaLocal(fechaFinPersonalizada, true),
        };
      default:
        return { inicio: null, fin: null };
    }
  }, [filtroPeriodo, fechaInicioPersonalizada, fechaFinPersonalizada]);

  const ordenesFiltradas = useMemo(() => {
    const q = String(filtroTexto || "").trim().toLowerCase();
    return (ordenes || []).filter((o) => {
      const estado = String(o?.estado || "").toLowerCase();
      if (tabEstado !== "todos" && estado !== tabEstado) return false;
      const estadoEquipo = getResumenEstadoEquipo(o);
      if (filtroEstadoEquipo && estadoEquipo !== filtroEstadoEquipo) return false;

      const fechaBase = o?.fecha_asignacion ? new Date(o.fecha_asignacion) : null;
      if (fechaBase && !Number.isNaN(fechaBase.getTime())) {
        if (rangoFechas.inicio && fechaBase < rangoFechas.inicio) return false;
        if (rangoFechas.fin && fechaBase > rangoFechas.fin) return false;
      }
      if (!q) return true;
      const detalles = Array.isArray(o?.detalles) ? o.detalles : [];
      return [
        `#${o?.id_revision_orden || ""}`,
        o?.centro?.nombre || "",
        o?.cliente?.nombre || "",
        o?.area || "",
        o?.asignado_nombre || "",
        ...detalles.map((d) => `${d?.equipo_nombre || ""} ${d?.numero_serie || ""} ${d?.codigo || ""}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [ordenes, tabEstado, filtroTexto, filtroEstadoEquipo, rangoFechas]);

  const PAGE_SIZE_BANDEJA = 10;
  const totalPaginasBandeja = Math.max(1, Math.ceil((ordenesFiltradas?.length || 0) / PAGE_SIZE_BANDEJA));
  const ordenesPaginadas = useMemo(() => {
    const inicio = (paginaBandeja - 1) * PAGE_SIZE_BANDEJA;
    return (ordenesFiltradas || []).slice(inicio, inicio + PAGE_SIZE_BANDEJA);
  }, [ordenesFiltradas, paginaBandeja]);

  useEffect(() => {
    setPaginaBandeja(1);
  }, [filtroArea, filtroEstado, filtroEstadoEquipo, filtroPeriodo, fechaInicioPersonalizada, fechaFinPersonalizada, filtroTexto, tabEstado]);

  useEffect(() => {
    if (paginaBandeja > totalPaginasBandeja) {
      setPaginaBandeja(totalPaginasBandeja);
    }
  }, [paginaBandeja, totalPaginasBandeja]);

  const esAreaEnergia = isEnergiaArea(ordenDetalle?.area);
  const esAreaCamaras = isCamarasArea(ordenDetalle?.area);
  const esAreaConChecklist = esAreaEnergia || esAreaCamaras;
  const checklistTemplateOptions = esAreaCamaras ? CHECKLIST_TEMPLATE_OPTIONS_CAMARAS : CHECKLIST_TEMPLATE_OPTIONS;
  const equipoPrincipalChecklist = (ordenDetalle?.detalles || [])[0] || null;

  return (
    <div className="container-fluid py-3 revision-page">
      <div className="card shadow-sm border-0 mb-3 revision-hero">
        <div className="card-body d-flex justify-content-between align-items-start flex-wrap" style={{ gap: 10 }}>
          <div>
            <h4 className="mb-2">Revision de equipos</h4>
            <p className="text-muted mb-0">Asignacion desde bodega y diagnostico por area tecnica.</p>
          </div>
          <div className="revision-kpis-inline">
            <span className="revision-kpi-chip chip-pendiente"><i className="far fa-clock" /> Pendiente: {resumen.pendiente}</span>
            <span className="revision-kpi-chip chip-proceso"><i className="fas fa-tools" /> En revision: {resumen.en_revision}</span>
            <span className="revision-kpi-chip chip-ok"><i className="fas fa-check-circle" /> Finalizadas: {resumen.cerrado}</span>
            <span className="revision-kpi-chip chip-critico"><i className="fas fa-triangle-exclamation" /> No operativas / baja: {resumenAvanzado.fallaCritica}</span>
            <span className="revision-kpi-chip chip-bodega"><i className="fas fa-warehouse" /> Devueltos 7d: {resumenAvanzado.devueltos7d}</span>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-3 revision-filtros-card">
        <div className="card-body">
          <div className="alert alert-light border mb-3 revision-filtros-alert">
            <i className="fas fa-info-circle text-primary mr-2" />
            Las ordenes se crean desde <strong>Bodega retiros</strong> usando la accion <strong>Revisar</strong>.
          </div>
          <div className="row g-2 align-items-end">
            <div className="col-md-2">
              <label className="form-label">Filtrar area</label>
              <select className="form-control" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
                <option value="">Todas</option>
                {AREAS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select className="form-control" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                {ESTADOS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado equipo</label>
              <select className="form-control" value={filtroEstadoEquipo} onChange={(e) => setFiltroEstadoEquipo(e.target.value)}>
                <option value="">Todos</option>
                <option value="Operativo">Operativo</option>
                <option value="No operativo / baja">No operativo / baja</option>
                <option value="Requiere repuesto">Requiere repuesto</option>
                <option value="Mixto">Mixto</option>
                <option value="Sin estado">Sin estado</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Periodo de analisis</label>
              <select className="form-control" value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
                <option value="mes-actual">Mes actual</option>
                <option value="mes-anterior">Mes anterior</option>
                <option value="anio-actual">Ano actual</option>
                <option value="anio-anterior">Ano anterior</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="N?? orden, centro, serie, codigo"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>
          </div>
          {filtroPeriodo === "personalizado" && (
            <div className="row g-2 mt-2">
              <div className="col-md-3">
                <small className="text-muted text-uppercase d-block mb-1">Desde</small>
                <input
                  type="date"
                  className="form-control"
                  value={fechaInicioPersonalizada}
                  onChange={(e) => setFechaInicioPersonalizada(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <small className="text-muted text-uppercase d-block mb-1">Hasta</small>
                <input
                  type="date"
                  className="form-control"
                  value={fechaFinPersonalizada}
                  onChange={(e) => setFechaFinPersonalizada(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button className={`btn btn-sm ${tabEstado === "todos" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setTabEstado("todos")}>Todos</button>
            <button className={`btn btn-sm ${tabEstado === "pendiente" ? "btn-warning" : "btn-outline-warning"}`} onClick={() => setTabEstado("pendiente")}>Pendiente</button>
            <button className={`btn btn-sm ${tabEstado === "en_revision" ? "btn-info" : "btn-outline-info"}`} onClick={() => setTabEstado("en_revision")}>En revision</button>
            <button className={`btn btn-sm ${tabEstado === "diagnosticado" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setTabEstado("diagnosticado")}>Diagnosticado</button>
            <button className={`btn btn-sm ${tabEstado === "cerrado" ? "btn-success" : "btn-outline-success"}`} onClick={() => setTabEstado("cerrado")}>Finalizado</button>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100 revision-card-entregas">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <strong><i className="fas fa-box-open mr-2 text-success" /> Entregas recientes a bodega</strong>
              <button className="btn btn-link btn-sm p-0" onClick={() => setVerMasRecientes((v) => !v)}>
                {verMasRecientes ? "Ver menos" : "Ver más"}
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0 revision-table-entregas">
                  <thead className="thead-light">
                    <tr>
                      <th>Fecha</th><th>Orden</th><th>Equipo</th><th>Serie</th><th>Centro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!recientesDevueltos.length ? (
                      <tr><td colSpan={6} className="text-center text-muted py-3">Sin entregas recientes.</td></tr>
                    ) : recientesDevueltos.map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.fecha)}</td>
                        <td>#{r.orden}</td>
                        <td>{r.equipo}</td>
                        <td>{r.serie}</td>
                        <td>{r.centro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100 revision-card-fallas">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <strong><i className="fas fa-screwdriver-wrench mr-2 text-danger" /> Equipos pendiente mantencion</strong>
              <button className="btn btn-link btn-sm p-0" onClick={() => setVerMasFallas((v) => !v)}>
                {verMasFallas ? "Ver menos" : "Ver más"}
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0 revision-table-fallas">
                  <thead className="thead-light">
                    <tr>
                      <th>Fecha</th><th>Orden</th><th>Equipo</th><th>Diagnostico</th><th>Estado</th><th>Centro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!equiposConFalla.length ? (
                      <tr><td colSpan={6} className="text-center text-muted py-3">Sin fallas críticas.</td></tr>
                    ) : equiposConFalla.map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.fecha)}</td>
                        <td>#{r.orden}</td>
                        <td>{r.equipo}</td>
                        <td>{r.diagnostico || "-"}</td>
                        <td><span className={`badge ${r.resultado === "no_operativo" ? "badge-danger" : "badge-warning"}`}>{formatResultadoLabel(r.resultado)}</span></td>
                        <td>{r.centro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header revision-bandeja-header d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong><i className="fas fa-clipboard-check mr-2" /> Bandeja de revision</strong>
          {loading ? <span className="revision-bandeja-loading">Cargando...</span> : <span className="badge badge-light border">{ordenesFiltradas.length} ordenes</span>}
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 revision-table">
              <thead className="thead-light">
                <tr>
                  <th>N° Orden</th>
                  <th>Area</th>
                  <th>Estado</th>
                  <th>Estado equipo</th>
                  <th>Flujo</th>
                  <th>Centro</th>
                  <th>Cliente</th>
                  <th>Asignado</th>
                  <th>Fecha</th>
                  <th className="text-center">Accion</th>
                </tr>
              </thead>
              <tbody>
                {ordenesPaginadas.map((o) => (
                  <tr key={o.id_revision_orden}>
                    <td><strong>#{o.id_revision_orden}</strong></td>
                    <td className="text-capitalize">{o.area || "-"}</td>
                    <td><span className={`badge revision-estado revision-estado-${o.estado || "pendiente"}`}>{formatEstadoLabel(o.estado)}</span></td>
                    <td>
                      <span className={`badge ${getResumenEstadoClass(getResumenEstadoEquipo(o))}`}>
                        {getResumenEstadoEquipo(o)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getFlujoRevision(o) === "Enviado a bodega" ? "badge-success" : "badge-light border"}`}>
                        {getFlujoRevision(o)}
                      </span>
                    </td>
                    <td>{o.centro?.nombre || "-"}</td>
                    <td>{o.cliente?.nombre || "-"}</td>
                    <td>{o.asignado_nombre || "-"}</td>
                    <td>{formatDate(o.fecha_asignacion)}</td>
                    <td className="text-center">
                      <div className="d-inline-flex" style={{ gap: 6 }}>
                        <button className="btn btn-outline-primary btn-sm" title="Ver orden" onClick={() => abrirDetalle(o.id_revision_orden)}>
                          <i className="fas fa-eye" />
                        </button>
                        {String(o?.estado || "").toLowerCase() === "cerrado" && (
                          <button
                            className="btn btn-outline-success btn-sm"
                            title="Devolver a bodega"
                            onClick={async () => {
                              try {
                                const res = await devolverOperativosRevisionABodega(o.id_revision_orden, {
                                  observacion: "Devuelto a bodega desde bandeja",
                                });
                                alert(res?.message || "Equipos devueltos a bodega.");
                                await cargarBandeja();
                              } catch (e) {
                                alert(e?.response?.data?.error || "No se pudieron devolver equipos a bodega.");
                              }
                            }}
                          >
                            <i className="fas fa-warehouse" />
                          </button>
                        )}
                        {rolUsuario === "admin" && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            title="Eliminar orden"
                            onClick={async () => {
                              if (!window.confirm(`Eliminar orden #${o.id_revision_orden}?`)) return;
                              try {
                                await eliminarOrdenRevisionEquipos(o.id_revision_orden);
                                await cargarBandeja();
                              } catch (e) {
                                alert(e?.response?.data?.error || "No se pudo eliminar la orden.");
                              }
                            }}
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!ordenesFiltradas.length && (
                  <tr>
                    <td colSpan={10} className="text-center text-muted py-4">Sin ordenes de revision.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {ordenesFiltradas.length > PAGE_SIZE_BANDEJA && (
            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top flex-wrap" style={{ gap: 8 }}>
              <small className="text-muted">
                Mostrando {(paginaBandeja - 1) * PAGE_SIZE_BANDEJA + 1}
                -
                {Math.min(paginaBandeja * PAGE_SIZE_BANDEJA, ordenesFiltradas.length)} de {ordenesFiltradas.length}
              </small>
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  disabled={paginaBandeja <= 1}
                  onClick={() => setPaginaBandeja((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button className="btn btn-outline-primary" disabled>
                  {paginaBandeja}/{totalPaginasBandeja}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={paginaBandeja >= totalPaginasBandeja}
                  onClick={() => setPaginaBandeja((p) => Math.min(totalPaginasBandeja, p + 1))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDetalle && ordenDetalle && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Orden de revision #{ordenDetalle.id_revision_orden}</h5>
                <div className="d-flex align-items-center" style={{ gap: 10 }}>
                  <span className="badge badge-info px-3 py-2">
                    Area: {String(ordenDetalle.area || "-").toUpperCase()}
                  </span>
                  <button type="button" className="close" onClick={() => setShowDetalle(false)}>
                    <span>&times;</span>
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="revision-ficha mb-3">
                  <div className="revision-ficha-title">
                    <i className="fas fa-clipboard-check mr-2" />
                    Checklist de revision
                  </div>
                  <div className="row g-2 mt-1">
                    <div className="col-md-6">
                      <div className="revision-ficha-item"><strong>Fecha de ingreso a bodega:</strong> {formatDate(ordenDetalle.retiro?.fecha_recepcion_bodega)}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="revision-ficha-item"><strong>Fecha de mantencion/retiro:</strong> {formatDate(ordenDetalle.retiro?.fecha_retiro)}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="revision-ficha-item"><strong>Centro retirado:</strong> {ordenDetalle.centro?.nombre || "-"}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="revision-ficha-item"><strong>Cliente:</strong> {ordenDetalle.cliente?.nombre || "-"}</div>
                    </div>
                    <div className="col-12">
                      <div className="revision-ficha-item">
                        <strong>Antecedentes:</strong> {ordenDetalle.retiro?.observacion || "Sin antecedentes registrados."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-12">
                    <label className="form-label">Antecedentes</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={ordenDetalle.observacion || ""}
                      onChange={(e) => setOrdenDetalle((p) => ({ ...p, observacion: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  {esAreaConChecklist && (
                    <>
                      <div className="d-flex justify-content-between align-items-end mb-2" style={{ gap: 10 }}>
                        <h6 className="mb-0">
                          Checklist tecnico ({esAreaCamaras ? "camaras" : "energia"})
                        </h6>
                        <div className="revision-checklist-type-box" style={{ minWidth: 260 }}>
                          <label className="form-label mb-1 revision-checklist-type-label">
                            <i className="fas fa-list-check mr-1" />
                            Tipo de checklist
                          </label>
                          <select
                            className="form-control form-control-sm revision-checklist-type-select"
                            value={ordenDetalle.checklist_template || "checklist1"}
                            onChange={(e) => cambiarChecklistTemplate(e.target.value)}
                            disabled={esAreaCamaras}
                          >
                            {checklistTemplateOptions.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {equipoPrincipalChecklist && (
                        <div className="alert alert-info py-2 px-3 mb-2">
                          <strong>Equipo ligado:</strong>{" "}
                          {equipoPrincipalChecklist.equipo_nombre || "-"} | Serie:{" "}
                          {equipoPrincipalChecklist.numero_serie || "-"} | Codigo:{" "}
                          {equipoPrincipalChecklist.codigo || "-"}
                        </div>
                      )}
                      <table className="table table-sm table-bordered mb-3">
                        <thead>
                          <tr>
                            <th style={{ width: 90 }}>Item</th>
                            <th>Descripcion del Punto de Inspeccion</th>
                            <th style={{ width: 150 }}>Estado inicial</th>
                            <th style={{ width: 220 }}>Observaciones especificas</th>
                            <th style={{ width: 150 }}>Estado final</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ordenDetalle.checklist_items || []).map((r) => (
                            <tr key={`chk-${r.item}`} className={r.es_titulo ? "revision-checklist-title-row" : ""}>
                              <td><strong>{r.item}</strong></td>
                              <td><strong>{r.es_titulo ? r.descripcion : null}</strong>{!r.es_titulo ? r.descripcion : null}</td>
                              <td>
                                {r.es_titulo ? null : (
                                  <select
                                    className={`form-control form-control-sm ${getEstadoClass(r.estado_inicial)}`}
                                    value={r.estado_inicial || ""}
                                    onChange={(e) => actualizarChecklist(r.item, { estado_inicial: e.target.value })}
                                  >
                                    <option value="">-</option>
                                    {getChecklistEstadoOptions(ordenDetalle.checklist_template || "checklist1", r.item).map((op) => (
                                      <option key={`${r.item}-ini-${op.value}`} value={op.value}>{op.label}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td>
                                {r.es_titulo ? null : (
                                  <input
                                    className="form-control form-control-sm"
                                    value={r.observacion_especifica || ""}
                                    onChange={(e) => actualizarChecklist(r.item, { observacion_especifica: e.target.value })}
                                  />
                                )}
                              </td>
                              <td>
                                {r.es_titulo ? null : (
                                  <select
                                    className={`form-control form-control-sm ${getEstadoClass(r.estado_final)}`}
                                    value={r.estado_final || ""}
                                    onChange={(e) => actualizarChecklist(r.item, { estado_final: e.target.value })}
                                  >
                                    <option value="">-</option>
                                    {getChecklistEstadoOptions(ordenDetalle.checklist_template || "checklist1", r.item).map((op) => (
                                      <option key={`${r.item}-fin-${op.value}`} value={op.value}>{op.label}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(ordenDetalle.checklist_template || "checklist1") === "checklist3" && (
                        <div className="alert py-2 px-3 mb-3 revision-note-soft">
                          <strong>Nota:</strong> baterias bajo el 80% SOH (estado de salud) no esta apta para integrar un sistema de respaldo ORCA, 75%-60% senalan una degradacion severa.
                          <br />
                          <strong>Significado del SOH:</strong> es el porcentaje de salud general. A diferencia del estado de carga (SOC), que es momentaneo, el SOH indica el deterioro a largo plazo y la capacidad real de la bateria frente a su valor nominal de fabrica.
                        </div>
                      )}
                    </>
                  )}

                  {!esAreaConChecklist && (
                    <div className="alert alert-secondary py-2 px-3 mb-3">
                      El checklist tecnico detallado aplica a las areas de energia y camaras.
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-end mb-2" style={{ gap: 12 }}>
                    <h6 className="mb-0">Detalle de equipos</h6>
                    <div className="revision-estado-orden-box" style={{ minWidth: 260 }}>
                      <label className="form-label mb-1 revision-estado-orden-label">
                        <i className="fas fa-flag-checkered mr-1" />
                        Estado de la orden
                      </label>
                      <select
                        className="form-control form-control-sm revision-estado-orden-select"
                        value={ordenDetalle.estado || "pendiente"}
                        onChange={(e) => setOrdenDetalle((p) => ({ ...p, estado: e.target.value }))}
                      >
                        {ESTADOS.filter((s) => s.value).map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <table className="table table-sm table-bordered mb-0">
                    <thead>
                      <tr>
                        <th>Equipo</th>
                        <th>Modelo</th>
                        <th>N° Serie</th>
                        <th>Diagnostico</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ordenDetalle.detalles || []).map((d) => (
                        <tr key={d.id_revision_detalle} className={`result-row-${String(d.resultado || "sin").toLowerCase()}`}>
                          <td>{d.equipo_nombre || "-"}</td>
                          <td>{d.equipo_nombre || "-"}</td>
                          <td>{d.numero_serie || "-"}</td>
                          <td>
                            <input
                              className="form-control form-control-sm"
                              value={d.diagnostico || ""}
                              onChange={(e) => actualizarDetalle(d.id_revision_detalle, { diagnostico: e.target.value })}
                              placeholder="Diagnostico breve"
                            />
                          </td>
                          <td>
                            <select
                              className="form-control form-control-sm"
                              value={d.resultado || ""}
                              onChange={(e) => actualizarDetalle(d.id_revision_detalle, { resultado: e.target.value })}
                            >
                              {RESULTADOS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <h6 className="mb-2">Historial de eventos</h6>
                  <div className="border rounded p-2 bg-light">
                    {!Array.isArray(ordenDetalle.eventos) || !ordenDetalle.eventos.length ? (
                      <small className="text-muted">Sin eventos registrados.</small>
                    ) : (
                      <ul className="mb-0 pl-3">
                        {ordenDetalle.eventos.slice(0, 10).map((ev) => (
                          <li key={ev.id_evento}>
                            <small>
                              <strong>{formatDate(ev.created_at)}</strong> · {ev.evento} · {ev.resultado || "-"} · {ev.user_nombre || "Sistema"}
                              {ev.observacion ? ` · ${ev.observacion}` : ""}
                            </small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDetalle(false)}>Cerrar</button>
                <button className="btn btn-primary" onClick={guardarDiagnostico} disabled={guardando}>Guardar diagnostico</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
