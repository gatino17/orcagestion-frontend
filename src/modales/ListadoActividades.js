import React, { useState } from "react";

export const ListadoActividades = () => {
  const [actividades, setActividades] = useState([]); // Estado para almacenar las actividades
  const [nuevaActividad, setNuevaActividad] = useState({
    nombre: "",
    fechaReclamo: "",
    fechaInicio: "",
    fechaTermino: "",
    area: "",
    prioridad: "",
    encargado: "",
    tiempoSolucion: "",
    estado: ""
  });

  const agregarActividad = () => {
    setActividades([...actividades, nuevaActividad]); // Agregar nueva actividad al estado
    setNuevaActividad({ // Resetear el estado del formulario
      nombre: "",
      fechaReclamo: "",
      fechaInicio: "",
      fechaTermino: "",
      area: "",
      prioridad: "",
      encargado: "",
      tiempoSolucion: "",
      estado: ""
    });
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary mb-3"
        data-toggle="modal"
        data-target="#modalAgregarActividad"
      >
        Agregar Actividad
      </button>

      {/* Tabla para mostrar actividades */}
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>N°</th>
            <th>Nombre</th>
            <th>Fecha de Reclamo</th>
            <th>Fecha de Inicio</th>
            <th>Fecha de Término</th>
            <th>Área</th>
            <th>Prioridad</th>
            <th>Encargado</th>
            <th>Tiempo en Solución</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {actividades.length > 0 ? (
            actividades.map((actividad, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{actividad.nombre}</td>
                <td>{actividad.fechaReclamo}</td>
                <td>{actividad.fechaInicio}</td>
                <td>{actividad.fechaTermino}</td>
                <td>{actividad.area}</td>
                <td>{actividad.prioridad}</td>
                <td>{actividad.encargado}</td>
                <td>{actividad.tiempoSolucion}</td>
                <td>{actividad.estado}</td>
                <td>
                  <button className="btn btn-sm btn-warning">Editar</button>
                  <button className="btn btn-sm btn-danger ml-2">Borrar</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="11">No hay actividades registradas aún.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal para agregar actividad */}
      <div className="modal fade" id="modalAgregarActividad" tabIndex="-1" role="dialog" aria-labelledby="modalAgregarActividadLabel" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="modalAgregarActividadLabel">Agregar Actividad</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {/* Formulario de ingreso de actividad */}
              <div className="form-group">
                <label>Nombre de la Actividad</label>
                <input
                  type="text"
                  className="form-control"
                  value={nuevaActividad.nombre}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Fecha de Reclamo</label>
                <input
                  type="date"
                  className="form-control"
                  value={nuevaActividad.fechaReclamo}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaReclamo: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Fecha de Inicio</label>
                <input
                  type="date"
                  className="form-control"
                  value={nuevaActividad.fechaInicio}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaInicio: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Fecha de Término</label>
                <input
                  type="date"
                  className="form-control"
                  value={nuevaActividad.fechaTermino}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaTermino: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Área</label>
                <select
                  className="form-control"
                  value={nuevaActividad.area}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, area: e.target.value })}
                >
                  <option value="">Selecciona un área</option>
                  <option value="Aysén">Aysén</option>
                  <option value="Chiloé">Chiloé</option>
                  <option value="Cisnes">Cisnes</option>
                  <option value="Melinka">Melinka</option>
                  <option value="Puerto Montt">Puerto Montt</option>
                  <option value="Cochamó">Cochamó</option>
                </select>
              </div>
              <div className="form-group">
                <label>Prioridad</label>
                <select
                  className="form-control"
                  value={nuevaActividad.prioridad}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, prioridad: e.target.value })}
                >
                  <option value="">Selecciona la prioridad</option>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className="form-group">
                <label>Encargado</label>
                <input
                  type="text"
                  className="form-control"
                  value={nuevaActividad.encargado}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, encargado: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Tiempo en Dar Solución (días)</label>
                <input
                  type="number"
                  className="form-control"
                  value={nuevaActividad.tiempoSolucion}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, tiempoSolucion: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  className="form-control"
                  value={nuevaActividad.estado}
                  onChange={(e) => setNuevaActividad({ ...nuevaActividad, estado: e.target.value })}
                >
                  <option value="">Selecciona un estado</option>
                  <option value="Finalizado">Finalizado</option>
                  <option value="Reprogramado">Reprogramado</option>
                  <option value="En Progreso">En Progreso</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Retrasado">Retrasado</option>
                  <option value="Completado">Completado</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cerrar</button>
              <button type="button" className="btn btn-primary" onClick={agregarActividad}>Agregar Actividad</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListadoActividades;
