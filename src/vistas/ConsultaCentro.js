// ConsultaCentro.js
import { jwtDecode } from 'jwt-decode';
import React, { useState, useEffect } from 'react';
import {
    obtenerClientes,
    obtenerCentrosPorCliente,
    obtenerHistorialCentro,
    obtenerHistorialCentroPDF
} from '../controllers/consultaCentroControllers';



const ConsultaCentro = () => {
    const [clientes, setClientes] = useState([]);
    const [centros, setCentros] = useState([]);
    const [historial, setHistorial] = useState(null);
    const [error, setError] = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedCentro, setSelectedCentro] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [inventario, setInventario] = useState([]);

    const [rolUsuario, setRolUsuario] = useState("");

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                setRolUsuario(decodedToken.rol || ""); // Guarda el rol en el estado
            } catch (error) {
                console.error("Error al decodificar el token:", error);
            }
        }
    }, []);



    useEffect(() => {
        if (selectedCentro) {
            obtenerHistorialCentro(selectedCentro, (data) => {
                setInventario(data.inventario || []);
            }, setError);
        }
    }, [selectedCentro]);
    

    // Obtener lista de clientes al cargar el componente
    useEffect(() => {
        obtenerClientes(setClientes, setError);
    }, []);

    // Manejar selección de cliente
    const handleClienteChange = (clienteId) => {
        console.log("Cliente seleccionado:", clienteId); // Log para verificar clienteId
        setSelectedCliente(clienteId);
        setSelectedCentro(null);
        setHistorial(null);
        obtenerCentrosPorCliente(clienteId, setCentros, setError);
    };
    

    // Manejar selección de centro
    const handleCentroChange = (centroId) => {
        setSelectedCentro(centroId);
        obtenerHistorialCentro(centroId, setHistorial, setError);
    };
    //formatear fehca
    //const formatearFecha = (fecha) => {
   //     if (!fecha) return ''; // Si no hay fecha, retorna vacío
   //     const opciones = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
    //    return new Intl.DateTimeFormat('es-ES', opciones).format(new Date(fecha));
   // };
    const formatearFecha = (fecha) => {
        if (!fecha) return ''; // Si no hay fecha, retorna vacío
    
        // Aseguramos que la fecha no reste un día debido a la zona horaria
        const fechaObj = new Date(fecha);
        fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset()); // Ajusta la zona horaria
    
        // Opciones para formatear la fecha
        const opciones = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
        const fechaFormateada = new Intl.DateTimeFormat('es-ES', opciones).format(fechaObj);
    
        // Formatea el resultado final
        return fechaFormateada.replace(',', '').replace(/\//g, '/') + '.';
    };
    
    return (
        <div className="container-fluid">
            <h3>Consulta de Centros</h3>

            {error && <p className="error">{error}</p>}

            {/* Dropdown de clientes */}
            <div className="dropdown-container">
                <label htmlFor="clientes">Seleccionar Cliente:</label>
                <div className="col-md-6">
                    <select
                        id="clientes"
                        className="form-control"
                        value={selectedCliente || ''}
                        onChange={(e) => handleClienteChange(e.target.value)}
                    >
                        <option value="">Seleccione un cliente</option>
                        {clientes.map((cliente) => (
                            <option key={cliente.id_cliente} value={cliente.id_cliente}>
                                {cliente.nombre}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Dropdown de centros */}
            {selectedCliente && (
                <div className="mb-3">
                    <label htmlFor="centros" className="form-label">Seleccionar Centro:</label>
                    <div className="col-md-6">                   
                        <select
                            id="centros"
                            className="form-control"
                            value={selectedCentro || ''}
                            onChange={(e) => handleCentroChange(e.target.value)}
                        >
                            <option value="">Seleccione un centro </option>
                            {centros.map((centro) => {
                                console.log("Centro en dropdown:", centro); // Log para verificar cada centro
                                return (
                                    <option key={centro.id_centro} value={centro.id_centro}>
                                        {centro.nombre}
                                    </option>
                                );
                            })}
                        </select>
                     </div>
                </div>
            )}

            {/* Información del centro */}
            {selectedCentro && historial && (
                <div className="row mb-3">
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header bg-primary text-white">
                                <h4>Información del Centro</h4>
                            </div>
                            <div className="card-body">
                                <p><strong>Nombre:</strong> {historial.centro.nombre}</p>
                                <p><strong>Ubicación:</strong> {historial.centro.ubicacion}</p>
                                <p><strong>Estado:</strong> {historial.centro.estado}</p>
                                {rolUsuario === 'admin' && (
                                    <p><strong>Valor Contrato:</strong> {historial.centro.valor_contrato}</p>
                                )}

                                
                                <p><strong>Cantidad de Radares:</strong> {historial.centro.cantidad_radares || 0}</p>
                                <p><strong>Cantidad de Cámaras:</strong> {historial.centro.cantidad_camaras || 0}</p>
                                <p><strong>Base en Tierra:</strong> {historial.centro.base_tierra ? 'Sí' : 'No'}</p>
                              {/*  <p><strong>Fecha de Instalación:</strong> {formatearFecha(historial.centro.fecha_instalacion)}</p> */}
                              {/* <p><strong>Fecha de Activación:</strong> {formatearFecha(historial.centro.fecha_activacion)}</p> */}
                              {/* <p><strong>Fecha de Término:</strong> {formatearFecha(historial.centro.fecha_termino)}</p> */}
                                <p><strong>Correo del Centro:</strong> {historial.centro.correo_centro || 'No especificado'}</p>
                                <p><strong>Teléfono:</strong> {historial.centro.telefono || 'No especificado'}</p>
                                <div className="d-flex gap-2 mt-3">
                                <button className="btn btn-success" onClick={() => setShowModal(true)}>Ver IP</button>
                                
                                {inventario.length > 0 ? (
                                    <button
                                        className="btn btn-warning"
                                        onClick={() => {
                                            window.open(inventario[0].documento, "_blank");
                                        }}
                                    >
                                        <strong>Ver Inventario</strong>
                                    </button>
                                ) : (
                                    <button className="btn btn-secondary" disabled>No hay inventario</button>
                                )}

                                {/* Botón para descargar historial del centro en PDF */}
                                <button
                                    className="btn btn-danger d-flex align-items-center"
                                    style={{ fontWeight: "bold", marginLeft: "15px" }}  // Ajusta el valor según el espacio que necesites
                                    onClick={() => obtenerHistorialCentroPDF(selectedCentro)}
                                >
                                    <i className="fas fa-file-pdf me-2"></i> {/* Ícono de PDF */}
                                    
                                </button>

                            </div>

                               
                            </div>
                        </div>
                    </div>

                   {/* Historial del centro */}
                   <div className="col-md-6">
                        <div className="card">
                            <div className="card-header bg-success text-white">
                                <h4>Historial del Centro</h4>
                            </div>
                            <div className="card-body position-relative">
                                
                                <div className="timeline" style={{ paddingLeft: '80px' }}>
                                     {/* Levantamientos */}
                                    <div className="d-flex align-items-center mb-1">
                                        <div className="circle bg-primary text-white me-3 rounded-circle d-flex justify-content-center align-items-center"
                                         style={{ width: '10px', height: '10px', position: 'absolute',
                                            left: '-47px', 
                                            transform: 'translate(-50%, 0)'  }}>
                                            <i className="bi bi-file-earmark-text"></i>
                                        </div>
                                        <h4 className="mb-0 text-primary" style={{ marginLeft: '1rem' }}>Levantamientos</h4>
                                    </div>
                                    <div className="card mb-3 ms-5">
                                            <div className="card-body">
                                                {historial.historial.levantamientos.map((l) => (
                                                    <div key={l.id_levantamiento} className="mb-2">
                                                        <span className="badge bg-info">{formatearFecha(l.fecha_levantamiento)}</span>
                                                        <p>
                                                                {l.documento ? (
                                                                    <a href={l.documento} target="_blank" rel="noopener noreferrer">
                                                                    Ver Documento
                                                                </a>
                                                                ) : (
                                                                    'Sin documento asociado'
                                                                )}
                                                         </p>
                                                    </div>
                                                ))}
                                            </div>
                                    </div>
                                   
                                    {/* Instalaciones */}
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="circle bg-success text-white me-3 rounded-circle d-flex justify-content-center align-items-center" style={{ width: '10px', height: '10px', position: 'absolute',
                                            left: '-47px', 
                                            transform: 'translate(-50%, 0)'  }}>
                                            <i className="bi bi-tools"></i>
                                        </div>
                                        <h4 className="mb-0 text-success" style={{ marginLeft: '1rem' }}>Instalaciones</h4>
                                    </div>
                                    <div className="card mb-3 ms-5">
                                            <div className="card-body">
                                                {historial.historial.instalaciones.map((i) => (
                                                    <div key={i.id_instalacion} className="timeline-item mb-2">
                                                        <span className="badge bg-info">{formatearFecha(i.fecha_instalacion)}</span>
                                                         <p>
                                                                {i.documento ? (
                                                                    <a href={i.documento} target="_blank" rel="noopener noreferrer">
                                                                    Ver Documento
                                                                </a>
                                                                ) : (
                                                                    'Sin documento asociado'
                                                                )}
                                                         </p>
                                                        <p>
                                                            <strong>Observación:</strong> {i.observacion || 'Sin observación'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                    </div>
                                    {/* Mantenciones */}
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="circle bg-warning text-white me-3 rounded-circle d-flex justify-content-center align-items-center" style={{ width: '10px', height: '10px', position: 'absolute',
                                            left: '-47px', 
                                            transform: 'translate(-50%, 0)'  }}>
                                            <i className="bi bi-wrench"></i>
                                        </div>
                                        <h4 className="mb-0 text-warning" style={{ marginLeft: '1rem' }}>Mantenciones</h4>
                                    </div>
                                    <div className="card mb-3 ms-5">
                                            <div className="card-body">
                                                {historial.historial.mantenciones.map((m) => (
                                                    <div key={m.id_mantencion} className="timeline-item mb-2">
                                                        <span className="badge bg-info">{formatearFecha(m.fecha_mantencion)}</span>
                                                        <p>
                                                                {m.documento ? (
                                                                    <a href={m.documento} target="_blank" rel="noopener noreferrer">
                                                                    Ver Documento
                                                                </a>
                                                                ) : (
                                                                    'Sin documento asociado'
                                                                )}
                                                         </p>
                                                        <p>
                                                            <strong>Responsable:</strong> {m.responsable || 'No especificado'}
                                                        </p>
                                                        <p>
                                                            <strong>Observación:</strong> {m.observacion || 'Sin observación'}
                                                        </p>

                                                    </div>
                                                ))}
                                            </div>
                                    </div>      
                                    {/* Soporte */}
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="circle bg-warning text-white me-3 rounded-circle d-flex justify-content-center align-items-center" style={{ width: '10px', height: '10px', position: 'absolute',
                                            left: '-47px', 
                                            transform: 'translate(-50%, 0)'  }}>
                                            <i className="bi bi-wrench"></i>
                                        </div>
                                        <h4 className="mb-0 text-warning" style={{ marginLeft: '1rem' }}>Soportes</h4>
                                    </div>
                                    <div className="card mb-3 ms-5">
                                                        <div className="card-body">
                                                            {historial.historial.soportes.map((s) => (
                                                                <div key={s.id_soporte} className="timeline-item mb-2">
                                                                    <span className="badge bg-info">{formatearFecha(s.fecha_soporte)}</span>
                                                                    <p><strong>Problema:</strong> {s.problema || 'Sin problema especificado'}</p>
                                                                    <p><strong>Solución:</strong> {s.solucion || 'Sin solución especificada'}</p>
                                                                    <p><strong>Cambio de Equipo:</strong> {s.cambio_equipo ? 'Sí' : 'No'}</p>
                                                                    <p><strong>Equipo Cambiado:</strong> {s.equipo_cambiado || 'No especificado'}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                    </div>     
                                    {/* Traslados */}  
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="circle bg-danger text-white me-3 rounded-circle d-flex justify-content-center align-items-center" style={{ width: '10px', height: '10px', position: 'absolute',
                                            left: '-47px', 
                                            transform: 'translate(-50%, 0)'  }}>
                                            <i className="bi bi-truck"></i>
                                        </div>
                                        <h4 className="mb-0 text-danger" style={{ marginLeft: '1rem' }}>Traslados</h4>
                                    </div>
                                    <div className="card mb-3 ms-5">
                                            <div className="card-body">
                                                {historial.historial.traslados.map((t) => (
                                                    <div key={t.id_traslado} className="timeline-item mb-2">
                                                        <span className="badge bg-info">{formatearFecha(t.fecha_traslado)}</span>
                                                        <p>
                                                                {t.documento ? (
                                                                    <a href={t.documento} target="_blank" rel="noopener noreferrer">
                                                                    Ver Documento
                                                                </a>
                                                                ) : (
                                                                    'Sin documento asociado'
                                                                )}
                                                         </p>                                                        
                                                        <p>
                                                            <strong>Centro Destino:</strong> {t.centro_destino_nombre || 'No especificado'}
                                                        </p>
                                                        <p>
                                                            <strong>Observación:</strong> {t.observacion || 'Sin observación'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                    </div>
                                    {/* Ceses */}
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="circle bg-secondary text-white me-3 rounded-circle d-flex justify-content-center align-items-center" style={{ width: '10px', height: '10px', position: 'absolute',
                                            left: '-47px', 
                                            transform: 'translate(-50%, 0)'  }}>
                                            <i className="bi bi-x-circle"></i>
                                        </div>
                                        <h4 className="mb-0 text-secondary" style={{ marginLeft: '1rem' }}>Ceses</h4>
                                    </div>
                                    <div className="card mb-3 ms-5">
                                            <div className="card-body">
                                                {historial.historial.ceses.map((c) => (
                                                    <div key={c.id_cese} className="timeline-item mb-2">
                                                        <span className="badge bg-info">{formatearFecha(c.fecha_cese)}</span>
                                                         <p>
                                                                {c.documento ? (
                                                                    <a href={c.documento} target="_blank" rel="noopener noreferrer">
                                                                    Ver Documento
                                                                </a>
                                                                ) : (
                                                                    'Sin documento asociado'
                                                                )}
                                                         </p>
                                                    </div>
                                                ))}
                                            </div>
                                    </div>
                                    {/* Retiros */}
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="circle bg-dark text-white me-3 rounded-circle d-flex justify-content-center align-items-center" style={{ width: '10px', height: '10px', position: 'absolute',
                                            left: '-47px', 
                                            transform: 'translate(-50%, 0)'  }}>
                                            <i className="bi bi-archive"></i>
                                        </div>
                                        <h4 className="mb-0 text-dark" style={{ marginLeft: '1rem' }}>Retiros</h4>
                                    </div>
                                    <div className="card mb-3 ms-5">
                                            <div className="card-body">
                                                {historial.historial.retiros.map((r) => (
                                                    <div key={r.id_retiro} className="timeline-item mb-2">
                                                        <span className="badge bg-info">{formatearFecha(r.fecha_retiro)}</span>
                                                        <p>
                                                                {r.documento ? (
                                                                    <a href={r.documento} target="_blank" rel="noopener noreferrer">
                                                                    Ver Documento
                                                                </a>
                                                                ) : (
                                                                    'Sin documento asociado'
                                                                )}
                                                         </p>
                                                        <p>
                                                            <strong>Observación:</strong> {r.observacion || 'Sin observación'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                   </div>
                </div>
            )}

            {/* Modal para ver IPs */}
            {showModal && (
                <div className="modal" style={{ display: 'block' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Direcciones IP</h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => setShowModal(false)}
                                >
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {historial.equipos_ip.map((ip) => (
                                    <p key={ip.id_equipo}><strong>{ip.nombre}:</strong> {ip.ip}</p>
                                ))}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultaCentro;
