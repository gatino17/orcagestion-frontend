import React, { useEffect, useMemo, useState } from 'react';
import { cargarUsuarios, agregarUsuario, modificarUsuario, borrarUsuario } from '../controllers/usuariosControllers';
import { actualizarRol, crearRol, obtenerPaginasRol, obtenerRoles } from '../api';
import './Usuarios.css';

function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [accionModal, setAccionModal] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('');
    const [ordenRol, setOrdenRol] = useState('sin_orden');
    const [rolesDisponibles, setRolesDisponibles] = useState([]);
    const [paginasDisponibles, setPaginasDisponibles] = useState([]);
    const [showRolModal, setShowRolModal] = useState(false);
    const [rolEditandoId, setRolEditandoId] = useState(null);
    const [nuevoRolNombre, setNuevoRolNombre] = useState('');
    const [nuevoRolPaginas, setNuevoRolPaginas] = useState([]);

    useEffect(() => {
        cargarUsuarios(setUsuarios);
        cargarRoles();
        cargarPaginasDisponibles();
    }, []);

    const cargarRoles = async () => {
        try {
            const data = await obtenerRoles();
            setRolesDisponibles(Array.isArray(data) ? data : []);
        } catch (e) {
            setRolesDisponibles([]);
        }
    };

    const cargarPaginasDisponibles = async () => {
        try {
            const data = await obtenerPaginasRol();
            setPaginasDisponibles(Array.isArray(data) ? data : []);
        } catch (e) {
            setPaginasDisponibles([]);
        }
    };

    const abrirModal = (accion, usuario = null) => {
        setAccionModal(accion);
        const tecnicoBase = {
            nombre_encargado: '',
            telefono: '',
            direccion: '',
            especialidad: '',
            licencia_conducir: false
        };
        setUsuarioSeleccionado(
            accion === 'crear'
                ? { name: '', email: '', rol: '', password: '', cambiarPassword: false, tecnico: tecnicoBase }
                : {
                      ...usuario,
                      password: '',
                      cambiarPassword: false,
                      tecnico: {
                          ...tecnicoBase,
                          ...(usuario?.tecnico || {}),
                          nombre_encargado: usuario?.tecnico?.nombre_encargado || usuario?.name || ''
                      }
                  }
        );
        window.$('#modalUsuario').modal('show');
    };

    const handleGuardarUsuario = async () => {
        if (
            !usuarioSeleccionado?.name ||
            !usuarioSeleccionado?.email ||
            !usuarioSeleccionado?.rol ||
            (accionModal === 'crear' && !usuarioSeleccionado?.password) ||
            (accionModal === 'editar' && usuarioSeleccionado?.cambiarPassword && !usuarioSeleccionado?.password)
        ) {
            alert('Completa todos los campos requeridos.');
            return;
        }

        try {
            if (accionModal === 'crear') {
                const payload = {
                    name: usuarioSeleccionado.name,
                    email: usuarioSeleccionado.email,
                    rol: usuarioSeleccionado.rol,
                    password: usuarioSeleccionado.password
                };
                if (usuarioSeleccionado.rol === 'tecnico') {
                    payload.tecnico = {
                        ...(usuarioSeleccionado.tecnico || {}),
                        nombre_encargado:
                            usuarioSeleccionado?.tecnico?.nombre_encargado || usuarioSeleccionado.name || ''
                    };
                }
                await agregarUsuario(payload, () => {
                    cargarUsuarios(setUsuarios);
                    cargarRoles();
                });
            } else if (accionModal === 'editar') {
                const payload = {
                    name: usuarioSeleccionado.name,
                    email: usuarioSeleccionado.email,
                    rol: usuarioSeleccionado.rol
                };
                if (usuarioSeleccionado.rol === 'tecnico') {
                    payload.tecnico = {
                        ...(usuarioSeleccionado.tecnico || {}),
                        nombre_encargado:
                            usuarioSeleccionado?.tecnico?.nombre_encargado || usuarioSeleccionado.name || ''
                    };
                }

                if (usuarioSeleccionado.cambiarPassword && usuarioSeleccionado.password) {
                    payload.password = usuarioSeleccionado.password;
                }

                await modificarUsuario(usuarioSeleccionado.id, payload, () => {
                    cargarUsuarios(setUsuarios);
                    cargarRoles();
                });
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
        const total = usuarios.length;
        const roles = (
            rolesDisponibles.length
                ? rolesDisponibles
                : ['admin', 'tecnico', 'soporte', 'operaciones', 'finanzas'].map((nombre, idx) => ({ id_role: `base-${idx}`, nombre }))
        ).map((r) => r.nombre);
        const porRol = roles.map((rol) => ({
            label: `Rol ${rol}`,
            value: usuarios.filter((usuario) => String(usuario.rol || '').toLowerCase() === String(rol || '').toLowerCase()).length,
            icon: 'fas fa-user-tag'
        }));

        return [
            { label: 'Usuarios totales', value: total, icon: 'fas fa-users' },
            ...porRol
        ];
    }, [usuarios, rolesDisponibles]);

    const usuariosFiltrados = useMemo(() => {
        const q = String(busqueda || '').trim().toLowerCase();
        const filtrados = usuarios.filter((usuario) => {
            const coincideRol = !filtroRol || usuario.rol === filtroRol;
            if (!coincideRol) return false;
            if (!q) return true;
            const nombre = String(usuario.name || '').toLowerCase();
            const correo = String(usuario.email || '').toLowerCase();
            const rol = String(usuario.rol || '').toLowerCase();
            return nombre.includes(q) || correo.includes(q) || rol.includes(q);
        });

        if (ordenRol === 'sin_orden') return filtrados;

        const copy = [...filtrados];
        copy.sort((a, b) => {
            const rolA = String(a.rol || '').toLowerCase();
            const rolB = String(b.rol || '').toLowerCase();
            const cmpRol = rolA.localeCompare(rolB);
            if (cmpRol !== 0) return ordenRol === 'rol_asc' ? cmpRol : -cmpRol;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });
        return copy;
    }, [usuarios, busqueda, filtroRol, ordenRol]);

    const rolesOpciones = useMemo(() => {
        if (rolesDisponibles.length) return rolesDisponibles;
        return ['admin', 'tecnico', 'soporte', 'operaciones', 'finanzas'].map((nombre, idx) => ({
            id_role: `base-${idx}`,
            nombre,
            paginas: []
        }));
    }, [rolesDisponibles]);

    const paginasPorRol = useMemo(() => {
        const etiquetaPorKey = paginasDisponibles.reduce((acc, item) => {
            acc[item.key] = item.label;
            return acc;
        }, {});
        return (rolesOpciones || []).map((rol) => ({
            rol: rol.nombre,
            paginas: (rol.paginas || []).map((key) => etiquetaPorKey[key] || key)
        }));
    }, [rolesOpciones, paginasDisponibles]);

    const abrirCrearRol = () => {
        setRolEditandoId(null);
        setNuevoRolNombre('');
        setNuevoRolPaginas([]);
        setShowRolModal(true);
    };

    const abrirEditarRol = (itemRol) => {
        const match = rolesDisponibles.find((r) => String(r.nombre || '').toLowerCase() === String(itemRol?.rol || '').toLowerCase());
        setRolEditandoId(match?.id_role || null);
        setNuevoRolNombre(String(itemRol?.rol || ''));
        setNuevoRolPaginas(Array.isArray(match?.paginas) ? match.paginas : []);
        setShowRolModal(true);
    };

    const guardarNuevoRol = async () => {
        if (!nuevoRolNombre.trim()) {
            alert('Ingresa el nombre del rol.');
            return;
        }
        try {
            const payload = {
                nombre: nuevoRolNombre.trim().toLowerCase(),
                paginas: nuevoRolPaginas
            };
            if (rolEditandoId) {
                await actualizarRol(rolEditandoId, payload);
            } else {
                await crearRol(payload);
            }
            setShowRolModal(false);
            setRolEditandoId(null);
            setNuevoRolNombre('');
            setNuevoRolPaginas([]);
            await cargarRoles();
            alert(rolEditandoId ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
        } catch (e) {
            alert(rolEditandoId ? 'No se pudo actualizar el rol.' : 'No se pudo crear el rol.');
        }
    };

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

                    <div className="px-3 pt-2 pb-1">
                        <div className="row">
                            <div className="col-md-6 mb-2 mb-md-0">
                                <label className="mb-1">Buscar usuario</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar por nombre, correo o rol..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-2 mb-md-0">
                                <label className="mb-1">Filtrar por rol</label>
                                <select
                                    className="form-control"
                                    value={filtroRol}
                                    onChange={(e) => setFiltroRol(e.target.value)}
                                >
                                    <option value="">Todos los roles</option>
                                    {rolesOpciones.map((rolItem) => (
                                        <option key={`rol-filter-${rolItem.id_role}`} value={rolItem.nombre}>
                                            {rolItem.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="mb-1">Ordenar por rol</label>
                                <select
                                    className="form-control"
                                    value={ordenRol}
                                    onChange={(e) => setOrdenRol(e.target.value)}
                                >
                                    <option value="sin_orden">Sin orden</option>
                                    <option value="rol_asc">Rol A-Z</option>
                                    <option value="rol_desc">Rol Z-A</option>
                                </select>
                            </div>
                        </div>
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
                                {usuariosFiltrados.length ? (
                                    usuariosFiltrados.map((usuario) => (
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
                                        <td colSpan="4">No hay usuarios para los filtros aplicados</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card usuarios-section mt-3">
                    <div className="usuarios-section-header">
                        <div className="usuarios-section-title">
                            <span className="section-icon">
                                <i className="fas fa-shield-alt" />
                            </span>
                            <div>
                                <h3>Paginas por rol</h3>
                                <small>Referencia de acceso segun permisos actuales</small>
                            </div>
                        </div>
                        <button className="btn btn-outline-secondary btn-sm" onClick={abrirCrearRol}>
                            <i className="fas fa-user-shield" /> Crear rol
                        </button>
                    </div>
                    <div className="card-body table-responsive">
                        <table className="table usuarios-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '180px' }}>Rol</th>
                                    <th>Paginas que puede ver</th>
                                    <th style={{ width: '90px' }} className="text-center">Accion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginasPorRol.map((item) => (
                                    <tr key={`perm-${item.rol}`}>
                                        <td>
                                            <span className={`role-pill role-${item.rol}`}>
                                                <i className="fas fa-id-badge" /> {item.rol}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex flex-wrap" style={{ gap: 6 }}>
                                                {item.paginas.map((pagina) => (
                                                    <span key={`${item.rol}-${pagina}`} className="badge badge-light border">
                                                        {pagina}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <button
                                                type="button"
                                                className="btn btn-warning btn-sm"
                                                onClick={() => abrirEditarRol(item)}
                                            >
                                                <i className="fas fa-edit" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
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
                                            {rolesOpciones.map((rolItem) => (
                                                <option key={`rol-opt-${rolItem.id_role}`} value={rolItem.nombre}>
                                                    {rolItem.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {usuarioSeleccionado?.rol === 'tecnico' && (
                                        <div className="border rounded p-3 mb-3 bg-light">
                                            <h6 className="mb-3">Perfil tecnico</h6>
                                            <div className="form-group">
                                                <label>Telefono</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={usuarioSeleccionado?.tecnico?.telefono || ''}
                                                    onChange={(e) =>
                                                        setUsuarioSeleccionado({
                                                            ...usuarioSeleccionado,
                                                            tecnico: {
                                                                ...(usuarioSeleccionado.tecnico || {}),
                                                                telefono: e.target.value
                                                            }
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Direccion</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={usuarioSeleccionado?.tecnico?.direccion || ''}
                                                    onChange={(e) =>
                                                        setUsuarioSeleccionado({
                                                            ...usuarioSeleccionado,
                                                            tecnico: {
                                                                ...(usuarioSeleccionado.tecnico || {}),
                                                                direccion: e.target.value
                                                            }
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Especialidad</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={usuarioSeleccionado?.tecnico?.especialidad || ''}
                                                    onChange={(e) =>
                                                        setUsuarioSeleccionado({
                                                            ...usuarioSeleccionado,
                                                            tecnico: {
                                                                ...(usuarioSeleccionado.tecnico || {}),
                                                                especialidad: e.target.value
                                                            }
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="form-group mb-0">
                                                <div className="form-check">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        id="licenciaTecnicoUsuario"
                                                        checked={!!usuarioSeleccionado?.tecnico?.licencia_conducir}
                                                        onChange={(e) =>
                                                            setUsuarioSeleccionado({
                                                                ...usuarioSeleccionado,
                                                                tecnico: {
                                                                    ...(usuarioSeleccionado.tecnico || {}),
                                                                    licencia_conducir: e.target.checked
                                                                }
                                                            })
                                                        }
                                                    />
                                                    <label className="form-check-label" htmlFor="licenciaTecnicoUsuario">
                                                        Licencia de conducir vigente
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {accionModal === 'editar' && (
                                        <div className="form-group">
                                            <div className="form-check">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id="cambiarPasswordUsuario"
                                                    checked={!!usuarioSeleccionado?.cambiarPassword}
                                                    onChange={(e) =>
                                                        setUsuarioSeleccionado({
                                                            ...usuarioSeleccionado,
                                                            cambiarPassword: e.target.checked,
                                                            password: e.target.checked
                                                                ? usuarioSeleccionado?.password || ''
                                                                : ''
                                                        })
                                                    }
                                                />
                                                <label className="form-check-label" htmlFor="cambiarPasswordUsuario">
                                                    Cambiar contrasena
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                    {accionModal === 'editar' && usuarioSeleccionado?.cambiarPassword && (
                                        <div className="form-group">
                                            <label htmlFor="passwordEditarUsuario">Nueva contrasena</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                id="passwordEditarUsuario"
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

            {showRolModal && (
                <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(15,23,42,.35)' }}>
                    <div className="modal-dialog modal-lg" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{rolEditandoId ? 'Editar rol' : 'Crear rol'}</h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => {
                                        setShowRolModal(false);
                                        setRolEditandoId(null);
                                    }}
                                >
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nombre del rol</label>
                                    <input
                                        className="form-control"
                                        value={nuevoRolNombre}
                                        onChange={(e) => setNuevoRolNombre(e.target.value)}
                                        placeholder="Ej: auditor"
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label>Paginas permitidas</label>
                                    <div className="row">
                                        {paginasDisponibles.map((pagina) => {
                                            const checked = nuevoRolPaginas.includes(pagina.key);
                                            return (
                                                <div className="col-md-6" key={`pag-${pagina.key}`}>
                                                    <div className="form-check mb-2">
                                                        <input
                                                            id={`pag-${pagina.key}`}
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={checked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setNuevoRolPaginas((prev) => [...prev, pagina.key]);
                                                                } else {
                                                                    setNuevoRolPaginas((prev) => prev.filter((k) => k !== pagina.key));
                                                                }
                                                            }}
                                                        />
                                                        <label className="form-check-label" htmlFor={`pag-${pagina.key}`}>
                                                            {pagina.label}
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowRolModal(false);
                                        setRolEditandoId(null);
                                    }}
                                >
                                    Cerrar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={guardarNuevoRol}>
                                    {rolEditandoId ? 'Actualizar rol' : 'Guardar rol'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Usuarios;
