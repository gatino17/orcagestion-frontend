import React from "react";

export const ModalCrearIP = ({ 
  agregarNuevaIP, 
  nombreEquipo, 
  setNombreEquipo, 
  showModal, 
  cerrarModal, 
  handleSubmit 
}) => {
  
  return (
    <div className={`modal fade ${showModal ? 'show' : ''}`} style={{ display: showModal ? 'block' : 'none' }} tabIndex="-1" role="dialog" aria-labelledby="modalCrearIPLabel" aria-hidden={!showModal}>
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalCrearIPLabel">Agregar Nueva IP</h5>
            <button type="button" className="close" onClick={cerrarModal} aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nombreEquipo">Nombre del Equipo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="nombreEquipo" 
                  value={nombreEquipo} 
                  onChange={(e) => setNombreEquipo(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary">Agregar</button>
              <button type="button" className="btn btn-secondary" onClick={cerrarModal}>Cancelar</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
