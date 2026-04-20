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

const CATEGORIA_OTRA = "OTRA";
const CATEGORIAS_FALLA = [
    "ENERGIA",
    "CAMARAS",
    "RADAR",
    "SENSOR",
    "SOFTWARE",
    "HARDWARE",
    "CONFIGURACION",
    "CALIBRACION",
    "MANTENCION",
    "ENLACE",
    "ALARMAS",
    "LICENCIA",
    "TERCEROS",
    "USUARIO",
    "UPS",
    "VRM",
    "BATERIAS",
    "GENERADOR",
    "NETIO",
    "REDES",
    "ROUTER",
    "PC",
    "SWITCH"
];

const obtenerTotalUnico = (items, accessor) => {
    const valores = items
        .map(accessor)
        .filter((valor) => !!valor);
    return new Set(valores).size;
};

const parseFechaLocal = (valor, finDeDia = false) => {
    if (!valor) return null;

    const texto = String(valor).trim();
    // Prioriza la parte YYYY-MM-DD incluso si viene con hora/UTC.
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
    let fecha = null;

    if (soloFecha) {
        const anio = Number(soloFecha[1]);
        const mes = Number(soloFecha[2]) - 1;
        const dia = Number(soloFecha[3]);
        fecha = new Date(anio, mes, dia);
    } else {
        fecha = new Date(texto);
        if (Number.isNaN(fecha.getTime())) return null;
    }

    if (finDeDia) {
        fecha.setHours(23, 59, 59, 999);
    } else {
        fecha.setHours(0, 0, 0, 0);
    }

    return fecha;
};

const formatearEtiquetaCentro = (centro) => {
    if (!centro) return "";
    const estado = String(centro.estado || "").trim();
    return `${centro.id} - ${centro.nombre}${centro.cliente ? ` (${centro.cliente})` : ""}${estado ? ` · ${estado}` : ""}`;
};

const normalizarEstadoCentro = (estado) =>
    String(estado || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

const normalizarListaDetalles = (cantidad, detalles = []) => {
    const cant = Number(cantidad || 0);
    if (!cant || cant < 1) return [];
    const listaBase = Array.isArray(detalles) ? detalles : [];
    return Array.from({ length: cant }, (_, index) =>
        String(listaBase[index] || "").trim().toUpperCase()
    );
};

const construirDetalleCambioEquipo = (cantidad, detalles = []) => {
    const cant = Number(cantidad || 0);
    const lista = normalizarListaDetalles(cant, detalles);
    if (!cant || !lista.length) return "";
    return `TOTAL:${cant} | ITEMS:${lista.join(" || ")}`;
};

const parsearDetalleCambioEquipo = (texto) => {
    const raw = String(texto || "").trim();
    const matchItems = /^TOTAL:\s*(\d+)\s*\|\s*ITEMS:\s*(.+)$/i.exec(raw);
    if (matchItems) {
        const cantidad = Number(matchItems[1] || 0);
        const detalles = String(matchItems[2] || "")
            .split("||")
            .map((item) => String(item || "").trim().toUpperCase());
        return {
            cantidad,
            detalles: normalizarListaDetalles(cantidad, detalles)
        };
    }

    const match = /^TOTAL:\s*(\d+)\s*\|\s*DETALLE:\s*(.+)$/i.exec(raw);
    if (match) {
        const cantidad = Number(match[1] || 0);
        const detalleTexto = String(match[2] || "").trim().toUpperCase();
        return {
            cantidad,
            detalles: normalizarListaDetalles(
                cantidad,
                cantidad > 1 ? Array.from({ length: cantidad }, () => detalleTexto) : [detalleTexto]
            )
        };
    }
    const detallesFallback = raw ? [raw.toUpperCase()] : [];
    return { cantidad: detallesFallback.length ? 1 : "", detalles: detallesFallback };
};

const obtenerCantidadCambioSoporte = (soporte) => {
    if (!soporte?.cambio_equipo) return 0;
    const parsed = parsearDetalleCambioEquipo(soporte?.equipo_cambiado);
    const cantidad = Number(parsed?.cantidad || 0);
    return cantidad > 0 ? cantidad : 1;
};

const obtenerNombresCambioSoporte = (soporte) => {
    if (!soporte?.cambio_equipo) return "-";
    const parsed = parsearDetalleCambioEquipo(soporte?.equipo_cambiado);
    if (parsed?.detalles?.length) return parsed.detalles.join(", ");
    return String(soporte?.equipo_cambiado || "-");
};

const Soporte = () => {
    const [soportes, setSoportes] = useState([]);
    const [centros, setCentros] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Estados del formulario
    const [centroId, setCentroId] = useState("");
    const [centroBusqueda, setCentroBusqueda] = useState("");
    const [mostrarSugerenciasCentro, setMostrarSugerenciasCentro] = useState(false);
    const [problema, setProblema] = useState("");
    const [tipo, setTipo] = useState("");
    const [origen, setOrigen] = useState("cliente");
    const [fechaSoporte, setFechaSoporte] = useState("");
    const [solucion, setSolucion] = useState("");
    const [categoriaFalla, setCategoriaFalla] = useState("");
    const [categoriaFallaOtra, setCategoriaFallaOtra] = useState("");
    const [cambioEquipo, setCambioEquipo] = useState(false);
    const [cantidadEquiposCambiados, setCantidadEquiposCambiados] = useState("");
    const [detalleEquiposCambiadosLista, setDetalleEquiposCambiadosLista] = useState([]);
    const [estado, setEstado] = useState("pendiente");
    const [fechaCierre, setFechaCierre] = useState("");
    const [errorFechaCierre, setErrorFechaCierre] = useState("");
    const [editarSoporte, setEditarSoporte] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Estado para filtrar por periodo
    const [filtroPeriodo, setFiltroPeriodo] = useState("anio-actual");
    const [fechaInicioPersonalizada, setFechaInicioPersonalizada] = useState("");
    const [fechaFinPersonalizada, setFechaFinPersonalizada] = useState("");
    const [filtroNombre, setFiltroNombre] = useState("");
    const [fechaInicioBusqueda, setFechaInicioBusqueda] = useState("");
    const [fechaFinBusqueda, setFechaFinBusqueda] = useState("");

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
            setCentroBusqueda(formatearEtiquetaCentro(match));
        }
    }, [centroId, centros]);

    const centroSeleccionado = useMemo(
        () => centros.find((centro) => String(centro.id) === String(centroId)) || null,
        [centros, centroId]
    );
    const claseEstadoCentroInput = centroSeleccionado
        ? `centro-input-estado-${normalizarEstadoCentro(centroSeleccionado.estado) || "sin-estado"}`
        : "";

    const centrosSugeridos = useMemo(() => {
        const texto = String(centroBusqueda || "").trim().toLowerCase();
        if (!texto) return centros.slice(0, 8);
        return centros
            .filter((centro) => {
                const etiqueta = formatearEtiquetaCentro(centro).toLowerCase();
                return etiqueta.includes(texto);
            })
            .slice(0, 8);
    }, [centros, centroBusqueda]);

    const rangoFechas = useMemo(() => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const construirFecha = (valor, finDeDia = false) => {
            return parseFechaLocal(valor, finDeDia);
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
            const fecha = parseFechaLocal(soporte.fecha_soporte);
            if (!fecha || Number.isNaN(fecha.getTime())) {
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

    const soportesFiltradosBusqueda = useMemo(() => {
        const normalizarTexto = (valor = "") =>
            String(valor)
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

        const nombreBusqueda = normalizarTexto(filtroNombre).trim();

        const inicioBusqueda = parseFechaLocal(fechaInicioBusqueda);
        const finBusqueda = parseFechaLocal(fechaFinBusqueda, true);

        return soportesFiltrados.filter((soporte) => {
            const fecha = soporte.fecha_soporte ? parseFechaLocal(soporte.fecha_soporte) : null;
            if (!fecha || Number.isNaN(fecha.getTime())) return false;

            if (inicioBusqueda && fecha < inicioBusqueda) return false;
            if (finBusqueda && fecha > finBusqueda) return false;

            if (!nombreBusqueda) return true;

            const candidato = normalizarTexto(
                [
                    soporte.centro?.nombre,
                    soporte.centro?.cliente,
                    soporte.problema,
                    soporte.tipo,
                    soporte.solucion
                ]
                    .filter(Boolean)
                    .join(" ")
            );
            return candidato.includes(nombreBusqueda);
        });
    }, [soportesFiltrados, filtroNombre, fechaInicioBusqueda, fechaFinBusqueda]);

    // Métricas
    const totalSoportesGeneral = soportes.length;
    const totalSoportesPeriodo = soportesFiltrados.length;
    const totalCambiosEquiposPeriodo = useMemo(
        () =>
            soportesFiltrados.reduce(
                (acc, soporte) => acc + obtenerCantidadCambioSoporte(soporte),
                0
            ),
        [soportesFiltrados]
    );
    const totalCambiosEquiposGeneral = useMemo(
        () =>
            soportes.reduce(
                (acc, soporte) => acc + obtenerCantidadCambioSoporte(soporte),
                0
            ),
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
        setOrigen("cliente");
        setFechaSoporte("");
        setSolucion("");
        setCategoriaFalla("");
        setCategoriaFallaOtra("");
        setCambioEquipo(false);
        setCantidadEquiposCambiados("");
        setDetalleEquiposCambiadosLista([]);
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
            setCentroBusqueda(formatearEtiquetaCentro(match));
        } else {
            setCentroId("");
        }
    };

    const handleSeleccionarCentroSugerido = (centro) => {
        setCentroId(String(centro.id));
        setCentroBusqueda(formatearEtiquetaCentro(centro));
        setMostrarSugerenciasCentro(false);
    };

    const handleGuardarSoporte = async () => {
        if (!origen) {
            alert("Selecciona el origen del soporte.");
            return;
        }

        const categoriaNormalizada =
            categoriaFalla === CATEGORIA_OTRA
                ? categoriaFallaOtra.trim().toUpperCase()
                : categoriaFalla;

        if (cambioEquipo) {
            const cantidad = Number(cantidadEquiposCambiados || 0);
            if (!cantidad || cantidad < 1) {
                alert("Indica una cantidad valida de equipos cambiados.");
                return;
            }
            const listaDetalles = normalizarListaDetalles(cantidad, detalleEquiposCambiadosLista);
            const faltanDetalles = listaDetalles.some((item) => !item);
            if (faltanDetalles) {
                alert("Completa el detalle de cada equipo reemplazado.");
                return;
            }
        }

        const soporteData = {
            centro_id: parseInt(centroId, 10),
            problema,
            tipo,
            origen,
            fecha_soporte: fechaSoporte,
            solucion,
            categoria_falla: categoriaNormalizada,
            cambio_equipo: cambioEquipo,
            equipo_cambiado: cambioEquipo
                ? construirDetalleCambioEquipo(cantidadEquiposCambiados, detalleEquiposCambiadosLista)
                : null,
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
            formatearEtiquetaCentro({
                id: soporte.centro.id_centro,
                nombre: soporte.centro.nombre || "Centro",
                cliente: soporte.centro.cliente,
                estado: soporte.centro.estado
            })
        );
        setProblema(soporte.problema);
        setTipo(soporte.tipo);
        setOrigen((soporte.origen || "cliente").toLowerCase());
        const fechaSoporteNormalizada = formatearParaInputFecha(soporte.fecha_soporte);
        const fechaCierreNormalizada = formatearParaInputFecha(soporte.fecha_cierre);
        setFechaSoporte(fechaSoporteNormalizada);
        setSolucion(soporte.solucion);
        const categoriaActual = soporte.categoria_falla ? soporte.categoria_falla.toUpperCase() : "";
        if (categoriaActual && !CATEGORIAS_FALLA.includes(categoriaActual)) {
            setCategoriaFalla(CATEGORIA_OTRA);
            setCategoriaFallaOtra(categoriaActual);
        } else {
        setCategoriaFalla(categoriaActual);
        setCategoriaFallaOtra("");
        }
        setCambioEquipo(soporte.cambio_equipo);
        const detalleCambio = parsearDetalleCambioEquipo(soporte.equipo_cambiado);
        setCantidadEquiposCambiados(detalleCambio.cantidad || "");
        setDetalleEquiposCambiadosLista(detalleCambio.detalles || []);
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
        const fechaObj = parseFechaLocal(fecha);
        if (!fechaObj) return "";
        const dia = String(fechaObj.getDate()).padStart(2, "0");
        const mes = String(fechaObj.getMonth() + 1).padStart(2, "0");
        const anio = fechaObj.getFullYear();
        return `${dia}/${mes}/${anio}`;
    };

    const formatearParaInputFecha = (fecha) => {
        if (!fecha) return "";
        const fechaObj = parseFechaLocal(fecha);
        if (!fechaObj) {
            return "";
        }
        const dia = String(fechaObj.getDate()).padStart(2, "0");
        const mes = String(fechaObj.getMonth() + 1).padStart(2, "0");
        const anio = fechaObj.getFullYear();
        return `${anio}-${mes}-${dia}`;
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
        const inicio = parseFechaLocal(soporte.fecha_soporte);
        if (!inicio || Number.isNaN(inicio.getTime())) return 0;
        const fin = soporte.fecha_cierre ? parseFechaLocal(soporte.fecha_cierre) : new Date();
        if (!fin || Number.isNaN(fin.getTime())) return 0;
        fin.setHours(0, 0, 0, 0);
        const diferencia = fin.getTime() - inicio.getTime();
        return Math.max(0, Math.floor(diferencia / (1000 * 60 * 60 * 24)));
    };

    const renderEstado = (valor) => {
        const estadoNormalizado = (valor || "pendiente").toLowerCase();
        const baseClass = "d-inline-flex align-items-center px-2 py-1 rounded-pill font-weight-semibold";
        const variantes = {
            pendiente: { clase: `${baseClass} bg-danger text-white`, icono: "fas fa-exclamation-circle" },
            en_proceso: { clase: `${baseClass} bg-warning text-dark`, icono: "fas fa-exclamation-triangle", label: "Alerta" },
            resuelto: { clase: `${baseClass} bg-success text-white`, icono: "fas fa-check-circle" }
        };
        const { clase, icono } = {
            ...variantes.pendiente,
            ...variantes[estadoNormalizado]
        };
        const label = variantes[estadoNormalizado]?.label || estadoNormalizado.replace("_", " ");
        return (
            <span className={clase}>
                <i className={`${icono} mr-2`}></i>
                {label}
            </span>
        );
    };

    const datosOrdenados = useMemo(() => {
        const ordenados = [...soportesFiltradosBusqueda].sort((a, b) => {
            const fechaA = parseFechaLocal(a.fecha_soporte)?.getTime() || 0;
            const fechaB = parseFechaLocal(b.fecha_soporte)?.getTime() || 0;
            return fechaB - fechaA;
        });
        return ordenados.map((item, index) => ({
            ...item,
            rowNumber: index + 1
        }));
    }, [soportesFiltradosBusqueda]);

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
                label: "Alerta",
                accent: "bg-soft-warning text-warning",
                icon: "fas fa-exclamation-triangle",
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

    const pendientesAbiertos = useMemo(() => {
        return soportesFiltrados
            .filter((soporte) => {
                const estado = (soporte.estado || "pendiente").toLowerCase();
                return estado === "pendiente" || estado === "en_proceso";
            })
            .map((soporte) => ({
                ...soporte,
                diasAbiertos: calcularDiasAbiertos(soporte)
            }))
            .sort((a, b) => b.diasAbiertos - a.diasAbiertos);
    }, [soportesFiltrados]);

    const totalPendientesAbiertos = pendientesAbiertos.length;
    const totalPendientesPrioritarios = useMemo(
        () =>
            pendientesAbiertos.filter(
                (soporte) => String(soporte.estado || "pendiente").toLowerCase() === "pendiente"
            ).length,
        [pendientesAbiertos]
    );
    const totalAlertasPrioritarias = useMemo(
        () =>
            pendientesAbiertos.filter(
                (soporte) => String(soporte.estado || "").toLowerCase() === "en_proceso"
            ).length,
        [pendientesAbiertos]
    );
    const pendientesCriticos = useMemo(
        () => pendientesAbiertos.slice(0, 4),
        [pendientesAbiertos]
    );

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
            name: "Origen",
            selector: (row) => row.origen || "cliente",
            sortable: true,
            width: "110px",
            cell: (row) => {
                const valor = String(row.origen || "cliente").toLowerCase();
                const esOrca = valor === "orca";
                return (
                    <span className={`badge badge-pill ${esOrca ? "badge-info" : "badge-secondary"}`}>
                        {esOrca ? "Orca" : "Cliente"}
                    </span>
                );
            }
        },
        {
            id: "fechaSoporte",
            name: "Fecha",
            selector: (row) => row.fecha_soporte,
            sortable: true,
            sortFunction: (rowA, rowB) =>
                (parseFechaLocal(rowA.fecha_soporte)?.getTime() || 0) -
                (parseFechaLocal(rowB.fecha_soporte)?.getTime() || 0),
            cell: (row) => formatearFecha(row.fecha_soporte),
            width: "100px"
        },
        {
            name: "D\u00edas transcurridos",
            selector: (row) => calcularDiasAbiertos(row),
            sortable: true,
            width: "150px",
            cell: (row) =>
                row.fecha_cierre
                    ? `${calcularDiasAbiertos(row)} d\u00edas`
                    : "Alerta"
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
        {
            name: "Equipo cambiado",
            selector: (row) => obtenerNombresCambioSoporte(row),
            sortable: true,
            wrap: true,
            minWidth: "240px",
            cell: (row) => {
                if (!row.cambio_equipo) return "-";
                const cantidad = obtenerCantidadCambioSoporte(row);
                const nombres = obtenerNombresCambioSoporte(row);
                return (
                    <div className="d-flex align-items-center flex-wrap" title={nombres}>
                        <span className="badge badge-primary mr-2">{cantidad}</span>
                        <span className="text-uppercase">{nombres}</span>
                    </div>
                );
            }
        },
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
            // react-data-table maneja el overflow; evitar pasar props no soportadas a DOM
            allowOverflow: false
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
                                <div className="d-flex align-items-center">
                                    <span className="badge badge-pill badge-danger mr-2" title="Pendientes">
                                        Pendientes: {totalPendientesPrioritarios}
                                    </span>
                                    <span className="badge badge-pill badge-warning text-dark mr-2" title="Alertas">
                                        Alertas: {totalAlertasPrioritarias}
                                    </span>
                                    <span className="badge badge-pill badge-secondary" title="Total abiertos">
                                        Total: {totalPendientesAbiertos}
                                    </span>
                                </div>
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
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-muted">
                            Mostrando {datosOrdenados.length} resultado{datosOrdenados.length === 1 ? "" : "s"}
                        </small>
                    </div>
                    <div className="row mb-3">
                        <div className="col-lg-6">
                            <small className="text-muted text-uppercase d-block mb-1">Buscar por nombre</small>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Centro, cliente o problema"
                                value={filtroNombre}
                                onChange={(e) => setFiltroNombre(e.target.value)}
                            />
                        </div>
                        <div className="col-lg-3 mt-3 mt-lg-0">
                            <small className="text-muted text-uppercase d-block mb-1">Rango desde</small>
                            <input
                                type="date"
                                className="form-control"
                                value={fechaInicioBusqueda}
                                onChange={(e) => setFechaInicioBusqueda(e.target.value)}
                            />
                        </div>
                        <div className="col-lg-3 mt-3 mt-lg-0">
                            <small className="text-muted text-uppercase d-block mb-1">Rango hasta</small>
                            <input
                                type="date"
                                className="form-control"
                                value={fechaFinBusqueda}
                                onChange={(e) => setFechaFinBusqueda(e.target.value)}
                            />
                        </div>
                    </div>
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
                    <div className="modal-dialog modal-lg modal-dialog-scrollable">
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
                                    <div className="centro-sugerencia-wrap">
                                        <input
                                            type="text"
                                            className={`form-control ${claseEstadoCentroInput}`}
                                            placeholder="ID - Centro (Cliente) · Estado"
                                            value={centroBusqueda}
                                            onFocus={() => setMostrarSugerenciasCentro(true)}
                                            onBlur={() => setTimeout(() => setMostrarSugerenciasCentro(false), 120)}
                                            onChange={(e) => handleCentroBusquedaChange(e.target.value)}
                                        />
                                        {mostrarSugerenciasCentro && !!centrosSugeridos.length && (
                                            <div className="centro-sugerencias-list">
                                                {centrosSugeridos.map((centro) => {
                                                    const estado = String(centro.estado || "sin estado");
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={centro.id}
                                                            className="centro-sugerencia-item"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => handleSeleccionarCentroSugerido(centro)}
                                                        >
                                                            <span className="centro-sugerencia-main">
                                                                {centro.id} - {centro.nombre}
                                                                {centro.cliente ? ` (${centro.cliente})` : ""}
                                                            </span>
                                                            <span className={`centro-sugerencia-estado estado-${normalizarEstadoCentro(estado) || "sin-estado"}`}>
                                                                {estado}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
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
                                        <label className="text-muted small font-weight-semibold">Origen</label>
                                        <select
                                            value={origen}
                                            onChange={(e) => setOrigen(e.target.value)}
                                            className="form-control"
                                            required
                                        >
                                            <option value="cliente">Cliente</option>
                                            <option value="orca">Orca</option>
                                        </select>
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
                                        <select
                                            value={categoriaFalla}
                                            onChange={(e) => setCategoriaFalla(e.target.value)}
                                            className="form-control"
                                        >
                                            <option value="">Seleccionar categoria...</option>
                                            {CATEGORIAS_FALLA.map((categoria) => (
                                                <option key={categoria} value={categoria}>
                                                    {categoria}
                                                </option>
                                            ))}
                                            <option value={CATEGORIA_OTRA}>OTRA</option>
                                        </select>
                                        {categoriaFalla === CATEGORIA_OTRA && (
                                            <input
                                                placeholder="Especificar categoria"
                                                value={categoriaFallaOtra}
                                                onChange={(e) => setCategoriaFallaOtra(e.target.value.toUpperCase())}
                                                className="form-control text-uppercase mt-2"
                                            />
                                        )}
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
                                            <option value="en_proceso">Alerta</option>
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
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setCambioEquipo(checked);
                                                if (!checked) {
                                                    setCantidadEquiposCambiados("");
                                                    setDetalleEquiposCambiadosLista([]);
                                                }
                                            }}
                                            id="cambio-equipo"
                                        />
                                        <label htmlFor="cambio-equipo" className="mb-0">¿Cambio de equipo?</label>
                                    </div>
                                    <div className="form-group col-md-6">
                                        <label className="text-muted small font-weight-semibold">Cantidad de equipos</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Ej: 2"
                                            value={cantidadEquiposCambiados}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                setCantidadEquiposCambiados(raw);
                                                const cantidad = Number(raw || 0);
                                                setDetalleEquiposCambiadosLista((prev) =>
                                                    normalizarListaDetalles(cantidad, prev)
                                                );
                                            }}
                                            className="form-control"
                                            disabled={!cambioEquipo}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="text-muted small font-weight-semibold">Detalle equipo reemplazado</label>
                                    {!cambioEquipo && (
                                        <input
                                            placeholder="Activa 'Cambio de equipo' para completar detalle"
                                            className="form-control"
                                            disabled
                                        />
                                    )}
                                    {cambioEquipo &&
                                        normalizarListaDetalles(
                                            Number(cantidadEquiposCambiados || 0),
                                            detalleEquiposCambiadosLista
                                        ).map((detalle, index) => (
                                            <div key={`detalle-equipo-${index}`} className="mb-2">
                                                <small className="text-muted d-block mb-1">Equipo {index + 1}</small>
                                                <input
                                                    placeholder={`Detalle equipo ${index + 1} (ej: BATERIA / ROUTER)`}
                                                    value={detalle}
                                                    onChange={(e) => {
                                                        const value = e.target.value.toUpperCase();
                                                        setDetalleEquiposCambiadosLista((prev) => {
                                                            const cantidad = Number(cantidadEquiposCambiados || 0);
                                                            const lista = normalizarListaDetalles(cantidad, prev);
                                                            lista[index] = value;
                                                            return lista;
                                                        });
                                                    }}
                                                    className="form-control text-uppercase"
                                                />
                                            </div>
                                        ))}
                                    {cambioEquipo && Number(cantidadEquiposCambiados || 0) > 0 && (
                                        <small className="text-muted">
                                            Completa un detalle por cada equipo reemplazado.
                                        </small>
                                    )}
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
