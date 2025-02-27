import React, { useState, useEffect } from "react";
import DataTable from 'react-data-table-component';
import { cargarSoportes, agregarSoporte, modificarSoporte, borrarSoporte } from '../controllers/soporteControllers';
import { cargarCentrosClientes } from '../controllers/centrosControllers';

const Soporte = () => {
    const [soportes, setSoportes] = useState([]);
    const [centros, setCentros] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados del formulario
    const [centroId, setCentroId] = useState('');
    const [problema, setProblema] = useState('');
    const [tipo, setTipo] = useState('');
    const [fechaSoporte, setFechaSoporte] = useState('');
    const [solucion, setSolucion] = useState('');
    const [categoriaFalla, setCategoriaFalla] = useState('');
    const [cambioEquipo, setCambioEquipo] = useState(false);
    const [equipoCambiado, setEquipoCambiado] = useState('');
    const [editarSoporte, setEditarSoporte] = useState(null);
    const [showModal, setShowModal] = useState(false);

     // Estado para filtrar por año
     const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());


    // Cargar datos
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await cargarSoportes(setSoportes);
            const centrosData = await cargarCentrosClientes();
            setCentros(centrosData);
            setLoading(false);
        };
        fetchData();
    }, []);

      // Filtrar soportes por año
      const soportesFiltrados = soportes.filter(soporte => {
        const fecha = new Date(soporte.fecha_soporte);
        return fecha.getFullYear() === añoSeleccionado;
    });
    // Calcular total de cambios de equipos
    const totalCambiosEquipos = soportesFiltrados.filter(soporte => soporte.cambio_equipo).length;


    const resetForm = () => {
        setCentroId('');
        setProblema('');
        setTipo('');
        setFechaSoporte('');
        setSolucion('');
        setCategoriaFalla('');
        setCambioEquipo(false);
        setEquipoCambiado('');
        setEditarSoporte(null);
    };

    const handleGuardarSoporte = async () => {
        const soporteData = {
            centro_id: parseInt(centroId, 10),  // Convertir a número entero
            problema,
            tipo,
            fecha_soporte: fechaSoporte,
            solucion,
            categoria_falla: categoriaFalla,
            cambio_equipo: cambioEquipo,
            equipo_cambiado: equipoCambiado
        };

        if (editarSoporte) {
            await modificarSoporte(editarSoporte.id_soporte, soporteData, async () => {
                await cargarSoportes(setSoportes);
                resetForm();
                setShowModal(false);
            });
        } else {
            await agregarSoporte(soporteData, async () => {
                await cargarSoportes(setSoportes);
                resetForm();
                setShowModal(false);
            });
        }
    };

    const handleEliminarSoporte = async (id) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este soporte?")) {
            await borrarSoporte(id, async () => {
                await cargarSoportes(setSoportes);
            });
        }
    };

    const handleEditarSoporte = (soporte) => {
        setEditarSoporte(soporte);
        setCentroId(soporte.centro.id_centro);
        setProblema(soporte.problema);
        setTipo(soporte.tipo);
        setFechaSoporte(soporte.fecha_soporte);
        setSolucion(soporte.solucion);
        setCategoriaFalla(soporte.categoria_falla);
        setCambioEquipo(soporte.cambio_equipo);
        setEquipoCambiado(soporte.equipo_cambiado);
        setShowModal(true);
    };
    const formatearFecha = (fecha) => {
        if (!fecha) return ''; // Si no hay fecha, retorna vacío
    
        const fechaObj = new Date(fecha);
    
        // Ajustar fecha para eliminar el desfase de la zona horaria
        fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
    
        const dia = String(fechaObj.getDate()).padStart(2, '0'); // Día con dos dígitos
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0'); // Mes con dos dígitos
        const año = fechaObj.getFullYear(); // Año completo
    
        return `${dia}/${mes}/${año}`; // Retornar en formato DD/MM/YYYY
    };
    const columns = [
        { name: 'ID', selector: row => row.id_soporte, sortable: true },
        { name: 'Centro', selector: row => row.centro?.nombre || 'No asignado', sortable: true },
        { name: 'Problema', selector: row => row.problema, sortable: true },
        { name: 'Tipo', selector: row => row.tipo, sortable: true },
        { name: 'Fecha', selector: row => formatearFecha(row.fecha_soporte), sortable: true },
        { name: 'Solución', selector: row => row.solucion || '-', sortable: true },
        { name: 'Categoría', selector: row => row.categoria_falla || '-', sortable: true },
        { name: 'Cambio Equipo', selector: row => (row.cambio_equipo ? 'Sí' : 'No'), sortable: true },
        { name: 'Equipo Cambiado', selector: row => row.equipo_cambiado || '-', sortable: true },
        {
            name: 'Acciones',
            cell: row => (
                <div>
                    <button className="btn btn-warning btn-sm" onClick={() => handleEditarSoporte(row)}> <i className="fas fa-edit"></i></button>
                    <button className="btn btn-danger btn-sm ml-2" onClick={() => handleEliminarSoporte(row.id_soporte)}><i className="fas fa-trash-alt"></i></button>
                </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true
        }
    ];

    return (
        <div className="container-fluid">
            <h3>Historial de Soporte</h3>

            {/* Filtro por año */}
            <div className="row mb-3">
                <div className="col-md-2">
                    <label>Seleccionar Año:</label>
                    <select
                        className="form-control"
                        value={añoSeleccionado}
                        onChange={(e) => setAñoSeleccionado(parseInt(e.target.value, 10))}
                    >
                        <option value={new Date().getFullYear()}>Año Actual</option>
                        <option value={new Date().getFullYear() - 1}>Año Anterior</option>
                    </select>
                </div>
            </div>

             {/* Tarjeta de total cambios de equipo */}
             <div className="row mb-2">
                <div className="col-md-2 ">
                    <div className="card text-white bg-info">
                        <div className="card-header">
                            <h5>Total Cambios Equipos {añoSeleccionado}</h5>
                        </div>
                        <div className="card-body">
                            <h2 className="text-center">{totalCambiosEquipos}</h2>
                        </div>
                    </div>
                </div>
            </div>

            <button className="btn btn-primary mb-3" onClick={() => { resetForm(); setShowModal(true); }}>Crear Soporte</button>

            
            <div className="card w-100 mx-auto" style={{ maxWidth: "95%" }}>
                    <div className="card-body">
                        <DataTable
                            columns={columns}
                            data={soportes}
                            progressPending={loading}
                            pagination
                            highlightOnHover
                            pointerOnHover
                        />
                    </div>
                </div>
            
            {/* Modal */}
            {showModal && (
                <div className="modal show" style={{ display: 'block' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5>{editarSoporte ? 'Editar Soporte' : 'Crear Soporte'}</h5>
                                <button className="close" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            <div className="modal-body">
                            <div className="form-group">
                                    <label>Centro</label>
                                    <select
                                            className="form-control"
                                            value={centroId}
                                            onChange={(e) => setCentroId(e.target.value)}
                                        >
                                            <option value="">Seleccione un centro</option>
                                            {centros && centros.map(centro => (
                                                <option key={centro.id} value={centro.id}>
                                                    {centro.nombre} - {centro.cliente}
                                                </option>
                                            ))}
                                        </select>

                                </div>



                                <input placeholder="Problema" value={problema} onChange={e => setProblema(e.target.value)} className="form-control mb-2" />
                                <select value={tipo} onChange={e => setTipo(e.target.value)} className="form-control mb-2">
                                    <option value="">Tipo</option>
                                    <option value="terreno">Terreno</option>
                                    <option value="remoto">Remoto</option>
                                </select>
                                <input type="date" value={fechaSoporte} onChange={e => setFechaSoporte(e.target.value)} className="form-control mb-2" />
                                <input placeholder="Solución" value={solucion} onChange={e => setSolucion(e.target.value)} className="form-control mb-2" />
                                <input placeholder="Categoría Falla" value={categoriaFalla} onChange={e => setCategoriaFalla(e.target.value)} className="form-control mb-2" />
                                <label><input type="checkbox" checked={cambioEquipo} onChange={e => setCambioEquipo(e.target.checked)} /> ¿Cambio de Equipo?</label>
                                <input placeholder="Equipo Cambiado" value={equipoCambiado} onChange={e => setEquipoCambiado(e.target.value)} className="form-control mb-2" />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cerrar</button>
                                <button className="btn btn-primary" onClick={handleGuardarSoporte}>Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Soporte;

