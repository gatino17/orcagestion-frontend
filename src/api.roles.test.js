import axios from "axios";
import { API_BASE_URL, crearRol, actualizarRol } from "./api";

jest.mock("axios", () => ({ post: jest.fn(), put: jest.fn() }));

afterEach(() => { localStorage.removeItem("token"); jest.clearAllMocks(); });

test.each([
    ["crear", "post", crearRol, `${API_BASE_URL}/roles/`],
    ["actualizar", "put", (payload) => actualizarRol(7, payload), `${API_BASE_URL}/roles/7`],
])("envia la sesion del admin al %s un rol con permiso de Configuraciones", async (_, method, action, url) => {
    localStorage.setItem("token", "admin-role-session");
    const payload = { nombre: "dibujante", paginas: ["configuraciones"] };
    axios[method].mockResolvedValue({ data: { message: "Guardado" } });
    expect(await action(payload)).toEqual({ message: "Guardado" });
    expect(axios[method]).toHaveBeenCalledWith(url, payload, {
        headers: { Authorization: "Bearer admin-role-session" },
    });
});
