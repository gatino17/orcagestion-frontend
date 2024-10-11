import React from 'react';

// Modal para crear usuario
export const ModalCrear = () => {
  return (
    <div className="modal fade" id="modalUsuario" tabIndex="-1" aria-labelledby="modalCrearUsuario" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalCrearUsuario">Crear Nuevo Usuario</h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form>
              <div className="mb-3">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-control" />
              </div>
              <div className="mb-3">
                <label className="form-label">Correo</label>
                <input type="email" className="form-control" />
              </div>
              <div className="mb-3">
                <label className="form-label">Rol</label>
                <select className="form-control">
                  <option>Admin</option>
                  <option>Usuario</option>
                  <option>Técnico</option>
                </select>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="button" className="btn btn-primary">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para editar usuario
export const ModalEditar = ({ usuario }) => {
  return (
    <div className="modal fade" id="modalUsuario" tabIndex="-1" aria-labelledby="modalEditarUsuario" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalEditarUsuario">Editar Usuario</h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form>
              <div className="mb-3">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-control" defaultValue={usuario?.nombre} />
              </div>
              <div className="mb-3">
                <label className="form-label">Correo</label>
                <input type="email" className="form-control" defaultValue={usuario?.correo} />
              </div>
              <div className="mb-3">
                <label className="form-label">Rol</label>
                <select className="form-control" defaultValue={usuario?.rol}>
                  <option>Admin</option>
                  <option>Usuario</option>
                  <option>Técnico</option>
                </select>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="button" className="btn btn-warning">Guardar Cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para eliminar usuario
export const ModalEliminar = ({ usuario }) => {
  return (
    <div className="modal fade" id="modalUsuario" tabIndex="-1" aria-labelledby="modalEliminarUsuario" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalEliminarUsuario">Eliminar Usuario</h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>¿Estás seguro de que deseas eliminar a {usuario?.nombre}?</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="button" className="btn btn-danger">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
