import React from 'react';
import { fechaEtapaArmado } from '../utils/seguimientoArmado';

export default function SelectorArmadoInstalacion({ area, centroId, armados, actividadId, value, onChange }) {
  const tipo = String(area || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (tipo !== 'instalacion') return null;
  const opciones = (armados || []).filter((armado) => {
    if (String(armado.id_armado) === String(value)) return true;
    const asignacion = armado.seguimiento?.asignacion_instalacion;
    return centroId && String(armado.centro_id || armado.centro?.id_centro) === String(centroId)
      && !['cancelado', 'anulado'].includes(String(armado.estado || '').toLowerCase())
      && !armado.seguimiento?.instalacion
      && (!asignacion || Number(asignacion.actividad_id) === Number(actividadId));
  });
  return <div className="col-12">
    <label htmlFor="actividad-armado-instalacion">Armado asociado (opcional)</label>
    <select id="actividad-armado-instalacion" className="form-control" value={value} disabled={!centroId}
      onChange={(event) => onChange(event.target.value)}>
      <option value="">Sin armado asociado</option>
      {opciones.map((armado) => <option key={armado.id_armado} value={armado.id_armado}>
        Armado #{armado.id_armado} / {fechaEtapaArmado(armado.seguimiento?.fecha_asignacion || armado.fecha_asignacion)} / {armado.estado}
      </option>)}
      {value && !opciones.some((armado) => String(armado.id_armado) === String(value)) && <option value={value}>Armado #{value} (actual)</option>}
    </select>
    <small className="text-muted">Selecciona el centro y su armado para mostrar en Home la fecha y los instaladores. No confirma la instalacion.</small>
  </div>;
}
