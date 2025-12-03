import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import {
    cargarSoportes,
    agregarSoporte,
    modificarSoporte,
    borrarSoporte
} from "../controllers/soporteControllers";
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import "./Soporte.css";

const obtenerTotalUnico = (items, accessor) => {
    const valores = items
        .map(accessor)
        .filter((valor) => !!valor);
    return new Set(valores).size;
};

const Soporte = () => {
    const [soportes, setSoportes] = useState([]);
    const [centros, setCentros] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Estados del formulario
    const [centroId, setCentroId] = useState("");
    const [centroBusqueda, setCentroBusqueda] = useState("");
    const [problema, setProblema] = useState("");
    const [tipo, setTipo] = useState("");
    const [fechaSoporte, setFechaSoporte] = useState("");
    const [solucion, setSolucion] = useState("");
    const [categoriaFalla, setCategoriaFalla] = useState("");
    const [cambioEquipo, setCambioEquipo] = useState(false);
    const [equipoCambiado, setEquipoCambiado] = useState("");
    const [estado, setEstado] = useState("pendiente");
    const [fechaCierre, setFechaCierre] = useState("");
    const [errorFechaCierre, setErrorFechaCierre] = useState("");
    const [editarSoporte, setEditarSoporte] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Estado para filtrar por periodo
    const [filtroPeriodo, setFiltroPeriodo] = useState("anio-actual");
    const [fechaInicioPersonalizada, setFechaInicioPersonalizada] = useState("");
    const [fechaFinPersonalizada, setFechaFinPersonalizada] = useState("");

    const refrescarSoportes = async () => {
        setLoading(true);
        await cargarSoportes(setSoportes);
        setLoading(false);
    };

    // Cargar datos
    useEffect(() => {
        const fetchData = async () => {
            await refrescarSoportes();
            const centrosData = await cargarCentrosClientes();
            setCentros(centrosData);
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!centroId || !centros.length) return;
        const match = centros.find((centro) => String(centro.id) === String(centroId));
        if (match) {
            setCentroBusqueda(
                `${match.id} - ${match.nombre}${match.cliente ? ` (${match.cliente})` : ""}`
            );
        }
    }, [centroId, centros]);

    const rangoFechas = useMemo(() => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

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

        switch (filtroPeriodo) {
            case "mes-actual": {
                const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
                return { inicio, fin };
            }
            case "mes-anterior": {
                const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
                const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);
                return { inicio, fin };
            }
            case "anio-actual": {
                const inicio = new Date(hoy.getFullYear(), 0, 1);
                const fin = new Date(hoy.getFullYear(), 11, 31, 23, 59, 59, 999);
                return { inicio, fin };
            }
            case "anio-anterior": {
                const inicio = new Date(hoy.getFullYear() - 1, 0, 1);
                const fin = new Date(hoy.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                return { inicio, fin };
            }
            case "personalizado":
                return {
                    inicio: construirFecha(fechaInicioPersonalizada),
                    fin: construirFecha(fechaFinPersonalizada, true)
                };
            default:
                return { inicio: null, fin: null };
        }
    }, [filtroPeriodo, fechaInicioPersonalizada, fechaFinPersonalizada]);

    const descripcionPeriodo = useMemo(() => {
        switch (filtroPeriodo) {
            case "mes-actual":
                return "Mes actual";
            case "mes-anterior":
                return "Mes anterior";
            case "anio-actual":
                return "Año actual";
            case "anio-anterior":
                return "Año anterior";
            case "personalizado": {
                if (fechaInicioPersonalizada || fechaFinPersonalizada) {
                    return `Personalizado (${fechaInicioPersonalizada || "sin inicio"} - ${fechaFinPersonalizada || "sin fin"})`;
                }
                return "Personalizado";
            }
            default:
                return "General";
        }
    }, [filtroPeriodo, fechaInicioPersonalizada, fechaFinPersonalizada]);

    // Filtrar soportes por periodo seleccionado
    const soportesFiltrados = useMemo(() => {
        return soportes.filter((soporte) => {
            if (!soporte.fecha_soporte) return false;
            const fecha = new Date(soporte.fecha_soporte);
            if (Number.isNaN(fecha.getTime())) {
                return false;
            }
            if (rangoFechas.inicio && fecha < rangoFechas.inicio) {
                return false;
            }
            if (rangoFechas.fin && fecha > rangoFechas.fin) {
                return false;
            }
            return true;
        });
    }, [soportes, rangoFechas]);

    // Métricas
    const totalSoportesGeneral = soportes.length;
    const totalSoportesPeriodo = soportesFiltrados.length;
    const totalCambiosEquiposPeriodo = useMemo(
        () => soportesFiltrados.filter((soporte) => soporte.cambio_equipo).length,
        [soportesFiltrados]
    );
    const totalCambiosEquiposGeneral = useMemo(
        () => soportes.filter((soporte) => soporte.cambio_equipo).length,
        [soportes]
    );
    const totalClientesGeneral = useMemo(
        () => obtenerTotalUnico(soportes, (soporte) => soporte.centro?.cliente),
        [soportes]
    );
    const totalClientesPeriodo = useMemo(
        () => obtenerTotalUnico(soportesFiltrados, (soporte) => soporte.centro?.cliente),
        [soportesFiltrados]
    );
    const totalCentrosGeneral = useMemo(
        () => obtenerTotalUnico(soportes, (soporte) => soporte.centro?.nombre),
        [soportes]
    );
    const totalCentrosPeriodo = useMemo(
        () => obtenerTotalUnico(soportesFiltrados, (soporte) => soporte.centro?.nombre),
        [soportesFiltrados]
    );

    const resetForm = () => {
        setCentroId("");
        setCentroBusqueda("");
        setProblema("");
        setTipo("");
        setFechaSoporte("");
        setSolucion("");
        setCategoriaFalla("");
        setCambioEquipo(false);
        setEquipoCambiado("");
        setEditarSoporte(null);
        setEstado("pendiente");
        setFechaCierre("");
        setErrorFechaCierre("");
    };

    const handleCentroBusquedaChange = (valor) => {
        setCentroBusqueda(valor);
        if (!valor) {
            setCentroId("");
            return;
        }
        const posibleId = valor.split(" - ")[0]?.trim();
        const match = centros.find((centro) => String(centro.id) === posibleId);
        if (match) {
            setCentroId(String(match.id));
            setCentroBusqueda(
                `${match.id} - ${match.nombre}${match.cliente ? ` (${match.cliente})` : ""}`
            );
        } else {
            setCentroId("");
        }
    };

    const handleGuardarSoporte = async () => {
        const soporteData = {
            centro_id: parseInt(centroId, 10),
            problema,
            tipo,
            fecha_soporte: fechaSoporte,
            solucion,
            categoria_falla: categoriaFalla,
            cambio_equipo: cambioEquipo,
            equipo_cambiado: equipoCambiado,
            estado,
            fecha_cierre: fechaCierre || null
        };

        if (editarSoporte) {
            await modificarSoporte(editarSoporte.id_soporte, soporteData, async () => {
                await refrescarSoportes();
                resetForm();
                setShowModal(false);
            });
        } else {
            await agregarSoporte(soporteData, async () => {
                await refrescarSoportes();
                resetForm();
                setShowModal(false);
            });
        }
    };

    const handleEliminarSoporte = async (id) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este soporte?")) {
            await borrarSoporte(id, async () => {
                await refrescarSoportes();
            });
        }
    };

    const handleEditarSoporte = (soporte) => {
        setEditarSoporte(soporte);
        setCentroId(soporte.centro.id_centro);
        setCentroBusqueda(
            `${soporte.centro.id_centro} - ${soporte.centro.nombre || "Centro"}${
                soporte.centro.cliente ? ` (${soporte.centro.cliente})` : ""
            }`
        );
        setProblema(soporte.problema);
        setTipo(soporte.tipo);
        const fechaSoporteNormalizada = formatearParaInputFecha(soporte.fecha_soporte);
        const fechaCierreNormalizada = formatearParaInputFecha(soporte.fecha_cierre);
        setFechaSoporte(fechaSoporteNormalizada);
        setSolucion(soporte.solucion);
        setCategoriaFalla(soporte.categoria_falla ? soporte.categoria_falla.toUpperCase() : "");
        setCambioEquipo(soporte.cambio_equipo);
        setEquipoCambiado(soporte.equipo_cambiado ? soporte.equipo_cambiado.toUpperCase() : "");
        const errorFechas = validarRelacionFechas(fechaSoporteNormalizada, fechaCierreNormalizada);
        setErrorFechaCierre(errorFechas);
        if (!errorFechas && fechaCierreNormalizada) {
            setEstado('resuelto');
        } else {
            setEstado(soporte.estado || 'pendiente');
        }
        setFechaCierre(fechaCierreNormalizada);
        setShowModal(true);
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return "";
        const fechaObj = new Date(fecha);
        fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
        const dia = String(fechaObj.getDate()).padStart(2, "0");
        const mes = String(fechaObj.getMonth() + 1).padStart(2, "0");
        const anio = fechaObj.getFullYear();
        return `${dia}/${mes}/${anio}`;
    };

    const formatearParaInputFecha = (fecha) => {
        if (!fecha) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return fecha;
        }
        const fechaObj = new Date(fecha);
        if (Number.isNaN(fechaObj.getTime())) {
            return "";
        }
        fechaObj.setMinutes(fechaObj.getMinutes() - fechaObj.getTimezoneOffset());
        return fechaObj.toISOString().slice(0, 10);
    };

    const validarRelacionFechas = (inicio, fin) => {
        if (!fin) return "";
        const fechaFin = new Date(fin);
        if (Number.isNaN(fechaFin.getTime())) {
            return "Fecha de cierre inválida";
        }
        if (inicio) {
            const fechaInicio = new Date(inicio);
            if (!Number.isNaN(fechaInicio.getTime()) && fechaFin < fechaInicio) {
                return "La fecha de cierre no puede ser anterior a la fecha del soporte";
            }
        }
        return "";
    };

    const handleFechaSoporteChange = (valor) => {
        setFechaSoporte(valor);
        if (!fechaCierre) {
            setErrorFechaCierre("");
            return;
        }
        const error = validarRelacionFechas(valor, fechaCierre);
        setErrorFechaCierre(error);
        if (error && estado === "resuelto") {
            setEstado("pendiente");
        } else if (!error) {
            setEstado("resuelto");
        }
    };

    const handleFechaCierreChange = (valor) => {
        setFechaCierre(valor);
        if (!valor) {
            setErrorFechaCierre("");
            if (estado === "resuelto") {
                setEstado("pendiente");
            }
            return;
        }
        const error = validarRelacionFechas(fechaSoporte, valor);
        setErrorFechaCierre(error);
        if (!error) {
            setEstado("resuelto");
        } else if (estado === "resuelto") {
            setEstado("pendiente");
        }
    };

    const formatearDias = (dias) => `${dias} dia${dias === 1 ? "" : "s"}`;

    const calcularDiasAbiertos = (soporte) => {
        if (!soporte.fecha_soporte) return 0;
        const inicio = new Date(soporte.fecha_soporte);
        if (Number.isNaN(inicio.getTime())) return 0;
        const fin = soporte.fecha_cierre ? new Date(soporte.fecha_cierre) : new Date();
        if (Number.isNaN(fin.getTime())) return 0;
        const diferencia = fin.getTime() - inicio.getTime();
        return Math.max(0, Math.round(diferencia / (1000 * 60 * 60 * 24)));
    };

    const renderEstado = (valor) => {
        const estadoNormalizado = (valor || "pendiente").toLowerCase();
        const baseClass = "d-inline-flex align-items-center px-2 py-1 rounded-pill font-weight-semibold";
        const variantes = {
            pendiente: { clase: `${baseClass} bg-danger text-white`, icono: "fas fa-exclamation-circle" },
            en_proceso: { clase: `${baseClass} bg-warning text-dark`, icono: "fas fa-tools" },
            resuelto: { clase: `${baseClass} bg-success text-white`, icono: "fas fa-check-circle" }
        };
        const { clase, icono } = {
            ...variantes.pendiente,
            ...variantes[estadoNormalizado]
        };
        return (
            <span className={clase}>
                <i className={`${icono} mr-2`}></i>
                {estadoNormalizado.replace("_", " ")}
            </span>
        );
    };

    const datosOrdenados = useMemo(() => {
        const ordenados = [...soportesFiltrados].sort((a, b) => {
            const fechaA = new Date(a.fecha_soporte || 0).getTime();
            const fechaB = new Date(b.fecha_soporte || 0).getTime();
            return fechaB - fechaA;
        });
        return ordenados.map((item, index) => ({
            ...item,
            rowNumber: index + 1
        }));
    }, [soportesFiltrados]);

    const resumenEstado = useMemo(() => {
        const base = {
            pendiente: {
                key: "pendiente",
                label: "Pendientes",
                accent: "bg-soft-danger text-danger",
                icon: "fas fa-exclamation-circle",
                count: 0,
                totalDias: 0
            },
            en_proceso: {
                key: "en_proceso",
                label: "En proceso",
                accent: "bg-soft-warning text-warning",
                icon: "fas fa-tools",
                count: 0,
                totalDias: 0
            },
            resuelto: {
                key: "resuelto",
                label: "Resueltos",
                accent: "bg-soft-success text-success",
                icon: "fas fa-check-circle",
                count: 0,
                totalDias: 0
            }
        };

        soportesFiltrados.forEach((soporte) => {
            const estado = (soporte.estado || "pendiente").toLowerCase();
            const dias = calcularDiasAbiertos(soporte);
            if (base[estado]) {
                base[estado].count += 1;
                base[estado].totalDias += dias;
            }
        });

        return Object.values(base).map((estado) => ({
            ...estado,
            promedio: estado.count ? Math.round(estado.totalDias / estado.count) : 0
        }));
    }, [soportesFiltrados]);

    const pendientesCriticos = useMemo(() => {
        return soportesFiltrados
            .filter((soporte) => {
                const estado = (soporte.estado || "pendiente").toLowerCase();
                return estado === "pendiente" || estado === "en_proceso";
            })
            .map((soporte) => ({
                ...soporte,
                diasAbiertos: calcularDiasAbiertos(soporte)
            }))
            .sort((a, b) => b.diasAbiertos - a.diasAbiertos)
            .slice(0, 4);
    }, [soportesFiltrados]);

    const columns = [
        {
            name: "N",
            selector: (row) => row.rowNumber,
            sortable: true,
            width: "60px",
            sortFunction: (rowA, rowB) => rowA.rowNumber - rowB.rowNumber
        },
        { name: "Centro", selector: (row) => row.centro?.nombre || "No asignado", sortable: true, wrap: true, grow: 1.2 },
        { name: "Cliente", selector: (row) => row.centro?.cliente || "-", sortable: true, wrap: true, grow: 1.0 },
        { name: "Problema", selector: (row) => row.problema, sortable: true, wrap: true, grow: 1.5 },
        { name: "Tipo", selector: (row) => row.tipo, sortable: true, width: "110px" },
        {
            id: "fechaSoporte",
            name: "Fecha",
            selector: (row) => row.fecha_soporte,
            sortable: true,
            sortFunction: (rowA, rowB) =>
                new Date(rowA.fecha_soporte || 0).getTime() - new Date(rowB.fecha_soporte || 0).getTime(),
            cell: (row) => formatearFecha(row.fecha_soporte),
            width: "100px"
        },
        {
            name: "Estado",
            selector: (row) => row.estado || "pendiente",
            sortable: true,
            cell: (row) => renderEstado(row.estado),
            width: "128px"
        },
        { name: "Cierre", selector: (row) => (row.fecha_cierre ? formatearFecha(row.fecha_cierre) : "-"), sortable: true, width: "100px" },
        { name: "Solucion", selector: (row) => row.solucion || "-", sortable: true, wrap: true },
        { name: "Categoria", selector: (row) => row.categoria_falla || "-", sortable: true, wrap: true },
        {
            name: "Cambio equipo",
            selector: (row) => row.cambio_equipo,
            sortable: true,
            width: "100px",
            cell: (row) => (
                <span
                    className="change-icon"
                    title={row.cambio_equipo ? "Cambio de equipo realizado" : "Sin cambio de equipo"}
                >
                    <i className={`fas ${row.cambio_equipo ? "fa-check text-success" : "fa-times text-danger"}`}></i>
                </span>
            )
        },
        { name: "Equipo cambiado", selector: (row) => row.equipo_cambiado || "-", sortable: true, wrap: true },
        {
            name: "Acciones",
            cell: (row) => (
                <div className="d-flex">
                    <button className="btn btn-warning btn-sm mr-2" onClick={() => handleEditarSoporte(row)}>
                        <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleEliminarSoporte(row.id_soporte)}>
                        <i className="fas fa-trash-alt"></i>
                    </button>
                </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true
        }
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

    const metricCards = [
        {
            title: `Soportes (${descripcionPeriodo})`,
            value: totalSoportesPeriodo,
            subtitle: `Histórico: ${totalSoportesGeneral}`,
            icon: "fas fa-clipboard-check",
            variant: "gradient-blue"
        },
        {
            title: "Cambios de equipo",
            value: totalCambiosEquiposPeriodo,
            subtitle: `Histórico: ${totalCambiosEquiposGeneral}`,
            icon: "fas fa-sync-alt",
            variant: "gradient-orange"
        },
        {
            title: "Clientes atendidos",
            value: totalClientesPeriodo,
            subtitle: `Histórico: ${totalClientesGeneral}`,
            icon: "fas fa-users",
            variant: "gradient-blue"
        },
        {
            title: "Centros gestionados",
            value: totalCentrosPeriodo,
            subtitle: `Histórico: ${totalCentrosGeneral}`,
            icon: "fas fa-network-wired",
            variant: "gradient-blue"
        }
    ];

    return (
        <div className="container-fluid soporte-page">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="section-title d-flex align-items-center mb-0">
                    <i className="fas fa-headset text-primary mr-2"></i>
                    Historial de Soporte
                </h3>
                <button className="btn btn-outline-secondary" onClick={() => navigate("/soporte/detalle")}>
                    Ir a detalle
                </button>
            </div>

            <div className="card mb-4 filter-card">
                <div className="card-body">
                    <div className="row align-items-end">
                        <div className="col-lg-6 col-md-7">
                            <label className="font-weight-semibold text-muted">Periodo de análisis</label>
                            <select
                                className="form-control"
                                value={filtroPeriodo}
                                onChange={(e) => setFiltroPeriodo(e.target.value)}
                            >
                                <option value="mes-actual">Mes actual</option>
                                <option value="mes-anterior">Mes anterior</option>
                                <option value="anio-actual">Año actual</option>
                                <option value="anio-anterior">Año anterior</option>
                                <option value="personalizado">Personalizado</option>
                            </select>
                            {filtroPeriodo === "personalizado" && (
                                <div className="row mt-3">
                                    <div className="col-sm-6">
                                        <small className="text-muted text-uppercase d-block mb-1">Desde</small>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fechaInicioPersonalizada}
                                            onChange={(e) => setFechaInicioPersonalizada(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-sm-6 mt-3 mt-sm-0">
                                        <small className="text-muted text-uppercase d-block mb-1">Hasta</small>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fechaFinPersonalizada}
                                            onChange={(e) => setFechaFinPersonalizada(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="col-lg-6 col-md-5 mt-3 mt-md-0 text-md-right actions-group">
                            <button className="btn btn-primary mr-2" onClick={() => { resetForm(); setShowModal(true); }}>
                                <i className="fas fa-plus-circle mr-2"></i>
                                Crear Soporte
                            </button>
                            <button className="btn btn-outline-primary" onClick={refrescarSoportes}>
                                <i className="fas fa-sync mr-2"></i>
                                Actualizar lista
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                {metricCards.map((card) => (
                    <div className="col-md-3 mb-3" key={card.title}>
                        <div className={`card metric-card text-white ${card.variant}`}>
                            <div className="card-body">
                                <h5 className="mb-1">{card.title}</h5>
                                <h2 className="mb-0">{card.value}</h2>
                                <div className="metric-icon">
                                    <i className={card.icon}></i>
                                </div>
                                <span className="metric-subtitle">{card.subtitle}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row mb-4">
                <div className="col-lg-6 mb-3">
                    <div className="card status-summary-card h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 className="text-uppercase text-muted mb-1">Estado de casos</h5>
                                    <small className="text-secondary">Seguimiento del periodo</small>
                                </div>
                                <i className="fas fa-traffic-light text-secondary"></i>
                            </div>
                            <div className="d-flex flex-wrap">
                                {resumenEstado.map((estadoCard) => (
                                    <div key={estadoCard.key} className="status-chip">
                                        <span className={`badge ${estadoCard.accent}`}>
                                            <i className={`${estadoCard.icon} mr-1`}></i>
                                            {estadoCard.label}
                                        </span>
                                        <strong className="d-block mt-2">{estadoCard.count}</strong>
                                        <small className="text-muted">
                                            {estadoCard.count
                                                ? `${estadoCard.promedio} ${estadoCard.promedio === 1 ? "dia" : "dias"} promedio`
                                                : "Sin casos"}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-6 mb-3">
                    <div className="card status-summary-card h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 className="text-uppercase text-muted mb-1">Pendientes prioritarios</h5>
                                    <small className="text-secondary">Casos mas antiguos sin cierre</small>
                                </div>
                                <span className="badge badge-pill badge-danger">
                                    {pendientesCriticos.length}
                                </span>
                            </div>
                            {pendientesCriticos.length ? (
                                <ul className="list-unstyled mb-0">
                                    {pendientesCriticos.map((soporte) => (
                                        <li
                                            key={soporte.id_soporte}
                                            className="urgent-item"
                                            onClick={() => handleEditarSoporte(soporte)}
                                        >
                                            <div>
                                                <strong>{soporte.centro?.nombre || "Centro sin nombre"}</strong>
                                                {soporte.problema && (
                                                    <small className="text-danger ml-2 font-italic">
                                                        {soporte.problema}
                                                    </small>
                                                )}
                                                <small className="d-block text-muted">
                                                    {soporte.centro?.cliente || "Cliente sin nombre"} · {formatearFecha(soporte.fecha_soporte)}
                                                </small>
                                            </div>
                                            <span className="urgent-days">
                                                <i className="fas fa-clock mr-1"></i>
                                                {formatearDias(soporte.diasAbiertos)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted mb-0">No hay pendientes en este periodo.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card data-table-card">
                <div className="card-body">
                    <DataTable
                        columns={columns}
                        data={datosOrdenados}
                        progressPending={loading}
                        pagination
                        highlightOnHover
                        pointerOnHover
                        persistTableHead
                        defaultSortFieldId="fechaSoporte"
                        defaultSortAsc={false}
                        customStyles={dataTableStyles}
                        noDataComponent="Sin registros para el periodo seleccionado"
                    />
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal show" style={{ display: "block" }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content soporte-modal shadow-lg border-0">
                            <div className="modal-header">
                                <h5>{editarSoporte ? "Editar Soporte" : "Crear Soporte"}</h5>
                                <button className="close" onClick={() => setShowModal(false)}>
                                    &times;
                                </button>
                            </div>
                            <div className="modal-body soporte-form-body">
                                <div className="form-group">
                                    <label className="text-muted small font-weight-semibold">Centro</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        list="lista-centros-soporte"
                                        placeholder="ID - Centro (Cliente)"
                                        value={centroBusqueda}
                                        onChange={(e) => handleCentroBusquedaChange(e.target.value)}
                                    />
                                    <datalist id="lista-centros-soporte">
                                        {centros.map((centro) => (
                                            <option
                                                key={centro.id}
                                                value={`${centro.id} - ${centro.nombre}${centro.cliente ? ` (${centro.cliente})` : ""}`}
                                            />
                                        ))}
                                    </datalist>
                                    {!centroId && (
                                        <small className="text-muted">Escribe para buscar y selecciona una opción.</small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="text-muted small font-weight-semibold">Problema reportado</label>
                                    <textarea
                                        placeholder="Describe la falla detectada"
                                        value={problema}
                                        onChange={(e) => setProblema(e.target.value)}
                                        className="form-control"
                                        rows="3"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group col-md-6">
                                        <label className="text-muted small font-weight-semibold">Tipo de soporte</label>
                                        <select
                                            value={tipo}
                                            onChange={(e) => setTipo(e.target.value)}
                                            className="form-control"
                                        >
                                            <option value="">Tipo</option>
                                            <option value="terreno">Terreno</option>
                                            <option value="remoto">Remoto</option>
                                        </select>
                                    </div>
                                    <div className="form-group col-md-6">
                                        <label className="text-muted small font-weight-semibold">Fecha de creación</label>
                                        <input
                                            type="date"
                                            value={fechaSoporte}
                                            onChange={(e) => handleFechaSoporteChange(e.target.value)}
                                            className="form-control"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group col-md-6">
                                        <label className="text-muted small font-weight-semibold">Solución aplicada</label>
                                        <input
                                            placeholder="Resultado o acciones ejecutadas"
                                            value={solucion}
                                            onChange={(e) => setSolucion(e.target.value)}
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group col-md-6">
                                        <label className="text-muted small font-weight-semibold">Categoria de falla</label>
                                        <input
                                            placeholder="Ej: ELECTRICA, COMUNICACIONES..."
                                            value={categoriaFalla}
                                            onChange={(e) => setCategoriaFalla(e.target.value.toUpperCase())}
                                            className="form-control text-uppercase"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group col-md-6">
                                        <label className="text-muted small font-weight-semibold">Estado</label>
                                        <select
                                            value={estado}
                                            onChange={(e) => setEstado(e.target.value)}
                                            className="form-control"
                                        >
                                            <option value="pendiente">Pendiente</option>
                                            <option value="en_proceso">En Proceso</option>
                                            <option value="resuelto">Resuelto</option>
                                        </select>
                                        <div className="estado-preview mt-2">
                                            {renderEstado(estado)}
                                        </div>
                                    </div>
                                    <div className="form-group col-md-6">
                                        <label className="text-muted small font-weight-semibold d-flex justify-content-between align-items-center">
                                            <span>Fecha de cierre</span>
                                            <button
                                                type="button"
                                                className="btn btn-link btn-sm p-0 text-primary font-weight-semibold atajo-hoy"
                                                onClick={() => handleFechaCierreChange(new Date().toISOString().slice(0, 10))}
                                            >
                                                Hoy
                                            </button>
                                        </label>
                                        <input
                                            type="date"
                                            value={fechaCierre}
                                            onChange={(e) => handleFechaCierreChange(e.target.value)}
                                            className={`form-control ${errorFechaCierre ? "is-invalid" : ""}`}
                                            placeholder="Fecha de cierre"
                                        />
                                        {errorFechaCierre && (
                                            <small className="text-danger d-block mt-1">{errorFechaCierre}</small>
                                        )}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group col-md-6 d-flex align-items-center soporte-switch">
                                        <input
                                            type="checkbox"
                                            className="mr-2"
                                            checked={cambioEquipo}
                                            onChange={(e) => setCambioEquipo(e.target.checked)}
                                            id="cambio-equipo"
                                        />
                                        <label htmlFor="cambio-equipo" className="mb-0">¿Cambio de equipo?</label>
                                    </div>
                                    <div className="form-group col-md-6">
                                        <label className="text-muted small font-weight-semibold">Equipo reemplazado</label>
                                        <input
                                            placeholder="MODELO, SERIE U OBSERVACION"
                                            value={equipoCambiado}
                                            onChange={(e) => setEquipoCambiado(e.target.value.toUpperCase())}
                                            className="form-control text-uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cerrar
                                </button>
                                <button className="btn btn-primary" onClick={handleGuardarSoporte}>
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Soporte;
