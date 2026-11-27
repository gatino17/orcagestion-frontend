import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL, obtenerLevantamientosActas, registrarLevantamientoActas, modificarLevantamientoActas } from '../api';
import './RegistroInstalacionManual.css';

const fechaInput = (valor) => {
  if (!valor) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10);
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toISOString().slice(0, 10);
};
const urlDocumento = (id) => `${(API_BASE_URL || '/api').replace(/\/$/, '')}/filtro/documento/Levantamientos/${id}`;

export default function RegistroLevantamientoManual({ actividad, onSaved, onBusyChange }) {
  const [registros, setRegistros] = useState([]);
  const [actualId, setActualId] = useState(null);
  const [fecha, setFecha] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [revision, setRevision] = useState(0);
  const archivoRef = useRef(null);
  const enviando = useRef(false);
  const seleccionado = useRef(null);
  const actual = registros.find((item) => item.id_levantamiento === actualId);
  const centroId = actividad.id_centro;

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCarga('');
    obtenerLevantamientosActas(centroId).then((data) => {
      if (!vigente) return;
      if (!Array.isArray(data)) throw new Error('Listado invalido.');
      const propios = data
        .filter((item) => String(item.centro_id) === String(centroId))
        .sort((a, b) => b.id_levantamiento - a.id_levantamiento);
      const registro = propios.find((item) => item.id_levantamiento === seleccionado.current) || propios[0];
      setRegistros(propios);
      seleccionado.current = registro?.id_levantamiento ?? null;
      setActualId(seleccionado.current);
      setFecha(fechaInput(registro?.fecha_levantamiento || actividad.levantamiento_fecha));
    }).catch(() => {
      if (vigente) setErrorCarga('No se pudieron cargar los levantamientos. Reintenta antes de guardar.');
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [centroId, revision, actividad.levantamiento_fecha]);

  const quitarArchivo = () => {
    setArchivo(null);
    if (archivoRef.current) archivoRef.current.value = '';
  };
  const seleccionarArchivo = (event) => {
    const elegido = event.target.files[0];
    if (!elegido) return;
    setError('');
    setAviso('');
    if (!/\.(pptx?|pdf|png|jpe?g)$/i.test(elegido.name) || !elegido.size || elegido.size > 25 * 1024 * 1024) {
      quitarArchivo();
      setError('Selecciona un PowerPoint (.ppt o .pptx), PDF, JPG o PNG con contenido y de hasta 25 MB.');
      return;
    }
    setArchivo(elegido);
  };
  const guardar = async () => {
    if (enviando.current || cargando || errorCarga) return;
    setAviso('');
    if (!fecha) { setError('Indica la fecha del levantamiento.'); return; }
    if (!archivo && !actual?.documento_asociado) { setError('Adjunta el documento del levantamiento.'); return; }
    setError('');
    enviando.current = true;
    setGuardando(true);
    onBusyChange(true);
    const data = new FormData();
    data.append('centro_id', centroId);
    data.append('fecha_levantamiento', fecha);
    if (archivo) data.append('documento_asociado', archivo);
    try {
      if (actual) await modificarLevantamientoActas(actual.id_levantamiento, data);
      else await registrarLevantamientoActas(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar. Tus datos se mantienen para reintentar.');
      return;
    } finally {
      enviando.current = false;
      setGuardando(false);
      onBusyChange(false);
    }
    quitarArchivo();
    setAviso('Levantamiento guardado. El documento ya esta disponible para consulta.');
    setRevision((valor) => valor + 1);
    onSaved();
  };

  return <section className="instalacion-manual" aria-label="Registro manual de levantamiento">
    <header className="instalacion-manual__header">
      <span className="instalacion-manual__icon" aria-hidden="true"><i className="fas fa-drafting-compass" /></span>
      <div><span className="instalacion-manual__eyebrow">RESPALDO DOCUMENTAL</span>
        <h5>Levantamiento</h5><p>Guarda la presentacion, planos o antecedentes del centro en un solo lugar.</p></div>
    </header>
    {cargando && <p role="status">Cargando levantamientos...</p>}
    {errorCarga && <div className="alert alert-danger" role="alert">{errorCarga} <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRevision((valor) => valor + 1)}>Reintentar</button></div>}
    <fieldset className="instalacion-manual__fields" disabled={cargando || guardando || Boolean(errorCarga)}>
      <div className="instalacion-manual__dates"><div>
        <label htmlFor="levantamiento-fecha">Fecha del levantamiento <span aria-hidden="true">*</span></label>
        <input id="levantamiento-fecha" type="date" required className="form-control" value={fecha} onChange={(event) => setFecha(event.target.value)} />
      </div></div>
      <label htmlFor="levantamiento-documento">Documento del levantamiento</label>
      <div className="instalacion-manual__upload">
        <i className={`fas ${/\.pptx?$/i.test(archivo?.name || actual?.documento_asociado || '') ? 'fa-file-powerpoint' : 'fa-paperclip'}`} aria-hidden="true" />
        <div><strong>{archivo ? archivo.name : actual?.documento_asociado ? 'Documento adjunto' : 'Adjunta la presentacion o respaldo'}</strong>
          <small>{archivo ? `${(archivo.size / 1024 / 1024).toFixed(2)} MB - Listo para guardar` : 'PowerPoint (.ppt, .pptx), PDF, JPG o PNG. Maximo 25 MB.'}</small></div>
        <input id="levantamiento-documento" type="file" className="sr-only visually-hidden" accept=".ppt,.pptx,.pdf,.jpg,.jpeg,.png" ref={archivoRef} onChange={seleccionarArchivo} />
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => archivoRef.current.click()}>{archivo || actual?.documento_asociado ? 'Cambiar archivo' : 'Elegir archivo'}</button>
        {archivo && <button type="button" className="btn btn-sm btn-link" onClick={quitarArchivo}>Quitar seleccion</button>}
      </div>
      <p className="instalacion-manual__existing text-muted">Los archivos PowerPoint se descargan para abrirlos en tu equipo.</p>
      {actual?.documento_asociado && <p className="instalacion-manual__existing"><a href={urlDocumento(actual.id_levantamiento)} target="_blank" rel="noopener noreferrer"><i className="fas fa-external-link-alt mr-1" aria-hidden="true" />Abrir documento actual</a><small> Se conserva si no eliges otro archivo.</small></p>}
      {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
      <div className="instalacion-manual__actions"><small>{actual ? 'Los cambios actualizan el levantamiento seleccionado, sin duplicarlo.' : 'El respaldo quedara asociado a este centro.'}</small>
        <button type="button" className="btn btn-primary" onClick={guardar}>{guardando ? 'Guardando...' : actual ? 'Guardar cambios' : 'Guardar levantamiento'}</button></div>
    </fieldset>
    {aviso && <div className="alert alert-success mb-0 mt-3" role="status">{aviso}</div>}
    {!cargando && !errorCarga && registros.length > 0 && <div className="instalacion-manual__records">
      <h6>Levantamientos registrados <span>{registros.length}</span></h6>
      {registros.map((registro) => <article key={registro.id_levantamiento}>
        <div><strong>{fechaInput(registro.fecha_levantamiento).split('-').reverse().join('/') || 'Sin fecha'}</strong><small>Registro #{registro.id_levantamiento}{registro.id_levantamiento === actualId ? ' - En edicion' : ''}</small></div>
        <div className="d-flex flex-wrap" style={{ gap: '8px' }}>
          {registro.id_levantamiento !== actualId && <button type="button" className="btn btn-sm btn-outline-secondary" disabled={guardando} onClick={() => { seleccionado.current = registro.id_levantamiento; setActualId(registro.id_levantamiento); setFecha(fechaInput(registro.fecha_levantamiento)); quitarArchivo(); setError(''); setAviso(''); }}>Editar</button>}
          {registro.documento_asociado ? <a className="btn btn-sm btn-outline-primary" href={urlDocumento(registro.id_levantamiento)} target="_blank" rel="noopener noreferrer">Abrir documento</a> : <span className="text-muted">Sin documento</span>}
        </div>
      </article>)}
    </div>}
  </section>;
}
