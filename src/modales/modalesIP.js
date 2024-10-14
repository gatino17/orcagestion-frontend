import React, { useState } from "react";

export const ModalCrearIP = ({ clientes, agregarNuevaIP }) => {
  const [centros, setCentros] = useState([]); // Estado para centros disponibles basado en el cliente seleccionado
  const [nuevaIP, setNuevaIP] = useState({
    cliente: "",
    centro: "",
    foto: null
  });

  // Función para manejar el cambio de cliente y cargar centros correspondientes
  const handleClienteChange = (e) => {
    const clienteSeleccionado = e.target.value;
    setNuevaIP({ ...nuevaIP, cliente: clienteSeleccionado });

    // Aquí debes cargar los centros del cliente seleccionado
    const centrosCliente = [
      { nombre: "Centro 1" },
      { nombre: "Centro 2" },
      { nombre: "Centro 3" }
    ];
    setCentros(centrosCliente);
  };

  // Función para manejar el cambio de centro
  const handleCentroChange = (e) => {
    setNuevaIP({ ...nuevaIP, centro: e.target.value });
  };

  // Función para manejar la selección de una foto
  const handleFotoChange = (e) => {
    setNuevaIP({ ...nuevaIP, foto: e.target.files[0] });
  };

  // Función para crear la nueva IP
  const handleCrearIP = () => {
    agregarNuevaIP(nuevaIP); // Llamamos a la función que agrega la nueva IP
    // Resetear el estado del formulario si es necesario
    setNuevaIP({
      cliente: "",
      centro: "",
      foto: null
    });
  };

  return (
    <div className="modal fade" id="modalCrearIP" tabIndex="-1" role="dialog" aria-labelledby="modalCrearIPLabel" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="modalCrearIPLabel">Crear nueva IP</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {/* Seleccionar cliente */}
            <div className="form-group">
              <label>Cliente</label>
              <select className="form-control" value={nuevaIP.cliente} onChange={handleClienteChange}>
                <option value="">Selecciona un cliente</option>
                {clientes.map((cliente, index) => (
                  <option key={index} value={cliente.nombre}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Seleccionar centro */}
            <div className="form-group">
              <label>Centro</label>
              <select className="form-control" value={nuevaIP.centro} onChange={handleCentroChange}>
                <option value="">Selecciona un centro</option>
                {centros.map((centro, index) => (
                  <option key={index} value={centro.nombre}>
                    {centro.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Subir foto de las IPs */}
            <div className="form-group">
              <label>Foto de las IPs</label>
              <input type="file" className="form-control-file" onChange={handleFotoChange} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cerrar</button>
            <button type="button" className="btn btn-primary" onClick={handleCrearIP}>
              Crear IP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
