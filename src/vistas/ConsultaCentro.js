// ConsultaCentro.js
import { jwtDecode } from 'jwt-decode';
import React, { useState, useEffect, useMemo } from 'react';
import {
  obtenerClientes,
  obtenerCentrosPorCliente,
  obtenerHistorialCentro,
  obtenerHistorialCentroPDF
} from '../controllers/consultaCentroControllers';
import './ConsultaCentro.css';

const ConsultaCentro = () => {
  const [clientes, setClientes] = useState([]);
  const [centros, setCentros] = useState([]);
  const [historial, setHistorial] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedCentro, setSelectedCentro] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [inventario, setInventario] = useState([]);
  const [rolUsuario, setRolUsuario] = useState('');

  // Cargar rol del usuario desde el token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decodedToken = jwtDecode(token);
      setRolUsuario(decodedToken.rol || '');
    } catch (tokenError) {
      console.error('Error al decodificar el token:', tokenError);
    }
  }, []);

  // Cargar historial del centro cuando cambia el centro seleccionado
  useEffect(() => {
    if (!selectedCentro) return;

    obtenerHistorialCentro(
      selectedCentro,
      (data) => {
        setHistorial(data);
        setInventario(data.inventario || []);
      },
      setError
    );
  }, [selectedCentro]);

  // Cargar clientes al inicio
  useEffect(() => {
    obtenerClientes(setClientes, setError);
  }, []);

  const handleClienteChange = (clienteId) => {
    setSelectedCliente(clienteId);
    setSelectedCentro(null);
    setHistorial(null);
    setCentros([]);
    obtenerCentrosPorCliente(
      clienteId,
      (data) => setCentros(ordenarCentros(data)),
      setError
    );
  };

  const handleCentroChange = (centroId) => {
    setSelectedCentro(centroId);
  };

  const obtenerIdCentro = (centro) =>
    centro?.id_centro ?? centro?.id ?? centro?.centro_id ?? centro?.idCentro;

  const ordenarCentros = (listaCentros = []) => {
    const esEstadoFinal = (estado = '') => {
      const normalized = (estado || '').toLowerCase();
      return normalized === 'cese' || normalized === 'retiro' || normalized === 'retirado';
    };
    return [...listaCentros].sort((a, b) => {
      const estadoA = esEstadoFinal(a.estado);
      const estadoB = esEstadoFinal(b.estado);
      if (estadoA && !estadoB) return 1;
      if (!estadoA && estadoB) return -1;
      return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
    });
  };

  const estadoVisual = (estado = '') => {
    const normalized = (estado || '').toLowerCase();
    if (normalized === 'activo') return { label: 'Activo', color: '#16a34a' };
    if (normalized === 'cese') return { label: 'Cese', color: '#f97316' };
    if (normalized === 'retiro' || normalized === 'retirado') return { label: 'Retirado', color: '#dc2626' };
    return { label: estado || 'Sin estado', color: '#6b7280' };
  };

  const centroSeleccionadoBasico = useMemo(() => {
    if (!selectedCentro) return null;
    return centros.find(
      (centro) => String(obtenerIdCentro(centro)) === String(selectedCentro)
    );
  }, [selectedCentro, centros]);

  const centroEstadoActual = centroSeleccionadoBasico?.estado
    ? estadoVisual(centroSeleccionadoBasico.estado)
    : null;

  const formatearFecha = (fecha) => {
    if (!fecha) return '';

    const fechaObj = new Date(fecha);
    fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());

    const opciones = {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
    const fechaFormateada = new Intl.DateTimeFormat('es-ES', opciones).format(fechaObj);

    return fechaFormateada.replace(',', '').replace(/\//g, '/') + '.';
  };

  const historialData = {
    levantamientos: historial?.historial?.levantamientos || [],
    instalaciones: historial?.historial?.instalaciones || [],
    mantenciones: historial?.historial?.mantenciones || [],
    soportes: (historial?.historial?.soportes || []).slice().sort((a, b) => {
      const fechaA = a?.fecha_soporte ? new Date(a.fecha_soporte) : null;
      const fechaB = b?.fecha_soporte ? new Date(b.fecha_soporte) : null;
      if (!fechaA && !fechaB) return 0;
      if (!fechaA) return -1;
      if (!fechaB) return 1;
      return fechaA - fechaB;
    }),
    traslados: historial?.historial?.traslados || [],
    ceses: historial?.historial?.ceses || [],
    retiros: historial?.historial?.retiros || []
  };

  const timelineSections = [
    {
      key: 'levantamientos',
      title: 'Levantamientos',
      color: 'info',
      icon: 'bi bi-file-earmark-text',
      items: historialData.levantamientos,
      dateField: 'fecha_levantamiento',
      idField: 'id_levantamiento'
    },
    {
      key: 'instalaciones',
      title: 'Instalaciones',
      color: 'success',
      icon: 'bi bi-tools',
      items: historialData.instalaciones,
      dateField: 'fecha_instalacion',
      idField: 'id_instalacion'
    },
        {
          key: 'mantenciones',
          title: 'Mantenciones',
          color: 'warning',
          icon: 'bi bi-wrench',
          items: historialData.mantenciones,
          dateField: 'fecha_mantencion',
          idField: 'id_mantencion'
        },
        {
          key: 'soportes',
          title: 'Reportes de soporte',
          color: 'primary',
          icon: 'bi bi-headset',
          items: historialData.soportes,
          dateField: 'fecha_soporte',
          idField: 'id_soporte'
        },
        {
          key: 'traslados',
          title: 'Traslados',
          color: 'danger',
          icon: 'bi bi-truck',
      items: historialData.traslados,
      dateField: 'fecha_traslado',
      idField: 'id_traslado'
    },
    {
      key: 'ceses',
      title: 'Ceses',
      color: 'secondary',
      icon: 'bi bi-x-circle',
      items: historialData.ceses,
      dateField: 'fecha_cese',
      idField: 'id_cese'
    },
    {
      key: 'retiros',
      title: 'Retiros',
      color: 'dark',
      icon: 'bi bi-archive',
      items: historialData.retiros,
      dateField: 'fecha_retiro',
      idField: 'id_retiro'
    }
  ];

  const renderDocumento = (documento) =>
    documento ? (
      <a href={documento} target="_blank" rel="noopener noreferrer" className="timeline-link">
        Ver documento
      </a>
    ) : (
      <span className="text-muted">Sin documento asociado</span>
    );

  const renderExtraInfo = (sectionKey, item) => {
    switch (sectionKey) {
      case 'instalaciones':
        return (
          <p>
            <strong>Observación:</strong> {item.observacion || 'Sin observación'}
          </p>
        );
      case 'traslados':
        return (
          <>
            <p>
              <strong>Centro destino:</strong> {item.centro_destino_nombre || 'No especificado'}
            </p>
            <p>
              <strong>Observación:</strong> {item.observacion || 'Sin observación'}
            </p>
          </>
        );
      case 'retiros':
        return (
          <p>
            <strong>Observación:</strong> {item.observacion || 'Sin observación'}
          </p>
        );
      case 'soportes':
        return (
          <>
            <p>
              <strong>Problema:</strong> {item.problema || 'Sin detalle'}
            </p>
            <p>
              <strong>Tipo:</strong> {item.tipo || 'No indicado'}
            </p>
            {item.solucion && (
              <p>
                <strong>Solución:</strong> {item.solucion}
              </p>
            )}
            {item.cambio_equipo && (
              <p>
                <strong>Equipo reemplazado:</strong> {item.equipo_cambiado || 'No especificado'}
              </p>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const centroInfo = historial?.centro || null;
  const ipList = historial?.equipos_ip || [];
  const totalEventos = timelineSections.reduce(
    (acc, section) => acc + section.items.length,
    0
  );

  const centerMeta = centroInfo
    ? [
        {
          label: 'Ubicación',
          value: centroInfo.ubicacion || 'No registrada'
        },
        {
          label: 'Base en tierra',
          value: centroInfo.base_tierra ? 'Sí' : 'No'
        },
        {
          label: 'Correo principal',
          value: centroInfo.correo_centro || 'No especificado'
        },
        {
          label: 'Teléfono',
          value: centroInfo.telefono || 'No especificado'
        }
      ]
    : [];

  const centerStats = centroInfo
    ? [
        {
          label: 'Radares',
          value: centroInfo.cantidad_radares || 0,
          icon: 'fas fa-broadcast-tower'
        },
        {
          label: 'Cámaras',
          value: centroInfo.cantidad_camaras || 0,
          icon: 'fas fa-video'
        },
        rolUsuario === 'admin'
          ? {
              label: 'Valor contrato',
              value: centroInfo.valor_contrato || 'No especificado',
              icon: 'fas fa-file-signature'
            }
          : null
      ].filter(Boolean)
    : [];

  return (
    <div className="consulta-centro-page">
      {/* HEADER */}
      <div className="consulta-header">
        <div>
          <h2>Consulta de Centros</h2>
          <p>Selecciona un cliente y explora el historial operativo de cada centro.</p>
        </div>
        {centroInfo && selectedCentro && (
          <div className="consulta-header-badge">
            <span>Centro activo</span>
            <strong>{centroInfo.nombre}</strong>
          </div>
        )}
      </div>

      {error && <div className="consulta-alert">{error}</div>}

      {/* FILTROS */}
      <div className="consulta-card consulta-filters">
        <div className="filter-group">
          <label htmlFor="clientes">Seleccionar cliente</label>
          <select
            id="clientes"
            className="filter-select"
            value={selectedCliente || ''}
            onChange={(e) => handleClienteChange(e.target.value)}
          >
            <option value="">Seleccione un cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id_cliente} value={cliente.id_cliente}>
                {cliente.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={`filter-group ${!selectedCliente ? 'disabled' : ''}`}>
          <label htmlFor="centros">Seleccionar centro</label>
          <select
            id="centros"
            className="filter-select"
            value={selectedCentro || ''}
            onChange={(e) => handleCentroChange(e.target.value)}
            disabled={!selectedCliente}
          >
            <option value="">Seleccione un centro</option>
            {centros.map((centro) => (
              <option
                key={centro.id_centro || centro.id}
                value={centro.id_centro || centro.id}
                style={{ color: estadoVisual(centro.estado).color }}
              >
                {centro.nombre}
                {centro.estado ? ` - ${estadoVisual(centro.estado).label}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* CONTENIDO PRINCIPAL */}
      {selectedCentro && historial ? (
        <div className="consulta-grid">
          {/* TARJETA: INFORMACIÓN DEL CENTRO */}
          <div className="consulta-card info-card">
            <div className="card-title card-title-center">
              <div>
                <span className="card-kicker">Centro seleccionado</span>
                <h4 className="mb-0">{centroInfo?.nombre || 'Sin nombre'}</h4>
                {centroInfo?.codigo_centro && (
                  <small className="text-muted">Código: {centroInfo.codigo_centro}</small>
                )}
              </div>
              <div className="info-status-block">
                <span
                  className={`status-pill status-${(centroInfo?.estado || 'Sin estado')
                    .toLowerCase()
                    .replace(/\s+/g, '-')}`}
                >
                  {centroInfo?.estado || 'Sin estado'}
                </span>
                {centroInfo?.base_tierra && (
                  <span className="tag-pill">
                    <i className="fas fa-home mr-1" />
                    Base tierra
                  </span>
                )}
              </div>
            </div>

            {/* 🔽 AQUÍ VA LA FICHA DE CLIENTE/UBICACIÓN/ETC, DEBAJO DEL NOMBRE */}
            <div className="info-overview info-overview-table">
              {centerMeta.map((meta) => (
                <div className="meta-row" key={meta.label}>
                  <span className="meta-label">{meta.label}</span>
                  <span className="meta-value">{meta.value}</span>
                </div>
              ))}
            </div>

            {/* Stats: radares, cámaras, valor contrato */}
            <div className="info-stats-grid">
              {centerStats.map((stat) => (
                <div className="info-stat" key={stat.label}>
                  <div className="info-stat-icon">
                    <i className={stat.icon} />
                  </div>
                  <div className="info-stat-text">
                    <span>{stat.label}</span>
                    <p>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div className="consulta-actions">
              <button className="btn btn-success" onClick={() => setShowModal(true)}>
                <i className="fas fa-network-wired mr-2" />
                Ver IPs
              </button>

              {inventario.length > 0 ? (
                <button
                  className="btn btn-warning"
                  onClick={() => window.open(inventario[0].documento, '_blank')}
                >
                  <i className="fas fa-clipboard-list mr-2" />
                  Ver inventario
                </button>
              ) : (
                <button className="btn btn-secondary" disabled>
                  <i className="fas fa-clipboard-list mr-2" />
                  Sin inventario
                </button>
              )}

              <button
                className="btn btn-danger"
                onClick={() => obtenerHistorialCentroPDF(selectedCentro)}
              >
                <i className="fas fa-file-pdf mr-2" />
                PDF historial
              </button>
            </div>
          </div>

          {/* TARJETA: HISTORIAL */}
          <div className="consulta-card timeline-card">
            <div className="card-title">
              <h4>Historial del centro</h4>
              <small>{totalEventos} eventos</small>
            </div>

            <div className="consulta-timeline">
              {timelineSections.map((section) => (
                <div className="timeline-section" key={section.key}>
                  <div className="timeline-section-header">
                    <span className={`timeline-badge ${section.color}`}>
                      <i className={section.icon} />
                    </span>
                    <h5>{section.title}</h5>
                  </div>
                  {section.items.length > 0 ? (
                    section.items.map((item) => (
                      <div
                        className="timeline-item"
                        key={`${section.key}-${item[section.idField] || Math.random()}`}
                      >
                        <span className="timeline-date">
                          {formatearFecha(item[section.dateField])}
                        </span>
                        {renderDocumento(item.documento)}
                        {renderExtraInfo(section.key, item)}
                      </div>
                    ))
                  ) : (
                    <p className="timeline-empty">Sin registros</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="consulta-empty-state">
          <i className="fas fa-map-marked-alt" />
          <h5>Explora la información de un centro</h5>
          <p>
            Selecciona un cliente y luego un centro para cargar su historial y acciones
            disponibles.
          </p>
        </div>
      )}

      {/* MODAL IPs */}
      {showModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Direcciones IP</h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setShowModal(false)}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ background: '#f8fafc' }}>
                {centroInfo && (
                  <div
                    style={{
                      border: '1px solid #dbe4f3',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      background: '#fff'
                    }}
                  >
                    <h6 className="mb-1 text-primary">
                      <i className="fas fa-map-marker-alt mr-2" />
                      {centroInfo.nombre}
                    </h6>
                    <small className="text-muted">
                      {centroInfo.ubicacion || 'Ubicación no registrada'}
                    </small>
                  </div>
                )}

                {ipList.length > 0 ? (
                  ipList.map((ip) => (
                    <div
                      key={ip.id_equipo}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        marginBottom: '12px',
                        background: '#fff',
                        boxShadow: '0 1px 2px rgba(15,23,42,0.06)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <div>
                          <h6 className="mb-1" style={{ fontWeight: 600 }}>
                            {ip.nombre || 'Equipo sin nombre'}
                          </h6>
                          {ip.observacion && (
                            <small className="text-muted">{ip.observacion}</small>
                          )}
                        </div>
                        <span
                          style={{
                            background: '#0ea5e9',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          {ip.ip || 'Sin IP'}
                        </span>
                      </div>
                      {ip.codigo && (
                        <div style={{ marginTop: '6px' }}>
                          <small className="text-muted">Código:</small>{' '}
                          <strong>{ip.codigo}</strong>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted mb-0">
                    Sin direcciones IP registradas para este centro.
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultaCentro;
