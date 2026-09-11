import React, { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import {
  cerrarInventarioBodegaToma,
  crearInventarioBodegaEquipos,
  crearInventarioBodegaToma,
  eliminarInventarioBodegaToma,
  eliminarInventarioBodegaEscaneo,
  obtenerInventarioBodegaToma,
  obtenerInventarioBodegaTomas,
  obtenerInventarioBodegaTipos,
  registrarInventarioBodegaEscaneo,
} from "../api";
import "./InventarioBodega.css";

const estadoLabel = {
  abierto: "Abierto",
  cerrado: "Cerrado",
};

const resultadoLabel = {
  encontrado: "Encontrado",
  no_esperado: "No esperado",
  duplicado: "Duplicado",
  no_corresponde: "No corresponde",
  manual: "Manual",
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizarBusqueda = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const resumenVacio = {
  total_esperado: 0,
  total_escaneos: 0,
  encontrados: 0,
  faltantes: 0,
  no_esperados: 0,
  duplicados: 0,
  manuales: 0,
  no_corresponden: 0,
  cumplimiento: 0,
  faltantes_detalle: [],
  no_esperados_detalle: [],
  duplicados_detalle: [],
};

const TOMAS_POR_PAGINA = 8;

export default function InventarioBodega() {
  const [tomas, setTomas] = useState([]);
  const [tomaActiva, setTomaActiva] = useState(null);
  const [tiposEquipo, setTiposEquipo] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Oficina");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanValor, setScanValor] = useState("");
  const [scanObs, setScanObs] = useState("");
  const [bodegaForm, setBodegaForm] = useState({ codigo: "", numero_serie: "", observacion: "" });
  const [busquedaEquipoBodega, setBusquedaEquipoBodega] = useState("");
  const [filtroTomas, setFiltroTomas] = useState("todos");
  const [paginaTomas, setPaginaTomas] = useState(1);
  const [filtroDetalle, setFiltroDetalle] = useState("");
  const [showNuevaTomaModal, setShowNuevaTomaModal] = useState(false);
  const [showAgregarBodegaModal, setShowAgregarBodegaModal] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    ubicacion: "Bodega central",
    observacion: "",
  });

  const esAdmin = useMemo(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return false;
      const decoded = jwtDecode(token);
      return String(decoded?.rol || decoded?.role || "").trim().toLowerCase() === "admin";
    } catch {
      return false;
    }
  }, []);

  const cargarTomas = async (seleccionarId = null) => {
    setLoading(true);
    try {
      const [data, tipos] = await Promise.all([
        obtenerInventarioBodegaTomas(
        filtroTomas === "todos" ? {} : { estado: filtroTomas }
        ),
        obtenerInventarioBodegaTipos().catch(() => []),
      ]);
      const lista = Array.isArray(data) ? data : [];
      setTiposEquipo(Array.isArray(tipos) ? tipos : []);
      setTomas(lista);
      const idObjetivo = seleccionarId || tomaActiva?.id_toma || lista[0]?.id_toma;
      if (idObjetivo) {
        await cargarDetalle(idObjetivo);
      } else {
        setTomaActiva(null);
      }
    } catch (error) {
      console.error("Error al cargar tomas de inventario:", error);
      alert(error?.response?.data?.error || "No se pudo cargar inventario bodega.");
    } finally {
      setLoading(false);
    }
  };

  const cargarDetalle = async (id) => {
    try {
      const data = await obtenerInventarioBodegaToma(
        id,
        tipoSeleccionado ? { tipo_equipo: tipoSeleccionado } : {}
      );
      setTomaActiva(data || null);
    } catch (error) {
      console.error("Error al cargar detalle de inventario:", error);
      alert(error?.response?.data?.error || "No se pudo cargar el detalle.");
    }
  };

  useEffect(() => {
    cargarTomas();
    setPaginaTomas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTomas]);

  useEffect(() => {
    if (tomaActiva?.id_toma) cargarDetalle(tomaActiva.id_toma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoSeleccionado]);

  const resumenGlobal = useMemo(() => {
    const abiertas = tomas.filter((item) => item.estado === "abierto").length;
    const cerradas = tomas.filter((item) => item.estado === "cerrado").length;
    const ultima = tomas[0] || null;
    return { abiertas, cerradas, ultima };
  }, [tomas]);

  const resumen = tomaActiva?.resumen || resumenVacio;
  const puedeEliminarEscaneos = tomaActiva?.estado === "abierto" || esAdmin;
  const totalPaginasTomas = Math.max(1, Math.ceil(tomas.length / TOMAS_POR_PAGINA));
  const tomasPaginadas = useMemo(() => {
    const paginaSegura = Math.min(Math.max(paginaTomas, 1), totalPaginasTomas);
    const inicio = (paginaSegura - 1) * TOMAS_POR_PAGINA;
    return tomas.slice(inicio, inicio + TOMAS_POR_PAGINA);
  }, [paginaTomas, tomas, totalPaginasTomas]);

  useEffect(() => {
    if (paginaTomas > totalPaginasTomas) setPaginaTomas(totalPaginasTomas);
  }, [paginaTomas, totalPaginasTomas]);

  const categoriasInventario = useMemo(() => {
    const out = [];
    tiposEquipo.forEach((tipo) => {
      const categoria = String(tipo.categoria || "Sin categoria").trim() || "Sin categoria";
      if (!out.includes(categoria)) out.push(categoria);
    });
    return out;
  }, [tiposEquipo]);
  const tiposCategoria = useMemo(
    () => tiposEquipo.filter((tipo) => String(tipo.categoria || "Sin categoria").trim() === categoriaSeleccionada),
    [categoriaSeleccionada, tiposEquipo]
  );
  const tiposBodegaVisibles = useMemo(() => {
    const q = normalizarBusqueda(busquedaEquipoBodega);
    if (!q) return tiposCategoria;
    return tiposEquipo.filter((tipo) => {
      const categoria = normalizarBusqueda(tipo.categoria || "Sin categoria");
      const equipo = normalizarBusqueda(tipo.equipo_nombre);
      return categoria.includes(q) || equipo.includes(q);
    });
  }, [busquedaEquipoBodega, tiposCategoria, tiposEquipo]);
  const equipoBodegaSelectValue = tipoSeleccionado
    ? `${categoriaSeleccionada}|||${tipoSeleccionado}`
    : "";

  useEffect(() => {
    if (!categoriasInventario.length) return;
    if (!categoriasInventario.includes(categoriaSeleccionada)) {
      setCategoriaSeleccionada(categoriasInventario[0]);
      setTipoSeleccionado("");
    }
  }, [categoriaSeleccionada, categoriasInventario]);

  useEffect(() => {
    if (!tipoSeleccionado) return;
    const existe = tiposCategoria.some(
      (tipo) => String(tipo.equipo_nombre || "").trim().toLowerCase() === tipoSeleccionado.trim().toLowerCase()
    );
    if (!existe) setTipoSeleccionado("");
  }, [tipoSeleccionado, tiposCategoria]);

  const escaneosFiltrados = useMemo(() => {
    const q = filtroDetalle.trim().toLowerCase();
    const rows = Array.isArray(tomaActiva?.escaneos) ? tomaActiva.escaneos : [];
    if (!q) return rows;
    return rows.filter((item) =>
      [
        item.codigo,
        item.numero_serie,
        item.equipo_nombre,
        item.ubicacion_sistema,
        item.estado_sistema,
        item.resultado,
        item.escaneado_por_nombre,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [filtroDetalle, tomaActiva]);

  const faltantesFiltrados = useMemo(() => {
    const q = filtroDetalle.trim().toLowerCase();
    const rows = Array.isArray(resumen.faltantes_detalle) ? resumen.faltantes_detalle : [];
    if (!q) return rows;
    return rows.filter((item) =>
      [item.codigo, item.numero_serie, item.equipo_nombre, item.ubicacion, item.estado_equipo]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [filtroDetalle, resumen]);

  const crearToma = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = await crearInventarioBodegaToma({
        nombre: form.nombre,
        ubicacion: form.ubicacion,
        observacion: form.observacion,
      });
      const nueva = data?.toma;
      setForm({ nombre: "", ubicacion: "Bodega central", observacion: "" });
      setShowNuevaTomaModal(false);
      await cargarTomas(nueva?.id_toma);
    } catch (error) {
      console.error("Error al crear toma:", error);
      alert(error?.response?.data?.error || "No se pudo crear la toma.");
    } finally {
      setSaving(false);
    }
  };

  const registrarEscaneo = async (event) => {
    event.preventDefault();
    if (!tomaActiva || tomaActiva.estado !== "abierto" || !scanValor.trim() || saving) return;
    if (!tipoSeleccionado) {
      alert("Selecciona primero categoria y equipo.");
      return;
    }
    setSaving(true);
    try {
      const data = await registrarInventarioBodegaEscaneo(tomaActiva.id_toma, {
        valor: scanValor.trim(),
        categoria: categoriaSeleccionada,
        tipo_equipo: tipoSeleccionado,
        observacion: scanObs,
      });
      setTomaActiva(data?.toma || null);
      setScanValor("");
      setScanObs("");
      await cargarTomas(data?.toma?.id_toma);
    } catch (error) {
      console.error("Error al registrar escaneo:", error);
      alert(error?.response?.data?.error || "No se pudo registrar el codigo.");
    } finally {
      setSaving(false);
    }
  };

  const cerrarToma = async () => {
    if (!tomaActiva || tomaActiva.estado !== "abierto") return;
    if (!window.confirm("Cerrar esta toma de inventario? Luego quedara solo como historial.")) return;
    setSaving(true);
    try {
      const data = await cerrarInventarioBodegaToma(tomaActiva.id_toma);
      setTomaActiva(data?.toma || null);
      await cargarTomas(data?.toma?.id_toma);
    } catch (error) {
      console.error("Error al cerrar toma:", error);
      alert(error?.response?.data?.error || "No se pudo cerrar la toma.");
    } finally {
      setSaving(false);
    }
  };

  const eliminarEscaneo = async (item) => {
    if (!item?.id_escaneo) return;
    const nombreEquipo = item.equipo_nombre || item.codigo || item.numero_serie || "este equipo";
    if (!window.confirm(`Eliminar ${nombreEquipo} del informe?`)) return;
    setSaving(true);
    try {
      await eliminarInventarioBodegaEscaneo(item.id_escaneo);
      await cargarTomas(tomaActiva?.id_toma);
    } catch (error) {
      console.error("Error al eliminar escaneo:", error);
      alert(error?.response?.data?.error || "No se pudo eliminar el escaneo.");
    } finally {
      setSaving(false);
    }
  };

  const eliminarToma = async (item) => {
    if (!item?.id_toma || !esAdmin) return;
    const totalEscaneos = Number(item?.resumen?.total_escaneos || 0);
    const mensaje = totalEscaneos
      ? `Eliminar el informe "${item.nombre}" y sus ${totalEscaneos} escaneo(s)? Esta accion no se puede deshacer.`
      : `Eliminar el informe "${item.nombre}"? Esta accion no se puede deshacer.`;
    if (!window.confirm(mensaje)) return;
    setSaving(true);
    try {
      await eliminarInventarioBodegaToma(item.id_toma);
      if (tomaActiva?.id_toma === item.id_toma) {
        setTomaActiva(null);
      }
      await cargarTomas(null);
    } catch (error) {
      console.error("Error al eliminar informe de inventario:", error);
      alert(error?.response?.data?.error || "No se pudo eliminar el informe.");
    } finally {
      setSaving(false);
    }
  };

  const agregarEquipoBodega = async () => {
    if (saving || !tipoSeleccionado || !bodegaForm.codigo.trim()) return;
    setSaving(true);
    try {
      await crearInventarioBodegaEquipos({
        items: [
          {
            codigo: bodegaForm.codigo.trim(),
            numero_serie: bodegaForm.numero_serie.trim() || bodegaForm.codigo.trim(),
            equipo_nombre: tipoSeleccionado,
            descripcion_producto: bodegaForm.observacion.trim() || undefined,
            ubicacion: "Bodega central",
            estado_equipo: "Operativo",
          },
        ],
	      });
	      setBodegaForm({ codigo: "", numero_serie: "", observacion: "" });
	      setShowAgregarBodegaModal(false);
	      alert("Equipo agregado a bodega central.");
    } catch (error) {
      console.error("Error al agregar equipo a bodega:", error);
      alert(error?.response?.data?.error || "No se pudo agregar el equipo a bodega.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid inventario-bodega-page">
      <div className="inventario-bodega-hero">
        <div>
          <span className="inventario-eyebrow">Control trimestral</span>
          <h2>Inventario Bodega</h2>
          <p>Registra tomas fisicas, conserva historial y compara contra el stock actual de bodega.</p>
        </div>
        <div className="inventario-hero-kpis">
          <div className="inventario-mini-kpi blue">
            <span>Abiertas</span>
            <strong>{resumenGlobal.abiertas}</strong>
          </div>
          <div className="inventario-mini-kpi green">
            <span>Cerradas</span>
            <strong>{resumenGlobal.cerradas}</strong>
          </div>
          <button className="btn btn-light inventario-refresh" onClick={() => cargarTomas()} disabled={loading}>
            <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="row">
	        <div className="col-xl-3 mb-3">
          <div className="card inventario-card inventario-actions-card">
            <div className="card-header bg-white">
              <strong>
                <i className="fas fa-boxes mr-2 text-primary" />
                Inventario bodega
              </strong>
            </div>
	            <div className="card-body">
	              <div className="inventario-action-item">
	                <div className="inventario-new-toma-icon">
	                  <i className="fas fa-clipboard-list" />
	                </div>
	                <div className="inventario-action-content">
	                  <div className="inventario-new-toma-title">Nuevo informe</div>
	                  <p className="inventario-new-toma-text">Escaneo por categoria.</p>
	                </div>
                <button
                  className="btn btn-primary inventario-action-btn"
                  onClick={() => setShowNuevaTomaModal(true)}
                >
                  <i className="fas fa-plus-circle mr-2" />
                  Crear
                </button>
              </div>
              <div className="inventario-action-divider" />
              <div className="inventario-action-item">
                <div className="inventario-new-toma-icon inventario-add-bodega-icon">
                  <i className="fas fa-warehouse" />
                </div>
	                <div className="inventario-action-content">
	                  <div className="inventario-new-toma-title">Ingreso a bodega</div>
	                  <p className="inventario-new-toma-text">Equipo disponible.</p>
	                </div>
                <button
                  className="btn btn-success inventario-action-btn"
                  onClick={() => setShowAgregarBodegaModal(true)}
                >
                  <i className="fas fa-plus mr-2" />
                  Agregar
                </button>
              </div>
            </div>
          </div>

	          <div className="card inventario-card mt-3">
            <div className="card-header bg-white d-flex align-items-center justify-content-between">
              <strong>
                <i className="fas fa-history mr-2 text-info" />
                Historico
              </strong>
              <select
                className="form-control form-control-sm"
                style={{ maxWidth: 120 }}
                value={filtroTomas}
                onChange={(e) => setFiltroTomas(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="abierto">Abiertos</option>
                <option value="cerrado">Cerrados</option>
              </select>
            </div>
            <div className="list-group list-group-flush inventario-tomas-list">
              {!tomas.length ? (
                <div className="p-3 text-muted small">Sin tomas registradas.</div>
              ) : (
	                tomasPaginadas.map((item) => (
	                  <div
                    key={item.id_toma}
                    className={`list-group-item inventario-toma-row ${tomaActiva?.id_toma === item.id_toma ? "active" : ""}`}
                  >
                    <button
                      type="button"
                      className="inventario-toma-main"
                      onClick={() => cargarDetalle(item.id_toma)}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <strong>{item.nombre}</strong>
                        <span className={`inventario-status ${item.estado}`}>{estadoLabel[item.estado] || item.estado}</span>
                      </div>
                      <div className="small mt-1">
                        {formatDateTime(item.fecha_inicio)} &middot; {item.resumen?.encontrados || 0}/{item.resumen?.total_esperado || 0}
                      </div>
                    </button>
                    {esAdmin ? (
                      <div className="inventario-toma-actions">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => eliminarToma(item)}
                          title="Eliminar informe"
                          disabled={saving}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    ) : null}
                  </div>
	                ))
	              )}
	            </div>
	            {tomas.length > TOMAS_POR_PAGINA ? (
	              <div className="inventario-history-pagination">
	                <button
	                  type="button"
	                  className="btn btn-light btn-sm"
	                  disabled={paginaTomas <= 1}
	                  onClick={() => setPaginaTomas((prev) => Math.max(1, prev - 1))}
	                >
	                  <i className="fas fa-chevron-left mr-1" />
	                  Anterior
	                </button>
	                <span>
	                  Pagina {Math.min(paginaTomas, totalPaginasTomas)} de {totalPaginasTomas}
	                </span>
	                <button
	                  type="button"
	                  className="btn btn-light btn-sm"
	                  disabled={paginaTomas >= totalPaginasTomas}
	                  onClick={() => setPaginaTomas((prev) => Math.min(totalPaginasTomas, prev + 1))}
	                >
	                  Siguiente
	                  <i className="fas fa-chevron-right ml-1" />
	                </button>
	              </div>
	            ) : null}
	          </div>
	        </div>

	        <div className="col-xl-9 mb-3">
          <div className="card inventario-card inventario-detail-card">
            <div className="card-header bg-white inventario-detail-header">
              <div className="inventario-detail-heading">
                <strong>
                  <i className="fas fa-clipboard-check mr-2 text-primary" />
                  {tomaActiva ? tomaActiva.nombre : "Detalle de inventario"}
                </strong>
                <div className="small text-muted">
                  {tomaActiva ? `${estadoLabel[tomaActiva.estado] || tomaActiva.estado} - ${formatDateTime(tomaActiva.fecha_inicio)}` : "Selecciona o crea un informe."}
                </div>
              </div>
              {tomaActiva?.estado === "abierto" ? (
                <button className="btn btn-outline-success btn-sm inventario-close-toma-btn" onClick={cerrarToma} disabled={saving}>
                  <i className="fas fa-lock mr-1" />
                  Cerrar toma
                </button>
              ) : null}
            </div>

            {!tomaActiva ? (
              <div className="card-body text-center text-muted py-5">No hay una toma seleccionada.</div>
            ) : (
              <div className="card-body inventario-detail-body">
                <div className="inventario-kpi-grid">
                  <div className="inventario-kpi blue">
                    <span>Esperados</span>
                    <strong>{resumen.total_esperado}</strong>
                  </div>
                  <div className="inventario-kpi green">
                    <span>Encontrados</span>
                    <strong>{resumen.encontrados}</strong>
                  </div>
                  <div className="inventario-kpi red">
                    <span>Faltantes</span>
                    <strong>{resumen.faltantes}</strong>
                  </div>
                  <div className="inventario-kpi amber">
                    <span>No esperados</span>
                    <strong>{resumen.no_esperados}</strong>
                  </div>
	                  <div className="inventario-kpi slate">
	                    <span>Duplicados</span>
	                    <strong>{resumen.duplicados}</strong>
	                  </div>
	                  <div className="inventario-kpi blue">
	                    <span>Manuales</span>
	                    <strong>{resumen.manuales || 0}</strong>
	                  </div>
	                  <div className="inventario-kpi red">
	                    <span>No corresponde</span>
	                    <strong>{resumen.no_corresponden || 0}</strong>
	                  </div>
	                </div>

                <div className="inventario-progress-block">
                  <div className="d-flex justify-content-between">
                    <strong>Cumplimiento fisico</strong>
                    <strong>{resumen.cumplimiento || 0}%</strong>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{ width: `${Math.min(100, Number(resumen.cumplimiento || 0))}%` }}
                    />
                  </div>
                </div>

                {tomaActiva.estado === "abierto" ? (
                  <form className="inventario-scan-box" onSubmit={registrarEscaneo}>
                    <div className="inventario-scan-grid">
                      <div className="inventario-scan-field">
                        <label>Categoria</label>
                        <select
                          className="form-control"
	                          value={categoriaSeleccionada}
	                          onChange={(e) => {
	                            setCategoriaSeleccionada(e.target.value);
	                            setTipoSeleccionado("");
	                          }}
	                        >
	                          {categoriasInventario.map((categoria) => (
	                            <option key={categoria} value={categoria}>{categoria}</option>
                          ))}
                        </select>
                      </div>
                      <div className="inventario-scan-field">
                        <label>Equipo</label>
                        <select
                          className="form-control"
	                          value={tipoSeleccionado}
	                          onChange={(e) => setTipoSeleccionado(e.target.value)}
	                        >
	                          <option value="">Seleccionar</option>
	                          {tiposCategoria.map((tipo) => (
	                            <option key={`${tipo.categoria}-${tipo.equipo_nombre}`} value={tipo.equipo_nombre}>
	                              {tipo.equipo_nombre}
	                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="inventario-scan-field inventario-scan-code">
                        <label>Codigo o numero de serie</label>
                        <input
                          className="form-control form-control-lg"
                          placeholder="Escanea o escribe el codigo"
                          value={scanValor}
                          onChange={(e) => setScanValor(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="inventario-scan-field">
                        <label>Observacion</label>
                        <input
                          className="form-control"
                          value={scanObs}
                          onChange={(e) => setScanObs(e.target.value)}
                        />
                      </div>
                      <div className="inventario-scan-action">
                        <button className="btn btn-primary btn-block inventario-scan-submit" disabled={saving || !scanValor.trim() || !tipoSeleccionado}>
                          {saving ? "..." : "Registrar"}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : null}

                <div className="d-flex justify-content-between align-items-center flex-wrap mt-3 mb-2">
                  <h5 className="mb-0">Comparativa</h5>
                  <input
                    className="form-control form-control-sm"
                    style={{ maxWidth: 320 }}
                    placeholder="Buscar en detalle"
                    value={filtroDetalle}
                    onChange={(e) => setFiltroDetalle(e.target.value)}
                  />
                </div>

                <div className="row">
                  <div className="col-lg-7 mb-3">
                    <div className="inventario-table-wrap">
                      <div className="inventario-table-title">Escaneados ({escaneosFiltrados.length})</div>
                      <table className="table table-sm inventario-table">
                        <thead>
                          <tr>
                            <th>Equipo</th>
                            <th>Codigo</th>
                            <th>Serie</th>
                            <th>Estado</th>
                            <th>Hora</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {!escaneosFiltrados.length ? (
                            <tr>
                              <td colSpan={6} className="text-center text-muted py-3">
                                Sin escaneos.
                              </td>
                            </tr>
                          ) : (
                            escaneosFiltrados.map((item) => (
                              <tr key={item.id_escaneo}>
                                <td>{item.equipo_nombre || "-"}</td>
                                <td>{item.codigo || "-"}</td>
                                <td>{item.numero_serie || "-"}</td>
                                <td>
                                  <span className={`inventario-result ${item.resultado}`}>
                                    {resultadoLabel[item.resultado] || item.resultado}
                                  </span>
                                </td>
                                <td>{formatDateTime(item.created_at)}</td>
                                <td className="text-right">
                                  {puedeEliminarEscaneos ? (
                                    <button
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={() => eliminarEscaneo(item)}
                                      title="Eliminar equipo del informe"
                                      disabled={saving}
                                    >
                                      <i className="fas fa-trash" />
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="col-lg-5 mb-3">
                    <div className="inventario-table-wrap">
                      <div className="inventario-table-title text-danger">Faltantes ({faltantesFiltrados.length})</div>
                      <table className="table table-sm inventario-table">
                        <thead>
                          <tr>
                            <th>Equipo</th>
                            <th>Codigo</th>
                            <th>Serie</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!faltantesFiltrados.length ? (
                            <tr>
                              <td colSpan={3} className="text-center text-muted py-3">
                                Sin faltantes para este filtro.
                              </td>
                            </tr>
                          ) : (
                            faltantesFiltrados.map((item) => (
                              <tr key={item.id_bodega_equipo}>
                                <td>{item.equipo_nombre || "-"}</td>
                                <td>{item.codigo || "-"}</td>
                                <td>{item.numero_serie || "-"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
	        </div>
	      </div>
	      {showNuevaTomaModal ? (
	        <div className="modal d-block inventario-modal-backdrop" tabIndex="-1" role="dialog">
	          <div className="modal-dialog modal-dialog-centered" role="document">
	            <div className="modal-content inventario-toma-modal">
	              <div className="modal-header">
	                <div>
	                  <span className="inventario-eyebrow inventario-modal-eyebrow">Inventario bodega</span>
	                  <h5 className="modal-title mb-0">Crear nuevo informe</h5>
	                </div>
	                <button
	                  type="button"
	                  className="close"
	                  onClick={() => setShowNuevaTomaModal(false)}
	                  disabled={saving}
	                >
	                  <span>&times;</span>
	                </button>
	              </div>
	              <div className="modal-body">
	                <div className="form-group">
	                  <label>Nombre</label>
	                  <input
	                    className="form-control"
	                    placeholder="Ej: Inventario bodega septiembre"
	                    value={form.nombre}
	                    onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
	                  />
	                </div>
	                <div className="form-group">
	                  <label>Ubicacion</label>
	                  <input
	                    className="form-control"
	                    value={form.ubicacion}
	                    onChange={(e) => setForm((prev) => ({ ...prev, ubicacion: e.target.value }))}
	                  />
	                </div>
	                <div className="form-group mb-0">
	                  <label>Observacion</label>
	                  <textarea
	                    className="form-control"
	                    rows={4}
	                    placeholder="Detalle opcional de la toma"
	                    value={form.observacion}
	                    onChange={(e) => setForm((prev) => ({ ...prev, observacion: e.target.value }))}
	                  />
	                </div>
	              </div>
	              <div className="modal-footer">
	                <button
	                  className="btn btn-light"
	                  onClick={() => setShowNuevaTomaModal(false)}
	                  disabled={saving}
	                >
	                  Cancelar
	                </button>
	                <button className="btn btn-primary" onClick={crearToma} disabled={saving}>
	                  <i className="fas fa-save mr-2" />
	                  {saving ? "Creando..." : "Crear informe"}
	                </button>
	              </div>
	            </div>
	          </div>
	        </div>
	      ) : null}
	      {showAgregarBodegaModal ? (
	        <div className="modal d-block inventario-modal-backdrop" tabIndex="-1" role="dialog">
	          <div className="modal-dialog modal-dialog-centered" role="document">
	            <div className="modal-content inventario-toma-modal">
	              <div className="modal-header">
	                <div>
	                  <span className="inventario-eyebrow inventario-modal-eyebrow">Bodega central</span>
	                  <h5 className="modal-title mb-0">Agregar equipo a bodega</h5>
	                </div>
	                <button
	                  type="button"
	                  className="close"
	                  onClick={() => setShowAgregarBodegaModal(false)}
	                  disabled={saving}
	                >
	                  <span>&times;</span>
	                </button>
		              </div>
		              <div className="modal-body">
		                <div className="form-group">
		                  <label>Buscar equipo</label>
		                  <div className="inventario-modal-search">
		                    <i className="fas fa-search" />
		                    <input
		                      className="form-control"
		                      placeholder="Ej: router, camara, tablero..."
		                      value={busquedaEquipoBodega}
		                      onChange={(e) => setBusquedaEquipoBodega(e.target.value)}
		                    />
		                    {busquedaEquipoBodega.trim() ? (
		                      <button
		                        type="button"
		                        className="inventario-modal-search-clear"
		                        onClick={() => setBusquedaEquipoBodega("")}
		                        title="Limpiar busqueda"
		                      >
		                        <i className="fas fa-times" />
		                      </button>
		                    ) : null}
		                  </div>
		                </div>
		                <div className="form-row">
		                  <div className="form-group col-md-6">
		                    <label>Categoria</label>
	                    <select
	                      className="form-control"
		                      value={categoriaSeleccionada}
		                      onChange={(e) => {
		                        setCategoriaSeleccionada(e.target.value);
		                        setTipoSeleccionado("");
		                        setBusquedaEquipoBodega("");
		                      }}
		                    >
	                      {categoriasInventario.map((categoria) => (
	                        <option key={categoria} value={categoria}>{categoria}</option>
	                      ))}
	                    </select>
	                  </div>
	                  <div className="form-group col-md-6">
	                    <label>Equipo</label>
		                    <select
		                      className="form-control"
		                      value={equipoBodegaSelectValue}
		                      onChange={(e) => {
		                        const [categoria, equipo] = String(e.target.value || "").split("|||");
		                        setCategoriaSeleccionada(categoria || categoriaSeleccionada);
		                        setTipoSeleccionado(equipo || "");
		                      }}
		                    >
		                      <option value="">Seleccionar</option>
		                      {tiposBodegaVisibles.map((tipo) => {
		                        const categoria = String(tipo.categoria || "Sin categoria").trim() || "Sin categoria";
		                        const equipo = String(tipo.equipo_nombre || "").trim();
		                        return (
		                        <option key={`${categoria}-${equipo}`} value={`${categoria}|||${equipo}`}>
		                          {busquedaEquipoBodega.trim() ? `${equipo} - ${categoria}` : equipo}
		                        </option>
		                        );
		                      })}
		                    </select>
		                  </div>
	                </div>
	                <div className="form-row">
	                  <div className="form-group col-md-6">
	                    <label>Codigo</label>
	                    <input
	                      className="form-control"
	                      value={bodegaForm.codigo}
	                      onChange={(e) => setBodegaForm((prev) => ({ ...prev, codigo: e.target.value }))}
	                    />
	                  </div>
	                  <div className="form-group col-md-6">
	                    <label>N serie</label>
	                    <input
	                      className="form-control"
	                      placeholder="Si queda vacio usa el codigo"
	                      value={bodegaForm.numero_serie}
	                      onChange={(e) => setBodegaForm((prev) => ({ ...prev, numero_serie: e.target.value }))}
	                    />
	                  </div>
	                </div>
	                <div className="form-group mb-0">
	                  <label>Observacion</label>
	                  <input
	                    className="form-control"
	                    value={bodegaForm.observacion}
	                    onChange={(e) => setBodegaForm((prev) => ({ ...prev, observacion: e.target.value }))}
	                  />
	                </div>
	                <div className="small text-muted mt-3">
	                  El equipo quedara visible en Bodega-retiros, seccion En bodega.
	                </div>
	              </div>
	              <div className="modal-footer">
	                <button
	                  className="btn btn-light"
	                  onClick={() => setShowAgregarBodegaModal(false)}
	                  disabled={saving}
	                >
	                  Cancelar
	                </button>
	                <button
	                  className="btn btn-success"
	                  onClick={agregarEquipoBodega}
	                  disabled={saving || !tipoSeleccionado || !bodegaForm.codigo.trim()}
	                >
	                  <i className="fas fa-save mr-2" />
	                  {saving ? "Guardando..." : "Agregar a bodega central"}
	                </button>
	              </div>
	            </div>
	          </div>
	        </div>
	      ) : null}
	    </div>
	  );
	}


