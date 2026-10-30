import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { obtenerPDFTicketISO } from "../api";
import VistaPreviaPDFTicketISO from "./VistaPreviaPDFTicketISO";

jest.mock("../api", () => ({ obtenerPDFTicketISO: jest.fn() }));
const ticket = { id_ticket: 1, numero_ticket: "ISO-2026-001" };
const archivo = () => new Blob(["%PDF-1.4"], { type: "application/pdf" });
const crearOriginal = URL.createObjectURL;
const revocarOriginal = URL.revokeObjectURL;

beforeEach(() => {
    jest.resetAllMocks();
    URL.createObjectURL = jest.fn(() => "blob:ticket-pdf");
    URL.revokeObjectURL = jest.fn();
    obtenerPDFTicketISO.mockResolvedValue(archivo());
});
afterAll(() => { URL.createObjectURL = crearOriginal; URL.revokeObjectURL = revocarOriginal; });

test("muestra carga y luego el mismo PDF para vista previa y descarga, sin descargar automaticamente", async () => {
    render(<VistaPreviaPDFTicketISO ticket={ticket} />);
    expect(screen.getByRole("status")).toHaveTextContent("Generando PDF");
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeDisabled();
    const enlace = await screen.findByRole("link", { name: "Descargar PDF" });
    expect(enlace).toHaveAttribute("href", "blob:ticket-pdf");
    expect(enlace).toHaveAttribute("download", "Ticket-ISO-2026-001.pdf");
    expect(screen.getByTitle("Vista previa PDF de ISO-2026-001")).toHaveAttribute("src", "blob:ticket-pdf#toolbar=0");
    expect(obtenerPDFTicketISO).toHaveBeenCalledTimes(1);
    expect(obtenerPDFTicketISO).toHaveBeenCalledWith(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
});

test("imprime el visor cuando termina de cargar y ofrece abrirlo en una pestana", async () => {
    render(<VistaPreviaPDFTicketISO ticket={ticket} />);
    const visor = await screen.findByTitle("Vista previa PDF de ISO-2026-001");
    const print = jest.fn();
    Object.defineProperty(visor, "contentWindow", { configurable: true, value: { focus: jest.fn(), print } });
    fireEvent.load(visor);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Abrir en pestana" })).toHaveAttribute("rel", "noopener noreferrer");
});

test("si imprimir no esta disponible indica el visor alternativo", async () => {
    render(<VistaPreviaPDFTicketISO ticket={ticket} />);
    const visor = await screen.findByTitle("Vista previa PDF de ISO-2026-001");
    Object.defineProperty(visor, "contentWindow", { configurable: true, value: { focus: jest.fn(), print: () => { throw new Error("No disponible"); } } });
    fireEvent.load(visor);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(screen.getByRole("status")).toHaveTextContent("Abre el PDF en una pestana");
});

test("permite reintentar un error sin modificar el ticket", async () => {
    obtenerPDFTicketISO.mockRejectedValueOnce({ response: { data: { error: "Sesion expirada" } } });
    render(<VistaPreviaPDFTicketISO ticket={ticket} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sesion expirada");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("link", { name: "Descargar PDF" })).toBeInTheDocument();
    expect(obtenerPDFTicketISO).toHaveBeenCalledTimes(2);
});

test("rechaza respuestas que no sean PDF", async () => {
    obtenerPDFTicketISO.mockResolvedValue(new Blob(["Error"], { type: "text/html" }));
    render(<VistaPreviaPDFTicketISO ticket={ticket} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo generar el PDF");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByTitle("Vista previa PDF de ISO-2026-001")).not.toBeInTheDocument();
});

test("libera el PDF al cerrar y no crea enlaces si la peticion termina despues del cierre", async () => {
    const vista = render(<VistaPreviaPDFTicketISO ticket={ticket} />);
    await screen.findByRole("link", { name: "Descargar PDF" });
    vista.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:ticket-pdf");
    URL.createObjectURL.mockClear();
    let resolver;
    obtenerPDFTicketISO.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    const segunda = render(<VistaPreviaPDFTicketISO ticket={ticket} />);
    segunda.unmount();
    resolver(archivo());
    await Promise.resolve();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test("cambiar de ticket libera el archivo anterior y carga el nuevo", async () => {
    URL.createObjectURL.mockReturnValueOnce("blob:primero").mockReturnValueOnce("blob:segundo");
    const vista = render(<VistaPreviaPDFTicketISO ticket={ticket} />);
    await screen.findByRole("link", { name: "Descargar PDF" });
    vista.rerender(<VistaPreviaPDFTicketISO ticket={{ id_ticket: 2, numero_ticket: "ISO-2026-002" }} />);
    await waitFor(() => expect(screen.getByRole("link", { name: "Descargar PDF" })).toHaveAttribute("href", "blob:segundo"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:primero");
    expect(obtenerPDFTicketISO).toHaveBeenLastCalledWith(2);
});
