import React, { useEffect, useMemo, useRef, useState } from "react";
import DataTable from "react-data-table-component";
import { agruparResponsabilidadFalla, RESPONSABILIDADES_FALLA } from "../utils/soporteResponsabilidad";
import "./IndicadoresSoporte.css";

function fechaCorta(valor) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor || ""));
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "-";
}

const columnasDetalle = [
    { name: "Caso", selector: (row) => row.case_code || `#${row.id_soporte}`, sortable: true, minWidth: "110px", wrap: true },
    { name: "Cliente", selector: (row) => row.centro?.cliente || "Sin cliente", sortable: true, wrap: true },
    { name: "Centro", selector: (row) => row.centro?.nombre || "Sin centro", sortable: true, wrap: true },
    { name: "Problema", selector: (row) => row.problema || "Sin descripcion", wrap: true, minWidth: "240px" },
    { name: "Fecha", selector: (row) => row.fecha_soporte || "", cell: (row) => fechaCorta(row.fecha_soporte), sortable: true, width: "110px" },
    { name: "Estado", selector: (row) => ({ pendiente: "Pendiente", en_proceso: "En seguimiento", resuelto: "Resuelto", finalizado: "Resuelto" }[row.estado] || row.estado || "Pendiente"), wrap: true },
];

function DetalleResponsabilidad({ categoria, registros, periodo, alcance, onCerrar }) {
    const dialogo = useRef(null);
    useEffect(() => {
        const element = dialogo.current;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        element.showModal();
        return () => {
            if (element.open) element.close();
            document.body.style.overflow = overflowAnterior;
        };
    }, []);

    return <dialog ref={dialogo} className="soporte-responsabilidad-modal" aria-labelledby="responsabilidad-detalle-titulo"
        onCancel={(event) => { event.preventDefault(); onCerrar(); }}>
        <header>
            <div>
                <small>Responsabilidad de la falla</small>
                <h4 id="responsabilidad-detalle-titulo">Casos: {categoria.label}</h4>
                <p>{periodo} / {alcance}</p>
            </div>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCerrar} autoFocus aria-label="Cerrar detalle de responsabilidad">Cerrar</button>
        </header>
        <div className="soporte-responsabilidad-modal-body">
            <p><strong>{registros.length}</strong> {registros.length === 1 ? "caso en esta categoria" : "casos en esta categoria"}.</p>
            <DataTable columns={columnasDetalle} data={registros} keyField="id_soporte" pagination paginationPerPage={10}
                paginationRowsPerPageOptions={[10, 25, 50]} paginationComponentOptions={{ rowsPerPageText: "Casos por pagina", rangeSeparatorText: "de" }}
                highlightOnHover persistTableHead noDataComponent="Sin casos para esta responsabilidad en el mes seleccionado." />
        </div>
    </dialog>;
}

function Dato({ nombre, valor, className = "" }) {
    return <div><span>{nombre}</span><strong className={className}>{valor}</strong></div>;
}

export default function IndicadoresSoporte({ tickets, reinicios, cargandoReinicios, soportesMes, mes, anio, meses, anios,
    onMes, onAnio, onVerReinicios, cliente, centro }) {
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const grupos = useMemo(() => agruparResponsabilidadFalla(soportesMes), [soportesMes]);
    const categoria = RESPONSABILIDADES_FALLA.find((item) => item.key === categoriaSeleccionada);
    const alcance = [cliente || "Todos los clientes", centro ? `Centro: ${centro}` : "Todos los centros"].join(" / ");
    const periodo = `${meses[mes]} ${anio}`;
    const estadoTickets = !tickets.total ? "Sin tickets" : tickets.nivel === "ok" ? "Sobre meta" : tickets.nivel === "alerta" ? "En seguimiento" : "Bajo meta";

    return <section className="soporte-indicadores mb-3" aria-label="Indicadores mensuales de soporte">
        <div className="soporte-indicadores-header">
            <div>
                <h4>Indicadores mensuales</h4>
                <p>{alcance}</p>
                <small>Mes aplicado a estas tres tarjetas.</small>
            </div>
            <div className="soporte-indicadores-periodo">
                <label htmlFor="soporte-indicadores-mes">Mes
                    <select id="soporte-indicadores-mes" className="form-control form-control-sm" value={mes} onChange={(event) => onMes(Number(event.target.value))}>
                        {meses.map((nombre, index) => <option key={nombre} value={index}>{nombre}</option>)}
                    </select>
                </label>
                <label htmlFor="soporte-indicadores-anio">{"A\u00f1o"}
                    <select id="soporte-indicadores-anio" className="form-control form-control-sm" value={anio} onChange={(event) => onAnio(Number(event.target.value))}>
                        {anios.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
                    </select>
                </label>
            </div>
        </div>
        <div className="soporte-indicadores-grid">
            <article className="card indicador-card soporte-indicador-compacto" aria-labelledby="soporte-indicador-cierre">
                <div className="card-body">
                    <h5 id="soporte-indicador-cierre">Cierre en 15 dias</h5>
                    <div className="soporte-indicador-principal">
                        <strong>{tickets.porcentaje.toFixed(1)}<small>%</small></strong>
                        <span className={`indicador-estado ${tickets.total ? `indicador-${tickets.nivel}` : ""}`}>{estadoTickets}</span>
                    </div>
                    <div className="soporte-indicador-datos">
                        <Dato nombre="Tickets del mes" valor={tickets.total} />
                        <Dato nombre="Resueltos" valor={tickets.cerradosTotales} />
                        <Dato nombre="En plazo" valor={tickets.cerradosEnPlazo} />
                        <Dato nombre="Fuera de plazo" valor={tickets.fueraDePlazo} />
                    </div>
                    <details className="soporte-indicador-formula"><summary>Ver calculo</summary>
                        <p>(Tickets cerrados en 15 dias o menos / total de tickets del mes) x 100. Meta: mas del 80%.</p>
                    </details>
                </div>
            </article>
            <article className="card indicador-card indicador-reinicios-card soporte-indicador-compacto" aria-labelledby="soporte-indicador-reinicios" aria-busy={cargandoReinicios}>
                <div className="card-body">
                    <h5 id="soporte-indicador-reinicios">Reinicios de sistemas</h5>
                    <div className="soporte-indicador-principal">
                        <strong>{cargandoReinicios ? "--" : reinicios.porcentaje.toFixed(1)}<small>%</small></strong>
                        <span className={`indicador-estado ${reinicios.total ? `indicador-${reinicios.nivel}` : ""}`}>{cargandoReinicios ? "Cargando" : reinicios.total ? "Cumplimiento" : "Sin centros"}</span>
                    </div>
                    <div className="soporte-indicador-datos">
                        <Dato nombre="Centros activos" valor={reinicios.total} />
                        <Dato nombre="Reiniciados" valor={cargandoReinicios ? "--" : reinicios.reiniciados} className="text-success" />
                        <Dato nombre="Pendientes" valor={cargandoReinicios ? "--" : reinicios.pendientes} className="text-warning" />
                        <Dato nombre="Vencidos" valor={cargandoReinicios ? "--" : reinicios.vencidos} className="text-danger" />
                    </div>
                    <div className="soporte-indicador-footer">
                        <small>Por vencer: {cargandoReinicios ? "--" : reinicios.porVencer}</small>
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={onVerReinicios}>Ver detalle</button>
                    </div>
                </div>
            </article>
            <article className="card indicador-card soporte-indicador-compacto soporte-responsabilidad-card" aria-labelledby="soporte-indicador-responsabilidad">
                <div className="card-body">
                    <h5 id="soporte-indicador-responsabilidad">Responsabilidad de la falla</h5>
                    <p className="soporte-responsabilidad-total"><strong>{soportesMes.length}</strong> casos del mes</p>
                    <div className="soporte-responsabilidad-opciones">
                        {RESPONSABILIDADES_FALLA.map(({ key, label }) => <button type="button" key={key} className={`responsabilidad-${key}`}
                            aria-label={`Ver casos de responsabilidad: ${label} (${grupos[key].length})`} onClick={() => setCategoriaSeleccionada(key)}>
                            <span>{label}</span><strong>{grupos[key].length}</strong>
                        </button>)}
                    </div>
                    <small className="soporte-responsabilidad-ayuda">Selecciona una categoria para ver sus casos.</small>
                </div>
            </article>
        </div>
        {categoria && <DetalleResponsabilidad categoria={categoria} registros={grupos[categoria.key]} periodo={periodo} alcance={alcance} onCerrar={() => setCategoriaSeleccionada(null)} />}
    </section>;
}
