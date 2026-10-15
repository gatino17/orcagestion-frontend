import React from "react";
import { formatearFechaHoraTicketISO, formatearFechaTicketISO } from "../utils/ticketISO";

export default function ListaPlanesTicketISO({ planes = [] }) {
    if (!planes.length) return <p className="ticketiso-detail-text">Aun no hay planes de accion registrados.</p>;
    return <div className="ticketiso-plans-list">
        {planes.map((plan, index) => <details className="ticketiso-plan-entry" key={plan.id_plan} open={index === 0}>
            <summary>
                <span className="ticketiso-plan-number">Plan {plan.numero || planes.length - index}</span>
                <span className="ticketiso-plan-preview">{plan.resultado_plan_accion || "Sin resultado registrado"}</span>
                <span className="ticketiso-plan-control">Control: {plan.fecha_control ? formatearFechaTicketISO(plan.fecha_control) : "Sin definir"}</span>
                <i className="fas fa-chevron-down" aria-hidden="true" />
            </summary>
            <div className="ticketiso-plan-content">
                <div className="ticketiso-detail-result"><span>Breve descripcion del resultado</span><p className="ticketiso-detail-text">{plan.resultado_plan_accion || "Sin resultado registrado."}</p></div>
                <dl className="ticketiso-detail-fields">
                    <div><dt>Fecha de control</dt><dd>{plan.fecha_control ? formatearFechaTicketISO(plan.fecha_control) : "Sin definir"}</dd></div>
                    <div><dt>Registrado</dt><dd>{formatearFechaHoraTicketISO(plan.created_at)}</dd></div>
                    {plan.creado_por_nombre && <div><dt>Registrado por</dt><dd>{plan.creado_por_nombre}</dd></div>}
                </dl>
            </div>
        </details>)}
    </div>;
}
