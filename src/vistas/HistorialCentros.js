import React, { useEffect, useMemo, useState } from "react";
import { obtenerDatosFiltrados, obtenerClientesFiltro } from "../controllers/filtroControllers";
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import "./HistorialCentros.css";

const columnasPorTipo = {
  Traslados: [
    { key: "id", label: "ID" },
    { key: "area", label: "Area" },
    { key: "nombre_centro", label: "Centro" },
    { key: "nombre_empresa", label: "Empresa" },
    { key: "fecha", label: "Fecha" },
    { key: "fecha_inicio_monitoreo", label: "Inicio monitoreo" },
    { key: "centro_destino", label: "Centro destino" },
    { key: "tipo_traslado", label: "Tipo traslado" },
    { key: "observacion", label: "Observacion" },
    { key: "documento", label: "Documento" }
  ],
  Ceses: [
    { key: "id", label: "ID" },
    { key: "area", label: "Area" },
    { key: "nombre_centro", label: "Centro" },
    { key: "nombre_empresa", label: "Empresa" },
    { key: "fecha", label: "Fecha" },
    { key: "observacion", label: "Observacion" },
    { key: "documento", label: "Documento" }
  ],
  Instalaciones: [
    { key: "id", label: "ID" },
    { key: "area", label: "Area" },
    { key: "nombre_centro", label: "Centro" },
    { key: "nombre_empresa", label: "Empresa" },
    { key: "fecha", label: "Fecha" },
    { key: "fecha_inicio_monitoreo", label: "Inicio monitoreo" },
    { key: "observacion", label: "Observacion" },
    { key: "documento", label: "Documento" }
  ],
  Mantenciones: [
    { key: "id", label: "ID" },
    { key: "area", label: "Area" },
    { key: "nombre_centro", label: "Centro" },
    { key: "nombre_empresa", label: "Empresa" },
    { key: "fecha", label: "Fecha" },
    { key: "responsable", label: "Responsable" },
    { key: "observacion", label: "Observacion" },
    { key: "documento", label: "Documento" }
  ],
  Default: [
    { key: "id", label: "ID" },
    { key: "area", label: "Area" },
    { key: "nombre_centro", label: "Centro" },
    { key: "nombre_empresa", label: "Empresa" },
    { key: "fecha", label: "Fecha" },
    { key: "observacion", label: "Observacion" },
    { key: "documento", label: "Documento" }
  ]
};

const iconosPorTipo = {
  Traslados: { icon: "fas fa-route", label: "Traslados" },
  Ceses: { icon: "fas fa-user-slash", label: "Ceses" },
  Instalaciones: { icon: "fas fa-tools", label: "Instalaciones" },
  Mantenciones: { icon: "fas fa-wrench", label: "Mantenciones" },
  Default: { icon: "fas fa-clipboard-list", label: "Registros" }
};

function HistorialCentros() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [centroId, setCentroId] = useState("");
  const [datos, setDatos] = useState([]);
  const [serviciosAdicionales, setServiciosAdicionales] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [centros, setCentros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarFiltros = async () => {
      try {
        await obtenerClientesFiltro(setClientes, setError);
        const centrosData = await cargarCentrosClientes();
        setCentros(centrosData);
      } catch (err) {
        setError("Hubo un problema al cargar los filtros.");
      }
    };
    cargarFiltros();
  }, []);

  const handleFiltrar = async () => {
    if (!fechaInicio || !fechaFin) {
      alert("Por favor selecciona rango de fechas.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { resultados, servicios_adicionales } = await obtenerDatosFiltrados(fechaInicio, fechaFin, clienteId);
      const resultadosFiltrados = centroId
        ? filtrarPorCentro(resultados, centroId)
        : resultados;
      setDatos(resultadosFiltrados);
      setServiciosAdicionales(servicios_adicionales);
    } catch (err) {
      setError("Hubo un error al filtrar la informacion.");
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setClienteId("");
    setCentroId("");
    setDatos([]);
    setServiciosAdicionales([]);
  };

  const obtenerIdCentro = (centro) => centro?.id ?? centro?.id_centro ?? centro?.idCentro ?? centro?.centro_id;

  const filtrarPorCentro = (registros, centroSeleccionado) => {
    const centroReferencial = centros.find((centro) => String(obtenerIdCentro(centro)) === String(centroSeleccionado));
    const nombreCentro = centroReferencial?.nombre?.toLowerCase();
    return registros.filter((registro) => {
      if (registro.id_centro) return String(registro.id_centro) === String(centroSeleccionado);
      if (registro.centro_id) return String(registro.centro_id) === String(centroSeleccionado);
      if (nombreCentro) {
        return registro.nombre_centro?.toLowerCase() === nombreCentro;
      }
      return false;
    });
  };

  const filteredCentros = useMemo(() => {
    if (!clienteId) return centros;
    return centros.filter((centro) => String(centro.cliente_id) === String(clienteId));
  }, [centros, clienteId]);

  const handleClienteChange = (event) => {
    setClienteId(event.target.value);
    setCentroId("");
  };

  const obtenerResponsable = (registro) => {
    const candidato =
      registro.responsable ||
      registro.tecnico ||
      registro.encargado ||
      registro.supervisor ||
      registro.encargado_principal ||
      registro.responsable_nombre;

    if (!candidato) return "Sin asignar";
    if (typeof candidato === "string") {
      return candidato.trim() || "Sin asignar";
    }
    if (typeof candidato === "object") {
      return candidato?.nombre || candidato?.nombre_encargado || "Sin asignar";
    }
    return "Sin asignar";
  };

  const formatearFechaConDia = (fecha) => {
    if (!fecha) return "";
    const fechaObj = new Date(fecha);
    fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
    const opciones = { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" };
    return new Intl.DateTimeFormat("es-ES", opciones).format(fechaObj).replace(",", "");
  };

  const datosAgrupados = useMemo(
    () =>
      datos.reduce((acc, item) => {
        if (!acc[item.tipo]) acc[item.tipo] = [];
        acc[item.tipo].push(item);
        return acc;
      }, {}),
    [datos]
  );

  const clienteSeleccionadoNombre = useMemo(() => {
    if (!clienteId) return "";
    const encontrado = clientes.find((cliente) => String(cliente.id_cliente) === String(clienteId));
    return encontrado ? encontrado.nombre : "";
  }, [clientes, clienteId]);

  const formatearFechaPlanilla = (fecha) => {
    if (!fecha) return "";
    const fechaObj = new Date(fecha);
    if (Number.isNaN(fechaObj.getTime())) return fecha;
    const dia = fechaObj.getDate().toString().padStart(2, "0");
    const mes = (fechaObj.getMonth() + 1).toString().padStart(2, "0");
    const anio = fechaObj.getFullYear();
    return `${dia}-${mes}-${anio}`;
  };

  const escapeHtml = (valor = "") =>
    String(valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const formatearDocumentoHtml = (documento) =>
    documento ? `<a href="${documento}" target="_blank">Ver documento</a>` : "Sin documento";

  const monthNames = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE"
  ];

  const obtenerTituloReporte = () => {
    const nombreCliente = clienteSeleccionadoNombre ? clienteSeleccionadoNombre.toUpperCase() : "GENERAL";
    let periodoTexto = "";
    if (fechaInicio && fechaFin) {
      periodoTexto = `(periodo ${formatearFechaPlanilla(fechaInicio)} al ${formatearFechaPlanilla(fechaFin)})`;
    }
    let mesReferencia = "";
    if (fechaInicio) {
      const fechaObj = new Date(fechaInicio);
      if (!Number.isNaN(fechaObj.getTime())) {
        mesReferencia = `${monthNames[fechaObj.getMonth()]} ${fechaObj.getFullYear()}`;
      }
    }
    return `INFORME OPERACIONAL ${nombreCliente} ${mesReferencia} ${periodoTexto}`.trim();
  };

  const construirSeccionesExcel = () => {
    const seccionesConfig = [
      {
        key: "Instalaciones",
        titulo: "Nuevas instalaciones",
        headerColor: "#b9e4c9",
        rowColor: "#e8f8ed",
        columnas: ["Región", "Nombre del centro", "Nombre empresa", "Fecha de instalación", "Inicio monitoreo", "Documento asociado", "Observaciones"],
        mapRow: (item) => [
          item.area || "-",
          item.nombre_centro || item.centro_destino || "-",
          item.nombre_empresa || item.empresa || "-",
          formatearFechaPlanilla(item.fecha),
          formatearFechaPlanilla(item.fecha_inicio_monitoreo),
          formatearDocumentoHtml(item.documento),
          escapeHtml(item.observacion || "")
        ]
      },
      {
        key: "Ceses",
        titulo: "Retiro de equipos",
        headerColor: "#f7cdbf",
        rowColor: "#fdebe4",
        columnas: ["Región", "Nombre del centro", "Nombre empresa", "Fecha de retiro", "Documento asociado", "Observaciones"],
        mapRow: (item) => [
          item.area || "-",
          item.nombre_centro || "-",
          item.nombre_empresa || item.empresa || "-",
          formatearFechaPlanilla(item.fecha),
          formatearDocumentoHtml(item.documento),
          escapeHtml(item.observacion || "")
        ]
      },
      {
        key: "Traslados",
        titulo: "Traslados de equipos",
        headerColor: "#d6e4ff",
        rowColor: "#eef4ff",
        columnas: ["Región", "Centro origen", "Empresa", "Fecha de traslado", "Centro destino", "Tipo traslado", "Documento asociado", "Observaciones"],
        mapRow: (item) => [
          item.area || "-",
          item.nombre_centro || "-",
          item.nombre_empresa || item.empresa || "-",
          formatearFechaPlanilla(item.fecha),
          item.centro_destino || "-",
          item.tipo_traslado || "-",
          formatearDocumentoHtml(item.documento),
          escapeHtml(item.observacion || "")
        ]
      },
      {
        key: "Mantenciones",
        titulo: "Mantenciones preventivas",
        headerColor: "#fde68a",
        rowColor: "#fef9c3",
        columnas: ["Región", "Nombre del centro", "Empresa", "Fecha mantención", "Responsable", "Documento asociado", "Observaciones"],
        mapRow: (item) => [
          item.area || "-",
          item.nombre_centro || "-",
          item.nombre_empresa || "-",
          formatearFechaPlanilla(item.fecha),
          escapeHtml(obtenerResponsable(item)),
          formatearDocumentoHtml(item.documento),
          escapeHtml(item.observacion || "")
        ]
      },
      {
        key: "Servicios adicionales",
        titulo: "Servicios adicionales",
        headerColor: "#fbcfe8",
        rowColor: "#fdf2f8",
        columnas: ["Región", "Nombre del centro", "Empresa", "Fecha", "Documento asociado", "Observaciones"],
        datosCustom: serviciosAdicionales.map((servicio) => ({
          area: servicio.area || servicio.area_servicio || "-",
          nombre_centro: servicio.nombre_centro || servicio.centro_nombre || "-",
          nombre_empresa: servicio.nombre_empresa || servicio.empresa || "-",
          fecha: servicio.fecha,
          documento: servicio.documento,
          observacion: servicio.observacion || ""
        })),
        mapRow: (item) => [
          item.area || "-",
          item.nombre_centro || "-",
          item.nombre_empresa || "-",
          formatearFechaPlanilla(item.fecha),
          formatearDocumentoHtml(item.documento),
          escapeHtml(item.observacion || "")
        ]
      }
    ];

    const obtenerRegistros = (key, datosCustom) => {
      if (datosCustom) return datosCustom;
      return datosAgrupados[key] || [];
    };

    return seccionesConfig
      .map((section) => {
        const registros = obtenerRegistros(section.key, section.datosCustom);
        const columnasCount = section.columnas.length;
        const headerCells = section.columnas
          .map(
            (col) =>
              `<th style="background:${section.headerColor};border:1px solid #0f2d57;padding:6px;text-transform:uppercase;font-size:12px;">${escapeHtml(
                col
              )}</th>`
          )
          .join("");
        const rowsHtml =
          registros.length > 0
            ? registros
                .map((registro) => {
                  const valores = section.mapRow(registro);
                  return `<tr>${valores
                    .map(
                      (valor) =>
                        `<td style="background:${section.rowColor};border:1px solid #d0d7e2;padding:6px;font-size:12px;">${
                          typeof valor === "string" ? valor : escapeHtml(valor)
                        }</td>`
                    )
                    .join("")}</tr>`;
                })
                .join("")
            : `<tr><td colspan="${columnasCount}" style="text-align:center;padding:10px;font-style:italic;border:1px solid #d0d7e2;background:#f8fafc;">Sin registros</td></tr>`;

        return `
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
              <tr>
                <th colspan="${columnasCount}" style="background:#0f2d57;color:#fff;padding:8px;text-transform:uppercase;text-align:left;">${section.titulo}</th>
              </tr>
              <tr>${headerCells}</tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        `;
      })
      .join("");
  };

  const handleDescargarHistorial = () => {
    if (!datos.length && !serviciosAdicionales.length) {
      alert("No hay datos para descargar. Aplica un filtro primero.");
      return;
    }

    const titulo = obtenerTituloReporte();
    const periodo =
      fechaInicio && fechaFin
        ? `${formatearFechaPlanilla(fechaInicio)} al ${formatearFechaPlanilla(fechaFin)}`
        : "Sin rango definido";
    const seccionesHtml = construirSeccionesExcel();

    const contenido = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: "Segoe UI", Arial, sans-serif; color:#0f172a; padding:20px; }
            .header-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
            .header-table td { border:1px solid #0f2d57; }
            .logo-cell { width:220px; background:#0f2d57; text-align:center; color:#fff; font-size:22px; font-weight:bold; letter-spacing:2px; }
            .title-cell { background:#0f2d57; color:#fff; font-size:18px; font-weight:700; padding:12px 18px; text-align:center; }
            .period-cell { text-align:right; font-size:12px; padding:6px 8px; background:#f1f5f9; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="logo-cell">INFORME<br/>ORCAGEST</td>
              <td class="title-cell">${titulo}</td>
            </tr>
            <tr>
              <td colspan="2" class="period-cell">Periodo: ${periodo}</td>
            </tr>
          </table>
          ${seccionesHtml}
        </body>
      </html>
    `;

    const blob = new Blob([contenido], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `informe-operacional-${Date.now()}.xls`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const metricas = useMemo(() => {
    const total = datos.length;
    return [
      {
        label: "Traslados",
        value: datosAgrupados.Traslados?.length || 0,
        icon: "fas fa-random",
        key: "traslados"
      },
      {
        label: "Instalaciones",
        value: datosAgrupados.Instalaciones?.length || 0,
        icon: "fas fa-plug",
        key: "instalaciones"
      },
      {
        label: "Ceses",
        value: datosAgrupados.Ceses?.length || 0,
        icon: "fas fa-ban",
        key: "ceses"
      },
      {
        label: "Mantenciones",
        value: datosAgrupados.Mantenciones?.length || 0,
        icon: "fas fa-tools",
        key: "mantenciones"
      },
      {
        label: "Servicios adicionales",
        value: serviciosAdicionales.length,
        icon: "fas fa-plus-circle",
        key: "servicios"
      },
      {
        label: "Total documentos",
        value: total,
        icon: "fas fa-folder-open",
        key: "total"
      }
    ];
  }, [datosAgrupados, datos.length, serviciosAdicionales.length]);

  const proximasActividades = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const conFecha = datos
      .filter((item) => item.fecha)
      .map((item) => ({
        id: item.id,
        tipo: item.tipo,
        centro: item.nombre_centro || item.centro_destino || "Centro sin nombre",
        cliente: item.nombre_empresa || item.empresa || "Cliente sin nombre",
        responsable: obtenerResponsable(item),
        fechaOriginal: item.fecha,
        fecha: new Date(item.fecha)
      }))
      .sort((a, b) => a.fecha - b.fecha);

    const futuras = conFecha.filter((item) => item.fecha >= hoy);
    const base = futuras.length ? futuras : conFecha;
    return base.slice(0, 4);
  }, [datos]);

  const disponibilidadTecnicos = useMemo(() => {
    const conteo = datos.reduce((acc, registro) => {
      const responsable = obtenerResponsable(registro);
      acc[responsable] = (acc[responsable] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(conteo)
      .map(([nombre, asignaciones]) => ({ nombre, asignaciones }))
      .sort((a, b) => a.asignaciones - b.asignaciones)
      .slice(0, 4);
  }, [datos]);

  return (
    <div className="centers-page container-fluid">
      <div className="centers-header">
        <div>
          <h2>Historial de centros</h2>
          <p>Controla instalaciones, traslados y ceses registrados en el periodo seleccionado.</p>
        </div>
        <div className="centers-header-actions">
          <button className="btn btn-outline-secondary me-2" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
          <button
            className="btn btn-success"
            onClick={handleDescargarHistorial}
            disabled={!datos.length && !serviciosAdicionales.length}
            title="Descargar informe Excel"
          >
            <i className="fas fa-file-excel" />
          </button>
        </div>
      </div>

      <div className="centers-metrics">
        {metricas.map((card) => (
          <div className={`metric-card metric-card--${card.key}`} key={card.label}>
            <div className="metric-icon">
              <i className={card.icon} />
            </div>
            <div>
              <span>{card.label}</span>
              <h3>{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="centers-filters card">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label>Fecha inicio</label>
              <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label>Fecha fin</label>
              <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label>Cliente</label>
              <select className="form-control" value={clienteId} onChange={handleClienteChange}>
                <option value="">Todos los clientes</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id_cliente} value={cliente.id_cliente}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label>Centro</label>
              <select className="form-control" value={centroId} onChange={(e) => setCentroId(e.target.value)}>
                <option value="">Todos los centros</option>
                {filteredCentros.map((centro) => {
                  const centerValue = obtenerIdCentro(centro);
                  return (
                  <option key={centerValue} value={centerValue}>
                    {centro.nombre}
                  </option>
                );
                })}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary w-100" onClick={handleFiltrar}>
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="centers-status">Cargando datos...</div>}
      {error && <div className="centers-status text-danger">{error}</div>}

      {!loading && !Object.keys(datosAgrupados).length && (
        <div className="centers-status">No hay registros para los filtros seleccionados.</div>
      )}

      <div className="centers-groups">
        {Object.entries(datosAgrupados).map(([tipo, items]) => {
          const columnas = columnasPorTipo[tipo] || columnasPorTipo.Default;
          const icono = iconosPorTipo[tipo] || iconosPorTipo.Default;
          return (
            <div className="card mb-4" key={tipo}>
              <div className="card-header centers-group-header">
                <div className="group-title">
                  <span className="group-icon">
                    <i className={icono.icon} />
                  </span>
                  <h4>{tipo}</h4>
                </div>
                <span className="record-count">{items.length} registros</span>
              </div>
              <div className="card-body table-responsive centers-table-wrapper">
                <table className="table table-striped table-hover table-bordered centers-table">
                  <thead>
                    <tr>
                      {columnas.map((col) => (
                        <th key={col.key}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.tipo}-${item.id}`}>
                        {columnas.map((col) => {
                          if (col.key === "documento") {
                            return (
                              <td key={col.key}>
                                {item[col.key] ? (
                                  <a href={item[col.key]} target="_blank" rel="noopener noreferrer">
                                    Ver documento
                                  </a>
                                ) : (
                                  "Sin documento"
                                )}
                              </td>
                            );
                          }
                          if (col.key === "fecha" || col.key === "fecha_inicio_monitoreo") {
                            return <td key={col.key}>{formatearFechaConDia(item[col.key])}</td>;
                          }
                          return <td key={col.key}>{item[col.key] || "-"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt-4">
        <div className="card-header centers-group-header">
          <h4>Servicios adicionales</h4>
          <span className="record-count">{serviciosAdicionales.length} registros</span>
        </div>
        <div className="card-body table-responsive">
          {serviciosAdicionales.length ? (
            <table className="table table-striped table-hover table-bordered centers-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Fecha</th>
                  <th>Documento</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {serviciosAdicionales.map((servicio) => (
                  <tr key={servicio.id}>
                    <td>{servicio.id}</td>
                    <td>{servicio.nombre_empresa || "Sin dato"}</td>
                    <td>{formatearFechaConDia(servicio.fecha)}</td>
                    <td>
                      {servicio.documento ? (
                        <a href={servicio.documento} target="_blank" rel="noopener noreferrer">
                          Ver documento
                        </a>
                      ) : (
                        "Sin documento"
                      )}
                    </td>
                    <td>{servicio.observacion || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="centers-status">Sin servicios adicionales para este filtro.</div>
          )}
        </div>
      </div>

    </div>
  );
}

export default HistorialCentros;
