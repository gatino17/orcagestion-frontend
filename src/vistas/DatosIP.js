import React, { useState, useEffect } from "react";
import { ModalCrearIP } from '../modales/modalesIP'; // Modal para crear IP
import { handleObtenerClientes } from '../controllers/clienteControllers'; // Método controlador para obtener clientes
import { obtenerIps } from '../controllers/ipControllers'; // Método controlador para obtener las IPs

const DatosIP = () => {
  const [ips, setIps] = useState([]); // Estado para almacenar las IPs
  const [clientes, setClientes] = useState([]); // Estado para almacenar los clientes

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

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Gestión de IPs</h3>
      </div>
      <div className="card-body">
        <button
          type="button"
          className="btn btn-primary mb-3"
          data-toggle="modal"
          data-target="#modalCrearIP"
        >
          Crear IP
        </button>

        {/* Tabla para mostrar IPs creadas */}
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>N°</th>
              <th>Cliente</th>
              <th>Centro</th>
              <th>Foto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ips.length > 0 ? (
              ips.map((ip, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{ip.cliente}</td>
                  <td>{ip.centro}</td>
                  <td>
                    {ip.foto ? (
                      <img
                        src={URL.createObjectURL(ip.foto)}
                        alt="IP Foto"
                        width="50"
                      />
                    ) : (
                      "No disponible"
                    )}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-warning">Editar</button>
                    <button className="btn btn-sm btn-danger ml-2">Borrar</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No hay IPs creadas aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para crear IP */}
      <ModalCrearIP clientes={clientes} agregarNuevaIP={agregarNuevaIP} />
    </div>
  );
};

export default DatosIP;
