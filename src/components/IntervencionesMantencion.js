import React, { useEffect, useState } from 'react';
import { obtenerIntervencionesMantencion, vincularDocumentoMantencion, desvincularDocumentoMantencion, descargarDocumentoMantencionActas } from '../api';

export function DocumentosIntervencion({ documentos = [] }) {
  const disponibles = documentos.filter((doc) => doc.disponible);
  return <div className="mb-2">
    <span className={`badge ${disponibles.length ? 'bg-success' : 'bg-danger'} text-white`}>
      {disponibles.length ? 'Documentacion disponible' : 'Falta documento'}
    </span>
    {disponibles.map((doc) => <div className="mt-1" key={`${doc.tipo}-${doc.id}`}>
      {doc.tipo === 'manual'
        ? <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => descargarDocumentoMantencionActas(doc.id)}>Ver documento manual #{doc.id}</button>
        : <a className="btn btn-sm btn-outline-primary" href={`/informes-centros?mantencion=${doc.id}&centro_id=${doc.centro_id}`} target="_blank" rel="noopener noreferrer">Consultar informe sistema #{doc.id}</a>}
    </div>)}
  </div>;
}

export function ResumenIntervencionesMantencion({ resumen }) {
  if (!resumen) return null;
  return <div className="mt-2">
    <strong>{resumen.intervenciones} {resumen.intervenciones === 1 ? 'intervencion' : 'intervenciones'}</strong>
    <p className="mb-1">{resumen.soportes} {resumen.soportes === 1 ? 'registro soporte' : 'registros soporte'}</p>
    {resumen.sin_documento > 0
      ? <span className="badge bg-danger text-white">Falta documento: {resumen.sin_documento}</span>
      : resumen.soportes > 0 && <span className="badge bg-success text-white">Soportes documentados</span>}
  </div>;
}

export default function IntervencionesMantencion({ centroId, onChange, onAdjuntar, revision = 0, bloqueado = false }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setGuardando] = useState(false);
  const guardando = enviando || bloqueado;
  const [selecciones, setSelecciones] = useState({});
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    setCargando(true); setError(''); setDatos(null); setSelecciones({});
    obtenerIntervencionesMantencion(centroId).then((data) => {
      if (vigente) setDatos(data);
    }).catch(() => {
      if (vigente) setError('No se pudieron cargar las intervenciones.');
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [centroId, intento, revision]);

  const guardar = async (operacion) => {
    if (guardando) return;
    setGuardando(true); setError('');
    try {
      await operacion();
      setIntento((valor) => valor + 1);
      if (onChange) await onChange();
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo actualizar el vinculo.');
    } finally { setGuardando(false); }
  };
  const soportes = datos?.items?.filter((item) => item.es_soporte_terreno) || [];
  const disponibles = datos?.disponibles?.filter((doc) => doc.disponible) || [];
  return <section className="mt-4" aria-label="Intervenciones de mantencion">
    <h5>Intervenciones y respaldo documental</h5>
    <p className="text-muted">Adjunta el documento al soporte correspondiente. Si ya lo registraste, selecciona ese documento para vincularlo sin volver a cargarlo.</p>
    {error && <p className="text-danger" role="alert">{error}</p>}
    {cargando ? <p role="status">Cargando intervenciones...</p> : datos ? <>
      <ResumenIntervencionesMantencion resumen={datos.resumen} />
      {soportes.length ? <ul className="list-group mt-2">{soportes.map((soporte) => <li className="list-group-item" key={soporte.id_soporte}>
        <strong>Mantencion en terreno · Soporte #{soporte.id_soporte}</strong>
        <p className="mb-1">{soporte.fecha_mantencion} · {soporte.problema}</p>
        {soporte.solucion && <p className="mb-1"><strong>Solucion:</strong> {soporte.solucion}</p>}
        <DocumentosIntervencion documentos={soporte.documentos} />
        {onAdjuntar && <button type="button" className="btn btn-outline-primary mb-2" disabled={guardando || cargando}
          onClick={() => onAdjuntar(soporte)}>Adjuntar documento al soporte #{soporte.id_soporte}</button>}
        {soporte.documentos.map((doc) => doc.vinculo_id ? <button key={doc.vinculo_id} type="button" className="btn btn-sm btn-outline-secondary mb-2 mr-2" disabled={guardando || cargando}
          onClick={() => guardar(() => desvincularDocumentoMantencion(soporte.id_soporte, doc.vinculo_id))}>
          Desvincular {doc.tipo} #{doc.id}
        </button> : <p className="small text-muted" key={`${doc.tipo}-${doc.id}`}>Informe #{doc.id} vinculado por su actividad de calendario.</p>)}
        {disponibles.length ? <>
        <h6 className="mt-2">Usar un documento ya registrado</h6>
        <label className="d-block" htmlFor={`documento-soporte-${soporte.id_soporte}`}>Documento de esta intervencion</label>
        <div className="d-flex flex-wrap" style={{ gap: 8 }}>
          <select className="form-control" style={{ flex: '1 1 240px' }} id={`documento-soporte-${soporte.id_soporte}`} value={selecciones[soporte.id_soporte] || ''} disabled={guardando || cargando}
            onChange={(e) => setSelecciones((actual) => ({ ...actual, [soporte.id_soporte]: e.target.value }))}>
            <option value="">Selecciona un documento sin asociar</option>
            {disponibles.map((doc) => <option key={`${doc.tipo}-${doc.id}`} value={`${doc.tipo}:${doc.id}`}>
              {doc.tipo === 'manual' ? 'Manual' : 'Sistema'} #{doc.id} · {doc.fecha || 'Sin fecha'} · {doc.responsable || 'Sin responsable'}
            </option>)}
          </select>
          <button type="button" className="btn btn-primary"
            style={{ cursor: enviando ? 'wait' : guardando || cargando || !selecciones[soporte.id_soporte] ? 'default' : 'pointer' }}
            disabled={guardando || cargando || !selecciones[soporte.id_soporte]} onClick={() => {
            const [tipo, id] = selecciones[soporte.id_soporte].split(':');
            guardar(() => vincularDocumentoMantencion(soporte.id_soporte, { tipo, documento_id: Number(id) }));
          }}>{enviando ? 'Vinculando...' : 'Vincular documento'}</button>
        </div>
        {!selecciones[soporte.id_soporte] && <small className="text-muted">Selecciona un documento para habilitar el vinculo.</small>}
        </> : <p className="small text-muted mb-0">No hay documentos sin asociar. {onAdjuntar ? 'Usa Adjuntar documento para cargar uno nuevo.' : 'Carga primero el documento manual o registra el informe del sistema.'}</p>}
      </li>)}</ul> : <p>Sin soportes de terreno registrados.</p>}
    </> : null}
    {!cargando && error && <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setIntento((valor) => valor + 1)}>Reintentar intervenciones</button>}
  </section>;
}
