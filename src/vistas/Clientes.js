import React, { useEffect, useMemo, useState } from 'react';
import { cargarClientes, agregarCliente, modificarCliente, borrarCliente } from '../controllers/clienteControllers';
import './Clientes.css';
import { cargarRazonesSociales, agregarRazonSocial, modificarRazonSocial, borrarRazonSocial } from '../controllers/razonSocialControllers';

function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [razonesSociales, setRazonesSociales] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [accionModal, setAccionModal] = useState('');
    const [accionRazonSocial, setAccionRazonSocial] = useState('');
    const [razonSocial, setRazonSocial] = useState('');
    const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    
    const [idRazonSocialSeleccionada, setIdRazonSocialSeleccionada] = useState('');

    useEffect(() => {
        cargarClientes(setClientes);
        cargarRazonesSociales(setRazonesSociales, paginaActual);
    }, [paginaActual]);

    const abrirModal = (accion, cliente = null) => {
        setAccionModal(accion);
        setClienteSeleccionado(cliente);
        setTimeout(() => {
            window.$('#modalCliente').modal('show');
        }, 100);
    };

    const abrirModalRazonSocial = (accion, razon = null) => {
        setAccionRazonSocial(accion);
        if (razon) {

            setIdRazonSocialSeleccionada(razon.id_razon_social);

            setRazonSocial(razon.razon_social);
            setClienteIdSeleccionado(razon.cliente_id);
        } else {
            setIdRazonSocialSeleccionada('');
            setRazonSocial('');
            setClienteIdSeleccionado('');
        }
        setTimeout(() => {
            window.$('#modalRazonSocial').modal('show');
        }, 100);
    };

    const handleGuardarCliente = async () => {
        const nombre = document.getElementById('nombreCliente').value;
        const telefono = document.getElementById('telefonoCliente').value;
        const correo = document.getElementById('correoCliente').value;
        const contacto = document.getElementById('contactoCliente').value;
        const ubicacion = document.getElementById('ubicacionCliente').value;

        const nuevoCliente = { nombre, telefono, correo, contacto, ubicacion };

        if (accionModal === 'crear') {
            await agregarCliente(nuevoCliente, () => cargarClientes(setClientes));
        } else if (accionModal === 'editar' && clienteSeleccionado) {
            await modificarCliente(clienteSeleccionado.id_cliente, nuevoCliente, () => cargarClientes(setClientes));
        }
        cerrarModal();
    };

    const handleGuardarRazonSocial = async () => {
        const nuevaRazonSocial = { cliente_id: clienteIdSeleccionado, razon_social: razonSocial };
    
        if (accionRazonSocial === 'crear' && clienteIdSeleccionado) {
            await agregarRazonSocial(nuevaRazonSocial, () => {
                cargarRazonesSociales(setRazonesSociales, paginaActual);
            });
        } else if (accionRazonSocial === 'editar' && idRazonSocialSeleccionada) {
            await modificarRazonSocial(idRazonSocialSeleccionada, nuevaRazonSocial, () => {
                cargarRazonesSociales(setRazonesSociales, paginaActual);
            });
        }
        cerrarModalRazonSocial();
    };

    const handleEliminarCliente = async () => {
        if (clienteSeleccionado) {
            const confirmacion = window.confirm('¿Estas seguro de que quieres eliminar este cliente?');
            if (confirmacion) {
                await borrarCliente(clienteSeleccionado.id_cliente, () => cargarClientes(setClientes));
                cerrarModal();
            }
        }
    };

    const handleEliminarRazonSocial = async (id_razon_social) => {
        const confirmacion = window.confirm('¿Estas seguro de que quieres eliminar esta razon social?');
        if (confirmacion) {
            await borrarRazonSocial(id_razon_social, () => cargarRazonesSociales(setRazonesSociales, paginaActual));
        }
    };

    const cerrarModal = () => {
        setAccionModal('');
        setClienteSeleccionado(null);
        window.$('#modalCliente').modal('hide');
    };

    const cerrarModalRazonSocial = () => {
        setAccionRazonSocial('');
        setRazonSocial('');
        setClienteIdSeleccionado('');
        setIdRazonSocialSeleccionada(''); // Limpiar el ID de la razon social seleccionada
        window.$('#modalRazonSocial').modal('hide');
    };

    // Cambiar de pagina en la tabla de razones sociales
    const cambiarPagina = (nuevaPagina) => {
        setPaginaActual(nuevaPagina);
    };

    const metricas = useMemo(() => {
        const totalClientes = clientes.length;
        const totalRazones = razonesSociales.length;
        return [
            { label: 'Clientes registrados', value: totalClientes, icon: 'fas fa-building' },
            { label: 'Razones sociales', value: totalRazones, icon: 'fas fa-file-contract' }
        ];
    }, [clientes, razonesSociales]);

    return (
        <>
            <div className="clientes-page container-fluid">
                <div className="card clientes-hero">
                    <div className="clientes-hero-content">
                        <span className="clientes-hero-icon">
                            <i className="fas fa-handshake" />
                        </span>
                        <div>
                            <p className="clientes-hero-kicker">Panel de relacionamiento</p>
                            <h2>Gestion de Clientes</h2>
                            <p className="clientes-hero-subtitle">Administra clientes y sus razones sociales en un solo lugar.</p>
                        </div>
                    </div>
                    <div className="hero-actions">
                        <button className="btn btn-primary" onClick={() => abrirModal('crear')}>
                            <i className="fas fa-user-plus" /> Nuevo cliente
                        </button>
                        <button className="btn btn-outline-light" onClick={() => abrirModalRazonSocial('crear')}>
                            <i className="fas fa-file-signature" /> Nueva razon social
                        </button>
                    </div>
                </div>

                <div className="clientes-metrics">
                    {metricas.map((card) => (
                        <div key={card.label} className="clientes-metric-card">
                            <span className="metric-icon">
                                <i className={card.icon} />
                            </span>
                            <div>
                                <span>{card.label}</span>
                                <h4>{card.value}</h4>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card clientes-section">
                    <div className="clientes-section-header">
                        <div className="clientes-section-title">
                            <span className="section-icon">
                                <i className="fas fa-building" />
                            </span>
                            <div>
                                <h3>Clientes registrados</h3>
                                <small>Contactos, telefonos y ubicaciones</small>
                            </div>
                        </div>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => abrirModal('crear')}>
                            <i className="fas fa-plus" /> Agregar cliente
                        </button>
                    </div>
                    <div className="card-body table-responsive">
                        <table className="table clientes-table">
                            <thead className="thead-dark">
                                <tr>
                                    <th>Nombre</th>
                                    <th>Telfono</th>
                                    <th>Correo</th>
                                    <th>Contacto</th>
                                    <th>Ubicacin</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.length > 0 ? (
                                    clientes.map((cliente) => (
                                        <tr key={cliente.id_cliente}>
                                            <td>{cliente.nombre}</td>
                                            <td>{cliente.telefono}</td>
                                            <td>{cliente.correo}</td>
                                            <td>{cliente.contacto}</td>
                                            <td>{cliente.ubicacion}</td>
                                            <td>
                                                <button className="btn btn-warning btn-sm mx-1" onClick={() => abrirModal('editar', cliente)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-danger btn-sm mx-1" onClick={() => abrirModal('eliminar', cliente)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6">No hay clientes disponibles</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card clientes-section mt-4">
                    <div className="clientes-section-header">
                        <div className="clientes-section-title">
                            <span className="section-icon section-icon--razones">
                                <i className="fas fa-file-signature" />
                            </span>
                            <div>
                                <h3>Razones sociales</h3>
                                <small>Relacin por cliente</small>
                            </div>
                        </div>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => abrirModalRazonSocial('crear')}>
                            <i className="fas fa-plus" /> Nueva razn social
                        </button>
                    </div>
                    <div className="card-body table-responsive">
                        <table className="table clientes-table">
                            <thead className="thead-dark">
                                <tr>
                                    <th>N</th>
                                    <th>Cliente</th>
                                    <th>Razn social</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {razonesSociales.length > 0 ? (
                                    razonesSociales.map((razon, index) => (
                                        <tr key={razon.id_razon_social}>
                                            <td>{(paginaActual - 1) * 5 + index + 1}</td>
                                            <td>{clientes.find((cliente) => cliente.id_cliente === razon.cliente_id)?.nombre || 'N/A'}</td>
                                            <td>{razon.razon_social}</td>
                                            <td>
                                                <button className="btn btn-warning btn-sm mx-1" onClick={() => abrirModalRazonSocial('editar', razon)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-danger btn-sm mx-1" onClick={() => handleEliminarRazonSocial(razon.id_razon_social)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4">No hay razones sociales disponibles</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <nav>
                            <ul className="pagination">
                                {[...Array(5)].map((_, index) => (
                                    <li key={index} className={`page-item ${paginaActual === index + 1 ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => cambiarPagina(index + 1)}>{index + 1}</button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>            {/* Modales para Clientes y Razones Sociales */}
            {/* Modal para Clientes */}
            <div className="modal fade" id="modalCliente" tabIndex="-1" role="dialog" aria-labelledby="modalClienteLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="modalClienteLabel">
                                {accionModal === 'crear' ? 'Crear Cliente' : accionModal === 'editar' ? 'Editar Cliente' : 'Eliminar Cliente'}
                            </h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {accionModal === 'eliminar' ? (
                                <p>Ests seguro de que quieres eliminar este cliente?</p>
                            ) : (
                                <form>
                                    <div className="form-group">
                                        <label htmlFor="nombreCliente">Nombre</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="nombreCliente"
                                            value={clienteSeleccionado ? clienteSeleccionado.nombre : ''}
                                            onChange={(e) =>
                                                setClienteSeleccionado((prev) => ({ ...prev, nombre: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="telefonoCliente">Telfono</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="telefonoCliente"
                                            value={clienteSeleccionado ? clienteSeleccionado.telefono : ''}
                                            onChange={(e) =>
                                                setClienteSeleccionado((prev) => ({ ...prev, telefono: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="correoCliente">Correo</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="correoCliente"
                                            value={clienteSeleccionado ? clienteSeleccionado.correo : ''}
                                            onChange={(e) =>
                                                setClienteSeleccionado((prev) => ({ ...prev, correo: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="contactoCliente">Contacto</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="contactoCliente"
                                            value={clienteSeleccionado ? clienteSeleccionado.contacto : ''}
                                            onChange={(e) =>
                                                setClienteSeleccionado((prev) => ({ ...prev, contacto: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="ubicacionCliente">Ubicacin</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="ubicacionCliente"
                                            value={clienteSeleccionado ? clienteSeleccionado.ubicacion : ''}
                                            onChange={(e) =>
                                                setClienteSeleccionado((prev) => ({ ...prev, ubicacion: e.target.value }))
                                            }
                                        />
                                    </div>
                                </form>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={cerrarModal}>Cerrar</button>
                            {accionModal === 'eliminar' ? (
                                <button type="button" className="btn btn-danger" onClick={handleEliminarCliente}>Eliminar Cliente</button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleGuardarCliente}
                                >
                                    {accionModal === 'crear' ? 'Guardar Cliente' : 'Actualizar Cliente'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para Razn Social */}
            <div className="modal fade" id="modalRazonSocial" tabIndex="-1" role="dialog" aria-labelledby="modalRazonSocialLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="modalRazonSocialLabel">Crear Razn Social</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-group">
                                    <label htmlFor="clienteSelect">Cliente</label>
                                    <select
                                        className="form-control"
                                        id="clienteSelect"
                                        onChange={(e) => setClienteIdSeleccionado(e.target.value)}
                                    >
                                        <option value="">Seleccione un cliente</option>
                                        {clientes.map((cliente) => (
                                            <option key={cliente.id_cliente} value={cliente.id_cliente}>
                                                {cliente.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="razonSocial">Razn Social</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="razonSocial"
                                        value={razonSocial}
                                        onChange={(e) => setRazonSocial(e.target.value)}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={cerrarModal}>Cerrar</button>
                            <button type="button" className="btn btn-primary" onClick={handleGuardarRazonSocial}>Guardar Razn Social</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Clientes;



