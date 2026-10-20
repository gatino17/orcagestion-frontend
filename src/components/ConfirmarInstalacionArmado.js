import React, { useEffect, useRef, useState } from 'react';
import { confirmarInstalacionArmado } from '../api';
import { fechaEtapaArmado, fechaHoyChile } from '../utils/seguimientoArmado';

export default function ConfirmarInstalacionArmado({ armado, onCerrar, onConfirmado }) {
  const dialog = useRef(null);
  const [fecha, setFecha] = useState(fechaHoyChile);
  const [acta, setActa] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const elemento = dialog.current;
    elemento.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { elemento.close(); document.body.style.overflow = overflow; };
  }, []);

  const guardar = async (event) => {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError('');
    try {
      const resultado = await confirmarInstalacionArmado(armado.id_armado, {
        fecha_instalacion: fecha, acta_entrega_id: acta ? Number(acta) : null, observacion,
      });
      onConfirmado(armado.id_armado, resultado.instalacion);
      onCerrar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo confirmar la instalacion. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };
  return (
    <dialog ref={dialog} className="home-installation-dialog" aria-labelledby="confirmar-instalacion-titulo"
      onCancel={(event) => { event.preventDefault(); if (!guardando) onCerrar(); }}>
      <form onSubmit={guardar}>
        <header><div><span className="home-section-kicker">Cierre de seguimiento</span>
          <h5 id="confirmar-instalacion-titulo">Confirmar instalacion</h5></div>
          <button type="button" aria-label="Cerrar" disabled={guardando} onClick={onCerrar}>&times;</button>
        </header>
        <div className="home-installation-body">
          <strong>{armado.centro?.nombre || armado.centro_nombre || 'Centro'} &middot; Armado #{armado.id_armado}</strong>
          <p>Confirma solo cuando los equipos esten instalados. La recepcion de bultos no confirma la instalacion.</p>
          <label htmlFor="instalacion-fecha">Fecha de instalacion *</label>
          <input id="instalacion-fecha" type="date" className="form-control" required value={fecha}
            max={fechaHoyChile()} disabled={guardando} onChange={(event) => setFecha(event.target.value)} />
          <label htmlFor="instalacion-acta">Acta de entrega (opcional)</label>
          <select id="instalacion-acta" className="form-control" value={acta} disabled={guardando} onChange={(event) => setActa(event.target.value)}>
            <option value="">Sin acta asociada</option>
            {(armado.seguimiento?.actas || []).map((item) => <option key={item.id_acta_entrega} value={item.id_acta_entrega}>
              Acta #{item.id_acta_entrega} / {fechaEtapaArmado(item.fecha_registro)}{item.firmada ? ' / Firmada' : ''}
            </option>)}
          </select>
          <label htmlFor="instalacion-observacion">Observaciones</label>
          <textarea id="instalacion-observacion" className="form-control" rows="3" maxLength={2000}
            value={observacion} disabled={guardando} onChange={(event) => setObservacion(event.target.value)} />
          {error && <div role="alert" className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
        <footer><button type="button" className="btn btn-light" disabled={guardando} onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Confirmar instalacion'}</button>
        </footer>
      </form>
    </dialog>
  );
}
