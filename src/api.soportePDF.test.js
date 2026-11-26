import axios from 'axios';
import { API_BASE_URL, obtenerPDFRegistrosSoporte } from './api';

jest.mock('axios', () => ({ post: jest.fn() }));
afterEach(() => { jest.clearAllMocks(); localStorage.removeItem('token'); });

test('solicita un PDF autenticado pasando solo los IDs filtrados y los criterios del informe', async () => {
  localStorage.setItem('token', 'pdf-test-session');
  const archivo = new Blob(['pdf'], { type: 'application/pdf' });
  const filtros = { busqueda: 'franco', desde: '2026-10-01', hasta: '2026-10-31' };
  axios.post.mockResolvedValue({ data: archivo });
  expect(await obtenerPDFRegistrosSoporte([11, 8], filtros)).toBe(archivo);
  expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/soporte/registros/pdf`, { ids: [11, 8], filtros },
    { headers: { Authorization: 'Bearer pdf-test-session' }, responseType: 'blob' });
});
