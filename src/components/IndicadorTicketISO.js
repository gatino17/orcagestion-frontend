import React, { useMemo } from "react";
import { calcularIndicadorTrimestralTicketISO, formatearFechaTicketISO } from "../utils/ticketISO";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const CLASIFICACIONES = {
    bueno: { nombre: "Bueno", icono: "fas fa-check-circle" },
    regular: { nombre: "Regular", icono: "fas fa-exclamation-circle" },
    malo: { nombre: "Malo", icono: "fas fa-arrow-down" },
    sin_datos: { nombre: "Sin datos", icono: "fas fa-minus-circle" },
    incompleto: { nombre: "Datos por revisar", icono: "fas fa-exclamation-triangle" },
};

export default function IndicadorTicketISO({ tickets, mes, noDisponible, ahora }) {
    const indicador = useMemo(() => calcularIndicadorTrimestralTicketISO(tickets, mes, ahora), [tickets, mes, ahora]);
    const porcentaje = noDisponible ? null : indicador.porcentaje;
    const tono = noDisponible ? "sin_datos" : indicador.clasificacion;
    const clasificacion = CLASIFICACIONES[tono];
    const valor = porcentaje === null ? "-" : new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(porcentaje);
    const periodo = `${MESES[indicador.primerMes]} - ${MESES[indicador.primerMes + 2]} ${indicador.anio}`;
    const fase = indicador.fase === "en_curso" ? "Medicion parcial" : indicador.fase === "futuro" ? "Trimestre aun no iniciado" : "Trimestre finalizado";
    const circunferencia = 2 * Math.PI * 60;
    return <section className={`ticketiso-indicator ${tono}`} aria-labelledby="ticketiso-indicator-title">
        <div className="ticketiso-indicator-heading">
            <div><span className="ticketiso-section-label">Indicador de gestion | Trimestral</span>
                <h3 id="ticketiso-indicator-title">Tasa de cierre de Ticket ISO</h3>
                <p>Medicion trimestral con corte al mes consultado.</p>
            </div>
            <div className="ticketiso-indicator-period"><strong>Trimestre {indicador.trimestre}</strong><span>{periodo}</span><small>Mes consultado: {MESES[Number(mes.slice(5, 7)) - 1]} {indicador.anio}</small><small>{fase}</small></div>
        </div>
        <div className="ticketiso-indicator-body">
            <div className="ticketiso-indicator-result">
                <div className="ticketiso-indicator-gauge">
                    <svg viewBox="0 0 144 144" aria-hidden="true"><circle cx="72" cy="72" r="60" className="track" />
                        <circle cx="72" cy="72" r="60" className="value" style={{ strokeDasharray: circunferencia, strokeDashoffset: circunferencia * (1 - (porcentaje || 0) / 100) }} /></svg>
                    <div><strong aria-label={`Indicador trimestral: ${valor}${porcentaje === null ? "" : " %"}`}>{valor}<small>{porcentaje === null ? "" : "%"}</small></strong><span>Valor medido</span></div>
                </div>
                <span className="ticketiso-indicator-badge" aria-label={`Clasificacion del indicador: ${noDisponible ? "No disponible" : clasificacion.nombre}`}><i className={clasificacion.icono} aria-hidden="true" /> {noDisponible ? "No disponible" : clasificacion.nombre}</span>
                <small>Meta: superar el 85 %</small>
            </div>
            <div className="ticketiso-indicator-details">
                <div className="ticketiso-indicator-counts">
                    {[
                        { nombre: "Cerrados en el trimestre", valor: indicador.cerrados, icono: "fas fa-check" },
                        { nombre: "Abiertos al inicio", valor: indicador.abiertosInicio, icono: "far fa-folder-open" },
                        { nombre: "Recibidos en el trimestre", valor: indicador.recibidos, icono: "fas fa-inbox" },
                    ].map((item) => <div key={item.nombre}><i className={item.icono} aria-hidden="true" /><strong aria-label={`${item.nombre}: ${noDisponible ? "no disponible" : item.valor}`}>{noDisponible ? "-" : item.valor}</strong><span>{item.nombre}</span></div>)}
                </div>
                <div className="ticketiso-indicator-formula"><span>Formula del indicador</span>
                    <p>Cerrados / (Abiertos al inicio + Recibidos en el trimestre) x 100</p>
                    <strong>{noDisponible ? "Calculo no disponible" : `${indicador.cerrados} / (${indicador.abiertosInicio} + ${indicador.recibidos}) x 100${porcentaje === null ? "" : ` = ${valor} %`}`}</strong>
                </div>
                <div className="ticketiso-indicator-ranges" aria-label="Clasificacion del indicador">
                    <div className={`malo ${tono === "malo" ? "active" : ""}`}><strong>Malo</strong><span>Menor a 75 %</span></div>
                    <div className={`regular ${tono === "regular" ? "active" : ""}`}><strong>Regular</strong><span>75 % a 85 %</span></div>
                    <div className={`bueno ${tono === "bueno" ? "active" : ""}`}><strong>Bueno</strong><span>Mayor a 85 %</span></div>
                </div>
            </div>
        </div>
        <div className="ticketiso-indicator-footer">
            <span><i className="far fa-calendar-check" aria-hidden="true" /> Corte: {formatearFechaTicketISO(indicador.corte)}</span>
            <span>Calculado el {formatearFechaTicketISO(indicador.calculadoEl)}</span><span>Medicion automatica</span>
        </div>
        {!noDisponible && !!indicador.incompletos && <p className="ticketiso-indicator-warning">Revisa {indicador.incompletos} registros con fechas o estados incompletos. El indicador no se clasifica hasta completar esos datos.</p>}
        {!noDisponible && !indicador.base && !indicador.incompletos && <p className="ticketiso-indicator-note">{indicador.fase === "futuro" ? "El trimestre aun no comienza; no se adelanta una medicion con fechas futuras." : "No hay casos disponibles para medir en este trimestre. No se asigna un porcentaje ni una clasificacion."}</p>}
        <p className="ticketiso-indicator-note">Fuente: todos los tickets ISO registrados. Usa estados actuales y fechas de cierre reales, no fechas previstas. Sin historial de reaperturas, este calculo no constituye un cierre historico auditado.</p>
    </section>;
}
