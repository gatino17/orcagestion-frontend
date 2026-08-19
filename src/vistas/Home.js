import React, { useState, useEffect, useCallback } from "react";
import DataTable from 'react-data-table-component';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import esLocale from "@fullcalendar/core/locales/es";
import { io } from "socket.io-client";
import './Home.css';

import { cargarActividades, modificarActividad, agregarActividad } from '../controllers/actividadesControllers';
import { cargarEncargados } from '../controllers/encargadosControllers';
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import { obtenerArmados, obtenerGuiasSalidaArmado, obtenerSoportes } from "../api";

const CHECKLIST_ARMADO_TOTAL_ITEMS = 57;

const normalizarTexto = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const obtenerClaveCaja = (valor) => {
  const raw = String(valor || "").trim();
  const norm = normalizarTexto(raw);
  if (!raw || !norm || norm === "sin caja") return "";
  const match = norm.match(/^caja\s*(\d+)/i);
  return match ? `caja_${Number(match[1])}` : norm;
};

const calcularPctChecklistArmado = (armadoId) => {
  const id = Number(armadoId || 0);
  if (!id) return { done: 0, total: CHECKLIST_ARMADO_TOTAL_ITEMS, pct: 0 };
  try {
    const raw = localStorage.getItem(`orcagest_armado_checklist_v1_${id}`);
    if (!raw) return { done: 0, total: CHECKLIST_ARMADO_TOTAL_ITEMS, pct: 0 };
    const parsed = JSON.parse(raw);
    const checks = parsed?.checks && typeof parsed.checks === "object" ? parsed.checks : {};
    let done = 0;
    Object.values(checks).forEach((row) => {
      const estado = String(row?.estado || "").trim().toLowerCase();
      if (estado) done += 1;
    });
    const total = CHECKLIST_ARMADO_TOTAL_ITEMS;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  } catch (e) {
    return { done: 0, total: CHECKLIST_ARMADO_TOTAL_ITEMS, pct: 0 };
  }
};

const Home = () => {
    const [actividades, setActividades] = useState([]);
    const [encargados, setEncargados] = useState([]);
    const [centros, setCentros] = useState([]);  // Estado para los centros
    const [soportes, setSoportes] = useState([]);
    const [armadosHome, setArmadosHome] = useState([]);
    const [guiasSalidaHome, setGuiasSalidaHome] = useState([]);
    const [loadingArmadosHome, setLoadingArmadosHome] = useState(false);
    const [paginaSoportes, setPaginaSoportes] = useState(1);
    const [clienteSoporte, setClienteSoporte] = useState("todos");
    const [filtroSoporteHome, setFiltroSoporteHome] = useState("todos");
    const [loading, setLoading] = useState(true);

    // Estado para actividad en edicion y mostrar modal
    const [editarActividad, setEditarActividad] = useState(null);
    const [showModal, setShowModal] = useState(false);
  

    // Campos del formulario
    const [nombreActividad, setNombreActividad] = useState('');
    const [fechaReclamo, setFechaReclamo] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaTermino, setFechaTermino] = useState('');
    const [area, setArea] = useState('');
    const [prioridad, setPrioridad] = useState('');
    
    const [centroId, setCentroId] = useState('');
    const [estadoActividad, setEstadoActividad] = useState('En progreso');
    
    const [encargadoId, setEncargadoId] = useState('');  // Encargado principal
    const [ayudanteId, setAyudanteId] = useState('');  // Ayudante

    
    const cargarSoportesHome = useCallback(async () => {
      try {
        const soportesData = await obtenerSoportes();
        setSoportes(Array.isArray(soportesData) ? soportesData : []);
      } catch (error) {
        console.error("No se pudieron cargar pendientes de soporte:", error);
        setSoportes([]);
      }
    }, []);

    const cargarActividadesHome = useCallback(async () => {
      const actividadesData = await cargarActividades();
      setActividades(actividadesData);
    }, []);

    const cargarArmadosHome = useCallback(async ({ silent = false } = {}) => {
      if (!silent) setLoadingArmadosHome(true);
      try {
        const [armados, guias] = await Promise.all([obtenerArmados(), obtenerGuiasSalidaArmado()]);
        const lista = (Array.isArray(armados) ? armados : []).sort((a, b) => {
          const fa = new Date(a?.fecha_asignacion || a?.created_at || 0).getTime();
          const fb = new Date(b?.fecha_asignacion || b?.created_at || 0).getTime();
          return fb - fa;
        });
        setArmadosHome(lista);
        setGuiasSalidaHome(Array.isArray(guias) ? guias : []);
      } catch (error) {
        console.error("No se pudieron cargar armados operativos:", error);
        if (!silent) {
          setArmadosHome([]);
          setGuiasSalidaHome([]);
        }
      } finally {
        if (!silent) setLoadingArmadosHome(false);
      }
    }, []);

    const cargarDatosHome = useCallback(async () => {
          setLoading(true);
  
          const centrosData = await cargarCentrosClientes(); // Carga centros
          setCentros(centrosData); // Asigna los datos de los centros
	          await cargarActividadesHome();
  
          const encargadosData = await cargarEncargados(); // Carga encargados
          setEncargados(encargadosData);
	          await cargarSoportesHome();
	          await cargarArmadosHome();
	                              
	          setLoading(false);
	    }, [cargarActividadesHome, cargarArmadosHome, cargarSoportesHome]);

    useEffect(() => {
      cargarDatosHome();
    }, [cargarDatosHome]);

    useEffect(() => {
      const env = process.env.REACT_APP_API_BASE_URL;
      const socketBaseUrl = env && /^https?:\/\//i.test(env)
        ? env.replace(/\/api\/?$/i, "")
        : window.location.hostname === "localhost"
          ? "http://localhost:5000"
          : `${window.location.protocol}//${window.location.host}`;
      const socket = io(socketBaseUrl, {
        transports: process.env.REACT_APP_SOCKET_POLLING_ONLY === "1" ? ["polling"] : ["websocket", "polling"],
        reconnection: true
      });
      const refrescarSoportes = () => cargarSoportesHome();
      const refrescarActividades = () => cargarActividadesHome();
      const refrescarArmados = () => cargarArmadosHome({ silent: true });
      socket.on("soporte_updated", refrescarSoportes);
      socket.on("actividad_updated", refrescarActividades);
      socket.on("armado_updated", refrescarArmados);
      return () => {
        socket.off("soporte_updated", refrescarSoportes);
        socket.off("actividad_updated", refrescarActividades);
        socket.off("armado_updated", refrescarArmados);
        socket.disconnect();
      };
    }, [cargarActividadesHome, cargarArmadosHome, cargarSoportesHome]);

    useEffect(() => {
      const interval = setInterval(() => {
        cargarSoportesHome();
        cargarActividadesHome();
        cargarArmadosHome({ silent: true });
      }, 8000);
      return () => clearInterval(interval);
    }, [cargarActividadesHome, cargarArmadosHome, cargarSoportesHome]);

    useEffect(() => {
      setPaginaSoportes(1);
    }, [clienteSoporte, filtroSoporteHome]);
 
    const handleGuardarActividad = async () => {
        const datosActividad = {
          nombre_actividad: nombreActividad,
          fecha_reclamo: fechaReclamo || null,
          fecha_inicio: fechaInicio || null,
          fecha_termino: fechaTermino || null,
          area: area || null,
          prioridad: prioridad || null,
          tecnico_encargado: encargadoId ? parseInt(encargadoId, 10) : null,
          tecnico_ayudante: ayudanteId ? parseInt(ayudanteId, 10) : null,
          estado: estadoActividad || null,
          centro_id: centroId ? parseInt(centroId, 10) : null,
        };
      
        try {
          if (editarActividad) {
            await modificarActividad(editarActividad.id_actividad, datosActividad);
            alert('Actividad actualizada exitosamente');
          } else {
            await agregarActividad(datosActividad);
            alert('Actividad creada exitosamente');
          }
      
          const actividadesActualizadas = await cargarActividades();
          setActividades(actividadesActualizadas);
          setShowModal(false);
          resetForm();
        } catch (error) {
          alert(`Error al guardar la actividad: ${error.message}`);
          console.error(error);
        }
      };

    const resetForm = () => {
        setNombreActividad('');
        setFechaReclamo('');
        setFechaInicio('');
        setFechaTermino('');
        setArea('');
        setPrioridad('');
        setEncargadoId('');
        setAyudanteId('');
        setCentroId('');
        setEstadoActividad('En progreso');
        setEditarActividad(null);
    };

    
    const formatearFecha = (fecha) => {
      if (!fecha) return '';
  
      const fechaObj = new Date(fecha);
  
      // Ajustar fecha para eliminar el desfase de la zona horaria
      fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
  
      const dia = String(fechaObj.getDate()).padStart(2, '0');
      const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const anio = fechaObj.getFullYear();
  
      return `${dia}/${mes}/${anio}`;
    };
  
    const parseFechaLocal = (valor, finDeDia = false) => {
      if (!valor) return null;
      const texto = String(valor).slice(0, 10);
      const partes = texto.split("-");
      if (partes.length !== 3) {
        const fecha = new Date(valor);
        if (Number.isNaN(fecha.getTime())) return null;
        fecha.setHours(finDeDia ? 23 : 0, finDeDia ? 59 : 0, finDeDia ? 59 : 0, finDeDia ? 999 : 0);
        return fecha;
      }
      const [anio, mes, dia] = partes.map((p) => parseInt(p, 10));
      if (!anio || !mes || !dia) return null;
      const fecha = new Date(anio, mes - 1, dia);
      fecha.setHours(finDeDia ? 23 : 0, finDeDia ? 59 : 0, finDeDia ? 59 : 0, finDeDia ? 999 : 0);
      return fecha;
    };

	    const calcularDiasAbiertosSoporte = (soporte) => {
	      const inicio = parseFechaLocal(soporte?.fecha_soporte);
	      if (!inicio) return 0;
	      const fin = soporte?.fecha_cierre ? parseFechaLocal(soporte.fecha_cierre) : new Date();
	      if (!fin || Number.isNaN(fin.getTime())) return 0;
	      fin.setHours(0, 0, 0, 0);
	      return Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
	    };

		    const obtenerTimestampSoporte = (soporte) => {
		      const valor = soporte?.updated_at || soporte?.created_at || soporte?.fecha_soporte;
		      if (!valor) return 0;
		      const fecha = new Date(valor);
		      return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
		    };

		    const actividadTieneTecnicoAsignado = (actividad) => {
		      const principal = actividad?.encargado_principal?.nombre_encargado || actividad?.encargado_id;
		      const ayudante = actividad?.encargado_ayudante?.nombre_encargado || actividad?.ayudante_id;
		      const adicionales = Array.isArray(actividad?.tecnicos_asignados) ? actividad.tecnicos_asignados : [];
		      return Boolean(principal || ayudante || adicionales.length);
		    };

		    const obtenerTimestampActividad = (actividad) => {
		      const valor = actividad?.fecha_inicio || actividad?.updated_at || actividad?.created_at || actividad?.fecha_reclamo;
		      if (!valor) return Number(actividad?.id_actividad || 0);
		      const fecha = new Date(valor);
		      return Number.isNaN(fecha.getTime()) ? Number(actividad?.id_actividad || 0) : fecha.getTime();
		    };

const totalActividades = actividades.length;

const actividadesOrdenadasHome = [...actividades].sort((a, b) => {
  const asignadaA = actividadTieneTecnicoAsignado(a) ? 1 : 0;
  const asignadaB = actividadTieneTecnicoAsignado(b) ? 1 : 0;
  if (asignadaA !== asignadaB) return asignadaB - asignadaA;
  return obtenerTimestampActividad(b) - obtenerTimestampActividad(a);
});

const soportesPendientesAbiertos = (Array.isArray(soportes) ? soportes : [])
  .filter((soporte) => {
    const estado = String(soporte?.estado || "pendiente").toLowerCase();
    return estado === "pendiente" || estado === "en_proceso";
  })
	  .map((soporte) => ({
	    ...soporte,
	    diasAbiertos: calcularDiasAbiertosSoporte(soporte)
	  }))
	  .sort((a, b) => obtenerTimestampSoporte(b) - obtenerTimestampSoporte(a));

const totalSoportesAbiertos = soportesPendientesAbiertos.length;
const totalSoportesPendientes = soportesPendientesAbiertos.filter(
  (soporte) => String(soporte.estado || "pendiente").toLowerCase() === "pendiente"
).length;
const totalSoportesAlertas = soportesPendientesAbiertos.filter(
  (soporte) => String(soporte.estado || "").toLowerCase() === "en_proceso"
).length;
const totalSoportesRemotos = soportesPendientesAbiertos.filter(
  (soporte) => String(soporte.tipo || "").toLowerCase() === "remoto"
).length;
const totalSoportesTerreno = soportesPendientesAbiertos.filter(
  (soporte) => String(soporte.tipo || "").toLowerCase() === "terreno"
).length;
const obtenerClienteSoporte = (soporte) => soporte?.centro?.cliente || soporte?.cliente || "Cliente sin nombre";
const obtenerUbicacionAreaCentro = (soporte) => {
  const ubicacion = String(soporte?.centro?.ubicacion || "").trim();
  const areaCentro = String(soporte?.centro?.area || "").trim();
  return [ubicacion, areaCentro].filter(Boolean).join(" / ");
};
const actividadAsignadaPorSoporte = (Array.isArray(actividades) ? actividades : []).reduce((acc, actividad) => {
  const soporteId = Number(actividad?.soporte_id || 0);
  if (!soporteId) return acc;
  const estado = String(actividad?.estado || "").toLowerCase();
  if (estado === "finalizado" || estado === "cancelado") return acc;
  if (!acc.has(soporteId)) {
    acc.set(soporteId, actividad);
	  }
	  return acc;
	}, new Map());
const filtrarSoportePorKpi = (soporte) => {
  const estado = String(soporte?.estado || "pendiente").toLowerCase();
  const tipoSoporte = String(soporte?.tipo || "").toLowerCase();
  if (filtroSoporteHome === "pendientes") return estado === "pendiente";
  if (filtroSoporteHome === "alertas") return estado === "en_proceso";
  if (filtroSoporteHome === "remotas") return tipoSoporte === "remoto";
  if (filtroSoporteHome === "terreno") return tipoSoporte === "terreno";
  return true;
};
const soportesFiltradosPorKpi = soportesPendientesAbiertos.filter(filtrarSoportePorKpi);
const clientesSoporte = Object.entries(
	  soportesFiltradosPorKpi.reduce((acc, soporte) => {
	    const cliente = obtenerClienteSoporte(soporte);
	    acc[cliente] = (acc[cliente] || 0) + 1;
	    return acc;
	  }, {})
	).sort((a, b) => a[0].localeCompare(b[0]));
const soportesBaseFiltradosPorCliente = clienteSoporte === "todos"
	  ? soportesFiltradosPorKpi
	  : soportesFiltradosPorKpi.filter((soporte) => obtenerClienteSoporte(soporte) === clienteSoporte);
const obtenerOrdenSoporteHome = (soporte) => {
  if (actividadAsignadaPorSoporte.has(Number(soporte?.id_soporte || 0))) return 0;
  const estado = String(soporte?.estado || "pendiente").toLowerCase();
  if (estado === "pendiente") return 1;
  return 2;
};
	const soportesFiltradosPorCliente = [...soportesBaseFiltradosPorCliente].sort((a, b) => {
	  const ordenA = obtenerOrdenSoporteHome(a);
	  const ordenB = obtenerOrdenSoporteHome(b);
	  if (ordenA !== ordenB) return ordenA - ordenB;
	  const recienteA = obtenerTimestampSoporte(a);
	  const recienteB = obtenerTimestampSoporte(b);
	  if (recienteA !== recienteB) return recienteB - recienteA;
	  return Number(b.id_soporte || 0) - Number(a.id_soporte || 0);
	});
const obtenerTecnicosActividad = (actividad) => {
  if (!actividad) return [];
  const tecnicos = [];
  const vistos = new Set();
  const agregar = (tecnico) => {
    const nombre = String(tecnico?.nombre_encargado || "").trim();
    const id = Number(tecnico?.id_encargado || 0);
    const key = id || nombre;
    if (!nombre || vistos.has(key)) return;
    vistos.add(key);
    tecnicos.push(nombre);
  };
  agregar(actividad.encargado_principal);
  agregar(actividad.encargado_ayudante);
  if (Array.isArray(actividad.tecnicos_asignados)) {
    actividad.tecnicos_asignados.forEach(agregar);
  }
  return tecnicos;
};

const hoyKey = (() => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
})();

const fechaActividadKey = (actividad) => {
  const fecha = parseFechaLocal(actividad?.fecha_inicio);
  if (!fecha) return "";
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};

const estadoActividadKey = (actividad) => normalizarTexto(actividad?.estado || "");

const trabajosCursoHoy = (Array.isArray(actividades) ? actividades : [])
  .filter((actividad) => {
    const estado = estadoActividadKey(actividad);
    if (estado === "finalizado" || estado === "cancelado") return false;
    const esHoy = fechaActividadKey(actividad) === hoyKey;
    const enProceso = estado === "en progreso" || estado === "en_proceso";
    const vieneDeSoporte = Number(actividad?.soporte_id || 0) > 0;
    return esHoy || enProceso || vieneDeSoporte;
  })
  .sort((a, b) => {
    const soporteA = Number(a?.soporte_id || 0) > 0 ? 0 : 1;
    const soporteB = Number(b?.soporte_id || 0) > 0 ? 0 : 1;
    if (soporteA !== soporteB) return soporteA - soporteB;
    const hoyA = fechaActividadKey(a) === hoyKey ? 0 : 1;
    const hoyB = fechaActividadKey(b) === hoyKey ? 0 : 1;
    if (hoyA !== hoyB) return hoyA - hoyB;
    const fechaA = new Date(a?.fecha_inicio || 0).getTime();
    const fechaB = new Date(b?.fecha_inicio || 0).getTime();
    return fechaA - fechaB;
  })
  .slice(0, 6);

const soportesPorPagina = 5;
const totalSoportesFiltrados = soportesFiltradosPorCliente.length;
const totalPaginasSoportes = Math.max(1, Math.ceil(totalSoportesFiltrados / soportesPorPagina));
const paginaSoportesActual = Math.min(paginaSoportes, totalPaginasSoportes);
const inicioSoportes = (paginaSoportesActual - 1) * soportesPorPagina;
const soportesPrioritariosHome = soportesFiltradosPorCliente.slice(inicioSoportes, inicioSoportes + soportesPorPagina);

const guiasPorArmadoHome = (Array.isArray(guiasSalidaHome) ? guiasSalidaHome : []).reduce((map, guia) => {
  const armadoId = Number(guia?.armado_id || 0);
  if (!armadoId) return map;
  const lista = map.get(armadoId) || [];
  lista.push(guia);
  map.set(armadoId, lista);
  return map;
}, new Map());

const armadosHomeOperativos = (Array.isArray(armadosHome) ? armadosHome : []).map((armado) => {
  const armadoId = Number(armado?.id_armado || armado?.id || 0);
  const finalizado = normalizarTexto(armado?.estado || "") === "finalizado";
  const pendientesArmado = Math.max(0, Number(armado?.armado_equipos_pendientes || 0));
  const totalBultos = Math.max(0, Number(armado?.total_cajas || armado?.total_bultos || 0));
  const guiasArmado = Array.isArray(guiasPorArmadoHome.get(armadoId)) ? guiasPorArmadoHome.get(armadoId) : [];
  const bultosDespachados = new Set();
  guiasArmado.forEach((guia) => {
    (Array.isArray(guia?.cajas) ? guia.cajas : []).forEach((caja) => {
      const clave = obtenerClaveCaja(caja);
      if (clave) bultosDespachados.add(clave);
    });
  });

  const totalBultosOperativos = Math.max(totalBultos, bultosDespachados.size);
  const bultosEnviados = Math.min(bultosDespachados.size, totalBultosOperativos);
  const bultosPendientes = Math.max(totalBultosOperativos - bultosEnviados, 0);
  const armadoOperativo = finalizado
    ? pendientesArmado > 0
      ? { label: "Finalizado incompleto", pillClass: "home-calendar-status-warning", order: 1 }
      : { label: "Finalizado completo", pillClass: "home-calendar-status-success", order: 2 }
    : { label: "En preparacion", pillClass: "home-calendar-status-info", order: 0 };

	  const despachoOperativo =
	    bultosEnviados <= 0
	      ? { label: "Sin despacho", pillClass: "home-calendar-status-muted", order: 0 }
	      : bultosPendientes > 0
	        ? { label: "Despacho parcial", pillClass: "home-calendar-status-warning", order: 1 }
	        : { label: "Despacho completo", pillClass: "home-calendar-status-success", order: 2 };
	  const operativoCompleto = finalizado && pendientesArmado <= 0 && bultosPendientes <= 0;

	  return {
	    ...armado,
	    armado_pendientes_operativos: pendientesArmado,
    armado_operativo_label: armadoOperativo.label,
    armado_operativo_pill_class: armadoOperativo.pillClass,
    armado_operativo_orden: armadoOperativo.order,
	    despacho_operativo_label: despachoOperativo.label,
	    despacho_operativo_pill_class: despachoOperativo.pillClass,
	    despacho_operativo_orden: despachoOperativo.order,
	    operativo_completo_orden: operativoCompleto ? 1 : 0,
	    bultos_enviados_operativos: bultosEnviados,
	    bultos_pendientes_operativos: bultosPendientes
	  };
}).sort((a, b) => {
  if (a.operativo_completo_orden !== b.operativo_completo_orden) {
    return a.operativo_completo_orden - b.operativo_completo_orden;
  }
  const fechaA = new Date(a?.fecha_asignacion || a?.created_at || 0).getTime();
  const fechaB = new Date(b?.fecha_asignacion || b?.created_at || 0).getTime();
  return fechaB - fechaA;
});

const obtenerTecnicosArmadoHome = (armado) => {
  const activos = Array.isArray(armado?.tecnicos_asignados) ? armado.tecnicos_asignados : [];
  const principal = armado?.tecnico?.nombre || armado?.tecnico_nombre || "";
  const apoyo = activos.map((tec) => tec?.nombre).filter(Boolean);
  return [...new Set([principal, ...apoyo].filter(Boolean))];
};

const trabajosCursoHoyOperativos = [
  ...trabajosCursoHoy.map((actividad) => {
    const estado = String(actividad.estado || "Sin estado");
    return {
      key: `actividad-${actividad.id_actividad}`,
      centro: actividad.centro?.nombre || "Sin centro",
      cliente: actividad.centro?.cliente || "Sin cliente",
      tipo: actividad.area || actividad.nombre_actividad || "Actividad",
      fecha: actividad.fecha_inicio,
      tecnicos: obtenerTecnicosActividad(actividad),
      estado,
      estadoClass: normalizarTexto(estado).replace(/\s+/g, "-").replace(/_/g, "-") || "sin-estado",
      destacado: Number(actividad?.soporte_id || 0) > 0,
      extraClass: Number(actividad?.soporte_id || 0) > 0 ? "from-support" : "",
      orden: Number(actividad?.soporte_id || 0) > 0 ? 0 : 2,
      timestamp: new Date(actividad?.fecha_inicio || 0).getTime() || 0
    };
  }),
  ...armadosHomeOperativos
	    .filter((armado) => {
	      const estado = normalizarTexto(armado?.estado || "");
	      if (!estado || estado === "finalizado" || estado === "cancelado" || estado === "anulado") return false;
	      return true;
	    })
    .map((armado) => {
      const estado = String(armado.estado || "Sin estado");
      return {
        key: `armado-${armado.id_armado}`,
        centro: armado.centro?.nombre || armado.centro_nombre || "Sin centro",
        cliente: armado.centro?.cliente || armado.cliente_nombre || "Sin cliente",
        tipo: "Armado",
        fecha: armado.fecha_inicio || armado.fecha_asignacion,
        tecnicos: obtenerTecnicosArmadoHome(armado),
        estado,
        estadoClass: normalizarTexto(estado).replace(/\s+/g, "-").replace(/_/g, "-") || "sin-estado",
        destacado: false,
        extraClass: "from-armado",
        orden: 1,
        timestamp: new Date(armado.fecha_inicio || armado.fecha_asignacion || 0).getTime() || 0
      };
    })
].sort((a, b) => {
  if (a.orden !== b.orden) return a.orden - b.orden;
  return b.timestamp - a.timestamp;
}).slice(0, 6);
	  
	    

	    // Filtra los encargados para evitar seleccionar el mismo encargado como ayudante
    const filteredAyudantes = encargados.filter(encargado => encargado.id_encargado !== parseInt(encargadoId));


    const columns = [
        {
            name: "N",
            sortable: false,
            width: "52px",
            cell: (_row, index) => <span className="home-table-index">{Number(index || 0) + 1}</span>
        },
        {
            name: "Actividad",
            selector: row => row.nombre_actividad,
            sortable: true,
            grow: 1.9,
            cell: row => (
                <div className="home-activity-cell">
	                    <strong>{row.nombre_actividad || "Sin nombre"}</strong>
	                    <div className="home-table-meta">
	                        {row.centro?.cliente || "Sin cliente"} - {row.centro?.nombre || "Sin centro"}
	                    </div>
	                </div>
	            )
	        },
        { name: "Inicio", selector: row => formatearFecha(row.fecha_inicio), sortable: true, width: "96px" },
        { name: "Fin", selector: row => formatearFecha(row.fecha_termino), sortable: true, width: "96px" },
        {
            name: "Tipo",
            selector: row => row.area || "-",
            sortable: true,
            width: "124px",
            cell: row => (
                <span className="home-pill home-state-en-progreso home-calendar-pill-compact" title={row.area || "-"}>
                    {row.area || "-"}
                </span>
            )
        },
        {
            name: "Prioridad",
            selector: row => row.prioridad,
            sortable: true,
            width: "110px",
            cell: row => <span className={`home-pill home-pill-${(row.prioridad || "ninguna").toLowerCase()}`}>{row.prioridad || "-"}</span>
        },
        {
            name: "Estado",
            selector: row => row.estado,
            sortable: true,
            width: "112px",
            cell: row => {
                const estadoRaw = String(row.estado || "Sin estado");
                const estadoKey = estadoRaw.toLowerCase().replace(/\s+/g, "-");
                const esFinalizado = estadoKey === "finalizado";
                const esEnProgreso = estadoKey === "en-progreso";
                if (esFinalizado) {
                    return (
                        <span className={`home-pill home-state-${estadoKey}`} title="Finalizado">
                            <i className="fas fa-check-circle" />
                        </span>
                    );
                }
                if (esEnProgreso) {
                    return (
                        <span className={`home-pill home-state-${estadoKey}`} title="En progreso">
                            <i className="fas fa-cog" />
                        </span>
                    );
                }
                return <span className={`home-pill home-state-${estadoKey}`}>{estadoRaw}</span>;
            }
        },
        {
            name: "Tecnico",
            selector: row => row.encargado_principal?.nombre_encargado || "No asignado",
            sortable: true,
            grow: 1.35,
            cell: row => {
                const principal = String(row.encargado_principal?.nombre_encargado || "").trim();
                const ayudante = String(row.encargado_ayudante?.nombre_encargado || "").trim();
                const adicionales = Array.isArray(row.tecnicos_asignados)
                    ? row.tecnicos_asignados
                        .map((t) => String(t?.nombre_encargado || "").trim())
                        .filter(Boolean)
                        .filter((n) => n !== principal && n !== ayudante)
                    : [];
                const acompanantes = [ayudante, ...adicionales].filter(Boolean);

                return (
                    <div className="home-tech-cell">
                        <strong>{principal || "No asignado"}</strong>
                        {acompanantes.length ? (
                            <small title={acompanantes.join(", ")}>
                                Acompanantes: {acompanantes.join(", ")}
                            </small>
                        ) : (
                            <small>Sin acompanantes</small>
                        )}
                    </div>
                );
            }
        }
    ];

    const columnasArmadosHome = [
        {
            name: "Fecha",
            selector: (row) => row.fecha_asignacion || row.created_at || "",
            sortable: true,
            width: "92px",
            cell: (row) => formatearFecha(row.fecha_asignacion || row.created_at)
        },
        {
            name: "Cliente",
            selector: (row) => row.centro?.cliente || row.cliente_nombre || "",
            sortable: true,
            grow: 0.9,
            cell: (row) => (
                <div className="home-truncate" title={row.centro?.cliente || row.cliente_nombre || ""}>
                    {row.centro?.cliente || row.cliente_nombre || "-"}
                </div>
            )
        },
        {
            name: "Centro",
            selector: (row) => row.centro?.nombre || row.centro_nombre || "",
            sortable: true,
            grow: 0.9,
            cell: (row) => (
                <div className="home-truncate" title={row.centro?.nombre || row.centro_nombre || ""}>
                    {row.centro?.nombre || row.centro_nombre || "-"}
                </div>
            )
        },
        {
            name: "Tecnico",
            selector: (row) => row.tecnico?.nombre || row.tecnico_nombre || "",
            sortable: true,
            width: "130px",
            cell: (row) => {
                const activos = Array.isArray(row.tecnicos_asignados) ? row.tecnicos_asignados : [];
                const principal = row.tecnico?.nombre || row.tecnico_nombre || "Sin asignar";
                const apoyo = activos
                    .filter((tec) => !tec?.principal)
                    .map((tec) => tec?.nombre)
                    .filter(Boolean);
                return (
                    <div className="home-truncate" title={[principal, ...apoyo].join(", ")}>
                        <div>{principal}</div>
                        {apoyo.length ? <small>Apoyo: {apoyo.join(", ")}</small> : null}
                    </div>
                );
            }
        },
        {
            name: "Armado",
            selector: (row) => row.armado_operativo_orden,
            sortable: true,
            width: "190px",
            cell: (row) => {
                const pendientes = Math.max(0, Number(row.armado_pendientes_operativos || 0));
                return (
                    <div className="home-armado-estado-cell">
                        <span className={`home-pill ${row.armado_operativo_pill_class}`}>{row.armado_operativo_label}</span>
                        {pendientes > 0 ? (
                            <small className="home-armado-meta home-armado-pendiente">Pendientes: {pendientes}</small>
                        ) : (
                            <small className="home-armado-meta home-armado-ok">Sin pendientes</small>
                        )}
                    </div>
                );
            }
        },
        {
            name: "Despacho",
            selector: (row) => row.despacho_operativo_orden,
            sortable: true,
            width: "178px",
            cell: (row) => (
                <div className="home-armado-estado-cell">
                    <span className={`home-pill ${row.despacho_operativo_pill_class}`}>{row.despacho_operativo_label}</span>
                    <small className="home-armado-meta">
                        Enviados: {row.bultos_enviados_operativos} | Pendientes: {row.bultos_pendientes_operativos}
                    </small>
                </div>
            )
        },
        {
            name: "Checklist",
            selector: (row) => calcularPctChecklistArmado(row.id_armado || row.id).pct,
            sortable: true,
            width: "92px",
            cell: (row) => {
                const progreso = calcularPctChecklistArmado(row.id_armado || row.id);
                const color = progreso.pct >= 100 ? "#16a34a" : progreso.pct >= 60 ? "#f59e0b" : "#dc2626";
                return <strong style={{ color }}>{progreso.pct}%</strong>;
            }
        }
    ];

    const getColorByActividad = (prioridad) => {
        const colores = {
            Alta: "red",
            Media: "orange",
            Baja: "green",
            Urgente: "purple",
        };
        return colores[prioridad] || "gray"; // Color por defecto
    };
    
        
    return (
        <div className="container-fluid home-dashboard">
	            <div className="home-header">
	                <div>
	                    <h2>Panel operativo</h2>
	                </div>
	            </div>

            <div className="home-metrics-grid">
	                <button
	                    type="button"
	                    className={`metric-card support-kpi-card support-kpi-open ${filtroSoporteHome === "todos" ? "active" : ""}`}
	                    onClick={() => setFiltroSoporteHome("todos")}
	                >
	                    <span>Total fallas abiertas</span>
	                    <h3>{totalSoportesAbiertos}</h3>
	                    <small>Soportes pendientes de cierre</small>
	                </button>
	                <button
	                    type="button"
	                    className={`metric-card critical support-kpi-card ${filtroSoporteHome === "pendientes" ? "active" : ""}`}
	                    onClick={() => setFiltroSoporteHome("pendientes")}
	                >
	                    <span>Pendientes</span>
	                    <h3>{totalSoportesPendientes}</h3>
	                    <small>Sin gestion completa</small>
	                </button>
	                <button
	                    type="button"
	                    className={`metric-card support-kpi-card support-kpi-warning ${filtroSoporteHome === "alertas" ? "active" : ""}`}
	                    onClick={() => setFiltroSoporteHome("alertas")}
	                >
	                    <span>Alertas</span>
	                    <h3>{totalSoportesAlertas}</h3>
	                    <small>Casos en seguimiento</small>
	                </button>
	                <button
	                    type="button"
	                    className={`metric-card support-kpi-card support-kpi-info ${filtroSoporteHome === "remotas" ? "active" : ""}`}
	                    onClick={() => setFiltroSoporteHome("remotas")}
	                >
	                    <span>Remotas</span>
	                    <h3>{totalSoportesRemotos}</h3>
	                    <small>Atencion sin terreno</small>
	                </button>
	                <button
	                    type="button"
	                    className={`metric-card support-kpi-card support-kpi-primary ${filtroSoporteHome === "terreno" ? "active" : ""}`}
	                    onClick={() => setFiltroSoporteHome("terreno")}
	                >
	                    <span>Terreno</span>
	                    <h3>{totalSoportesTerreno}</h3>
	                    <small>Requieren visita o gestion local</small>
	                </button>
            </div>

            <div className="home-operational-grid">
            <div className="home-support-priority-card">
                <div className="support-priority-header">
                    <div>
                        <span className="support-priority-kicker">Soporte operativo</span>
                        <h5>Pendientes prioritarios</h5>
                        <p>Trabajos abiertos mas antiguos que requieren seguimiento.</p>
                    </div>
                    <div className="support-priority-tools">
                        <div className="support-client-cards" aria-label="Filtrar pendientes por cliente">
                            <button
                                type="button"
                                className={`support-client-card ${clienteSoporte === "todos" ? "active" : ""}`}
                                onClick={() => setClienteSoporte("todos")}
                            >
                                <span>Todos</span>
	                                <strong>{soportesFiltradosPorKpi.length}</strong>
                            </button>
                            {clientesSoporte.map(([cliente, cantidad]) => (
                                <button
                                    type="button"
                                    className={`support-client-card ${clienteSoporte === cliente ? "active" : ""}`}
                                    onClick={() => setClienteSoporte(cliente)}
                                    key={cliente}
                                >
                                    <span>{cliente}</span>
                                    <strong>{cantidad}</strong>
                                </button>
                            ))}
                        </div>
                        <span className="support-priority-icon" aria-label="Soporte">
                            <i className="fas fa-headset" />
                        </span>
                    </div>
                </div>

                {soportesPrioritariosHome.length ? (
                    <ul className="support-priority-list">
	                        {soportesPrioritariosHome.map((soporte) => {
	                            const esAlerta = String(soporte.estado || "").toLowerCase() === "en_proceso";
	                            const esRemoto = String(soporte.tipo || "").toLowerCase() === "remoto";
	                            const ubicacionArea = obtenerUbicacionAreaCentro(soporte);
	                            const actividadAsignada = actividadAsignadaPorSoporte.get(Number(soporte.id_soporte || 0));
	                            const tecnicosActividad = obtenerTecnicosActividad(actividadAsignada);
	                            return (
	                                <li className={`support-priority-item ${esAlerta ? "is-alert" : ""} ${actividadAsignada ? "is-scheduled" : ""}`} key={soporte.id_soporte}>
	                                    <div className="support-priority-main">
	                                        <div className="support-priority-title-row">
	                                            <strong>{soporte.centro?.nombre || "Centro sin nombre"}</strong>
		                                            {ubicacionArea && (
		                                                <span className="support-area-chip">{ubicacionArea}</span>
		                                            )}
		                                            <span className={`support-type-chip ${esRemoto ? "remote" : "terrain"}`}>
		                                                {esRemoto ? "Remoto" : "Terreno"}
		                                            </span>
		                                        </div>
	                                            <small className="support-priority-client-date">
	                                                {soporte.centro?.cliente || "Cliente sin nombre"} - {formatearFecha(soporte.fecha_soporte)}
	                                            </small>
	                                        {soporte.problema && (
	                                            <div className="support-priority-problem">{soporte.problema}</div>
	                                        )}
		                                        {actividadAsignada && (
	                                            <div className="support-assigned-row">
	                                                <span>
	                                                    <i className="fas fa-user-check mr-1" />
	                                                    {tecnicosActividad.length ? tecnicosActividad.join(" / ") : "Tecnico pendiente"}
	                                                </span>
	                                                <span>
	                                                    <i className="fas fa-calendar-check mr-1" />
	                                                    {formatearFecha(actividadAsignada.fecha_inicio)}
	                                                </span>
	                                            </div>
	                                        )}
	                                    </div>
	                                    <div className="support-priority-status">
	                                        <span className={`support-priority-days ${esAlerta ? "is-alert" : ""}`}>
	                                            <i className="fas fa-clock mr-1" />
	                                            {soporte.diasAbiertos} dia{soporte.diasAbiertos === 1 ? "" : "s"}
	                                        </span>
	                                        {actividadAsignada && (
	                                            <span className="support-scheduled-chip">Asignado</span>
	                                        )}
	                                    </div>
	                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="support-priority-empty">
                        <i className="fas fa-check-circle mr-2" />
                        No hay pendientes prioritarios de soporte.
                    </div>
                )}

                {totalSoportesFiltrados > soportesPorPagina && (
                    <div className="support-priority-pagination">
                        <button
                            type="button"
                            className="support-page-button"
                            disabled={paginaSoportesActual <= 1}
                            onClick={() => setPaginaSoportes((pagina) => Math.max(1, pagina - 1))}
                        >
                            <i className="fas fa-chevron-left mr-1" />
                            Anterior
                        </button>
                        <span>Pagina {paginaSoportesActual} de {totalPaginasSoportes}</span>
                        <button
                            type="button"
                            className="support-page-button"
                            disabled={paginaSoportesActual >= totalPaginasSoportes}
                            onClick={() => setPaginaSoportes((pagina) => Math.min(totalPaginasSoportes, pagina + 1))}
                        >
                            Siguiente
                            <i className="fas fa-chevron-right ml-1" />
                        </button>
                    </div>
                )}
	            </div>

		            <div className="home-work-card">
		                <div className="home-section-heading">
		                    <div>
		                        <span className="home-section-kicker">Operacion diaria</span>
		                        <h5>Trabajo en curso de hoy</h5>
		                    </div>
			                    <span className="home-work-count">{trabajosCursoHoyOperativos.length}</span>
			                </div>
			                {trabajosCursoHoyOperativos.length ? (
			                    <div className="home-work-list">
			                        {trabajosCursoHoyOperativos.map((trabajo) => {
			                            return (
			                                <div className={`home-work-item ${trabajo.extraClass}`} key={trabajo.key}>
			                                    <div className="home-work-main">
			                                        <div className="home-work-title-row">
			                                            <strong>{trabajo.centro}</strong>
			                                            <span className="home-pill home-state-en-progreso">{trabajo.tipo}</span>
			                                        </div>
			                                        <small>{trabajo.cliente}</small>
			                                        <div className="home-work-meta">
			                                            <span><i className="far fa-calendar-check mr-1" />{formatearFecha(trabajo.fecha)}</span>
			                                            <span><i className="fas fa-user-check mr-1" />{trabajo.tecnicos.length ? trabajo.tecnicos.join(" / ") : "Tecnico pendiente"}</span>
			                                        </div>
			                                    </div>
		                                    <span className={`home-pill home-state-${trabajo.estadoClass}`}>{trabajo.estado}</span>
		                                </div>
		                            );
		                        })}
	                    </div>
	                ) : (
		                    <div className="support-priority-empty">
		                        <i className="fas fa-check-circle mr-2" />
		                        Sin actividad por el momento.
		                    </div>
		                )}
		            </div>
            </div>

			            <div className="row home-content-grid">
                <div className="col-xl-7">
                    <div className="card w-100 home-activities-card">
                        <div className="card-body">
                            <div className="home-section-heading">
                                <div>
                                    <span className="home-section-kicker">Planificacion</span>
                                    <h5>Actividades registradas</h5>
                                </div>
                                <span className="home-pill home-state-en-progreso">{totalActividades} registros</span>
                            </div>
                            <DataTable
                                columns={columns}
	                                data={actividadesOrdenadasHome}
                                progressPending={loading}
                                pagination
                                paginationPerPage={10}
                                paginationRowsPerPageOptions={[10, 15, 20, 30, 50]}
                                highlightOnHover
                                pointerOnHover
                                responsive
                                noDataComponent="No hay actividades disponibles"
                                className="w-100 home-activities-table"
                            />
	                        </div>
	                    </div>
	                    <div className="card w-100 home-armados-card mt-3">
	                        <div className="card-body">
	                            <div className="home-section-heading mb-2">
	                                <h5>Armados (estado operativo)</h5>
	                                <span className="home-pill home-state-en-progreso">{armadosHome.length} registros</span>
	                            </div>
	                            <DataTable
	                                columns={columnasArmadosHome}
	                                data={armadosHomeOperativos}
	                                progressPending={loadingArmadosHome && !armadosHome.length}
	                                pagination
	                                paginationPerPage={5}
	                                paginationRowsPerPageOptions={[5, 10, 15]}
	                                dense
	                                highlightOnHover
	                                striped
	                                responsive
	                                noDataComponent="No hay armados operativos."
	                                className="home-armados-table"
	                            />
	                        </div>
	                    </div>
	                </div>

	                <div className="col-xl-5">
                    <div className="card w-100">
                        <div className="card-body">
                            <div className="home-section-heading">
                                <h5>Calendario operacional</h5>
                                <span className="insight-meta">Prioridad por color</span>
                            </div>
	                            <FullCalendar
	                                plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
	                                locale={esLocale}
	                                initialView="dayGridMonth"
	                                headerToolbar={{
	                                    left: 'prev,next today',
	                                    center: 'title',
	                                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
	                                }}
	                                buttonText={{
	                                    today: 'Hoy',
	                                    month: 'Mes',
	                                    week: 'Semana',
	                                    day: 'Dia',
	                                }}
	                                views={{
	                                    dayGridMonth: { buttonText: 'Mes' },
	                                    timeGridWeek: { buttonText: 'Semana' },
                                    timeGridDay: { buttonText: 'Dia' },
                                }}
                                events={actividades
                                    .filter((actividad) => actividad.fecha_inicio && actividad.fecha_termino)
                                    .map((actividad) => {
                                        const fechaInicio = new Date(actividad.fecha_inicio);
                                        const fechaTermino = new Date(actividad.fecha_termino);
                                        fechaInicio.setUTCHours(12, 0, 0);
                                        fechaTermino.setUTCHours(12, 0, 0);

                                        return {
                                            id: actividad.id_actividad,
                                            title: actividad.nombre_actividad,
                                            start: fechaInicio.toISOString(),
                                            end: fechaTermino.toISOString(),
                                            color: getColorByActividad(actividad.prioridad),
                                        };
                                    })}
                            />
                        </div>
                    </div>
                </div>
	            </div>

	            {/* Modal para crear/editar actividad */}
            {showModal && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{editarActividad ? 'Editar Actividad' : 'Crear Actividad'}</h5>
                                <button type="button" className="close" onClick={() => setShowModal(false)}>
                                    &times;
                                </button>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <form>
                                    <div className="form-group">
                                        <label>Nombre de la Actividad</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nombreActividad}
                                            onChange={(e) => setNombreActividad(e.target.value)}
                                        />
                                    </div>
    
                                    {/* Encargado Principal */}
                                    <div className="form-group">
                                        <label>Encargado Principal</label>
                                        <select
                                            className="form-control"
                                            value={encargadoId}
                                            onChange={(e) => setEncargadoId(e.target.value)}
                                        >
                                            <option value="">Seleccione Encargado</option>
                                            {encargados.map((encargado) => (
                                                <option key={encargado.id_encargado} value={encargado.id_encargado}>
                                                    {encargado.nombre_encargado}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
    
                                    {/* Ayudante */}
                                    <div className="form-group">
                                        <label>Ayudante</label>
                                        <select
                                            className="form-control"
                                            value={ayudanteId}
                                            onChange={(e) => setAyudanteId(e.target.value)}
                                        >
                                            <option value="">Seleccione Ayudante</option>
                                            {filteredAyudantes.map((ayudante) => (
                                                <option key={ayudante.id_encargado} value={ayudante.id_encargado}>
                                                    {ayudante.nombre_encargado}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
    
                                    {/* Selector de Centro */}
                                    <div className="form-group">
                                        <label>Centro</label>
                                        <select
                                            className="form-control"
                                            value={centroId}
                                            onChange={(e) => setCentroId(e.target.value)}
                                        >
                                            <option value="">Seleccione un centro</option>
                                            {centros.map((centro) => (
                                                <option key={centro.id} value={centro.id}>
                                                    {centro.nombre} - {centro.cliente}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
    
                                    <div className="form-group">
                                        <label>Fecha Reclamo</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fechaReclamo}
                                            onChange={(e) => setFechaReclamo(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha Inicio</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fechaInicio}
                                            onChange={(e) => setFechaInicio(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha termino</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={fechaTermino}
                                            onChange={(e) => setFechaTermino(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Area</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={area}
                                            onChange={(e) => setArea(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Prioridad</label>
                                        <select
                                            className="form-control"
                                            value={prioridad}
                                            onChange={(e) => setPrioridad(e.target.value)}
                                        >
                                            <option value="">Seleccione Prioridad</option>
                                            <option value="Alta">Alta</option>
                                            <option value="Media">Media</option>
                                            <option value="Baja">Baja</option>
                                            <option value="Urgente">Urgente</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Estado</label>
                                        <select
                                            className="form-control"
                                            value={estadoActividad}
                                            onChange={(e) => setEstadoActividad(e.target.value)}
                                        >
                                            <option value="En progreso">En Progreso</option>
                                            <option value="Finalizado">Finalizado</option>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Cancelado">Cancelado</option>
                                        </select>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cerrar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleGuardarActividad}>
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    
};

export default Home;
