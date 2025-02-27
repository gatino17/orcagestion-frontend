import React, { useEffect, useState } from 'react';
import { cargarUsuarios, agregarUsuario, modificarUsuario, borrarUsuario } from '../controllers/usuariosControllers';

function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [accionModal, setAccionModal] = useState('');

    useEffect(() => {
        cargarUsuarios(setUsuarios);
    }, []);

    const abrirModal = (accion, usuario = null) => {
        setAccionModal(accion);
        setUsuarioSeleccionado(accion === 'crear' ? { name: '', email: '', rol: '', password: '' } : usuario);
    };

    const handleGuardarUsuario = async (usuario) => {
        if (!usuario.name || !usuario.email || !usuario.rol || (accionModal === 'crear' && !usuario.password)) {
            alert('Por favor, completa todos los campos.');
            return;
        }
    
        try {
            if (accionModal === 'crear') {
                await agregarUsuario(usuario, () => cargarUsuarios(setUsuarios));
            } else if (accionModal === 'editar' && usuarioSeleccionado) {
                await modificarUsuario(usuarioSeleccionado.id, usuario, () => cargarUsuarios(setUsuarios));
            }
            cerrarModal();
        } catch (error) {
            alert('Error al guardar usuario. Por favor, verifica los datos.');
        }
    };

    const handleEliminarUsuario = async () => {
        if (usuarioSeleccionado) {
            await borrarUsuario(usuarioSeleccionado.id, () => cargarUsuarios(setUsuarios));
        }
        cerrarModal();
    };

    const cerrarModal = () => {
        setAccionModal('');
        setUsuarioSeleccionado(null);
        window.$('#modalUsuario').modal('hide');
    };

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between">
                <h3 className="card-title mb-0">Lista de Usuarios</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => abrirModal('crear')}
                    data-toggle="modal"
                    data-target="#modalUsuario"
                >
                    Crear Nuevo Usuario
                </button>
            </div>
            
            <div className="card-body table-responsive">
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.length > 0 ? (
                            usuarios.map((usuario) => (
                                <tr key={usuario.id}>
                                    <td>{usuario.name}</td>
                                    <td>{usuario.email}</td>
                                    <td>{usuario.rol}</td>
                                    <td>
                                        <button
                                            className="btn btn-warning btn-sm mx-1"
                                            onClick={() => abrirModal('editar', usuario)}
                                            data-toggle="modal"
                                            data-target="#modalUsuario">
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm mx-1"
                                            onClick={() => abrirModal('eliminar', usuario)}
                                            data-toggle="modal"
                                            data-target="#modalUsuario">
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4">No hay usuarios disponibles</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <div className="modal fade" id="modalUsuario" tabIndex="-1" role="dialog" aria-labelledby="modalUsuarioLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="modalUsuarioLabel">
                                {accionModal === 'crear' ? 'Crear Usuario' : 'Editar Usuario'}
                            </h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-group">
                                    <label htmlFor="nombreUsuario">Nombre</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="nombreUsuario"
                                        value={usuarioSeleccionado ? usuarioSeleccionado.name : ''}
                                        onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="correoUsuario">Correo</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="correoUsuario"
                                        value={usuarioSeleccionado ? usuarioSeleccionado.email : ''}
                                        onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="rolUsuario">Rol</label>
                                    <select
                                        className="form-control"
                                        id="rolUsuario"
                                        value={usuarioSeleccionado ? usuarioSeleccionado.rol : ''}
                                        onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, rol: e.target.value })}
                                    >
                                        <option value="">Seleccione un rol</option>
                                        <option value="admin">admin</option>
                                        <option value="tecnico">tecnico</option>
                                        <option value="soporte">soporte</option>
                                        <option value="operaciones">operaciones</option>
                                        <option value="finanzas">finanzas</option>
                                    </select>
                                </div>
                                {accionModal === 'crear' && (
                                    <div className="form-group">
                                        <label htmlFor="passwordUsuario">Contraseña</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            id="passwordUsuario"
                                            value={usuarioSeleccionado ? usuarioSeleccionado.password : ''}
                                            onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, password: e.target.value })}
                                        />
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={cerrarModal}>Cerrar</button>
                            {accionModal === 'eliminar' ? (
                                <button type="button" className="btn btn-danger" onClick={handleEliminarUsuario}>Eliminar Usuario</button>
                            ) : (
                                <button type="button" className="btn btn-primary" onClick={() => handleGuardarUsuario(usuarioSeleccionado)}>
                                    {accionModal === 'crear' ? 'Guardar Usuario' : 'Actualizar Usuario'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Usuarios;
