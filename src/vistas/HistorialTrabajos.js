import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import {
  cargarActividades,
  borrarActividad,
  modificarActividad,
  agregarActividad
} from "../controllers/actividadesControllers";
import { cargarEncargados } from "../controllers/encargadosControllers";
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import "./HistorialTrabajos.css";

const estadoOptions = [
  { label: "Todos", value: "" },
  { label: "En progreso", value: "en progreso" },
  { label: "Pendiente", value: "pendiente" },
  { label: "Finalizado", value: "finalizado" },
  { label: "Cancelado", value: "cancelado" }
];

const prioridadOptions = [
  { label: "Todas", value: "" },
  { label: "Baja", value: "baja" },
  { label: "Media", value: "media" },
  { label: "Alta", value: "alta" },
  { label: "Urgente", value: "urgente" }
];

function HistorialTrabajos() {
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
  const [centroId, setCentroId] = useState("");
  const [estadoActividad, setEstadoActividad] = useState("En progreso");
  const [encargadoId, setEncargadoId] = useState("");
  const [ayudanteId, setAyudanteId] = useState("");

  const [filtros, setFiltros] = useState({
    cliente: "",
    centro: "",
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "",
    prioridad: "",
    encargado: ""
  });
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
    setEstadoActividad("En progreso");
    setEditarActividad(null);
  };

  const calcularTiempoSolucion = (inicio, fin) => {
    if (!inicio || !fin) return 0;
    const start = new Date(inicio);
    const end = new Date(fin);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const f = new Date(fecha);
    f.setMinutes(f.getMinutes() + f.getTimezoneOffset());
    return `${String(f.getDate()).padStart(2, "0")}/${String(f.getMonth() + 1).padStart(2, "0")}/${f.getFullYear()}`;
  };
  const actividadesFiltradas = useMemo(() => {
    return actividades.filter((actividad) => {
      const cliente = actividad.centro?.cliente?.toLowerCase() || "";
      const centro = actividad.centro?.nombre?.toLowerCase() || "";
      const nombre = actividad.nombre_actividad?.toLowerCase() || "";
      const estado = actividad.estado?.toLowerCase() || "";
      const prioridadAct = actividad.prioridad?.toLowerCase() || "";
      const encargado = actividad.encargado_principal?.nombre_encargado?.toLowerCase() || "";
      const clienteFiltro = filtros.cliente.toLowerCase();
      const centroFiltro = filtros.centro.toLowerCase();
      const nombreFiltro = filtros.nombre.toLowerCase();
      const estadoFiltro = filtros.estado.toLowerCase();
      const prioridadFiltro = filtros.prioridad.toLowerCase();
      const encargadoFiltro = filtros.encargado.toLowerCase();
      const fechaCondicion =
        (!filtros.fechaInicio || new Date(actividad.fecha_reclamo) >= new Date(filtros.fechaInicio)) &&
        (!filtros.fechaFin || new Date(actividad.fecha_reclamo) <= new Date(filtros.fechaFin));

      return (
        cliente.includes(clienteFiltro) &&
        centro.includes(centroFiltro) &&
        nombre.includes(nombreFiltro) &&
        fechaCondicion &&
        (estadoFiltro ? estado === estadoFiltro : true) &&
        (prioridadFiltro ? prioridadAct === prioridadFiltro : true) &&
        (encargadoFiltro ? encargado.includes(encargadoFiltro) : true)
      );
    });
  }, [actividades, filtros]);

  const resumenEstado = useMemo(() => {
    const base = { finalizado: 0, enProgreso: 0, cancelado: 0, pendiente: 0 };
    actividadesFiltradas.forEach((act) => {
      const key = act.estado?.toLowerCase();
      if (key === "finalizado") base.finalizado++;
      if (key === "en progreso") base.enProgreso++;
      if (key === "cancelado") base.cancelado++;
      if (key === "pendiente") base.pendiente++;
    });
    return base;
  }, [actividadesFiltradas]);

  const totalDias = useMemo(
    () => actividadesFiltradas.reduce((acc, act) => acc + calcularTiempoSolucion(act.fecha_inicio, act.fecha_termino), 0),
    [actividadesFiltradas]
  );

  const encargadosOptions = useMemo(
    () => [{ value: "", label: "Todos los tecnicos" }].concat(
      encargados.map((enc) => ({ value: enc.nombre_encargado.toLowerCase(), label: enc.nombre_encargado }))
    ),
    [encargados]
  );
  const handleEliminarActividad = async (id) => {
    if (window.confirm("Seguro que deseas eliminar esta actividad?")) {
      await borrarActividad(id);
      setActividades((prev) => prev.filter((act) => act.id_actividad !== id));
    }
  };

  const handleEditarActividad = (actividad) => {
    setEditarActividad(actividad);
    setNombreActividad(actividad.nombre_actividad || "");
    setFechaReclamo(actividad.fecha_reclamo || "");
    setFechaInicio(actividad.fecha_inicio || "");
    setFechaTermino(actividad.fecha_termino || "");
    setArea(actividad.area || "");
    setPrioridad(actividad.prioridad || "");
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
      const updated = await cargarActividades();
      setActividades(updated);
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert(`Error al guardar la actividad: ${error.message}`);
    }
  };

  const filteredAyudantes = encargados.filter(
    (encargado) => encargado.id_encargado !== parseInt(encargadoId || 0, 10)
  );
  const columns = [
    { name: "ID", selector: (row) => row.id_actividad, width: "70px", sortable: true },
    {
      name: "Actividad",
      selector: (row) => row.nombre_actividad,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div>
          <strong>{row.nombre_actividad}</strong>
          <div className="table-meta">{row.centro?.cliente || "Sin cliente"}</div>
        </div>
      )
    },
    { name: "Fecha inicio", selector: (row) => formatearFecha(row.fecha_inicio), sortable: true },
    { name: "Fecha fin", selector: (row) => formatearFecha(row.fecha_termino), sortable: true },
    { name: "Area", selector: (row) => row.area || "-", sortable: true },
    {
      name: "Prioridad",
      selector: (row) => row.prioridad,
      sortable: true,
      cell: (row) => (
        <span className={`pill pill-${(row.prioridad || "ninguna").toLowerCase()}`}>
          {row.prioridad || "-"}
        </span>
      )
    },
    {
      name: "Estado",
      selector: (row) => row.estado,
      sortable: true,
      cell: (row) => (
        <span className={`pill state-${(row.estado || "sin estado").toLowerCase().replace(/\s+/g, "-")}`}>
          {row.estado}
        </span>
      )
    },
    { name: "Centro", selector: (row) => row.centro?.nombre || "Sin centro", sortable: true },
    {
      name: "Tecnico",
      selector: (row) => row.encargado_principal?.nombre_encargado || "No asignado",
      sortable: true
    },
    {
      name: "Dias",
      selector: (row) => calcularTiempoSolucion(row.fecha_inicio, row.fecha_termino),
      width: "80px",
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
  return (
    <div className="history-page container-fluid">
      <div className="history-header">
        <div>
          <h2>Historial de trabajos</h2>
          <p>Consulta y depura las actividades ejecutadas por el equipo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="fas fa-plus me-2" /> Nueva actividad
        </button>
      </div>

      <div className="history-metrics">
        <div className="metric-card success">
          <span>Finalizados</span>
          <h3>{resumenEstado.finalizado}</h3>
        </div>
        <div className="metric-card warning">
          <span>En progreso</span>
          <h3>{resumenEstado.enProgreso}</h3>
        </div>
        <div className="metric-card info">
          <span>Pendientes</span>
          <h3>{resumenEstado.pendiente}</h3>
        </div>
        <div className="metric-card danger">
          <span>Cancelados</span>
          <h3>{resumenEstado.cancelado}</h3>
        </div>
        <div className="metric-card neutral">
          <span>Dias acumulados</span>
          <h3>{totalDias}</h3>
        </div>
      </div>

      <div className="history-filters card">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label>Nombre actividad</label>
              <input
                className="form-control"
                value={filtros.nombre}
                onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
                placeholder="Buscar por nombre"
              />
            </div>
            <div className="col-md-3">
              <label>Cliente</label>
              <input
                className="form-control"
                value={filtros.cliente}
                onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
                placeholder="Ej. Caleta Bay"
              />
            </div>
            <div className="col-md-3">
              <label>Centro</label>
              <input
                className="form-control"
                value={filtros.centro}
                onChange={(e) => setFiltros({ ...filtros, centro: e.target.value })}
                placeholder="Nombre centro"
              />
            </div>
            <div className="col-md-3">
              <label>Tecnico</label>
              <select
                className="form-control"
                value={filtros.encargado}
                onChange={(e) => setFiltros({ ...filtros, encargado: e.target.value })}
              >
                {encargadosOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label>Estado</label>
              <select
                className="form-control"
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              >
                {estadoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label>Prioridad</label>
              <select
                className="form-control"
                value={filtros.prioridad}
                onChange={(e) => setFiltros({ ...filtros, prioridad: e.target.value })}
              >
                {prioridadOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label>Desde</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label>Hasta</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
              />
            </div>
          </div>
          <div className="text-end mt-3">
            <button
              className="btn btn-outline-secondary"
              onClick={() =>
                setFiltros({
                  cliente: "",
                  centro: "",
                  nombre: "",
                  fechaInicio: "",
                  fechaFin: "",
                  estado: "",
                  prioridad: "",
                  encargado: ""
                })
              }
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={actividadesFiltradas}
            progressPending={loading}
            pagination
            highlightOnHover
            responsive
            noDataComponent="No hay actividades disponibles"
          />
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
              <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                <form className="row g-3">
                  <div className="col-md-12">
                    <label>Nombre</label>
                    <input className="form-control" value={nombreActividad} onChange={(e) => setNombreActividad(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Fecha reclamo</label>
                    <input type="date" className="form-control" value={fechaReclamo} onChange={(e) => setFechaReclamo(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Area</label>
                    <input className="form-control" value={area} onChange={(e) => setArea(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Fecha inicio</label>
                    <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label>Fecha termino</label>
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
                    <select className="form-control" value={estadoActividad} onChange={(e) => setEstadoActividad(e.target.value)}>
                      <option value="En progreso">En progreso</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label>Centro</label>
                    <select className="form-control" value={centroId} onChange={(e) => setCentroId(e.target.value)}>
                      <option value="">Seleccione centro</option>
                      {centros.map((centro) => (
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

export default HistorialTrabajos;
