import React, { useEffect, useState } from 'react';
import { obtenerUsuarios } from '../controllers/usuariosControllers';
import { ModalCrear, ModalEditar, ModalEliminar } from '../modales/modalesusuarios';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [accionModal, setAccionModal] = useState('');

  useEffect(() => {
    obtenerUsuarios(setUsuarios);
  }, []);

  const abrirModal = (accion, usuario = null) => {
    setAccionModal(accion);
    setUsuarioSeleccionado(usuario);
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
                  <td>{usuario.nombre}</td>
                  <td>{usuario.correo}</td>
                  <td>{usuario.rol}</td>
                  <td>
                    
                    <button
                      className="btn btn-warning btn-sm mx-1"
                      onClick={() => abrirModal('editar', usuario)}
                      data-toggle="modal"
                      data-target="#modalUsuario">
                      <i className="fas fa-edit"></i>  {/* Lápiz */}
                    </button>
                    <button
                        className="btn btn-danger btn-sm mx-1"
                        onClick={() => abrirModal('eliminar', usuario)}
                        data-toggle="modal"
                        data-target="#modalUsuario">
                        <i className="fas fa-trash-alt"></i>  {/* Basurero */}
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
      {accionModal === 'crear' && <ModalCrear />}
      {accionModal === 'editar' && <ModalEditar usuario={usuarioSeleccionado} />}
      {accionModal === 'eliminar' && <ModalEliminar usuario={usuarioSeleccionado} />}
    </div>
  );
}

export default Usuarios;
