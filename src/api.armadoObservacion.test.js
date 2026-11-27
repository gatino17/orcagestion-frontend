import axios from 'axios';
import { API_BASE_URL, obtenerObservacionArmado, guardarObservacionArmado, obtenerImagenObservacionArmado, obtenerRespaldoLevantamientoArmado, obtenerLevantamientosActas, obtenerActas, fetchHistorialCentro } from './api';
jest.mock('axios', () => ({ get: jest.fn(), put: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'sesion-prueba'); });
afterEach(() => localStorage.clear());

test('consulta y actualiza la observacion con sesion y conserva el formulario multipart', async () => {
  axios.get.mockResolvedValue({ data: { observacion: 'Original', imagenes: [] } });
  axios.put.mockResolvedValue({ data: { observacion: 'Nueva', imagenes: [] } });
  expect(await obtenerObservacionArmado(8)).toEqual({ observacion: 'Original', imagenes: [] });
  const form = new FormData();
  form.append('imagen_1', new File(['foto'], 'imagen.jpg'));
  await guardarObservacionArmado(8, form);
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/armados/8/observacion`, { headers: { Authorization: 'Bearer sesion-prueba' } });
  expect(axios.put).toHaveBeenCalledWith(`${API_BASE_URL}/armados/8/observacion`, form,
    { headers: { Authorization: 'Bearer sesion-prueba', 'Content-Type': 'multipart/form-data' } });
});

test('recupera las imagenes autenticadas como blob sin exponer rutas del servidor', async () => {
  const blob = new Blob(['foto']);
  axios.get.mockResolvedValue({ data: blob });
  expect(await obtenerImagenObservacionArmado(8, 21)).toBe(blob);
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/armados/8/observacion/imagenes/21`,
    { headers: { Authorization: 'Bearer sesion-prueba' }, responseType: 'blob' });
});

test('las consultas de documentos y la lectura del respaldo conservan la sesion', async () => {
  axios.get.mockResolvedValue({ data: [] });
  await obtenerActas();
  await obtenerLevantamientosActas(21);
  await fetchHistorialCentro(21);
  await obtenerRespaldoLevantamientoArmado(31);
  for (const [, config] of axios.get.mock.calls) expect(config.headers.Authorization).toBe('Bearer sesion-prueba');
  expect(axios.get).toHaveBeenLastCalledWith(`${API_BASE_URL}/actas/levantamientos/armado/31/documento`,
    { headers: { Authorization: 'Bearer sesion-prueba' }, responseType: 'blob' });
});
