import React, { useState, useEffect } from "react";
import DataTable from 'react-data-table-component';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';



import { cargarActividades, borrarActividad, modificarActividad, agregarActividad } from '../controllers/actividadesControllers';
import { cargarEncargados } from '../controllers/encargadosControllers';
import { cargarCentrosClientes } from "../controllers/centrosControllers";

const Calendario = () => {
    const [actividades, setActividades] = useState([]);
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
            const data = await cargarActividades();

            
            setActividades(data);
            const encargadosData = await cargarEncargados(); // Carga encargados
            setEncargados(encargadosData);
            const centrosData = await cargarCentrosClientes(); // Carga centros
            setCentros(centrosData);
            
            setLoading(false);
        };
        fetchData();
    }, []);
    

    const handleEliminarActividad = async (id) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar esta actividad?")) {
            await borrarActividad(id);
            setActividades((prevActividades) => prevActividades.filter((act) => act.id_actividad !== id));
        }
    };

    const handleEditarActividad = (actividad) => {
        // Setea los valores del formulario según la actividad seleccionada
        setEditarActividad(actividad);
        setNombreActividad(actividad.nombre_actividad || '');
        setFechaReclamo(actividad.fecha_reclamo || '');
        setFechaInicio(actividad.fecha_inicio || '');
        setFechaTermino(actividad.fecha_termino || '');
        setArea(actividad.area || '');
        setPrioridad(actividad.prioridad || '');
        setEncargadoId(actividad.encargado_principal?.id_encargado || '');
        setAyudanteId(actividad.encargado_ayudante?.id_encargado || '');
        setCentroId(actividad.centro?.id_centro || '');
        setEstadoActividad(actividad.estado || 'En progreso');
        setShowModal(true);
    };

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
    
    

    // Filtra los encargados para evitar seleccionar el mismo encargado como ayudante
    const filteredAyudantes = encargados.filter(encargado => encargado.id_encargado !== parseInt(encargadoId));


    const columns = [
        { name: 'ID', selector: row => row.id_actividad, sortable: true, width: '50px' },
        { name: 'Nombre', selector: row => row.nombre_actividad, sortable: true, wrap: true },
        { name: 'Fecha Reclamo', selector: row => formatearFecha(row.fecha_reclamo), sortable: true },
        { name: 'Fecha Inicio', selector: row => formatearFecha(row.fecha_inicio), sortable: true },
        { name: 'Fecha Término', selector: row => formatearFecha(row.fecha_termino), sortable: true },
        { name: 'Área', selector: row => row.area, sortable: true },
        { name: 'Prioridad', selector: row => row.prioridad, sortable: true },
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
        
        { name: 'Centro', selector: row => row.centro?.nombre || 'No asignado', sortable: true },
        { name: 'Cliente', selector: row => row.centro?.cliente || 'No asignado', sortable: true },
        { name: 'Encargado Principal', selector: row => row.encargado_principal?.nombre_encargado || 'No asignado', sortable: true },
        { name: 'Ayudante', selector: row => row.encargado_ayudante?.nombre_encargado || 'No asignado', sortable: true },
        { 
            name: 'Dias', 
            selector: row => calcularTiempoSolucion(row.fecha_inicio, row.fecha_termino), 
            sortable: true, 
            width: '80px' 
        },
        
        {
            name: 'Acciones',
            cell: row => (
                <div className="d-flex justify-content-around">
                    <button className="btn btn-warning btn-sm" onClick={() => handleEditarActividad(row)}>
                        <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleEliminarActividad(row.id_actividad)}>
                        <i className="fas fa-trash-alt"></i>
                    </button>
                </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
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
    
            {/* Botón de Crear Actividad */}
            <div className="my-3">
                <button
                    className="btn btn-primary"
                    style={{ maxWidth: '150px' }}
                    onClick={() => {
                        resetForm();
                        setEditarActividad(null);
                        setShowModal(true);
                    }}
                >
                    Crear Actividad
                </button>
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
                                        const fechaInicio = new Date(actividad.fecha_inicio);
                                        const fechaTermino = new Date(actividad.fecha_termino);

                                        fechaInicio.setUTCHours(12, 0, 0); // Ajustar a mediodía
                                        fechaTermino.setUTCHours(12, 0, 0);

                                        return {
                                            id: actividad.id_actividad,
                                            title: `${actividad.id_actividad} - ${actividad.nombre_actividad}`,
                                            start: fechaInicio.toISOString(),
                                            end: fechaTermino.toISOString(),
                                            color: getColorByActividad(actividad.prioridad),
                                            encargado: actividad.encargado_principal?.nombre_encargado || 'No asignado', // Agregar el encargado
                                            ayudante: actividad.encargado_ayudante?.nombre_encargado || 'No asignado', // Agregar el ayudante
                                        };
                                    })}
                                    eventContent={(eventInfo) => {
                                        return (
                                            <div>
                                                <b>{eventInfo.event.title}</b> {/* Solo muestra el título */}
                                            </div>
                                        );
                                    }}
                                editable={true}
                                selectable={true}
                                eventMouseEnter={(info) => {
                                    const encargado = info.event.extendedProps.encargado;
                                    const ayudante = info.event.extendedProps.ayudante;
                                    if (encargado || ayudante) {
                                        const tooltip = document.createElement('div');
                                        tooltip.id = 'tooltip';
                                        tooltip.style.position = 'absolute';
                                        tooltip.style.background = '#f0f0f0';
                                        tooltip.style.padding = '5px';
                                        tooltip.style.border = '1px solid #ccc';
                                        tooltip.style.borderRadius = '4px';
                                        tooltip.style.zIndex = '1000';
                                        tooltip.innerHTML = `
                                            <b>Encargado:</b> ${encargado || 'N/A'}<br>
                                            <b>Ayudante:</b> ${ayudante || 'N/A'}
                                        `;
                                        document.body.appendChild(tooltip);

                                        info.el.addEventListener('mousemove', (e) => {
                                            tooltip.style.top = `${e.pageY + 10}px`;
                                            tooltip.style.left = `${e.pageX + 10}px`;
                                        });
                                    }
                                }}
                                eventMouseLeave={() => {
                                    const tooltip = document.getElementById('tooltip');
                                    if (tooltip) {
                                        tooltip.remove();
                                    }
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

export default Calendario;
