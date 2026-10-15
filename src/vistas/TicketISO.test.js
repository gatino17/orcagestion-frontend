import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { actualizarTicketISO, cerrarTicketISO, crearTicketISO, eliminarTicketISO, guardarPlanAccionTicketISO, obtenerCatalogosTicketISO, obtenerTicketISO, obtenerTicketsISO } from "../api";
import TicketISO from "./TicketISO";

jest.mock("../api", () => ({
    actualizarTicketISO: jest.fn(), crearTicketISO: jest.fn(), eliminarTicketISO: jest.fn(), obtenerCatalogosTicketISO: jest.fn(),
    guardarPlanAccionTicketISO: jest.fn(), cerrarTicketISO: jest.fn(),
    obtenerTicketISO: jest.fn(), obtenerTicketsISO: jest.fn(),
}));
jest.mock("react-chartjs-2", () => ({ Chart: ({ data, options, ...props }) => <canvas {...props} /> }));

const ticket = {
    id_ticket: 1, numero_ticket: "ISO-001", fecha_recepcion: "2026-10-14",
    asunto_procedimiento: "Revision del procedimiento", problema: "Falta actualizar el documento", estado: "pendiente",
    origen: "ticket_iso", categoria_procedimiento: "soporte_posventa",
    responsable_id: 2, responsable: "Jorge", observaciones: "Pendiente validar documento",
    fecha_cierre: null, planes_accion: [], updated_at: "2026-10-14T13:00:00Z",
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
    guardarPlanAccionTicketISO.mockResolvedValue(ticket);
    cerrarTicketISO.mockResolvedValue({ ...ticket, estado: "resuelto", fecha_cierre: "2026-10-16T15:00:00Z" });
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

const abrirPlan = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Plan de accion del ticket ISO-001" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar plan de accion" })).toBeEnabled());
};

test.each([0, 1, 7])("la columna Planes de accion muestra %s en la fila del ticket", async (cantidad) => {
    obtenerTicketsISO.mockResolvedValue([{ ...ticket, planes_accion: Array.from({ length: cantidad }, (_, index) => ({ id_plan: index + 1 })) }]);
    await iniciar();
    const cabecera = screen.getByRole("columnheader", { name: "Planes de accion" });
    expect(cabecera.nextElementSibling).toHaveTextContent("Acciones");
    const fila = within(screen.getByRole("cell", { name: "ISO-001" }).closest("tr"));
    expect(fila.getByRole("cell", { name: `${cantidad} ${cantidad === 1 ? "plan" : "planes"} de accion` })).toHaveTextContent(String(cantidad));
});

test("un ticket sin lista de planes muestra cero y la tabla vacia conserva sus diez columnas", async () => {
    obtenerTicketsISO.mockResolvedValue([{ ...ticket, planes_accion: undefined }]);
    await iniciar();
    expect(screen.getByRole("cell", { name: "0 planes de accion" })).toHaveTextContent("0");
    expect(screen.getAllByRole("columnheader")).toHaveLength(10);
    fireEvent.change(screen.getByLabelText("Buscar ticket"), { target: { value: "No existe" } });
    expect(screen.getByText("Sin resultados para estos filtros").closest("td")).toHaveAttribute("colspan", "10");
});

test("el mas amarillo agrega un plan vacio sin copiar los anteriores ni mostrar el cierre", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    obtenerTicketISO.mockResolvedValue({ ...ticket, planes_accion: [{ id_plan: 1, resultado_plan_accion: "Anterior", fecha_control: "2026-10-15" }] });
    await iniciar();
    expect(screen.getByRole("button", { name: "Plan de accion del ticket ISO-001" })).toHaveClass("plan");
    await abrirPlan();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Plan de accion");
    expect(screen.getByLabelText("Breve descripcion del resultado")).toHaveValue("");
    expect(screen.getByLabelText("Breve descripcion del resultado")).toBeRequired();
    expect(screen.getByLabelText("Fecha de control")).toHaveValue("");
    expect(screen.queryByLabelText(/Fecha de cierre/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(guardarPlanAccionTicketISO).not.toHaveBeenCalled();
});

test("agregar un plan conserva el caso abierto y envia solo resultado y control", async () => {
    const nuevo = { id_plan: 1, numero: 1, resultado_plan_accion: "Pendiente validacion", fecha_control: "2026-10-15" };
    obtenerTicketsISO.mockResolvedValue([ticket]);
    guardarPlanAccionTicketISO.mockResolvedValue({ ...ticket, planes_accion: [nuevo] });
    await iniciar();
    await abrirPlan();
    fireEvent.change(screen.getByLabelText("Breve descripcion del resultado"), { target: { value: "  Pendiente validacion  " } });
    fireEvent.change(screen.getByLabelText("Fecha de control"), { target: { value: "2026-10-15" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar plan de accion" }).closest("form"));
    expect(await screen.findByText("Nuevo plan de accion agregado correctamente.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1 plan de accion" })).toHaveTextContent("1");
    expect(guardarPlanAccionTicketISO).toHaveBeenCalledWith(1, { resultado_plan_accion: "Pendiente validacion", fecha_control: "2026-10-15" });
    expect(screen.getByRole("cell", { name: "Pendiente" })).toBeInTheDocument();
    expect(actualizarTicketISO).not.toHaveBeenCalled();
    expect(cerrarTicketISO).not.toHaveBeenCalled();
});

test("siete planes muestran el total y solo el mas reciente desplegado, sin cierre entre los planes", async () => {
    const planes = Array.from({ length: 7 }, (_, index) => ({ id_plan: 7 - index, numero: 7 - index,
        resultado_plan_accion: `Resultado ${7 - index}`, fecha_control: "2026-10-15", created_at: "2026-10-15T15:00:00Z" }));
    obtenerTicketsISO.mockResolvedValue([ticket]);
    obtenerTicketISO.mockResolvedValue({ ...ticket, planes_accion: planes });
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Ver ticket ISO-001" }));
    const region = await screen.findByRole("region", { name: "Planes de accion (7)" });
    const entries = region.querySelectorAll("details");
    expect(entries).toHaveLength(7);
    expect(entries[0]).toHaveAttribute("open");
    expect(within(entries[0]).getByText("Plan 7")).toBeInTheDocument();
    Array.from(entries).slice(1).forEach((entry) => expect(entry).not.toHaveAttribute("open"));
    expect(within(entries[6]).getByText("Plan 1")).toBeInTheDocument();
    expect(within(region).queryByText(/Fecha de cierre/)).not.toBeInTheDocument();
    fireEvent.click(within(region).getByRole("button", { name: "Agregar plan" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar plan de accion" })).toBeEnabled());
    expect(screen.getByLabelText("Breve descripcion del resultado")).toHaveValue("");
});

test("cerrar el caso es independiente, actualiza el resumen y conserva los planes", async () => {
    const planes = [{ id_plan: 1, numero: 1, resultado_plan_accion: "Validado" }];
    const abierto = { ...ticket, planes_accion: planes };
    const cerrado = { ...abierto, estado: "resuelto", fecha_cierre: "2026-10-16T15:00:00Z" };
    obtenerTicketsISO.mockResolvedValue([abierto]);
    obtenerTicketISO.mockResolvedValue(abierto);
    cerrarTicketISO.mockResolvedValue(cerrado);
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Ver ticket ISO-001" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar caso" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar cierre" })).toBeEnabled());
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Cierre del caso");
    fireEvent.change(screen.getByLabelText("Fecha de cierre *"), { target: { value: "2026-10-16" } });
    fireEvent.submit(screen.getByRole("button", { name: "Confirmar cierre" }).closest("form"));
    expect(await screen.findByText("Caso cerrado correctamente. El ticket quedo resuelto.")).toBeInTheDocument();
    expect(cerrarTicketISO).toHaveBeenCalledWith(1, { fecha_cierre: "2026-10-16" });
    expect(guardarPlanAccionTicketISO).not.toHaveBeenCalled();
    expect(screen.getByRole("cell", { name: "Resuelto" })).toBeInTheDocument();
    obtenerTicketISO.mockResolvedValue(cerrado);
    fireEvent.click(screen.getByRole("button", { name: "Editar ticket ISO-001" }));
    await waitFor(() => expect(screen.getByLabelText("Fecha de cierre *")).toHaveValue("2026-10-16"));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Resumen mensual" }));
    fireEvent.change(screen.getByLabelText("Mes a consultar"), { target: { value: "2026-10" } });
    expect(screen.getByLabelText("Resueltos / cerrados: 1")).toBeInTheDocument();
});

test("rechaza fecha de control anterior o resultado vacio sin enviar el plan", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    await iniciar();
    await abrirPlan();
    fireEvent.submit(screen.getByRole("button", { name: "Guardar plan de accion" }).closest("form"));
    expect(screen.getByRole("alert")).toHaveTextContent("Indica una breve descripcion");
    fireEvent.change(screen.getByLabelText("Breve descripcion del resultado"), { target: { value: "Resultado" } });
    fireEvent.change(screen.getByLabelText("Fecha de control"), { target: { value: "2026-10-13" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar plan de accion" }).closest("form"));
    expect(screen.getByRole("alert")).toHaveTextContent(/anterior a la recepcion/);
    expect(guardarPlanAccionTicketISO).not.toHaveBeenCalled();
});

test("el cierre invalido o rechazado conserva el caso abierto y permite reintentar", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    cerrarTicketISO.mockRejectedValue({ response: { data: { error: "No se pudo confirmar el cierre." } } });
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Ver ticket ISO-001" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar caso" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar cierre" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Fecha de cierre *"), { target: { value: "2026-10-13" } });
    fireEvent.submit(screen.getByRole("button", { name: "Confirmar cierre" }).closest("form"));
    expect(screen.getByRole("alert")).toHaveTextContent(/anterior a la recepcion/);
    expect(cerrarTicketISO).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Fecha de cierre *"), { target: { value: "2026-10-16" } });
    fireEvent.submit(screen.getByRole("button", { name: "Confirmar cierre" }).closest("form"));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo confirmar el cierre.");
    expect(screen.getByLabelText("Fecha de cierre *")).toHaveValue("2026-10-16");
    expect(screen.getByRole("cell", { name: "Pendiente" })).toBeInTheDocument();
});

test("un error al guardar el plan conserva la ventana y sus datos para reintentar", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    guardarPlanAccionTicketISO.mockRejectedValue({ response: { data: { error: "No se pudo guardar el plan." } } });
    await iniciar();
    await abrirPlan();
    fireEvent.change(screen.getByLabelText("Breve descripcion del resultado"), { target: { value: "Resultado sin perder" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar plan de accion" }).closest("form"));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar el plan.");
    expect(screen.getByLabelText("Breve descripcion del resultado")).toHaveValue("Resultado sin perder");
    expect(screen.getByRole("button", { name: "Guardar plan de accion" })).toBeEnabled();
    expect(screen.getByRole("cell", { name: "Pendiente" })).toBeInTheDocument();
});

test("no permite guardar el plan cuando no pudo cargar el ticket", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    obtenerTicketISO.mockRejectedValue(new Error("Error de red"));
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Plan de accion del ticket ISO-001" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el ticket.");
    expect(screen.getByRole("button", { name: "Guardar plan de accion" })).toBeDisabled();
    expect(guardarPlanAccionTicketISO).not.toHaveBeenCalled();
});

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

test.each([["pendiente", "Cerrar caso"], ["resuelto", "Editar cierre"]])("el detalle %s tiene %s en el pie y se cierra con la X", async (estado, accion) => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    obtenerTicketISO.mockResolvedValue({ ...ticket, estado });
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Ver ticket ISO-001" }));
    const boton = await screen.findByRole("button", { name: accion });
    expect(boton.parentElement).toHaveClass("ticketiso-modal-footer");
    expect(boton.nextElementSibling).toHaveTextContent("Editar ticket");
    const modal = within(screen.getByRole("dialog"));
    expect(modal.queryByRole("button", { name: "Cerrar", exact: true })).not.toBeInTheDocument();
    expect(within(modal.getByRole("region", { name: "Cierre del caso" })).queryByRole("button")).not.toBeInTheDocument();
    fireEvent.click(modal.getByRole("button", { name: "Cerrar ventana" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cerrarTicketISO).not.toHaveBeenCalled();
});

test("el detalle agrupa datos, problema, plan y observaciones en ese orden", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    obtenerTicketISO.mockResolvedValue({ ...ticket, planes_accion: [{ id_plan: 1, numero: 1, resultado_plan_accion: "Validacion realizada", fecha_control: "2026-10-15" }],
        fecha_cierre: "2026-10-16T15:00:00Z", estado: "resuelto", creado_por_nombre: "Admin", solucion: "Solucion anterior" });
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Ver ticket ISO-001" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Editar ticket" })).toBeEnabled());
    const modal = within(screen.getByRole("dialog"));
    expect(modal.getAllByRole("heading", { level: 4 }).map((heading) => heading.textContent.trim())).toEqual([
        "Datos del ticket", "Descripcion del problema", "Planes de accion (1)", "Cierre del caso", "Observaciones",
    ]);
    const datos = within(modal.getByRole("region", { name: "Datos del ticket" }));
    expect(datos.getByText("005 Soporte y posventa")).toBeInTheDocument();
    expect(datos.getByText("Jorge")).toBeInTheDocument();
    expect(datos.getByText("Fecha de recepcion")).toBeInTheDocument();
    expect(datos.queryByText("Fecha de cierre")).not.toBeInTheDocument();
    expect(within(modal.getByRole("region", { name: "Descripcion del problema" })).getByText(ticket.problema)).toBeInTheDocument();
    const plan = within(modal.getByRole("region", { name: "Planes de accion (1)" }));
    expect(plan.getAllByText("Validacion realizada")).toHaveLength(2);
    expect(plan.getByText("15/10/2026")).toBeInTheDocument();
    const cierre = within(modal.getByRole("region", { name: "Cierre del caso" }));
    expect(cierre.getByText("16/10/2026")).toBeInTheDocument();
    expect(cierre.getByText("Fecha de cierre")).toBeInTheDocument();
    expect(plan.getByText("Solucion anterior")).toBeInTheDocument();
    expect(within(modal.getByRole("region", { name: "Observaciones" })).getByText(ticket.observaciones)).toBeInTheDocument();
    expect(modal.getByText("Admin").closest("dl")).toHaveAccessibleName("Datos de registro");
    expect(modal.getAllByText("ISO-001")).toHaveLength(1);
    expect(modal.getAllByText("Resuelto")).toHaveLength(1);
});

test("el detalle sin plan muestra campos sin definir sin inventar resultados ni autor", async () => {
    obtenerTicketsISO.mockResolvedValue([ticket]);
    obtenerTicketISO.mockResolvedValue({ ...ticket, observaciones: "" });
    await iniciar();
    fireEvent.click(screen.getByRole("button", { name: "Ver ticket ISO-001" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Editar ticket" })).toBeEnabled());
    const modal = within(screen.getByRole("dialog"));
    const plan = within(modal.getByRole("region", { name: "Planes de accion (0)" }));
    expect(plan.getByText("Aun no hay planes de accion registrados.")).toBeInTheDocument();
    const cierre = within(modal.getByRole("region", { name: "Cierre del caso" }));
    expect(cierre.getByText("Sin definir")).toBeInTheDocument();
    expect(cierre.getByText("Fecha de cierre prevista")).toBeInTheDocument();
    expect(modal.getByText("Sin observaciones registradas.")).toBeInTheDocument();
    expect(modal.queryByText("Registrado por")).not.toBeInTheDocument();
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
