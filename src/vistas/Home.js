import React, { useState, useEffect } from "react";
import DataTable from 'react-data-table-component';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';



import { cargarActividades, modificarActividad, agregarActividad } from '../controllers/actividadesControllers';
import { cargarEncargados } from '../controllers/encargadosControllers';
import { cargarCentrosClientes } from "../controllers/centrosControllers";

const Home = () => {
    const [actividades, setActividades] = useState([]);
    const [totalCentrosOperativos, setTotalCentrosOperativos] = useState(0);
    const [encargados, setEncargados] = useState([]);
    const [centros, setCentros] = useState([]);  // Estado para los centros
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
          setTotalCentrosOperativos(centrosData.length); // Calcula el total de centros operativos
  
          const actividadesData = await cargarActividades(); // Carga actividades
          setActividades(actividadesData);
  
          const encargadosData = await cargarEncargados(); // Carga encargados
          setEncargados(encargadosData);
                              
          setLoading(false);
      };
      fetchData();
    }, []);
 
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
  
    const actividadesDelMesActual = actividades.filter((actividad) => {
      const fechaInicio = new Date(actividad.fecha_inicio);
      const mesActual = new Date().getMonth(); // Mes actual (0 = Enero, 11 = Diciembre)
      const añoActual = new Date().getFullYear(); // Año actual
  
      return fechaInicio.getMonth() === mesActual && fechaInicio.getFullYear() === añoActual;
    });
  
    
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
        <div className="container-fluid">
            <h3>Programación de Actividades</h3>
            {/* Tarjetas */}
            <div className="row mb-3">
              <div className="col-lg-4 col-6">
                <div className="small-box bg-info">
                  <div className="inner">
                    <h3>{totalCentrosOperativos}</h3>
                    <p>Total Centros Operativos</p>
                  </div>
                </div>
              </div>
              <div className="col-lg-4 col-6">
                <div className="small-box bg-success">
                  <div className="inner">
                  <h3>2</h3>
                  <p>Total Centros facturando</p>
                  </div>
                </div>
              </div>
              <div className="col-lg-4 col-6">
                <div className="small-box bg-warning">
                  <div className="inner">                    
                    
                    <h3>{actividadesDelMesActual.length}</h3>
                    <p>Actividades Mes Actual</p>
                    
                  </div>
                </div>
              </div>
              
            </div>
    
          
    
            {/* Dividir la vista */}
            <div className="row">
                {/* Sección del Listado */}
                <div className="col-md-6">
                    <div className="card w-100">
                        <div className="card-body">
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
    
                {/* Sección del Calendario */}
                <div className="col-md-6">
                    <div className="card w-100">
                        <div className="card-body">
                            <h5>Calendario</h5>
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
                                        // Convertir las fechas adecuadamente
                                        const fechaInicio = new Date(actividad.fecha_inicio);
                                        const fechaTermino = new Date(actividad.fecha_termino);

                                        // Ajustar horas para evitar el desfase (opcional)
                                        fechaInicio.setUTCHours(12, 0, 0); // Ajustar a mediodía
                                        fechaTermino.setUTCHours(12, 0, 0);

                                        return {
                                            id: actividad.id_actividad,
                                            title: actividad.nombre_actividad,
                                            start: fechaInicio.toISOString(),
                                            end: fechaTermino.toISOString(),
                                            color: getColorByActividad(actividad.prioridad),
                                        };
                                        })}
                                    editable={true}
                                    selectable={true}
                                    eventContent={(eventInfo) => {
                                        return (
                                        <div>
                                            <b>{eventInfo.event.title}</b> {/* Muestra solo el título */}
                                        </div>
                                        );
                                    }}
                                    />
                                
                        </div>
                    </div>
                </div>
            </div>
    
            {/* Modal para crear/editar actividad */}
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
