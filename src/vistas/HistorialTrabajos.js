import React, { useState, useEffect, useCallback  } from "react";
import DataTable from 'react-data-table-component';
import { cargarActividades, borrarActividad, modificarActividad, agregarActividad } from '../controllers/actividadesControllers';
import { cargarEncargados } from '../controllers/encargadosControllers';
import { cargarCentrosClientes } from "../controllers/centrosControllers";

const HistorialTrabajos = () => {
    const [actividades, setActividades] = useState([]);
    const [encargados, setEncargados] = useState([]);
    const [centros, setCentros] = useState([]);  // Estado para los centros
    const [loading, setLoading] = useState(true);
    const [actividadesFiltradas, setActividadesFiltradas] = useState([]);

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

    const [filterCliente, setFilterCliente] = useState('');
    const [filterCentro, setFilterCentro] = useState('');
    const [filterFechaInicio, setFilterFechaInicio] = useState('');
    const [filterFechaTermino, setFilterFechaTermino] = useState('');
    const [filterNombreActividad, setFilterNombreActividad] = useState('');


    const filtrarActividades = useCallback(() => {
        let actividadesFiltradas = actividades;
      
        if (filterCliente) {
          actividadesFiltradas = actividadesFiltradas.filter(actividad =>
            (actividad.centro?.cliente?.toLowerCase() || '').includes(filterCliente.toLowerCase())
          );
        }
      
        if (filterCentro) {
          actividadesFiltradas = actividadesFiltradas.filter(actividad =>
            (actividad.centro?.nombre?.toLowerCase() || '').includes(filterCentro.toLowerCase())
          );
        }
      
        if (filterNombreActividad) {
          actividadesFiltradas = actividadesFiltradas.filter(actividad =>
            (actividad.nombre_actividad?.toLowerCase() || '').includes(filterNombreActividad.toLowerCase())
          );
        }
      
        // Filtro por rango de fechas de reclamo
        if (filterFechaInicio && filterFechaTermino) {
          const fechaInicio = new Date(filterFechaInicio);
          const fechaTermino = new Date(filterFechaTermino);
          actividadesFiltradas = actividadesFiltradas.filter(actividad => {
            const fechaReclamo = new Date(actividad.fecha_reclamo);
            return fechaReclamo >= fechaInicio && fechaReclamo <= fechaTermino;
          });
        }
      
        return actividadesFiltradas;
      }, [filterCliente, filterCentro, filterNombreActividad, filterFechaInicio, filterFechaTermino, actividades]);
      
      
      
      // Función para limpiar todos los filtros
        const limpiarFiltros = () => {
            setFilterCliente('');
            setFilterCentro('');
            setFilterNombreActividad('');
            setFilterFechaInicio('');
            setFilterFechaTermino('');
            setActividadesFiltradas(actividades);
        };

      
// Contar actividades por estado
    const resumenEstado = {
        finalizado: actividadesFiltradas.filter(actividad => actividad.estado.toLowerCase() === 'finalizado').length,
        enProgreso: actividadesFiltradas.filter(actividad => actividad.estado.toLowerCase() === 'en progreso').length,
        cancelado: actividadesFiltradas.filter(actividad => actividad.estado.toLowerCase() === 'cancelado').length,
        pendiente: actividadesFiltradas.filter(actividad => actividad.estado.toLowerCase() === 'pendiente').length,
    };
    
    // Ejecutar filtrado cada vez que los filtros o actividades cambien
    useEffect(() => {
        const resultadoFiltrado = filtrarActividades(); // Aplica los filtros y devuelve un arreglo
        setActividadesFiltradas(resultadoFiltrado); // Actualiza el estado con los resultados filtrados
    }, [filtrarActividades]);
  
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
        { name: 'Área', selector: row => row.area, sortable: true, width: '90px' },
        { name: 'Prioridad', selector: row => row.prioridad, sortable: true, width: '98px' },
        { 
            name: 'Estado', 
            selector: row => row.estado, 
            sortable: true, 
            width: '98px',
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

    return (
        <div className="container-fluid">
            <h3>Historial de Trabajos</h3>
            {/* Tarjetas de resumen */}
            <div className="row mb-3">
                <div className="col-md-3">
                    <div className="card text-white bg-success">
                        <div className="card-header"><h6>Finalizados</h6></div>
                        <div className="card-body"><h5>{resumenEstado.finalizado}</h5></div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-warning">
                        <div className="card-header"><h6>En Progreso</h6></div>
                        <div className="card-body"><h5>{resumenEstado.enProgreso}</h5></div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-danger">
                        <div className="card-header"><h6>Cancelados</h6></div>
                        <div className="card-body"><h5>{resumenEstado.cancelado}</h5></div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-secondary">
                        <div className="card-header"><h6>Pendientes</h6></div>
                        <div className="card-body"><h5>{resumenEstado.pendiente}</h5></div>
                    </div>
                </div>
            </div>
               
            {/* Tarjeta para Filtros Generales */}
            <div className="col-md-12 mb-4">
                <div className="card">
                    <div className="card-header">
                    <h5>Buscar Actividad</h5>
                    </div>
                    <div className="card-body">
                    <div className="row">
                       {/* Filtro por Nombre de Actividad */}
                        <div className="col-md-3 mb-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por nombre de actividad"
                            value={filterNombreActividad}
                            onChange={(e) => setFilterNombreActividad(e.target.value)}
                        />
                        </div>
                        {/* Filtro por Cliente */}
                        <div className="col-md-3 mb-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por cliente"
                            value={filterCliente}
                            onChange={(e) => setFilterCliente(e.target.value)}
                        />
                        </div>

                        {/* Filtro por Centro */}
                        <div className="col-md-3 mb-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por centro"
                            value={filterCentro}
                            onChange={(e) => setFilterCentro(e.target.value)}
                        />
                        </div>

                        {/* Filtros de Rango de Fecha */}
                                <div className="col-md-3 mb-2 d-flex align-items-center">
                                    <input
                                        type="date"
                                        className="form-control"
                                        placeholder="Fecha inicio"
                                        value={filterFechaInicio}
                                        onChange={(e) => setFilterFechaInicio(e.target.value)}
                                    />
                                    <span className="mx-2">-</span>
                                    <input
                                        type="date"
                                        className="form-control"
                                        placeholder="Fecha término"
                                        value={filterFechaTermino}
                                        onChange={(e) => setFilterFechaTermino(e.target.value)}
                                    />
                                    {/* Botón de limpiar filtros */}
                                    <button className="btn btn-sm btn-primary ml-2" onClick={limpiarFiltros}>
                                        <i class="fas fa-sync-alt"> </i>
                                    </button>
                                </div>

                    </div>
                    </div>
                </div>
            </div>
                    

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
            
            {/* Tarjeta que ocupa el ancho completo */}
            <div className="card w-100">
                <div className="card-body">
                    <DataTable
                        columns={columns}
                        data={actividadesFiltradas}
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
            
            {/* Modal para crear/editar actividad */}
            {showModal && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{editarActividad ? 'Editar Actividad' : 'Crear Actividad'}</h5>
                                <button type="button" className="close" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            <div className="modal-body style={{ maxHeight: '70vh', overflowY: 'auto'">
                                <form>
                                    <div className="form-group">
                                        <label>Nombre de la Actividad</label>
                                        <input type="text" className="form-control" value={nombreActividad} onChange={(e) => setNombreActividad(e.target.value)} />
                                    </div>

                                    {/* Encargado Principal */}
                                    <div className="form-group">
                                        <label>Encargado Principal</label>
                                        <select className="form-control" value={encargadoId} onChange={(e) => setEncargadoId(e.target.value)}>
                                            <option value="">Seleccione Encargado</option>
                                            {encargados.map(encargado => (
                                                <option key={encargado.id_encargado} value={encargado.id_encargado}>
                                                    {encargado.nombre_encargado}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Ayudante */}
                                    <div className="form-group">
                                        <label>Ayudante</label>
                                        <select className="form-control" value={ayudanteId} onChange={(e) => setAyudanteId(e.target.value)}>
                                            <option value="">Seleccione Ayudante</option>
                                            {filteredAyudantes.map(ayudante => (
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
                                            {centros && centros.map(centro => (
                                                <option key={centro.id} value={centro.id}>
                                                    {centro.nombre} - {centro.cliente}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    
                                    <div className="form-group">
                                        <label>Fecha Reclamo</label>
                                        <input type="date" className="form-control" value={fechaReclamo} onChange={(e) => setFechaReclamo(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha Inicio</label>
                                        <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha Término</label>
                                        <input type="date" className="form-control" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Área</label>
                                        <input type="text" className="form-control" value={area} onChange={(e) => setArea(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Prioridad</label>
                                        <select className="form-control" value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                                            <option value="">Seleccione Prioridad</option>
                                            <option value="Alta">Alta</option>
                                            <option value="Media">Media</option>
                                            <option value="Baja">Baja</option>
                                            <option value="Urgente">Urgente</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Estado</label>
                                        <select className="form-control" value={estadoActividad} onChange={(e) => setEstadoActividad(e.target.value)}>
                                            <option value="En progreso">En Progreso</option>
                                            <option value="Finalizado">Finalizado</option>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Cancelado">Cancelado</option>
                                        </select>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cerrar</button>
                                <button type="button" className="btn btn-primary" onClick={handleGuardarActividad}>Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialTrabajos;
