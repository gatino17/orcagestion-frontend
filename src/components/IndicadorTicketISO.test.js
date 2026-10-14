import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import IndicadorTicketISO from "./IndicadorTicketISO";

const ahora = new Date("2026-10-14T12:00:00Z");
const tickets = [
    ...Array.from({ length: 8 }, () => ({ fecha_recepcion: "2026-06-20", estado: "resuelto", fecha_cierre: "2026-07-20" })),
    ...Array.from({ length: 2 }, () => ({ fecha_recepcion: "2026-07-25", estado: "resuelto", fecha_cierre: "2026-09-29" })),
    { fecha_recepcion: "2026-09-30", estado: "pendiente" },
];

test("presenta el indicador del trimestre en una tarjeta con formula, rangos y cifras", () => {
    render(<IndicadorTicketISO tickets={tickets} mes="2026-09" ahora={ahora} />);
    expect(screen.getByRole("region", { name: "Tasa de cierre de Ticket ISO" })).toBeInTheDocument();
    expect(screen.getByLabelText("Indicador trimestral: 90,91 %")).toBeInTheDocument();
    expect(screen.getByLabelText("Clasificacion del indicador: Bueno")).toBeInTheDocument();
    expect(screen.getByLabelText("Cerrados en el trimestre: 10")).toHaveTextContent("10");
    expect(screen.getByText("10 / (8 + 3) x 100 = 90,91 %")).toBeInTheDocument();
    expect(screen.getByText("Julio - Septiembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Corte: 30/09/2026")).toBeInTheDocument();
});

test("cambiar el mes actualiza el trimestre y no presenta un porcentaje ficticio en cero", () => {
    const { rerender } = render(<IndicadorTicketISO tickets={tickets} mes="2026-09" ahora={ahora} />);
    rerender(<IndicadorTicketISO tickets={[]} mes="2026-10" ahora={ahora} />);
    expect(screen.getByText("Octubre - Diciembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Medicion parcial")).toBeInTheDocument();
    expect(screen.getByLabelText("Clasificacion del indicador: Sin datos")).toBeInTheDocument();
    expect(screen.getByLabelText("Indicador trimestral: -")).toBeInTheDocument();
});

test("datos incompletos y problemas de carga no se clasifican como un resultado valido", () => {
    const { rerender } = render(<IndicadorTicketISO tickets={[{ fecha_recepcion: "2026-07-01", estado: "resuelto" }]} mes="2026-09" ahora={ahora} />);
    expect(screen.getByLabelText("Clasificacion del indicador: Datos por revisar")).toBeInTheDocument();
    expect(screen.getByText(/Revisa 1 registros/)).toBeInTheDocument();
    rerender(<IndicadorTicketISO tickets={tickets} mes="2026-09" ahora={ahora} noDisponible />);
    expect(screen.getByLabelText("Clasificacion del indicador: No disponible")).toBeInTheDocument();
    expect(screen.getByText("Calculo no disponible")).toBeInTheDocument();
});
