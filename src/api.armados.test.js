import axios from 'axios';
import { API_BASE_URL, obtenerArmados, cerrarBultoArmadoAdmin, abrirBultoArmadoAdmin, eliminarBultoArmadoAdmin } from './api';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), delete: jest.fn() }));
afterEach(() => localStorage.removeItem('token'));

test('authenticated armado GET uses canonical URL without CORS preflight redirect', async () => {
  localStorage.setItem('token', 'test-session-token');
  const armados = [{ id_armado: 1, estado: 'prefinalizado' }];
  axios.get.mockResolvedValue({ data: armados });
  expect(await obtenerArmados({ centro_id: 5 })).toEqual(armados);
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/armados/`, {
    headers: { Authorization: 'Bearer test-session-token' }, params: { centro_id: 5 },
  });
});

test('GET without token retains parameters and does not send false authorization', async () => {
  axios.get.mockResolvedValue({ data: [] });
  await obtenerArmados();
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/armados/`, { params: {} });
});

test('admin box closure sends authenticated request without replacing all boxes', async () => {
  localStorage.setItem('token', 'test-session-token');
  axios.post.mockResolvedValue({ data: { estado: 'cerrada' } });
  expect(await cerrarBultoArmadoAdmin(8, 'Caja 1')).toEqual({ estado: 'cerrada' });
  expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/armados/8/cajas/cerrar`, { caja: 'Caja 1' },
    { headers: { Authorization: 'Bearer test-session-token' } });
});

test('opening and deletion send authorization and just the selected box', async () => {
  localStorage.setItem('token', 'test-session-token');
  axios.post.mockResolvedValue({ data: { estado: 'abierta' } });
  axios.delete.mockResolvedValue({ data: { eliminada: true } });
  await abrirBultoArmadoAdmin(8, 'Caja 1');
  await eliminarBultoArmadoAdmin(8, 'Caja 1');
  expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/armados/8/cajas/abrir`, { caja: 'Caja 1' }, { headers: { Authorization: 'Bearer test-session-token' } });
  expect(axios.delete).toHaveBeenCalledWith(`${API_BASE_URL}/armados/8/cajas`, { data: { caja: 'Caja 1' }, headers: { Authorization: 'Bearer test-session-token' } });
});
