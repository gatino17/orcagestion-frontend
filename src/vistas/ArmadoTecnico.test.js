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
import { validarSerieEquipo, cerrarBultoArmadoAdmin, abrirBultoArmadoAdmin, eliminarBultoArmadoAdmin, obtenerMovimientosArmado } from "../api";

jest.mock("../controllers/armadosControllers");
jest.mock("../controllers/centrosControllers");
jest.mock("../controllers/consultaCentroControllers");
jest.mock("../controllers/usuariosControllers");
jest.mock("../controllers/equiposControllers");
jest.mock("../api", () => ({ validarSerieEquipo: jest.fn(), cerrarBultoArmadoAdmin: jest.fn(), abrirBultoArmadoAdmin: jest.fn(), eliminarBultoArmadoAdmin: jest.fn(), obtenerHistorialEquiposArmado: jest.fn(), obtenerMovimientosArmado: jest.fn() }));
jest.mock("socket.io-client", () => ({ io: () => ({ on: jest.fn(), off: jest.fn(), disconnect: jest.fn() }) }));
jest.mock("react-data-table-component", () => ({ columns, data = [] }) => <div>{data.map((item, index) => <div key={index}>{columns.find((col) => col.name === "Total bultos")?.cell(item)}{columns.find((col) => col.name === "Planilla")?.cell(item)}</div>)}</div>);

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

test("admin cierra un bulto abierto desde su detalle y conserva los demas", async () => {
    cargarArmados.mockImplementation(async (callback) => callback([{ ...armado, cajas_estado: { 'Caja 1': 'abierta', 'Caja 2': 'abierta' } }]));
    obtenerMovimientosArmado.mockResolvedValue([]);
    cerrarBultoArmadoAdmin.mockResolvedValue({ id_armado: 8, caja: 'Caja 1', estado: 'cerrada', cajas_estado: { 'Caja 1': 'cerrada', 'Caja 2': 'abierta' } });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter><ArmadoTecnico /></MemoryRouter>);
    const opcion = await screen.findByRole('option', { name: 'Centro de prueba' });
    fireEvent.change(opcion.closest('select'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bultos', exact: true }));
    const cerrar = await screen.findByRole('button', { name: 'Cerrar Bulto 1' });
    const modal = cerrar.closest('.modal-content');
    expect(within(modal).getAllByText('Abierta', { exact: true })).toHaveLength(2);
    expect(screen.getByLabelText('0 de 2 bultos cerrados; 2 pendientes de cierre')).toHaveTextContent('0/2');
    await act(async () => { fireEvent.click(cerrar); });
    expect(cerrarBultoArmadoAdmin).toHaveBeenCalledWith(8, 'Caja 1');
    await waitFor(() => expect(within(modal).queryByRole('button', { name: 'Cerrar Bulto 1' })).not.toBeInTheDocument());
    expect(within(modal).getByRole('button', { name: 'Cerrar Bulto 2' })).toBeInTheDocument();
    expect(within(modal).getByText('Cerrada', { exact: true })).toBeInTheDocument();
    expect(within(modal).getByText('Abierta', { exact: true })).toBeInTheDocument();
    expect(screen.getByLabelText('1 de 2 bultos cerrados; 1 pendientes de cierre')).toHaveTextContent('1/2');
});

test("admin reabre y elimina un bulto vacio actualizando detalle y contador", async () => {
    cargarArmados.mockImplementation(async (callback) => callback([{ ...armado, total_cajas: 2, cajas_estado: { 'Caja 1': 'cerrada', 'Caja 2': 'abierta' } }]));
    obtenerMovimientosArmado.mockResolvedValue([]);
    abrirBultoArmadoAdmin.mockResolvedValue({ id_armado: 8, caja: 'Caja 1', estado: 'abierta', cajas_estado: { 'Caja 1': 'abierta', 'Caja 2': 'abierta' }, total_cajas: 2 });
    eliminarBultoArmadoAdmin.mockResolvedValue({ id_armado: 8, caja: 'Caja 1', eliminada: true, cajas_estado: { 'Caja 2': 'abierta' }, total_cajas: 1 });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter><ArmadoTecnico /></MemoryRouter>);
    const opcion = await screen.findByRole('option', { name: 'Centro de prueba' });
    fireEvent.change(opcion.closest('select'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bultos', exact: true }));
    const reabrir = await screen.findByRole('button', { name: 'Reabrir Bulto 1' });
    const modal = reabrir.closest('.modal-content');
    expect(screen.getByLabelText('1 de 2 bultos cerrados; 1 pendientes de cierre')).toHaveTextContent('1/2');
    await act(async () => { fireEvent.click(reabrir); });
    expect(abrirBultoArmadoAdmin).toHaveBeenCalledWith(8, 'Caja 1');
    expect(within(modal).getByRole('button', { name: 'Cerrar Bulto 1' })).toBeInTheDocument();
    expect(screen.getByLabelText('0 de 2 bultos cerrados; 2 pendientes de cierre')).toHaveTextContent('0/2');
    await act(async () => { fireEvent.click(within(modal).getByRole('button', { name: 'Eliminar Bulto 1' })); });
    expect(eliminarBultoArmadoAdmin).toHaveBeenCalledWith(8, 'Caja 1');
    expect(within(modal).queryByText('Bulto 1', { exact: true })).not.toBeInTheDocument();
    expect(within(modal).getByText('Bulto 2', { exact: true })).toBeInTheDocument();
    expect(screen.getByLabelText('0 de 1 bultos cerrados; 1 pendientes de cierre')).toHaveTextContent('0/1');
});
