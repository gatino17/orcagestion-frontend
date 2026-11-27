import React, { useEffect, useRef, useState } from 'react';
import { obtenerRespaldoLevantamientoArmado } from '../api';

export default function RespaldoLevantamientoArmado({ documento, onAbrir }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const vigente = useRef(true);
  const enviando = useRef(false);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  const abrir = async () => {
    if (onAbrir) {
      onAbrir({ titulo: documento.nombre, cargar: () => obtenerRespaldoLevantamientoArmado(documento.id_respaldo_armado) });
      return;
    }
    if (enviando.current) return;
    enviando.current = true;
    setCargando(true);
    setError('');
    const ventana = window.open(url || 'about:blank', '_blank');
    if (ventana) ventana.opener = null;
    if (url) { setCargando(false); enviando.current = false; return; }
    try {
      const blob = await obtenerRespaldoLevantamientoArmado(documento.id_respaldo_armado);
      if (!(blob instanceof Blob) || !/^(application\/pdf|image\/)/.test(blob.type)) throw new Error('Respuesta invalida.');
      const enlace = URL.createObjectURL(blob);
      if (vigente.current) setUrl(enlace);
      if (ventana) ventana.location.href = enlace;
      // Da tiempo al navegador a cargar el PDF antes de liberar el recurso.
      window.setTimeout(() => { URL.revokeObjectURL(enlace); if (vigente.current) setUrl(''); }, 60000);
    } catch (err) {
      if (ventana) ventana.close();
      let mensaje = err.response?.data?.message;
      if (!mensaje && err.response?.data instanceof Blob) {
        try { mensaje = JSON.parse(await err.response.data.text()).message; } catch { /* Respuesta del proxy. */ }
      }
      if (vigente.current) setError(mensaje || 'No se pudo abrir el respaldo. Reintenta con tu sesion iniciada.');
    } finally { enviando.current = false; if (vigente.current) setCargando(false); }
  };
  return <article className="border rounded p-3 mb-2">
    <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '8px' }}>
      <div><strong><i className={`fas ${documento.tipo_documento === 'pdf' ? 'fa-file-pdf' : 'fa-image'} mr-2`} aria-hidden="true" />{documento.nombre}</strong>
        <small className="d-block text-muted">Respaldo de armado #{documento.id_armado}</small>
        {documento.fecha_armado && <small className="d-block text-muted">Fecha del armado: {new Date(documento.fecha_armado).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</small>}</div>
      <button type="button" className="btn btn-outline-primary btn-sm" disabled={cargando} onClick={abrir}>{cargando ? 'Abriendo...' : 'Ver documento'}</button>
    </div>
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="small d-block mt-2">Abrir en otra ventana si no se abrio automaticamente</a>}
    {error && <p role="alert" className="text-danger small mt-2 mb-0">{error}</p>}
  </article>;
}
