import axios from "axios";
import { API_BASE_URL, obtenerPDFTicketISO } from "./api";

jest.mock("axios", () => ({ get: jest.fn() }));
afterEach(() => { localStorage.removeItem("token"); jest.clearAllMocks(); });

test("solicita el PDF con autorizacion y respuesta binaria sin poner el token en la URL", async () => {
    localStorage.setItem("token", "test-ticket-session");
    const archivo = new Blob(["%PDF"], { type: "application/pdf" });
    axios.get.mockResolvedValue({ data: archivo });
    expect(await obtenerPDFTicketISO(7)).toBe(archivo);
    expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/ticket-iso/7/pdf`, {
        headers: { Authorization: "Bearer test-ticket-session" }, responseType: "blob",
    });
});
