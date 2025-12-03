import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { cargarSoportes } from "../controllers/soporteControllers";
import "./SoporteDetalle.css";

const SoporteDetalle = () => {
    const [soportes, setSoportes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clienteSeleccionado, setClienteSeleccionado] = useState("");
    const [busquedaCentro, setBusquedaCentro] = useState("");
    const [filtroFecha, setFiltroFecha] = useState("mes-actual");
    const [fechaInicioPersonalizada, setFechaInicioPersonalizada] = useState("");
    const [fechaFinPersonalizada, setFechaFinPersonalizada] = useState("");
    const [verCategoriasCliente, setVerCategoriasCliente] = useState(false);
    const [categoriasPorCliente, setCategoriasPorCliente] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSoportes = async () => {
            setLoading(true);
            await cargarSoportes(setSoportes);
            setLoading(false);
        };

        fetchSoportes();
    }, []);

    useEffect(() => {
        if (!clienteSeleccionado) {
            setVerCategoriasCliente(false);
            setCategoriasPorCliente(false);
        }
    }, [clienteSeleccionado]);

    const clientesDisponibles = useMemo(() => {
        const nombres = soportes
            .map((soporte) => soporte.centro?.cliente)
            .filter((nombre) => !!nombre);
        return Array.from(new Set(nombres)).sort();
    }, [soportes]);

    const rangoFecha = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const construirFecha = (valor, finDeDia = false) => {
            if (!valor) return null;
            const fecha = new Date(valor);
            if (Number.isNaN(fecha.getTime())) return null;
            if (finDeDia) {
                fecha.setHours(23, 59, 59, 999);
            } else {
                fecha.setHours(0, 0, 0, 0);
            }
            return fecha;
        };

        switch (filtroFecha) {
            case "mes-actual": {
                const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
                const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return { inicio, fin };
            }
            case "anio-actual": {
                const inicio = new Date(now.getFullYear(), 0, 1);
                const fin = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                return { inicio, fin };
            }
            case "personalizado": {
                const inicio = construirFecha(fechaInicioPersonalizada);
                const fin = construirFecha(fechaFinPersonalizada, true);
                return { inicio, fin };
            }
            case "todos":
            default:
                return { inicio: null, fin: null };
        }
    }, [filtroFecha, fechaInicioPersonalizada, fechaFinPersonalizada]);

    const soportesFiltrados = useMemo(() => {
        return soportes.filter((soporte) => {
            const coincideCliente = clienteSeleccionado
                ? soporte.centro?.cliente === clienteSeleccionado
                : true;
            const coincideCentro = busquedaCentro
                ? soporte.centro?.nombre
                    ?.toLowerCase()
                    .includes(busquedaCentro.toLowerCase())
                : true;

            const coincideFecha = (() => {
                if (!rangoFecha.inicio && !rangoFecha.fin) return true;
                if (!soporte.fecha_soporte) return false;
                const fecha = new Date(soporte.fecha_soporte);
                if (Number.isNaN(fecha.getTime())) return false;
                if (rangoFecha.inicio && fecha < rangoFecha.inicio) return false;
                if (rangoFecha.fin && fecha > rangoFecha.fin) return false;
                return true;
            })();

            return coincideCliente && coincideCentro && coincideFecha;
        });
    }, [soportes, clienteSeleccionado, busquedaCentro, rangoFecha]);

    const totalFallas = soportesFiltrados.length;
    const totalCambiosEquipo = useMemo(() => {
        return soportesFiltrados.filter((soporte) => soporte.cambio_equipo).length;
    }, [soportesFiltrados]);
    const centrosAfectados = useMemo(() => {
        const nombres = soportesFiltrados
            .map((soporte) => soporte.centro?.nombre)
            .filter((nombre) => !!nombre);
        return new Set(nombres).size;
    }, [soportesFiltrados]);
    const clientesEnFiltro = useMemo(() => {
        const nombres = soportesFiltrados
            .map((soporte) => soporte.centro?.cliente)
            .filter((nombre) => !!nombre);
        return new Set(nombres).size;
    }, [soportesFiltrados]);

    const fallasPorCategoria = useMemo(() => {
        return soportesFiltrados.reduce((acc, soporte) => {
            const categoria = soporte.categoria_falla || "Sin categoria";
            acc[categoria] = (acc[categoria] || 0) + 1;
            return acc;
        }, {});
    }, [soportesFiltrados]);

    const fallasPorCategoriaCliente = useMemo(() => {
        if (!clienteSeleccionado) return {};
        const soportesCliente = soportesFiltrados.filter(
            (soporte) => soporte.centro?.cliente === clienteSeleccionado
        );
        return soportesCliente.reduce((acc, soporte) => {
            const categoria = soporte.categoria_falla || "Sin categoria";
            acc[categoria] = (acc[categoria] || 0) + 1;
            return acc;
        }, {});
    }, [soportesFiltrados, clienteSeleccionado]);

    const tiemposResolucion = useMemo(() => {
        const resueltos = soportesFiltrados.filter((soporte) => soporte.fecha_cierre);
        if (!resueltos.length) {
            return { promedio: 0, maximo: 0, casos: 0 };
        }

        const dias = resueltos.map((soporte) => {
            const inicio = new Date(soporte.fecha_soporte);
            const cierre = new Date(soporte.fecha_cierre);
            const diff = (cierre.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
            return Math.max(0, Math.round(diff));
        });

        const promedio = Math.round(dias.reduce((acc, dia) => acc + dia, 0) / dias.length);
        const maximo = Math.max(...dias);

        return { promedio, maximo, casos: resueltos.length };
    }, [soportesFiltrados]);

    const categoriasVisualizadas =
        verCategoriasCliente && clienteSeleccionado ? fallasPorCategoriaCliente : fallasPorCategoria;

    const categoriasAgrupadas = useMemo(() => {
        if (!categoriasPorCliente) {
            return Object.entries(categoriasVisualizadas).map(([categoria, total]) => ({
                categoria,
                total
            }));
        }

        const mapa = new Map();
        soportesFiltrados.forEach((soporte) => {
            const cliente = soporte.centro?.cliente || "Cliente sin nombre";
            const categoria = soporte.categoria_falla || "Sin categoria";
            if (!mapa.has(cliente)) {
                mapa.set(cliente, new Map());
            }
            const categorias = mapa.get(cliente);
            categorias.set(categoria, (categorias.get(categoria) || 0) + 1);
        });

        const resultado = [];
        mapa.forEach((categorias, cliente) => {
            categorias.forEach((total, categoria) => {
                resultado.push({ cliente, categoria, total });
            });
        });

        return resultado;
    }, [categoriasVisualizadas, categoriasPorCliente, soportesFiltrados]);

    const equiposCambiados = useMemo(() => {
        const resumen = {};
        soportesFiltrados.forEach((soporte) => {
            if (soporte.cambio_equipo && soporte.equipo_cambiado) {
                const nombre = soporte.equipo_cambiado.trim();
                if (nombre) {
                    resumen[nombre] = (resumen[nombre] || 0) + 1;
                }
            }
        });
        return resumen;
    }, [soportesFiltrados]);

    const resumenGeneral = useMemo(() => {
        const totalIncidentes = soportes.length;
        const totalCambios = soportes.filter((soporte) => soporte.cambio_equipo).length;
        const totalClientes = clientesDisponibles.length;
        const totalCentros = new Set(
            soportes.map((soporte) => soporte.centro?.nombre).filter((nombre) => !!nombre)
        ).size;

        return {
            totalIncidentes,
            totalCambios,
            totalClientes,
            totalCentros,
        };
    }, [soportes, clientesDisponibles]);

    const formatearFecha = (fecha) => {
        if (!fecha) return "";
        const fechaObj = new Date(fecha);
        fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
        const dia = String(fechaObj.getDate()).padStart(2, "0");
        const mes = String(fechaObj.getMonth() + 1).padStart(2, "0");
        const anio = fechaObj.getFullYear();
        return `${dia}/${mes}/${anio}`;
    };

    const renderEstado = (valor) => {
        const estadoNormalizado = (valor || "pendiente").toLowerCase();
        const baseClass = "d-inline-flex align-items-center px-2 py-1 rounded-pill font-weight-semibold";
        const variantes = {
            pendiente: { clase: `${baseClass} bg-danger text-white`, icono: "fas fa-exclamation-circle" },
            en_proceso: { clase: `${baseClass} bg-warning text-dark`, icono: "fas fa-tools" },
            resuelto: { clase: `${baseClass} bg-success text-white`, icono: "fas fa-check-circle" }
        };
        const { clase, icono } = variantes[estadoNormalizado] || variantes.pendiente;
        return (
            <span className={clase}>
                <i className={`${icono} mr-2`}></i>
                {estadoNormalizado.replace("_", " ")}
            </span>
        );
    };

    const columns = [
        { name: "ID", selector: (row) => row.id_soporte, sortable: true, width: "80px" },
        {
            name: "Centro",
            selector: (row) => row.centro?.nombre || "Sin asignar",
            sortable: true,
            wrap: true,
        },
        {
            name: "Cliente",
            selector: (row) => row.centro?.cliente || "Sin cliente",
            sortable: true,
            wrap: true,
        },
        {
            name: "Problema",
            selector: (row) => row.problema,
            sortable: true,
            wrap: true,
        },
        { name: "Tipo", selector: (row) => row.tipo || "-", sortable: true, width: "120px" },
        {
            name: "Estado",
            selector: (row) => row.estado || "pendiente",
            sortable: true,
            width: "160px",
            cell: (row) => renderEstado(row.estado)
        },
        { name: "Fecha cierre", selector: (row) => (row.fecha_cierre ? formatearFecha(row.fecha_cierre) : "-"), sortable: true, width: "140px" },
        {
            name: "Fecha",
            selector: (row) => formatearFecha(row.fecha_soporte),
            sortable: true,
            width: "140px",
        },
        {
            name: "Categoria",
            selector: (row) => row.categoria_falla || "Sin categoria",
            sortable: true,
            wrap: true,
        },
        {
            name: "Cambio equipo",
            selector: (row) => row.cambio_equipo,
            sortable: true,
            width: "120px",
            cell: (row) => (
                <span
                    className="change-icon"
                    title={row.cambio_equipo ? "Cambio de equipo realizado" : "Sin cambio de equipo"}
                >
                    <i className={`fas ${row.cambio_equipo ? "fa-check text-success" : "fa-times text-danger"}`}></i>
                </span>
            )
        },
        {
            name: "Equipo cambiado",
            selector: (row) => row.equipo_cambiado || "-",
            sortable: true,
            wrap: true,
        },
    ];

    const dataTableStyles = {
        table: {
            style: {
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)"
            }
        },
        headRow: {
            style: {
                backgroundColor: "#e2e8f0",
                borderBottomColor: "#cbd5f5",
                borderBottomWidth: "1px",
                borderBottomStyle: "solid"
            }
        },
        headCells: {
            style: {
                backgroundColor: "#e2e8f0",
                color: "#0f172a",
                fontSize: "0.85rem",
                fontWeight: 600
            }
        },
        rows: {
            style: {
                minHeight: "62px",
                borderBottomColor: "#e2e8f0",
                borderBottomWidth: "1px",
                borderBottomStyle: "solid"
            },
            highlightOnHoverStyle: {
                backgroundColor: "#ecfeff",
                borderBottomColor: "#bae6fd"
            }
        },
        cells: {
            style: {
                borderRightColor: "#eef2ff",
                borderRightWidth: "1px",
                borderRightStyle: "solid"
            }
        },
        pagination: {
            style: {
                borderTop: "none",
                padding: "1rem",
                color: "#475569"
            }
        }
    };

    return (
        <div className="container-fluid soporte-detalle">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="section-title d-flex align-items-center">
                    <i className="fas fa-stethoscope text-info mr-2"></i>
                    Detalle de soporte por cliente
                </h3>
                <div>
                    <button
                        className="btn btn-outline-secondary mr-2"
                        onClick={() => navigate("/soporte")}
                    >
                        <i className="fas fa-arrow-left mr-1"></i>
                        Volver
                    </button>
                </div>
            </div>

            <div className="card mb-3 filter-card">
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-4 mb-3">
                            <label>Cliente</label>
                            <select
                                className="form-control"
                                value={clienteSeleccionado}
                                onChange={(e) => setClienteSeleccionado(e.target.value)}
                            >
                                <option value="">Todos</option>
                                {clientesDisponibles.map((cliente) => (
                                    <option key={cliente} value={cliente}>
                                        {cliente}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-4 mb-3">
                            <label>Buscar centro</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nombre del centro"
                                value={busquedaCentro}
                                onChange={(e) => setBusquedaCentro(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4 mb-3">
                            <label>Periodo</label>
                            <select
                                className="form-control"
                                value={filtroFecha}
                                onChange={(e) => {
                                    const valor = e.target.value;
                                    setFiltroFecha(valor);
                                    if (valor !== "personalizado") {
                                        setFechaInicioPersonalizada("");
                                        setFechaFinPersonalizada("");
                                    }
                                }}
                            >
                                <option value="mes-actual">Mes actual</option>
                                <option value="anio-actual">Año actual</option>
                                <option value="todos">Todos</option>
                                <option value="personalizado">Personalizado</option>
                            </select>
                        </div>
                    </div>
                    {filtroFecha === "personalizado" && (
                        <div className="row">
                            <div className="col-md-3 mb-3">
                                <label>Desde</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={fechaInicioPersonalizada}
                                    onChange={(e) => setFechaInicioPersonalizada(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-3">
                                <label>Hasta</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={fechaFinPersonalizada}
                                    onChange={(e) => setFechaFinPersonalizada(e.target.value)}
                                />
                            </div>
                            <div className="col-md-6 mb-3 d-flex align-items-end">
                                <small className="text-muted">
                                    Selecciona un rango válido para filtrar por fechas específicas.
                                </small>
                            </div>
                        </div>
                    )}
                    <div className="row">
                        <div className="col-md-4 mb-2">
                            <button
                                className="btn btn-link p-0 clean-filter-btn"
                                onClick={() => {
                                    setClienteSeleccionado("");
                                    setBusquedaCentro("");
                                    setFiltroFecha("mes-actual");
                                    setFechaInicioPersonalizada("");
                                    setFechaFinPersonalizada("");
                                }}
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-3">
                <div className="col-md-3 mb-3 mb-md-0">
                    <div className="card metric-card text-white">
                        <div className="card-body">
                            <h5 className="mb-1">Incidentes {clienteSeleccionado ? "del cliente" : "totales"}</h5>
                            <h2 className="mb-0">{totalFallas}</h2>
                            <div className="metric-icon">
                                <i className="fas fa-bolt"></i>
                            </div>
                            <span className="metric-subtitle">
                                General: {resumenGeneral.totalIncidentes}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3 mb-md-0">
                    <div className="card metric-card text-white">
                        <div className="card-body">
                            <h5 className="mb-1">Cambios de equipo</h5>
                            <h2 className="mb-0">{totalCambiosEquipo}</h2>
                            <div className="metric-icon">
                                <i className="fas fa-sync-alt"></i>
                            </div>
                            <span className="metric-subtitle">
                                General: {resumenGeneral.totalCambios}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3 mb-md-0">
                    <div className="card metric-card text-white">
                        <div className="card-body">
                            <h5 className="mb-1">Clientes en filtro</h5>
                            <h2 className="mb-0">{clientesEnFiltro}</h2>
                            <div className="metric-icon">
                                <i className="fas fa-user-check"></i>
                            </div>
                            <span className="metric-subtitle">
                                General: {resumenGeneral.totalClientes}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card metric-card text-white">
                        <div className="card-body">
                            <h5 className="mb-1">Tiempo de resolución</h5>
                            <h2 className="mb-0">{tiemposResolucion.promedio} días</h2>
                            <div className="metric-icon">
                                <i className="fas fa-hourglass-half"></i>
                            </div>
                            <span className="metric-subtitle">
                                Máximo: {tiemposResolucion.maximo} días ({tiemposResolucion.casos} casos)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-3">
                <div className="col-md-6">
                    <div className="card detail-card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <strong>
                                Fallas por categoria (
                                {verCategoriasCliente && clienteSeleccionado ? clienteSeleccionado : "todos los clientes"})
                            </strong>
                            <div className="btn-group btn-group-sm" role="group">
                                <button
                                    className={`btn ${verCategoriasCliente ? "btn-primary" : "btn-outline-secondary"}`}
                                    onClick={() => setVerCategoriasCliente((prev) => !prev)}
                                    disabled={!clienteSeleccionado}
                                >
                                    {verCategoriasCliente ? "Cliente" : "Todos"}
                                </button>
                                <button
                                    className={`btn ${categoriasPorCliente ? "btn-primary" : "btn-outline-secondary"}`}
                                    onClick={() => setCategoriasPorCliente((prev) => !prev)}
                                >
                                    {categoriasPorCliente ? "Lista" : "Clientes"}
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            {categoriasAgrupadas.length === 0 ? (
                                <p className="text-muted">Sin informacion</p>
                            ) : (
                                <ul className="list-group">
                                    {categoriasPorCliente
                                        ? categoriasAgrupadas.map(({ cliente, categoria, total }) => (
                                            <li
                                                key={`${cliente}-${categoria}`}
                                                className="list-group-item d-flex justify-content-between align-items-center"
                                            >
                                                <div>
                                                    <strong>{cliente}</strong>
                                                    <small className="d-block text-muted">{categoria}</small>
                                                </div>
                                                <span className="badge badge-primary badge-pill">{total}</span>
                                            </li>
                                        ))
                                        : categoriasAgrupadas.map(({ categoria, total }) => (
                                            <li
                                                key={categoria}
                                                className="list-group-item d-flex justify-content-between align-items-center"
                                            >
                                                {categoria}
                                                <span className="badge badge-primary badge-pill">{total}</span>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card summary-card h-100">
                        <div className="card-header">
                            <strong>
                                Resumen {clienteSeleccionado ? `de ${clienteSeleccionado}` : "general"}
                            </strong>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6">
                                    {clienteSeleccionado ? (
                                        <>
                                            <p>
                                                Cliente: <strong>{clienteSeleccionado}</strong>
                                            </p>
                                            <p>
                                                Incidentes registrados: <strong>{totalFallas}</strong>
                                            </p>
                                            <p>
                                                Cambios de equipo registrados: <strong>{totalCambiosEquipo}</strong>
                                            </p>
                                            <p>
                                                Centros afectados: <strong>{centrosAfectados}</strong>
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p>
                                                Clientes con soporte: <strong>{resumenGeneral.totalClientes}</strong>
                                            </p>
                                            <p>
                                                Incidentes registrados: <strong>{resumenGeneral.totalIncidentes}</strong>
                                            </p>
                                            <p>
                                                Cambios de equipo registrados: <strong>{resumenGeneral.totalCambios}</strong>
                                            </p>
                                            <p>
                                                Centros con fallas: <strong>{resumenGeneral.totalCentros}</strong>
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className="col-md-6 border-left">
                                    <p className="font-weight-bold">Equipos cambiados</p>
                                    {Object.keys(equiposCambiados).length === 0 ? (
                                        <p className="text-muted mb-0">Sin registros</p>
                                    ) : (
                                        <ul className="list-unstyled mb-0 equipos-list">
                                            {Object.entries(equiposCambiados).map(([equipo, total]) => (
                                                <li key={equipo} className="d-flex align-items-center mb-1">
                                                    <i className="fas fa-circle text-secondary mr-2" style={{ fontSize: "6px" }}></i>
                                                    <span className="mr-1">{equipo}:</span>
                                                    <strong>{total}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card data-table-card">
                <div className="card-body">
                    <DataTable
                        columns={columns}
                        data={soportesFiltrados}
                        progressPending={loading}
                        pagination
                        highlightOnHover
                        pointerOnHover
                        persistTableHead
                        customStyles={dataTableStyles}
                        noDataComponent="Sin registros para los filtros seleccionados"
                    />
                </div>
            </div>
        </div>
    );
};

export default SoporteDetalle;
