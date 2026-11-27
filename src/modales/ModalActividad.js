import React, { useState, useEffect } from 'react';

import {
         guardarInventarioActas,
         guardarCeseActas,
         guardarRetiroActas,
         guardarTrasladoActas,
         cargarActasEntregaSistema,
         guardarMantencionActas,
         cargarMantencionesActas,
         cargarMantencionesSistema,
         cargarPermisosTrabajoSistema,
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



import IntervencionesMantencion from '../components/IntervencionesMantencion';
import RegistroInstalacionManual from '../components/RegistroInstalacionManual';
import RegistroLevantamientoManual from '../components/RegistroLevantamientoManual';
import { useRef } from 'react';

function ModalActividad({ actividad, onClose, recargarDatos, tipoInicial = 'levantamiento' }) {
    const [tipoActividad, setTipoActividad] = useState(tipoInicial || 'levantamiento');
    const [fecha, setFecha] = useState('');
    const [documento, setDocumento] = useState(null);

    const [observacion, setObservacion] = useState('');
    const [precio, setPrecio] = useState('');

    const [centrosDisponibles, setCentrosDisponibles] = useState([]);
    const [centroDestino, setCentroDestino] = useState('');
    const [fechaMonitoreo, setFechaMonitoreo] = useState('');
    const [tipoTraslado, setTipoTraslado] = useState('');
    const [errorFecha, setErrorFecha] = useState(false);
    const [guardandoDocumento, setGuardandoDocumento] = useState(false);
    const [actasEntregaSistema, setActasEntregaSistema] = useState([]);
    const [permisosTrabajoSistema, setPermisosTrabajoSistema] = useState([]);


    const [mantenciones, setMantenciones] = useState([]);
    const [mantencionesSistema, setMantencionesSistema] = useState([]);
    const [fechaMantencion, setFechaMantencion] = useState('');
    const [documentoMantencion, setDocumentoMantencion] = useState(null);
    const [responsableMantencion, setResponsableMantencion] = useState('');
    const [observacionMantencion, setObservacionMantencion] = useState('');
    const [mostrarFormularioMantencion, setMostrarFormularioMantencion] = useState(false);
    const [soporteAdjunto, setSoporteAdjunto] = useState(null);
    const [guardandoMantencion, setGuardandoMantencion] = useState(false);
    const [errorGuardarMantencion, setErrorGuardarMantencion] = useState('');
    const [avisoMantencion, setAvisoMantencion] = useState('');
    const [revisionMantencion, setRevisionMantencion] = useState(0);
    const formularioMantencionRef = useRef(null);

    useEffect(() => {
        if (mostrarFormularioMantencion) {
            formularioMantencionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        }
    }, [mostrarFormularioMantencion, soporteAdjunto]);

    const abrirFormularioMantencion = (soporte = null) => {
        setSoporteAdjunto(soporte);
        setFechaMantencion('');
        setDocumentoMantencion(null);
        setResponsableMantencion('');
        setObservacionMantencion('');
        setErrorFechaMantencion(false);
        setErrorDocumentoMantencion(false);
        setErrorResponsableMantencion(false);
        setErrorObservacionMantencion(false);
        setErrorGuardarMantencion('');
        setAvisoMantencion('');
        setMostrarFormularioMantencion(true);
    };

    const [errorFechaMantencion, setErrorFechaMantencion] = useState(false);
    const [errorDocumentoMantencion, setErrorDocumentoMantencion] = useState(false);
    const [errorResponsableMantencion, setErrorResponsableMantencion] = useState(false);
    const [errorObservacionMantencion, setErrorObservacionMantencion] = useState(false);

    useEffect(() => {
        setMostrarFormularioMantencion(false);
        setSoporteAdjunto(null);
        setAvisoMantencion('');
    }, [actividad.id_centro, tipoActividad]);

    


    const formatDateInput = (value) => {
        if (!value) return '';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value.slice(0, 10);
        }
        parsed.setMinutes(parsed.getMinutes() + parsed.getTimezoneOffset());
        return parsed.toISOString().split('T')[0];
    };

    const formatDateDisplay = (value) => {
        if (!value) return '-';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return String(value);
        parsed.setMinutes(parsed.getMinutes() + parsed.getTimezoneOffset());
        return parsed.toLocaleDateString('es-CL');
    };

    useEffect(() => {
        setTipoActividad(tipoInicial || 'levantamiento');
    }, [tipoInicial]);

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
    
        if (tipoActividad === 'inventario') {
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
            await eliminarInstalacionesPorCentro(actividad.id_centro);
        }
        
    
        alert('Actividad eliminada exitosamente');
        recargarDatos(); 
        onClose();
    };
    
    // Agregar nueva mantención
    const handleAgregarMantencion = async () => {
        if (guardandoMantencion) return;
        setErrorFechaMantencion(!fechaMantencion);
        setErrorDocumentoMantencion(!documentoMantencion);
        setErrorResponsableMantencion(!responsableMantencion.trim());
        setErrorObservacionMantencion(!observacionMantencion.trim());
        if (!fechaMantencion || !documentoMantencion || !responsableMantencion.trim() || !observacionMantencion.trim()) {
            setErrorGuardarMantencion('Completa la fecha, el responsable, la observacion y adjunta el documento.');
            return;
        }
        setGuardandoMantencion(true);
        setErrorGuardarMantencion('');
        try {
            const formData = new FormData();
            formData.append('centro_id', actividad.id_centro);
            formData.append('fecha_mantencion', fechaMantencion);
            formData.append('documento_mantencion', documentoMantencion);
            formData.append('responsable', responsableMantencion.trim());
            formData.append('observacion', observacionMantencion.trim());
            if (soporteAdjunto) formData.append('soporte_id', soporteAdjunto.id_soporte);
            const resultado = await guardarMantencionActas(formData);
            if (!resultado?.success) throw resultado?.error || new Error('No se pudo guardar el documento.');
            setAvisoMantencion(soporteAdjunto
                ? `Documento guardado y vinculado al soporte #${soporteAdjunto.id_soporte}.`
                : 'Mantencion guardada sin soporte asociado.');
            setFechaMantencion('');
            setDocumentoMantencion(null);
            setResponsableMantencion('');
            setObservacionMantencion('');
            setMostrarFormularioMantencion(false);
            setSoporteAdjunto(null);
            setRevisionMantencion((valor) => valor + 1);
            cargarMantencionesActas(setMantenciones, actividad.id_centro);
            recargarDatos();
        } catch (error) {
            setErrorGuardarMantencion(error.response?.data?.error || 'No se pudo guardar el documento. Revisa los datos e intenta nuevamente.');
        } finally {
            setGuardandoMantencion(false);
        }
    };

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
        if (tipoActividad === 'instalacion') {
            cargarActasEntregaSistema(setActasEntregaSistema, actividad.id_centro);
            cargarPermisosTrabajoSistema(setPermisosTrabajoSistema, actividad.id_centro);
        }
    }, [tipoActividad, actividad.id_centro]);

    useEffect(() => {
        if (tipoActividad === 'mantencion') {
            cargarMantencionesActas(setMantenciones, actividad.id_centro);
            cargarMantencionesSistema(setMantencionesSistema, actividad.id_centro);
        }
    }, [tipoActividad, actividad.id_centro]);
    

    return (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Editar/Agregar Actividad</h5>
                        <button type="button" className="close" onClick={onClose} disabled={guardandoMantencion || guardandoDocumento}>
                            <span>&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Tipo de Actividad</label>
                            <select 
                                className="form-control"
                                value={tipoActividad}
                                disabled={guardandoMantencion || guardandoDocumento}
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
                        {tipoActividad === 'levantamiento' && <RegistroLevantamientoManual key={actividad.id_centro} actividad={actividad}
                            onSaved={recargarDatos} onBusyChange={setGuardandoDocumento} />}
                        {(tipoActividad === 'cese' || tipoActividad === 'retiro' || tipoActividad === 'traslado') && (
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
                        {tipoActividad !== 'mantencion' && tipoActividad !== 'instalacion' && tipoActividad !== 'levantamiento' && (
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
                            <RegistroInstalacionManual key={actividad.id_centro} actividad={actividad}
                                onSaved={recargarDatos} onBusyChange={setGuardandoDocumento} />
                            <div className="mt-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h5 className="mb-0">Actas sistema</h5>
                                    <span className="badge badge-primary">{actasEntregaSistema.length}</span>
                                </div>
                                <ul className="list-group">
                                    {actasEntregaSistema.length ? actasEntregaSistema.map((acta) => (
                                        <li key={`acta-sis-${acta.id_acta_entrega}`} className="list-group-item">
                                            <strong>Fecha:</strong> {formatDateDisplay(acta.fecha_registro)} <br />
                                            <strong>Técnico 1:</strong> {acta.tecnico_1 || '-'} <br />
                                            <strong>Técnico 2:</strong> {acta.tecnico_2 || '-'} <br />
                                            <strong>Tipo:</strong> {acta.tipo_instalacion || 'instalacion'}
                                        </li>
                                    )) : (
                                        <li className="list-group-item text-muted">Sin actas del sistema registradas.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="mt-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h5 className="mb-0">Permisos sistema</h5>
                                    <span className="badge badge-primary">{permisosTrabajoSistema.length}</span>
                                </div>
                                <ul className="list-group">
                                    {permisosTrabajoSistema.length ? permisosTrabajoSistema.map((permiso) => (
                                        <li key={`perm-sis-${permiso.id_permiso_trabajo}`} className="list-group-item">
                                            <strong>Fecha ingreso:</strong> {formatDateDisplay(permiso.fecha_ingreso)} <br />
                                            <strong>Fecha salida:</strong> {formatDateDisplay(permiso.fecha_salida)} <br />
                                            <strong>Técnico 1:</strong> {permiso.tecnico_1 || '-'} <br />
                                            <strong>Técnico 2:</strong> {permiso.tecnico_2 || '-'}
                                        </li>
                                    )) : (
                                        <li className="list-group-item text-muted">Sin permisos del sistema registrados.</li>
                                    )}
                                </ul>
                            </div>
                        </>
                    )}

                    {/* Mostrar campos específicos para mantenciones */}
                    {tipoActividad === 'mantencion' && (
                        <>
                            <IntervencionesMantencion centroId={actividad.id_centro} onChange={recargarDatos}
                                onAdjuntar={abrirFormularioMantencion} revision={revisionMantencion} bloqueado={guardandoMantencion || mostrarFormularioMantencion} />
                            {avisoMantencion && <p className="alert alert-success mt-3" role="status">{avisoMantencion}</p>}
                            {!mostrarFormularioMantencion && <button type="button" className="btn btn-outline-secondary mt-3"
                                onClick={() => abrirFormularioMantencion()}>Registrar mantencion sin soporte</button>}
                            {mostrarFormularioMantencion && <fieldset ref={formularioMantencionRef} disabled={guardandoMantencion || guardandoDocumento}
                                className="border rounded p-3 mt-3" aria-label="Adjuntar documento de mantencion">
                            <h5>{soporteAdjunto ? `Adjuntar documento - Soporte #${soporteAdjunto.id_soporte}` : 'Registrar mantencion sin soporte'}</h5>
                            <p className="text-muted">{soporteAdjunto
                                ? `El documento quedara asociado a este soporte: ${soporteAdjunto.problema}`
                                : 'Usa esta opcion solo para una mantencion que no tenga un soporte registrado.'}</p>
                            <div className="form-group">
                                <label htmlFor="fecha-documento-mantencion">Fecha de Mantención</label>
                                <input 
                                    type="date" 
                                    id="fecha-documento-mantencion"
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
                                <label htmlFor="responsable-documento-mantencion">Responsable</label>
                                <input
                                    type="text"
                                    id="responsable-documento-mantencion"
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
                                <label htmlFor="observacion-documento-mantencion">Observación</label>
                                <textarea
                                    id="observacion-documento-mantencion"
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
                                <label htmlFor="archivo-documento-mantencion">Documento</label>
                                <input 
                                    type="file" 
                                    id="archivo-documento-mantencion"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className={`form-control ${errorDocumentoMantencion ? 'is-invalid' : ''}`} 
                                    onChange={(e) => {
                                        setDocumentoMantencion(e.target.files[0]);
                                        if (e.target.files.length > 0) setErrorDocumentoMantencion(false);
                                    }} 
                                />
                                {errorDocumentoMantencion && <small className="text-danger">Debes subir un documento.</small>}
                            </div>

                            {errorGuardarMantencion && <p className="text-danger" role="alert">{errorGuardarMantencion}</p>}
                            <button type="button" className="btn btn-success mr-2" onClick={handleAgregarMantencion}>
                                {guardandoMantencion ? 'Guardando documento...' : soporteAdjunto ? 'Guardar y vincular documento' : 'Guardar mantencion sin soporte'}
                            </button>
                            <button type="button" className="btn btn-outline-secondary" onClick={() => setMostrarFormularioMantencion(false)}>Cancelar adjunto</button>
                            </fieldset>}

                            <div className="mt-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h5 className="mb-0">Documentos manuales de mantencion</h5>
                                    <span className="badge badge-success">{mantenciones.length}</span>
                                </div>
                                <ul className="list-group">
                                    {mantenciones.length ? mantenciones.map((mantencion, index) => (
                                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>Fecha:</strong> {formatDateDisplay(mantencion.fecha_mantencion)} <br />
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
                                    )) : (
                                        <li className="list-group-item text-muted">Sin mantenciones manuales registradas.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="mt-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h5 className="mb-0">Informes de mantencion por sistema</h5>
                                    <span className="badge badge-primary">{mantencionesSistema.length}</span>
                                </div>
                                <ul className="list-group">
                                    {mantencionesSistema.length ? mantencionesSistema.map((mantencion) => (
                                        <li key={`sys-${mantencion.id_mantencion_terreno}`} className="list-group-item">
                                            <div className="d-flex align-items-start justify-content-between flex-wrap">
                                                <div>
                                                    <strong>Fecha ingreso:</strong> {formatDateDisplay(mantencion.fecha_ingreso)} <br />
                                                    <strong>Fecha salida:</strong> {formatDateDisplay(mantencion.fecha_salida)} <br />
                                                    <strong>Técnico 1:</strong> {mantencion.tecnico_1 || '-'} <br />
                                                    <strong>Técnico 2:</strong> {mantencion.tecnico_2 || '-'} <br />
                                                    <strong>Descripción:</strong> {mantencion.descripcion_trabajo || '-'}
                                                </div>
                                                <span className="badge badge-primary mt-2 mt-md-0">Informe sistema</span>
                                            </div>
                                        </li>
                                    )) : (
                                        <li className="list-group-item text-muted">Sin mantenciones del sistema registradas.</li>
                                    )}
                                </ul>
                            </div>
                        </>
                    )}

                   
       
         </div> 


                    <div className="modal-footer">
                        {tipoActividad === 'levantamiento' && actividad.levantamiento_documento && (
                            <>
                                
                                <button type="button" className="btn btn-danger" onClick={handleEliminar} disabled={guardandoDocumento}><i className="fas fa-trash-alt" aria-hidden="true" /> Levantamiento</button>
                            </>
                        )}

                        {tipoActividad === 'inventario' && actividad.inventario_documento && (
                            <>
                                
                                <button type="button" className="btn btn-danger" onClick={handleEliminar} disabled={guardandoDocumento}><i className="fas fa-trash-alt"> inventario</i></button>
                            </>
                        )}

                        {tipoActividad === 'cese' && actividad.cese_documento && (
                            <button type="button" className="btn btn-danger" onClick={handleEliminar} disabled={guardandoDocumento}>
                                <i className="fas fa-trash-alt"> Cese</i>
                            </button>
                        )}

                        {tipoActividad === 'retiro' && actividad.retiro_documento && (
                            <button type="button" className="btn btn-danger" onClick={handleEliminar} disabled={guardandoDocumento}>
                                <i className="fas fa-trash-alt"> Retiro</i>
                            </button>
                        )}

                        {tipoActividad === 'traslado' && actividad.traslado_documento && (
                            <button type="button" className="btn btn-danger" onClick={handleEliminar} disabled={guardandoDocumento}>
                                <i className="fas fa-trash-alt"> Traslado</i>
                            </button>
                        )}
                         
                         {tipoActividad === 'instalacion' && actividad.instalacion_documento && (
                            <button type="button" className="btn btn-danger" onClick={handleEliminar} disabled={guardandoDocumento}>
                                <i className="fas fa-trash-alt"> Instalación</i>
                            </button>
                        )}


                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardandoMantencion || guardandoDocumento}>Cerrar</button>
                        {tipoActividad !== 'mantencion' && tipoActividad !== 'instalacion' && tipoActividad !== 'levantamiento' && <button type="button" className="btn btn-primary" onClick={handleGuardar}>Guardar</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ModalActividad;
