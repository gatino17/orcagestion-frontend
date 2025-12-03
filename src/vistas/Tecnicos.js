import React, { useEffect, useMemo, useState } from 'react';
import { cargarEncargados, agregarEncargado, modificarEncargado, borrarEncargado } from '../controllers/encargadosControllers';
import './Tecnicos.css';

function Tecnicos() {
    const [encargados, setEncargados] = useState([]);
    const [encargadoSeleccionado, setEncargadoSeleccionado] = useState(null);
    const [accionModal, setAccionModal] = useState('');

    const cargarEncargadosActualizado = async () => {
        const data = await cargarEncargados();
        setEncargados(data);
    };

    useEffect(() => {
        cargarEncargadosActualizado();
    }, []);

    const abrirModal = (accion, encargado = null) => {
        setAccionModal(accion);
        if (accion === 'crear') {
            setEncargadoSeleccionado({
                nombre_encargado: '',
                telefono: '',
                direccion: '',
                especialidad: '',
                licencia_conducir: false
            });
        } else {
            setEncargadoSeleccionado(encargado);
        }
        window.$('#modalEncargado').modal('show');
    };

    const handleGuardarEncargado = async () => {
        const formData = {
            nombre_encargado: document.getElementById('nombreEncargado').value,
            telefono: document.getElementById('telefonoEncargado').value,
            direccion: document.getElementById('direccionEncargado').value,
            especialidad: document.getElementById('especialidadEncargado').value,
            licencia_conducir: document.getElementById('licenciaConducir').checked
        };

        try {
            if (accionModal === 'crear') {
                await agregarEncargado(formData);
            } else if (accionModal === 'editar' && encargadoSeleccionado) {
                await modificarEncargado(encargadoSeleccionado.id_encargado, formData);
            }
            await cargarEncargadosActualizado();
            cerrarModal();
        } catch (error) {
            console.error('Error al guardar encargado:', error);
        }
    };

    const handleEliminarEncargado = async () => {
        if (encargadoSeleccionado) {
            try {
                await borrarEncargado(encargadoSeleccionado.id_encargado);
                await cargarEncargadosActualizado();
                cerrarModal();
            } catch (error) {
                console.error('Error al eliminar encargado:', error);
            }
        }
    };

    const cerrarModal = () => {
        setAccionModal('');
        setEncargadoSeleccionado(null);
        window.$('#modalEncargado').modal('hide');
    };

    const metricas = useMemo(() => {
        const total = encargados.length;
        const conLicencia = encargados.filter((encargado) => encargado.licencia_conducir).length;
        const especialidades = encargados.reduce((acc, item) => {
            const key = item.especialidad || 'Sin especialidad';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const top = Object.entries(especialidades).sort((a, b) => b[1] - a[1])[0];

        return [
            { label: 'Tecnicos registrados', value: total, icon: 'fas fa-user-cog' },
            { label: 'Con licencia', value: conLicencia, icon: 'fas fa-id-card' },
            { label: 'Especialidad destacada', value: top ? top[0] : 'N/A', icon: 'fas fa-toolbox' }
        ];
    }, [encargados]);

    return (
        <>
            <div className="tecnicos-page container-fluid">
                <div className="card tecnicos-hero">
                    <div className="tecnicos-hero-content">
                        <span className="tecnicos-hero-icon">
                            <i className="fas fa-hard-hat" />
                        </span>
                        <div>
                            <p className="tecnicos-hero-kicker">Panel operativo</p>
                            <h2>Equipo tecnico</h2>
                            <p className="tecnicos-hero-subtitle">Controla disponibilidad, habilidades y licencias del personal.</p>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => abrirModal('crear')}>
                        <i className="fas fa-user-plus" /> Nuevo tecnico
                    </button>
                </div>

                <div className="tecnicos-metrics">
                    {metricas.map((card) => (
                        <div key={card.label} className="tecnicos-metric-card">
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

                <div className="card tecnicos-section">
                    <div className="tecnicos-section-header">
                        <div className="tecnicos-section-title">
                            <span className="section-icon">
                                <i className="fas fa-users" />
                            </span>
                            <div>
                                <h3>Tecnicos registrados</h3>
                                <small>Contactos y especialidades</small>
                            </div>
                        </div>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => abrirModal('crear')}>
                            <i className="fas fa-plus" /> Crear tecnico
                        </button>
                    </div>
                    <div className="card-body table-responsive">
                        <table className="table tecnicos-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Telefono</th>
                                    <th>Direccion</th>
                                    <th>Especialidad</th>
                                    <th>Licencia conducir</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {encargados.length ? (
                                    encargados.map((encargado) => (
                                        <tr key={encargado.id_encargado}>
                                            <td>{encargado.nombre_encargado}</td>
                                            <td>{encargado.telefono}</td>
                                            <td>{encargado.direccion}</td>
                                            <td>
                                                <span className="especialidad-pill">
                                                    <i className="fas fa-toolbox" /> {encargado.especialidad || 'Sin dato'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`licencia-pill ${encargado.licencia_conducir ? 'licencia-si' : 'licencia-no'}`}>
                                                    <i className={encargado.licencia_conducir ? 'fas fa-check-circle' : 'fas fa-times-circle'} />
                                                    {encargado.licencia_conducir ? 'Si' : 'No'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button className="btn btn-warning btn-sm mx-1" onClick={() => abrirModal('editar', encargado)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-danger btn-sm mx-1" onClick={() => abrirModal('eliminar', encargado)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6">No hay tecnicos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="modal fade" id="modalEncargado" tabIndex="-1" role="dialog" aria-labelledby="modalEncargadoLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="modalEncargadoLabel">
                                {accionModal === 'crear'
                                    ? 'Crear tecnico'
                                    : accionModal === 'editar'
                                    ? 'Editar tecnico'
                                    : 'Eliminar tecnico'}
                            </h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {accionModal === 'eliminar' ? (
                                <p>Estas seguro de que deseas eliminar este tecnico?</p>
                            ) : (
                                <form>
                                    <div className="form-group">
                                        <label htmlFor="nombreEncargado">Nombre</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="nombreEncargado"
                                            defaultValue={encargadoSeleccionado ? encargadoSeleccionado.nombre_encargado : ''}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="telefonoEncargado">Telefono</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="telefonoEncargado"
                                            defaultValue={encargadoSeleccionado ? encargadoSeleccionado.telefono : ''}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="direccionEncargado">Direccion</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="direccionEncargado"
                                            defaultValue={encargadoSeleccionado ? encargadoSeleccionado.direccion : ''}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="especialidadEncargado">Especialidad</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="especialidadEncargado"
                                            defaultValue={encargadoSeleccionado ? encargadoSeleccionado.especialidad : ''}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="d-block">Licencia de conducir</label>
                                        <div className="form-check">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="licenciaConducir"
                                                defaultChecked={encargadoSeleccionado ? encargadoSeleccionado.licencia_conducir : false}
                                            />
                                            <label className="form-check-label" htmlFor="licenciaConducir">
                                                Posee licencia vigente
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={cerrarModal}>
                                Cerrar
                            </button>
                            {accionModal === 'eliminar' ? (
                                <button type="button" className="btn btn-danger" onClick={handleEliminarEncargado}>
                                    Eliminar tecnico
                                </button>
                            ) : (
                                <button type="button" className="btn btn-primary" onClick={handleGuardarEncargado}>
                                    {accionModal === 'crear' ? 'Guardar tecnico' : 'Actualizar tecnico'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Tecnicos;
