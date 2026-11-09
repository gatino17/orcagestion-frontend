import React, { act } from "react";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import IndicadoresSoporte from "./IndicadoresSoporte";
import { obtenerExcelResponsabilidadSoporte } from "../api";

jest.mock("../api", () => ({ obtenerExcelResponsabilidadSoporte: jest.fn() }));

jest.mock("react-data-table-component", () => ({ columns, data, noDataComponent }) => data.length ? <table>
    <thead><tr>{columns.map((column) => <th key={column.name}>{column.name}</th>)}</tr></thead>
    <tbody>{data.map((row) => <tr key={row.id_soporte}>{columns.map((column) => <td key={column.name}>
        {column.cell ? column.cell(row) : column.selector(row)}
    </td>)}</tr>)}</tbody>
</table> : <div>{noDataComponent}</div>);

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

test("el detalle muestra la solucion guardada junto al problema del caso", () => {
    const solucion = 'Se reemplazo el cable y se verifico la conexion.';
    render(<IndicadoresSoporte {...props} soportesMes={[
        { ...props.soportesMes[0], solucion },
        { ...props.soportesMes[1], solucion: 'Solucion de otra responsabilidad' },
    ]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver casos de responsabilidad: Cliente (1)" }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByRole("columnheader", { name: "Solucion" })).toBeInTheDocument();
    const fila = within(modal).getByText('Falla cliente').closest('tr');
    expect(within(fila).getByText(solucion)).toBeInTheDocument();
    expect(within(modal).queryByText('Solucion de otra responsabilidad')).not.toBeInTheDocument();
});

test.each([undefined, null, '', '  '])("si la solucion es %j indica que aun no esta registrada", (solucion) => {
    render(<IndicadoresSoporte {...props} soportesMes={[{ ...props.soportesMes[0], solucion }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver casos de responsabilidad: Cliente (1)" }));
    expect(within(screen.getByRole("dialog")).getByText('Sin solucion registrada')).toBeInTheDocument();
});

test.each([
    ['resuelto', 'Resuelto', 'bg-success', 'text-white'],
    ['finalizado', 'Resuelto', 'bg-success', 'text-white'],
    [' RESUELTO ', 'Resuelto', 'bg-success', 'text-white'],
    ['pendiente', 'Pendiente', 'bg-danger', 'text-white'],
    [null, 'Pendiente', 'bg-danger', 'text-white'],
    ['', 'Pendiente', 'bg-danger', 'text-white'],
    ['  ', 'Pendiente', 'bg-danger', 'text-white'],
    ['en_proceso', 'En seguimiento', 'bg-warning', 'text-dark'],
    ['otro', 'otro', 'bg-secondary', 'text-white'],
])('el estado %j muestra %s con su color correspondiente', (estado, label, fondo, texto) => {
    render(<IndicadoresSoporte {...props} soportesMes={[{ ...props.soportesMes[0], estado }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver casos de responsabilidad: Cliente (1)" }));
    const celda = within(screen.getByRole('dialog')).getByRole('cell', { name: label });
    expect(within(celda).getByText(label)).toHaveClass(fondo, texto, 'rounded-pill', 'soporte-responsabilidad-estado');
});

test("el boton Excel muestra solo el icono y descarga el ano completo con los filtros activos", async () => {
    jest.useFakeTimers();
    const crearURL = URL.createObjectURL;
    const revocarURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:excel-prueba');
    URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
        const archivo = new Blob(['xlsx-test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        obtenerExcelResponsabilidadSoporte.mockResolvedValueOnce(archivo);
        render(<IndicadoresSoporte {...props} />);
        const boton = screen.getByRole('button', { name: 'Descargar Excel de responsabilidad de la falla' });
        expect(boton.textContent).toBe('');
        expect(boton.querySelector('i')).toHaveClass('fa-file-excel');
        expect(boton).toHaveAttribute('title', expect.stringContaining('todo el ano'));
        await act(async () => { fireEvent.click(boton); });
        expect(obtenerExcelResponsabilidadSoporte).toHaveBeenCalledWith({ anio: 2026, cliente: 'Aqua', centro: 'Lin Lin' });
        expect(click).toHaveBeenCalledTimes(1);
        expect(click.mock.instances[0].download).toBe('Responsabilidad-fallas-2026.xlsx');
        expect(document.querySelector('a[download]')).not.toBeInTheDocument();
        act(() => jest.runOnlyPendingTimers());
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:excel-prueba');
    } finally {
        click.mockRestore();
        URL.createObjectURL = crearURL;
        URL.revokeObjectURL = revocarURL;
        jest.useRealTimers();
    }
});

test("la descarga no se duplica y muestra un error recuperable si falla el servidor", async () => {
    let rechazar;
    obtenerExcelResponsabilidadSoporte.mockReturnValueOnce(new Promise((_, reject) => { rechazar = reject; }));
    render(<IndicadoresSoporte {...props} />);
    const boton = screen.getByRole('button', { name: 'Descargar Excel de responsabilidad de la falla' });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(boton).toBeDisabled();
    expect(obtenerExcelResponsabilidadSoporte).toHaveBeenCalledTimes(1);
    await act(async () => { rechazar({ response: { data: { error: 'Sesion expirada' } } }); });
    expect(screen.getByRole('alert')).toHaveTextContent('Sesion expirada');
    await waitFor(() => expect(boton).not.toBeDisabled());
});

test("los casos con permiso de trabajo muestran su icono verde junto al numero", () => {
    render(<IndicadoresSoporte {...props} soportesMes={[
        { ...props.soportesMes[0], case_code: 'CASO-001', permiso_trabajo: true, estado: 'resuelto' },
    ]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver casos de responsabilidad: Cliente (1)' }));
    const modal = screen.getByRole('dialog');
    const icono = within(modal).getByRole('img', { name: 'Permiso de trabajo' });
    expect(icono).toHaveClass('soporte-responsabilidad-permiso');
    expect(icono).toHaveAttribute('title', 'Requiere permiso de trabajo');
    expect(icono.querySelector('i')).toHaveClass('fa-user-cog');
    expect(within(icono.closest('td')).getByText('CASO-001')).toBeInTheDocument();
    expect(within(modal).getByText('Resuelto')).toHaveClass('bg-success');
});

test.each([false, undefined, null, 'false'])("si el permiso es %j no muestra un icono de permiso", (permiso_trabajo) => {
    render(<IndicadoresSoporte {...props} soportesMes={[{ ...props.soportesMes[0], permiso_trabajo }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver casos de responsabilidad: Cliente (1)' }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).queryByRole('img', { name: 'Permiso de trabajo' })).not.toBeInTheDocument();
    expect(within(modal).getByText('#1')).toBeInTheDocument();
});
