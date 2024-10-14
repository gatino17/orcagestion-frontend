import React, { useEffect, useState } from "react";
import { ModalCrearCliente, ModalCrearCentro } from '../modales/modalesClientes'; // Importamos el modal
import { handleObtenerClientes } from '../controllers/clienteControllers'; // Importamos el método controlador

const Clientes = () => {
  const [clientes, setClientes] = useState([]); // Estado para almacenar los clientes
  const [centros, setCentros] = useState([]); // Estado para almacenar los centros

  // useEffect para cargar los clientes al montar el componente
  useEffect(() => {
    const cargarClientes = () => {
      const clientesObtenidos = handleObtenerClientes(); // Llamada al controlador para obtener los clientes
      setClientes(clientesObtenidos); // Guardamos los clientes en el estado
    };

    cargarClientes(); // Llamamos a la función de carga de clientes
  }, []);

  // Datos de ejemplo para centros
  const datosEjemplo = [
    {
      nombre: "Centro 1",
      nombrePonton: "Ponton A",
      ubicacion: "Ubicación A",
      estado: "Activo",
      fechaInicio: "2024-01-01",
      fechaTermino: "2025-01-01",
      cliente: "Cliente 1"
    },
    {
      nombre: "Centro 2",
      nombrePonton: "Ponton B",
      ubicacion: "Ubicación B",
      estado: "Inactivo",
      fechaInicio: "2024-02-01",
      fechaTermino: "2025-02-01",
      cliente: "Cliente 2"
    },
    {
      nombre: "Centro 3",
      nombrePonton: "Ponton C",
      ubicacion: "Ubicación C",
      estado: "Activo",
      fechaInicio: "2024-03-01",
      fechaTermino: "2025-03-01",
      cliente: "Cliente 3"
    }
  ];

  // Poblar el estado de centros con los datos de ejemplo
  useEffect(() => {
    setCentros(datosEjemplo);
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Clientes y Centros</h3>
      </div>
      <div className="card-body">
        <div className="d-flex mb-3">
          <button
            type="button"
            className="btn btn-primary mr-1"
            data-toggle="modal"
            data-target="#modalCrearCliente"
          >
            Crear cliente
          </button>
          <button
            type="button"
            className="btn btn-primary"
            data-toggle="modal"
            data-target="#modalCrearCentro"
          >
            Crear centro
          </button>
        </div>

        
        {/* Nueva sección con información de clientes */}
        <div className="card mb-4">
          <div className="card-header">
            <h4 className="card-title">Información de Clientes</h4>
          </div>
          <div className="card-body">
            <div className="row">
              {clientes.length > 0 ? (
                clientes.map((cliente, index) => (
                  <div className="col-md-3 mb-2" key={index}>
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title">{cliente.nombre}</h5>
                      </div>
                      <div className="card-body">
                        <p>Total de centros operativos: {cliente.centrosOperativos || 0}</p>
                        <p>Total de centros en cese: {cliente.centrosEnCese || 0}</p>
                        <p>Total de sistemas: {cliente.totalSistemas || 0}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay información de clientes disponible.</p>
              )}
            </div>
          </div>
        </div>

        <h4 className="mb-3">Centros Asociados</h4>
        {/* Tabla para centros asociados */}
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Nombre del Pontón</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Fecha de Inicio</th>
              <th>Fecha de Término</th>
              <th>Cliente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {centros.length > 0 ? (
              centros.map((centro, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{centro.nombre}</td>
                  <td>{centro.nombrePonton}</td>
                  <td>{centro.ubicacion}</td>
                  <td>{centro.estado}</td>
                  <td>{centro.fechaInicio}</td>
                  <td>{centro.fechaTermino}</td>
                  <td>{centro.cliente}</td>
                  <td>
                    <button className="btn btn-sm btn-warning">Editar</button>
                    <button className="btn btn-sm btn-danger ml-2">Borrar</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">No hay centros asociados aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modales para crear cliente y crear centro */}
      <ModalCrearCliente />
      <ModalCrearCentro />
    </div>
  );
};

export default Clientes;
