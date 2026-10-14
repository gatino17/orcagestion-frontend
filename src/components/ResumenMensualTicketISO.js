import React, { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, BarController, LineController, Tooltip, Legend } from "chart.js";
import { resumirTicketsISO } from "../utils/ticketISO";
import IndicadorTicketISO from "./IndicadorTicketISO";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, BarController, LineController, Tooltip, Legend);

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const SERIES = [
    { clave: "pendiente", nombre: "Pendientes", color: "#dc3545" },
    { clave: "seguimiento", nombre: "En seguimiento / transito", color: "#e5ac2b" },
    { clave: "resuelto", nombre: "Resueltos / cerrados", color: "#18996c" },
];

export default function ResumenMensualTicketISO({ tickets, mes, onMesChange, cargando, error, onActualizar, ahora }) {
    const anio = mes.slice(0, 4);
    const resumen = useMemo(() => resumirTicketsISO(tickets, anio), [tickets, anio]);
    const seleccionado = resumen.meses.find((item) => item.mes === mes);
    const noDisponible = cargando || (error && !tickets.length);
    const series = resumen.totales.sin_estado ? [...SERIES, { clave: "sin_estado", nombre: "Sin clasificar", color: "#8594a5" }] : SERIES;
    const data = {
        labels: MESES,
        datasets: [
            { type: "line", label: "Total de tickets", data: resumen.meses.map((item) => item.total),
                borderColor: "#0f67ae", backgroundColor: "#0f67ae", pointBackgroundColor: "#fff",
                pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2, tension: 0.2,
                stack: "total", order: 0 },
            ...series.map((serie) => ({ type: "bar", label: serie.nombre, data: resumen.meses.map((item) => item[serie.clave]),
                backgroundColor: serie.color, borderColor: serie.color, borderWidth: resumen.meses.map((item) => item.mes === mes ? 2 : 0),
                stack: "estados", order: 1, maxBarThickness: 42, borderRadius: 3 })),
        ],
    };
    const options = {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true, padding: 18, font: { size: 11 } } },
            tooltip: { callbacks: { title: (items) => items.length ? `${MESES[items[0].dataIndex]} ${anio}` : "" } } },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { color: "#64748b" } },
            y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: "#64748b" },
                title: { display: true, text: "Cantidad de tickets" }, grid: { color: "#edf2f6" } } },
        onClick: (_event, elementos) => { if (elementos.length) onMesChange(resumen.meses[elementos[0].index].mes); },
    };
    const indicadores = [
        { nombre: "Recibidos en el mes", clave: "total", icono: "fas fa-inbox", tono: "blue" },
        { nombre: "Pendientes", clave: "pendiente", icono: "far fa-clock", tono: "red" },
        { nombre: "En seguimiento / transito", clave: "seguimiento", icono: "fas fa-search", tono: "amber" },
        { nombre: "Resueltos / cerrados", clave: "resuelto", icono: "fas fa-check", tono: "green" },
    ];
    return <>
        <div className="ticketiso-metrics">
            {indicadores.map((item) => <div key={item.clave} className={`ticketiso-metric ${item.tono}`}>
                <span><i className={item.icono} aria-hidden="true" /> {item.nombre}</span>
                <strong aria-label={`${item.nombre}: ${noDisponible ? "no disponible" : seleccionado?.[item.clave] || 0}`}>{noDisponible ? "-" : seleccionado?.[item.clave] || 0}</strong>
                <small>{item.clave === "total" ? "Segun fecha de recepcion" : "Estado actual de los recibidos en este mes"}</small>
            </div>)}
        </div>
        <div className="ticketiso-summary-panels">
        <div className="ticketiso-chart-panel">
            <div className="ticketiso-panel-heading">
                <div><span className="ticketiso-section-label">Comparacion anual</span><h3>Tickets por mes - {anio}</h3></div>
                <button type="button" className="ticketiso-button secondary" onClick={onActualizar} disabled={cargando}><i className={`fas ${cargando ? "fa-spinner fa-spin" : "fa-sync-alt"}`} /> Actualizar resumen</button>
            </div>
            <p className="ticketiso-chart-note">Las barras muestran el estado actual de los tickets recibidos en cada mes. La linea azul muestra su total. Selecciona un mes en el grafico o la tabla para consultar sus cifras.</p>
            {noDisponible ? <p className="ticketiso-chart-message" role="status">{cargando ? "Cargando resumen..." : "No se pudo cargar el resumen. Usa Actualizar resumen para reintentar."}</p> : <>
                <div className="ticketiso-chart-canvas"><Chart type="bar" data={data} options={options} role="img" aria-label={`Grafico de tickets por mes de ${anio}: total, pendientes, en seguimiento o transito y resueltos o cerrados`} /></div>
                {!resumen.totales.total && <p className="ticketiso-chart-note">Aun no hay tickets recibidos en {anio}. Los meses sin registros se muestran en cero.</p>}
                {!!resumen.totales.sin_estado && <p className="ticketiso-chart-note">Hay {resumen.totales.sin_estado} tickets con un estado sin clasificar, incluidos en el total.</p>}
            </>}
            {!!resumen.sinFecha && <p className="ticketiso-chart-note">{resumen.sinFecha} registros no tienen una fecha de recepcion valida y no se incluyen en los totales mensuales.</p>}
        </div>
        <IndicadorTicketISO tickets={tickets} mes={mes} noDisponible={noDisponible} ahora={ahora} />
        </div>
        {!noDisponible && <div className="ticketiso-chart-panel ticketiso-monthly-detail">
            <div className="ticketiso-panel-heading"><div><span className="ticketiso-section-label">Cifras del ano</span><h3>Detalle mensual - {anio}</h3></div></div>
            <div className="ticketiso-table-scroll">
                <table className="ticketiso-table ticketiso-summary-table">
                    <caption className="sr-only">Totales mensuales de tickets de {anio}</caption>
                    <thead><tr><th scope="col">Mes</th><th scope="col">Total</th>{series.map((serie) => <th key={serie.clave} scope="col">{serie.nombre}</th>)}</tr></thead>
                    <tbody>{resumen.meses.map((item, index) => <tr key={item.mes} className={item.mes === mes ? "selected" : ""}>
                        <th scope="row"><button type="button" aria-pressed={item.mes === mes} onClick={() => onMesChange(item.mes)}>{MESES[index]} {anio}</button></th>
                        <td><strong>{item.total}</strong></td>{series.map((serie) => <td key={serie.clave} className={serie.clave}>{item[serie.clave]}</td>)}
                    </tr>)}</tbody>
                    <tfoot><tr><th scope="row">Total {anio}</th><td>{resumen.totales.total}</td>{series.map((serie) => <td key={serie.clave}>{resumen.totales[serie.clave]}</td>)}</tr></tfoot>
                </table>
            </div>
        </div>}
    </>;
}
