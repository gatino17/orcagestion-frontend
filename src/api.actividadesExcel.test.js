import axios from 'axios';
import { API_BASE_URL, obtenerExcelActividades } from './api';

jest.mock('axios', () => ({ get: jest.fn() }));
afterEach(() => { jest.clearAllMocks(); localStorage.clear(); });

test('solicita todas las actividades filtradas como Excel con sesion', async () => {
  localStorage.setItem('token', 'excel-actividades-test');
  const archivo = new Blob(['xlsx']);
  axios.get.mockResolvedValue({ data: archivo });
  expect(await obtenerExcelActividades({ id_cliente: '1', nombre_centro: 'Norte' })).toBe(archivo);
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/actas/actividades/excel`, {
    headers: { Authorization: 'Bearer excel-actividades-test' }, responseType: 'blob',
    params: { cliente_id: '1', nombre_centro: 'Norte' },
  });
});

test('sin filtros no limita la exportacion a un cliente ni a una pagina', async () => {
  axios.get.mockResolvedValue({ data: new Blob(['xlsx']) });
  await obtenerExcelActividades();
  expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
    responseType: 'blob', params: { cliente_id: undefined, nombre_centro: undefined },
  });
});
