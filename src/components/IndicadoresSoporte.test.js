import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import IndicadoresSoporte from "./IndicadoresSoporte";

jest.mock("react-data-table-component", () => ({ data, noDataComponent }) => <div>{data.length ? data.map((row) => <p key={row.id_soporte}>{row.problema}</p>) : noDataComponent}</div>);

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const props = {
    tickets: { total: 5, cerradosTotales: 3, cerradosEnPlazo: 2, fueraDePlazo: 1, porcentaje: 40, nivel: "critico" },
    reinicios: { total: 4, reiniciados: 3, pendientes: 1, vencidos: 0, porVencer: 1, porcentaje: 75, nivel: "alerta" },
    cargandoReinicios: false, mes: 0, anio: 2026, meses: ["Enero", "Febrero"], anios: [2026, 2025],
    onMes: jest.fn(), onAnio: jest.fn(), onVerReinicios: jest.fn(), cliente: "Aqua", centro: "Lin Lin",
    soportesMes: [
        { id_soporte: 1, responsabilidad_falla: "cliente", origen: "orca", problema: "Falla cliente" },
        { id_soporte: 2, responsabilidad_falla: "orca", origen: "cliente", problema: "Falla Orca" },
        { id_soporte: 3, responsabilidad_falla: "terceros", problema: "Falla tercero" },
        { id_soporte: 4, problema: "Falla historica" },
        { id_soporte: 5, responsabilidad_falla: "por_determinar", problema: "Falla en estudio" },
    ],
};
afterEach(() => jest.clearAllMocks());

test("muestra tres tarjetas y un solo selector de mes y de anio", () => {
    render(<IndicadoresSoporte {...props} />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByText("Aqua / Centro: Lin Lin")).toBeInTheDocument();
    for (const label of ["Cliente (1)", "Orca (1)", "Terceros (1)", "Por determinar (2)"]) {
        expect(screen.getByRole("button", { name: `Ver casos de responsabilidad: ${label}` })).toBeInTheDocument();
    }
});

test("los selectores compartidos y el detalle de reinicios llaman sus acciones", () => {
    render(<IndicadoresSoporte {...props} />);
    fireEvent.change(screen.getByLabelText("Mes"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("A\u00f1o"), { target: { value: "2025" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(props.onMes).toHaveBeenCalledWith(1);
    expect(props.onAnio).toHaveBeenCalledWith(2025);
    expect(props.onVerReinicios).toHaveBeenCalledTimes(1);
});

test.each([
    ["Cliente (1)", ["Falla cliente"]],
    ["Orca (1)", ["Falla Orca"]],
    ["Terceros (1)", ["Falla tercero"]],
    ["Por determinar (2)", ["Falla historica", "Falla en estudio"]],
])("el detalle %s muestra solo los casos de esa responsabilidad", (label, problemas) => {
    render(<IndicadoresSoporte {...props} />);
    fireEvent.click(screen.getByRole("button", { name: `Ver casos de responsabilidad: ${label}` }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("Enero 2026 / Aqua / Centro: Lin Lin")).toBeInTheDocument();
    for (const row of props.soportesMes) {
        if (problemas.includes(row.problema)) expect(within(modal).getByText(row.problema)).toBeInTheDocument();
        else expect(within(modal).queryByText(row.problema)).not.toBeInTheDocument();
    }
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(within(modal).getByRole("button", { name: "Cerrar detalle de responsabilidad" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
});

test("cero casos permite abrir un detalle vacio y cerrarlo con Escape", () => {
    render(<IndicadoresSoporte {...props} soportesMes={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver casos de responsabilidad: Cliente (0)" }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(/Sin casos para esta responsabilidad/)).toBeInTheDocument();
    fireEvent(modal, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("cambiar el periodo actualiza los conteos y el detalle abierto", () => {
    const { rerender } = render(<IndicadoresSoporte {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver casos de responsabilidad: Cliente (1)" }));
    rerender(<IndicadoresSoporte {...props} mes={1} soportesMes={[]} />);
    expect(within(screen.getByRole("dialog")).queryByText("Falla cliente")).not.toBeInTheDocument();
    expect(screen.getByText("Febrero 2026 / Aqua / Centro: Lin Lin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver casos de responsabilidad: Cliente (0)" })).toBeInTheDocument();
});
