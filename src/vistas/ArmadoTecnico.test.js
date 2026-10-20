import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import ArmadoTecnico from "./ArmadoTecnico";
import { cargarArmados, cargarMateriales, cargarMovimientos, cargarMovimientosRecientes, cargarParticipaciones } from "../controllers/armadosControllers";
import { cargarDetallesCentro } from "../controllers/centrosControllers";
import { obtenerClientes } from "../controllers/consultaCentroControllers";
import { cargarUsuarios } from "../controllers/usuariosControllers";
import { agregarEquipo, modificarEquipo } from "../controllers/equiposControllers";
import { validarSerieEquipo } from "../api";

jest.mock("../controllers/armadosControllers");
jest.mock("../controllers/centrosControllers");
jest.mock("../controllers/consultaCentroControllers");
jest.mock("../controllers/usuariosControllers");
jest.mock("../controllers/equiposControllers");
jest.mock("../api", () => ({ validarSerieEquipo: jest.fn(), obtenerHistorialEquiposArmado: jest.fn(), obtenerMovimientosArmado: jest.fn() }));
jest.mock("socket.io-client", () => ({ io: () => ({ on: jest.fn(), off: jest.fn(), disconnect: jest.fn() }) }));
jest.mock("react-data-table-component", () => ({ columns, data = [] }) => <div>{data.map((item, index) => <div key={index}>{columns.find((col) => col.name === "Planilla")?.cell(item)}</div>)}</div>);

const armado = { id_armado: 8, centro_id: 2, centro: { id_centro: 2, nombre: "Centro de prueba" }, estado: "en_proceso", tecnico_id: 4 };
jest.setTimeout(15000);
let equipo;

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("token", `e30.${btoa(JSON.stringify({ rol: "admin", user_id: 4, nombre: "Admin" }))}.test`);
    equipo = { id_equipo: 15, centro_id: 2, nombre: "Equipo prueba", numero_serie: "", codigo: "", estado_registro: "no_aplica", estado: "", caja: "Pendiente de caja", observacion_registro: "" };
    cargarArmados.mockImplementation(async (callback) => callback([armado]));
    cargarDetallesCentro.mockImplementation(async () => ({ equipos: [{ ...equipo }] }));
    cargarUsuarios.mockImplementation(async (callback) => callback([]));
    obtenerClientes.mockImplementation(async (callback) => callback([]));
    cargarParticipaciones.mockImplementation(async (_, callback) => callback([]));
    cargarMateriales.mockImplementation(async (_, callback) => callback([]));
    cargarMovimientos.mockImplementation(async (_, callback) => callback([]));
    cargarMovimientosRecientes.mockImplementation(async (callback) => callback([]));
    modificarEquipo.mockImplementation(async (_, cambios) => { equipo = { ...equipo, ...cambios }; });
    validarSerieEquipo.mockResolvedValue({ duplicado: false });
    jest.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const abrirPlanilla = async () => {
    render(<MemoryRouter><ArmadoTecnico /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Planilla", exact: true }));
    await screen.findByRole("button", { name: "Editar equipo Equipo prueba" });
    return within(screen.getByRole("dialog"));
};

test("la planilla tiene ventana amplia y acciones fijas en su propio contenedor", async () => {
    const planilla = await abrirPlanilla();
    expect(screen.getByRole("dialog")).toHaveClass("armado-planilla-modal");
    const editar = planilla.getByRole("button", { name: "Editar equipo Equipo prueba" });
    const eliminar = planilla.getByRole("button", { name: "Eliminar equipo Equipo prueba" });
    expect(editar.closest("td")).toHaveClass("arm-equip-actions");
    expect(eliminar.closest("td")).toBe(editar.closest("td"));
    const tabla = editar.closest("table");
    expect(within(tabla).getByRole("columnheader", { name: "Acciones" })).toHaveClass("arm-equip-actions");
    expect(tabla.parentElement).toHaveClass("table-responsive", "arm-equip-scroll");
    fireEvent.click(editar);
    expect(planilla.getByRole("button", { name: "Guardar equipo Equipo prueba" }).closest("td")).toHaveClass("arm-equip-actions");
});

test.each(["Mozilla/5.0", "Mozilla/5.0 Android"])("habilita equipo sin serie y lo guarda en el registro existente (%s)", async (userAgent) => {
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    const planilla = await abrirPlanilla();
    fireEvent.click(planilla.getByRole("button", { name: "No aplica", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Editar equipo Equipo prueba" }));
    const selector = screen.getByLabelText("Estado de registro de Equipo prueba");
    expect(selector).toHaveValue("no_aplica");
    fireEvent.change(selector, { target: { value: "normal" } });
    expect(screen.getByRole("button", { name: "Guardar equipo Equipo prueba" })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Guardar equipo Equipo prueba" })); });
    await waitFor(() => expect(modificarEquipo).toHaveBeenCalledWith(15, expect.objectContaining({ estado_registro: "normal", numero_serie: "", observacion_registro: "", armado_id: 8 })));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Guardar equipo Equipo prueba" })).not.toBeInTheDocument());
    expect(agregarEquipo).not.toHaveBeenCalled();
    expect(validarSerieEquipo).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
    fireEvent.click(planilla.getByRole("button", { name: "Ver todo", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Editar equipo Equipo prueba" }));
    expect(screen.getByLabelText("Estado de registro de Equipo prueba")).toHaveValue("normal");
});

test("Cancelar restaura No aplica sin guardar y Pendiente requiere observacion", async () => {
    const planilla = await abrirPlanilla();
    fireEvent.click(screen.getByRole("button", { name: "Editar equipo Equipo prueba" }));
    fireEvent.change(screen.getByLabelText("Estado de registro de Equipo prueba"), { target: { value: "normal" } });
    await act(async () => { fireEvent.click(planilla.getByRole("button", { name: "Cancelar", exact: true })); });
    await waitFor(() => expect(screen.queryByLabelText("Estado de registro de Equipo prueba")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Editar equipo Equipo prueba" }));
    expect(screen.getByLabelText("Estado de registro de Equipo prueba")).toHaveValue("no_aplica");
    fireEvent.change(screen.getByLabelText("Estado de registro de Equipo prueba"), { target: { value: "pendiente" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Guardar equipo Equipo prueba" })); });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("observacion"));
    expect(modificarEquipo).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Observacion pendiente de Equipo prueba"), { target: { value: "Falta equipo" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Guardar equipo Equipo prueba" })); });
    await waitFor(() => expect(modificarEquipo).toHaveBeenCalledWith(15, expect.objectContaining({ estado_registro: "pendiente", observacion_registro: "Falta equipo" })));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Guardar equipo Equipo prueba" })).not.toBeInTheDocument());
});
