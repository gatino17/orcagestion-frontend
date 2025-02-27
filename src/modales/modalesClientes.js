import React, { useState } from "react";
import { createCliente } from '../controllers/clienteControllers';

export const ModalCrearCliente = ({ onClienteCreado }) => {
  const [nombre, setNombre] = useState('');
  const [razon, setRazon] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [contacto, setContacto] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [imagen, setImagen] = useState(null);

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('razon', razon);
      formData.append('telefono', telefono);
      formData.append('correo', correo);
      formData.append('contacto', contacto);
      formData.append('ubicacion', ubicacion);
      if (imagen) {
          formData.append('imagen', imagen);
      }

      await createCliente(formData); // Envía formData que contiene la imagen y los datos del cliente
      onClienteCreado(); // Notifica que se ha creado un cliente

      // Cierra el modal solo si el guardado fue exitoso
      window.$('#modalCrearCliente').modal('hide');
    } catch (error) {
      console.error('Error al guardar el cliente:', error);
    }
  };

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
                <input type="text" className="form-control" id="nombreCliente" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="RazonCliente">Razón Social</label>
                <input type="text" className="form-control" id="RazonCliente" value={razon} onChange={(e) => setRazon(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="telefonoCliente">Teléfono del Cliente</label>
                <input type="text" className="form-control" id="telefonoCliente" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="correoCliente">Correo Central del Cliente</label>
                <input type="email" className="form-control" id="correoCliente" value={correo} onChange={(e) => setCorreo(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="contactoCliente">Contacto</label>
                <input type="text" className="form-control" id="contactoCliente" value={contacto} onChange={(e) => setContacto(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="ubicacionCliente">Ubicación</label>
                <input type="text" className="form-control" id="ubicacionCliente" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="imagenCliente">Imagen del Cliente</label>
                <input type="file" className="form-control" id="imagenCliente" onChange={(e) => setImagen(e.target.files[0])} />
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cerrar</button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>Guardar Cliente</button>
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
    <div className="modal-dialog modal-lg" role="document"> {/* Ajuste para hacer el modal más ancho */}

        <div className="modal-content">
            <div className="modal-header">
                <h5 className="modal-title" id="modalCrearCentroLabel">Crear Centro</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div className="modal-body">
                <form>
                    <div className="row">
                        {/* Columna Izquierda */}

                        <div className="col-md-6">
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
                                <label htmlFor="area">Área</label>
                                <input type="text" className="form-control" id="area" placeholder="Ingrese el área" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="fechaInicio">Fecha de Inicio</label>
                                <input type="date" className="form-control" id="fechaInicio" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="fechaActivacion">Fecha de Activación</label>
                                <input type="date" className="form-control" id="fechaActivacion" />
                            </div>
                            
                            
                        </div>
                      {/* Columna Derecha */}

                        <div className="col-md-6">

                            <div className="form-group">
                                <label htmlFor="fechaTermino">Fecha de Término</label>
                                <input type="date" className="form-control" id="fechaTermino" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cantidadRadares">Cantidad de Radares</label>
                                <input type="number" className="form-control" id="cantidadRadares" min="1" max="10" placeholder="Ingrese la cantidad de radares" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cantidadCamaras">Cantidad de Cámaras</label>
                                <input type="number" className="form-control" id="cantidadCamaras" min="1" max="10" placeholder="Ingrese la cantidad de cámaras" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="baseTierra">Base Tierra</label>
                                <select className="form-control" id="baseTierra">
                                    <option>Si</option>
                                    <option>No</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="valorContrato">Valor del Contrato ($)</label>
                                <input type="text" className="form-control" id="valorContrato" placeholder="Ingrese el valor del contrato" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="razonSocial">Razón Social</label>
                                <input type="text" className="form-control" id="razonSocial" placeholder="Ingrese la razón social" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cliente">Cliente</label>
                                <input type="text" className="form-control" id="cliente" placeholder="Ingrese el cliente" />
                            </div>
                        </div>
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

// Modal para agregar actas a un centro
export const ModalAgregarActa = () => {
  return (
    <div className="modal fade" id="modalAgregarActa" tabIndex="-1" role="dialog" aria-labelledby="modalAgregarActaLabel" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalAgregarActaLabel">Agregar Actas</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <form>
              <div className="form-group">
                <label htmlFor="actaEntrega">Acta de Entrega</label>
                <input type="file" className="form-control" id="actaEntrega" />
              </div>
              
              <div className="form-group">
                <label htmlFor="permisoTrabajo">Permiso de Trabajo</label>
                <input type="file" className="form-control" id="permisoTrabajo" />
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cerrar</button>
            <button type="button" className="btn btn-primary">Guardar Actas</button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Modal para agregar actas a un centro
export const ModalInforme = () => {
  return (
    <div className="modal fade" id="modalInforme" tabIndex="-1" role="dialog" aria-labelledby="modalAgregarActaLabel" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalAgregarActaLabel">Agregar Informe intervencion</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <form>

              <div className="form-group">
                 <label htmlFor="fechaMantencion">Fecha de Mantencion</label>
                 <input type="date" className="form-control" id="fechaMantencion" />
              </div>
              
              <div className="form-group">
                <label htmlFor="informeIntervencion">
                <i class="far-solid far-file-circle-plus"/></label>
                <input type="file" className="form-control" id="informeIntervencion" />
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cerrar</button>
            <button type="button" className="btn btn-primary">Guardar Actas</button>
          </div>
        </div>
      </div>
    </div>
  );
};
