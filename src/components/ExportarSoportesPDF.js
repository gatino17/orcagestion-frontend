import React, { useRef, useState } from 'react';
import { obtenerPDFRegistrosSoporte } from '../api';

export const fechaFiltroSoportePDF = (fecha) => fecha
  ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}` : '';

export default function ExportarSoportesPDF({ registros, filtros, disabled }) {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');
  const enviando = useRef(false);
  const rangoInvalido = [['desde', 'hasta'], ['periodo_desde', 'periodo_hasta']]
    .some(([desde, hasta]) => filtros[desde] && filtros[hasta] && filtros[desde] > filtros[hasta]);
  const demasiados = registros.length > 5000;
  const motivo = rangoInvalido ? 'Revisa el rango de fechas.' : demasiados ? 'Acota la busqueda a un maximo de 5000 eventos.'
    : !registros.length ? 'No hay resultados para exportar.' : 'Exportar todos los resultados filtrados, incluidas las otras paginas';

  const exportar = async () => {
    if (disabled || rangoInvalido || demasiados || !registros.length || enviando.current) return;
    enviando.current = true;
    setExportando(true);
    setError('');
    let url;
    try {
      const archivo = await obtenerPDFRegistrosSoporte(registros.map((item) => Number(item.id_soporte)), filtros);
      if (!(archivo instanceof Blob) || !archivo.type.startsWith('application/pdf')) throw new Error('Respuesta no valida.');
      url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `Registros-soporte-${fechaFiltroSoportePDF(new Date())}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (err) {
      let mensaje = err.response?.data?.error;
      if (!mensaje && err.response?.data instanceof Blob) {
        try { mensaje = JSON.parse(await err.response.data.text()).error; } catch { /* El proxy puede responder con HTML. */ }
      }
      setError(typeof mensaje === 'string' ? mensaje : 'No se pudo exportar el PDF. Intenta nuevamente.');
    } finally {
      // Dar tiempo al navegador para iniciar la descarga antes de liberar el blob.
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      enviando.current = false;
      setExportando(false);
    }
  };

  return <div className="soporte-pdf-export">
    <button type="button" className="btn btn-outline-danger" onClick={exportar}
      disabled={disabled || exportando || !registros.length || rangoInvalido || demasiados} title={motivo}>
      <i className={exportando ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'} aria-hidden="true" />
      <span>{exportando ? 'Exportando...' : 'Exportar PDF'}</span>
    </button>
    {(error || rangoInvalido || demasiados) && <small role="alert" className="soporte-pdf-export__error">{error || motivo}</small>}
  </div>;
}
