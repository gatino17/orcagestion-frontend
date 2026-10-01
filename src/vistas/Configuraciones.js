import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  API_BASE_URL,
  actualizarPlantillaDiagrama,
  crearPlantillaDiagrama,
  duplicarPlantillaDiagrama,
  eliminarPlantillaDiagrama,
  guardarContenidoPlantillaDiagrama,
  obtenerCentros,
  obtenerClientes,
  obtenerEquipos,
  obtenerInventarioBodegaTipos,
  obtenerPlantillasDiagramas,
} from "../api";
import "./Configuraciones.css";

const FORM_INICIAL = {
  nombre: "",
  descripcion: "",
  alcance: "general",
  cliente_id: "",
  centro_id: "",
  estado: "activo",
};

const MARCADOR_INICIAL = {
  id: "",
  nombre: "",
  tipo: "camara",
  tipo_equipo: "",
  color: "#ef4444",
  equipo_id: "",
  zona_id: "",
  descripcion: "",
  x: 50,
  y: 50,
};

const ZONA_INICIAL = {
  id: "",
  nombre: "",
  color: "#0ea5e9",
  opacidad: 0.2,
  x: 50,
  y: 50,
  ancho: 20,
  alto: 15,
};

const NODO_INICIAL = {
  id: "",
  nombre: "",
  tipo: "router",
  tipo_equipo: "",
  color: "#0ea5e9",
  equipo_id: "",
  descripcion: "",
  x: 50,
  y: 50,
};

const GRUPO_LOGICO_INICIAL = {
  id: "",
  nombre: "",
  color: "#0ea5e9",
  opacidad: 0.12,
  x: 50,
  y: 50,
  ancho: 35,
  alto: 30,
};

const TIPOS_MARCADOR = [
  { value: "internet", label: "Internet", icon: "fas fa-cloud" },
  { value: "camara", label: "Camara", icon: "fas fa-video" },
  { value: "ptz", label: "Camara PTZ", icon: "fas fa-arrows-to-circle" },
  { value: "termal", label: "Camara termal", icon: "fas fa-temperature-high" },
  { value: "radar", label: "Radar", icon: "fas fa-broadcast-tower" },
  { value: "router", label: "Router", icon: "fas fa-wifi" },
  { value: "switch", label: "Switch", icon: "fas fa-network-wired" },
  { value: "computador", label: "Computador", icon: "fas fa-desktop" },
  { value: "nvr", label: "NVR", icon: "fas fa-desktop" },
  { value: "netio", label: "Netio", icon: "fas fa-plug" },
  { value: "axis", label: "Axis", icon: "fas fa-microchip" },
  { value: "victron", label: "Victron", icon: "fas fa-car-battery" },
  { value: "sensor", label: "Sensor", icon: "fas fa-satellite-dish" },
  { value: "luminaria", label: "Luminaria", icon: "fas fa-lightbulb" },
  { value: "bocina", label: "Bocina", icon: "fas fa-bullhorn" },
  { value: "transformador", label: "Transformador", icon: "fas fa-charging-station" },
  { value: "tablero", label: "Tablero", icon: "fas fa-server" },
  { value: "energia", label: "Energia", icon: "fas fa-bolt" },
  { value: "otro", label: "Otro", icon: "fas fa-map-marker-alt" },
];

const COLORES_MARCADOR = ["#ef4444", "#f59e0b", "#22c55e", "#0ea5e9", "#2563eb", "#64748b"];

const iconoMarcador = (tipo) => TIPOS_MARCADOR.find((item) => item.value === tipo)?.icon || "fas fa-map-marker-alt";

const posicionCentrada = (elementos, conexionId, separacion = 1.15) => {
  const indice = Math.max(0, elementos.findIndex((item) => item.id === conexionId));
  return (indice - ((elementos.length - 1) / 2)) * separacion;
};

const rutaCurvaConexion = (origen, destino, conexion, conexiones, nodos) => {
  const diferenciaX = Math.abs(destino.x - origen.x);
  const diferenciaY = Math.abs(destino.y - origen.y);
  const horizontal = diferenciaX > diferenciaY * 1.15;
  const salientes = conexiones
    .filter((item) => item.origen === conexion.origen)
    .sort((a, b) => {
      const nodoA = nodos.find((item) => item.id === a.destino);
      const nodoB = nodos.find((item) => item.id === b.destino);
      return horizontal ? (nodoA?.y || 0) - (nodoB?.y || 0) : (nodoA?.x || 0) - (nodoB?.x || 0);
    });
  const entrantes = conexiones
    .filter((item) => item.destino === conexion.destino)
    .sort((a, b) => {
      const nodoA = nodos.find((item) => item.id === a.origen);
      const nodoB = nodos.find((item) => item.id === b.origen);
      return horizontal ? (nodoA?.y || 0) - (nodoB?.y || 0) : (nodoA?.x || 0) - (nodoB?.x || 0);
    });

  if (horizontal) {
    const inicioY = origen.y + posicionCentrada(salientes, conexion.id);
    const finY = destino.y + posicionCentrada(entrantes, conexion.id);
    const direccion = destino.x >= origen.x ? 1 : -1;
    const curvatura = Math.max(4, diferenciaX * 0.42);
    return `M ${origen.x} ${inicioY} C ${origen.x + (direccion * curvatura)} ${inicioY}, ${destino.x - (direccion * curvatura)} ${finY}, ${destino.x} ${finY}`;
  }

  const inicioX = origen.x + posicionCentrada(salientes, conexion.id);
  const finX = destino.x + posicionCentrada(entrantes, conexion.id);
  const direccion = destino.y >= origen.y ? 1 : -1;
  const curvatura = Math.max(5, diferenciaY * 0.42);
  return `M ${inicioX} ${origen.y} C ${inicioX} ${origen.y + (direccion * curvatura)}, ${finX} ${destino.y - (direccion * curvatura)}, ${finX} ${destino.y}`;
};

const SelectorIcono = ({ value, onChange }) => {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);
  const seleccionado = TIPOS_MARCADOR.find((item) => item.value === value) || TIPOS_MARCADOR[0];

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrarAlPresionarFuera = (event) => {
      if (!contenedorRef.current?.contains(event.target)) setAbierto(false);
    };
    const cerrarConEscape = (event) => {
      if (event.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", cerrarAlPresionarFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarAlPresionarFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div className={`config-icon-select ${abierto ? "open" : ""}`} ref={contenedorRef}>
      <button
        type="button"
        className="config-icon-select-trigger"
        onClick={() => setAbierto((actual) => !actual)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <span className="config-icon-select-symbol"><i className={seleccionado.icon} /></span>
        <span>{seleccionado.label}</span>
        <i className={`fas fa-chevron-${abierto ? "up" : "down"}`} />
      </button>
      {abierto && (
        <div className="config-icon-select-menu" role="listbox" aria-label="Iconos disponibles">
          {TIPOS_MARCADOR.map((tipo) => (
            <button
              type="button"
              role="option"
              aria-selected={tipo.value === value}
              className={tipo.value === value ? "selected" : ""}
              key={tipo.value}
              onClick={() => {
                onChange(tipo.value);
                setAbierto(false);
              }}
            >
              <span><i className={tipo.icon} /></span>
              {tipo.label}
              {tipo.value === value && <i className="fas fa-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const normalizarBusquedaEquipo = (valor) => String(valor || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim();

const SelectorEquipoArmado = ({ value, opciones, onChange }) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedorRef = useRef(null);
  const seleccionado = opciones.find((item) => item.equipo_nombre === value);
  const termino = normalizarBusquedaEquipo(busqueda);
  const visibles = opciones.filter((item) => (
    !termino
    || normalizarBusquedaEquipo(`${item.equipo_nombre} ${item.categoria}`).includes(termino)
  ));

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrarAlPresionarFuera = (event) => {
      if (!contenedorRef.current?.contains(event.target)) setAbierto(false);
    };
    const cerrarConEscape = (event) => {
      if (event.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", cerrarAlPresionarFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarAlPresionarFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div className={`config-equipment-select ${abierto ? "open" : ""}`} ref={contenedorRef}>
      <button
        type="button"
        className="config-equipment-select-trigger"
        onClick={() => {
          setBusqueda("");
          setAbierto((actual) => !actual);
        }}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <span><i className="fas fa-cubes" /></span>
        <span>
          <strong>{value || "Sin tipo asociado"}</strong>
          <small>{seleccionado?.categoria || "Catalogo de armado"}</small>
        </span>
        <i className={`fas fa-chevron-${abierto ? "up" : "down"}`} />
      </button>
      {abierto && (
        <div className="config-equipment-select-menu">
          <div className="config-equipment-search">
            <i className="fas fa-search" />
            <input autoFocus value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar equipo..." />
          </div>
          <div className="config-equipment-options" role="listbox" aria-label="Tipos de equipo del armado">
            <button type="button" className={!value ? "selected" : ""} onClick={() => { onChange(""); setAbierto(false); }}>
              <span><strong>Sin asociar</strong><small>Nodo solo visual</small></span>
              {!value && <i className="fas fa-check" />}
            </button>
            {visibles.map((item) => (
              <button
                type="button"
                role="option"
                aria-selected={item.equipo_nombre === value}
                className={item.equipo_nombre === value ? "selected" : ""}
                key={`${item.categoria}-${item.equipo_nombre}`}
                onClick={() => {
                  onChange(item.equipo_nombre);
                  setAbierto(false);
                }}
              >
                <span><strong>{item.equipo_nombre}</strong><small>{item.categoria || "Sin categoria"}</small></span>
                {item.equipo_nombre === value && <i className="fas fa-check" />}
              </button>
            ))}
            {!visibles.length && <p>No se encontraron equipos.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const colorConOpacidad = (color, opacidad) => {
  const valor = String(color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(valor)) return `rgba(14, 165, 233, ${opacidad})`;
  const numero = parseInt(valor, 16);
  return `rgba(${(numero >> 16) & 255}, ${(numero >> 8) & 255}, ${numero & 255}, ${opacidad})`;
};

const leerVistaGeneral = (valor) => {
  try {
    const contenido = typeof valor === "string" ? JSON.parse(valor || "{}") : valor || {};
    return Array.isArray(contenido.marcadores) ? contenido.marcadores : [];
  } catch {
    return [];
  }
};

const leerZonasVistaGeneral = (valor) => {
  try {
    const contenido = typeof valor === "string" ? JSON.parse(valor || "{}") : valor || {};
    return Array.isArray(contenido.zonas) ? contenido.zonas : [];
  } catch {
    return [];
  }
};

const leerDiagramaLogico = (valor) => {
  try {
    const contenido = typeof valor === "string" ? JSON.parse(valor || "{}") : valor || {};
    return {
      nodos: Array.isArray(contenido.nodos) ? contenido.nodos : [],
      conexiones: Array.isArray(contenido.conexiones) ? contenido.conexiones : [],
      grupos: Array.isArray(contenido.grupos) ? contenido.grupos : [],
    };
  } catch {
    return { nodos: [], conexiones: [], grupos: [] };
  }
};

const resolverImagenUrl = (ruta) => {
  if (!ruta) return "";
  if (/^https?:\/\//i.test(ruta)) return ruta;
  const origenApi = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
  return `${origenApi}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
};

const formatearFecha = (valor) => {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
};

const obtenerAsignacion = (plantilla) => {
  if (plantilla.alcance === "centro") return plantilla.centro || "Centro sin identificar";
  if (plantilla.alcance === "cliente") return plantilla.cliente || "Cliente sin identificar";
  return "Plantilla general";
};

function Configuraciones() {
  const [plantillas, setPlantillas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [centros, setCentros] = useState([]);
  const [catalogoEquipos, setCatalogoEquipos] = useState([]);
  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const [vistaActiva, setVistaActiva] = useState("general");
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [modoNuevaPlantilla, setModoNuevaPlantilla] = useState("vacia");
  const [plantillaOrigenId, setPlantillaOrigenId] = useState("");
  const [formulario, setFormulario] = useState(FORM_INICIAL);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [imagenPreview, setImagenPreview] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [marcadores, setMarcadores] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [equiposCentro, setEquiposCentro] = useState([]);
  const [modoEditor, setModoEditor] = useState(false);
  const [colocandoMarcador, setColocandoMarcador] = useState(false);
  const [colocandoZona, setColocandoZona] = useState(false);
  const [marcadorModalAbierto, setMarcadorModalAbierto] = useState(false);
  const [marcadorFormulario, setMarcadorFormulario] = useState(MARCADOR_INICIAL);
  const [zonaModalAbierto, setZonaModalAbierto] = useState(false);
  const [zonaFormulario, setZonaFormulario] = useState(ZONA_INICIAL);
  const [guardandoLienzo, setGuardandoLienzo] = useState(false);
  const [zoomLienzo, setZoomLienzo] = useState(1);
  const [dimensionesImagen, setDimensionesImagen] = useState(null);
  const [desplazandoLienzo, setDesplazandoLienzo] = useState(false);
  const [marcadorParaUbicarId, setMarcadorParaUbicarId] = useState("");
  const [marcadoresSeleccionados, setMarcadoresSeleccionados] = useState([]);
  const [rectanguloSeleccion, setRectanguloSeleccion] = useState(null);
  const [seleccionandoAreaImportacion, setSeleccionandoAreaImportacion] = useState(false);
  const [rectanguloImportacion, setRectanguloImportacion] = useState(null);
  const [mostrarConexionesVista, setMostrarConexionesVista] = useState(false);
  const contenedorVistaGeneralRef = useRef(null);
  const desplazamientoLienzoRef = useRef(null);
  const seleccionLienzoRef = useRef(null);
  const arrastreMarcadoresRef = useRef(null);
  const arrastreZonaRef = useRef(null);
  const areaImportacionRef = useRef(null);
  const omitirClickLienzoRef = useRef(false);
  const [nodosLogicos, setNodosLogicos] = useState([]);
  const [conexionesLogicas, setConexionesLogicas] = useState([]);
  const [gruposLogicos, setGruposLogicos] = useState([]);
  const [modoEditorLogico, setModoEditorLogico] = useState(false);
  const [colocandoNodo, setColocandoNodo] = useState(false);
  const [colocandoGrupo, setColocandoGrupo] = useState(false);
  const [conectandoNodos, setConectandoNodos] = useState(false);
  const [nodoOrigenId, setNodoOrigenId] = useState("");
  const [nodoModalAbierto, setNodoModalAbierto] = useState(false);
  const [nodoFormulario, setNodoFormulario] = useState(NODO_INICIAL);
  const [grupoModalAbierto, setGrupoModalAbierto] = useState(false);
  const [grupoFormulario, setGrupoFormulario] = useState(GRUPO_LOGICO_INICIAL);
  const [guardandoLogico, setGuardandoLogico] = useState(false);
  const [zoomLogico, setZoomLogico] = useState(1);

  const seleccionada = useMemo(
    () => plantillas.find((item) => String(item.id) === String(seleccionadaId)) || plantillas[0] || null,
    [plantillas, seleccionadaId]
  );

  const conexionesVistaGeneral = useMemo(() => {
    const idsMarcadores = new Set(marcadores.map((item) => item.id));
    return conexionesLogicas
      .map((conexion) => ({
        ...conexion,
        id: `general-${conexion.id}`,
        origen: `logico-${conexion.origen}`.slice(0, 80),
        destino: `logico-${conexion.destino}`.slice(0, 80),
      }))
      .filter((conexion) => idsMarcadores.has(conexion.origen) && idsMarcadores.has(conexion.destino));
  }, [conexionesLogicas, marcadores]);

  const centrosFiltrados = useMemo(() => {
    if (!formulario.cliente_id) return [];
    return centros.filter((centro) => String(centro.cliente_id) === String(formulario.cliente_id));
  }, [centros, formulario.cliente_id]);

  const resumen = useMemo(() => ({
    total: plantillas.length,
    clientes: plantillas.filter((item) => item.alcance === "cliente").length,
    centros: plantillas.filter((item) => item.alcance === "centro").length,
  }), [plantillas]);

  const cargarDatos = async () => {
    setCargando(true);
    setError("");
    try {
      const [respuestaPlantillas, respuestaClientes, respuestaCentros, respuestaCatalogo] = await Promise.all([
        obtenerPlantillasDiagramas(),
        obtenerClientes(),
        obtenerCentros({ page: 1, per_page: 0 }),
        obtenerInventarioBodegaTipos().catch(() => []),
      ]);
      const listaPlantillas = respuestaPlantillas?.plantillas || [];
      setPlantillas(listaPlantillas);
      setClientes(Array.isArray(respuestaClientes) ? respuestaClientes : []);
      setCentros(respuestaCentros?.centros || []);
      setCatalogoEquipos(Array.isArray(respuestaCatalogo) ? respuestaCatalogo : []);
      setSeleccionadaId((actual) => {
        if (listaPlantillas.some((item) => String(item.id) === String(actual))) return actual;
        return listaPlantillas[0]?.id || null;
      });
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudieron cargar las plantillas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setDetalleVisible(false);
  }, [seleccionadaId]);

  useEffect(() => {
    if (!modoEditor) return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [modoEditor]);

  useEffect(() => {
    setMarcadores(leerVistaGeneral(seleccionada?.vista_general_json));
    setZonas(leerZonasVistaGeneral(seleccionada?.vista_general_json));
    setModoEditor(false);
    setColocandoMarcador(false);
    setColocandoZona(false);
    setMarcadorParaUbicarId("");
    setMarcadoresSeleccionados([]);
    setRectanguloSeleccion(null);
    setSeleccionandoAreaImportacion(false);
    setRectanguloImportacion(null);
    setMostrarConexionesVista(false);
    setZoomLienzo(1);
    setDimensionesImagen(null);
    const contenidoLogico = leerDiagramaLogico(seleccionada?.diagrama_logico_json);
    setNodosLogicos(contenidoLogico.nodos);
    setConexionesLogicas(contenidoLogico.conexiones);
    setGruposLogicos(contenidoLogico.grupos);
    setModoEditorLogico(false);
    setColocandoNodo(false);
    setColocandoGrupo(false);
    setConectandoNodos(false);
    setNodoOrigenId("");
    setZoomLogico(1);
    setMarcadorModalAbierto(false);
    setEquiposCentro([]);
    if (seleccionada?.centro_id) {
      obtenerEquipos(seleccionada.centro_id)
        .then((lista) => setEquiposCentro(Array.isArray(lista) ? lista : []))
        .catch(() => setEquiposCentro([]));
    }
  }, [seleccionada?.id, seleccionada?.imagen_general, seleccionada?.vista_general_json, seleccionada?.diagrama_logico_json, seleccionada?.centro_id]);

  const limpiarPreviewLocal = () => {
    if (imagenPreview.startsWith("blob:")) URL.revokeObjectURL(imagenPreview);
  };

  const abrirNueva = () => {
    limpiarPreviewLocal();
    setEditandoId(null);
    setModoNuevaPlantilla("vacia");
    setPlantillaOrigenId("");
    setFormulario(FORM_INICIAL);
    setImagenArchivo(null);
    setImagenPreview("");
    setModalAbierto(true);
  };

  const abrirEdicion = (plantilla) => {
    limpiarPreviewLocal();
    setEditandoId(plantilla.id);
    setModoNuevaPlantilla("vacia");
    setPlantillaOrigenId("");
    setFormulario({
      nombre: plantilla.nombre || "",
      descripcion: plantilla.descripcion || "",
      alcance: plantilla.alcance || "general",
      cliente_id: plantilla.cliente_id ? String(plantilla.cliente_id) : "",
      centro_id: plantilla.centro_id ? String(plantilla.centro_id) : "",
      estado: plantilla.estado || "activo",
    });
    setImagenArchivo(null);
    setImagenPreview(resolverImagenUrl(plantilla.imagen_general));
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    limpiarPreviewLocal();
    setModalAbierto(false);
    setImagenArchivo(null);
    setImagenPreview("");
  };

  const cambiarFormulario = (campo, valor) => {
    setFormulario((actual) => {
      const siguiente = { ...actual, [campo]: valor };
      if (campo === "alcance") {
        siguiente.cliente_id = "";
        siguiente.centro_id = "";
      }
      if (campo === "cliente_id") siguiente.centro_id = "";
      return siguiente;
    });
  };

  const seleccionarOrigenDuplicado = (plantillaId) => {
    const origen = plantillas.find((item) => String(item.id) === String(plantillaId));
    setPlantillaOrigenId(plantillaId ? String(plantillaId) : "");
    if (!origen) {
      setImagenPreview("");
      return;
    }
    setFormulario((actual) => ({
      ...actual,
      nombre: `${origen.nombre} - copia`,
      descripcion: origen.descripcion || "",
    }));
    setImagenPreview(resolverImagenUrl(origen.imagen_general));
  };

  const cambiarModoNuevaPlantilla = (modo) => {
    setModoNuevaPlantilla(modo);
    setImagenArchivo(null);
    if (modo === "duplicar") {
      seleccionarOrigenDuplicado(seleccionada?.id || plantillas[0]?.id || "");
    } else {
      setPlantillaOrigenId("");
      setFormulario(FORM_INICIAL);
      setImagenPreview("");
    }
  };

  const cambiarImagen = (event) => {
    const archivo = event.target.files?.[0] || null;
    limpiarPreviewLocal();
    setImagenArchivo(archivo);
    setImagenPreview(archivo ? URL.createObjectURL(archivo) : "");
  };

  const guardarPlantilla = async (event) => {
    event.preventDefault();
    if (!formulario.nombre.trim()) return;
    if (!editandoId && modoNuevaPlantilla === "duplicar" && !plantillaOrigenId) {
      alert("Selecciona la plantilla que deseas duplicar.");
      return;
    }
    setGuardando(true);
    try {
      let respuesta;
      if (!editandoId && modoNuevaPlantilla === "duplicar") {
        respuesta = await duplicarPlantillaDiagrama(plantillaOrigenId, formulario);
      } else {
        const data = new FormData();
        Object.entries(formulario).forEach(([clave, valor]) => data.append(clave, valor));
        if (imagenArchivo) data.append("imagen_general", imagenArchivo);
        respuesta = editandoId
          ? await actualizarPlantillaDiagrama(editandoId, data)
          : await crearPlantillaDiagrama(data);
      }
      const guardada = respuesta?.plantilla;
      await cargarDatos();
      if (guardada?.id) setSeleccionadaId(guardada.id);
      setVistaActiva("general");
      if (imagenPreview.startsWith("blob:")) URL.revokeObjectURL(imagenPreview);
      setModalAbierto(false);
      setImagenArchivo(null);
      setImagenPreview("");
    } catch (err) {
      alert(err?.response?.data?.error || "No se pudo guardar la plantilla.");
    } finally {
      setGuardando(false);
    }
  };

  const borrarPlantilla = async (plantilla) => {
    if (!window.confirm(`Eliminar la plantilla ${plantilla.nombre}?`)) return;
    try {
      await eliminarPlantillaDiagrama(plantilla.id);
      await cargarDatos();
    } catch (err) {
      alert(err?.response?.data?.error || "No se pudo eliminar la plantilla.");
    }
  };

  const abrirNuevoMarcador = (x, y) => {
    setMarcadorFormulario({
      ...MARCADOR_INICIAL,
      id: `marcador-${Date.now()}`,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
    });
    setMarcadorModalAbierto(true);
    setColocandoMarcador(false);
  };

  const abrirNuevaZona = (x, y) => {
    setZonaFormulario({
      ...ZONA_INICIAL,
      id: `zona-${Date.now()}`,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
    });
    setZonaModalAbierto(true);
    setColocandoZona(false);
  };

  const abrirEdicionMarcador = (marcador) => {
    setMarcadorFormulario({
      ...MARCADOR_INICIAL,
      ...marcador,
      equipo_id: marcador.equipo_id ? String(marcador.equipo_id) : "",
    });
    setMarcadorModalAbierto(true);
  };

  const manejarClickLienzo = (event) => {
    if (omitirClickLienzoRef.current) {
      omitirClickLienzoRef.current = false;
      return;
    }
    if (!modoEditor || (!colocandoMarcador && !colocandoZona && !marcadorParaUbicarId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const posicionX = Math.min(100, Math.max(0, x));
    const posicionY = Math.min(100, Math.max(0, y));
    if (marcadorParaUbicarId) {
      setMarcadores((actuales) => actuales.map((item) => (
        item.id === marcadorParaUbicarId
          ? { ...item, x: Number(posicionX.toFixed(3)), y: Number(posicionY.toFixed(3)) }
          : item
      )));
      setMarcadorParaUbicarId("");
    } else if (colocandoZona) abrirNuevaZona(posicionX, posicionY);
    else abrirNuevoMarcador(posicionX, posicionY);
  };

  const posicionRelativaLienzo = (event, lienzo) => {
    const rect = lienzo.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const iniciarSeleccionMarcadores = (event) => {
    if (!modoEditor || event.ctrlKey || event.button !== 0 || colocandoMarcador || colocandoZona || marcadorParaUbicarId || seleccionandoAreaImportacion) return;
    const posicion = posicionRelativaLienzo(event, event.currentTarget);
    seleccionLienzoRef.current = { pointerId: event.pointerId, inicio: posicion, actual: posicion };
    setRectanguloSeleccion({ x: posicion.x, y: posicion.y, ancho: 0, alto: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moverSeleccionMarcadores = (event) => {
    const seleccion = seleccionLienzoRef.current;
    if (!seleccion || seleccion.pointerId !== event.pointerId) return;
    const actual = posicionRelativaLienzo(event, event.currentTarget);
    seleccion.actual = actual;
    setRectanguloSeleccion({
      x: Math.min(seleccion.inicio.x, actual.x),
      y: Math.min(seleccion.inicio.y, actual.y),
      ancho: Math.abs(actual.x - seleccion.inicio.x),
      alto: Math.abs(actual.y - seleccion.inicio.y),
    });
  };

  const terminarSeleccionMarcadores = (event) => {
    const seleccion = seleccionLienzoRef.current;
    if (!seleccion || seleccion.pointerId !== event.pointerId) return;
    const izquierda = Math.min(seleccion.inicio.x, seleccion.actual.x);
    const derecha = Math.max(seleccion.inicio.x, seleccion.actual.x);
    const superior = Math.min(seleccion.inicio.y, seleccion.actual.y);
    const inferior = Math.max(seleccion.inicio.y, seleccion.actual.y);
    const esRectangulo = (derecha - izquierda) > 0.3 || (inferior - superior) > 0.3;
    setMarcadoresSeleccionados(esRectangulo
      ? marcadores.filter((item) => item.x >= izquierda && item.x <= derecha && item.y >= superior && item.y <= inferior).map((item) => item.id)
      : []);
    setRectanguloSeleccion(null);
    seleccionLienzoRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const iniciarArrastreMarcadores = (event, marcadorId) => {
    if (!modoEditor || marcadorParaUbicarId || seleccionandoAreaImportacion || event.button !== 0) return;
    const ids = marcadoresSeleccionados.includes(marcadorId) ? marcadoresSeleccionados : [marcadorId];
    setMarcadoresSeleccionados(ids);
    arrastreMarcadoresRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      posiciones: new Map(marcadores.filter((item) => ids.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }])),
    };
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moverMarcadoresSeleccionados = (event) => {
    const arrastre = arrastreMarcadoresRef.current;
    if (!arrastre || arrastre.pointerId !== event.pointerId || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    const diferenciaX = ((event.clientX - arrastre.x) / rect.width) * 100;
    const diferenciaY = ((event.clientY - arrastre.y) / rect.height) * 100;
    setMarcadores((actuales) => actuales.map((item) => {
      const original = arrastre.posiciones.get(item.id);
      if (!original) return item;
      return {
        ...item,
        x: Number(Math.min(100, Math.max(0, original.x + diferenciaX)).toFixed(3)),
        y: Number(Math.min(100, Math.max(0, original.y + diferenciaY)).toFixed(3)),
      };
    }));
  };

  const terminarArrastreMarcadores = (event) => {
    if (!arrastreMarcadoresRef.current || arrastreMarcadoresRef.current.pointerId !== event.pointerId) return;
    arrastreMarcadoresRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const guardarMarcador = (event) => {
    event.preventDefault();
    const nombre = marcadorFormulario.nombre.trim();
    if (!nombre) return;
    const marcador = {
      ...marcadorFormulario,
      nombre,
      equipo_id: marcadorFormulario.equipo_id ? Number(marcadorFormulario.equipo_id) : null,
    };
    setMarcadores((actuales) => {
      const existe = actuales.some((item) => item.id === marcador.id);
      return existe ? actuales.map((item) => item.id === marcador.id ? marcador : item) : [...actuales, marcador];
    });
    setMarcadorModalAbierto(false);
  };

  const abrirEdicionZona = (zona) => {
    setZonaFormulario({ ...ZONA_INICIAL, ...zona });
    setZonaModalAbierto(true);
  };

  const guardarZona = (event) => {
    event.preventDefault();
    const nombre = zonaFormulario.nombre.trim();
    if (!nombre) return;
    const zona = {
      ...zonaFormulario,
      nombre,
      opacidad: Number(zonaFormulario.opacidad),
      ancho: Number(zonaFormulario.ancho),
      alto: Number(zonaFormulario.alto),
    };
    setZonas((actuales) => {
      const existe = actuales.some((item) => item.id === zona.id);
      return existe ? actuales.map((item) => item.id === zona.id ? zona : item) : [...actuales, zona];
    });
    setZonaModalAbierto(false);
  };

  const obtenerGrupoContenedorNodo = (nodo) => gruposLogicos
    .filter((grupo) => (
      nodo.x >= grupo.x - (grupo.ancho / 2)
      && nodo.x <= grupo.x + (grupo.ancho / 2)
      && nodo.y >= grupo.y - (grupo.alto / 2)
      && nodo.y <= grupo.y + (grupo.alto / 2)
    ))
    .sort((grupoA, grupoB) => (grupoA.ancho * grupoA.alto) - (grupoB.ancho * grupoB.alto))[0];

  const obtenerZonaLogicaMarcador = (marcador) => {
    if (marcador.zona_id) return marcador.zona_id;
    if (!String(marcador.id).startsWith("logico-")) return "";
    const nodo = nodosLogicos.find((item) => `logico-${item.id}`.slice(0, 80) === marcador.id);
    const grupo = nodo ? obtenerGrupoContenedorNodo(nodo) : null;
    return grupo ? `logico-${grupo.id}`.slice(0, 80) : "";
  };

  const iniciarArrastreZona = (event, zona) => {
    if (!modoEditor || seleccionandoAreaImportacion || event.button !== 0) return;
    const izquierda = zona.x - (zona.ancho / 2);
    const derecha = zona.x + (zona.ancho / 2);
    const superior = zona.y - (zona.alto / 2);
    const inferior = zona.y + (zona.alto / 2);
    const zonaImportada = String(zona.id).startsWith("logico-");
    const equiposDentro = marcadores.filter((item) => (
      zonaImportada
        ? obtenerZonaLogicaMarcador(item) === zona.id
        : item.x >= izquierda && item.x <= derecha && item.y >= superior && item.y <= inferior
    ));
    arrastreZonaRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      zona: { id: zona.id, x: zona.x, y: zona.y, ancho: zona.ancho, alto: zona.alto },
      equipos: new Map(equiposDentro.map((item) => [item.id, { x: item.x, y: item.y }])),
    };
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moverZona = (event) => {
    const arrastre = arrastreZonaRef.current;
    if (!arrastre || arrastre.pointerId !== event.pointerId || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    const desplazamientoX = ((event.clientX - arrastre.x) / rect.width) * 100;
    const desplazamientoY = ((event.clientY - arrastre.y) / rect.height) * 100;
    const minimoX = (arrastre.zona.ancho / 2) - arrastre.zona.x;
    const maximoX = 100 - (arrastre.zona.ancho / 2) - arrastre.zona.x;
    const minimoY = (arrastre.zona.alto / 2) - arrastre.zona.y;
    const maximoY = 100 - (arrastre.zona.alto / 2) - arrastre.zona.y;
    const diferenciaX = Math.min(maximoX, Math.max(minimoX, desplazamientoX));
    const diferenciaY = Math.min(maximoY, Math.max(minimoY, desplazamientoY));

    setZonas((actuales) => actuales.map((item) => (
      item.id === arrastre.zona.id
        ? { ...item, x: Number((arrastre.zona.x + diferenciaX).toFixed(3)), y: Number((arrastre.zona.y + diferenciaY).toFixed(3)) }
        : item
    )));
    setMarcadores((actuales) => actuales.map((item) => {
      const original = arrastre.equipos.get(item.id);
      if (!original) return item;
      return {
        ...item,
        x: Number((original.x + diferenciaX).toFixed(3)),
        y: Number((original.y + diferenciaY).toFixed(3)),
      };
    }));
  };

  const terminarArrastreZona = (event) => {
    if (!arrastreZonaRef.current || arrastreZonaRef.current.pointerId !== event.pointerId) return;
    arrastreZonaRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const redimensionarZona = (event, zonaId) => {
    if (!modoEditor || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const lienzo = event.currentTarget.closest(".config-canvas.general");
    if (!lienzo) return;
    const rect = lienzo.getBoundingClientRect();
    const cursorX = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const cursorY = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));

    setZonas((actuales) => actuales.map((zona) => {
      if (zona.id !== zonaId) return zona;
      const izquierda = zona.x - (zona.ancho / 2);
      const superior = zona.y - (zona.alto / 2);
      const ancho = Math.min(100 - izquierda, Math.max(2, cursorX - izquierda));
      const alto = Math.min(100 - superior, Math.max(2, cursorY - superior));
      return {
        ...zona,
        x: Number((izquierda + (ancho / 2)).toFixed(3)),
        y: Number((superior + (alto / 2)).toFixed(3)),
        ancho: Number(ancho.toFixed(3)),
        alto: Number(alto.toFixed(3)),
      };
    }));
  };

  const iniciarDesplazamientoLienzo = (event) => {
    if (!event.ctrlKey || event.button !== 0 || zoomLienzo <= 1) return;
    const contenedor = event.currentTarget;
    desplazamientoLienzoRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: contenedor.scrollLeft,
      scrollTop: contenedor.scrollTop,
      movido: false,
    };
    contenedor.setPointerCapture(event.pointerId);
    setDesplazandoLienzo(true);
    event.preventDefault();
  };

  const moverDesplazamientoLienzo = (event) => {
    const inicio = desplazamientoLienzoRef.current;
    if (!inicio || inicio.pointerId !== event.pointerId) return;
    const diferenciaX = event.clientX - inicio.x;
    const diferenciaY = event.clientY - inicio.y;
    if (Math.abs(diferenciaX) > 3 || Math.abs(diferenciaY) > 3) inicio.movido = true;
    event.currentTarget.scrollLeft = inicio.scrollLeft - diferenciaX;
    event.currentTarget.scrollTop = inicio.scrollTop - diferenciaY;
    event.preventDefault();
  };

  const terminarDesplazamientoLienzo = (event) => {
    const inicio = desplazamientoLienzoRef.current;
    if (!inicio || inicio.pointerId !== event.pointerId) return;
    if (inicio.movido) {
      omitirClickLienzoRef.current = true;
      window.setTimeout(() => {
        omitirClickLienzoRef.current = false;
      }, 0);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    desplazamientoLienzoRef.current = null;
    setDesplazandoLienzo(false);
  };

  const importarDiagramaEnVistaGeneral = (zonaDestino) => {
    if (nodosLogicos.length === 0 && gruposLogicos.length === 0) {
      window.alert("El diagrama logico no tiene equipos ni zonas para importar.");
      return;
    }
    if (!zonaDestino) {
      window.alert("Dibuja primero el area del plano donde deseas importar el diagrama.");
      return;
    }

    const margen = 0.08;
    const escalaInterior = 1 - (margen * 2);
    const convertirX = (x) => (
      (zonaDestino.x - (zonaDestino.ancho / 2))
      + (zonaDestino.ancho * (margen + (escalaInterior * (Number(x) / 100))))
    );
    const convertirY = (y) => (
      (zonaDestino.y - (zonaDestino.alto / 2))
      + (zonaDestino.alto * (margen + (escalaInterior * (Number(y) / 100))))
    );

    const marcadoresImportados = nodosLogicos.map((nodo) => {
      const grupoContenedor = obtenerGrupoContenedorNodo(nodo);
      return {
        ...MARCADOR_INICIAL,
        id: `logico-${nodo.id}`.slice(0, 80),
        nombre: nodo.nombre,
        tipo: nodo.tipo,
        tipo_equipo: nodo.tipo_equipo || "",
        color: nodo.color || MARCADOR_INICIAL.color,
        equipo_id: nodo.equipo_id || null,
        zona_id: grupoContenedor ? `logico-${grupoContenedor.id}`.slice(0, 80) : "",
        descripcion: nodo.descripcion || "",
        x: Number(convertirX(nodo.x).toFixed(3)),
        y: Number(convertirY(nodo.y).toFixed(3)),
      };
    });
    const zonasImportadas = gruposLogicos.map((grupo) => ({
      ...ZONA_INICIAL,
      id: `logico-${grupo.id}`.slice(0, 80),
      nombre: grupo.nombre,
      color: grupo.color || ZONA_INICIAL.color,
      opacidad: grupo.opacidad ?? ZONA_INICIAL.opacidad,
      x: Number(convertirX(grupo.x).toFixed(3)),
      y: Number(convertirY(grupo.y).toFixed(3)),
      ancho: Number(Math.max(2, zonaDestino.ancho * escalaInterior * (grupo.ancho / 100)).toFixed(3)),
      alto: Number(Math.max(2, zonaDestino.alto * escalaInterior * (grupo.alto / 100)).toFixed(3)),
    }));

    setMarcadores((actuales) => {
      const importadosPorId = new Map(marcadoresImportados.map((item) => [item.id, item]));
      const actualizados = actuales.map((item) => {
        const importado = importadosPorId.get(item.id);
        if (!importado) return item;
        importadosPorId.delete(item.id);
        return importado;
      });
      return [...actualizados, ...importadosPorId.values()];
    });
    setZonas((actuales) => {
      const importadasPorId = new Map(zonasImportadas.map((item) => [item.id, item]));
      const actualizadas = actuales.map((item) => {
        const importada = importadasPorId.get(item.id);
        if (!importada) return item;
        importadasPorId.delete(item.id);
        return importada;
      });
      return [...actualizadas, ...importadasPorId.values()];
    });
  };

  const iniciarModoAreaImportacion = () => {
    setSeleccionandoAreaImportacion((actual) => !actual);
    setRectanguloImportacion(null);
    areaImportacionRef.current = null;
    setColocandoMarcador(false);
    setColocandoZona(false);
    setMarcadorParaUbicarId("");
    setMarcadoresSeleccionados([]);
  };

  const iniciarAreaImportacion = (event) => {
    if (!seleccionandoAreaImportacion || event.button !== 2) return;
    const posicion = posicionRelativaLienzo(event, event.currentTarget);
    areaImportacionRef.current = { pointerId: event.pointerId, inicio: posicion, actual: posicion };
    setRectanguloImportacion({ x: posicion.x, y: posicion.y, ancho: 0, alto: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moverAreaImportacion = (event) => {
    const seleccion = areaImportacionRef.current;
    if (!seleccion || seleccion.pointerId !== event.pointerId) return;
    const actual = posicionRelativaLienzo(event, event.currentTarget);
    seleccion.actual = actual;
    setRectanguloImportacion({
      x: Math.min(seleccion.inicio.x, actual.x),
      y: Math.min(seleccion.inicio.y, actual.y),
      ancho: Math.abs(actual.x - seleccion.inicio.x),
      alto: Math.abs(actual.y - seleccion.inicio.y),
    });
    event.preventDefault();
  };

  const terminarAreaImportacion = (event) => {
    const seleccion = areaImportacionRef.current;
    if (!seleccion || seleccion.pointerId !== event.pointerId) return;
    const izquierda = Math.min(seleccion.inicio.x, seleccion.actual.x);
    const derecha = Math.max(seleccion.inicio.x, seleccion.actual.x);
    const superior = Math.min(seleccion.inicio.y, seleccion.actual.y);
    const inferior = Math.max(seleccion.inicio.y, seleccion.actual.y);
    const ancho = derecha - izquierda;
    const alto = inferior - superior;
    if (ancho >= 2 && alto >= 2) {
      importarDiagramaEnVistaGeneral({
        id: "area-importacion",
        nombre: "Area seleccionada",
        x: izquierda + (ancho / 2),
        y: superior + (alto / 2),
        ancho,
        alto,
      });
      setSeleccionandoAreaImportacion(false);
    } else {
      window.alert("Dibuja un rectangulo mas amplio para importar el diagrama.");
    }
    setRectanguloImportacion(null);
    areaImportacionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.preventDefault();
  };

  const enfocarZonaVistaGeneral = (zona) => {
    const contenedor = contenedorVistaGeneralRef.current;
    if (!contenedor) return;
    const zoomZona = Math.min(5, Math.max(2.5, 70 / Math.max(Number(zona.ancho) || 20, 10)));
    setZoomLienzo(Number(zoomZona.toFixed(2)));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const lienzo = contenedor.querySelector(".config-canvas.general");
        if (!lienzo) return;
        contenedor.scrollTo({
          left: (lienzo.offsetWidth * (Number(zona.x) / 100)) - (contenedor.clientWidth / 2),
          top: (lienzo.offsetHeight * (Number(zona.y) / 100)) - (contenedor.clientHeight / 2),
          behavior: "smooth",
        });
      });
    });
  };

  const restablecerZoomVistaGeneral = () => {
    setZoomLienzo(1);
    window.requestAnimationFrame(() => {
      contenedorVistaGeneralRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    });
  };

  const eliminarMarcador = (marcadorId) => {
    setMarcadores((actuales) => actuales.filter((item) => item.id !== marcadorId));
  };

  const eliminarZona = (zonaId) => {
    setZonas((actuales) => actuales.filter((item) => item.id !== zonaId));
  };

  const cancelarEditor = () => {
    setMarcadores(leerVistaGeneral(seleccionada?.vista_general_json));
    setZonas(leerZonasVistaGeneral(seleccionada?.vista_general_json));
    setModoEditor(false);
    setColocandoMarcador(false);
    setColocandoZona(false);
    setMarcadorParaUbicarId("");
    setMarcadoresSeleccionados([]);
    setRectanguloSeleccion(null);
    setSeleccionandoAreaImportacion(false);
    setRectanguloImportacion(null);
    setMostrarConexionesVista(false);
  };

  const guardarVistaGeneral = async () => {
    if (!seleccionada) return;
    setGuardandoLienzo(true);
    try {
      const respuesta = await guardarContenidoPlantillaDiagrama(seleccionada.id, {
        vista_general: {
          version: 1,
          marcadores: marcadores.map((item) => ({ ...item, zona_id: obtenerZonaLogicaMarcador(item) })),
          zonas,
        },
      });
      const actualizada = respuesta?.plantilla;
      if (actualizada) {
        setPlantillas((actuales) => actuales.map((item) => item.id === actualizada.id ? actualizada : item));
      }
      setModoEditor(false);
      setColocandoMarcador(false);
      setColocandoZona(false);
      setMarcadorParaUbicarId("");
      setMarcadoresSeleccionados([]);
      setRectanguloSeleccion(null);
      setSeleccionandoAreaImportacion(false);
      setRectanguloImportacion(null);
      setMostrarConexionesVista(false);
    } catch (err) {
      alert(err?.response?.data?.error || "No se pudo guardar la vista general.");
    } finally {
      setGuardandoLienzo(false);
    }
  };

  const cambiarEquipoMarcador = (equipoId) => {
    const equipo = equiposCentro.find((item) => String(item.id_equipo) === String(equipoId));
    setMarcadorFormulario((actual) => ({
      ...actual,
      equipo_id: equipoId,
      nombre: actual.nombre || equipo?.nombre || "",
      tipo_equipo: actual.tipo_equipo || equipo?.nombre || "",
    }));
  };

  const cambiarTipoEquipoMarcador = (tipoEquipo) => {
    setMarcadorFormulario((actual) => ({
      ...actual,
      tipo_equipo: tipoEquipo,
      nombre: actual.nombre || tipoEquipo,
    }));
  };

  const abrirNuevoNodo = (x, y) => {
    setNodoFormulario({
      ...NODO_INICIAL,
      id: `nodo-${Date.now()}`,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
    });
    setNodoModalAbierto(true);
    setColocandoNodo(false);
  };

  const abrirNuevoGrupo = (x, y) => {
    setGrupoFormulario({
      ...GRUPO_LOGICO_INICIAL,
      id: `grupo-${Date.now()}`,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
    });
    setGrupoModalAbierto(true);
    setColocandoGrupo(false);
  };

  const manejarClickLienzoLogico = (event) => {
    if (!modoEditorLogico || (!colocandoNodo && !colocandoGrupo)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    if (colocandoGrupo) abrirNuevoGrupo(x, y);
    else abrirNuevoNodo(x, y);
  };

  const moverNodoLogico = (event, nodoId) => {
    if (!modoEditorLogico || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    setNodosLogicos((actuales) => actuales.map((item) => (
      item.id === nodoId ? { ...item, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) } : item
    )));
  };

  const manejarNodoConexion = (nodoId) => {
    if (!modoEditorLogico || !conectandoNodos) return;
    if (!nodoOrigenId) {
      setNodoOrigenId(nodoId);
      return;
    }
    if (nodoOrigenId === nodoId) return;
    const duplicada = conexionesLogicas.some((item) => (
      (item.origen === nodoOrigenId && item.destino === nodoId)
      || (item.origen === nodoId && item.destino === nodoOrigenId)
    ));
    if (!duplicada) {
      setConexionesLogicas((actuales) => [...actuales, {
        id: `conexion-${Date.now()}`,
        origen: nodoOrigenId,
        destino: nodoId,
        color: "#38d2f2",
      }]);
    }
    setNodoOrigenId("");
  };

  const abrirEdicionNodo = (nodo) => {
    setNodoFormulario({ ...NODO_INICIAL, ...nodo, equipo_id: nodo.equipo_id ? String(nodo.equipo_id) : "" });
    setNodoModalAbierto(true);
  };

  const guardarNodo = (event) => {
    event.preventDefault();
    const nombre = nodoFormulario.nombre.trim();
    if (!nombre) return;
    const nodo = {
      ...nodoFormulario,
      nombre,
      equipo_id: nodoFormulario.equipo_id ? Number(nodoFormulario.equipo_id) : null,
    };
    setNodosLogicos((actuales) => {
      const existe = actuales.some((item) => item.id === nodo.id);
      return existe ? actuales.map((item) => item.id === nodo.id ? nodo : item) : [...actuales, nodo];
    });
    setNodoModalAbierto(false);
  };

  const abrirEdicionGrupo = (grupo) => {
    setGrupoFormulario({ ...GRUPO_LOGICO_INICIAL, ...grupo });
    setGrupoModalAbierto(true);
  };

  const guardarGrupo = (event) => {
    event.preventDefault();
    const nombre = grupoFormulario.nombre.trim();
    if (!nombre) return;
    const grupo = {
      ...grupoFormulario,
      nombre,
      ancho: Number(grupoFormulario.ancho),
      alto: Number(grupoFormulario.alto),
      opacidad: Number(grupoFormulario.opacidad),
    };
    setGruposLogicos((actuales) => {
      const existe = actuales.some((item) => item.id === grupo.id);
      return existe ? actuales.map((item) => item.id === grupo.id ? grupo : item) : [...actuales, grupo];
    });
    setGrupoModalAbierto(false);
  };

  const moverGrupoLogico = (event, grupoId) => {
    if (!modoEditorLogico || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    setGruposLogicos((actuales) => actuales.map((item) => (
      item.id === grupoId ? { ...item, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) } : item
    )));
  };

  const redimensionarGrupoLogico = (event, grupoId) => {
    if (!modoEditorLogico || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const lienzo = event.currentTarget.closest(".config-logical-canvas");
    if (!lienzo) return;
    const rect = lienzo.getBoundingClientRect();
    const cursorX = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const cursorY = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));

    setGruposLogicos((actuales) => actuales.map((grupo) => {
      if (grupo.id !== grupoId) return grupo;
      const izquierda = grupo.x - (grupo.ancho / 2);
      const superior = grupo.y - (grupo.alto / 2);
      const ancho = Math.min(100 - izquierda, Math.max(10, cursorX - izquierda));
      const alto = Math.min(100 - superior, Math.max(10, cursorY - superior));
      return {
        ...grupo,
        x: Number((izquierda + (ancho / 2)).toFixed(3)),
        y: Number((superior + (alto / 2)).toFixed(3)),
        ancho: Number(ancho.toFixed(3)),
        alto: Number(alto.toFixed(3)),
      };
    }));
  };

  const eliminarNodoLogico = (nodoId) => {
    setNodosLogicos((actuales) => actuales.filter((item) => item.id !== nodoId));
    setConexionesLogicas((actuales) => actuales.filter((item) => item.origen !== nodoId && item.destino !== nodoId));
    if (nodoOrigenId === nodoId) setNodoOrigenId("");
  };

  const eliminarGrupoLogico = (grupoId) => {
    setGruposLogicos((actuales) => actuales.filter((item) => item.id !== grupoId));
  };

  const cancelarEditorLogico = () => {
    const contenido = leerDiagramaLogico(seleccionada?.diagrama_logico_json);
    setNodosLogicos(contenido.nodos);
    setConexionesLogicas(contenido.conexiones);
    setGruposLogicos(contenido.grupos);
    setModoEditorLogico(false);
    setColocandoNodo(false);
    setColocandoGrupo(false);
    setConectandoNodos(false);
    setNodoOrigenId("");
  };

  const guardarDiagramaLogico = async () => {
    if (!seleccionada) return;
    setGuardandoLogico(true);
    try {
      const respuesta = await guardarContenidoPlantillaDiagrama(seleccionada.id, {
        diagrama_logico: { version: 1, nodos: nodosLogicos, conexiones: conexionesLogicas, grupos: gruposLogicos },
      });
      const actualizada = respuesta?.plantilla;
      if (actualizada) setPlantillas((actuales) => actuales.map((item) => item.id === actualizada.id ? actualizada : item));
      setModoEditorLogico(false);
      setColocandoNodo(false);
      setColocandoGrupo(false);
      setConectandoNodos(false);
      setNodoOrigenId("");
    } catch (err) {
      alert(err?.response?.data?.error || "No se pudo guardar el diagrama logico.");
    } finally {
      setGuardandoLogico(false);
    }
  };

  const cambiarEquipoNodo = (equipoId) => {
    const equipo = equiposCentro.find((item) => String(item.id_equipo) === String(equipoId));
    setNodoFormulario((actual) => ({
      ...actual,
      equipo_id: equipoId,
      nombre: actual.nombre || equipo?.nombre || "",
      tipo_equipo: actual.tipo_equipo || equipo?.nombre || "",
    }));
  };

  const cambiarTipoEquipoNodo = (tipoEquipo) => {
    setNodoFormulario((actual) => ({
      ...actual,
      tipo_equipo: tipoEquipo,
      nombre: actual.nombre || tipoEquipo,
    }));
  };

  return (
    <div className="config-page">
      <section className="config-hero">
        <div>
          <span className="config-eyebrow">Configuracion</span>
          <h2>Plantillas de diagramas</h2>
          <p>Crea la vista general del ponton y su diagrama logico.</p>
        </div>
        <div className="config-hero-summary">
          <div><strong>{resumen.total}</strong><span>Plantillas</span></div>
          <div><strong>{resumen.clientes}</strong><span>Por cliente</span></div>
          <div><strong>{resumen.centros}</strong><span>Por centro</span></div>
        </div>
      </section>

      <section className="config-workspace">
        {error && <div className="config-alert"><i className="fas fa-exclamation-circle" /> {error}</div>}

        {cargando ? (
          <div className="config-loading"><i className="fas fa-spinner fa-spin" /> Cargando configuracion...</div>
        ) : plantillas.length === 0 ? (
          <div className="config-empty-state standalone">
            <div className="config-empty-icon"><i className="fas fa-drafting-compass" /></div>
            <h4>Aun no hay plantillas creadas</h4>
            <p>Crea la primera plantilla y carga la imagen base del ponton.</p>
            <button type="button" className="config-primary-button" onClick={abrirNueva}>
              <i className="fas fa-plus" /> Crear primera plantilla
            </button>
          </div>
        ) : (
          <div className={`config-manager-grid ${detalleVisible ? "detail-open" : "detail-hidden"}`}>
            <aside className="config-template-list">
              <div className="config-list-heading">
                <span>Plantillas registradas <strong>{plantillas.length}</strong></span>
                <button type="button" onClick={abrirNueva}><i className="fas fa-plus" /> Nueva</button>
              </div>
              {plantillas.map((plantilla) => (
                <button
                  type="button"
                  key={plantilla.id}
                  className={`config-template-item ${seleccionada?.id === plantilla.id ? "active" : ""}`}
                  onClick={() => {
                    setSeleccionadaId(plantilla.id);
                    setVistaActiva("general");
                    setDetalleVisible(false);
                  }}
                >
                  <span className="config-template-icon"><i className="fas fa-project-diagram" /></span>
                  <span className="config-template-copy">
                    <strong>{plantilla.nombre}</strong>
                    <small>{obtenerAsignacion(plantilla)}</small>
                  </span>
                  <span className={`config-status-dot ${plantilla.estado}`} title={plantilla.estado} />
                </button>
              ))}
            </aside>

            {seleccionada && (
              <article className="config-template-detail">
                <div className="config-detail-heading">
                  <div>
                    <div className="config-detail-badges">
                      <span>{seleccionada.alcance}</span>
                      <span className={seleccionada.estado}>{seleccionada.estado}</span>
                    </div>
                    <h3>{seleccionada.nombre}</h3>
                    <p>{seleccionada.descripcion || "Sin descripcion."}</p>
                    <small>Asignada a {obtenerAsignacion(seleccionada)} - Actualizada {formatearFecha(seleccionada.updated_at)}</small>
                  </div>
                  <div className="config-detail-actions">
                    <button
                      type="button"
                      className={detalleVisible ? "view active" : "view"}
                      onClick={() => setDetalleVisible((actual) => !actual)}
                      title={detalleVisible ? "Ocultar detalle" : "Ver detalle"}
                      aria-label={detalleVisible ? "Ocultar detalle de la plantilla" : "Ver detalle de la plantilla"}
                    >
                      <i className={`fas ${detalleVisible ? "fa-eye-slash" : "fa-eye"}`} />
                    </button>
                    <button type="button" onClick={() => abrirEdicion(seleccionada)} title="Editar plantilla"><i className="fas fa-pen" /></button>
                    <button type="button" className="danger" onClick={() => borrarPlantilla(seleccionada)} title="Eliminar plantilla"><i className="fas fa-trash" /></button>
                  </div>
                </div>

                {detalleVisible ? (
                  <>
                <div className="config-view-tabs" role="tablist">
                  <button type="button" className={vistaActiva === "general" ? "active" : ""} onClick={() => setVistaActiva("general")}>
                    <i className="fas fa-ship" /> Vista general del ponton
                  </button>
                  <button type="button" className={vistaActiva === "logico" ? "active" : ""} onClick={() => setVistaActiva("logico")}>
                    <i className="fas fa-project-diagram" /> Diagrama logico
                  </button>
                </div>

                {vistaActiva === "general" ? (
                  <div
                    className={`config-general-editor ${modoEditor ? "fullscreen-editor" : ""}`}
                    role={modoEditor ? "dialog" : undefined}
                    aria-modal={modoEditor ? "true" : undefined}
                    aria-label={modoEditor ? "Editor de vista general" : undefined}
                  >
                    <div className="config-editor-toolbar">
                      <div>
                        <strong>
                          {modoEditor ? "Editor de vista general - " : ""}
                          {marcadores.length} marcadores - {zonas.length} zonas
                          {marcadoresSeleccionados.length > 0 ? ` - ${marcadoresSeleccionados.length} seleccionados` : ""}
                        </strong>
                        <small>
                          {marcadorParaUbicarId
                            ? "Haz clic en el punto exacto donde se encuentra el equipo seleccionado."
                            : (modoEditor ? "Arrastra los elementos para ajustar su posicion." : "Elementos ubicados sobre la vista general.")}
                          {zoomLienzo > 1 ? " Usa Ctrl + arrastre para recorrer el plano." : ""}
                        </small>
                        {modoEditor && seleccionandoAreaImportacion && (
                          <span className="config-import-zone-status selected">
                            <i className="fas fa-vector-square" /> Mantén presionado el botón derecho y dibuja el área de importación sobre el plano.
                          </span>
                        )}
                      </div>
                      <div className="config-editor-actions">
                        <span className="config-zoom-controls">
                          <button type="button" onClick={() => setZoomLienzo((actual) => Math.max(1, Number((actual - 0.25).toFixed(2))))} disabled={zoomLienzo <= 1} title="Alejar"><i className="fas fa-search-minus" /></button>
                          <small>{Math.round(zoomLienzo * 100)}%</small>
                          <button type="button" onClick={restablecerZoomVistaGeneral} disabled={zoomLienzo === 1} title="Restablecer zoom al 100%"><i className="fas fa-compress-arrows-alt" /></button>
                          <button type="button" onClick={() => setZoomLienzo((actual) => Math.min(5, Number((actual + 0.25).toFixed(2))))} disabled={zoomLienzo >= 5} title="Acercar"><i className="fas fa-search-plus" /></button>
                        </span>
                        {!modoEditor ? (
                          <button type="button" onClick={() => setModoEditor(true)} disabled={!seleccionada.imagen_general}>
                            <i className="fas fa-map-marker-alt" /> Editar vista
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={colocandoMarcador ? "active" : ""}
                              onClick={() => {
                                setColocandoMarcador((actual) => !actual);
                                setColocandoZona(false);
                                setMarcadorParaUbicarId("");
                              }}
                            >
                              <i className="fas fa-plus" /> {colocandoMarcador ? "Haz clic en el plano" : "Agregar marcador"}
                            </button>
                            <button
                              type="button"
                              className={colocandoZona ? "active" : ""}
                              onClick={() => {
                                setColocandoZona((actual) => !actual);
                                setColocandoMarcador(false);
                                setMarcadorParaUbicarId("");
                              }}
                            >
                              <i className="fas fa-vector-square" /> {colocandoZona ? "Haz clic en el plano" : "Agregar zona"}
                            </button>
                            <button
                              type="button"
                              className={seleccionandoAreaImportacion ? "active" : ""}
                              onClick={iniciarModoAreaImportacion}
                              disabled={nodosLogicos.length === 0 && gruposLogicos.length === 0}
                              title="Dibujar el área donde se importará el diagrama lógico"
                            >
                              <i className="fas fa-file-import" /> {seleccionandoAreaImportacion ? "Dibuja con botón derecho" : "Importar en área"}
                            </button>
                            {conexionesVistaGeneral.length > 0 && (
                              <button
                                type="button"
                                className={mostrarConexionesVista ? "active" : ""}
                                onClick={() => setMostrarConexionesVista((actual) => !actual)}
                                title={mostrarConexionesVista ? "Ocultar conexiones importadas" : "Mostrar conexiones importadas"}
                              >
                                <i className="fas fa-project-diagram" /> {mostrarConexionesVista ? "Ocultar conexiones" : "Ver conexiones"}
                              </button>
                            )}
                            <button type="button" className="secondary" onClick={cancelarEditor} disabled={guardandoLienzo}>Cancelar</button>
                            <button type="button" className="save" onClick={guardarVistaGeneral} disabled={guardandoLienzo}>
                              <i className={`fas ${guardandoLienzo ? "fa-spinner fa-spin" : "fa-save"}`} /> {guardandoLienzo ? "Guardando" : "Guardar"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      ref={contenedorVistaGeneralRef}
                      className={`config-canvas-scroll ${zoomLienzo > 1 ? "pan-enabled" : ""} ${desplazandoLienzo ? "panning" : ""}`}
                      onPointerDown={iniciarDesplazamientoLienzo}
                      onPointerMove={moverDesplazamientoLienzo}
                      onPointerUp={terminarDesplazamientoLienzo}
                      onPointerCancel={terminarDesplazamientoLienzo}
                    >
                      <div
                        className={`config-canvas general ${seleccionada.imagen_general ? "has-image" : ""} ${modoEditor ? "editing" : ""} ${colocandoMarcador || colocandoZona || marcadorParaUbicarId || seleccionandoAreaImportacion ? "placing" : ""}`}
                        style={seleccionada.imagen_general ? {
                          width: `${zoomLienzo * (modoEditor ? 100 : 55)}%`,
                          aspectRatio: dimensionesImagen ? `${dimensionesImagen.ancho} / ${dimensionesImagen.alto}` : "16 / 9",
                          margin: modoEditor ? "0" : "0 auto",
                        } : { width: `${zoomLienzo * (modoEditor ? 100 : 55)}%`, height: `${355 * zoomLienzo}px`, margin: modoEditor ? "0" : "0 auto" }}
                        onClick={manejarClickLienzo}
                        onContextMenu={(event) => {
                          if (seleccionandoAreaImportacion) event.preventDefault();
                        }}
                        onPointerDown={(event) => {
                          iniciarAreaImportacion(event);
                          iniciarSeleccionMarcadores(event);
                        }}
                        onPointerMove={(event) => {
                          moverAreaImportacion(event);
                          moverSeleccionMarcadores(event);
                        }}
                        onPointerUp={(event) => {
                          terminarAreaImportacion(event);
                          terminarSeleccionMarcadores(event);
                        }}
                        onPointerCancel={(event) => {
                          areaImportacionRef.current = null;
                          setRectanguloImportacion(null);
                          terminarSeleccionMarcadores(event);
                        }}
                      >
                      {seleccionada.imagen_general ? (
                        <img
                          src={resolverImagenUrl(seleccionada.imagen_general)}
                          alt={`Vista general de ${seleccionada.nombre}`}
                          draggable="false"
                          onLoad={(event) => {
                            const { naturalWidth, naturalHeight } = event.currentTarget;
                            if (naturalWidth && naturalHeight) setDimensionesImagen({ ancho: naturalWidth, alto: naturalHeight });
                          }}
                        />
                      ) : (
                        <div className="config-canvas-placeholder">
                          <i className="fas fa-ship" />
                          <strong>Vista general del ponton</strong>
                          <span>Edita la plantilla para cargar su imagen base.</span>
                        </div>
                      )}
                      {rectanguloSeleccion && (
                        <span
                          className="config-selection-rectangle"
                          style={{
                            left: `${rectanguloSeleccion.x}%`,
                            top: `${rectanguloSeleccion.y}%`,
                            width: `${rectanguloSeleccion.ancho}%`,
                            height: `${rectanguloSeleccion.alto}%`,
                          }}
                        />
                      )}
                      {rectanguloImportacion && (
                        <span
                          className="config-import-area-rectangle"
                          style={{
                            left: `${rectanguloImportacion.x}%`,
                            top: `${rectanguloImportacion.y}%`,
                            width: `${rectanguloImportacion.ancho}%`,
                            height: `${rectanguloImportacion.alto}%`,
                          }}
                        >
                          <strong>Importar aquí</strong>
                        </span>
                      )}
                      {mostrarConexionesVista && conexionesVistaGeneral.length > 0 && (
                        <svg className="config-connections-layer general-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                          {conexionesVistaGeneral.map((conexion) => {
                            const origen = marcadores.find((item) => item.id === conexion.origen);
                            const destino = marcadores.find((item) => item.id === conexion.destino);
                            if (!origen || !destino) return null;
                            const ruta = rutaCurvaConexion(origen, destino, conexion, conexionesVistaGeneral, marcadores);
                            return (
                              <g key={conexion.id}>
                                <path className="connection-underlay" d={ruta} vectorEffect="non-scaling-stroke" />
                                <path className="connection-line" d={ruta} stroke={conexion.color || "#38d2f2"} vectorEffect="non-scaling-stroke" />
                              </g>
                            );
                          })}
                        </svg>
                      )}
                      {zonas.map((zona) => (
                        <button
                          type="button"
                          key={zona.id}
                          className={`config-map-zone ${modoEditor ? "draggable" : ""}`}
                          style={{
                            left: `${zona.x}%`,
                            top: `${zona.y}%`,
                            width: `${zona.ancho}%`,
                            height: `${zona.alto}%`,
                            "--zone-color": zona.color,
                            "--zone-opacity": zona.opacidad,
                            backgroundColor: colorConOpacidad(zona.color, zona.opacidad),
                          }}
                          title={zona.nombre}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => {
                            if (event.ctrlKey && zoomLienzo > 1) return;
                            iniciarArrastreZona(event, zona);
                          }}
                          onPointerMove={moverZona}
                          onPointerUp={terminarArrastreZona}
                          onPointerCancel={terminarArrastreZona}
                        >
                          <span>{zona.nombre}</span>
                          {modoEditor && (
                            <span
                              className="config-map-zone-resize"
                              title="Arrastra para cambiar el tamano de la zona"
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                event.currentTarget.setPointerCapture(event.pointerId);
                              }}
                              onPointerMove={(event) => redimensionarZona(event, zona.id)}
                              onPointerUp={(event) => {
                                event.stopPropagation();
                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                  event.currentTarget.releasePointerCapture(event.pointerId);
                                }
                              }}
                              onPointerCancel={(event) => {
                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                  event.currentTarget.releasePointerCapture(event.pointerId);
                                }
                              }}
                            />
                          )}
                        </button>
                      ))}
                      {marcadores.map((marcador) => (
                        <button
                          type="button"
                          key={marcador.id}
                          className={`config-map-marker ${zoomLienzo < 2 ? "overview-dot" : ""} ${modoEditor ? "draggable" : ""} ${marcadoresSeleccionados.includes(marcador.id) ? "selected" : ""}`}
                          style={{ left: `${marcador.x}%`, top: `${marcador.y}%`, "--marker-color": marcador.color }}
                          title={marcador.nombre}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => {
                            if (event.ctrlKey && zoomLienzo > 1) return;
                            iniciarArrastreMarcadores(event, marcador.id);
                          }}
                          onPointerMove={moverMarcadoresSeleccionados}
                          onPointerUp={terminarArrastreMarcadores}
                          onPointerCancel={terminarArrastreMarcadores}
                        >
                          <i className={iconoMarcador(marcador.tipo)} />
                          <span>{marcador.nombre}</span>
                        </button>
                      ))}
                      </div>
                    </div>

                    {marcadores.length > 0 && (
                      <div className="config-marker-list">
                        {marcadores.map((marcador) => (
                          <div className="config-marker-row" key={`row-${marcador.id}`}>
                            <span className="config-marker-row-icon" style={{ "--marker-color": marcador.color }}><i className={iconoMarcador(marcador.tipo)} /></span>
                            <span>
                              <strong>{marcador.nombre}</strong>
                              <small>{marcador.tipo_equipo || "Sin equipo asociado"} · {TIPOS_MARCADOR.find((item) => item.value === marcador.tipo)?.label || "Otro"}</small>
                            </span>
                            {modoEditor && (
                              <div>
                                <button
                                  type="button"
                                  className={marcadorParaUbicarId === marcador.id ? "active" : ""}
                                  onClick={() => {
                                    setMarcadorParaUbicarId(marcador.id);
                                    setColocandoMarcador(false);
                                    setColocandoZona(false);
                                  }}
                                  title="Ubicar equipo en el plano"
                                ><i className="fas fa-crosshairs" /></button>
                                <button type="button" onClick={() => abrirEdicionMarcador(marcador)} title="Editar marcador"><i className="fas fa-pen" /></button>
                                <button type="button" className="danger" onClick={() => eliminarMarcador(marcador.id)} title="Eliminar marcador"><i className="fas fa-trash" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {zonas.length > 0 && (
                      <div className="config-zone-list">
                        {zonas.map((zona) => (
                          <div className="config-marker-row" key={`zone-row-${zona.id}`}>
                            <span className="config-marker-row-icon zone" style={{ "--marker-color": zona.color }}><i className="fas fa-vector-square" /></span>
                            <span><strong>{zona.nombre}</strong><small>Zona {Math.round(zona.ancho)}% x {Math.round(zona.alto)}%</small></span>
                            <div>
                              <button
                                type="button"
                                onClick={() => enfocarZonaVistaGeneral(zona)}
                                title="Ampliar y centrar zona"
                              ><i className="fas fa-search-location" /></button>
                              {modoEditor && (
                                <>
                                <button type="button" onClick={() => abrirEdicionZona(zona)} title="Editar zona"><i className="fas fa-pen" /></button>
                                <button type="button" className="danger" onClick={() => eliminarZona(zona.id)} title="Eliminar zona"><i className="fas fa-trash" /></button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="config-logical-editor">
                    <div className="config-editor-toolbar">
                      <div>
                        <strong>{nodosLogicos.length} nodos - {conexionesLogicas.length} conexiones - {gruposLogicos.length} grupos</strong>
                        <small>{conectandoNodos ? (nodoOrigenId ? "Selecciona el nodo de destino." : "Selecciona el nodo de origen.") : "Representa el recorrido de red y energia."}</small>
                      </div>
                      <div className="config-editor-actions">
                        <span className="config-zoom-controls">
                          <button type="button" onClick={() => setZoomLogico((actual) => Math.max(1, Number((actual - 0.25).toFixed(2))))} disabled={zoomLogico <= 1}><i className="fas fa-search-minus" /></button>
                          <small>{Math.round(zoomLogico * 100)}%</small>
                          <button type="button" onClick={() => setZoomLogico((actual) => Math.min(2, Number((actual + 0.25).toFixed(2))))} disabled={zoomLogico >= 2}><i className="fas fa-search-plus" /></button>
                        </span>
                        {!modoEditorLogico ? (
                          <button type="button" onClick={() => setModoEditorLogico(true)}><i className="fas fa-project-diagram" /> Editar diagrama</button>
                        ) : (
                          <>
                            <button type="button" className={colocandoNodo ? "active" : ""} onClick={() => {
                              setColocandoNodo((actual) => !actual);
                              setColocandoGrupo(false);
                              setConectandoNodos(false);
                              setNodoOrigenId("");
                            }}><i className="fas fa-plus" /> {colocandoNodo ? "Haz clic en el lienzo" : "Agregar nodo"}</button>
                            <button type="button" className={colocandoGrupo ? "active" : ""} onClick={() => {
                              setColocandoGrupo((actual) => !actual);
                              setColocandoNodo(false);
                              setConectandoNodos(false);
                              setNodoOrigenId("");
                            }}><i className="far fa-square" /> {colocandoGrupo ? "Haz clic en el lienzo" : "Agregar grupo"}</button>
                            <button type="button" className={conectandoNodos ? "active" : ""} onClick={() => {
                              setConectandoNodos((actual) => !actual);
                              setColocandoNodo(false);
                              setColocandoGrupo(false);
                              setNodoOrigenId("");
                            }}><i className="fas fa-link" /> Conectar</button>
                            <button type="button" className="secondary" onClick={cancelarEditorLogico} disabled={guardandoLogico}>Cancelar</button>
                            <button type="button" className="save" onClick={guardarDiagramaLogico} disabled={guardandoLogico}>
                              <i className={`fas ${guardandoLogico ? "fa-spinner fa-spin" : "fa-save"}`} /> {guardandoLogico ? "Guardando" : "Guardar"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="config-canvas-scroll logical-scroll">
                      <div
                        className={`config-logical-canvas ${modoEditorLogico ? "editing" : ""} ${colocandoNodo || colocandoGrupo ? "placing" : ""}`}
                        style={{ width: `${zoomLogico * 100}%`, height: `${420 * zoomLogico}px` }}
                        onClick={manejarClickLienzoLogico}
                      >
                        {gruposLogicos.map((grupo) => (
                          <button
                            type="button"
                            key={grupo.id}
                            className={`config-logical-group ${modoEditorLogico ? "draggable" : ""}`}
                            style={{
                              left: `${grupo.x}%`,
                              top: `${grupo.y}%`,
                              width: `${grupo.ancho}%`,
                              height: `${grupo.alto}%`,
                              "--group-color": grupo.color,
                              backgroundColor: colorConOpacidad(grupo.color, grupo.opacidad),
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => {
                              if (!modoEditorLogico) return;
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerMove={(event) => moverGrupoLogico(event, grupo.id)}
                            onPointerUp={(event) => {
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                            }}
                          >
                            <span className="config-logical-group-title">{grupo.nombre}</span>
                            {modoEditorLogico && (
                              <span
                                className="config-logical-group-resize"
                                title="Arrastra para cambiar el tamano"
                                onClick={(event) => event.stopPropagation()}
                                onPointerDown={(event) => {
                                  event.stopPropagation();
                                  event.currentTarget.setPointerCapture(event.pointerId);
                                }}
                                onPointerMove={(event) => redimensionarGrupoLogico(event, grupo.id)}
                                onPointerUp={(event) => {
                                  event.stopPropagation();
                                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                                }}
                              />
                            )}
                          </button>
                        ))}
                        <svg className="config-connections-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                          {conexionesLogicas.map((conexion) => {
                            const origen = nodosLogicos.find((item) => item.id === conexion.origen);
                            const destino = nodosLogicos.find((item) => item.id === conexion.destino);
                            if (!origen || !destino) return null;
                            const ruta = rutaCurvaConexion(origen, destino, conexion, conexionesLogicas, nodosLogicos);
                            return (
                              <g key={conexion.id}>
                                <path className="connection-underlay" d={ruta} vectorEffect="non-scaling-stroke" />
                                <path className="connection-line" d={ruta} stroke={conexion.color || "#38d2f2"} vectorEffect="non-scaling-stroke" />
                              </g>
                            );
                          })}
                        </svg>
                        {nodosLogicos.map((nodo) => (
                          <button
                            type="button"
                            key={nodo.id}
                            className={`config-logical-node ${modoEditorLogico ? "editable" : ""} ${nodoOrigenId === nodo.id ? "connection-origin" : ""}`}
                            style={{ left: `${nodo.x}%`, top: `${nodo.y}%`, "--node-color": nodo.color }}
                            onClick={(event) => {
                              event.stopPropagation();
                              manejarNodoConexion(nodo.id);
                            }}
                            onPointerDown={(event) => {
                              if (!modoEditorLogico || conectandoNodos) return;
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerMove={(event) => moverNodoLogico(event, nodo.id)}
                            onPointerUp={(event) => {
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                            }}
                          >
                            <i className={iconoMarcador(nodo.tipo)} />
                            <span>{nodo.nombre}</span>
                          </button>
                        ))}
                        {nodosLogicos.length === 0 && gruposLogicos.length === 0 && (
                          <div className="config-canvas-placeholder">
                            <i className="fas fa-project-diagram" />
                            <strong>Diagrama logico vacio</strong>
                            <span>Activa la edicion y agrega el primer nodo.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {nodosLogicos.length > 0 && (
                      <div className="config-marker-list logical-list">
                        {nodosLogicos.map((nodo) => (
                          <div className="config-marker-row" key={`logical-row-${nodo.id}`}>
                            <span className="config-marker-row-icon" style={{ "--marker-color": nodo.color }}><i className={iconoMarcador(nodo.tipo)} /></span>
                            <span>
                              <strong>{nodo.nombre}</strong>
                              <small>{nodo.tipo_equipo || "Sin equipo asociado"} · {TIPOS_MARCADOR.find((item) => item.value === nodo.tipo)?.label || "Otro"}</small>
                            </span>
                            {modoEditorLogico && (
                              <div>
                                <button type="button" onClick={() => abrirEdicionNodo(nodo)} title="Editar nodo"><i className="fas fa-pen" /></button>
                                <button type="button" className="danger" onClick={() => eliminarNodoLogico(nodo.id)} title="Eliminar nodo"><i className="fas fa-trash" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {gruposLogicos.length > 0 && (
                      <div className="config-zone-list logical-groups-list">
                        {gruposLogicos.map((grupo) => (
                          <div className="config-marker-row" key={`logical-group-row-${grupo.id}`}>
                            <span className="config-marker-row-icon zone" style={{ "--marker-color": grupo.color }}><i className="far fa-square" /></span>
                            <span><strong>{grupo.nombre}</strong><small>Contenedor {Math.round(grupo.ancho)}% x {Math.round(grupo.alto)}%</small></span>
                            {modoEditorLogico && (
                              <div>
                                <button type="button" onClick={() => abrirEdicionGrupo(grupo)} title="Editar grupo"><i className="fas fa-pen" /></button>
                                <button type="button" className="danger" onClick={() => eliminarGrupoLogico(grupo.id)} title="Eliminar grupo"><i className="fas fa-trash" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {modoEditorLogico && conexionesLogicas.length > 0 && (
                      <div className="config-connection-list">
                        {conexionesLogicas.map((conexion) => {
                          const origen = nodosLogicos.find((item) => item.id === conexion.origen);
                          const destino = nodosLogicos.find((item) => item.id === conexion.destino);
                          return (
                            <span key={`connection-row-${conexion.id}`}>
                              {origen?.nombre || "Nodo"} <i className="fas fa-long-arrow-alt-right" /> {destino?.nombre || "Nodo"}
                              <button type="button" onClick={() => setConexionesLogicas((actuales) => actuales.filter((item) => item.id !== conexion.id))} title="Eliminar conexion"><i className="fas fa-times" /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                  </>
                ) : null}
              </article>
            )}
          </div>
        )}
      </section>

      {modalAbierto && (
        <div className="config-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && cerrarModal()}>
          <div className="config-modal" role="dialog" aria-modal="true" aria-labelledby="config-modal-title">
            <form onSubmit={guardarPlantilla}>
              <div className="config-modal-header">
                <div>
                  <span className="config-section-label">Plantilla operativa</span>
                  <h3 id="config-modal-title">{editandoId ? "Editar plantilla" : "Nueva plantilla"}</h3>
                </div>
                <button type="button" onClick={cerrarModal} aria-label="Cerrar"><i className="fas fa-times" /></button>
              </div>

              <div className="config-modal-body">
                {!editandoId && (
                  <div className="config-create-mode">
                    <span className="config-create-mode-label">Como deseas comenzar?</span>
                    <div className="config-create-mode-options">
                      <button type="button" className={modoNuevaPlantilla === "vacia" ? "active" : ""} onClick={() => cambiarModoNuevaPlantilla("vacia")}>
                        <i className="far fa-file" />
                        <span><strong>Plantilla vacia</strong><small>Comenzar un diagrama desde cero.</small></span>
                      </button>
                      <button type="button" className={modoNuevaPlantilla === "duplicar" ? "active" : ""} onClick={() => cambiarModoNuevaPlantilla("duplicar")} disabled={!plantillas.length}>
                        <i className="far fa-copy" />
                        <span><strong>Duplicar existente</strong><small>Reutilizar el diagrama sin equipos fisicos asociados.</small></span>
                      </button>
                    </div>
                    {modoNuevaPlantilla === "duplicar" && (
                      <div className="config-field config-duplicate-source">
                        <label>Plantilla de origen</label>
                        <select value={plantillaOrigenId} onChange={(event) => seleccionarOrigenDuplicado(event.target.value)} required>
                          <option value="">Seleccione una plantilla</option>
                          {plantillas.map((plantilla) => <option key={plantilla.id} value={plantilla.id}>{plantilla.nombre} · {obtenerAsignacion(plantilla)}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
                <div className="config-form-grid">
                  <div className="config-field full">
                    <label>Nombre de la plantilla</label>
                    <input value={formulario.nombre} onChange={(e) => cambiarFormulario("nombre", e.target.value)} maxLength="120" required placeholder="Ej: Ponton Aquachile estandar" />
                  </div>
                  <div className="config-field full">
                    <label>Descripcion</label>
                    <textarea value={formulario.descripcion} onChange={(e) => cambiarFormulario("descripcion", e.target.value)} rows="3" placeholder="Describe el sistema o sus particularidades." />
                  </div>
                  <div className="config-field">
                    <label>Asignacion</label>
                    <select value={formulario.alcance} onChange={(e) => cambiarFormulario("alcance", e.target.value)}>
                      <option value="general">Plantilla general</option>
                      <option value="cliente">Por cliente</option>
                      <option value="centro">Por centro</option>
                    </select>
                  </div>
                  <div className="config-field">
                    <label>Estado</label>
                    <select value={formulario.estado} onChange={(e) => cambiarFormulario("estado", e.target.value)}>
                      <option value="activo">Activa</option>
                      <option value="inactivo">Inactiva</option>
                    </select>
                  </div>
                  {formulario.alcance !== "general" && (
                    <div className="config-field">
                      <label>Cliente</label>
                      <select value={formulario.cliente_id} onChange={(e) => cambiarFormulario("cliente_id", e.target.value)} required>
                        <option value="">Seleccione un cliente</option>
                        {clientes.map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  {formulario.alcance === "centro" && (
                    <div className="config-field">
                      <label>Centro</label>
                      <select value={formulario.centro_id} onChange={(e) => cambiarFormulario("centro_id", e.target.value)} required disabled={!formulario.cliente_id}>
                        <option value="">Seleccione un centro</option>
                        {centrosFiltrados.map((centro) => <option key={centro.id} value={centro.id}>{centro.nombre}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="config-image-field">
                  <div>
                    <span>Vista general del ponton</span>
                    {modoNuevaPlantilla === "duplicar" && !editandoId ? (
                      <small>Se copiara la imagen de la plantilla seleccionada.</small>
                    ) : (
                      <>
                        <small>PNG, JPG o WEBP. Esta imagen sera el fondo para ubicar los equipos.</small>
                        <label className="config-upload-button">
                          <i className="fas fa-upload" /> {imagenPreview ? "Cambiar imagen" : "Seleccionar imagen"}
                          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={cambiarImagen} />
                        </label>
                      </>
                    )}
                  </div>
                  <div className="config-image-preview">
                    {imagenPreview ? <img src={imagenPreview} alt="Vista previa del ponton" /> : <i className="fas fa-ship" />}
                  </div>
                </div>
              </div>

              <div className="config-modal-footer">
                <button type="button" className="config-secondary-button" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
                <button type="submit" className="config-primary-button" disabled={guardando}>
                  {guardando
                    ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                    : <><i className={`fas ${!editandoId && modoNuevaPlantilla === "duplicar" ? "fa-copy" : "fa-save"}`} /> {!editandoId && modoNuevaPlantilla === "duplicar" ? "Duplicar plantilla" : "Guardar plantilla"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {marcadorModalAbierto && (
        <div className="config-modal-backdrop marker" role="presentation">
          <div className="config-modal config-marker-modal" role="dialog" aria-modal="true" aria-labelledby="marker-modal-title">
            <form onSubmit={guardarMarcador}>
              <div className="config-modal-header">
                <div>
                  <span className="config-section-label">Vista general</span>
                  <h3 id="marker-modal-title">Configurar marcador</h3>
                </div>
                <button type="button" onClick={() => setMarcadorModalAbierto(false)} aria-label="Cerrar"><i className="fas fa-times" /></button>
              </div>
              <div className="config-modal-body">
                <div className="config-form-grid">
                  <div className="config-field full">
                    <label>Nombre visible</label>
                    <input
                      value={marcadorFormulario.nombre}
                      onChange={(e) => setMarcadorFormulario((actual) => ({ ...actual, nombre: e.target.value }))}
                      maxLength="120"
                      required
                      placeholder="Ej: Camara laser"
                    />
                  </div>
                  <div className="config-field">
                    <label>Icono o categoria</label>
                    <SelectorIcono value={marcadorFormulario.tipo} onChange={(tipo) => setMarcadorFormulario((actual) => ({ ...actual, tipo }))} />
                  </div>
                  <div className="config-field">
                    <label>Color</label>
                    <div className="config-color-options">
                      {COLORES_MARCADOR.map((color) => (
                        <button
                          type="button"
                          key={color}
                          className={marcadorFormulario.color === color ? "active" : ""}
                          style={{ "--swatch-color": color }}
                          onClick={() => setMarcadorFormulario((actual) => ({ ...actual, color }))}
                          aria-label={`Seleccionar color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="config-field full">
                    <label>Tipo de equipo del armado</label>
                    <SelectorEquipoArmado value={marcadorFormulario.tipo_equipo || ""} opciones={catalogoEquipos} onChange={cambiarTipoEquipoMarcador} />
                  </div>
                  {seleccionada?.centro_id ? (
                    <div className="config-field full">
                      <label>Equipo real del centro</label>
                      <select value={marcadorFormulario.equipo_id} onChange={(e) => cambiarEquipoMarcador(e.target.value)}>
                        <option value="">Sin equipo asociado</option>
                        {equiposCentro.map((equipo) => (
                          <option key={equipo.id_equipo} value={equipo.id_equipo}>
                            {equipo.nombre}{equipo.numero_serie ? ` - ${equipo.numero_serie}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="config-marker-scope-note full">
                      <i className="fas fa-info-circle" /> La asociacion con un equipo real esta disponible en plantillas asignadas a un centro.
                    </div>
                  )}
                  <div className="config-field full">
                    <label>Descripcion</label>
                    <textarea
                      value={marcadorFormulario.descripcion}
                      onChange={(e) => setMarcadorFormulario((actual) => ({ ...actual, descripcion: e.target.value }))}
                      rows="3"
                      maxLength="500"
                      placeholder="Ubicacion o referencia tecnica opcional."
                    />
                  </div>
                </div>
              </div>
              <div className="config-modal-footer">
                <button type="button" className="config-secondary-button" onClick={() => setMarcadorModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="config-primary-button"><i className="fas fa-check" /> Aplicar marcador</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {zonaModalAbierto && (
        <div className="config-modal-backdrop marker" role="presentation">
          <div className="config-modal config-marker-modal" role="dialog" aria-modal="true" aria-labelledby="zone-modal-title">
            <form onSubmit={guardarZona}>
              <div className="config-modal-header">
                <div>
                  <span className="config-section-label">Vista general</span>
                  <h3 id="zone-modal-title">Configurar zona</h3>
                </div>
                <button type="button" onClick={() => setZonaModalAbierto(false)} aria-label="Cerrar"><i className="fas fa-times" /></button>
              </div>
              <div className="config-modal-body">
                <div className="config-form-grid">
                  <div className="config-field full">
                    <label>Nombre de la zona</label>
                    <input value={zonaFormulario.nombre} onChange={(e) => setZonaFormulario((actual) => ({ ...actual, nombre: e.target.value }))} required maxLength="120" placeholder="Ej: Rack principal" />
                  </div>
                  <div className="config-field full">
                    <label>Color</label>
                    <div className="config-color-options">
                      {COLORES_MARCADOR.map((color) => (
                        <button type="button" key={color} className={zonaFormulario.color === color ? "active" : ""} style={{ "--swatch-color": color }} onClick={() => setZonaFormulario((actual) => ({ ...actual, color }))} aria-label={`Seleccionar color ${color}`} />
                      ))}
                    </div>
                  </div>
                  <div className="config-field">
                    <label>Ancho: {zonaFormulario.ancho}%</label>
                    <input type="range" min="2" max="80" step="0.5" value={zonaFormulario.ancho} onChange={(e) => setZonaFormulario((actual) => ({ ...actual, ancho: Number(e.target.value) }))} />
                  </div>
                  <div className="config-field">
                    <label>Alto: {zonaFormulario.alto}%</label>
                    <input type="range" min="2" max="80" step="0.5" value={zonaFormulario.alto} onChange={(e) => setZonaFormulario((actual) => ({ ...actual, alto: Number(e.target.value) }))} />
                  </div>
                  <div className="config-field full">
                    <label>Transparencia: {Math.round((1 - zonaFormulario.opacidad) * 100)}%</label>
                    <input type="range" min="0" max="0.8" step="0.1" value={zonaFormulario.opacidad} onChange={(e) => setZonaFormulario((actual) => ({ ...actual, opacidad: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
              <div className="config-modal-footer">
                <button type="button" className="config-secondary-button" onClick={() => setZonaModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="config-primary-button"><i className="fas fa-check" /> Aplicar zona</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {nodoModalAbierto && (
        <div className="config-modal-backdrop marker" role="presentation">
          <div className="config-modal config-marker-modal" role="dialog" aria-modal="true" aria-labelledby="node-modal-title">
            <form onSubmit={guardarNodo}>
              <div className="config-modal-header">
                <div>
                  <span className="config-section-label">Diagrama logico</span>
                  <h3 id="node-modal-title">Configurar nodo</h3>
                </div>
                <button type="button" onClick={() => setNodoModalAbierto(false)} aria-label="Cerrar"><i className="fas fa-times" /></button>
              </div>
              <div className="config-modal-body">
                <div className="config-form-grid">
                  <div className="config-field full">
                    <label>Nombre visible</label>
                    <input value={nodoFormulario.nombre} onChange={(e) => setNodoFormulario((actual) => ({ ...actual, nombre: e.target.value }))} required maxLength="120" placeholder="Ej: Router Orca" />
                  </div>
                  <div className="config-field">
                    <label>Icono o categoria</label>
                    <SelectorIcono value={nodoFormulario.tipo} onChange={(tipo) => setNodoFormulario((actual) => ({ ...actual, tipo }))} />
                  </div>
                  <div className="config-field">
                    <label>Color</label>
                    <div className="config-color-options">
                      {COLORES_MARCADOR.map((color) => (
                        <button type="button" key={color} className={nodoFormulario.color === color ? "active" : ""} style={{ "--swatch-color": color }} onClick={() => setNodoFormulario((actual) => ({ ...actual, color }))} aria-label={`Seleccionar color ${color}`} />
                      ))}
                    </div>
                  </div>
                  <div className="config-field full">
                    <label>Tipo de equipo del armado</label>
                    <SelectorEquipoArmado value={nodoFormulario.tipo_equipo || ""} opciones={catalogoEquipos} onChange={cambiarTipoEquipoNodo} />
                  </div>
                  {seleccionada?.centro_id ? (
                    <div className="config-field full">
                      <label>Equipo real del centro</label>
                      <select value={nodoFormulario.equipo_id} onChange={(e) => cambiarEquipoNodo(e.target.value)}>
                        <option value="">Sin equipo asociado</option>
                        {equiposCentro.map((equipo) => <option key={equipo.id_equipo} value={equipo.id_equipo}>{equipo.nombre}{equipo.numero_serie ? ` - ${equipo.numero_serie}` : ""}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="config-marker-scope-note full"><i className="fas fa-info-circle" /> Los equipos reales se pueden asociar en plantillas asignadas a un centro.</div>
                  )}
                  <div className="config-field full">
                    <label>Descripcion</label>
                    <textarea value={nodoFormulario.descripcion} onChange={(e) => setNodoFormulario((actual) => ({ ...actual, descripcion: e.target.value }))} rows="3" maxLength="500" placeholder="Funcion o referencia tecnica opcional." />
                  </div>
                </div>
              </div>
              <div className="config-modal-footer">
                <button type="button" className="config-secondary-button" onClick={() => setNodoModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="config-primary-button"><i className="fas fa-check" /> Aplicar nodo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {grupoModalAbierto && (
        <div className="config-modal-backdrop marker" role="presentation">
          <div className="config-modal config-marker-modal" role="dialog" aria-modal="true" aria-labelledby="group-modal-title">
            <form onSubmit={guardarGrupo}>
              <div className="config-modal-header">
                <div>
                  <span className="config-section-label">Diagrama logico</span>
                  <h3 id="group-modal-title">Configurar grupo</h3>
                </div>
                <button type="button" onClick={() => setGrupoModalAbierto(false)} aria-label="Cerrar"><i className="fas fa-times" /></button>
              </div>
              <div className="config-modal-body">
                <div className="config-form-grid">
                  <div className="config-field full">
                    <label>Nombre del contenedor</label>
                    <input value={grupoFormulario.nombre} onChange={(e) => setGrupoFormulario((actual) => ({ ...actual, nombre: e.target.value }))} required maxLength="120" placeholder="Ej: Tablero de camaras" />
                  </div>
                  <div className="config-field full">
                    <label>Color</label>
                    <div className="config-color-options">
                      {COLORES_MARCADOR.map((color) => (
                        <button type="button" key={color} className={grupoFormulario.color === color ? "active" : ""} style={{ "--swatch-color": color }} onClick={() => setGrupoFormulario((actual) => ({ ...actual, color }))} aria-label={`Seleccionar color ${color}`} />
                      ))}
                    </div>
                  </div>
                  <div className="config-field full">
                    <label>Transparencia: {Math.round((1 - grupoFormulario.opacidad) * 100)}%</label>
                    <input type="range" min="0" max="0.6" step="0.05" value={grupoFormulario.opacidad} onChange={(e) => setGrupoFormulario((actual) => ({ ...actual, opacidad: Number(e.target.value) }))} />
                  </div>
                  <p className="config-group-size-help full"><i className="fas fa-expand-alt" /> El tamano se ajusta arrastrando la esquina inferior derecha del grupo en el diagrama.</p>
                </div>
              </div>
              <div className="config-modal-footer">
                <button type="button" className="config-secondary-button" onClick={() => setGrupoModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="config-primary-button"><i className="fas fa-check" /> Aplicar grupo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Configuraciones;
