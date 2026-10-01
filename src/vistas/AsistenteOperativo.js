import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  API_BASE_URL,
  obtenerActividades,
  obtenerArmados,
  obtenerCentros,
  obtenerEquipos,
  obtenerGuiasSalidaArmado,
  obtenerInventarioBodegaEquipos,
  obtenerMovimientosRecientes,
  obtenerOrdenesRevisionEquipos,
  obtenerSoportes,
  obtenerCasosIsmael,
  obtenerFallasDispositivos,
  resolverPlantillaDiagrama,
} from "../api";
import VistaGeneralViewer from "../components/VistaGeneralViewer";
import DiagramaLogicoViewer from "../components/DiagramaLogicoViewer";
import "./AsistenteOperativo.css";

const normalizar = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const formatoFecha = (value) => {
  if (!value) return "-";
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return String(value).slice(0, 10) || "-";
  return fecha.toLocaleDateString("es-CL");
};

const formatoFechaLarga = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : parseFechaHoraBackend(raw);
  if (!fecha || Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const parseFechaHoraBackend = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const sinZona = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw);
  const fecha = new Date(sinZona ? `${raw}Z` : raw);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const formatoFechaHora = (value) => {
  if (!value) return "-";
  const fecha = parseFechaHoraBackend(value);
  if (!fecha) return String(value);
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
};

const formatoFechaHoraNarrada = (value) => {
  const fechaHora = formatoFechaHora(value);
  return fechaHora.replace(/\s+(\d{2}:\d{2})$/, " a las $1");
};

const getSocketBaseUrl = () => {
  if (!API_BASE_URL) return window.location.origin;
  return String(API_BASE_URL).replace(/\/api\/?$/, "") || window.location.origin;
};

const extraerCodigo = (texto) => {
  const match = String(texto || "").match(/\b\d{5,}\b/);
  return match ? match[0] : "";
};

const getCentroNombre = (centro) =>
  centro?.nombre || centro?.centro || centro?.centro_nombre || centro?.nombre_centro || "-";

const getClienteNombre = (centro) =>
  centro?.cliente?.nombre || centro?.cliente_nombre || centro?.cliente || "-";

const getCentroNombreArmado = (armado) =>
  armado?.centro?.nombre || armado?.centro_nombre || armado?.nombre_centro || (typeof armado?.centro === "string" ? armado.centro : "-");

const getClienteNombreArmado = (armado) =>
  armado?.centro?.cliente?.nombre ||
  armado?.centro?.cliente ||
  armado?.cliente_nombre ||
  armado?.nombre_cliente ||
  (typeof armado?.cliente === "string" ? armado.cliente : "-");

const getEstadoLegible = (value) => {
  const raw = String(value || "-").trim();
  const normalizado = normalizar(raw).replace(/_/g, " ");
  if (!normalizado || normalizado === "-") return "-";
  return normalizado.charAt(0).toUpperCase() + normalizado.slice(1);
};

const getAreaRevisionLegible = (value) => {
  const area = normalizar(value);
  if (area === "pc") return "PC";
  if (area === "camaras") return "Camaras";
  if (area === "energia") return "Energia";
  return value || "";
};

const estadoAbiertoSoporte = (soporte) => {
  const estado = normalizar(soporte?.estado || "pendiente");
  return estado === "pendiente" || estado === "en_proceso";
};

const esActividadActiva = (actividad) => {
  const estado = normalizar(actividad?.estado || "");
  return !["finalizado", "finalizada", "cerrado", "cerrada", "cancelado", "cancelada", "resuelto"].includes(estado);
};

const esMismaFecha = (value, baseDate) => {
  if (!value) return false;
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha.toISOString().slice(0, 10) === baseDate.toISOString().slice(0, 10);
};

const getInicioSemana = (baseDate = new Date()) => {
  const fecha = new Date(baseDate);
  fecha.setHours(0, 0, 0, 0);
  const dia = fecha.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  fecha.setDate(fecha.getDate() + diff);
  return fecha;
};

const getFinSemana = (baseDate = new Date()) => {
  const fecha = getInicioSemana(baseDate);
  fecha.setDate(fecha.getDate() + 6);
  fecha.setHours(23, 59, 59, 999);
  return fecha;
};

const fechaEnRango = (value, inicio, fin) => {
  if (!value) return false;
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha >= inicio && fecha <= fin;
};

const getActividadFecha = (actividad) =>
  actividad?.fecha || actividad?.fecha_inicio || actividad?.start || actividad?.fecha_programada;

const getSoporteFecha = (soporte) =>
  soporte?.fecha_soporte || soporte?.created_at || soporte?.updated_at || soporte?.fecha_creacion;

const getArmadoEstado = (armado) => normalizar(armado?.estado || "pendiente");

const getPorcentajeArmado = (armado) => {
  const directo = Number(armado?.porcentaje_armado);
  if (Number.isFinite(directo)) return Math.max(0, Math.min(100, Math.round(directo)));
  const total = Number(armado?.armado_equipos_total || armado?.total_equipos || 0);
  const resueltos = Number(armado?.armado_equipos_con_serie || 0) + Number(armado?.armado_equipos_no_aplica || 0);
  return total > 0 ? Math.round((resueltos * 100) / total) : 0;
};

const getTecnicosArmado = (armado) => {
  const nombres = [
    armado?.tecnico_nombre,
    armado?.tecnico?.name,
    armado?.tecnico?.nombre,
    armado?.tecnico_principal_nombre,
    armado?.tecnico_apoyo_nombre,
    armado?.tecnico_2_nombre,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (Array.isArray(armado?.tecnicos)) {
    armado.tecnicos.forEach((tecnico) => {
      const nombre = tecnico?.name || tecnico?.nombre || tecnico?.tecnico_nombre;
      if (nombre) nombres.push(String(nombre).trim());
    });
  }
  if (Array.isArray(armado?.tecnicos_asignados)) {
    armado.tecnicos_asignados.forEach((tecnico) => {
      const nombre = tecnico?.name || tecnico?.nombre || tecnico?.tecnico_nombre;
      if (nombre) nombres.push(String(nombre).trim());
    });
  }
  return [...new Set(nombres)];
};

const contarBultosDespachados = (guiasArmado) => {
  const enviados = new Set();
  (Array.isArray(guiasArmado) ? guiasArmado : []).forEach((guia) => {
    if (normalizar(guia?.estado) === "pendiente_despacho") return;
    const cajas = Array.isArray(guia?.cajas)
      ? guia.cajas
      : Array.isArray(guia?.cajas_json)
        ? guia.cajas_json
        : [];
    cajas.forEach((caja) => {
      const nombre = typeof caja === "string" ? caja : caja?.nombre || caja?.caja || "";
      if (nombre) enviados.add(nombre);
    });
  });
  return enviados.size;
};

function AsistenteOperativo() {
  const [datos, setDatos] = useState({
    equipos: [],
    armados: [],
    soportes: [],
    actividades: [],
    bodega: [],
    centros: [],
    guias: [],
    revisiones: [],
    casosIsmael: [],
    fallasDispositivos: [],
  });
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [error, setError] = useState("");
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [topologiaModal, setTopologiaModal] = useState(null);
  const [segundosTopologia, setSegundosTopologia] = useState(15);
  const [vozActiva, setVozActiva] = useState(() => localStorage.getItem("asistente_voz_activa") !== "false");
  const [hablando, setHablando] = useState(false);
  const [energiaVoz, setEnergiaVoz] = useState(0);
  const pulsoVozRef = useRef(null);
  const ultimoCodigoConsultadoRef = useRef("");
  const fallaPendienteRef = useRef(null);
  const diagramaPendienteRef = useRef(null);
  const [mensajes, setMensajes] = useState([
    {
      id: "intro",
      tipo: "asistente",
      titulo: "Asistente operativo",
      texto: "Pregunta por series, fallas, armados o actividades.",
      items: [
        "Ej: donde esta 311030052",
        "Ej: fallas de este ano",
      ],
    },
  ]);

  const cargarDatos = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [equipos, armados, soportes, actividades, bodega, centrosResp, guias, revisiones, casosIsmael, fallasDispositivos] = await Promise.all([
        obtenerEquipos().catch(() => []),
        obtenerArmados().catch(() => []),
        obtenerSoportes().catch(() => []),
        obtenerActividades().catch(() => []),
        obtenerInventarioBodegaEquipos().catch(() => []),
        obtenerCentros({ page: 1, per_page: 0 }).catch(() => ({ centros: [] })),
        obtenerGuiasSalidaArmado().catch(() => []),
        obtenerOrdenesRevisionEquipos().catch(() => []),
        obtenerCasosIsmael({ limit: 40 }).catch(() => []),
        obtenerFallasDispositivos({ limit: 200 }).catch(() => []),
      ]);

      setDatos({
        equipos: Array.isArray(equipos) ? equipos : [],
        armados: Array.isArray(armados) ? armados : [],
        soportes: Array.isArray(soportes) ? soportes : [],
        actividades: Array.isArray(actividades) ? actividades : [],
        bodega: Array.isArray(bodega) ? bodega : [],
        centros: Array.isArray(centrosResp?.centros) ? centrosResp.centros : Array.isArray(centrosResp) ? centrosResp : [],
        guias: Array.isArray(guias) ? guias : [],
        revisiones: Array.isArray(revisiones) ? revisiones : [],
        casosIsmael: Array.isArray(casosIsmael) ? casosIsmael : [],
        fallasDispositivos: Array.isArray(fallasDispositivos) ? fallasDispositivos : [],
      });
      setUltimaActualizacion(new Date());
    } catch (err) {
      console.error("No se pudo cargar el asistente operativo:", err);
      setError("No se pudieron cargar todos los datos operativos.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    window.clearInterval(pulsoVozRef.current);
  }, []);

  useEffect(() => {
    if (!topologiaModal) return undefined;
    setSegundosTopologia(15);
    const intervalo = window.setInterval(() => {
      setSegundosTopologia((segundos) => {
        if (segundos <= 1) {
          window.clearInterval(intervalo);
          setTopologiaModal(null);
          return 0;
        }
        return segundos - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [topologiaModal]);

  useEffect(() => {
    const socket = io(getSocketBaseUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    const refresh = () => cargarDatos({ silent: true });
    socket.on("soporte_updated", refresh);
    socket.on("actividad_updated", refresh);
    socket.on("armado_updated", refresh);
    socket.on("inventario_updated", refresh);
    return () => {
      socket.off("soporte_updated", refresh);
      socket.off("actividad_updated", refresh);
      socket.off("armado_updated", refresh);
      socket.off("inventario_updated", refresh);
      socket.disconnect();
    };
  }, [cargarDatos]);

  const centroPorId = useMemo(() => {
    const map = new Map();
    datos.centros.forEach((centro) => {
      const id = Number(centro?.id_centro || centro?.id || centro?.centro_id || 0);
      if (id) map.set(id, centro);
    });
    return map;
  }, [datos.centros]);

  const guiasPorArmado = useMemo(() => {
    const map = new Map();
    datos.guias.forEach((guia) => {
      const id = Number(guia?.armado_id || 0);
      if (!id) return;
      const actual = map.get(id) || [];
      actual.push(guia);
      map.set(id, actual);
    });
    return map;
  }, [datos.guias]);

  const revisionPorEquipoBodega = useMemo(() => {
    const map = new Map();
    datos.revisiones
      .filter((orden) => normalizar(orden?.estado) !== "cerrado")
      .forEach((orden) => {
        (Array.isArray(orden?.detalles) ? orden.detalles : []).forEach((detalle) => {
          const idEquipo = Number(detalle?.bodega_equipo_id || 0);
          if (idEquipo && !map.has(idEquipo)) {
            map.set(idEquipo, {
              area: orden?.area || "",
              fechaAsignacion: orden?.fecha_asignacion || null,
            });
          }
        });
      });
    return map;
  }, [datos.revisiones]);

  const resumen = useMemo(() => {
    const soportesAbiertos = datos.soportes.filter(estadoAbiertoSoporte);
    const soportesPendientes = soportesAbiertos.filter((s) => normalizar(s?.estado || "pendiente") === "pendiente");
    const soportesEnProceso = soportesAbiertos.filter((s) => normalizar(s?.estado || "") === "en_proceso");
    const armadosActivos = datos.armados.filter((a) => !["finalizado", "cancelado", "anulado"].includes(getArmadoEstado(a)));
    const armadosIncompletos = datos.armados.filter((a) => getArmadoEstado(a) === "finalizado" && Number(a?.armado_equipos_pendientes || 0) > 0);
    const equiposInstalados = datos.equipos.filter((e) => String(e?.numero_serie || "").trim() && normalizar(e?.estado_registro) !== "no_aplica");
    const equiposBodega = datos.bodega.filter((e) => normalizar(e?.estado_asignacion || "en_bodega") === "en_bodega");

    return {
      soportesAbiertos: soportesAbiertos.length,
      soportesPendientes: soportesPendientes.length,
      soportesEnProceso: soportesEnProceso.length,
      armadosActivos: armadosActivos.length,
      armadosIncompletos: armadosIncompletos.length,
      equiposInstalados: equiposInstalados.length,
      equiposBodega: equiposBodega.length,
    };
  }, [datos]);

  const responderSerie = async (codigo) => {
    const codigoNorm = normalizar(codigo);
    const instalado = datos.equipos.filter((equipo) => {
      const serie = normalizar(equipo?.numero_serie);
      const cod = normalizar(equipo?.codigo);
      return serie === codigoNorm || cod === codigoNorm;
    });
    const enBodega = datos.bodega.filter((equipo) => {
      const serie = normalizar(equipo?.numero_serie);
      const cod = normalizar(equipo?.codigo);
      return serie === codigoNorm || cod === codigoNorm;
    });

    let movimientos = [];
    try {
      const resp = await obtenerMovimientosRecientes(5, 1, { numero_serie: codigo });
      movimientos = Array.isArray(resp?.items) ? resp.items : [];
    } catch (err) {
      movimientos = [];
    }

    const ubicacionActual = enBodega[0] || instalado[0] || null;
    const estaEnBodega = !!enBodega[0];
    const idEquipoBodega = Number(ubicacionActual?.id_bodega_equipo || ubicacionActual?.id || 0);
    const revisionActiva = estaEnBodega ? revisionPorEquipoBodega.get(idEquipoBodega) : null;
    const items = [];

    if (ubicacionActual) {
      if (estaEnBodega) {
        items.push(`Corresponde al equipo ${ubicacionActual.equipo_nombre || ubicacionActual.nombre || "Equipo"}, serie ${ubicacionActual.numero_serie || "-"}.`);
        const areaRevision = getAreaRevisionLegible(ubicacionActual?.revision_area || revisionActiva?.area);
        const fechaRevision = formatoFechaLarga(revisionActiva?.fechaAsignacion);
        const fechaBodega = formatoFechaLarga(ubicacionActual?.fecha_ingreso || ubicacionActual?.created_at);
        if (areaRevision && fechaRevision) {
          items.push(`Fue asignado a revision en el area ${areaRevision} el ${fechaRevision}.`);
        }
        if (fechaBodega) {
          items.push(`Se encuentra en ${ubicacionActual.ubicacion || "Bodega central"} desde el ${fechaBodega}.`);
        }
      } else {
        const centro = centroPorId.get(Number(ubicacionActual?.centro_id || 0));
        items.push(`Actualmente se encuentra instalado en el centro ${getCentroNombre(centro)}, cliente ${getClienteNombre(centro)}.`);
        items.push(`Corresponde al equipo ${ubicacionActual.nombre || ubicacionActual.equipo_nombre || "Equipo"}, serie ${ubicacionActual.numero_serie || "-"}.`);
      }
    }

    instalado.slice(1, 3).forEach((equipo) => {
      const centro = centroPorId.get(Number(equipo?.centro_id || 0));
      items.push(
        `Tambien existe otro registro instalado como ${equipo.nombre || equipo.equipo_nombre || "Equipo"} en ${getCentroNombre(centro)}, cliente ${getClienteNombre(centro)}.`
      );
    });

    const movimientosUnicos = [];
    const clavesMov = new Set();
    movimientos.forEach((mov) => {
      const clave = [
        normalizar(mov?.nombre_item),
        normalizar(mov?.accion || "registro"),
        normalizar(mov?.centro_nombre),
        normalizar(mov?.tecnico_nombre),
        formatoFechaHora(mov?.fecha),
      ].join("|");
      if (clavesMov.has(clave)) return;
      clavesMov.add(clave);
      movimientosUnicos.push(mov);
    });

    if (movimientosUnicos.length && !revisionActiva) {
      const mov = movimientosUnicos[0];
      const accion = mov.accion && String(mov.accion).trim() ? mov.accion : "registro en historial";
      items.push(
        `Ultimo registro: ${accion}. Se registro en el centro ${mov.centro_nombre || "-"} por el tecnico ${mov.tecnico_nombre || "-"} el ${formatoFechaHora(mov.fecha)}.`
      );
    }

    if (!items.length) {
      return {
        titulo: `No encontre el codigo ${codigo}`,
        texto: "No aparece en equipos instalados, bodega ni historial global reciente por numero de serie.",
        items: ["Revisa si el numero esta completo o si corresponde a un codigo interno distinto a la serie."],
        locucion: `No encontré el código ${codigo}. Revisa si el número está completo o si corresponde a otro identificador.`,
      };
    }

    const locucionUbicacion = (() => {
      if (estaEnBodega) {
        const ubicacion = ubicacionActual?.ubicacion || "Bodega central";
        const area = getAreaRevisionLegible(ubicacionActual?.revision_area || revisionActiva?.area);
        return area
          ? `Ese código actualmente se encuentra en ${ubicacion}, en revisión en el área ${area}. Te dejaré los detalles en el chat.`
          : `Ese código actualmente se encuentra en ${ubicacion}. Te dejaré los detalles en el chat.`;
      }
      if (instalado.length) {
        const centro = centroPorId.get(Number(ubicacionActual?.centro_id || 0));
        return `Ese código actualmente se encuentra instalado en el centro ${getCentroNombre(centro)}, cliente ${getClienteNombre(centro)}. Te dejaré los detalles en el chat.`;
      }
      return `Encontré registros históricos para ese código. Te dejaré los detalles en el chat.`;
    })();

    return {
      titulo: `Ubicacion actual del codigo ${codigo}`,
      texto: estaEnBodega
        ? (() => {
            const ubicacion = ubicacionActual?.ubicacion || "Bodega central";
            const area = getAreaRevisionLegible(
              ubicacionActual?.revision_area || revisionActiva?.area
            );
            return area
              ? `Encontre este codigo en ${ubicacion}, en el area ${area}.`
              : `Encontre este codigo en ${ubicacion}.`;
          })()
        : instalado.length
          ? "Encontre este codigo instalado en un centro."
          : "Encontre registros historicos para este codigo.",
      items,
      locucion: locucionUbicacion,
    };
  };

  const responderHistorialEquipo = async (codigo) => {
    const codigoNorm = normalizar(codigo);
    const instalados = datos.equipos.filter((equipo) => {
      const coincide = normalizar(equipo?.numero_serie) === codigoNorm || normalizar(equipo?.codigo) === codigoNorm;
      const estado = normalizar(equipo?.estado_registro || equipo?.estado_uso || equipo?.estado_logistico);
      return coincide && !["no_aplica", "retirado", "retirado_bodega", "devuelto_bodega", "reemplazado"].includes(estado);
    });
    const equiposBodega = datos.bodega.filter(
      (equipo) => normalizar(equipo?.numero_serie) === codigoNorm || normalizar(equipo?.codigo) === codigoNorm
    );
    const equipoBodega = equiposBodega[0] || null;
    const idEquipoBodega = Number(equipoBodega?.id_bodega_equipo || equipoBodega?.id || 0);
    const revisiones = datos.revisiones
      .filter((orden) =>
        (Array.isArray(orden?.detalles) ? orden.detalles : []).some((detalle) => {
          if (idEquipoBodega && Number(detalle?.bodega_equipo_id || 0) === idEquipoBodega) return true;
          return normalizar(detalle?.numero_serie) === codigoNorm || normalizar(detalle?.codigo) === codigoNorm;
        })
      )
      .sort((a, b) => new Date(a?.fecha_asignacion || 0).getTime() - new Date(b?.fecha_asignacion || 0).getTime());
    const revisionActiva = [...revisiones].reverse().find((orden) => normalizar(orden?.estado) !== "cerrado");

    let ubicacionActual = "No pude determinar su ubicacion actual.";
    if (revisionActiva) {
      ubicacionActual = `Actualmente esta en revision, area ${getAreaRevisionLegible(revisionActiva?.area) || "sin informar"}.`;
    } else if (instalados.length) {
      const instalado = instalados[0];
      const centro = centroPorId.get(Number(instalado?.centro_id || 0));
      ubicacionActual = `Actualmente esta instalado en el centro ${getCentroNombre(centro)}, cliente ${getClienteNombre(centro)}.`;
    } else if (equipoBodega) {
      ubicacionActual = `Actualmente esta en ${equipoBodega?.ubicacion || "Bodega central"}.`;
    }

    const eventos = [];
    const fechaIngreso = formatoFechaLarga(equipoBodega?.fecha_ingreso || equipoBodega?.created_at);
    if (fechaIngreso) {
      eventos.push(`Ingreso a ${equipoBodega?.ubicacion || "Bodega central"} el ${fechaIngreso}.`);
    }

    revisiones.forEach((orden) => {
      const area = getAreaRevisionLegible(orden?.area) || "sin informar";
      const fechaAsignacion = formatoFechaLarga(orden?.fecha_asignacion);
      const fechaInicio = formatoFechaLarga(orden?.fecha_inicio_revision);
      const eventoDevolucion = (Array.isArray(orden?.eventos) ? orden.eventos : [])
        .filter((evento) => normalizar(evento?.evento) === "devuelto_bodega")
        .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())[0];
      const fechaDevolucion = formatoFechaLarga(eventoDevolucion?.created_at || orden?.fecha_cierre);
      const detalle = (Array.isArray(orden?.detalles) ? orden.detalles : []).find((item) => {
        if (idEquipoBodega && Number(item?.bodega_equipo_id || 0) === idEquipoBodega) return true;
        return normalizar(item?.numero_serie) === codigoNorm || normalizar(item?.codigo) === codigoNorm;
      });

      if (fechaAsignacion) eventos.push(`Fue asignado a revision en el area ${area} el ${fechaAsignacion}.`);
      if (fechaInicio && fechaInicio !== fechaAsignacion) eventos.push(`La revision comenzo el ${fechaInicio}.`);
      if (fechaDevolucion) {
        const resultado = getEstadoLegible(detalle?.resultado || eventoDevolucion?.resultado);
        eventos.push(`Volvio a ${equipoBodega?.ubicacion || "Bodega central"} el ${fechaDevolucion}${resultado !== "-" ? `, con resultado ${resultado}` : ""}.`);
      }
    });

    let movimientos = [];
    try {
      const resp = await obtenerMovimientosRecientes(20, 1, { numero_serie: codigo });
      movimientos = Array.isArray(resp?.items) ? resp.items : [];
    } catch (err) {
      movimientos = [];
    }
    movimientos
      .slice()
      .reverse()
      .forEach((movimiento) => {
        const fecha = formatoFechaLarga(movimiento?.fecha);
        if (!fecha) return;
        const centro = movimiento?.centro_nombre;
        const accion = movimiento?.accion && String(movimiento.accion).trim() ? movimiento.accion : "registro";
        const texto = centro
          ? `${getEstadoLegible(accion)} en el centro ${centro} el ${fecha}.`
          : `${getEstadoLegible(accion)} el ${fecha}.`;
        if (!eventos.includes(texto)) eventos.push(texto);
      });

    return {
      titulo: `Historial del codigo ${codigo}`,
      texto: ubicacionActual,
      items: eventos.length ? eventos : ["No encontre movimientos historicos para este codigo."],
    };
  };

  const responderSoportes = (filtro = "general") => {
    const abiertos = datos.soportes.filter(estadoAbiertoSoporte);
    const remotosLista = abiertos.filter((s) => normalizar(s?.tipo) === "remoto");
    const terrenoLista = abiertos.filter((s) => normalizar(s?.tipo) === "terreno");
    const pendientesLista = abiertos.filter((s) => normalizar(s?.estado || "pendiente") === "pendiente");
    const alertasLista = abiertos.filter((s) => normalizar(s?.estado || "") === "en_proceso");
    const listaFiltrada =
      filtro === "remoto"
        ? remotosLista
        : filtro === "terreno"
          ? terrenoLista
          : filtro === "pendientes"
            ? pendientesLista
            : filtro === "alertas"
              ? alertasLista
              : abiertos;

    const porCliente = listaFiltrada.reduce((acc, soporte) => {
      const cliente = getClienteNombre(soporte?.centro) || "Sin cliente";
      acc[cliente] = (acc[cliente] || 0) + 1;
      return acc;
    }, {});

    if (filtro === "remoto") {
      return {
        titulo: "Fallas remotas abiertas",
        texto: `Hay ${remotosLista.length} fallas remotas abiertas.`,
        items: Object.entries(porCliente)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([cliente, total]) => `${cliente}: ${total}`),
      };
    }

    if (filtro === "terreno") {
      return {
        titulo: "Fallas de terreno abiertas",
        texto: `Hay ${terrenoLista.length} fallas de terreno abiertas.`,
        items: Object.entries(porCliente)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([cliente, total]) => `${cliente}: ${total}`),
      };
    }

    if (filtro === "pendientes") {
      return {
        titulo: "Soportes pendientes",
        texto: `Hay ${pendientesLista.length} soportes pendientes.`,
        items: Object.entries(porCliente)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([cliente, total]) => `${cliente}: ${total}`),
      };
    }

    if (filtro === "alertas") {
      return {
        titulo: "Soportes en seguimiento",
        texto: `Hay ${alertasLista.length} soportes en seguimiento.`,
        items: Object.entries(porCliente)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([cliente, total]) => `${cliente}: ${total}`),
      };
    }

    return {
      titulo: "Soporte abierto",
      texto: `Hay ${abiertos.length} soportes abiertos: ${remotosLista.length} remotos y ${terrenoLista.length} de terreno.`,
      items: Object.entries(porCliente)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([cliente, total]) => `${cliente}: ${total}`),
    };
  };

  const responderCasosHoy = () => {
    const casosIsmael = Array.isArray(datos.casosIsmael) ? datos.casosIsmael : [];
    const fallasDispositivos = Array.isArray(datos.fallasDispositivos) ? datos.fallasDispositivos : [];
    const hoy = new Date();
    const describirMomento = (valor) => {
      const fecha = parseFechaHoraBackend(valor);
      if (!fecha) return "sin hora informada";
      if (esMismaFecha(valor, hoy)) {
        return `hoy a las ${fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
      }
      return `el ${formatoFechaHora(valor)}`;
    };
    const soportesGuardados = (Array.isArray(datos.soportes) ? datos.soportes : []).filter((soporte) => {
      const tieneOrigenExterno = String(soporte?.ismael_id_origen || "").trim()
        || String(soporte?.external_case_key || "").startsWith("device-fail:");
      return tieneOrigenExterno && esMismaFecha(soporte?.created_at || soporte?.fecha_soporte, hoy);
    });
    const casosPendientes = [
      ...fallasDispositivos.map((caso) => ({
        tipo: "dispositivo",
        fecha: caso?.offline_since || caso?.created_at,
        estado: "Pendiente de guardar",
        texto: `${caso?.cliente || "Cliente"}: ${caso?.device_name || caso?.entity_type || "dispositivo"} en ${caso?.centro || "centro sin identificar"}`,
      })),
      ...casosIsmael.map((caso) => ({
        tipo: "ismael",
        fecha: caso?.hora_llegada || caso?.created_at || caso?.updated_at,
        estado: "Pendiente de guardar",
        texto: `Ismael${caso?.case_code ? `, caso ${caso.case_code}` : ""}: ${caso?.centro || "centro sin identificar"}. ${caso?.falla_especifica || caso?.asunto || "Sin detalle informado"}`,
      })),
    ];
    const casosGuardados = soportesGuardados.map((soporte) => {
      const esIsmael = Boolean(String(soporte?.ismael_id_origen || "").trim());
      const fuente = String(soporte?.external_case_key || "").split(":")[1] || "cliente";
      const etiquetasFuente = {
        aquachile: "Aquachile",
        "caleta-bay": "Caleta Bay",
        "salmones-aysen": "Salmones Aysen",
      };
      return {
        tipo: esIsmael ? "ismael" : "dispositivo",
        fecha: soporte?.created_at || soporte?.fecha_soporte,
        estado: "Guardado en soporte",
        texto: `${esIsmael ? `Ismael${soporte?.case_code ? `, caso ${soporte.case_code}` : ""}` : (etiquetasFuente[fuente] || getClienteNombre(soporte?.centro))}: ${getCentroNombre(soporte?.centro)}. ${soporte?.problema || "Sin detalle informado"}`,
      };
    });
    const casos = [...casosPendientes, ...casosGuardados]
      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
    const resumenPendientes = casosPendientes.length === 0
      ? "No hay casos pendientes de registrar en soporte."
      : casosPendientes.length === 1
        ? "Hay 1 caso pendiente de registrar en soporte."
        : `Hay ${casosPendientes.length} casos pendientes de registrar en soporte.`;
    const resumenGuardados = casosGuardados.length === 0
      ? "Aun no se ha incorporado ninguno hoy."
      : casosGuardados.length === 1
        ? "Ademas, 1 caso ya fue incorporado hoy."
        : `Ademas, ${casosGuardados.length} casos ya fueron incorporados hoy.`;

    return {
      titulo: "Estado de casos de hoy",
      texto: casos.length
        ? `${resumenPendientes} ${resumenGuardados}`
        : "No hay casos externos registrados hoy.",
      items: casos.slice(0, 15).map((caso) => (
        caso.estado === "Guardado en soporte"
          ? `Ya incorporado: ${caso.texto}`
          : `${caso.texto}. Reportado ${describirMomento(caso.fecha)}.`
      )),
    };
  };

  const buscarFallaEnConsulta = (texto) => {
    const query = normalizar(texto);
    return (Array.isArray(datos.fallasDispositivos) ? datos.fallasDispositivos : []).find((falla) => {
      const centro = normalizar(falla?.centro || falla?.router_id);
      const dispositivo = normalizar(falla?.device_name || falla?.entity_type);
      return (centro && query.includes(centro)) || (dispositivo && dispositivo.length >= 5 && query.includes(dispositivo));
    }) || null;
  };

  const resolverUbicacionFalla = async (falla) => {
    const centros = Array.isArray(datos.centros) ? datos.centros : [];
    const idSite = String(falla?.id_site || "").trim();
    const nombreCentro = normalizar(falla?.centro || falla?.router_id);
    const nombreCliente = normalizar(falla?.cliente);
    const centro = centros.find((item) => idSite && String(item?.id || item?.id_centro) === idSite)
      || centros.find((item) => (
        normalizar(getCentroNombre(item)) === nombreCentro
        && (!nombreCliente || normalizar(getClienteNombre(item)) === nombreCliente)
      ))
      || centros.find((item) => normalizar(getCentroNombre(item)) === nombreCentro);

    if (!centro) {
      return {
        titulo: "No pude ubicar el centro",
        texto: `Identifique la falla en ${falla?.centro || "el centro"}, pero no encontre ese centro en el registro operativo.`,
        items: [],
      };
    }

    const centroId = centro?.id || centro?.id_centro;
    const clienteId = centro?.cliente_id || centro?.id_cliente || centro?.cliente?.id_cliente || centro?.cliente?.id;
    try {
      const [respuestaDiagrama, equipos] = await Promise.all([
        resolverPlantillaDiagrama({ centroId, clienteId }),
        obtenerEquipos(centroId).catch(() => []),
      ]);
      const plantilla = respuestaDiagrama?.plantilla;
      if (!plantilla) {
        return {
          titulo: `Ubicacion de la falla en ${falla?.centro || getCentroNombre(centro)}`,
          texto: "El centro fue identificado, pero aun no tiene una plantilla operativa asignada.",
          items: [],
        };
      }

      const ipObjetivo = String(falla?.target_ip || "").trim();
      const nombreDispositivo = normalizar(falla?.device_name || falla?.entity_type);
      const equipo = (Array.isArray(equipos) ? equipos : []).find(
        (item) => ipObjetivo && String(item?.ip || "").trim() === ipObjetivo
      ) || (Array.isArray(equipos) ? equipos : []).find((item) => {
        const nombreEquipo = normalizar(item?.nombre);
        return nombreDispositivo && (nombreEquipo === nombreDispositivo || nombreEquipo.includes(nombreDispositivo) || nombreDispositivo.includes(nombreEquipo));
      });
      const fallaResuelta = {
        ...falla,
        equipo_id: equipo?.id_equipo || null,
        equipo_nombre: equipo?.nombre || falla?.device_name || falla?.entity_type || "Dispositivo",
      };
      diagramaPendienteRef.current = {
        plantilla,
        falla: fallaResuelta,
        centro: falla?.centro || getCentroNombre(centro),
      };
      return {
        titulo: `Ubicacion de la falla en ${falla?.centro || getCentroNombre(centro)}`,
        texto: `${fallaResuelta.equipo_nombre} aparece resaltado en rojo en el plano fisico. Quieres ver el diagrama de conexion del centro ${falla?.centro || getCentroNombre(centro)}?`,
        items: [],
        topologia: { plantilla, falla: fallaResuelta, vista: "general" },
      };
    } catch (err) {
      return {
        titulo: "No pude cargar la ubicacion",
        texto: err?.response?.data?.error || "Ocurrio un problema consultando la plantilla del centro.",
        items: [],
      };
    }
  };

  const responderSoportesAnio = () => {
    const anioActual = new Date().getFullYear();
    const soportesAnio = datos.soportes.filter((soporte) => {
      const fecha = new Date(getSoporteFecha(soporte) || "");
      return !Number.isNaN(fecha.getTime()) && fecha.getFullYear() === anioActual;
    });
    const abiertos = soportesAnio.filter(estadoAbiertoSoporte);
    const resueltos = soportesAnio.filter((soporte) =>
      ["resuelto", "cerrado", "finalizado", "completado"].includes(normalizar(soporte?.estado || ""))
    );
    const remotos = soportesAnio.filter((soporte) => normalizar(soporte?.tipo) === "remoto").length;
    const terreno = soportesAnio.filter((soporte) => normalizar(soporte?.tipo) === "terreno").length;
    const porCliente = soportesAnio.reduce((acc, soporte) => {
      const cliente = getClienteNombre(soporte?.centro) || "Sin cliente";
      acc[cliente] = (acc[cliente] || 0) + 1;
      return acc;
    }, {});

    return {
      titulo: `Soportes del ano ${anioActual}`,
      texto: `Este ano llevamos ${soportesAnio.length} soportes registrados: ${abiertos.length} abiertos y ${resueltos.length} resueltos.`,
      items: [
        `Remotos: ${remotos}`,
        `Terreno: ${terreno}`,
        ...Object.entries(porCliente)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([cliente, total]) => `${cliente}: ${total}`),
      ],
    };
  };

  const responderArmados = () => {
    const armados = datos.armados || [];
    const activos = armados.filter((a) => !["finalizado", "cancelado", "anulado"].includes(getArmadoEstado(a)));
    const incompletos = armados.filter((a) => getArmadoEstado(a) === "finalizado" && Number(a?.armado_equipos_pendientes || 0) > 0);
    const pendientesDespacho = armados.filter((armado) => {
      const id = Number(armado?.id_armado || armado?.id || 0);
      const totalBultos = Number(armado?.total_cajas || armado?.total_bultos || 0);
      const enviados = contarBultosDespachados(guiasPorArmado.get(id));
      return getArmadoEstado(armado) === "finalizado" && totalBultos > 0 && enviados < totalBultos;
    });

    const items = [...activos, ...incompletos, ...pendientesDespacho]
      .filter((item, index, arr) => arr.findIndex((x) => Number(x?.id_armado || x?.id || 0) === Number(item?.id_armado || item?.id || 0)) === index)
      .slice(0, 8)
      .map((a) => {
        const pct = getPorcentajeArmado(a);
        const pendientes = Number(a?.armado_equipos_pendientes || 0);
        const centro = getCentroNombreArmado(a);
        const cliente = getClienteNombreArmado(a);
        const estado = getEstadoLegible(a?.estado);
        return `Armado ${centro}, cliente ${cliente}. Esta en estado ${estado}, con ${pct}% de avance y ${pendientes} pendientes.`;
      });

    return {
      titulo: "Armados operativos",
      texto: `Actualmente hay ${activos.length} armados activos. Ademas, ${incompletos.length} estan finalizados incompletos y ${pendientesDespacho.length} tienen bultos pendientes de despacho.`,
      items,
    };
  };

  const responderTecnicosArmando = (texto) => {
    const query = normalizar(texto);
    const armadosActivos = (datos.armados || []).filter((armado) => {
      const estado = getArmadoEstado(armado);
      return estado && !["finalizado", "cancelado", "anulado"].includes(estado);
    });
    const armadoEncontrado = armadosActivos.find((armado) => {
      const centro = normalizar(getCentroNombreArmado(armado));
      return centro && query.includes(centro);
    });

    if (!armadoEncontrado) {
      return {
        titulo: "No encontre ese armado activo",
        texto: "No pude identificar el centro dentro de los armados activos.",
        items: armadosActivos.slice(0, 6).map((armado) => `Armado ${getCentroNombreArmado(armado)}, cliente ${getClienteNombreArmado(armado)}.`),
      };
    }

    const centro = getCentroNombreArmado(armadoEncontrado);
    const cliente = getClienteNombreArmado(armadoEncontrado);
    const tecnicos = getTecnicosArmado(armadoEncontrado);
    const estado = getEstadoLegible(armadoEncontrado?.estado);

    return {
      titulo: `Tecnicos del armado ${centro}`,
      texto: tecnicos.length
        ? `El armado de ${centro}, cliente ${cliente}, esta en estado ${estado}.`
        : `El armado de ${centro}, cliente ${cliente}, esta en estado ${estado}, pero no tiene tecnicos informados en los datos cargados.`,
      items: tecnicos.length ? tecnicos.map((nombre) => `Tecnico asignado: ${nombre}`) : [],
    };
  };

  const responderActividades = (periodo = "hoy") => {
    const hoy = new Date();
    const inicioSemana = getInicioSemana(hoy);
    const finSemana = getFinSemana(hoy);
    const filtrarFecha = (fecha) =>
      periodo === "semana" ? fechaEnRango(fecha, inicioSemana, finSemana) : esMismaFecha(fecha, hoy);

    const actividadesPeriodo = datos.actividades
      .filter((actividad) => esActividadActiva(actividad) && filtrarFecha(getActividadFecha(actividad)))
      .map((actividad) => {
        const centro = actividad?.centro_nombre || actividad?.centro?.nombre || actividad?.centro || "-";
        const cliente = actividad?.cliente_nombre || actividad?.cliente || actividad?.centro?.cliente || "-";
        const tipo = actividad?.tipo || actividad?.tipo_actividad || "Actividad";
        const tecnico = actividad?.tecnico_nombre || actividad?.tecnico || actividad?.tecnicos_nombres || "-";
        const fecha = getActividadFecha(actividad);
        return {
          tipo,
          centro,
          cliente,
          tecnico,
          fecha,
          estado: actividad?.estado || "-",
          orden: 0,
          timestamp: new Date(fecha || 0).getTime() || 0,
        };
      });

    const armadosPeriodo = datos.armados
      .filter((armado) => {
        const estado = getArmadoEstado(armado);
        if (!estado || ["finalizado", "cancelado", "anulado"].includes(estado)) return false;
        return filtrarFecha(armado?.fecha_inicio || armado?.fecha_asignacion);
      })
      .map((armado) => {
        const fecha = armado?.fecha_inicio || armado?.fecha_asignacion;
        const tecnicos = getTecnicosArmado(armado);
        return {
          tipo: "Armado",
          centro: armado?.centro?.nombre || armado?.centro_nombre || armado?.centro || "-",
          cliente: armado?.centro?.cliente || armado?.cliente_nombre || armado?.cliente || "-",
          tecnico: tecnicos.length ? tecnicos.join(" / ") : "Tecnico pendiente",
          fecha,
          estado: armado?.estado || "-",
          orden: 1,
          timestamp: new Date(fecha || 0).getTime() || 0,
        };
      });

    const trabajosPeriodo = [...actividadesPeriodo, ...armadosPeriodo].sort((a, b) => {
      if (a.orden !== b.orden) return a.orden - b.orden;
      return b.timestamp - a.timestamp;
    });

    const items = trabajosPeriodo.slice(0, 10).map((item) =>
      `${item.tipo} | ${item.centro} | ${item.cliente} | ${formatoFecha(item.fecha)} | Tecnico ${item.tecnico} | Estado ${item.estado}`
    );

    return {
      titulo: periodo === "semana" ? "Actividades de esta semana" : "Actividades de hoy",
      texto:
        periodo === "semana"
          ? `Hay ${trabajosPeriodo.length} trabajos activos esta semana: ${actividadesPeriodo.length} actividades y ${armadosPeriodo.length} armados.`
          : `Hay ${trabajosPeriodo.length} trabajos activos para hoy: ${actividadesPeriodo.length} actividades y ${armadosPeriodo.length} armados.`,
      items,
    };
  };

  const responderEquipos = (filtro = "resumen") => {
    const instalados = datos.equipos.filter((e) => String(e?.numero_serie || "").trim() && normalizar(e?.estado_registro) !== "no_aplica");
    const bodega = datos.bodega.filter((e) => normalizar(e?.estado_asignacion || "en_bodega") === "en_bodega");
    const asignadosTecnico = datos.bodega.filter((e) => normalizar(e?.estado_asignacion) === "asignado_tecnico");
    const revision = bodega.filter((equipo) => {
      const idEquipo = Number(equipo?.id_bodega_equipo || equipo?.id || 0);
      return revisionPorEquipoBodega.has(idEquipo);
    });

    const describirEquipoBodega = (equipo) => {
      const idEquipo = Number(equipo?.id_bodega_equipo || equipo?.id || 0);
      const revisionActiva = revisionPorEquipoBodega.get(idEquipo);
      const nombre = equipo?.equipo_nombre || equipo?.nombre || "Equipo";
      const codigo = equipo?.codigo ? `codigo ${equipo.codigo}` : "codigo sin informar";
      const serie = equipo?.numero_serie ? `serie ${equipo.numero_serie}` : "serie sin informar";
      if (revisionActiva) {
        const area = getAreaRevisionLegible(revisionActiva.area) || "sin informar";
        return `${nombre}, ${codigo}, ${serie}: en revision, area ${area}.`;
      }
      const estado = getEstadoLegible(equipo?.estado_equipo || "Operativo");
      return `${nombre}, ${codigo}, ${serie}: disponible en ${equipo?.ubicacion || "Bodega central"}, estado ${estado}.`;
    };

    if (filtro === "bodega") {
      const disponibles = bodega.length - revision.length;
      return {
        titulo: "Equipos en bodega",
        texto: bodega.length
          ? `Hay ${bodega.length} equipos en bodega: ${disponibles} disponibles y ${revision.length} en revision.`
          : "Actualmente no hay equipos registrados en bodega.",
        items: bodega.map(describirEquipoBodega),
      };
    }

    if (filtro === "revision") {
      return {
        titulo: "Equipos en revision",
        texto: revision.length
          ? `Hay ${revision.length} equipos de bodega actualmente en revision.`
          : "Actualmente no hay equipos de bodega en revision.",
        items: revision.map(describirEquipoBodega),
      };
    }

    return {
      titulo: "Resumen de equipos",
      texto: `Instalados con serie: ${instalados.length}. En bodega: ${bodega.length}. Asignados a tecnico: ${asignadosTecnico.length}. En revision: ${revision.length}.`,
      items: [
        "Fuente instalados: registros Datos IP / equipos por centro.",
        "Fuente bodega: inventario de equipos en bodega.",
      ],
    };
  };

  const resolverConsulta = async (texto) => {
    const query = normalizar(texto);
    const codigoIngresado = extraerCodigo(texto);
    const solicitaHistorial = query.includes("historial") || query.includes("historia") || query.includes("recorrido");
    if (codigoIngresado) ultimoCodigoConsultadoRef.current = codigoIngresado;
    const codigo = codigoIngresado || (solicitaHistorial ? ultimoCodigoConsultadoRef.current : "");

    if (solicitaHistorial && codigo) return responderHistorialEquipo(codigo);
    if (solicitaHistorial) {
      return {
        titulo: "Indica el codigo del equipo",
        texto: "Escribe el codigo o numero de serie para consultar su historial.",
        items: ["Ejemplo: historial del codigo 241050016"],
      };
    }
    if (codigo) return responderSerie(codigo);
    const respuestaAfirmativa = /^(si|sii+|claro|dale|por supuesto|ok|okay|bueno|muestrame|quiero verla|ver ubicacion)(\b|$)/.test(query);
    const respuestaNegativa = /^(no|ahora no|no gracias|despues|mas tarde)(\b|$)/.test(query);
    if (diagramaPendienteRef.current && respuestaAfirmativa) {
      const contexto = diagramaPendienteRef.current;
      diagramaPendienteRef.current = null;
      return {
        titulo: `Diagrama de conexion de ${contexto.centro}`,
        texto: "Mostrando el recorrido de conexion y el equipo afectado.",
        locucion: `Te muestro el diagrama de conexión del centro ${contexto.centro}. La desconexión puede deberse a un cambio de IP, falta de energía en la cámara o a que la cámara se encuentre dañada. ¿Quieres ejecutar alguna acción de asignación a Ismael, Danilo o Jorge para que lo revisen?`,
        items: [],
        topologia: { plantilla: contexto.plantilla, falla: contexto.falla, vista: "logico" },
      };
    }
    if (diagramaPendienteRef.current && respuestaNegativa) {
      diagramaPendienteRef.current = null;
      return {
        titulo: "Entendido",
        texto: "No mostrare el diagrama de conexion.",
        items: [],
      };
    }
    if (fallaPendienteRef.current && respuestaAfirmativa) {
      const falla = fallaPendienteRef.current;
      fallaPendienteRef.current = null;
      return resolverUbicacionFalla(falla);
    }
    if (fallaPendienteRef.current && respuestaNegativa) {
      fallaPendienteRef.current = null;
      return {
        titulo: "Entendido",
        texto: "No mostrare la ubicacion. Puedes pedirmela nuevamente cuando la necesites.",
        items: [],
      };
    }
    if (/^(hola|holi|buenas|buen dia|buenos dias|buenas tardes|buenas noches)(\b|[!,.])/.test(query)) {
      return {
        titulo: "Hola",
        texto: "En que te puedo ayudar hoy? Puedes consultarme por equipos, soportes, armados o actividades.",
        items: [],
      };
    }
    if ((query.includes("caso") || query.includes("estado de casos")) && query.includes("hoy")) {
      return responderCasosHoy();
    }
    if (query.includes("falla")) {
      const falla = buscarFallaEnConsulta(texto);
      if (falla) {
        diagramaPendienteRef.current = null;
        fallaPendienteRef.current = falla;
        return {
          titulo: `Falla activa en ${falla?.centro || "el centro"}`,
          texto: `Por supuesto. ${falla?.device_name || falla?.entity_type || "El dispositivo"} se encuentra sin conexion desde ${formatoFechaHoraNarrada(falla?.offline_since || falla?.created_at)}. Quieres ver la ubicacion de la falla?`,
          items: [],
        };
      }
    }
    if ((query.includes("soporte") || query.includes("falla")) && (query.includes("ano") || query.includes("este ano") || query.includes("actual"))) {
      return responderSoportesAnio();
    }
    if (query.includes("remota") || query.includes("remoto")) {
      return responderSoportes("remoto");
    }
    if (query.includes("terreno")) {
      return responderSoportes("terreno");
    }
    if (query.includes("alerta") || query.includes("en proceso") || query.includes("seguimiento")) {
      return responderSoportes("alertas");
    }
    if (query.includes("pendiente")) {
      return responderSoportes("pendientes");
    }
    if (query.includes("soporte") || query.includes("falla") || query.includes("pendiente") || query.includes("alerta")) {
      return responderSoportes();
    }
    if (query.includes("quien") && (query.includes("armando") || query.includes("armado"))) {
      return responderTecnicosArmando(texto);
    }
    if (query.includes("armado") || query.includes("armando") || query.includes("bulto") || query.includes("despacho")) {
      return responderArmados();
    }
    if (query.includes("actividad") || query.includes("trabajo") || query.includes("hoy") || query.includes("semana") || query.includes("calendario")) {
      return responderActividades(query.includes("semana") ? "semana" : "hoy");
    }
    if (query.includes("bodega")) {
      return responderEquipos("bodega");
    }
    if (query.includes("revision")) {
      return responderEquipos("revision");
    }
    if (query.includes("equipo") || query.includes("instalado")) {
      return responderEquipos();
    }

    return {
      titulo: "Consulta no reconocida",
      texto: "Por ahora puedo responder ubicacion por serie/codigo, soporte, armados, actividades de hoy y equipos.",
      items: [
        "Prueba: donde esta el codigo 311030052",
        "Prueba: cuantos soportes pendientes hay",
        "Prueba: armados incompletos",
      ],
    };
  };

  const seleccionarVozFemenina = () => {
    if (!("speechSynthesis" in window)) return null;
    const nombresFemeninos = [
      "catalina", "monica", "paulina", "laura", "helena", "sabina", "elvira",
      "dalia", "luciana", "paloma", "mia", "sofia", "isabela", "female", "mujer",
    ];
    const voces = window.speechSynthesis.getVoices();
    return voces
      .filter((voz) => normalizar(voz.lang).startsWith("es"))
      .map((voz) => {
        const nombre = normalizar(voz.name);
        let puntaje = normalizar(voz.lang) === "es-cl" ? 100 : 55;
        if (nombresFemeninos.some((referencia) => nombre.includes(referencia))) puntaje += 45;
        if (/natural|neural|google|microsoft/.test(nombre)) puntaje += 12;
        return { voz, puntaje };
      })
      .sort((a, b) => b.puntaje - a.puntaje)[0]?.voz || null;
  };

  const detenerPulsoVoz = () => {
    window.clearInterval(pulsoVozRef.current);
    pulsoVozRef.current = null;
    setHablando(false);
    setEnergiaVoz(0);
  };

  const iniciarPulsoVoz = () => {
    window.clearInterval(pulsoVozRef.current);
    setHablando(true);
    setEnergiaVoz(0.52);
    pulsoVozRef.current = window.setInterval(() => {
      setEnergiaVoz((energiaAnterior) => {
        const objetivo = 0.2 + Math.random() * 0.8;
        return Math.min(1, (energiaAnterior * 0.28) + (objetivo * 0.72));
      });
    }, 120);
  };

  const hablarRespuesta = (respuesta) => {
    if (!vozActiva || !("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") return;
    const partes = [respuesta?.titulo, respuesta?.texto, ...(Array.isArray(respuesta?.items) ? respuesta.items.slice(0, 8) : [])]
      .map((parte) => String(parte || "").replace(/\s*\|\s*/g, ". ").trim())
      .filter(Boolean);
    if (!partes.length) return;

    window.speechSynthesis.cancel();
    const locucion = new window.SpeechSynthesisUtterance(partes.join(". "));
    const voz = seleccionarVozFemenina();
    if (voz) locucion.voice = voz;
    locucion.lang = voz?.lang || "es-CL";
    locucion.rate = 0.96;
    locucion.pitch = 1.06;
    locucion.volume = 1;
    locucion.onstart = iniciarPulsoVoz;
    locucion.onboundary = (event) => {
      if (event.name === "word") setEnergiaVoz(0.72 + Math.random() * 0.28);
    };
    locucion.onend = detenerPulsoVoz;
    locucion.onerror = detenerPulsoVoz;
    window.speechSynthesis.speak(locucion);
  };

  const alternarVoz = () => {
    const nuevoEstado = !vozActiva;
    window.speechSynthesis?.cancel();
    detenerPulsoVoz();
    setVozActiva(nuevoEstado);
    localStorage.setItem("asistente_voz_activa", String(nuevoEstado));
  };

  const enviarConsulta = async (textoForzado) => {
    const texto = String(textoForzado || consulta || "").trim();
    if (!texto || consultando) return;

    const idBase = Date.now();
    setMensajes((prev) => [...prev, { id: `u-${idBase}`, tipo: "usuario", texto }]);
    setConsulta("");
    setConsultando(true);
    try {
      const respuesta = await resolverConsulta(texto);
      const { topologia, locucion, ...respuestaChat } = respuesta;
      if (topologia) {
        setTopologiaModal({
          ...topologia,
          titulo: respuesta.titulo || "Ubicacion de la falla",
          descripcion: respuesta.texto || "Equipo identificado en el plano fisico.",
        });
      }
      setMensajes((prev) => [
        ...prev,
        {
          id: `a-${idBase}`,
          tipo: "asistente",
          ...respuestaChat,
        },
      ]);
      hablarRespuesta(locucion ? { texto: locucion, items: [] } : respuestaChat);
    } catch (err) {
      console.error("Error en consulta operativa:", err);
      setMensajes((prev) => [
        ...prev,
        {
          id: `a-${idBase}`,
          tipo: "asistente",
          titulo: "No pude resolver la consulta",
          texto: "Ocurrio un problema consultando los datos. Actualiza e intenta nuevamente.",
          items: [],
        },
      ]);
      hablarRespuesta({
        titulo: "No pude resolver la consulta",
        texto: "Ocurrio un problema consultando los datos. Actualiza e intenta nuevamente.",
      });
    } finally {
      setConsultando(false);
    }
  };

  const sugerencias = [
    "donde esta el codigo 311030052",
    "dime los casos de hoy",
    "cuantos soportes pendientes hay",
    "armados incompletos",
    "actividades de hoy",
    "equipos en bodega",
  ];

  return (
    <div className="asistente-page container-fluid py-4">
      <div className="asistente-hero">
        <div>
          <span className="asistente-eyebrow">Solo administracion</span>
          <h2>Asistente operativo</h2>
          <p>Consulta rapida por texto sobre equipos, soporte, armados, bodega y calendario.</p>
        </div>
        <div className="asistente-hero-tools">
          <div className="asistente-kpis compact">
            <div className="asistente-kpi red">
              <span>Soportes abiertos</span>
              <strong>{resumen.soportesAbiertos}</strong>
              <div className="asistente-kpi-statuses">
                <small className="pending">Pendientes {resumen.soportesPendientes}</small>
                <small className="tracking">En seguimiento {resumen.soportesEnProceso}</small>
              </div>
            </div>
            <div className="asistente-kpi blue">
              <span>Armados activos</span>
              <strong>{resumen.armadosActivos}</strong>
              <small>Incompletos {resumen.armadosIncompletos}</small>
            </div>
          </div>
          <button className="asistente-refresh" type="button" onClick={() => cargarDatos()} disabled={loading}>
            <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-sync-alt"}`} />
            {loading ? "Actualizando" : "Actualizar datos"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-warning">{error}</div> : null}

      <div className="asistente-layout">
        <section className="asistente-chat-card">
          <div className="asistente-chat-head">
            <div>
              <h5>Consulta operativa</h5>
              <small>Ultima actualizacion: {ultimaActualizacion ? formatoFechaHora(ultimaActualizacion) : "-"}</small>
            </div>
            <span className="asistente-status">
              <i className="fas fa-circle" />
              Datos conectados
            </span>
          </div>

          <div className="asistente-messages">
            {mensajes.map((msg) => (
              <div key={msg.id} className={`asistente-message ${msg.tipo === "usuario" ? "user" : "assistant"}`}>
                {msg.titulo ? <h6>{msg.titulo}</h6> : null}
                <p>{msg.texto}</p>
                {Array.isArray(msg.items) && msg.items.length ? (
                  <ul>
                    {msg.items.map((item, idx) => (
                      <li key={`${msg.id}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            {consultando ? (
              <div className="asistente-message assistant">
                <p>
                  <i className="fas fa-spinner fa-spin mr-2" />
                  Consultando datos operativos...
                </p>
              </div>
            ) : null}
          </div>

          <form
            className="asistente-input"
            onSubmit={(event) => {
              event.preventDefault();
              enviarConsulta();
            }}
          >
            <input
              value={consulta}
              onChange={(event) => setConsulta(event.target.value)}
              placeholder="Pregunta por serie, soporte, armados, bodega o actividades..."
              disabled={consultando}
            />
            <button
              type="button"
              className={`asistente-voice-control ${vozActiva ? "is-enabled" : "is-muted"} ${hablando ? "is-speaking" : ""}`}
              style={{
                "--voice-scale": (0.94 + energiaVoz * 0.16).toFixed(3),
                "--voice-brightness": (0.98 + energiaVoz * 0.28).toFixed(2),
                "--voice-glow": `${12 + Math.round(energiaVoz * 18)}px`,
                "--voice-spin-duration": `${(1.4 - energiaVoz * 0.68).toFixed(2)}s`,
                "--voice-reverse-duration": `${(2.15 - energiaVoz * 0.85).toFixed(2)}s`,
              }}
              onClick={alternarVoz}
              aria-pressed={vozActiva}
              title={vozActiva ? "Desactivar voz" : "Activar voz"}
            >
              <span className="voice-core" aria-hidden="true" />
              <span className="voice-orbit orbit-one" aria-hidden="true" />
              <span className="voice-orbit orbit-two" aria-hidden="true" />
            </button>
            <button type="submit" disabled={consultando || !consulta.trim()}>
              <i className="fas fa-paper-plane" />
            </button>
          </form>
        </section>

        <aside className="asistente-side-card">
          <h5>Consultas rapidas</h5>
          <p>Selecciona una consulta o escribe una propia.</p>
          <div className="asistente-suggestions">
            {sugerencias.map((sugerencia) => (
              <button key={sugerencia} type="button" onClick={() => enviarConsulta(sugerencia)} disabled={consultando}>
                {sugerencia}
              </button>
            ))}
          </div>

          <div className="asistente-scope">
            <h6>Alcance de esta version</h6>
            <span>Texto solamente</span>
            <span>Sin IA externa</span>
            <span>Datos actuales del sistema</span>
            <span>Acceso solo admin</span>
          </div>
        </aside>
      </div>

      {topologiaModal && (
        <div className="asistente-topology-modal" role="dialog" aria-modal="true" aria-labelledby="asistente-topology-title">
          <div className="asistente-topology-dialog">
            <div className="asistente-topology-header">
              <div>
                <small>{topologiaModal.vista === "logico" ? "Topologia operativa" : "Ubicacion operativa"}</small>
                <h5 id="asistente-topology-title">{topologiaModal.titulo}</h5>
                <span>{topologiaModal.descripcion}</span>
              </div>
              <div className="asistente-topology-timer">
                <strong>{segundosTopologia}</strong>
                <small>segundos</small>
              </div>
              <button type="button" onClick={() => setTopologiaModal(null)} aria-label="Cerrar ubicacion">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="asistente-topology-body">
              {topologiaModal.vista === "logico" ? (
                <DiagramaLogicoViewer plantilla={topologiaModal.plantilla} fallaActiva={topologiaModal.falla} />
              ) : (
                <VistaGeneralViewer plantilla={topologiaModal.plantilla} fallaActiva={topologiaModal.falla} />
              )}
            </div>
            <div className="asistente-topology-progress" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AsistenteOperativo;
