import React from "react";
import { formatearFechaTicketISO } from "../utils/ticketISO";

export default function SeguimientoTicketISO({ valor, preguntas, causaRaiz = "", responsableCausa = "", fechaCausa = "", onSeleccionar, onCambiar, onCambiarCausa, onCambiarDatosCausa }) {
    const tieneDatos = causaRaiz.trim() || responsableCausa.trim() || fechaCausa || preguntas.some((item) => item.pregunta.trim() || item.respuesta.trim());
    return (
        <fieldset className="ticketiso-followup full">
            <legend>Amerita seguimiento <span>Opcional</span></legend>
            <div className="ticketiso-followup-options">
                <label><input type="radio" name="amerita_seguimiento" value="si" checked={valor === true} onChange={() => onSeleccionar(true)} /> Si</label>
                <label><input type="radio" name="amerita_seguimiento" value="no" checked={valor === false} onChange={() => onSeleccionar(false)} /> No</label>
                <button type="button" disabled={valor === null} onClick={() => onSeleccionar(null)}>Quitar seleccion</button>
            </div>
            {valor === true ? <>
                <p className="ticketiso-followup-help">Escribe hasta cinco preguntas y sus respuestas. Puedes completarlas o editarlas mas adelante; no reemplazan los planes de accion.</p>
                <div className="ticketiso-followup-list">
                    {preguntas.map((item, index) => (
                        <div className="ticketiso-followup-entry" key={index}>
                            <span className="ticketiso-followup-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                            <div className="ticketiso-followup-fields">
                                <div className="ticketiso-field"><label htmlFor={`ticketiso-followup-question-${index}`}>Pregunta {index + 1}</label><textarea id={`ticketiso-followup-question-${index}`} value={item.pregunta} onChange={(event) => onCambiar(index, "pregunta", event.target.value)} rows={2} maxLength={500} placeholder="Escribe la pregunta para este caso." /></div>
                                <div className="ticketiso-field"><label htmlFor={`ticketiso-followup-answer-${index}`}>Respuesta {index + 1}</label><textarea id={`ticketiso-followup-answer-${index}`} value={item.respuesta} onChange={(event) => onCambiar(index, "respuesta", event.target.value)} rows={3} maxLength={4000} placeholder="Registra la respuesta o dejala pendiente." /></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="ticketiso-field ticketiso-followup-root"><label htmlFor="ticketiso-root-cause">Causa raiz</label><textarea id="ticketiso-root-cause" value={causaRaiz} onChange={(event) => onCambiarCausa(event.target.value)} maxLength={10000} rows={3} placeholder="Describe la causa raiz identificada a partir del seguimiento." /></div>
                <div className="ticketiso-form-grid ticketiso-followup-root">
                    <div className="ticketiso-field"><label htmlFor="ticketiso-root-owner">Responsable de causa raiz</label><input id="ticketiso-root-owner" type="text" value={responsableCausa} onChange={(event) => onCambiarDatosCausa("responsable_causa_raiz", event.target.value)} maxLength={100} placeholder="Nombre de quien identifica la causa raiz" /></div>
                    <div className="ticketiso-field"><label htmlFor="ticketiso-root-date">Fecha de causa raiz</label><input id="ticketiso-root-date" type="date" value={fechaCausa} onChange={(event) => onCambiarDatosCausa("fecha_causa_raiz", event.target.value)} /></div>
                </div>
            </> : <p className="ticketiso-followup-help">{tieneDatos ? "Al guardar sin seguimiento, no se conservaran las preguntas, respuestas ni los datos de causa raiz. Puedes volver a Si antes de guardar para recuperarlos." : "Puedes dejarlo sin seleccionar. Las cinco preguntas y la causa raiz se habilitan solo al marcar Si."}</p>}
        </fieldset>
    );
}

export function DetalleSeguimientoTicketISO({ valor, preguntas = [], causaRaiz, responsableCausa, fechaCausa }) {
    return (
        <section className="ticketiso-detail-section" aria-labelledby="ticketiso-detail-followup">
            <h4 id="ticketiso-detail-followup"><i className="fas fa-clipboard-list" aria-hidden="true" /> Seguimiento del ticket</h4>
            <dl className="ticketiso-detail-fields"><div><dt>Amerita seguimiento</dt><dd>{valor === true ? "Si" : valor === false ? "No" : "Sin especificar"}</dd></div></dl>
            {valor === true && <><ol className="ticketiso-followup-detail-list">
                {Array.from({ length: 5 }, (_, index) => (
                    <li key={index}>
                        <strong>{preguntas[index]?.pregunta || `Pregunta ${index + 1} pendiente de definir`}</strong>
                        <p className="ticketiso-detail-text">{preguntas[index]?.respuesta || "Respuesta pendiente."}</p>
                    </li>
                ))}
            </ol><div className="ticketiso-detail-result ticketiso-followup-root"><span>Causa raiz</span><p className="ticketiso-detail-text">{causaRaiz || "Sin causa raiz registrada."}</p>
                <dl className="ticketiso-detail-fields ticketiso-description-meta"><div><dt>Responsable de causa raiz</dt><dd>{responsableCausa || "Sin asignar"}</dd></div><div><dt>Fecha de causa raiz</dt><dd>{fechaCausa ? formatearFechaTicketISO(fechaCausa) : "Sin registrar"}</dd></div></dl>
            </div></>}
        </section>
    );
}
