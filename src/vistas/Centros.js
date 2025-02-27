import React, { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
import { agregarCentro, cargarCentros, modificarCentro, borrarCentro} from '../controllers/centrosControllers';
import { cargarClientes } from '../controllers/clienteControllers';
import { cargarTodasRazonesSociales } from '../controllers/razonSocialControllers';

function Centros() {
    // Estados para cada campo del formulario
    const [clientes, setClientes] = useState([]);//Mantiene un arreglo de todos los clientes. Este estado es útil para listar clientes en un formulario desplegable o para realizar operaciones que involucren a todos los clientes disponibles.
    const [razonesSociales, setRazonesSociales] = useState([]);
    const [centros, setCentros] = useState([]);

    const [resumenClientes, setResumenClientes] = useState([]);//resumen clientes x centros
       
    const [editarCentro, setEditarCentro] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [filterCliente, setFilterCliente] = useState('');
    
    const [clienteId, setClienteId] = useState('');
    const [razonSocialId, setRazonSocialId] = useState('');
    const [nombre, setNombre] = useState('');
    const [nombrePonton, setNombrePonton] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [correoCentro, setCorreoCentro] = useState('');
    const [area, setArea] = useState('');
    const [telefono, setTelefono] = useState('');
    const [fechaInstalacion, setFechaInstalacion] = useState('');
    const [fechaActivacion, setFechaActivacion] = useState('');
    const [fechaTermino, setFechaTermino] = useState('');
    const [cantidadRadares, setCantidadRadares] = useState(0);
    const [cantidadCamaras, setCantidadCamaras] = useState(0);
    const [baseTierra, setBaseTierra] = useState(false);
    const [respaldoAdicional, setRespaldoAdicional] = useState(false);
    const [valorContrato, setValorContrato] = useState(0);
    const [estado, setEstado] = useState('activo');

    useEffect(() => {
        cargarClientes(setClientes);
       
        cargarTodasRazonesSociales(setRazonesSociales); // Cambia aquí para cargar todas las razones sociales
        
        setLoading(true);

        cargarCentros((data) => {
            setCentros(data);
            console.log("Total centros cargados:", data.length);
            setLoading(false);
            generarResumenClientes(data);//generar resumen
        });
    }, []);
          //resumen targetas por cliente

          const generarResumenClientes = (centrosData) => {
            const resumen = centrosData.reduce((acc, centro) => {
                const clienteNombre = centro.cliente;
                if (!acc[clienteNombre]) {
                    acc[clienteNombre] = {
                        nombre: clienteNombre,
                        total: 0,
                        activo: 0,
                        cese: 0,
                        traslado: 0,
                        retiro: 0,
                    };
                }
                acc[clienteNombre].total += 1;
                // Normaliza y cuenta los estados
                  const estadoNormalizado = centro.estado.toLowerCase();
                  if (estadoNormalizado === 'activo') {
                      acc[clienteNombre].activo += 1;
                  } else if (estadoNormalizado === 'cese') {
                      acc[clienteNombre].cese += 1;
                  } else if (estadoNormalizado === 'traslado') {
                      acc[clienteNombre].traslado += 1;
                  } else if (estadoNormalizado === 'retirado' || estadoNormalizado === 'retiro') {
                      acc[clienteNombre].retiro += 1;
                  }


                return acc;
            }, {});
    
            setResumenClientes(Object.values(resumen));
        };




    const handleGuardarCentro = async () => {
        const datosCentro = {
            cliente_id: clienteId,
            razon_social_id: razonSocialId,
            nombre: nombre,
            nombre_ponton: nombrePonton || "",
            ubicacion: ubicacion || "",
            correo_centro: correoCentro || "",
            area: area || "",
            telefono: telefono || "",
            fecha_instalacion: fechaInstalacion || null,
            fecha_activacion: fechaActivacion || null,
            fecha_termino: fechaTermino || null,
            cantidad_radares: parseInt(cantidadRadares, 10),
            cantidad_camaras: parseInt(cantidadCamaras, 10),
            base_tierra: baseTierra  === 'true' || false,
            respaldo_adicional: respaldoAdicional === 'true' || false,
            valor_contrato: parseFloat(valorContrato),
            estado,
        };

        try {
          if (editarCentro) {
              // Log para verificar los datos que se envían
              console.log("Editando centro:", editarCentro.id, datosCentro);
              
              // Modo de edición: actualizar el centro existente
              await modificarCentro(editarCentro.id, datosCentro);
              alert('Centro actualizado exitosamente');
          } else {
              // Modo de creación: agregar un nuevo centro
              await agregarCentro(datosCentro);
              alert('Centro creado exitosamente');
          }
  
          // Recargar los centros después de crear o editar
          await cargarCentros(setCentros); // Agregar await para esperar la recarga
          
         window.$('#modalCentro').modal('hide');
          resetForm();
      } catch (error) {
          alert('Error al guardar el centro');
          console.error(error);
      }
    };

      const handleEditarCentro = (centro) => {
        // Establece los valores del formulario con los datos del centro seleccionado
        setClienteId(centro.cliente_id);
        setRazonSocialId(centro.razon_social_id);
        setNombre(centro.nombre);
        setNombrePonton(centro.nombre_ponton || "");
        setUbicacion(centro.ubicacion || "");
        setCorreoCentro(centro.correo_centro || "");
        setArea(centro.area || "");
        setTelefono(centro.telefono || "");
        setFechaInstalacion(centro.fecha_instalacion || "");
        setFechaActivacion(centro.fecha_activacion || "");
        setFechaTermino(centro.fecha_termino || "");
        setCantidadRadares(centro.cantidad_radares || 0);
        setCantidadCamaras(centro.cantidad_camaras || 0);
        setBaseTierra(centro.base_tierra || false);
        setRespaldoAdicional(centro.respaldo_adicional || false);
        setValorContrato(centro.valor_contrato || 0);
        setEstado(centro.estado || "activo");

            // Configura el centro en edición para utilizarlo al guardar
        setEditarCentro(centro);

        // Abre el modal en modo de edición
        window.$('#modalCentro').modal('show'); // Abre el modal
         
      };
      //color de estados

      const getStatusColor = (estado) => {
        switch (estado) {
            case 'activo':
                return 'green';
            case 'cese':
                return 'orange';
            case 'traslado':
                return '#FFD700';
            case 'retirado':
                return 'red';
            default:
                return 'gray';
        }
          };
          //eliminar
          const handleEliminarCentro = (id) => {
            if (window.confirm('¿Estás seguro de que quieres eliminar este centro?')) {
                borrarCentro(id, () => {
                    cargarCentros(setCentros);
                });
            }
        };
    
       // Reiniciar el formulario
          const resetForm = () => {
            setClienteId('');
            setRazonSocialId('');
            setNombre('');
            setNombrePonton('');
            setUbicacion('');
            setCorreoCentro('');
            setArea('');
            setTelefono('');
            setFechaInstalacion('');
            setFechaActivacion('');
            setFechaTermino('');
            setCantidadRadares(0);
            setCantidadCamaras(0);
            setBaseTierra(false);
            setRespaldoAdicional(false);
            setValorContrato(0);
            setEstado('activo');
            setEditarCentro(null); // Opcional: si tienes un estado para el centro en edición, lo restableces también
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

          //tabla
          const columns = [
            {
                name: 'ID',
                selector: row => row.id,
                sortable: true,
                width: '70px',
            },
            {
                name: 'Nombre',
                selector: row => row.nombre,
                sortable: true,
                grow: 2,
                wrap: true,
            },
            {
              name: 'Ponton',
              selector: row => row.nombre_ponton,
              sortable: true,
              grow: 1,
              wrap: true,
          },
            {
                name: 'Cliente',
                selector: row => row.cliente,
                sortable: true,
                grow: 1,
                wrap: true,
            },
            {
                name: 'Razón Social',
                selector: row => row.razon_social,
                sortable: true,
                grow: 2,
                wrap: true,
            },
            {
                name: 'N° Radares',
                selector: row => row.cantidad_radares,
                sortable: true,
                width: '110px',
            },
            {
                name: 'N° Cámaras',
                selector: row => row.cantidad_camaras,
                sortable: true,
                width: '110px',
            },
            { name: 'Teléfono', selector: row => row.telefono, width: '90px' },
            { name: 'Correo', selector: row => row.correo_centro, width: '200px', wrap: true },
            { name: 'Ubicación', selector: row => row.ubicacion, grow: 1, wrap: true },
            { name: 'Área', selector: row => row.area, width: '100px' },
            { name: 'F.instalacion', selector: row => formatearFecha(row.fecha_instalacion), width: '120px' },
            {
                name: 'Estado',
                selector: row => row.estado,
                cell: (row) => (
                    <span style={{ color: getStatusColor(row.estado), fontWeight: 'bold' }}>
                        {row.estado}
                    </span>
                ),
                sortable: true,
                width: '120px',
            },
            {
                name: 'Acciones',
                cell: (row) => (
                    <div className="d-flex justify-content-around">
                        <button className="btn btn-warning btn-sm" onClick={() => handleEditarCentro(row)}>
                          <i className="fas fa-edit"></i></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleEliminarCentro(row.id)}><i className="fas fa-trash-alt"></i></button>
                    </div>
                ),
                width: '150px',
            },
        ];

        const filteredCentros = centros.filter((centro) => {
          // Si no hay texto en los filtros, devuelve todos los registros
          const matchNombre = filterText ? centro.nombre.toLowerCase().includes(filterText.toLowerCase()) : true;
          const matchCliente = filterCliente ? centro.cliente.toLowerCase().includes(filterCliente.toLowerCase()) : true;
          return matchNombre && matchCliente;
      });
      
  

    return (
        <div>
          <section className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1>Ingreso de Centros</h1>
                        </div>
                    </div>
                </div>
            </section>
               {/* resumen */}
               <section className="content"> 
                    <div className="container-fluid">
                        <div className="row">
                            {resumenClientes.map((cliente, index) => (
                                <div className="col-lg-3 col-6 mb-1" key={index}>
                                    <div className="small-box p-3 border rounded" style={{ borderColor: 'lightgray', borderWidth: '2px' }}>
                                        {/* Parte superior de la tarjeta en azul */}
                                        <div className="bg-info text-white text-center py-2 rounded-top" style={{ margin: '-1rem', marginBottom: '1rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                                            <h4 className="mb-0">{cliente.nombre}</h4>
                                        </div>
                                        {/* Contenido de la tarjeta */}
                                        <div className="inner">
                                            <p className="mb-1"><strong>Total de Centros:</strong> {cliente.total}</p>
                                            <p className="mb-1 text-success"><strong>Activos:</strong> {cliente.activo}</p>
                                            <p className="mb-1 text-secondary"><strong>En Cese:</strong> {cliente.cese}</p>
                                            <p className="mb-1 text-warning"><strong>En Traslado:</strong> {cliente.traslado}</p>
                                            <p className="mb-1 text-danger"><strong>Retirados:</strong> {cliente.retiro}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>




            {/* buscar */}
            <section className="content">
                <div className="container-fluid">
                    <div className="d-flex flex-column mb-3">
                        <input
                            type="text"
                            placeholder="Buscar por cliente"
                            className="form-control mb-2"
                            style={{ maxWidth: '300px' }}
                            value={filterCliente}
                            onChange={(e) => setFilterCliente(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Buscar por centro"
                            className="form-control mb-2"
                            style={{ maxWidth: '300px' }}
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                                {/* boton crear centro */}
                                <button
                                    className="btn btn-primary" style={{ maxWidth: '150px' }}
                                    onClick={() => {
                                        resetForm();
                                        window.$('#modalCentro').modal('show'); 
                                    }} >  Crear Centro
                                </button>
                                {/* boton crear centro */}
                    </div>
                    <DataTable
                        columns={columns}
                        data={filteredCentros}
                        progressPending={loading}
                        pagination
                        highlightOnHover
                        pointerOnHover
                        responsive
                        noDataComponent="No hay centros disponibles"
                        paginationRowsPerPageOptions={[5, 10, 15, 20, 30]}
                    />
                </div>
            </section>

            

            {/* Modal para crear centro */}
            <div className="modal fade" id="modalCentro" tabIndex="-1" role="dialog" aria-labelledby="modalCentroLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="modalCentroLabel">{editarCentro ? 'Editar Centro' : 'Crear Centro'}</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-group">
                                    <label>Cliente</label>
                                    <select
                                        className="form-control"
                                        value={clienteId}
                                        onChange={(e) => setClienteId(e.target.value)}
                                    >
                                        <option value="">Seleccione un cliente</option>
                                        {clientes.map((cliente) => (
                                            <option key={cliente.id_cliente} value={cliente.id_cliente}>
                                                {cliente.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Razón Social</label>
                                    <select
                                        className="form-control"
                                        value={razonSocialId}
                                        onChange={(e) => setRazonSocialId(e.target.value)}
                                    >
                                        <option value="">Seleccione una razón social</option>
                                        {razonesSociales.map((razon) => (
                                            <option key={razon.id_razon_social} value={razon.id_razon_social}>
                                                {razon.razon_social}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Nombre del Centro</label>
                                    <input type="text" className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Nombre del Pontón</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={nombrePonton}
                                        onChange={(e) => setNombrePonton(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Ubicación</label>
                                    <input type="text" className="form-control" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Correo del Centro</label>
                                    <input type="email" className="form-control" value={correoCentro} onChange={(e) => setCorreoCentro(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Área</label>
                                    <input type="text" className="form-control" value={area} onChange={(e) => setArea(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Teléfono</label>
                                    <input type="text" className="form-control" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Fecha de Instalacion</label>
                                    <input type="date" className="form-control" value={fechaInstalacion} onChange={(e) => setFechaInstalacion(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Fecha de Activación</label>
                                    <input type="date" className="form-control" value={fechaActivacion} onChange={(e) => setFechaActivacion(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Base Tierra</label>
                                    <select
                                        className="form-control"
                                        value={baseTierra}
                                        onChange={(e) => setBaseTierra(e.target.value === 'true')}
                                    >
                                        <option value="true">Sí</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Respaldo Adicional</label>
                                    <select
                                        className="form-control"
                                        value={respaldoAdicional}
                                        onChange={(e) => setRespaldoAdicional(e.target.value === 'true')}
                                    >
                                        <option value="true">Sí</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Fecha de Término</label>
                                    <input type="date" className="form-control" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Cantidad de Radares</label>
                                    <input type="number" className="form-control" value={cantidadRadares} onChange={(e) => setCantidadRadares(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Cantidad de Cámaras</label>
                                    <input type="number" className="form-control" value={cantidadCamaras} onChange={(e) => setCantidadCamaras(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Valor del Contrato</label>
                                    <input type="number" step="0.01" className="form-control" value={valorContrato} onChange={(e) => setValorContrato(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select className="form-control" value={estado} onChange={(e) => setEstado(e.target.value)}>
                                        <option value="activo">Activo</option>
                                        <option value="traslado">Traslado</option>
                                        <option value="cese">Cese</option>
                                        <option value="retirado">Retirado</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cerrar</button>
                            <button type="button" className="btn btn-primary" onClick={handleGuardarCentro}>Guardar Centro</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Centros;
