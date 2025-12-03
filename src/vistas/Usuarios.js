import React, { useEffect, useMemo, useState } from 'react';
import { cargarUsuarios, agregarUsuario, modificarUsuario, borrarUsuario } from '../controllers/usuariosControllers';
import './Usuarios.css';

function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [accionModal, setAccionModal] = useState('');

    useEffect(() => {
        cargarUsuarios(setUsuarios);
    }, []);

    const abrirModal = (accion, usuario = null) => {
        setAccionModal(accion);
        setUsuarioSeleccionado(
            accion === 'crear'
                ? { name: '', email: '', rol: '', password: '' }
                : { ...usuario }
        );
        window.$('#modalUsuario').modal('show');
    };

    const handleGuardarUsuario = async () => {
        if (
            !usuarioSeleccionado?.name ||
            !usuarioSeleccionado?.email ||
            !usuarioSeleccionado?.rol ||
            (accionModal === 'crear' && !usuarioSeleccionado?.password)
        ) {
            alert('Completa todos los campos requeridos.');
            return;
        }

        try {
            if (accionModal === 'crear') {
                await agregarUsuario(usuarioSeleccionado, () => cargarUsuarios(setUsuarios));
            } else if (accionModal === 'editar') {
                await modificarUsuario(usuarioSeleccionado.id, usuarioSeleccionado, () => cargarUsuarios(setUsuarios));
            }
            cerrarModal();
        } catch (error) {
            alert('Error al guardar usuario. Verifica los datos.');
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

    const metricas = useMemo(() => {
        const roles = ['admin', 'tecnico', 'soporte', 'operaciones', 'finanzas'];
        const total = usuarios.length;

        const porRol = roles.map((rol) => ({
            label: `Rol ${rol}`,
            value: usuarios.filter((usuario) => usuario.rol === rol).length,
            icon: 'fas fa-user-tag'
        }));

        return [
            { label: 'Usuarios totales', value: total, icon: 'fas fa-users' },
            ...porRol
        ];
    }, [usuarios]);

    return (
        <>
            <div className="usuarios-page container-fluid">
                <div className="card usuarios-hero">
                    <div className="usuarios-hero-content">
                        <span className="usuarios-hero-icon">
                            <i className="fas fa-users-cog" />
                        </span>
                        <div>
                            <p className="usuarios-hero-kicker">Panel de usuarios</p>
                            <h2>Gestion de usuarios</h2>
                            <p className="usuarios-hero-subtitle">
                                Controla accesos, roles y credenciales del equipo.
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => abrirModal('crear')}>
                        <i className="fas fa-user-plus" /> Nuevo usuario
                    </button>
                </div>

                <div className="usuarios-metrics">
                    {metricas.map((card) => (
                        <div key={card.label} className="usuarios-metric-card">
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

                <div className="card usuarios-section">
                    <div className="usuarios-section-header">
                        <div className="usuarios-section-title">
                            <span className="section-icon">
                                <i className="fas fa-address-book" />
                            </span>
                            <div>
                                <h3>Usuarios registrados</h3>
                                <small>Listado de cuentas activas</small>
                            </div>
                        </div>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => abrirModal('crear')}>
                            <i className="fas fa-plus" /> Crear usuario
                        </button>
                    </div>

                    <div className="card-body table-responsive">
                        <table className="table usuarios-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Rol</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.length ? (
                                    usuarios.map((usuario) => (
                                        <tr key={usuario.id}>
                                            <td>{usuario.name}</td>
                                            <td>{usuario.email}</td>
                                            <td>
                                                <span className={`role-pill role-${usuario.rol}`}>
                                                    <i className="fas fa-id-badge" /> {usuario.rol}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    className="btn btn-warning btn-sm mx-1"
                                                    onClick={() => abrirModal('editar', usuario)}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm mx-1"
                                                    onClick={() => abrirModal('eliminar', usuario)}
                                                >
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
                </div>
            </div>

            <div className="modal fade" id="modalUsuario" tabIndex="-1" role="dialog" aria-labelledby="modalUsuarioLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="modalUsuarioLabel">
                                {accionModal === 'crear'
                                    ? 'Crear Usuario'
                                    : accionModal === 'editar'
                                    ? 'Editar Usuario'
                                    : 'Eliminar Usuario'}
                            </h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {accionModal === 'eliminar' ? (
                                <p>Estas seguro de que deseas eliminar este usuario?</p>
                            ) : (
                                <form>
                                    <div className="form-group">
                                        <label htmlFor="nombreUsuario">Nombre</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="nombreUsuario"
                                            value={usuarioSeleccionado ? usuarioSeleccionado.name : ''}
                                            onChange={(e) =>
                                                setUsuarioSeleccionado({ ...usuarioSeleccionado, name: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="correoUsuario">Correo</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="correoUsuario"
                                            value={usuarioSeleccionado ? usuarioSeleccionado.email : ''}
                                            onChange={(e) =>
                                                setUsuarioSeleccionado({ ...usuarioSeleccionado, email: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="rolUsuario">Rol</label>
                                        <select
                                            className="form-control"
                                            id="rolUsuario"
                                            value={usuarioSeleccionado ? usuarioSeleccionado.rol : ''}
                                            onChange={(e) =>
                                                setUsuarioSeleccionado({ ...usuarioSeleccionado, rol: e.target.value })
                                            }
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
                                            <label htmlFor="passwordUsuario">Contrasena</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                id="passwordUsuario"
                                                value={usuarioSeleccionado ? usuarioSeleccionado.password : ''}
                                                onChange={(e) =>
                                                    setUsuarioSeleccionado({
                                                        ...usuarioSeleccionado,
                                                        password: e.target.value
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={cerrarModal}>
                                Cerrar
                            </button>
                            {accionModal === 'eliminar' ? (
                                <button type="button" className="btn btn-danger" onClick={handleEliminarUsuario}>
                                    Eliminar Usuario
                                </button>
                            ) : (
                                <button type="button" className="btn btn-primary" onClick={handleGuardarUsuario}>
                                    {accionModal === 'crear' ? 'Guardar Usuario' : 'Actualizar Usuario'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Usuarios;
