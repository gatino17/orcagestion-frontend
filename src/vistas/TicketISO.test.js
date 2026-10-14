import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { actualizarTicketISO, crearTicketISO, eliminarTicketISO, obtenerCatalogosTicketISO, obtenerTicketISO, obtenerTicketsISO } from "../api";
import TicketISO from "./TicketISO";

jest.mock("../api", () => ({
    actualizarTicketISO: jest.fn(), crearTicketISO: jest.fn(), eliminarTicketISO: jest.fn(), obtenerCatalogosTicketISO: jest.fn(),
    obtenerTicketISO: jest.fn(), obtenerTicketsISO: jest.fn(),
}));
jest.mock("react-chartjs-2", () => ({ Chart: ({ data, options, ...props }) => <canvas {...props} /> }));

const ticket = {
    id_ticket: 1, numero_ticket: "ISO-001", fecha_recepcion: "2026-10-14",
    asunto_procedimiento: "Revision del procedimiento", problema: "Falta actualizar el documento", estado: "pendiente",
    origen: "ticket_iso", categoria_procedimiento: "soporte_posventa",
    responsable_id: 2, responsable: "Jorge", observaciones: "Pendiente validar documento",
    fecha_cierre: null, updated_at: "2026-10-14T13:00:00Z",
};

beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    HTMLDialogElement.prototype.showModal = jest.fn(function () { this.setAttribute("open", ""); });
    HTMLDialogElement.prototype.close = jest.fn(function () { this.removeAttribute("open"); });
    obtenerTicketsISO.mockResolvedValue([]);
    obtenerCatalogosTicketISO.mockResolvedValue({ proximo_numero: "ISO-2026-001", responsables: [{ id: 2, nombre: "Jorge" }] });
    obtenerTicketISO.mockResolvedValue(ticket);
    crearTicketISO.mockResolvedValue(ticket);
    actualizarTicketISO.mockResolvedValue({ ...ticket, problema: "Problema actualizado" });
    eliminarTicketISO.mockResolvedValue({ message: "Ticket eliminado correctamente." });
});

const iniciar = async () => {
    render(<TicketISO />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Nuevo ticket/ })).toBeEnabled());
};

const iniciarComoAdmin = async () => {
    localStorage.setItem("token", `e30.${btoa(JSON.stringify({ rol: "admin" }))}.test`);
    obtenerTicketsISO.mockResolvedValue([ticket]);
    await iniciar();
};

test.each([null, "invalido", "encargado_tickets"])("no muestra Eliminar sin rol admin (%s)", async (rol) => {
    if (rol) localStorage.setItem("token", rol === "invalido" ? rol : `e30.${btoa(JSON.stringify({ rol }))}.test`);
    obtenerTicketsISO.mockResolvedValue([ticket]);
    await iniciar();
    expect(screen.getByRole("button", { name: "Editar ticket ISO-001" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar ticket ISO-001" })).not.toBeInTheDocument();
});

test("admin cancela la eliminacion sin borrar el ticket", async () => {
    await iniciarComoAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar ticket ISO-001" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Esta accion no se puede deshacer");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(eliminarTicketISO).not.toHaveBeenCalled();
    expect(screen.getByRole("cell", { name: "ISO-001" })).toBeInTheDocument();
});

test("admin confirma la eliminacion y el ticket desaparece de la tabla y del resumen", async () => {
    await iniciarComoAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar ticket ISO-001" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminacion" }));
    expect(await screen.findByText("Ticket eliminado correctamente.")).toBeInTheDocument();
    expect(eliminarTicketISO).toHaveBeenCalledTimes(1);
    expect(eliminarTicketISO).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("cell", { name: "ISO-001" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resumen mensual" }));
    fireEvent.change(screen.getByLabelText("Mes a consultar"), { target: { value: "2026-10" } });
    expect(screen.getByLabelText("Recibidos en el mes: 0")).toBeInTheDocument();
});

test("si el servidor rechaza la eliminacion conserva el ticket y muestra el error", async () => {
    eliminarTicketISO.mockRejectedValue({ response: { data: { error: "Solo el admin puede eliminar tickets ISO." } } });
    await iniciarComoAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar ticket ISO-001" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminacion" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Solo el admin puede eliminar tickets ISO.");
    expect(screen.getByRole("cell", { name: "ISO-001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar eliminacion" })).toBeEnabled();
});

test("la navegacion conserva Tickets y Resumen mensual sin la pestana Soluciones", async () => {
    await iniciar();
    expect(screen.getByRole("navigation", { name: "Vistas de Ticket ISO" }).querySelectorAll("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Tickets", exact: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resumen mensual" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Soluciones" })).not.toBeInTheDocument();
    expect(screen.queryByText(/biblioteca de soluciones/i)).not.toBeInTheDocument();
});

const llenarNuevo = (manual = true) => {
    fireEvent.click(screen.getByRole("button", { name: /Nuevo ticket/ }));
    if (manual) fireEvent.change(screen.getByLabelText("Numero de ticket"), { target: { value: " iso-001 " } });
    fireEvent.change(screen.getByLabelText("Fecha de recepcion *"), { target: { value: "2026-10-14" } });
    fireEvent.change(screen.getByLabelText("Descripcion del problema *"), { target: { value: "Falta actualizar el documento" } });
    fireEvent.change(screen.getByLabelText("Origen *"), { target: { value: "ticket_iso" } });
    fireEvent.change(screen.getByLabelText("Categoria de procedimiento *"), { target: { value: "soporte_posventa" } });
};

test("registra un numero manual sin asunto y muestra el problema en la tabla", async () => {
    await iniciar();
    llenarNuevo();
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    await waitFor(() => expect(crearTicketISO).toHaveBeenCalledWith(expect.objectContaining({
        numero_ticket: "ISO-001", numero_automatico: false, fecha_recepcion: "2026-10-14", problema: "Falta actualizar el documento",
        estado: "pendiente", origen: "ticket_iso", categoria_procedimiento: "soporte_posventa",
    })));
    expect(await screen.findByRole("cell", { name: /ISO-001/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Falta actualizar el documento" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Asunto del procedimiento" })).not.toBeInTheDocument();
    expect(crearTicketISO.mock.calls[0][0]).not.toHaveProperty("asunto_procedimiento");
});

test("edita un registro cargando primero sus datos guardados", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Editar ticket ISO-001" }));
    await waitFor(() => expect(screen.getByLabelText("Numero de ticket")).toHaveValue("ISO-001"));
    expect(screen.getByLabelText("Fecha de recepcion *")).toHaveValue("2026-10-14");
    expect(screen.getByLabelText("Origen *")).toHaveValue("ticket_iso");
    expect(screen.getByLabelText("Categoria de procedimiento *")).toHaveValue("soporte_posventa");
    expect(screen.getByLabelText("Responsable")).toHaveValue("Jorge");
    expect(screen.getByLabelText("Observaciones")).toHaveValue("Pendiente validar documento");
    expect(screen.queryByLabelText("Asunto del procedimiento *")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Descripcion del problema *"), { target: { value: "Problema actualizado" } });
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    await waitFor(() => expect(actualizarTicketISO).toHaveBeenCalledWith(1, expect.objectContaining({ problema: "Problema actualizado" })));
    expect(actualizarTicketISO.mock.calls[0][1]).not.toHaveProperty("asunto_procedimiento");
    expect(await screen.findByText("Ticket actualizado correctamente.")).toBeInTheDocument();
    expect(crearTicketISO).not.toHaveBeenCalled();
});

test("un numero duplicado bloquea el alta sin enviar otra solicitud", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    await iniciar();
    llenarNuevo();
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    expect(screen.getByRole("alert")).toHaveTextContent("Ese numero de ticket ya esta registrado.");
    expect(crearTicketISO).not.toHaveBeenCalled();
});

test("el detalle consulta el ticket y muestra sus datos", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Ver ticket ISO-001" }));
    expect(await screen.findByRole("button", { name: "Editar ticket" })).toBeEnabled();
    expect(obtenerTicketISO).toHaveBeenCalledWith(1);
});

test("el ingreso tiene nueve campos sin asunto, fecha sin hora y origen al lado del estado rojo", async () => {
    await iniciar();
    llenarNuevo();
    expect(screen.getByRole("dialog").querySelectorAll("input, select, textarea")).toHaveLength(9);
    expect(screen.queryByLabelText("Asunto del procedimiento *")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de recepcion *")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Estado *")).toHaveClass("pendiente");
    expect(screen.getByLabelText("Estado *").parentElement.nextElementSibling).toContainElement(screen.getByLabelText("Origen *"));
    expect(screen.getByLabelText("Fecha de cierre")).toBeEnabled();
    expect(screen.queryByLabelText("Cliente *")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Centro *")).not.toBeInTheDocument();
});

test("el numero viene escrito con formato ISO y se guarda como automatico", async () => {
    crearTicketISO.mockResolvedValue({ ...ticket, numero_ticket: "ISO-2026-001" });
    await iniciar();
    llenarNuevo(false);
    expect(screen.getByLabelText("Numero de ticket")).not.toBeRequired();
    expect(screen.getByLabelText("Numero de ticket")).toHaveValue("ISO-2026-001");
    expect(screen.getByLabelText("Numero de ticket")).not.toHaveAttribute("placeholder");
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    expect(await screen.findByRole("cell", { name: "ISO-2026-001" })).toBeInTheDocument();
    expect(crearTicketISO).toHaveBeenCalledWith(expect.objectContaining({ numero_ticket: "ISO-2026-001", numero_automatico: true }));
});

test("borrar el numero prellenado mantiene el guardado automatico", async () => {
    await iniciar();
    llenarNuevo(false);
    fireEvent.change(screen.getByLabelText("Numero de ticket"), { target: { value: "" } });
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    expect(await screen.findByRole("cell", { name: "ISO-001" })).toBeInTheDocument();
    expect(crearTicketISO).toHaveBeenCalledWith(expect.objectContaining({ numero_ticket: "", numero_automatico: true }));
});

test("un numero automatico desactualizado no se bloquea como duplicado manual", async () => {
    obtenerTicketsISO.mockResolvedValue([{ ...ticket, numero_ticket: "ISO-2026-001" }]);
    crearTicketISO.mockResolvedValue({ ...ticket, id_ticket: 2, numero_ticket: "ISO-2026-002" });
    await iniciar();
    llenarNuevo(false);
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    expect(await screen.findByRole("cell", { name: "ISO-2026-002" })).toBeInTheDocument();
    expect(crearTicketISO).toHaveBeenCalledWith(expect.objectContaining({ numero_automatico: true }));
});

test("un catalogo antiguo sin numero no deja el campo vacio ni como placeholder", async () => {
    obtenerCatalogosTicketISO.mockResolvedValue({});
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: /Nuevo ticket/ }));
    expect(screen.getByLabelText("Numero de ticket").value).toMatch(/^ISO-\d{4}-001$/);
    expect(screen.getByLabelText("Numero de ticket")).not.toHaveAttribute("placeholder");
});

test("los selectores muestran todas las opciones solicitadas", async () => {
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: /Nuevo ticket/ }));
    const origenes = screen.getByLabelText("Origen *");
    const categorias = screen.getByLabelText("Categoria de procedimiento *");
    expect(Array.from(origenes.options).slice(1).map((opcion) => opcion.text)).toEqual([
        "Auditoria", "Ticket ISO", "Revision por la direccion", "Reclamo de cliente ticket",
        "Salida no conforme", "Sugerencia de mejora", "Otros",
    ]);
    expect(Array.from(categorias.options).slice(1).map((opcion) => opcion.text)).toEqual([
        "001 Gestion comercial", "002 Levantamiento", "003 Armado sistema", "004 Instalacion de sistema", "005 Soporte y posventa",
        "006 Bodega", "007 Mantencion y reacondicionamiento", "008 Retiro", "009 Otros",
    ]);
});

test("Resumen mensual permite consultar otro mes y otro ano con los tickets guardados", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket, { ...ticket, id_ticket: 2, numero_ticket: "ISO-002", estado: "en_seguimiento" },
        { ...ticket, id_ticket: 3, numero_ticket: "ISO-003", estado: "resuelto" }]);
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Resumen mensual" }));
    fireEvent.change(screen.getByLabelText("Mes a consultar"), { target: { value: "2026-10" } });
    expect(screen.getByLabelText("Recibidos en el mes: 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Pendientes: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("En seguimiento / transito: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Resueltos / cerrados: 1")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/Grafico de tickets por mes de 2026/);
    expect(screen.getByText("Mes consultado: Octubre 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nov 2026" }));
    expect(screen.getByLabelText("Mes a consultar")).toHaveValue("2026-11");
    expect(screen.getByText("Mes consultado: Noviembre 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Recibidos en el mes: 0")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Mes a consultar"), { target: { value: "2027-01" } });
    expect(screen.getByRole("heading", { name: "Tickets por mes - 2027" })).toBeInTheDocument();
    expect(screen.getByLabelText("Recibidos en el mes: 0")).toBeInTheDocument();
});

test("permite escribir un responsable externo, anotar observaciones y guardar un cierre editable", async () => {
    const cerrado = { ...ticket, responsable_id: null, responsable: "Carolina proveedor externo", estado: "resuelto", fecha_cierre: "2026-10-16T15:00:00Z", observaciones: "Validado por auditoria" };
    crearTicketISO.mockResolvedValue(cerrado);
    await iniciar();
    llenarNuevo();
    expect(screen.getByRole("textbox", { name: "Responsable" })).toHaveAttribute("maxlength", "100");
    fireEvent.change(screen.getByLabelText("Responsable"), { target: { value: "Carolina proveedor externo" } });
    fireEvent.change(screen.getByLabelText("Observaciones"), { target: { value: "Validado por auditoria" } });
    fireEvent.change(screen.getByLabelText("Estado *"), { target: { value: "resuelto" } });
    expect(screen.getByLabelText("Fecha de cierre *")).toBeEnabled();
    expect(screen.getByLabelText("Fecha de cierre *")).toBeRequired();
    fireEvent.change(screen.getByLabelText("Fecha de cierre *"), { target: { value: "2026-10-16" } });
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    expect(await screen.findByText("Ticket registrado correctamente.")).toBeInTheDocument();
    expect(crearTicketISO).toHaveBeenCalledWith(expect.objectContaining({ responsable: "Carolina proveedor externo", observaciones: "Validado por auditoria", fecha_cierre: "2026-10-16" }));
    expect(crearTicketISO.mock.calls[0][0]).not.toHaveProperty("responsable_id");
    expect(screen.getByRole("cell", { name: "Carolina proveedor externo" })).toBeInTheDocument();
});

test("reabrir un ticket limpia el cierre y un cierre anterior al ingreso se rechaza", async () => {
    await iniciar();
    llenarNuevo();
    fireEvent.change(screen.getByLabelText("Estado *"), { target: { value: "resuelto" } });
    fireEvent.change(screen.getByLabelText("Fecha de cierre *"), { target: { value: "2026-10-13" } });
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    expect(screen.getByRole("alert")).toHaveTextContent("El cierre no puede ser anterior a la recepcion");
    expect(crearTicketISO).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Estado *"), { target: { value: "en_seguimiento" } });
    expect(screen.getByLabelText("Fecha de cierre")).toHaveValue("");
    expect(screen.getByLabelText("Fecha de cierre")).toBeEnabled();
});

test("permite guardar una fecha prevista estando pendiente y conservarla en seguimiento", async () => {
    crearTicketISO.mockResolvedValue({ ...ticket, estado: "en_seguimiento", fecha_cierre: "2026-10-20T15:00:00Z" });
    await iniciar();
    llenarNuevo();
    expect(screen.getByLabelText("Fecha de cierre")).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Fecha de cierre"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("Estado *"), { target: { value: "en_seguimiento" } });
    expect(screen.getByLabelText("Fecha de cierre")).toHaveValue("2026-10-20");
    fireEvent.submit(screen.getByRole("button", { name: /Guardar ticket/ }).closest("form"));
    expect(await screen.findByText("Ticket registrado correctamente.")).toBeInTheDocument();
    expect(crearTicketISO).toHaveBeenCalledWith(expect.objectContaining({ estado: "en_seguimiento", fecha_cierre: "2026-10-20" }));
    expect(screen.getByText("Prevista")).toBeInTheDocument();
});
