import React, { useCallback, useEffect, useState } from 'react';
import { obtenerActasEntrega, obtenerPermisosTrabajo } from '../api';

const datosVacios = (centroId) => ({ centroId, actas: [], permisos: [], errores: {}, cargando: Boolean(centroId) });

const documentosDelCentro = (datos, centroId, campoFecha) => (Array.isArray(datos) ? datos : [])
  .filter((item) => item && String(item.centro_id) === String(centroId))
  .sort((a, b) => (Date.parse(b[campoFecha]) || 0) - (Date.parse(a[campoFecha]) || 0));

export function useDocumentosInstalacionCentro(centroId) {
  const [datos, setDatos] = useState(() => datosVacios(null));
  const [intento, setIntento] = useState(0);
  const recargar = useCallback(() => setIntento((valor) => valor + 1), []);

  useEffect(() => {
    if (!centroId) return undefined;
    let vigente = true;
    setDatos(datosVacios(centroId));
    Promise.allSettled([
      obtenerActasEntrega({ centro_id: centroId }),
      obtenerPermisosTrabajo({ centro_id: centroId }),
    ]).then(([actas, permisos]) => {
      if (!vigente) return;
      setDatos({
        centroId, cargando: false,
        actas: actas.status === 'fulfilled' ? documentosDelCentro(actas.value, centroId, 'fecha_registro') : [],
        permisos: permisos.status === 'fulfilled' ? documentosDelCentro(permisos.value, centroId, 'fecha_ingreso') : [],
        errores: {
          actas: actas.status === 'rejected' ? 'No se pudieron cargar las actas del sistema.' : null,
          permisos: permisos.status === 'rejected' ? 'No se pudieron cargar los permisos del sistema.' : null,
        },
      });
    });
    return () => { vigente = false; };
  }, [centroId, intento]);

  return { ...(datos.centroId === centroId ? datos : datosVacios(centroId)), recargar };
}

const fechaDocumento = (fecha) => {
  if (!fecha) return 'Sin fecha registrada';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T12:00:00`) : new Date(fecha);
  return Number.isNaN(date.getTime()) ? 'Sin fecha registrada' : date.toLocaleDateString('es-CL');
};

const tecnicosDocumento = (registro) => [registro.tecnico_1, registro.tecnico_2]
  .filter(Boolean).join(' / ') || 'Sin registrar';

export default function DocumentosInstalacionCentro({ documentos }) {
  const grupos = [
    { key: 'actas', titulo: 'Actas sistema', icono: 'fas fa-file-signature', id: 'id_acta_entrega' },
    { key: 'permisos', titulo: 'Permisos sistema', icono: 'fas fa-clipboard-check', id: 'id_permiso_trabajo' },
  ];
  return <div className="consulta-documentos-instalacion">
    <div className="consulta-documentos-grid">
      {grupos.map((grupo) => <section key={grupo.key} className="consulta-documentos-grupo" aria-label={grupo.titulo}>
        <header>
          <h6><i className={grupo.icono} aria-hidden="true" /> {grupo.titulo}</h6>
          <span className="consulta-documentos-total">{documentos.cargando ? '...' : documentos[grupo.key].length}</span>
        </header>
        {documentos.cargando ? <p role="status">Cargando documentos...</p>
          : documentos.errores[grupo.key] ? <p role="alert">{documentos.errores[grupo.key]}</p>
            : documentos[grupo.key].length ? <ul className="consulta-documentos-lista">
              {documentos[grupo.key].map((registro) => <li key={registro[grupo.id]}>
                <div className="consulta-documento-cabecera">
                  <strong>{grupo.key === 'actas' ? 'Acta' : 'Permiso'} #{registro[grupo.id]}</strong>
                  {grupo.key === 'actas' && <span>{registro.tipo_instalacion === 'reapuntamiento' ? 'Reapuntamiento' : 'Instalacion'}</span>}
                </div>
                <dl>
                  {grupo.key === 'actas' ? <>
                    <dt>Fecha</dt><dd>{fechaDocumento(registro.fecha_registro)}</dd>
                  </> : <>
                    <dt>Ingreso</dt><dd>{fechaDocumento(registro.fecha_ingreso)}</dd>
                    <dt>Salida</dt><dd>{fechaDocumento(registro.fecha_salida)}</dd>
                    {registro.acta_entrega_id && <><dt>Acta asociada</dt><dd>#{registro.acta_entrega_id}</dd></>}
                  </>}
                  <dt>Tecnicos</dt><dd>{tecnicosDocumento(registro)}</dd>
                  {registro.recepciona_nombre && <><dt>Recibe</dt><dd>{registro.recepciona_nombre}</dd></>}
                  {registro.armado_id && <><dt>Armado</dt><dd>#{registro.armado_id}</dd></>}
                </dl>
                {registro.descripcion_trabajo && <p className="consulta-documento-descripcion"><strong>Trabajo realizado</strong>{registro.descripcion_trabajo}</p>}
                {registro.equipos_considerados && <p className="consulta-documento-descripcion"><strong>Equipos considerados</strong>{registro.equipos_considerados}</p>}
              </li>)}
            </ul> : <p className="timeline-empty">{grupo.key === 'actas' ? 'Sin actas del sistema registradas.' : 'Sin permisos del sistema registrados.'}</p>}
      </section>)}
    </div>
    {!documentos.cargando && Object.values(documentos.errores).some(Boolean) && <button type="button" className="btn btn-sm btn-outline-primary" onClick={documentos.recargar}>
      Reintentar documentos
    </button>}
  </div>;
}
