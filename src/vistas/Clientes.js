import React, { useEffect, useState } from 'react';
import { cargarClientes, agregarCliente, modificarCliente, borrarCliente } from '../controllers/clienteControllers';
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
            const confirmacion = window.confirm('¿Estás seguro de que quieres eliminar este cliente?');
            if (confirmacion) {
                await borrarCliente(clienteSeleccionado.id_cliente, () => cargarClientes(setClientes));
                cerrarModal();
            }
        }
    };

    const handleEliminarRazonSocial = async (id_razon_social) => {
        const confirmacion = window.confirm('¿Estás seguro de que quieres eliminar esta razón social?');
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
        setIdRazonSocialSeleccionada(''); // Limpiar el ID de la razón social seleccionada
        window.$('#modalRazonSocial').modal('hide');
    };

    // Cambiar de página en la tabla de razones sociales
    const cambiarPagina = (nuevaPagina) => {
        setPaginaActual(nuevaPagina);
    };

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between">
                <h3 className="card-title mb-0">Lista de Clientes</h3>
                <div>
                    <button className="btn btn-primary mr-2" onClick={() => abrirModal('crear')}>
                        Crear Nuevo Cliente
                    </button>
                    <button className="btn btn-secondary" onClick={() => abrirModalRazonSocial('crear')}>
                        Crear Razón Social
                    </button>
                </div>
            </div>
            
            <div className="card-body table-responsive">
                <table className="table table-bordered">
                    <thead class="thead-dark">
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Correo</th>
                            <th>Contacto</th>
                            <th>Ubicación</th>
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

            {/* Tabla de Razones Sociales con Paginación */}
            <div className="card mt-4">
                <div className="card-header">
                    <h3 className="card-title mb-0">Razones Sociales</h3>
                </div>
                <div className="card-body table-responsive">
                    <table className="table table-bordered">
                        <thead class="thead-dark">
                            <tr>
                                <th>N°</th>
                                <th>Cliente</th>
                                <th>Razón Social</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {razonesSociales.length > 0 ? (
                                razonesSociales.map((razon, index) => (
                                    <tr key={razon.id_razon_social}>
                                        <td>{(paginaActual - 1) * 5 + index + 1}</td>
                                        <td>{clientes.find(cliente => cliente.id_cliente === razon.cliente_id)?.nombre || 'N/A'}</td>
                                        <td>{razon.razon_social}</td>
                                        <td>
                                            <button className="btn btn-warning btn-sm mx-1" onClick={() => abrirModalRazonSocial('editar', razon)}>
                                            <i className="fas fa-edit"></i>
                                            </button>
                                            <button className="btn btn-danger btn-sm mx-1" onClick={() => handleEliminarRazonSocial(razon.id_razon_social)}><i className="fas fa-trash-alt"></i>
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

                    {/* Paginación */}
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

            {/* Modales para Clientes y Razones Sociales */}
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
                                <p>¿Estás seguro de que quieres eliminar este cliente?</p>
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
                                  <label htmlFor="telefonoCliente">Teléfono</label>
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
                                  <label htmlFor="ubicacionCliente">Ubicación</label>
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
                                <button type="button" className="btn btn-primary" onClick={() => {
                                    const nombre = document.getElementById('nombreCliente').value;
                                    const telefono = document.getElementById('telefonoCliente').value;
                                    const correo = document.getElementById('correoCliente').value;
                                    const contacto = document.getElementById('contactoCliente').value;
                                    const ubicacion = document.getElementById('ubicacionCliente').value;
                                    handleGuardarCliente({ nombre, telefono, correo, contacto, ubicacion });
                                }}>
                                    {accionModal === 'crear' ? 'Guardar Cliente' : 'Actualizar Cliente'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para Razón Social */}
            <div className="modal fade" id="modalRazonSocial" tabIndex="-1" role="dialog" aria-labelledby="modalRazonSocialLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="modalRazonSocialLabel">Crear Razón Social</h5>
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
                                    <label htmlFor="razonSocial">Razón Social</label>
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
                            <button type="button" className="btn btn-primary" onClick={handleGuardarRazonSocial}>Guardar Razón Social</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Clientes;
