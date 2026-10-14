import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { actualizarTicketISO, crearTicketISO, eliminarTicketISO, obtenerCatalogosTicketISO, obtenerTicketISO, obtenerTicketsISO } from "../api";
import { jwtDecode } from "jwt-decode";
import { CATEGORIAS_TICKET_ISO, ORIGENES_TICKET_ISO, crearFormularioTicketISO, fechaTicketISOParaInput, formatearFechaTicketISO, formatearFechaHoraTicketISO, normalizarBusquedaTicketISO, sugerirNumeroTicketISO } from "../utils/ticketISO";
import ResumenMensualTicketISO from "../components/ResumenMensualTicketISO";
import "./TicketISO.css";

const SECCIONES = [
    { id: "tickets", nombre: "Tickets", icono: "fas fa-ticket-alt" },
    { id: "resumen", nombre: "Resumen mensual", icono: "fas fa-chart-bar" },
];

const obtenerMesActual = () => {
    const partes = new Intl.DateTimeFormat("es-CL", {
        timeZone: "America/Santiago", year: "numeric", month: "2-digit",
    }).formatToParts(new Date());
    return `${partes.find((parte) => parte.type === "year").value}-${partes.find((parte) => parte.type === "month").value}`;
};

const EstadoInicial = ({ icono, titulo, descripcion }) => (
    <div className="ticketiso-empty">
        <span className="ticketiso-empty-icon"><i className={icono} aria-hidden="true" /></span>
        <h3>{titulo}</h3>
        <p>{descripcion}</p>
    </div>
);

const ESTADOS = { pendiente: "Pendiente", en_seguimiento: "En seguimiento", resuelto: "Resuelto" };
const EstadoTicket = ({ estado }) => <span className={`ticketiso-status ${estado}`}>{ESTADOS[estado] || estado}</span>;

const ModalTicketISO = ({ titulo, onCerrar, guardando, children }) => {
    const ref = useRef(null);
    useEffect(() => {
        const dialogo = ref.current;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialogo.showModal();
        return () => { dialogo.close(); document.body.style.overflow = overflow; };
    }, []);
    return (
        <dialog ref={ref} className="ticketiso-dialog" aria-labelledby="ticketiso-modal-title"
            onCancel={(event) => { event.preventDefault(); if (!guardando) onCerrar(); }}
            onClick={(event) => {
                if (event.target !== event.currentTarget || guardando) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onCerrar();
            }}>
            <div className="ticketiso-modal-heading"><div><span className="ticketiso-section-label">Ticket ISO</span><h3 id="ticketiso-modal-title">{titulo}</h3></div>
                <button type="button" className="ticketiso-icon-button" onClick={onCerrar} disabled={guardando} aria-label="Cerrar ventana"><i className="fas fa-times" /></button>
            </div>
            {children}
        </dialog>
    );
};

function TicketISO() {
    const esAdmin = useMemo(() => {
        try {
            const token = localStorage.getItem("token");
            return !!token && String(jwtDecode(token)?.rol || "").trim().toLowerCase() === "admin";
        } catch { return false; }
    }, []);
    const [seccion, setSeccion] = useState("tickets");
    const [mes, setMes] = useState(obtenerMesActual);
    const [tickets, setTickets] = useState([]);
    const [catalogos, setCatalogos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const [pagina, setPagina] = useState(1);
    const [porPagina, setPorPagina] = useState(10);
    const [modal, setModal] = useState(null);
    const [formulario, setFormulario] = useState(() => crearFormularioTicketISO());
    const [numeroManual, setNumeroManual] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [cargandoTicket, setCargandoTicket] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorFormulario, setErrorFormulario] = useState("");
    const solicitudTicketRef = useRef(0);

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const [lista, opciones] = await Promise.all([obtenerTicketsISO(), obtenerCatalogosTicketISO()]);
            setTickets(Array.isArray(lista) ? lista : []);
            setCatalogos(opciones);
        } catch (err) {
            setError(err.response?.data?.error || (err.response?.status === 404
                ? "Reinicia el backend actualizado para habilitar Ticket ISO."
                : "No se pudieron cargar los tickets. Intenta actualizar nuevamente."));
        } finally { setCargando(false); }
    }, []);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    const filtrados = useMemo(() => {
        const texto = normalizarBusquedaTicketISO(busqueda);
        return tickets.filter((ticket) => (!estadoFiltro || ticket.estado === estadoFiltro)
            && (!texto || normalizarBusquedaTicketISO([ticket.numero_ticket,
                ticket.problema, ticket.responsable, ticket.observaciones, ORIGENES_TICKET_ISO[ticket.origen], CATEGORIAS_TICKET_ISO[ticket.categoria_procedimiento]].filter(Boolean).join(" ")).includes(texto)));
    }, [tickets, busqueda, estadoFiltro]);
    const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
    const paginaActual = Math.min(pagina, paginas);
    const visibles = filtrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

    const cerrarModal = () => {
        if (guardando) return;
        solicitudTicketRef.current += 1;
        setModal(null);
        setCargandoTicket(false);
    };
    const cambiarCampo = (event) => {
        const { name, value } = event.target;
        if (name === "numero_ticket") setNumeroManual(true);
        setFormulario((actual) => ({ ...actual, [name]: value,
            ...(name === "estado" ? { fecha_cierre: value === "resuelto" ? (actual.fecha_cierre || fechaTicketISOParaInput(new Date())) : actual.estado === "resuelto" ? "" : actual.fecha_cierre } : {}),
        }));
        setErrorFormulario("");
    };
    const abrirTicket = async (ticket, vista = "detalle") => {
        const solicitud = ++solicitudTicketRef.current;
        setErrorFormulario("");
        setDetalle(null);
        setEditandoId(ticket?.id_ticket || null);
        setNumeroManual(false);
        setFormulario({ ...crearFormularioTicketISO(), numero_ticket: ticket ? "" : sugerirNumeroTicketISO(tickets, catalogos?.proximo_numero) });
        setModal(ticket ? vista : "formulario");
        if (!ticket) return;
        setCargandoTicket(true);
        try {
            const actualizado = await obtenerTicketISO(ticket.id_ticket);
            if (solicitudTicketRef.current !== solicitud) return;
            setDetalle(actualizado);
            setFormulario(crearFormularioTicketISO(actualizado));
        } catch (err) {
            if (solicitudTicketRef.current === solicitud) setErrorFormulario(err.response?.data?.error || "No se pudo cargar el ticket.");
        } finally {
            if (solicitudTicketRef.current === solicitud) setCargandoTicket(false);
        }
    };
    const guardarTicket = async (event) => {
        event.preventDefault();
        if (guardando || cargandoTicket) return;
        setErrorFormulario("");
        let payload;
        try {
            payload = { ...formulario, numero_ticket: formulario.numero_ticket.trim().toUpperCase(),
                numero_automatico: !editandoId && (!numeroManual || !formulario.numero_ticket.trim()),
                fecha_cierre: formulario.fecha_cierre || null,
            };
            if (formulario.estado === "resuelto" && !payload.fecha_cierre) throw new Error("Indica una fecha de cierre.");
            if (payload.fecha_cierre && payload.fecha_cierre < payload.fecha_recepcion) throw new Error("El cierre no puede ser anterior a la recepcion del ticket.");
            if (!payload.numero_automatico && payload.numero_ticket && tickets.some((ticket) => ticket.numero_ticket.toUpperCase() === payload.numero_ticket && ticket.id_ticket !== editandoId)) throw new Error("Ese numero de ticket ya esta registrado.");
        } catch (err) { setErrorFormulario(err.message); return; }
        setGuardando(true);
        try {
            const guardado = editandoId ? await actualizarTicketISO(editandoId, payload) : await crearTicketISO(payload);
            setTickets((actuales) => [...actuales.filter((ticket) => ticket.id_ticket !== guardado.id_ticket), guardado]
                .sort((a, b) => new Date(b.fecha_recepcion) - new Date(a.fecha_recepcion) || b.id_ticket - a.id_ticket));
            setMensaje(editandoId ? "Ticket actualizado correctamente." : "Ticket registrado correctamente.");
            setModal(null);
            obtenerCatalogosTicketISO().then(setCatalogos).catch(() => {});
        } catch (err) { setErrorFormulario(err.response?.data?.error || "No se pudo guardar el ticket. Intenta nuevamente."); }
        finally { setGuardando(false); }
    };
    const confirmarEliminacion = (ticket) => {
        if (!esAdmin || guardando) return;
        solicitudTicketRef.current += 1;
        setDetalle(ticket);
        setErrorFormulario("");
        setModal("eliminar");
    };
    const eliminarTicket = async () => {
        if (!esAdmin || guardando || !detalle) return;
        setGuardando(true);
        setErrorFormulario("");
        try {
            await eliminarTicketISO(detalle.id_ticket);
            setTickets((actuales) => actuales.filter((ticket) => ticket.id_ticket !== detalle.id_ticket));
            setMensaje("Ticket eliminado correctamente.");
            setModal(null);
        } catch (err) {
            setErrorFormulario(err.response?.data?.error || "No se pudo eliminar el ticket. Intenta nuevamente.");
        } finally { setGuardando(false); }
    };
    const periodo = mes ? new Intl.DateTimeFormat("es-CL", {
        timeZone: "America/Santiago", month: "long", year: "numeric",
    }).format(new Date(`${mes}-01T12:00:00-03:00`)) : "Selecciona un mes";

    return (
        <div className="ticketiso-page">
            <header className="ticketiso-hero">
                <div className="ticketiso-hero-copy">
                    <span className="ticketiso-eyebrow">Control de reclamos</span>
                    <h2>Ticket ISO</h2>
                    <p>Un espacio para registrar los correos de Ticketiso y seguir cada caso hasta su solucion.</p>
                </div>
                <span className="ticketiso-stage"><i className="fas fa-pencil-alt" aria-hidden="true" /> Registro manual</span>
            </header>

            {error && <div className="ticketiso-alert error" role="alert">{error}</div>}
            {mensaje && <div className="ticketiso-alert success" role="status">{mensaje}<button type="button" onClick={() => setMensaje("")} aria-label="Ocultar mensaje"><i className="fas fa-times" /></button></div>}

            <nav className="ticketiso-navigation" aria-label="Vistas de Ticket ISO">
                {SECCIONES.map((item) => (
                    <button key={item.id} type="button" className={seccion === item.id ? "active" : ""}
                        aria-pressed={seccion === item.id} aria-controls="ticketiso-content" onClick={() => setSeccion(item.id)}>
                        <i className={item.icono} aria-hidden="true" /> {item.nombre}
                    </button>
                ))}
            </nav>

            <section id="ticketiso-content" className="ticketiso-panel" aria-labelledby="ticketiso-panel-title">
                {seccion === "tickets" && (
                    <>
                        <div className="ticketiso-panel-heading">
                            <div><span className="ticketiso-section-label">Registro y seguimiento</span><h3 id="ticketiso-panel-title">Tickets registrados</h3></div>
                            <div className="ticketiso-toolbar-actions">
                                <button type="button" className="ticketiso-button secondary" onClick={cargarDatos} disabled={cargando}><i className={`fas ${cargando ? "fa-spinner fa-spin" : "fa-sync-alt"}`} /> Actualizar</button>
                                <button type="button" className="ticketiso-button primary" disabled={cargando || !catalogos} onClick={() => abrirTicket(null)}><i className="fas fa-plus" /> Nuevo ticket</button>
                            </div>
                        </div>
                        <div className="ticketiso-filters">
                            <div><label htmlFor="ticketiso-search">Buscar ticket</label><input id="ticketiso-search" type="search" placeholder="Numero, problema, responsable, observaciones, origen o categoria" value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} /></div>
                            <div><label htmlFor="ticketiso-filter-status">Estado</label><select id="ticketiso-filter-status" value={estadoFiltro} onChange={(event) => { setEstadoFiltro(event.target.value); setPagina(1); }}><option value="">Todos los estados</option>{Object.entries(ESTADOS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                        </div>
                        <div className="ticketiso-table-scroll">
                            <table className="ticketiso-table ticketiso-records">
                                <caption className="sr-only">Tickets ISO registrados</caption>
                                <thead><tr>{["Ticket", "Recepcion", "Categoria de procedimiento", "Descripcion del problema", "Estado", "Origen", "Responsable", "Fecha de cierre", "Acciones"].map((nombre) => <th key={nombre} scope="col">{nombre}</th>)}</tr></thead>
                                <tbody>
                                    {cargando ? <tr><td colSpan={9} className="ticketiso-table-empty"><i className="fas fa-spinner fa-spin" /> Cargando tickets...</td></tr> : visibles.map((ticket) => (
                                        <tr key={ticket.id_ticket}>
                                            <td><strong>{ticket.numero_ticket}</strong></td>
                                            <td>{formatearFechaTicketISO(ticket.fecha_recepcion)}</td>
                                            <td>{CATEGORIAS_TICKET_ISO[ticket.categoria_procedimiento] || "Sin categoria registrada"}</td>
                                            <td><span className="ticketiso-problem-preview" title={ticket.problema}>{ticket.problema}</span></td>
                                            <td><EstadoTicket estado={ticket.estado} /></td>
                                            <td>{ORIGENES_TICKET_ISO[ticket.origen] || "Sin origen registrado"}</td>
                                            <td>{ticket.responsable || "Sin asignar"}</td>
                                            <td>{formatearFechaTicketISO(ticket.fecha_cierre)}{ticket.fecha_cierre && ticket.estado !== "resuelto" && <small>Prevista</small>}</td>
                                            <td><div className="ticketiso-row-actions"><button type="button" className="ticketiso-icon-button" onClick={() => abrirTicket(ticket)} title="Ver detalle" aria-label={`Ver ticket ${ticket.numero_ticket}`}><i className="fas fa-eye" /></button><button type="button" className="ticketiso-icon-button edit" onClick={() => abrirTicket(ticket, "formulario")} title="Editar ticket" aria-label={`Editar ticket ${ticket.numero_ticket}`}><i className="fas fa-pen" /></button>{esAdmin && <button type="button" className="ticketiso-icon-button delete" onClick={() => confirmarEliminacion(ticket)} title="Eliminar ticket" aria-label={`Eliminar ticket ${ticket.numero_ticket}`}><i className="fas fa-trash-alt" /></button>}</div></td>
                                        </tr>
                                    ))}
                                    {!cargando && !visibles.length && <tr><td colSpan={9} className="ticketiso-table-empty"><EstadoInicial icono="fas fa-envelope-open-text" titulo={error ? "No se pudieron cargar los tickets" : tickets.length ? "Sin resultados para estos filtros" : "Aun no hay tickets registrados"} descripcion={error ? "Usa Actualizar para volver a cargar la informacion." : tickets.length ? "Prueba otro texto o estado." : "Presiona Nuevo ticket para registrar el primer reclamo recibido."} /></td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="ticketiso-pagination"><span>{filtrados.length} tickets</span><label>Por pagina <select value={porPagina} onChange={(event) => { setPorPagina(Number(event.target.value)); setPagina(1); }}>{[5, 10, 15, 20, 50].map((valor) => <option key={valor} value={valor}>{valor}</option>)}</select></label><div><button type="button" className="ticketiso-button secondary" disabled={paginaActual <= 1} onClick={() => setPagina(paginaActual - 1)}>Anterior</button><span>{paginaActual} / {paginas}</span><button type="button" className="ticketiso-button secondary" disabled={paginaActual >= paginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button></div></div>
                    </>
                )}

                {seccion === "resumen" && (
                    <>
                        <div className="ticketiso-panel-heading">
                            <div><span className="ticketiso-section-label">Estadisticas por periodo</span><h3 id="ticketiso-panel-title">Resumen mensual</h3></div>
                            <div className="ticketiso-month"><label htmlFor="ticketiso-month">Mes a consultar</label><input id="ticketiso-month" type="month" value={mes} min="1900-01" max="9999-12" onChange={(event) => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) setMes(event.target.value); }} /></div>
                        </div>
                        <p className="ticketiso-period">{periodo}</p>
                        <ResumenMensualTicketISO tickets={tickets} mes={mes} onMesChange={setMes} cargando={cargando} error={error} onActualizar={cargarDatos} />
                    </>
                )}

            </section>

            <aside className="ticketiso-next-step">
                <span className="ticketiso-next-icon"><i className="fas fa-pencil-alt" aria-hidden="true" /></span>
                <div><strong>Registro y seguimiento de Ticket ISO</strong><p>Consulta los tickets, compara sus totales mensuales y revisa el indicador de cierre en Resumen mensual.</p></div>
            </aside>

            {modal && <ModalTicketISO key={modal} titulo={modal === "eliminar" ? "Eliminar ticket" : modal === "detalle" ? "Detalle del ticket" : editandoId ? "Editar ticket" : "Nuevo ticket"} onCerrar={cerrarModal} guardando={guardando}>
                {modal === "eliminar" ? <>
                    <div className="ticketiso-modal-body">
                        {errorFormulario && <div className="ticketiso-alert error" role="alert">{errorFormulario}</div>}
                        <p>Eliminar el ticket <strong>{detalle?.numero_ticket}</strong>? Esta accion no se puede deshacer y lo retirara de los resumenes e indicadores.</p>
                    </div>
                    <div className="ticketiso-modal-footer"><button type="button" className="ticketiso-button secondary" disabled={guardando} onClick={cerrarModal}>Cancelar</button><button type="button" className="ticketiso-button danger" disabled={guardando} onClick={eliminarTicket}><i className={`fas ${guardando ? "fa-spinner fa-spin" : "fa-trash-alt"}`} /> {guardando ? "Eliminando..." : "Confirmar eliminacion"}</button></div>
                </> : modal === "formulario" ? <form className="ticketiso-form" onSubmit={guardarTicket}>
                    <div className="ticketiso-modal-body">
                        {errorFormulario && <div className="ticketiso-alert error" role="alert">{errorFormulario}</div>}
                        {cargandoTicket && <p role="status"><i className="fas fa-spinner fa-spin" /> Cargando ticket...</p>}
                        <fieldset disabled={guardando || cargandoTicket || (!!editandoId && !detalle)} className="ticketiso-form-grid">
                            <div className="ticketiso-field"><label htmlFor="ticketiso-number">Numero de ticket</label><input id="ticketiso-number" name="numero_ticket" value={formulario.numero_ticket} onChange={cambiarCampo} maxLength={120} /><small>{editandoId ? "Puedes cambiarlo o dejarlo vacio para mantener el numero actual." : "Numero automatico. Puedes borrarlo y escribir uno manual."}</small></div>
                            <div className="ticketiso-field"><label htmlFor="ticketiso-received">Fecha de recepcion *</label><input id="ticketiso-received" type="date" name="fecha_recepcion" value={formulario.fecha_recepcion} onChange={cambiarCampo} required /></div>
                            <div className="ticketiso-field full"><label htmlFor="ticketiso-category">Categoria de procedimiento *</label><select id="ticketiso-category" name="categoria_procedimiento" value={formulario.categoria_procedimiento} onChange={cambiarCampo} required><option value="">Selecciona una categoria</option>{Object.entries(CATEGORIAS_TICKET_ISO).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                            <div className="ticketiso-field full"><label htmlFor="ticketiso-problem">Descripcion del problema *</label><textarea id="ticketiso-problem" name="problema" value={formulario.problema} onChange={cambiarCampo} required maxLength={10000} rows={3} placeholder="Describe el reclamo recibido por correo." /></div>
                            <div className="ticketiso-field"><label htmlFor="ticketiso-state">Estado *</label><select id="ticketiso-state" className={`ticketiso-state-select ${formulario.estado}`} name="estado" value={formulario.estado} onChange={cambiarCampo}>{Object.entries(ESTADOS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                            <div className="ticketiso-field"><label htmlFor="ticketiso-origin">Origen *</label><select id="ticketiso-origin" name="origen" value={formulario.origen} onChange={cambiarCampo} required><option value="">Selecciona un origen</option>{Object.entries(ORIGENES_TICKET_ISO).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                            <div className="ticketiso-field"><label htmlFor="ticketiso-owner">Responsable</label><input id="ticketiso-owner" type="text" name="responsable" value={formulario.responsable} onChange={cambiarCampo} maxLength={100} placeholder="Nombre del responsable" /></div>
                            <div className="ticketiso-field"><label htmlFor="ticketiso-closed">Fecha de cierre{formulario.estado === "resuelto" ? " *" : ""}</label><input id="ticketiso-closed" type="date" name="fecha_cierre" value={formulario.fecha_cierre} onChange={cambiarCampo} required={formulario.estado === "resuelto"} min={formulario.fecha_recepcion} /><small>{formulario.estado === "resuelto" ? "Fecha real de cierre del ticket." : "Opcional: indica una fecha prevista de cierre, sin cambiar el estado."}</small></div>
                            <div className="ticketiso-field full"><label htmlFor="ticketiso-notes">Observaciones</label><textarea id="ticketiso-notes" name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} maxLength={10000} rows={3} placeholder="Comentarios, acciones realizadas o notas de seguimiento." /></div>
                        </fieldset>
                    </div>
                    <div className="ticketiso-modal-footer"><button type="button" className="ticketiso-button secondary" disabled={guardando} onClick={cerrarModal}>Cancelar</button><button type="submit" className="ticketiso-button primary" disabled={guardando || cargandoTicket || (!!editandoId && !detalle)}><i className={`fas ${guardando ? "fa-spinner fa-spin" : "fa-save"}`} /> {guardando ? "Guardando..." : "Guardar ticket"}</button></div>
                </form> : <>
                    <div className="ticketiso-modal-body">
                        {cargandoTicket && <p role="status"><i className="fas fa-spinner fa-spin" /> Cargando ticket...</p>}
                        {errorFormulario && <div className="ticketiso-alert error" role="alert">{errorFormulario}</div>}
                        {detalle && <div className="ticketiso-detail-grid">
                            {[
                                ["Numero de ticket", detalle.numero_ticket], ["Estado", <EstadoTicket estado={detalle.estado} />],
                                ["Origen", ORIGENES_TICKET_ISO[detalle.origen] || "Sin origen registrado"],
                                ["Categoria de procedimiento", CATEGORIAS_TICKET_ISO[detalle.categoria_procedimiento] || "Sin categoria registrada"],
                                ["Recepcion", formatearFechaTicketISO(detalle.fecha_recepcion)], [detalle.estado === "resuelto" ? "Fecha de cierre" : "Fecha de cierre prevista", formatearFechaTicketISO(detalle.fecha_cierre)],
                                ["Responsable", detalle.responsable || "Sin asignar"],
                            ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}
                            <div className="full"><small>Descripcion del problema</small><p>{detalle.problema}</p></div>
                            <div className="full"><small>Observaciones</small><p>{detalle.observaciones || "Sin observaciones registradas."}</p></div>
                            {detalle.solucion && <div className="full"><small>Solucion aplicada</small><p>{detalle.solucion}</p></div>}
                            {detalle.creado_por_nombre && <div><small>Registrado por</small><strong>{detalle.creado_por_nombre}</strong></div>}
                            <div><small>Ultima actualizacion</small><strong>{formatearFechaHoraTicketISO(detalle.updated_at)}</strong></div>
                        </div>}
                    </div>
                    <div className="ticketiso-modal-footer"><button type="button" className="ticketiso-button secondary" onClick={cerrarModal}>Cerrar</button>{detalle && <button type="button" className="ticketiso-button primary" onClick={() => { setFormulario(crearFormularioTicketISO(detalle)); setEditandoId(detalle.id_ticket); setModal("formulario"); }}><i className="fas fa-pen" /> Editar ticket</button>}</div>
                </>}
            </ModalTicketISO>}
        </div>
    );
}

export default TicketISO;
