import React from 'react';
import { admiteAvisoTerreno } from '../utils/soporteAviso';

export function EstadoAvisoTerreno({ aviso }) {
    if (!aviso) return null;
    const etiquetas = { enviado: 'Aviso enviado', enviando: 'Aviso en proceso', error: 'Aviso no enviado',
        incierto: 'Envio sin confirmar: revisa el buzon', parcial: 'Envio parcial: revisa los destinatarios' };
    return <small className={`d-block mt-2 ${aviso.estado === 'enviado' ? 'text-success' : 'soporte-aviso-alerta'}`}>
        <i className="fas fa-envelope mr-1" aria-hidden="true" />
        {etiquetas[aviso.estado] || 'Aviso pendiente'}
        {aviso.fecha_envio && ` · ${new Date(aviso.fecha_envio).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`}
        {aviso.error && <span className="d-block">{aviso.error}</span>}
    </small>;
}

export default function SoporteAvisoTerreno({ tipo, estado, fechaCierre, sugerencia, onSugerencia,
    enviar, onEnviar, disabled, aviso }) {
    const admite = admiteAvisoTerreno(tipo, estado, fechaCierre);
    if (!admite && !sugerencia) return null;
    return <section className="soporte-sugerencia-panel">
        <label htmlFor="soporte-sugerencia" className="font-weight-bold">Sugerencia para revision en terreno</label>
        <textarea id="soporte-sugerencia" className="form-control" rows={3} maxLength={10000}
            value={sugerencia} onChange={(e) => onSugerencia(e.target.value)} disabled={disabled || !admite}
            placeholder="Ej: revisar alimentacion, cableado y configuracion de IP antes de reemplazar el equipo." />
        <small className="text-muted d-block mt-1">Orienta la visita; no reemplaza la solucion aplicada.</small>
        {admite && <div className="form-check mt-3">
            <input id="enviar-aviso-terreno" type="checkbox" className="form-check-input"
                checked={enviar} onChange={(e) => onEnviar(e.target.checked)} disabled={disabled} />
            <label htmlFor="enviar-aviso-terreno" className="form-check-label">Enviar aviso por correo a soporte</label>
            <small className="text-muted d-block">Destino: soporte@orcatecnologia.cl. Se enviaran el problema y la sugerencia al guardar.</small>
        </div>}
        <EstadoAvisoTerreno aviso={aviso} />
        {aviso && admite && <small className="text-muted d-block mt-1">Editar no reenvia correos. Marca la opcion solo si necesitas notificar los cambios.</small>}
    </section>;
}

export function ResultadoAvisoTerreno({ resultado, onReintentar, ocupado }) {
    if (!resultado) return null;
    return <div className={`alert ${resultado.enviado ? 'alert-success' : 'alert-warning'}`}
        role={resultado.enviado ? 'status' : 'alert'}>
        {resultado.mensaje}
        {resultado.reintentable && <button type="button" className="btn btn-outline-dark btn-sm ml-3"
            disabled={ocupado} onClick={onReintentar}>{ocupado ? 'Enviando...' : 'Reintentar solo el correo'}</button>}
    </div>;
}
