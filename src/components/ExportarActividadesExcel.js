import React, { useRef, useState } from 'react';
import { obtenerExcelActividades } from '../api';

export default function ExportarActividadesExcel({ filtros, disabled }) {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');
  const enviando = useRef(false);

  const descargar = async () => {
    if (disabled || enviando.current) return;
    enviando.current = true;
    setExportando(true);
    setError('');
    let url;
    try {
      const archivo = await obtenerExcelActividades(filtros);
      if (!(archivo instanceof Blob) || !archivo.type.includes('spreadsheetml')) throw new Error('Respuesta no valida.');
      url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'Actividades-documentos.xlsx';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (err) {
      let mensaje = err.response?.data?.error;
      if (!mensaje && err.response?.data instanceof Blob) {
        try { mensaje = JSON.parse(await err.response.data.text()).error; } catch { /* El proxy puede responder con HTML. */ }
      }
      setError(typeof mensaje === 'string' ? mensaje : 'No se pudo descargar el Excel. Intenta nuevamente.');
    } finally {
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      enviando.current = false;
      setExportando(false);
    }
  };

  return <div className="registros-excel-export">
    <button type="button" className="btn btn-outline-success w-100" disabled={disabled || exportando} onClick={descargar}
      title="Descargar Excel de actividades, una hoja por cliente y todas las paginas">
      <i className={exportando ? 'fas fa-spinner fa-spin' : 'fas fa-file-excel'} aria-hidden="true" /> {exportando ? 'Exportando...' : 'Excel'}
    </button>
    {error && <small className="registros-excel-error" role="alert">{error}</small>}
  </div>;
}
