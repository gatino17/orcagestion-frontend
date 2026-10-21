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
  const instalacion = armado.seguimiento?.instalacion;
  const instalado = instalacion?.fecha_instalacion;
  const fechaSeguimiento = instalacion?.origen === 'informe_instalacion'
    ? instalacion.fecha_registro_seguimiento || instalado : instalado;
  return !instalado || incluirInstalados || fechaSeguimiento === fechaHoyChile(ahora);
};

export const construirLineaTiempoArmado = (armado) => {
  const seguimiento = armado.seguimiento || {};
  const despacho = seguimiento.despacho || {};
  const recepcionCompleta = despacho.recepcion_completa ??
    (despacho.total_bultos > 0 && despacho.bultos_recibidos >= despacho.total_bultos);
  const instalacion = seguimiento.instalacion;
  const asignacion = seguimiento.asignacion_instalacion;
  const tecnicosInforme = Array.isArray(instalacion?.tecnicos)
    ? instalacion.tecnicos.map((nombre) => String(nombre || '').trim()).filter(Boolean) : [];
  const tecnicosAsignados = Array.isArray(asignacion?.instaladores)
    ? asignacion.instaladores.map((item) => String(item?.nombre || '').trim()).filter(Boolean) : [];
  const tecnicosInstalacion = [...new Set(tecnicosInforme.length ? tecnicosInforme : tecnicosAsignados)];
  const asignada = Boolean(asignacion?.asignada);
  const programada = asignada && asignacion.fecha_inicio > fechaHoyChile();
  const estadoAsignacion = instalacion ? null : asignada
    ? programada ? 'Instalacion programada' : 'Instalacion asignada'
    : 'Pendiente de asignacion de instaladores';
  const estado = String(armado.estado || '').trim().toLowerCase();
  const finalizado = estado === 'finalizado';
  const iniciado = Boolean(seguimiento.fecha_inicio || seguimiento.inicio_registrado ||
    ['en_proceso', 'prefinalizado', 'finalizado'].includes(estado));
  const etapas = [
    { nombre: 'Asignado', fecha: seguimiento.fecha_asignacion || armado.fecha_asignacion, completo: true },
    { nombre: 'Armado iniciado', fecha: seguimiento.fecha_inicio, completo: iniciado },
    { nombre: 'Armado finalizado', fecha: seguimiento.fecha_fin_armado || (finalizado ? armado.fecha_cierre : null), completo: finalizado },
    { nombre: 'Despacho', fecha: despacho.fecha_completo || despacho.fecha_inicio, completo: Boolean(despacho.completo) },
    { nombre: 'Recepcion en centro', fecha: recepcionCompleta ? despacho.fecha_recepcion_completa : despacho.fecha_recepcion_inicio, completo: Boolean(recepcionCompleta) },
    { nombre: 'Instalado', fecha: instalacion?.fecha_instalacion, completo: Boolean(instalacion) },
  ];
  const actual = etapas.findIndex((etapa) => !etapa.completo);
  let resumen = 'Pendiente de armado';
  if (iniciado) resumen = estado === 'prefinalizado' ? 'En revision de armado' : 'Armado en curso';
  if (finalizado) resumen = 'Pendiente de despacho';
  if (despacho.bultos_enviados > 0) resumen = despacho.completo
    ? !asignada ? 'Pendiente de asignacion de instaladores'
      : programada ? 'Instalacion programada'
        : String(asignacion.estado || '').toLowerCase() === 'finalizado' ? 'Pendiente de confirmar instalacion' : 'Instalacion asignada'
    : 'Despacho parcial';
  if (instalacion) resumen = 'Instalado';
  return {
    etapas: etapas.map((etapa, index) => ({ ...etapa, actual: index === actual })),
    resumen,
    despacho,
    instalacion,
    asignacion,
    tecnicosInstalacion,
    estadoAsignacion,
    asignada,
    programada,
    pendientes: finalizado ? Number(armado.armado_equipos_pendientes || 0) : 0,
    puedeConfirmar: Boolean(seguimiento.puede_confirmar_instalacion && finalizado && despacho.completo && !instalacion && asignada && !programada),
  };
};
