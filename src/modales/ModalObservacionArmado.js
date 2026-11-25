import React, { useEffect, useRef, useState } from 'react';
import { guardarObservacionArmado, obtenerImagenObservacionArmado, obtenerObservacionArmado } from '../api';
import './ModalObservacionArmado.css';

const MAX_IMAGEN = 5 * 1024 * 1024;

function VistaPrevia({ archivo, imagen, armadoId, posicion }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    let objectUrl;
    setUrl(''); setError(false);
    const cargar = async () => {
      try {
        const blob = archivo || await obtenerImagenObservacionArmado(armadoId, imagen.id_imagen);
        if (!vigente) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (vigente) setError(true);
      }
    };
    cargar();
    return () => { vigente = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [archivo, imagen, armadoId, intento]);
  if (error) return <button type="button" className="armado-adjunto__preview armado-adjunto__retry" title="No se pudo cargar la imagen. Reintentar."
    aria-label={`Reintentar imagen ${posicion}`} onClick={() => setIntento((n) => n + 1)}><i className="fas fa-redo" aria-hidden="true" /></button>;
  if (!url) return <div className="armado-adjunto__preview armado-adjunto__loading" role="status"><span className="spinner-border spinner-border-sm" /><span className="sr-only">Cargando imagen {posicion}...</span></div>;
  return <a className="armado-adjunto__preview" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Ver imagen ${posicion} ampliada`} title="Ampliar imagen">
    <img src={url} alt={`Imagen ${posicion} de la observacion`} />
  </a>;
}

export default function ModalObservacionArmado({ armadoId, centro, onClose, onSaved }) {
  const [texto, setTexto] = useState('');
  const [imagenes, setImagenes] = useState([]);
  const [archivos, setArchivos] = useState({});
  const [titulos, setTitulos] = useState({});
  const [eliminar, setEliminar] = useState({});
  const [cargando, setCargando] = useState(true);
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const guardandoRef = useRef(false);
  const inputsRef = useRef({});
  const cantidadImagenes = [1, 2].filter((posicion) => archivos[posicion] ||
    (imagenes.some((imagen) => imagen.posicion === posicion) && !eliminar[posicion])).length;
  useEffect(() => {
    let vigente = true;
    setCargando(true); setCargado(false); setError('');
    obtenerObservacionArmado(armadoId).then((data) => {
      if (!vigente) return;
      setTexto(data.observacion || ''); setImagenes(data.imagenes || []);
      setTitulos(Object.fromEntries((data.imagenes || []).map((imagen) => [imagen.posicion, imagen.nombre || ''])));
      setArchivos({}); setEliminar({}); setCargado(true);
    }).catch((err) => {
      if (vigente) setError(err.response?.data?.message || 'No se pudo cargar la observacion. Reintenta antes de editar.');
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [armadoId, intento]);

  const seleccionar = (posicion, input) => {
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > MAX_IMAGEN) {
      setError('Adjunta imagenes JPG, PNG o WebP de hasta 5 MB cada una.');
      input.value = '';
      return;
    }
    setError('');
    setArchivos((prev) => ({ ...prev, [posicion]: file }));
    setEliminar((prev) => ({ ...prev, [posicion]: false }));
  };
  const guardar = async () => {
    if (!cargado || guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true); setError('');
    try {
      const data = new FormData();
      data.append('observacion', texto);
      for (const posicion of [1, 2]) {
        if (archivos[posicion]) data.append(`imagen_${posicion}`, archivos[posicion]);
        else if (eliminar[posicion]) data.append(`eliminar_${posicion}`, 'true');
        if (!eliminar[posicion] && (archivos[posicion] || imagenes.some((imagen) => imagen.posicion === posicion))) {
          data.append(`titulo_${posicion}`, titulos[posicion] || '');
        }
      }
      const resultado = await guardarObservacionArmado(armadoId, data);
      onSaved(resultado);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar la observacion. Conservamos tus cambios para reintentar.');
    } finally { guardandoRef.current = false; setGuardando(false); }
  };
  return <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="titulo-observacion-armado" style={{ zIndex: 1080, background: 'rgba(15, 23, 42, .4)' }}>
    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title" id="titulo-observacion-armado"><i className="fas fa-comment-alt mr-2" />Observacion - {centro || 'Armado'}</h5>
          <button type="button" className="close" aria-label="Cerrar observacion" onClick={onClose} disabled={guardando}><span>&times;</span></button>
        </div>
        <div className="modal-body">
          {cargando && <p role="status">Cargando observacion...</p>}
          {error && <p role="alert" className="alert alert-danger">{error}</p>}
          {!cargando && !cargado && <button type="button" className="btn btn-outline-primary" onClick={() => setIntento((n) => n + 1)}>Reintentar carga</button>}
          <fieldset disabled={cargando || !cargado || guardando}>
            <label htmlFor="texto-observacion-armado" className="mb-2 font-weight-bold">Texto de observacion</label>
            <textarea id="texto-observacion-armado" className="form-control" rows={4} maxLength={10000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe la observacion del armado..." />
            <section className="armado-adjuntos" aria-label="Imagenes de respaldo">
              <div className="armado-adjuntos__header"><span>Imagenes de respaldo <span className="armado-adjuntos__count" aria-label={`${cantidadImagenes} de 2 imagenes adjuntas`}>{cantidadImagenes}/2</span></span><small>JPG, PNG o WebP. Hasta 5 MB.</small></div>
              <div className="armado-adjuntos__grid">
              {[1, 2].map((posicion) => {
                const imagen = imagenes.find((i) => i.posicion === posicion);
                const archivo = archivos[posicion];
                const tieneImagen = Boolean(archivo || (imagen && !eliminar[posicion]));
                const nombre = titulos[posicion] || archivo?.name || imagen?.nombre;
                return <div className={`armado-adjunto${tieneImagen ? ' armado-adjunto--filled' : ''}${eliminar[posicion] ? ' armado-adjunto--removed' : ''}`} key={posicion}>
                  <input ref={(input) => { inputsRef.current[posicion] = input; }} key={archivo ? archivo.name : `vacio-${posicion}`}
                    id={`imagen-observacion-${posicion}`} aria-label={`Imagen ${posicion} (opcional)`} type="file" tabIndex={-1}
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="armado-adjunto__input" onChange={(e) => seleccionar(posicion, e.target)} />
                  {tieneImagen ? <>
                    <VistaPrevia archivo={archivo} imagen={imagen} armadoId={armadoId} posicion={posicion} />
                    <div className="armado-adjunto__details">
                      <span className="armado-adjunto__label">Imagen {posicion}{archivo && <span className="armado-adjunto__new">Nueva</span>}</span>
                      <input type="text" className="armado-adjunto__title" aria-label={`Titulo de imagen ${posicion}`} title={nombre}
                        value={titulos[posicion] || ''} maxLength={200} placeholder="Ej. Plano del sistema"
                        onChange={(e) => setTitulos((prev) => ({ ...prev, [posicion]: e.target.value }))} />
                      <div className="armado-adjunto__actions">
                        <button type="button" aria-label={`Reemplazar imagen ${posicion}`} title="Reemplazar imagen" onClick={() => inputsRef.current[posicion]?.click()}><i className="fas fa-pen" aria-hidden="true" /></button>
                        <button type="button" className="armado-adjunto__remove" aria-label={archivo ? `Descartar nueva imagen ${posicion}` : `Quitar imagen ${posicion}`}
                          title={archivo ? 'Descartar seleccion' : 'Quitar imagen'} onClick={() => archivo
                            ? setArchivos((prev) => ({ ...prev, [posicion]: null }))
                            : setEliminar((prev) => ({ ...prev, [posicion]: true }))}><i className={`fas ${archivo ? 'fa-times' : 'fa-trash-alt'}`} aria-hidden="true" /></button>
                      </div>
                    </div>
                  </> : eliminar[posicion] ? <div className="armado-adjunto__removed">
                    <i className="far fa-image" aria-hidden="true" /><span>Se quitara al guardar</span>
                    <button type="button" aria-label={`Conservar imagen ${posicion}`} onClick={() => setEliminar((prev) => ({ ...prev, [posicion]: false }))}>Deshacer</button>
                  </div> : <button type="button" className="armado-adjunto__upload" aria-label={`Adjuntar imagen ${posicion}`} onClick={() => inputsRef.current[posicion]?.click()}>
                    <span className="armado-adjunto__upload-icon"><i className="fas fa-plus" aria-hidden="true" /></span><span><strong>Adjuntar imagen</strong><small>Opcional</small></span>
                  </button>}
                </div>;
              })}
              </div>
            </section>
          </fieldset>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={guardar} disabled={cargando || !cargado || guardando}>{guardando ? 'Guardando...' : 'Guardar observacion'}</button>
        </div>
      </div>
    </div>
  </div>;
}
