import React from 'react';
import { construirLineaTiempoArmado, fechaEtapaArmado } from '../utils/seguimientoArmado';

export default function LineaTiempoArmado({ armado, onConfirmar }) {
  const linea = construirLineaTiempoArmado(armado);
  const { despacho, instalacion } = linea;
  return (
    <div className="home-armado-tracking">
      <ol className="home-armado-timeline" aria-label="Seguimiento del armado">
        {linea.etapas.map((etapa) => (
          <li key={etapa.nombre} className={etapa.completo ? 'is-done' : etapa.actual ? 'is-current' : ''}
            aria-current={etapa.actual ? 'step' : undefined}>
            <span className="home-armado-step" aria-label={etapa.completo ? 'Completado' : 'Pendiente'}>
              <i className={etapa.completo ? 'fas fa-check' : 'fas fa-circle'} aria-hidden="true" />
            </span>
            <strong>{etapa.nombre}</strong>
            <small>{etapa.completo || etapa.fecha ? fechaEtapaArmado(etapa.fecha) : 'Pendiente'}</small>
          </li>
        ))}
      </ol>
      {!instalacion && <div className="home-armado-installers">
        <strong>{linea.estadoAsignacion}</strong>
        {linea.asignacion && <>
          <span>Fecha: {linea.asignacion.fecha_inicio ? fechaEtapaArmado(linea.asignacion.fecha_inicio) : 'Por definir'}</span>
          <span>Instaladores: {linea.asignacion.instaladores?.map((item) => item.nombre).join(' / ') || 'Sin asignar'}</span>
        </>}
      </div>}
      <div className="home-armado-tracking-footer">
        <span>{despacho.total_bultos > 0
          ? `${despacho.bultos_enviados || 0} de ${despacho.total_bultos} bultos enviados`
          : 'Bultos sin registrar'}
          {despacho.total_bultos > 0 && ` / ${despacho.bultos_recibidos || 0} de ${despacho.total_bultos} recibidos en centro`}
        </span>
        {linea.puedeConfirmar && <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onConfirmar(armado)}>
          <i className="fas fa-check mr-1" aria-hidden="true" />Confirmar instalacion
        </button>}
      </div>
      {linea.pendientes > 0 && <small className="home-armado-warning">Finalizado con {linea.pendientes} equipos pendientes de completar.</small>}
      {instalacion && <small className="home-armado-confirmed">{instalacion.origen === 'informe_instalacion'
        ? 'Instalacion registrada en informe'
        : `Instalacion confirmada por ${instalacion.confirmado_por_nombre || 'usuario registrado'}`}
        {instalacion.acta_entrega_id ? ` / Acta #${instalacion.acta_entrega_id}` : ''}.
      </small>}
    </div>
  );
}
