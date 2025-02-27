import React, { useState, useEffect } from 'react';
import { obtenerDatosFiltrados, obtenerClientesFiltro } from '../controllers/filtroControllers';

const HistorialCentros = () => {
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [clienteId, setClienteId] = useState('');
    const [datos, setDatos] = useState([]);
    const [serviciosAdicionales, setServiciosAdicionales] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Cargar clientes al montar el componente
    useEffect(() => {
        const cargarClientes = async () => {
            try {
                await obtenerClientesFiltro(setClientes, setError);
            } catch (err) {
                console.error('Error al cargar los clientes:', err);
                setError('Hubo un problema al cargar los clientes.');
            }
        };
        cargarClientes();
    }, []);

    const handleFiltrar = async () => {
        if (!fechaInicio || !fechaFin) {
            alert('Por favor, selecciona ambas fechas.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { resultados, servicios_adicionales } = await obtenerDatosFiltrados(
                fechaInicio,
                fechaFin,
                clienteId
            );
            setDatos(resultados);
            setServiciosAdicionales(servicios_adicionales);
        } catch (err) {
            setError('Hubo un error al filtrar los datos.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatearFechaConDia = (fecha) => {
        if (!fecha) return '';
        const fechaObj = new Date(fecha);
        fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
        const opciones = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
        return new Intl.DateTimeFormat('es-ES', opciones).format(fechaObj).replace(',', '');
    };

    const columnasPorTipo = {
        Traslados: [
            { key: 'id', label: 'ID' },
            { key: 'area', label: 'Área' },
            { key: 'nombre_centro', label: 'Centro' },
            { key: 'nombre_empresa', label: 'Empresa' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'fecha_inicio_monitoreo', label: 'Fecha de Monitoreo' },
            { key: 'centro_destino', label: 'Centro Destino' },
            { key: 'tipo_traslado', label: 'Tipo de Traslado' },
            { key: 'observacion', label: 'Observación' },
            { key: 'documento', label: 'Documento' },
        ],
        Ceses: [
            { key: 'id', label: 'ID' },
            { key: 'area', label: 'Área' },
            { key: 'nombre_centro', label: 'Centro' },
            { key: 'nombre_empresa', label: 'Empresa' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'observacion', label: 'Observación' },
            { key: 'documento', label: 'Documento' },
        ],
        Instalaciones: [
            { key: 'id', label: 'ID' },
            { key: 'area', label: 'Área' },
            { key: 'nombre_centro', label: 'Centro' },
            { key: 'nombre_empresa', label: 'Empresa' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'fecha_inicio_monitoreo', label: 'Fecha de Monitoreo' },
            { key: 'observacion', label: 'Observación' },
            { key: 'documento', label: 'Documento' },
        ],
        Default: [
            { key: 'id', label: 'ID' },
            { key: 'area', label: 'Área' },
            { key: 'nombre_centro', label: 'Centro' },
            { key: 'nombre_empresa', label: 'Empresa' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'observacion', label: 'Observación' },
            { key: 'documento', label: 'Documento' },
        ],
    };

    const datosAgrupados = datos.reduce((acc, item) => {
        if (!acc[item.tipo]) acc[item.tipo] = [];
        acc[item.tipo].push(item);
        return acc;
    }, {});

    return (
        <div className="container mt-5">
            <h2>Filtro de Datos</h2>

            {/* Filtros */}
            <div className="mb-4">
                <label>Fecha Inicio:</label>
                <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="form-control mb-3"
                />
                <label>Fecha Fin:</label>
                <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="form-control mb-3"
                />
                <label>Cliente:</label>
                <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="form-control mb-3"
                >
                    <option value="">Todos los clientes</option>
                    {clientes.map((cliente) => (
                        <option key={cliente.id_cliente} value={cliente.id_cliente}>
                            {cliente.nombre}
                        </option>
                    ))}
                </select>
                <button className="btn btn-primary" onClick={handleFiltrar}>
                    Filtrar
                </button>
            </div>

            {/* Mensaje de Carga */}
            {loading && <p>Cargando datos...</p>}

            {/* Mostrar Error */}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {/* Mostrar Resultados */}
            {Object.entries(datosAgrupados).map(([tipo, items]) => {
                const columnas = columnasPorTipo[tipo] || columnasPorTipo.Default;
                return (
                    <div className="card mb-4" key={tipo}>
                        <div className="card-header">
                            <h3>{tipo}</h3>
                        </div>
                        <div className="card-body table-responsive">
                            <table className="table table-bordered">
                                <thead>
                                    <tr>
                                        {columnas.map((col) => (
                                            <th key={col.key}>{col.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            {columnas.map((col) => (
                                                <td key={col.key}>
                                                    {col.key === 'documento' && item[col.key] ? (
                                                        <a
                                                            href={item[col.key]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            Ver Documento
                                                        </a>
                                                         ) : col.key === 'fecha' || col.key === 'fecha_inicio_monitoreo' ? (
                                                            formatearFechaConDia(item[col.key])
                                                    ) : (
                                                        item[col.key] || '-'
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {/* Mostrar Servicios Adicionales */}
            <div className="card mt-4">
                <div className="card-header">
                    <h3>Servicios Adicionales</h3>
                </div>
                <div className="card-body table-responsive">
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Empresa</th>
                                <th>Fecha</th>
                                <th>Documento</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {serviciosAdicionales.map((servicio, index) => (
                                <tr key={index}>
                                    <td>{servicio.id}</td>
                                    <td>{servicio.nombre_empresa}</td>
                                    <td>{formatearFechaConDia(servicio.fecha)}</td>
                                    <td>
                                        {servicio.documento ? (
                                            <a href={servicio.documento} target="_blank" rel="noopener noreferrer">
                                                Ver Documento
                                            </a>
                                        ) : (
                                            'Sin documento'
                                        )}
                                    </td>
                                    <td>{servicio.observacion || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistorialCentros;
