export const fechaHoyChile = (ahora = new Date()) => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(ahora);
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
};

export const fechaEtapaArmado = (fecha) => {
  if (!fecha) return 'Sin fecha registrada';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null;
  const date = iso ? new Date(`${iso}T12:00:00`) : new Date(fecha);
  if (Number.isNaN(date.getTime())) return 'Sin fecha registrada';
  return date.toLocaleDateString('es-CL', iso ? {} : { timeZone: 'UTC' });
};

export const mostrarArmadoEnCurso = (armado, incluirInstalados = false, ahora = new Date()) => {
  const estado = String(armado.estado || '').trim().toLowerCase();
  if (['cancelado', 'anulado'].includes(estado)) return false;
  const instalado = armado.seguimiento?.instalacion?.fecha_instalacion;
  return !instalado || incluirInstalados || instalado === fechaHoyChile(ahora);
};

export const construirLineaTiempoArmado = (armado) => {
  const seguimiento = armado.seguimiento || {};
  const despacho = seguimiento.despacho || {};
  const instalacion = seguimiento.instalacion;
  const estado = String(armado.estado || '').trim().toLowerCase();
  const finalizado = estado === 'finalizado';
  const iniciado = Boolean(seguimiento.fecha_inicio || seguimiento.inicio_registrado ||
    ['en_proceso', 'prefinalizado', 'finalizado'].includes(estado));
  const etapas = [
    { nombre: 'Asignado', fecha: seguimiento.fecha_asignacion || armado.fecha_asignacion, completo: true },
    { nombre: 'Armado iniciado', fecha: seguimiento.fecha_inicio, completo: iniciado },
    { nombre: 'Armado finalizado', fecha: seguimiento.fecha_fin_armado || (finalizado ? armado.fecha_cierre : null), completo: finalizado },
    { nombre: 'Despacho', fecha: despacho.fecha_completo || despacho.fecha_inicio, completo: Boolean(despacho.completo) },
    { nombre: 'Instalado', fecha: instalacion?.fecha_instalacion, completo: Boolean(instalacion) },
  ];
  const actual = etapas.findIndex((etapa) => !etapa.completo);
  let resumen = 'Pendiente de armado';
  if (iniciado) resumen = estado === 'prefinalizado' ? 'En revision de armado' : 'Armado en curso';
  if (finalizado) resumen = 'Pendiente de despacho';
  if (despacho.bultos_enviados > 0) resumen = despacho.completo ? 'Pendiente de instalacion' : 'Despacho parcial';
  if (instalacion) resumen = 'Instalado';
  return {
    etapas: etapas.map((etapa, index) => ({ ...etapa, actual: index === actual })),
    resumen,
    despacho,
    instalacion,
    pendientes: finalizado ? Number(armado.armado_equipos_pendientes || 0) : 0,
    puedeConfirmar: Boolean(seguimiento.puede_confirmar_instalacion && finalizado && despacho.completo && !instalacion),
  };
};
