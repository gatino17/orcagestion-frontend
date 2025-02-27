import React, { useState } from "react";
import { cargarDetallesCentro } from "../controllers/centrosControllers";
import { agregarConexion, modificarConexion, borrarConexion } from "../controllers/conexionesControllers";
import { agregarEquipo, modificarEquipo, borrarEquipo } from "../controllers/equiposControllers";

const DatosIP = () => {
    const [nombreCentro, setNombreCentro] = useState("");
    const [centro, setCentro] = useState(null);
    const [equipos, setEquipos] = useState([]);
    const [conexiones, setConexiones] = useState([]);
    const [editMode, setEditMode] = useState(null); // Para determinar qué conexión o equipo se está editando
    const [showModal, setShowModal] = useState(false); // Controla la visibilidad del modal
    const [nuevaConexion, setNuevaConexion] = useState({ nombre: "", numero_conexion: "" }); // Estado para la nueva conexión
    const [nuevoEquipo, setNuevoEquipo] = useState({ nombre: "", ip: "", observacion: "", codigo: "", numero_serie: "", estado: "" }); // Estado para el nuevo equipo
    const [showEquipoModal, setShowEquipoModal] = useState(false); // Controla la visibilidad del modal de equipo

    const equiposDefinidos = [
        "IP PC", "Máscara", "Puerta de Enlace", "Netio", "Cámara Láser Radar",
        "Cámara Interior", "Cámara Silo 1", "Cámara Silo 2", "Axis", "Panel VRM",
        "Switch 1", "Switch 2", "Switch 3", "Panel Radar", "PC Mass", "Cámara Láser"
    ];

    const buscarCentro = async () => {
      try {
          const centroData = await cargarDetallesCentro(nombreCentro);
          if (centroData && centroData.nombre) {
              setCentro({
                  id: centroData.id_centro,  // Incluye el `id` del centro en el objeto `centro`
                  nombre: centroData.nombre,
                  ponton: centroData.nombre_ponton,
                  cliente: centroData.cliente,
                  estado: centroData.estado
              });
              setEquipos(centroData.equipos);
              setConexiones(centroData.conexiones);
          } else {
              setCentro(null);
              alert("Centro no encontrado.");
          }
      } catch (error) {
          console.error("Error al buscar detalles del centro:", error);
          alert("Error al buscar el centro. Inténtalo nuevamente.");
      }
  };
  

    const equiposCompletos = [
        ...equipos,
        ...equiposDefinidos
            .filter(nombreEquipo => !equipos.some(equipo => equipo.nombre === nombreEquipo))
            .map(nombreEquipo => ({
                nombre: nombreEquipo,
                ip: "",
                observacion: "",
                codigo: "",
                numero_serie: "",
                estado: ""
            }))
    ];


    const handleEditarConexion = (id) => setEditMode({ tipo: "conexion", id });

   // Activa el modo de edición para un equipo específico
    const handleEditarEquipo = (id_equipo) => setEditMode({ tipo: "equipo", id: id_equipo });
   
    const handleGuardar = async (tipo, item) => {
        if (tipo === "conexion") {
            await modificarConexion(item.id, item.numero_conexion);
        } else {
            await modificarEquipo(item.id, item);
        }
        setEditMode(null);
        buscarCentro();
    };

    const handleEliminarConexion = async (id) => {
        await borrarConexion(id);
        buscarCentro();
    };

    const handleEliminarEquipo = async (id_equipo) => {
        await borrarEquipo(id_equipo);
        buscarCentro();
    };

    const handleCrearConexion = () => {
        setNuevaConexion({ nombre: "", numero_conexion: "" });
        setShowModal(true);
    };

    // Función para inicializar el proceso de creación de un nuevo equipo
    const handleCrearEquipo = () => {
      setNuevoEquipo({ nombre: "", ip: "", observacion: "", codigo: "", numero_serie: "", estado: "" });
      setShowEquipoModal(true); // Muestra el modal
    };


    const handleGuardarNuevaConexion = async () => {
        const nuevaConexionData = {
            centro_id: centro.id,
            nombre: nuevaConexion.nombre,
            numero_conexion: nuevaConexion.numero_conexion
        };
        await agregarConexion(nuevaConexionData);
        setShowModal(false);
        buscarCentro();
    };

    // Guarda los cambios realizados en un equipo específico y desactiva el modo de edición
    const handleGuardarEquipo = async (equipo) => {
          try {
              // Si el equipo no tiene `id_equipo`, es un equipo predefinido que aún no se ha guardado en la base de datos
              if (!equipo.id_equipo) {
                  const nuevoEquipoData = {
                      centro_id: centro.id,
                      nombre: equipo.nombre,
                      ip: equipo.ip,
                      observacion: equipo.observacion,
                      codigo: equipo.codigo,
                      numero_serie: equipo.numero_serie,
                      estado: equipo.estado,
                  };
                  await agregarEquipo(nuevoEquipoData);
              } else {
                  await modificarEquipo(equipo.id_equipo, equipo);
              }
              setEditMode(null);  // Salir del modo edición
              buscarCentro();  // Refrescar la lista de equipos
          } catch (error) {
              console.error("Error al guardar los cambios del equipo:", error);
              alert("No se pudieron guardar los cambios. Intenta de nuevo.");
          }
      };
  

    //guarda un nuevo equipo
    // Función para guardar un nuevo equipo
    const handleGuardarNuevoEquipo = async () => {
        if (!centro?.id) {
            alert("No se ha seleccionado un centro.");
            return;
        }
    
        const nuevoEquipoData = {
            centro_id: centro.id,
            nombre: nuevoEquipo.nombre,
            ip: nuevoEquipo.ip,
            observacion: nuevoEquipo.observacion,
            codigo: nuevoEquipo.codigo,
            numero_serie: nuevoEquipo.numero_serie,
            estado: nuevoEquipo.estado
        };
    
        try {
          await agregarEquipo(nuevoEquipoData);
          setEquipos((prevEquipos) => [...prevEquipos, nuevoEquipoData]); // Agrega el nuevo equipo a la lista
          setShowEquipoModal(false); // Cierra el modal
          setNuevoEquipo({ nombre: "", ip: "", observacion: "", codigo: "", numero_serie: "", estado: "" });
          } catch (error) {
            console.error("Error al guardar el nuevo equipo:", error);
            alert("Error al guardar el equipo. Inténtalo nuevamente.");
        }
    };
    

  

    // Actualiza el estado del número de conexión en modo de edición
    const handleConexionInputChange = (index, value) => {
        const updatedConexiones = conexiones.map((conexion, i) => 
            i === index ? { ...conexion, numero_conexion: value } : conexion
        );
        setConexiones(updatedConexiones);
    };

    // Actualiza los valores del equipo en modo de edición sin afectar otros equipos
    const handleEquipoInputChange = (index, field, value) => {
      const updatedEquipos = equiposCompletos.map((equipo, i) =>
          i === index
              ? { ...equipo, [field]: value }
              : equipo
      );
      setEquipos(updatedEquipos);
  };
  
  

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Gestión de IPs</h3>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Ingrese el nombre del centro"
                    value={nombreCentro}
                    onChange={(e) => setNombreCentro(e.target.value)}
                />
                <button className="btn btn-primary mt-2" onClick={buscarCentro}>
                    Buscar
                </button>
            </div>
            <div className="card-body">
                {centro ? (
                    <div className="mb-3">
                        <h4>Centro: {centro.nombre}</h4>
                        <p><strong>Pontón:</strong> {centro.ponton}</p>
                        <p><strong>Cliente:</strong> {centro.cliente}</p>
                        <p><strong>Estado:</strong> {centro.estado}</p>
                    </div>
                ) : (
                    <p>No se ha encontrado el centro o no se ha realizado la búsqueda.</p>
                )}

                {/* Tabla de Conexiones */}
                {conexiones.length > 0 && (
                    <div>
                        <h5>
                            Conexiones Asociadas (TeamViewer y AnyDesk)
                            <button className="btn btn-sm btn-success ml-2" onClick={handleCrearConexion}>
                                Crear Nueva Conexión
                            </button>
                        </h5>
                        <table className="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Número de Conexión</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {conexiones.map((conexion, index) => (
                                    <tr key={conexion.id}>
                                        <td>{conexion.nombre}</td>
                                        <td>
                                            {editMode?.tipo === "conexion" && editMode?.id === conexion.id ? (
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={conexion.numero_conexion}
                                                    onChange={(e) => handleConexionInputChange(index, e.target.value)}
                                                />
                                            ) : (
                                                conexion.numero_conexion
                                            )}
                                        </td>
                                        <td>
                                            {editMode?.tipo === "conexion" && editMode?.id === conexion.id ? (
                                                <button className="btn btn-primary btn-sm" onClick={() => handleGuardar("conexion", conexion)}>
                                                    Guardar
                                                </button>
                                            ) : (
                                                <button className="btn btn-warning btn-sm" onClick={() => handleEditarConexion(conexion.id)}>
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            )}
                                            <button className="btn btn-danger btn-sm ml-2" onClick={() => handleEliminarConexion(conexion.id)}>
                                            <i class="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tabla de Equipos */}
                {equiposCompletos.length > 0 && (
                    <div className="mt-4">
                        <h5>Equipos Asociados
                        <button className="btn btn-sm btn-success ml-2" onClick={handleCrearEquipo} >
                                Crear Nuevo equipo
                            </button>
                        </h5>
                        <table className="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Nombre del Equipo</th>
                                    <th>IP</th>
                                    <th>Observación</th>
                                    <th>Código</th>
                                    <th>Número de Serie</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equiposCompletos.map((equipo, index) => (
                                    <tr key={equipo.id_equipo || equipo.nombre}>
                                        <td>{equipo.nombre}</td>
                                        <td>
                                            {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={equipo.ip}
                                                    onChange={(e) => handleEquipoInputChange(index, "ip", e.target.value)}
                                                />
                                            ) : (
                                                equipo.ip
                                            )}
                                        </td>
                                        <td>
                                            {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={equipo.observacion}
                                                    onChange={(e) => handleEquipoInputChange(index, "observacion", e.target.value)}
                                                />
                                            ) : (
                                                equipo.observacion
                                            )}
                                        </td>
                                        <td>
                                            {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={equipo.codigo}
                                                    onChange={(e) => handleEquipoInputChange(index, "codigo", e.target.value)}
                                                />
                                            ) : (
                                                equipo.codigo
                                            )}
                                        </td>
                                        <td>
                                            {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={equipo.numero_serie}
                                                    onChange={(e) => handleEquipoInputChange(index, "numero_serie", e.target.value)}
                                                />
                                            ) : (
                                                equipo.numero_serie
                                            )}
                                        </td>
                                        <td>
                                            {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={equipo.estado}
                                                    onChange={(e) => handleEquipoInputChange(index, "estado", e.target.value)}
                                                />
                                            ) : (
                                                equipo.estado
                                            )}
                                        </td>
                                        <td>
                                            {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                <button className="btn btn-primary btn-sm" onClick={() => handleGuardarEquipo(equipo)}>
                                                    Guardar
                                                </button>
                                            ) : (
                                                <button className="btn btn-warning btn-sm" onClick={() => handleEditarEquipo(equipo.id_equipo)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                            )}
                                            <button className="btn btn-danger btn-sm ml-2" onClick={() => handleEliminarEquipo(equipo.id_equipo)}>
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                )}
            </div>

            {/* Modal para Crear Nueva Conexión */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Crear Nueva Conexión</h5>
                                <button type="button" className="close" onClick={() => setShowModal(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={nuevaConexion.nombre}
                                        onChange={(e) => setNuevaConexion({ ...nuevaConexion, nombre: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Número de Conexión</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={nuevaConexion.numero_conexion}
                                        onChange={(e) => setNuevaConexion({ ...nuevaConexion, numero_conexion: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleGuardarNuevaConexion}>
                                    Guardar Conexión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

           {/* Modal para Crear Nuevo Equipo */}
            
            {showEquipoModal && (
                    <div className="modal show d-block" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Crear Nuevo Equipo</h5>
                                    <button type="button" className="close" onClick={() => setShowEquipoModal(false)}>
                                        <span>&times;</span>
                                    </button>
                                </div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.nombre}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>IP</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.ip}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, ip: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Observación</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.observacion}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, observacion: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Código</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.codigo}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, codigo: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Número de Serie</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.numero_serie}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, numero_serie: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Estado</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.estado}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, estado: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEquipoModal(false)}>
                                        Cancelar
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={handleGuardarNuevoEquipo}>
                                        Guardar Equipo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            

        </div>
    );
};

export default DatosIP;
