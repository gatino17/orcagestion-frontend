import axios from "axios";
import { API_BASE_URL, eliminarPlanAccionTicketISO, obtenerPDFTicketISO } from "./api";

jest.mock("axios", () => ({ get: jest.fn(), delete: jest.fn() }));
afterEach(() => { localStorage.removeItem("token"); jest.clearAllMocks(); });

test("elimina solo el plan seleccionado con autorizacion y devuelve el ticket actualizado", async () => {
    localStorage.setItem("token", "test-ticket-session");
    const ticket = { id_ticket: 7, planes_accion: [] };
    axios.delete.mockResolvedValue({ data: { ticket } });
    expect(await eliminarPlanAccionTicketISO(7, 12)).toBe(ticket);
    expect(axios.delete).toHaveBeenCalledWith(`${API_BASE_URL}/ticket-iso/7/planes-accion/12`, {
        headers: { Authorization: "Bearer test-ticket-session" },
    });
});

test("solicita el PDF con autorizacion y respuesta binaria sin poner el token en la URL", async () => {
    localStorage.setItem("token", "test-ticket-session");
    const archivo = new Blob(["%PDF"], { type: "application/pdf" });
    axios.get.mockResolvedValue({ data: archivo });
    expect(await obtenerPDFTicketISO(7)).toBe(archivo);
    expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/ticket-iso/7/pdf`, {
        headers: { Authorization: "Bearer test-ticket-session" }, responseType: "blob",
    });
});
