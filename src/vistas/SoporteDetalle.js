import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { cargarSoportes } from "../controllers/soporteControllers";
import "./SoporteDetalle.css";

const parseFechaLocal = (valor) => {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    if (typeof valor === "string") {
        const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const [, y, m, d] = match;
            return new Date(Number(y), Number(m) - 1, Number(d));
        }
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const parsearDetalleCambioEquipo = (texto) => {
    const raw = String(texto || "").trim();
    const matchItems = /^TOTAL:\s*(\d+)\s*\|\s*ITEMS:\s*(.+)$/i.exec(raw);
    if (matchItems) {
        const cantidad = Number(matchItems[1] || 0);
        const items = String(matchItems[2] || "")
            .split("||")
            .map((item) => String(item || "").trim())
            .filter(Boolean);
        return { cantidad: cantidad > 0 ? cantidad : items.length, items };
    }
    const matchLegacy = /^TOTAL:\s*(\d+)\s*\|\s*DETALLE:\s*(.+)$/i.exec(raw);
    if (matchLegacy) {
        const cantidad = Number(matchLegacy[1] || 0);
        const detalle = String(matchLegacy[2] || "").trim();
        return {
            cantidad: cantidad > 0 ? cantidad : detalle ? 1 : 0,
            items: detalle ? [detalle] : []
        };
    }
    return { cantidad: raw ? 1 : 0, items: raw ? [raw] : [] };
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
    if (parsed?.items?.length) {
        return parsed.items.join(", ");
    }
    return String(soporte?.equipo_cambiado || "-");
};

const calcularDiasAbiertos = (soporte) => {
    const inicio = parseFechaLocal(soporte?.fecha_soporte);
    if (!inicio) return 0;
    const cierre = parseFechaLocal(soporte?.fecha_cierre);
    const hasta = cierre || new Date();
    const inicioDia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const hastaDia = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
    const diff = Math.floor((hastaDia.getTime() - inicioDia.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
};

const SoporteDetalle = () => {
    const [soportes, setSoportes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clienteSeleccionado, setClienteSeleccionado] = useState("");
    const [busquedaCentro, setBusquedaCentro] = useState("");
    const [filtroFecha, setFiltroFecha] = useState("mes-actual");
    const [fechaInicioPersonalizada, setFechaInicioPersonalizada] = useState("");
    const [fechaFinPersonalizada, setFechaFinPersonalizada] = useState("");
    const [aplicarPeriodoGlobal, setAplicarPeriodoGlobal] = useState(true);
    const [verCategoriasCliente, setVerCategoriasCliente] = useState(false);
    const [categoriasPorCliente, setCategoriasPorCliente] = useState(false);
    const [indicadorMes, setIndicadorMes] = useState(() => new Date().getMonth());
    const [indicadorAnio, setIndicadorAnio] = useState(() => new Date().getFullYear());
    const navigate = useNavigate();
    const MESES = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre"
    ];

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
                const fecha = parseFechaLocal(soporte.fecha_soporte);
                if (!fecha) return false;
                if (rangoFecha.inicio && fecha < rangoFecha.inicio) return false;
                if (rangoFecha.fin && fecha > rangoFecha.fin) return false;
                return true;
            })();

            return coincideCliente && coincideCentro && coincideFecha;
        });
    }, [soportes, clienteSeleccionado, busquedaCentro, rangoFecha]);

    const soportesBaseIndicador = useMemo(() => {
        return soportes.filter((soporte) => {
            const coincideCliente = clienteSeleccionado
                ? soporte.centro?.cliente === clienteSeleccionado
                : true;
            const coincideCentro = busquedaCentro
                ? soporte.centro?.nombre
                    ?.toLowerCase()
                    .includes(busquedaCentro.toLowerCase())
                : true;
            return coincideCliente && coincideCentro;
        });
    }, [soportes, clienteSeleccionado, busquedaCentro]);

    const soportesAnalisis = useMemo(() => {
        return aplicarPeriodoGlobal ? soportesFiltrados : soportesBaseIndicador;
    }, [aplicarPeriodoGlobal, soportesFiltrados, soportesBaseIndicador]);

    const aniosIndicador = useMemo(() => {
        const actuales = new Set([new Date().getFullYear()]);
        soportes.forEach((soporte) => {
            if (!soporte.fecha_soporte) return;
            const fecha = new Date(soporte.fecha_soporte);
            if (!Number.isNaN(fecha.getTime())) {
                actuales.add(fecha.getFullYear());
            }
        });
        return Array.from(actuales).sort((a, b) => b - a);
    }, [soportes]);

    const indicadorTickets15 = useMemo(() => {
        const ticketsMes = soportesBaseIndicador.filter((soporte) => {
            if (!soporte.fecha_soporte) return false;
            const fecha = parseFechaLocal(soporte.fecha_soporte);
            if (!fecha) return false;
            return fecha.getFullYear() === Number(indicadorAnio) && fecha.getMonth() === Number(indicadorMes);
        });

        const toDateOnly = (valor) => {
            const fecha = parseFechaLocal(valor);
            if (!fecha) return null;
            return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        };

        const esResuelto = (soporte) =>
            String(soporte.estado || "").toLowerCase() === "resuelto" || Boolean(soporte.fecha_cierre);

        const ticketsResueltos = ticketsMes.filter((soporte) => esResuelto(soporte));

        const cerradosEnPlazo = ticketsResueltos.filter((soporte) => {
            if (!soporte.fecha_cierre) return false;
            const inicio = toDateOnly(soporte.fecha_soporte);
            const cierre = toDateOnly(soporte.fecha_cierre);
            if (!inicio || !cierre) return false;
            const dias = Math.max(0, Math.floor((cierre.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
            return dias <= 15;
        }).length;

        const total = ticketsMes.length;
        const porcentaje = total ? (cerradosEnPlazo / total) * 100 : 0;
        const cerradosTotales = ticketsResueltos.length;
        const fueraDePlazo = Math.max(0, cerradosTotales - cerradosEnPlazo);

        let nivel = "critico";
        if (porcentaje > 80) nivel = "ok";
        else if (porcentaje >= 50) nivel = "alerta";

        return {
            total,
            cerradosTotales,
            cerradosEnPlazo,
            fueraDePlazo,
            porcentaje,
            nivel
        };
    }, [soportesBaseIndicador, indicadorAnio, indicadorMes]);

    const totalFallas = soportesAnalisis.length;
    const resumenEstadoFiltro = useMemo(() => {
        return soportesAnalisis.reduce(
            (acc, soporte) => {
                const estado = String(soporte.estado || "pendiente").toLowerCase();
                if (estado === "resuelto") acc.resuelto += 1;
                else if (estado === "en_proceso") acc.enProceso += 1;
                else acc.pendiente += 1;
                return acc;
            },
            { pendiente: 0, enProceso: 0, resuelto: 0 }
        );
    }, [soportesAnalisis]);
    const totalCambiosEquipo = useMemo(() => {
        return soportesAnalisis.reduce((acc, soporte) => acc + obtenerCantidadCambioSoporte(soporte), 0);
    }, [soportesAnalisis]);
    const incidenciasConCambio = useMemo(() => {
        return soportesAnalisis.filter((soporte) => Boolean(soporte.cambio_equipo)).length;
    }, [soportesAnalisis]);
    const centrosAfectados = useMemo(() => {
        const nombres = soportesAnalisis
            .map((soporte) => soporte.centro?.nombre)
            .filter((nombre) => !!nombre);
        return new Set(nombres).size;
    }, [soportesAnalisis]);
    const clientesEnFiltro = useMemo(() => {
        const nombres = soportesAnalisis
            .map((soporte) => soporte.centro?.cliente)
            .filter((nombre) => !!nombre);
        return new Set(nombres).size;
    }, [soportesAnalisis]);

    const resumenTiposSoporte = useMemo(() => {
        const base = { terreno: 0, remoto: 0 };
        soportesAnalisis.forEach((soporte) => {
            const tipo = String(soporte.tipo || "").toLowerCase().trim();
            if (tipo === "terreno") base.terreno += 1;
            if (tipo === "remoto") base.remoto += 1;
        });
        return base;
    }, [soportesAnalisis]);

    const fallasPorCategoria = useMemo(() => {
        return soportesAnalisis.reduce((acc, soporte) => {
            const categoria = soporte.categoria_falla || "Sin categoria";
            acc[categoria] = (acc[categoria] || 0) + 1;
            return acc;
        }, {});
    }, [soportesAnalisis]);

    const fallasPorCategoriaCliente = useMemo(() => {
        if (!clienteSeleccionado) return {};
        const soportesCliente = soportesAnalisis.filter(
            (soporte) => soporte.centro?.cliente === clienteSeleccionado
        );
        return soportesCliente.reduce((acc, soporte) => {
            const categoria = soporte.categoria_falla || "Sin categoria";
            acc[categoria] = (acc[categoria] || 0) + 1;
            return acc;
        }, {});
    }, [soportesAnalisis, clienteSeleccionado]);

    const tiemposResolucion = useMemo(() => {
        const resueltos = soportesAnalisis.filter((soporte) => soporte.fecha_cierre);
        if (!resueltos.length) {
            return { promedio: 0, maximo: 0, casos: 0 };
        }

        const dias = resueltos.map((soporte) => {
            const inicio = parseFechaLocal(soporte.fecha_soporte);
            const cierre = parseFechaLocal(soporte.fecha_cierre);
            if (!inicio || !cierre) return 0;
            const diff = (cierre.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
            return Math.max(0, Math.round(diff));
        });

        const promedio = Math.round(dias.reduce((acc, dia) => acc + dia, 0) / dias.length);
        const maximo = Math.max(...dias);

        return { promedio, maximo, casos: resueltos.length };
    }, [soportesAnalisis]);

    const topEquiposTendencia = useMemo(() => {
        const mesActual = Number(indicadorMes);
        const anioActual = Number(indicadorAnio);
        const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
        const anioAnterior = mesActual === 0 ? anioActual - 1 : anioActual;

        const contarPorMes = (mes, anio) => {
            const base = {};
            soportesBaseIndicador.forEach((soporte) => {
                const fecha = parseFechaLocal(soporte.fecha_soporte);
                if (!fecha) return;
                if (fecha.getMonth() !== mes || fecha.getFullYear() !== anio) return;
                const equipo = String(soporte.categoria_falla || "Sin categoria").trim();
                base[equipo] = (base[equipo] || 0) + 1;
            });
            return base;
        };

        const actual = contarPorMes(mesActual, anioActual);
        const anterior = contarPorMes(mesAnterior, anioAnterior);

        return Object.entries(actual)
            .map(([equipo, total]) => {
                const previo = Number(anterior[equipo] || 0);
                const esNuevo = previo === 0 && total > 0;
                const variacion = esNuevo ? null : (previo === 0 ? 0 : ((total - previo) / previo) * 100);
                return { equipo, total, previo, variacion, esNuevo };
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [soportesBaseIndicador, indicadorMes, indicadorAnio]);

    const metricasCierreAvanzadas = useMemo(() => {
        const dias = soportesAnalisis
            .filter((soporte) => soporte.fecha_cierre)
            .map((soporte) => {
                const inicio = parseFechaLocal(soporte.fecha_soporte);
                const cierre = parseFechaLocal(soporte.fecha_cierre);
                if (!inicio || !cierre) return 0;
                return Math.max(0, Math.round((cierre.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
            })
            .sort((a, b) => a - b);

        const percentil = (arr, p) => {
            if (!arr.length) return 0;
            const idx = Math.ceil((p / 100) * arr.length) - 1;
            const safeIdx = Math.min(arr.length - 1, Math.max(0, idx));
            return arr[safeIdx];
        };

        if (!dias.length) return { mediana: 0, p90: 0, casos: 0 };
        return {
            mediana: percentil(dias, 50),
            p90: percentil(dias, 90),
            casos: dias.length
        };
    }, [soportesAnalisis]);

    const ratioTicketsPorCliente = useMemo(() => {
        const mapa = new Map();
        soportesAnalisis.forEach((soporte) => {
            const cliente = String(soporte.centro?.cliente || "Cliente sin nombre").trim();
            const centro = String(soporte.centro?.nombre || "").trim();
            if (!mapa.has(cliente)) {
                mapa.set(cliente, { cliente, tickets: 0, centros: new Set() });
            }
            const item = mapa.get(cliente);
            item.tickets += 1;
            if (centro) item.centros.add(centro);
        });

        return Array.from(mapa.values())
            .map((item) => {
                const centros = item.centros.size;
                const ratio = centros > 0 ? (item.tickets / centros) * 10 : 0;
                return { cliente: item.cliente, tickets: item.tickets, centros, ratio };
            })
            .sort((a, b) => b.ratio - a.ratio)
            .slice(0, 6);
    }, [soportesAnalisis]);

    const reincidencias30 = useMemo(() => {
        const hoy = new Date();
        const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 30);
        const acumulado = new Map();

        soportesBaseIndicador.forEach((soporte) => {
            const fecha = parseFechaLocal(soporte.fecha_soporte);
            if (!fecha || fecha < desde) return;

            const centro = String(soporte.centro?.nombre || "Centro sin nombre").trim();
            const cliente = String(soporte.centro?.cliente || "Cliente sin nombre").trim();
            const categoria = String(soporte.categoria_falla || "Sin categoria").trim();
            const llave = `${centro}||${categoria}`;

            if (!acumulado.has(llave)) {
                acumulado.set(llave, { centro, cliente, categoria, casos: 0 });
            }
            acumulado.get(llave).casos += 1;
        });

        const items = Array.from(acumulado.values())
            .filter((item) => item.casos >= 2)
            .sort((a, b) => b.casos - a.casos)
            .slice(0, 10);

        return {
            items,
            centrosUnicos: new Set(items.map((item) => item.centro)).size
        };
    }, [soportesBaseIndicador]);

    const abiertosCriticos15 = useMemo(() => {
        return soportesAnalisis
            .filter((soporte) => {
                const estado = String(soporte.estado || "").toLowerCase();
                return estado !== "resuelto";
            })
            .map((soporte) => ({
                ...soporte,
                diasAbiertos: calcularDiasAbiertos(soporte)
            }))
            .filter((soporte) => soporte.diasAbiertos > 15)
            .sort((a, b) => b.diasAbiertos - a.diasAbiertos)
            .slice(0, 10);
    }, [soportesAnalisis]);

    const getReincidenciaClase = (casos) => {
        if (casos >= 4) return "badge-danger";
        if (casos === 3) return "badge-warning";
        return "badge-info";
    };

    const abrirProgramacionSoporte = (soporte) => {
        navigate("/calendario", {
            state: {
                programarSoporte: {
                    id_soporte: soporte.id_soporte,
                    fecha_soporte: soporte.fecha_soporte,
                    estado: soporte.estado,
                    problema: soporte.problema,
                    centro: {
                        id_centro: soporte.centro?.id_centro,
                        nombre: soporte.centro?.nombre,
                        cliente: soporte.centro?.cliente
                    }
                }
            }
        });
    };

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
        soportesAnalisis.forEach((soporte) => {
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
    }, [categoriasVisualizadas, categoriasPorCliente, soportesAnalisis]);

    const equiposCambiados = useMemo(() => {
        const resumen = {};
        soportesAnalisis.forEach((soporte) => {
            if (soporte.cambio_equipo && soporte.equipo_cambiado) {
                const parsed = parsearDetalleCambioEquipo(soporte.equipo_cambiado);
                const items = parsed.items && parsed.items.length ? parsed.items : [soporte.equipo_cambiado];
                items.forEach((item) => {
                    const nombre = String(item || "").trim();
                    if (!nombre) return;
                    resumen[nombre] = (resumen[nombre] || 0) + 1;
                });
            }
        });
        return resumen;
    }, [soportesAnalisis]);

    const resumenGeneral = useMemo(() => {
        const totalIncidentes = soportes.length;
        const totalCambios = soportes.reduce((acc, soporte) => acc + obtenerCantidadCambioSoporte(soporte), 0);
        const totalIncidenciasConCambio = soportes.filter((soporte) => Boolean(soporte.cambio_equipo)).length;
        const totalClientes = clientesDisponibles.length;
        const totalCentros = new Set(
            soportes.map((soporte) => soporte.centro?.nombre).filter((nombre) => !!nombre)
        ).size;

        return {
            totalIncidentes,
            totalCambios,
            totalIncidenciasConCambio,
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
            en_proceso: { clase: `${baseClass} bg-warning text-dark`, icono: "fas fa-exclamation-triangle", label: "Alerta" },
            resuelto: { clase: `${baseClass} bg-success text-white`, icono: "fas fa-check-circle" }
        };
        const { clase, icono } = variantes[estadoNormalizado] || variantes.pendiente;
        const label = variantes[estadoNormalizado]?.label || estadoNormalizado.replace("_", " ");
        return (
            <span className={clase}>
                <i className={`${icono} mr-2`}></i>
                {label}
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
            name: "Origen",
            selector: (row) => row.origen || "cliente",
            sortable: true,
            width: "120px",
            cell: (row) => {
                const valor = String(row.origen || "cliente").toLowerCase();
                return (
                    <span className={`badge badge-pill ${valor === "orca" ? "badge-info" : "badge-secondary"}`}>
                        {valor === "orca" ? "Orca" : "Cliente"}
                    </span>
                );
            }
        },
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
            selector: (row) => obtenerNombresCambioSoporte(row),
            sortable: true,
            wrap: true,
            minWidth: "260px",
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
                        <div className="col-md-8 mb-2 d-flex justify-content-md-end align-items-center">
                            <span className="mr-2 text-muted">Aplicar periodo a todo</span>
                            <div className="btn-group btn-group-sm" role="group" aria-label="Aplicar periodo">
                                <button
                                    type="button"
                                    className={`btn ${aplicarPeriodoGlobal ? "btn-primary" : "btn-outline-secondary"}`}
                                    onClick={() => setAplicarPeriodoGlobal(true)}
                                >
                                    Si
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${!aplicarPeriodoGlobal ? "btn-primary" : "btn-outline-secondary"}`}
                                    onClick={() => setAplicarPeriodoGlobal(false)}
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-3 metrics-top-row">
                <div className="col-12 mb-3">
                    <div className="card indicador-card">
                        <div className="card-body">
                            <div className="d-flex flex-wrap justify-content-between align-items-center indicador-header mb-3">
                                <div>
                                    <h5 className="mb-1">Indicador: tickets cerrados en 15 dias</h5>
                                    <small className="text-muted">
                                        Formula: (tickets cerrados en 15 dias o menos / total tickets del mes) x 100
                                    </small>
                                </div>
                                <div className="d-flex align-items-center indicador-selectores">
                                    <select
                                        className="form-control form-control-sm mr-2"
                                        value={indicadorMes}
                                        onChange={(e) => setIndicadorMes(Number(e.target.value))}
                                    >
                                        {MESES.map((mes, index) => (
                                            <option key={mes} value={index}>
                                                {mes}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="form-control form-control-sm"
                                        value={indicadorAnio}
                                        onChange={(e) => setIndicadorAnio(Number(e.target.value))}
                                    >
                                        {aniosIndicador.map((anio) => (
                                            <option key={anio} value={anio}>
                                                {anio}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="row indicador-metricas">
                                <div className="col-md-6 col-lg-2 mb-2 mb-lg-0">
                                    <span className="indicador-label">Tickets del mes</span>
                                    <strong className="d-block indicador-valor">{indicadorTickets15.total}</strong>
                                </div>
                                <div className="col-md-6 col-lg-2 mb-2 mb-lg-0">
                                    <span className="indicador-label">Tickets resueltos</span>
                                    <strong className="d-block indicador-valor">{indicadorTickets15.cerradosTotales}</strong>
                                </div>
                                <div className="col-md-6 col-lg-3 mb-2 mb-lg-0">
                                    <span className="indicador-label">Cerrados &lt;= 15 dias</span>
                                    <strong className="d-block indicador-valor">{indicadorTickets15.cerradosEnPlazo}</strong>
                                    <small className="text-muted d-block">Fuera de plazo: {indicadorTickets15.fueraDePlazo}</small>
                                </div>
                                <div className="col-md-6 col-lg-2 mb-2 mb-lg-0">
                                    <span className="indicador-label">Cumplimiento</span>
                                    <strong className="d-block indicador-valor">{indicadorTickets15.porcentaje.toFixed(1)}%</strong>
                                </div>
                                <div className="col-md-12 col-lg-3 d-flex align-items-end justify-content-lg-end">
                                    <span className={`indicador-estado indicador-${indicadorTickets15.nivel}`}>
                                        {indicadorTickets15.nivel === "ok"
                                            ? "Sobre meta"
                                            : indicadorTickets15.nivel === "alerta"
                                                ? "En seguimiento"
                                                : "Bajo meta"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3 mb-md-0">
                    <div className="card metric-card incidentes-card">
                        <div className="card-body">
                            <h5 className="mb-1">Incidentes {clienteSeleccionado ? "del cliente" : "totales"}</h5>
                            <div className="metric-main-line">
                                <div className="metric-main-values">
                                    <h2 className="mb-0">{totalFallas}</h2>
                                    <span className="metric-general-pill">
                                        General: {resumenGeneral.totalIncidentes}
                                    </span>
                                </div>
                                <div className="metric-inline-status">
                                    <span className="icon-stat icon-stat-pending" title={`Pendientes: ${resumenEstadoFiltro.pendiente}`}>
                                        <i className="fas fa-exclamation-circle"></i>
                                        <strong>{resumenEstadoFiltro.pendiente}</strong>
                                    </span>
                                    <span className="icon-stat icon-stat-alert" title={`Alertas: ${resumenEstadoFiltro.enProceso}`}>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <strong>{resumenEstadoFiltro.enProceso}</strong>
                                    </span>
                                    <span className="icon-stat icon-stat-resolved" title={`Resueltas: ${resumenEstadoFiltro.resuelto}`}>
                                        <i className="fas fa-check-circle"></i>
                                        <strong>{resumenEstadoFiltro.resuelto}</strong>
                                    </span>
                                </div>
                            </div>
                            <div className="metric-icon">
                                <i className="fas fa-bolt"></i>
                            </div>
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
                    <div className="card metric-card tipo-soporte-card">
                        <div className="card-body">
                            <h5 className="mb-1">Tipo de soporte</h5>
                            <div className="metric-icon">
                                <i className="fas fa-hourglass-half"></i>
                            </div>
                            <span className="metric-subtitle">Terreno y remoto en el filtro actual</span>
                            <div className="d-flex justify-content-between mt-3">
                                <span className="badge badge-pill badge-primary px-3 py-2">
                                    Terreno: {resumenTiposSoporte.terreno}
                                </span>
                                <span className="badge badge-pill badge-info px-3 py-2">
                                    Remoto: {resumenTiposSoporte.remoto}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-3">
                <div className="col-md-4 mb-3">
                    <div className="card detail-card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <strong>Top equipos (tendencia mensual)</strong>
                            <i
                                className="fas fa-question-circle text-muted"
                                title="Muestra los equipos/categorias con mas casos en el mes seleccionado y su variacion vs el mes anterior."
                            ></i>
                        </div>
                        <div className="card-body">
                            <small className="text-muted d-block mb-2">
                                Universo: cliente/centro filtrado + mes seleccionado.
                            </small>
                            {topEquiposTendencia.length === 0 ? (
                                <p className="text-muted mb-0">Sin datos para el mes seleccionado.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {topEquiposTendencia.map((item) => (
                                        <li key={item.equipo} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{item.equipo}</strong>
                                                <small className="d-block text-muted">Previo: {item.previo}</small>
                                            </div>
                                            <div className="text-right">
                                                <span className="badge badge-primary badge-pill">{item.total}</span>
                                                {item.esNuevo ? (
                                                    <small className="d-block text-info">Nuevo</small>
                                                ) : (
                                                    <small className={`d-block ${item.variacion >= 0 ? "text-danger" : "text-success"}`}>
                                                        {item.variacion >= 0 ? "+" : ""}{item.variacion.toFixed(0)}%
                                                    </small>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-4 mb-3">
                    <div className="card detail-card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <strong>Cierre avanzado (mediana y p90)</strong>
                            <i
                                className="fas fa-question-circle text-muted"
                                title="Mediana: tiempo tipico de cierre. P90: el 90% de los tickets cierra dentro de ese valor."
                            ></i>
                        </div>
                        <div className="card-body">
                            <small className="text-muted d-block mb-2">
                                Universo: filtros actuales {aplicarPeriodoGlobal ? "(incluye periodo)." : "(sin periodo)."}
                            </small>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="text-muted">Casos resueltos</span>
                                <strong>{metricasCierreAvanzadas.casos}</strong>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted">Mediana</span>
                                <span className="badge badge-info badge-pill px-3 py-2">
                                    {metricasCierreAvanzadas.mediana} dias
                                </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-muted">P90</span>
                                <span className="badge badge-warning badge-pill px-3 py-2">
                                    {metricasCierreAvanzadas.p90} dias
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4 mb-3">
                    <div className="card detail-card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <strong>Ratio por cliente (tickets / 10 centros)</strong>
                            <i
                                className="fas fa-question-circle text-muted"
                                title="Normaliza la carga por cliente. Mientras mas alto el ratio, mayor presion de soporte por red de centros."
                            ></i>
                        </div>
                        <div className="card-body">
                            <small className="text-muted d-block mb-2">
                                Universo: filtros actuales {aplicarPeriodoGlobal ? "(incluye periodo)." : "(sin periodo)."}
                            </small>
                            {ratioTicketsPorCliente.length === 0 ? (
                                <p className="text-muted mb-0">Sin datos para calcular ratio.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {ratioTicketsPorCliente.map((item) => (
                                        <li key={item.cliente} className="list-group-item px-0">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <strong>{item.cliente}</strong>
                                                <span className="badge badge-dark badge-pill">{item.ratio.toFixed(1)}</span>
                                            </div>
                                            <small className="text-muted">
                                                {item.tickets} tickets / {item.centros} centros
                                            </small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-3">
                <div className="col-md-6 mb-3">
                    <div className="card detail-card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <strong>Reincidencia (30 dias)</strong>
                            <span className="badge badge-danger">
                                {reincidencias30.items.length} focos
                            </span>
                        </div>
                        <div className="card-body">
                            {reincidencias30.items.length === 0 ? (
                                <p className="text-muted mb-0">Sin centros con reincidencia mayor o igual a 2 casos.</p>
                            ) : (
                                <>
                                    <small className="text-muted d-block mb-2">
                                        Centros con reincidencia: {reincidencias30.centrosUnicos}
                                    </small>
                                    <ul className="list-group list-group-flush">
                                        {reincidencias30.items.map((item) => (
                                            <li
                                                key={`${item.centro}-${item.categoria}`}
                                                className="list-group-item px-0 d-flex justify-content-between align-items-center"
                                            >
                                                <div>
                                                    <strong>{item.centro}</strong>
                                                    <small className="d-block text-muted">
                                                        {item.cliente} - {item.categoria}
                                                    </small>
                                                </div>
                                                <span className={`badge badge-pill ${getReincidenciaClase(item.casos)}`}>{item.casos}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-6 mb-3">
                    <div className="card detail-card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <strong>Riesgo activo (&gt; 15 dias)</strong>
                            <small className="text-muted">Abiertos vigentes</small>
                            <span className="badge badge-warning">{abiertosCriticos15.length}</span>
                        </div>
                        <div className="card-body">
                            <small className="text-muted d-block mb-2">
                                Universo: cliente/centro filtrado {aplicarPeriodoGlobal ? "(incluye periodo)." : "(sin periodo)."}
                            </small>
                            {abiertosCriticos15.length === 0 ? (
                                <p className="text-muted mb-0">Sin tickets abiertos fuera de plazo.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {abiertosCriticos15.map((soporte) => (
                                        <li
                                            key={soporte.id_soporte}
                                            className="list-group-item px-0 d-flex justify-content-between align-items-center"
                                        >
                                            <div>
                                                <strong>{soporte.centro?.nombre || "Centro sin nombre"}</strong>
                                                <small className="d-block text-muted">
                                                    {soporte.centro?.cliente || "Cliente sin nombre"} - {soporte.categoria_falla || "Sin categoria"}
                                                </small>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <span className="badge badge-warning badge-pill mr-2">{soporte.diasAbiertos} dias</span>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => abrirProgramacionSoporte(soporte)}
                                                    title="Programar en calendario"
                                                >
                                                    <i className="fas fa-calendar-plus"></i>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
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
                                            <div className="summary-item">
                                                <span className="summary-label">Cliente</span>
                                                <strong>{clienteSeleccionado}</strong>
                                            </div>
                                            <div className="summary-item">
                                                <span className="summary-label">Incidentes registrados</span>
                                                <strong>{totalFallas}</strong>
                                            </div>
                                            <div className="summary-item">
                                                <span className="summary-label">Incidencias actuales</span>
                                                <strong>{incidenciasConCambio}</strong>
                                            </div>
                                            <div className="summary-item mb-0">
                                                <span className="summary-label">Centros afectados</span>
                                                <strong>{centrosAfectados}</strong>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="summary-item">
                                                <span className="summary-label">Clientes con soporte</span>
                                                <strong>{resumenGeneral.totalClientes}</strong>
                                            </div>
                                            <div className="summary-item">
                                                <span className="summary-label">Incidentes registrados</span>
                                                <strong>{resumenGeneral.totalIncidentes}</strong>
                                            </div>
                                            <div className="summary-item">
                                                <span className="summary-label">Incidencias actuales</span>
                                                <strong>{resumenGeneral.totalIncidenciasConCambio}</strong>
                                            </div>
                                            <div className="summary-item mb-0">
                                                <span className="summary-label">Centros con fallas</span>
                                                <strong>{resumenGeneral.totalCentros}</strong>
                                            </div>
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
                        data={soportesAnalisis}
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


