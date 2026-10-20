import React, { useState } from 'react';
import { cerrarBultoArmadoAdmin, abrirBultoArmadoAdmin, eliminarBultoArmadoAdmin } from '../api';

export default function CerrarBultoAdmin({ esAdmin, armadoId, caja, etiqueta, onCerrado }) {
  const [guardando, setGuardando] = useState('');
  const [error, setError] = useState('');
  if (!esAdmin || !armadoId) return null;
  const cerrada = caja.estado === 'cerrada';
  const ocupada = Number(caja.equipos || 0) > 0 || Number(caja.materiales || 0) > 0;
  const ejecutar = async (accion) => {
    const nombre = etiqueta || caja.nombre;
    const mensaje = accion === 'eliminar' ? `Eliminar ${nombre}? Solo se permite si esta vacio y sin guia de despacho. No se borraran equipos, materiales ni movimientos historicos.`
      : `${accion === 'abrir' ? 'Reabrir' : 'Cerrar'} ${nombre}? Solo cambiara el estado de este bulto; no se modificara el estado del armado ni sus despachos.`;
    if (guardando || !window.confirm(mensaje)) return;
    setGuardando(accion);
    setError('');
    try {
      const operacion = { cerrar: cerrarBultoArmadoAdmin, abrir: abrirBultoArmadoAdmin, eliminar: eliminarBultoArmadoAdmin }[accion];
      const resultado = await operacion(armadoId, caja.nombre);
      onCerrado(resultado);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el bulto. Intenta nuevamente.');
    } finally {
      setGuardando('');
    }
  };
  return <div className="mb-2">
    <div className="d-flex flex-wrap" style={{ gap: 8 }}>
      <button type="button" className={`btn btn-sm ${cerrada ? 'btn-outline-primary' : 'btn-outline-warning'}`} disabled={Boolean(guardando)}
        aria-label={`${cerrada ? 'Reabrir' : 'Cerrar'} ${etiqueta || caja.nombre}`} onClick={() => ejecutar(cerrada ? 'abrir' : 'cerrar')}>
        <i className={`fas ${cerrada ? 'fa-lock-open' : 'fa-lock'} mr-1`} aria-hidden="true" />{guardando && guardando !== 'eliminar' ? 'Guardando...' : cerrada ? 'Reabrir bulto' : 'Cerrar bulto'}
      </button>
      <button type="button" className="btn btn-sm btn-outline-danger" disabled={Boolean(guardando) || ocupada}
        aria-label={`Eliminar ${etiqueta || caja.nombre}`} title={ocupada ? 'Reasigna el contenido antes de eliminar este bulto' : 'Eliminar bulto vacio'}
        onClick={() => ejecutar('eliminar')}>
        <i className="fas fa-trash mr-1" aria-hidden="true" />{guardando === 'eliminar' ? 'Eliminando...' : 'Eliminar bulto'}
      </button>
    </div>
    {ocupada && <small className="d-block text-muted mt-1">Para eliminarlo, reasigna primero su contenido.</small>}
    {error && <div role="alert" className="text-danger small mt-2">{error}</div>}
  </div>;
}
