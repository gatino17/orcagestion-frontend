import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { obtenerDocumentoCentro } from '../api';
import { resolverDocumentoCentro } from '../utils/documentosCentro';
import './VisorDocumentoCentro.css';

export default function VisorDocumentoCentro({ documento, onClose }) {
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  const dialogo = useRef(null);
  const cerrar = useRef(onClose);
  cerrar.current = onClose;

  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogo.current?.querySelector('button')?.focus();
    const teclado = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); cerrar.current(); }
      if (event.key !== 'Tab') return;
      const controles = dialogo.current?.querySelectorAll('button:not(:disabled), a[href], iframe, [tabindex="0"]');
      if (!controles?.length) return;
      const primero = controles[0], ultimo = controles[controles.length - 1];
      if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus(); }
      else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', teclado);
    return () => {
      document.removeEventListener('keydown', teclado);
      document.body.style.overflow = overflow;
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    let url;
    setArchivo(null); setError(''); setCargando(true);
    const cargar = async () => {
      try {
        const blob = await (documento.cargar ? documento.cargar() : obtenerDocumentoCentro(resolverDocumentoCentro(documento.url)));
        if (!vigente) return;
        if (!(blob instanceof Blob) || !blob.size || /^(text\/html|application\/json)/i.test(blob.type)) {
          throw new Error('El servidor no devolvio un documento valido.');
        }
        url = URL.createObjectURL(blob);
        setArchivo({ url, tipo: blob.type.toLowerCase() });
      } catch (err) {
        let mensaje = err.response?.data?.error || err.response?.data?.message;
        if (!mensaje && err.response?.data instanceof Blob) {
          try { const data = JSON.parse(await err.response.data.text()); mensaje = data.error || data.message; } catch { /* El proxy puede devolver HTML. */ }
        }
        if (vigente) setError(typeof mensaje === 'string' ? mensaje : 'No se pudo abrir el documento. Comprueba que el archivo exista en este servidor.');
      } finally { if (vigente) setCargando(false); }
    };
    cargar();
    return () => { vigente = false; if (url) URL.revokeObjectURL(url); };
  }, [documento, intento]);

  const esPdf = archivo?.tipo.startsWith('application/pdf');
  const esImagen = /^image\/(jpeg|png|webp|gif|bmp)(?:;|$)/.test(archivo?.tipo || '');
  const extension = esPdf ? '.pdf' : esImagen ? '.' + archivo.tipo.split('/')[1].split(';')[0] : '';
  const nombre = String(documento.titulo || 'Documento').replace(/[\\/:*?"<>|]/g, '_').slice(0, 150);
  return createPortal(<div className="consulta-visor-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogo} role="dialog" aria-modal="true" aria-labelledby="consulta-visor-titulo" className="consulta-visor">
      <header className="consulta-visor__header">
        <div><small>VISTA PREVIA DEL DOCUMENTO</small><h5 id="consulta-visor-titulo">{documento.titulo || 'Documento del centro'}</h5></div>
        <button type="button" className="btn btn-light" aria-label="Cerrar vista previa" onClick={onClose}>&times;</button>
      </header>
      <div className="consulta-visor__body">
        {cargando && <p role="status"><i className="fas fa-spinner fa-spin mr-2" aria-hidden="true" />Cargando documento...</p>}
        {error && <div className="alert alert-danger m-3" role="alert">{error}<button type="button" className="btn btn-outline-danger btn-sm ml-3" onClick={() => setIntento((valor) => valor + 1)}>Reintentar</button></div>}
        {archivo && (esPdf ? <iframe src={archivo.url} title={`Vista previa de ${documento.titulo || 'documento PDF'}`} />
          : esImagen ? <img src={archivo.url} alt={documento.titulo || 'Documento del centro'} />
            : <p className="m-4">Este formato no tiene vista previa. Puedes descargarlo para abrirlo en tu equipo.</p>)}
      </div>
      <footer className="consulta-visor__footer">
        {archivo && <a href={archivo.url} download={nombre.toLowerCase().endsWith(extension) ? nombre : nombre + extension} className="btn btn-outline-primary"><i className="fas fa-download mr-2" aria-hidden="true" />Descargar</a>}
        <button type="button" className="btn btn-primary" onClick={onClose}>Cerrar</button>
      </footer>
    </section>
  </div>, document.body);
}
