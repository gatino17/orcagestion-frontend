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
import { obtenerArmados, obtenerSoportes } from "../api";
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

const tipoActividadOptions = ["Mantencion", "Instalacion", "Reapuntamiento", "Retiro", "Soporte"];

function Calendario() {
  const location = useLocation();
  const navigate = useNavigate();
  const [actividades, setActividades] = useState([]);
  const [encargados, setEncargados] = useState([]);
  const [centros, setCentros] = useState([]);
  const [soportesTerrenoPendientes, setSoportesTerrenoPendientes] = useState([]);
  const [loadingSoportesTerreno, setLoadingSoportesTerreno] = useState(false);
  const [armadosCalendario, setArmadosCalendario] = useState([]);
  const [loadingArmadosCalendario, setLoadingArmadosCalendario] = useState(false);
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

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroTecnico, setFiltroTecnico] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadingSoportesTerreno(true);
      setLoadingArmadosCalendario(true);
      const data = await cargarActividades();
      setActividades(data);
      setEncargados(await cargarEncargados());
      setCentros(await cargarCentrosClientes());
      try {
        const soportes = await obtenerSoportes();
        const pendientesTerreno = (Array.isArray(soportes) ? soportes : [])
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
        setSoportesTerrenoPendientes(pendientesTerreno);
      } catch (error) {
        setSoportesTerrenoPendientes([]);
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
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleEliminarActividad = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta actividad?")) {
      await borrarActividad(id);
      setActividades((prev) => prev.filter((act) => act.id_actividad !== id));
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

    if (actividadInicio && actividadFin && actividadFin < actividadInicio) {
      alert("La fecha de término no puede ser anterior a la fecha de inicio.");
      return;
    }

    if (tecnicoPrincipalId && tecnicoAyudanteId && tecnicoPrincipalId === tecnicoAyudanteId) {
      alert("El técnico principal y el ayudante no pueden ser la misma persona.");
      return;
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
    setNombreActividad(`Soporte terreno - ${soporte?.centro?.nombre || "Centro"}`);
    setFechaReclamo(soporte?.fecha_soporte || "");
    setFechaInicio(soporte?.fecha_soporte || "");
    setFechaTermino(soporte?.fecha_soporte || "");
    setArea("Soporte");
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
    setNombreActividad(`Soporte terreno - ${payload?.centro?.nombre || "Centro"}`);
    setFechaReclamo(payload?.fecha_soporte || "");
    setFechaInicio(payload?.fecha_soporte || "");
    setFechaTermino(payload?.fecha_soporte || "");
    setArea("Soporte");
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
      { label: "Actividades activas", value: activas, icon: "fas fa-tasks" },
      { label: "Finalizadas", value: cerradas, icon: "fas fa-check-circle" },
      { label: "Atrasadas", value: atrasadas, icon: "fas fa-exclamation-triangle" },
      { label: "Prioridad urgente", value: urgentes, icon: "fas fa-bolt" },
      { label: "Próx. 7 días", value: semana, icon: "fas fa-calendar-week" }
    ];
  }, [actividades, hoy]);

  const proximasActividades = useMemo(() => {
    return [...filteredActividades]
      .filter((act) => act.fecha_inicio)
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
      .slice(0, 4);
  }, [filteredActividades]);

  const disponibilidadTecnicos = useMemo(() => {
    const conteo = filteredActividades.reduce((acc, act) => {
      const tecnico = act.encargado_principal?.nombre_encargado || "No asignado";
      if (!acc[tecnico]) {
        acc[tecnico] = { activas: 0, urgentes: 0, atrasadas: 0, finalizadas: 0 };
      }
      const estado = String(act.estado || "").toLowerCase();
      const esFinalizada = estado === "finalizado" || estado === "cancelado";
      const esUrgente = String(act.prioridad || "").toLowerCase() === "urgente";
      const esAtrasada = !!act.fecha_termino && !esFinalizada && new Date(act.fecha_termino) < hoy;

      if (esFinalizada) acc[tecnico].finalizadas += 1;
      else acc[tecnico].activas += 1;
      if (esUrgente && !esFinalizada) acc[tecnico].urgentes += 1;
      if (esAtrasada) acc[tecnico].atrasadas += 1;
      return acc;
    }, {});

    const resolverCarga = (item) => {
      if (item.atrasadas > 0 || item.urgentes > 1) return { texto: "Alta", clase: "bg-danger" };
      if (item.activas === 0) return { texto: "Disponible", clase: "bg-success" };
      return { texto: "Media", clase: "bg-warning text-dark" };
    };

    return Object.entries(conteo)
      .map(([name, item]) => {
        const carga = resolverCarga(item);
        return { name, ...item, cargaTexto: carga.texto, cargaClase: carga.clase };
      })
      .sort((a, b) => b.activas - a.activas || b.urgentes - a.urgentes || b.atrasadas - a.atrasadas)
      .slice(0, 8);
  }, [filteredActividades, hoy]);

  const calendarEvents = useMemo(() => {
    return filteredActividades
      .filter((actividad) => actividad.fecha_inicio && actividad.fecha_termino)
      .map((actividad) => {
        const fechaInicio = new Date(actividad.fecha_inicio);
        const fechaTermino = new Date(actividad.fecha_termino);
        fechaInicio.setUTCHours(12, 0, 0);
        fechaTermino.setUTCHours(12, 0, 0);
        return {
          id: actividad.id_actividad,
          title: actividad.nombre_actividad,
          start: fechaInicio.toISOString(),
          end: fechaTermino.toISOString(),
          color: getColorByPrioridad(actividad.prioridad),
          extendedProps: {
            estado: actividad.estado,
            prioridad: actividad.prioridad,
            centro: actividad.centro?.nombre || "Sin centro",
            tecnico: actividad.encargado_principal?.nombre_encargado || "No asignado"
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
    { name: "ID", selector: (row) => row.id_actividad, sortable: true, width: "70px" },
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
      cell: (row) => (
        <span className={`pill state-${(row.estado || "sin estado").toLowerCase().replace(/\s+/g, "-")}`}>{row.estado}</span>
      )
    },
    {
      name: "Tecnico",
      selector: (row) => row.encargado_principal?.nombre_encargado || "No asignado",
      sortable: true
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
      name: "Estado",
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
          <div className="metric-card" key={card.label}>
            <div className="metric-icon">
              <i className={card.icon} />
            </div>
            <div>
              <span>{card.label}</span>
              <h3>{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="scheduler-filters card">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-lg-4">
              <label>Búsqueda rápida</label>
              <input
                className="form-control"
                placeholder="Nombre, cliente o centro"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>
            <div className="col-md-3 col-lg-2">
              <label>Prioridad</label>
              <select className="form-control" value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
                {prioridadOptions.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 col-lg-2">
              <label>Estado</label>
              <select className="form-control" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                {estadoOptions.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 col-lg-2">
              <label>Tipo</label>
              <select className="form-control" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Todos los tipos</option>
                {tipoActividadOptions.map((tipoItem) => (
                  <option key={tipoItem} value={tipoItem}>
                    {tipoItem}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 col-lg-3">
              <label>Tecnico</label>
              <select className="form-control" value={filtroTecnico} onChange={(e) => setFiltroTecnico(e.target.value)}>
                <option value="">Todos los tecnicos</option>
                {encargados.map((enc) => (
                  <option key={enc.id_encargado} value={enc.nombre_encargado.toLowerCase()}>
                    {enc.nombre_encargado}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-1 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => {
                setFiltroTexto("");
                setFiltroPrioridad("");
                setFiltroEstado("");
                setFiltroTipo("");
                setFiltroTecnico("");
              }}>
                Limpiar
              </button>
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

      <div className="card mb-3 soporte-pendientes-card">
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

      <div className="row scheduler-split">
        <div className="col-xl-7">
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
        </div>
        <div className="col-xl-5">
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
                selectable
              />
            </div>
          </div>
          <div className="card mt-3">
            <div className="card-body">
              <h6>Próximas actividades</h6>
              {proximasActividades.length ? (
                <ul className="scheduler-upcoming">
                  {proximasActividades.map((act) => (
                    <li key={act.id_actividad}>
                      <div>
                        <strong>{act.nombre_actividad}</strong>
                        <div className="table-meta">
                          {formatearFecha(act.fecha_inicio)} · {act.centro?.cliente || "Sin cliente"}
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
              <h6>Disponibilidad de tecnicos</h6>
              {disponibilidadTecnicos.length ? (
                <div className="table-responsive">
                  <table className="table table-sm mb-0 scheduler-tech-table">
                    <thead>
                      <tr>
                        <th>Tecnico</th>
                        <th className="text-center">Activas</th>
                        <th className="text-center">Urgentes</th>
                        <th className="text-center">Atrasadas</th>
                        <th className="text-center">Carga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disponibilidadTecnicos.map((item) => (
                        <tr key={item.name}>
                          <td><strong>{item.name}</strong></td>
                          <td className="text-center">{item.activas}</td>
                          <td className="text-center">{item.urgentes}</td>
                          <td className="text-center">{item.atrasadas}</td>
                          <td className="text-center">
                            <span className={`badge ${item.cargaClase}`}>{item.cargaTexto}</span>
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
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editarActividad ? "Editar actividad" : "Crear actividad"}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  &times;
                </button>
              </div>
              <div className="modal-body scheduler-modal">
                <form className="row g-3">
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
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cerrar
                </button>
                <button className="btn btn-primary" onClick={handleGuardarActividad}>
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
