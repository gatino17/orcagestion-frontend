import React from 'react';

export const resumenCierreBultos = (armado) => {
  const raw = armado?.cajas_estado;
  const estados = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const bultos = new Map();
  Object.entries(estados).forEach(([nombre, estado]) => {
    const normalizado = nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['', 'pendiente de caja', 'pendiente de bulto', 'sin caja', 'sin bulto', 'pendiente', 'n/a'].includes(normalizado)) return;
    const numero = normalizado.match(/^(?:caja|bulto)\s*(\d+)/);
    const clave = numero ? `bulto_${Number(numero[1])}` : normalizado;
    const cerrada = String(estado || '').trim().toLowerCase() === 'cerrada';
    bultos.set(clave, bultos.has(clave) ? bultos.get(clave) && cerrada : cerrada);
  });
  const informado = Number(armado?.total_cajas);
  const total = Math.max(Number.isFinite(informado) ? Math.max(0, Math.floor(informado)) : 0, bultos.size);
  const cerrados = [...bultos.values()].filter(Boolean).length;
  return { cerrados, total, pendientes: total - cerrados };
};

export default function EstadoBultosArmado({ armado }) {
  const { cerrados, total, pendientes } = resumenCierreBultos(armado);
  const descripcion = total ? `${cerrados} de ${total} bultos cerrados; ${pendientes} pendientes de cierre` : 'Sin bultos registrados';
  return <span title={descripcion} aria-label={descripcion} style={{ whiteSpace: 'nowrap' }}>
    <strong className={pendientes > 0 ? 'text-danger' : total > 0 ? 'text-success' : 'text-muted'}>{cerrados}</strong>
    <span>/{total}</span>
  </span>;
}
