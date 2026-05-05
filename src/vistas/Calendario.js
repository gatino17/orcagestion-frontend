import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useLocation, useNavigate } from "react-router-dom";

import {
  cargarActividades,
  borrarActividad,
  modificarActividad,
  agregarActividad
} from "../controllers/actividadesControllers";
import {
  obtenerArmados,
  obtenerSoportes,
  obtenerBloqueosTecnicos,
  crearBloqueoTecnico,
  eliminarBloqueoTecnico
} from "../api";
import { cargarEncargados } from "../controllers/encargadosControllers";
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import "./Calendario.css";

const estadoOptions = [
  { label: "Todos los estados", value: "" },
  { label: "En progreso", value: "En progreso" },
  { label: "Pendiente", value: "Pendiente" },
  { label: "Finalizado", value: "Finalizado" },
  { label: "Cancelado", value: "Cancelado" }
];

const prioridadOptions = [
  { label: "Todas las prioridades", value: "" },
  { label: "Baja", value: "Baja" },
  { label: "Media", value: "Media" },
  { label: "Alta", value: "Alta" },
  { label: "Urgente", value: "Urgente" }
];

const tipoActividadOptions = ["Mantencion", "Instalacion", "Reapuntamiento", "Retiro", "Levantamiento"];
const CHECKLIST_ARMADO_TOTAL_ITEMS = 57;

const getClientTone = (cliente) => {
  const value = String(cliente || "").trim().toLowerCase();
  if (!value) return "disp-client-0";
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 997;
  }
  return `disp-client-${hash % 6}`;
};

const calcularPctChecklistArmado = (armadoId) => {
  const id = Number(armadoId || 0);
  if (!id) return { done: 0, total: CHECKLIST_ARMADO_TOTAL_ITEMS, pct: 0 };
  try {
    const raw = localStorage.getItem(`orcagest_armado_checklist_v1_${id}`);
    if (!raw) return { done: 0, total: CHECKLIST_ARMADO_TOTAL_ITEMS, pct: 0 };
    const parsed = JSON.parse(raw);
    const checks = parsed?.checks && typeof parsed.checks === "object" ? parsed.checks : {};
    let done = 0;
    Object.values(checks).forEach((row) => {
      const estado = String(row?.estado || "").trim().toLowerCase();
      if (estado) done += 1;
    });
    const total = CHECKLIST_ARMADO_TOTAL_ITEMS;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  } catch (e) {
    return { done: 0, total: CHECKLIST_ARMADO_TOTAL_ITEMS, pct: 0 };
  }
};

function Calendario() {
  const location = useLocation();
  const navigate = useNavigate();
  const [actividades, setActividades] = useState([]);
  const [encargados, setEncargados] = useState([]);
  const [centros, setCentros] = useState([]);
  const [soportesTerrenoPendientes, setSoportesTerrenoPendientes] = useState([]);
  const [soportesResueltosHoy, setSoportesResueltosHoy] = useState([]);
  const [loadingSoportesTerreno, setLoadingSoportesTerreno] = useState(false);
  const [armadosCalendario, setArmadosCalendario] = useState([]);
  const [loadingArmadosCalendario, setLoadingArmadosCalendario] = useState(false);
  const [bloqueosTecnicos, setBloqueosTecnicos] = useState([]);
  const [loadingBloqueos, setLoadingBloqueos] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editarActividad, setEditarActividad] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [nombreActividad, setNombreActividad] = useState("");
  const [fechaReclamo, setFechaReclamo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaTermino, setFechaTermino] = useState("");
  const [area, setArea] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [centroId, setCentroId] = useState("");
  const [estadoActividad, setEstadoActividad] = useState("En progreso");
  const [encargadoId, setEncargadoId] = useState("");
  const [ayudanteId, setAyudanteId] = useState("");
  const [tecnicosAdicionalesIds, setTecnicosAdicionalesIds] = useState([]);
  const [bloqueoTecnicoId, setBloqueoTecnicoId] = useState("");
  const [bloqueoTipo, setBloqueoTipo] = useState("vacaciones");
  const [bloqueoDesde, setBloqueoDesde] = useState("");
  const [bloqueoHasta, setBloqueoHasta] = useState("");
  const [bloqueoMotivo, setBloqueoMotivo] = useState("");
  const [bloqueosPage, setBloqueosPage] = useState(1);
  const [bloqueosPerPage, setBloqueosPerPage] = useState(5);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroTecnico, setFiltroTecnico] = useState("");

  const toDateKey = (value) => {
    if (!value) return "";
    const raw = String(value).trim();
    const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate?.[1]) return isoDate[1];
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadingSoportesTerreno(true);
      setLoadingArmadosCalendario(true);
      setLoadingBloqueos(true);
      const data = await cargarActividades();
      setActividades(data);
      setEncargados(await cargarEncargados());
      setCentros(await cargarCentrosClientes());
      try {
        const soportes = await obtenerSoportes();
        const listaSoportes = Array.isArray(soportes) ? soportes : [];
        const pendientesTerreno = listaSoportes
          .filter((item) => String(item?.tipo || "").toLowerCase() === "terreno")
          .filter((item) => {
            const estado = String(item?.estado || "pendiente").toLowerCase();
            return estado === "pendiente" || estado === "en_proceso";
          })
          .sort((a, b) => {
            const fa = new Date(a?.fecha_soporte || 0).getTime();
            const fb = new Date(b?.fecha_soporte || 0).getTime();
            return fb - fa;
          });
        const hoy = new Date();
        const todayKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
          hoy.getDate()
        ).padStart(2, "0")}`;
        const resueltosHoy = listaSoportes
          .filter((item) => {
            const tipo = String(item?.tipo || "").toLowerCase();
            return tipo === "terreno" || tipo === "remoto";
          })
          .filter((item) => {
            const estado = String(item?.estado || "").toLowerCase();
            return estado === "resuelto" || estado === "finalizado";
          })
          .filter((item) => {
            const fechaRef = item?.fecha_cierre || item?.updated_at || item?.fecha_soporte;
            return toDateKey(fechaRef) === todayKey;
          })
          .sort((a, b) => {
            const fa = new Date(a?.fecha_cierre || a?.updated_at || a?.fecha_soporte || 0).getTime();
            const fb = new Date(b?.fecha_cierre || b?.updated_at || b?.fecha_soporte || 0).getTime();
            return fb - fa;
          });
        setSoportesTerrenoPendientes(pendientesTerreno);
        setSoportesResueltosHoy(resueltosHoy);
      } catch (error) {
        setSoportesTerrenoPendientes([]);
        setSoportesResueltosHoy([]);
      }
      setLoadingSoportesTerreno(false);
      try {
        const armados = await obtenerArmados();
        const lista = (Array.isArray(armados) ? armados : [])
          .sort((a, b) => {
            const fa = new Date(a?.fecha_asignacion || a?.created_at || 0).getTime();
            const fb = new Date(b?.fecha_asignacion || b?.created_at || 0).getTime();
            return fb - fa;
          })
          .slice(0, 20);
        setArmadosCalendario(lista);
      } catch (error) {
        setArmadosCalendario([]);
      }
      setLoadingArmadosCalendario(false);
      try {
        const bloqueos = await obtenerBloqueosTecnicos({ estado: "activo" });
        setBloqueosTecnicos(Array.isArray(bloqueos) ? bloqueos : []);
      } catch (error) {
        setBloqueosTecnicos([]);
      }
      setLoadingBloqueos(false);
      setLoading(false);
    };
    fetchData();
  }, []);

  const cargarBloqueos = async () => {
    setLoadingBloqueos(true);
    try {
      const bloqueos = await obtenerBloqueosTecnicos({ estado: "activo" });
      setBloqueosTecnicos(Array.isArray(bloqueos) ? bloqueos : []);
    } catch (error) {
      setBloqueosTecnicos([]);
    } finally {
      setLoadingBloqueos(false);
    }
  };

  const handleEliminarActividad = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta actividad?")) {
      await borrarActividad(id);
      setActividades((prev) => prev.filter((act) => act.id_actividad !== id));
    }
  };

  const handleCrearBloqueo = async () => {
    if (!bloqueoTecnicoId || !bloqueoDesde || !bloqueoHasta) {
      alert("Selecciona tecnico y rango de fechas.");
      return;
    }
    if (new Date(bloqueoHasta) < new Date(bloqueoDesde)) {
      alert("La fecha fin no puede ser menor que la fecha inicio.");
      return;
    }
    try {
      await crearBloqueoTecnico({
        tecnico_id: Number(bloqueoTecnicoId),
        tipo: bloqueoTipo,
        fecha_inicio: bloqueoDesde,
        fecha_fin: bloqueoHasta,
        motivo: bloqueoMotivo || null,
        estado: "activo"
      });
      setBloqueoTecnicoId("");
      setBloqueoTipo("vacaciones");
      setBloqueoDesde("");
      setBloqueoHasta("");
      setBloqueoMotivo("");
      await cargarBloqueos();
    } catch (error) {
      alert("No se pudo crear el bloqueo tecnico.");
    }
  };

  const handleEliminarBloqueo = async (idBloqueo) => {
    if (!idBloqueo) return;
    if (!window.confirm("Eliminar este bloqueo tecnico?")) return;
    try {
      await eliminarBloqueoTecnico(idBloqueo);
      await cargarBloqueos();
    } catch (error) {
      alert("No se pudo eliminar el bloqueo tecnico.");
    }
  };

  const buildClienteKey = (clienteIdValue, clienteNombreValue) => {
    if (clienteIdValue !== undefined && clienteIdValue !== null && clienteIdValue !== "") {
      return String(clienteIdValue);
    }
    if (clienteNombreValue) {
      return `nombre-${clienteNombreValue.trim().toLowerCase()}`;
    }
    return "";
  };

  const handleEditarActividad = (actividad) => {
    setEditarActividad(actividad);
    setNombreActividad(actividad.nombre_actividad || "");
    setFechaReclamo(actividad.fecha_reclamo || "");
    setFechaInicio(actividad.fecha_inicio || "");
    setFechaTermino(actividad.fecha_termino || "");
    setArea(actividad.area || "");
    setPrioridad(actividad.prioridad || "");
    setClienteId(buildClienteKey(actividad.centro?.cliente_id, actividad.centro?.cliente));
    setEncargadoId(actividad.encargado_principal?.id_encargado || "");
    setAyudanteId(actividad.encargado_ayudante?.id_encargado || "");
    const principalId = Number(actividad.encargado_principal?.id_encargado || 0);
    const ayudanteIdLocal = Number(actividad.encargado_ayudante?.id_encargado || 0);
    const adicionales = Array.isArray(actividad.tecnicos_asignados)
      ? actividad.tecnicos_asignados
          .map((t) => Number(t?.id_encargado || 0))
          .filter((id) => id && id !== principalId && id !== ayudanteIdLocal)
      : [];
    setTecnicosAdicionalesIds(adicionales);
    setCentroId(actividad.centro?.id_centro || "");
    setEstadoActividad(actividad.estado || "En progreso");
    setShowModal(true);
  };

  const handleGuardarActividad = async () => {
    const parseDateOnly = (valor) => {
      if (!valor) return null;
      const [y, m, d] = String(valor).split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    const overlaps = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && bStart <= aEnd;

    const actividadInicio = parseDateOnly(fechaInicio);
    const actividadFin = parseDateOnly(fechaTermino || fechaInicio);
    const tecnicoPrincipalId = encargadoId ? Number(encargadoId) : null;
    const tecnicoAyudanteId = ayudanteId ? Number(ayudanteId) : null;
    const tecnicosAdicionales = (Array.isArray(tecnicosAdicionalesIds) ? tecnicosAdicionalesIds : [])
      .map((id) => Number(id))
      .filter((id) => id && id !== tecnicoPrincipalId && id !== tecnicoAyudanteId);
    const tecnicosAsignadosIds = [tecnicoPrincipalId, tecnicoAyudanteId, ...tecnicosAdicionales].filter(Boolean);

    if (actividadInicio && actividadFin && actividadFin < actividadInicio) {
      alert("La fecha de término no puede ser anterior a la fecha de inicio.");
      return;
    }

    if (tecnicoPrincipalId && tecnicoAyudanteId && tecnicoPrincipalId === tecnicoAyudanteId) {
      alert("El técnico principal y el ayudante no pueden ser la misma persona.");
      return;
    }

    if (actividadInicio && actividadFin && tecnicosAsignadosIds.length) {
      const conflictosBloqueo = (Array.isArray(bloqueosTecnicos) ? bloqueosTecnicos : []).filter((bloqueo) => {
        const estadoBloqueo = String(bloqueo?.estado || "").toLowerCase();
        if (estadoBloqueo !== "activo") return false;
        const idTec = Number(bloqueo?.tecnico_id || 0);
        if (!tecnicosAsignadosIds.includes(idTec)) return false;
        const inicioB = parseDateOnly(bloqueo?.fecha_inicio);
        const finB = parseDateOnly(bloqueo?.fecha_fin);
        if (!inicioB || !finB) return false;
        return overlaps(actividadInicio, actividadFin, inicioB, finB);
      });
      if (conflictosBloqueo.length) {
        const detalle = conflictosBloqueo
          .map((b) => {
            const nombre = b?.tecnico?.nombre_encargado || `Tecnico ${b?.tecnico_id || "-"}`;
            return `${nombre} (${b?.tipo || "bloqueo"} ${b?.fecha_inicio || ""} a ${b?.fecha_fin || ""})`;
          })
          .join("\n");
        alert(`Hay tecnicos no disponibles en ese rango:\n${detalle}`);
        return;
      }
    }

    if (actividadInicio && actividadFin && tecnicoPrincipalId) {
      const conflictos = actividades.filter((actividad) => {
        if (editarActividad && actividad.id_actividad === editarActividad.id_actividad) return false;
        if (!actividad.fecha_inicio) return false;
        const inicioExistente = parseDateOnly(actividad.fecha_inicio);
        const finExistente = parseDateOnly(actividad.fecha_termino || actividad.fecha_inicio);
        if (!inicioExistente || !finExistente) return false;
        const principalExistente = Number(actividad.encargado_principal?.id_encargado || 0);
        const ayudanteExistente = Number(actividad.encargado_ayudante?.id_encargado || 0);
        const coincideTecnico = principalExistente === tecnicoPrincipalId || ayudanteExistente === tecnicoPrincipalId;
        if (!coincideTecnico) return false;
        return overlaps(actividadInicio, actividadFin, inicioExistente, finExistente);
      });

      if (conflictos.length) {
        const seguir = window.confirm(
          `El técnico seleccionado ya tiene ${conflictos.length} actividad(es) en ese rango. ¿Deseas guardar de todas formas?`
        );
        if (!seguir) return;
      }
    }

    const payload = {
      nombre_actividad: nombreActividad,
      fecha_reclamo: fechaReclamo || null,
      fecha_inicio: fechaInicio || null,
      fecha_termino: fechaTermino || null,
      area: area || null,
      prioridad: prioridad || null,
      tecnico_encargado: encargadoId ? parseInt(encargadoId, 10) : null,
      tecnico_ayudante: ayudanteId ? parseInt(ayudanteId, 10) : null,
      tecnicos_adicionales: tecnicosAdicionales,
      estado: estadoActividad || null,
      centro_id: centroId ? parseInt(centroId, 10) : null
    };

    try {
      if (editarActividad) {
        await modificarActividad(editarActividad.id_actividad, payload);
      } else {
        await agregarActividad(payload);
      }

      const actividadesActualizadas = await cargarActividades();
      setActividades(actividadesActualizadas);
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert(`Error al guardar la actividad: ${error.message}`);
    }
  };

  const resetForm = () => {
    setNombreActividad("");
    setFechaReclamo("");
    setFechaInicio("");
    setFechaTermino("");
    setArea("");
    setPrioridad("");
    setEncargadoId("");
    setAyudanteId("");
    setTecnicosAdicionalesIds([]);
    setCentroId("");
    setClienteId("");
    setEstadoActividad("En progreso");
    setEditarActividad(null);
  };

  const clientes = useMemo(() => {
    const map = new Map();
    centros.forEach((centro) => {
      const key = buildClienteKey(centro.cliente_id, centro.cliente);
      if (!key || map.has(key)) return;
      map.set(key, {
        id: key,
        nombre: centro.cliente || "Cliente sin nombre"
      });
    });
    return Array.from(map.values());
  }, [centros]);

  const filteredCentros = useMemo(() => {
    if (!clienteId) return centros;
    return centros.filter((centro) => buildClienteKey(centro.cliente_id, centro.cliente) === clienteId);
  }, [centros, clienteId]);

  const filteredAyudantes = encargados.filter(
    (encargado) => encargado.id_encargado !== parseInt(encargadoId || 0, 10)
  );
  const tecnicosAdicionalesDisponibles = encargados.filter((enc) => {
    const id = Number(enc.id_encargado || 0);
    if (!id) return false;
    if (id === Number(encargadoId || 0)) return false;
    if (id === Number(ayudanteId || 0)) return false;
    return true;
  });

  const toggleTecnicoAdicional = (id) => {
    const value = Number(id || 0);
    if (!value) return;
    setTecnicosAdicionalesIds((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleClienteChange = (event) => {
    setClienteId(event.target.value);
    setCentroId("");
  };

  const handleProgramarDesdeSoporte = (soporte) => {
    const clienteKey = buildClienteKey(null, soporte?.centro?.cliente);
    setEditarActividad(null);
    setNombreActividad(`Mantencion terreno - ${soporte?.centro?.nombre || "Centro"}`);
    setFechaReclamo(soporte?.fecha_soporte || "");
    setFechaInicio(soporte?.fecha_soporte || "");
    setFechaTermino(soporte?.fecha_soporte || "");
    setArea("Mantencion");
    setPrioridad("Media");
    setClienteId(clienteKey);
    setCentroId(soporte?.centro?.id_centro ? String(soporte.centro.id_centro) : "");
    setEstadoActividad("Pendiente");
    setEncargadoId("");
    setAyudanteId("");
    setTecnicosAdicionalesIds([]);
    setShowModal(true);
  };

  useEffect(() => {
    const payload = location.state?.programarSoporte;
    if (!payload) return;
    const clienteKey = buildClienteKey(null, payload?.centro?.cliente);
    setEditarActividad(null);
    setNombreActividad(`Mantencion terreno - ${payload?.centro?.nombre || "Centro"}`);
    setFechaReclamo(payload?.fecha_soporte || "");
    setFechaInicio(payload?.fecha_soporte || "");
    setFechaTermino(payload?.fecha_soporte || "");
    setArea("Mantencion");
    setPrioridad("Media");
    setClienteId(clienteKey);
    setCentroId(payload?.centro?.id_centro ? String(payload.centro.id_centro) : "");
    setEstadoActividad("Pendiente");
    setEncargadoId("");
    setAyudanteId("");
    setTecnicosAdicionalesIds([]);
    setShowModal(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const hoy = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const filteredActividades = useMemo(() => {
    return actividades.filter((actividad) => {
      const coincideTexto =
        actividad.nombre_actividad?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        actividad.centro?.cliente?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        actividad.centro?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase());

      const coincidePrioridad = filtroPrioridad ? actividad.prioridad === filtroPrioridad : true;
      const coincideEstado = filtroEstado ? actividad.estado === filtroEstado : true;
      const coincideTecnico = filtroTecnico
        ? actividad.encargado_principal?.nombre_encargado?.toLowerCase() === filtroTecnico
        : true;
      const coincideTipo = filtroTipo ? String(actividad.area || "").toLowerCase() === filtroTipo.toLowerCase() : true;

      return coincideTexto && coincidePrioridad && coincideEstado && coincideTecnico && coincideTipo;
    });
  }, [actividades, filtroTexto, filtroPrioridad, filtroEstado, filtroTecnico, filtroTipo]);

  const aplicarFechaRapida = (diasDesdeHoy) => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + diasDesdeHoy);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    const valor = `${yyyy}-${mm}-${dd}`;
    setFechaInicio(valor);
    setFechaTermino(valor);
    if (!fechaReclamo) setFechaReclamo(valor);
  };

  const metricas = useMemo(() => {
    const total = actividades.length;
    const cerradas = actividades.filter((act) => act.estado === "Finalizado").length;
    const activas = total - cerradas;
    const atrasadas = actividades.filter((act) => {
      if (!act.fecha_termino || act.estado === "Finalizado") return false;
      return new Date(act.fecha_termino) < hoy;
    }).length;
    const urgentes = actividades.filter((act) => act.prioridad === "Urgente").length;
    const semana = actividades.filter((act) => {
      if (!act.fecha_inicio) return false;
      const diff = (new Date(act.fecha_inicio) - hoy) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    return [
      { label: "Activas", value: activas, icon: "fas fa-tasks", tone: "info", detail: "En curso o pendientes" },
      { label: "Finalizadas", value: cerradas, icon: "fas fa-check-circle", tone: "success", detail: "Cerradas en calendario" },
      { label: "Atrasadas", value: atrasadas, icon: "fas fa-exclamation-triangle", tone: "danger", detail: "Fuera de fecha" },
      { label: "Urgentes", value: urgentes, icon: "fas fa-bolt", tone: "warning", detail: "Prioridad crítica" },
      { label: "Próx. 7 días", value: semana, icon: "fas fa-calendar-week", tone: "primary", detail: "Carga inmediata" }
    ];
  }, [actividades, hoy]);

  const proximasActividades = useMemo(() => {
    const fin14 = new Date(hoy);
    fin14.setDate(fin14.getDate() + 13);
    fin14.setHours(23, 59, 59, 999);
    return [...filteredActividades]
      .filter((act) => {
        if (!act.fecha_inicio) return false;
        const inicio = new Date(act.fecha_inicio);
        if (Number.isNaN(inicio.getTime())) return false;
        return inicio >= hoy && inicio <= fin14;
      })
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
      .slice(0, 14);
  }, [filteredActividades, hoy]);

  const resumenProximas14 = useMemo(() => {
    const base = {
      total: proximasActividades.length,
      mantencion: 0,
      instalacion: 0,
      reapuntamiento: 0,
      retiro: 0,
      levantamiento: 0,
      soporte: 0
    };
    proximasActividades.forEach((act) => {
      const tipo = String(act?.area || "").trim().toLowerCase();
      if (tipo.startsWith("manten")) base.mantencion += 1;
      else if (tipo.startsWith("instal")) base.instalacion += 1;
      else if (tipo.startsWith("reap")) base.reapuntamiento += 1;
      else if (tipo.startsWith("retir")) base.retiro += 1;
      else if (tipo.startsWith("levant")) base.levantamiento += 1;
      else if (tipo.startsWith("soport")) base.soporte += 1;
    });
    return base;
  }, [proximasActividades]);

  const disponibilidadTecnicos = useMemo(() => {
    const normalizarInicioDia = (fecha) => {
      if (!fecha) return null;
      let d = null;
      const raw = String(fecha).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const [y, m, day] = raw.slice(0, 10).split("-").map(Number);
        d = new Date(y, (m || 1) - 1, day || 1);
      } else {
        d = new Date(fecha);
      }
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const sumarDias = (fecha, dias) => {
      const d = new Date(fecha);
      d.setDate(d.getDate() + dias);
      return d;
    };
    const inicioSemana = (() => {
      const d = new Date(hoy);
      const dia = d.getDay(); // dom=0 ... sab=6
      const offset = dia === 0 ? 6 : dia - 1; // lunes=0
      d.setDate(d.getDate() - offset);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const finSemana = (() => {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + 6);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const diasRestantesSemana = Math.max(
      1,
      Math.floor((finSemana.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const tecnicosBase = (Array.isArray(encargados) ? encargados : [])
      .map((enc) => ({
        id: Number(enc?.id_encargado || 0) || null,
        nombre: String(enc?.nombre_encargado || "").trim()
      }))
      .filter((enc) => !!enc.nombre);

    const tecnicoEnActividad = (actividad, tecnicoId, tecnicoNombre) => {
      const principalId = Number(actividad?.encargado_principal?.id_encargado || 0) || null;
      const ayudanteId = Number(actividad?.encargado_ayudante?.id_encargado || 0) || null;
      const adicionalesIds = Array.isArray(actividad?.tecnicos_asignados)
        ? actividad.tecnicos_asignados.map((t) => Number(t?.id_encargado || 0)).filter(Boolean)
        : [];
      if (tecnicoId && (principalId === tecnicoId || ayudanteId === tecnicoId || adicionalesIds.includes(tecnicoId))) {
        return true;
      }
      // Fallback por nombre para datos antiguos.
      const principal = String(actividad?.encargado_principal?.nombre_encargado || "").trim();
      const ayudante = String(actividad?.encargado_ayudante?.nombre_encargado || "").trim();
      const adicionales = Array.isArray(actividad?.tecnicos_asignados)
        ? actividad.tecnicos_asignados.map((t) => String(t?.nombre_encargado || "").trim())
        : [];
      return principal === tecnicoNombre || ayudante === tecnicoNombre || adicionales.includes(tecnicoNombre);
    };

    const listado = tecnicosBase.map((tecnico) => {
      const tecnicoNombre = tecnico.nombre;
      const tecnicoId = tecnico.id;
      const bloqueosTecnico = (Array.isArray(bloqueosTecnicos) ? bloqueosTecnicos : [])
        .filter((b) => String(b?.estado || "").toLowerCase() === "activo")
        .filter((b) => {
          const idBloqueo = Number(b?.tecnico_id || 0) || null;
          if (tecnicoId && idBloqueo) return idBloqueo === tecnicoId;
          return String(b?.tecnico?.nombre_encargado || "").trim() === tecnicoNombre;
        });

      const actividadesTecnico = (Array.isArray(actividades) ? actividades : []).filter((act) => {
        const estado = String(act?.estado || "").toLowerCase();
        if (estado === "cancelado") return false;
        return tecnicoEnActividad(act, tecnicoId, tecnicoNombre);
      });

      const enTerrenoHoy = actividadesTecnico.some((act) => {
        const estado = String(act?.estado || "").toLowerCase();
        if (estado === "cancelado") return false;
        const inicio = normalizarInicioDia(act?.fecha_inicio);
        const fin = normalizarInicioDia(act?.fecha_termino || act?.fecha_inicio);
        if (!inicio || !fin) return false;
        return inicio <= hoy && hoy <= fin;
      });

      const tramoActual = actividadesTecnico
        .filter((act) => {
          const estado = String(act?.estado || "").toLowerCase();
          if (estado === "cancelado") return false;
          const inicio = normalizarInicioDia(act?.fecha_inicio);
          const fin = normalizarInicioDia(act?.fecha_termino || act?.fecha_inicio);
          if (!inicio || !fin) return false;
          return inicio <= hoy && hoy <= fin;
        })
        .map((act) => normalizarInicioDia(act?.fecha_termino || act?.fecha_inicio))
        .filter(Boolean)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const proximaSalida = actividadesTecnico
        .map((act) => {
          const estado = String(act?.estado || "").toLowerCase();
          if (estado === "cancelado") return null;
          return normalizarInicioDia(act?.fecha_inicio);
        })
        .filter((d) => d && d > hoy)
        .sort((a, b) => a.getTime() - b.getTime())[0];

      const bloqueoActual = bloqueosTecnico.find((b) => {
        const inicio = normalizarInicioDia(b?.fecha_inicio);
        const fin = normalizarInicioDia(b?.fecha_fin);
        if (!inicio || !fin) return false;
        return inicio <= hoy && hoy <= fin;
      });

      const diasTerrenoSet = new Set();
      const diasBloqueadosSet = new Set();
      actividadesTecnico.forEach((act) => {
        const estado = String(act?.estado || "").toLowerCase();
        if (estado === "cancelado") return;
        const inicio = normalizarInicioDia(act?.fecha_inicio);
        const fin = normalizarInicioDia(act?.fecha_termino || act?.fecha_inicio);
        if (!inicio || !fin) return;
        const desde = inicio > hoy ? inicio : hoy;
        const hasta = fin < finSemana ? fin : finSemana;
        if (desde > hasta) return;
        for (let d = new Date(desde); d <= hasta; d = sumarDias(d, 1)) {
          diasTerrenoSet.add(d.toISOString().slice(0, 10));
        }
      });
      bloqueosTecnico.forEach((b) => {
        const inicio = normalizarInicioDia(b?.fecha_inicio);
        const fin = normalizarInicioDia(b?.fecha_fin);
        if (!inicio || !fin) return;
        const desde = inicio > hoy ? inicio : hoy;
        const hasta = fin < finSemana ? fin : finSemana;
        if (desde > hasta) return;
        for (let d = new Date(desde); d <= hasta; d = sumarDias(d, 1)) {
          diasBloqueadosSet.add(d.toISOString().slice(0, 10));
        }
      });
      const diasTerreno = diasTerrenoSet.size;
      const diasBloqueados = diasBloqueadosSet.size;
      const diasOficina = Math.max(0, diasRestantesSemana - diasTerreno - diasBloqueados);

      const estadoHoyTexto = bloqueoActual
        ? "No disponible hoy"
        : enTerrenoHoy
        ? "En terreno hoy"
        : "Disponible hoy";
      const estadoHoyClase = bloqueoActual
        ? "bg-secondary"
        : enTerrenoHoy
        ? "bg-info text-dark"
        : "bg-success";
      const nombreDia = (fecha) => {
        const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        return dias[fecha.getDay()] || "";
      };
      const proximaSalidaMensaje = (() => {
        if (!proximaSalida) return "Sin salida programada";
        const fechaTxt = formatearFecha(proximaSalida.toISOString().slice(0, 10));
        if (proximaSalida > finSemana) {
          return `Sale la proxima semana (${nombreDia(proximaSalida)} ${fechaTxt})`;
        }
        return `Sale: ${fechaTxt}`;
      })();
      const proximoHito = bloqueoActual
        ? `Disponible desde: ${formatearFecha(sumarDias(normalizarInicioDia(bloqueoActual.fecha_fin) || hoy, 1).toISOString().slice(0, 10))}`
        : enTerrenoHoy
        ? `Vuelve: ${formatearFecha(sumarDias(tramoActual || hoy, 1).toISOString().slice(0, 10))}`
        : proximaSalidaMensaje;

      return {
        name: tecnicoNombre,
        estadoHoyTexto,
        estadoHoyClase,
        proximoHito,
        diasTerreno,
        diasOficina,
        diasBloqueados
      };
    });

    return listado.sort((a, b) => b.diasTerreno - a.diasTerreno || a.name.localeCompare(b.name));
  }, [actividades, hoy, encargados, bloqueosTecnicos]);

  const disponibilidad14Dias = useMemo(() => {
    const normalizarInicioDia = (fecha) => {
      if (!fecha) return null;
      let d = null;
      const raw = String(fecha).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const [y, m, day] = raw.slice(0, 10).split("-").map(Number);
        d = new Date(y, (m || 1) - 1, day || 1);
      } else {
        d = new Date(fecha);
      }
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const sumarDias = (fecha, dias) => {
      const d = new Date(fecha);
      d.setDate(d.getDate() + dias);
      return d;
    };
    const tecnicosBase = (Array.isArray(encargados) ? encargados : [])
      .map((enc) => ({
        id: Number(enc?.id_encargado || 0) || null,
        nombre: String(enc?.nombre_encargado || "").trim()
      }))
      .filter((enc) => !!enc.nombre);

    const tecnicoEnActividad = (actividad, tecnicoId, tecnicoNombre) => {
      const principalId = Number(actividad?.encargado_principal?.id_encargado || 0) || null;
      const ayudanteId = Number(actividad?.encargado_ayudante?.id_encargado || 0) || null;
      const adicionalesIds = Array.isArray(actividad?.tecnicos_asignados)
        ? actividad.tecnicos_asignados.map((t) => Number(t?.id_encargado || 0)).filter(Boolean)
        : [];
      if (tecnicoId && (principalId === tecnicoId || ayudanteId === tecnicoId || adicionalesIds.includes(tecnicoId))) {
        return true;
      }
      const principal = String(actividad?.encargado_principal?.nombre_encargado || "").trim();
      const ayudante = String(actividad?.encargado_ayudante?.nombre_encargado || "").trim();
      const adicionales = Array.isArray(actividad?.tecnicos_asignados)
        ? actividad.tecnicos_asignados.map((t) => String(t?.nombre_encargado || "").trim())
        : [];
      return principal === tecnicoNombre || ayudante === tecnicoNombre || adicionales.includes(tecnicoNombre);
    };

    const dias = Array.from({ length: 14 }, (_, idx) => {
      const fecha = sumarDias(hoy, idx);
      return {
        key: fecha.toISOString().slice(0, 10),
        etiqueta: `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}`,
        dia: fecha.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "")
      };
    });

    const rows = tecnicosBase.map((tecnico) => {
      const tecnicoId = tecnico.id;
      const tecnicoNombre = tecnico.nombre;
      const bloqueosTecnico = (Array.isArray(bloqueosTecnicos) ? bloqueosTecnicos : [])
        .filter((b) => String(b?.estado || "").toLowerCase() === "activo")
        .filter((b) => {
          const idBloqueo = Number(b?.tecnico_id || 0) || null;
          if (tecnicoId && idBloqueo) return idBloqueo === tecnicoId;
          return String(b?.tecnico?.nombre_encargado || "").trim() === tecnicoNombre;
        });
      const actividadesTecnico = (Array.isArray(actividades) ? actividades : []).filter((act) => {
        const estado = String(act?.estado || "").toLowerCase();
        if (estado === "cancelado") return false;
        return tecnicoEnActividad(act, tecnicoId, tecnicoNombre);
      });

      const estados = dias.map((d) => {
        const fecha = normalizarInicioDia(d.key);
        const bloqueosDia = bloqueosTecnico.filter((b) => {
          const ini = normalizarInicioDia(b?.fecha_inicio);
          const fin = normalizarInicioDia(b?.fecha_fin);
          return ini && fin && ini <= fecha && fecha <= fin;
        });
        const actividadesDia = actividadesTecnico.filter((a) => {
          const ini = normalizarInicioDia(a?.fecha_inicio);
          const fin = normalizarInicioDia(a?.fecha_termino || a?.fecha_inicio);
          return ini && fin && ini <= fecha && fecha <= fin;
        });
        const actividadKey = actividadesDia
          .map((a) => String(a?.id_actividad || `${a?.nombre_actividad || ""}-${a?.centro?.nombre || ""}-${a?.area || ""}`))
          .sort()
          .join("|");
        const detalleActividades = actividadesDia
          .map((a) => {
            const cliente = String(a?.centro?.cliente || "Sin cliente");
            const centro = String(a?.centro?.nombre || "Sin centro");
            const tipo = String(a?.area || "Sin tipo");
            return `${cliente} / ${centro} - ${tipo}`;
          })
          .join(" | ");
        const clientesDia = Array.from(
          new Set(actividadesDia.map((a) => String(a?.centro?.cliente || "Sin cliente").trim()).filter(Boolean))
        ).sort();
        const clienteTone = clientesDia.length === 1 ? getClientTone(clientesDia[0]) : "disp-client-mixed";
        if (bloqueosDia.length) {
          const detalleBloqueos = bloqueosDia
            .map((b) => `${String(b?.tipo || "bloqueo").replace(/_/g, " ")} (${b?.fecha_inicio || "-"} a ${b?.fecha_fin || "-"})`)
            .join(" | ");
          return {
            estado: "bloqueado",
            detalle: detalleActividades
              ? `Bloqueado: ${detalleBloqueos} | Terreno: ${detalleActividades}`
              : `Bloqueado: ${detalleBloqueos}`,
            key: `bloqueo:${detalleBloqueos}`
          };
        }
        if (actividadesDia.length) {
          return {
            estado: "terreno",
            detalle: `Terreno: ${detalleActividades}`,
            key: `terreno:${actividadKey}`,
            clienteTone
          };
        }
        return { estado: "libre", detalle: "Disponible", key: "libre" };
      });

      return { tecnico: tecnicoNombre, estados };
    });

    return { dias, rows };
  }, [actividades, bloqueosTecnicos, encargados, hoy]);

  const bloqueosPaginados = useMemo(() => {
    const total = Array.isArray(bloqueosTecnicos) ? bloqueosTecnicos.length : 0;
    const totalPages = Math.max(1, Math.ceil(total / bloqueosPerPage));
    const page = Math.min(Math.max(1, bloqueosPage), totalPages);
    const start = (page - 1) * bloqueosPerPage;
    return {
      page,
      total,
      totalPages,
      data: (bloqueosTecnicos || []).slice(start, start + bloqueosPerPage),
      start: total ? start + 1 : 0,
      end: Math.min(start + bloqueosPerPage, total)
    };
  }, [bloqueosTecnicos, bloqueosPage, bloqueosPerPage]);

  useEffect(() => {
    setBloqueosPage(1);
  }, [bloqueosPerPage, bloqueosTecnicos.length]);

  const calendarEvents = useMemo(() => {
    return filteredActividades
      .filter((actividad) => actividad.fecha_inicio && actividad.fecha_termino)
      .map((actividad) => {
        const fechaInicio = new Date(actividad.fecha_inicio);
        const fechaTermino = new Date(actividad.fecha_termino);
        fechaInicio.setUTCHours(12, 0, 0);
        fechaTermino.setUTCHours(12, 0, 0);
        const cliente = actividad.centro?.cliente || "Sin cliente";
        const centro = actividad.centro?.nombre || "Sin centro";
        const tipo = actividad.area || "Sin tipo";
        const principal = String(actividad.encargado_principal?.nombre_encargado || "").trim();
        const ayudante = String(actividad.encargado_ayudante?.nombre_encargado || "").trim();
        const adicionales = Array.isArray(actividad.tecnicos_asignados)
          ? actividad.tecnicos_asignados
              .map((t) => String(t?.nombre_encargado || "").trim())
              .filter(Boolean)
              .filter((n) => n !== principal && n !== ayudante)
          : [];
        const tecnicos = [principal, ayudante, ...adicionales].filter(Boolean);
        const tooltipText = [
          `Centro: ${centro}`,
          `Cliente: ${cliente}`,
          `Tipo: ${tipo}`,
          `Tecnicos: ${tecnicos.length ? tecnicos.join(", ") : "Sin asignar"}`
        ].join("\n");

        return {
          id: actividad.id_actividad,
          title: actividad.nombre_actividad,
          start: fechaInicio.toISOString(),
          end: fechaTermino.toISOString(),
          color: getColorByPrioridad(actividad.prioridad),
          extendedProps: {
            estado: actividad.estado,
            prioridad: actividad.prioridad,
            centro,
            tecnico: principal || "No asignado",
            tooltipText
          }
        };
      });
  }, [filteredActividades]);

  const resumenHoras = useMemo(() => {
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    const conteo = filteredActividades.reduce((acc, act) => {
      if (!act.fecha_inicio || !act.fecha_termino) return acc;
      const inicio = new Date(act.fecha_inicio);
      if (inicio.getMonth() !== mesActual || inicio.getFullYear() !== anioActual) return acc;
      const dias = calcularDias(act.fecha_inicio, act.fecha_termino);
      const noches = dias > 0 ? Math.max(dias - 1, 0) : 0;
      const tecnico = act.encargado_principal?.nombre_encargado || "No asignado";
      if (!acc[tecnico]) acc[tecnico] = { dias: 0, noches: 0 };
      acc[tecnico].dias += dias;
      acc[tecnico].noches += noches;
      return acc;
    }, {});
    return Object.entries(conteo)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 3);
  }, [filteredActividades, hoy]);

  const columns = [
    {
      name: "N°",
      sortable: false,
      width: "70px",
      cell: (_row, index) => <span>{Number(index || 0) + 1}</span>
    },
    {
      name: "Actividad",
      selector: (row) => row.nombre_actividad,
      sortable: true,
      grow: 1.8,
      cell: (row) => (
        <div>
          <strong>{row.nombre_actividad}</strong>
          <div className="table-meta">{row.centro?.cliente || "Sin cliente"}</div>
        </div>
      )
    },
    { name: "Inicio", selector: (row) => formatearFecha(row.fecha_inicio), sortable: true },
    { name: "Fin", selector: (row) => formatearFecha(row.fecha_termino), sortable: true },
    {
      name: "Tipo",
      selector: (row) => row.area || "-",
      sortable: true,
      width: "130px",
      cell: (row) => (
        <span className="pill state-en-progreso">{row.area || "-"}</span>
      )
    },
    {
      name: "Prioridad",
      selector: (row) => row.prioridad,
      sortable: true,
      cell: (row) => <span className={`pill pill-${(row.prioridad || "ninguna").toLowerCase()}`}>{row.prioridad || "-"}</span>
    },
    {
      name: "Estado",
      selector: (row) => row.estado,
      sortable: true,
      cell: (row) => {
        const estadoRaw = String(row.estado || "Sin estado");
        const estadoKey = estadoRaw.toLowerCase().replace(/\s+/g, "-");
        const esFinalizado = estadoKey === "finalizado";
        if (esFinalizado) {
          return (
            <span className={`pill state-${estadoKey}`} title="Finalizado">
              <i className="fas fa-check-circle" style={{ color: "#16a34a" }} />
            </span>
          );
        }
        return (
          <span className={`pill state-${estadoKey}`}>
            {estadoRaw}
          </span>
        );
      }
    },
    {
      name: "Tecnico",
      selector: (row) => row.encargado_principal?.nombre_encargado || "No asignado",
      sortable: true,
      grow: 1.25,
      cell: (row) => {
        const principal = String(row.encargado_principal?.nombre_encargado || "").trim();
        const ayudante = String(row.encargado_ayudante?.nombre_encargado || "").trim();
        const adicionales = Array.isArray(row.tecnicos_asignados)
          ? row.tecnicos_asignados
              .map((t) => String(t?.nombre_encargado || "").trim())
              .filter(Boolean)
              .filter((n) => n !== principal && n !== ayudante)
          : [];
        const acompanantes = [ayudante, ...adicionales].filter(Boolean);

        return (
          <div className="d-flex flex-column" style={{ lineHeight: 1.2 }}>
            <strong>{principal || "No asignado"}</strong>
            {acompanantes.length ? (
              <small className="text-muted" title={acompanantes.join(", ")}>
                Acompanantes: {acompanantes.join(", ")}
              </small>
            ) : (
              <small className="text-muted">Sin acompanantes</small>
            )}
          </div>
        );
      }
    },
    {
      name: "Visto tecnico",
      selector: (row) => {
        const estado = String(row.estado || "").toLowerCase();
        return estado === "en progreso" || estado === "en_proceso" || estado === "finalizado" || estado === "cancelado"
          ? "Si"
          : "No";
      },
      sortable: true,
      width: "120px",
      cell: (row) => {
        const estado = String(row.estado || "").toLowerCase();
        const visto = estado === "en progreso" || estado === "en_proceso" || estado === "finalizado" || estado === "cancelado";
        return <span className={`pill ${visto ? "state-finalizado" : "state-pendiente"}`}>{visto ? "Si" : "No"}</span>;
      }
    },
    {
      name: "Acciones",
      button: true,
      cell: (row) => (
        <div className="table-actions">
          <button className="btn btn-warning btn-sm" onClick={() => handleEditarActividad(row)}>
            <i className="fas fa-edit" />
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => handleEliminarActividad(row.id_actividad)}>
            <i className="fas fa-trash-alt" />
          </button>
        </div>
      )
    }
  ];

  const columnasSoporteTerreno = [
    {
      name: "Fecha",
      selector: (row) => row.fecha_soporte,
      sortable: true,
      width: "92px",
      cell: (row) => formatearFecha(row.fecha_soporte)
    },
    {
      name: "Cliente",
      selector: (row) => row.centro?.cliente || "",
      sortable: true,
      grow: 0.9,
      minWidth: "110px",
      maxWidth: "150px",
      cell: (row) => (
        <div className="text-truncate" style={{ maxWidth: "100%" }} title={row.centro?.cliente || ""}>
          {row.centro?.cliente || "-"}
        </div>
      )
    },
    {
      name: "Centro",
      selector: (row) => row.centro?.nombre || "",
      sortable: true,
      grow: 0.9,
      minWidth: "110px",
      maxWidth: "150px",
      cell: (row) => (
        <div className="text-truncate" style={{ maxWidth: "100%" }} title={row.centro?.nombre || ""}>
          {row.centro?.nombre || "-"}
        </div>
      )
    },
    {
      name: "Problema",
      selector: (row) => row.problema || "",
      sortable: true,
      grow: 2.2,
      minWidth: "150px",
      wrap: true,
      cell: (row) => (
        <div style={{ maxWidth: "100%", display: "block" }} title={row.problema || ""}>
          {row.problema || "-"}
        </div>
      )
    },
    {
      name: "Estado",
      selector: (row) => row.estado || "pendiente",
      sortable: true,
      width: "108px",
      cell: (row) => (
        <span
          className={`pill soporte-status-${String(row.estado || "pendiente")
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          {String(row.estado || "pendiente").replace("en_proceso", "Alerta")}
        </span>
      )
    },
    {
      name: "Acción",
      button: true,
      width: "72px",
      cell: (row) => (
        <button className="btn btn-outline-primary btn-sm" onClick={() => handleProgramarDesdeSoporte(row)}>
          <i className="fas fa-calendar-plus" />
        </button>
      )
    }
  ];

  const columnasArmadosCalendario = [
    {
      name: "Fecha",
      selector: (row) => row.fecha_asignacion || row.created_at || "",
      sortable: true,
      width: "92px",
      cell: (row) => formatearFecha(row.fecha_asignacion || row.created_at)
    },
    {
      name: "Cliente",
      selector: (row) => row.centro?.cliente || row.cliente_nombre || "",
      sortable: true,
      grow: 0.9,
      minWidth: "110px",
      maxWidth: "150px",
      cell: (row) => (
        <div className="text-truncate" style={{ maxWidth: "100%" }} title={row.centro?.cliente || row.cliente_nombre || ""}>
          {row.centro?.cliente || row.cliente_nombre || "-"}
        </div>
      )
    },
    {
      name: "Centro",
      selector: (row) => row.centro?.nombre || row.centro_nombre || "",
      sortable: true,
      grow: 0.9,
      minWidth: "110px",
      maxWidth: "150px",
      cell: (row) => (
        <div className="text-truncate" style={{ maxWidth: "100%" }} title={row.centro?.nombre || row.centro_nombre || ""}>
          {row.centro?.nombre || row.centro_nombre || "-"}
        </div>
      )
    },
    {
      name: "Tecnico",
      selector: (row) => row.tecnico?.nombre || row.tecnico_nombre || "",
      sortable: true,
      width: "130px",
      cell: (row) => (
        <div className="text-truncate" style={{ maxWidth: "100%" }} title={row.tecnico?.nombre || row.tecnico_nombre || ""}>
          {row.tecnico?.nombre || row.tecnico_nombre || "Sin asignar"}
        </div>
      )
    },
    {
      name: "Armado",
      selector: (row) => row.estado || "pendiente",
      sortable: true,
      width: "108px",
      cell: (row) => {
        const estado = String(row.estado || "pendiente").toLowerCase();
        const normalizado = estado === "en_proceso" ? "en_proceso" : estado;
        return (
          <span className={`pill soporte-status-${normalizado}`}>
            {estado === "en_proceso" ? "En proceso" : estado.charAt(0).toUpperCase() + estado.slice(1)}
          </span>
        );
      }
    },
    {
      name: "Revision",
      selector: (row) => calcularPctChecklistArmado(row.id_armado || row.id).pct,
      sortable: true,
      width: "130px",
      cell: (row) => {
        const progreso = calcularPctChecklistArmado(row.id_armado || row.id);
        const color = progreso.pct >= 100 ? "#16a34a" : progreso.pct >= 60 ? "#f59e0b" : "#dc2626";
        return (
          <div style={{ minWidth: 115 }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small>{progreso.done}/{progreso.total}</small>
              <strong style={{ color }}>{progreso.pct}%</strong>
            </div>
            <div style={{ height: 6, background: "#e5e7eb", borderRadius: 999 }}>
              <div
                style={{
                  width: `${progreso.pct}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 999
                }}
              />
            </div>
          </div>
        );
      }
    }
  ];

  const columnasSoporteResueltosHoy = [
    {
      name: "Cierre",
      selector: (row) => row.fecha_cierre || row.updated_at || row.fecha_soporte,
      sortable: true,
      width: "92px",
      cell: (row) => formatearFecha(row.fecha_cierre || row.updated_at || row.fecha_soporte)
    },
    {
      name: "Cliente",
      selector: (row) => row.centro?.cliente || "",
      sortable: true,
      grow: 0.9,
      minWidth: "110px",
      maxWidth: "150px",
      cell: (row) => (
        <div className="text-truncate" style={{ maxWidth: "100%" }} title={row.centro?.cliente || ""}>
          {row.centro?.cliente || "-"}
        </div>
      )
    },
    {
      name: "Centro",
      selector: (row) => row.centro?.nombre || "",
      sortable: true,
      grow: 0.9,
      minWidth: "110px",
      maxWidth: "150px",
      cell: (row) => (
        <div className="text-truncate" style={{ maxWidth: "100%" }} title={row.centro?.nombre || ""}>
          {row.centro?.nombre || "-"}
        </div>
      )
    },
    {
      name: "Problema",
      selector: (row) => row.problema || "",
      sortable: true,
      grow: 1.5,
      minWidth: "150px",
      wrap: true,
      cell: (row) => (
        <div style={{ maxWidth: "100%", display: "block" }} title={row.problema || ""}>
          {row.problema || "-"}
        </div>
      )
    },
    {
      name: "Estado",
      selector: (row) => row.estado || "resuelto",
      sortable: true,
      width: "108px",
      cell: () => <span className="pill soporte-status-finalizado">Resuelto</span>
    },
    {
      name: "Tipo",
      selector: (row) => row.tipo || "",
      sortable: true,
      width: "90px",
      cell: (row) => (
        <span className="pill state-en-progreso">
          {String(row?.tipo || "-")}
        </span>
      )
    }
  ];

  const soporteTerrenoTableStyles = {
    headRow: {
      style: {
        minHeight: "44px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        borderTopLeftRadius: "10px",
        borderTopRightRadius: "10px"
      }
    },
    headCells: {
      style: {
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "12px",
        textTransform: "uppercase",
        letterSpacing: "0.04em"
      }
    },
    rows: {
      style: {
        minHeight: "48px",
        fontSize: "13px",
        borderBottom: "1px solid #e5e7eb"
      },
      stripedStyle: {
        backgroundColor: "#f8fafc"
      }
    },
    cells: {
      style: {
        paddingLeft: "8px",
        paddingRight: "8px",
        paddingTop: "8px",
        paddingBottom: "8px"
      }
    }
  };

  function formatearFecha(fecha) {
    if (!fecha) return "";
    const f = new Date(fecha);
    f.setMinutes(f.getMinutes() + f.getTimezoneOffset());
    return `${String(f.getDate()).padStart(2, "0")}/${String(f.getMonth() + 1).padStart(2, "0")}/${f.getFullYear()}`;
  }

  function formatearFechaConDia(fecha) {
    if (!fecha) return "";
    const f = new Date(fecha);
    f.setMinutes(f.getMinutes() + f.getTimezoneOffset());
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const dia = dias[f.getDay()] || "";
    return `${dia} ${String(f.getDate()).padStart(2, "0")}/${String(f.getMonth() + 1).padStart(2, "0")}/${f.getFullYear()}`;
  }

  function getColorByPrioridad(level) {
    switch (level) {
      case "Urgente":
        return "#dc2626";
      case "Alta":
        return "#f97316";
      case "Media":
        return "#facc15";
      case "Baja":
        return "#22c55e";
      default:
        return "#94a3b8";
    }
  }

  function calcularDias(inicio, fin) {
    const start = new Date(inicio);
    const end = new Date(fin);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 0;
  }

  return (
    <div className="scheduler-page container-fluid">
      <div className="scheduler-header">
        <div>
          <h2>Programación operativa</h2>
          <p>Coordina actividades, tecnicos y centros desde un único panel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="fas fa-plus me-2" />
          Nueva actividad
        </button>
      </div>

      <div className="scheduler-metrics">
        {metricas.map((card) => (
          <div className={`metric-card metric-card-${card.tone}`} key={card.label}>
            <div className="metric-card-accent" />
            <div className="metric-icon">
              <i className={card.icon} />
            </div>
            <div className="metric-content">
              <span>{card.label}</span>
              <div className="metric-value-row">
                <h3>{card.value}</h3>
                <small>{card.detail}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="scheduler-filters card">
        <div className="card-body">
          <div className="scheduler-filters-head">
            <div>
              <h6>
                <i className="fas fa-filter mr-2" />
                Filtros de programación
              </h6>
              <small>{filteredActividades.length} actividades visibles</small>
            </div>
            <button className="btn btn-light btn-sm" onClick={() => {
              setFiltroTexto("");
              setFiltroPrioridad("");
              setFiltroEstado("");
              setFiltroTipo("");
              setFiltroTecnico("");
            }}>
              <i className="fas fa-eraser mr-1" />
              Limpiar
            </button>
          </div>
          <div className="row scheduler-filter-row">
            <div className="col-md-6 col-lg-3">
              <label>Búsqueda rápida</label>
              <div className="input-group scheduler-filter-control">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-search" />
                  </span>
                </div>
                <input
                  className="form-control"
                  placeholder="Nombre, cliente o centro"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3 col-lg-2">
              <label>Prioridad</label>
              <div className="input-group scheduler-filter-control">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-flag" />
                  </span>
                </div>
                <select className="form-control" value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
                  {prioridadOptions.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-3 col-lg-2">
              <label>Estado</label>
              <div className="input-group scheduler-filter-control">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-traffic-light" />
                  </span>
                </div>
                <select className="form-control" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  {estadoOptions.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-3 col-lg-2">
              <label>Tipo</label>
              <div className="input-group scheduler-filter-control">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-layer-group" />
                  </span>
                </div>
                <select className="form-control" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  {tipoActividadOptions.map((tipoItem) => (
                    <option key={tipoItem} value={tipoItem}>
                      {tipoItem}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <label>Tecnico</label>
              <div className="input-group scheduler-filter-control">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-user-hard-hat" />
                  </span>
                </div>
                <select className="form-control" value={filtroTecnico} onChange={(e) => setFiltroTecnico(e.target.value)}>
                  <option value="">Todos los tecnicos</option>
                  {encargados.map((enc) => (
                    <option key={enc.id_encargado} value={enc.nombre_encargado.toLowerCase()}>
                      {enc.nombre_encargado}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3 soporte-pendientes-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Pendientes de terreno (Soporte)</h6>
            <span className="pill soporte-pendiente-badge">{soportesTerrenoPendientes.length} pendientes</span>
          </div>
          <DataTable
            columns={columnasSoporteTerreno}
            data={soportesTerrenoPendientes}
            progressPending={loadingSoportesTerreno}
            pagination
            paginationPerPage={5}
            paginationRowsPerPageOptions={[5, 10, 15]}
            dense
            highlightOnHover
            striped
            responsive
            customStyles={soporteTerrenoTableStyles}
            noDataComponent="No hay soportes de terreno pendientes."
          />
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6 mb-3">
          <div className="card soporte-pendientes-card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Armados (estado operativo)</h6>
                <span className="pill state-en-progreso">{armadosCalendario.length} registros</span>
              </div>
              <DataTable
                columns={columnasArmadosCalendario}
                data={armadosCalendario}
                progressPending={loadingArmadosCalendario}
                pagination
                paginationPerPage={5}
                paginationRowsPerPageOptions={[5, 10, 15]}
                dense
                highlightOnHover
                striped
                responsive
                customStyles={soporteTerrenoTableStyles}
                noDataComponent="No hay armados para mostrar."
              />
            </div>
          </div>
        </div>
        <div className="col-lg-6 mb-3">
          <div className="card soporte-pendientes-card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Resueltos del día (Soporte)</h6>
                <span className="pill soporte-resuelto-hoy-badge">{soportesResueltosHoy.length} hoy</span>
              </div>
              <DataTable
                columns={columnasSoporteResueltosHoy}
                data={soportesResueltosHoy}
                progressPending={loadingSoportesTerreno}
                pagination
                paginationPerPage={5}
                paginationRowsPerPageOptions={[5, 10, 15]}
                dense
                highlightOnHover
                striped
                responsive
                customStyles={soporteTerrenoTableStyles}
                noDataComponent="No hay soportes resueltos hoy."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row scheduler-split">
        <div className="col-xl-8 col-lg-7">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Tabla de actividades programadas</h6>
                <span className="pill state-en-progreso">{filteredActividades.length} registros</span>
              </div>
              <DataTable
                columns={columns}
                data={filteredActividades}
                progressPending={loading}
                pagination
                highlightOnHover
                responsive
                noDataComponent="No hay actividades disponibles para los filtros seleccionados."
              />
            </div>
          </div>
          <div className="card mt-3">
            <div className="card-body">
              <h6 className="mb-0">Disponibilidad</h6>
              <div className="mt-2">
                {disponibilidadTecnicos.length ? (
                  <div className="table-responsive">
                    <table className="table table-sm mb-0 scheduler-tech-table">
                      <thead>
                        <tr>
                          <th>Tecnico</th>
                          <th className="text-center">Estado hoy</th>
                          <th className="text-center">Proximo hito</th>
                          <th className="text-center">Semana</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disponibilidadTecnicos.map((item) => (
                          <tr key={item.name}>
                            <td><strong>{item.name}</strong></td>
                            <td className="text-center">
                              <span className={`badge ${item.estadoHoyClase}`}>{item.estadoHoyTexto}</span>
                            </td>
                            <td className="text-center">
                              <span className="small text-muted">{item.proximoHito}</span>
                            </td>
                            <td className="text-center">
                              <div
                                className="week-balance"
                                title={`Esta semana: ${item.diasTerreno} dias terreno, ${item.diasOficina} dias oficina, ${item.diasBloqueados} dias bloqueado`}
                              >
                                <div className="week-balance-chips">
                                  <span className="week-chip week-chip-terreno">
                                    Terreno <strong>{item.diasTerreno}d</strong>
                                  </span>
                                  <span className="week-chip week-chip-oficina">
                                    Oficina <strong>{item.diasOficina}d</strong>
                                  </span>
                                  {item.diasBloqueados > 0 ? (
                                    <span className="week-chip week-chip-bloqueado">
                                      Bloq. <strong>{item.diasBloqueados}d</strong>
                                    </span>
                                  ) : null}
                                </div>
                                <div className="week-balance-bar">
                                  <span
                                    className="week-bar-terreno"
                                    style={{ flex: Math.max(0, item.diasTerreno) }}
                                  />
                                  <span
                                    className="week-bar-oficina"
                                    style={{ flex: Math.max(0, item.diasOficina) }}
                                  />
                                  <span
                                    className="week-bar-bloqueado"
                                    style={{ flex: Math.max(0, item.diasBloqueados) }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mb-0 text-muted">Sin tecnicos asignados.</p>
                )}
              </div>
              <div className="mt-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="mb-0">Vista 14 dias</h6>
                  <div className="availability-legend">
                    <span><i className="fas fa-square text-success" /> Libre</span>
                    <span><i className="fas fa-square text-info" /> Terreno</span>
                    <span><i className="fas fa-square text-secondary" /> Bloqueado</span>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm mb-0 disponibilidad-14-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 170 }}>Tecnico</th>
                        {disponibilidad14Dias.dias.map((d) => (
                          <th key={`day-h-${d.key}`} className="text-center">
                            <div>{d.etiqueta}</div>
                            <small className="text-muted">{d.dia}</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {disponibilidad14Dias.rows.map((row) => (
                        <tr key={`row-14-${row.tecnico}`}>
                          <td><strong>{row.tecnico}</strong></td>
                          {row.estados.map((cell, idx) => {
                            const prev = row.estados[idx - 1];
                            const next = row.estados[idx + 1];
                            const esTerrenoMismaActividad = cell.estado === "terreno" && !!cell.key && cell.key !== "libre";
                            const samePrev =
                              esTerrenoMismaActividad &&
                              !!prev &&
                              prev.estado === "terreno" &&
                              prev.key === cell.key;
                            const sameNext =
                              esTerrenoMismaActividad &&
                              !!next &&
                              next.estado === "terreno" &&
                              next.key === cell.key;
                            const segClass =
                              samePrev && sameNext
                                ? "disp-seg-mid"
                                : samePrev
                                ? "disp-seg-end"
                                : sameNext
                                ? "disp-seg-start"
                                : "disp-seg-single";
                            return (
                              <td
                                key={`cell-${row.tecnico}-${idx}`}
                                className={`text-center disp-cell ${segClass} ${cell.estado === "terreno" ? "disp-cell-terreno" : ""} ${cell.clienteTone || ""}`}
                                title={cell.detalle || ""}
                              >
                                <span className={`disp-dot disp-${cell.estado}`} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className="card mt-3 bloqueo-card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 bloqueo-title">
                  <i className="fas fa-user-clock me-2" />
                  Bloqueos de tecnicos
                </h6>
                {loadingBloqueos ? <span className="table-meta">Cargando...</span> : <span className="pill state-pendiente">{bloqueosTecnicos.length} activos</span>}
              </div>
              <div className="row g-3 align-items-end bloqueo-form">
                <div className="col-lg-3 col-md-6">
                  <label><i className="fas fa-user me-1 text-primary" /> Tecnico</label>
                  <select className="form-control" value={bloqueoTecnicoId} onChange={(e) => setBloqueoTecnicoId(e.target.value)}>
                    <option value="">Seleccionar tecnico</option>
                    {encargados.map((enc) => (
                      <option key={enc.id_encargado} value={enc.id_encargado}>
                        {enc.nombre_encargado}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2 col-md-6">
                  <label><i className="fas fa-tag me-1 text-primary" /> Tipo</label>
              <select className="form-control" value={bloqueoTipo} onChange={(e) => setBloqueoTipo(e.target.value)}>
                <option value="vacaciones">Vacaciones</option>
                <option value="licencia">Licencia</option>
                <option value="permiso">Permiso</option>
                <option value="dia_libre">Dia libre</option>
                <option value="compensatorio">Compensatorio</option>
              </select>
                </div>
                <div className="col-lg-2 col-md-6">
                  <label><i className="far fa-calendar-alt me-1 text-primary" /> Desde</label>
                  <input className="form-control" type="date" value={bloqueoDesde} onChange={(e) => setBloqueoDesde(e.target.value)} />
                </div>
                <div className="col-lg-2 col-md-6">
                  <label><i className="far fa-calendar-check me-1 text-primary" /> Hasta</label>
                  <input className="form-control" type="date" value={bloqueoHasta} onChange={(e) => setBloqueoHasta(e.target.value)} />
                </div>
                <div className="col-lg-2 col-md-8">
                  <label><i className="far fa-comment-dots me-1 text-primary" /> Motivo</label>
                  <input className="form-control" value={bloqueoMotivo} onChange={(e) => setBloqueoMotivo(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="col-lg-1 col-md-4 d-flex justify-content-md-end">
                  <button className="btn btn-primary bloqueo-add-btn" onClick={handleCrearBloqueo} title="Agregar bloqueo">
                    <i className="fas fa-plus" />
                  </button>
                </div>
              </div>
              <div className="table-responsive mt-3">
                <table className="table table-sm mb-0 scheduler-tech-table">
                  <thead>
                    <tr>
                      <th>Tecnico</th>
                      <th>Tipo</th>
                      <th>Desde</th>
                      <th>Hasta</th>
                      <th>Motivo</th>
                      <th className="text-center">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloqueosPaginados.data.map((b) => (
                      <tr key={b.id_bloqueo}>
                        <td><strong>{b?.tecnico?.nombre_encargado || `Tecnico ${b.tecnico_id}`}</strong></td>
                        <td className="text-capitalize">{b.tipo || "-"}</td>
                        <td>{formatearFecha(b.fecha_inicio)}</td>
                        <td>{formatearFecha(b.fecha_fin)}</td>
                        <td>{b.motivo || "-"}</td>
                        <td className="text-center">
                          <button className="btn btn-outline-danger btn-sm" onClick={() => handleEliminarBloqueo(b.id_bloqueo)}>
                            <i className="fas fa-trash-alt" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!bloqueosTecnicos.length ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted">Sin bloqueos activos.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {bloqueosTecnicos.length ? (
                <div className="bloqueo-pagination">
                  <div className="small text-muted">
                    Mostrando {bloqueosPaginados.start}-{bloqueosPaginados.end} de {bloqueosPaginados.total}
                  </div>
                  <div className="d-flex align-items-center" style={{ gap: 8 }}>
                    <select
                      className="form-control form-control-sm"
                      value={bloqueosPerPage}
                      onChange={(e) => setBloqueosPerPage(Number(e.target.value) || 5)}
                      style={{ width: 86 }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      disabled={bloqueosPaginados.page <= 1}
                      onClick={() => setBloqueosPage((prev) => Math.max(1, prev - 1))}
                    >
                      <i className="fas fa-chevron-left" />
                    </button>
                    <span className="small text-muted">
                      {bloqueosPaginados.page}/{bloqueosPaginados.totalPages}
                    </span>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      disabled={bloqueosPaginados.page >= bloqueosPaginados.totalPages}
                      onClick={() => setBloqueosPage((prev) => Math.min(bloqueosPaginados.totalPages, prev + 1))}
                    >
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="col-xl-4 col-lg-5">
          <div className="card calendar-wrapper">
            <div className="card-body">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay"
                }}
                events={calendarEvents}
                eventDidMount={(info) => {
                  const tip = info?.event?.extendedProps?.tooltipText;
                  if (tip) info.el.setAttribute("title", tip);
                }}
                selectable
              />
            </div>
          </div>
          <div className="card mt-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Proximas actividades (14 dias)</h6>
                <span className="pill state-en-progreso">{resumenProximas14.total}</span>
              </div>
              {!!resumenProximas14.total && (
                <p className="table-meta mb-2">
                  Mantencion: {resumenProximas14.mantencion} | Instalacion: {resumenProximas14.instalacion} | Reapuntamiento: {resumenProximas14.reapuntamiento} | Retiro: {resumenProximas14.retiro} | Levantamiento: {resumenProximas14.levantamiento} | Soporte: {resumenProximas14.soporte}
                </p>
              )}
              {proximasActividades.length ? (
                <ul className="scheduler-upcoming">
                  {proximasActividades.map((act) => (
                    <li key={act.id_actividad}>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <strong>{act.nombre_actividad}</strong>
                          <span
                            className={`upcoming-type upcoming-type-${String(act.area || "sin_tipo")
                              .toLowerCase()
                              .replace(/\s+/g, "_")}`}
                          >
                            <i className="fas fa-tag me-1" />
                            {act.area || "Sin tipo"}
                          </span>
                        </div>
                        <div className="table-meta">
                          {formatearFechaConDia(act.fecha_inicio)} · {act.centro?.cliente || "Sin cliente"}
                        </div>
                      </div>
                      <span className={`pill pill-${(act.prioridad || "ninguna").toLowerCase()}`}>{act.prioridad || "-"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-0 text-muted">Sin eventos próximos.</p>
              )}
            </div>
          </div>
          <div className="card mt-3">
            <div className="card-body">
              <h6>Mayor tiempo en terreno (mes)</h6>
              {resumenHoras.length ? (
                <ul className="scheduler-hours">
                  {resumenHoras.map((item) => (
                    <li key={item.name}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.dias} días · {item.noches} noches</small>
                      </div>
                      <span className="badge bg-info text-dark">{item.dias}d</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-0 text-muted">Sin registros en este mes.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog modal-dialog-scrollable scheduler-modal-dialog">
            <div className="modal-content scheduler-modal-content">
              <div className="modal-header scheduler-modal-header">
                <h5 className="modal-title">
                  <i className={`fas ${editarActividad ? "fa-edit" : "fa-calendar-plus"} me-2`} />
                  {editarActividad ? "Editar actividad" : "Crear actividad"}
                </h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  &times;
                </button>
              </div>
              <div className="modal-body scheduler-modal">
                <form className="row g-3 scheduler-modal-form">
                  <div className="col-md-12">
                    <label>Nombre de la actividad</label>
                    <input className="form-control" value={nombreActividad} onChange={(e) => setNombreActividad(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Fecha reclamo</label>
                    <input type="date" className="form-control" value={fechaReclamo} onChange={(e) => setFechaReclamo(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Tipo de actividad</label>
                    <select className="form-control" value={area} onChange={(e) => setArea(e.target.value)}>
                      <option value="">Seleccione tipo</option>
                      {tipoActividadOptions.map((tipoItem) => (
                        <option key={tipoItem} value={tipoItem}>
                          {tipoItem}
                        </option>
                      ))}
                      {!!area && !tipoActividadOptions.includes(area) && (
                        <option value={area}>{area}</option>
                      )}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label>Fecha inicio</label>
                    <div className="date-quick-actions mb-2">
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => aplicarFechaRapida(0)}>Hoy</button>
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => aplicarFechaRapida(1)}>+1 dia</button>
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => aplicarFechaRapida(7)}>+7 dias</button>
                    </div>
                    <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Fecha término</label>
                    <input type="date" className="form-control" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Prioridad</label>
                    <select className="form-control" value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                      <option value="">Seleccione</option>
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label>Estado</label>
                    <select className={`form-control badge-${estadoActividad.toLowerCase().replace(/\s+/g, "-")}`} value={estadoActividad} onChange={(e) => setEstadoActividad(e.target.value)}>
                      <option value="En progreso">En progreso</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label>Cliente</label>
                    <select className="form-control" value={clienteId} onChange={handleClienteChange}>
                      <option value="">Seleccione cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label>Centro</label>
                    <select className="form-control" value={centroId} onChange={(e) => setCentroId(e.target.value)}>
                      <option value="">Seleccione centro</option>
                      {filteredCentros.map((centro) => (
                        <option key={centro.id} value={centro.id}>
                          {centro.nombre} - {centro.cliente}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label>Tecnico</label>
                    <select className="form-control" value={encargadoId} onChange={(e) => setEncargadoId(e.target.value)}>
                      <option value="">Seleccione</option>
                      {encargados.map((enc) => (
                        <option key={enc.id_encargado} value={enc.id_encargado}>
                          {enc.nombre_encargado}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label>Ayudante</label>
                    <select className="form-control" value={ayudanteId} onChange={(e) => setAyudanteId(e.target.value)}>
                      <option value="">Seleccione</option>
                      {filteredAyudantes.map((enc) => (
                        <option key={enc.id_encargado} value={enc.id_encargado}>
                          {enc.nombre_encargado}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="mb-1">Tecnicos adicionales (opcional)</label>
                    <div
                      className="d-flex flex-wrap gap-2"
                      style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", minHeight: 42 }}
                    >
                      {tecnicosAdicionalesDisponibles.map((enc) => {
                        const id = Number(enc.id_encargado || 0);
                        const activo = tecnicosAdicionalesIds.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            className={`btn btn-sm ${activo ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => toggleTecnicoAdicional(id)}
                          >
                            {enc.nombre_encargado}
                          </button>
                        );
                      })}
                      {!tecnicosAdicionalesDisponibles.length && (
                        <span className="text-muted small">No hay mas tecnicos disponibles.</span>
                      )}
                    </div>
                    {!!tecnicosAdicionalesIds.length && (
                      <small className="text-muted d-block mt-1">
                        Se asignaran {tecnicosAdicionalesIds.length} tecnico(s) extra.
                      </small>
                    )}
                  </div>
                </form>
              </div>
              <div className="modal-footer scheduler-modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  <i className="fas fa-times me-1" />
                  Cerrar
                </button>
                <button className="btn btn-primary" onClick={handleGuardarActividad}>
                  <i className="fas fa-save me-1" />
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendario;
