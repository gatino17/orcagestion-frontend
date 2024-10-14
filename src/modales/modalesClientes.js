import React from "react";

// Modal para crear un cliente
export const ModalCrearCliente = () => {
  return (
    <div className="modal fade" id="modalCrearCliente" tabIndex="-1" role="dialog" aria-labelledby="modalCrearClienteLabel" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalCrearClienteLabel">Crear Cliente</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <form>
              <div className="form-group">
                <label htmlFor="nombreCliente">Nombre del Cliente</label>
                <input type="text" className="form-control" id="nombreCliente" placeholder="Ingrese el nombre del cliente" />
              </div>
              <div className="form-group">
                <label htmlFor="imagenCliente">Imagen del Cliente</label>
                <input type="file" className="form-control" id="imagenCliente" />
              </div>
              <div className="form-group">
                <label htmlFor="telefonoCliente">Teléfono del Cliente</label>
                <input type="text" className="form-control" id="telefonoCliente" placeholder="Ingrese el teléfono" />
              </div>
              <div className="form-group">
                <label htmlFor="correoCliente">Correo Central del Cliente</label>
                <input type="email" className="form-control" id="correoCliente" placeholder="Ingrese el correo" />
              </div>
              <div className="form-group">
                <label htmlFor="ubicacionCliente">Ubicación</label>
                <input type="text" className="form-control" id="ubicacionCliente" placeholder="Ingrese la ubicación" />
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cerrar</button>
            <button type="button" className="btn btn-primary">Guardar Cliente</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para crear un centro
export const ModalCrearCentro = () => {
  return (
    <div className="modal fade" id="modalCrearCentro" tabIndex="-1" role="dialog" aria-labelledby="modalCrearCentroLabel" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalCrearCentroLabel">Crear Centro</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <form>
              <div className="form-group">
                <label htmlFor="nombreCentro">Nombre del Centro</label>
                <input type="text" className="form-control" id="nombreCentro" placeholder="Ingrese el nombre del centro" />
              </div>
              <div className="form-group">
                <label htmlFor="nombrePonton">Nombre del Pontón</label>
                <input type="text" className="form-control" id="nombrePonton" placeholder="Ingrese el nombre del pontón" />
              </div>
              <div className="form-group">
                <label htmlFor="ubicacionCentro">Ubicación del Centro</label>
                <input type="text" className="form-control" id="ubicacionCentro" placeholder="Ingrese la ubicación" />
              </div>
              <div className="form-group">
                <label htmlFor="estadoCentro">Estado del Centro</label>
                <input type="text" className="form-control" id="estadoCentro" placeholder="Ingrese el estado" />
              </div>
              <div className="form-group">
                <label htmlFor="fechaInicio">Fecha de Inicio</label>
                <input type="date" className="form-control" id="fechaInicio" />
              </div>
              <div className="form-group">
                <label htmlFor="fechaTermino">Fecha de Término</label>
                <input type="date" className="form-control" id="fechaTermino" />
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cerrar</button>
            <button type="button" className="btn btn-primary">Guardar Centro</button>
          </div>
        </div>
      </div>
    </div>
  );
};
