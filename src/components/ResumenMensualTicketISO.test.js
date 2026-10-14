import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ResumenMensualTicketISO from "./ResumenMensualTicketISO";

jest.mock("react-chartjs-2", () => ({
    Chart: ({ data, options, ...props }) => <canvas {...props} data-series={JSON.stringify(data.datasets)}
        onClick={(event) => options.onClick(event, [{ index: 1 }])} />,
}));

const tickets = [
    { fecha_recepcion: "2026-01-01", estado: "pendiente" },
    { fecha_recepcion: "2026-01-02", estado: "en_transito" },
    { fecha_recepcion: "2026-01-03", estado: "en_seguimiento" },
    { fecha_recepcion: "2026-01-04", estado: "cerrado" },
    { fecha_recepcion: "2026-02-01", estado: "resuelto" },
];

test("grafico, tarjetas y tabla comparten las mismas cifras mensuales", () => {
    render(<ResumenMensualTicketISO tickets={tickets} mes="2026-01" onMesChange={jest.fn()} onActualizar={jest.fn()} />);
    expect(screen.getByLabelText("Recibidos en el mes: 4")).toHaveTextContent("4");
    expect(screen.getByLabelText("Pendientes: 1")).toHaveTextContent("1");
    expect(screen.getByLabelText("En seguimiento / transito: 2")).toHaveTextContent("2");
    expect(screen.getByLabelText("Resueltos / cerrados: 1")).toHaveTextContent("1");
    const data = JSON.parse(screen.getByRole("img").getAttribute("data-series"));
    expect(data.map((serie) => serie.data[0])).toEqual([4, 1, 2, 1]);
    expect(data[0].type).toBe("line");
    expect(data[1].stack).toBe("estados");
    expect(data[0].stack).toBe("total");
    const enero = screen.getByRole("button", { name: "Ene 2026" }).closest("tr");
    expect(within(enero).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["4", "1", "2", "1"]);
    expect(screen.getByRole("table")).toHaveAccessibleName("Totales mensuales de tickets de 2026");
});

test("permite consultar otro mes desde la tabla y desde el grafico", () => {
    const cambiar = jest.fn();
    render(<ResumenMensualTicketISO tickets={tickets} mes="2026-01" onMesChange={cambiar} onActualizar={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Mar 2026" }));
    expect(cambiar).toHaveBeenCalledWith("2026-03");
    fireEvent.click(screen.getByRole("img"));
    expect(cambiar).toHaveBeenCalledWith("2026-02");
});

test("el resumen sin registros muestra ceros y no inventa datos", () => {
    render(<ResumenMensualTicketISO tickets={[]} mes="2026-01" onMesChange={jest.fn()} onActualizar={jest.fn()} />);
    expect(screen.getByLabelText("Recibidos en el mes: 0")).toHaveTextContent("0");
    expect(screen.getByText(/Aun no hay tickets recibidos en 2026/)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(13);
});

test("carga y errores no se presentan como un resumen vacio valido", () => {
    const actualizar = jest.fn();
    const { rerender } = render(<ResumenMensualTicketISO tickets={[]} mes="2026-01" cargando onMesChange={jest.fn()} onActualizar={actualizar} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando resumen...");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    rerender(<ResumenMensualTicketISO tickets={[]} mes="2026-01" error="Error de carga" onMesChange={jest.fn()} onActualizar={actualizar} />);
    expect(screen.getByRole("status")).toHaveTextContent("No se pudo cargar el resumen");
    fireEvent.click(screen.getByRole("button", { name: /Actualizar resumen/ }));
    expect(actualizar).toHaveBeenCalledTimes(1);
});

test("indicador y comparacion anual son tarjetas contiguas y cambian con el mes consultado", () => {
    const datos = [
        { fecha_recepcion: "2026-06-20", estado: "resuelto", fecha_cierre: "2026-08-20" },
        { fecha_recepcion: "2026-07-10", estado: "resuelto", fecha_cierre: "2026-07-20" },
        { fecha_recepcion: "2026-08-10", estado: "pendiente" },
    ];
    const props = { tickets: datos, onMesChange: jest.fn(), onActualizar: jest.fn(), ahora: new Date("2026-10-14T12:00:00Z") };
    const { rerender } = render(<ResumenMensualTicketISO {...props} mes="2026-07" />);
    const indicador = screen.getByRole("region", { name: "Tasa de cierre de Ticket ISO" });
    const comparacion = screen.getByRole("img").closest(".ticketiso-chart-panel");
    expect(indicador.parentElement).toHaveClass("ticketiso-summary-panels");
    expect(comparacion.nextElementSibling).toBe(indicador);
    expect(screen.getByLabelText("Indicador trimestral: 50,00 %")).toBeInTheDocument();
    expect(screen.getByText("Corte: 31/07/2026")).toBeInTheDocument();
    rerender(<ResumenMensualTicketISO {...props} mes="2026-08" />);
    expect(screen.getByLabelText("Indicador trimestral: 66,67 %")).toBeInTheDocument();
    expect(screen.getByText("Mes consultado: Agosto 2026")).toBeInTheDocument();
    expect(screen.getByText("Corte: 31/08/2026")).toBeInTheDocument();
});
