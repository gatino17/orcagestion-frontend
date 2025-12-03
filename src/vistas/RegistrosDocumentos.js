import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { cargarActas } from '../controllers/actasControllers';
import { agregarServicio, modificarServicio, borrarServicio } from '../controllers/servicios_adicionalesControllers';
import { cargarTodasRazonesSociales } from '../controllers/razonSocialControllers';
import { cargarClientes } from '../controllers/actasControllers';
import ModalActividad from '../modales/ModalActividad';
import './RegistrosDocumentos.css';



function RegistrosDocumentos() {

    // Estados
    const [actividades, setActividades] = useState([]);

    const [serviciosAdicionales, setServiciosAdicionales] = useState([]);
    const [servicioEditar, setServicioEditar] = useState(null);
    const [razonesSociales, setRazonesSociales] = useState([]);

    // Campos del formulario
    const [razonSocialId, setRazonSocialId] = useState('');
    const [fechaInstalacion, setFechaInstalacion] = useState('');
    const [observaciones, setObservacion] = useState('');
    const [documento, setDocumento] = useState(null);    
    const [errorFechaInstalacion, setErrorFechaInstalacion] = useState(false);

    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);  // Controla la visibilidad del modal
    const [actividadSeleccionada, setActividadSeleccionada] = useState(null);  // Almacena la actividad seleccionada
    const [tipoModalActividad, setTipoModalActividad] = useState('levantamiento');  // Controla qu seccin abrir en el modal

    const [clientes, setClientes] = useState([]); 

        
    const handleDetallesActividad = (actividad, tipo = 'levantamiento') => {
        console.log("Actividad seleccionada:", actividad);  // Verifica si el `id_centro` est presente
    
        if (!actividad || !actividad.id_centro) {
            console.error("Error: Actividad no vlida o falta `id_centro`", actividad);
            alert("No se puede abrir el modal porque faltan datos de la actividad.");
            return;  // Evita abrir el modal si no hay `id_centro`
        }
    
        const actividadConFechaCentro = tipo === 'instalacion'
            ? { ...actividad, centro_fecha_instalacion: actividad.centro_fecha_instalacion || actividad.instalacion_fecha }
            : actividad;

        setActividadSeleccionada(actividadConFechaCentro);
        setTipoModalActividad(tipo);
        setModalVisible(true);
    };
    
    const [filtros, setFiltros] = useState({
        id_cliente: '',
        nombre_centro: '',
    });

    useEffect(() => {
        cargarClientes(setClientes);
    }, []);
        
    
    // Funcin para cargar datos
    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);
            console.log("Filtros enviados:", filtros);
    
            await cargarActas(
                (datosActividades) => {
                    console.log("Actividades cargadas:", datosActividades);
    
                    //  Agrupar mantenciones por centro
                    const agrupado = datosActividades.reduce((acc, act) => {
                        const key = act.id_centro;
                        if (!acc[key]) {
                            acc[key] = {
                                ...act,
                                cantidad_mantenciones: 0,
                                ultima_fecha_mantencion: null
                            };
                        } else {
                            const target = acc[key];
                            const camposDocumento = [
                                'instalacion',
                                'levantamiento',
                                'traslado',
                                'cese',
                                'retiro',
                                'inventario'
                            ];
                            camposDocumento.forEach((campo) => {
                                const docKey = `${campo}_documento`;
                                const fechaKey = `${campo}_fecha`;
                                if (act[docKey]) {
                                    target[docKey] = act[docKey];
                                }
                                if (act[fechaKey]) {
                                    target[fechaKey] = act[fechaKey];
                                }
                            });
                        }

                        if (act.mantencion_fecha) {
                            const registro = acc[key];
                            registro.cantidad_mantenciones += 1;
                            if (!registro.ultima_fecha_mantencion || new Date(act.mantencion_fecha) > new Date(registro.ultima_fecha_mantencion)) {
                                registro.ultima_fecha_mantencion = act.mantencion_fecha;
                            }
                        }

                        return acc;
                    }, {});
    
                    //  Convertir en array para la tabla
                    setActividades(Object.values(agrupado));
                },
                (datosServicios) => {
                    console.log("Servicios adicionales cargados:", datosServicios);
                    setServiciosAdicionales(datosServicios);
                },
                filtros
            );
        } catch (error) {
            console.error('Error al cargar los datos:', error);
        } finally {
            setLoading(false);
        }
    }, [filtros]);
    
    

    // Cargar datos iniciales al montar el componente: Sin [cargarDatos]:
//Es como abrir la app de tareas y solo ver las tareas una vez. Si agregas una tarea nueva, no se actualiza automticamente.
//Con [cargarDatos]:
//Es como abrir la app de tareas y cada vez que agregas o editas una tarea, la app actualiza automticamente la lista para mostrarte los cambios.
    useEffect(() => {
        cargarDatos();
        cargarTodasRazonesSociales(setRazonesSociales);
    }, [cargarDatos]);

    // Manejar cambios en los filtros
    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        setFiltros((prevFiltros) => {
            const nuevosFiltros = { ...prevFiltros, [name]: value };

            if (name === "id_cliente") {
                console.log("Cliente seleccionado:", value);
                nuevosFiltros.nombre_centro = "";
            }

            return nuevosFiltros;
        });
    };


    const limpiarBusqueda = () => {
        console.log("Restableciendo filtros...");
        
        setFiltros({
            id_cliente: '',
            nombre_centro: '',
        });
    };
     

    //inicio servicios adicionales//
    // Guardar o actualizar un servicio
    const handleGuardarServicio = async () => {
        // Solo validar la fecha si es un nuevo servicio
        if (!servicioEditar && !fechaInstalacion) {
            setErrorFechaInstalacion(true);
            return;  // Detiene la funcion si falta la fecha en creacion
        }
        const datosServicio = {
            id_razon_social: razonSocialId || servicioEditar?.id_razon_social,  // Aseguramos que siempre haya un valor
            fecha_instalacion: fechaInstalacion || servicioEditar?.fecha_instalacion,
            observaciones: observaciones !== undefined ? observaciones : servicioEditar?.observacion,
            documento_asociado: documento || servicioEditar?.documento_asociado  // Asegura que si no hay nuevo documento, se mantenga el anterior
        };
        console.log('Datos enviados:', datosServicio);  // Para depuracion

        try {
            if (servicioEditar) {
                await modificarServicio(servicioEditar.id, datosServicio);
                alert('Servicio actualizado exitosamente');
            } else {
                await agregarServicio(datosServicio);
                alert('Servicio creado exitosamente');
            }

            await cargarDatos();  // Recargar datos
            window.$('#modalServicio').modal('hide');  // Cerrar modal
            resetForm();  // Limpiar formulario
        } catch (error) {
            alert('Error al guardar el servicio');
            console.error('Error al guardar el servicio:', error.response ? error.response.data : error);
        }
    };

    // Manejar la edicin de un servicio
    const handleEditarServicio = (servicio) => {
        setRazonSocialId(servicio.id_razon_social);
        setFechaInstalacion(servicio.fecha_instalacion); 
        setObservacion(servicio.observacion);
        setDocumento(null);  // Solo actualizar si suben uno nuevo
    
        setServicioEditar(servicio);  // Guardamos el servicio en edicin
    
        window.$('#modalServicio').modal('show');  // Abrimos el modal para editar
    };    

    // Manejar la eliminacin de un servicio
    const handleEliminarServicio = async (id) => {
        if (window.confirm('Ests seguro de que quieres eliminar este centro')) {
                        borrarServicio(id, () => {
                            cargarDatos();
                        });
                    }
                };

    const resetForm = () => {
                    setRazonSocialId('');
                    setFechaInstalacion('');
                    setObservacion('');
                    setDocumento(null);
                    setServicioEditar(null);  // Salir del modo de edicin
                    setErrorFechaInstalacion(false); 
    };     
    //final servicios adicionales//
    const formatearFechaConDia = (fecha) => {
        if (!fecha) return '-';  // Evita mostrar "undefined" si la fecha no existe
        const fechaObj = new Date(fecha);
        fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
    
        // Opciones para mostrar el da de la semana
        const opciones = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
        return new Intl.DateTimeFormat('es-ES', opciones).format(fechaObj).replace(',', '');
    };
    

    const getTextoFecha = (fecha) => (fecha ? formatearFechaConDia(fecha) : 'Sin registro');

    const renderDocumentoSection = (titulo, fecha, documento, icono, toneClass = '', onOpen) => (
        <div
            className={`registro-doc-section ${toneClass} ${onOpen ? 'registro-doc-section--clickable' : ''}`}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen}
        >
            <div className="registro-doc-section__header">
                <span className="registro-doc-section__icon">
                    <i className={`fas ${icono}`} />
                </span>
                <strong>{titulo}</strong>
            </div>
            <div className="registro-doc-section__content">
                <div>
                    <small>Fecha</small>
                    <p>{getTextoFecha(fecha)}</p>
                </div>
                <div>
                    <small>Documento</small>
                    {documento ? (
                        <a
                            href={documento}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="registro-doc-link registro-doc-link--icon"
                            title="Abrir documento"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <i className="fas fa-external-link-alt" />
                        </a>
                    ) : (
                        <span className="registro-doc-missing">Sin registro</span>
                    )}
                </div>
            </div>
        </div>
    );

    const renderMantencionesSection = (cantidad, ultimaFecha, onOpen) => (
        <div
            className={`registro-doc-section registro-doc-section--mantencion ${onOpen ? 'registro-doc-section--clickable' : ''}`}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen}
        >
            <div className="registro-doc-section__header">
                <span className="registro-doc-section__icon">
                    <i className="fas fa-tools" />
                </span>
                <strong>Mantenciones</strong>
            </div>
            <div className="registro-doc-section__content">
                <div>
                    <small>ltima fecha</small>
                    <p>{getTextoFecha(ultimaFecha)}</p>
                </div>
                <div>
                    <small>Cantidad</small>
                    <span className="registro-doc-badge">{cantidad || 0}</span>
                </div>
            </div>
        </div>
    );

    const crearColumnaDocumento = (titulo, campoFecha, campoDocumento, icono, toneClass = '', tipoActividad = 'levantamiento', obtenerFechaAlternativa = null) => ({
        name: titulo,
        selector: (row) => (campoFecha ? row[campoFecha] : row[campoDocumento]),
        cell: (row) =>
            renderDocumentoSection(
                titulo,
                obtenerFechaAlternativa ? obtenerFechaAlternativa(row) : (campoFecha ? row[campoFecha] : null),
                row[campoDocumento],
                icono,
                toneClass,
                () => handleDetallesActividad(row, tipoActividad)
            ),
        grow: 1.2,
        wrap: true,
        minWidth: '160px',
        allowOverflow: true,
    });

    const getEstadoBadgeClass = (estado) => {
        const normalized = (estado || '').toLowerCase();
        if (normalized === 'activo') return 'estado-badge estado-badge--activo';
        if (normalized === 'retiro' || normalized === 'retirado') return 'estado-badge estado-badge--retiro';
        if (normalized === 'cese') return 'estado-badge estado-badge--cese';
        if (normalized === 'traslado') return 'estado-badge estado-badge--traslado';
        return 'estado-badge';
    };

    // Columnas de las tablas
    const columnasActividades = [
        {
            name: 'Centro',
            selector: (row) => row.nombre_centro,
            sortable: true,
            grow: 1.5,
            wrap: true,
            minWidth: '100px',
            cell: (row) => (
                <div className="registro-centro-cell">
                    <strong>{row.nombre_centro || 'Sin centro'}</strong>
                    <span className={getEstadoBadgeClass(row.estado)}>{row.estado || 'Sin estado'}</span>
                </div>
            ),
        },
        {
            name: 'Ubicacion',
            selector: (row) => row.area,
            cell: (row) => (
                <div className="registro-area-ubicacion">
                    <div className="registro-area-ubicacion__line">
                        <i className="fas fa-layer-group"></i> {row.area || 'Sin dato'}
                    </div>
                    <div className="registro-area-ubicacion__line registro-area-ubicacion__line--muted">
                        <i className="fas fa-map-pin"></i> {row.ubicacion || 'Sin dato'}
                    </div>
                </div>
            ),
            sortable: true,
            grow: 0.1,
            wrap: true,
            minWidth: '130px',
        },
        {
            name: 'Mantenciones',
            selector: (row) => row.ultima_fecha_mantencion,
            cell: (row) => renderMantencionesSection(row.cantidad_mantenciones, row.ultima_fecha_mantencion, () => handleDetallesActividad(row, 'mantencion')),
            grow: 0.1,
            wrap: true,
            minWidth: '180px',
        },
        crearColumnaDocumento('Levantamiento', 'levantamiento_fecha', 'levantamiento_documento', 'fa-clipboard-list', 'registro-doc-section--levantamiento', 'levantamiento'),
        crearColumnaDocumento(
            'Instalacion',
            'instalacion_fecha',
            'instalacion_documento',
            'fa-hard-hat',
            'registro-doc-section--instalacion',
            'instalacion',
            (row) => row.instalacion_fecha || row.centro_fecha_instalacion
        ),
        crearColumnaDocumento('Traslado', 'traslado_fecha', 'traslado_documento', 'fa-truck', 'registro-doc-section--traslado', 'traslado'),
        crearColumnaDocumento('Cese', 'cese_fecha', 'cese_documento', 'fa-pause-circle', 'registro-doc-section--cese', 'cese'),
        crearColumnaDocumento('Retiro', 'retiro_fecha', 'retiro_documento', 'fa-times-circle', 'registro-doc-section--retiro', 'retiro'),
        crearColumnaDocumento('Inventario', null, 'inventario_documento', 'fa-box-open', 'registro-doc-section--inventario', 'inventario'),
    ];

    const columnasServiciosAdicionales = [
        { name: 'ID', selector: row => row.id, sortable: true }, 
        { name: 'Cliente', selector: row => row.nombre_cliente, sortable: true },
        { name: 'Razon social', selector: row => row.nombre_empresa, sortable: true },
        { name: 'Fecha Instalacion', selector: row => formatearFechaConDia(row.fecha), sortable: true },        
        {
            name: 'Documento',
            cell: row => (
                row.documento ? (
                    <a href={row.documento} target="_blank" rel="noopener noreferrer">Ver Documento</a>
                ) : 'No Disponible'
            )
        },
        { name: 'Observaciones', selector: row => row.observacion, wrap: true },
        {
            name: 'Acciones',
            cell: (row) => (
                <div>
                    <button className="btn btn-warning btn-sm mr-2" onClick={() => handleEditarServicio(row)}>
                        <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleEliminarServicio(row.id)}>
                        <i className="fas fa-trash-alt"></i>
                    </button>
                </div>
            ),
        },
        
    ];

    const resumenClientes = useMemo(() => {
        const mapa = new Map();

        actividades.forEach((act, index) => {
            const nombreCliente = act.cliente || act.nombre_cliente || 'Cliente sin nombre';
            const centroKey = act.id_centro || act.nombre_centro || `centro-${index}`;
            const estado = (act.estado || '').toLowerCase();

            if (!mapa.has(nombreCliente)) {
                mapa.set(nombreCliente, {
                    cliente: nombreCliente,
                    centros: new Set(),
                    totalCentros: 0,
                    activo: 0,
                    cese: 0,
                    traslado: 0,
                    retiro: 0,
                    otros: 0,
                });
            }

            const data = mapa.get(nombreCliente);
            if (!data.centros.has(centroKey)) {
                data.centros.add(centroKey);
                data.totalCentros += 1;
            }

            if (estado === 'activo') data.activo += 1;
            else if (estado === 'cese') data.cese += 1;
            else if (estado === 'traslado') data.traslado += 1;
            else if (estado === 'retiro' || estado === 'retirado') data.retiro += 1;
            else data.otros += 1;
        });

        return Array.from(mapa.values())
            .filter((cliente) => cliente.cliente !== 'Cliente sin nombre')
            .map(({ cliente, totalCentros, activo, cese, traslado, retiro }) => ({
                nombre: cliente,
                total: totalCentros,
                activo,
                cese,
                traslado,
                retiro,
            }));
    }, [actividades]);

    const clienteSeleccionadoNombre = useMemo(() => {
        if (!filtros.id_cliente) return null;
        const cliente = clientes.find((c) => String(c.id_cliente) === String(filtros.id_cliente));
        return cliente ? cliente.nombre : null;
    }, [clientes, filtros.id_cliente]);

    const centrosSinMantencion = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const pendientes = actividades.filter((act) => {
            if (clienteSeleccionadoNombre && act.nombre_cliente !== clienteSeleccionadoNombre) return false;
            if ((act.estado || '').toLowerCase() !== 'activo') return false;
            if (!act.ultima_fecha_mantencion) return true;
            const fecha = new Date(act.ultima_fecha_mantencion);
            if (Number.isNaN(fecha.getTime())) return true;
            return fecha.getFullYear() < currentYear;
        });

        const clientesMap = pendientes.reduce((acc, act) => {
            const cliente = act.nombre_cliente || act.cliente || 'Sin cliente';
            if (!acc[cliente]) {
                acc[cliente] = {
                    cliente,
                    centros: new Set(),
                };
            }
            acc[cliente].centros.add(act.nombre_centro || act.id_centro);
            return acc;
        }, {});

        const clientes = Object.values(clientesMap)
            .map(({ cliente, centros }) => ({
                cliente,
                totalCentros: centros.size,
            }))
            .sort((a, b) => b.totalCentros - a.totalCentros);

        return {
            totalCentros: pendientes.length,
            totalClientes: clientes.length,
            topClientes: clientes.slice(0, 4),
            centrosPendientes: pendientes
                .map((act) => {
                    const ultima = act.ultima_fecha_mantencion || act.instalacion_fecha || act.centro_fecha_instalacion;
                    let mesesSinMantencion = null;
                    if (ultima) {
                        const fechaUltima = new Date(ultima);
                        const now = new Date();
                        mesesSinMantencion =
                            (now.getFullYear() - fechaUltima.getFullYear()) * 12 +
                            (now.getMonth() - fechaUltima.getMonth());
                        if (mesesSinMantencion < 0) mesesSinMantencion = 0;
                    }
                    return {
                        nombre: act.nombre_centro || `Centro ${act.id_centro}`,
                        cliente: act.nombre_cliente || act.cliente || 'Sin cliente',
                        ultimaMantencion: act.ultima_fecha_mantencion,
                        fechaInstalacion: act.instalacion_fecha || act.centro_fecha_instalacion,
                        mesesSinMantencion
                    };
                })
                .filter((centro) => !clienteSeleccionadoNombre || centro.cliente === clienteSeleccionadoNombre)
        };
    }, [actividades, clienteSeleccionadoNombre]);


    const dataTableStyles = useMemo(
        () => ({
            headCells: {
                style: {
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                }
            },
            rows: {
                style: {
                    minHeight: '60px'
                }
            },
            cells: {
                style: {
                    wordBreak: 'break-word'
                }
            },
            table: {
                style: {
                    borderRadius: '18px',
                    overflow: 'hidden'
                }
            },
            pagination: {
                style: {
                    borderTop: '1px solid rgba(15,23,42,0.08)'
                }
            }
        }),
        []
    );

    return (
        <>
            <div className="registros-page container-fluid">
                <div className="card registros-hero">
                    <div className="registros-hero-content">
                        <span className="registros-hero-icon">
                            <i className="fas fa-folder-open" />
                        </span>
                        <div>
                            <p className="registros-hero-kicker">Panel documental</p>
                            <h2>Registros de documentos</h2>
                            <p className="registros-hero-subtitle">Consulta actas y servicios adicionales por cliente y centro.</p>
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            resetForm();
                            window.$('#modalServicio').modal('show');
                        }}
                    >
                        <i className="fas fa-plus" /> Nuevo servicio
                    </button>
                </div>

                <div className="card registros-summary">
                    <div className="registros-section-header">
                        <div className="registros-section-title">
                            <span className="section-icon">
                                <i className="fas fa-users"></i>
                            </span>
                            <div>
                                <h3>Resumen por cliente</h3>
                                <small>Distribucion de centros y estados</small>
                            </div>
                        </div>
                    </div>
                    <div className="registros-summary-grid">
                        {resumenClientes.length ? (
                            resumenClientes.map((cliente, index) => (
                                <div className="registros-summary-card" key={`${cliente.nombre}-${index}`}>
                                    <div className="summary-card-header">
                                        <h4>{cliente.nombre}</h4>
                                        <span className="badge bg-light text-dark">{cliente.total} centros</span>
                                    </div>
                                    <ul>
                                        <li><i className="fas fa-check text-success"></i> Activos: {cliente.activo}</li>
                                        <li><i className="fas fa-pause text-secondary"></i> En cese: {cliente.cese}</li>
                                        <li><i className="fas fa-truck text-warning"></i> Traslado: {cliente.traslado}</li>
                                        <li><i className="fas fa-times text-danger"></i> Retirados: {cliente.retiro}</li>
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <div className="registros-empty">No hay informacion de resumen disponible.</div>
                        )}
                </div>
            </div>

            <div className="card registros-summary">
                <div className="registros-section-header">
                    <div className="registros-section-title">
                        <span className="section-icon">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                        <div>
                            <h3>Mantenciones preventivas pendientes</h3>
                            <small>Año {new Date().getFullYear()}</small>
                        </div>
                    </div>
                </div>
                <div className="registros-summary-grid">
                    {centrosSinMantencion.totalCentros ? (
                        <>
                            <div className="registros-summary-card">
                                <div className="summary-card-header">
                                    <h4>Centros sin mantención</h4>
                                    <span className="badge bg-light text-dark">{centrosSinMantencion.totalCentros}</span>
                                </div>
                                <ul className="registros-centros-list">
                                    {centrosSinMantencion.centrosPendientes.map((centro) => (
                                        <li key={`${centro.cliente}-${centro.nombre}`}>
                                            <div className="centro-list-header">
                                                <i className="fas fa-map-marker-alt text-danger"></i> {centro.nombre}
                                            </div>
                                            <small className="text-muted">{centro.cliente}</small>
                                            {centro.ultimaMantencion && (
                                                <small className="d-block text-muted">
                                                    Última mantención: {formatearFechaConDia(centro.ultimaMantencion)}
                                                </small>
                                            )}
                                            <small className="d-block text-muted">
                                                Instalación: {centro.fechaInstalacion ? formatearFechaConDia(centro.fechaInstalacion) : 'Sin registro'}
                                            </small>
                                            <small className="d-block text-danger">
                                                {centro.mesesSinMantencion != null
                                                    ? `${centro.mesesSinMantencion} meses sin preventiva`
                                                    : 'Sin datos recientes'}
                                            </small>
                                        </li>
                                    ))}
                               </ul>
                               <p className="mb-0 text-muted">No registran mantenciones preventivas en el año actual.</p>
                           </div>
                            <div className="registros-summary-card">
                                <div className="summary-card-header">
                                    <h4>Clientes involucrados</h4>
                                    <span className="badge bg-light text-dark">{centrosSinMantencion.totalClientes}</span>
                                </div>
                                <ul>
                                    {centrosSinMantencion.topClientes.map((cliente) => (
                                        <li key={cliente.cliente}>
                                            <i className="fas fa-user-clock text-warning"></i> {cliente.cliente} · {cliente.totalCentros} centros
                                        </li>
                                    ))}
                                </ul>
                                {centrosSinMantencion.totalClientes > centrosSinMantencion.topClientes.length && (
                                    <small className="text-muted">
                                        +{centrosSinMantencion.totalClientes - centrosSinMantencion.topClientes.length} clientes adicionales
                                    </small>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="registros-empty">
                            Todos los centros tienen al menos una mantención preventiva registrada este año.
                        </div>
                    )}
                </div>
            </div>

            <div className="card registros-filters">
                    <div className="card-body registros-filter-grid">
                        <div>
                            <label>Cliente</label>
                            <select
                                className="form-control"
                                name="id_cliente"
                                value={filtros.id_cliente}
                                onChange={handleFilterChange}
                            >
                                <option value="">Seleccionar cliente</option>
                                {clientes.map((cliente) => (
                                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                                        {cliente.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>Centro</label>
                            <input
                                type="text"
                                className="form-control"
                                name="nombre_centro"
                                value={filtros.nombre_centro}
                                placeholder="Buscar por centro"
                                onChange={handleFilterChange}
                            />
                        </div>
                        <div className="filter-actions">
                            <label>&nbsp;</label>
                            <button className="btn btn-outline-primary w-100" onClick={limpiarBusqueda}>
                                <i className="fas fa-sync"></i> Limpiar filtros
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card registros-table-card">
                    <div className="card-header registros-section-header">
                        <div className="registros-section-title">
                            <span className="section-icon">
                                <i className="fas fa-clipboard-check" />
                            </span>
                            <div>
                                <h3>Actividades</h3>
                                <small>Documentos asociados por centro</small>
                            </div>
                        </div>
                    </div>
                    <div className="card-body">
                        <DataTable
                            columns={columnasActividades}
                            data={actividades}
                            progressPending={loading}
                            pagination
                            highlightOnHover
                            pointerOnHover
                            responsive
                            noDataComponent="No hay actividades disponibles"
                            paginationRowsPerPageOptions={[5, 10, 15, 20, 30]}
                            customStyles={dataTableStyles}
                        />
                    </div>
                </div>

                <div className="card registros-table-card mt-4">
                    <div className="card-header registros-section-header">
                        <div className="registros-section-title">
                            <span className="section-icon section-icon--servicios">
                                <i className="fas fa-toolbox" />
                            </span>
                            <div>
                                <h3>Servicios adicionales</h3>
                                <small>Instalaciones y observaciones</small>
                            </div>
                        </div>
                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => {
                                resetForm();
                                window.$('#modalServicio').modal('show');
                            }}
                        >
                            <i className="fas fa-plus" /> Agregar servicio
                        </button>
                    </div>
                    <div className="card-body">
                        <DataTable
                            columns={columnasServiciosAdicionales}
                            data={serviciosAdicionales}
                            progressPending={loading}
                            pagination
                            highlightOnHover
                            pointerOnHover
                            responsive
                            noDataComponent="No hay servicios adicionales disponibles"
                            paginationRowsPerPageOptions={[5, 10, 15, 20, 30]}
                            customStyles={dataTableStyles}
                        />
                    </div>
                </div>
            </div>

              {/* MODAL PARA AGREGAR O EDITAR SERVICIO ADICIONAL */}
              <div className="modal fade" id="modalServicio" tabIndex="-1" role="dialog" aria-labelledby="modalServicioLabel" aria-hidden="true">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title" id="modalServicioLabel">
                                    {servicioEditar ? 'Editar Servicio' : 'Crear Servicio'}
                                </h5>
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <form>
                                    <div className="form-group">
                                        <label>Razn Social</label>
                                        <select
                                                className="form-control"
                                                value={razonSocialId}  // Esto asegura que se seleccione la razn social correcta
                                                onChange={(e) => setRazonSocialId(e.target.value)}  // Permite cambios si el usuario selecciona otra
                                            >
                                                <option value="">Seleccione una razn social</option>  {/* Esta opcin solo aparece si no hay razn seleccionada */}
                                                {razonesSociales.map((razon) => (
                                                    <option key={razon.id_razon_social} value={String(razon.id_razon_social)}>
                                                        {razon.razon_social}
                                                    </option>
                                                ))}
                                            </select>
                                    </div>
                                    <div className="form-group">
                                    <label>
                                        Fecha de Instalacion {!servicioEditar && <span className="text-danger">*</span>} {/* Asterisco solo en creacion */}
                                    </label>
                                    <input
                                        type="date"
                                        className={`form-control ${errorFechaInstalacion ? 'is-invalid' : ''}`}
                                        value={fechaInstalacion}
                                        onChange={(e) => {
                                            setFechaInstalacion(e.target.value);
                                            if (e.target.value) setErrorFechaInstalacion(false);  // Quitar el error si el usuario llena el campo
                                        }}
                                        required={!servicioEditar}
                                    />
                                    {!servicioEditar && errorFechaInstalacion && (
                                        <small className="text-danger">La fecha de instalacin es obligatoria.</small>
                                    )}
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Observacin</label>
                                        <textarea
                                            className="form-control"
                                            value={observaciones}
                                            onChange={(e) => setObservacion(e.target.value)}
                                        ></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Documento</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            onChange={(e) => setDocumento(e.target.files[0])}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" data-dismiss="modal">
                                    Cerrar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleGuardarServicio}>
                                    {servicioEditar ? 'Actualizar Servicio' : 'Guardar Servicio'}
                                </button>
                            </div>
                        </div>
                    </div>
              </div>

              {/* MODAL PARA ACTIVIDADES */}
              {modalVisible && (
                    <ModalActividad
                        actividad={actividadSeleccionada}
                        onClose={() => setModalVisible(false)}
                        recargarDatos={cargarDatos}  // Aqu pasamos la funcin que recarga los datos
                        tipoInicial={tipoModalActividad}
                        onSave={async (datosActividad) => {
                            console.log("Datos a guardar:", datosActividad);
                            setModalVisible(false);  // Cerramos el modal despus de guardar
                        }}
                    />
                )}

        </>
    );
}

export default RegistrosDocumentos;
























