import React, { useEffect, useRef, useState } from 'react';
import { obtenerInstalacionesActas, registrarInstalacionActas } from '../api';
import { urlDocumentoInstalacion } from '../utils/documentosInstalacion';
import './RegistroInstalacionManual.css';

const fechaInput = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};
const fechaTexto = (value) => {
  const fecha = fechaInput(value);
  return fecha ? fecha.split('-').reverse().join('/') : 'Sin fecha';
};

export default function RegistroInstalacionManual({ actividad, onSaved, onBusyChange }) {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [revision, setRevision] = useState(0);
  const [fecha, setFecha] = useState('');
  const [monitoreo, setMonitoreo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const archivoRef = useRef(null);
  const enviando = useRef(false);
  const actual = registros[0];
  const centroId = actividad.id_centro;

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCarga('');
    obtenerInstalacionesActas(centroId).then((data) => {
      if (!vigente) return;
      const propios = (Array.isArray(data) ? data : [])
        .filter((item) => String(item.centro_id) === String(centroId))
        .sort((a, b) => a.id_instalacion - b.id_instalacion);
      const primero = propios[0];
      setRegistros(propios);
      setFecha(fechaInput(primero?.fecha_instalacion || actividad.instalacion_fecha || actividad.centro_fecha_instalacion || actividad.fecha_instalacion));
      setMonitoreo(fechaInput(primero?.inicio_monitoreo || actividad.inicio_monitoreo));
      setObservacion(primero?.observacion || '');
    }).catch(() => {
      if (vigente) setErrorCarga('No se pudo cargar el registro de instalacion. Reintenta antes de guardar.');
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [centroId, revision, actividad.instalacion_fecha, actividad.centro_fecha_instalacion, actividad.fecha_instalacion, actividad.inicio_monitoreo]);

  const seleccionarArchivo = (event) => {
    const elegido = event.target.files[0];
    setError('');
    setAviso('');
    if (!elegido) return;
    if (!/\.(pdf|png|jpe?g)$/i.test(elegido.name) || !elegido.size || elegido.size > 10 * 1024 * 1024) {
      setError('Selecciona un PDF, JPG o PNG con contenido y de hasta 10 MB.');
      event.target.value = '';
      return;
    }
    setArchivo(elegido);
  };

  const guardar = async () => {
    if (enviando.current || cargando || errorCarga) return;
    setAviso('');
    if (!fecha) { setError('Indica la fecha de instalacion.'); return; }
    if (!archivo && !actual?.documento_acta) { setError('Adjunta el documento de instalacion.'); return; }
    setError('');
    enviando.current = true;
    setGuardando(true);
    onBusyChange(true);
    const data = new FormData();
    data.append('centro_id', centroId);
    data.append('fecha_instalacion', fecha);
    if (monitoreo) data.append('inicio_monitoreo', monitoreo);
    data.append('observacion', observacion.trim());
    if (archivo) data.append('documento_acta', archivo);
    try {
      await registrarInstalacionActas(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar. Tus datos se mantienen para reintentar.');
      return;
    } finally {
      enviando.current = false;
      setGuardando(false);
      onBusyChange(false);
    }
    setArchivo(null);
    if (archivoRef.current) archivoRef.current.value = '';
    setAviso('Instalacion guardada. El documento ya esta disponible en el historial del centro.');
    setRevision((value) => value + 1);
    onSaved();
  };

  return (
    <section className="instalacion-manual" aria-label="Registro manual de instalacion">
      <header className="instalacion-manual__header">
        <span className="instalacion-manual__icon" aria-hidden="true"><i className="fas fa-file-upload" /></span>
        <div><span className="instalacion-manual__eyebrow">RESPALDO DOCUMENTAL</span>
          <h5>Instalacion manual</h5>
          <p>Adjunta el acta o respaldo para consultarlo desde el historial del centro.</p></div>
      </header>
      {cargando && <p role="status">Cargando instalacion...</p>}
      {errorCarga && <div role="alert" className="alert alert-danger">{errorCarga} <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRevision((value) => value + 1)}>Reintentar</button></div>}
      <fieldset disabled={cargando || guardando || Boolean(errorCarga)} className="instalacion-manual__fields">
        <div className="instalacion-manual__dates">
          <div><label htmlFor="instalacion-fecha">Fecha de instalacion <span aria-hidden="true">*</span></label>
            <input id="instalacion-fecha" type="date" required className="form-control" value={fecha} onChange={(event) => setFecha(event.target.value)} /></div>
          <div><label htmlFor="instalacion-monitoreo">Inicio de monitoreo <small>Opcional</small></label>
            <input id="instalacion-monitoreo" type="date" className="form-control" value={monitoreo} onChange={(event) => setMonitoreo(event.target.value)} />
            <small className="text-muted">Si lo omites, se usara la fecha de instalacion.</small></div>
        </div>
        <label htmlFor="instalacion-documento">Documento de instalacion</label>
        <div className="instalacion-manual__upload">
          <i className={`fas ${archivo ? 'fa-file-alt' : 'fa-paperclip'}`} aria-hidden="true" />
          <div><strong>{archivo ? archivo.name : actual?.documento_acta ? 'Documento adjunto' : 'Adjunta el respaldo de instalacion'}</strong>
            <small>{archivo ? `${(archivo.size / 1024).toFixed(0)} KB - Listo para guardar` : 'PDF, JPG o PNG. Maximo 10 MB.'}</small></div>
          <input id="instalacion-documento" className="sr-only visually-hidden" type="file" accept=".pdf,.png,.jpg,.jpeg" ref={archivoRef} onChange={seleccionarArchivo} />
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => archivoRef.current.click()}>{archivo || actual?.documento_acta ? 'Cambiar archivo' : 'Elegir archivo'}</button>
          {archivo && <button type="button" className="btn btn-sm btn-link" onClick={() => { setArchivo(null); archivoRef.current.value = ''; }}>Quitar seleccion</button>}
        </div>
        {actual?.documento_acta && <p className="instalacion-manual__existing"><a href={urlDocumentoInstalacion(actual.id_instalacion)} target="_blank" rel="noopener noreferrer"><i className="fas fa-external-link-alt mr-1" aria-hidden="true" />Abrir documento actual</a><small> Se conserva si no eliges otro archivo.</small></p>}
        <label htmlFor="instalacion-observacion">Observaciones <small>Opcional</small></label>
        <textarea id="instalacion-observacion" className="form-control" rows="3" value={observacion} onChange={(event) => setObservacion(event.target.value)} placeholder="Detalles de la instalacion o del documento adjunto." />
        {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
        <div className="instalacion-manual__actions"><small>{actual ? 'Los cambios actualizan el registro manual existente.' : 'Este registro es independiente de las actas del sistema.'}</small>
          <button type="button" className="btn btn-primary" onClick={guardar}>{guardando ? 'Guardando...' : actual ? 'Guardar cambios' : 'Guardar instalacion'}</button></div>
      </fieldset>
      {aviso && <div className="alert alert-success mb-0 mt-3" role="status">{aviso}</div>}
      {!cargando && !errorCarga && registros.length > 0 && <div className="instalacion-manual__records">
        <h6>Instalaciones manuales <span>{registros.length}</span></h6>
        {registros.map((registro) => <article key={registro.id_instalacion}>
          <div><strong>{fechaTexto(registro.fecha_instalacion)}</strong><small>Monitoreo: {fechaTexto(registro.inicio_monitoreo)}</small>
            {registro.observacion && <p>{registro.observacion}</p>}</div>
          {registro.documento_acta ? <a className="btn btn-sm btn-outline-primary" href={urlDocumentoInstalacion(registro.id_instalacion)} target="_blank" rel="noopener noreferrer">Abrir documento</a> : <span className="text-muted">Sin documento</span>}
        </article>)}
      </div>}
    </section>
  );
}
