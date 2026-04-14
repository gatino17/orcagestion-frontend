import React, { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import {
  fetchClientes,
  fetchCentrosPorCliente,
  obtenerRetirosTerreno,
  recepcionarRetiroEnBodega,
  obtenerDetallesCentro,
} from "../api";
import "./BodegaRetiros.css";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function isToday(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function BodegaRetiros() {
  const [clientes, setClientes] = useState([]);
  const [centros, setCentros] = useState([]);
  const [retiros, setRetiros] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [centroId, setCentroId] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [observacionBodega, setObservacionBodega] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [equiposRecepcion, setEquiposRecepcion] = useState([]);
  const [usuario, setUsuario] = useState({ id: null, nombre: "Bodega" });
  const [filtroHistorial, setFiltroHistorial] = useState("");
  const [historialCentro, setHistorialCentro] = useState(null);
  const [historialCentroLoading, setHistorialCentroLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setUsuario({
        id: decoded.id || decoded.user_id || decoded.sub || null,
        nombre: decoded.name || decoded.nombre || decoded.email || "Bodega",
      });
    } catch {
      setUsuario({ id: null, nombre: "Bodega" });
    }
  }, []);

  const cargarClientes = async () => {
    try {
      const data = await fetchClientes();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setClientes([]);
    }
  };

  const cargarCentros = async (idCliente) => {
    if (!idCliente) {
      setCentros([]);
      return;
    }
    try {
      const data = await fetchCentrosPorCliente(idCliente);
      setCentros(Array.isArray(data) ? data : []);
    } catch {
      setCentros([]);
    }
  };

  const cargarRetiros = async () => {
    setLoading(true);
    try {
      const data = await obtenerRetirosTerreno({
        cliente_id: clienteId || undefined,
        centro_id: centroId || undefined,
      });
      setRetiros(Array.isArray(data) ? data : []);
    } catch {
      setRetiros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    setCentroId("");
    cargarCentros(clienteId);
  }, [clienteId]);

  useEffect(() => {
    cargarRetiros();
  }, [clienteId, centroId]);

  const enTransito = useMemo(
    () => retiros.filter((r) => String(r.estado_logistico || "") === "en_transito"),
    [retiros]
  );
  const enBodega = useMemo(
    () => retiros.filter((r) => String(r.estado_logistico || "") === "en_bodega"),
    [retiros]
  );
  const recepcionadosHoy = useMemo(
    () => enBodega.filter((r) => isToday(r.fecha_recepcion_bodega)).length,
    [enBodega]
  );
  const totalPendienteTransito = enTransito.length;

  const totalEquiposRetirados = (retiro) =>
    Array.isArray(retiro?.equipos) ? retiro.equipos.filter((e) => !!e.retirado).length : 0;

  const historialLogistico = useMemo(() => {
    const q = String(filtroHistorial || "").trim().toLowerCase();
    const rows = [];
    (retiros || []).forEach((r) => {
      const equipos = Array.isArray(r?.equipos) ? r.equipos : [];
      equipos
        .filter((eq) => !!eq.retirado)
        .forEach((eq) => {
      const row = {
            id_retiro_terreno: r.id_retiro_terreno,
            centro_id: r.centro_id,
            cliente: r.empresa || r.cliente || "-",
            centro: r.centro || "-",
            tecnico: r.tecnico_1 || r.tecnico_2 || "-",
            fecha_retiro: r.fecha_retiro,
            estado_logistico: r.estado_logistico || "retirado_centro",
            recepcion_bodega_por: r.recepcion_bodega_por || "-",
            fecha_recepcion_bodega: r.fecha_recepcion_bodega,
            equipo_nombre: eq.equipo_nombre || "-",
            numero_serie: eq.numero_serie || "-",
            codigo: eq.codigo || "-",
            recibido_bodega: !!eq.recibido_bodega,
          };
          rows.push(row);
        });
    });
    const filtradas = !q
      ? rows
      : rows.filter((r) =>
          [
            r.cliente,
            r.centro,
            r.tecnico,
            r.equipo_nombre,
            r.numero_serie,
            r.codigo,
            `n${r.id_retiro_terreno || ""}`,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)
        );
    return filtradas.sort((a, b) => {
      const fa = new Date(a.fecha_retiro || 0).getTime();
      const fb = new Date(b.fecha_retiro || 0).getTime();
      if (fb !== fa) return fb - fa;
      return Number(b.id_retiro_terreno || 0) - Number(a.id_retiro_terreno || 0);
    });
  }, [retiros, filtroHistorial]);

  const getBadgeEstado = (estado) => {
    const e = String(estado || "");
    if (e === "en_bodega") return <span className="badge badge-success">En bodega</span>;
    if (e === "en_transito") return <span className="badge badge-warning">En transito</span>;
    return <span className="badge badge-secondary">Retirado del centro</span>;
  };

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const confirmarRecepcion = async () => {
    if (!seleccionado?.id_retiro_terreno) return;
    setSavingId(seleccionado.id_retiro_terreno);
    try {
      await recepcionarRetiroEnBodega(seleccionado.id_retiro_terreno, {
        recepcion_bodega_por: usuario.nombre,
        recepcion_bodega_user_id: usuario.id,
        observacion_bodega: observacionBodega || null,
        equipos: equiposRecepcion.map((eq) => ({
          id_retiro_equipo: eq.id_retiro_equipo,
          recibido_bodega: !!eq.recibido_bodega,
        })),
      });
      setSeleccionado(null);
      setObservacionBodega("");
      setEquiposRecepcion([]);
      await cargarRetiros();
    } catch {
      alert("No se pudo recepcionar en bodega.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="container-fluid py-3 bodega-page">
      <div className="card shadow-sm border-0 mb-3 bodega-hero">
        <div className="card-body d-flex justify-content-between align-items-start flex-wrap" style={{ gap: 10 }}>
          <div>
            <h4 className="mb-2">Bodega - Recepcion de retiros</h4>
            <p className="text-muted mb-0">
              Flujo: retirado del centro → en tránsito → en bodega.
            </p>
          </div>
          <div className="bodega-kpis-inline bodega-hero-kpis">
            <span className="bodega-kpi-chip bodega-kpi-transito">
              <i className="fas fa-route" />
              En tránsito: {totalPendienteTransito}
            </span>
            <span className="bodega-kpi-chip bodega-kpi-hoy">
              <i className="fas fa-check-circle" />
              En bodega: {enBodega.length}
            </span>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-3 bodega-filtros">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label">Cliente</label>
              <select className="form-control" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Todos</option>
                {clientes.map((c) => {
                  const id = c.id_cliente ?? c.id;
                  return (
                    <option key={id} value={id}>
                      {c.nombre || c.razon_social || `Cliente ${id}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Centro</label>
              <select
                className="form-control"
                value={centroId}
                onChange={(e) => setCentroId(e.target.value)}
                disabled={!clienteId}
              >
                <option value="">Todos</option>
                {centros.map((c) => {
                  const id = c.id_centro ?? c.id;
                  return (
                    <option key={id} value={id}>
                      {c.nombre || `Centro ${id}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button className="btn btn-outline-primary w-100" onClick={cargarRetiros}>
                Recargar
              </button>
            </div>
          </div>
        </div>
      </div>


      <div className="card shadow-sm border-0 mb-3 bodega-tabla bodega-tabla-transito">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-truck-loading mr-2 text-primary" />
            En transito ({enTransito.length})
          </strong>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N°</th>
                  <th>Correlativo</th>
                  <th>Fecha retiro</th>
                  <th>Cliente</th>
                  <th>Centro</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Equipos retirados</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3">
                      Cargando...
                    </td>
                  </tr>
                ) : !enTransito.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-3 text-muted">
                      Sin retiros en transito.
                    </td>
                  </tr>
                ) : (
                  enTransito.map((r) => (
                    <tr key={r.id_retiro_terreno}>
                      <td>{r.id_retiro_terreno}</td>
                      <td>{`N${r.id_retiro_terreno || "-"}`}</td>
                      <td>{formatDate(r.fecha_retiro)}</td>
                      <td>{r.empresa || r.cliente || "-"}</td>
                      <td>{r.centro || "-"}</td>
                      <td>{r.tipo_retiro === "completo" ? "Completo" : "Parcial"}</td>
                      <td>
                        <span className="badge badge-warning">En tránsito</span>
                      </td>
                      <td>{totalEquiposRetirados(r)}</td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => {
                            setSeleccionado(r);
                            setEquiposRecepcion(
                              (Array.isArray(r.equipos) ? r.equipos : [])
                                .filter((eq) => !!eq.retirado)
                                .map((eq) => ({
                                  ...eq,
                                  recibido_bodega: !!eq.recibido_bodega,
                                }))
                            );
                          }}
                          disabled={savingId === r.id_retiro_terreno}
	                        >
	                          <i className="fas fa-check mr-1" />
	                          Recepcionar
	                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <strong>
            <i className="fas fa-warehouse mr-2 text-success" />
            En bodega ({enBodega.length})
          </strong>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>N°</th>
                  <th>Correlativo</th>
                  <th>Fecha retiro</th>
                  <th>Centro</th>
                  <th>Estado</th>
                  <th>Recepcionado por</th>
                  <th>Fecha recepcion</th>
                </tr>
              </thead>
              <tbody>
                {!enBodega.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-3 text-muted">
                      Sin retiros recepcionados en bodega.
                    </td>
                  </tr>
                ) : (
                  enBodega.map((r) => (
                    <tr key={r.id_retiro_terreno}>
                      <td>{r.id_retiro_terreno}</td>
                      <td>{`N${r.id_retiro_terreno || "-"}`}</td>
                      <td>{formatDate(r.fecha_retiro)}</td>
                      <td>{r.centro || "-"}</td>
                      <td>
                        <span className="badge badge-success">En bodega</span>
                      </td>
                      <td>{r.recepcion_bodega_por || "-"}</td>
                      <td>{formatDate(r.fecha_recepcion_bodega)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mt-3 bodega-tabla">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap">
          <strong>
            <i className="fas fa-history mr-2 text-info" />
            Historial logístico de equipos
          </strong>
          <input
            className="form-control form-control-sm"
            style={{ maxWidth: 360 }}
            placeholder="Buscar por centro, equipo, técnico, N serie o correlativo"
            value={filtroHistorial}
            onChange={(e) => setFiltroHistorial(e.target.value)}
          />
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 bodega-table">
              <thead className="thead-light">
                <tr>
                  <th>Fecha</th>
                  <th>N correlativo</th>
                  <th>Equipo</th>
                  <th>N serie</th>
                  <th>Centro</th>
                  <th>Técnico</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {!historialLogistico.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-3 text-muted">
                      Sin movimientos logisticos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  historialLogistico.map((r, idx) => (
                    <tr key={`${r.id_retiro_terreno}-${r.equipo_nombre}-${r.numero_serie}-${idx}`}>
                      <td>{formatDateTime(r.fecha_retiro)}</td>
                      <td>{`N${r.id_retiro_terreno || "-"}`}</td>
                      <td>{r.equipo_nombre}</td>
                      <td>{r.numero_serie || "-"}</td>
                      <td>{r.centro}</td>
                      <td>{r.tecnico || "-"}</td>
                      <td>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={async () => {
                            const rowsCentro = historialLogistico.filter(
                              (x) => Number(x.centro_id || 0) === Number(r.centro_id || 0)
                            );
                            setHistorialCentroLoading(true);
                            try {
                              const detalles = await obtenerDetallesCentro({ centro_id: r.centro_id });
                              const equiposActuales = Array.isArray(detalles?.equipos) ? detalles.equipos : [];
                              const rows = rowsCentro.map((row) => {
                                const actual = equiposActuales.find(
                                  (eq) => normalizeText(eq?.nombre) === normalizeText(row?.equipo_nombre)
                                );
                                const serieActual = String(actual?.numero_serie || "").trim() || "-";
                                let estadoCambio = "Sin información";
                                let estadoCambioTipo = "sin-info";
                                if (serieActual === "-") {
                                  estadoCambio = "Equipo retirado, sin serie actual en el centro.";
                                  estadoCambioTipo = "sin-actual";
                                } else if (String(row?.numero_serie || "-").trim() === serieActual) {
                                  estadoCambio = "Este equipo no tuvo modificación desde su instalación inicial.";
                                  estadoCambioTipo = "sin-cambio";
                                } else {
                                  estadoCambio = "Equipo con modificación de serie respecto al retiro.";
                                  estadoCambioTipo = "modificado";
                                }
                                return {
                                  ...row,
                                  serie_actual: serieActual,
                                  estado_cambio: estadoCambio,
                                  estado_cambio_tipo: estadoCambioTipo,
                                };
                              });
                              setHistorialCentro({
                                cliente: r.cliente,
                                centro: r.centro,
                                rows,
                              });
                            } catch (e) {
                              setHistorialCentro({
                                cliente: r.cliente,
                                centro: r.centro,
                                rows: rowsCentro.map((row) => ({
                                  ...row,
                                  serie_actual: "-",
                                  estado_cambio: "No se pudo comparar con planilla actual.",
                                  estado_cambio_tipo: "sin-info",
                                })),
                              });
                            } finally {
                              setHistorialCentroLoading(false);
                            }
                          }}
                        >
                          <i className="fas fa-search mr-1" />
	                          Ver centro
	                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {seleccionado ? (
        <div className="modal d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Recepcionar en bodega</h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => {
                    setSeleccionado(null);
                    setEquiposRecepcion([]);
                  }}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  <strong>{seleccionado.centro || "-"}</strong> ({seleccionado.empresa || seleccionado.cliente || "-"})
                </p>
                <p className="text-muted mb-2">
                  Equipos retirados: {totalEquiposRetirados(seleccionado)}
                </p>
                <label className="form-label">Checklist equipos (equipo / código)</label>
                <div className="border rounded p-2 mb-3" style={{ maxHeight: 220, overflowY: "auto" }}>
                  {!equiposRecepcion.length ? (
                    <div className="text-muted small">Sin equipos retirados para validar.</div>
                  ) : (
                    equiposRecepcion.map((eq) => (
                      <label
                        key={eq.id_retiro_equipo || `${eq.equipo_nombre}-${eq.numero_serie}`}
                        className="d-flex align-items-start mb-2"
                        style={{ gap: 10 }}
                      >
                        <input
                          type="checkbox"
                          checked={!!eq.recibido_bodega}
                          onChange={(e) =>
                            setEquiposRecepcion((prev) =>
                              prev.map((row) =>
                                row.id_retiro_equipo === eq.id_retiro_equipo
                                  ? { ...row, recibido_bodega: e.target.checked }
                                  : row
                              )
                            )
                          }
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>{eq.equipo_nombre || "-"}</div>
                          <div className="small text-muted">
                            Serie: {eq.numero_serie || "-"} | Código: {eq.codigo || "-"}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <label className="form-label">Observacion bodega (opcional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={observacionBodega}
                  onChange={(e) => setObservacionBodega(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-light"
                  onClick={() => {
                    setSeleccionado(null);
                    setEquiposRecepcion([]);
                  }}
                >
                  Cancelar
                </button>
                <button className="btn btn-success" onClick={confirmarRecepcion} disabled={!!savingId}>
                  {savingId ? "Guardando..." : "Confirmar recepcion"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {historialCentro ? (
        <div className="modal d-block bodega-historial-modal" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl" role="document">
            <div className="modal-content">
              <div className="modal-header bodega-historial-header">
                <h5 className="modal-title">
                  <i className="fas fa-microscope mr-2" />
                  Historial por centro - {historialCentro.centro}
                </h5>
                <button type="button" className="close" onClick={() => setHistorialCentro(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="bodega-historial-meta mb-3">
                  <div className="bodega-historial-chip">
                    <i className="fas fa-building" />
                    {historialCentro.cliente}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-map-marker-alt" />
                    {historialCentro.centro}
                  </div>
                  <div className="bodega-historial-chip">
                    <i className="fas fa-list" />
                    Registros: {Array.isArray(historialCentro.rows) ? historialCentro.rows.length : 0}
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm mb-0 bodega-table">
                    <thead className="thead-light">
                      <tr>
                        <th>Correlativo</th>
                        <th>Fecha retiro</th>
                        <th>Equipo</th>
                        <th>Serie retirada</th>
                        <th>Serie actual</th>
                        <th>Resultado</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialCentroLoading ? (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-3">Comparando equipos...</td>
                        </tr>
                      ) : historialCentro.rows.map((x, i) => (
                        <tr key={`${x.id_retiro_terreno}-${x.equipo_nombre}-${i}`}>
                          <td>{`N${x.id_retiro_terreno || "-"}`}</td>
                          <td>{formatDate(x.fecha_retiro)}</td>
                          <td>{x.equipo_nombre}</td>
                          <td
                            className={
                              x.estado_cambio_tipo === "modificado"
                                ? "bodega-serie-cambio"
                                : x.estado_cambio_tipo === "sin-cambio"
                                ? "bodega-serie-ok"
                                : "bodega-serie-neutral"
                            }
                          >
                            {x.numero_serie || "-"}
                          </td>
                          <td
                            className={
                              x.estado_cambio_tipo === "modificado"
                                ? "bodega-serie-cambio"
                                : x.estado_cambio_tipo === "sin-cambio"
                                ? "bodega-serie-ok"
                                : "bodega-serie-neutral"
                            }
                          >
                            {x.serie_actual || "-"}
                          </td>
                          <td
                            style={{ minWidth: 260 }}
                            className={
                              x.estado_cambio_tipo === "modificado"
                                ? "bodega-resultado bodega-resultado-cambio"
                                : x.estado_cambio_tipo === "sin-cambio"
                                ? "bodega-resultado bodega-resultado-ok"
                                : "bodega-resultado bodega-resultado-neutral"
                            }
                          >
                            {x.estado_cambio || "-"}
                          </td>
                          <td>{getBadgeEstado(x.estado_logistico)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setHistorialCentro(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

