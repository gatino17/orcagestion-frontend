import React, { useState, useEffect } from "react";
import { ModalCrearIP } from '../modales/modalesIP'; // Modal para crear IP
import { handleObtenerClientes } from '../controllers/clienteControllers'; // Método controlador para obtener clientes
import { obtenerIps } from '../controllers/ipControllers'; // Método controlador para obtener las IPs

const DatosIP = () => {
  const [ips, setIps] = useState([]); // Estado para almacenar las IPs
  const [clientes, setClientes] = useState([]); // Estado para almacenar los clientes
  const [selectedCentro, setSelectedCentro] = useState(""); // Centro seleccionado
  const [clienteSeleccionado, setClienteSeleccionado] = useState(""); // Cliente seleccionado
  const [nombreEquipo, setNombreEquipo] = useState(""); // Nombre del equipo para agregar IP
  const [showModal, setShowModal] = useState(false); // Control del modal

  // useEffect para cargar las IPs y los clientes al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      const clientesObtenidos = await handleObtenerClientes(); // Obtener clientes
      setClientes(clientesObtenidos);
      
      const ipsObtenidas = await obtenerIps(); // Obtener IPs
      setIps(ipsObtenidas);
    };

    cargarDatos(); // Llamamos a la función de carga de datos
  }, []);

  // Función para agregar nuevas IPs
  const agregarNuevaIP = (nuevaIP) => {
    setIps([...ips, nuevaIP]); // Añadimos la nueva IP al estado actual de IPs
  };

  // Manejar cambio en el centro seleccionado
  const handleCentroChange = (event) => {
    const centroSeleccionado = event.target.value;
    setSelectedCentro(centroSeleccionado);
    const cliente = clientes.find(cliente => cliente.centro === centroSeleccionado);
    setClienteSeleccionado(cliente ? cliente.nombre : "");
  };

  // Orden de nombres de equipo
  const ordenEquipos = [
    "Teamviewer", "Anydesk", "IP PC", "Máscara", "Puerta Enlace",
    "Netio", "Cámara Laser", "Cámara Interior", "Cámara Silo 1",
    "Cámara Silo 2", "Axis P8221", "Panel Victron", "Switch 1",
    "Switch 2", "Switch 3", "Panel de Radar", "PC Radar", 
    "Cámara Laser Radar", // Agregar este equipo
    // Aquí puedes agregar más nombres si es necesario
  ];

  // Filtrar las IPs por centro seleccionado (si es necesario)
  const ipsFiltradas = selectedCentro
    ? ips.filter(ip => ip.centro === selectedCentro)
    : ips;

  // Función para manejar la apertura del modal
  const abrirModal = () => {
    setShowModal(true);
  };

  // Función para manejar el cierre del modal
  const cerrarModal = () => {
    setShowModal(false);
    setNombreEquipo(""); // Reiniciar nombre de equipo al cerrar el modal
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nuevaIP = {
      nombre: nombreEquipo,
      ip: "", // Dejar vacío por ahora
      observacion: "", // Dejar vacío por ahora
      codigo: "", // Dejar vacío por ahora
      nSerie: "", // Dejar vacío por ahora
      estado: "", // Dejar vacío por ahora
      centro: selectedCentro // Asegurarnos de que se asocie con el centro seleccionado
    };
    agregarNuevaIP(nuevaIP); // Añadir la nueva IP al estado
    cerrarModal(); // Cerrar el modal tras agregar la IP
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Gestión de IPs</h3>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <label htmlFor="centroSelect">Buscar por Cliente o Centro:</label>
          <select id="centroSelect" className="form-control" onChange={handleCentroChange}>
            <option value="">Seleccione un centro</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.centro}>
                {cliente.nombre}
              </option>
            ))}
          </select>
        </div>

        {selectedCentro && (
          <div className="mb-3">
            <h5>Cliente: {clienteSeleccionado}</h5>
            <h5>Centro: {selectedCentro}</h5>
            <button
              type="button"
              className="btn btn-success mb-3"
              onClick={abrirModal}
            >
              Agregar Nueva IP
            </button>
          </div>
        )}

        {/* Tabla para mostrar IPs creadas */}
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>N°</th>
                <th>Nombre de Equipo</th>
                <th>IP</th>
                <th>Observación</th>
                <th>Código</th>
                <th>N° Serie</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenEquipos.map((nombreEquipo, index) => {
                const ip = ipsFiltradas.find(ip => ip.nombre === nombreEquipo);
                return (
                  <tr key={nombreEquipo}>
                    <td>{index + 1}</td> {/* Enumeración */}
                    <td>{nombreEquipo}</td>
                    <td>{ip ? ip.ip : ''}</td> {/* Mostrar vacío si no hay IP */}
                    <td>{ip ? ip.observacion : ''}</td> {/* Mostrar vacío si no hay observación */}
                    <td>{ip ? ip.codigo : ''}</td> {/* Mostrar vacío si no hay código */}
                    <td>{ip ? ip.nSerie : ''}</td> {/* Mostrar vacío si no hay N° serie */}
                    <td>{ip ? ip.estado : ''}</td> {/* Mostrar vacío si no hay estado */}
                    <td>
                      <button className="btn btn-sm btn-warning">Editar</button>
                      <button className="btn btn-sm btn-danger ml-2">Borrar</button>
                    </td>
                  </tr>
                );
              })}
              {ips.map((ip, index) => (
                <tr key={index + ordenEquipos.length}>
                  <td>{ordenEquipos.length + index + 1}</td>
                  <td>{ip.nombre}</td>
                  <td>{ip.ip}</td>
                  <td>{ip.observacion}</td>
                  <td>{ip.codigo}</td>
                  <td>{ip.nSerie}</td>
                  <td>{ip.estado}</td>
                  <td>
                    <button className="btn btn-sm btn-warning">Editar</button>
                    <button className="btn btn-sm btn-danger ml-2">Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear IP */}
      <ModalCrearIP 
        agregarNuevaIP={agregarNuevaIP} 
        nombreEquipo={nombreEquipo}
        setNombreEquipo={setNombreEquipo}
        showModal={showModal}
        cerrarModal={cerrarModal}
        handleSubmit={handleSubmit}
      />
    </div>
  );
};

export default DatosIP;
