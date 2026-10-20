import { construirLineaTiempoArmado, fechaEtapaArmado, fechaHoyChile, mostrarArmadoEnCurso } from './seguimientoArmado';

const base = {
  id_armado: 1, estado: 'pendiente', fecha_asignacion: '2026-10-01',
  seguimiento: { fecha_asignacion: '2026-10-01', fecha_inicio: null, inicio_registrado: false,
    despacho: { total_bultos: 2, bultos_enviados: 0, completo: false }, instalacion: null },
};

test('assignment does not invent actual start date', () => {
  const linea = construirLineaTiempoArmado(base);
  expect(linea.etapas.map((item) => item.completo)).toEqual([true, false, false, false, false, false]);
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
    asignacion_instalacion: { asignada: true, fecha_inicio: '2000-01-01', estado: 'En progreso', instaladores: [{ nombre: 'Instalador' }] },
  } };
  expect(construirLineaTiempoArmado(armado).resumen).toBe('Instalacion asignada');
  expect(construirLineaTiempoArmado(armado).etapas[4].completo).toBe(true);
  expect(construirLineaTiempoArmado(armado).etapas[5].completo).toBe(false);
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
  expect(linea.etapas[5].completo).toBe(false);
});

test('missing or invalid dates remain explicit', () => {
  expect(fechaEtapaArmado(null)).toBe('Sin fecha registrada');
  expect(fechaEtapaArmado('no-fecha')).toBe('Sin fecha registrada');
  expect(fechaEtapaArmado('2026-10-02')).toMatch(/2.*10.*2026/);
});

test('dispatch complete without calendar assignment waits for installers and hides confirmation', () => {
  const linea = construirLineaTiempoArmado({ ...base, estado: 'finalizado', seguimiento: { ...base.seguimiento,
    despacho: { completo: true, bultos_enviados: 2 }, puede_confirmar_instalacion: true,
  } });
  expect(linea.resumen).toBe('Pendiente de asignacion de instaladores');
  expect(linea.puedeConfirmar).toBe(false);
});

test('future calendar assignment is programmed, not installed or confirmable', () => {
  const linea = construirLineaTiempoArmado({ ...base, estado: 'finalizado', seguimiento: { ...base.seguimiento,
    despacho: { completo: true, bultos_enviados: 2 }, puede_confirmar_instalacion: true,
    asignacion_instalacion: { asignada: true, fecha_inicio: '2099-10-20' },
  } });
  expect(linea.resumen).toBe('Instalacion programada');
  expect(linea.puedeConfirmar).toBe(false);
  expect(linea.etapas[5].completo).toBe(false);
});

test('partial reception remains current between dispatch and installation', () => {
  const linea = construirLineaTiempoArmado({ ...base, estado: 'finalizado', seguimiento: { ...base.seguimiento,
    fecha_inicio: '2026-10-02', despacho: { completo: true, total_bultos: 2, bultos_enviados: 2,
      bultos_recibidos: 1, recepcion_completa: false, fecha_recepcion_inicio: '2026-10-19' },
  } });
  expect(linea.etapas.map((etapa) => etapa.nombre)).toEqual([
    'Asignado', 'Armado iniciado', 'Armado finalizado', 'Despacho', 'Recepcion en centro', 'Instalado',
  ]);
  expect(linea.etapas[4]).toMatchObject({ actual: true, completo: false, fecha: '2026-10-19' });
  expect(linea.etapas[5].completo).toBe(false);
});

test('completed reception uses reception date without implying installation', () => {
  const linea = construirLineaTiempoArmado({ ...base, estado: 'finalizado', seguimiento: { ...base.seguimiento,
    despacho: { completo: true, total_bultos: 2, bultos_enviados: 2, bultos_recibidos: 2,
      recepcion_completa: true, fecha_completo: '2026-10-15', fecha_recepcion_completa: '2026-10-20' },
  } });
  expect(linea.etapas[4]).toMatchObject({ completo: true, fecha: '2026-10-20' });
  expect(linea.etapas[5]).toMatchObject({ completo: false, actual: true });
});

test('legacy received boxes do not invent a reception date from dispatch', () => {
  const linea = construirLineaTiempoArmado({ ...base, seguimiento: { ...base.seguimiento,
    despacho: { total_bultos: 2, bultos_recibidos: 2, fecha_completo: '2026-10-15' },
  } });
  expect(linea.etapas[4].completo).toBe(true);
  expect(linea.etapas[4].fecha).toBeUndefined();
});
