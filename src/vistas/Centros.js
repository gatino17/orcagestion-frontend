import React, { useEffect, useMemo, useState } from 'react';
import DataTable from 'react-data-table-component';
import { agregarCentro, cargarCentros, modificarCentro, borrarCentro} from '../controllers/centrosControllers';
import { cargarClientes } from '../controllers/clienteControllers';
import { cargarTodasRazonesSociales } from '../controllers/razonSocialControllers';
import './Centros.css';
import { jwtDecode } from 'jwt-decode';

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
    const [rolUsuario, setRolUsuario] = useState('');
    const [growthYear, setGrowthYear] = useState(new Date().getFullYear());
    const [growthMonth, setGrowthMonth] = useState('all');
    const [clienteGrafico, setClienteGrafico] = useState('all');
    const [hoverInfo, setHoverInfo] = useState(null);

    useEffect(() => {
        setHoverInfo(null);
    }, [clienteGrafico, growthYear, growthMonth]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setRolUsuario(decoded.rol || '');
            } catch (error) {
                console.error('Error al decodificar token en Centros:', error);
            }
        }

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

    const obtenerFechaCentro = (centro) => centro.fecha_instalacion || centro.fecha_activacion;

    const normalizarFechaInput = (fecha) => {
        if (!fecha) return '';
        const parsed = new Date(fecha);
        if (Number.isNaN(parsed.getTime())) return '';
        parsed.setMinutes(parsed.getMinutes() - parsed.getTimezoneOffset());
        return parsed.toISOString().split('T')[0];
    };

    const growthYears = useMemo(() => {
        const years = new Set();
        centros.forEach((centro) => {
            const rawDate = obtenerFechaCentro(centro);
            if (!rawDate) return;
            const fecha = new Date(rawDate);
            if (!Number.isNaN(fecha.getTime())) {
                years.add(fecha.getFullYear());
            }
        });
        return Array.from(years).sort((a, b) => a - b);
    }, [centros]);

    useEffect(() => {
        if (!growthYears.length) return;
        if (growthYear !== 'all' && !growthYears.includes(growthYear)) {
            setGrowthYear(growthYears[growthYears.length - 1]);
        }
    }, [growthYears, growthYear]);

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

    useEffect(() => {
        if (centros.length) {
            generarResumenClientes(centros);
        } else {
            setResumenClientes([]);
        }
    }, [centros]);

        const monthLabels = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    const monthIndexFilter = useMemo(() => {
        if (growthMonth === 'all') return null;
        const value = Number(growthMonth);
        return Number.isNaN(value) ? null : value;
    }, [growthMonth]);

    const crecimientoMensual = useMemo(() => {
        if (!centros.length) {
            return { months: monthLabels, series: [], detalles: {}, estadoSeries: {}, estadoDetalles: {} };
        }

        const map = {};
        const detallesMap = {};
        const estadoSeries = {};
        const estadoDetalles = {};
        const targetYear = growthYear === 'all' ? null : growthYear;
        centros.forEach((centro) => {
            if (!centro.cliente) return;
            const rawDate = obtenerFechaCentro(centro);
            if (!rawDate) return;
            const fecha = new Date(rawDate);
            if (Number.isNaN(fecha.getTime())) return;
            const cliente = centro.cliente;
            if (!map[cliente]) {
                map[cliente] = new Array(12).fill(0);
            }
            if (!detallesMap[cliente]) {
                detallesMap[cliente] = Array.from({ length: 12 }, () => []);
            }
            if (!estadoSeries[cliente]) {
                estadoSeries[cliente] = {
                    activo: new Array(12).fill(0),
                    cese: new Array(12).fill(0),
                    traslado: new Array(12).fill(0),
                    retirado: new Array(12).fill(0)
                };
            }
            if (!estadoDetalles[cliente]) {
                estadoDetalles[cliente] = {
                    activo: Array.from({ length: 12 }, () => []),
                    cese: Array.from({ length: 12 }, () => []),
                    traslado: Array.from({ length: 12 }, () => []),
                    retirado: Array.from({ length: 12 }, () => [])
                };
            }

            const estadoCentro = (centro.estado || '').toLowerCase();

            const startYear = fecha.getFullYear();
            const startMonth = fecha.getMonth();

            let fechaTermino = null;
            if (centro.fecha_termino) {
                const parsedFin = new Date(centro.fecha_termino);
                if (!Number.isNaN(parsedFin.getTime())) {
                    fechaTermino = parsedFin;
                }
            }

            const endYear = fechaTermino ? fechaTermino.getFullYear() : null;
            const endMonth = fechaTermino ? fechaTermino.getMonth() : null;

            const addRange = (from, to) => {
                const safeStart = Math.max(0, Math.floor(from));
                const safeEnd = Math.min(11, Math.floor(to));
                if (Number.isNaN(safeStart) || Number.isNaN(safeEnd) || safeEnd < safeStart) {
                    return;
                }
                for (let m = safeStart; m <= safeEnd; m += 1) {
                    map[cliente][m] += 1;
                    const centroNombre = centro.nombre || `Centro ${centro.id}`;
                    if (!detallesMap[cliente][m].includes(centroNombre)) {
                        detallesMap[cliente][m].push(centroNombre);
                    }
                    if (estadoSeries[cliente][estadoCentro]) {
                        estadoSeries[cliente][estadoCentro][m] += 1;
                        if (!estadoDetalles[cliente][estadoCentro][m].includes(centroNombre)) {
                            estadoDetalles[cliente][estadoCentro][m].push(centroNombre);
                        }
                    }
                }
            };

            const getEndIndexForYear = (year) => {
                if (!fechaTermino) return 11;
                if (endYear < year) return -1;
                if (endYear === year) {
                    return Math.min(11, Math.max(0, endMonth));
                }
                return 11;
            };

            if (targetYear === null) {
                const endIdx = getEndIndexForYear(startYear);
                if (endIdx < 0) return;
                addRange(startMonth, endIdx);
                return;
            }

            if (startYear > targetYear) {
                return;
            }

            const endIdxTarget = getEndIndexForYear(targetYear);
            if (endIdxTarget < 0) {
                return;
            }

            const fromMonth = startYear < targetYear ? 0 : startMonth;
            addRange(fromMonth, endIdxTarget);
        });

        const series = Object.entries(map).map(([clienteNombre, points]) => ({
            cliente: clienteNombre,
            points
        }));

        return { months: monthLabels, series, detalles: detallesMap, estadoSeries, estadoDetalles };
    }, [centros, growthYear, monthLabels]);

    const visibleMonths = useMemo(() => {
        const total = crecimientoMensual.months.length || 0;
        if (monthIndexFilter === null || monthIndexFilter >= total) {
            return crecimientoMensual.months;
        }
        return crecimientoMensual.months.slice(0, monthIndexFilter + 1);
    }, [crecimientoMensual.months, monthIndexFilter]);

    const clientesDisponibles = useMemo(() => {
        const set = new Set();
        centros.forEach((centro) => {
            if (centro.cliente) {
                set.add(centro.cliente);
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [centros]);

    const estadosClienteSeleccionado = useMemo(() => {
        if (clienteGrafico === 'all') return null;
        const base = { activo: 0, traslado: 0, cese: 0, retirado: 0 };
        centros.forEach((centro) => {
            if (centro.cliente !== clienteGrafico) return;
            const estadoKey = (centro.estado || '').toLowerCase();
            if (base[estadoKey] !== undefined) {
                base[estadoKey] += 1;
            }
        });
        return base;
    }, [clienteGrafico, centros]);

    const estadoChips = [
        { key: 'activo', label: 'Activos', color: '#22c55e' },
        { key: 'traslado', label: 'Traslados', color: '#f97316' },
        { key: 'cese', label: 'En cese', color: '#eab308' },
        { key: 'retirado', label: 'Retirados', color: '#ef4444' }
    ];

        const buildLinePath = (values = [], width = 520, height = 140, maxValue = 1) => {
            if (!values.length) return "";
            const max = Math.max(...values, maxValue, 1);
            const total = values.length;

            if (total === 1) {
                const x = width / 2;
                const y = height - (values[0] / max) * height;
                return `M${x} ${y} L${x} ${y}`;
            }

            const step = width / total;
            return values
                .map((value, index) => {
                    const x = step * index + step / 2;
                    const y = height - (value / max) * height;
                    return `${index === 0 ? "M" : "L"}${x} ${y}`;
                })
                .join(" " );
        };
        const lineColors = ["#fb923c", "#38bdf8", "#22c55e", "#f472b6", "#a855f7", "#fcd34d"];

        const orderedGrowthSeries = useMemo(() => {
            const limit = visibleMonths.length || crecimientoMensual.months.length;
            let baseSeries = [...crecimientoMensual.series];
            if (clienteGrafico !== 'all') {
                baseSeries = baseSeries.filter((serie) => serie.cliente === clienteGrafico);
            }

            const sorted = baseSeries
                .filter((serie) => (serie.points || []).some((value) => value > 0))
                .sort((a, b) => {
                    const lastA = a.points[a.points.length - 1] || 0;
                    const lastB = b.points[b.points.length - 1] || 0;
                    return lastB - lastA;
                })
                .map((serie, index) => ({
                    ...serie,
                    points: serie.points.slice(0, limit),
                    color: lineColors[index % lineColors.length]
                }));

            return clienteGrafico === 'all' ? sorted.slice(0, 5) : sorted;
        }, [crecimientoMensual.series, clienteGrafico, visibleMonths.length, crecimientoMensual.months.length]);

        const estadoSeriesCliente = useMemo(() => {
            if (clienteGrafico === 'all') return null;
            const estadoData = crecimientoMensual.estadoSeries[clienteGrafico];
            if (!estadoData) return null;
            const limit = visibleMonths.length || crecimientoMensual.months.length;
            return [
                {
                    cliente: clienteGrafico,
                    displayName: `${clienteGrafico} · Activos`,
                    points: (estadoData.activo || []).slice(0, limit),
                    color: '#22c55e',
                    metaEstado: 'activo'
                },
                {
                    cliente: clienteGrafico,
                    displayName: `${clienteGrafico} · Ceses`,
                    points: (estadoData.cese || []).slice(0, limit),
                    color: '#ef4444',
                    metaEstado: 'cese'
                }
            ];
        }, [clienteGrafico, crecimientoMensual.estadoSeries, visibleMonths.length, crecimientoMensual.months.length]);

        const totalActivosActual = useMemo(
            () =>
                orderedGrowthSeries.reduce(
                    (sum, serie) => sum + (serie.points[serie.points.length - 1] || 0),
                    0
                ),
            [orderedGrowthSeries]
        );

        const monthlyTotals = useMemo(() => {
            const totals = visibleMonths.map((_, idx) =>
                orderedGrowthSeries.reduce(
                    (sum, serie) => sum + (serie.points[idx] || 0),
                    0
                )
            );
            return totals;
        }, [orderedGrowthSeries, visibleMonths]);

        const busiestMonthIndex = monthlyTotals.length
            ? monthlyTotals.reduce(
                  (best, value, idx) => (value > monthlyTotals[best] ? idx : best),
                  0
              )
            : 0;

        const growthMetrics = orderedGrowthSeries.length
            ? [
                  {
                      label: "Clientes activos",
                      value: orderedGrowthSeries.length,
                      
                  },
                      {
                      label: growthYear === "all" ? "Total histórico" : `Total ${growthYear}`,
                      value: totalActivosActual
                  },
                  {
                      label: "Mes más activo",
                      value: crecimientoMensual.months[busiestMonthIndex] || "-",
                      subtitle: `${monthlyTotals[busiestMonthIndex] || 0} centros`
                  }
              ]
            : [];

        const chartWidth = 800;
        const chartHeight = 140;
        const labelOffset = 4;
        const chartMaxValue = Math.max(
            ...orderedGrowthSeries.flatMap((serie) => serie.points),
            1
        );
        const yTicks = useMemo(() => {
            const ticks = [];
            const max = chartMaxValue || 1;
            const step = Math.max(1, Math.ceil(max / 4));
            for (let value = 0; value <= max; value += step) {
                ticks.push(value);
            }
            if (ticks[ticks.length - 1] !== max) {
                ticks.push(max);
            }
            if (ticks.length >= 2) {
                const last = ticks[ticks.length - 1];
                const prev = ticks[ticks.length - 2];
                if (last - prev < step) {
                    ticks.splice(ticks.length - 2, 1);
                }
            }
            return ticks.reverse();
        }, [chartMaxValue]);




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
        setClienteId(centro.cliente_id ? String(centro.cliente_id) : '');
        setRazonSocialId(centro.razon_social_id ? String(centro.razon_social_id) : '');
        setNombre(centro.nombre);
        setNombrePonton(centro.nombre_ponton || "");
        setUbicacion(centro.ubicacion || "");
        setCorreoCentro(centro.correo_centro || "");
        setArea(centro.area || "");
        setTelefono(centro.telefono || "");
        setFechaInstalacion(normalizarFechaInput(centro.fecha_instalacion));
        setFechaActivacion(normalizarFechaInput(centro.fecha_activacion));
        setFechaTermino(normalizarFechaInput(centro.fecha_termino));
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
                name: (
                    <span>
                        <i className="fas fa-broadcast-tower"></i> N° Radares
                    </span>
                ),
                selector: row => row.cantidad_radares,
                sortable: true,
                width: '120px',
                center: true
            },
            {
                name: (
                    <span>
                        <i className="fas fa-video"></i> N° Cámaras
                    </span>
                ),
                selector: row => row.cantidad_camaras,
                sortable: true,
                width: '120px',
                center: true
            },
            {
                name: (
                    <span>
                        <i className="fas fa-phone"></i> Teléfono
                    </span>
                ),
                selector: row => row.telefono,
                width: '140px',
                wrap: true
            },
            { name: 'Correo', selector: row => row.correo_centro, width: '200px', wrap: true },
            {
                name: (
                    <span>
                        <i className="fas fa-map-marker-alt"></i> Ubicacion / Area
                    </span>
                ),
                cell: (row) => (
                    <div className="location-area-cell">
                        <div className="loc-line">
                            <i className="fas fa-map-pin"></i> {row.ubicacion || 'Sin dato'}
                        </div>
                        <div className="area-line">
                            <i className="fas fa-layer-group"></i> {row.area || 'Sin dato'}
                        </div>
                    </div>
                ),
                grow: 2,
                wrap: true
            },
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
                width: '110px',
                center: true
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
                width: '120px',
                center: true
            },
        ];

        const filteredCentros = centros.filter((centro) => {
          const matchNombre = filterText ? centro.nombre.toLowerCase().includes(filterText.toLowerCase()) : true;
          const matchCliente = filterCliente ? centro.cliente.toLowerCase().includes(filterCliente.toLowerCase()) : true;
          return matchNombre && matchCliente;
      });

        const metricas = useMemo(() => {
            const activos = centros.filter((centro) => centro.estado?.toLowerCase() === 'activo').length;
            const cese = centros.filter((centro) => centro.estado?.toLowerCase() === 'cese').length;
            const retiro = centros.filter((centro) => {
                const estado = centro.estado?.toLowerCase();
                return estado === 'retirado' || estado === 'retiro';
            }).length;
            const traslado = centros.filter((centro) => centro.estado?.toLowerCase() === 'traslado').length;
            return [
                { label: 'Activos', value: activos, icon: 'fas fa-check-circle' },
                { label: 'En cese', value: cese, icon: 'fas fa-pause-circle' },
                { label: 'Retirados', value: retiro, icon: 'fas fa-times-circle' },
                { label: 'En traslado', value: traslado, icon: 'fas fa-truck' }
            ];
        }, [centros]);

        const dataTableStyles = useMemo(
            () => ({
                headCells: {
                    style: {
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        borderBottom: 'none'
                    }
                },
                rows: {
                    style: {
                        minHeight: '60px'
                    }
                },
                cells: {
                    style: {
                        wordBreak: 'break-word'
                    }
                },
                table: {
                    style: {
                        borderRadius: '18px',
                        overflow: 'hidden'
                    }
                },
                pagination: {
                    style: {
                        borderTop: '1px solid rgba(15,23,42,0.08)'
                    }
                }
            }),
            []
        );

    return (
        <>
        <div className="centros-page container-fluid">
            <div className="card centros-hero">
                <div className="centros-hero-content">
                    <span className="centros-hero-icon">
                        <i className="fas fa-map-marked-alt" />
                    </span>
                    <div>
                        <p className="centros-hero-kicker">Panel de centros</p>
                        <h2>Gestion de centros</h2>
                        <p className="centros-hero-subtitle">Administra ubicaciones, clientes y estados desde un solo lugar.</p>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        resetForm();
                        window.$('#modalCentro').modal('show');
                    }}
                >
                    <i className="fas fa-plus" /> Crear centro
                </button>
            </div>

            <div className="centros-metrics">
                {metricas.map((card) => (
                    <div key={card.label} className="centros-metric-card">
                        <span className="metric-icon">
                            <i className={card.icon} />
                        </span>
                        <div>
                            <span>{card.label}</span>
                            <h4>{card.value}</h4>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card centros-summary">
                <div className="centros-section-header">
                    <div className="centros-section-title">
                        <span className="section-icon">
                            <i className="fas fa-users"></i>
                        </span>
                        <div>
                            <h3>Resumen por cliente</h3>
                            <small>Distribucion de centros y estados</small>
                        </div>
                    </div>
                </div>
                <div className="summary-grid">
                    {resumenClientes.length ? (
                        resumenClientes.map((cliente, index) => (
                            <div className="summary-card" key={index}>
                                <div className="summary-card-header">
                                    <h4>{cliente.nombre}</h4>
                                    <span className="badge bg-light text-dark">{cliente.total} centros</span>
                                </div>
                                <ul>
                                    <li><i className="fas fa-check text-success"></i> Activos: {cliente.activo}</li>
                                    <li><i className="fas fa-pause text-secondary"></i> En cese: {cliente.cese}</li>
                                    <li><i className="fas fa-truck text-warning"></i> Traslado: {cliente.traslado}</li>
                                    <li><i className="fas fa-times text-danger"></i> Retirados: {cliente.retiro}</li>
                                </ul>
                            </div>
                        ))
                    ) : (
                        <div className="centros-empty">No hay informacion de resumen disponible.</div>
                    )}
                </div>
            </div>

                    {orderedGrowthSeries.length > 0 && (
                        <div className="card centros-growth-card">
                        <div className="centros-section-header">
                        <div className="centros-section-title">
                            <span className="section-icon">
                                <i className="fas fa-chart-line"></i>
                            </span>
                            <div>
                                <h3>Crecimiento mensual de clientes activos</h3>
                                <small>Visualiza la tendencia de crecimiento durante el año</small>
                            </div>
                        </div>
                        <div className="growth-controls">
                            {clientesDisponibles.length > 0 && (
                                <select
                                    className="form-control growth-client-select"
                                    value={clienteGrafico}
                                    onChange={(e) => setClienteGrafico(e.target.value)}
                                >
                                    <option value="all">Todos los clientes</option>
                                    {clientesDisponibles.map((cliente) => (
                                        <option key={cliente} value={cliente}>
                                            {cliente}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {growthYears.length > 0 && (
                                <div className="growth-period-selects">
                                    <select
                                        className="form-control growth-year-select"
                                        value={growthYear}
                                        onChange={(e) =>
                                            setGrowthYear(
                                                e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10)
                                            )
                                        }
                                    >
                                        <option value="all">Total histórico</option>
                                        {growthYears.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="form-control growth-month-select"
                                        value={growthMonth}
                                        onChange={(e) => setGrowthMonth(e.target.value)}
                                    >
                                        <option value="all">Todo el año</option>
                                        {monthLabels.map((month, idx) => (
                                            <option key={month} value={idx}>
                                                {month}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        </div>
                        {growthMetrics.length > 0 && (
                            <div className="growth-metrics">
                                {growthMetrics.map((metric) => (
                                    <div className="growth-metric-card" key={metric.label}>
                                        {metric.icon && (
                                            <span className="metric-icon">
                                                <i className={metric.icon}></i>
                                            </span>
                                        )}
                                        <div>
                                            <small>{metric.label}</small>
                                            <h4>{metric.value}</h4>
                                            {metric.subtitle && <span>{metric.subtitle}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {estadosClienteSeleccionado && (
                            <div className="client-status-summary">
                                {estadoChips.map((chip) => (
                                    <div className="client-status-pill" key={chip.key}>
                                        <span
                                            className="pill-dot"
                                            style={{ background: chip.color }}
                                        ></span>
                                        <div>
                                            <small>{chip.label}</small>
                                            <strong>{estadosClienteSeleccionado[chip.key] || 0}</strong>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="growth-legend growth-legend-top">
                            {(estadoSeriesCliente || orderedGrowthSeries).map((serie, index) => (
                                <div key={`${serie.cliente}-${serie.metaEstado || index}`} className="growth-legend-item">
                                <span
                                    className="legend-dot"
                                    style={{ background: serie.color || lineColors[index % lineColors.length] }}
                                ></span>
                                <span>
                                    {(serie.displayName || serie.cliente)} · {serie.points[serie.points.length - 1] || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                        <div className="growth-chart-lines">
                        <div className="growth-axis-y">
                            {yTicks.map((value) => {
                                const rawY = chartHeight - (value / chartMaxValue) * chartHeight;
                                const isMaxValue = value === chartMaxValue;
                                const yPosition = Math.max(0, rawY - (isMaxValue ? 6 : 0));

                                let translate = '-50%';
                                if (yPosition <= 8) {
                                    translate = '0';
                                } else if (yPosition >= chartHeight - 8) {
                                    translate = '-100%';
                                }

                                return (
                                    <span
                                        key={value}
                                        style={{
                                            top: `${yPosition}px`,
                                            transform: `translateY(${translate})`
                                        }}
                                    >
                                        {value}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="growth-chart-svg" onMouseLeave={() => setHoverInfo(null)}>
                            <div className="growth-tooltip-layer">
                                {hoverInfo && (
                                    <div
                                        className="growth-tooltip"
                                        style={{ left: hoverInfo.left, top: hoverInfo.top }}
                                    >
                                        <strong>{hoverInfo.clientLabel}</strong>
                                        <span className="tooltip-meta">
                                            {hoverInfo.month} · {hoverInfo.value} registros
                                        </span>
                                        {hoverInfo.metaEstado === 'activo' && hoverInfo.destacado && (
                                            <div className="tooltip-highlight">
                                                Último centro: <strong>{hoverInfo.destacado}</strong>
                                            </div>
                                        )}
                                        {hoverInfo.centros.length > 0 ? (
                                            <ul>
                                                {hoverInfo.centros.slice(0, 4).map((centro) => (
                                                    <li key={centro}>{centro}</li>
                                                ))}
                                                {hoverInfo.centros.length > 4 && (
                                                    <li className="tooltip-more">
                                                        +{hoverInfo.centros.length - 4} centros más
                                                    </li>
                                                )}
                                            </ul>
                                        ) : (
                                            <p className="tooltip-empty">Sin centros activos</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <svg
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                preserveAspectRatio="none"
                            >
                                {yTicks.map((tick) => {
                                    const y = chartHeight - (tick / chartMaxValue) * chartHeight;
                                    return (
                                        <line
                                            key={`grid-${tick}`}
                                            x1="0"
                                            y1={y}
                                            x2={chartWidth}
                                            y2={y}
                                            className="growth-grid-line"
                                        />
                                    );
                                })}
                                <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} className="growth-axis-line" />
                                {(estadoSeriesCliente || orderedGrowthSeries).map((serie, index) => {
                                    const path = buildLinePath(serie.points, chartWidth, chartHeight, chartMaxValue);
                                    const color = serie.color || lineColors[index % lineColors.length];
                                    const totalPoints = serie.points.length;
                                    const step = totalPoints ? chartWidth / totalPoints : chartWidth;
                                    return (
                                        <g key={`${serie.cliente}-${serie.metaEstado || 'total'}`}>
                                            <path
                                                d={path}
                                                stroke={color}
                                                fill="none"
                                                strokeWidth="1.4"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            {serie.points.map((value, i) => {
                                                if (value <= 0) return null;
                                                const x = totalPoints === 1 ? chartWidth / 2 : step * i + step / 2;
                                                const y = chartHeight - (value / chartMaxValue) * chartHeight;
                                                const centrosMes = serie.metaEstado
                                                    ? (crecimientoMensual.estadoDetalles?.[clienteGrafico]?.[serie.metaEstado]?.[i] || [])
                                                    : (crecimientoMensual.detalles?.[serie.cliente]?.[i] || []);
                                                return (
                                                    <g key={`${serie.cliente}-${i}`} className="growth-point">
                                                        <circle
                                                            cx={x}
                                                            cy={y}
                                                            r={1.4}
                                                            fill="transparent"
                                                            stroke={color}
                                                            strokeWidth="0.8"
                                                            onMouseEnter={() =>
                                                                    setHoverInfo({
                                                                        clientLabel: serie.displayName || serie.cliente,
                                                                        month: visibleMonths[i] || crecimientoMensual.months[i],
                                                                        value,
                                                                        centros: centrosMes,
                                                                    left: `${(x / chartWidth) * 100}%`,
                                                                    top: `${(y / chartHeight) * 100}%`,
                                                                    metaEstado: serie.metaEstado || null,
                                                                    destacado:
                                                                        serie.metaEstado === 'activo' && centrosMes.length
                                                                            ? centrosMes[centrosMes.length - 1]
                                                                            : null
                                                                })
                                                            }
                                                            onMouseLeave={() => setHoverInfo(null)}
                                                        />
                                                        {value > 0 && (
                                                            <text
                                                                x={x}
                                                                y={Math.max(10, y - labelOffset)}
                                                                textAnchor="middle"
                                                                fill={color}
                                                                fontSize="9"
                                                                fontWeight="600"
                                                            >
                                                                {value}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="growth-axis">
                                {visibleMonths.map((month) => (
                                    <span key={month}>{month}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card centros-filters">
                <div className="card-body filter-grid">
                    <div>
                        <label>Buscar por cliente</label>
                        <input
                            type="text"
                            className="form-control"
                            value={filterCliente}
                            onChange={(e) => setFilterCliente(e.target.value)}
                            placeholder="Nombre del cliente"
                        />
                    </div>
                    <div>
                        <label>Buscar por centro</label>
                        <input
                            type="text"
                            className="form-control"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Nombre del centro"
                        />
                    </div>
                </div>
            </div>

            <div className="card centros-table-card">
                <div className="card-body">
                    <div className="centros-table-wrapper">
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
                            customStyles={dataTableStyles}
                        />
                    </div>
                </div>
            </div>
        </div>

            

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
                                <div className="centro-form-section">
                                    <h5 className="centro-form-section-title">Fechas del servicio</h5>
                                    <div className="centro-form-dates">
                                        <div className="form-group highlight-install">
                                            <label>
                                                Fecha de Instalación
                                                <span className="date-pill">Principal</span>
                                            </label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={fechaInstalacion}
                                                onChange={(e) => setFechaInstalacion(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Fecha de Activación</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={fechaActivacion}
                                                onChange={(e) => setFechaActivacion(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Fecha de Término</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={fechaTermino}
                                                onChange={(e) => setFechaTermino(e.target.value)}
                                            />
                                        </div>
                                    </div>
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
                                    <label>Cantidad de Radares</label>
                                    <input type="number" className="form-control" value={cantidadRadares} onChange={(e) => setCantidadRadares(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Cantidad de Cámaras</label>
                                    <input type="number" className="form-control" value={cantidadCamaras} onChange={(e) => setCantidadCamaras(e.target.value)} />
                                </div>
                                {rolUsuario !== 'operaciones' && (
                                    <div className="form-group">
                                        <label>Valor del Contrato</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-control"
                                            value={valorContrato}
                                            onChange={(e) => setValorContrato(e.target.value)}
                                        />
                                    </div>
                                )}
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
        </>
    );
}

export default Centros;


