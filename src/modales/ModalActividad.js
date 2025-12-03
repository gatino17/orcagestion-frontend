import React, { useState, useEffect } from 'react';

import { guardarLevantamientoActas, 
         guardarInventarioActas,
         guardarCeseActas,
         guardarRetiroActas,
         guardarTrasladoActas,
         guardarInstalacionActas,
         guardarMantencionActas,
         cargarMantencionesActas,
         verDocumentoMantencionActas

     } from '../controllers/actasControllers';
import { 
      eliminarLevantamientosPorCentro ,
      eliminarInventariosPorCentro,
      eliminarCesesPorCentro,
      eliminarRetirosPorCentro,
      eliminarTrasladosPorCentro,
      eliminarInstalacionesPorCentro,
      eliminarMantencionActas  
} from '../controllers/actasControllers';

import { cargarCentrosActas } from '../controllers/actasControllers';



function ModalActividad({ actividad, onClose, recargarDatos, tipoInicial = 'levantamiento' }) {
    const [tipoActividad, setTipoActividad] = useState('levantamiento');
    const [fecha, setFecha] = useState('');
    const [documento, setDocumento] = useState(null);

    const [observacion, setObservacion] = useState('');
    const [precio, setPrecio] = useState('');

    const [centrosDisponibles, setCentrosDisponibles] = useState([]);
    const [centroDestino, setCentroDestino] = useState('');
    const [fechaMonitoreo, setFechaMonitoreo] = useState('');
    const [tipoTraslado, setTipoTraslado] = useState('');
    const [errorFecha, setErrorFecha] = useState(false);


    const [mantenciones, setMantenciones] = useState([]);
    const [fechaMantencion, setFechaMantencion] = useState('');
    const [documentoMantencion, setDocumentoMantencion] = useState(null);
    const [responsableMantencion, setResponsableMantencion] = useState('');
    const [observacionMantencion, setObservacionMantencion] = useState('');

    const [errorFechaMantencion, setErrorFechaMantencion] = useState(false);
    const [errorDocumentoMantencion, setErrorDocumentoMantencion] = useState(false);
    const [errorResponsableMantencion, setErrorResponsableMantencion] = useState(false);
    const [errorObservacionMantencion, setErrorObservacionMantencion] = useState(false);

    


    const formatDateInput = (value) => {
        if (!value) return '';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value.slice(0, 10);
        }
        parsed.setMinutes(parsed.getMinutes() + parsed.getTimezoneOffset());
        return parsed.toISOString().split('T')[0];
    };

    useEffect(() => {
        setTipoActividad(tipoInicial || 'levantamiento');
    }, [tipoInicial]);

    useEffect(() => {
        if (!actividad || tipoActividad !== 'instalacion') return;
        if (!fecha) {
            const fechaCentro = actividad.instalacion_fecha || actividad.centro_fecha_instalacion || actividad.fecha_instalacion;
            if (fechaCentro) {
                setFecha(formatDateInput(fechaCentro));
            }
        }
        if (!fechaMonitoreo && actividad.inicio_monitoreo) {
            setFechaMonitoreo(formatDateInput(actividad.inicio_monitoreo));
        }
    }, [actividad, tipoActividad]);

    const handleGuardar = async () => {
        // Verificar si el campo de fecha está vacío para los tipos de actividad que lo requieren
        if ((tipoActividad === 'levantamiento' || tipoActividad === 'cese' || tipoActividad === 'retiro' || tipoActividad === 'traslado' || tipoActividad === 'instalacion') && !fecha) {
            setErrorFecha(true);  // Activar el error para mostrar en el campo
            return;  // Salir de la función para evitar que se cierre el modal
        }

        setErrorFecha(false);  // Resetear el error si la fecha está completa
        
        if (!actividad || !actividad.id_centro) {
            console.error("Actividad no válida o falta id_centro:", actividad);
            alert("No se puede guardar porque falta el ID del centro.");
            return;
        }
    
        const formData = new FormData();
        formData.append('centro_id', actividad.id_centro);  // Asegúrate que es 'actividad', no 'actividadSeleccionada'
    
        if (tipoActividad === 'levantamiento') {
            if (fecha) formData.append('fecha_levantamiento', fecha);
            if (documento) formData.append('documento_asociado', documento);
            await guardarLevantamientoActas(formData);
        } else if (tipoActividad === 'inventario') {
            if (documento) formData.append('documento', documento);
            await guardarInventarioActas(formData);
        } else if (tipoActividad === 'cese') {
            if (fecha) formData.append('fecha_cese', fecha);
            if (documento) formData.append('documento_cese', documento);
            await guardarCeseActas(formData);  // Guardar cese
        } else if (tipoActividad === 'retiro') {
            if (fecha) formData.append('fecha_de_retiro', fecha);
            if (documento) formData.append('documento', documento);
            if (observacion) formData.append('observacion', observacion);
            if (precio) formData.append('precio', precio);
            await guardarRetiroActas(formData);
        } else if (tipoActividad === 'traslado') {
            if (fecha) formData.append('fecha_traslado', fecha);
            if (fechaMonitoreo) formData.append('fecha_monitoreo', fechaMonitoreo);
            if (tipoTraslado) formData.append('tipo_traslado', tipoTraslado);
            if (documento) formData.append('documento_asociado', documento);
            if (observacion) formData.append('observacion', observacion);
            formData.append('centro_origen_id', actividad.id_centro);  // Centro de origen es el actual
            formData.append('centro_destino_id', centroDestino);       // Centro de destino seleccionado
            await guardarTrasladoActas(formData);
        } else if (tipoActividad === 'instalacion') {
            if (fecha) formData.append('fecha_instalacion', fecha);  // ➤ FECHA DE INSTALACIÓN
            if (fechaMonitoreo) formData.append('inicio_monitoreo', fechaMonitoreo);  // ➤ FECHA DE MONITOREO
            if (documento) formData.append('documento_acta', documento);
            if (observacion) formData.append('observacion', observacion);
            await guardarInstalacionActas(formData);  // ➤ GUARDAR INSTALACIÓN
        }
        
    
        alert('Actividad guardada exitosamente');
        recargarDatos();  // Recarga la lista de actividades
        onClose();  // Cierra el modal
    };
    
    
    
    const handleEliminar = async () => {
        if (tipoActividad === 'levantamiento') {
            // Asegúrate de que esta condición está revisando id_centro y no id_levantamiento
            if (!actividad.id_centro) {
                alert('No se encontró el ID del centro para eliminar los levantamientos.');
                return;
            }
            await eliminarLevantamientosPorCentro(actividad.id_centro);  // Eliminar todos los levantamientos del centro
        } else if (tipoActividad === 'inventario') {
            if (!actividad.id_centro) {
                alert('No se encontró el ID del inventario para eliminar.');
                return;
            }
            await eliminarInventariosPorCentro(actividad.id_centro);
        } else if (tipoActividad === 'cese') {
            await eliminarCesesPorCentro(actividad.id_centro);  // Eliminar ceses
        } else if (tipoActividad === 'retiro') {
            await eliminarRetirosPorCentro(actividad.id_centro);
        } else if (tipoActividad === 'traslado') {
            await eliminarTrasladosPorCentro(actividad.id_centro);
        } else if (tipoActividad === 'instalacion') {
            await eliminarInstalacionesPorCentro(actividad.id_centro);  // ➤ ELIMINAR INSTALACIÓN
        }
        
    
        alert('Actividad eliminada exitosamente');
        recargarDatos(); 
        onClose();
    };
    
    // Agregar nueva mantención
    const handleAgregarMantencion = async () => {
        let hasError = false;
    
        // Validaciones para cada campo
        if (!fechaMantencion) {
            setErrorFechaMantencion(true);
            hasError = true;
        } else {
            setErrorFechaMantencion(false);
        }
    
        if (!documentoMantencion) {
            setErrorDocumentoMantencion(true);
            hasError = true;
        } else {
            setErrorDocumentoMantencion(false);
        }
    
        if (!responsableMantencion) {
            setErrorResponsableMantencion(true);
            hasError = true;
        } else {
            setErrorResponsableMantencion(false);
        }
    
        if (!observacionMantencion) {
            setErrorObservacionMantencion(true);
            hasError = true;
        } else {
            setErrorObservacionMantencion(false);
        }
    
        // Si hay algún error, no enviamos la solicitud
        if (hasError) {
            alert("Todos los campos son obligatorios.");
            return;
        }
    
        try {
            const formData = new FormData();
            formData.append('centro_id', actividad.id_centro);
            formData.append('fecha_mantencion', fechaMantencion);
            formData.append('documento_mantencion', documentoMantencion);
            formData.append('responsable', responsableMantencion);
            formData.append('observacion', observacionMantencion);
    
            await guardarMantencionActas(formData);
    
            alert("Mantención agregada exitosamente.");
    
            // Limpia los campos después de agregar
            setFechaMantencion('');
            setDocumentoMantencion(null);
            setResponsableMantencion('');
            setObservacionMantencion('');
    
            // Recargar datos y cerrar modal
            recargarDatos();
            onClose();
        } catch (error) {
            console.error("Error al agregar la mantención:", error);
            alert("Hubo un error al agregar la mantención.");
        }
    };
    
    
    

    // Eliminar una mantención
    const handleEliminarMantencion = async (idMantencion) => {
        try {
            await eliminarMantencionActas(idMantencion);  // Elimina la mantención en la base de datos
            alert("Mantención eliminada exitosamente.");
            
            recargarDatos(); // Recarga la lista de actividades para actualizar la tabla
            onClose(); // Cierra el modal
        } catch (error) {
            console.error("Error al eliminar la mantención:", error);
            alert("Hubo un error al eliminar la mantención.");
        }
    };
    

    useEffect(() => {
        if (tipoActividad === 'traslado') {
            const cargarCentros = async () => {
                await cargarCentrosActas(setCentrosDisponibles);
                
            };
            cargarCentros();
        }
    }, [tipoActividad]);
    
    useEffect(() => {
        if (tipoActividad === 'mantencion') {
            cargarMantencionesActas(setMantenciones, actividad.id_centro);
        }
    }, [tipoActividad, actividad.id_centro]);
    

    return (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Editar/Agregar Actividad</h5>
                        <button type="button" className="close" onClick={onClose}>
                            <span>&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Tipo de Actividad</label>
                            <select 
                                className="form-control"
                                value={tipoActividad}
                                onChange={(e) => setTipoActividad(e.target.value)}
                            >
                                <option value="levantamiento">Levantamiento</option>
                                <option value="instalacion">Instalación</option> 
                                <option value="mantencion">Mantencion</option>
                                <option value="inventario">Inventario</option>
                                <option value="cese">Cese</option>
                                <option value="retiro">Retiro</option>
                                <option value="traslado">Traslado</option>
                                
                                {/* Aquí agregaremos los otros tipos más adelante */}
                            </select>
                        </div>

                        {/* Mostrar campos según el tipo de actividad */}
                        {(tipoActividad === 'levantamiento' || tipoActividad === 'cese' || tipoActividad === 'retiro' || tipoActividad === 'traslado') && (
                            <div className="form-group">
                                <label>Fecha</label>
                                <input 
                                    type="date" 
                                    className={`form-control ${errorFecha ? 'is-invalid' : ''}`}  // Agrega la clase 'is-invalid' si hay error
                                    value={fecha} 
                                    onChange={(e) => {
                                        setFecha(e.target.value); 
                                        if (e.target.value) setErrorFecha(false);  // Limpiar el error cuando el campo se llena
                                    }} 
                                    required 
                                />
                                {errorFecha && <small className="text-danger">Este campo es obligatorio.</small>}  {/* Mensaje de error */}
                            </div>
                        )}

                        {/* campo documento formulario general para las demas actividades */}
                        {tipoActividad !== 'mantencion' && (
                            <div className="form-group">
                                <label>Documento General</label>
                                <input 
                                    type="file" 
                                    className="form-control" 
                                    onChange={(e) => setDocumento(e.target.files[0])} 
                                    required 
                                />
                            </div>
                        )}


                           {/* Mostrar campos específicos para Retiro */}
                        {tipoActividad === 'retiro' && (
                            <>
                                <div className="form-group">
                                    <label>Observación</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={observacion} 
                                        onChange={(e) => setObservacion(e.target.value)} 
                                        placeholder="Ingrese una observación"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Precio</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={precio} 
                                        onChange={(e) => setPrecio(e.target.value)} 
                                        placeholder="Ingrese el precio"
                                    />
                                </div>
                            </>
                        )}

                        {/* Mostrar campos específicos para traslado */}
                        {tipoActividad === 'traslado' && (
                            <>
                                <div className="form-group">
                                    <label>Centro de Origen</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={actividad.nombre_centro || ''}  // Mostrar el nombre del centro actual
                                        disabled 
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Centro de Destino</label>
                                    <select 
                                        className="form-control"
                                        value={centroDestino}
                                        onChange={(e) => setCentroDestino(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccione un centro de destino</option>
                                        {Array.isArray(centrosDisponibles) && centrosDisponibles.length > 0 ? (
                                            centrosDisponibles.map((centro) => (
                                                <option key={centro.id} value={centro.id}>
                                                    {centro.nombre}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">No hay centros disponibles</option>
                                        )}
                                    </select>

                                </div>

                                <div className="form-group">
                                    <label>Fecha de Monitoreo</label>
                                    <input 
                                        type="date" 
                                        className="form-control" 
                                        value={fechaMonitoreo} 
                                        onChange={(e) => setFechaMonitoreo(e.target.value)} 
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Tipo de Traslado</label>
                                    <select 
                                        className="form-control"
                                        value={tipoTraslado}
                                        onChange={(e) => setTipoTraslado(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccione el tipo de traslado</option>
                                        <option value="Interno">Interno</option>
                                        <option value="Externo">Reapuntamiento</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Observación</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={observacion} 
                                        onChange={(e) => setObservacion(e.target.value)} 
                                        placeholder="Ingrese una observación"
                                    />
                                </div>
                            </>
                        )}

                          {/* Mostrar campos específicos para instalaciones */}
                        {tipoActividad === 'instalacion' && (
                        <>
                            <div className="form-group">
                                <label>Fecha de Instalación</label>
                                <input 
                                    type="date" 
                                    className={`form-control ${errorFecha ? 'is-invalid' : ''}`}
                                    value={fecha}
                                    onChange={(e) => {
                                        setFecha(e.target.value);
                                        if (e.target.value) setErrorFecha(false);
                                    }}
                                    required
                                />
                                {errorFecha && <small className="text-danger">Este campo es obligatorio.</small>}
                            </div>

                            <div className="form-group">
                                <label>Inicio de Monitoreo</label>
                                <input 
                                    type="date" 
                                    className="form-control"
                                    value={fechaMonitoreo}
                                    onChange={(e) => setFechaMonitoreo(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Observación</label>
                                <input 
                                    type="text" 
                                    className="form-control"
                                    value={observacion}
                                    onChange={(e) => setObservacion(e.target.value)}
                                    placeholder="Ingrese una observación"
                                />
                            </div>
                        </>
                    )}

                    {/* Mostrar campos específicos para mantenciones */}
                    {tipoActividad === 'mantencion' && (
                        <>
                            <div className="form-group">
                                <label>Fecha de Mantención</label>
                                <input 
                                    type="date" 
                                    className={`form-control ${errorFechaMantencion ? 'is-invalid' : ''}`}
                                    value={fechaMantencion}
                                    onChange={(e) => {
                                        setFechaMantencion(e.target.value);
                                        if (e.target.value) setErrorFechaMantencion(false);
                                    }}
                                />
                                {errorFechaMantencion && <small className="text-danger">Este campo es obligatorio.</small>}
                            </div>

                            <div className="form-group">
                                <label>Responsable</label>
                                <input
                                    type="text"
                                    className={`form-control ${errorResponsableMantencion ? 'is-invalid' : ''}`}
                                    value={responsableMantencion}
                                    onChange={(e) => {
                                        setResponsableMantencion(e.target.value);
                                        if (e.target.value) setErrorResponsableMantencion(false);
                                    }}
                                />
                                {errorResponsableMantencion && <small className="text-danger">Este campo es obligatorio.</small>}
                            </div>

                            <div className="form-group">
                                <label>Observación</label>
                                <textarea
                                    className={`form-control ${errorObservacionMantencion ? 'is-invalid' : ''}`}
                                    value={observacionMantencion}
                                    onChange={(e) => {
                                        setObservacionMantencion(e.target.value);
                                        if (e.target.value) setErrorObservacionMantencion(false);
                                    }}
                                ></textarea>
                                {errorObservacionMantencion && <small className="text-danger">Este campo es obligatorio.</small>}
                            </div>

                            <div className="form-group">
                                <label>Documento</label>
                                <input 
                                    type="file" 
                                    className={`form-control ${errorDocumentoMantencion ? 'is-invalid' : ''}`} 
                                    onChange={(e) => {
                                        setDocumentoMantencion(e.target.files[0]);
                                        if (e.target.files.length > 0) setErrorDocumentoMantencion(false);
                                    }} 
                                />
                                {errorDocumentoMantencion && <small className="text-danger">Debes subir un documento.</small>}
                            </div>

                            <button className="btn btn-success" onClick={handleAgregarMantencion}>
                                <i className="fas fa-plus"></i> Agregar Mantención
                            </button>

                            <h5 className="mt-3">Lista de Mantenciones</h5>
                            <ul className="list-group">
                                {mantenciones.map((mantencion, index) => (
                                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Fecha:</strong> {mantencion.fecha_mantencion} <br />
                                            <strong>Responsable:</strong> {mantencion.responsable} <br />
                                            <strong>Observación:</strong> {mantencion.observacion}
                                        </div>
                                        <div>
                                            {mantencion.documento_mantencion ? (
                                                <button 
                                                    className="btn btn-info btn-sm mr-2" 
                                                    onClick={() => verDocumentoMantencionActas(mantencion.id_mantencion)}
                                                >
                                                    <i className="fas fa-eye"></i> Ver Documento
                                                </button>
                                            ) : (
                                                <span style={{ color: 'red', fontWeight: 'bold' }}>No Disponible</span>
                                            )}
                                            <button 
                                                className="btn btn-danger btn-sm" 
                                                onClick={() => handleEliminarMantencion(mantencion.id_mantencion)}
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>



                        </>
                    )} 

                   
       
         </div> 


                    <div className="modal-footer">
                        {tipoActividad === 'levantamiento' && actividad.levantamiento_documento && (
                            <>
                                
                                <button type="button" className="btn btn-danger" onClick={handleEliminar}><i className="fas fa-trash-alt">Levantamiento</i></button>
                            </>
                        )}

                        {tipoActividad === 'inventario' && actividad.inventario_documento && (
                            <>
                                
                                <button type="button" className="btn btn-danger" onClick={handleEliminar}><i className="fas fa-trash-alt"> inventario</i></button>
                            </>
                        )}

                        {tipoActividad === 'cese' && actividad.cese_documento && (
                            <button type="button" className="btn btn-danger" onClick={handleEliminar}>
                                <i className="fas fa-trash-alt"> Cese</i>
                            </button>
                        )}

                        {tipoActividad === 'retiro' && actividad.retiro_documento && (
                            <button type="button" className="btn btn-danger" onClick={handleEliminar}>
                                <i className="fas fa-trash-alt"> Retiro</i>
                            </button>
                        )}

                        {tipoActividad === 'traslado' && actividad.traslado_documento && (
                            <button type="button" className="btn btn-danger" onClick={handleEliminar}>
                                <i className="fas fa-trash-alt"> Traslado</i>
                            </button>
                        )}
                         
                         {tipoActividad === 'instalacion' && actividad.instalacion_documento && (  // ➤ Cambiar 'traslado_documento' a 'instalacion_documento'
                            <button type="button" className="btn btn-danger" onClick={handleEliminar}>
                                <i className="fas fa-trash-alt"> Instalación</i>  {/* ➤ Cambiar texto de 'Traslado' a 'Instalación' */}
                            </button>
                        )}


                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                        <button type="button" className="btn btn-primary" onClick={handleGuardar}>Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ModalActividad;
