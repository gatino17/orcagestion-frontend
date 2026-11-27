import axios from 'axios';
import { API_BASE_URL, obtenerDocumentoCentro } from './api';

jest.mock('axios', () => ({ get: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'sesion-prueba'); });
afterEach(() => localStorage.clear());

test('recupera el documento de nuestra API con sesion y como archivo', async () => {
  const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
  axios.get.mockResolvedValue({ data: blob });
  const url = `${API_BASE_URL}/filtro/documento/Levantamientos/26`;
  expect(await obtenerDocumentoCentro(url)).toBe(blob);
  expect(axios.get).toHaveBeenCalledWith(url, { headers: { Authorization: 'Bearer sesion-prueba' }, responseType: 'blob' });
});

test.each(['https://archivos.example/plano.pdf', `${API_BASE_URL}.externo.example/plano.pdf`])(
  'no envia la sesion a un enlace externo: %s', async (url) => {
    axios.get.mockResolvedValue({ data: new Blob(['archivo']) });
    await obtenerDocumentoCentro(url);
    expect(axios.get).toHaveBeenCalledWith(url, { responseType: 'blob' });
  }
);
