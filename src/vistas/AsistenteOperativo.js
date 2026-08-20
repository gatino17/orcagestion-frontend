import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  obtenerSoportes,
} from "../api";
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
  });
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [error, setError] = useState("");
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
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
      const [equipos, armados, soportes, actividades, bodega, centrosResp, guias] = await Promise.all([
        obtenerEquipos().catch(() => []),
        obtenerArmados().catch(() => []),
        obtenerSoportes().catch(() => []),
        obtenerActividades().catch(() => []),
        obtenerInventarioBodegaEquipos().catch(() => []),
        obtenerCentros({ page: 1, per_page: 0 }).catch(() => ({ centros: [] })),
        obtenerGuiasSalidaArmado().catch(() => []),
      ]);

      setDatos({
        equipos: Array.isArray(equipos) ? equipos : [],
        armados: Array.isArray(armados) ? armados : [],
        soportes: Array.isArray(soportes) ? soportes : [],
        actividades: Array.isArray(actividades) ? actividades : [],
        bodega: Array.isArray(bodega) ? bodega : [],
        centros: Array.isArray(centrosResp?.centros) ? centrosResp.centros : Array.isArray(centrosResp) ? centrosResp : [],
        guias: Array.isArray(guias) ? guias : [],
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
    const items = [];

    if (ubicacionActual) {
      if (estaEnBodega) {
        items.push(`Actualmente se encuentra en ${ubicacionActual.ubicacion || "Bodega central"}.`);
        items.push(`Corresponde al equipo ${ubicacionActual.equipo_nombre || ubicacionActual.nombre || "Equipo"}, serie ${ubicacionActual.numero_serie || "-"}.`);
        items.push(`Su estado registrado es ${ubicacionActual.estado_equipo || ubicacionActual.estado_asignacion || "sin estado informado"}.`);
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

    if (movimientosUnicos.length) {
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
      };
    }

    return {
      titulo: `Ubicacion actual del codigo ${codigo}`,
      texto: estaEnBodega
        ? "Encontre este codigo en bodega."
        : instalado.length
          ? "Encontre este codigo instalado en un centro."
          : "Encontre registros historicos para este codigo.",
      items,
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
        titulo: "Soportes en proceso",
        texto: `Hay ${alertasLista.length} soportes en proceso.`,
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

  const responderEquipos = () => {
    const instalados = datos.equipos.filter((e) => String(e?.numero_serie || "").trim() && normalizar(e?.estado_registro) !== "no_aplica");
    const bodega = datos.bodega.filter((e) => normalizar(e?.estado_asignacion || "en_bodega") === "en_bodega");
    const asignadosTecnico = datos.bodega.filter((e) => normalizar(e?.estado_asignacion) === "asignado_tecnico");
    const revision = datos.bodega.filter((e) => normalizar(e?.ubicacion).includes("revision") || normalizar(e?.estado_equipo).includes("revision"));

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
    const codigo = extraerCodigo(texto);

    if (codigo) return responderSerie(codigo);
    if ((query.includes("soporte") || query.includes("falla")) && (query.includes("ano") || query.includes("este ano") || query.includes("actual"))) {
      return responderSoportesAnio();
    }
    if (query.includes("remota") || query.includes("remoto")) {
      return responderSoportes("remoto");
    }
    if (query.includes("terreno")) {
      return responderSoportes("terreno");
    }
    if (query.includes("alerta") || query.includes("en proceso")) {
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
    if (query.includes("equipo") || query.includes("instalado") || query.includes("bodega") || query.includes("revision")) {
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

  const enviarConsulta = async (textoForzado) => {
    const texto = String(textoForzado || consulta || "").trim();
    if (!texto || consultando) return;

    const idBase = Date.now();
    setMensajes((prev) => [...prev, { id: `u-${idBase}`, tipo: "usuario", texto }]);
    setConsulta("");
    setConsultando(true);
    try {
      const respuesta = await resolverConsulta(texto);
      setMensajes((prev) => [
        ...prev,
        {
          id: `a-${idBase}`,
          tipo: "asistente",
          ...respuesta,
        },
      ]);
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
    } finally {
      setConsultando(false);
    }
  };

  const sugerencias = [
    "donde esta el codigo 311030052",
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
              <small>Pendientes {resumen.soportesPendientes} | En proceso {resumen.soportesEnProceso}</small>
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
    </div>
  );
}

export default AsistenteOperativo;
