import React, { useEffect, useRef, useState } from "react";
import { obtenerPDFTicketISO } from "../api";

export default function VistaPreviaPDFTicketISO({ ticket }) {
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(true);
    const [listo, setListo] = useState(false);
    const [aviso, setAviso] = useState("");
    const [intento, setIntento] = useState(0);
    const visor = useRef(null);

    useEffect(() => {
        let cancelado = false;
        let archivoUrl = "";
        setUrl(""); setError(""); setCargando(true); setListo(false); setAviso("");
        const cargar = async () => {
            try {
                const archivo = await obtenerPDFTicketISO(ticket.id_ticket);
                if (cancelado) return;
                if (!(archivo instanceof Blob) || !archivo.type.startsWith("application/pdf")) throw new Error("El servidor no devolvio un PDF valido.");
                archivoUrl = URL.createObjectURL(archivo);
                setUrl(archivoUrl);
            } catch (err) {
                let mensaje = err.response?.data?.error;
                if (!mensaje && err.response?.data instanceof Blob) {
                    try { mensaje = JSON.parse(await err.response.data.text()).error; } catch { /* Keep a safe fallback for non-JSON responses. */ }
                }
                if (!cancelado) setError(typeof mensaje === "string" ? mensaje : "No se pudo generar el PDF. Intenta nuevamente.");
            } finally { if (!cancelado) setCargando(false); }
        };
        cargar();
        return () => { cancelado = true; if (archivoUrl) URL.revokeObjectURL(archivoUrl); };
    }, [ticket.id_ticket, intento]);

    const imprimir = () => {
        try {
            if (!visor.current?.contentWindow) throw new Error("Visor no disponible");
            visor.current.contentWindow.focus();
            visor.current.contentWindow.print();
        } catch {
            setAviso("Abre el PDF en una pestana para imprimirlo con el visor de tu navegador.");
        }
    };
    const nombre = `Ticket-${String(ticket.numero_ticket || ticket.id_ticket).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100)}.pdf`;

    return <>
        <div className="ticketiso-modal-body ticketiso-pdf-body">
            <p className="ticketiso-pdf-caption"><strong>{ticket.numero_ticket}</strong><span>Documento con la informacion guardada del ticket.</span></p>
            {cargando && <p role="status"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Generando PDF...</p>}
            {error && <div className="ticketiso-alert error" role="alert">{error}<button type="button" onClick={() => setIntento((actual) => actual + 1)}>Reintentar</button></div>}
            {url && <>
                <iframe ref={visor} className="ticketiso-pdf-viewer" src={`${url}#toolbar=0`} title={`Vista previa PDF de ${ticket.numero_ticket}`} onLoad={() => setListo(true)} />
                <small className="ticketiso-pdf-help">Si tu navegador no muestra la vista previa, usa Abrir en pestana o Descargar PDF.</small>
            </>}
            {aviso && <p role="status" className="ticketiso-pdf-help">{aviso}</p>}
        </div>
        <div className="ticketiso-modal-footer ticketiso-pdf-actions">
            {url && <a className="ticketiso-button secondary" href={url} target="_blank" rel="noopener noreferrer"><i className="fas fa-external-link-alt" aria-hidden="true" /> Abrir en pestana</a>}
            <button type="button" className="ticketiso-button secondary" disabled={!url || !listo} onClick={imprimir}><i className="fas fa-print" aria-hidden="true" /> Imprimir</button>
            {url ? <a className="ticketiso-button primary" href={url} download={nombre}><i className="fas fa-download" aria-hidden="true" /> Descargar PDF</a> : <button type="button" className="ticketiso-button primary" disabled>Descargar PDF</button>}
        </div>
    </>;
}
