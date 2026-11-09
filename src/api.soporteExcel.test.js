import axios from "axios";
import { API_BASE_URL, obtenerExcelResponsabilidadSoporte } from "./api";

jest.mock('axios', () => ({ get: jest.fn() }));
afterEach(() => { jest.clearAllMocks(); localStorage.removeItem('token'); });

test('solicita el Excel autenticado del ano completo sin enviar un filtro mensual', async () => {
    localStorage.setItem('token', 'excel-session');
    const archivo = new Blob(['xlsx']);
    axios.get.mockResolvedValue({ data: archivo });
    expect(await obtenerExcelResponsabilidadSoporte({ anio: 2026, cliente: 'Cliente A', centro: 'Norte' })).toBe(archivo);
    expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/soporte/responsabilidad/excel`, {
        headers: { Authorization: 'Bearer excel-session' },
        params: { anio: 2026, cliente: 'Cliente A', centro: 'Norte' }, responseType: 'blob',
    });
});

test('sin cliente o centro seleccionados no agrega filtros vacios', async () => {
    axios.get.mockResolvedValue({ data: new Blob(['xlsx']) });
    await obtenerExcelResponsabilidadSoporte({ anio: 2026, cliente: '', centro: '' });
    expect(axios.get).toHaveBeenCalledWith(expect.any(String), { params: { anio: 2026, cliente: undefined, centro: undefined }, responseType: 'blob' });
});
