import React, { useState, useEffect } from "react";
import DataTable from 'react-data-table-component';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import './Home.css';

import { cargarActividades, modificarActividad, agregarActividad } from '../controllers/actividadesControllers';
import { cargarEncargados } from '../controllers/encargadosControllers';
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import { obtenerSoportes } from "../api";

const Home = () => {
    const [actividades, setActividades] = useState([]);
    const [encargados, setEncargados] = useState([]);
    const [centros, setCentros] = useState([]);  // Estado para los centros
    const [soportes, setSoportes] = useState([]);
    const [paginaSoportes, setPaginaSoportes] = useState(1);
    const [clienteSoporte, setClienteSoporte] = useState("todos");
    const [loading, setLoading] = useState(true);

    // Estado para actividad en edición y mostrar modal
    const [editarActividad, setEditarActividad] = useState(null);
    const [showModal, setShowModal] = useState(false);
  

    // Campos del formulario
    const [nombreActividad, setNombreActividad] = useState('');
    const [fechaReclamo, setFechaReclamo] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaTermino, setFechaTermino] = useState('');
    const [area, setArea] = useState('');
    const [prioridad, setPrioridad] = useState('');
    
    const [centroId, setCentroId] = useState('');
    const [estadoActividad, setEstadoActividad] = useState('En progreso');
    
    const [encargadoId, setEncargadoId] = useState('');  // Encargado principal
    const [ayudanteId, setAyudanteId] = useState('');  // Ayudante

    
    useEffect(() => {
      const fetchData = async () => {
          setLoading(true);
  
          const centrosData = await cargarCentrosClientes(); // Carga centros
          setCentros(centrosData); // Asigna los datos de los centros
          const actividadesData = await cargarActividades(); // Carga actividades
          setActividades(actividadesData);
  
          const encargadosData = await cargarEncargados(); // Carga encargados
          setEncargados(encargadosData);

          try {
            const soportesData = await obtenerSoportes();
            setSoportes(Array.isArray(soportesData) ? soportesData : []);
          } catch (error) {
            console.error("No se pudieron cargar pendientes de soporte:", error);
            setSoportes([]);
          }
                              
          setLoading(false);
      };
      fetchData();
    }, []);

    useEffect(() => {
      setPaginaSoportes(1);
    }, [clienteSoporte]);
 
    const handleGuardarActividad = async () => {
        const datosActividad = {
          nombre_actividad: nombreActividad,
          fecha_reclamo: fechaReclamo || null,
          fecha_inicio: fechaInicio || null,
          fecha_termino: fechaTermino || null,
          area: area || null,
          prioridad: prioridad || null,
          tecnico_encargado: encargadoId ? parseInt(encargadoId, 10) : null,
          tecnico_ayudante: ayudanteId ? parseInt(ayudanteId, 10) : null,
          estado: estadoActividad || null,
          centro_id: centroId ? parseInt(centroId, 10) : null,
        };
      
        try {
          if (editarActividad) {
            await modificarActividad(editarActividad.id_actividad, datosActividad);
            alert('Actividad actualizada exitosamente');
          } else {
            await agregarActividad(datosActividad);
            alert('Actividad creada exitosamente');
          }
      
          const actividadesActualizadas = await cargarActividades();
          setActividades(actividadesActualizadas);
          setShowModal(false);
          resetForm();
        } catch (error) {
          alert(`Error al guardar la actividad: ${error.message}`);
          console.error(error);
        }
      };

    const resetForm = () => {
        setNombreActividad('');
        setFechaReclamo('');
        setFechaInicio('');
        setFechaTermino('');
        setArea('');
        setPrioridad('');
        setEncargadoId('');
        setAyudanteId('');
        setCentroId('');
        setEstadoActividad('En progreso');
        setEditarActividad(null);
    };

    const calcularTiempoSolucion = (fechaInicio, fechaTermino) => {
        if (!fechaTermino) return ''; // Si no hay fecha de término, devolver en blanco
    
        const inicio = new Date(fechaInicio);
        const termino = new Date(fechaTermino);
    
        // Normalizar horas para comparar días completos
        inicio.setHours(0, 0, 0, 0);
        termino.setHours(23, 59, 59, 999);
    
        // Calcular diferencia en días
        const diffTime = termino - inicio;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convertir milisegundos a días
    
        return diffDays;
    };
    
    const calcularNoches = (fechaInicio, fechaTermino) => {
      const dias = calcularTiempoSolucion(fechaInicio, fechaTermino);
      return dias > 1 ? dias - 1 : 0; // Si hay más de un día, resta 1; si no, devuelve 0
    };
 
    const formatearFecha = (fecha) => {
      if (!fecha) return ''; // Si no hay fecha, retorna vacío
  
      const fechaObj = new Date(fecha);
  
      // Ajustar fecha para eliminar el desfase de la zona horaria
      fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
  
      const dia = String(fechaObj.getDate()).padStart(2, '0'); // Día con dos dígitos
      const mes = String(fechaObj.getMonth() + 1).padStart(2, '0'); // Mes con dos dígitos
      const año = fechaObj.getFullYear(); // Año completo
  
      return `${dia}/${mes}/${año}`; // Retornar en formato DD/MM/YYYY
    };
  
    const parseFechaLocal = (valor, finDeDia = false) => {
      if (!valor) return null;
      const texto = String(valor).slice(0, 10);
      const partes = texto.split("-");
      if (partes.length !== 3) {
        const fecha = new Date(valor);
        if (Number.isNaN(fecha.getTime())) return null;
        fecha.setHours(finDeDia ? 23 : 0, finDeDia ? 59 : 0, finDeDia ? 59 : 0, finDeDia ? 999 : 0);
        return fecha;
      }
      const [anio, mes, dia] = partes.map((p) => parseInt(p, 10));
      if (!anio || !mes || !dia) return null;
      const fecha = new Date(anio, mes - 1, dia);
      fecha.setHours(finDeDia ? 23 : 0, finDeDia ? 59 : 0, finDeDia ? 59 : 0, finDeDia ? 999 : 0);
      return fecha;
    };

    const calcularDiasAbiertosSoporte = (soporte) => {
      const inicio = parseFechaLocal(soporte?.fecha_soporte);
      if (!inicio) return 0;
      const fin = soporte?.fecha_cierre ? parseFechaLocal(soporte.fecha_cierre) : new Date();
      if (!fin || Number.isNaN(fin.getTime())) return 0;
      fin.setHours(0, 0, 0, 0);
      return Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
    };

const totalActividades = actividades.length;

const proximasActividades = [...actividades]
  .filter((act) => act.fecha_inicio)
  .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
  .slice(0, 5);

const backlogPorArea = Object.entries(
  actividades.reduce((acc, act) => {
    const areaClave = act.area || 'Sin área';
    acc[areaClave] = (acc[areaClave] || 0) + 1;
    return acc;
  }, {})
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 4);

const soportesPendientesAbiertos = (Array.isArray(soportes) ? soportes : [])
  .filter((soporte) => {
    const estado = String(soporte?.estado || "pendiente").toLowerCase();
    return estado === "pendiente" || estado === "en_proceso";
  })
  .map((soporte) => ({
    ...soporte,
    diasAbiertos: calcularDiasAbiertosSoporte(soporte)
  }))
  .sort((a, b) => b.diasAbiertos - a.diasAbiertos);

const totalSoportesAbiertos = soportesPendientesAbiertos.length;
const totalSoportesPendientes = soportesPendientesAbiertos.filter(
  (soporte) => String(soporte.estado || "pendiente").toLowerCase() === "pendiente"
).length;
const totalSoportesAlertas = soportesPendientesAbiertos.filter(
  (soporte) => String(soporte.estado || "").toLowerCase() === "en_proceso"
).length;
const totalSoportesRemotos = soportesPendientesAbiertos.filter(
  (soporte) => String(soporte.tipo || "").toLowerCase() === "remoto"
).length;
const totalSoportesTerreno = soportesPendientesAbiertos.filter(
  (soporte) => String(soporte.tipo || "").toLowerCase() === "terreno"
).length;
const obtenerClienteSoporte = (soporte) => soporte?.centro?.cliente || soporte?.cliente || "Cliente sin nombre";
const obtenerUbicacionAreaCentro = (soporte) => {
  const ubicacion = String(soporte?.centro?.ubicacion || "").trim();
  const areaCentro = String(soporte?.centro?.area || "").trim();
  return [ubicacion, areaCentro].filter(Boolean).join(" / ");
};
const clientesSoporte = Object.entries(
  soportesPendientesAbiertos.reduce((acc, soporte) => {
    const cliente = obtenerClienteSoporte(soporte);
    acc[cliente] = (acc[cliente] || 0) + 1;
    return acc;
  }, {})
).sort((a, b) => a[0].localeCompare(b[0]));
const soportesFiltradosPorCliente = clienteSoporte === "todos"
  ? soportesPendientesAbiertos
  : soportesPendientesAbiertos.filter((soporte) => obtenerClienteSoporte(soporte) === clienteSoporte);
const soportesPorPagina = 5;
const totalSoportesFiltrados = soportesFiltradosPorCliente.length;
const totalPaginasSoportes = Math.max(1, Math.ceil(totalSoportesFiltrados / soportesPorPagina));
const paginaSoportesActual = Math.min(paginaSoportes, totalPaginasSoportes);
const inicioSoportes = (paginaSoportesActual - 1) * soportesPorPagina;
const soportesPrioritariosHome = soportesFiltradosPorCliente.slice(inicioSoportes, inicioSoportes + soportesPorPagina);
  
    
    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'Finalizado':
                return 'green';
            case 'En progreso':
                return 'orange';
            case 'Pendiente':
                return 'blue';
            case 'Cancelado':
                return 'red';
            default:
                return 'gray'; // Color por defecto para cualquier otro estado
        }
    };
    

    // Filtra los encargados para evitar seleccionar el mismo encargado como ayudante
    const filteredAyudantes = encargados.filter(encargado => encargado.id_encargado !== parseInt(encargadoId));


    const columns = [
        { name: 'ID', selector: row => row.id_actividad, sortable: true, width: '50px' },
        { name: 'Nombre', selector: row => row.nombre_actividad, sortable: true, wrap: true },
        { name: 'Encargado Principal', selector: row => row.encargado_principal?.nombre_encargado || 'No asignado', sortable: true },
        { name: 'Ayudante', selector: row => row.encargado_ayudante?.nombre_encargado || 'No asignado', sortable: true },
        { name: 'Fecha Término', selector: row => formatearFecha(row.fecha_termino), sortable: true },
        { 
            name: 'Estado', 
            selector: row => row.estado, 
            sortable: true, 
            cell: row => (
                <span style={{ color: getEstadoColor(row.estado), fontWeight: 'bold' }}>
                    {row.estado}
                </span>
            )
        },
        { name: 'Cliente', selector: row => row.centro?.cliente || 'No asignado', sortable: true },
        
        { 
            name: 'Dias', 
            selector: row => calcularTiempoSolucion(row.fecha_inicio, row.fecha_termino), 
            sortable: true, 
            width: '80px' 
        },
        { 
          name: 'Noches',
          selector: row => calcularNoches(row.fecha_inicio, row.fecha_termino),
          sortable: true,
          width: '80px' 
        },
        
    ];

    const getColorByActividad = (prioridad) => {
        const colores = {
            Alta: "red",
            Media: "orange",
            Baja: "green",
            Urgente: "purple",
        };
        return colores[prioridad] || "gray"; // Color por defecto
    };
    
        
    return (
        <div className="container-fluid home-dashboard">
            <div className="home-header">
                <div>
                    <h2>Panel operativo</h2>
                    <p>Monitorea los centros, actividades y cargas de trabajo del equipo en un solo vistazo.</p>
                </div>
            </div>

            <div className="home-metrics-grid">
                <div className="metric-card support-kpi-card support-kpi-open">
                    <span>Total fallas abiertas</span>
                    <h3>{totalSoportesAbiertos}</h3>
                    <small>Soportes pendientes de cierre</small>
                </div>
                <div className="metric-card critical support-kpi-card">
                    <span>Pendientes</span>
                    <h3>{totalSoportesPendientes}</h3>
                    <small>Sin gestion completa</small>
                </div>
                <div className="metric-card support-kpi-card support-kpi-warning">
                    <span>Alertas</span>
                    <h3>{totalSoportesAlertas}</h3>
                    <small>Casos en seguimiento</small>
                </div>
                <div className="metric-card support-kpi-card support-kpi-info">
                    <span>Remotas</span>
                    <h3>{totalSoportesRemotos}</h3>
                    <small>Atencion sin terreno</small>
                </div>
                <div className="metric-card support-kpi-card support-kpi-primary">
                    <span>Terreno</span>
                    <h3>{totalSoportesTerreno}</h3>
                    <small>Requieren visita o gestion local</small>
                </div>
            </div>

            <div className="home-support-priority-card">
                <div className="support-priority-header">
                    <div>
                        <span className="support-priority-kicker">Soporte operativo</span>
                        <h5>Pendientes prioritarios</h5>
                        <p>Trabajos abiertos mas antiguos que requieren seguimiento.</p>
                    </div>
                    <div className="support-priority-tools">
                        <div className="support-client-cards" aria-label="Filtrar pendientes por cliente">
                            <button
                                type="button"
                                className={`support-client-card ${clienteSoporte === "todos" ? "active" : ""}`}
                                onClick={() => setClienteSoporte("todos")}
                            >
                                <span>Todos</span>
                                <strong>{totalSoportesAbiertos}</strong>
                            </button>
                            {clientesSoporte.map(([cliente, cantidad]) => (
                                <button
                                    type="button"
                                    className={`support-client-card ${clienteSoporte === cliente ? "active" : ""}`}
                                    onClick={() => setClienteSoporte(cliente)}
                                    key={cliente}
                                >
                                    <span>{cliente}</span>
                                    <strong>{cantidad}</strong>
                                </button>
                            ))}
                        </div>
                        <span className="support-priority-icon" aria-label="Soporte">
                            <i className="fas fa-headset" />
                        </span>
                    </div>
                </div>

                {soportesPrioritariosHome.length ? (
                    <ul className="support-priority-list">
                        {soportesPrioritariosHome.map((soporte) => {
                            const esAlerta = String(soporte.estado || "").toLowerCase() === "en_proceso";
                            const esRemoto = String(soporte.tipo || "").toLowerCase() === "remoto";
                            const ubicacionArea = obtenerUbicacionAreaCentro(soporte);
                            return (
                                <li className={`support-priority-item ${esAlerta ? "is-alert" : ""}`} key={soporte.id_soporte}>
                                    <div className="support-priority-main">
                                        <div className="support-priority-title-row">
                                            <strong>{soporte.centro?.nombre || "Centro sin nombre"}</strong>
                                            {ubicacionArea && (
                                                <span className="support-area-chip">{ubicacionArea}</span>
                                            )}
                                            <span className={`support-type-chip ${esRemoto ? "remote" : "terrain"}`}>
                                                {esRemoto ? "Remoto" : "Terreno"}
                                            </span>
                                        </div>
                                        {soporte.problema && (
                                            <div className="support-priority-problem">{soporte.problema}</div>
                                        )}
                                        <small>
                                            {soporte.centro?.cliente || "Cliente sin nombre"} - {formatearFecha(soporte.fecha_soporte)}
                                        </small>
                                    </div>
                                    <span className={`support-priority-days ${esAlerta ? "is-alert" : ""}`}>
                                        <i className="fas fa-clock mr-1" />
                                        {soporte.diasAbiertos} dia{soporte.diasAbiertos === 1 ? "" : "s"}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="support-priority-empty">
                        <i className="fas fa-check-circle mr-2" />
                        No hay pendientes prioritarios de soporte.
                    </div>
                )}

                {totalSoportesFiltrados > soportesPorPagina && (
                    <div className="support-priority-pagination">
                        <button
                            type="button"
                            className="support-page-button"
                            disabled={paginaSoportesActual <= 1}
                            onClick={() => setPaginaSoportes((pagina) => Math.max(1, pagina - 1))}
                        >
                            <i className="fas fa-chevron-left mr-1" />
                            Anterior
                        </button>
                        <span>Pagina {paginaSoportesActual} de {totalPaginasSoportes}</span>
                        <button
                            type="button"
                            className="support-page-button"
                            disabled={paginaSoportesActual >= totalPaginasSoportes}
                            onClick={() => setPaginaSoportes((pagina) => Math.min(totalPaginasSoportes, pagina + 1))}
                        >
                            Siguiente
                            <i className="fas fa-chevron-right ml-1" />
                        </button>
                    </div>
                )}
            </div>

            <div className="home-insights-grid">
                <div className="insight-card">
                    <h5>Proximos hitos</h5>
                    {proximasActividades.length ? (
                        <ul className="insight-list">
                            {proximasActividades.map((actividad) => (
                                <li className="insight-item" key={actividad.id_actividad}>
                                    <div>
                                        <strong>{actividad.nombre_actividad}</strong>
                                        <div className="insight-meta">
                                            {formatearFecha(actividad.fecha_inicio)} - {actividad.centro?.cliente || 'Sin cliente'}
                                        </div>
                                    </div>
                                    <span className="insight-pill">{actividad.estado || 'Sin estado'}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted mb-0">Sin actividades programadas proximamente.</p>
                    )}
                </div>

                <div className="insight-card">
                    <h5>Backlog por area</h5>
                    {backlogPorArea.length ? (
                        <ul className="insight-list">
                            {backlogPorArea.map(([area, cantidad]) => (
                                <li className="insight-item" key={area}>
                                    <div>
                                        <strong>{area}</strong>
                                        <div className="insight-meta">Actividades registradas</div>
                                    </div>
                                    <span className="insight-pill">{cantidad}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted mb-0">No hay actividades clasificadas por area.</p>
                    )}
                </div>
            </div>

            <div className="row home-content-grid">
                <div className="col-xl-7">
                    <div className="card w-100">
                        <div className="card-body">
                            <div className="home-section-heading">
                                <h5>Actividades registradas</h5>
                                <span className="insight-meta">{totalActividades} totales</span>
                            </div>
                            <DataTable
                                columns={columns}
                                data={actividades}
                                progressPending={loading}
                                pagination
                                highlightOnHover
                                pointerOnHover
                                responsive
                                noDataComponent="No hay actividades disponibles"
                                className="w-100"
                            />
                        </div>
                    </div>
                </div>

                <div className="col-xl-5">
                    <div className="card w-100">
                        <div className="card-body">
                            <div className="home-section-heading">
                                <h5>Calendario operacional</h5>
                                <span className="insight-meta">Prioridad por color</span>
                            </div>
                            <FullCalendar
                                plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                                }}
                                views={{
                                    dayGridMonth: { buttonText: 'Mes' },
                                    timeGridWeek: { buttonText: 'Semana' },
                                    timeGridDay: { buttonText: 'Día' },
                                }}
                                events={actividades
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
                                            color: getColorByActividad(actividad.prioridad),
                                        };
                                    })}
                            />
                        </div>
                    </div>
                </div>
            </div>            {/* Modal para crear/editar actividad */}
            {showModal && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{editarActividad ? 'Editar Actividad' : 'Crear Actividad'}</h5>
                                <button type="button" className="close" onClick={() => setShowModal(false)}>
                                    &times;
                                </button>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <form>
                                    <div className="form-group">
                                        <label>Nombre de la Actividad</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nombreActividad}
                                            onChange={(e) => setNombreActividad(e.target.value)}
                                        />
                                    </div>
    
                                    {/* Encargado Principal */}
                                    <div className="form-group">
                                        <label>Encargado Principal</label>
                                        <select
                                            className="form-control"
                                            value={encargadoId}
                                            onChange={(e) => setEncargadoId(e.target.value)}
                                        >
                                            <option value="">Seleccione Encargado</option>
                                            {encargados.map((encargado) => (
                                                <option key={encargado.id_encargado} value={encargado.id_encargado}>
                                                    {encargado.nombre_encargado}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
    
                                    {/* Ayudante */}
                                    <div className="form-group">
                                        <label>Ayudante</label>
                                        <select
                                            className="form-control"
                                            value={ayudanteId}
                                            onChange={(e) => setAyudanteId(e.target.value)}
                                        >
                                            <option value="">Seleccione Ayudante</option>
                                            {filteredAyudantes.map((ayudante) => (
                                                <option key={ayudante.id_encargado} value={ayudante.id_encargado}>
                                                    {ayudante.nombre_encargado}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
    
                                    {/* Selector de Centro */}
                                    <div className="form-group">
                                        <label>Centro</label>
                                        <select
                                            className="form-control"
                                            value={centroId}
                                            onChange={(e) => setCentroId(e.target.value)}
                                        >
                                            <option value="">Seleccione un centro</option>
                                            {centros.map((centro) => (
                                                <option key={centro.id} value={centro.id}>
                                                    {centro.nombre} - {centro.cliente}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
    
                                    <div className="form-group">
                                        <label>Fecha Reclamo</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fechaReclamo}
                                            onChange={(e) => setFechaReclamo(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha Inicio</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fechaInicio}
                                            onChange={(e) => setFechaInicio(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha Término</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fechaTermino}
                                            onChange={(e) => setFechaTermino(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Área</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={area}
                                            onChange={(e) => setArea(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Prioridad</label>
                                        <select
                                            className="form-control"
                                            value={prioridad}
                                            onChange={(e) => setPrioridad(e.target.value)}
                                        >
                                            <option value="">Seleccione Prioridad</option>
                                            <option value="Alta">Alta</option>
                                            <option value="Media">Media</option>
                                            <option value="Baja">Baja</option>
                                            <option value="Urgente">Urgente</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Estado</label>
                                        <select
                                            className="form-control"
                                            value={estadoActividad}
                                            onChange={(e) => setEstadoActividad(e.target.value)}
                                        >
                                            <option value="En progreso">En Progreso</option>
                                            <option value="Finalizado">Finalizado</option>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Cancelado">Cancelado</option>
                                        </select>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cerrar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleGuardarActividad}>
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    
};

export default Home;

