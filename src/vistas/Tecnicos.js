// src/pages/Tecnicos.js
import React, { useEffect, useState } from 'react';
import { cargarEncargados, agregarEncargado, modificarEncargado, borrarEncargado } from '../controllers/encargadosControllers';

function Tecnicos() {
    const [encargados, setEncargados] = useState([]);
    const [encargadoSeleccionado, setEncargadoSeleccionado] = useState(null);
    const [accionModal, setAccionModal] = useState('');

    useEffect(() => {
        const fetchEncargados = async () => {
            try {
                const data = await cargarEncargados();
                setEncargados(data);
            } catch (error) {
                console.error("Error al cargar encargados:", error);
            }
        };

        fetchEncargados();
    }, []);

    const abrirModal = (accion, encargado = null) => {
        setAccionModal(accion);
        setEncargadoSeleccionado(encargado);
    };

    const handleGuardarEncargado = async () => {
        const nombre = document.getElementById('nombreEncargado').value;
        const telefono = document.getElementById('telefonoEncargado').value;
        const direccion = document.getElementById('direccionEncargado').value;
        const especialidad = document.getElementById('especialidadEncargado').value;
        const licenciaConducir = document.getElementById('licenciaConducir').checked;
        const encargadoData = { 
            nombre_encargado: nombre, 
            telefono, 
            direccion, 
            especialidad, 
            licencia_conducir: licenciaConducir 
        };

        try {
            if (accionModal === 'crear') {
                await agregarEncargado(encargadoData);
            } else if (accionModal === 'editar' && encargadoSeleccionado) {
                await modificarEncargado(encargadoSeleccionado.id_encargado, encargadoData);
            }
            cargarEncargadosActualizado();
            cerrarModal();
        } catch (error) {
            console.error("Error al guardar encargado:", error);
        }
    };

    const cargarEncargadosActualizado = async () => {
        const data = await cargarEncargados();
        setEncargados(data);
    };

    const handleEliminarEncargado = async () => {
        if (encargadoSeleccionado) {
            try {
                await borrarEncargado(encargadoSeleccionado.id_encargado);
                cargarEncargadosActualizado();
                cerrarModal();
            } catch (error) {
                console.error("Error al eliminar encargado:", error);
            }
        }
    };

    const cerrarModal = () => {
        setAccionModal('');
        setEncargadoSeleccionado(null);
        window.$('#modalEncargado').modal('hide');
    };

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between">
                <h3 className="card-title mb-0">Lista de Encargados</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => abrirModal('crear')}
                    data-toggle="modal"
                    data-target="#modalEncargado"
                >
                    Crear Nuevo Encargado
                </button>
            </div>
            
            <div className="card-body table-responsive">
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Dirección</th>
                            <th>Especialidad</th>
                            <th>Licencia de Conducir</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {encargados.length > 0 ? (
                            encargados.map((encargado) => (
                                <tr key={encargado.id_encargado}>
                                    <td>{encargado.nombre_encargado}</td>
                                    <td>{encargado.telefono}</td>
                                    <td>{encargado.direccion}</td>
                                    <td>{encargado.especialidad}</td>
                                    <td>{encargado.licencia_conducir ? 'Sí' : 'No'}</td>
                                    <td>
                                        <button
                                            className="btn btn-warning btn-sm mx-1"
                                            onClick={() => abrirModal('editar', encargado)}
                                            data-toggle="modal"
                                            data-target="#modalEncargado">
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm mx-1"
                                            onClick={() => abrirModal('eliminar', encargado)}
                                            data-toggle="modal"
                                            data-target="#modalEncargado">
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6">No hay encargados disponibles</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <div className="modal fade" id="modalEncargado" tabIndex="-1" role="dialog" aria-labelledby="modalEncargadoLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="modalEncargadoLabel">
                                {accionModal === 'crear' ? 'Crear Encargado' : accionModal === 'editar' ? 'Editar Encargado' : 'Confirmar Eliminación'}
                            </h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {accionModal === 'eliminar' ? (
                                <p>¿Está seguro de que desea eliminar a {encargadoSeleccionado.nombre_encargado}?</p>
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
                                        <label htmlFor="telefonoEncargado">Teléfono</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="telefonoEncargado"
                                            defaultValue={encargadoSeleccionado ? encargadoSeleccionado.telefono : ''}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="direccionEncargado">Dirección</label>
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
                                        <label htmlFor="licenciaConducir">Licencia de Conducir</label>
                                        <input
                                            type="checkbox"
                                            id="licenciaConducir"
                                            defaultChecked={encargadoSeleccionado ? encargadoSeleccionado.licencia_conducir : false}
                                        />
                                    </div>
                                </form>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={cerrarModal}>Cerrar</button>
                            {accionModal === 'eliminar' ? (
                                <button type="button" className="btn btn-danger" onClick={handleEliminarEncargado}>Confirmar Eliminación</button>
                            ) : (
                                <button type="button" className="btn btn-primary" onClick={handleGuardarEncargado}>
                                    {accionModal === 'crear' ? 'Guardar Encargado' : 'Actualizar Encargado'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Tecnicos;
