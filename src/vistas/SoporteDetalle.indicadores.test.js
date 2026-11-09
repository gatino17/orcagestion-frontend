import React, { act } from "react";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SoporteDetalle from "./SoporteDetalle";
import { cargarSoportes } from "../controllers/soporteControllers";
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import { obtenerMantencionPreventiva } from "../api";

jest.mock("../controllers/soporteControllers", () => ({ cargarSoportes: jest.fn() }));
jest.mock("../controllers/centrosControllers", () => ({ cargarCentrosClientes: jest.fn() }));
jest.mock("../api", () => ({ obtenerMantencionPreventiva: jest.fn(), obtenerExcelResponsabilidadSoporte: jest.fn() }));
jest.mock("react-data-table-component", () => ({ data, noDataComponent }) => <div>{data.length ? data.map((row) => <p key={row.id_soporte}>{row.problema}</p>) : noDataComponent}</div>);

const hoy = new Date();
const anio = hoy.getFullYear();
const mes = hoy.getMonth();
const otroMes = (mes + 11) % 12;
const fecha = (m = mes, y = anio) => `${y}-${String(m + 1).padStart(2, "0")}-05`;
const centro = (nombre, cliente = "Cliente A") => ({ nombre, cliente, id_centro: 1 });
const soportes = [
    { id_soporte: 1, centro: centro("Norte"), responsabilidad_falla: "cliente", origen: "orca", problema: "Caso del cliente", fecha_soporte: fecha() },
    { id_soporte: 2, centro: centro("Norte"), responsabilidad_falla: "orca", origen: "cliente", problema: "Caso de Orca", fecha_soporte: fecha() },
    { id_soporte: 3, centro: centro("Sur"), responsabilidad_falla: "terceros", problema: "Caso de tercero", fecha_soporte: fecha() },
    { id_soporte: 4, centro: centro("Sur", "Cliente B"), problema: "Caso de otro cliente", fecha_soporte: fecha() },
    { id_soporte: 5, centro: centro("Norte"), responsabilidad_falla: null, problema: "Caso por determinar", fecha_soporte: fecha() },
    { id_soporte: 6, centro: centro("Norte"), responsabilidad_falla: "terceros", problema: "Caso de otro mes", fecha_soporte: fecha(otroMes) },
    { id_soporte: 7, centro: centro("Norte"), responsabilidad_falla: "cliente", problema: "Caso de otro anio", fecha_soporte: fecha(mes, anio - 1) },
];

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
beforeEach(() => {
    jest.clearAllMocks();
    cargarSoportes.mockImplementation(async (setter) => setter(soportes));
    cargarCentrosClientes.mockResolvedValue([{ id: 1, nombre: "Norte", cliente: "Cliente A", estado: "activo" }]);
    obtenerMantencionPreventiva.mockResolvedValue([]);
});

async function abrir() {
    render(<MemoryRouter><SoporteDetalle /></MemoryRouter>);
    await screen.findByRole("button", { name: "Ver casos de responsabilidad: Cliente (1)" });
}
function comprobarConteos(cliente, orca, terceros, desconocidos) {
    for (const [label, count] of [["Cliente", cliente], ["Orca", orca], ["Terceros", terceros], ["Por determinar", desconocidos]]) {
        expect(screen.getByRole("button", { name: `Ver casos de responsabilidad: ${label} (${count})` })).toBeInTheDocument();
    }
}

test("los conteos y su detalle respetan cliente, centro y mes sin usar el origen del reporte", async () => {
    await abrir();
    comprobarConteos(1, 1, 1, 2);
    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "Cliente A" } });
    comprobarConteos(1, 1, 1, 1);
    fireEvent.change(screen.getByPlaceholderText("Nombre del centro"), { target: { value: "Norte" } });
    comprobarConteos(1, 1, 0, 1);
    fireEvent.click(screen.getByRole("button", { name: "Ver casos de responsabilidad: Cliente (1)" }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("Caso del cliente")).toBeInTheDocument();
    for (const row of soportes.slice(1)) expect(within(modal).queryByText(row.problema)).not.toBeInTheDocument();
});

test("el mes y el anio compartidos actualizan responsabilidad y solicitan los reinicios del mismo periodo", async () => {
    await abrir();
    fireEvent.change(screen.getByLabelText("Mes"), { target: { value: String(otroMes) } });
    comprobarConteos(0, 0, 1, 0);
    await waitFor(() => expect(obtenerMantencionPreventiva).toHaveBeenLastCalledWith({ anio, mes: otroMes + 1 }));
    fireEvent.change(screen.getByLabelText("Mes"), { target: { value: String(mes) } });
    fireEvent.change(screen.getByLabelText("A\u00f1o"), { target: { value: String(anio - 1) } });
    comprobarConteos(1, 0, 0, 0);
    await waitFor(() => expect(obtenerMantencionPreventiva).toHaveBeenLastCalledWith({ anio: anio - 1, mes: mes + 1 }));
    const cierre = screen.getByRole("article", { name: "Cierre en 15 dias" });
    expect(within(cierre).getByText("Tickets del mes").nextElementSibling).toHaveTextContent("1");
});

test("sin coincidencias muestra ceros y conserva el acceso al detalle de reinicios", async () => {
    await abrir();
    fireEvent.change(screen.getByPlaceholderText("Nombre del centro"), { target: { value: "Sin coincidencias" } });
    comprobarConteos(0, 0, 0, 0);
    fireEvent.click(within(screen.getByRole("article", { name: "Reinicios de sistemas" })).getByRole("button", { name: "Ver detalle" }));
    expect(screen.getByText("Sin centros para los filtros actuales.")).toBeInTheDocument();
});

test("una respuesta antigua de reinicios no sobrescribe el mes mas reciente", async () => {
    let responderAnterior;
    obtenerMantencionPreventiva.mockReturnValueOnce(new Promise((resolve) => { responderAnterior = resolve; }));
    obtenerMantencionPreventiva.mockResolvedValue([{ centro_id: 1, datos_base: { fechaReinicio: fecha(otroMes) } }]);
    await abrir();
    fireEvent.change(screen.getByLabelText("Mes"), { target: { value: String(otroMes) } });
    const reinicios = screen.getByRole("article", { name: "Reinicios de sistemas" });
    await waitFor(() => expect(within(reinicios).getByText("Reiniciados").nextElementSibling).toHaveTextContent("1"));
    await act(async () => { responderAnterior([]); });
    expect(within(reinicios).getByText("Reiniciados").nextElementSibling).toHaveTextContent("1");
});
