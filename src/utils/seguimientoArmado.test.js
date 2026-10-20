import { construirLineaTiempoArmado, fechaEtapaArmado, fechaHoyChile, mostrarArmadoEnCurso } from './seguimientoArmado';

const base = {
  id_armado: 1, estado: 'pendiente', fecha_asignacion: '2026-10-01',
  seguimiento: { fecha_asignacion: '2026-10-01', fecha_inicio: null, inicio_registrado: false,
    despacho: { total_bultos: 2, bultos_enviados: 0, completo: false }, instalacion: null },
};

test('assignment does not invent actual start date', () => {
  const linea = construirLineaTiempoArmado(base);
  expect(linea.etapas.map((item) => item.completo)).toEqual([true, false, false, false, false]);
  expect(linea.etapas[1].actual).toBe(true);
  expect(linea.etapas[1].fecha).toBeNull();
});

test('prefinalizado is review, not finalized', () => {
  const linea = construirLineaTiempoArmado({ ...base, estado: 'prefinalizado' });
  expect(linea.resumen).toBe('En revision de armado');
  expect(linea.etapas[1].completo).toBe(true);
  expect(linea.etapas[2].completo).toBe(false);
});

test('finished armado stays visible and waits for dispatch', () => {
  const armado = { ...base, estado: 'finalizado' };
  expect(mostrarArmadoEnCurso(armado)).toBe(true);
  expect(construirLineaTiempoArmado(armado).resumen).toBe('Pendiente de despacho');
  expect(construirLineaTiempoArmado(armado).etapas[2].fecha).toBeUndefined();
});

test('partial dispatch does not complete the step', () => {
  const linea = construirLineaTiempoArmado({ ...base, estado: 'finalizado', seguimiento: {
    ...base.seguimiento, despacho: { total_bultos: 2, bultos_enviados: 1, completo: false },
  } });
  expect(linea.resumen).toBe('Despacho parcial');
  expect(linea.etapas[3].completo).toBe(false);
  expect(linea.puedeConfirmar).toBe(false);
});

test('complete dispatch waits for explicit installation and authorization', () => {
  const armado = { ...base, estado: 'finalizado', seguimiento: { ...base.seguimiento,
    despacho: { completo: true, total_bultos: 2, bultos_enviados: 2, bultos_recibidos: 2 },
    puede_confirmar_instalacion: true,
  } };
  expect(construirLineaTiempoArmado(armado).resumen).toBe('Pendiente de instalacion');
  expect(construirLineaTiempoArmado(armado).etapas[4].completo).toBe(false);
  expect(construirLineaTiempoArmado(armado).puedeConfirmar).toBe(true);
  armado.seguimiento.puede_confirmar_instalacion = false;
  expect(construirLineaTiempoArmado(armado).puedeConfirmar).toBe(false);
});

test('Chile day boundary controls installed retention', () => {
  const armado = { ...base, seguimiento: { ...base.seguimiento, instalacion: { fecha_instalacion: '2026-10-19' } } };
  expect(fechaHoyChile(new Date('2026-10-20T02:59:00Z'))).toBe('2026-10-19');
  expect(mostrarArmadoEnCurso(armado, false, new Date('2026-10-20T02:59:00Z'))).toBe(true);
  expect(mostrarArmadoEnCurso(armado, false, new Date('2026-10-20T03:01:00Z'))).toBe(false);
  expect(mostrarArmadoEnCurso(armado, true, new Date('2026-10-20T03:01:00Z'))).toBe(true);
  expect(construirLineaTiempoArmado(armado).resumen).toBe('Instalado');
});

test.each(['cancelado', 'anulado'])('cancelled armado %s is hidden even with history', (estado) => {
  expect(mostrarArmadoEnCurso({ ...base, estado }, true)).toBe(false);
});

test('legacy response does not fabricate installation from center dates', () => {
  const linea = construirLineaTiempoArmado({ estado: 'finalizado', centro: { fecha_instalacion: '2020-01-01' } });
  expect(linea.instalacion).toBeUndefined();
  expect(linea.etapas[4].completo).toBe(false);
});

test('missing or invalid dates remain explicit', () => {
  expect(fechaEtapaArmado(null)).toBe('Sin fecha registrada');
  expect(fechaEtapaArmado('no-fecha')).toBe('Sin fecha registrada');
  expect(fechaEtapaArmado('2026-10-02')).toMatch(/2.*10.*2026/);
});
