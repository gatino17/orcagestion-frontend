import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";

import {
  cargarActividades,
  borrarActividad,
  modificarActividad,
  agregarActividad
} from "../controllers/actividadesControllers";
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

function Calendario() {
  const [actividades, setActividades] = useState([]);
  const [encargados, setEncargados] = useState([]);
  const [centros, setCentros] = useState([]);
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

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTecnico, setFiltroTecnico] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await cargarActividades();
      setActividades(data);
      setEncargados(await cargarEncargados());
      setCentros(await cargarCentrosClientes());
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
    setCentroId(actividad.centro?.id_centro || "");
    setEstadoActividad(actividad.estado || "En progreso");
    setShowModal(true);
  };

  const handleGuardarActividad = async () => {
    const payload = {
      nombre_actividad: nombreActividad,
      fecha_reclamo: fechaReclamo || null,
      fecha_inicio: fechaInicio || null,
      fecha_termino: fechaTermino || null,
      area: area || null,
      prioridad: prioridad || null,
      tecnico_encargado: encargadoId ? parseInt(encargadoId, 10) : null,
      tecnico_ayudante: ayudanteId ? parseInt(ayudanteId, 10) : null,
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

  const handleClienteChange = (event) => {
    setClienteId(event.target.value);
    setCentroId("");
  };

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

      return coincideTexto && coincidePrioridad && coincideEstado && coincideTecnico;
    });
  }, [actividades, filtroTexto, filtroPrioridad, filtroEstado, filtroTecnico]);

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

  const cargaTecnicos = useMemo(() => {
    const conteo = filteredActividades.reduce((acc, act) => {
      const tecnico = act.encargado_principal?.nombre_encargado || "No asignado";
      acc[tecnico] = (acc[tecnico] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(conteo)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredActividades]);

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
      name: "Técnico",
      selector: (row) => row.encargado_principal?.nombre_encargado || "No asignado",
      sortable: true
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
          <p>Coordina actividades, técnicos y centros desde un único panel.</p>
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
            <div className="col-md-6 col-lg-3">
              <label>Técnico</label>
              <select className="form-control" value={filtroTecnico} onChange={(e) => setFiltroTecnico(e.target.value)}>
                <option value="">Todos los técnicos</option>
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
                setFiltroTecnico("");
              }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row scheduler-split">
        <div className="col-xl-7">
          <div className="card">
            <div className="card-body">
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
              <h6>Disponibilidad de técnicos</h6>
              {cargaTecnicos.length ? (
                <ul className="scheduler-availability">
                  {cargaTecnicos.map((item) => (
                    <li key={item.name}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.count} asignaciones activas</small>
                      </div>
                      <span className="badge bg-primary">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-0 text-muted">Sin técnicos asignados.</p>
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
                    <label>Área</label>
                    <input className="form-control" value={area} onChange={(e) => setArea(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Fecha inicio</label>
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
                    <label>Técnico</label>
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
