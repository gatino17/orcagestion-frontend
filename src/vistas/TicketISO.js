import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { actualizarPlanAccionTicketISO, actualizarTicketISO, cerrarTicketISO, crearTicketISO, eliminarTicketISO, guardarPlanAccionTicketISO, obtenerCatalogosTicketISO, obtenerTicketISO, obtenerTicketsISO } from "../api";
import { jwtDecode } from "jwt-decode";
import { CATEGORIAS_TICKET_ISO, ORIGENES_TICKET_ISO, crearFormularioTicketISO, fechaTicketISOParaInput, formatearFechaTicketISO, formatearFechaHoraTicketISO, normalizarBusquedaTicketISO, sugerirNumeroTicketISO } from "../utils/ticketISO";
import ResumenMensualTicketISO from "../components/ResumenMensualTicketISO";
import ListaPlanesTicketISO from "../components/ListaPlanesTicketISO";
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
    const puedeEliminar = useMemo(() => {
        try {
            const token = localStorage.getItem("token");
            const rol = token ? String(jwtDecode(token)?.rol || "").trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
            return ["admin", "ticket_iso"].includes(rol);
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
    const [plan, setPlan] = useState({ resultado_plan_accion: "", fecha_control: "" });
    const [planEditandoId, setPlanEditandoId] = useState(null);
    const [cierre, setCierre] = useState("");
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
                ticket.problema, ticket.responsable, ticket.observaciones, ...(ticket.planes_accion || []).map((item) => item.resultado_plan_accion), ORIGENES_TICKET_ISO[ticket.origen], CATEGORIAS_TICKET_ISO[ticket.categoria_procedimiento]].filter(Boolean).join(" ")).includes(texto)));
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
        setPlan({ resultado_plan_accion: "", fecha_control: "" });
        setPlanEditandoId(null);
        setCierre("");
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
            setCierre(fechaTicketISOParaInput(actualizado.fecha_cierre) || fechaTicketISOParaInput(new Date()));
            if (vista === "editar-plan") {
                const seleccionado = actualizado.planes_accion?.[0];
                if (!seleccionado) {
                    setErrorFormulario("Este ticket no tiene planes de accion para editar.");
                } else {
                    setPlanEditandoId(seleccionado.id_plan);
                    setPlan({ resultado_plan_accion: seleccionado.resultado_plan_accion || "", fecha_control: fechaTicketISOParaInput(seleccionado.fecha_control) });
                }
            }
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
    const guardarPlan = async (event) => {
        event.preventDefault();
        if (guardando || cargandoTicket || !detalle) return;
        setErrorFormulario("");
        if (modal === "editar-plan" && !planEditandoId) return;
        if (!plan.resultado_plan_accion.trim()) {
            setErrorFormulario("Indica una breve descripcion del resultado.");
            return;
        }
        if (plan.fecha_control && plan.fecha_control < detalle.fecha_recepcion) {
            setErrorFormulario("La fecha de control no puede ser anterior a la recepcion del ticket.");
            return;
        }
        setGuardando(true);
        try {
            const payload = {
                resultado_plan_accion: plan.resultado_plan_accion.trim(),
                fecha_control: plan.fecha_control || null,
            };
            const guardado = modal === "editar-plan"
                ? await actualizarPlanAccionTicketISO(detalle.id_ticket, planEditandoId, payload)
                : await guardarPlanAccionTicketISO(detalle.id_ticket, payload);
            setTickets((actuales) => actuales.map((ticket) => ticket.id_ticket === guardado.id_ticket ? guardado : ticket));
            setMensaje(modal === "editar-plan" ? "Plan de accion actualizado correctamente." : "Nuevo plan de accion agregado correctamente.");
            setModal(null);
        } catch (err) {
            setErrorFormulario(err.response?.data?.error || "No se pudo guardar el plan de accion. Intenta nuevamente.");
        } finally { setGuardando(false); }
    };
    const cambiarPlan = ({ target: { name, value } }) => {
        setPlan((actual) => ({ ...actual, [name]: value }));
        setErrorFormulario("");
    };
    const seleccionarPlan = (event) => {
        const seleccionado = detalle?.planes_accion?.find((item) => String(item.id_plan) === event.target.value);
        setPlanEditandoId(seleccionado?.id_plan || null);
        setPlan({ resultado_plan_accion: seleccionado?.resultado_plan_accion || "", fecha_control: fechaTicketISOParaInput(seleccionado?.fecha_control) });
        setErrorFormulario("");
    };
    const guardarCierre = async (event) => {
        event.preventDefault();
        if (guardando || cargandoTicket || !detalle) return;
        if (!cierre || cierre < detalle.fecha_recepcion) {
            setErrorFormulario(!cierre ? "Indica una fecha de cierre." : "El cierre no puede ser anterior a la recepcion del ticket.");
            return;
        }
        setGuardando(true);
        setErrorFormulario("");
        try {
            const guardado = await cerrarTicketISO(detalle.id_ticket, { fecha_cierre: cierre });
            setTickets((actuales) => actuales.map((ticket) => ticket.id_ticket === guardado.id_ticket ? guardado : ticket));
            setMensaje("Caso cerrado correctamente. El ticket quedo resuelto.");
            setModal(null);
        } catch (err) {
            setErrorFormulario(err.response?.data?.error || "No se pudo cerrar el caso. Intenta nuevamente.");
        } finally { setGuardando(false); }
    };
    const confirmarEliminacion = (ticket) => {
        if (!puedeEliminar || guardando) return;
        solicitudTicketRef.current += 1;
        setDetalle(ticket);
        setErrorFormulario("");
        setModal("eliminar");
    };
    const eliminarTicket = async () => {
        if (!puedeEliminar || guardando || !detalle) return;
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
                                <thead><tr>{["Ticket", "Recepcion", "Categoria de procedimiento", "Descripcion del problema", "Estado", "Origen", "Responsable", "Fecha de cierre", "Planes de accion", "Acciones"].map((nombre) => <th key={nombre} scope="col" className={nombre === "Planes de accion" ? "ticketiso-plans-column" : undefined}>{nombre}</th>)}</tr></thead>
                                <tbody>
                                    {cargando ? <tr><td colSpan={10} className="ticketiso-table-empty"><i className="fas fa-spinner fa-spin" /> Cargando tickets...</td></tr> : visibles.map((ticket) => (
                                        <tr key={ticket.id_ticket}>
                                            <td><strong>{ticket.numero_ticket}</strong></td>
                                            <td>{formatearFechaTicketISO(ticket.fecha_recepcion)}</td>
                                            <td>{CATEGORIAS_TICKET_ISO[ticket.categoria_procedimiento] || "Sin categoria registrada"}</td>
                                            <td><span className="ticketiso-problem-preview" title={ticket.problema}>{ticket.problema}</span></td>
                                            <td><EstadoTicket estado={ticket.estado} /></td>
                                            <td>{ORIGENES_TICKET_ISO[ticket.origen] || "Sin origen registrado"}</td>
                                            <td>{ticket.responsable || "Sin asignar"}</td>
                                            <td>{formatearFechaTicketISO(ticket.fecha_cierre)}{ticket.fecha_cierre && ticket.estado !== "resuelto" && <small>Prevista</small>}</td>
                                            <td className="ticketiso-plans-column"><span className={`ticketiso-plans-count${ticket.planes_accion?.length ? "" : " empty"}`} aria-label={`${ticket.planes_accion?.length || 0} ${ticket.planes_accion?.length === 1 ? "plan" : "planes"} de accion`}>{ticket.planes_accion?.length || 0}</span></td>
                                            <td><div className="ticketiso-row-actions"><button type="button" className="ticketiso-icon-button" onClick={() => abrirTicket(ticket)} title="Ver detalle" aria-label={`Ver ticket ${ticket.numero_ticket}`}><i className="fas fa-eye" /></button><button type="button" className="ticketiso-icon-button plan" onClick={() => abrirTicket(ticket, "plan")} title="Plan de accion" aria-label={`Plan de accion del ticket ${ticket.numero_ticket}`}><i className="fas fa-plus" aria-hidden="true" /></button><button type="button" className="ticketiso-icon-button edit" onClick={() => abrirTicket(ticket, "formulario")} title="Editar ticket" aria-label={`Editar ticket ${ticket.numero_ticket}`}><i className="fas fa-pen" /></button>{puedeEliminar && <button type="button" className="ticketiso-icon-button delete" onClick={() => confirmarEliminacion(ticket)} title="Eliminar ticket" aria-label={`Eliminar ticket ${ticket.numero_ticket}`}><i className="fas fa-trash-alt" /></button>}</div></td>
                                        </tr>
                                    ))}
                                    {!cargando && !visibles.length && <tr><td colSpan={10} className="ticketiso-table-empty"><EstadoInicial icono="fas fa-envelope-open-text" titulo={error ? "No se pudieron cargar los tickets" : tickets.length ? "Sin resultados para estos filtros" : "Aun no hay tickets registrados"} descripcion={error ? "Usa Actualizar para volver a cargar la informacion." : tickets.length ? "Prueba otro texto o estado." : "Presiona Nuevo ticket para registrar el primer reclamo recibido."} /></td></tr>}
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

            {modal && <ModalTicketISO key={modal} titulo={modal === "editar-plan" ? "Editar plan de accion" : modal === "cierre" ? "Cierre del caso" : modal === "plan" ? "Plan de accion" : modal === "eliminar" ? "Eliminar ticket" : modal === "detalle" ? "Detalle del ticket" : editandoId ? "Editar ticket" : "Nuevo ticket"} onCerrar={cerrarModal} guardando={guardando}>
                {modal === "cierre" ? <form className="ticketiso-form" onSubmit={guardarCierre}>
                    <div className="ticketiso-modal-body">
                        {errorFormulario && <div className="ticketiso-alert error" role="alert">{errorFormulario}</div>}
                        {cargandoTicket && <p role="status">Cargando ticket...</p>}
                        {detalle && <p>Cierre definitivo de <strong>{detalle.numero_ticket}</strong>. Sus planes de accion se conservaran.</p>}
                        <fieldset className="ticketiso-form-grid" disabled={guardando || cargandoTicket || !detalle}>
                            <div className="ticketiso-field full"><label htmlFor="ticketiso-case-closed">Fecha de cierre *</label><input id="ticketiso-case-closed" type="date" value={cierre} onChange={(event) => { setCierre(event.target.value); setErrorFormulario(""); }} required min={detalle?.fecha_recepcion} /><small>Es la misma fecha del ticket. Confirmar el cierre marcara el caso como Resuelto.</small></div>
                        </fieldset>
                    </div>
                    <div className="ticketiso-modal-footer"><button type="button" className="ticketiso-button secondary" disabled={guardando} onClick={cerrarModal}>Cancelar</button><button type="submit" className="ticketiso-button primary" disabled={guardando || cargandoTicket || !detalle}>{guardando ? "Guardando..." : "Confirmar cierre"}</button></div>
                </form> : (modal === "plan" || modal === "editar-plan") ? <form className="ticketiso-form" onSubmit={guardarPlan}>
                    <div className="ticketiso-modal-body">
                        {errorFormulario && <div className="ticketiso-alert error" role="alert">{errorFormulario}</div>}
                        {cargandoTicket && <p role="status"><i className="fas fa-spinner fa-spin" /> Cargando plan de accion...</p>}
                        {detalle && <p className="ticketiso-plan-ticket"><strong>{detalle.numero_ticket}</strong><EstadoTicket estado={detalle.estado} /></p>}
                        <fieldset disabled={guardando || cargandoTicket || !detalle} className="ticketiso-form-grid">
                            {modal === "editar-plan" && <div className="ticketiso-field full"><label htmlFor="ticketiso-plan-select">Plan a editar</label><select id="ticketiso-plan-select" value={planEditandoId || ""} onChange={seleccionarPlan} required><option value="">Selecciona un plan</option>{(detalle?.planes_accion || []).map((item, index, planes) => <option key={item.id_plan} value={item.id_plan}>Plan {item.numero || planes.length - index} - {(item.resultado_plan_accion || "Sin resultado registrado").slice(0, 90)}</option>)}</select></div>}
                            <div className="ticketiso-field full"><label htmlFor="ticketiso-plan-result">Breve descripcion del resultado</label><textarea id="ticketiso-plan-result" name="resultado_plan_accion" value={plan.resultado_plan_accion} onChange={cambiarPlan} required rows={4} maxLength={2000} placeholder="Resume las acciones realizadas y el resultado obtenido." /><small>{modal === "editar-plan" ? "Solo se actualizara el plan seleccionado. No se agregara otro ni se modificara el cierre del caso." : "Se agregara un nuevo plan sin reemplazar los anteriores ni cerrar el caso."}</small></div>
                            <div className="ticketiso-field"><label htmlFor="ticketiso-plan-control">Fecha de control</label><input id="ticketiso-plan-control" type="date" name="fecha_control" value={plan.fecha_control} onChange={cambiarPlan} min={detalle?.fecha_recepcion} /></div>
                        </fieldset>
                    </div>
                    <div className="ticketiso-modal-footer"><button type="button" className="ticketiso-button secondary" disabled={guardando} onClick={cerrarModal}>Cancelar</button><button type="submit" className="ticketiso-button primary" disabled={guardando || cargandoTicket || !detalle || (modal === "editar-plan" && !planEditandoId)}><i className={`fas ${guardando ? "fa-spinner fa-spin" : "fa-save"}`} /> {guardando ? "Guardando..." : modal === "editar-plan" ? "Guardar cambios del plan" : "Guardar plan de accion"}</button></div>
                </form> : modal === "eliminar" ? <>
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
                        {detalle && <div className="ticketiso-detail">
                            <div className="ticketiso-detail-summary">
                                <div><small>Numero de ticket</small><strong>{detalle.numero_ticket}</strong></div>
                                <EstadoTicket estado={detalle.estado} />
                            </div>
                            <section className="ticketiso-detail-section" aria-labelledby="ticketiso-detail-data">
                                <h4 id="ticketiso-detail-data"><i className="fas fa-ticket-alt" aria-hidden="true" /> Datos del ticket</h4>
                                <dl className="ticketiso-detail-fields">
                                    {[
                                        ["Categoria de procedimiento", CATEGORIAS_TICKET_ISO[detalle.categoria_procedimiento] || "Sin categoria registrada"],
                                        ["Origen", ORIGENES_TICKET_ISO[detalle.origen] || "Sin origen registrado"],
                                        ["Responsable", detalle.responsable || "Sin asignar"],
                                        ["Fecha de recepcion", formatearFechaTicketISO(detalle.fecha_recepcion)],
                                    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                                </dl>
                            </section>
                            <section className="ticketiso-detail-section" aria-labelledby="ticketiso-detail-problem">
                                <h4 id="ticketiso-detail-problem"><i className="fas fa-align-left" aria-hidden="true" /> Descripcion del problema</h4>
                                <p className="ticketiso-detail-text">{detalle.problema}</p>
                            </section>
                            <section className="ticketiso-detail-section action-plan" aria-labelledby="ticketiso-detail-plan">
                                <div className="ticketiso-detail-section-heading"><h4 id="ticketiso-detail-plan"><i className="fas fa-clipboard-check" aria-hidden="true" /> Planes de accion ({detalle.planes_accion?.length || 0})</h4><div className="ticketiso-toolbar-actions"><button type="button" className="ticketiso-button secondary" onClick={() => abrirTicket(detalle, "plan")}><i className="fas fa-plus" aria-hidden="true" /> Agregar plan</button><button type="button" className="ticketiso-button secondary" disabled={!detalle.planes_accion?.length} onClick={() => abrirTicket(detalle, "editar-plan")}><i className="fas fa-pen" aria-hidden="true" /> Editar plan</button></div></div>
                                <ListaPlanesTicketISO planes={detalle.planes_accion || []} />
                                {detalle.solucion && <div className="ticketiso-detail-result legacy-solution"><span>Solucion aplicada</span><p className="ticketiso-detail-text">{detalle.solucion}</p></div>}
                            </section>
                            <section className="ticketiso-detail-section" aria-labelledby="ticketiso-detail-closing">
                                <h4 id="ticketiso-detail-closing"><i className="fas fa-check-circle" aria-hidden="true" /> Cierre del caso</h4>
                                <dl className="ticketiso-detail-fields"><div><dt>{detalle.estado === "resuelto" ? "Fecha de cierre" : "Fecha de cierre prevista"}</dt><dd>{detalle.fecha_cierre ? formatearFechaTicketISO(detalle.fecha_cierre) : "Sin definir"}</dd></div></dl>
                            </section>
                            <section className="ticketiso-detail-section" aria-labelledby="ticketiso-detail-notes">
                                <h4 id="ticketiso-detail-notes"><i className="fas fa-comment-alt" aria-hidden="true" /> Observaciones</h4>
                                <p className="ticketiso-detail-text">{detalle.observaciones || "Sin observaciones registradas."}</p>
                            </section>
                            <dl className="ticketiso-detail-fields ticketiso-detail-audit" aria-label="Datos de registro">
                                {detalle.creado_por_nombre && <div><dt>Registrado por</dt><dd>{detalle.creado_por_nombre}</dd></div>}
                                <div><dt>Ultima actualizacion</dt><dd>{formatearFechaHoraTicketISO(detalle.updated_at)}</dd></div>
                            </dl>
                        </div>}
                    </div>
                    <div className="ticketiso-modal-footer">{detalle && <>
                        <button type="button" className="ticketiso-button secondary" onClick={() => abrirTicket(detalle, "cierre")}><i className="fas fa-check-circle" aria-hidden="true" /> {detalle.estado === "resuelto" ? "Editar cierre" : "Cerrar caso"}</button>
                        <button type="button" className="ticketiso-button primary" onClick={() => { setFormulario(crearFormularioTicketISO(detalle)); setEditandoId(detalle.id_ticket); setModal("formulario"); }}><i className="fas fa-pen" /> Editar ticket</button>
                    </>}</div>
                </>}
            </ModalTicketISO>}
        </div>
    );
}

export default TicketISO;
