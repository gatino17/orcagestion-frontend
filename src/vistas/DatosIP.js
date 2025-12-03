import React, { useEffect, useState } from "react";
import { cargarDetallesCentro } from "../controllers/centrosControllers";
import { obtenerClientes, obtenerCentrosPorCliente } from "../controllers/consultaCentroControllers";
import { agregarConexion, modificarConexion, borrarConexion } from "../controllers/conexionesControllers";
import { agregarEquipo, modificarEquipo, borrarEquipo } from "../controllers/equiposControllers";
import "./DatosIP.css";

const DatosIP = () => {
    const [centro, setCentro] = useState(null);
    const [equipos, setEquipos] = useState([]);
    const [conexiones, setConexiones] = useState([]);
    const [editMode, setEditMode] = useState(null); // Para determinar qué conexión o equipo se está editando
    const [showModal, setShowModal] = useState(false); // Controla la visibilidad del modal
    const [nuevaConexion, setNuevaConexion] = useState({ nombre: "", numero_conexion: "" }); // Estado para la nueva conexión
    const [nuevoEquipo, setNuevoEquipo] = useState({ nombre: "", ip: "", observacion: "", codigo: "", numero_serie: "", estado: "" }); // Estado para el nuevo equipo
    const [showEquipoModal, setShowEquipoModal] = useState(false); // Controla la visibilidad del modal de equipo
    const [clientes, setClientes] = useState([]);
    const [centros, setCentros] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState("");
    const [centroSeleccionado, setCentroSeleccionado] = useState("");
    const [error, setError] = useState(null);
    const [cargandoCentro, setCargandoCentro] = useState(false);

    const equiposDefinidos = [
        "IP PC", "Mascara", "Puerta de Enlace", "Netio", "Camara Laser Radar",
        "Camara Interior", "Camara Silo 1", "Camara Silo 2", "Axis", "Panel VRM",
        "Switch 1", "Switch 2", "Switch 3", "Panel Radar", "PC Mass", "Camara Laser"
    ];
    useEffect(() => {
        obtenerClientes(setClientes, setError);
    }, []);


    const ordenarCentros = (listaCentros = []) => {
        return [...listaCentros].sort((a, b) => {
            const estadoA = (a.estado || "").toLowerCase();
            const estadoB = (b.estado || "").toLowerCase();
            const esRetiroA = estadoA === "cese" || estadoA === "retiro";
            const esRetiroB = estadoB === "cese" || estadoB === "retiro";

            if (esRetiroA && !esRetiroB) return 1;
            if (!esRetiroA && esRetiroB) return -1;

            return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
        });
    };

    const handleClienteSelect = async (clienteId) => {
        setClienteSeleccionado(clienteId);
        setCentroSeleccionado("");
        setCentro(null);
        setEquipos([]);
        setConexiones([]);
        if (!clienteId) {
            setCentros([]);
            return;
        }
        await obtenerCentrosPorCliente(
            clienteId,
            (data) => setCentros(ordenarCentros(data)),
            setError
        );
    };

    const obtenerVisualConexion = (nombre = "") => {
      const normalized = nombre.toLowerCase();
      if (normalized.includes("team")) {
        return { label: "TeamViewer", icon: "fas fa-desktop", className: "conexion-pill--teamviewer" };
      }
      if (normalized.includes("any")) {
        return { label: "AnyDesk", icon: "fas fa-headset", className: "conexion-pill--anydesk" };
      }
      return { label: "Conexion", icon: "fas fa-plug", className: "conexion-pill--default" };
    };

    const obtenerIdCentro = (centroItem) =>
        centroItem?.id_centro ?? centroItem?.id ?? centroItem?.centro_id ?? centroItem?.idCentro;

    const buscarCentroEnCache = (centroId) =>
        centros.find((centroItem) => String(obtenerIdCentro(centroItem)) === String(centroId));

    const handleCentroSelect = (centroId) => {
        setCentroSeleccionado(centroId);
        if (centroId) {
            cargarCentroSeleccionado(centroId);
        } else {
            setCentro(null);
            setEquipos([]);
            setConexiones([]);
        }
    };
    const cargarCentroSeleccionado = async (centroIdParam) => {
      const targetId = centroIdParam || centroSeleccionado || centro?.id;
      if (!targetId) {
          alert("Selecciona un centro para consultar sus datos.");
          return;
      }
      const centroCache = buscarCentroEnCache(targetId);
      const nombreParaConsulta = centroCache?.nombre || centro?.nombre || targetId;
      try {
          setCargandoCentro(true);
          setError(null);
          const centroData = await cargarDetallesCentro(nombreParaConsulta);
          if (centroData && centroData.nombre) {
              setCentro({
                  id: centroData.id_centro,  // Incluye el `id` del centro en el objeto `centro`
                  nombre: centroData.nombre,
                  ponton: centroData.nombre_ponton,
                  cliente: centroData.cliente,
                  estado: centroData.estado
              });
              setEquipos(centroData.equipos || []);
              setConexiones(centroData.conexiones || []);
              setCentroSeleccionado(String(centroData.id_centro));
          } else {
              setCentro(null);
              setEquipos([]);
              setConexiones([]);
              alert("Centro no encontrado.");
          }
      } catch (error) {
          console.error("Error al buscar detalles del centro:", error);
          setError("No se pudo cargar la informacion del centro.");
      } finally {
          setCargandoCentro(false);
      }
  };


    const normalizarTexto = (texto = "") =>
        texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    const normalizarEstado = (estado = "") => {
        if (!estado) return "";
        const lower = normalizarTexto(estado);
        if (lower === "retiro") return "Retirado";
        return estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
    };

    const equiposCompletos = [
        ...equipos,
        ...equiposDefinidos
            .filter((nombreEquipo) => !equipos.some((equipo) => equipo.nombre === nombreEquipo))
            .map((nombreEquipo) => ({
                nombre: nombreEquipo,
                ip: "",
                observacion: "",
                codigo: "",
                numero_serie: "",
                estado: ""
            }))
    ];
    const estadoColors = {
        activo: "#16a34a",
        cese: "#f97316",
        traslado: "#0ea5e9",
        retiro: "#dc2626"
    };

    const seccionesInventario = [
        {
            title: "OFICINA (RACK)",
            keywords: ["pc", "monitor", "rack", "switch", "router", "patch", "teclado", "mouse", "nvr", "oficina"]
        },
        {
            title: "CÁMARA BULLET",
            keywords: ["camara interior", "camara bullet", "camara exterior", "camara silo", "camara laser", "camara mástil"]
        },
        {
            title: "TABLERO ALARMA",
            keywords: ["alarma", "sirena", "panel", "sensor"]
        },
        {
            title: "RESPALDO",
            keywords: ["respaldo", "bateria", "ups", "fuente", "rectificador"]
        },
        {
            title: "MÁSTIL",
            keywords: ["mastil", "derivacion", "tablero deriv", "poste"]
        },
        {
            title: "TABLERO CÁMARA",
            keywords: ["tablero camara", "camara rack", "camara tabla"]
        }
    ];

    const escapeHtml = (text = "") =>
        String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    const obtenerSeccionEquipo = (nombre = "") => {
        const normalized = normalizarTexto(nombre);
        const seccion = seccionesInventario.find((section) =>
            section.keywords.some((keyword) => normalized.includes(normalizarTexto(keyword)))
        );
        return seccion ? seccion.title : "OTROS EQUIPOS";
    };

    const formatearFecha = (fecha = new Date()) => {
        const date = fecha instanceof Date ? fecha : new Date(fecha);
        if (Number.isNaN(date.getTime())) return "";
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const handleEditarConexion = (id) => setEditMode({ tipo: "conexion", id });

   // Activa el modo de edición para un equipo específico
    const handleEditarEquipo = (id_equipo) => setEditMode({ tipo: "equipo", id: id_equipo });
   
    const handleGuardar = async (tipo, item) => {
        if (tipo === "conexion") {
            await modificarConexion(item.id, item.numero_conexion);
        } else {
            await modificarEquipo(item.id, item);
        }
        setEditMode(null);
        cargarCentroSeleccionado();
    };

    const handleEliminarConexion = async (id) => {
        await borrarConexion(id);
        cargarCentroSeleccionado();
    };

    const handleEliminarEquipo = async (id_equipo) => {
        await borrarEquipo(id_equipo);
        cargarCentroSeleccionado();
    };

    const handleCrearConexion = () => {
        if (!centro?.id) {
            alert("Selecciona un centro antes de crear una conexion.");
            return;
        }
        setNuevaConexion({ nombre: "", numero_conexion: "" });
        setShowModal(true);
    };

    const construirTablaInventario = () => {
        const equiposConSeccion = equiposCompletos.map((equipo) => ({
            ...equipo,
            section: obtenerSeccionEquipo(equipo.nombre || "")
        }));

        const ordenSecciones = [
            ...seccionesInventario.map((section) => section.title),
            "OTROS EQUIPOS"
        ];

        let contador = 1;
        const filas = [];

        ordenSecciones.forEach((titulo) => {
            const equiposSeccion = equiposConSeccion.filter((equipo) => equipo.section === titulo);
            if (!equiposSeccion.length) return;

            filas.push(
                `<tr class="section-row">
                    <td colspan="6">${titulo}</td>
                </tr>`
            );

            equiposSeccion.forEach((equipo) => {
            const descripcion = equipo.numero_serie || equipo.estado || "";
                filas.push(`
                <tr>
                        <td>${contador}</td>
                    <td>${escapeHtml(equipo.nombre || "-")}</td>
                    <td>${escapeHtml(descripcion)}</td>
                    <td>${escapeHtml(equipo.ip || "")}</td>
                    <td>${escapeHtml(equipo.codigo || "")}</td>
                    <td>${escapeHtml(equipo.observacion || "")}</td>
                </tr>
                `);
                contador += 1;
            });
        });

        return filas.join("");
    };

    const handleDescargarInventario = () => {
        if (!centro) {
            alert("Selecciona un centro para generar el inventario.");
            return;
        }

        const fechaActual = formatearFecha(new Date());
        const titulo = `INVENTARIO DE EQUIPOS - ${centro.nombre || ""}`;
        const tablaFilas = construirTablaInventario();

        const plantilla = `
        <html xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="UTF-8" />
                <style>
                    body { font-family: "Segoe UI", Arial, sans-serif; color:#0f172a; padding:24px; }
                    .title-table { width:100%; border-collapse:collapse; margin-bottom:12px; }
                    .title-table td { border:1px solid #0f2d57; }
                    .brand-cell { width:220px; background:#0f2d57; color:#fff; text-align:center; font-weight:700; letter-spacing:2px; padding:18px; }
                    .title-cell { background:#0f2d57; color:#fff; font-size:18px; font-weight:700; text-align:center; }
                    .meta-table { width:100%; border-collapse:collapse; margin-bottom:18px; }
                    .meta-table th, .meta-table td { border:1px solid #cbd5f5; padding:6px 10px; font-size:12px; }
                    .meta-table th { background:#e0e7ff; text-transform:uppercase; text-align:left; width:20%; }
                    .inventory-table { width:100%; border-collapse:collapse; }
                    .inventory-table th, .inventory-table td { border:1px solid #7aa8d6; padding:6px 8px; font-size:12px; }
                    .inventory-table thead th { background:#4f75b5; color:#fff; text-transform:uppercase; font-size:12px; }
                    .inventory-table th:first-child, .inventory-table td:first-child { width:32px; text-align:center; }
                    .inventory-table tbody tr:nth-child(even) { background:#f1f5fb; }
                    .section-row td { background:#0f2d57; color:#fff; font-weight:600; text-transform:uppercase; text-align:left; padding:8px 10px; }
                </style>
            </head>
            <body>
                <table class="title-table">
                    <tr>
                        <td class="brand-cell">ORCA TECNOLOGÍAS</td>
                        <td class="title-cell">${titulo}</td>
                    </tr>
                </table>
                <table class="meta-table">
                    <tr>
                        <th>Cliente</th>
                        <td>${escapeHtml(centro.cliente || "-")}</td>
                        <th>Centro</th>
                        <td>${escapeHtml(centro.nombre || "-")}</td>
                    </tr>
                    <tr>
                        <th>Ubicación</th>
                        <td>${escapeHtml(centro.ponton || "-")}</td>
                        <th>Estado</th>
                        <td>${escapeHtml(centro.estado || "-")}</td>
                    </tr>
                    <tr>
                        <th>Fecha emisión</th>
                        <td>${fechaActual}</td>
                        <th>Generado por</th>
                        <td>OrcaGest</td>
                    </tr>
                </table>
                <table class="inventory-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Equipos</th>
                            <th>Descripción</th>
                            <th>IP</th>
                            <th>Código</th>
                            <th>Observación</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tablaFilas}
                    </tbody>
                </table>
            </body>
        </html>
        `;

        const blob = new Blob([plantilla], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `inventario-equipos-${centro.nombre || "centro"}.xls`;
        enlace.click();
        URL.revokeObjectURL(url);
    };

    // Función para inicializar el proceso de creación de un nuevo equipo
    const handleCrearEquipo = () => {
      if (!centro?.id) {
          alert("Selecciona un centro antes de crear un equipo.");
          return;
      }
      setNuevoEquipo({ nombre: "", ip: "", observacion: "", codigo: "", numero_serie: "", estado: "" });
      setShowEquipoModal(true); // Muestra el modal
    };


    const handleGuardarNuevaConexion = async () => {
        if (!centro?.id) {
            alert("Selecciona un centro antes de guardar una conexion.");
            return;
        }
        const nuevaConexionData = {
            centro_id: centro.id,
            nombre: nuevaConexion.nombre,
            numero_conexion: nuevaConexion.numero_conexion
        };
        await agregarConexion(nuevaConexionData);
        setShowModal(false);
        cargarCentroSeleccionado();
    };

    // Guarda los cambios realizados en un equipo específico y desactiva el modo de edición
    const handleGuardarEquipo = async (equipo) => {
          try {
              // Si el equipo no tiene `id_equipo`, es un equipo predefinido que aún no se ha guardado en la base de datos
              if (!equipo.id_equipo) {
                  const nuevoEquipoData = {
                      centro_id: centro.id,
                      nombre: equipo.nombre,
                      ip: equipo.ip,
                      observacion: equipo.observacion,
                      codigo: equipo.codigo,
                      numero_serie: equipo.numero_serie,
                      estado: equipo.estado,
                  };
                  await agregarEquipo(nuevoEquipoData);
              } else {
                  await modificarEquipo(equipo.id_equipo, equipo);
              }
              setEditMode(null);  // Salir del modo edición
              cargarCentroSeleccionado();  // Refrescar la lista de equipos
          } catch (error) {
              console.error("Error al guardar los cambios del equipo:", error);
              alert("No se pudieron guardar los cambios. Intenta de nuevo.");
          }
      };
  

    //guarda un nuevo equipo
    // Función para guardar un nuevo equipo
    const handleGuardarNuevoEquipo = async () => {
        if (!centro?.id) {
            alert("No se ha seleccionado un centro.");
            return;
        }
    
        const nuevoEquipoData = {
            centro_id: centro.id,
            nombre: nuevoEquipo.nombre,
            ip: nuevoEquipo.ip,
            observacion: nuevoEquipo.observacion,
            codigo: nuevoEquipo.codigo,
            numero_serie: nuevoEquipo.numero_serie,
            estado: nuevoEquipo.estado
        };
    
        try {
          await agregarEquipo(nuevoEquipoData);
          setEquipos((prevEquipos) => [...prevEquipos, nuevoEquipoData]); // Agrega el nuevo equipo a la lista
          setShowEquipoModal(false); // Cierra el modal
          setNuevoEquipo({ nombre: "", ip: "", observacion: "", codigo: "", numero_serie: "", estado: "" });
          } catch (error) {
            console.error("Error al guardar el nuevo equipo:", error);
            alert("Error al guardar el equipo. Inténtalo nuevamente.");
        }
    };
    

  

    // Actualiza el estado del número de conexión en modo de edición
    const handleConexionInputChange = (index, value) => {
        const updatedConexiones = conexiones.map((conexion, i) => 
            i === index ? { ...conexion, numero_conexion: value } : conexion
        );
        setConexiones(updatedConexiones);
    };

    // Actualiza los valores del equipo en modo de edición sin afectar otros equipos
    const handleEquipoInputChange = (index, field, value) => {
      const updatedEquipos = equiposCompletos.map((equipo, i) =>
          i === index
              ? { ...equipo, [field]: value }
              : equipo
      );
      setEquipos(updatedEquipos);
  };
  
  

    return (
        <>
        <div className="datosip-page container-fluid">
            <div className="card datosip-card">
            <div className="card-header datosip-filters-header">
                <div className="filters-title">
                    <span className="datosip-icon datosip-icon--header">
                        <i className="fas fa-network-wired" />
                    </span>
                    <div>
                        <p className="filters-kicker">Panel de conectividad</p>
                        <h3 className="card-title mb-0">Gestion de IPs</h3>
                    </div>
                </div>
                <div className="row g-3 align-items-end mt-3">
                    <div className="col-md-5">
                        <label>Cliente</label>
                        <select className="form-control" value={clienteSeleccionado} onChange={(e) => handleClienteSelect(e.target.value)}>
                            <option value="">Seleccione un cliente</option>
                            {clientes.map((cliente) => (
                                <option key={cliente.id_cliente} value={cliente.id_cliente}>
                                    {cliente.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-5">
                        <label>Centro</label>
                        <select
                            className="form-control"
                            value={centroSeleccionado}
                            onChange={(e) => handleCentroSelect(e.target.value)}
                            disabled={!clienteSeleccionado || !centros.length}
                        >
                            <option value="">Seleccione un centro</option>
                            {centros.map((item) => {
                                const value = obtenerIdCentro(item);
                                const estadoCentro = normalizarEstado(item.estado);
                                const estadoLower = (item.estado || "").toLowerCase();
                                const color = estadoColors[estadoLower] || "#6b7280";
                                return (
                                    <option
                                        key={value}
                                        value={value}
                                        style={{ color }}
                                    >
                                        {estadoCentro ? `${item.nombre} - ${estadoCentro}` : item.nombre}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="col-md-2 d-flex">
                        <button
                            className="btn btn-primary w-100"
                            onClick={() => cargarCentroSeleccionado()}
                            disabled={!centroSeleccionado || cargandoCentro}
                        >
                            {cargandoCentro ? "Cargando..." : "Actualizar"}
                        </button>
                    </div>
                </div>
                {error && <p className="text-danger mt-2 mb-0">{error}</p>}
            </div>
            <div className="card-body">
                <div className="datosip-center-panel mb-4">
                    {centro ? (
                        <>
                            <div className="datosip-center-header">
                                <div>
                                    <span className="center-kicker">Centro seleccionado</span>
                                    <h4>{centro.nombre}</h4>
                                </div>
                                <span className={"badge " + (centro.estado === "Activo" ? "bg-success" : "bg-secondary")}>{centro.estado || "Sin estado"}</span>
                            </div>
                            <div className="datosip-center-grid">
                                <div className="center-grid-item">
                                    <span className="label">
                                        <i className="fas fa-user-tie" /> Cliente
                                    </span>
                                    <p>{centro.cliente || "Sin cliente"}</p>
                                </div>
                                <div className="center-grid-item">
                                    <span className="label">
                                        <i className="fas fa-water" /> Ponton
                                    </span>
                                    <p>{centro.ponton || "Sin ponton"}</p>
                                </div>
                                <div className="center-grid-item">
                                    <span className="label">
                                        <i className="fas fa-satellite" /> ID centro
                                    </span>
                                    <p>{centro.id || centro.id_centro}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="datosip-empty">
                            <span className="datosip-icon datosip-icon--muted">
                                <i className="fas fa-info-circle" />
                            </span>
                            <p>Selecciona un cliente y luego un centro para ver su informacion.</p>
                        </div>
                    )}
                </div>

                <div className="datosip-section">
                    <div className="datosip-section-header">
                        <div className="datosip-card-title">
                            <span className="datosip-icon datosip-icon--connections">
                                <i className="fas fa-plug" />
                            </span>
                            <div>
                                <h5>Conexiones remotas</h5>
                                <small>TeamViewer y AnyDesk</small>
                            </div>
                        </div>
                        <button className="btn btn-sm btn-outline-primary" onClick={handleCrearConexion} disabled={!centro}>
                            <i className="fas fa-plus" /> Nueva conexion
                        </button>
                    </div>
                    {!centro ? (
                        <p className="datosip-empty mb-0">Selecciona un centro para consultar sus conexiones.</p>
                    ) : conexiones.length ? (
                        <div className="table-responsive">
                            <table className="table table-bordered datosip-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Numero de conexion</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conexiones.map((conexion, index) => (
                                        <tr key={conexion.id}>
                                            <td className="conexion-name">
                                                {(() => {
                                                    const visual = obtenerVisualConexion(conexion.nombre);
                                                    return (
                                                        <>
                                                            <span className={`conexion-pill ${visual.className}`}>
                                                                <i className={visual.icon} /> {visual.label}
                                                            </span>
                                                            <div className="conexion-meta">{conexion.nombre}</div>
                                                        </>
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                {editMode?.tipo === "conexion" && editMode?.id === conexion.id ? (
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={conexion.numero_conexion}
                                                        onChange={(e) => handleConexionInputChange(index, e.target.value)}
                                                    />
                                                ) : (
                                                    conexion.numero_conexion
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {editMode?.tipo === "conexion" && editMode?.id === conexion.id ? (
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleGuardar("conexion", conexion)}>
                                                        Guardar
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-warning btn-sm" onClick={() => handleEditarConexion(conexion.id)}>
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                )}
                                                <button className="btn btn-danger btn-sm ml-2" onClick={() => handleEliminarConexion(conexion.id)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="datosip-empty mb-0">No existen conexiones registradas.</p>
                    )}
                </div>

                <div className="datosip-section mt-4">
                    <div className="datosip-section-header">
                        <div className="datosip-card-title">
                            <span className="datosip-icon datosip-icon--devices">
                                <i className="fas fa-server" />
                            </span>
                            <div>
                                <h5>Equipos asociados</h5>
                                <small>Control de IP y estado</small>
                            </div>
                        </div>
                        <div className="section-actions">
                            {centro && (
                                <span className="equipos-count badge bg-light text-dark">
                                    <i className="fas fa-layer-group" /> {equiposCompletos.length} equipos
                                </span>
                            )}
                            <button
                                className="btn btn-sm btn-success me-2"
                                onClick={handleDescargarInventario}
                                disabled={!centro}
                                title="Descargar inventario"
                            >
                                <i className="fas fa-file-excel" />
                            </button>
                            <button className="btn btn-sm btn-outline-primary" onClick={handleCrearEquipo} disabled={!centro}>
                                <i className="fas fa-plus" /> Nuevo equipo
                            </button>
                        </div>
                    </div>
                    {!centro ? (
                        <p className="datosip-empty mb-0">Selecciona un centro para consultar sus equipos.</p>
                    ) : equiposCompletos.length ? (
                        <div className="table-responsive">
                            <table className="table table-bordered datosip-table">
                                <thead>
                                    <tr>
                                        <th>Nombre del equipo</th>
                                        <th>IP</th>
                                        <th>Observacion</th>
                                        <th>Codigo</th>
                                        <th>Numero de serie</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {equiposCompletos.map((equipo, index) => (
                                        <tr key={equipo.id_equipo || equipo.nombre}>
                                            <td>{equipo.nombre}</td>
                                            <td>
                                                {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={equipo.ip}
                                                        onChange={(e) => handleEquipoInputChange(index, "ip", e.target.value)}
                                                    />
                                                ) : (
                                                    equipo.ip
                                                )}
                                            </td>
                                            <td>
                                                {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={equipo.observacion}
                                                        onChange={(e) => handleEquipoInputChange(index, "observacion", e.target.value)}
                                                    />
                                                ) : (
                                                    equipo.observacion
                                                )}
                                            </td>
                                            <td>
                                                {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={equipo.codigo}
                                                        onChange={(e) => handleEquipoInputChange(index, "codigo", e.target.value)}
                                                    />
                                                ) : (
                                                    equipo.codigo
                                                )}
                                            </td>
                                            <td>
                                                {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={equipo.numero_serie}
                                                        onChange={(e) => handleEquipoInputChange(index, "numero_serie", e.target.value)}
                                                    />
                                                ) : (
                                                    equipo.numero_serie
                                                )}
                                            </td>
                                            <td>
                                                {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={equipo.estado}
                                                        onChange={(e) => handleEquipoInputChange(index, "estado", e.target.value)}
                                                    />
                                                ) : (
                                                    equipo.estado
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {editMode?.tipo === "equipo" && editMode?.id === equipo.id_equipo ? (
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleGuardarEquipo(equipo)}>
                                                        Guardar
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-warning btn-sm" onClick={() => handleEditarEquipo(equipo.id_equipo)}>
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                )}
                                                <button className="btn btn-danger btn-sm ml-2" onClick={() => handleEliminarEquipo(equipo.id_equipo)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="datosip-empty mb-0">No hay equipos registrados todavia.</p>
                    )}
                </div>
            </div>
            </div>
        </div>

            {/* Modal para Crear Nueva Conexión */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Crear Nueva Conexión</h5>
                                <button type="button" className="close" onClick={() => setShowModal(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={nuevaConexion.nombre}
                                        onChange={(e) => setNuevaConexion({ ...nuevaConexion, nombre: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Número de Conexión</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={nuevaConexion.numero_conexion}
                                        onChange={(e) => setNuevaConexion({ ...nuevaConexion, numero_conexion: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleGuardarNuevaConexion}>
                                    Guardar Conexión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Crear Nuevo Equipo */}
            {showEquipoModal && (
                    <div className="modal show d-block" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Crear Nuevo Equipo</h5>
                                    <button type="button" className="close" onClick={() => setShowEquipoModal(false)}>
                                        <span>&times;</span>
                                    </button>
                                </div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.nombre}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>IP</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.ip}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, ip: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Observación</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.observacion}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, observacion: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Código</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.codigo}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, codigo: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Número de Serie</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.numero_serie}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, numero_serie: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Estado</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={nuevoEquipo.estado}
                                            onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, estado: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEquipoModal(false)}>
                                        Cancelar
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={handleGuardarNuevoEquipo}>
                                        Guardar Equipo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </>
    );
};

export default DatosIP;
